import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AlbunsProvider } from './lib/albuns'
import './index.css'

// HashRouter: os endereços ficam como .../#/album/lofi
// Assim o link de um álbum abre direto, sem erro 404 no GitHub Pages.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AlbunsProvider>
        <App />
      </AlbunsProvider>
    </HashRouter>
  </StrictMode>,
)
