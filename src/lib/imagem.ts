// Prepara as fotos no próprio celular antes de enviar:
// diminui, comprime e descobre as cores principais.

// 1) Abre a foto (da câmera ou da galeria) já diminuída para no máximo `ladoMaximo`.
export async function carregarFoto(arquivo: Blob, ladoMaximo = 1600): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas
}

// Cópia menor de uma foto, para as prévias dos filtros ficarem rápidas.
export function reduzir(origem: HTMLCanvasElement, ladoMaximo: number): HTMLCanvasElement {
  const escala = Math.min(1, ladoMaximo / Math.max(origem.width, origem.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(origem.width * escala))
  canvas.height = Math.max(1, Math.round(origem.height * escala))
  canvas.getContext('2d')!.drawImage(origem, 0, 0, canvas.width, canvas.height)
  return canvas
}

// 2) Depois do filtro: comprime e descobre as cores (já com o filtro).
export async function finalizarFoto(canvas: HTMLCanvasElement): Promise<{ foto: Blob; nomeArquivo: string; cores: string[] }> {
  return { ...(await comprimir(canvas)), cores: extrairCores(canvas) }
}

// Foto de perfil: recorta um quadrado do meio e diminui para 400x400.
export async function prepararFotoPerfil(arquivo: Blob): Promise<{ foto: Blob; nomeArquivo: string }> {
  const bitmap = await createImageBitmap(arquivo)
  const lado = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.min(400, lado)
  canvas.getContext('2d')!.drawImage(
    bitmap,
    (bitmap.width - lado) / 2, (bitmap.height - lado) / 2, lado, lado,
    0, 0, canvas.width, canvas.height,
  )
  bitmap.close()
  return comprimir(canvas)
}

// WebP quando o navegador sabe gerar; senão JPEG.
async function comprimir(canvas: HTMLCanvasElement): Promise<{ foto: Blob; nomeArquivo: string }> {
  let foto = await paraBlob(canvas, 'image/webp', 0.82)
  if (!foto || foto.type !== 'image/webp') foto = await paraBlob(canvas, 'image/jpeg', 0.85)
  if (!foto) throw new Error('Não consegui preparar essa foto.')
  return { foto, nomeArquivo: foto.type === 'image/webp' ? 'foto.webp' : 'foto.jpg' }
}

function paraBlob(canvas: HTMLCanvasElement, tipo: string, qualidade: number): Promise<Blob | null> {
  return new Promise((ok) => canvas.toBlob(ok, tipo, qualidade))
}

// Agrupa cores parecidas e pega as 5 que mais aparecem (e que sejam diferentes entre si).
export function extrairCores(origem: CanvasImageSource): string[] {
  const t = 64
  const c = document.createElement('canvas')
  c.width = t
  c.height = t
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(origem, 0, 0, t, t)
  const px = ctx.getImageData(0, 0, t, t).data

  const grupos = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue
    const r = px[i], g = px[i + 1], b = px[i + 2]
    const chave = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const grupo = grupos.get(chave) ?? { n: 0, r: 0, g: 0, b: 0 }
    grupo.n++; grupo.r += r; grupo.g += g; grupo.b += b
    grupos.set(chave, grupo)
  }

  const ordenados = [...grupos.values()]
    .sort((a, b) => b.n - a.n)
    .map((g) => [g.r / g.n, g.g / g.n, g.b / g.n])

  const escolhidas: number[][] = []
  for (const cor of ordenados) {
    if (escolhidas.every((e) => Math.hypot(e[0] - cor[0], e[1] - cor[1], e[2] - cor[2]) > 48)) escolhidas.push(cor)
    if (escolhidas.length === 5) break
  }
  return escolhidas.map(([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase())
}
