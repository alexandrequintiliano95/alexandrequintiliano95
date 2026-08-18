# Como ativar

Este arquivo é só um guia. Ele **não** aparece no seu perfil — o GitHub mostra apenas o `README.md`.

## 1. Renomeie o repositório (obrigatório)

Hoje ele se chama `readme`. O GitHub só exibe o README no topo do perfil se o repositório tiver **exatamente o mesmo nome do usuário**.

**Settings > General > Repository name** → trocar para `alexandrequintiliano95` → **Rename**.

O repositório também precisa ser **público**.

Depois disso, atualize o remote local:

```bash
git remote set-url origin https://github.com/alexandrequintiliano95/alexandrequintiliano95.git
```

## 2. Libere a escrita para as Actions (obrigatório)

**Settings > Actions > General > Workflow permissions** → marcar **Read and write permissions** → **Save**.

Sem isso a Action falha com erro 403 na hora do push.

<details>
<summary>Por que ela precisa escrever no repositório?</summary>
<br>

README é markdown estático — o GitHub não roda código quando alguém abre seu perfil. Um `<img>` só funciona se o arquivo já existir servido por HTTP.

A Action roda numa máquina temporária: ela busca os dados, desenha os SVGs, e a máquina é destruída. Se o arquivo não for gravado em algum lugar permanente antes disso, ele evapora. O único armazenamento que ela tem é o próprio repositório.

Por isso a cobrinha e o card de estatísticas vão para a branch **`output`**, que existe só para guardar imagem gerada. A `main` nunca é tocada — seu histórico fica só com commits seus, sem commit de robô.

O `GITHUB_TOKEN` usado é gerado pelo GitHub a cada execução, vale só para este repositório e expira quando o job termina. Não é um token seu circulando por aí.

</details>

## 3. Ligue o GitHub Pages (para o jogo)

**Settings > Pages > Build and deployment**
- Source: **Deploy from a branch**
- Branch: **main** · pasta **/docs** → **Save**

O jogo fica no ar em `https://alexandrequintiliano95.github.io/alexandrequintiliano95/`, que é exatamente o link já usado no README. Leva um ou dois minutos na primeira vez.

## 4. Faça o push

```bash
git add -A && git commit -m "Novo README de perfil" && git push
```

No push a Action `readme-assets` dispara sozinha e cria a branch `output` com três arquivos: os dois SVGs da cobrinha e o card de estatísticas.

**Nos primeiros ~2 minutos, a cobrinha e o card aparecem quebrados no perfil.** É esperado: a branch `output` ainda não existe. Assim que a Action termina, os dois aparecem sozinhos, sem você fazer nada.

## 5. Confira

Depois de ~2 minutos, abra `https://github.com/alexandrequintiliano95` e verifique:

- [ ] o banner do terminal anima (digitação linha a linha)
- [ ] a cobrinha aparece comendo o gráfico de contribuições
- [ ] o card de estatísticas mostra seus números
- [ ] o clique no preview do dino abre o jogo e ele roda

Se a cobrinha ou o card não aparecerem, veja a aba **Actions** — quase sempre é o passo 2 faltando.

---

## Manutenção

Os SVGs são gerados, não editados à mão. Para mexer no texto do banner ou do neofetch, edite [`tools/build-assets.mjs`](tools/build-assets.mjs) e rode:

```bash
node tools/build-assets.mjs
```

Para rodar o jogo localmente:

```bash
node tools/serve.mjs
```

Para conferir o layout do card de estatísticas sem precisar de token (desenha com traços no lugar dos números):

```bash
node tools/build-stats.mjs --placeholder
```

O dino, os cactos e o pterodátilo vivem em [`docs/sprites.js`](docs/sprites.js), como matrizes de texto — `#` é pixel aceso. Mexer lá muda o desenho **no jogo e no README ao mesmo tempo**, porque os dois leem o mesmo arquivo. Depois de editar sprites, rode `node tools/build-assets.mjs` para regerar os SVGs.

## Projetos em destaque

Tem um bloco comentado no fim do `README.md` com cards de repositório prontos. Descomente e troque `<repo>` pelo nome de cada projeto que quiser mostrar — funciona bem com 2 ou 4.

## Se quiser o jogo em repositório separado

O link ficaria mais curto (`alexandrequintiliano95.github.io/dino-run`) e o jogo viraria mais um repositório fixado no perfil. Basta criar o repo novo, copiar a pasta `docs/` para a raiz dele, ligar o Pages e trocar os dois links no `README.md`. Como está agora já funciona — isso é opcional.
