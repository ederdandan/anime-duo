import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import site from '../data/site.json'
import { useAlbuns } from '../lib/albuns'
import Capa from '../components/Capa'
import Carregando from '../components/Carregando'

export default function Home() {
  const { albuns } = useAlbuns()
  if (!albuns) return <Carregando />
  // Álbum sem nenhuma cena não aparece (por exemplo, quando todas foram para a lixeira).
  const lista = albuns.filter((a) => a.itens.length > 0)

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <header className="mb-8 text-center">
        <h1 className="font-titulo text-[clamp(2rem,8vw,3.5rem)] leading-tight text-rosa text-balance">
          {site.nome} <span className="brilho-dourado inline-block text-[0.7em]">✦</span>
        </h1>
        <p className="mx-auto mt-2 max-w-md text-rosa-suave">{site.subtitulo}</p>
      </header>

      <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((album, i) => (
          <motion.li
            key={album.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12, duration: 0.5, ease: 'easeOut' }}
          >
            <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }} className="relative">
              <span
                aria-hidden="true"
                className="brilho-dourado absolute -top-3 right-4 z-10 text-2xl"
                style={{ animationDelay: `${i * 0.8}s` }}
              >
                ✦
              </span>
              <Link
                to={`/album/${album.id}`}
                className="moldura-dupla block rounded-[22px] p-2 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-rosa"
              >
                <Capa url={album.capa} className="aspect-[4/3] rounded-2xl" eager={i < 2} />
                <div className="px-2 pt-3 pb-1">
                  <h2 className="font-titulo text-xl text-rosa-escuro">{album.titulo}</h2>
                  <p className="mt-1 text-sm leading-relaxed">{album.descricao}</p>
                  <p className="mt-2 text-xs text-rosa-suave">{album.itens.length} cenas</p>
                </div>
              </Link>
            </motion.div>
          </motion.li>
        ))}
      </ul>
    </motion.main>
  )
}
