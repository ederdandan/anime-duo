import { useEffect, useState } from 'react'
import { carregarFoto, extrairCores, reduzir } from '../lib/imagem'
import { aplicarFiltro, FILTROS, type Filtro } from '../lib/filtros'

export interface FotoEscolhida {
  original: HTMLCanvasElement   // a foto já diminuída, sem filtro
  filtro: Filtro
}

interface Props {
  valor: FotoEscolhida | null
  onMudar: (foto: FotoEscolhida, cores: string[]) => void
  onErro: (mensagem: string) => void
}

// Tirar foto com a câmera ou escolher da galeria, e depois escolher um filtro.
// As prévias usam uma cópia pequena da foto, para trocar de filtro na hora.
export default function FotoComFiltros({ valor, onMudar, onErro }: Props) {
  const [preparando, setPreparando] = useState(false)
  const [base, setBase] = useState<{ previa: HTMLCanvasElement; miniaturas: Record<string, string> } | null>(null)
  const [previa, setPrevia] = useState('')

  async function escolheu(arquivo: File | undefined) {
    if (!arquivo) return
    onErro('')
    setPreparando(true)
    try {
      const original = await carregarFoto(arquivo)
      const previaBase = reduzir(original, 720)
      const mini = reduzir(original, 140)
      const miniaturas: Record<string, string> = {}
      for (const f of FILTROS) miniaturas[f.id] = aplicarFiltro(mini, f.receita).toDataURL('image/jpeg', 0.8)
      setBase({ previa: previaBase, miniaturas })
      escolherFiltro(original, previaBase, FILTROS[0])
    } catch {
      onErro('Não consegui abrir essa foto. Tente outra em JPG, PNG ou WebP.')
    } finally {
      setPreparando(false)
    }
  }

  function escolherFiltro(original: HTMLCanvasElement, previaBase: HTMLCanvasElement, filtro: Filtro) {
    const comFiltro = aplicarFiltro(previaBase, filtro.receita)
    setPrevia(comFiltro.toDataURL('image/jpeg', 0.85))
    // As cores da cena são descobertas já com o filtro
    onMudar({ original, filtro }, extrairCores(comFiltro))
  }

  // Se a tela "zerar" a foto, some a prévia também
  useEffect(() => { if (!valor) { setBase(null); setPrevia('') } }, [valor])

  const botao = 'flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-cartao px-4 font-bold text-rosa shadow-[0_0_0_1px_var(--color-borda-forte)]'

  return (
    <div className="flex flex-col gap-3">
      {previa ? (
        <div className="brilho-branco overflow-hidden rounded-2xl bg-cartao">
          <img src={previa} alt={`Prévia da foto com o filtro ${valor?.filtro.nome}`} className="block max-h-80 w-full object-contain" />
        </div>
      ) : (
        <div className="flex min-h-36 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-borda-forte bg-cartao p-4 text-center text-rosa-suave">
          <span className="text-3xl text-petala" aria-hidden="true">✿</span>
          {preparando ? 'Preparando a foto…' : 'Tire uma foto ou escolha uma da galeria'}
        </div>
      )}

      {/* "capture" pede para o celular abrir a câmera direto. No computador, abre a escolha de arquivo. */}
      <div className="flex gap-2">
        <label className={botao}>
          <span aria-hidden="true">📷</span> {previa ? 'Tirar outra' : 'Câmera'}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { escolheu(e.target.files?.[0]); e.target.value = '' }} />
        </label>
        <label className={botao}>
          <span aria-hidden="true">🖼️</span> Galeria
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { escolheu(e.target.files?.[0]); e.target.value = '' }} />
        </label>
      </div>

      {base && valor && (
        <div>
          <p className="mb-2 text-sm font-bold text-rosa-escuro">Filtro</p>
          <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2" role="radiogroup" aria-label="Filtros">
            {FILTROS.map((f) => {
              const ativo = valor.filtro.id === f.id
              return (
                <li key={f.id} className="shrink-0">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => escolherFiltro(valor.original, base.previa, f)}
                    className="flex w-[72px] flex-col items-center gap-1"
                  >
                    <img
                      src={base.miniaturas[f.id]}
                      alt=""
                      className={`size-[68px] rounded-2xl object-cover ${ativo ? 'shadow-[0_0_0_2px_var(--color-cartao),0_0_0_4px_var(--color-rosa)]' : 'opacity-90'}`}
                    />
                    <span className={`text-xs ${ativo ? 'font-bold text-rosa' : 'text-rosa-suave'}`}>{f.nome}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
