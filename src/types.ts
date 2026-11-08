// O "formato" dos dados que ficam em src/data/albuns.json

export interface Item {
  id: string
  url: string          // caminho da imagem dentro de public/ (ex.: "images/lofi/foto.jpg")
  anime: string        // de qual anime é a cena
  comentario: string   // por que essa cena é inspiradora
  cores: string[]      // 4 ou 5 cores da imagem, em hexadecimal
}

export interface Album {
  id: string
  titulo: string
  descricao: string
  capa: string
  donoId?: string | null   // conta que criou o álbum (sem dono = só a curadora mexe)
  dono?: Conta | null      // nome e foto de quem criou
  itens: Item[]
}

// Quem se cadastrou para comentar
export type Situacao = 'aguardando' | 'liberada' | 'recusada'

export interface Conta {
  id: string
  nome: string
  foto: string         // caminho da foto de perfil (ex.: "midia/perfis/abc.webp")
  situacao: Situacao   // a curadora libera ou recusa
  curadoria?: boolean  // faz parte da curadoria (mesmos poderes da senha da curadora)
}

export interface ContaCuradoria extends Conta {
  email: string
  criadaEm: string
}

export interface Comentario {
  id: string
  respostaDe: string | null   // id do comentário "pai"; null = comentário direto na cena
  texto: string
  criadoEm: string
  editadoEm?: string | null
  autor: Conta
}
