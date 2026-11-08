# Meu Mural Anime ✦

Um mural de cenas de anime no estilo **Shoujo · Pétalas de Sakura**. Projeto de pai e filha: ela faz a curadoria, ele cuida do código (e os dois aprendem a usar IA no caminho).

A ideia completa está em [ideia.md](ideia.md).

## Como funciona

- **Site** (pasta `src/`): React + Tailwind, no estilo Shoujo.
- **Servidor** (pasta `server/`): C# / ASP.NET Core. Entrega o site, guarda os álbuns e recebe as fotos enviadas pela tela **✦ Nova cena**.
- No servidor, as cenas criadas pelo site ficam em `dados/albuns.json` e as fotos em `dados/midia/<álbum>/`. Na primeira vez, ele começa com os álbuns de exemplo de `src/data/albuns.json`.
- Contas e comentários também ficam em `dados/` (veja [Comentários](#comentários)).

## Rodar no computador

Em um terminal, o servidor (precisa do .NET 10):

```bash
npm run api
```

Em outro terminal, o site:

```bash
npm install
npm run dev
```

Abra http://localhost:5173. A senha da tela "Nova cena" no computador é `sakura-local`, definida em `server/appsettings.Development.json`.

## Postar cenas pelo site

Quem pode postar: a **curadoria** e qualquer **conta liberada** por ela.

1. No rodapé do mural, toque em **✦ Nova cena**.
2. Entre com a sua conta (ou toque em **Usar a senha da curadoria** e digite a senha; só precisa uma vez em cada celular).
3. Escolha o álbum (ou crie um novo), a foto, escreva o comentário e toque em **Criar cena ✦**.

Quem cria um álbum com a conta vira a **dona** dele: o nome e a foto dela aparecem no topo do álbum. Só a dona do álbum e a curadora podem colocar cenas nele, editar e apagar. Os álbuns criados só com a senha da curadora (e os de exemplo) não têm dona: só a curadora mexe neles.

| Quem | Criar álbum | Mexer no álbum e nas cenas | Editar comentário | Apagar comentário |
|---|---|---|---|---|
| Curadora | ✅ | ✅ todos | ❌ | ✅ todos |
| Dona do álbum | ✅ | ✅ só os dela | os dela | ✅ todos do álbum dela |
| Conta liberada | ✅ | ❌ | os dela | os dela |
| Visitante sem conta | ❌ | ❌ | ❌ | ❌ |

A foto pode vir da **📷 Câmera** ou da **🖼️ Galeria**. Depois de escolher, dá para colocar um **filtro** (Sakura, Pôr do sol, Noite, Sonho, Vívido, Vintage, Mangá). O site diminui a foto antes de enviar e descobre as cores sozinho, já com o filtro. Os filtros ficam em `src/lib/filtros.ts`: cada um é uma "receita" de números fácil de mudar.

Para mudar textos depois:
- **Álbum:** abra o álbum e toque em **✎ Editar álbum** para mudar o nome e a descrição (ou **✦ Adicionar cena**).
- **Cena:** abra a cena em tela cheia e toque em **✎ Editar texto** para mudar o anime e o comentário.

Para apagar uma cena, abra a cena em tela cheia e toque em **Apagar cena**.

## Curadoria

A curadoria libera contas, edita e apaga qualquer coisa no mural. Dá para fazer parte dela de dois jeitos:

- **Com uma conta da curadoria (o jeito normal):** a pessoa entra com o próprio e-mail e senha. Na tela **Curadoria**, quem já é da curadoria toca em **Pôr na curadoria ✦** numa conta liberada (ou **Tirar da curadoria**). Quem faz parte ganha o selo "✦ curadoria" nos comentários.
- **Com a senha da curadoria (reserva):** é o Secret `MURAL_SENHA`. Serve para colocar a primeira conta na curadoria e para emergências. Na tela Curadoria, toque em **Usar a senha da curadoria**.

Ninguém consegue tirar, recusar ou apagar a própria conta pela curadoria; outra pessoa da curadoria precisa fazer isso. Recusar uma conta tira ela da curadoria também.

**Primeira vez:** cada pessoa cria a sua conta; depois, alguém abre a Curadoria com a senha, libera as contas e toca em **Pôr na curadoria ✦** em quem deve cuidar do mural.

## Comentários

Quem visita o mural pode comentar nas cenas e responder aos comentários (respostas dentro de respostas, sem limite). Mas só depois que a curadora liberar.

1. A pessoa toca em **Entrar para comentar**, no rodapé, e cria uma conta com nome, e-mail, senha e foto de perfil.
2. A conta fica **esperando liberação**. Ainda não dá para comentar.
3. A curadoria abre **Curadoria** no rodapé e toca em **Liberar ✦** ou **Recusar**.
4. Com a conta liberada, os comentários aparecem embaixo da cena em tela cheia.

Cada pessoa pode **editar** e apagar os seus comentários (aparece "· editado" ao lado da data). A **dona do álbum** pode apagar comentários indesejados no álbum dela, e a curadora pode apagar qualquer um. Apagar um comentário apaga também as respostas a ele. Recusar ou apagar uma conta tira os comentários dela do mural.

No servidor, as contas ficam em `dados/contas.json` (a senha fica guardada só "embaralhada", nunca a senha em si), os comentários em `dados/comentarios.json` e as fotos de perfil em `dados/midia/perfis/`. O e-mail só aparece para a curadora.

## Mudar o conteúdo pelos arquivos

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

Atenção: no MonsterASP, as cenas criadas pelo site ficam no servidor (`dados/`), não neste arquivo. Mexer no `src/data/albuns.json` só muda os álbuns de exemplo usados na primeira vez e a versão do GitHub Pages.

## Publicar no MonsterASP.NET (com a tela "Nova cena")

O workflow `.github/workflows/monsterasp.yml` monta o site e o servidor e envia por FTP a cada push na `main`.

1. No painel do MonsterASP, crie o site como **My own application**.
2. No GitHub, em **Settings → Secrets and variables → Actions → Secrets**, cadastre:

   | Nome | O que é |
   |---|---|
   | `FTP_SERVIDOR` | endereço do FTP, sem `ftp://` |
   | `FTP_USUARIO` | usuário do FTP |
   | `FTP_SENHA` | senha do FTP |
   | `MURAL_SENHA` | a senha que a curadora vai digitar na tela "Nova cena" |

3. Se a pasta do site no FTP não for `/wwwroot`, crie em **Variables** a variável `FTP_PASTA` com o caminho certo.
4. Faça um push (ou rode o workflow em **Actions → Publicar no MonsterASP → Run workflow**).

A pasta `dados/` no servidor nunca é enviada nem apagada pelo workflow, então as cenas criadas pelo site não se perdem a cada atualização.

## Publicar no GitHub Pages (só leitura)

1. Crie um repositório no GitHub e envie o projeto (`git push`).
2. No repositório, vá em **Settings → Pages** e, em **Source**, escolha **GitHub Actions**.
3. Pronto: a cada `push` na branch `main`, o site é publicado sozinho em `https://<usuario>.github.io/<repositorio>/`.
