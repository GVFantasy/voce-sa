import { todayKey, dateKey } from './utils.js';

function fmtHM(totalMin) {
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

// Gera os slots fixos (recorrentes por dia da semana) dentro da janela de horario informada,
// e distribui as materias em rodizio (round-robin) por todos os slots (dia x horario), na ordem
// dos dias escolhidos - assim a mesma materia nao cai sempre no mesmo dia da semana pra sempre.
// Deterministico, sem IA - so um agendador simples.
export function gerarBlocos(materias, disponibilidade) {
  const { dias, inicio, fim, duracaoBloco } = disponibilidade;
  if (!dias?.length || !materias?.length || !duracaoBloco) return [];
  const [ih, im] = inicio.split(':').map(Number);
  const [fh, fm] = fim.split(':').map(Number);
  const startMin = ih * 60 + im, endMin = fh * 60 + fm;
  const slots = [];
  for (let cur = startMin; cur + duracaoBloco <= endMin; cur += duracaoBloco) {
    slots.push({ inicio: fmtHM(cur), fim: fmtHM(cur + duracaoBloco) });
  }
  if (!slots.length) return [];

  const blocos = [];
  let matIdx = 0;
  [...dias].sort((a, b) => a - b).forEach(dow => {
    slots.forEach(slot => {
      blocos.push({
        id: crypto.randomUUID(),
        label: materias[matIdx % materias.length],
        diasSemana: [dow],
        inicio: slot.inicio,
        fim: slot.fim,
      });
      matIdx++;
    });
  });
  return blocos;
}

// Status de um bloco *hoje* - usado tanto pra render quanto (futuramente) pra notificacao.
// 'outro-dia' quando o bloco nao e recorrente no dia da semana de hoje.
export function blocoStatus(bloco, doneToday, agora = new Date()) {
  if (doneToday) return 'feito';
  if (!bloco.diasSemana.includes(agora.getDay())) return 'outro-dia';
  const nowMin = agora.getHours() * 60 + agora.getMinutes();
  const [ih, im] = bloco.inicio.split(':').map(Number);
  const [fh, fm] = bloco.fim.split(':').map(Number);
  const iniMin = ih * 60 + im, fimMin = fh * 60 + fm;
  if (nowMin < iniMin) return 'proximo';
  if (nowMin < fimMin) return 'agora';
  return 'perdido';
}

// Aderencia acumulada desde a criacao da rotina ate hoje (ou o prazo, o que vier primeiro) -
// mesmo espirito do dayFulfilled/STREAK_THRESHOLD do check-in geral, mas em cima de rotinaLog,
// separado do streak principal por decisao explicita do usuario.
export function calcAderencia(rotina, rotinaLog) {
  if (!rotina) return { pct: 0, esperado: 0, feito: 0 };
  const today = todayKey();
  const endKey = rotina.prazo < today ? rotina.prazo : today;
  let esperado = 0, feito = 0;
  for (let d = new Date(rotina.criadoEm + 'T12:00:00'); dateKey(d) <= endKey; d.setDate(d.getDate() + 1)) {
    const k = dateKey(d);
    const dow = d.getDay();
    const dayLog = rotinaLog[k] || { blocos: {}, checklist: {} };
    (rotina.blocos || []).forEach(b => {
      if (b.diasSemana.includes(dow)) { esperado++; if (dayLog.blocos?.[b.id]) feito++; }
    });
    (rotina.checklist || []).forEach(c => {
      if (c.diasSemana.includes(dow)) { esperado++; if (dayLog.checklist?.[c.id]) feito++; }
    });
  }
  return { pct: esperado > 0 ? Math.round(feito / esperado * 100) : 0, esperado, feito };
}

export function diasRestantes(rotina) {
  if (!rotina) return 0;
  const today = new Date(todayKey() + 'T12:00:00');
  const prazo = new Date(rotina.prazo + 'T12:00:00');
  return Math.max(0, Math.round((prazo - today) / 86400000));
}
