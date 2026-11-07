# SPEC: Estúdio de Estética & Design Anime (Projeto Pai e Filha)

## 1. Visão Geral do Projeto
Este é um projeto colaborativo de desenvolvimento web focado na relação **Pai e Filha**. O objetivo é criar um **mural/moodboard visual e interativo de animes**, onde a filha atua como curadora artística (selecionando cenas, cenários, paletas de cores e estéticas que a inspiram) e o pai atua como o engenheiro de software (estruturando a aplicação).

O site deve ser construído para rodar **100% no client-side**, pois será hospedado gratuitamente no **GitHub Pages** (sem backend, sem banco de dados tradicional).

---

## 2. Princípios de Design & Experiência do Usuário (UX)
Como o tema é "Estética e Design Anime", a interface precisa refletir a beleza das mídias visuais.
*   **Minimalismo:** Layout limpo e focado no conteúdo (as imagens devem ser as protagonistas).
*   **Fluidez:** Transições suaves de carregamento, efeitos de *fade-in* em imagens e interações sutis ao passar o mouse (hover).
*   **Responsividade:** O site deve ser impecável tanto no monitor/desktop quanto no celular (para que ela possa mostrar o projeto para os amigos).

### 2.1. Mobile em primeiro lugar
O uso principal será no celular (mostrar para os amigos), então o layout é pensado primeiro para telas pequenas e depois ampliado para o desktop:
*   Toque em vez de hover: tudo que aparece no hover precisa ter um equivalente por toque.
*   Lightbox com gesto de deslizar (swipe) para trocar de imagem e fechar.
*   Botões e áreas de toque com no mínimo 44px; nada de rolagem horizontal na página.
*   Imagens leves (WebP, carregamento preguiçoso/lazy) para abrir rápido no 4G.
*   Bom preview ao compartilhar o link (título, descrição e imagem de capa nas meta tags Open Graph).

### 2.2. Visual adolescente
O visual deve ter a cara de uma adolescente fã de anime, não de um portfólio corporativo:
*   Cores vivas ou pastéis, com gradientes, cantos bem arredondados e brilho/sombra suave.
*   Tipografia com personalidade nos títulos (ex.: fontes arredondadas do Google Fonts) e fonte legível no texto.
*   Detalhes divertidos: adesivos/emojis, pequenos brilhos ✨, animações com "pulinho" ao tocar nos cards.
*   Modo escuro como opção.
*   A direção visual exata (paleta, fontes, clima) é escolhida pela filha.

### 2.3. Estilo escolhido: Shoujo ✦
Escolha da curadora, nas palavras dela:
> "Quero o visual Shoujo no meu site, como um mangá de romance: fundo rosa-pêssego com pontinhos marrom claro, brilhos dourados e florzinhas de enfeite, bordas delicadas com contorno duplo e as imagens com um brilho branco nas bordas. Os títulos devem ter uma fonte elegante."

| Elemento | Valor |
|---|---|
| Fundo | rosa-pêssego `#FFF4F1` com retícula de pontinhos marrom claro |
| Texto | ameixa `#6B3A4E` |
| Destaque | rosa `#D4567E` |
| Brilhos | dourado `#E3B04B` (✦ piscando) |
| Bordas | contorno duplo branco + `#F2C6B4` |
| Imagens | brilho branco nas bordas (vinheta) |
| Títulos | Kaisei Decol (elegante) |
| Texto corrido | Zen Maru Gothic |

**Versão escolhida: 1. Pétalas de Sakura.** Pétalas de cerejeira (`#F7B6C8`) caem devagar pela tela, títulos em Kaisei Decol e florzinhas ✿ ✦ ❀ como enfeite. Quem pede menos movimento no celular (`prefers-reduced-motion`) não vê as pétalas.

---

## 3. Arquitetura de Conteúdo (Estrutura de Telas)

### 3.1. Home (Painel de Álbums)
A tela inicial exibe cartões visuais grandes representando os álbuns temáticos curados pela filha. Exemplos iniciais de categorias:
*   **Cenários para Relaxar e Lo-Fi:** Quartos aconchegantes sob a luz do entardecer, cafeterias em dias de chuva.
*   **Estética Studio Ghibli:** Natureza vibrante, campos de grama verde pintados à mão, nuvens volumosas.
*   **Céus de Makoto Shinkai:** Tons pastéis, gradientes de rosa, roxo e azul profundo com estrelas ou cometas.

### 3.2. Visão do Álbum (Galeria Grid)
Ao clicar em um álbum, o usuário é levado para uma galeria em estilo *Masonry* ou *Grid* responsivo com as capturas de tela daquele tema. Cada imagem conterá:
*   **Modal View:** Clique na imagem para abri-la em tela cheia (Lightboxing).
*   **Comentário da Curadora:** Um pequeno texto flutuante ou abaixo da imagem detalhando por que aquela cena é inspiradora.
*   **Extração de Paleta de Cores (Opcional/Desejado):** Exibição dos códigos hexadecimais das 4 ou 5 cores predominantes da imagem.

---

## 4. Stack Tecnológica Recomendada (Frontend Puro)
Para garantir uma estrutura moderna, escalável e de rápido deploy no GitHub Pages:
*   **Build Tool / Framework:** `Vite` + `React` (com TypeScript para tipagem limpa).
*   **Estilização:** `Tailwind CSS` (para design rápido e responsivo).
*   **Animações:** `Framer Motion` ou `Anime.js` (para garantir a suavidade na troca de telas e carregamento de cards).
*   **Bibliotecas Auxiliares:** `color-thief-react` ou `node-vibrant` (se optarem por extrair paletas de cores das imagens via código no frontend).

---

## 5. Estrutura Estatística de Dados (Sem Backend)
Como não há banco de dados, o conteúdo será alimentado por arquivos estáticos dentro do próprio repositório Git. O formato sugerido de pastas é:

```text
meu-app-anime/
├── public/
│   └── images/
│       ├── lofi/          # Imagens do álbum Lo-Fi
│       ├── ghibli/        # Imagens do álbum Ghibli
│       └── shinkai/       # Imagens do álbum Shinkai
├── src/
│   ├── data/
│   │   └── albuns.json    # Arquivo central com os textos, caminhos das fotos e metadados
│   ├── components/        # Componentes reutilizáveis (Card, Grid, Modal)
│   └── App.tsx
```

### Exemplo do arquivo `src/data/albuns.json`:
```json
[
  {
    "id": "lofi-cozy",
    "titulo": "Cenários para Relaxar e Lo-Fi",
    "descricao": "Quartos aconchegantes e vibes de fim de tarde.",
    "capa": "/images/lofi/capa.jpg",
    "itens": [
      {
        "id": "foto-1",
        "url": "/images/lofi/quarto_chuva.jpg",
        "anime": "Original Art / Chill Vibes",
        "comentario": "Adoro a iluminação da lâmpada contrastando com a chuva na janela. Traz uma sensação de paz.",
        "cores": ["#2D2343", "#E69A8B", "#4A5568", "#F7FAFC"]
      }
    ]
  }
]
```

---

## 6. Próximos Passos para a Próxima IA/Sessão
Quando este documento for submetido a uma nova IA, as instruções iniciais devem ser:
1.  **Criar o Scaffold do Projeto:** Gerar o comando de setup do Vite + React + Tailwind.
2.  **Desenvolver os Componentes Base:** Criar o layout do Painel Inicial (`Home.tsx`) e da Galeria (`Galeria.tsx`).
3.  **Refinar a Interatividade:** Adicionar as animações de abertura de imagens e transição de páginas.
4.  **Criar o fluxo de Deploy:** Configurar o GitHub Actions (`.github/workflows/deploy.yml`) para automatizar a publicação no GitHub Pages a cada commit feito pelo pai.
    *   O site fica em `https://<usuario>.github.io/<repo>/`, então o Vite precisa de `base: '/<repo>/'` e os caminhos das imagens no JSON devem ser montados com `import.meta.env.BASE_URL` (não começar com `/`).
    *   Usar rotas com hash (`HashRouter`) ou um `404.html` de fallback, para que abrir o link direto de um álbum no celular não dê erro 404.
