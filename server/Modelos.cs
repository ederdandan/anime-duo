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
    public List<Item> Itens { get; set; } = [];
}

public record NovoAlbum(string? Titulo, string? Descricao);
public record Entrada(string? Senha);
