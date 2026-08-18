import { state } from './state.js';
import { sb, setSyncStatus, queuePendingBiblioteca } from './db.js';
import { showToast, fmtDate, todayKey, sanitize } from './utils.js';
import { invalidateBibConcluidosCache } from './okrs.js';
import { invalidateBibConcluidosAchievementCache } from './conquistas.js';

let newLivroTipo = 'livro';
let newLivroStatus = null;
let newLivroRating = null;
let bibCache = [];
let editingLivroId = null;
let bibSort = 'recentes';

const TIPO_ICONS = { livro: '📘', curso: '🎓', video: '▶️', podcast: '🎙️', artigo: '📄' };
const TIPO_NOMES = { livro: 'Livro', curso: 'Curso', video: 'Vídeo', podcast: 'Podcast', artigo: 'Artigo' };
const STATUS_LABELS = { quero_ler: 'Quero ler', lendo: 'Lendo', concluido: 'Concluído' };

function renderRatingStars(rating) {
  const el = document.getElementById('livro-rating-stars');
  if (!el) return;
  el.innerHTML = [1, 2, 3, 4, 5].map(n =>
    `<button type="button" class="bib-star ${rating && n <= rating ? 'on' : ''}" onclick="setLivroRating(${n})" aria-label="${n} estrela${n > 1 ? 's' : ''}">★</button>`
  ).join('');
}

export function setLivroRating(n) {
  newLivroRating = newLivroRating === n ? null : n; // toca de novo na mesma estrela limpa a avaliação
  renderRatingStars(newLivroRating);
}

export function toggleLivroStatus(btn) {
  const val = btn.dataset.val;
  newLivroStatus = newLivroStatus === val ? null : val; // toca de novo no mesmo chip limpa o status
  document.querySelectorAll('#livro-status-chips .ob-chip').forEach(c => c.classList.toggle('on', c.dataset.val === newLivroStatus));
}

export function setBiblSort(val) {
  bibSort = val;
  renderBiblioteca();
}

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
    newLivroStatus = null;
    document.querySelectorAll('#livro-status-chips .ob-chip').forEach(c => c.classList.remove('on'));
    newLivroRating = null;
    renderRatingStars(null);
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
  newLivroStatus = item.status || null;
  document.querySelectorAll('#livro-status-chips .ob-chip').forEach(c => c.classList.toggle('on', c.dataset.val === newLivroStatus));
  newLivroRating = item.rating || null;
  renderRatingStars(newLivroRating);
  const btn = document.getElementById('btn-save-livro'); if (btn) btn.textContent = 'Salvar edição';
  document.getElementById('add-livro-form').style.display = 'block';
  document.getElementById('livro-titulo').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export async function deleteLivro(id) {
  if (!confirm('Excluir este item da biblioteca? Essa ação não pode ser desfeita.')) return;
  setSyncStatus('syncing', 'Excluindo...');
  const finishLocal = () => {
    if (String(editingLivroId) === String(id)) {
      // item excluido era o que estava aberto pra edicao - fecha o formulario, senao salvar
      // continuaria mandando um update pra uma linha que nao existe mais
      editingLivroId = null;
      document.getElementById('add-livro-form').style.display = 'none';
      const btn = document.getElementById('btn-save-livro'); if (btn) btn.textContent = 'Salvar';
    }
    bibCache = bibCache.filter(i => String(i.id) !== String(id));
    invalidateBibConcluidosCache();
    invalidateBibConcluidosAchievementCache();
    renderBiblioteca();
  };
  try {
    const { error } = await sb.from('biblioteca').delete().eq('id', id).eq('user_id', state.currentUser.id);
    if (error) { setSyncStatus('err', 'Erro'); showToast('Erro ao excluir: ' + error.message, 'err'); return; }
    setSyncStatus('ok', 'Sincronizado');
    showToast('Item excluído.');
    finishLocal();
  } catch (e) {
    queuePendingBiblioteca({ type: 'delete', id });
    setSyncStatus('err', 'Sem conexão');
    showToast('Sem conexão. Exclusão ficou na fila e será sincronizada automaticamente.', 'info');
    finishLocal();
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
  const status = newLivroStatus;
  const rating = newLivroRating;
  setSyncStatus('syncing', 'Salvando...');

  const closeForm = () => {
    editingLivroId = null;
    document.getElementById('livro-titulo').value = '';
    document.getElementById('livro-nota').value = '';
    document.getElementById('add-livro-form').style.display = 'none';
    const btn = document.getElementById('btn-save-livro'); if (btn) btn.textContent = 'Salvar';
  };

  if (editingLivroId) {
    const id = editingLivroId;
    const payload = { tipo, titulo, nota, status, rating };
    try {
      const { error } = await sb.from('biblioteca').update(payload).eq('id', id).eq('user_id', state.currentUser.id);
      if (error) { setSyncStatus('err', 'Erro'); showToast('Erro ao salvar: ' + error.message, 'err'); return; }
      setSyncStatus('ok', 'Sincronizado');
      showToast('Item atualizado!');
    } catch (e) {
      queuePendingBiblioteca({ type: 'update', id, payload });
      setSyncStatus('err', 'Sem conexão');
      showToast('Sem conexão. Edição ficou na fila e será sincronizada automaticamente.', 'info');
    }
    const idx = bibCache.findIndex(i => String(i.id) === String(id));
    if (idx >= 0) bibCache[idx] = { ...bibCache[idx], ...payload };
  } else {
    // client_id gerado antes da chamada permite upsert(onConflict:'client_id') em vez de insert
    // puro - torna o reenvio pela fila offline seguro (nunca duplica a linha).
    const client_id = crypto.randomUUID();
    const payload = { user_id: state.currentUser.id, tipo, titulo, nota, status, rating, client_id };
    try {
      const { data, error } = await sb.from('biblioteca').upsert(payload, { onConflict: 'client_id' }).select().single();
      if (error) { setSyncStatus('err', 'Erro'); showToast('Erro ao salvar: ' + error.message, 'err'); return; }
      setSyncStatus('ok', 'Sincronizado');
      showToast('Item adicionado à biblioteca!');
      bibCache.unshift(data);
    } catch (e) {
      queuePendingBiblioteca({ type: 'upsert', payload });
      setSyncStatus('err', 'Sem conexão');
      showToast('Sem conexão. Item ficou na fila e será sincronizado automaticamente.', 'info');
      bibCache.unshift({ ...payload, id: client_id, created_at: new Date().toISOString() });
    }
  }
  closeForm();
  invalidateBibConcluidosCache();
  invalidateBibConcluidosAchievementCache();
  renderBiblioteca();
}

export function filterBiblioteca(term) {
  renderBiblioteca(term);
}

// Usado pelo motor de KRs automaticos (okrs.js, escopado ao trimestre) e pela conquista de
// leitura (conquistas.js, sem escopo de data) - unicas automacoes que exigem busca nova ao
// Supabase, ja que a Biblioteca (ao contrario de state.log/userCfg) nao e carregada no login.
// Retorna null em erro (rede/servidor) - nao 0, que seria indistinguivel de "genuinamente zero
// itens concluidos" e regrediria visivelmente o KR/conquista que dependem desse numero. Quem
// consome (okrs.js, conquistas.js) trata null como "sem dado ainda" e mantem o cache anterior.
export async function fetchBibConcluidosCount(fromDate) {
  if (!state.currentUser) return 0;
  let query = sb.from('biblioteca')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', state.currentUser.id)
    .eq('status', 'concluido');
  if (fromDate) query = query.gte('created_at', fromDate);
  const { count, error } = await query;
  return error ? null : (count || 0);
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
  let data = term ? bibCache.filter(i => i.titulo.toLowerCase().includes(term) || (i.nota || '').toLowerCase().includes(term)) : [...bibCache];
  if (bibSort === 'titulo') data.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  else if (bibSort === 'tipo') data.sort((a, b) => (TIPO_NOMES[a.tipo] || a.tipo).localeCompare(TIPO_NOMES[b.tipo] || b.tipo, 'pt-BR'));
  else if (bibSort === 'status') data.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
  // 'recentes' já vem nessa ordem do Supabase (order created_at desc), sem precisar reordenar
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
        <div class="bib-tipo">${TIPO_ICONS[i.tipo] || '📄'} ${sanitize(TIPO_NOMES[i.tipo] || i.tipo)}${i.status ? `<span class="bib-status-badge ${i.status}">${STATUS_LABELS[i.status]}</span>` : ''}</div>
        <div class="bib-titulo">${sanitize(i.titulo)}</div>
        ${i.rating ? `<div class="bib-rating">${'★'.repeat(i.rating)}${'☆'.repeat(5 - i.rating)}</div>` : ''}
        ${i.nota ? `<div class="bib-nota">${sanitize(i.nota)}</div>` : ''}
        <div class="bib-date">${fmtDate(i.created_at?.slice(0, 10) || todayKey())}</div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0">
        <button aria-label="Editar item" onclick="editLivro('${i.id}')" style="background:none;border:none;cursor:pointer;padding:4px;opacity:.5;line-height:1;display:flex"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg></button>
        <button aria-label="Excluir item" onclick="deleteLivro('${i.id}')" style="background:none;border:none;cursor:pointer;padding:4px;opacity:.5;line-height:1;display:flex"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      </div>
    </div>
  </div>`).join('');
}
