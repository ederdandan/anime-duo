import albunsLocais from '../data/albuns.json'
import { caminho } from './caminho'
import type { Album, Item } from '../types'

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
