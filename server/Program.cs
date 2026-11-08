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
app.MapFallbackToFile("index.html");

app.Run();
