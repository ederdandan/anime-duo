// Prepara a foto no próprio celular antes de enviar:
// diminui para no máximo 1600px, comprime e descobre as cores principais.

const LADO_MAXIMO = 1600

export async function prepararFoto(arquivo: File): Promise<{ foto: Blob; nomeArquivo: string; cores: string[] }> {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
  const largura = Math.round(bitmap.width * escala)
  const altura = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, largura, altura)

  const cores = extrairCores(bitmap)
  bitmap.close()

  // WebP quando o navegador sabe gerar; senão JPEG.
  let foto = await paraBlob(canvas, 'image/webp', 0.82)
  if (!foto || foto.type !== 'image/webp') foto = await paraBlob(canvas, 'image/jpeg', 0.85)
  if (!foto) throw new Error('Não consegui preparar essa foto.')
  const nomeArquivo = foto.type === 'image/webp' ? 'foto.webp' : 'foto.jpg'
  return { foto, nomeArquivo, cores }
}

function paraBlob(canvas: HTMLCanvasElement, tipo: string, qualidade: number): Promise<Blob | null> {
  return new Promise((ok) => canvas.toBlob(ok, tipo, qualidade))
}

// Agrupa cores parecidas e pega as 5 que mais aparecem (e que sejam diferentes entre si).
function extrairCores(bitmap: ImageBitmap): string[] {
  const t = 64
  const c = document.createElement('canvas')
  c.width = t
  c.height = t
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bitmap, 0, 0, t, t)
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
