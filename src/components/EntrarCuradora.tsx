import { useState, type FormEvent } from 'react'
import { entrar, salvarSenha } from '../lib/api'
import { botaoPrincipal, campo, rotulo } from '../lib/estilos'

// Pede a senha da curadora (usada na "Nova cena" e na "Curadoria").
export default function EntrarCuradora({ onEntrou }: { onEntrou: () => void }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro('')
    try {
      await entrar(senha)
      salvarSenha(senha)
      onEntrou()
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="moldura-dupla flex flex-col gap-4 rounded-3xl p-6">
      <div>
        <label htmlFor="senha" className={rotulo}>Senha da curadora</label>
        <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} required />
        <p className="mt-2 text-sm text-rosa-suave">Você só precisa digitar uma vez neste celular.</p>
      </div>
      {erro && <p className="text-sm font-bold text-rosa" role="alert">{erro}</p>}
      <button type="submit" disabled={enviando} className={botaoPrincipal}>
        {enviando ? 'Conferindo…' : 'Entrar'}
      </button>
    </form>
  )
}
