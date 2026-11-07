# Meu Mural Anime ✦

Um mural de cenas de anime no estilo **Shoujo · Pétalas de Sakura**. Projeto de pai e filha: ela faz a curadoria, ele cuida do código (e os dois aprendem a usar IA no caminho).

A ideia completa está em [ideia.md](ideia.md).

## Rodar no computador

```bash
npm install
npm run dev
```

Abra o endereço que aparecer (normalmente http://localhost:5173). Para ver como fica no celular, abra o mesmo endereço no celular conectado ao mesmo Wi-Fi, usando `npm run dev -- --host`.

## Para a curadora: como mudar o conteúdo

Tudo o que aparece no site vem de dois arquivos de texto. Não precisa programar para mexer neles:

| Quero mudar... | Arquivo |
|---|---|
| Nome e frase do topo do site | `src/data/site.json` |
| Álbuns, fotos, comentários e cores | `src/data/albuns.json` |
| Cores e fontes do estilo | começo do `src/index.css` |

### Adicionar uma foto num álbum
1. Coloque a imagem na pasta do álbum, por exemplo `public/images/lofi/minha-cena.jpg`.
2. No `src/data/albuns.json`, dentro de `"itens"` do álbum, adicione:
   ```json
   {
     "id": "minha-cena",
     "url": "images/lofi/minha-cena.jpg",
     "anime": "Nome do anime",
     "comentario": "Por que essa cena me inspira.",
     "cores": ["#2D2343", "#E69A8B", "#4A5568", "#F7FAFC"]
   }
   ```
3. Não esqueça a vírgula entre um item e outro.

Dica: você pode pedir para a IA: *"Adiciona a foto public/images/lofi/minha-cena.jpg no álbum Lo-Fi com o comentário: ..."*. Também dá para pedir que ela descubra as cores da imagem.

As imagens que vêm no projeto (`.svg`) são só exemplos. Pode apagar e trocar pelas capturas de verdade. Prefira `.jpg` ou `.webp` com até uns 1600px de largura, para abrir rápido no celular.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie o projeto (`git push`).
2. No repositório, vá em **Settings → Pages** e, em **Source**, escolha **GitHub Actions**.
3. Pronto: a cada `push` na branch `main`, o site é publicado sozinho em `https://<usuario>.github.io/<repositorio>/`.
