// Filtros estilo Instagram, aplicados pixel por pixel na própria foto (no celular).
// Cada filtro é uma "receita": mude os números para criar o seu!
//
//   brilho     1 = igual · mais que 1 = mais claro · menos que 1 = mais escuro
//   contraste  1 = igual · mais que 1 = cores mais "fortes" · menos que 1 = mais suave
//   saturacao  1 = igual · 0 = preto e branco · mais que 1 = cores mais vivas
//   sepia      0 = nada · 1 = foto antiga marrom
//   tom        [vermelho, verde, azul] somados a cada pixel (de -255 a 255)
//   vinheta    0 = nada · 0.5 = bordas bem escurecidas

export interface Receita {
  brilho?: number
  contraste?: number
  saturacao?: number
  sepia?: number
  tom?: [number, number, number]
  vinheta?: number
}

export interface Filtro {
  id: string
  nome: string
  receita: Receita
}

export const FILTROS: Filtro[] = [
  { id: 'original', nome: 'Original', receita: {} },
  { id: 'sakura', nome: 'Sakura', receita: { brilho: 1.06, saturacao: 1.1, tom: [22, -2, 14] } },
  { id: 'por-do-sol', nome: 'Pôr do sol', receita: { contraste: 1.08, saturacao: 1.2, tom: [28, 8, -22] } },
  { id: 'noite', nome: 'Noite', receita: { brilho: 0.9, contraste: 1.12, saturacao: 0.9, tom: [-14, -2, 28], vinheta: 0.3 } },
  { id: 'sonho', nome: 'Sonho', receita: { brilho: 1.12, contraste: 0.85, saturacao: 1.1, tom: [12, 6, 18] } },
  { id: 'vivido', nome: 'Vívido', receita: { contraste: 1.15, saturacao: 1.5 } },
  { id: 'vintage', nome: 'Vintage', receita: { brilho: 1.04, contraste: 0.9, sepia: 0.55, vinheta: 0.35 } },
  { id: 'manga', nome: 'Mangá', receita: { saturacao: 0, contraste: 1.35, brilho: 1.05 } },
]

// Devolve uma cópia da foto com o filtro aplicado (a original não muda).
export function aplicarFiltro(origem: HTMLCanvasElement, receita: Receita): HTMLCanvasElement {
  const destino = document.createElement('canvas')
  destino.width = origem.width
  destino.height = origem.height
  const ctx = destino.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(origem, 0, 0)
  if (Object.keys(receita).length === 0) return destino

  const { brilho = 1, contraste = 1, saturacao = 1, sepia = 0, tom = [0, 0, 0], vinheta = 0 } = receita
  const imagem = ctx.getImageData(0, 0, destino.width, destino.height)
  const px = imagem.data
  const w = destino.width
  const meioX = w / 2
  const meioY = destino.height / 2
  const raio = Math.hypot(meioX, meioY)

  for (let i = 0; i < px.length; i += 4) {
    let r = px[i], g = px[i + 1], b = px[i + 2]

    // Saturação: aproxima ou afasta cada cor do "cinza" daquele pixel
    const cinza = 0.2126 * r + 0.7152 * g + 0.0722 * b
    r = cinza + (r - cinza) * saturacao
    g = cinza + (g - cinza) * saturacao
    b = cinza + (b - cinza) * saturacao

    // Sépia: mistura com a versão "foto antiga"
    if (sepia > 0) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b
      const sg = 0.349 * r + 0.686 * g + 0.168 * b
      const sb = 0.272 * r + 0.534 * g + 0.131 * b
      r += (sr - r) * sepia
      g += (sg - g) * sepia
      b += (sb - b) * sepia
    }

    // Contraste (em volta do meio, 128), brilho e tom
    r = ((r - 128) * contraste + 128) * brilho + tom[0]
    g = ((g - 128) * contraste + 128) * brilho + tom[1]
    b = ((b - 128) * contraste + 128) * brilho + tom[2]

    // Vinheta: escurece mais quanto mais longe do centro
    if (vinheta > 0) {
      const p = i / 4
      const d = Math.hypot((p % w) - meioX, Math.floor(p / w) - meioY) / raio
      const f = 1 - vinheta * d * d
      r *= f; g *= f; b *= f
    }

    // Uint8ClampedArray já limita entre 0 e 255
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
  }
  ctx.putImageData(imagem, 0, 0)
  return destino
}
