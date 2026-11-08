using System.Text.Json;

namespace Mural;

// Guarda uma lista num arquivo .json dentro de dados/.
// A "trava" garante que dois pedidos ao mesmo tempo não estraguem o arquivo.
public class ArquivoJson<T> where T : class, new()
{
    static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    readonly SemaphoreSlim trava = new(1, 1);
    protected readonly string arquivo;

    public ArquivoJson(string arquivo)
    {
        this.arquivo = arquivo;
        Directory.CreateDirectory(Path.GetDirectoryName(arquivo)!);
    }

    public async Task<T> Ler()
    {
        await trava.WaitAsync();
        try { return await LerSemTrava(); }
        finally { trava.Release(); }
    }

    // Lê, deixa a função mudar os dados e salva, tudo sem ninguém mexer no meio.
    public async Task<R> Alterar<R>(Func<T, R> mudanca)
    {
        await trava.WaitAsync();
        try
        {
            var dados = await LerSemTrava();
            var resultado = mudanca(dados);
            var temporario = arquivo + ".tmp";
            await File.WriteAllTextAsync(temporario, JsonSerializer.Serialize(dados, Json));
            File.Move(temporario, arquivo, overwrite: true);
            return resultado;
        }
        finally { trava.Release(); }
    }

    async Task<T> LerSemTrava()
    {
        if (!File.Exists(arquivo)) return new T();
        await using var fluxo = File.OpenRead(arquivo);
        return await JsonSerializer.DeserializeAsync<T>(fluxo, Json) ?? new T();
    }
}
