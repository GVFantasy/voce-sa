# Changelog — Você S.A.

## v3.4.0 — 2026-08-17

Simplificação das telas de Check-in e OKRs, depois de 3 rodadas seguidas adicionando automação.

- Check-in fica só sobre o dia: o card de OKR virou um indicador compacto de 1 linha (toque leva pra tela de OKRs)
- Checklist "Ações do trimestre" saiu do Check-in e passou a viver dentro do card de cada trimestre na tela de OKRs
- Pilares da tela de OKRs colapsam por padrão (só nome + progresso); só o mais atrasado começa aberto

## v3.3.0 — 2026-08-17

Mais automação: Ações do trimestre, Pomodoro e gestão de planos.

- 6 dos 24 itens do checklist "Ações do trimestre" passam a fechar sozinhos (streak de estudo, revisão semanal salva, sessões de Pomodoro, registro de gastos, meta financeira, lançamento do mês)
- Pomodoro pré-seleciona o último assunto usado
- Modal "Seus planos" mostra a atividade de cada plano (hoje / dias atrás / sem check-ins)

## v3.2.0 — 2026-08-17

Metas trimestrais como consequência do check-in diário.

- Motor de KRs automáticos: a maioria dos Key Results de cada trimestre fecha sozinha, calculada a partir do check-in (% de dias cumpridos, sequência, frequência semanal, consistência financeira) em vez de checkbox manual
- Check-in mostra o impacto no OKR em tempo real ao marcar um hábito
- Correção de um bug de fuso horário em `getPeriodDates('trimestre')` que podia excluir o dia de hoje do cálculo do trimestre

## v3.1.0 — 2026-08-17

App mais inteligente: reaproveita dado que o check-in já coleta em vez de pedir mais input.

- Hábitos com detalhe (idioma, treino) pré-selecionam a última escolha
- Card de OKR em destaque passa a escolher a área mais atrasada, não sempre a primeira da lista
- Revisão semanal deixa de ser write-only e realimenta a mensagem do dashboard
- Onboarding usa de verdade as respostas de "situação atual" e "prioridade em 12 meses"

## v3.0.1 — 2026-08-16

- **Correção crítica**: SDK do Supabase vendorizado localmente — uma falha/lentidão na CDN externa (jsdelivr) travava o app inteiro (nenhum botão funcionava), incluindo o fluxo de criação de conta

## v3.0.0 — 2026-08-16

Mega atualização: correção de bugs críticos de dados, novo design system, redesign visual, PWA/responsividade e um conjunto grande de features novas.

### Correções críticas
- Check-in não se apagava mais silenciosamente ao trocar de aba sem salvar (rascunho agora persiste)
- Revisão semanal, que nunca era salva, agora persiste corretamente
- Pomodoro não perdia mais o progresso ao recarregar a página
- Hábitos de Finanças/Tempo/Relações, que nunca eram gerados para quem escolhia essas áreas no onboarding, agora aparecem
- Conquista "Semana perfeita" recalculada com o critério correto (todos os hábitos esperados no dia)
- Dark mode agora sincroniza entre dispositivos
- Logout limpa dados locais (importante em dispositivo compartilhado)

### Design e visual
- Sistema de cores, tipografia e espaçamento consolidado (menos duplicação, mais consistência entre telas)
- Botões e cards unificados num único padrão visual
- Acessibilidade: navegação por teclado, área de toque adequada, contraste revisado
- Dashboard, Check-in e OKRs redesenhados com hierarquia mais clara
- Estados de carregamento (skeleton) nos pontos onde a tela "piscava" vazia

### PWA e mobile
- Ícones em todos os tamanhos exigidos, atalhos de app (Check-in, Pomodoro)
- Layout adaptado para tablet/desktop
- Cache do app funcionando melhor offline (incluindo dependências externas)

### Novidades
- **Biblioteca**: editar, excluir e buscar itens
- **Histórico**: navegação por meses anteriores no calendário
- **Planos**: excluir e renomear
- **Hábito personalizado**: criar hábitos próprios, com ícone e dias da semana
- **Conta**: trocar email/senha, recuperar senha esquecida, exportação CSV mais segura (protegida contra injeção de fórmula)
- **Exclusão de conta**: apaga permanentemente conta e dados, com confirmação explícita
- **Pomodoro**: duração configurável (15/25/45/60min), pausa longa após 4 ciclos, histórico de sessões, som ao final de cada fase
- **Conquistas**: celebração visual ao desbloquear uma nova conquista, nova conquista ligada ao Pomodoro
- **Notificações push reais**: lembrete de check-in chega mesmo com o app fechado (além do lembrete local já existente)
