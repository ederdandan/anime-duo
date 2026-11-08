using System.Text.RegularExpressions;

namespace Mural;

// Álbuns e cenas.
// - Criar álbum: conta liberada (vira dona) ou curadora.
// - Adicionar, editar e apagar cenas, editar o álbum: só o dono do álbum ou a curadora.
public static class RotasAlbuns
{
    const long TamanhoMaximo = 8 * 1024 * 1024; // 8 MB por foto (o site já comprime antes de enviar)
    const string SoDono = "Só quem criou o álbum (ou a curadora) pode mexer nele.";

    public static void MapAlbuns(this RouteGroupBuilder api)
    {
        api.MapGet("/albuns", async (HttpContext ctx, Repositorio repo, Contas contas) =>
        {
            ctx.Response.Headers.CacheControl = "no-store";
            var donos = (await contas.Ler()).Where(c => c.Situacao == Situacoes.Liberada).ToDictionary(c => c.Id);
            return Results.Ok((await repo.Ler()).Select(a => new AlbumPublico(
                a.Id, a.Titulo, a.Descricao, a.Capa, a.DonoId,
                a.DonoId is { } d && donos.TryGetValue(d, out var dono) ? ContaPublica.De(dono) : null,
                a.Itens)));
        });

        // Criar álbum: sempre junto com a primeira cena (com foto). Assim nunca nasce álbum vazio.
        api.MapPost("/albuns", async (HttpContext ctx, Repositorio repo, Permissoes permissoes, Historico historico) =>
        {
            var quem = await permissoes.De(ctx);
            if (quem.SenhaErrada || !quem.PodePostar) return quem.Negado("Você não pode criar álbuns.");
            var form = await ctx.Request.ReadFormAsync();
            var titulo = form["titulo"].ToString().Trim();
            if (titulo.Length is 0 or > 80) return RotasContas.Erro("Dê um nome ao álbum (até 80 letras).");
            var (cena, erro) = await LerCena(form);
            if (cena is null) return erro!;

            var baseId = Repositorio.Slug(titulo);
            var lista0 = await repo.Ler();
            var id = baseId;
            for (var n = 2; lista0.Any(a => a.Id == id); n++) id = $"{baseId}-{n}";

            var item = await SalvarCena(cena, id, repo);
            // Se tem conta logada, ela é a dona (mesmo que seja a curadora usando a conta dela).
            var album = new Album
            {
                Id = id, Titulo = titulo, Descricao = Texto.Limitar(form["descricao"], 200),
                DonoId = quem.ContaId, Capa = item.Url, Itens = [item],
            };
            var criado = await repo.Alterar(albuns =>
            {
                if (albuns.Any(a => a.Id == id)) return false; // alguém criou um com o mesmo nome agora mesmo
                albuns.Add(album);
                return true;
            });
            if (!criado)
            {
                repo.ApagarMidia(item.Url);
                return RotasContas.Erro("Já existe um álbum com esse nome. Tente de novo.", 409);
            }
            await historico.Anotar(quem, $"criou o álbum \"{album.Titulo}\" com a cena \"{RotasCuradoria.Titulo(item)}\"");
            return Results.Created($"/api/albuns/{album.Id}", album);
        }).DisableAntiforgery();

        // Editar nome e descrição (o id e o endereço continuam os mesmos).
        api.MapPut("/albuns/{albumId}", async (HttpContext ctx, string albumId, NovoAlbum dados, Repositorio repo,
            Permissoes permissoes, Historico historico) =>
        {
            var quem = await permissoes.De(ctx);
            var antigo = (await repo.Ler()).FirstOrDefault(a => a.Id == albumId)?.Titulo;
            var titulo = (dados.Titulo ?? "").Trim();
            if (titulo.Length is 0 or > 80) return RotasContas.Erro("Dê um nome ao álbum (até 80 letras).");
            var descricao = Texto.Limitar(dados.Descricao, 200);

            var resultado = await repo.Alterar(lista =>
            {
                var a = lista.FirstOrDefault(a => a.Id == albumId);
                if (a is null) return 404;
                if (!quem.PodeMexer(a)) return 403;
                a.Titulo = titulo;
                a.Descricao = descricao;
                return 200;
            });
            return resultado switch
            {
                404 => RotasContas.Erro("Álbum não encontrado.", 404),
                403 => quem.Negado(SoDono),
                _ => await Anotado(historico, quem, antigo == titulo
                    ? $"editou a descrição do álbum \"{titulo}\""
                    : $"renomeou o álbum \"{antigo}\" para \"{titulo}\""),
            };
        });

        // Editar o texto de uma cena: de qual anime é e o comentário de quem postou.
        api.MapPut("/albuns/{albumId}/cenas/{cenaId}", async (HttpContext ctx, string albumId, string cenaId, TextoCena dados,
            Repositorio repo, Permissoes permissoes, Historico historico) =>
        {
            var quem = await permissoes.De(ctx);
            var anime = Texto.Limitar(dados.Anime, 80);
            var comentario = Texto.Limitar(dados.Comentario, 500);
            if (comentario.Length == 0) return RotasContas.Erro("Escreva por que essa cena te inspira.");

            var nomeAlbum = "";
            var resultado = await repo.Alterar(lista =>
            {
                var a = lista.FirstOrDefault(a => a.Id == albumId);
                var i = a?.Itens.FirstOrDefault(i => i.Id == cenaId);
                if (a is null || i is null) return 404;
                if (!quem.PodeMexer(a)) return 403;
                i.Anime = anime;
                i.Comentario = comentario;
                nomeAlbum = a.Titulo;
                return 200;
            });
            return resultado switch
            {
                404 => RotasContas.Erro("Cena não encontrada.", 404),
                403 => quem.Negado(SoDono),
                _ => await Anotado(historico, quem, $"editou o texto da cena \"{RotasCuradoria.Titulo(new Item { Anime = anime, Comentario = comentario })}\" (álbum \"{nomeAlbum}\")"),
            };
        });

        api.MapPost("/albuns/{albumId}/cenas", async (HttpContext ctx, string albumId, Repositorio repo, Permissoes permissoes, Historico historico) =>
        {
            var quem = await permissoes.De(ctx);
            var album = (await repo.Ler()).FirstOrDefault(a => a.Id == albumId);
            if (album is null) return RotasContas.Erro("Álbum não encontrado.", 404);
            if (!quem.PodeMexer(album)) return quem.Negado("Só quem criou o álbum (ou a curadora) pode colocar cenas nele.");

            var form = await ctx.Request.ReadFormAsync();
            var (cena, erro) = await LerCena(form);
            if (cena is null) return erro!;
            var item = await SalvarCena(cena, albumId, repo);
            var url = item.Url;

            var salvo = await repo.Alterar(lista =>
            {
                var a = lista.FirstOrDefault(a => a.Id == albumId);
                if (a is null) return false;
                a.Itens.Add(item);
                if (string.IsNullOrEmpty(a.Capa)) a.Capa = item.Url;
                return true;
            });
            if (!salvo)
            {
                repo.ApagarMidia(url);
                return RotasContas.Erro("Álbum não encontrado.", 404);
            }
            await historico.Anotar(quem, $"postou a cena \"{RotasCuradoria.Titulo(item)}\" no álbum \"{album.Titulo}\"");
            return Results.Created($"/api/albuns/{albumId}/cenas/{item.Id}", item);
        }).DisableAntiforgery();

        // Apagar cena: vai para a lixeira (a curadoria pode restaurar por 30 dias).
        api.MapDelete("/albuns/{albumId}/cenas/{cenaId}", async (HttpContext ctx, string albumId, string cenaId,
            Repositorio repo, Permissoes permissoes, Lixeira lixeira, Historico historico) =>
        {
            var quem = await permissoes.De(ctx);
            Item? removido = null;
            var titulo = "";
            var resultado = await repo.Alterar(lista =>
            {
                var a = lista.FirstOrDefault(a => a.Id == albumId);
                var i = a?.Itens.FirstOrDefault(i => i.Id == cenaId);
                if (a is null || i is null) return 404;
                if (!quem.PodeMexer(a)) return 403;
                a.Itens.Remove(i);
                if (a.Capa == i.Url) a.Capa = a.Itens.FirstOrDefault()?.Url ?? "";
                removido = i;
                titulo = a.Titulo;
                return 204;
            });
            if (resultado == 404) return RotasContas.Erro("Cena não encontrada.", 404);
            if (resultado == 403) return quem.Negado(SoDono);

            // A foto e os comentários ficam guardados; só somem de vez depois de 30 dias na lixeira.
            await lixeira.Alterar(l =>
            {
                l.Add(new NaLixeira
                {
                    Id = Texto.NovoId(), AlbumId = albumId, AlbumTitulo = titulo, Item = removido!,
                    ApagadaEm = DateTimeOffset.UtcNow, ApagadaPor = quem.Nome,
                });
                return 0;
            });
            await historico.Anotar(quem, $"mandou a cena \"{RotasCuradoria.Titulo(removido!)}\" do álbum \"{titulo}\" para a lixeira");
            return Results.NoContent();
        });
    }

    static async Task<IResult> Anotado(Historico historico, Quem quem, string acao)
    {
        await historico.Anotar(quem, acao);
        return Results.NoContent();
    }

    // O que chega do formulário de uma cena, já conferido.
    record CenaRecebida(IFormFile Foto, string Extensao, string Anime, string Comentario, List<string> Cores);

    // Confere a cena: a foto é obrigatória e precisa ser uma imagem de verdade.
    static async Task<(CenaRecebida?, IResult?)> LerCena(IFormCollection form)
    {
        var foto = form.Files["foto"];
        if (foto is null || foto.Length == 0) return (null, RotasContas.Erro("Escolha uma foto. Toda cena precisa de foto."));
        if (foto.Length > TamanhoMaximo) return (null, RotasContas.Erro("A foto passou de 8 MB."));
        var extensao = await Imagens.Extensao(foto);
        if (extensao is null) return (null, RotasContas.Erro("Esse arquivo não é uma imagem JPG, PNG ou WebP."));

        var cores = form["cores"].ToString()
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(c => Regex.IsMatch(c, "^#[0-9A-Fa-f]{6}$"))
            .Select(c => c.ToUpperInvariant())
            .Take(6)
            .ToList();
        return (new CenaRecebida(foto, extensao, Texto.Limitar(form["anime"], 80), Texto.Limitar(form["comentario"], 500), cores), null);
    }

    // Grava a foto em midia/<álbum>/ e devolve a cena pronta para entrar no álbum.
    static async Task<Item> SalvarCena(CenaRecebida c, string albumId, Repositorio repo)
    {
        var cenaId = $"{Repositorio.Slug(c.Anime.Length > 0 ? c.Anime : "cena")}-{Guid.NewGuid().ToString("N")[..6]}";
        var nomeArquivo = cenaId + c.Extensao;
        await Imagens.Salvar(c.Foto, Path.Combine(repo.PastaMidia, albumId, nomeArquivo));
        return new Item { Id = cenaId, Url = $"midia/{albumId}/{nomeArquivo}", Anime = c.Anime, Comentario = c.Comentario, Cores = c.Cores };
    }
}
