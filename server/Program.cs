using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;
using Mural;

// Servidor do Mural Anime:
// - entrega o site (pasta wwwroot)
// - /api/...  lê e grava os álbuns
// - /midia/... entrega as fotos enviadas pela curadora

const long TamanhoMaximo = 8 * 1024 * 1024; // 8 MB por foto (o site já comprime antes de enviar)

var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = TamanhoMaximo + 1024 * 1024);

var pastaDados = builder.Configuration["Mural:PastaDados"] is { Length: > 0 } p
    ? p
    : Path.Combine(builder.Environment.ContentRootPath, "dados");
var semente = Path.Combine(AppContext.BaseDirectory, "semente", "albuns.json");
var repo = new Repositorio(pastaDados, semente);
var senhaConfigurada = builder.Configuration["Mural:Senha"] ?? "";

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(repo.PastaMidia),
    RequestPath = "/midia",
    OnPrepareResponse = c => c.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable",
});

// ---------- Senha da curadora ----------
bool SenhaCorreta(string? tentativa)
{
    if (senhaConfigurada.Length == 0 || string.IsNullOrEmpty(tentativa)) return false;
    var a = SHA256.HashData(Encoding.UTF8.GetBytes(tentativa));
    var b = SHA256.HashData(Encoding.UTF8.GetBytes(senhaConfigurada));
    return CryptographicOperations.FixedTimeEquals(a, b);
}

async Task<IResult?> ExigirSenha(HttpContext ctx)
{
    if (senhaConfigurada.Length == 0)
        return Results.Problem("A senha da curadora ainda não foi configurada no servidor.", statusCode: 503);
    if (SenhaCorreta(ctx.Request.Headers["X-Mural-Senha"])) return null;
    await Task.Delay(1000); // deixa tentativas de adivinhar a senha bem lentas
    return Results.Problem("Senha incorreta.", statusCode: 401);
}

var api = app.MapGroup("/api");

api.MapGet("/albuns", async (HttpContext ctx) =>
{
    ctx.Response.Headers.CacheControl = "no-store";
    return Results.Ok(await repo.Ler());
});

api.MapPost("/entrar", async (Entrada entrada) =>
{
    if (senhaConfigurada.Length == 0)
        return Results.Problem("A senha da curadora ainda não foi configurada no servidor.", statusCode: 503);
    if (SenhaCorreta(entrada.Senha)) return Results.NoContent();
    await Task.Delay(1000);
    return Results.Problem("Senha incorreta.", statusCode: 401);
});

api.MapPost("/albuns", async (HttpContext ctx, NovoAlbum novo) =>
{
    if (await ExigirSenha(ctx) is { } negado) return negado;
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

api.MapPost("/albuns/{albumId}/cenas", async (HttpContext ctx, string albumId) =>
{
    if (await ExigirSenha(ctx) is { } negado) return negado;
    var form = await ctx.Request.ReadFormAsync();
    var foto = form.Files["foto"];
    if (foto is null || foto.Length == 0) return Results.Problem("Escolha uma foto.", statusCode: 400);
    if (foto.Length > TamanhoMaximo) return Results.Problem("A foto passou de 8 MB.", statusCode: 400);

    // Confere pelos primeiros bytes se é mesmo uma imagem (não confia no nome do arquivo).
    var cabecalho = new byte[12];
    await using (var leitura = foto.OpenReadStream())
        _ = await leitura.ReadAtLeastAsync(cabecalho, cabecalho.Length, throwOnEndOfStream: false);
    var extensao = TipoDaImagem(cabecalho);
    if (extensao is null) return Results.Problem("Esse arquivo não é uma imagem JPG, PNG ou WebP.", statusCode: 400);

    var cores = (form["cores"].ToString())
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Where(c => Regex.IsMatch(c, "^#[0-9A-Fa-f]{6}$"))
        .Select(c => c.ToUpperInvariant())
        .Take(6)
        .ToList();
    var anime = Limitar(form["anime"].ToString(), 80);
    var comentario = Limitar(form["comentario"].ToString(), 500);

    var albuns = await repo.Ler();
    if (albuns.All(a => a.Id != albumId)) return Results.Problem("Álbum não encontrado.", statusCode: 404);

    var cenaId = $"{Repositorio.Slug(anime.Length > 0 ? anime : "cena")}-{Guid.NewGuid().ToString("N")[..6]}";
    var pastaAlbum = Path.Combine(repo.PastaMidia, albumId);
    Directory.CreateDirectory(pastaAlbum);
    var nomeArquivo = cenaId + extensao;
    await using (var destino = File.Create(Path.Combine(pastaAlbum, nomeArquivo)))
        await foto.CopyToAsync(destino);

    var item = new Item
    {
        Id = cenaId,
        Url = $"midia/{albumId}/{nomeArquivo}",
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
        File.Delete(Path.Combine(pastaAlbum, nomeArquivo));
        return Results.Problem("Álbum não encontrado.", statusCode: 404);
    }
    return Results.Created($"/api/albuns/{albumId}/cenas/{item.Id}", item);
}).DisableAntiforgery();

api.MapDelete("/albuns/{albumId}/cenas/{cenaId}", async (HttpContext ctx, string albumId, string cenaId) =>
{
    if (await ExigirSenha(ctx) is { } negado) return negado;
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

    // Apaga a foto só se ela foi enviada pelo site (as de exemplo ficam).
    if (removido.Url.StartsWith("midia/"))
    {
        var caminho = Path.GetFullPath(Path.Combine(repo.PastaMidia, removido.Url["midia/".Length..]));
        if (caminho.StartsWith(Path.GetFullPath(repo.PastaMidia)) && File.Exists(caminho)) File.Delete(caminho);
    }
    return Results.NoContent();
});

// Qualquer outro endereço abre o site.
app.MapFallbackToFile("index.html");

app.Run();

static string? TipoDaImagem(byte[] b)
{
    if (b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return ".jpg";
    if (b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47) return ".png";
    if (b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return ".webp";
    return null;
}

static string Limitar(string texto, int maximo)
{
    texto = texto.Trim();
    return texto.Length > maximo ? texto[..maximo] : texto;
}
