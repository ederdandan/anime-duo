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

        api.MapPost("/albuns", async (HttpContext ctx, NovoAlbum novo, Repositorio repo, Permissoes permissoes) =>
        {
            var quem = await permissoes.De(ctx);
            if (quem.SenhaErrada || !quem.PodePostar) return quem.Negado("Você não pode criar álbuns.");
            var titulo = (novo.Titulo ?? "").Trim();
            if (titulo.Length is 0 or > 80) return RotasContas.Erro("Dê um nome ao álbum (até 80 letras).");

            var album = await repo.Alterar(albuns =>
            {
                var baseId = Repositorio.Slug(titulo);
                var id = baseId;
                for (var n = 2; albuns.Any(a => a.Id == id); n++) id = $"{baseId}-{n}";
                // Se tem conta logada, ela é a dona (mesmo que seja a curadora usando a conta dela).
                var a = new Album { Id = id, Titulo = titulo, Descricao = Texto.Limitar(novo.Descricao, 200), DonoId = quem.ContaId };
                albuns.Add(a);
                return a;
            });
            return Results.Created($"/api/albuns/{album.Id}", album);
        });

        // Editar nome e descrição (o id e o endereço continuam os mesmos).
        api.MapPut("/albuns/{albumId}", async (HttpContext ctx, string albumId, NovoAlbum dados, Repositorio repo, Permissoes permissoes) =>
        {
            var quem = await permissoes.De(ctx);
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
                _ => Results.NoContent(),
            };
        });

        // Editar o texto de uma cena: de qual anime é e o comentário de quem postou.
        api.MapPut("/albuns/{albumId}/cenas/{cenaId}", async (HttpContext ctx, string albumId, string cenaId, TextoCena dados,
            Repositorio repo, Permissoes permissoes) =>
        {
            var quem = await permissoes.De(ctx);
            var anime = Texto.Limitar(dados.Anime, 80);
            var comentario = Texto.Limitar(dados.Comentario, 500);
            if (comentario.Length == 0) return RotasContas.Erro("Escreva por que essa cena te inspira.");

            var resultado = await repo.Alterar(lista =>
            {
                var a = lista.FirstOrDefault(a => a.Id == albumId);
                var i = a?.Itens.FirstOrDefault(i => i.Id == cenaId);
                if (a is null || i is null) return 404;
                if (!quem.PodeMexer(a)) return 403;
                i.Anime = anime;
                i.Comentario = comentario;
                return 200;
            });
            return resultado switch
            {
                404 => RotasContas.Erro("Cena não encontrada.", 404),
                403 => quem.Negado(SoDono),
                _ => Results.NoContent(),
            };
        });

        api.MapPost("/albuns/{albumId}/cenas", async (HttpContext ctx, string albumId, Repositorio repo, Permissoes permissoes) =>
        {
            var quem = await permissoes.De(ctx);
            var album = (await repo.Ler()).FirstOrDefault(a => a.Id == albumId);
            if (album is null) return RotasContas.Erro("Álbum não encontrado.", 404);
            if (!quem.PodeMexer(album)) return quem.Negado("Só quem criou o álbum (ou a curadora) pode colocar cenas nele.");

            var form = await ctx.Request.ReadFormAsync();
            var foto = form.Files["foto"];
            if (foto is null || foto.Length == 0) return RotasContas.Erro("Escolha uma foto.");
            if (foto.Length > TamanhoMaximo) return RotasContas.Erro("A foto passou de 8 MB.");
            var extensao = await Imagens.Extensao(foto);
            if (extensao is null) return RotasContas.Erro("Esse arquivo não é uma imagem JPG, PNG ou WebP.");

            var cores = form["cores"].ToString()
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(c => Regex.IsMatch(c, "^#[0-9A-Fa-f]{6}$"))
                .Select(c => c.ToUpperInvariant())
                .Take(6)
                .ToList();
            var anime = Texto.Limitar(form["anime"], 80);
            var comentario = Texto.Limitar(form["comentario"], 500);

            var cenaId = $"{Repositorio.Slug(anime.Length > 0 ? anime : "cena")}-{Guid.NewGuid().ToString("N")[..6]}";
            var nomeArquivo = cenaId + extensao;
            var url = $"midia/{albumId}/{nomeArquivo}";
            await Imagens.Salvar(foto, Path.Combine(repo.PastaMidia, albumId, nomeArquivo));

            var item = new Item { Id = cenaId, Url = url, Anime = anime, Comentario = comentario, Cores = cores };
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
            return Results.Created($"/api/albuns/{albumId}/cenas/{item.Id}", item);
        }).DisableAntiforgery();

        api.MapDelete("/albuns/{albumId}/cenas/{cenaId}", async (HttpContext ctx, string albumId, string cenaId,
            Repositorio repo, Permissoes permissoes, Comentarios comentarios) =>
        {
            var quem = await permissoes.De(ctx);
            Item? removido = null;
            var resultado = await repo.Alterar(lista =>
            {
                var a = lista.FirstOrDefault(a => a.Id == albumId);
                var i = a?.Itens.FirstOrDefault(i => i.Id == cenaId);
                if (a is null || i is null) return 404;
                if (!quem.PodeMexer(a)) return 403;
                a.Itens.Remove(i);
                if (a.Capa == i.Url) a.Capa = a.Itens.FirstOrDefault()?.Url ?? "";
                removido = i;
                return 204;
            });
            if (resultado == 404) return RotasContas.Erro("Cena não encontrada.", 404);
            if (resultado == 403) return quem.Negado(SoDono);

            // Apaga a foto só se ela foi enviada pelo site (as de exemplo ficam), e os comentários da cena.
            repo.ApagarMidia(removido!.Url);
            await comentarios.Alterar(lista => lista.RemoveAll(c => c.AlbumId == albumId && c.CenaId == cenaId));
            return Results.NoContent();
        });
    }
}
