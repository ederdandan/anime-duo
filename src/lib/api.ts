import albunsLocais from '../data/albuns.json'
import { caminho } from './caminho'
import type { Album, Comentario, Conta, ContaCuradoria, Item, Situacao } from '../types'

// Conversa com o servidor (pasta server/). Se não houver servidor,
// como no GitHub Pages, o site mostra os álbuns do arquivo albuns.json.

const CHAVE_SENHA = 'mural-senha'

export function senhaSalva(): string | null {
  try { return localStorage.getItem(CHAVE_SENHA) } catch { return null }
}
export function salvarSenha(senha: string | null) {
  try {
    if (senha) localStorage.setItem(CHAVE_SENHA, senha)
    else localStorage.removeItem(CHAVE_SENHA)
  } catch { /* sem armazenamento: pede a senha de novo da próxima vez */ }
}

async function erroDe(resposta: Response): Promise<Error> {
  try {
    const corpo = await resposta.json()
    return new Error(corpo.detail || corpo.title || 'Algo deu errado.')
  } catch {
    return new Error(`O servidor respondeu com erro ${resposta.status}.`)
  }
}

export async function carregarAlbuns(): Promise<{ albuns: Album[]; temServidor: boolean }> {
  try {
    const r = await fetch(caminho('api/albuns'), { cache: 'no-store' })
    if (r.ok && r.headers.get('content-type')?.includes('json')) {
      return { albuns: await r.json(), temServidor: true }
    }
  } catch { /* sem servidor */ }
  return { albuns: albunsLocais as Album[], temServidor: false }
}

export async function entrar(senha: string): Promise<void> {
  const r = await fetch(caminho('api/entrar'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha }),
  })
  if (!r.ok) throw await erroDe(r)
}

function cabecalhoSenha(): Record<string, string> {
  return { 'X-Mural-Senha': senhaSalva() ?? '' }
}

export async function criarAlbum(titulo: string, descricao: string): Promise<Album> {
  const r = await fetch(caminho('api/albuns'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...cabecalhoSenha() },
    body: JSON.stringify({ titulo, descricao }),
  })
  if (!r.ok) throw await erroDe(r)
  return r.json()
}

export async function criarCena(
  albumId: string,
  dados: { foto: Blob; nomeArquivo: string; anime: string; comentario: string; cores: string[] },
): Promise<Item> {
  const form = new FormData()
  form.append('foto', dados.foto, dados.nomeArquivo)
  form.append('anime', dados.anime)
  form.append('comentario', dados.comentario)
  form.append('cores', dados.cores.join(','))
  const r = await fetch(caminho(`api/albuns/${encodeURIComponent(albumId)}/cenas`), {
    method: 'POST',
    headers: cabecalhoSenha(),
    body: form,
  })
  if (!r.ok) throw await erroDe(r)
  return r.json()
}

export async function apagarCena(albumId: string, cenaId: string): Promise<void> {
  const r = await fetch(caminho(`api/albuns/${encodeURIComponent(albumId)}/cenas/${encodeURIComponent(cenaId)}`), {
    method: 'DELETE',
    headers: cabecalhoSenha(),
  })
  if (!r.ok) throw await erroDe(r)
}

// ---------- Contas (quem se cadastra para comentar) ----------

export async function minhaConta(): Promise<Conta | null> {
  try {
    const r = await fetch(caminho('api/contas/eu'), { cache: 'no-store' })
    return r.status === 200 ? r.json() : null
  } catch {
    return null
  }
}

export async function cadastrar(dados: { nome: string; email: string; senha: string; foto: Blob; nomeArquivo: string }): Promise<Conta> {
  const form = new FormData()
  form.append('nome', dados.nome)
  form.append('email', dados.email)
  form.append('senha', dados.senha)
  form.append('foto', dados.foto, dados.nomeArquivo)
  const r = await fetch(caminho('api/contas'), { method: 'POST', body: form })
  if (!r.ok) throw await erroDe(r)
  return r.json()
}

export async function entrarConta(email: string, senha: string): Promise<Conta> {
  const r = await fetch(caminho('api/contas/entrar'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  })
  if (!r.ok) throw await erroDe(r)
  return r.json()
}

export async function sairConta(): Promise<void> {
  await fetch(caminho('api/contas/sair'), { method: 'POST' })
}

// ---------- Curadoria (só com a senha da curadora) ----------

export async function listarContas(): Promise<ContaCuradoria[]> {
  const r = await fetch(caminho('api/curadoria/contas'), { headers: cabecalhoSenha(), cache: 'no-store' })
  if (!r.ok) throw await erroDe(r)
  return r.json()
}

export async function mudarSituacao(id: string, situacao: Situacao): Promise<void> {
  const r = await fetch(caminho(`api/curadoria/contas/${encodeURIComponent(id)}/situacao`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...cabecalhoSenha() },
    body: JSON.stringify({ situacao }),
  })
  if (!r.ok) throw await erroDe(r)
}

export async function apagarConta(id: string): Promise<void> {
  const r = await fetch(caminho(`api/curadoria/contas/${encodeURIComponent(id)}`), { method: 'DELETE', headers: cabecalhoSenha() })
  if (!r.ok) throw await erroDe(r)
}

// ---------- Comentários ----------

function rotaComentarios(albumId: string, cenaId: string) {
  return caminho(`api/albuns/${encodeURIComponent(albumId)}/cenas/${encodeURIComponent(cenaId)}/comentarios`)
}

export async function listarComentarios(albumId: string, cenaId: string): Promise<Comentario[]> {
  const r = await fetch(rotaComentarios(albumId, cenaId), { cache: 'no-store' })
  if (!r.ok) throw await erroDe(r)
  return r.json()
}

export async function comentar(albumId: string, cenaId: string, texto: string, respostaDe: string | null): Promise<Comentario> {
  const r = await fetch(rotaComentarios(albumId, cenaId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto, respostaDe }),
  })
  if (!r.ok) throw await erroDe(r)
  return r.json()
}

export async function apagarComentario(id: string): Promise<void> {
  // Vai a senha da curadora se ela estiver salva neste celular (ela pode apagar qualquer um).
  const r = await fetch(caminho(`api/comentarios/${encodeURIComponent(id)}`), { method: 'DELETE', headers: cabecalhoSenha() })
  if (!r.ok) throw await erroDe(r)
}
