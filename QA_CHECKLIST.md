# QA Checklist — Você S.A.

Checklist de regressão manual, usada a cada fase da v3 (não há testes automatizados nem CI neste projeto). Rodar sempre com a conta de teste (`claude.test@mailinator.com`), nunca com a conta real, especialmente nos fluxos marcados como destrutivos.

Testar em: Chrome desktop + mobile emulation 375px, luz clara e escura, conta vazia (recém-criada) e conta populada. Console do DevTools sempre aberto para pegar erros JS silenciosos.

## Autenticação
- [ ] Signup com e-mail novo → onboarding inicia
- [ ] Login com conta existente → vai direto para o dashboard
- [ ] Logout → volta para tela de login, sem resíduo de dados da sessão anterior

## Onboarding
- [ ] Fluxo completo (steps 1-4) até o kickoff, com pelo menos uma área de cada tipo (corpo, mente, finanças, tempo, relações) em execuções diferentes
- [ ] "O que quer aprender" selecionado aparece no plano gerado
- [ ] Meta de 12 meses salva corretamente

## Check-in ("Hoje")
- [ ] Marcar hábito, mudar aba sem salvar, voltar → dado permanece
- [ ] Salvar check-in → F5 → dado permanece
- [ ] Simular offline, salvar → reconectar → sincroniza sem duplicar/perder
- [ ] Banner de revisão semanal (sexta-feira): preencher e salvar → reload → não reaparece
- [ ] Hábitos aparecem para todas as áreas escolhidas no onboarding (inclusive finanças/tempo/relações)

## OKRs
- [ ] Marcar/desmarcar KR persiste após reload
- [ ] Editar objetivo/KRs customizado persiste
- [ ] Tracker financeiro (se área Finanças ativa): registrar valor do mês, ver histórico dos últimos meses

## Dashboard
- [ ] Streak exibido bate com o critério esperado (todos os hábitos esperados no dia)
- [ ] Card de OKR reflete progresso real

## Histórico
- [ ] Calendário do mês exibe os dias corretos
- [ ] "Carregar mais" funciona sem duplicar entradas

## Pomodoro
- [ ] Iniciar ciclo, trocar de aba por 2 min, voltar → tempo avançou corretamente
- [ ] F5 no meio de um ciclo → retoma de onde estava

## Biblioteca
- [ ] Adicionar item → aparece na lista
- [ ] Estado vazio exibido corretamente numa conta nova

## Planos
- [ ] Criar plano novo via formulário inline
- [ ] Trocar entre planos sem perder config do plano anterior

## Perfil
- [ ] Ajustes táticos (sono, dias de treino/estudo) salvam e refletem nos hábitos
- [ ] Lembrete: ativar sem preencher horário não deixa o toggle "mentindo" que está ativo
- [ ] Alternar tema escuro/claro → persiste após reload e entre sessões
- [ ] Exportar CSV → abre corretamente, sem quebra de formatação

## Multi-sessão / multi-dispositivo
- [ ] Duas abas logadas na mesma conta, editar OKR numa e hábito na outra → sem perda silenciosa
- [ ] Logout numa conta, login com outra conta no mesmo navegador → não herda config da anterior

## PWA / Offline
- [ ] `CACHE_NAME` incrementado se `index.html`/`css/styles.css`/qualquer arquivo do `APP_SHELL` mudou
- [ ] Instalar como app (Adicionar à tela inicial) funciona
- [ ] Modo avião após visita prévia → app abre, dados já sincronizados ficam visíveis, login falha graciosamente (sem travar)
