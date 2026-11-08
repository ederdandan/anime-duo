import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Botão de câmera.
// Jeito principal: abre a câmera DENTRO da página (precisa de HTTPS). Assim o celular não troca
// para o app da câmera, e o Android não fecha a página no meio (o que fazia a foto sumir).
// Se a câmera ao vivo não funcionar, o botão vira o jeito antigo: abre o app da câmera.

interface Props {
  frente?: boolean                 // true = câmera da frente (selfie)
  className: string
  children: ReactNode              // o texto do botão
  onFoto: (foto: Blob) => void
  onErro: (mensagem: string) => void
}

const temCameraAoVivo = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext

export default function BotaoCamera({ frente = false, className, children, onFoto, onErro }: Props) {
  const [aberta, setAberta] = useState(false)
  const [aoVivo, setAoVivo] = useState(temCameraAoVivo)

  if (!aoVivo) {
    // Jeito antigo: "capture" pede para o celular abrir o app da câmera.
    return (
      <label className={className}>
        {children}
        <input
          type="file"
          accept="image/*"
          capture={frente ? 'user' : 'environment'}
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFoto(f); e.target.value = '' }}
        />
      </label>
    )
  }

  return (
    <>
      <button type="button" className={className} onClick={() => { onErro(''); setAberta(true) }}>{children}</button>
      {aberta && (
        <CameraAoVivo
          frente={frente}
          onFoto={(f) => { setAberta(false); onFoto(f) }}
          onFechar={() => setAberta(false)}
          onFalhou={(msg) => {
            setAberta(false)
            setAoVivo(false)
            onErro(`${msg} Toque de novo no botão 📷 para usar o app da câmera.`)
          }}
        />
      )}
    </>
  )
}

function CameraAoVivo(props: { frente: boolean; onFoto: (f: Blob) => void; onFechar: () => void; onFalhou: (msg: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [frente, setFrente] = useState(props.frente)
  const [pronta, setPronta] = useState(false)
  const { onFalhou } = props
  const falhou = useRef(onFalhou)
  falhou.current = onFalhou

  // Liga a câmera (e desliga quando fecha ou quando vira para o outro lado).
  useEffect(() => {
    let fluxo: MediaStream | null = null
    let cancelado = false
    setPronta(false)
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: frente ? 'user' : 'environment', width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then(async (f) => {
        if (cancelado) { f.getTracks().forEach((t) => t.stop()); return }
        fluxo = f
        const v = video.current!
        v.srcObject = f
        await v.play().catch(() => {})
        setPronta(true)
      })
      .catch((e: DOMException) => {
        if (cancelado) return
        falhou.current(
          e.name === 'NotAllowedError' ? 'O celular não deixou o site usar a câmera.'
          : e.name === 'NotFoundError' ? 'Não encontrei uma câmera neste aparelho.'
          : 'Não consegui abrir a câmera aqui.',
        )
      })
    return () => { cancelado = true; fluxo?.getTracks().forEach((t) => t.stop()) }
  }, [frente])

  // Fecha com a tecla Esc (no computador)
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') props.onFechar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  function tirar() {
    const v = video.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    c.toBlob((f) => { if (f) props.onFoto(f) }, 'image/jpeg', 0.92)
  }

  // Fica por cima de tudo (portal no <body>), em tela cheia.
  return createPortal(
    <div
      role="dialog"
      aria-label="Câmera"
      className="fixed inset-0 z-[60] flex flex-col bg-black pt-[env(safe-area-inset-top)] pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="relative min-h-0 flex-1">
        {/* A câmera da frente aparece espelhada, como um espelho; a foto sai do jeito certo. */}
        <video ref={video} playsInline muted autoPlay className={`size-full object-contain ${frente ? '-scale-x-100' : ''}`} />
        {!pronta && <p className="absolute inset-0 grid place-items-center text-white/80">Abrindo a câmera…</p>}
      </div>
      <div className="flex items-center justify-around px-6 pt-4">
        <button type="button" onClick={props.onFechar} className="min-h-12 min-w-20 rounded-full px-4 text-white underline">Cancelar</button>
        <button
          type="button"
          onClick={tirar}
          disabled={!pronta}
          aria-label="Tirar foto"
          className="size-20 rounded-full border-4 border-white bg-white/30 disabled:opacity-40 active:bg-white"
        />
        <button type="button" onClick={() => setFrente((f) => !f)} aria-label="Virar a câmera" className="grid min-h-12 min-w-20 place-items-center rounded-full text-2xl text-white">
          ⟲
        </button>
      </div>
    </div>,
    document.body,
  )
}
