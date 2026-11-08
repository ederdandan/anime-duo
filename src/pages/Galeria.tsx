import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { caminho } from '../lib/caminho'
import { useAlbuns } from '../lib/albuns'
import Lightbox from '../components/Lightbox'
import Carregando from '../components/Carregando'
import { editarAlbum } from '../lib/api'
import { usePermissoes } from '../lib/permissoes'
import Avatar from '../components/Avatar'
import { botaoPrincipal, campo, rotulo } from '../lib/estilos'
import type { Album } from '../types'

export default function Galeria() {
  const { id } = useParams()
  const { albuns } = useAlbuns()
  const { podeMexer } = usePermissoes()
  const [aberta, setAberta] = useState<number | null>(null)

  if (!albuns) return <Carregando />
  const album = albuns.find((a) => a.id === id)

  if (!album) {
    return (
      <main className="py-20 text-center">
        <p className="font-titulo text-2xl text-rosa">Álbum não encontrado</p>
        <Link to="/" className="mt-4 inline-block underline">Voltar para os álbuns</Link>
      </main>
    )
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        to="/"
        className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-4 text-sm text-rosa-suave shadow-[0_0_0_1px_var(--color-borda-forte)]"
      >
        ← Álbuns
      </Link>

      <Cabecalho album={album} />

      {album.itens.length === 0 && (
        <div className="py-12 text-center text-rosa-suave">
          <p className="text-4xl text-petala" aria-hidden="true">✿</p>
          <p className="mt-2">Esse álbum ainda está vazio.</p>
          {podeMexer(album) && (
            <Link to={`/nova?album=${album.id}`} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-rosa px-5 font-bold text-white">
              Adicionar a primeira cena
            </Link>
          )}
        </div>
      )}

      {/* Masonry: colunas de alturas diferentes, como um mural */}
      <ul className="columns-2 gap-4 md:columns-3">
        {album.itens.map((item, i) => (
          <motion.li
            key={item.id}
            className="mb-5 break-inside-avoid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.45 }}
          >
            <motion.button
              type="button"
              onClick={() => setAberta(i)}
              whileTap={{ scale: 0.97 }}
              className="moldura-dupla block w-full rounded-2xl p-1.5 text-left focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-rosa"
            >
              <div className="brilho-branco rounded-xl">
                <img src={caminho(item.url)} alt={item.comentario} className="block w-full" loading="lazy" />
              </div>
              <p className="line-clamp-2 px-1.5 pt-2 pb-1 text-xs leading-relaxed sm:text-sm">{item.comentario}</p>
            </motion.button>
          </motion.li>
        ))}
      </ul>

      <AnimatePresence>
        {aberta !== null && (
          <Lightbox
            album={album}
            indice={Math.min(aberta, album.itens.length - 1)}
            onTrocar={setAberta}
            onFechar={() => setAberta(null)}
          />
        )}
      </AnimatePresence>
    </motion.main>
  )
}

// Nome e descrição do álbum. A curadora vê o botão "Editar" e muda os dois ali mesmo.
function Cabecalho({ album }: { album: Album }) {
  const { recarregar } = useAlbuns()
  const { podeMexer } = usePermissoes()
  const podeEditar = podeMexer(album)
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(album.titulo)
  const [descricao, setDescricao] = useState(album.descricao)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function abrir() {
    setTitulo(album.titulo)
    setDescricao(album.descricao)
    setErro('')
    setEditando(true)
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      await editarAlbum(album.id, titulo, descricao)
      await recarregar()
      setEditando(false)
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  if (editando) {
    return (
      <form onSubmit={salvar} className="moldura-dupla mx-auto mt-6 mb-8 flex max-w-lg flex-col gap-4 rounded-3xl p-5">
        <div>
          <label htmlFor="titulo-album" className={rotulo}>Nome do álbum</label>
          <input id="titulo-album" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={80} className={campo} required autoFocus />
        </div>
        <div>
          <label htmlFor="descricao-album" className={rotulo}>Descrição</label>
          <textarea id="descricao-album" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={200} rows={3} className={campo} />
        </div>
        {erro && <p className="text-sm font-bold text-rosa" role="alert">{erro}</p>}
        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => setEditando(false)} className="min-h-11 px-3 text-rosa-suave underline">Cancelar</button>
          <button type="submit" disabled={salvando} className={`${botaoPrincipal} px-6`}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    )
  }

  return (
    <header className="mt-6 mb-8 text-center">
      <h1 className="font-titulo text-[clamp(1.75rem,7vw,3rem)] leading-tight text-rosa text-balance">
        {album.titulo} <span className="brilho-dourado inline-block text-[0.7em]">✦</span>
      </h1>
      {album.descricao && <p className="mx-auto mt-2 max-w-md text-rosa-suave">{album.descricao}</p>}
      {album.dono && (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-rosa-suave">
          <Avatar conta={album.dono} tamanho="size-7" /> álbum de <span className="font-bold text-rosa-escuro">{album.dono.nome}</span>
        </p>
      )}
      {podeEditar && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={abrir} className="inline-flex min-h-10 items-center gap-1 rounded-full bg-white px-4 text-sm font-bold text-rosa shadow-[0_0_0_1px_var(--color-borda-forte)]">
            ✎ Editar álbum
          </button>
          <Link to={`/nova?album=${album.id}`} className="inline-flex min-h-10 items-center gap-1 rounded-full bg-white px-4 text-sm font-bold text-rosa shadow-[0_0_0_1px_var(--color-borda-forte)]">
            ✦ Adicionar cena
          </Link>
        </div>
      )}
    </header>
  )
}
