import { state } from './state.js';
import { getActiveQ } from './utils.js';

export function renderOKRs() {
  const aq = getActiveQ(state.userCfg.startDate);
  const ql = ['', 'Fundação', 'Aceleração', 'Escala', 'Colheita'];
  const colors = [, 'var(--info-bg)', 'var(--suc-bg)', 'var(--warn-bg)', 'var(--dan-bg)'];
  const txts = [, 'var(--info-txt)', 'var(--suc-txt)', 'var(--warn-txt)', 'var(--dan-txt)'];
  const qc = ['', 'q1b', 'q2b', 'q3b', 'q4b'];
  document.getElementById('q-badge').innerHTML = `<div class="q-badge-active" style="background:${colors[aq]};color:${txts[aq]}">Q${aq} — ${ql[aq]} · trimestre ativo</div>`;
  if (state.userCfg.meta) document.getElementById('user-mission').textContent = '"' + state.userCfg.meta + '"';
  const areas = (state.userCfg.areas || ['corpo', 'mente']).filter(a => a !== 'negocio');
  const areaIcons = { corpo: '🏃', mente: '🧠', financas: '💰', tempo: '⏱', relacoes: '❤️' };
  const areaNames = { corpo: 'Corpo', mente: 'Mente', financas: 'Finanças', tempo: 'Tempo', relacoes: 'Relações' };
  const okrMap = {
    corpo: { quarters: [{ q: 'Q1', label: 'Instalar movimento', krs: ['Treinar nos dias escolhidos consistentemente', 'Dormir 7h em 5 dias/semana', 'Tela off 30 min antes de dormir'] }, { q: 'Q2', label: 'Elevar frequência', krs: ['Adicionar mais 1 dia de treino', 'Sono 7h em 6/7 dias'] }, { q: 'Q3–Q4', label: 'Alta performance', krs: ['4+ treinos/semana', 'Participar de evento esportivo'] }] },
    mente: { quarters: [{ q: 'Q1', label: 'Hábito diário de aprendizado', krs: ['Idioma nos dias escolhidos', 'Streak de 30 dias', '1 livro por mês'] }, { q: 'Q2', label: 'Conversação básica', krs: ['Conversa simples no idioma principal', 'Segundo idioma iniciado'] }, { q: 'Q3–Q4', label: 'Fluência progressiva', krs: ['Uso do idioma no trabalho/vida', 'Terceiro idioma base'] }] },
    financas: { quarters: [{ q: 'Q1', label: 'Controle e diagnóstico', krs: ['Mapear todas as despesas', 'Criar fundo de emergência'] }, { q: 'Q2', label: 'Investimento', krs: ['Investir % fixo todo mês', 'Estudar produto financeiro'] }, { q: 'Q3–Q4', label: 'Crescimento patrimonial', krs: ['Meta de patrimônio atingida', 'Renda passiva iniciada'] }] },
    tempo: { quarters: [{ q: 'Q1', label: 'Estruturar semana', krs: ['Blocos fixos na agenda', 'Revisão toda sexta', 'Eliminar 1 atividade improdutiva'] }, { q: 'Q2', label: 'Proteção do tempo', krs: ['Deep work diário de 90 min', 'Delegar 1 tarefa operacional'] }, { q: 'Q3–Q4', label: 'Piloto automático', krs: ['Hábitos sem força de vontade', 'Férias de 3–5 dias'] }] },
    relacoes: { quarters: [{ q: 'Q1', label: 'Presença e qualidade', krs: ['1 encontro intencional/semana', 'Reduzir tempo de tela social'] }, { q: 'Q2', label: 'Aprofundamento', krs: ['Cultivar 3 relações importantes', 'Novas conexões profissionais'] }, { q: 'Q3–Q4', label: 'Comunidade', krs: ['Grupo com propósito', 'Relacionamentos que energizam'] }] },
  };
  document.getElementById('pillar-list').innerHTML = areas.map(area => {
    const okr = okrMap[area]; if (!okr) return '';
    return `<div class="pillar-card">
      <div class="pillar-header" onclick="togglePillar(this)"><div class="pillar-title">${areaIcons[area] || '⭐'} ${areaNames[area] || area}</div><div class="pillar-chev">›</div></div>
      <div class="pillar-body">${okr.quarters.map(qo => {
        const qn = parseInt(qo.q); const isA = qn === aq || (qo.q.includes('–') && aq >= 3);
        return `<div class="okr-q ${isA ? 'aq' : ''}"><div class="okr-q-lbl">${qo.q}${isA ? ' ← você está aqui' : ''}</div><div class="okr-q-title"><span class="qbadge ${qc[qn] || 'q3b'}">${qo.q}</span> ${qo.label}</div>${qo.krs.map(kr => `<div class="kr">${kr}</div>`).join('')}</div>`;
      }).join('')}</div>
    </div>`;
  }).join('');
}

  // Notificação de hábitos ausentes nos OKRs
  const habitIds = new Set(state.userHabits.map(h => h.id));
  const missing = [];
  if (areas.includes('corpo') && !habitIds.has('treino'))
    missing.push('🏋️ <b>Treino</b> — importante para seus OKRs de Corpo');
  if (areas.includes('mente') && !habitIds.has('estudo'))
    missing.push('📚 <b>Estudo</b> — importante para seus OKRs de Mente');
  const notifEl = document.getElementById('okr-habit-notif');
  if (notifEl) {
    notifEl.innerHTML = missing.length
      ? `<div class="alert alert-warn" style="margin-bottom:12px"><strong>Hábitos não ativos:</strong><br>${missing.join('<br>')}<br><span style="font-size:11px;opacity:.75">Ative em Perfil → Ajustes táticos ou refaça o onboarding.</span></div>`
      : '';
  }
}

export function togglePillar(hdr) {
  const body = hdr.nextElementSibling; const chev = hdr.querySelector('.pillar-chev');
  body.classList.toggle('open');
  chev.style.transform = body.classList.contains('open') ? 'rotate(90deg)' : '';
}

export function getActiveObjective() {
  if (!state.userCfg.startDate) return null;
  const aq = getActiveQ(state.userCfg.startDate);
  const areas = (state.userCfg.areas || []).filter(a => a !== 'negocio');
  const primaryArea = areas[0];
  if (!primaryArea) return null;
  const areaNames = { corpo: 'Corpo', mente: 'Mente', financas: 'Finanças', tempo: 'Tempo', relacoes: 'Relações' };
  const okrMap = {
    corpo: [{ q: 1, label: 'Instalar movimento', krs: ['Treinar nos dias escolhidos', 'Dormir 7h em 5 dias/semana'] }, { q: 2, label: 'Elevar frequência', krs: ['Adicionar mais 1 dia de treino', 'Sono 7h em 6/7 dias'] }, { q: 3, label: 'Alta performance', krs: ['4+ treinos/semana', 'Participar de evento esportivo'] }, { q: 4, label: 'Alta performance', krs: ['4+ treinos/semana', 'Participar de evento esportivo'] }],
    mente: [{ q: 1, label: 'Hábito diário de aprendizado', krs: ['Idioma nos dias escolhidos', 'Streak de 30 dias'] }, { q: 2, label: 'Conversação básica', krs: ['Conversa simples no idioma principal', 'Segundo idioma iniciado'] }, { q: 3, label: 'Fluência progressiva', krs: ['Uso do idioma no trabalho/vida'] }, { q: 4, label: 'Fluência progressiva', krs: ['Uso do idioma no trabalho/vida'] }],
    financas: [{ q: 1, label: 'Controle e diagnóstico', krs: ['Mapear todas as despesas', 'Criar fundo de emergência'] }, { q: 2, label: 'Investimento', krs: ['Investir % fixo todo mês'] }, { q: 3, label: 'Crescimento patrimonial', krs: ['Meta de patrimônio atingida'] }, { q: 4, label: 'Crescimento patrimonial', krs: ['Meta de patrimônio atingida'] }],
    tempo: [{ q: 1, label: 'Estruturar semana', krs: ['Blocos fixos na agenda', 'Revisão toda sexta'] }, { q: 2, label: 'Proteção do tempo', krs: ['Deep work diário de 90 min'] }, { q: 3, label: 'Piloto automático', krs: ['Hábitos sem força de vontade'] }, { q: 4, label: 'Piloto automático', krs: ['Hábitos sem força de vontade'] }],
    relacoes: [{ q: 1, label: 'Presença e qualidade', krs: ['1 encontro intencional/semana'] }, { q: 2, label: 'Aprofundamento', krs: ['Cultivar 3 relações importantes'] }, { q: 3, label: 'Comunidade', krs: ['Grupo com propósito'] }, { q: 4, label: 'Comunidade', krs: ['Grupo com propósito'] }],
  };
  const map = okrMap[primaryArea];
  if (!map) return null;
  const qData = map.find(x => x.q === aq) || map[map.length - 1];
  return { aq, area: primaryArea, areaName: areaNames[primaryArea] || primaryArea, label: qData.label, krs: qData.krs };
}
