// Conteúdo estático dos OKRs e das Ações do trimestre — separado de js/okrs.js (que ficou com
// mais de 700 linhas misturando dado, regra de negócio e renderização) pra manter esse conteúdo
// isolado da lógica que o consome. Nenhuma mudança de comportamento nesta separação.

// KRs sao objetos { id, text, auto? }. Quando "auto" existe, o progresso e calculado a partir
// do check-in/dados ja coletados (ver evalAutoKR em okrs.js) em vez de checkbox manual. So ficam
// sem "auto" os KRs que genuinamente nao tem proxy honesto nos dados do app (ex: "concluir um
// livro" - a Biblioteca so registra "adicionado", nao "lido"). Custom KRs editados pelo usuario
// (okrCustom) continuam strings simples e sao sempre manuais - ver normalizeKR() em okrs.js.
export const defaultOKR = {
  corpo: [
    { q: 1, label: 'Instalar movimento', krs: [
      { id: 'treino_pct', text: 'Treinar nos dias escolhidos (≥80% do trimestre)', auto: { type: 'habitPct', habit: 'treino', min: 0.8 } },
      { id: 'sono_pct', text: 'Dormir bem em pelo menos 5 dias por semana', auto: { type: 'habitPct', habit: 'sono', min: 0.7 } },
    ] },
    { q: 2, label: 'Elevar frequência', krs: [
      { id: 'treino_freq4', text: 'Treinar 4+ vezes por semana em média', auto: { type: 'weeklyFreq', habit: 'treino', min: 4 } },
      { id: 'sono_pct85', text: 'Dormir bem em pelo menos 6 dias por semana', auto: { type: 'habitPct', habit: 'sono', min: 0.857 } },
    ] },
    { q: 3, label: 'Alta performance', krs: [
      { id: 'treino_freq4', text: 'Manter 4+ treinos por semana', auto: { type: 'weeklyFreq', habit: 'treino', min: 4 } },
      { id: 'streak21', text: 'Sequência de 21+ dias cumprindo os hábitos do trimestre', auto: { type: 'overallStreak', min: 21 } },
    ] },
    { q: 4, label: 'Alta performance — manter', krs: [
      { id: 'treino_freq4', text: 'Manter 4+ treinos por semana', auto: { type: 'weeklyFreq', habit: 'treino', min: 4 } },
      { id: 'overall_pct80', text: 'Fechar o trimestre com 80%+ de consistência geral', auto: { type: 'overallPct', min: 0.8 } },
    ] },
  ],
  mente: [
    { q: 1, label: 'Hábito diário de aprendizado', krs: [
      { id: 'estudo_pct', text: 'Estudar nos dias escolhidos (≥80% do trimestre)', auto: { type: 'habitPct', habit: 'estudo', min: 0.8 } },
      { id: 'estudo_streak14', text: 'Sequência de 14+ dias estudando', auto: { type: 'habitStreak', habit: 'estudo', min: 14 } },
      { id: null, text: 'Concluir 1 livro ou curso no trimestre' },
    ] },
    { q: 2, label: 'Conversação básica', krs: [
      { id: 'estudo_pct85', text: 'Estudar nos dias escolhidos (≥85% do trimestre)', auto: { type: 'habitPct', habit: 'estudo', min: 0.85 } },
      { id: 'estudo_streak21', text: 'Sequência de 21+ dias estudando', auto: { type: 'habitStreak', habit: 'estudo', min: 21 } },
    ] },
    { q: 3, label: 'Fluência progressiva', krs: [
      { id: 'estudo_pct90', text: 'Estudar nos dias escolhidos (≥90% do trimestre)', auto: { type: 'habitPct', habit: 'estudo', min: 0.9 } },
      { id: 'estudo_streak30', text: 'Sequência de 30+ dias estudando', auto: { type: 'habitStreak', habit: 'estudo', min: 30 } },
    ] },
    { q: 4, label: 'Fluência consolidada', krs: [
      { id: 'estudo_pct90', text: 'Manter o estudo nos dias escolhidos (≥90% do trimestre)', auto: { type: 'habitPct', habit: 'estudo', min: 0.9 } },
      { id: 'overall_pct80', text: 'Fechar o trimestre com 80%+ de consistência geral', auto: { type: 'overallPct', min: 0.8 } },
    ] },
  ],
  tempo: [
    { q: 1, label: 'Estruturar semana', krs: [
      { id: 'tempo_pct', text: 'Cumprir o bloco de foco nos dias esperados (≥80% do trimestre)', auto: { type: 'habitPct', habit: 'tempo', min: 0.8 } },
      { id: 'tempo_streak14', text: 'Sequência de 14+ dias cumprindo o bloco de foco', auto: { type: 'habitStreak', habit: 'tempo', min: 14 } },
    ] },
    { q: 2, label: 'Proteção do tempo', krs: [
      { id: 'tempo_pct85', text: 'Cumprir o bloco de foco nos dias esperados (≥85% do trimestre)', auto: { type: 'habitPct', habit: 'tempo', min: 0.85 } },
      { id: 'tempo_streak21', text: 'Sequência de 21+ dias cumprindo o bloco de foco', auto: { type: 'habitStreak', habit: 'tempo', min: 21 } },
    ] },
    { q: 3, label: 'Eficiência avançada', krs: [
      { id: 'tempo_pct90', text: 'Cumprir o bloco de foco nos dias esperados (≥90% do trimestre)', auto: { type: 'habitPct', habit: 'tempo', min: 0.9 } },
      { id: 'streak21', text: 'Sequência de 21+ dias cumprindo os hábitos do trimestre', auto: { type: 'overallStreak', min: 21 } },
    ] },
    { q: 4, label: 'Legado do tempo', krs: [
      { id: 'tempo_pct90', text: 'Manter o bloco de foco nos dias esperados (≥90% do trimestre)', auto: { type: 'habitPct', habit: 'tempo', min: 0.9 } },
      { id: 'overall_pct80', text: 'Fechar o trimestre com 80%+ de consistência geral', auto: { type: 'overallPct', min: 0.8 } },
    ] },
  ],
  relacoes: [
    { q: 1, label: 'Presença e qualidade', krs: [
      { id: 'relacoes_freq1', text: 'Conexão intencional pelo menos 1x por semana', auto: { type: 'weeklyFreq', habit: 'relacoes', min: 1 } },
      { id: 'relacoes_pct', text: 'Manter o hábito nos dias esperados (≥80% do trimestre)', auto: { type: 'habitPct', habit: 'relacoes', min: 0.8 } },
    ] },
    { q: 2, label: 'Aprofundamento', krs: [
      { id: 'relacoes_freq2', text: 'Conexão intencional pelo menos 2x por semana', auto: { type: 'weeklyFreq', habit: 'relacoes', min: 2 } },
    ] },
    { q: 3, label: 'Comunidade', krs: [
      { id: 'relacoes_freq3', text: 'Conexão intencional pelo menos 3x por semana', auto: { type: 'weeklyFreq', habit: 'relacoes', min: 3 } },
    ] },
    { q: 4, label: 'Celebrar e renovar', krs: [
      { id: 'relacoes_freq3b', text: 'Manter conexão intencional 3x+ por semana', auto: { type: 'weeklyFreq', habit: 'relacoes', min: 3 } },
      { id: 'overall_pct80', text: 'Fechar o trimestre com 80%+ de consistência geral', auto: { type: 'overallPct', min: 0.8 } },
    ] },
  ],
};

export const finOKR = {
  iniciante: [
    { q: 1, label: 'Instalar controle financeiro', krs: [
      { id: 'fin_pct', text: 'Registrar os gastos do dia (≥70% do trimestre)', auto: { type: 'habitPct', habit: 'financas', min: 0.7 } },
      { id: null, text: 'Abrir conta de investimento gratuita' },
    ] },
    { q: 2, label: 'Hábito de poupar', krs: [
      { id: 'fin_pct85', text: 'Registrar os gastos do dia (≥85% do trimestre)', auto: { type: 'habitPct', habit: 'financas', min: 0.85 } },
      { id: 'fin_consist', text: 'Guardar ou investir algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
    ] },
    { q: 3, label: 'Primeiros investimentos', krs: [
      { id: 'fin_consist', text: 'Guardar ou investir algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
      { id: 'fin_growth', text: 'Aumentar o valor guardado/investido no trimestre', auto: { type: 'finLogGrowth' } },
    ] },
    { q: 4, label: 'Avaliar e crescer', krs: [
      { id: 'fin_consist', text: 'Manter guardado/investido em todos os meses', auto: { type: 'finLogConsistency' } },
      { id: 'fin_growth', text: 'Fechar o trimestre com aumento no valor guardado/investido', auto: { type: 'finLogGrowth' } },
    ] },
  ],
  transicao: [
    { q: 1, label: 'Organizar e automatizar', krs: [
      { id: 'fin_pct', text: 'Registrar os gastos do dia (≥70% do trimestre)', auto: { type: 'habitPct', habit: 'financas', min: 0.7 } },
      { id: 'fin_consist', text: 'Aportar algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
    ] },
    { q: 2, label: 'Diversificar carteira', krs: [
      { id: 'fin_consist', text: 'Aportar algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
      { id: null, text: 'Estudar tributação de cada tipo de investimento' },
    ] },
    { q: 3, label: 'Crescer patrimônio', krs: [
      { id: 'fin_growth', text: 'Aumentar o valor investido no trimestre', auto: { type: 'finLogGrowth' } },
      { id: 'fin_consist', text: 'Aportar algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
    ] },
    { q: 4, label: 'Otimizar e planejar', krs: [
      { id: 'fin_growth', text: 'Fechar o trimestre com aumento no valor investido', auto: { type: 'finLogGrowth' } },
      { id: 'fin_consist', text: 'Manter aportes em todos os meses', auto: { type: 'finLogConsistency' } },
    ] },
  ],
  investidor: [
    { q: 1, label: 'Revisar estratégia', krs: [
      { id: 'fin_consist', text: 'Aportar algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
      { id: null, text: 'Revisar tese de cada posição ativa' },
    ] },
    { q: 2, label: 'Escalar aportes', krs: [
      { id: 'fin_growth', text: 'Aumentar o aporte vs. o início do trimestre', auto: { type: 'finLogGrowth' } },
      { id: 'fin_consist', text: 'Aportar algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
    ] },
    { q: 3, label: 'Renda passiva', krs: [
      { id: 'fin_growth', text: 'Aumentar o aporte vs. o início do trimestre', auto: { type: 'finLogGrowth' } },
      { id: 'fin_consist', text: 'Aportar algo em todos os meses do trimestre', auto: { type: 'finLogConsistency' } },
    ] },
    { q: 4, label: 'Planejar próximo nível', krs: [
      { id: 'fin_growth', text: 'Fechar o trimestre com aumento no aporte', auto: { type: 'finLogGrowth' } },
      { id: 'fin_consist', text: 'Manter aportes em todos os meses', auto: { type: 'finLogConsistency' } },
    ] },
  ],
};

export const finDicas = {
  iniciante: 'Comece guardando qualquer valor. O hábito de poupar importa mais que o montante inicial.',
  transicao: 'Automatize: configure transferência automática para investimento no dia que cai o salário.',
  investidor: 'Revise sua alocação trimestralmente e compare o retorno real com benchmarks (CDI, IBOV).',
};

export const QUARTERLY_TASKS = {
  corpo: {
    1: [
      { id: 'corpo_q1_a', text: 'Definir horário fixo de treino na semana', hint: 'Trate como compromisso — bloqueie na agenda' },
      { id: 'corpo_q1_b', text: 'Remover telas 30 min antes de dormir', hint: 'Configure modo foco automático no celular' },
      { id: 'corpo_q1_c', text: 'Preparar roupa e material de treino na véspera', hint: 'Remove a fricção do dia seguinte' },
    ],
    2: [
      { id: 'corpo_q2_a', text: 'Medir evolução: fotos, medidas ou performance', hint: 'Compare com o início do plano' },
      { id: 'corpo_q2_b', text: 'Adicionar mais 1 dia de treino à semana', hint: 'Se já está no ritmo, hora de elevar' },
    ],
    3: [
      { id: 'corpo_q3_a', text: 'Participar de evento esportivo ou desafio', hint: 'Corrida, campeonato, desafio de 30 dias' },
      { id: 'corpo_q3_b', text: 'Revisar protocolo de recuperação', hint: 'Sono, hidratação, alimentação — o básico sustenta o avanço' },
    ],
    4: [
      { id: 'corpo_q4_a', text: 'Registrar evolução física do ano', hint: 'Compare hoje com o início — a diferença vai te surpreender' },
    ],
  },
  mente: {
    1: [
      { id: 'mente_q1_a', text: 'Configurar app de idioma com meta diária', hint: 'Duolingo, Anki, ou similar — 10 min já conta' },
      { id: 'mente_q1_b', text: 'Escolher e comprar o próximo livro', hint: 'Tenha sempre um na fila' },
      { id: 'mente_q1_c', text: 'Alcançar 30 dias seguidos de estudo', hint: 'O streak importa mais que a duração' },
    ],
    2: [
      { id: 'mente_q2_a', text: 'Ter uma conversa básica no idioma escolhido', hint: 'App, sala de prática ou com nativo' },
      { id: 'mente_q2_b', text: 'Consumir 30 min de conteúdo no idioma sem parar', hint: 'Série, podcast ou livro' },
    ],
    3: [
      { id: 'mente_q3_a', text: 'Usar o idioma em situação real', hint: 'Email, reunião, viagem ou trabalho' },
    ],
    4: [
      { id: 'mente_q4_a', text: 'Avaliar evolução no idioma — o que mudou?', hint: 'Reflita e ajuste para o próximo ano' },
    ],
  },
  financas: {
    1: [
      { id: 'fin_q1_a', text: 'Mapear todas as despesas do mês atual', hint: 'Planilha, Notion ou app de finanças — qualquer um' },
      { id: 'fin_q1_b', text: 'Definir % fixo do salário para guardar', hint: 'Comece com 10% — o hábito importa mais que o valor' },
      { id: 'fin_q1_c', text: 'Abrir conta de investimento se ainda não tem', hint: 'Nubank, XP, NuInvest, Rico — todos gratuitos' },
    ],
    2: [
      { id: 'fin_q2_a', text: 'Cortar ou renegociar 1 gasto desnecessário', hint: 'Assinatura esquecida? Serviço que não usa?' },
      { id: 'fin_q2_b', text: 'Estudar um produto financeiro novo', hint: 'CDB, Tesouro, FII ou ações — entender o que é' },
    ],
    3: [
      { id: 'fin_q3_a', text: 'Calcular patrimônio acumulado até agora', hint: 'Saldo + investimentos + ativos' },
    ],
    4: [
      { id: 'fin_q4_a', text: 'Balanço financeiro do ano — meta atingida?', hint: 'Compare com janeiro e planeje o próximo ano' },
    ],
  },
  tempo: {
    1: [
      { id: 'tempo_q1_a', text: 'Criar blocos fixos de foco na agenda', hint: 'Mínimo: 90 min de deep work pela manhã' },
      { id: 'tempo_q1_b', text: 'Agendar revisão semanal toda sexta', hint: '30 min para planejar a semana seguinte' },
      { id: 'tempo_q1_c', text: 'Eliminar 1 atividade que não gera retorno', hint: 'O que você faz por hábito sem resultado real?' },
    ],
    2: [
      { id: 'tempo_q2_a', text: 'Experimentar a técnica Pomodoro por 2 semanas', hint: 'Use o timer do app — 25 min foco, 5 min pausa' },
      { id: 'tempo_q2_b', text: 'Delegar ou terceirizar 1 tarefa operacional', hint: 'Seu tempo é para o que só você pode fazer' },
    ],
    3: [
      { id: 'tempo_q3_a', text: 'Tirar 3–5 dias de férias reais sem trabalho', hint: 'Descanso intencional é produtividade a longo prazo' },
    ],
    4: [
      { id: 'tempo_q4_a', text: 'Auditar onde foi o seu tempo este ano', hint: 'O que ganhou espaço? O que você abre mão para o próximo?' },
    ],
  },
  relacoes: {
    1: [
      { id: 'rel_q1_a', text: 'Listar 3 pessoas que quer cultivar este trimestre', hint: 'Família, amigos próximos, mentores' },
      { id: 'rel_q1_b', text: 'Agendar 1 encontro com cada uma delas', hint: 'Uma data marcada vale mais que boa intenção' },
      { id: 'rel_q1_c', text: 'Reduzir scroll passivo em redes sociais em 30%', hint: 'Mais presença real, menos consumo automático' },
    ],
    2: [
      { id: 'rel_q2_a', text: 'Entrar em grupo ou comunidade com propósito', hint: 'Esporte, estudo, trabalho voluntário' },
      { id: 'rel_q2_b', text: 'Ter 1 conversa difícil que está adiando', hint: 'Resolver o que está travado libera energia' },
    ],
    3: [
      { id: 'rel_q3_a', text: 'Retomar contato com alguém que se distanciou', hint: 'Uma mensagem simples já muda o suficiente' },
    ],
    4: [
      { id: 'rel_q4_a', text: 'Celebrar o ano com as pessoas certas', hint: 'Compartilhe sua evolução com quem importa' },
    ],
  },
};
