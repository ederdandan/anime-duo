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
  itens: Item[]
}
