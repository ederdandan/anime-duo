import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { carregarAlbuns } from './api'
import type { Album } from '../types'

// Guarda a lista de álbuns para todas as telas do site.
interface Estado {
  albuns: Album[] | null      // null enquanto carrega
  temServidor: boolean        // false no GitHub Pages (só leitura)
  recarregar: () => Promise<void>
}

const Contexto = createContext<Estado>({ albuns: null, temServidor: false, recarregar: async () => {} })

export function AlbunsProvider({ children }: { children: ReactNode }) {
  const [albuns, setAlbuns] = useState<Album[] | null>(null)
  const [temServidor, setTemServidor] = useState(false)

  const recarregar = useCallback(async () => {
    const r = await carregarAlbuns()
    setAlbuns(r.albuns)
    setTemServidor(r.temServidor)
  }, [])

  useEffect(() => { recarregar() }, [recarregar])

  return <Contexto.Provider value={{ albuns, temServidor, recarregar }}>{children}</Contexto.Provider>
}

export function useAlbuns() {
  return useContext(Contexto)
}
