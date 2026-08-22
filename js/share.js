import { ACHIEVEMENTS } from './state.js';
import { showToast } from './utils.js';
import { RARITY, RARITY_BADGE } from './conquistas.js';

const SIZE = 1080;

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach(word => {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function generateAchievementImage(a) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#6D28D9';
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.save();
  ctx.beginPath();
  ctx.arc(SIZE - 60, 60, 260, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fill();
  ctx.restore();

  const rarity = RARITY[a.id] || 'comum';
  if (RARITY_BADGE[rarity]) {
    ctx.font = '700 26px "DM Sans", sans-serif';
    const badgeText = RARITY_BADGE[rarity].toUpperCase();
    const badgeW = ctx.measureText(badgeText).width + 56;
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath();
    ctx.roundRect(SIZE / 2 - badgeW / 2, 130, badgeW, 52, 26);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, SIZE / 2, 130 + 27);
  }

  ctx.font = '190px "DM Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(a.icon, SIZE / 2, 420);

  ctx.font = '700 62px "DM Serif Display", serif';
  ctx.fillStyle = '#fff';
  const nameLines = wrapText(ctx, a.name, SIZE - 160);
  let y = 590;
  nameLines.forEach(line => { ctx.fillText(line, SIZE / 2, y); y += 74; });

  ctx.font = '400 34px "DM Sans", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  const descLines = wrapText(ctx, a.desc, SIZE - 220);
  descLines.forEach(line => { ctx.fillText(line, SIZE / 2, y); y += 46; });

  ctx.font = '700 34px "DM Sans", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('Você S.A.', SIZE / 2, SIZE - 110);
  ctx.font = '400 24px "DM Sans", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.fillText('Seu melhor projeto é você mesmo', SIZE / 2, SIZE - 72);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

export async function shareAchievement(id) {
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (!a) return;
  try {
    const blob = await generateAchievementImage(a);
    if (!blob) { showToast('Não foi possível gerar a imagem.', 'err'); return; }
    const file = new File([blob], 'conquista-voce-sa.png', { type: 'image/png' });
    const shareData = { files: [file], title: a.name, text: `Desbloqueei "${a.name}" no Você S.A.! ${a.icon}` };
    if (navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
    } else {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      showToast('Imagem aberta numa nova aba — salve ou compartilhe manualmente.');
    }
  } catch (e) {
    if (e.name !== 'AbortError') showToast('Não foi possível compartilhar.', 'err');
  }
}
