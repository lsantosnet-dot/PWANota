/* ===========================
   PWA Prompt Manager - app.js
   =========================== */

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/PWANota/service-worker.js').catch(console.error);
}

// ─── State ───────────────────────────────────────────────────────────────────
let editingId = null;

// ─── DOM References ──────────────────────────────────────────────────────────
const cardGrid = document.getElementById('card-grid');
const emptyState = document.getElementById('empty-state');
const fab = document.getElementById('fab');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const inputText = document.getElementById('input-text');
const btnSave = document.getElementById('btn-save');
const btnCancel = document.getElementById('btn-cancel');
const charCount = document.getElementById('char-count');
const toastEl = document.getElementById('toast');
const searchInput = document.getElementById('search-input');
const confirmOverlay = document.getElementById('confirm-overlay');
const btnConfirmDel = document.getElementById('btn-confirm-delete');
const btnCancelDel = document.getElementById('btn-cancel-delete');
let pendingDeleteId = null;

// ─── Render ───────────────────────────────────────────────────────────────────
async function renderCards(filter = '') {
    const prompts = await getAllPrompts();
    const filtered = filter
        ? prompts.filter(p =>
            p.text.toLowerCase().includes(filter.toLowerCase()))
        : prompts;

    cardGrid.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card animate-in';
        card.dataset.id = p.id;
        card.innerHTML = `
      <div class="card-header">
        <span class="card-date">${formatDate(p.createdAt)}</span>
      </div>
      <p class="card-text">${escapeHtml(p.text)}</p>
      <div class="card-actions">
        <button class="btn-icon btn-play" title="Enviar para o Gemini" aria-label="Enviar para Gemini">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
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
        card.querySelector('.btn-copy').addEventListener('click', () => copyPrompt(p));
        card.querySelector('.btn-edit').addEventListener('click', () => openEditModal(p));
        card.querySelector('.btn-delete').addEventListener('click', () => confirmDelete(p.id));

        cardGrid.appendChild(card);
    });
}

// ─── Share (Web Share API) ────────────────────────────────────────────────────
async function sharePrompt(p) {
    const shareText = p.text;

    if (navigator.share) {
        try {
            await navigator.share({ text: shareText });
            showToast('Prompt compartilhado! Selecione o Gemini.');
        } catch (err) {
            // User cancelled share — not an error we need to show
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

// ─── Copy ─────────────────────────────────────────────────────────────────────
async function copyPrompt(p) {
    const text = p.text;
    copyToClipboard(text);
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

// ─── Modal ────────────────────────────────────────────────────────────────────
function openAddModal() {
    editingId = null;
    modalTitle.textContent = 'Novo Prompt';
    inputText.value = '';
    updateCharCount();
    modal.classList.add('visible');
    inputText.focus();
}

function openEditModal(p) {
    editingId = p.id;
    modalTitle.textContent = 'Editar Prompt';
    inputText.value = p.text;
    updateCharCount();
    modal.classList.add('visible');
    inputText.focus();
}

function closeModal() {
    modal.classList.remove('visible');
    editingId = null;
}

function updateCharCount() {
    charCount.textContent = `${inputText.value.length} caracteres`;
}

// ─── Save ─────────────────────────────────────────────────────────────────────
async function savePrompt() {
    const title = '';
    const text = inputText.value.trim();

    if (!text) {
        inputText.classList.add('shake');
        inputText.focus();
        setTimeout(() => inputText.classList.remove('shake'), 500);
        showToast('O texto do prompt não pode ser vazio.', 'error');
        return;
    }

    if (editingId !== null) {
        await updatePrompt(editingId, '', text);
        showToast('Prompt atualizado!');
    } else {
        await addPrompt('', text);
        showToast('Prompt salvo!');
    }

    closeModal();
    renderCards(searchInput.value);
}

// ─── Delete ───────────────────────────────────────────────────────────────────
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

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.className = `toast ${type} visible`;
    toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 3000);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(ts) {
    return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ─── Event Listeners ─────────────────────────────────────────────────────────
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
        confirmOverlay.classList.remove('visible');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && modal.classList.contains('visible')) {
        savePrompt();
    }
});

// ─── Handle share-target URL params ──────────────────────────────────────────
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

// ─── Init ─────────────────────────────────────────────────────────────────────
renderCards();
