// Temas do mural. As cores de cada um ficam em src/index.css ([data-tema="..."]).
// Aqui só tem o nome, o grupo e a regra de guardar a escolha no aparelho.

export type Tema = { id: string; nome: string; grupo: 'shoujo' | 'neutro'; escuro?: boolean }

export const TEMAS: Tema[] = [
  { id: 'sakura', nome: 'Sakura', grupo: 'shoujo' },
  { id: 'lavanda', nome: 'Lavanda', grupo: 'shoujo' },
  { id: 'menta', nome: 'Menta', grupo: 'shoujo' },
  { id: 'ceu', nome: 'Céu', grupo: 'shoujo' },
  { id: 'por-do-sol', nome: 'Pôr do sol', grupo: 'shoujo' },
  { id: 'noite', nome: 'Noite', grupo: 'shoujo', escuro: true },
  { id: 'claro', nome: 'Claro', grupo: 'neutro' },
  { id: 'escuro', nome: 'Escuro', grupo: 'neutro', escuro: true },
  { id: 'papel', nome: 'Papel', grupo: 'neutro' },
]

// O mesmo nome usado no script do index.html, que aplica o tema antes do site aparecer.
const CHAVE = 'mural-tema'

export function temaAtual(): string {
  return document.documentElement.dataset.tema || 'sakura'
}

export function escolherTema(id: string) {
  const html = document.documentElement
  html.dataset.tema = id
  // A barra do navegador no celular acompanha a cor do fundo.
  const fundo = getComputedStyle(html).getPropertyValue('--color-pessego').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', fundo)
  try { localStorage.setItem(CHAVE, id) } catch { /* sem localStorage (aba anônima): vale só até fechar */ }
}
