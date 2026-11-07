import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import albuns from '../data/albuns.json'
import { caminho } from '../lib/caminho'
import Lightbox from '../components/Lightbox'
import type { Album } from '../types'

const lista = albuns as Album[]

export default function Galeria() {
  const { id } = useParams()
  const album = lista.find((a) => a.id === id)
  const [aberta, setAberta] = useState<number | null>(null)

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

      <header className="mt-6 mb-8 text-center">
        <h1 className="font-titulo text-[clamp(1.75rem,7vw,3rem)] leading-tight text-rosa text-balance">
          {album.titulo} <span className="brilho-dourado inline-block text-[0.7em]">✦</span>
        </h1>
        <p className="mx-auto mt-2 max-w-md text-rosa-suave">{album.descricao}</p>
      </header>

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
          <Lightbox itens={album.itens} indice={aberta} onTrocar={setAberta} onFechar={() => setAberta(null)} />
        )}
      </AnimatePresence>
    </motion.main>
  )
}
