namespace Mural;

// Lixeira e histórico: só a curadoria vê.
public static class RotasCuradoria
{
    const string SoCuradoria = "Só a curadoria pode fazer isso.";

    public static void MapCuradoria(this RouteGroupBuilder api)
    {
        api.MapGet("/curadoria/historico", async (HttpContext ctx, Permissoes permissoes, Historico historico) =>
        {
            var quem = await permissoes.De(ctx);
            if (!quem.Curadora) return quem.Negado(SoCuradoria);
            ctx.Response.Headers.CacheControl = "no-store";
            return Results.Ok(await historico.Ler());
        });

        api.MapGet("/curadoria/lixeira", async (HttpContext ctx, Permissoes permissoes, Lixeira lixeira,
            Repositorio repo, Comentarios comentarios) =>
        {
            var quem = await permissoes.De(ctx);
            if (!quem.Curadora) return quem.Negado(SoCuradoria);
            ctx.Response.Headers.CacheControl = "no-store";
            await lixeira.Esvaziar(repo, comentarios); // tira o que passou de 30 dias
            var lista = await lixeira.Ler();
            return Results.Ok(lista.OrderByDescending(x => x.ApagadaEm).Select(x => new
            {
                x.Id, x.AlbumId, x.AlbumTitulo, x.Item, x.ApagadaEm, x.ApagadaPor,
                SomeEm = x.ApagadaEm + Lixeira.Prazo,
            }));
        });

        // Devolve a cena para o álbum dela (com os comentários, que ficaram guardados).
        api.MapPost("/curadoria/lixeira/{id}/restaurar", async (HttpContext ctx, string id, Permissoes permissoes,
            Lixeira lixeira, Repositorio repo, Historico historico) =>
        {
            var quem = await permissoes.De(ctx);
            if (!quem.Curadora) return quem.Negado(SoCuradoria);
            var x = (await lixeira.Ler()).FirstOrDefault(x => x.Id == id);
            if (x is null) return RotasContas.Erro("Essa cena não está mais na lixeira.", 404);

            var voltou = await repo.Alterar(lista =>
            {
                var a = lista.FirstOrDefault(a => a.Id == x.AlbumId);
                if (a is null) return false;
                if (a.Itens.All(i => i.Id != x.Item.Id)) a.Itens.Add(x.Item);
                if (string.IsNullOrEmpty(a.Capa)) a.Capa = x.Item.Url;
                return true;
            });
            if (!voltou) return RotasContas.Erro($"O álbum \"{x.AlbumTitulo}\" não existe mais.", 409);

            await lixeira.Alterar(l => l.RemoveAll(y => y.Id == id));
            await historico.Anotar(quem, $"restaurou a cena \"{Titulo(x.Item)}\" no álbum \"{x.AlbumTitulo}\"");
            return Results.NoContent();
        });

        // Apaga de vez, sem esperar os 30 dias.
        api.MapDelete("/curadoria/lixeira/{id}", async (HttpContext ctx, string id, Permissoes permissoes,
            Lixeira lixeira, Repositorio repo, Comentarios comentarios, Historico historico) =>
        {
            var quem = await permissoes.De(ctx);
            if (!quem.Curadora) return quem.Negado(SoCuradoria);
            var x = (await lixeira.Ler()).FirstOrDefault(x => x.Id == id);
            if (x is null) return RotasContas.Erro("Essa cena não está mais na lixeira.", 404);
            await lixeira.Esvaziar(repo, comentarios, y => y.Id == id);
            await historico.Anotar(quem, $"apagou de vez a cena \"{Titulo(x.Item)}\" (álbum \"{x.AlbumTitulo}\")");
            return Results.NoContent();
        });
    }

    // Um nome curto para a cena no histórico
    public static string Titulo(Item i)
    {
        var t = i.Anime.Length > 0 ? i.Anime : i.Comentario;
        return t.Length > 40 ? t[..40] + "…" : t;
    }
}
