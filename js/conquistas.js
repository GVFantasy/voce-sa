import { state, ACHIEVEMENTS } from './state.js';
import { calcStreak, getBestStreak } from './utils.js';

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
    return `<div class="achiev-card ${unlocked ? 'unlocked' : ''}"><div class="achiev-icon">${a.icon}</div><div class="achiev-name">${a.name}</div><div class="achiev-desc">${a.desc}</div></div>`;
  }).join('');
}
