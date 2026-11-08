namespace Mural;

// Descobre "quem está pedindo": a curadora (pela senha) e/ou uma conta logada (pelo cookie).
public class Permissoes(Curadoria curadoria, Contas contas)
{
    public async Task<Quem> De(HttpContext ctx)
    {
        var senha = ctx.Request.Headers["X-Mural-Senha"].ToString();
        var curadora = curadoria.Confere(senha);
        var senhaErrada = senha.Length > 0 && !curadora;
        if (senhaErrada) await Task.Delay(1000); // deixa tentativas de adivinhar a senha bem lentas

        var id = ctx.ContaLogada();
        var conta = id is null ? null : (await contas.Ler()).FirstOrDefault(c => c.Id == id);
        return new Quem(curadora, senhaErrada, conta);
    }
}

public record Quem(bool Curadora, bool SenhaErrada, Conta? Conta)
{
    public bool Liberada => Conta?.Situacao == Situacoes.Liberada;
    public string? ContaId => Liberada ? Conta!.Id : null;

    public bool DonoDe(Album album) => ContaId is { } id && album.DonoId == id;
    public bool PodeMexer(Album album) => Curadora || DonoDe(album);
    public bool PodePostar => Curadora || Liberada;

    // A resposta certa quando a pessoa não pode fazer algo.
    public IResult Negado(string mensagem)
    {
        if (SenhaErrada) return RotasContas.Erro("Senha incorreta.", 401);
        if (!Curadora && Conta is null) return RotasContas.Erro("Entre na sua conta para fazer isso.", 401);
        if (!Curadora && !Liberada) return RotasContas.Erro("Sua conta ainda não foi liberada pela curadora.", 403);
        return RotasContas.Erro(mensagem, 403);
    }
}
