import { Link } from 'react-router-dom'
import { useAlbuns } from '../lib/albuns'
import { useConta } from '../lib/conta'
import { usePermissoes } from '../lib/permissoes'
import Avatar from './Avatar'
import { instalar, usePodeInstalar } from '../lib/instalar'

const pilula = 'inline-flex min-h-11 items-center gap-2 rounded-full bg-cartao px-5 font-bold text-rosa shadow-[0_0_0_1px_var(--color-borda-forte)]'

export default function Rodape() {
  const { temServidor } = useAlbuns()
  const { conta } = useConta()
  const { curadora } = usePermissoes()
  const podeInstalar = usePodeInstalar()

  return (
    <footer className="mt-auto flex flex-col items-center gap-3 pt-12 text-center text-sm text-rosa-suave">
      <div className="flex flex-wrap justify-center gap-2">
        {temServidor && (
          <>
          <Link to="/nova" className={pilula}>
            <span className="text-dourado">✦</span> Nova cena
          </Link>
          {conta ? (
            <Link to="/conta" className={`${pilula} pl-1.5`}>
              <Avatar conta={conta} tamanho="size-8" /> {conta.nome}
            </Link>
          ) : (
            <Link to="/conta" className={pilula}>Entrar para comentar</Link>
          )}
          {curadora && <Link to="/curadoria" className={pilula}>Curadoria</Link>}
          </>
        )}
        <Link to="/tema" className={pilula}><span aria-hidden="true">🎨</span> Tema</Link>
        {podeInstalar && (
          <button type="button" onClick={instalar} className={pilula}><span aria-hidden="true">📲</span> Instalar app</button>
        )}
      </div>
      <div>
        <p aria-hidden="true" className="mb-1 tracking-[0.6em] text-petala">✿ ✦ ❀ ✦ ✿</p>
        <p>Curadoria da filha · código do pai</p>
      </div>
    </footer>
  )
}
