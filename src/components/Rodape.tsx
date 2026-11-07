import { Link } from 'react-router-dom'
import { useAlbuns } from '../lib/albuns'

export default function Rodape() {
  const { temServidor } = useAlbuns()
  return (
    <footer className="mt-auto flex flex-col items-center gap-3 pt-12 text-center text-sm text-rosa-suave">
      {temServidor && (
        <Link
          to="/nova"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 font-bold text-rosa shadow-[0_0_0_1px_var(--color-borda-forte)]"
        >
          <span className="text-dourado">✦</span> Nova cena
        </Link>
      )}
      <div>
        <p aria-hidden="true" className="mb-1 tracking-[0.6em] text-petala">✿ ✦ ❀ ✦ ✿</p>
        <p>Curadoria da filha · código do pai</p>
      </div>
    </footer>
  )
}
