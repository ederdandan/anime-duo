import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import Petalas from './components/Petalas'
import Rodape from './components/Rodape'
import Home from './pages/Home'
import Galeria from './pages/Galeria'
import NovaCena from './pages/NovaCena'
import ContaPagina from './pages/Conta'
import Curadoria from './pages/Curadoria'

export default function App() {
  const location = useLocation()

  return (
    <>
      <Petalas />
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        {/* AnimatePresence faz a troca de telas com fade suave */}
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/album/:id" element={<Galeria />} />
            <Route path="/nova" element={<NovaCena />} />
            <Route path="/conta" element={<ContaPagina />} />
            <Route path="/curadoria" element={<Curadoria />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </AnimatePresence>
        <Rodape />
      </div>
    </>
  )
}
