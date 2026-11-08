using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Mural;

// Guarda os álbuns em dados/albuns.json e as fotos em dados/midia/<álbum>/.
public partial class Repositorio : ArquivoJson<List<Album>>
{
    public string PastaMidia { get; }

    public Repositorio(string pastaDados, string semente) : base(Path.Combine(pastaDados, "albuns.json"))
    {
        PastaMidia = Path.Combine(pastaDados, "midia");
        Directory.CreateDirectory(PastaMidia);

        // Primeira vez: começa com os álbuns de exemplo.
        if (!File.Exists(arquivo) && File.Exists(semente))
            File.Copy(semente, arquivo);
    }

    // Apaga um arquivo que está dentro de midia/ (nunca fora dela).
    public void ApagarMidia(string url)
    {
        if (!url.StartsWith("midia/")) return;
        var raiz = Path.GetFullPath(PastaMidia) + Path.DirectorySeparatorChar;
        var caminho = Path.GetFullPath(Path.Combine(PastaMidia, url["midia/".Length..]));
        if (caminho.StartsWith(raiz) && File.Exists(caminho)) File.Delete(caminho);
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
