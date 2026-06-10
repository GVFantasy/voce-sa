import { state, ACHIEVEMENTS } from './state.js';
import { calcStreak, getBestStreak } from './utils.js';

// Mapeamento de raridade por achievement id
const RARITY = {
  primeiro: 'comum',
  semana1:  'comum',
  treino10: 'comum',
  check30:  'comum',
  mes1:     'raro',
  perfeito: 'raro',
  idioma30: 'raro',
  check100: 'raro',
  mes3:     'epico',
};

const RARITY_BADGE = {
  raro:  'Raro',
  epico: 'Épico',
};

function getProgress(a, log, streak) {
  const IDIOMA_IDS = ['ingles','espanhol','alemao','japones','frances','italiano','mandarin','coreano','russo','arabe','libras'];
  switch(a.id) {
    case 'primeiro': return { cur: Math.min(log.length, 1), max: 1 };
    case 'semana1':  return { cur: Math.min(streak, 7), max: 7 };
    case 'mes1':     return { cur: Math.min(streak, 30), max: 30 };
    case 'mes3':     return { cur: Math.min(streak, 90), max: 90 };
    case 'treino10': return { cur: Math.min(log.filter(e => e.habits?.treino).length, 10), max: 10 };
    case 'check30':  return { cur: Math.min(log.length, 30), max: 30 };
    case 'check100': return { cur: Math.min(log.length, 100), max: 100 };
    case 'idioma30': return { cur: Math.min(log.filter(e => e.habits && Object.keys(e.habits).some(k => IDIOMA_IDS.includes(k) && e.habits[k])).length, 30), max: 30 };
    default: return null;
  }
}

export function renderConquistas() {
  const streak = calcStreak(state.log); const best = getBestStreak(state.log);
  document.getElementById('streak-big-num').textContent = streak;
  let bestLabel = '';
  if (streak === 0 && state.log.length === 0) {
    bestLabel = 'Faça seu primeiro check-in hoje para iniciar sua sequência.';
  } else if (streak === 0 && state.log.length > 0) {
    bestLabel = best > 0
      ? `Sua melhor sequência foi ${best} dias. Hora de recomeçar.`
      : 'Faça um check-in hoje para iniciar sua sequência.';
  } else if (best > streak) {
    bestLabel = `Melhor sequência: ${best} dias`;
  } else if (best > 0 && best === streak) {
    bestLabel = `Esse é seu recorde!`;
  }
  document.getElementById('streak-best-label').textContent = bestLabel;
  document.getElementById('achiev-grid').innerHTML = ACHIEVEMENTS.map(a => {
    const unlocked = a.check(state.log, streak);
    const rarity = RARITY[a.id] || 'comum';
    const rarityClass = rarity !== 'comum' ? ` ${rarity}` : '';
    const badge = RARITY_BADGE[rarity]
      ? `<div class="achiev-badge">${RARITY_BADGE[rarity]}</div>`
      : '';
    const prog = unlocked ? null : getProgress(a, state.log, streak);
    const progHTML = prog ? `<div class="achiev-prog"><div class="achiev-prog-bar" style="width:${Math.round(prog.cur/prog.max*100)}%"></div></div><div class="achiev-prog-txt">${prog.cur}/${prog.max}</div>` : '';
    return `<div class="achiev-card${rarityClass}${unlocked ? ' unlocked' : ''}">
      <div class="achiev-icon">${a.icon}</div>
      <div class="achiev-name">${a.name}</div>
      <div class="achiev-desc">${a.desc}</div>
      ${progHTML}
      ${badge}
    </div>`;
  }).join('');
}
