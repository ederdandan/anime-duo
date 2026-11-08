namespace Mural;

// Comentários nas cenas, com respostas dentro de respostas (sem limite).
// O servidor devolve uma lista "reta"; o site monta a árvore usando RespostaDe.
public static class RotasComentarios
{
    public static void MapComentarios(this RouteGroupBuilder api)
    {
        api.MapGet("/albuns/{albumId}/cenas/{cenaId}/comentarios", async (HttpContext ctx, string albumId, string cenaId,
            Comentarios comentarios, Contas contas) =>
        {
            ctx.Response.Headers.CacheControl = "no-store";
            var autores = (await contas.Ler()).Where(c => c.Situacao == Situacoes.Liberada).ToDictionary(c => c.Id);
            var lista = (await comentarios.Ler())
                .Where(c => c.AlbumId == albumId && c.CenaId == cenaId && autores.ContainsKey(c.ContaId))
                .OrderBy(c => c.CriadoEm)
                .Select(c => ComentarioPublico.De(c, autores[c.ContaId]));
            return Results.Ok(lista);
        });

        api.MapPost("/albuns/{albumId}/cenas/{cenaId}/comentarios", async (HttpContext ctx, string albumId, string cenaId,
            NovoComentario novo, Comentarios comentarios, Contas contas, Repositorio repo) =>
        {
            var contaId = ctx.ContaLogada();
            var conta = contaId is null ? null : (await contas.Ler()).FirstOrDefault(c => c.Id == contaId);
            if (conta is null) return RotasContas.Erro("Entre na sua conta para comentar.", 401);
            if (conta.Situacao == Situacoes.Recusada)
                return RotasContas.Erro("Sua conta não foi liberada para comentar.", 403);
            if (conta.Situacao != Situacoes.Liberada)
                return RotasContas.Erro("Sua conta ainda não foi liberada pela curadora.", 403);

            var texto = Texto.Limitar(novo.Texto, 1000);
            if (texto.Length == 0) return RotasContas.Erro("Escreva alguma coisa.");

            var albuns = await repo.Ler();
            if (!albuns.Any(a => a.Id == albumId && a.Itens.Any(i => i.Id == cenaId)))
                return RotasContas.Erro("Cena não encontrada.", 404);

            var comentario = new Comentario
            {
                Id = Texto.NovoId(),
                AlbumId = albumId,
                CenaId = cenaId,
                RespostaDe = string.IsNullOrEmpty(novo.RespostaDe) ? null : novo.RespostaDe,
                ContaId = conta.Id,
                Texto = texto,
                CriadoEm = DateTimeOffset.UtcNow,
            };
            var salvo = await comentarios.Alterar(lista =>
            {
                // Só dá para responder a um comentário da mesma cena.
                if (comentario.RespostaDe is { } pai && !lista.Any(c => c.Id == pai && c.AlbumId == albumId && c.CenaId == cenaId))
                    return false;
                lista.Add(comentario);
                return true;
            });
            if (!salvo) return RotasContas.Erro("O comentário que você quer responder foi apagado.", 404);

            return Results.Created($"/api/comentarios/{comentario.Id}", ComentarioPublico.De(comentario, conta));
        });

        // Só quem escreveu pode editar o próprio comentário.
        api.MapPut("/comentarios/{id}", async (HttpContext ctx, string id, TextoComentario dados,
            Comentarios comentarios, Permissoes permissoes) =>
        {
            var quem = await permissoes.De(ctx);
            if (quem.ContaId is null) return quem.Negado("Só quem escreveu pode editar o comentário.");
            var texto = Texto.Limitar(dados.Texto, 1000);
            if (texto.Length == 0) return RotasContas.Erro("Escreva alguma coisa.");

            Comentario? editado = null;
            var resultado = await comentarios.Alterar(lista =>
            {
                var c = lista.FirstOrDefault(c => c.Id == id);
                if (c is null) return 404;
                if (c.ContaId != quem.ContaId) return 403;
                c.Texto = texto;
                c.EditadoEm = DateTimeOffset.UtcNow;
                editado = c;
                return 200;
            });
            return resultado switch
            {
                404 => RotasContas.Erro("Comentário não encontrado.", 404),
                403 => RotasContas.Erro("Só dá para editar os seus comentários.", 403),
                _ => Results.Ok(ComentarioPublico.De(editado!, quem.Conta!)),
            };
        });

        // Quem pode apagar: quem escreveu, o dono do álbum (para tirar comentários indesejados) e a curadora.
        // As respostas embaixo saem junto.
        api.MapDelete("/comentarios/{id}", async (HttpContext ctx, string id, Comentarios comentarios,
            Permissoes permissoes, Repositorio repo) =>
        {
            var quem = await permissoes.De(ctx);
            if (quem.SenhaErrada) return quem.Negado("Senha incorreta.");
            var albuns = await repo.Ler();
            var resultado = await comentarios.Alterar(lista =>
            {
                var c = lista.FirstOrDefault(c => c.Id == id);
                if (c is null) return 404;
                var album = albuns.FirstOrDefault(a => a.Id == c.AlbumId);
                var pode = quem.Curadora
                    || (quem.ContaId is { } eu && c.ContaId == eu)
                    || (album is not null && quem.DonoDe(album));
                if (!pode) return 403;
                Comentarios.ApagarComRespostas(lista, x => x.Id == id);
                return 204;
            });
            return resultado switch
            {
                404 => RotasContas.Erro("Comentário não encontrado.", 404),
                403 => RotasContas.Erro("Só quem escreveu, o dono do álbum ou a curadora pode apagar esse comentário.", 403),
                _ => Results.NoContent(),
            };
        });
    }
}
