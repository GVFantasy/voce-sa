# Changelog — Você S.A.

## v5.0.0-fase4 — 2026-08-18

Mega atualização v5 (Fase 4 de 6): Retrospectiva do trimestre e do ano + insights automáticos.

- **Nova tela Retrospectiva** (drawer "Mais"): visão do trimestre selecionado (% geral, melhor/pior semana, sequência, KRs concluídos, comparação com o trimestre anterior, resumo financeiro e de peso quando aplicável) e visão do ano inteiro com os 4 trimestres lado a lado — nunca existiu antes (só havia heatmap de 84 dias e comparação semana-a-semana)
- **Insights automáticos**: frases curtas que cruzam dado já coletado (energia em dias de sono cumprido, dia da semana mais consistente, hábito mais forte vs. mais fraco) — só aparecem com dado suficiente, nunca forçam uma correlação fraca
- Não pede nada novo ao usuário — só lê o que já existe

## v5.0.0-fase3 — 2026-08-18

Mega atualização v5 (Fase 3 de 6): nova identidade visual + limpeza técnica.

- **Nova paleta "Fintech ousado"**: roxo mais saturado, fundo com leve tom lavanda, cantos mais arredondados, cards em bloco de cor sólida (dashboard e financeiro) — direção escolhida entre 3 mockups visuais
- Acessibilidade: card de OKR do dashboard, campos do tracker financeiro e linha de troca de plano ganham navegação por teclado/leitor de tela
- Dark mode: badges de status, alertas e avisos agora têm cor correta no tema escuro (antes ficavam claros demais)
- Consistência: ícone de sequência (🔥) trocado por SVG nos lugares que ainda usavam emoji, igual ao resto do app
- Limpeza: removidos ~15 blocos de CSS sem nenhum uso no app

## v5.0.0-fase2 — 2026-08-18

Mega atualização v5 (Fase 2 de 6): revisão mensal.

- Nova revisão mensal (banner nos últimos dias do mês, mesmo espírito da revisão semanal) — mostra o desempenho do mês por hábito e, pra quem tem Finanças ativa, o resultado financeiro já lançado
- Peso vira um campo opcional dentro desse mesmo momento (só pra quem tem Corpo ativo) — sem tracker separado, sem lembrete próprio, só uma pergunta a mais dentro de algo que já ia acontecer

## v5.0.0-fase1 — 2026-08-18

Mega atualização v5 (Fase 1 de 6): nivelando Tempo, Relações e Corpo com o resto do app.

- Conquistas novas: "10 blocos de foco" (Tempo) e "10 conexões" (Relações) — antes zero conquistas dedicadas pra esses dois pilares
- Ações do trimestre automáticas pra Corpo (2 itens) e Relações (1 item), mesmo princípio já usado em Finanças/Tempo/Mente
- Seletor de dias da semana pra hábitos de Relações, Finanças e hábitos personalizados (antes só treino/estudo tinham) — em Perfil
- Proxy mais fraco do app corrigido: "definir % do salário pra guardar" agora verifica se o primeiro mês do trimestre teve lançamento de verdade, não só se uma meta foi digitada

## v5.0.0-fase0 — 2026-08-18

Mega atualização v5 (Fase 0 de 6): saúde técnica, fundação pras próximas fases.

- **Correção**: métricas de trimestres passados na tela de OKRs (ex: KRs concluídos de um trimestre anterior na timeline) eram calculadas contra a janela de datas do trimestre **ativo**, não do trimestre exibido — números errados pra qualquer trimestre que não fosse o atual
- Fila de retry offline adicionada pra Biblioteca e inscrição de notificação push (mesmo padrão que check-ins/configurações já tinham) — inclui novo `client_id` na Biblioteca pra permitir reenvio seguro de criação de item sem risco de duplicar
- Erros de rede não tratados corrigidos (logout, push, inicialização do app) + rede de segurança global pra qualquer falha não prevista
- Erro de conexão ao contar itens concluídos na Biblioteca não zera mais o progresso — mantém o último valor conhecido
- Limpeza de código morto (imports, filtro de área legada, exposições globais não usadas) e padronização de como o app trata "nenhuma área escolhida"
- Cálculo de datas do trimestre memoizado — menos recomputação a cada toque no check-in

## v4.2.0 — 2026-08-18

Financeiro de verdade: registro diário com valor, dashboard e conquistas.

- **Registro de gastos**: o hábito diário "Registrar gastos do dia" ganha um campo de valor (R$) em vez de ser só um checkbox — mesmo mecanismo de detalhe já usado por idioma/treino, sem mudança de schema
- **Dashboard**: novo card financeiro (só pra quem tem a área ativa) — progresso da meta de economia do mês e total gasto na semana
- **Conquistas**: "10 registros de gastos" e "3 meses de meta batida seguidos"
- **Exportação**: CSV ganha coluna de gasto diário e uma segunda tabela com o histórico mensal de guardado/investido; JSON passa a incluir `gasto` por dia e `financas_mensal` (formato do JSON mudou de lista solta pra objeto com duas seções)

## v4.1.0 — 2026-08-18

Dashboard redesenhado: menos cartões, mais sensação de evolução.

- **Comparação com a semana passada**: novo cartão mostra % cumprido desta semana vs. anterior, com variação em pontos percentuais
- **Recorde pessoal**: mensagem principal avisa quando você bate ou está perto de bater seu streak recorde
- **Contraste de hábitos**: cartão de foco mostra o hábito que mais melhorou ao lado do que mais caiu (nunca só o lado negativo)
- **Ritmo do trimestre**: card de OKR e trimestre virou um só, comparando % do calendário já passado com % de KRs já concluídos ("à frente do ritmo" / "no ritmo" / "abaixo do ritmo")
- Removida a tira de 3 números soltos (streak/semana/registros) — streak passa a aparecer direto no cartão principal; registros totais já existiam no Perfil
- Limpeza de CSS/JS órfãos deixados por uma simplificação de dashboard anterior (variáveis nunca lidas, classes nunca usadas)

## v4.0.1 — 2026-08-18

- **Correção**: sequência (streak) exigia 100% dos hábitos esperados no dia desde a v3.0.0 — com vários hábitos simultâneos (idioma, treino, estudo, finanças, bloco de foco), faltar 1 único já derrubava o dia inteiro. Passa a exigir 80% dos hábitos do dia (mantendo o perdão de 1 dia/mês). A conquista "Semana perfeita" continua exigindo 100%, sem mudança.

## v4.0.0 — 2026-08-18

Mega atualização: nova auditoria completa (funcionalidades, design/visual, saúde técnica) seguida de 6 fases de entrega.

### Segurança (achado durante a Fase 0, corrigido antes de qualquer outra coisa)
- `checkins`, `user_config` e `biblioteca` estavam com RLS desativado e acesso liberado pra chave pública — qualquer requisição conseguia ler/alterar/apagar dados de qualquer usuário. RLS ativado, policies por dono criadas, acesso da chave anônima revogado.

### Saúde técnica
- Migrations retroativas: schema de `checkins`/`user_config`/`biblioteca` agora versionado no repo (só `push_subscriptions` tinha antes)
- Fila de retry offline pra configurações (`userCfg`), mesmo padrão que os check-ins já tinham
- `js/okrs.js` (maior arquivo do projeto) dividido: dados estáticos de OKRs/Ações do trimestre isolados em `js/okrs-data.js`

### Streak freeze
- 1 dia perdido por mês-calendário não quebra mais a sequência (mas também não conta como cumprido) — automático, sem UI nova

### Design e visual
- Cores soltas consolidadas em tokens existentes; ícones de navegação e ações migrados de emoji pra SVG
- Elementos das últimas rodadas ganharam suporte a teclado/leitor de tela
- Biblioteca ganhou cards individuais; página Manual saiu do estilo 100% inline

### Biblioteca
- Status de leitura (quero ler / lendo / concluído), avaliação por estrelas, ordenação por título/tipo/status
- KR e Ação do trimestre de "concluir 1 livro" fecham sozinhos com base no status real; nova conquista de leitura

### Histórico e Pomodoro
- Histórico: busca por palavra-chave nas notas + filtro por hábito
- Pomodoro: notificação do sistema ao fim de cada fase, estatísticas de horas (7/30 dias), assunto da sessão ligado aos hábitos reais

### Perfil, Onboarding e Notificações
- Exportação em JSON além de CSV
- Onboarding: idioma deixa de ser obrigatório se a área "mente" não foi escolhida; campos nunca usados removidos
- Notificações novas: conquista desbloqueada, e aviso de "sequência em risco" tarde da noite pra quem ainda não fez check-in

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
