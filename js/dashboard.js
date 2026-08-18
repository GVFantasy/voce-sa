import { state, DLABELS, META_LABELS, SITUATION_START_HINTS } from './state.js';
import { todayKey, dateKey, fmtDate, isExpected, calcStreak, getBestStreak, getPeriodDates, getActiveQ, sanitize, sumGastosInPeriod } from './utils.js';

// % cumprido de cada habito num intervalo de datas, individual e agregado - usado pra comparar
// a semana atual com a anterior (generateDashboardInsight) sem duplicar o loop duas vezes.
function habitStatsForDates(dates, logMap) {
  let done = 0, possible = 0;
  const perHabit = {};
  dates.forEach(date => {
    const entry = logMap[date];
    state.userHabits.forEach(h => {
      if (isExpected(h, date)) {
        possible++;
        const hs = perHabit[h.id] || (perHabit[h.id] = { done: 0, possible: 0 });
        hs.possible++;
        if (entry && entry.habits[h.id]) { done++; hs.done++; }
      }
    });
  });
  return { pct: possible > 0 ? Math.round(done / possible * 100) : 0, possible, perHabit };
}

export function generateDashboardInsight() {
  const today = todayKey(); const streak = calcStreak(state.log);
  const logMap = Object.fromEntries(state.log.map(e => [e.date, e]));
  const dates7 = getPeriodDates('semana');
  const prevDates7 = dates7.map(dt => { const d = new Date(dt + 'T12:00:00'); d.setDate(d.getDate() - 7); return dateKey(d); });
  const cur7 = habitStatsForDates(dates7, logMap);
  const prev7 = habitStatsForDates(prevDates7, logMap);
  const pct7 = cur7.pct;
  // só compara com a semana anterior se ela existe de fato dentro da vida da conta - senão uma
  // conta nova mostraria uma "queda de 100%" enganosa por não ter nada pra comparar ainda.
  const hasPrevWeek = prev7.possible > 0 && prevDates7[0] >= (state.userCfg.startDate || prevDates7[0]);
  const pct7Delta = hasPrevWeek ? pct7 - prev7.pct : null;

  // hábito que mais melhorou e o que mais caiu esta semana vs a anterior (só conta se o
  // intervalo for relevante - 20 pontos - pra não citar ruído estatístico de poucos dias)
  let worstHabit = null, worstPct = 100, improvedHabit = null, declinedHabit = null;
  const habitDeltas = state.userHabits
    .filter(h => cur7.perHabit[h.id] && cur7.perHabit[h.id].possible > 0)
    .map(h => {
      const c = cur7.perHabit[h.id];
      const p = prev7.perHabit[h.id];
      const pctNow = Math.round(c.done / c.possible * 100);
      const pctPrev = hasPrevWeek && p && p.possible > 0 ? Math.round(p.done / p.possible * 100) : null;
      return { habit: h, pctNow, delta: pctPrev === null ? null : pctNow - pctPrev };
    });
  habitDeltas.forEach(hd => { if (hd.pctNow < worstPct) { worstPct = hd.pctNow; worstHabit = hd.habit; } });
  if (habitDeltas.length > 1) {
    const withDelta = habitDeltas.filter(hd => hd.delta !== null);
    const best = withDelta.reduce((a, b) => (a === null || b.delta > a.delta ? b : a), null);
    const worst = withDelta.reduce((a, b) => (a === null || b.delta < a.delta ? b : a), null);
    if (best && best.delta >= 20) improvedHabit = best;
    if (worst && worst.delta <= -20 && worst.habit !== (improvedHabit && improvedHabit.habit)) declinedHabit = worst;
  }

  const aq = getActiveQ(state.userCfg.startDate);
  const ql = ['', 'Fundação', 'Aceleração', 'Escala', 'Colheita'];
  const start = new Date(state.userCfg.startDate || today);
  const qs = new Date(start); qs.setMonth(start.getMonth() + (aq - 1) * 3);
  const qe = new Date(qs); qe.setMonth(qs.getMonth() + 3);
  const trimTotal = Math.round((qe - qs) / 86400000);
  const trimPassed = Math.min(Math.round((new Date() - qs) / 86400000), trimTotal);
  const trimPct = Math.round(trimPassed / trimTotal * 100);

  // recorde pessoal - getBestStreak já inclui a sequência atual na varredura, então bestStreak
  // nunca é menor que streak; a diferença entre os dois é quanto falta pra empatar/bater o recorde.
  const bestStreak = getBestStreak(state.log);
  const recordGap = bestStreak - streak;
  const isRecord = streak > 0 && recordGap === 0 && bestStreak >= 14;
  const nearRecord = recordGap > 0 && recordGap <= 3 && streak >= 3;

  let msg, sub, color, label;
  if (streak === 0) {
    const hint = SITUATION_START_HINTS[state.userCfg.situation];
    msg = hint ? hint.msg : 'Hora de começar. O primeiro passo é o mais importante.';
    sub = hint ? hint.sub : 'Faça seu check-in de hoje e plante a semente da consistência.';
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
  // recorde pessoal tem prioridade sobre a faixa genérica - é o momento mais motivador possível
  if (isRecord) {
    msg = `${streak} dias — esse é o seu recorde pessoal.`;
    sub = 'Você nunca tinha chegado tão longe. Mais um dia e você bate esse número.';
    color = 'verde'; label = 'Novo recorde';
  } else if (nearRecord) {
    sub += ` Faltam ${recordGap} ${recordGap === 1 ? 'dia' : 'dias'} pra bater seu recorde de ${bestStreak}.`;
  }
  // revisão semanal recente ("pesada") deixa de ser write-only e complementa a mensagem
  if (streak > 0) {
    const reviews = state.userCfg.weeklyReviews || {};
    const recentDate = Object.keys(reviews).sort().reverse()
      .find(d => (new Date(today) - new Date(d)) / 86400000 <= 7);
    const recentReview = recentDate ? reviews[recentDate] : null;
    if (recentReview && recentReview.feel === 'pesada') {
      const adjustLabels = { treinos: 'os treinos', estudo: 'o estudo', sono: 'o sono' };
      const wanted = (recentReview.adjust || []).map(a => adjustLabels[a]).filter(Boolean);
      if (wanted.length) {
        sub += ` Você marcou a semana passada como pesada e queria ajustar ${wanted.join(' e ')} — hoje pode ser mais leve.`;
      }
    }
  }
  return {
    msg, sub, color, label, streak, pct7, pct7Prev: prev7.pct, pct7Delta, hasPrevWeek,
    worstHabit, worstPct, improvedHabit, declinedHabit,
    bestStreak, recordGap, isRecord,
    trimPct, trimPassed, trimTotal, aq, ql,
  };
}

export async function renderDashboard() {
  const today = todayKey();
  const logMap = Object.fromEntries(state.log.map(e => [e.date, e]));
  const insight = generateDashboardInsight();
  document.getElementById('dash-hero-wrap').innerHTML = `
    <div class="dash-hero ${insight.color}">
      ${insight.streak > 0 ? `<div class="dash-hero-streak">🔥 ${insight.streak}d${insight.isRecord ? ' <span class="dash-hero-record">★</span>' : ''}</div>` : ''}
      <div class="dash-hero-label">${insight.label}</div>
      <div class="dash-hero-msg">${insight.msg}</div>
      <div class="dash-hero-sub">${insight.sub}</div>
      ${state.userCfg.meta ? `<div class="dash-hero-focus">Seu foco: ${sanitize(META_LABELS[state.userCfg.meta] || state.userCfg.meta)}</div>` : ''}
    </div>`;

  // comparação com a semana anterior - substitui a antiga tira de 3 números soltos
  // (streak já está no hero; "registros totais" já aparece no Perfil)
  const compareEl = document.getElementById('dash-compare-wrap');
  if (compareEl) {
    if (insight.hasPrevWeek) {
      const dirCls = insight.pct7Delta > 0 ? 'dc-up' : insight.pct7Delta < 0 ? 'dc-down' : 'dc-same';
      const deltaTxt = insight.pct7Delta === 0
        ? 'Igual'
        : `${insight.pct7Delta > 0 ? '↑' : '↓'} ${Math.abs(insight.pct7Delta)}pp`;
      compareEl.innerHTML = `
        <div class="dash-compare">
          <div class="dc-card">
            <div class="dc-label">Essa semana</div>
            <div class="dc-row"><span class="dc-name">Cumprido</span><span class="dc-val ${dirCls}">${insight.pct7}%</span></div>
            <div class="dc-row"><span class="dc-name">Variação</span><span class="dc-val ${dirCls}">${deltaTxt}</span></div>
          </div>
          <div class="dc-card">
            <div class="dc-label">Semana passada</div>
            <div class="dc-row"><span class="dc-name">Cumprido</span><span class="dc-val">${insight.pct7Prev}%</span></div>
          </div>
        </div>`;
    } else {
      compareEl.innerHTML = '';
    }
  }

  // financeiro: meta do mês (dado que já existe em finLog) + gasto da semana (contexto, sem cor
  // de bem/mal - gastar mais não é necessariamente ruim, ao contrário de faltar num hábito).
  // Só aparece pra quem tem a área financeira ativa.
  const finEl = document.getElementById('dash-fin-wrap');
  if (finEl) {
    if ((state.userCfg.areas || []).includes('financas')) {
      const now = new Date();
      const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const finEntry = (state.userCfg.finLog || []).find(f => f.mes === mesAtual);
      const finMeta = state.userCfg.finMeta || 0;
      const totalMes = finEntry ? (finEntry.guardado || 0) + (finEntry.investido || 0) : 0;
      const metaPct = finMeta > 0 ? Math.min(100, Math.round(totalMes / finMeta * 100)) : null;
      const gastoSemana = sumGastosInPeriod(getPeriodDates('semana'), logMap);
      const fmtR$ = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      finEl.innerHTML = `
        <div class="dash-focus">
          <div class="dash-focus-label">Financeiro</div>
          <div class="dc-card">
            ${metaPct !== null ? `
              <div class="dc-row"><span class="dc-name">Meta do mês</span><span class="dc-val ${metaPct >= 100 ? 'dc-up' : ''}">R$ ${fmtR$(totalMes)} / ${fmtR$(finMeta)}</span></div>
              <div class="bar-bg" style="margin:4px 0 8px"><div class="bar-fill" style="width:${metaPct}%;background:var(--verde)"></div></div>
            ` : `<div class="dc-row"><span class="dc-name">Meta do mês</span><span class="dc-val">Nenhuma definida</span></div>`}
            <div class="dc-row"><span class="dc-name">Gasto essa semana</span><span class="dc-val">R$ ${fmtR$(gastoSemana)}</span></div>
          </div>
        </div>`;
    } else {
      finEl.innerHTML = '';
    }
  }

  // hábito que mais melhorou / mais caiu vs semana passada - sempre com os dois lados quando dá,
  // nunca só o negativo. Sem dado de comparação suficiente, cai pro antigo "hábito mais fraco".
  const focusEl = document.getElementById('dash-focus-wrap');
  const habitCard = (hd, dirCls, arrow) => `
    <div class="dc-card">
      <div class="dc-label">${sanitize(hd.habit.icon)} ${sanitize(hd.habit.name)}</div>
      <div class="dc-row"><span class="dc-name">Essa semana</span><span class="dc-val ${dirCls}">${hd.pctNow}%</span></div>
      <div class="dc-row"><span class="dc-name">Variação</span><span class="dc-val ${dirCls}">${arrow} ${Math.abs(hd.delta)}pp</span></div>
    </div>`;
  if (insight.improvedHabit && insight.declinedHabit) {
    focusEl.innerHTML = `
      <div class="dash-focus">
        <div class="dash-focus-label">Comparado à semana passada</div>
        <div class="dash-compare">
          ${habitCard(insight.improvedHabit, 'dc-up', '↑')}
          ${habitCard(insight.declinedHabit, 'dc-down', '↓')}
        </div>
      </div>`;
  } else if (insight.improvedHabit) {
    focusEl.innerHTML = `
      <div class="dash-focus">
        <div class="dash-focus-label">Comparado à semana passada</div>
        <div class="dash-focus-text dc-up">${sanitize(insight.improvedHabit.habit.icon)} ${sanitize(insight.improvedHabit.habit.name)} subiu pra ${insight.improvedHabit.pctNow}% (↑ ${insight.improvedHabit.delta}pp)</div>
      </div>`;
  } else if (insight.declinedHabit) {
    focusEl.innerHTML = `
      <div class="dash-focus">
        <div class="dash-focus-label">Comparado à semana passada</div>
        <div class="dash-focus-text dc-down">${sanitize(insight.declinedHabit.habit.icon)} ${sanitize(insight.declinedHabit.habit.name)} caiu pra ${insight.declinedHabit.pctNow}% (↓ ${Math.abs(insight.declinedHabit.delta)}pp)</div>
      </div>`;
  } else if (insight.worstHabit && insight.worstPct < 80) {
    focusEl.innerHTML = `
      <div class="dash-focus">
        <div class="dash-focus-label">Foco desta semana</div>
        <div class="dash-focus-text">${sanitize(insight.worstHabit.icon)} ${sanitize(insight.worstHabit.name)} — ${insight.worstPct}% concluído. Está abaixo da meta.</div>
      </div>`;
  } else {
    focusEl.innerHTML = '';
  }

  // trimestre + OKR ativo num card só: calendário do trimestre + ritmo real (KRs concluídos vs
  // % de calendário já passado) + a lista de KRs, em vez de 2 cards separados dizendo coisas parecidas
  const { getActiveObjective } = await import('./okrs.js');
  const obj = getActiveObjective();
  const dashOkrEl = document.getElementById('dash-okr-wrap');
  if (dashOkrEl) {
    const krPct = obj && obj.totalCnt > 0 ? Math.round(obj.doneCnt / obj.totalCnt * 100) : null;
    let paceHtml = '';
    if (krPct !== null) {
      const diff = krPct - insight.trimPct;
      const paceCls = diff >= 15 ? 'dc-up' : diff <= -15 ? 'dc-down' : 'dc-same';
      const paceTxt = diff >= 15
        ? `À frente do ritmo — ${krPct}% dos KRs concluídos com ${insight.trimPct}% do trimestre passado.`
        : diff <= -15
          ? `Abaixo do ritmo — ${krPct}% dos KRs concluídos com ${insight.trimPct}% do trimestre já passado.`
          : `No ritmo — ${krPct}% dos KRs concluídos, perto dos ${insight.trimPct}% do trimestre já passado.`;
      paceHtml = `<div class="dash-pace ${paceCls}">${paceTxt}</div>`;
    }
    dashOkrEl.innerHTML = `<div class="dash-okr-card" onclick="nav('okrs',null)">
      <div class="dash-okr-top">Q${insight.aq} — ${insight.ql[insight.aq]}${obj ? ` · ${sanitize(obj.areaName)}` : ''}</div>
      <div class="trim-bar-bg"><div class="trim-bar-fill" style="width:${insight.trimPct}%"></div></div>
      <div class="trim-days"><span>${insight.trimPassed} ${insight.trimPassed === 1 ? 'dia passado' : 'dias passados'}</span><span>${insight.trimTotal - insight.trimPassed} ${insight.trimTotal - insight.trimPassed === 1 ? 'dia restante' : 'dias restantes'}</span></div>
      ${paceHtml}
      ${obj ? `
        <div class="dash-okr-label">${obj.label}</div>
        <div class="okr-progress-wrap" style="margin:6px 0 8px">
          <div class="okr-progress-bg"><div class="okr-progress-fill" style="width:${krPct}%"></div></div>
          <span class="okr-progress-label">${obj.doneCnt}/${obj.totalCnt} KRs</span>
        </div>
        <div class="dash-okr-krs">${obj.krs.map(k => `<span>${k.done ? '✓' : '→'} ${sanitize(k.text)}</span>`).join('')}</div>
      ` : ''}
    </div>`;
  }

  const dates = getPeriodDates(state.period);
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
    const entry = logMap[date];
    if (!entry) return `<div class="hm-cell hm-0${isToday ? ' hm-today' : ''}" title="${fmtDate(date)}"></div>`;
    const done = state.userHabits.filter(h => isExpected(h, date) && entry.habits[h.id]).length;
    const exp = state.userHabits.filter(h => isExpected(h, date)).length;
    return `<div class="hm-cell hm-${exp === 0 ? 0 : Math.ceil(done / exp * 4)}${isToday ? ' hm-today' : ''}" title="${fmtDate(date)}: ${done}/${exp}"></div>`;
  }).join('');
  const last7 = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); last7.push(dateKey(d)); }
  document.getElementById('bar-chart').innerHTML = last7.map(date => {
    const entry = logMap[date];
    const exp = state.userHabits.filter(h => isExpected(h, date)).length;
    const done = entry ? state.userHabits.filter(h => isExpected(h, date) && entry.habits[h.id]).length : 0;
    const p2 = exp > 0 ? done / exp : 0;
    const color = p2 >= 0.8 ? 'var(--verde)' : p2 >= 0.5 ? 'var(--ambar)' : 'var(--borda)';
    const dow = new Date(date + 'T12:00:00').getDay();
    return `<div class="bc-col"><div class="bc-val">${entry ? done : ''}</div><div class="bc-bar" style="height:${Math.max(done / (state.userHabits.length || 1) * 68, 2)}px;background:${color}"></div><div class="bc-label">${DLABELS[dow]}</div></div>`;
  }).join('');
  const showDots = state.period === 'semana';
  document.getElementById('dash-habits').innerHTML = state.userHabits.map(h => {
    let hd = 0, hp = 0, extras = 0;
    dates.forEach(date => {
      const entry = logMap[date]; const exp = isExpected(h, date);
      if (exp) { hp++; if (entry && entry.habits[h.id]) hd++; }
      else if (entry && entry.habits[h.id]) extras++;
    });
    const p2 = hp > 0 ? Math.round(hd / hp * 100) : 0;
    const color = p2 >= 80 ? 'var(--verde)' : p2 >= 50 ? 'var(--ambar)' : '#E24B4A';
    const dots = showDots ? ('<div class="week-dots">' + dates.map(date => {
      const dow = new Date(date + 'T12:00:00').getDay();
      const entry = logMap[date];
      const done = entry && entry.habits[h.id]; const isT = date === today; const exp = isExpected(h, date);
      const cls = (done && exp ? 'done ' : []) + (done && !exp ? 'extra ' : []) + (isT && !done ? 'today ' : []) + ((!exp && !done) ? 'skip' : '');
      return '<div class="wd ' + cls + '">' + DLABELS[dow] + '</div>';
    }).join('') + '</div>') : '';
    return `<div class="card" style="padding:12px 14px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div style="font-size:13px;font-weight:500">${sanitize(h.icon)} ${sanitize(h.name)}${extras > 0 ? ` <span style="font-size:10px;color:var(--ambar);font-weight:600">+${extras} extra</span>` : ''}</div>
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
  const chart = document.getElementById('energy-chart');
  if (!chart) return;
  if (!state.log.length) {
    chart.innerHTML = '<div class="empty-state" style="padding:20px 8px"><strong>Sem dados ainda</strong>Registre sua energia no check-in para ver o padrão aqui.</div>';
    return;
  }
  const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(dateKey(d)); }
  const colors = ['', 'var(--dan-solid)', 'var(--ambar)', 'var(--verde)'];
  const logMap = Object.fromEntries(state.log.map(e => [e.date, e]));
  chart.innerHTML = days.map(date => {
    const entry = logMap[date];
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
