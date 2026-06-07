import { state, ENERGY, DLABELS } from './state.js';
import { todayKey, dateKey, fmtDate, isExpected, calcStreak, getBestStreak, getPeriodDates, getActiveQ } from './utils.js';

export function generateDashboardInsight() {
  const today = todayKey(); const streak = calcStreak(state.log);
  const dates7 = getPeriodDates('semana');
  let done7 = 0, possible7 = 0;
  dates7.forEach(date => {
    const entry = state.log.find(e => e.date === date);
    state.userHabits.forEach(h => {
      if (isExpected(h, date)) { possible7++; if (entry && entry.habits[h.id]) done7++; }
    });
  });
  const pct7 = possible7 > 0 ? Math.round(done7 / possible7 * 100) : 0;
  const aq = getActiveQ(state.userCfg.startDate);
  const ql = ['', 'Fundação', 'Aceleração', 'Escala', 'Colheita'];
  const start = new Date(state.userCfg.startDate || today);
  const qs = new Date(start); qs.setMonth(start.getMonth() + (aq - 1) * 3);
  const qe = new Date(qs); qe.setMonth(qs.getMonth() + 3);
  const trimTotal = Math.round((qe - qs) / 86400000);
  const trimPassed = Math.min(Math.round((new Date() - qs) / 86400000), trimTotal);
  const trimPct = Math.round(trimPassed / trimTotal * 100);
  let worstHabit = null, worstPct = 100;
  state.userHabits.forEach(h => {
    let hd = 0, hp = 0;
    dates7.forEach(date => {
      if (isExpected(h, date)) { hp++; const e = state.log.find(x => x.date === date); if (e && e.habits[h.id]) hd++; }
    });
    const p = hp > 0 ? Math.round(hd / hp * 100) : 0;
    if (hp > 0 && p < worstPct) { worstPct = p; worstHabit = h; }
  });
  let msg, sub, color, label;
  if (streak === 0) {
    msg = 'Hora de começar. O primeiro passo é o mais importante.';
    sub = 'Faça seu check-in de hoje e plante a semente da consistência.';
    color = 'roxo'; label = 'Vamos lá';
  } else if (streak >= 30) {
    msg = `${streak} dias consecutivos. Você está construindo algo sólido.`;
    sub = 'Esse nível de consistência já coloca você na frente de 95% das pessoas. Continue.';
    color = 'verde'; label = 'Streak impressionante';
  } else if (streak >= 7) {
    msg = `${streak} dias. A sequência está tomando forma.`;
    sub = streak < 14
      ? 'Mais uma semana assim e o hábito começa a se instalar no automático.'
      : 'Você está no ritmo. Proteja essa sequência — ela vale muito.';
    color = 'verde'; label = 'Sequência ativa';
  } else if (pct7 >= 80) {
    msg = 'Semana forte. Você está dentro da meta.';
    sub = 'Manter esse ritmo por mais 3 semanas instala o hábito no piloto automático.';
    color = 'verde'; label = 'Semana no verde';
  } else if (pct7 >= 50) {
    msg = 'Semana ok, mas dá para mais.';
    sub = worstHabit
      ? `O ${worstHabit.name.toLowerCase()} está em ${worstPct}% essa semana. Um empurrão aqui faz diferença.`
      : 'Pequenos ajustes nos próximos dias resolvem.';
    color = 'ambar'; label = 'Pode melhorar';
  } else if (state.log.length > 0) {
    msg = 'A semana foi difícil. Tudo bem.';
    sub = 'Semanas ruins acontecem. O que importa é não deixar 2 dias seguidos sem registrar. Começa agora.';
    color = 'coral'; label = 'Hora de retomar';
  } else {
    msg = 'Plano criado. Agora é hora de colocar em prática.';
    sub = 'Faça seu primeiro check-in hoje. O plano de 12 meses começa com um único dia.';
    color = 'roxo'; label = 'Pronto para começar';
  }
  return { msg, sub, color, label, streak, pct7, worstHabit, worstPct, trimPct, trimPassed, trimTotal, aq, ql };
}

export function renderDashboard() {
  const today = todayKey();
  const insight = generateDashboardInsight();
  document.getElementById('dash-hero-wrap').innerHTML = `
    <div class="dash-hero ${insight.color}">
      <div class="dash-hero-label">${insight.label}</div>
      <div class="dash-hero-msg">${insight.msg}</div>
      <div class="dash-hero-sub">${insight.sub}</div>
    </div>`;
  if (insight.worstHabit && insight.worstPct < 80) {
    document.getElementById('dash-focus-wrap').innerHTML = `
      <div class="dash-focus">
        <div class="dash-focus-label">Foco desta semana</div>
        <div class="dash-focus-text">${insight.worstHabit.icon} ${insight.worstHabit.name} — ${insight.worstPct}% concluído. Está abaixo da meta.</div>
      </div>`;
  } else {
    document.getElementById('dash-focus-wrap').innerHTML = '';
  }
  document.getElementById('dash-trim-wrap').innerHTML = `
    <div class="trim-bar-wrap">
      <div class="trim-label">
        <span>Q${insight.aq} — ${insight.ql[insight.aq]}</span>
        <span>${insight.trimPct}% do trimestre</span>
      </div>
      <div class="trim-bar-bg"><div class="trim-bar-fill" style="width:${insight.trimPct}%"></div></div>
      <div class="trim-days"><span>${insight.trimPassed} dias passados</span><span>${insight.trimTotal - insight.trimPassed} dias restantes</span></div>
    </div>`;
  const streak2 = calcStreak(state.log);
  const thisWeekQS = getPeriodDates('semana');
  let qsDone = 0, qsPoss = 0;
  thisWeekQS.forEach(date => {
    const entry = state.log.find(e => e.date === date);
    state.userHabits.forEach(h => {
      if (isExpected(h, date)) { qsPoss++; if (entry && entry.habits[h.id]) qsDone++; }
    });
  });
  const qsPct = qsPoss > 0 ? Math.round(qsDone / qsPoss * 100) : 0;
  const qsEl = document.getElementById('dash-quick-stats');
  if (qsEl) qsEl.innerHTML = `
    <div class="dqs-item"><div class="dqs-val">${streak2}d</div><div class="dqs-label">streak</div></div>
    <div class="dqs-sep"></div>
    <div class="dqs-item"><div class="dqs-val">${qsPct}%</div><div class="dqs-label">semana</div></div>
    <div class="dqs-sep"></div>
    <div class="dqs-item"><div class="dqs-val">${state.log.length}</div><div class="dqs-label">registros</div></div>`;
  const dates = getPeriodDates(state.period); let td = 0, tp = 0;
  dates.forEach(date => {
    const entry = state.log.find(e => e.date === date);
    state.userHabits.forEach(h => { if (isExpected(h, date)) { tp++; if (entry && entry.habits[h.id]) td++; } });
  });
  const pct = tp > 0 ? Math.round(td / tp * 100) : 0;
  const streak = calcStreak(state.log); const best = getBestStreak(state.log);
  const eVals = state.log.filter(e => e.energy > 0).map(e => e.energy);
  const avgE = eVals.length ? Math.round(eVals.reduce((a, b) => a + b, 0) / eVals.length * 10) / 10 : 0;
  document.getElementById('dash-stats').innerHTML = `
    <div class="stat"><div class="stat-label">Conclusão</div><div class="stat-val">${pct}%</div><div class="stat-sub">${td}/${tp} hábitos</div></div>
    <div class="stat"><div class="stat-label">Streak</div><div class="stat-val">${streak}d</div><div class="stat-sub">melhor: ${best}d</div></div>
    <div class="stat"><div class="stat-label">Registros</div><div class="stat-val">${state.log.length}</div><div class="stat-sub">de 365</div></div>
    <div class="stat"><div class="stat-label">Energia</div><div class="stat-val">${avgE > 0 ? ENERGY[Math.round(avgE)] : '—'}</div><div class="stat-sub">${avgE > 0 ? avgE.toFixed(1) + '/3' : '—'}</div></div>`;
  const hDays = []; for (let i = 83; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); hDays.push(dateKey(d)); }

  // labels de mês acima do heatmap
  const monthsEl = document.getElementById('heatmap-months');
  if (monthsEl) {
    const MNAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const cellW = 16; // 13px célula + 3px gap
    let lastMonth = -1;
    const labels = [];
    hDays.forEach((date, idx) => {
      const m = new Date(date + 'T12:00:00').getMonth();
      if (m !== lastMonth) {
        labels.push({ month: m, idx });
        lastMonth = m;
      }
    });
    monthsEl.style.position = 'relative';
    monthsEl.style.height = '16px';
    monthsEl.innerHTML = labels.map(l =>
      `<span class="hm-month-label" style="left:${l.idx * cellW}px">${MNAMES[l.month]}</span>`
    ).join('');
  }

  document.getElementById('heatmap').innerHTML = hDays.map(date => {
    const isToday = date === today;
    if (date > today) return `<div class="hm-cell hm-future${isToday ? ' hm-today' : ''}"></div>`;
    const entry = state.log.find(e => e.date === date);
    if (!entry) return `<div class="hm-cell hm-0${isToday ? ' hm-today' : ''}" title="${fmtDate(date)}"></div>`;
    const done = state.userHabits.filter(h => isExpected(h, date) && entry.habits[h.id]).length;
    const exp = state.userHabits.filter(h => isExpected(h, date)).length;
    return `<div class="hm-cell hm-${exp === 0 ? 0 : Math.ceil(done / exp * 4)}${isToday ? ' hm-today' : ''}" title="${fmtDate(date)}: ${done}/${exp}"></div>`;
  }).join('');
  const last7 = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); last7.push(dateKey(d)); }
  document.getElementById('bar-chart').innerHTML = last7.map(date => {
    const entry = state.log.find(e => e.date === date);
    const exp = state.userHabits.filter(h => isExpected(h, date)).length;
    const done = entry ? state.userHabits.filter(h => isExpected(h, date) && entry.habits[h.id]).length : 0;
    const p2 = exp > 0 ? done / exp : 0;
    const color = p2 >= 0.8 ? 'var(--verde)' : p2 >= 0.5 ? 'var(--ambar)' : 'var(--borda)';
    const dow = new Date(date + 'T12:00:00').getDay();
    return `<div class="bc-col"><div class="bc-val">${entry ? done : ''}</div><div class="bc-bar" style="height:${Math.max(done / (state.userHabits.length || 1) * 68, 2)}px;background:${color}"></div><div class="bc-label">${DLABELS[dow]}</div></div>`;
  }).join('');
  renderEnergyChart();
  const showDots = state.period === 'semana';
  document.getElementById('dash-habits').innerHTML = state.userHabits.map(h => {
    let hd = 0, hp = 0, extras = 0;
    dates.forEach(date => {
      const entry = state.log.find(e => e.date === date); const exp = isExpected(h, date);
      if (exp) { hp++; if (entry && entry.habits[h.id]) hd++; }
      else if (entry && entry.habits[h.id]) extras++;
    });
    const p2 = hp > 0 ? Math.round(hd / hp * 100) : 0;
    const color = p2 >= 80 ? 'var(--verde)' : p2 >= 50 ? 'var(--ambar)' : '#E24B4A';
    const dots = showDots ? ('<div class="week-dots">' + dates.map(date => {
      const dow = new Date(date + 'T12:00:00').getDay();
      const entry = state.log.find(e => e.date === date);
      const done = entry && entry.habits[h.id]; const isT = date === today; const exp = isExpected(h, date);
      const cls = (done && exp ? 'done ' : []) + (done && !exp ? 'extra ' : []) + (isT && !done ? 'today ' : []) + ((!exp && !done) ? 'skip' : '');
      return '<div class="wd ' + cls + '">' + DLABELS[dow] + '</div>';
    }).join('') + '</div>') : '';
    return `<div class="card" style="padding:12px 14px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div style="font-size:13px;font-weight:500">${h.icon} ${h.name}${extras > 0 ? ` <span style="font-size:10px;color:var(--ambar);font-weight:600">+${extras} extra</span>` : ''}</div>
        <div style="font-size:11px;color:var(--cinza)">${hd}/${hp} · ${p2}%</div>
      </div>
      <div class="bar-bg"><div class="bar-fill" style="width:${p2}%;background:${color}"></div></div>${dots}
    </div>`;
  }).join('');
}

export function setPeriod(p, el) {
  state.period = p;
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
  renderDashboard();
}

export function renderEnergyChart() {
  const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(dateKey(d)); }
  const colors = ['', '#E24B4A', '#BA7517', '#1D9E75'];
  const chart = document.getElementById('energy-chart');
  if (!chart) return;
  chart.innerHTML = days.map(date => {
    const entry = state.log.find(e => e.date === date);
    const e = entry ? entry.energy || 0 : 0;
    const h = e > 0 ? [0, 18, 34, 52][e] : 4;
    const dow = new Date(date + 'T12:00:00').getDay();
    return `<div class="ec-col"><div class="ec-bar" style="height:${h}px;background:${e > 0 ? colors[e] : 'var(--borda)'}"></div><div class="ec-lbl">${DLABELS[dow]}</div></div>`;
  }).join('');
  const dayScores = [0, 0, 0, 0, 0, 0, 0]; const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  state.log.forEach(e => {
    const dow = new Date(e.date + 'T12:00:00').getDay();
    const done = state.userHabits.filter(h => isExpected(h, e.date) && e.habits[h.id]).length;
    const exp = state.userHabits.filter(h => isExpected(h, e.date)).length;
    if (exp > 0) { dayScores[dow] += done / exp; dayCounts[dow]++; }
  });
  let bestDay = -1, bestScore = 0;
  dayScores.forEach((s, i) => { if (dayCounts[i] > 0) { const avg = s / dayCounts[i]; if (avg > bestScore) { bestScore = avg; bestDay = i; } } });
  const dayNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const el = document.getElementById('energy-best-day');
  if (el && bestDay >= 0 && state.log.length >= 7) el.textContent = `Melhor dia: ${dayNames[bestDay]}`;
}
