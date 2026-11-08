import { useCallback, useEffect, useState } from 'react'
import { apagarDeVez, listarHistorico, listarLixeira, restaurarDaLixeira } from '../lib/api'
import { useAlbuns } from '../lib/albuns'
import { caminho } from '../lib/caminho'
import Carregando from './Carregando'
import type { Evento, NaLixeira } from '../types'

const data = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

// Cenas apagadas ficam 30 dias aqui. A curadoria pode devolver para o álbum ou apagar de vez.
export function Lixeira() {
  const { recarregar } = useAlbuns()
  const [lista, setLista] = useState<NaLixeira[] | null>(null)
  const [erro, setErro] = useState('')
  const [confirmando, setConfirmando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try { setLista(await listarLixeira()) } catch (e) { setErro((e as Error).message) }
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function acao(fazer: () => Promise<void>) {
    setErro('')
    try { await fazer(); await carregar(); await recarregar() } catch (e) { setErro((e as Error).message) }
  }

  if (!lista) return erro ? <p className="text-center text-rosa" role="alert">{erro}</p> : <Carregando />

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm text-rosa-suave">Cenas apagadas ficam aqui por 30 dias. Depois somem de vez.</p>
      {erro && <p className="text-center font-bold text-rosa" role="alert">{erro}</p>}
      {lista.length === 0 && (
        <p className="py-8 text-center text-rosa-suave"><span className="text-3xl text-petala" aria-hidden="true">✿</span><br />A lixeira está vazia.</p>
      )}
      <ul className="flex flex-col gap-3">
        {lista.map((x) => (
          <li key={x.id} className="moldura-dupla flex flex-col gap-3 rounded-3xl p-4">
            <div className="flex gap-3">
              <img src={caminho(x.item.url)} alt="" className="size-20 shrink-0 rounded-xl object-cover" loading="lazy" />
              <div className="min-w-0 text-sm">
                <p className="font-bold">{x.item.anime || 'Cena sem nome'}</p>
                <p className="line-clamp-2 text-rosa-suave">{x.item.comentario}</p>
                <p className="mt-1 text-xs text-rosa-suave">
                  Álbum "{x.albumTitulo}" · apagada por <b>{x.apagadaPor}</b> em {data(x.apagadaEm)}
                </p>
              </div>
            </div>
            {confirmando === x.id ? (
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                Apagar de vez? Não dá para desfazer.
                <button type="button" onClick={() => acao(() => apagarDeVez(x.id))} className="min-h-11 rounded-full bg-rosa px-4 font-bold text-on-rosa">Sim</button>
                <button type="button" onClick={() => setConfirmando(null)} className="min-h-11 px-2 underline">Não</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={() => acao(() => restaurarDaLixeira(x.id))} className="min-h-11 flex-1 rounded-full bg-rosa px-4 font-bold text-on-rosa">
                  Restaurar ↺
                </button>
                <button type="button" onClick={() => setConfirmando(x.id)} className="min-h-11 px-3 text-sm text-rosa-suave underline">
                  Apagar de vez
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Quem fez o quê, e quando. Os 500 mais recentes.
export function Historico() {
  const [lista, setLista] = useState<Evento[] | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => { listarHistorico().then(setLista, (e) => setErro((e as Error).message)) }, [])

  if (!lista) return erro ? <p className="text-center text-rosa" role="alert">{erro}</p> : <Carregando />
  if (lista.length === 0) return <p className="py-8 text-center text-rosa-suave">Nada aconteceu ainda.</p>

  return (
    <ol className="moldura-dupla flex flex-col divide-y divide-borda rounded-3xl px-4">
      {lista.map((e, i) => (
        <li key={i} className="py-3 text-sm">
          <span className="font-bold text-rosa-escuro">{e.quem}</span> {e.acao}
          <span className="block text-xs text-rosa-suave">{data(e.quando)}</span>
        </li>
      ))}
    </ol>
  )
}
