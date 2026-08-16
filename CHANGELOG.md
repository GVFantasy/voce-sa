# Changelog — Você S.A.

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
