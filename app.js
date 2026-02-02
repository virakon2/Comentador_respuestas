// ===== State Management =====
const state = {
    comments: [],
    currentSelection: null,
    originalText: '',
    editingId: null
};

// ===== DOM Elements =====
const elements = {
    // Input section
    aiResponse: document.getElementById('aiResponse'),
    processBtn: document.getElementById('processBtn'),
    clearBtn: document.getElementById('clearBtn'),
    inputSection: document.getElementById('inputSection'),

    // Content section
    contentSection: document.getElementById('contentSection'),
    renderedContent: document.getElementById('renderedContent'),
    backToEdit: document.getElementById('backToEdit'),

    // Comments panel
    commentsPanel: document.getElementById('commentsPanel'),
    commentsList: document.getElementById('commentsList'),
    commentCount: document.getElementById('commentCount'),
    exportBtn: document.getElementById('exportBtn'),

    // Comment modal
    commentModal: document.getElementById('commentModal'),
    selectedTextPreview: document.getElementById('selectedTextPreview'),
    commentInput: document.getElementById('commentInput'),
    closeModal: document.getElementById('closeModal'),
    cancelComment: document.getElementById('cancelComment'),
    saveComment: document.getElementById('saveComment'),

    // Export modal
    exportModal: document.getElementById('exportModal'),
    exportedText: document.getElementById('exportedText'),
    closeExportModal: document.getElementById('closeExportModal'),
    copyExport: document.getElementById('copyExport'),

    // FAB
    addCommentFab: document.getElementById('addCommentFab')
};

// ===== Initialize =====
function init() {
    setupEventListeners();
    configureMarked();
}

function configureMarked() {
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false
    });
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Process button
    elements.processBtn.addEventListener('click', processContent);

    // Clear button
    elements.clearBtn.addEventListener('click', clearAll);

    // Back to edit
    elements.backToEdit.addEventListener('click', backToEdit);

    // Text selection in rendered content
    elements.renderedContent.addEventListener('mouseup', handleTextSelection);

    // FAB click
    elements.addCommentFab.addEventListener('click', openCommentModal);

    // Modal controls
    elements.closeModal.addEventListener('click', closeCommentModal);
    elements.cancelComment.addEventListener('click', closeCommentModal);
    elements.saveComment.addEventListener('click', saveComment);

    // Export
    elements.exportBtn.addEventListener('click', openExportModal);
    elements.closeExportModal.addEventListener('click', closeExportModal);
    elements.copyExport.addEventListener('click', copyToClipboard);

    // Close modal on overlay click
    elements.commentModal.addEventListener('click', (e) => {
        if (e.target === elements.commentModal) closeCommentModal();
    });
    elements.exportModal.addEventListener('click', (e) => {
        if (e.target === elements.exportModal) closeExportModal();
    });

    // Handle keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Hide FAB when clicking outside
    document.addEventListener('mousedown', (e) => {
        if (!elements.addCommentFab.contains(e.target) &&
            !elements.renderedContent.contains(e.target)) {
            elements.addCommentFab.classList.add('hidden');
        }
    });
}

function handleKeyboard(e) {
    // Escape to close modals
    if (e.key === 'Escape') {
        if (!elements.commentModal.classList.contains('hidden')) {
            closeCommentModal();
        }
        if (!elements.exportModal.classList.contains('hidden')) {
            closeExportModal();
        }
    }

    // Ctrl+Enter to save comment
    if (e.ctrlKey && e.key === 'Enter') {
        if (!elements.commentModal.classList.contains('hidden')) {
            saveComment();
        }
    }
}

// ===== Content Processing =====
function processContent() {
    const text = elements.aiResponse.value.trim();

    if (!text) {
        showNotification('Por favor, ingresa una respuesta para procesar', 'warning');
        return;
    }

    state.originalText = text;

    // Parse markdown
    const html = marked.parse(text);
    elements.renderedContent.innerHTML = html;

    // Switch views
    elements.inputSection.classList.add('hidden');
    elements.contentSection.classList.remove('hidden');

    showNotification('Contenido procesado. Selecciona texto para comentar.', 'success');
}

function backToEdit() {
    elements.inputSection.classList.remove('hidden');
    elements.contentSection.classList.add('hidden');
    elements.addCommentFab.classList.add('hidden');
}

function clearAll() {
    elements.aiResponse.value = '';
    state.comments = [];
    state.originalText = '';
    state.editingId = null;
    updateCommentsUI();
    showNotification('Contenido limpiado', 'info');
}

// ===== Text Selection =====
function handleTextSelection() {
    // If editing, don't allow new selection to interfere (optional, but good UX)
    if (state.editingId) return;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && selectedText.length > 0) {
        state.currentSelection = {
            text: selectedText,
            range: selection.getRangeAt(0).cloneRange()
        };

        // Show FAB
        elements.addCommentFab.classList.remove('hidden');

        // Position FAB near selection
        // Since FAB is position: fixed, we use viewport coordinates directly
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        elements.addCommentFab.style.top = `${rect.bottom + 10}px`;
        elements.addCommentFab.style.left = `${rect.left}px`;
        elements.addCommentFab.style.right = 'auto';
        elements.addCommentFab.style.bottom = 'auto';
    } else {
        elements.addCommentFab.classList.add('hidden');
        state.currentSelection = null;
    }
}

// ===== Comment Modal =====
function openCommentModal() {
    if (!state.currentSelection) return;

    // If we're opening via FAB, ensure we're not in edit mode
    state.editingId = null;
    elements.saveComment.textContent = 'Guardar Comentario';

    elements.selectedTextPreview.textContent = state.currentSelection.text;
    elements.commentInput.value = '';
    elements.commentModal.classList.remove('hidden');
    elements.addCommentFab.classList.add('hidden');

    // Focus input
    setTimeout(() => elements.commentInput.focus(), 100);
}

function editComment(commentId) {
    const comment = state.comments.find(c => c.id === commentId);
    if (!comment) return;

    state.editingId = commentId;
    state.currentSelection = { text: comment.selectedText }; // Mock selection for display

    elements.selectedTextPreview.textContent = comment.selectedText;
    elements.commentInput.value = comment.comment;

    elements.saveComment.textContent = 'Actualizar Comentario';
    elements.commentModal.classList.remove('hidden');

    setTimeout(() => elements.commentInput.focus(), 100);
}

function closeCommentModal() {
    elements.commentModal.classList.add('hidden');
    if (!state.editingId) {
        state.currentSelection = null;
    }
    state.editingId = null;
    elements.saveComment.textContent = 'Guardar Comentario';
}

function saveComment() {
    const commentText = elements.commentInput.value.trim();

    if (!commentText) {
        showNotification('Por favor, escribe un comentario', 'warning');
        return;
    }

    // UPDATE EXISTING COMMENT
    if (state.editingId) {
        const commentIndex = state.comments.findIndex(c => c.id === state.editingId);
        if (commentIndex !== -1) {
            state.comments[commentIndex].comment = commentText;
            // We don't update timestamp or selectedText on edit usually

            updateCommentsUI();
            closeCommentModal();
            showNotification('Comentario actualizado', 'success');
            return;
        }
    }

    // CREATE NEW COMMENT
    if (!state.currentSelection) {
        showNotification('Error: No hay texto seleccionado', 'error');
        return;
    }

    // Create comment object
    const comment = {
        id: Date.now(),
        selectedText: state.currentSelection.text,
        comment: commentText,
        timestamp: new Date().toISOString()
    };

    // Add to state
    state.comments.push(comment);

    // Highlight the text in the rendered content
    highlightText(state.currentSelection.range, comment.id);

    // Update UI
    updateCommentsUI();
    closeCommentModal();

    showNotification('Comentario agregado', 'success');
}

function highlightText(range, commentId) {
    try {
        const span = document.createElement('span');
        span.className = 'highlighted-text';
        span.dataset.commentId = commentId;
        span.title = 'Click para ver el comentario';

        span.addEventListener('click', () => {
            const comment = state.comments.find(c => c.id === commentId);
            if (comment) {
                scrollToComment(commentId);
            }
        });

        range.surroundContents(span);
    } catch (e) {
        // If surroundContents fails (e.g., selection spans multiple elements)
        // Just proceed without highlighting
        console.log('Could not highlight text:', e);
    }
}

function scrollToComment(commentId) {
    const card = document.querySelector(`[data-card-id="${commentId}"]`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.animation = 'none';
        card.offsetHeight; // Trigger reflow
        card.style.animation = 'pulse 0.5s ease';
    }
}

// ===== Comments UI =====
function updateCommentsUI() {
    elements.commentCount.textContent = state.comments.length;

    // Update highlight numbers in text
    updateHighlightIndexes();

    if (state.comments.length === 0) {
        elements.commentsList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📝</span>
                <p>Aún no hay comentarios</p>
                <span class="empty-hint">Selecciona texto del contenido para agregar tu primer comentario</span>
            </div>
        `;
        elements.exportBtn.disabled = true;
    } else {
        elements.commentsList.innerHTML = state.comments.map((comment, index) => `
            <div class="comment-card" data-card-id="${comment.id}">
                <div class="comment-card-header">
                    <span class="comment-number">${index + 1}</span>
                    <div class="comment-actions">
                        <button class="comment-edit" onclick="editComment(${comment.id})" title="Editar comentario">
                            ✏️
                        </button>
                        <button class="comment-delete" onclick="deleteComment(${comment.id})" title="Eliminar comentario">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="comment-quoted">"${escapeHtml(truncateText(comment.selectedText, 100))}"</div>
                <div class="comment-text">${escapeHtml(comment.comment)}</div>
            </div>
        `).join('');
        elements.exportBtn.disabled = false;
    }
}

function deleteComment(commentId) {
    // Remove from state
    state.comments = state.comments.filter(c => c.id !== commentId);

    // Remove highlight
    const highlight = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (highlight) {
        const parent = highlight.parentNode;
        while (highlight.firstChild) {
            parent.insertBefore(highlight.firstChild, highlight);
        }
        parent.removeChild(highlight);
    }

    // Update UI
    updateCommentsUI();
    showNotification('Comentario eliminado', 'info');
}

function updateHighlightIndexes() {
    state.comments.forEach((comment, index) => {
        const span = document.querySelector(`.highlighted-text[data-comment-id="${comment.id}"]`);
        if (span) {
            span.dataset.index = index + 1;
        }
    });
}

// Make deleteComment available globally
window.deleteComment = deleteComment;
window.editComment = editComment;

// ===== Export =====
function openExportModal() {
    if (state.comments.length === 0) return;

    const exportText = generateExportText();
    elements.exportedText.value = exportText;
    elements.exportModal.classList.remove('hidden');
}

function closeExportModal() {
    elements.exportModal.classList.add('hidden');
}

function generateExportText() {
    const separator = '═'.repeat(50);
    const now = new Date().toLocaleString('es-ES');

    let output = '';

    state.comments.forEach((comment, index) => {
        output += `[${index + 1}] TEXTO COMENTADO:\n`;
        output += `    "${comment.selectedText}"\n\n`;
        output += `    COMENTARIO:\n`;
        output += `    ${comment.comment}\n`;
        output += `\n${'─'.repeat(40)}\n\n`;
    });

    return output;
}

async function copyToClipboard() {
    try {
        await navigator.clipboard.writeText(elements.exportedText.value);
        showNotification('¡Copiado al portapapeles!', 'success');

        // Visual feedback
        const originalText = elements.copyExport.innerHTML;
        elements.copyExport.innerHTML = '<span class="btn-icon">✓</span> Copiado';
        setTimeout(() => {
            elements.copyExport.innerHTML = originalText;
        }, 2000);
    } catch (err) {
        // Fallback for older browsers
        elements.exportedText.select();
        document.execCommand('copy');
        showNotification('¡Copiado al portapapeles!', 'success');
    }
}

// ===== Utility Functions =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${getNotificationIcon(type)}</span>
        <span class="notification-message">${message}</span>
    `;

    // Add styles if not already present
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                bottom: 2rem;
                left: 50%;
                transform: translateX(-50%);
                padding: 0.75rem 1.5rem;
                border-radius: 50px;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.9rem;
                font-weight: 500;
                z-index: 2000;
                animation: notificationIn 0.3s ease, notificationOut 0.3s ease 2.7s;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }
            .notification-success {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
            }
            .notification-warning {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
            }
            .notification-error {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
            }
            .notification-info {
                background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
                color: white;
            }
            @keyframes notificationIn {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
            @keyframes notificationOut {
                from {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Remove after animation
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        success: '✓',
        warning: '⚠️',
        error: '✕',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

// ===== Initialize on DOM ready =====
document.addEventListener('DOMContentLoaded', init);
