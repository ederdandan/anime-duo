namespace Mural;

// ---------- Histórico: quem fez o quê, e quando (dados/historico.json) ----------

public class Evento
{
    public DateTimeOffset Quando { get; set; }
    public string Quem { get; set; } = "";
    public string Acao { get; set; } = "";
}

public class Historico(string pastaDados) : ArquivoJson<List<Evento>>(Path.Combine(pastaDados, "historico.json"))
{
    const int Maximo = 500; // guarda só os 500 mais recentes

    public Task Anotar(Quem quem, string acao) => Alterar(lista =>
    {
        lista.Insert(0, new Evento { Quando = DateTimeOffset.UtcNow, Quem = quem.Nome, Acao = acao });
        if (lista.Count > Maximo) lista.RemoveRange(Maximo, lista.Count - Maximo);
        return 0;
    });
}

// ---------- Lixeira: cenas apagadas ficam 30 dias aqui antes de sumir de vez (dados/lixeira.json) ----------

public class NaLixeira
{
    public string Id { get; set; } = "";
    public string AlbumId { get; set; } = "";
    public string AlbumTitulo { get; set; } = "";
    public Item Item { get; set; } = new();
    public DateTimeOffset ApagadaEm { get; set; }
    public string ApagadaPor { get; set; } = "";
}

public class Lixeira(string pastaDados) : ArquivoJson<List<NaLixeira>>(Path.Combine(pastaDados, "lixeira.json"))
{
    public static readonly TimeSpan Prazo = TimeSpan.FromDays(30);

    // Apaga de vez o que passou do prazo: a foto e os comentários da cena.
    public async Task Esvaziar(Repositorio repo, Comentarios comentarios, Func<NaLixeira, bool>? escolher = null)
    {
        escolher ??= x => DateTimeOffset.UtcNow - x.ApagadaEm > Prazo;
        var saindo = await Alterar(lista =>
        {
            var fora = lista.Where(escolher).ToList();
            lista.RemoveAll(x => fora.Contains(x));
            return fora;
        });
        foreach (var x in saindo)
        {
            repo.ApagarMidia(x.Item.Url);
            await comentarios.Alterar(l => l.RemoveAll(c => c.AlbumId == x.AlbumId && c.CenaId == x.Item.Id));
        }
    }
}
