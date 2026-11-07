import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' faz o site funcionar em qualquer endereço do GitHub Pages
// (ex.: https://usuario.github.io/anime-duo/) sem precisar saber o nome do repositório.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
