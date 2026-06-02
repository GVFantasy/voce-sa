# Voce S.A.

Aplicativo web de desenvolvimento pessoal com check-in diario, dashboard, OKRs, biblioteca, pomodoro, perfil e sincronizacao via Supabase.

## Estrutura

- `index.html`: estrutura da interface.
- `css/styles.css`: estilos visuais do app.
- `js/app.js`: regra principal do produto.
- `js/pwa.js`: registro e atualizacao do PWA.
- `service-worker.js`: cache offline basico.
- `manifest.json`: configuracao de instalacao do PWA.
- `icons/`: icones usados na instalacao.
- `offline.html`: tela exibida quando o app abre sem conexao.

## Publicacao

O projeto e estatico e funciona no GitHub Pages. Nao precisa de build.

## Cuidados

- Nao alterar a URL ou a chave publica do Supabase sem conferir o projeto no painel.
- Nao mudar nomes de tabelas sem ajustar o codigo e o banco juntos.
- Depois de mexer no PWA, atualize `CACHE_NAME` em `service-worker.js` para forcar o navegador a baixar a nova versao.
