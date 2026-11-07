using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Mural;

// Guarda os álbuns em dados/albuns.json e as fotos em dados/midia/<álbum>/.
public partial class Repositorio
{
    static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    readonly SemaphoreSlim trava = new(1, 1);
    readonly string arquivo;

    public string PastaMidia { get; }

    public Repositorio(string pastaDados, string semente)
    {
        Directory.CreateDirectory(pastaDados);
        PastaMidia = Path.Combine(pastaDados, "midia");
        Directory.CreateDirectory(PastaMidia);
        arquivo = Path.Combine(pastaDados, "albuns.json");

        // Primeira vez: começa com os álbuns de exemplo.
        if (!File.Exists(arquivo) && File.Exists(semente))
            File.Copy(semente, arquivo);
    }

    public async Task<List<Album>> Ler()
    {
        await trava.WaitAsync();
        try { return await LerSemTrava(); }
        finally { trava.Release(); }
    }

    // Lê, deixa a função mudar a lista e salva, tudo sem ninguém mexer no meio.
    public async Task<T> Alterar<T>(Func<List<Album>, T> mudanca)
    {
        await trava.WaitAsync();
        try
        {
            var albuns = await LerSemTrava();
            var resultado = mudanca(albuns);
            var temporario = arquivo + ".tmp";
            await File.WriteAllTextAsync(temporario, JsonSerializer.Serialize(albuns, Json));
            File.Move(temporario, arquivo, overwrite: true);
            return resultado;
        }
        finally { trava.Release(); }
    }

    async Task<List<Album>> LerSemTrava()
    {
        if (!File.Exists(arquivo)) return [];
        await using var fluxo = File.OpenRead(arquivo);
        return await JsonSerializer.DeserializeAsync<List<Album>>(fluxo, Json) ?? [];
    }

    // "Céus de Shinkai!" -> "ceus-de-shinkai"
    public static string Slug(string texto)
    {
        var semAcento = new StringBuilder();
        foreach (var c in texto.Normalize(NormalizationForm.FormD))
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                semAcento.Append(c);
        var slug = NaoAlfanumerico().Replace(semAcento.ToString().ToLowerInvariant(), "-").Trim('-');
        if (slug.Length > 40) slug = slug[..40].Trim('-');
        return slug.Length == 0 ? "album" : slug;
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NaoAlfanumerico();
}
