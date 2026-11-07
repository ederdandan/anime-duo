// Monta o endereço certo de uma imagem, funcionando no computador e no GitHub Pages.
export function caminho(arquivo: string): string {
  return import.meta.env.BASE_URL + arquivo.replace(/^\//, '')
}
