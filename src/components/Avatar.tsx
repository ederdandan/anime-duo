import { caminho } from '../lib/caminho'
import type { Conta } from '../types'

// Foto redondinha de quem comenta, com contorno rosado.
export default function Avatar({ conta, tamanho = 'size-10' }: { conta: Pick<Conta, 'nome' | 'foto'>; tamanho?: string }) {
  return (
    <img
      src={caminho(conta.foto)}
      alt={conta.nome}
      className={`${tamanho} shrink-0 rounded-full bg-pessego object-cover shadow-[0_0_0_2px_#fff,0_0_0_3px_var(--color-borda)]`}
      loading="lazy"
    />
  )
}
