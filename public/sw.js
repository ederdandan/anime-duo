// Service worker: um "ajudante" que fica no celular entre o site e a internet.
// Ele guarda uma cópia das coisas para o mural abrir rápido e funcionar mesmo sem internet.
//
// Regras:
// - Página (index.html): tenta a internet primeiro; sem internet, usa a cópia.
// - Arquivos do site (/assets) e fotos (/midia): não mudam nunca, então usa a cópia direto.
// - Lista de álbuns (/api/albuns): internet primeiro; sem internet, a última lista vista.
// - Resto da API (login, comentários, curadoria): sempre direto na internet, nunca guarda.

const VERSAO = 'mural-v1'
const MAX_FOTOS = 200

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.add('./')).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const base = new URL(self.registration.scope)

  if (req.mode === 'navigate') {
    e.respondWith(internetPrimeiro(req, './'))
  } else if (url.origin === base.origin && url.pathname.startsWith(base.pathname + 'api/albuns') && !url.pathname.includes('/comentarios')) {
    e.respondWith(internetPrimeiro(req))
  } else if (url.origin === base.origin && url.pathname.startsWith(base.pathname + 'api/')) {
    return // vai direto para a internet
  } else if (url.origin === base.origin && /\/(assets|midia|images|icones)\//.test(url.pathname)) {
    e.respondWith(copiaPrimeiro(req))
  } else if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(copiaPrimeiro(req))
  }
})

async function internetPrimeiro(req, chave) {
  const cache = await caches.open(VERSAO)
  try {
    const resp = await fetch(req)
    if (resp.ok) cache.put(chave ?? req, resp.clone())
    return resp
  } catch {
    const copia = await cache.match(chave ?? req)
    if (copia) return copia
    throw new Error('Sem internet e sem cópia guardada.')
  }
}

async function copiaPrimeiro(req) {
  const cache = await caches.open(VERSAO)
  const copia = await cache.match(req)
  if (copia) return copia
  const resp = await fetch(req)
  if (resp.ok || resp.type === 'opaque') {
    await cache.put(req, resp.clone())
    limpar(cache)
  }
  return resp
}

// Não deixa a cópia crescer sem fim: guarda só as fotos mais recentes.
async function limpar(cache) {
  const fotos = (await cache.keys()).filter((r) => r.url.includes('/midia/'))
  for (const r of fotos.slice(0, Math.max(0, fotos.length - MAX_FOTOS))) await cache.delete(r)
}
