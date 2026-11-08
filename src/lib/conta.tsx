import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { minhaConta, sairConta } from './api'
import { useAlbuns } from './albuns'
import type { Conta } from '../types'

// Guarda quem está logado (para comentar) e avisa todas as telas.
interface Estado {
  conta: Conta | null               // null = ninguém logado
  setConta: (c: Conta | null) => void
  recarregar: () => Promise<void>
  sair: () => Promise<void>
}

const Contexto = createContext<Estado>({ conta: null, setConta: () => {}, recarregar: async () => {}, sair: async () => {} })

export function ContaProvider({ children }: { children: ReactNode }) {
  const { temServidor } = useAlbuns()
  const [conta, setConta] = useState<Conta | null>(null)

  const recarregar = useCallback(async () => setConta(await minhaConta()), [])
  const sair = useCallback(async () => { await sairConta(); setConta(null) }, [])

  // Sem servidor (GitHub Pages) não existe conta.
  useEffect(() => { if (temServidor) recarregar() }, [temServidor, recarregar])

  return <Contexto.Provider value={{ conta, setConta, recarregar, sair }}>{children}</Contexto.Provider>
}

export function useConta() {
  return useContext(Contexto)
}
