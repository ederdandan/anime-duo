using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;
using Mural;

// Servidor do Mural Anime:
// - entrega o site (pasta wwwroot)
// - /api/...  lê e grava os álbuns, as contas e os comentários
// - /midia/... entrega as fotos enviadas pela curadora e as fotos de perfil

const long TamanhoMaximo = 8 * 1024 * 1024; // 8 MB por foto (o site já comprime antes de enviar)

var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = TamanhoMaximo + 1024 * 1024);

var pastaDados = builder.Configuration["Mural:PastaDados"] is { Length: > 0 } p
    ? p
    : Path.Combine(builder.Environment.ContentRootPath, "dados");
var semente = Path.Combine(AppContext.BaseDirectory, "semente", "albuns.json");
var repo = new Repositorio(pastaDados, semente);

builder.Services.AddSingleton(repo);
builder.Services.AddSingleton(new Curadoria(builder.Configuration["Mural:Senha"] ?? ""));
builder.Services.AddSingleton(new Contas(pastaDados));
builder.Services.AddSingleton(new Comentarios(pastaDados));

// Login das contas com cookie. As "chaves" do cookie ficam em dados/chaves,
// assim ninguém é deslogado quando o MonsterASP reinicia o site.
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(pastaDados, "chaves")))
    .SetApplicationName("mural-anime");
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.Cookie.Name = "mural-conta";
        o.Cookie.HttpOnly = true;
        o.Cookie.SameSite = SameSiteMode.Lax;
        o.ExpireTimeSpan = TimeSpan.FromDays(90);
        o.SlidingExpiration = true;
        // É uma API: em vez de mandar para uma página de login, responde 401.
        o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
        o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(repo.PastaMidia),
    RequestPath = "/midia",
    OnPrepareResponse = c => c.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable",
});
app.UseAuthentication();
app.UseAuthorization();

var api = app.MapGroup("/api");
api.MapContas();
api.MapComentarios();

api.MapGet("/albuns", async (HttpContext ctx) =>
{
    ctx.Response.Headers.CacheControl = "no-store";
    return Results.Ok(await repo.Ler());
});

api.MapPost("/entrar", async (Entrada entrada, Curadoria curadoria) =>
{
    if (!curadoria.Configurada)
        return Results.Problem("A senha da curadora ainda não foi configurada no servidor.", statusCode: 503);
    if (curadoria.Confere(entrada.Senha)) return Results.NoContent();
    await Task.Delay(1000);
    return Results.Problem("Senha incorreta.", statusCode: 401);
});

api.MapPost("/albuns", async (HttpContext ctx, NovoAlbum novo, Curadoria curadoria) =>
{
    if (await curadoria.Exigir(ctx) is { } negado) return negado;
    var titulo = (novo.Titulo ?? "").Trim();
    if (titulo.Length is 0 or > 80) return Results.Problem("Dê um nome ao álbum (até 80 letras).", statusCode: 400);

    var album = await repo.Alterar(albuns =>
    {
        var baseId = Repositorio.Slug(titulo);
        var id = baseId;
        for (var n = 2; albuns.Any(a => a.Id == id); n++) id = $"{baseId}-{n}";
        var a = new Album { Id = id, Titulo = titulo, Descricao = (novo.Descricao ?? "").Trim() };
        albuns.Add(a);
        return a;
    });
    return Results.Created($"/api/albuns/{album.Id}", album);
});

api.MapPost("/albuns/{albumId}/cenas", async (HttpContext ctx, string albumId, Curadoria curadoria) =>
{
    if (await curadoria.Exigir(ctx) is { } negado) return negado;
    var form = await ctx.Request.ReadFormAsync();
    var foto = form.Files["foto"];
    if (foto is null || foto.Length == 0) return Results.Problem("Escolha uma foto.", statusCode: 400);
    if (foto.Length > TamanhoMaximo) return Results.Problem("A foto passou de 8 MB.", statusCode: 400);

    var extensao = await Imagens.Extensao(foto);
    if (extensao is null) return Results.Problem("Esse arquivo não é uma imagem JPG, PNG ou WebP.", statusCode: 400);

    var cores = (form["cores"].ToString())
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Where(c => Regex.IsMatch(c, "^#[0-9A-Fa-f]{6}$"))
        .Select(c => c.ToUpperInvariant())
        .Take(6)
        .ToList();
    var anime = Texto.Limitar(form["anime"], 80);
    var comentario = Texto.Limitar(form["comentario"], 500);

    var albuns = await repo.Ler();
    if (albuns.All(a => a.Id != albumId)) return Results.Problem("Álbum não encontrado.", statusCode: 404);

    var cenaId = $"{Repositorio.Slug(anime.Length > 0 ? anime : "cena")}-{Guid.NewGuid().ToString("N")[..6]}";
    var nomeArquivo = cenaId + extensao;
    var url = $"midia/{albumId}/{nomeArquivo}";
    await Imagens.Salvar(foto, Path.Combine(repo.PastaMidia, albumId, nomeArquivo));

    var item = new Item
    {
        Id = cenaId,
        Url = url,
        Anime = anime,
        Comentario = comentario,
        Cores = cores,
    };

    var salvo = await repo.Alterar(lista =>
    {
        var album = lista.FirstOrDefault(a => a.Id == albumId);
        if (album is null) return false;
        album.Itens.Add(item);
        if (string.IsNullOrEmpty(album.Capa)) album.Capa = item.Url;
        return true;
    });
    if (!salvo)
    {
        repo.ApagarMidia(url);
        return Results.Problem("Álbum não encontrado.", statusCode: 404);
    }
    return Results.Created($"/api/albuns/{albumId}/cenas/{item.Id}", item);
}).DisableAntiforgery();

api.MapDelete("/albuns/{albumId}/cenas/{cenaId}", async (HttpContext ctx, string albumId, string cenaId,
    Curadoria curadoria, Comentarios comentarios) =>
{
    if (await curadoria.Exigir(ctx) is { } negado) return negado;
    var removido = await repo.Alterar(lista =>
    {
        var album = lista.FirstOrDefault(a => a.Id == albumId);
        var item = album?.Itens.FirstOrDefault(i => i.Id == cenaId);
        if (album is null || item is null) return null;
        album.Itens.Remove(item);
        if (album.Capa == item.Url) album.Capa = album.Itens.FirstOrDefault()?.Url ?? "";
        return item;
    });
    if (removido is null) return Results.Problem("Cena não encontrada.", statusCode: 404);

    // Apaga a foto só se ela foi enviada pelo site (as de exemplo ficam), e os comentários da cena.
    repo.ApagarMidia(removido.Url);
    await comentarios.Alterar(lista => lista.RemoveAll(c => c.AlbumId == albumId && c.CenaId == cenaId));
    return Results.NoContent();
});

// Qualquer outro endereço abre o site.
app.MapFallbackToFile("index.html");

app.Run();
