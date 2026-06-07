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
  const areas = state.userCfg.areas || ['corpo', 'mente', 'negocio', 'tempo'];
  const areaIcons = { corpo: '🏃', mente: '🧠', negocio: '💼', financas: '💰', tempo: '⏱', relacoes: '❤️' };
  const areaNames = { corpo: 'Corpo', mente: 'Mente', negocio: 'Negócio', financas: 'Finanças', tempo: 'Tempo', relacoes: 'Relações' };
  const okrMap = {
    corpo: { quarters: [{ q: 'Q1', label: 'Instalar movimento', krs: ['Treinar nos dias escolhidos consistentemente', 'Dormir 7h em 5 dias/semana', 'Tela off 30 min antes de dormir'] }, { q: 'Q2', label: 'Elevar frequência', krs: ['Adicionar mais 1 dia de treino', 'Sono 7h em 6/7 dias'] }, { q: 'Q3–Q4', label: 'Alta performance', krs: ['4+ treinos/semana', 'Participar de evento esportivo'] }] },
    mente: { quarters: [{ q: 'Q1', label: 'Hábito diário de aprendizado', krs: ['Idioma nos dias escolhidos', 'Streak de 30 dias', '1 livro por mês'] }, { q: 'Q2', label: 'Conversação básica', krs: ['Conversa simples no idioma principal', 'Segundo idioma iniciado'] }, { q: 'Q3–Q4', label: 'Fluência progressiva', krs: ['Uso do idioma no trabalho/vida', 'Terceiro idioma base'] }] },
    negocio: { quarters: [{ q: 'Q1', label: 'Diagnóstico + meta', krs: ['Mapear receita atual', 'Definir meta anual', 'Identificar 3 gargalos'] }, { q: 'Q2', label: 'Crescimento', krs: ['Aumentar ticket médio ou captação', '1 técnica nova de venda/mês'] }, { q: 'Q3–Q4', label: 'Escala', krs: ['Processos documentados', '80% da meta até setembro'] }] },
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

export function togglePillar(hdr) {
  const body = hdr.nextElementSibling; const chev = hdr.querySelector('.pillar-chev');
  body.classList.toggle('open');
  chev.style.transform = body.classList.contains('open') ? 'rotate(90deg)' : '';
}
