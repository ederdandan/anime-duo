using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Mural;

// A senha da curadora (a mesma da tela "Nova cena").
public class Curadoria(string senha)
{
    public bool Configurada => senha.Length > 0;

    public bool Confere(string? tentativa)
    {
        if (!Configurada || string.IsNullOrEmpty(tentativa)) return false;
        var a = SHA256.HashData(Encoding.UTF8.GetBytes(tentativa));
        var b = SHA256.HashData(Encoding.UTF8.GetBytes(senha));
        return CryptographicOperations.FixedTimeEquals(a, b);
    }

    public bool PedidoDaCuradora(HttpContext ctx) => Confere(ctx.Request.Headers["X-Mural-Senha"]);

    // Devolve null se a senha está certa; senão, a resposta de erro.
    public async Task<IResult?> Exigir(HttpContext ctx)
    {
        if (!Configurada)
            return Results.Problem("A senha da curadora ainda não foi configurada no servidor.", statusCode: 503);
        if (PedidoDaCuradora(ctx)) return null;
        await Task.Delay(1000); // deixa tentativas de adivinhar a senha bem lentas
        return Results.Problem("Senha incorreta.", statusCode: 401);
    }
}

public static class Imagens
{
    // Confere pelos primeiros bytes se é mesmo uma imagem (não confia no nome do arquivo).
    public static async Task<string?> Extensao(IFormFile foto)
    {
        var b = new byte[12];
        await using (var leitura = foto.OpenReadStream())
            _ = await leitura.ReadAtLeastAsync(b, b.Length, throwOnEndOfStream: false);
        if (b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return ".jpg";
        if (b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47) return ".png";
        if (b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return ".webp";
        return null;
    }

    public static async Task Salvar(IFormFile foto, string caminho)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(caminho)!);
        await using var destino = File.Create(caminho);
        await foto.CopyToAsync(destino);
    }
}

public static class Texto
{
    public static string Limitar(string? texto, int maximo)
    {
        texto = (texto ?? "").Trim();
        return texto.Length > maximo ? texto[..maximo] : texto;
    }

    public static string NovoId() => Guid.NewGuid().ToString("N")[..10];

    // Id da conta que está logada (vem do cookie), ou null.
    public static string? ContaLogada(this HttpContext ctx) =>
        ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
}
