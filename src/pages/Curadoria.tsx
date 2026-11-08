import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { apagarConta, listarContas, mudarCuradoria, mudarSituacao, salvarSenha } from '../lib/api'
import { useAlbuns } from '../lib/albuns'
import { useConta } from '../lib/conta'
import { usePermissoes } from '../lib/permissoes'
import { voltar } from '../lib/estilos'
import Avatar from '../components/Avatar'
import Carregando from '../components/Carregando'
import EntrarCuradora from '../components/EntrarCuradora'
import SeloCuradoria from '../components/SeloCuradoria'
import type { ContaCuradoria, Situacao } from '../types'

// Tela da curadoria: vê quem se cadastrou, libera (ou não) e escolhe quem também faz parte da curadoria.
// Dá para entrar de dois jeitos: com uma conta da curadoria, ou com a senha da curadoria (reserva).
export default function Curadoria() {
  const { temServidor, albuns } = useAlbuns()
  const { conta } = useConta()
  const { curadora, porSenha } = usePermissoes()
  const [, atualizar] = useState(0)  // redesenha depois de digitar ou apagar a senha
  const [usarSenha, setUsarSenha] = useState(false)
  const sairDaSenha = useCallback(() => { salvarSenha(null); atualizar((n) => n + 1) }, [])

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <Link to="/" className={voltar}>← Álbuns</Link>

      <header className="mt-6 mb-8 text-center">
        <h1 className="font-titulo text-[clamp(1.75rem,7vw,3rem)] leading-tight text-rosa">
          Curadoria <span className="brilho-dourado inline-block text-[0.7em]">✦</span>
        </h1>
        <p className="mt-2 text-rosa-suave">Quem pode comentar e postar no mural</p>
      </header>

      <div className="mx-auto max-w-lg">
        {!albuns ? <Carregando /> : !temServidor ? (
          <p className="moldura-dupla rounded-3xl p-6 text-center">A curadoria só funciona no endereço do site no MonsterASP.</p>
        ) : curadora ? (
          <ListaDeContas eu={conta?.id} porSenha={porSenha} onSairDaSenha={sairDaSenha} />
        ) : usarSenha ? (
          <EntrarCuradora onEntrou={() => atualizar((n) => n + 1)} />
        ) : (
          <div className="moldura-dupla flex flex-col items-center gap-4 rounded-3xl p-6 text-center">
            <p>
              {conta
                ? 'Sua conta não faz parte da curadoria. Peça para alguém da curadoria colocar você.'
                : 'Entre com uma conta que faz parte da curadoria.'}
            </p>
            {!conta && (
              <Link to="/conta" className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-rosa font-bold text-white">
                Entrar com minha conta
              </Link>
            )}
            <button type="button" onClick={() => setUsarSenha(true)} className="text-sm text-rosa-suave underline">
              Usar a senha da curadoria
            </button>
          </div>
        )}
      </div>
    </motion.main>
  )
}

const grupos: { situacao: Situacao; titulo: string; vazio: string }[] = [
  { situacao: 'aguardando', titulo: 'Esperando liberação', vazio: 'Ninguém esperando agora.' },
  { situacao: 'liberada', titulo: 'Liberadas', vazio: 'Nenhuma conta liberada ainda.' },
  { situacao: 'recusada', titulo: 'Recusadas', vazio: 'Nenhuma conta recusada.' },
]

const botaoRosa = 'min-h-11 flex-1 rounded-full bg-rosa px-4 font-bold text-white'
const botaoBranco = 'min-h-11 flex-1 rounded-full bg-white px-4 font-bold text-rosa shadow-[0_0_0_1px_var(--color-borda-forte)]'

function ListaDeContas({ eu, porSenha, onSairDaSenha }: { eu?: string; porSenha: boolean; onSairDaSenha: () => void }) {
  const [contas, setContas] = useState<ContaCuradoria[] | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    try {
      setContas(await listarContas())
    } catch (e) {
      if ((e as Error).message === 'Senha incorreta.') onSairDaSenha()
      setErro((e as Error).message)
    }
  }, [onSairDaSenha])

  useEffect(() => { carregar() }, [carregar])

  async function acao(fazer: () => Promise<void>) {
    setErro('')
    try { await fazer(); await carregar() } catch (e) { setErro((e as Error).message) }
  }

  if (!contas) return erro ? <p className="text-center text-rosa" role="alert">{erro}</p> : <Carregando />

  return (
    <div className="flex flex-col gap-8">
      {erro && <p className="text-center font-bold text-rosa" role="alert">{erro}</p>}
      {grupos.map((g) => {
        const lista = contas.filter((c) => c.situacao === g.situacao)
        return (
          <section key={g.situacao}>
            <h2 className="mb-3 font-titulo text-xl text-rosa-escuro">
              {g.titulo} <span className="text-base text-rosa-suave">({lista.length})</span>
            </h2>
            {lista.length === 0 ? (
              <p className="text-sm text-rosa-suave">{g.vazio}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {lista.map((c) => (
                  <li key={c.id} className="moldura-dupla flex flex-col gap-3 rounded-3xl p-4">
                    <div className="flex items-center gap-3">
                      <Avatar conta={c} tamanho="size-14" />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 font-bold">
                          <span className="truncate">{c.nome}</span>
                          {c.curadoria && <SeloCuradoria />}
                          {c.id === eu && <span className="text-xs font-normal text-rosa-suave">(você)</span>}
                        </p>
                        <p className="truncate text-sm text-rosa-suave">{c.email}</p>
                        <p className="text-xs text-rosa-suave">Cadastro em {new Date(c.criadaEm).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    {c.id === eu ? (
                      <p className="text-xs text-rosa-suave">Esta é a sua conta. Outra pessoa da curadoria é que pode mudar ela.</p>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {c.situacao !== 'liberada' && (
                            <button type="button" onClick={() => acao(() => mudarSituacao(c.id, 'liberada'))} className={botaoRosa}>Liberar ✦</button>
                          )}
                          {c.situacao === 'liberada' && (
                            <button type="button" onClick={() => acao(() => mudarCuradoria(c.id, !c.curadoria))} className={c.curadoria ? botaoBranco : botaoRosa}>
                              {c.curadoria ? 'Tirar da curadoria' : 'Pôr na curadoria ✦'}
                            </button>
                          )}
                          {c.situacao !== 'recusada' && (
                            <button type="button" onClick={() => acao(() => mudarSituacao(c.id, 'recusada'))} className={botaoBranco}>Recusar</button>
                          )}
                          <BotaoApagar onApagar={() => acao(() => apagarConta(c.id))} />
                        </div>
                        {c.situacao === 'liberada' && (
                          <p className="text-xs text-rosa-suave">
                            {c.curadoria
                              ? 'Faz parte da curadoria: libera contas, edita e apaga qualquer coisa.'
                              : 'Recusar apaga os comentários dessa pessoa.'}
                          </p>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
      {porSenha && (
        <button type="button" onClick={onSairDaSenha} className="self-center text-sm text-rosa-suave underline">Esquecer a senha da curadoria neste celular</button>
      )}
    </div>
  )
}

function BotaoApagar({ onApagar }: { onApagar: () => void }) {
  const [confirmando, setConfirmando] = useState(false)
  return confirmando ? (
    <span className="flex w-full items-center justify-center gap-3 text-sm">
      Apagar a conta e os comentários?
      <button type="button" onClick={onApagar} className="min-h-11 rounded-full bg-rosa px-4 font-bold text-white">Sim</button>
      <button type="button" onClick={() => setConfirmando(false)} className="min-h-11 px-2 underline">Não</button>
    </span>
  ) : (
    <button type="button" onClick={() => setConfirmando(true)} className="min-h-11 px-3 text-sm text-rosa-suave underline">Apagar</button>
  )
}
