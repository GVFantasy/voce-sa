import { state } from './state.js';
import { sb, setSyncStatus } from './db.js';
import { showToast, fmtDate, todayKey, sanitize } from './utils.js';

export let newLivroTipo = 'livro';
let bibCache = [];
let editingLivroId = null;

const TIPO_ICONS = { livro: '📘', curso: '🎓', video: '▶️', podcast: '🎙️', artigo: '📄' };
const TIPO_NOMES = { livro: 'Livro', curso: 'Curso', video: 'Vídeo', podcast: 'Podcast', artigo: 'Artigo' };

export function showAddLivro() {
  const f = document.getElementById('add-livro-form');
  const isOpen = f.style.display !== 'none';
  f.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    editingLivroId = null;
    document.getElementById('livro-titulo').value = '';
    document.getElementById('livro-nota').value = '';
    newLivroTipo = 'livro';
    window._newLivroTipo = 'livro';
    const chips = document.querySelectorAll('#livro-tipo-chips .ob-chip');
    chips.forEach((c, i) => c.classList.toggle('on', i === 0));
    const btn = document.getElementById('btn-save-livro'); if (btn) btn.textContent = 'Salvar';
  }
}

export function editLivro(id) {
  const item = bibCache.find(i => String(i.id) === String(id));
  if (!item) return;
  editingLivroId = id;
  document.getElementById('livro-titulo').value = item.titulo;
  document.getElementById('livro-nota').value = item.nota || '';
  newLivroTipo = item.tipo;
  window._newLivroTipo = item.tipo;
  document.querySelectorAll('#livro-tipo-chips .ob-chip').forEach(c => c.classList.toggle('on', c.dataset.val === item.tipo));
  const btn = document.getElementById('btn-save-livro'); if (btn) btn.textContent = 'Salvar edição';
  document.getElementById('add-livro-form').style.display = 'block';
  document.getElementById('livro-titulo').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export async function deleteLivro(id) {
  if (!confirm('Excluir este item da biblioteca? Essa ação não pode ser desfeita.')) return;
  setSyncStatus('syncing', 'Excluindo...');
  const { error } = await sb.from('biblioteca').delete().eq('id', id).eq('user_id', state.currentUser.id);
  if (error) { setSyncStatus('err', 'Sem conexão'); showToast('Erro ao excluir: ' + error.message, 'err'); return; }
  if (String(editingLivroId) === String(id)) {
    // item excluido era o que estava aberto pra edicao - fecha o formulario, senao salvar
    // continuaria mandando um update pra uma linha que nao existe mais
    editingLivroId = null;
    document.getElementById('add-livro-form').style.display = 'none';
    const btn = document.getElementById('btn-save-livro'); if (btn) btn.textContent = 'Salvar';
  }
  setSyncStatus('ok', 'Sincronizado');
  showToast('Item excluído.');
  renderBiblioteca();
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
  setSyncStatus('syncing', 'Salvando...');
  const error = editingLivroId
    ? (await sb.from('biblioteca').update({ tipo, titulo, nota }).eq('id', editingLivroId).eq('user_id', state.currentUser.id)).error
    : (await sb.from('biblioteca').insert({ user_id: state.currentUser.id, tipo, titulo, nota })).error;
  if (error) { setSyncStatus('err', 'Sem conexão'); showToast('Erro ao salvar: ' + error.message, 'err'); return; }
  setSyncStatus('ok', 'Sincronizado');
  showToast(editingLivroId ? 'Item atualizado!' : 'Item adicionado à biblioteca!');
  editingLivroId = null;
  document.getElementById('livro-titulo').value = '';
  document.getElementById('livro-nota').value = '';
  document.getElementById('add-livro-form').style.display = 'none';
  const btn = document.getElementById('btn-save-livro'); if (btn) btn.textContent = 'Salvar';
  renderBiblioteca();
}

export function filterBiblioteca(term) {
  renderBiblioteca(term);
}

export async function renderBiblioteca(searchTerm) {
  const list = document.getElementById('biblioteca-list');
  if (!list) return;
  if (!bibCache.length || searchTerm === undefined) {
    list.innerHTML = '<div class="empty-state" style="padding:24px 0"><span style="opacity:.5">Carregando...</span></div>';
    const { data, error } = await sb.from('biblioteca').select('*').eq('user_id', state.currentUser.id).order('created_at', { ascending: false });
    if (error) {
      list.innerHTML = '<div class="empty-state"><strong>Erro ao carregar</strong>Não foi possível buscar os itens. Verifique sua conexão e tente novamente.</div>'; return;
    }
    bibCache = data || [];
  }
  if (!bibCache.length) {
    list.innerHTML = '<div class="empty-state"><strong>Biblioteca vazia</strong>Registre tudo que você consome: livros, cursos, podcasts e artigos.<br>Toque em <b>+ Adicionar</b> para começar.</div>';
    const stats = document.getElementById('bib-stats'); if (stats) stats.innerHTML = '';
    return;
  }
  const term = (searchTerm ?? document.getElementById('bib-search')?.value ?? '').trim().toLowerCase();
  const data = term ? bibCache.filter(i => i.titulo.toLowerCase().includes(term) || (i.nota || '').toLowerCase().includes(term)) : bibCache;
  const stats = document.getElementById('bib-stats');
  if (stats) {
    const counts = {}; bibCache.forEach(i => { counts[i.tipo] = (counts[i.tipo] || 0) + 1; });
    stats.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap">${Object.entries(counts).map(([t, c]) =>
      `<div style="background:var(--card);border:1px solid var(--borda);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:500">${TIPO_ICONS[t] || '📄'} ${c} ${TIPO_NOMES[t] || t}</div>`
    ).join('')}</div>`;
  }
  if (!data.length) {
    list.innerHTML = '<div class="empty-state"><strong>Nada encontrado</strong>Tente outro termo de busca.</div>'; return;
  }
  list.innerHTML = data.map(i => `<div class="bib-item">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
      <div style="min-width:0;flex:1">
        <div class="bib-tipo">${TIPO_ICONS[i.tipo] || '📄'} ${sanitize(TIPO_NOMES[i.tipo] || i.tipo)}</div>
        <div class="bib-titulo">${sanitize(i.titulo)}</div>
        ${i.nota ? `<div class="bib-nota">${sanitize(i.nota)}</div>` : ''}
        <div class="bib-date">${fmtDate(i.created_at?.slice(0, 10) || todayKey())}</div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0">
        <button aria-label="Editar item" onclick="editLivro('${i.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;padding:4px;opacity:.5;line-height:1">✏️</button>
        <button aria-label="Excluir item" onclick="deleteLivro('${i.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;padding:4px;opacity:.5;line-height:1">🗑️</button>
      </div>
    </div>
  </div>`).join('');
}
