import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { caminho } from '../lib/caminho'
import { apagarCena, editarCena } from '../lib/api'
import { usePermissoes } from '../lib/permissoes'
import { botaoPrincipal, campo } from '../lib/estilos'
import { useAlbuns } from '../lib/albuns'
import Paleta from './Paleta'
import Comentarios from './Comentarios'
import type { Album, Item } from '../types'

interface Props {
  album: Album
  indice: number
  onTrocar: (novo: number) => void
  onFechar: () => void
}

// Imagem em tela cheia. No celular: deslize para os lados para trocar de imagem.
export default function Lightbox({ album, indice, onTrocar, onFechar }: Props) {
  const albumId = album.id
  const itens = album.itens
  const item = itens[indice]
  const { temServidor, recarregar } = useAlbuns()
  // O dono do álbum e a curadora editam e apagam as cenas
  const podeApagar = usePermissoes().podeMexer(album)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState<string | null>(null)  // id da cena em edição

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
      // Enquanto escreve um comentário, as setas mexem no texto (não trocam a cena).
      const alvo = e.target as HTMLElement
      if (alvo.closest('input, textarea, select')) return
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
      className="fixed inset-0 z-50 overflow-y-auto bg-veu backdrop-blur-sm"
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
          className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-10 grid size-11 place-items-center rounded-full bg-cartao text-xl text-rosa shadow-lg"
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

          {editando === item.id ? (
            <EditarTexto
              albumId={albumId}
              item={item}
              onFechar={async (salvou) => { setEditando(null); if (salvou) await recarregar() }}
            />
          ) : (
            <div className="rounded-[28px] bg-cartao px-5 py-4 text-center shadow-[0_0_0_2px_var(--color-cartao),0_0_0_3px_var(--color-borda)]">
              <p className="leading-relaxed">
                <span className="text-petala">～ </span>{item.comentario}<span className="text-petala"> ～</span>
              </p>
              <div className="mt-4">
                <Paleta cores={item.cores} />
              </div>
              {podeApagar && (
                <button type="button" onClick={() => setEditando(item.id)} className="mt-3 min-h-10 rounded-full px-4 text-sm font-bold text-rosa">
                  ✎ Editar texto
                </button>
              )}
            </div>
          )}

          <p className="text-center text-xs text-white/60">Deslize para o lado para trocar · para baixo para fechar</p>

          {temServidor && <Comentarios key={item.id} album={album} cenaId={item.id} />}

          {podeApagar && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              {confirmando === item.id ? (
                <>
                  <span className="text-white">Mandar essa cena para a lixeira?</span>
                  <button type="button" onClick={apagar} className="min-h-11 rounded-full bg-cartao px-4 font-bold text-rosa">Sim, mandar</button>
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

// A curadora muda "de qual anime é" e o comentário da cena.
function EditarTexto({ albumId, item, onFechar }: { albumId: string; item: Item; onFechar: (salvou: boolean) => void }) {
  const [anime, setAnime] = useState(item.anime)
  const [comentario, setComentario] = useState(item.comentario)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      await editarCena(albumId, item.id, anime, comentario)
      onFechar(true)
    } catch (err) {
      setErro((err as Error).message)
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-3 rounded-[28px] bg-cartao px-5 py-4 text-left shadow-[0_0_0_2px_var(--color-cartao),0_0_0_3px_var(--color-borda)]">
      <div>
        <label htmlFor="editar-anime" className="mb-1 block text-sm font-bold text-rosa-escuro">De qual anime é?</label>
        <input id="editar-anime" value={anime} onChange={(e) => setAnime(e.target.value)} maxLength={80} className={campo} />
      </div>
      <div>
        <label htmlFor="editar-comentario" className="mb-1 block text-sm font-bold text-rosa-escuro">Por que essa cena te inspira?</label>
        <textarea id="editar-comentario" value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={500} rows={4} className={campo} required autoFocus />
      </div>
      {erro && <p className="text-sm font-bold text-rosa" role="alert">{erro}</p>}
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => onFechar(false)} className="min-h-11 px-3 text-rosa-suave underline">Cancelar</button>
        <button type="submit" disabled={salvando} className={`${botaoPrincipal} px-6`}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </form>
  )
}
