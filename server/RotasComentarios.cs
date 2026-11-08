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
                .Select(c => new ComentarioPublico(c.Id, c.RespostaDe, c.Texto, c.CriadoEm, ContaPublica.De(autores[c.ContaId])));
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

            return Results.Created($"/api/comentarios/{comentario.Id}",
                new ComentarioPublico(comentario.Id, comentario.RespostaDe, comentario.Texto, comentario.CriadoEm, ContaPublica.De(conta)));
        });

        // A curadora apaga qualquer um; cada pessoa apaga os seus. As respostas embaixo saem junto.
        api.MapDelete("/comentarios/{id}", async (HttpContext ctx, string id, Comentarios comentarios, Curadoria curadoria) =>
        {
            var daCuradora = curadoria.PedidoDaCuradora(ctx);
            var contaId = ctx.ContaLogada();
            var resultado = await comentarios.Alterar(lista =>
            {
                var c = lista.FirstOrDefault(c => c.Id == id);
                if (c is null) return 404;
                if (!daCuradora && c.ContaId != contaId) return 403;
                Comentarios.ApagarComRespostas(lista, x => x.Id == id);
                return 204;
            });
            return resultado switch
            {
                404 => RotasContas.Erro("Comentário não encontrado.", 404),
                403 => RotasContas.Erro("Só dá para apagar os seus comentários.", 403),
                _ => Results.NoContent(),
            };
        });
    }
}
