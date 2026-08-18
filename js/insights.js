// Insights automáticos: cruza dado já coletado (hábitos, energia) sem pedir nada novo ao
// usuário. Cada função só retorna uma frase se houver dado suficiente pra sustentar a
// correlação (mínimo 14 dias) - sem isso, retorna null e o chamador simplesmente omite.
// Só surgem no sentido positivo/motivador (nunca "sua energia piora quando você faz X"),
// mesmo espírito de tom do resto do app.
import { state } from './state.js';
import { isExpected } from './utils.js';

const MIN_DIAS = 14;

export function energiaVsSono(log) {
  if (log.length < MIN_DIAS) return null;
  const sonoHabit = (state.userHabits || []).find(h => h.id === 'sono');
  if (!sonoHabit) return null;
  const comSono = log.filter(e => e.habits && e.habits.sono && e.energy > 0);
  const semSono = log.filter(e => (!e.habits || !e.habits.sono) && e.energy > 0);
  if (comSono.length < 5 || semSono.length < 5) return null;
  const avg = arr => arr.reduce((s, e) => s + e.energy, 0) / arr.length;
  const diff = avg(comSono) - avg(semSono);
  if (diff < 0.3) return null;
  return `Sua energia costuma ser maior nos dias em que você dorme bem — vale proteger esse hábito.`;
}

export function melhorDiaDaSemana(log) {
  if (log.length < MIN_DIAS) return null;
  const habits = state.userHabits || [];
  if (!habits.length) return null;
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const scores = [0, 0, 0, 0, 0, 0, 0], counts = [0, 0, 0, 0, 0, 0, 0];
  log.forEach(e => {
    const dow = new Date(e.date + 'T12:00:00').getDay();
    const expected = habits.filter(h => isExpected(h, e.date));
    if (!expected.length) return;
    const done = expected.filter(h => e.habits && e.habits[h.id]).length;
    scores[dow] += done / expected.length;
    counts[dow]++;
  });
  let best = -1, bestAvg = 0;
  for (let i = 0; i < 7; i++) {
    if (counts[i] >= 2) {
      const avg = scores[i] / counts[i];
      if (avg > bestAvg) { bestAvg = avg; best = i; }
    }
  }
  if (best < 0 || bestAvg < 0.6) return null;
  return `${DIAS[best].charAt(0).toUpperCase() + DIAS[best].slice(1)} é historicamente o seu dia mais consistente (${Math.round(bestAvg * 100)}% de cumprimento em média).`;
}

export function habitosContraste(log) {
  const habits = state.userHabits || [];
  if (habits.length < 2 || log.length < MIN_DIAS) return null;
  const stats = habits.map(h => {
    let done = 0, possible = 0;
    log.forEach(e => { if (isExpected(h, e.date)) { possible++; if (e.habits && e.habits[h.id]) done++; } });
    return { h, pct: possible >= 5 ? done / possible : null };
  }).filter(s => s.pct !== null);
  if (stats.length < 2) return null;
  const best = stats.reduce((a, b) => (b.pct > a.pct ? b : a));
  const worst = stats.reduce((a, b) => (b.pct < a.pct ? b : a));
  if (best.h.id === worst.h.id || best.pct - worst.pct < 0.25) return null;
  return `${sanitizeIcon(best.h.icon)} ${best.h.name} é seu hábito mais consistente (${Math.round(best.pct * 100)}%) — ${sanitizeIcon(worst.h.icon)} ${worst.h.name} é o que mais precisa de atenção (${Math.round(worst.pct * 100)}%).`;
}

function sanitizeIcon(icon) {
  return icon || '';
}

// Junta os insights disponíveis (até 3, só os que tiverem dado suficiente).
export function gerarInsights(log) {
  return [energiaVsSono(log), melhorDiaDaSemana(log), habitosContraste(log)].filter(Boolean);
}
