import { senhaSalva } from './api'
import { useAlbuns } from './albuns'
import { useConta } from './conta'
import type { Album } from '../types'

// Quem pode fazer o quê no site (o servidor confere tudo de novo; aqui é só para mostrar os botões certos).
export function usePermissoes() {
  const { temServidor } = useAlbuns()
  const { conta } = useConta()
  const curadora = temServidor && !!senhaSalva()
  const liberada = temServidor && conta?.situacao === 'liberada'

  return {
    curadora,
    liberada,
    // Pode criar álbuns e postar cenas
    podePostar: curadora || liberada,
    // É o dono deste álbum (quem criou)
    donoDe: (album: Album) => liberada && !!album.donoId && album.donoId === conta?.id,
    // Pode editar o álbum, colocar/editar/apagar cenas e apagar comentários nele
    podeMexer: (album: Album) => curadora || (liberada && !!album.donoId && album.donoId === conta?.id),
  }
}
