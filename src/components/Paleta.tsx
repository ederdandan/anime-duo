import { useState } from 'react'

// Mostra as cores da imagem. Tocar numa cor copia o código dela.
export default function Paleta({ cores }: { cores: string[] }) {
  const [copiada, setCopiada] = useState<string | null>(null)

  async function copiar(cor: string) {
    try {
      await navigator.clipboard.writeText(cor)
      setCopiada(cor)
      setTimeout(() => setCopiada(null), 1500)
    } catch {
      /* se o navegador não deixar copiar, não faz nada */
    }
  }

  return (
    <ul className="flex flex-wrap justify-center gap-3">
      {cores.map((cor) => (
        <li key={cor}>
          <button
            type="button"
            onClick={() => copiar(cor)}
            className="flex min-h-11 flex-col items-center gap-1 rounded-xl px-1 focus-visible:outline-2 focus-visible:outline-rosa"
            aria-label={`Copiar a cor ${cor}`}
          >
            <span
              className="block size-8 rounded-full shadow-[0_0_0_2px_#fff,0_0_0_3px_var(--color-borda)]"
              style={{ background: cor }}
            />
            <code className="font-mono text-[11px] text-rosa-suave">
              {copiada === cor ? 'copiado!' : cor}
            </code>
          </button>
        </li>
      ))}
    </ul>
  )
}
