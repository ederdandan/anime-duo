import { useEffect, useState } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { caminho } from '../lib/caminho'
import { apagarCena, senhaSalva } from '../lib/api'
import { useAlbuns } from '../lib/albuns'
import Paleta from './Paleta'
import type { Item } from '../types'

interface Props {
  albumId: string
  itens: Item[]
  indice: number
  onTrocar: (novo: number) => void
  onFechar: () => void
}

// Imagem em tela cheia. No celular: deslize para os lados para trocar de imagem.
export default function Lightbox({ albumId, itens, indice, onTrocar, onFechar }: Props) {
  const item = itens[indice]
  const { temServidor, recarregar } = useAlbuns()
  const podeApagar = temServidor && !!senhaSalva()
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  async function apagar() {
    try {
      await apagarCena(albumId, item.id)
      onFechar()
      await recarregar()
    } catch (e) {
      setErro((e as Error).message)
    }
  }
  const anterior = () => onTrocar((indice - 1 + itens.length) % itens.length)
  const proxima = () => onTrocar((indice + 1) % itens.length)

  // Teclado no computador: setas trocam, Esc fecha
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
      if (e.key === 'ArrowLeft') anterior()
      if (e.key === 'ArrowRight') proxima()
    }
    window.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
    }
  })

  function soltou(_: unknown, info: PanInfo) {
    if (info.offset.x < -60) proxima()
    else if (info.offset.x > 60) anterior()
    else if (info.offset.y > 100) onFechar()
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={item.comentario}
      className="fixed inset-0 z-50 overflow-y-auto bg-[rgb(74_42_56/.88)] backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onFechar}
    >
      <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center gap-4 px-4 pt-[max(4rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-10 grid size-11 place-items-center rounded-full bg-white text-xl text-rosa shadow-lg"
        >
          ✕
        </button>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={item.id}
            className="moldura-dupla touch-pan-y rounded-2xl p-1.5"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.25 }}
            drag
            dragSnapToOrigin
            dragElastic={0.4}
            onDragEnd={soltou}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="brilho-branco rounded-xl">
              <img src={caminho(item.url)} alt={item.comentario} className="pointer-events-none block max-h-[60dvh] w-full object-contain select-none" />
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-3 text-white">
            <button type="button" onClick={anterior} aria-label="Imagem anterior" className="grid size-11 place-items-center rounded-full bg-white/15 text-xl">‹</button>
            <p className="text-center text-sm">
              <span className="block font-titulo text-base">{item.anime}</span>
              <span className="opacity-75">{indice + 1} / {itens.length}</span>
            </p>
            <button type="button" onClick={proxima} aria-label="Próxima imagem" className="grid size-11 place-items-center rounded-full bg-white/15 text-xl">›</button>
          </div>

          <div className="rounded-[28px] bg-white px-5 py-4 text-center shadow-[0_0_0_2px_#fff,0_0_0_3px_var(--color-borda)]">
            <p className="leading-relaxed">
              <span className="text-petala">～ </span>{item.comentario}<span className="text-petala"> ～</span>
            </p>
            <div className="mt-4">
              <Paleta cores={item.cores} />
            </div>
          </div>

          <p className="text-center text-xs text-white/60">Deslize para o lado para trocar · para baixo para fechar</p>

          {podeApagar && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              {confirmando === item.id ? (
                <>
                  <span className="text-white">Apagar essa cena de vez?</span>
                  <button type="button" onClick={apagar} className="min-h-11 rounded-full bg-white px-4 font-bold text-rosa">Sim, apagar</button>
                  <button type="button" onClick={() => setConfirmando(null)} className="min-h-11 rounded-full px-4 text-white underline">Cancelar</button>
                </>
              ) : (
                <button type="button" onClick={() => { setErro(''); setConfirmando(item.id) }} className="min-h-11 rounded-full px-4 text-white/70 underline">
                  Apagar cena
                </button>
              )}
              {erro && <p className="w-full text-center text-white" role="alert">{erro}</p>}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
