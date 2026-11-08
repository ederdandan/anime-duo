import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { apagarConta, listarContas, mudarSituacao, salvarSenha, senhaSalva } from '../lib/api'
import { useAlbuns } from '../lib/albuns'
import { voltar } from '../lib/estilos'
import Avatar from '../components/Avatar'
import Carregando from '../components/Carregando'
import EntrarCuradora from '../components/EntrarCuradora'
import type { ContaCuradoria, Situacao } from '../types'

// Tela da curadora: vê quem se cadastrou e libera (ou não) para comentar.
export default function Curadoria() {
  const { temServidor, albuns } = useAlbuns()
  const [logada, setLogada] = useState(!!senhaSalva())
  const sair = useCallback(() => { salvarSenha(null); setLogada(false) }, [])

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <Link to="/" className={voltar}>← Álbuns</Link>

      <header className="mt-6 mb-8 text-center">
        <h1 className="font-titulo text-[clamp(1.75rem,7vw,3rem)] leading-tight text-rosa">
          Curadoria <span className="brilho-dourado inline-block text-[0.7em]">✦</span>
        </h1>
        <p className="mt-2 text-rosa-suave">Quem pode comentar no mural</p>
      </header>

      <div className="mx-auto max-w-lg">
        {!albuns ? <Carregando /> : !temServidor ? (
          <p className="moldura-dupla rounded-3xl p-6 text-center">A curadoria só funciona no endereço do site no MonsterASP.</p>
        ) : !logada ? (
          <EntrarCuradora onEntrou={() => setLogada(true)} />
        ) : (
          <ListaDeContas onSair={sair} />
        )}
      </div>
    </motion.main>
  )
}

const grupos: { situacao: Situacao; titulo: string; vazio: string }[] = [
  { situacao: 'aguardando', titulo: 'Esperando liberação', vazio: 'Ninguém esperando agora.' },
  { situacao: 'liberada', titulo: 'Podem comentar', vazio: 'Nenhuma conta liberada ainda.' },
  { situacao: 'recusada', titulo: 'Recusadas', vazio: 'Nenhuma conta recusada.' },
]

function ListaDeContas({ onSair }: { onSair: () => void }) {
  const [contas, setContas] = useState<ContaCuradoria[] | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    try {
      setContas(await listarContas())
    } catch (e) {
      if ((e as Error).message === 'Senha incorreta.') onSair()
      setErro((e as Error).message)
    }
  }, [onSair])

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
                        <p className="truncate font-bold">{c.nome}</p>
                        <p className="truncate text-sm text-rosa-suave">{c.email}</p>
                        <p className="text-xs text-rosa-suave">Cadastro em {new Date(c.criadaEm).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.situacao !== 'liberada' && (
                        <button type="button" onClick={() => acao(() => mudarSituacao(c.id, 'liberada'))} className="min-h-11 flex-1 rounded-full bg-rosa px-4 font-bold text-white">
                          Liberar ✦
                        </button>
                      )}
                      {c.situacao !== 'recusada' && (
                        <button type="button" onClick={() => acao(() => mudarSituacao(c.id, 'recusada'))} className="min-h-11 flex-1 rounded-full bg-white px-4 font-bold text-rosa shadow-[0_0_0_1px_var(--color-borda-forte)]">
                          Recusar
                        </button>
                      )}
                      <BotaoApagar onApagar={() => acao(() => apagarConta(c.id))} />
                    </div>
                    {c.situacao === 'liberada' && <p className="text-xs text-rosa-suave">Recusar apaga os comentários dessa pessoa.</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
      <button type="button" onClick={onSair} className="self-center text-sm text-rosa-suave underline">Sair da curadoria neste celular</button>
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
