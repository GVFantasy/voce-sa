# Changelog — Você S.A.

## v5.0.7 — 2026-08-21

Compartilhar conquista.

- Cada conquista desbloqueada ganha um botão de compartilhar — gera uma imagem no estilo do app (cor da marca, ícone, nome, badge de raro/épico) e abre o compartilhamento nativo do celular (ou salva a imagem, no desktop)

## v5.0.6 — 2026-08-21

Resumo semanal.

- Novo aviso opcional aos domingos à noite, avisando quantos dias você fez check-in na semana (e como ficou vs. a semana anterior) — em Perfil → Lembrete diário, junto do lembrete que já existia
- Continua funcionando mesmo com o app fechado (mesma infraestrutura de push do lembrete diário)

## v5.0.5 — 2026-08-21

Streak com congelamento.

- A sequência (streak) agora perdoa faltas de um jeito mais justo: a cada 10 dias cumpridos, você ganha 1 "congelamento" (até 2 acumulados), que perdoa automaticamente um dia perdido sem quebrar a sequência — antes era um perdão invisível de 1 falha por mês-calendário, sem controle nenhum do usuário
- Saldo de congelamentos aparece ao lado do streak (check-in e Dashboard), só quando há algum disponível

## v5.0.4 — 2026-08-21

Débito técnico: onboarding sai de estilo inline.

- Wizard de onboarding (5 passos) migrado de estilo inline pra classes CSS reais — mesma limpeza que o Kickoff já tinha recebido. Puramente interno, visual idêntico.
- Suíte de testes automatizados adicionada ao repositório (`npm test`), cobrindo login, check-in, criação de plano, navegação principal e dark mode — primeira vez que o projeto tem testes persistidos em vez de scripts manuais descartáveis.

## v5.0.3 — 2026-08-20

Guia inicial antes do onboarding.

- **Novo carrossel de boas-vindas** (4 telas) explicando o conceito do app antes de começar a montar o plano: o que é o Você S.A., as 5 áreas, o check-in diário, e a lógica de trimestres/retrospectiva
- Pode ser pulado a qualquer momento ("Pular", canto superior direito) — não é obrigatório pra quem já conhece o app
- Navegação por bolinhas (toque em qualquer uma pra pular direto) além do botão "Próximo"

## v5.0.2 — 2026-08-20

Mais vida no onboarding.

- Transição entre os passos ganhou uma curva com leve "mola" em vez de deslizar reto
- Cada seleção (área, prioridade, chip, dia da semana, idioma) dá um pop sutil de confirmação
- A barrinha de progresso pulsa no passo recém-concluído
- Ícone de "montando seu plano" gira enquanto o plano é gerado, e as mensagens (Analisando perfil/Definindo pilares/...) trocam com crossfade em vez de aparecer bruscamente

## v5.0.1 — 2026-08-20

Polimento pós-v5: auditoria de QA na versão em produção.

- **Gráfico de energia do Dashboard**: a seção "Energia — últimos 14 dias" existia desde a v4 mas nunca era desenhada (a função ficou pronta e sem uso) — o card aparecia sempre vazio, sem os últimos 14 dias nem o destaque de melhor dia. Corrigido: volta a renderizar normalmente.

## v5.0.0 — 2026-08-18

Mega atualização v5 (Fase 6 de 6, fechando a v5): exportação completa + onboarding.

- **Exportação** (CSV e JSON): passam a incluir Pomodoro, Biblioteca, peso e revisões mensais — antes só tinham hábitos e finanças
- **Onboarding**: pergunta o perfil financeiro (Iniciante/Em transição/Investidor) quando "Finanças" é escolhida como área, em vez de só descobrir isso depois em Perfil
- **Kickoff**: oferece ativar o lembrete diário de check-in ali mesmo, antes de começar a usar o app, em vez de só em Perfil

---

**v5.0.0 completa** — 7 fases (0 a 6): correção de bug real de trimestre, nivelamento de Tempo/Relações/Corpo, revisão mensal, nova identidade visual "Fintech ousado", Retrospectiva de trimestre/ano com insights automáticos, Financeiro em destaque na navegação, e onboarding/exportação fechando as lacunas que restavam.

## v5.0.0-fase5 — 2026-08-18

Mega atualização v5 (Fase 5 de 6): Financeiro em destaque + redesign de Biblioteca, Foco e Perfil.

- **Financeiro vira página própria**, substituindo Conquistas no menu inferior (que passa a viver no drawer "Mais") — hero em bloco de cor sólida mostrando o status da meta do mês, tracker de guardado/investido embaixo. Card do dashboard agora leva direto pra essa tela
- **Perfil reorganizado em acordeão** — 8 seções que ficavam sempre abertas (Segurança, Ajustes táticos, Finanças, Hábito personalizado, Idiomas, Lembrete, Aparência, Dados) agora começam recolhidas, reduzindo bastante o scroll. Conta e Zona de perigo continuam sempre visíveis
- Biblioteca: chips de estatística por tipo saem de estilo inline pra classes reais
- Pomodoro: histórico de sessões sai de estilo inline pra classes reais
- Tela de Kickoff (boas-vindas pós-onboarding) sai de 100% inline pra classes reais
- Botões de editar/excluir de Biblioteca, Perfil e Planos passam a reaproveitar um único componente visual em vez de repetir o mesmo estilo 5 vezes

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
