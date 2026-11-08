using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;
using Mural;

// Servidor do Mural Anime:
// - entrega o site (pasta wwwroot)
// - /api/...  lê e grava os álbuns, as contas e os comentários
// - /midia/... entrega as fotos enviadas pela curadora e as fotos de perfil

var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = 9 * 1024 * 1024);

var pastaDados = builder.Configuration["Mural:PastaDados"] is { Length: > 0 } p
    ? p
    : Path.Combine(builder.Environment.ContentRootPath, "dados");
var semente = Path.Combine(AppContext.BaseDirectory, "semente", "albuns.json");
var repo = new Repositorio(pastaDados, semente);

builder.Services.AddSingleton(repo);
builder.Services.AddSingleton(new Curadoria(builder.Configuration["Mural:Senha"] ?? ""));
builder.Services.AddSingleton(new Contas(pastaDados));
builder.Services.AddSingleton(new Comentarios(pastaDados));
builder.Services.AddSingleton<Permissoes>();
builder.Services.AddSingleton(new Historico(pastaDados));
builder.Services.AddSingleton(new Lixeira(pastaDados));

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

// Quem abrir pelo endereço http:// vai para o https:// (com cadeado).
// No computador (localhost) continua em http, para facilitar os testes.
app.Use(async (ctx, next) =>
{
    var host = ctx.Request.Host.Host;
    var local = host is "localhost" or "127.0.0.1" or "[::1]";
    var jaSeguro = ctx.Request.IsHttps || ctx.Request.Headers["X-Forwarded-Proto"] == "https";
    if (!local && !jaSeguro)
    {
        var destino = $"https://{ctx.Request.Host}{ctx.Request.PathBase}{ctx.Request.Path}{ctx.Request.QueryString}";
        ctx.Response.Redirect(destino, permanent: false, preserveMethod: true);
        return;
    }
    await next();
});

app.UseDefaultFiles();
// Arquivos do site:
// - /assets: o nome muda quando o conteúdo muda, então o celular pode guardar por 1 ano.
// - /icones e /images: guarda por 1 semana.
// - index.html, sw.js e o manifesto: sempre conferir se tem versão nova.
var tipos = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
tipos.Mappings[".webmanifest"] = "application/manifest+json";
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = tipos,
    OnPrepareResponse = c =>
    {
        var caminho = c.Context.Request.Path.Value ?? "";
        c.Context.Response.Headers.CacheControl =
            caminho.StartsWith("/assets/") ? "public, max-age=31536000, immutable"
            : caminho.StartsWith("/icones/") || caminho.StartsWith("/images/") ? "public, max-age=604800"
            : "no-cache";
    },
});
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

api.MapPost("/entrar", async (Entrada entrada, Curadoria curadoria) =>
{
    if (!curadoria.Configurada)
        return Results.Problem("A senha da curadora ainda não foi configurada no servidor.", statusCode: 503);
    if (curadoria.Confere(entrada.Senha)) return Results.NoContent();
    await Task.Delay(1000);
    return Results.Problem("Senha incorreta.", statusCode: 401);
});

api.MapAlbuns();
api.MapCuradoria();

// Qualquer outro endereço abre o site.
app.MapFallbackToFile("index.html", new StaticFileOptions
{
    OnPrepareResponse = c => c.Context.Response.Headers.CacheControl = "no-cache",
});

app.Run();
