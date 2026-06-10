import { state } from './state.js';
import { sb, setSyncStatus } from './db.js';
import { showToast, fmtDate, todayKey, sanitize } from './utils.js';

export let newLivroTipo = 'livro';

export function showAddLivro() {
  const f = document.getElementById('add-livro-form');
  const isOpen = f.style.display !== 'none';
  f.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    // Reset form ao abrir
    document.getElementById('livro-titulo').value = '';
    document.getElementById('livro-nota').value = '';
    newLivroTipo = 'livro';
    window._newLivroTipo = 'livro';
    const chips = document.querySelectorAll('#livro-tipo-chips .ob-chip');
    chips.forEach((c, i) => c.classList.toggle('on', i === 0));
  }
}

export async function saveLivro() {
  const tituloEl = document.getElementById('livro-titulo');
  const titulo = tituloEl.value.trim();
  if (!titulo) {
    tituloEl.classList.add('invalid'); tituloEl.focus();
    showToast('Informe o título antes de salvar.', 'info', 3000); return;
  }
  tituloEl.classList.remove('invalid');
  const nota = document.getElementById('livro-nota').value.trim();
  // usa window._newLivroTipo que é atualizado pelo obSingle('livro-tipo')
  const tipo = window._newLivroTipo || newLivroTipo;
  const item = { user_id: state.currentUser.id, tipo, titulo, nota };
  setSyncStatus('syncing', 'Salvando...');
  const { error } = await sb.from('biblioteca').insert(item);
  if (error) { setSyncStatus('err', 'Sem conexão'); showToast('Erro ao salvar: ' + error.message, 'err'); return; }
  setSyncStatus('ok', 'Sincronizado');
  showToast('Item adicionado à biblioteca!');
  document.getElementById('livro-titulo').value = '';
  document.getElementById('livro-nota').value = '';
  document.getElementById('add-livro-form').style.display = 'none';
  renderBiblioteca();
}

export async function renderBiblioteca() {
  const list = document.getElementById('biblioteca-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-state" style="padding:24px 0"><span style="opacity:.5">Carregando...</span></div>';
  const { data, error } = await sb.from('biblioteca').select('*').eq('user_id', state.currentUser.id).order('created_at', { ascending: false });
  if (error) {
    list.innerHTML = '<div class="empty-state"><strong>Erro ao carregar</strong>Não foi possível buscar os itens. Verifique sua conexão e tente novamente.</div>'; return;
  }
  if (!data || !data.length) {
    list.innerHTML = '<div class="empty-state"><strong>Biblioteca vazia</strong>Registre tudo que você consome: livros, cursos, podcasts e artigos.<br>Toque em <b>+ Adicionar</b> para começar.</div>'; return;
  }
  const tipoIcons = { livro: '📘', curso: '🎓', video: '▶️', podcast: '🎙️', artigo: '📄' };
  const tipoNomes = { livro: 'Livro', curso: 'Curso', video: 'Vídeo', podcast: 'Podcast', artigo: 'Artigo' };
  const stats = document.getElementById('bib-stats');
  if (stats) {
    const counts = {}; data.forEach(i => { counts[i.tipo] = (counts[i.tipo] || 0) + 1; });
    stats.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap">${Object.entries(counts).map(([t, c]) =>
      `<div style="background:var(--card);border:1px solid var(--borda);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:500">${tipoIcons[t] || '📄'} ${c} ${tipoNomes[t] || t}</div>`
    ).join('')}</div>`;
  }
  list.innerHTML = data.map(i => `<div class="bib-item">
    <div class="bib-tipo">${tipoIcons[i.tipo] || '📄'} ${sanitize(tipoNomes[i.tipo] || i.tipo)}</div>
    <div class="bib-titulo">${sanitize(i.titulo)}</div>
    ${i.nota ? `<div class="bib-nota">${sanitize(i.nota)}</div>` : ''}
    <div class="bib-date">${fmtDate(i.created_at?.slice(0, 10) || todayKey())}</div>
  </div>`).join('');
}
