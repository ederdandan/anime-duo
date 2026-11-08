import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useAlbuns } from '../lib/albuns'
import { criarAlbum, criarCena, salvarSenha } from '../lib/api'
import { useConta } from '../lib/conta'
import { usePermissoes } from '../lib/permissoes'
import { campo, rotulo, voltar } from '../lib/estilos'
import EntrarCuradora from '../components/EntrarCuradora'
import { finalizarFoto } from '../lib/imagem'
import { aplicarFiltro } from '../lib/filtros'
import FotoComFiltros, { type FotoEscolhida } from '../components/FotoComFiltros'
import Carregando from '../components/Carregando'

const NOVO = '__novo__'

export default function NovaCena() {
  const { albuns, temServidor } = useAlbuns()
  const { conta } = useConta()
  const { podePostar } = usePermissoes()
  const [, atualizar] = useState(0)  // para a tela redesenhar depois da senha da curadora
  const [mostrarCuradora, setMostrarCuradora] = useState(false)

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
        ) : podePostar ? (
          <Formulario onSair={() => { salvarSenha(null); atualizar((n) => n + 1) }} />
        ) : mostrarCuradora ? (
          <EntrarCuradora onEntrou={() => atualizar((n) => n + 1)} />
        ) : (
          // Ninguém com permissão para postar: explica o caminho
          <div className="moldura-dupla flex flex-col items-center gap-4 rounded-3xl p-6 text-center">
            <p>
              {!conta
                ? 'Para postar cenas, entre com a sua conta.'
                : conta.situacao === 'aguardando'
                  ? 'Sua conta está esperando a curadora liberar. Depois disso você já pode postar!'
                  : 'Sua conta não foi liberada para postar.'}
            </p>
            {!conta && (
              <Link to="/conta" className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-rosa font-bold text-white">
                Entrar ou criar conta
              </Link>
            )}
            <button type="button" onClick={() => setMostrarCuradora(true)} className="text-sm text-rosa-suave underline">
              Sou a curadora
            </button>
          </div>
        )}
      </div>
    </motion.main>
  )
}

function Formulario({ onSair }: { onSair: () => void }) {
  const { albuns, recarregar } = useAlbuns()
  const { podeMexer, curadora } = usePermissoes()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // Só aparecem os álbuns em que dá para postar: os seus (ou todos, para a curadora).
  const meus = (albuns ?? []).filter(podeMexer)
  const pedido = params.get('album')
  const [albumId, setAlbumId] = useState(pedido && meus.some((a) => a.id === pedido) ? pedido : meus[0]?.id ?? NOVO)
  const [tituloNovo, setTituloNovo] = useState('')
  const [descricaoNova, setDescricaoNova] = useState('')
  const [foto, setFoto] = useState<FotoEscolhida | null>(null)
  const [cores, setCores] = useState<string[]>([])
  const [anime, setAnime] = useState('')
  const [comentario, setComentario] = useState('')
  const [estado, setEstado] = useState<'parado' | 'enviando'>('parado')
  const [erro, setErro] = useState('')

  async function criar(e: FormEvent) {
    e.preventDefault()
    if (!foto) { setErro('Escolha uma foto primeiro.'); return }
    setErro('')
    setEstado('enviando')
    try {
      let destino = albumId
      if (albumId === NOVO) destino = (await criarAlbum(tituloNovo, descricaoNova)).id
      // O filtro é aplicado na foto em tamanho real só agora, na hora de enviar.
      const pronta = await finalizarFoto(aplicarFiltro(foto.original, foto.filtro.receita))
      await criarCena(destino, { foto: pronta.foto, nomeArquivo: pronta.nomeArquivo, anime, comentario, cores })
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
          {meus.map((a) => <option key={a.id} value={a.id}>{a.titulo}</option>)}
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
        <FotoComFiltros valor={foto} onMudar={(f, c) => { setFoto(f); setCores(c) }} onErro={setErro} />
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

      {curadora && (
        <button type="button" onClick={onSair} className="self-center text-sm text-rosa-suave underline">
          Sair da curadoria neste celular
        </button>
      )}
    </form>
  )
}
