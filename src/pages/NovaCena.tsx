import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAlbuns } from '../lib/albuns'
import { criarAlbum, criarCena, salvarSenha, senhaSalva } from '../lib/api'
import { campo, rotulo, voltar } from '../lib/estilos'
import EntrarCuradora from '../components/EntrarCuradora'
import { prepararFoto } from '../lib/imagem'
import Carregando from '../components/Carregando'

const NOVO = '__novo__'

export default function NovaCena() {
  const { albuns, temServidor } = useAlbuns()
  const [logada, setLogada] = useState(!!senhaSalva())

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <Link
        to="/"
        className={voltar}
      >
        ← Álbuns
      </Link>

      <header className="mt-6 mb-8 text-center">
        <h1 className="font-titulo text-[clamp(1.75rem,7vw,3rem)] leading-tight text-rosa">
          Nova cena <span className="brilho-dourado inline-block text-[0.7em]">✦</span>
        </h1>
      </header>

      <div className="mx-auto max-w-lg">
        {!albuns ? (
          <Carregando />
        ) : !temServidor ? (
          <p className="moldura-dupla rounded-3xl p-6 text-center">
            Aqui só dá para ver o mural. Para criar cenas, use o endereço do site no MonsterASP.
          </p>
        ) : !logada ? (
          <EntrarCuradora onEntrou={() => setLogada(true)} />
        ) : (
          <Formulario onSair={() => { salvarSenha(null); setLogada(false) }} />
        )}
      </div>
    </motion.main>
  )
}

function Formulario({ onSair }: { onSair: () => void }) {
  const { albuns, recarregar } = useAlbuns()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [albumId, setAlbumId] = useState(params.get('album') ?? albuns?.[0]?.id ?? NOVO)
  const [tituloNovo, setTituloNovo] = useState('')
  const [descricaoNova, setDescricaoNova] = useState('')
  const [preparada, setPreparada] = useState<{ foto: Blob; nomeArquivo: string } | null>(null)
  const [previa, setPrevia] = useState('')
  const [cores, setCores] = useState<string[]>([])
  const [anime, setAnime] = useState('')
  const [comentario, setComentario] = useState('')
  const [estado, setEstado] = useState<'parado' | 'preparando' | 'enviando'>('parado')
  const [erro, setErro] = useState('')

  // Libera a memória da prévia quando trocar de foto ou sair da tela
  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa) }, [previa])

  async function escolheuFoto(arquivo: File | undefined) {
    if (!arquivo) return
    setErro('')
    setEstado('preparando')
    try {
      const r = await prepararFoto(arquivo)
      setPreparada({ foto: r.foto, nomeArquivo: r.nomeArquivo })
      setCores(r.cores)
      setPrevia(URL.createObjectURL(r.foto))
    } catch {
      setErro('Não consegui abrir essa foto. Tente outra em JPG, PNG ou WebP.')
    } finally {
      setEstado('parado')
    }
  }

  async function criar(e: FormEvent) {
    e.preventDefault()
    if (!preparada) { setErro('Escolha uma foto primeiro.'); return }
    setErro('')
    setEstado('enviando')
    try {
      let destino = albumId
      if (albumId === NOVO) destino = (await criarAlbum(tituloNovo, descricaoNova)).id
      await criarCena(destino, { ...preparada, anime, comentario, cores })
      await recarregar()
      navigate(`/album/${destino}`)
    } catch (err) {
      setErro((err as Error).message)
      if ((err as Error).message === 'Senha incorreta.') onSair()
      setEstado('parado')
    }
  }

  return (
    <form onSubmit={criar} className="moldura-dupla flex flex-col gap-5 rounded-3xl p-5 sm:p-6">
      <div>
        <label htmlFor="album" className={rotulo}>Álbum</label>
        <select id="album" value={albumId} onChange={(e) => setAlbumId(e.target.value)} className={campo}>
          {albuns?.map((a) => <option key={a.id} value={a.id}>{a.titulo}</option>)}
          <option value={NOVO}>✦ Criar álbum novo…</option>
        </select>
      </div>

      {albumId === NOVO && (
        <div className="flex flex-col gap-4 rounded-2xl bg-pessego p-4">
          <div>
            <label htmlFor="titulo" className={rotulo}>Nome do álbum novo</label>
            <input id="titulo" value={tituloNovo} onChange={(e) => setTituloNovo(e.target.value)} maxLength={80} className={campo} required placeholder="Ex.: Trens ao entardecer" />
          </div>
          <div>
            <label htmlFor="descricao" className={rotulo}>Descrição (opcional)</label>
            <input id="descricao" value={descricaoNova} onChange={(e) => setDescricaoNova(e.target.value)} maxLength={200} className={campo} />
          </div>
        </div>
      )}

      <div>
        <span className={rotulo}>Foto</span>
        <label
          htmlFor="foto"
          className="block cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-borda-forte bg-white text-center"
        >
          {previa ? (
            <div className="brilho-branco"><img src={previa} alt="Prévia da foto escolhida" className="block max-h-80 w-full object-contain" /></div>
          ) : (
            <span className="flex min-h-36 flex-col items-center justify-center gap-1 p-4 text-rosa-suave">
              <span className="text-3xl text-petala" aria-hidden="true">✿</span>
              {estado === 'preparando' ? 'Preparando a foto…' : 'Toque para escolher uma foto'}
            </span>
          )}
        </label>
        <input id="foto" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => escolheuFoto(e.target.files?.[0])} />
        {previa && <p className="mt-2 text-center text-sm text-rosa-suave">Toque na foto para trocar.</p>}
      </div>

      {cores.length > 0 && (
        <div>
          <span className={rotulo}>Cores da cena</span>
          <p className="mb-2 text-sm text-rosa-suave">Descobri sozinho. Toque numa bolinha para ajustar.</p>
          <div className="flex flex-wrap gap-3">
            {cores.map((cor, i) => (
              <label key={i} className="flex flex-col items-center gap-1">
                <input
                  type="color"
                  value={cor}
                  onChange={(e) => setCores(cores.map((c, j) => (j === i ? e.target.value.toUpperCase() : c)))}
                  className="size-11 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  aria-label={`Cor ${i + 1}`}
                />
                <code className="font-mono text-[11px] text-rosa-suave">{cor}</code>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="anime" className={rotulo}>De qual anime é?</label>
        <input id="anime" value={anime} onChange={(e) => setAnime(e.target.value)} maxLength={80} className={campo} placeholder="Ex.: Your Name" />
      </div>

      <div>
        <label htmlFor="comentario" className={rotulo}>Por que essa cena te inspira?</label>
        <textarea id="comentario" value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={500} rows={4} className={campo} required />
      </div>

      {erro && <p className="text-sm font-bold text-rosa" role="alert">{erro}</p>}

      <button type="submit" disabled={estado !== 'parado'} className="min-h-12 rounded-full bg-rosa text-lg font-bold text-white disabled:opacity-60">
        {estado === 'enviando' ? 'Publicando… ✦' : 'Criar cena ✦'}
      </button>

      <button type="button" onClick={onSair} className="self-center text-sm text-rosa-suave underline">
        Sair deste celular
      </button>
    </form>
  )
}
