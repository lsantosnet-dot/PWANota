/* ===========================
   PWA Prompt Manager - app.js
   =========================== */

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/PWANota/service-worker.js').catch(console.error);
}

// ─── State ───────────────────────────────────────────────────────────────────
let editingId = null;
let editingTagId = null;
let selectedTagIds = [];       // tags selected in the prompt modal
let activeFilterTagIds = [];   // tags selected in the filter modal
let allTagsCache = [];         // in-memory cache refreshed on changes

// ─── DOM References ──────────────────────────────────────────────────────────
const cardGrid = document.getElementById('card-grid');
const emptyState = document.getElementById('empty-state');
const fab = document.getElementById('fab');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const inputTitle = document.getElementById('input-title');
const inputText = document.getElementById('input-text');
const btnSave = document.getElementById('btn-save');
const btnCancel = document.getElementById('btn-cancel');
const charCount = document.getElementById('char-count');
const toastEl = document.getElementById('toast');
const searchInput = document.getElementById('search-input');
const confirmOverlay = document.getElementById('confirm-overlay');
const btnConfirmDel = document.getElementById('btn-confirm-delete');
const btnCancelDel = document.getElementById('btn-cancel-delete');

// Action Bar DOM
const btnFilter = document.getElementById('btn-filter');
const filterCountBadge = document.getElementById('filter-count');
const btnOpenTags = document.getElementById('btn-open-tags');
const btnOpenBackup = document.getElementById('btn-open-backup');

// Filter Modal DOM
const filterOverlay = document.getElementById('filter-overlay');
const filterTagSelector = document.getElementById('filter-tag-selector');
const btnCloseFilter = document.getElementById('btn-close-filter');
const btnClearFilters = document.getElementById('btn-clear-filters');
const btnApplyFilters = document.getElementById('btn-apply-filters');

// Tag-specific DOM
const tagSelector = document.getElementById('tag-selector');
const tagManagerOverlay = document.getElementById('tag-manager-overlay');
const tagNameInput = document.getElementById('tag-name-input');
const colorPicker = document.getElementById('color-picker');
const tagList = document.getElementById('tag-list');
const btnSaveTag = document.getElementById('btn-save-tag');
const btnSaveTagLabel = document.getElementById('btn-save-tag-label');
const btnCloseTagManager = document.getElementById('btn-close-tag-manager');

// Backup DOM
const backupOverlay = document.getElementById('backup-overlay');
const btnCloseBackup = document.getElementById('btn-close-backup');
const btnExportBackup = document.getElementById('btn-export-backup');
const btnImportBackup = document.getElementById('btn-import-backup');
const inputImportFile = document.getElementById('input-import-file');

let pendingDeleteId = null;
let selectedColor = TAG_COLORS[0].hex;

// ═══════════════════════════════════════════════════════════════════════════
// TAG HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function refreshTags() {
    allTagsCache = await getAllTags();
}

function getTagById(id) {
    return allTagsCache.find(t => t.id === id);
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDER — Cards
// ═══════════════════════════════════════════════════════════════════════════

async function renderCards(filter = '') {
    const prompts = await getAllPrompts();
    let filtered = prompts;

    // Text filter
    if (filter) {
        const q = filter.toLowerCase();
        filtered = filtered.filter(p =>
            (p.title && p.title.toLowerCase().includes(q)) ||
            p.text.toLowerCase().includes(q));
    }

    // Tag filter (OR logic: show prompt if it has ANY of the active filter tags)
    if (activeFilterTagIds.length > 0) {
        filtered = filtered.filter(p =>
            p.tags && p.tags.some(tid => activeFilterTagIds.includes(tid))
        );
    }

    // Sort by Pin (Pinned first) then by createdAt (Recent first)
    filtered.sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
            return b.isPinned ? 1 : -1;
        }
        return (b.createdAt || 0) - (a.createdAt || 0);
    });

    cardGrid.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = `card animate-in ${p.isPinned ? 'pinned' : ''}`;
        card.dataset.id = p.id;

        // Build tag pills HTML
        let tagPillsHtml = '';
        if (p.tags && p.tags.length > 0) {
            const pills = p.tags.map(tid => {
                const tag = getTagById(tid);
                if (!tag) return '';
                return `<span class="tag-pill" style="--tag-color: ${tag.color}">${escapeHtml(tag.name)}</span>`;
            }).join('');
            if (pills) tagPillsHtml = `<div class="card-tags">${pills}</div>`;
        }

        card.innerHTML = `
      <div class="card-header">
        ${p.title ? `<h3 class="card-title">${escapeHtml(p.title)}</h3>` : ''}
        <span class="card-date">${formatDate(p.createdAt)}</span>
      </div>
      ${tagPillsHtml}
      <p class="card-text">${escapeHtml(p.text)}</p>
      <div class="card-actions">
        <button class="btn-icon btn-play" title="Enviar para o Gemini" aria-label="Enviar para Gemini">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <button class="btn-icon btn-pin ${p.isPinned ? 'active' : ''}" title="${p.isPinned ? 'Desafixar' : 'Fixar no topo'}" aria-label="Fixar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M21 10V8l-2-2h-3L13 2 11 4v4l-4 4-2-2v4l2 2v3l2 2h4l2-2v-3l2-2z"/>
          </svg>
        </button>
        <button class="btn-icon btn-copy" title="Copiar texto" aria-label="Copiar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        <button class="btn-icon btn-edit" title="Editar" aria-label="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon btn-delete" title="Remover" aria-label="Remover">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    `;

        card.querySelector('.btn-play').addEventListener('click', () => sharePrompt(p));
        card.querySelector('.btn-pin').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn.classList.add('shake');
            await togglePromptPin(p.id);
            renderCards(searchInput.value);
        });
        card.querySelector('.btn-copy').addEventListener('click', () => copyPrompt(p));
        card.querySelector('.btn-edit').addEventListener('click', () => openEditModal(p));
        card.querySelector('.btn-delete').addEventListener('click', () => confirmDelete(p.id));

        cardGrid.appendChild(card);
    });
}

// ─── Action Bar & Filters ───────────────────────────────────────────────────

function updateActionBar() {
    const count = activeFilterTagIds.length;
    if (count > 0) {
        filterCountBadge.textContent = count;
        filterCountBadge.classList.remove('hidden');
        btnFilter.classList.add('active');
    } else {
        filterCountBadge.classList.add('hidden');
        btnFilter.classList.remove('active');
    }
}

function openFilterModal() {
    renderFilterTagSelector();
    filterOverlay.classList.add('visible');
}

function closeFilterModal() {
    filterOverlay.classList.remove('visible');
}

function renderFilterTagSelector() {
    filterTagSelector.innerHTML = '';

    if (allTagsCache.length === 0) {
        filterTagSelector.innerHTML = '<span class="tag-selector-empty">Nenhuma tag disponível para filtrar.</span>';
        return;
    }

    allTagsCache.forEach(tag => {
        const pill = document.createElement('button');
        pill.type = 'button';
        const isSelected = activeFilterTagIds.includes(tag.id);
        pill.className = `tag-pill-selectable ${isSelected ? 'selected' : ''}`;
        pill.style.setProperty('--tag-color', tag.color);
        pill.innerHTML = `<span class="tag-pill-dot"></span>${escapeHtml(tag.name)}`;
        pill.addEventListener('click', () => {
            if (activeFilterTagIds.includes(tag.id)) {
                activeFilterTagIds = activeFilterTagIds.filter(id => id !== tag.id);
            } else {
                activeFilterTagIds.push(tag.id);
            }
            renderFilterTagSelector();
        });
        filterTagSelector.appendChild(pill);
    });
}

btnApplyFilters.addEventListener('click', () => {
    updateActionBar();
    renderCards(searchInput.value);
    closeFilterModal();
});

btnClearFilters.addEventListener('click', () => {
    activeFilterTagIds = [];
    renderFilterTagSelector();
});

btnFilter.addEventListener('click', openFilterModal);
btnCloseFilter.addEventListener('click', closeFilterModal);
filterOverlay.addEventListener('click', e => {
    if (e.target === filterOverlay) closeFilterModal();
});

btnOpenTags.addEventListener('click', openTagManager);
btnOpenBackup.addEventListener('click', openBackupModal);

// ═══════════════════════════════════════════════════════════════════════════
// RENDER — Tag Selector (inside prompt modal)
// ═══════════════════════════════════════════════════════════════════════════

function renderTagSelector() {
    tagSelector.innerHTML = '';

    if (allTagsCache.length === 0) {
        tagSelector.innerHTML = '<span class="tag-selector-empty">Nenhuma tag criada. <button class="link-btn" id="btn-open-tag-manager-inline">Criar tags</button></span>';
        const inlineBtn = tagSelector.querySelector('#btn-open-tag-manager-inline');
        if (inlineBtn) inlineBtn.addEventListener('click', () => { closeModal(); openTagManager(); });
        return;
    }

    allTagsCache.forEach(tag => {
        const pill = document.createElement('button');
        pill.type = 'button';
        const isSelected = selectedTagIds.includes(tag.id);
        pill.className = `tag-pill-selectable ${isSelected ? 'selected' : ''}`;
        pill.style.setProperty('--tag-color', tag.color);
        pill.innerHTML = `<span class="tag-pill-dot"></span>${escapeHtml(tag.name)}`;
        pill.addEventListener('click', () => {
            if (selectedTagIds.includes(tag.id)) {
                selectedTagIds = selectedTagIds.filter(id => id !== tag.id);
            } else {
                selectedTagIds.push(tag.id);
            }
            renderTagSelector();
        });
        tagSelector.appendChild(pill);
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// Share (Web Share API) — sends ONLY text, never tags
// ═══════════════════════════════════════════════════════════════════════════

async function sharePrompt(p) {
    const shareText = p.text;

    if (navigator.share) {
        try {
            await navigator.share({ text: shareText });
            showToast('Prompt compartilhado! Selecione o Gemini.');
        } catch (err) {
            if (err.name !== 'AbortError') {
                fallbackShare(shareText);
            }
        }
    } else {
        fallbackShare(shareText);
    }
}

function fallbackShare(text) {
    copyToClipboard(text, true);
    showToast('Texto copiado! Cole no Gemini.', 'info');
}

// ─── Copy — sends ONLY text ─────────────────────────────────────────────
async function copyPrompt(p) {
    copyToClipboard(p.text);
}

function copyToClipboard(text, silent = false) {
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            if (!silent) showToast('Copiado para a área de transferência!');
        });
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        if (!silent) showToast('Copiado!');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Prompt Modal (Add / Edit)
// ═══════════════════════════════════════════════════════════════════════════

function openAddModal() {
    editingId = null;
    selectedTagIds = [];
    modalTitle.textContent = 'Novo Prompt';
    inputTitle.value = '';
    inputText.value = '';
    updateCharCount();
    renderTagSelector();
    modal.classList.add('visible');
    inputTitle.focus();
}

function openEditModal(p) {
    editingId = p.id;
    selectedTagIds = (p.tags || []).slice();
    modalTitle.textContent = 'Editar Prompt';
    inputTitle.value = p.title || '';
    inputText.value = p.text;
    updateCharCount();
    renderTagSelector();
    modal.classList.add('visible');
    inputText.focus();
}

function closeModal() {
    modal.classList.remove('visible');
    editingId = null;
    selectedTagIds = [];
}

function updateCharCount() {
    charCount.textContent = `${inputText.value.length} caracteres`;
}

// ─── Save Prompt ─────────────────────────────────────────────────────────
async function savePrompt() {
    const title = inputTitle.value.trim();
    const text = inputText.value.trim();

    if (!text) {
        inputText.classList.add('shake');
        inputText.focus();
        setTimeout(() => inputText.classList.remove('shake'), 500);
        showToast('O texto do prompt não pode ser vazio.', 'error');
        return;
    }

    if (editingId !== null) {
        await updatePrompt(editingId, title, text, selectedTagIds);
        showToast('Prompt atualizado!');
    } else {
        await addPrompt(title, text, selectedTagIds);
        showToast('Prompt salvo!');
    }

    closeModal();
    renderCards(searchInput.value);
}

// ─── Delete ───────────────────────────────────────────────────────────────
function confirmDelete(id) {
    pendingDeleteId = id;
    confirmOverlay.classList.add('visible');
}

btnConfirmDel.addEventListener('click', async () => {
    if (pendingDeleteId !== null) {
        await deletePrompt(pendingDeleteId);
        showToast('Prompt removido.', 'info');
        pendingDeleteId = null;
    }
    confirmOverlay.classList.remove('visible');
    renderCards(searchInput.value);
});

btnCancelDel.addEventListener('click', () => {
    pendingDeleteId = null;
    confirmOverlay.classList.remove('visible');
});

// ═══════════════════════════════════════════════════════════════════════════
// Tag Manager Modal
// ═══════════════════════════════════════════════════════════════════════════

function openTagManager() {
    editingTagId = null;
    tagNameInput.value = '';
    selectedColor = TAG_COLORS[0].hex;
    btnSaveTagLabel.textContent = 'Criar Tag';
    renderColorPicker();
    renderTagList();
    tagManagerOverlay.classList.add('visible');
    tagNameInput.focus();
}

function closeTagManager() {
    tagManagerOverlay.classList.remove('visible');
    editingTagId = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Backup Modal
// ═══════════════════════════════════════════════════════════════════════════

function openBackupModal() {
    backupOverlay.classList.add('visible');
}

function closeBackupModal() {
    backupOverlay.classList.remove('visible');
}

btnCloseBackup.addEventListener('click', closeBackupModal);
backupOverlay.addEventListener('click', e => {
    if (e.target === backupOverlay) closeBackupModal();
});

function renderColorPicker() {
    colorPicker.innerHTML = '';
    TAG_COLORS.forEach(c => {
        const circle = document.createElement('button');
        circle.type = 'button';
        circle.className = `color-circle ${selectedColor === c.hex ? 'selected' : ''}`;
        circle.style.background = c.hex;
        circle.title = c.name;
        circle.addEventListener('click', () => {
            selectedColor = c.hex;
            renderColorPicker();
        });
        colorPicker.appendChild(circle);
    });
}

function renderTagList() {
    tagList.innerHTML = '';
    if (allTagsCache.length === 0) {
        tagList.innerHTML = '<p class="tag-list-empty">Nenhuma tag criada ainda.</p>';
        return;
    }

    allTagsCache.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'tag-list-item';
        item.innerHTML = `
      <span class="tag-pill" style="--tag-color: ${tag.color}">${escapeHtml(tag.name)}</span>
      <div class="tag-list-actions">
        <button class="btn-icon-xs btn-tag-edit" title="Editar" aria-label="Editar tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon-xs btn-tag-delete" title="Remover" aria-label="Remover tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    `;

        item.querySelector('.btn-tag-edit').addEventListener('click', () => {
            editingTagId = tag.id;
            tagNameInput.value = tag.name;
            selectedColor = tag.color;
            btnSaveTagLabel.textContent = 'Atualizar';
            renderColorPicker();
            tagNameInput.focus();
        });

        item.querySelector('.btn-tag-delete').addEventListener('click', async () => {
            await deleteTag(tag.id);
            await refreshTags();
            
            // Remove from active filters if it was there
            activeFilterTagIds = activeFilterTagIds.filter(id => id !== tag.id);
            
            renderTagList();
            updateActionBar();
            renderCards(searchInput.value);
            showToast('Tag removida.', 'info');
        });

        tagList.appendChild(item);
    });
}

btnSaveTag.addEventListener('click', async () => {
    const name = tagNameInput.value.trim();
    if (!name) {
        tagNameInput.classList.add('shake');
        tagNameInput.focus();
        setTimeout(() => tagNameInput.classList.remove('shake'), 500);
        showToast('O nome da tag não pode ser vazio.', 'error');
        return;
    }

    if (editingTagId !== null) {
        await updateTag(editingTagId, name, selectedColor);
        showToast('Tag atualizada!');
        editingTagId = null;
        btnSaveTagLabel.textContent = 'Criar Tag';
    } else {
        await addTag(name, selectedColor);
        showToast('Tag criada!');
    }

    tagNameInput.value = '';
    selectedColor = TAG_COLORS[0].hex;
    await refreshTags();
    renderColorPicker();
    renderTagList();
    updateActionBar();
    renderTagSelector();
    renderCards(searchInput.value); // In case tag was renamed/updated in cards
});

btnCloseTagManager.addEventListener('click', closeTagManager);
tagManagerOverlay.addEventListener('click', e => {
    if (e.target === tagManagerOverlay) closeTagManager();
});

// ═══════════════════════════════════════════════════════════════════════════
// Toast
// ═══════════════════════════════════════════════════════════════════════════

let toastTimer;
function showToast(msg, type = 'success') {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.className = `toast ${type} visible`;
    toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 3000);
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(ts) {
    return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ═══════════════════════════════════════════════════════════════════════════
// Event Listeners
// ═══════════════════════════════════════════════════════════════════════════

fab.addEventListener('click', openAddModal);
btnSave.addEventListener('click', savePrompt);
btnCancel.addEventListener('click', closeModal);
inputText.addEventListener('input', updateCharCount);
searchInput.addEventListener('input', () => renderCards(searchInput.value));

modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
confirmOverlay.addEventListener('click', e => {
    if (e.target === confirmOverlay) {
        pendingDeleteId = null;
        confirmOverlay.classList.remove('visible');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeModal();
        closeTagManager();
        closeBackupModal();
        closeFilterModal();
        confirmOverlay.classList.remove('visible');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && modal.classList.contains('visible')) {
        savePrompt();
    }
});

// ─── Handle share-target URL params ──────────────────────────────────────
(function handleShareTarget() {
    const params = new URLSearchParams(location.search);
    const sharedText = params.get('text') || '';
    const sharedTitle = params.get('title') || '';
    if (sharedText) {
        history.replaceState({}, '', '/PWANota/');
        inputText.value = sharedText;
        updateCharCount();
        modal.classList.add('visible');
        modalTitle.textContent = 'Salvar Prompt Recebido';
    }
})();

// ═══════════════════════════════════════════════════════════════════════════
// Backup Logic
// ═══════════════════════════════════════════════════════════════════════════

async function handleExportBackup() {
    try {
        const data = await exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ainote-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Backup exportado com sucesso!');
    } catch (err) {
        console.error(err);
        showToast('Erro ao exportar backup.', 'error');
    }
}

async function handleImportBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            
            if (confirm('Atenção: Isso substituirá TODOS os seus dados atuais. Deseja continuar?')) {
                await importAllData(data);
                await refreshTags();
                activeFilterTagIds = [];
                updateActionBar();
                renderCards();
                showToast('Dados restaurados com sucesso!');
                closeBackupModal();
            }
        } catch (err) {
            console.error(err);
            showToast('Erro ao importar arquivo. Verifique o formato.', 'error');
        } finally {
            inputImportFile.value = ''; // Reset input
        }
    };
    reader.readAsText(file);
}

btnExportBackup.addEventListener('click', handleExportBackup);
btnImportBackup.addEventListener('click', () => inputImportFile.click());
inputImportFile.addEventListener('change', handleImportBackup);

// ─── Init ─────────────────────────────────────────────────────────────────
(async function init() {
    await refreshTags();
    updateActionBar();
    renderCards();
})();
