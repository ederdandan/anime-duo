import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { TEMAS, escolherTema, temaAtual, type Tema } from '../lib/tema'
import { voltar } from '../lib/estilos'

// Tela para escolher as cores do mural. Cada cartão é uma prévia do tema de verdade:
// ele recebe data-tema e as cores mudam só dentro dele.
export default function TemaPagina() {
  const [atual, setAtual] = useState(temaAtual)

  function escolher(id: string) {
    escolherTema(id)
    setAtual(id)
  }

  const grupo = (g: Tema['grupo']) => TEMAS.filter((t) => t.grupo === g)

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <Link to="/" className={voltar}>← Álbuns</Link>

      <header className="mt-6 mb-8 text-center">
        <h1 className="font-titulo text-[clamp(1.75rem,7vw,3rem)] leading-tight text-rosa">
          Tema <span className="brilho-dourado inline-block text-[0.7em]">✦</span>
        </h1>
        <p className="mt-2 text-rosa-suave">A escolha fica guardada neste aparelho.</p>
      </header>

      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <Grupo titulo="Shoujo" descricao="Com pétalas caindo e brilhos." temas={grupo('shoujo')} atual={atual} onEscolher={escolher} />
        <Grupo titulo="Neutros" descricao="Mais calmos, sem pétalas e sem enfeites." temas={grupo('neutro')} atual={atual} onEscolher={escolher} />
      </div>
    </motion.main>
  )
}

function Grupo(props: { titulo: string; descricao: string; temas: Tema[]; atual: string; onEscolher: (id: string) => void }) {
  return (
    <section>
      <h2 className="font-titulo text-xl text-rosa">{props.titulo}</h2>
      <p className="mb-3 text-sm text-rosa-suave">{props.descricao}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label={props.titulo}>
        {props.temas.map((t) => (
          <Previa key={t.id} tema={t} ativo={props.atual === t.id} onEscolher={() => props.onEscolher(t.id)} />
        ))}
      </div>
    </section>
  )
}

function Previa({ tema, ativo, onEscolher }: { tema: Tema; ativo: boolean; onEscolher: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativo}
      onClick={onEscolher}
      // data-tema aqui faz as cores do cartão serem as do tema dele
      data-tema={tema.id}
      className={`rounded-3xl bg-pessego p-3 text-left text-ameixa ${ativo ? 'outline-3 outline-offset-2 outline-rosa' : ''}`}
    >
      <div className="moldura-dupla flex flex-col gap-2 rounded-2xl p-3">
        <span className="font-titulo text-lg text-rosa">{tema.nome}</span>
        <span className="h-2 w-3/4 rounded-full bg-borda" />
        <span className="h-2 w-1/2 rounded-full bg-borda" />
        <span className="mt-1 flex items-center gap-1.5">
          <span className="h-6 flex-1 rounded-full bg-rosa" />
          <span className="size-6 rounded-full bg-petala" />
          <span className="size-6 rounded-full bg-dourado" />
        </span>
      </div>
      <span className="mt-2 block text-center text-sm font-bold text-rosa-suave">{ativo ? '✓ Em uso' : 'Usar este'}</span>
    </button>
  )
}
