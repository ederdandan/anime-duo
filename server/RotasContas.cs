using System.Net.Mail;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;

namespace Mural;

// Cadastro com e-mail e foto, entrar/sair, e a tela da curadora para liberar contas.
public static class RotasContas
{
    const string SoCuradoria = "Só a curadoria pode fazer isso.";
    const long FotoMaxima = 2 * 1024 * 1024; // o site já diminui a foto de perfil para 400px
    static readonly PasswordHasher<Conta> Embaralhador = new();

    public static void MapContas(this RouteGroupBuilder api)
    {
        api.MapGet("/contas/eu", async (HttpContext ctx, Contas contas) =>
        {
            ctx.Response.Headers.CacheControl = "no-store";
            var id = ctx.ContaLogada();
            var conta = id is null ? null : (await contas.Ler()).FirstOrDefault(c => c.Id == id);
            return conta is null ? Results.NoContent() : Results.Ok(ContaPublica.De(conta));
        });

        api.MapPost("/contas", async (HttpContext ctx, Contas contas, Repositorio repo) =>
        {
            var form = await ctx.Request.ReadFormAsync();
            var nome = Texto.Limitar(form["nome"], 40);
            var email = Texto.Limitar(form["email"], 120).ToLowerInvariant();
            var senha = form["senha"].ToString();
            var foto = form.Files["foto"];

            if (nome.Length == 0) return Erro("Escreva seu nome.");
            if (!EmailValido(email)) return Erro("Esse e-mail não parece certo.");
            if (senha.Length is < 8 or > 100) return Erro("A senha precisa ter pelo menos 8 letras ou números.");
            if (foto is null || foto.Length == 0) return Erro("Escolha uma foto de perfil.");
            if (foto.Length > FotoMaxima) return Erro("A foto passou de 2 MB.");
            var extensao = await Imagens.Extensao(foto);
            if (extensao is null) return Erro("A foto precisa ser JPG, PNG ou WebP.");

            var conta = new Conta
            {
                Id = Texto.NovoId(),
                Nome = nome,
                Email = email,
                Situacao = Situacoes.Aguardando,
                CriadaEm = DateTimeOffset.UtcNow,
            };
            conta.SenhaHash = Embaralhador.HashPassword(conta, senha);
            conta.Foto = $"midia/perfis/{conta.Id}-{Texto.NovoId()[..6]}{extensao}";

            var criada = await contas.Alterar(lista =>
            {
                if (lista.Any(c => c.Email == email)) return false;
                lista.Add(conta);
                return true;
            });
            if (!criada) return Erro("Já existe uma conta com esse e-mail. Tente entrar.", 409);

            await Imagens.Salvar(foto, Path.Combine(repo.PastaMidia, conta.Foto["midia/".Length..]));
            await Entrar(ctx, conta);
            return Results.Created("/api/contas/eu", ContaPublica.De(conta));
        }).DisableAntiforgery();

        api.MapPost("/contas/entrar", async (HttpContext ctx, Contas contas, EntradaConta entrada) =>
        {
            var email = (entrada.Email ?? "").Trim().ToLowerInvariant();
            var conta = (await contas.Ler()).FirstOrDefault(c => c.Email == email);
            var certa = conta is not null && entrada.Senha is { Length: > 0 }
                && Embaralhador.VerifyHashedPassword(conta, conta.SenhaHash, entrada.Senha) != PasswordVerificationResult.Failed;
            if (!certa)
            {
                await Task.Delay(1000); // deixa tentativas de adivinhar a senha bem lentas
                return Erro("E-mail ou senha incorretos.", 401);
            }
            await Entrar(ctx, conta!);
            return Results.Ok(ContaPublica.De(conta!));
        });

        api.MapPost("/contas/sair", async (HttpContext ctx) =>
        {
            await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.NoContent();
        });

        // ---------- Só a curadora ----------
        api.MapGet("/curadoria/contas", async (HttpContext ctx, Permissoes permissoes, Contas contas) =>
        {
            var quem = await permissoes.De(ctx);
            if (!quem.Curadora) return quem.Negado(SoCuradoria);
            ctx.Response.Headers.CacheControl = "no-store";
            var lista = await contas.Ler();
            return Results.Ok(lista.OrderByDescending(c => c.CriadaEm).Select(ContaCuradoria.De));
        });

        api.MapPost("/curadoria/contas/{id}/situacao", async (HttpContext ctx, string id, NovaSituacao nova,
            Permissoes permissoes, Contas contas, Comentarios comentarios, Historico historico) =>
        {
            var quem = await permissoes.De(ctx);
            if (!quem.Curadora) return quem.Negado(SoCuradoria);
            if (id == quem.ContaId) return Erro("Você não pode mudar a situação da sua própria conta.");
            if (nova.Situacao is not (Situacoes.Liberada or Situacoes.Recusada or Situacoes.Aguardando))
                return Erro("Situação inválida.");

            var conta = await contas.Alterar(lista =>
            {
                var c = lista.FirstOrDefault(c => c.Id == id);
                if (c is not null)
                {
                    c.Situacao = nova.Situacao;
                    if (c.Situacao != Situacoes.Liberada) c.Curadoria = false; // só conta liberada fica na curadoria
                }
                return c;
            });
            if (conta is null) return Erro("Conta não encontrada.", 404);

            // Recusada: os comentários dela (e as respostas a eles) saem do mural.
            if (conta.Situacao == Situacoes.Recusada)
                await comentarios.Alterar(lista => Comentarios.ApagarComRespostas(lista, c => c.ContaId == id));
            var verbo = conta.Situacao switch { Situacoes.Liberada => "liberou", Situacoes.Recusada => "recusou", _ => "voltou para a espera" };
            await historico.Anotar(quem, $"{verbo} a conta de {conta.Nome} ({conta.Email})");
            return Results.Ok(ContaCuradoria.De(conta));
        });

        // Pôr ou tirar uma conta (liberada) da curadoria.
        api.MapPost("/curadoria/contas/{id}/curadoria", async (HttpContext ctx, string id, NovoCargo novo,
            Permissoes permissoes, Contas contas, Historico historico) =>
        {
            var quem = await permissoes.De(ctx);
            if (!quem.Curadora) return quem.Negado(SoCuradoria);
            if (id == quem.ContaId) return Erro("Você não pode tirar a sua própria conta da curadoria.");

            var resultado = await contas.Alterar(lista =>
            {
                var c = lista.FirstOrDefault(c => c.Id == id);
                if (c is null) return (404, (Conta?)null);
                if (novo.Curadoria && c.Situacao != Situacoes.Liberada) return (400, c);
                c.Curadoria = novo.Curadoria;
                return (200, c);
            });
            return resultado switch
            {
                (404, _) => Erro("Conta não encontrada.", 404),
                (400, _) => Erro("Libere a conta antes de colocar na curadoria."),
                (_, var c) => await Anotado(historico, quem,
                    novo.Curadoria ? $"pôs {c!.Nome} na curadoria" : $"tirou {c!.Nome} da curadoria", ContaCuradoria.De(c!)),
            };
        });

        api.MapDelete("/curadoria/contas/{id}", async (HttpContext ctx, string id,
            Permissoes permissoes, Contas contas, Comentarios comentarios, Repositorio repo, Historico historico) =>
        {
            var quem = await permissoes.De(ctx);
            if (!quem.Curadora) return quem.Negado(SoCuradoria);
            if (id == quem.ContaId) return Erro("Você não pode apagar a sua própria conta por aqui.");
            var conta = await contas.Alterar(lista =>
            {
                var c = lista.FirstOrDefault(c => c.Id == id);
                if (c is not null) lista.Remove(c);
                return c;
            });
            if (conta is null) return Erro("Conta não encontrada.", 404);
            await comentarios.Alterar(lista => Comentarios.ApagarComRespostas(lista, c => c.ContaId == id));
            repo.ApagarMidia(conta.Foto);
            await historico.Anotar(quem, $"apagou a conta de {conta.Nome} ({conta.Email})");
            return Results.NoContent();
        });
    }

    static Task Entrar(HttpContext ctx, Conta conta)
    {
        var identidade = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, conta.Id)],
            CookieAuthenticationDefaults.AuthenticationScheme);
        return ctx.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identidade),
            new AuthenticationProperties { IsPersistent = true });
    }

    static bool EmailValido(string email) =>
        email.Length > 3 && MailAddress.TryCreate(email, out var m) && m.Address == email && email.Contains('.');

    static async Task<IResult> Anotado(Historico historico, Quem quem, string acao, object resposta)
    {
        await historico.Anotar(quem, acao);
        return Results.Ok(resposta);
    }

    public static IResult Erro(string mensagem, int status = 400) => Results.Problem(mensagem, statusCode: status);
}
