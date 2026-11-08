import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apagarComentario, comentar, editarComentario, listarComentarios } from '../lib/api'
import { usePermissoes } from '../lib/permissoes'
import { useConta } from '../lib/conta'
import { botaoPrincipal, campo } from '../lib/estilos'
import Avatar from './Avatar'
import type { Album, Comentario } from '../types'

// Comentários de uma cena, com respostas dentro de respostas.
// O servidor manda uma lista "reta"; aqui juntamos cada resposta embaixo do seu comentário "pai".
export default function Comentarios({ album, cenaId }: { album: Album; cenaId: string }) {
  const albumId = album.id
  const { conta } = useConta()
  const { curadora, donoDe } = usePermissoes()
  const [lista, setLista] = useState<Comentario[] | null>(null)
  const [erro, setErro] = useState('')
  // Qual comentário está com a caixinha aberta, e para quê
  const [aberto, setAberto] = useState<{ id: string; modo: 'responder' | 'editar' } | null>(null)

  const carregar = useCallback(async () => {
    try {
      setLista(await listarComentarios(albumId, cenaId))
    } catch (e) {
      setErro((e as Error).message)
    }
  }, [albumId, cenaId])

  useEffect(() => { carregar() }, [carregar])

  // Mapa: id do comentário "pai" -> respostas dele. A chave "" guarda os comentários diretos na cena.
  const filhos = new Map<string, Comentario[]>()
  for (const c of lista ?? []) {
    const chave = c.respostaDe ?? ''
    filhos.set(chave, [...(filhos.get(chave) ?? []), c])
  }

  const podeComentar = conta?.situacao === 'liberada'
  // O dono do álbum e a curadora podem apagar qualquer comentário (ex.: um comentário indesejado)
  const moderador = curadora || donoDe(album)
  const meu = (c: Comentario) => podeComentar && c.autor.id === conta?.id
  const alternar = (id: string, modo: 'responder' | 'editar') =>
    setAberto(aberto?.id === id && aberto.modo === modo ? null : { id, modo })

  async function enviar(texto: string, respostaDe: string | null) {
    await comentar(albumId, cenaId, texto, respostaDe)
    setAberto(null)
    await carregar()
  }

  async function salvarEdicao(id: string, texto: string) {
    await editarComentario(id, texto)
    setAberto(null)
    await carregar()
  }

  async function apagar(id: string) {
    try {
      await apagarComentario(id)
      await carregar()
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  function ramo(paiId: string, nivel: number) {
    const itens = filhos.get(paiId) ?? []
    if (itens.length === 0) return null
    return (
      // Até o 4º nível vai entrando para a direita; depois fica alinhado, para caber no celular.
      <ul className={nivel > 0 ? `mt-3 flex flex-col gap-3 border-l-2 border-petala ${nivel <= 4 ? 'pl-3 sm:pl-4' : 'pl-0 border-l-0'}` : 'flex flex-col gap-4'}>
        {itens.map((c) => (
          <li key={c.id}>
            <div className="flex gap-2.5">
              <Avatar conta={c.autor} tamanho={nivel === 0 ? 'size-9' : 'size-7'} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-bold text-rosa-escuro">{c.autor.nome}</span>{' '}
                  <span className="text-xs text-rosa-suave">{quando(c.criadoEm)}{c.editadoEm && ' · editado'}</span>
                </p>
                {aberto?.id === c.id && aberto.modo === 'editar' ? (
                  <Escrever inicial={c.texto} rotulo="Salvar" placeholder="Editar comentário" onEnviar={(t) => salvarEdicao(c.id, t)} onCancelar={() => setAberto(null)} />
                ) : (
                  <p className="leading-relaxed break-words whitespace-pre-line">{c.texto}</p>
                )}
                <div className="flex flex-wrap gap-x-3 text-sm">
                  {podeComentar && (
                    <button type="button" onClick={() => alternar(c.id, 'responder')} className="min-h-9 font-bold text-rosa">
                      Responder
                    </button>
                  )}
                  {meu(c) && (
                    <button type="button" onClick={() => alternar(c.id, 'editar')} className="min-h-9 text-rosa-suave">
                      Editar
                    </button>
                  )}
                  {(meu(c) || moderador) && <BotaoApagar onApagar={() => apagar(c.id)} />}
                </div>
                {aberto?.id === c.id && aberto.modo === 'responder' && (
                  <Escrever placeholder={`Responder ${c.autor.nome}…`} onEnviar={(t) => enviar(t, c.id)} onCancelar={() => setAberto(null)} />
                )}
              </div>
            </div>
            {ramo(c.id, nivel + 1)}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className="rounded-[28px] bg-white px-4 py-5 text-left shadow-[0_0_0_2px_#fff,0_0_0_3px_var(--color-borda)] sm:px-5">
      <h2 className="mb-4 font-titulo text-lg text-rosa">
        Comentários {lista && lista.length > 0 && <span className="text-sm text-rosa-suave">({lista.length})</span>}
      </h2>

      {podeComentar ? (
        <div className="mb-5 flex gap-2.5">
          <Avatar conta={conta!} tamanho="size-9" />
          <div className="flex-1"><Escrever placeholder="O que você achou dessa cena?" onEnviar={(t) => enviar(t, null)} /></div>
        </div>
      ) : (
        <p className="mb-5 rounded-2xl bg-pessego px-4 py-3 text-sm">
          {!conta ? (
            <><Link to="/conta" className="font-bold text-rosa underline">Entre ou crie uma conta</Link> para comentar.</>
          ) : conta.situacao === 'aguardando' ? (
            'Sua conta está esperando a curadora liberar. Logo você poderá comentar!'
          ) : (
            'Sua conta não foi liberada para comentar.'
          )}
        </p>
      )}

      {erro && <p className="mb-3 text-sm font-bold text-rosa" role="alert">{erro}</p>}
      {!lista ? (
        <p className="text-sm text-rosa-suave">Carregando comentários…</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-rosa-suave">Ninguém comentou ainda.</p>
      ) : (
        ramo('', 0)
      )}
    </section>
  )
}

function Escrever({ placeholder, onEnviar, onCancelar, inicial = '', rotulo = 'Enviar' }: {
  placeholder: string
  onEnviar: (texto: string) => Promise<void>
  onCancelar?: () => void
  inicial?: string
  rotulo?: string
}) {
  const [texto, setTexto] = useState(inicial)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    setEnviando(true)
    setErro('')
    try {
      await onEnviar(texto)
      setTexto('')
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="mt-2 flex flex-col gap-2">
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={placeholder}
        maxLength={1000}
        rows={2}
        autoFocus={!!onCancelar}
        className={`${campo} py-2`}
        aria-label={placeholder}
      />
      {erro && <p className="text-sm font-bold text-rosa" role="alert">{erro}</p>}
      <div className="flex items-center justify-end gap-3">
        {onCancelar && <button type="button" onClick={onCancelar} className="min-h-10 px-2 text-sm text-rosa-suave underline">Cancelar</button>}
        <button type="submit" disabled={enviando || !texto.trim()} className={`${botaoPrincipal} min-h-10 px-5 text-sm`}>
          {enviando ? 'Enviando…' : rotulo}
        </button>
      </div>
    </form>
  )
}

function BotaoApagar({ onApagar }: { onApagar: () => void }) {
  const [confirmando, setConfirmando] = useState(false)
  return confirmando ? (
    <span className="flex items-center gap-2">
      Apagar com as respostas?
      <button type="button" onClick={onApagar} className="min-h-9 font-bold text-rosa">Sim</button>
      <button type="button" onClick={() => setConfirmando(false)} className="min-h-9 text-rosa-suave">Não</button>
    </span>
  ) : (
    <button type="button" onClick={() => setConfirmando(true)} className="min-h-9 text-rosa-suave">Apagar</button>
  )
}

// "agora", "há 5 min", "há 3 h", ou a data
function quando(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  if (min < 60 * 24) return `há ${Math.round(min / 60)} h`
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}
