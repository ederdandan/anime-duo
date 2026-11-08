import { caminho } from '../lib/caminho'

// Imagem com brilho branco nas bordas. Sem imagem (álbum novo), mostra um fundo com flor.
export default function Capa({ url, alt = '', className = '', eager = false }: { url?: string; alt?: string; className?: string; eager?: boolean }) {
  return (
    <div className={`brilho-branco ${className}`}>
      {url ? (
        <img src={caminho(url)} alt={alt} className="size-full object-cover" loading={eager ? 'eager' : 'lazy'} />
      ) : (
        <div className="grid size-full place-items-center bg-gradient-to-b from-fundo-topo to-pessego text-4xl text-petala">✿</div>
      )}
    </div>
  )
}
