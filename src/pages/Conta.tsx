import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { cadastrar, entrarConta } from '../lib/api'
import { useAlbuns } from '../lib/albuns'
import { useConta } from '../lib/conta'
import { prepararFotoPerfil } from '../lib/imagem'
import { botaoPrincipal, campo, rotulo, voltar } from '../lib/estilos'
import Avatar from '../components/Avatar'
import SeloCuradoria from '../components/SeloCuradoria'
import Carregando from '../components/Carregando'

// Tela "Minha conta": entrar, se cadastrar (com e-mail e foto) e ver se já foi liberada para comentar.
export default function ContaPagina() {
  const { albuns, temServidor } = useAlbuns()
  const { conta } = useConta()

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <Link to="/" className={voltar}>← Álbuns</Link>

      <header className="mt-6 mb-8 text-center">
        <h1 className="font-titulo text-[clamp(1.75rem,7vw,3rem)] leading-tight text-rosa">
          {conta ? 'Minha conta' : 'Entrar para comentar'} <span className="brilho-dourado inline-block text-[0.7em]">✦</span>
        </h1>
      </header>

      <div className="mx-auto max-w-lg">
        {!albuns ? (
          <Carregando />
        ) : !temServidor ? (
          <p className="moldura-dupla rounded-3xl p-6 text-center">
            Aqui só dá para ver o mural. Para comentar, use o endereço do site no MonsterASP.
          </p>
        ) : conta ? (
          <MinhaConta />
        ) : (
          <EntrarOuCadastrar />
        )}
      </div>
    </motion.main>
  )
}

const avisos = {
  aguardando: 'Seu cadastro chegou! Agora é só esperar a curadora liberar sua conta. Depois disso você já pode comentar nas cenas.',
  liberada: 'Sua conta está liberada. Abra uma cena e deixe seu comentário!',
  recusada: 'A curadora não liberou sua conta para comentar.',
}

function MinhaConta() {
  const { conta, recarregar, sair } = useConta()
  const navigate = useNavigate()

  // Confere de novo ao abrir a tela: a curadora pode ter liberado agora há pouco.
  useEffect(() => { recarregar() }, [recarregar])
  if (!conta) return null

  return (
    <div className="moldura-dupla flex flex-col items-center gap-4 rounded-3xl p-6 text-center">
      <Avatar conta={conta} tamanho="size-24" />
      <p className="font-titulo text-2xl text-rosa">{conta.nome}</p>
      {conta.curadoria && conta.situacao === 'liberada' && (
        <div className="flex flex-col items-center gap-2">
          <SeloCuradoria />
          <Link to="/curadoria" className="text-sm font-bold text-rosa underline">Abrir a curadoria</Link>
        </div>
      )}
      <p className={`rounded-2xl px-4 py-3 ${conta.situacao === 'liberada' ? 'bg-[#E8F6EC] text-[#2F6B43]' : 'bg-pessego'}`}>
        {avisos[conta.situacao]}
      </p>
      {conta.situacao === 'liberada' && (
        <Link to="/" className={`${botaoPrincipal} inline-flex w-full items-center justify-center`}>Ver os álbuns</Link>
      )}
      <button type="button" onClick={async () => { await sair(); navigate('/') }} className="text-sm text-rosa-suave underline">
        Sair desta conta
      </button>
    </div>
  )
}

function EntrarOuCadastrar() {
  const [params, setParams] = useSearchParams()
  const modo = params.get('modo') === 'cadastro' ? 'cadastro' : 'entrar'
  const trocar = (m: string) => setParams({ modo: m }, { replace: true })

  return (
    <div className="moldura-dupla rounded-3xl p-5 sm:p-6">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-pessego p-1" role="tablist">
        {(['entrar', 'cadastro'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={modo === m}
            onClick={() => trocar(m)}
            className={`min-h-11 rounded-full font-bold ${modo === m ? 'bg-white text-rosa shadow' : 'text-rosa-suave'}`}
          >
            {m === 'entrar' ? 'Já tenho conta' : 'Criar conta'}
          </button>
        ))}
      </div>
      {modo === 'entrar' ? <Entrar /> : <Cadastro />}
    </div>
  )
}

function Entrar() {
  const { setConta } = useConta()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    try {
      setConta(await entrarConta(email, senha))
    } catch (err) {
      setErro((err as Error).message)
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className={rotulo}>E-mail</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={campo} required />
      </div>
      <div>
        <label htmlFor="senha-conta" className={rotulo}>Senha</label>
        <input id="senha-conta" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} required />
      </div>
      {erro && <p className="text-sm font-bold text-rosa" role="alert">{erro}</p>}
      <button type="submit" disabled={enviando} className={botaoPrincipal}>{enviando ? 'Entrando…' : 'Entrar'}</button>
    </form>
  )
}

function Cadastro() {
  const { setConta } = useConta()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [foto, setFoto] = useState<{ foto: Blob; nomeArquivo: string } | null>(null)
  const [previa, setPrevia] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa) }, [previa])

  async function escolheuFoto(arquivo: File | undefined) {
    if (!arquivo) return
    setErro('')
    try {
      const r = await prepararFotoPerfil(arquivo)
      setFoto(r)
      setPrevia(URL.createObjectURL(r.foto))
    } catch {
      setErro('Não consegui abrir essa foto. Tente outra em JPG, PNG ou WebP.')
    }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!foto) { setErro('Escolha uma foto de perfil.'); return }
    setEnviando(true)
    setErro('')
    try {
      setConta(await cadastrar({ nome, email, senha, ...foto }))
    } catch (err) {
      setErro((err as Error).message)
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        <label htmlFor="foto-perfil" className="cursor-pointer">
          <span className="grid size-28 place-items-center overflow-hidden rounded-full border-2 border-dashed border-borda-forte bg-white text-center text-sm text-rosa-suave">
            {previa ? <img src={previa} alt="Sua foto de perfil" className="size-full object-cover" /> : <>✿<br />Escolher<br />foto</>}
          </span>
        </label>
        <input id="foto-perfil" type="file" accept="image/*" className="sr-only" onChange={(e) => escolheuFoto(e.target.files?.[0])} />
        <div className="flex gap-2 text-sm">
          {/* capture="user" abre a câmera da frente (selfie) no celular */}
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full bg-white px-4 font-bold text-rosa shadow-[0_0_0_1px_var(--color-borda-forte)]">
            <span aria-hidden="true">📷</span> Tirar selfie
            <input type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => escolheuFoto(e.target.files?.[0])} />
          </label>
          <label htmlFor="foto-perfil" className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-full bg-white px-4 font-bold text-rosa shadow-[0_0_0_1px_var(--color-borda-forte)]">
            <span aria-hidden="true">🖼️</span> Galeria
          </label>
        </div>
        <span className="text-sm text-rosa-suave">Foto de perfil (aparece nos seus comentários)</span>
      </div>
      <div>
        <label htmlFor="nome" className={rotulo}>Nome</label>
        <input id="nome" autoComplete="nickname" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} className={campo} required placeholder="Como quer aparecer nos comentários" />
      </div>
      <div>
        <label htmlFor="email-novo" className={rotulo}>E-mail</label>
        <input id="email-novo" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} className={campo} required />
        <p className="mt-1.5 text-sm text-rosa-suave">Só a curadora vê o seu e-mail.</p>
      </div>
      <div>
        <label htmlFor="senha-nova" className={rotulo}>Senha</label>
        <input id="senha-nova" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={8} maxLength={100} className={campo} required />
        <p className="mt-1.5 text-sm text-rosa-suave">Pelo menos 8 letras ou números.</p>
      </div>
      {erro && <p className="text-sm font-bold text-rosa" role="alert">{erro}</p>}
      <button type="submit" disabled={enviando} className={botaoPrincipal}>{enviando ? 'Criando…' : 'Criar conta ✦'}</button>
      <p className="text-center text-sm text-rosa-suave">Depois de criar, a curadora precisa liberar sua conta para você comentar.</p>
    </form>
  )
}
