import { useSyncExternalStore } from 'react'

// Instalar o mural como app (PWA).
// O Chrome do Android avisa com o evento "beforeinstallprompt" quando dá para instalar.
// A gente guarda esse aviso e mostra o botão "Instalar app" no rodapé.

type AvisoDeInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let aviso: AvisoDeInstalar | null = null
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())

export function prepararInstalacao() {
  // O ajudante (sw.js) só existe no site publicado; no "npm run dev" atrapalharia.
  if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => { /* sem ajudante, o site funciona igual */ })
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // a gente mostra o nosso botão em vez da faixa do Chrome
    aviso = e as AvisoDeInstalar
    avisar()
  })
  window.addEventListener('appinstalled', () => { aviso = null; avisar() })
}

export async function instalar() {
  if (!aviso) return
  await aviso.prompt()
  await aviso.userChoice
  aviso = null
  avisar()
}

// true quando o celular deixa instalar agora
export function usePodeInstalar() {
  return useSyncExternalStore(
    (f) => { ouvintes.add(f); return () => ouvintes.delete(f) },
    () => aviso !== null,
  )
}
