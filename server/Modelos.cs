namespace Mural;

// Mesmo formato do src/types.ts do site.
public class Item
{
    public string Id { get; set; } = "";
    public string Url { get; set; } = "";
    public string Anime { get; set; } = "";
    public string Comentario { get; set; } = "";
    public List<string> Cores { get; set; } = [];
}

public class Album
{
    public string Id { get; set; } = "";
    public string Titulo { get; set; } = "";
    public string Descricao { get; set; } = "";
    public string Capa { get; set; } = "";
    public string? DonoId { get; set; }  // conta que criou o álbum (null = só a curadora mexe)
    public List<Item> Itens { get; set; } = [];
}

// Quem se cadastrou para comentar. Fica em dados/contas.json.
public class Conta
{
    public string Id { get; set; } = "";
    public string Nome { get; set; } = "";
    public string Email { get; set; } = "";
    public string SenhaHash { get; set; } = "";  // nunca a senha em si, só o "embaralhado" dela
    public string Foto { get; set; } = "";
    public string Situacao { get; set; } = Situacoes.Aguardando;
    public DateTimeOffset CriadaEm { get; set; }
}

public static class Situacoes
{
    public const string Aguardando = "aguardando";  // esperando a curadora liberar
    public const string Liberada = "liberada";      // pode comentar
    public const string Recusada = "recusada";      // não pode comentar
}

// Um comentário numa cena. RespostaDe aponta para o comentário "pai" (null = comentário direto na cena).
// Fica em dados/comentarios.json.
public class Comentario
{
    public string Id { get; set; } = "";
    public string AlbumId { get; set; } = "";
    public string CenaId { get; set; } = "";
    public string? RespostaDe { get; set; }
    public string ContaId { get; set; } = "";
    public string Texto { get; set; } = "";
    public DateTimeOffset CriadoEm { get; set; }
    public DateTimeOffset? EditadoEm { get; set; }
}

public class Contas(string pastaDados) : ArquivoJson<List<Conta>>(Path.Combine(pastaDados, "contas.json"));

public class Comentarios(string pastaDados) : ArquivoJson<List<Comentario>>(Path.Combine(pastaDados, "comentarios.json"))
{
    // Apaga os comentários escolhidos e todas as respostas embaixo deles.
    public static int ApagarComRespostas(List<Comentario> lista, Func<Comentario, bool> escolher)
    {
        var apagar = lista.Where(escolher).Select(c => c.Id).ToHashSet();
        bool achouMais;
        do
        {
            achouMais = false;
            foreach (var c in lista)
                if (c.RespostaDe is { } pai && apagar.Contains(pai) && apagar.Add(c.Id)) achouMais = true;
        } while (achouMais);
        return lista.RemoveAll(c => apagar.Contains(c.Id));
    }
}

// O que o site recebe (sem e-mail nem senha).
public record ContaPublica(string Id, string Nome, string Foto, string Situacao)
{
    public static ContaPublica De(Conta c) => new(c.Id, c.Nome, c.Foto, c.Situacao);
}

// O que a curadora vê na tela de curadoria.
public record ContaCuradoria(string Id, string Nome, string Email, string Foto, string Situacao, DateTimeOffset CriadaEm)
{
    public static ContaCuradoria De(Conta c) => new(c.Id, c.Nome, c.Email, c.Foto, c.Situacao, c.CriadaEm);
}

public record ComentarioPublico(string Id, string? RespostaDe, string Texto, DateTimeOffset CriadoEm, DateTimeOffset? EditadoEm, ContaPublica Autor)
{
    public static ComentarioPublico De(Comentario c, Conta autor) =>
        new(c.Id, c.RespostaDe, c.Texto, c.CriadoEm, c.EditadoEm, ContaPublica.De(autor));
}

// O álbum como o site recebe: com nome e foto de quem criou.
public record AlbumPublico(string Id, string Titulo, string Descricao, string Capa, string? DonoId, ContaPublica? Dono, List<Item> Itens);

public record NovoAlbum(string? Titulo, string? Descricao);
public record TextoCena(string? Anime, string? Comentario);
public record Entrada(string? Senha);
public record EntradaConta(string? Email, string? Senha);
public record NovaSituacao(string? Situacao);
public record NovoComentario(string? Texto, string? RespostaDe);
public record TextoComentario(string? Texto);
