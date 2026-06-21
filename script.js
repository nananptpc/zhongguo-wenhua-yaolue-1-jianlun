// ==========================================================================
// HỆ THỐNG HỌC TẬP SONG NGỮ TRUNG - VIỆT (FULL FEATURES)
// ==========================================================================

// ===== 1. KHO LƯU TRỮ DỮ LIỆU =====
let docVault = JSON.parse(localStorage.getItem('docVault_v5')) || {};
let termVault = JSON.parse(localStorage.getItem('termVault_v5')) || {};
let quizVault = JSON.parse(localStorage.getItem('quizVault_v5')) || {};

let activeDocName = localStorage.getItem('activeDocName_v5') || '';
let activeTermName = localStorage.getItem('activeTermName_v5') || '';
let activeQuizName = localStorage.getItem('activeQuizName_v5') || '';

let notes = JSON.parse(localStorage.getItem('studyNotes_v5')) || [];
let scoreHistory = JSON.parse(localStorage.getItem('quizScoreHistory_v5')) || [];

let quizQuestions = [];
let userAnswers = [];
let currentQuizSection = 0;
const questionsPerSection = 50;

// Biến cho popup
let isPopupVisible = false;
let selectedText = '';
let selectedBlock = 'N/A';
let currentNoteView = 'grid'; // grid, list, original, detailed

// Biến cho bulk actions
let selectedNotes = new Set();

// ===== 2. KHỞI TẠO TRANG =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Trang đã tải xong, khởi tạo hệ thống...');
    
    initTabs();
    initDarkMode();
    initSidebar();
    initFileImports();
    initHighlightSystem();
    initQuizEngine();
    initNoteViewControls();
    initBulkActions();
    autoLoadSavedData();
    
    console.log('✅ Hệ thống đã sẵn sàng!');
});

// ===== 3. HÀM KHỞI TẠO CÁC THÀNH PHẦN =====

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const target = document.getElementById(this.dataset.tab);
            if (target) target.classList.add('active');
            if (this.dataset.tab === 'tab-notes') {
                renderNotes();
                updateBulkActionsUI();
            }
        });
    });
}

function initDarkMode() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark');
            this.textContent = document.body.classList.contains('dark') ? '☀️ Light' : '🌙 Dark';
        });
    }
}

function initSidebar() {
    const sidebar = document.getElementById('progressSidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }
}

function initFileImports() {
    const docInput = document.getElementById('csvDocInput');
    if (docInput) {
        docInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                docVault[file.name] = evt.target.result;
                activeDocName = file.name;
                localStorage.setItem('docVault_v5', JSON.stringify(docVault));
                localStorage.setItem('activeDocName_v5', activeDocName);
                parseDocumentCSV(evt.target.result);
                renderSidebarLists();
                const docStatus = document.getElementById('docStatus');
                if (docStatus) docStatus.innerText = `✅ ${file.name}`;
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    const termInput = document.getElementById('csvTermInput');
    if (termInput) {
        termInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                termVault[file.name] = evt.target.result;
                activeTermName = file.name;
                localStorage.setItem('termVault_v5', JSON.stringify(termVault));
                localStorage.setItem('activeTermName_v5', activeTermName);
                parseTermCSV(evt.target.result);
                renderSidebarLists();
                const termStatus = document.getElementById('termStatus');
                if (termStatus) termStatus.innerText = `✅ ${file.name}`;
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    const quizInput = document.getElementById('csvQuizInput');
    if (quizInput) {
        quizInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                const csvText = evt.target.result;
                quizVault[file.name] = { csvText: csvText, answers: [] };
                activeQuizName = file.name;
                localStorage.setItem('quizVault_v5', JSON.stringify(quizVault));
                localStorage.setItem('activeQuizName_v5', activeQuizName);
                parseQuizCSV(csvText);
                renderSidebarLists();
                const quizStatus = document.getElementById('quizStatus');
                if (quizStatus) quizStatus.innerText = `✅ ${file.name}`;
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    const clearBtn = document.getElementById('clearAllCacheBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (confirm('Xóa tất cả dữ liệu đã lưu?')) {
                localStorage.clear();
                location.reload();
            }
        });
    }
}

// ===== 4. NOTE VIEW CONTROLS =====
function initNoteViewControls() {
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            viewButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentNoteView = this.dataset.view;
            renderNotes();
        });
    });
}

// ===== 5. BULK ACTIONS =====
function initBulkActions() {
    const selectAllBtn = document.getElementById('selectAllNotes');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('.note-checkbox');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
            updateBulkActionsUI();
        });
    }

    const deleteSelectedBtn = document.getElementById('deleteSelectedNotes');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', function() {
            const selected = document.querySelectorAll('.note-checkbox:checked');
            if (selected.length === 0) {
                alert('⚠️ Vui lòng chọn ít nhất một ghi chú để xóa!');
                return;
            }
            if (confirm(`Xóa ${selected.length} ghi chú đã chọn?`)) {
                const ids = Array.from(selected).map(cb => parseInt(cb.dataset.id));
                notes = notes.filter(n => !ids.includes(n.id));
                localStorage.setItem('studyNotes_v5', JSON.stringify(notes));
                renderNotes();
                updateBulkActionsUI();
            }
        });
    }

    const exportBtn = document.getElementById('exportNotesCSV');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            exportNotesCSV();
        });
    }

    const groupByBlockBtn = document.getElementById('groupByBlock');
    if (groupByBlockBtn) {
        groupByBlockBtn.addEventListener('click', function() {
            groupNotesByBlock();
        });
    }
}

function updateBulkActionsUI() {
    const checkboxes = document.querySelectorAll('.note-checkbox');
    const checked = document.querySelectorAll('.note-checkbox:checked');
    const selectAll = document.getElementById('selectAllNotes');
    if (selectAll) {
        selectAll.textContent = checkboxes.length > 0 && checked.length === checkboxes.length ? '⬜ Bỏ chọn tất cả' : '✅ Chọn tất cả';
    }
    const deleteBtn = document.getElementById('deleteSelectedNotes');
    if (deleteBtn) {
        deleteBtn.textContent = `🗑 Xóa (${checked.length})`;
    }
}

// ===== 6. EXPORT NOTES TO CSV =====
function exportNotesCSV() {
    if (notes.length === 0) {
        alert('⚠️ Không có ghi chú để xuất!');
        return;
    }

    let csv = 'ID,Text,Comment,Block,Time\n';
    notes.forEach(n => {
        const text = `"${n.text.replace(/"/g, '""')}"`;
        const comment = `"${(n.comment || '').replace(/"/g, '""')}"`;
        csv += `${n.id},${text},${comment},${n.block},${n.time}\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `notes_export_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// ===== 7. GROUP NOTES BY BLOCK =====
function groupNotesByBlock() {
    const grouped = {};
    notes.forEach(n => {
        const key = n.block || 'Unknown';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(n);
    });
    
    // Hiển thị dạng group
    const container = document.getElementById('notesList');
    if (!container) return;
    container.innerHTML = '';
    
    Object.keys(grouped).forEach(block => {
        const groupDiv = document.createElement('div');
        groupDiv.style.cssText = 'margin:1rem 0; padding:0.5rem; border:2px solid #e3a6b2; border-radius:8px;';
        groupDiv.innerHTML = `<h4 style="margin:0.5rem 0; color:#4d2d35;">📍 Đoạn ${block} (${grouped[block].length} ghi chú)</h4>`;
        
        grouped[block].forEach(note => {
            const item = createNoteItem(note);
            groupDiv.appendChild(item);
        });
        container.appendChild(groupDiv);
    });
}

// ===== 8. TẢI DỮ LIỆU ĐÃ LƯU =====
function autoLoadSavedData() {
    if (activeDocName && docVault[activeDocName]) {
        parseDocumentCSV(docVault[activeDocName]);
        const docStatus = document.getElementById('docStatus');
        if (docStatus) docStatus.innerText = `✅ ${activeDocName}`;
    }
    if (activeTermName && termVault[activeTermName]) {
        parseTermCSV(termVault[activeTermName]);
        const termStatus = document.getElementById('termStatus');
        if (termStatus) termStatus.innerText = `✅ ${activeTermName}`;
    }
    if (activeQuizName && quizVault[activeQuizName]) {
        parseQuizCSV(quizVault[activeQuizName].csvText);
        if (quizVault[activeQuizName].answers) {
            userAnswers = quizVault[activeQuizName].answers;
        }
        const quizStatus = document.getElementById('quizStatus');
        if (quizStatus) quizStatus.innerText = `✅ ${activeQuizName}`;
    }
    renderSidebarLists();
}

// ===== 9. RENDER SIDEBAR LISTS =====
function renderSidebarLists() {
    const docList = document.getElementById('historyDocsList');
    const termList = document.getElementById('historyTermsList');
    const quizList = document.getElementById('historyQuizList');
    
    if (docList) {
        docList.innerHTML = '';
        Object.keys(docVault).forEach(name => {
            const item = document.createElement('div');
            item.className = `history-item ${name === activeDocName ? 'active-history' : ''}`;
            item.textContent = `📄 ${name}`;
            item.addEventListener('click', () => {
                activeDocName = name;
                localStorage.setItem('activeDocName_v5', activeDocName);
                parseDocumentCSV(docVault[name]);
                renderSidebarLists();
                const docStatus = document.getElementById('docStatus');
                if (docStatus) docStatus.innerText = `✅ ${name}`;
            });
            docList.appendChild(item);
        });
    }

    if (termList) {
        termList.innerHTML = '';
        Object.keys(termVault).forEach(name => {
            const item = document.createElement('div');
            item.className = `history-item ${name === activeTermName ? 'active-history' : ''}`;
            item.textContent = `📚 ${name}`;
            item.addEventListener('click', () => {
                activeTermName = name;
                localStorage.setItem('activeTermName_v5', activeTermName);
                parseTermCSV(termVault[name]);
                renderSidebarLists();
                const termStatus = document.getElementById('termStatus');
                if (termStatus) termStatus.innerText = `✅ ${name}`;
            });
            termList.appendChild(item);
        });
    }

    if (quizList) {
        quizList.innerHTML = '';
        Object.keys(quizVault).forEach(name => {
            const item = document.createElement('div');
            item.className = `history-item ${name === activeQuizName ? 'active-history' : ''}`;
            item.textContent = `📝 ${name}`;
            item.addEventListener('click', () => {
                if (activeQuizName && quizVault[activeQuizName]) {
                    quizVault[activeQuizName].answers = userAnswers;
                    localStorage.setItem('quizVault_v5', JSON.stringify(quizVault));
                }
                activeQuizName = name;
                localStorage.setItem('activeQuizName_v5', activeQuizName);
                parseQuizCSV(quizVault[name].csvText);
                if (quizVault[name].answers) userAnswers = quizVault[name].answers;
                renderSidebarLists();
                const quizStatus = document.getElementById('quizStatus');
                if (quizStatus) quizStatus.innerText = `✅ ${name}`;
                const answerSection = document.getElementById('answer-section');
                if (answerSection) answerSection.style.display = 'none';
                renderQuizSection(0);
                updateQuizProgress();
            });
            quizList.appendChild(item);
        });
    }
}

// ===== 10. PARSE CSV =====
function parseCSVLine(text) {
    const lines = text.split(/\r\n|\n/);
    return lines.map(line => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }).filter(row => row.length > 0 && row.some(cell => cell !== ''));
}

// ===== 11. PARSE DOCUMENT CSV =====
function parseDocumentCSV(csvText) {
    const rows = parseCSVLine(csvText);
    const container = document.getElementById('originalContainer');
    const summary = document.getElementById('summaryContainer');
    
    if (!container || !summary) return;
    container.innerHTML = '';
    summary.innerHTML = '<div class="card">';
    
    let blockCount = 0;
    let lastBlock = null;

    rows.forEach((row, idx) => {
        if (idx === 0 && row[0] && row[0].toLowerCase().includes('type')) return;
        
        const type = row[0] ? row[0].toLowerCase().trim() : 'p';
        const zh = row[1] ? row[1].trim() : '';
        const vi = row[2] ? row[2].trim() : '';

        if (type === 'h') {
            const heading = document.createElement('div');
            heading.style.marginTop = '2.2rem';
            heading.style.borderBottom = '1px dashed #dbb1bc';
            heading.innerHTML = `<h2 style="border:none; margin:0; padding:0; font-size:1.4rem;">${zh}</h2>
                                <p style="font-family:'American Typewriter', serif; color:#7d545e; font-size:1rem; font-style:italic; margin-top:0.2rem;">${vi}</p>`;
            container.appendChild(heading);
            lastBlock = null;
        } 
        else if (lastBlock && (zh === '' || zh === '|' || zh === lastBlock.querySelector('.zh').textContent.trim())) {
            if (vi !== '') {
                const viContainer = lastBlock.querySelector('.vi');
                if (viContainer) {
                    viContainer.innerHTML += `<p style="margin-top: 0.5rem; border-left: none; padding-left: 0;">${vi}</p>`;
                }
            }
        } 
        else {
            if (zh === '' && vi === '') return;
            const block = document.createElement('div');
            block.className = 'bilingual-block';
            block.dataset.block = blockCount;
            block.dataset.index = blockCount;
            block.innerHTML = `<div class="zh">${zh}</div><div class="vi">${vi}</div>`;
            container.appendChild(block);
            lastBlock = block;

            if (zh.length > 5) {
                summary.firstChild.innerHTML += `<div class="bilingual-block" style="border-left-color: #d48291; margin: 0.8rem 0;">
                    <div class="zh" style="font-size:0.98rem;">🎯 <strong>${zh.substring(0, 45)}...</strong></div>
                    <div class="vi" style="font-size:0.92rem;">${vi}</div>
                </div>`;
            }
            blockCount++;
        }
    });
    summary.firstChild.innerHTML += '</div>';
    
    console.log(`📄 Đã tải ${blockCount} đoạn văn bản`);
}

// ===== 12. PARSE TERM CSV =====
function parseTermCSV(csvText) {
    const rows = parseCSVLine(csvText);
    const container = document.getElementById('termsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="card">';
    const card = container.firstChild;
    rows.forEach((row, idx) => {
        if (idx === 0) return;
        const zh = row[0] ? row[0].trim() : '';
        const vi = row[1] ? row[1].trim() : '';
        if (zh && vi) {
            const term = document.createElement('div');
            term.className = 'term-card';
            term.innerHTML = `<span class="term-zh">📌 ${zh}</span><span class="term-vi">${vi}</span>`;
            card.appendChild(term);
        }
    });
    // Đóng card sau khi thêm tất cả terms
    // Không cần thêm gì thêm vì card đã được tạo
}

// ===== 13. PARSE QUIZ CSV =====
function parseQuizCSV(csvText) {
    const rows = parseCSVLine(csvText);
    quizQuestions = [];
    
    rows.forEach((row, idx) => {
        if (idx === 0) return;
        if (row.length >= 6) {
            const correct = parseInt(row[5]);
            const finalCorrect = (!isNaN(correct) && correct >= 0 && correct <= 3) ? correct : 0;
            
            quizQuestions.push({
                id: idx,
                zhQ: row[0] || 'Câu hỏi trống',
                viQ: row[6] || 'Chọn đáp án đúng nhất:',
                options: [
                    row[1] || 'A',
                    row[2] || 'B',
                    row[3] || 'C',
                    row[4] || 'D'
                ],
                correct: finalCorrect
            });
        }
    });
    
    // Fix: Chỉ shuffle nếu có câu hỏi
    if (quizQuestions.length > 0) {
        shuffleQuestions();
        userAnswers = new Array(quizQuestions.length).fill(null);
        buildQuizNavigation();
        renderQuizSection(0);
        updateQuizProgress();
    }
    
    console.log(`📝 Đã tải ${quizQuestions.length} câu hỏi trắc nghiệm`);
}

// ===== 14. SHUFFLE QUESTIONS =====
function shuffleQuestions() {
    for (let i = quizQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [quizQuestions[i], quizQuestions[j]] = [quizQuestions[j], quizQuestions[i]];
    }
    quizQuestions.forEach((q, idx) => {
        q.displayId = idx + 1;
    });
}

// ===== 15. HIGHLIGHT SYSTEM =====
function initHighlightSystem() {
    const popup = document.getElementById('notePopup');
    if (!popup) {
        console.error('❌ Không tìm thấy popup!');
        return;
    }

    console.log('🖍️ Đang khởi tạo hệ thống highlight...');

    let isPopupOpen = false;

    function showPopup(text, blockIdx, x, y) {
        const preview = document.getElementById('selectedTextPreview');
        if (preview) {
            preview.textContent = text.length > 100 ? text.substring(0, 100) + '...' : text;
        }
        
        const blockInfo = document.getElementById('selectedBlockInfo');
        if (blockInfo) {
            blockInfo.textContent = `Đoạn: ${blockIdx}`;
        }

        const textarea = document.getElementById('noteContent');
        if (textarea) {
            textarea.value = '';
        }

        let left = x + window.scrollX + 10;
        let top = y + window.scrollY + 15;

        const popupWidth = 340;
        const popupHeight = 320;
        
        if (left + popupWidth > window.innerWidth + window.scrollX) {
            left = x + window.scrollX - popupWidth - 10;
        }
        if (top + popupHeight > window.innerHeight + window.scrollY) {
            top = y + window.scrollY - popupHeight - 10;
        }
        if (left < 10) left = 10;
        if (top < 10) top = 10;

        popup.style.display = 'block';
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
        
        isPopupOpen = true;
        isPopupVisible = true;
        selectedText = text;
        selectedBlock = blockIdx;

        setTimeout(() => {
            if (textarea) textarea.focus();
        }, 100);
    }

    function hidePopup() {
        popup.style.display = 'none';
        isPopupOpen = false;
        isPopupVisible = false;
    }

    document.addEventListener('mouseup', function(e) {
        if (popup.contains(e.target)) return;

        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (text.length < 2) {
            hidePopup();
            return;
        }

        const tabOriginal = document.getElementById('tab-original');
        if (!tabOriginal || !tabOriginal.classList.contains('active')) {
            hidePopup();
            return;
        }

        const container = document.getElementById('originalContainer');
        if (!container) {
            hidePopup();
            return;
        }

        let isInContainer = false;
        let node = selection.anchorNode;
        while (node && node !== document.body) {
            if (node === container || (node.parentNode && node.parentNode === container)) {
                isInContainer = true;
                break;
            }
            if (node.classList && node.classList.contains('bilingual-block')) {
                isInContainer = true;
                break;
            }
            node = node.parentNode;
        }

        if (!isInContainer) {
            hidePopup();
            return;
        }

        let blockIdx = 'N/A';
        let parent = selection.anchorNode.parentNode;
        while (parent && parent !== document.body) {
            if (parent.classList && parent.classList.contains('bilingual-block')) {
                blockIdx = parent.dataset.block || parent.dataset.index || 'N/A';
                break;
            }
            parent = parent.parentNode;
        }

        const rect = selection.getRangeAt(0).getBoundingClientRect();
        showPopup(text, blockIdx, rect.left, rect.bottom);
    });

    document.addEventListener('mousedown', function(e) {
        if (isPopupOpen && !popup.contains(e.target)) {
            const sel = window.getSelection();
            const text = sel.toString().trim();
            if (!text || text.length < 2) {
                hidePopup();
            }
        }
    });

    // Phím tắt Ctrl+Enter để lưu
    document.addEventListener('keydown', function(e) {
        if (isPopupOpen && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            saveNote();
        }
        if (e.key === 'Escape' && isPopupOpen) {
            hidePopup();
        }
    });

    const saveBtn = document.getElementById('saveNoteBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveNote);
    }

    function saveNote() {
        if (!selectedText) {
            alert('⚠️ Chưa có văn bản nào được chọn!');
            return;
        }

        const textarea = document.getElementById('noteContent');
        const comment = textarea ? textarea.value.trim() : '';

        notes.push({
            id: Date.now(),
            text: selectedText,
            comment: comment || '(Không có ghi chú)',
            color: 'yellow',
            block: selectedBlock,
            time: new Date().toLocaleString('vi-VN')
        });

        localStorage.setItem('studyNotes_v5', JSON.stringify(notes));
        hidePopup();
        window.getSelection().removeAllRanges();
        
        // Hiển thị thông báo nhẹ
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#e3a6b2; color:white; padding:12px 24px; border-radius:8px; font-weight:bold; z-index:100000; animation:fadeIn 0.3s;';
        toast.textContent = '✅ Đã lưu ghi chú!';
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
        
        const notesTab = document.getElementById('tab-notes');
        if (notesTab && notesTab.classList.contains('active')) {
            renderNotes();
        }
    }

    const cancelBtn = document.getElementById('cancelPopupBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hidePopup);
    }

    const closeBtn = document.getElementById('closePopupBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hidePopup);
    }
}

// ===== 16. RENDER NOTES =====
function createNoteItem(note) {
    const div = document.createElement('div');
    div.className = 'note-item';
    div.style.cssText = 'position:relative; padding:1rem; margin:0.5rem 0; border:1px solid #f2dae0; border-radius:8px; background:#fffcfd;';
    
    let content = '';
    
    switch(currentNoteView) {
        case 'grid':
            div.style.cssText += 'display:inline-block; width:calc(33.33% - 1rem); margin:0.5rem; vertical-align:top;';
            content = `
                <div style="display:flex; align-items:flex-start; gap:0.5rem;">
                    <input type="checkbox" class="note-checkbox" data-id="${note.id}" style="margin-top:0.3rem;">
                    <div style="flex:1;">
                        <div style="font-style:italic; border-left:3px solid #e3a6b2; padding-left:0.5rem;">"${note.text}"</div>
                        <div style="font-size:0.85rem; color:#8c6870; margin-top:0.3rem;">💬 ${note.comment || 'Trống'}</div>
                        <div class="note-meta" style="font-size:0.75rem; margin-top:0.3rem;">📍 ${note.block} | ${note.time}</div>
                    </div>
                </div>
                <button onclick="deleteNote(${note.id})" style="position:absolute; top:0.5rem; right:0.5rem; background:none; border:none; color:#bd4f60; cursor:pointer; font-size:1.2rem;">✕</button>
            `;
            break;
            
        case 'list':
            content = `
                <div style="display:flex; align-items:center; gap:1rem;">
                    <input type="checkbox" class="note-checkbox" data-id="${note.id}">
                    <div style="flex:1;">
                        <strong>"${note.text}"</strong>
                        <span style="font-size:0.85rem; color:#8c6870; margin-left:0.5rem;">— ${note.comment || 'Trống'}</span>
                    </div>
                    <div style="font-size:0.75rem; color:#8c6870;">📍 ${note.block}</div>
                    <div style="font-size:0.75rem; color:#8c6870;">${note.time}</div>
                    <button onclick="deleteNote(${note.id})" style="background:none; border:none; color:#bd4f60; cursor:pointer;">🗑</button>
                </div>
            `;
            break;
            
        case 'original':
            content = `
                <div style="display:flex; align-items:flex-start; gap:0.5rem;">
                    <input type="checkbox" class="note-checkbox" data-id="${note.id}" style="margin-top:0.3rem;">
                    <div style="flex:1;">
                        <div style="background:#fff0f3; padding:0.5rem; border-radius:4px; font-style:italic;">"${note.text}"</div>
                        <div style="margin-top:0.3rem; font-size:0.9rem;">💬 ${note.comment || 'Trống'}</div>
                        <div class="note-meta" style="font-size:0.75rem; margin-top:0.3rem;">📍 ${note.block} | ${note.time}</div>
                    </div>
                </div>
                <button onclick="deleteNote(${note.id})" style="position:absolute; top:0.5rem; right:0.5rem; background:none; border:none; color:#bd4f60; cursor:pointer; font-size:1.2rem;">✕</button>
            `;
            break;
            
        case 'detailed':
        default:
            content = `
                <div style="display:flex; align-items:flex-start; gap:0.5rem;">
                    <input type="checkbox" class="note-checkbox" data-id="${note.id}" style="margin-top:0.3rem;">
                    <div style="flex:1;">
                        <div style="font-weight:bold; color:#4d2d35;">📝 Trích xuất:</div>
                        <div style="background:#fff0f3; padding:0.5rem; border-radius:4px; font-style:italic;">"${note.text}"</div>
                        <div style="margin-top:0.5rem;"><strong>💬 Bình luận:</strong> ${note.comment || 'Trống'}</div>
                        <div style="margin-top:0.3rem; display:flex; gap:1rem; font-size:0.8rem; color:#8c6870;">
                            <span>📍 Đoạn: ${note.block}</span>
                            <span>🕐 Lúc: ${note.time}</span>
                        </div>
                        <div style="margin-top:0.3rem; display:flex; gap:0.5rem;">
                            <span style="background:#e3a6b2; color:white; padding:0.1rem 0.5rem; border-radius:4px; font-size:0.7rem;">#${note.id}</span>
                            <span style="background:#f2dae0; padding:0.1rem 0.5rem; border-radius:4px; font-size:0.7rem;">${note.color || 'yellow'}</span>
                        </div>
                    </div>
                </div>
                <button onclick="deleteNote(${note.id})" style="position:absolute; top:0.5rem; right:0.5rem; background:none; border:none; color:#bd4f60; cursor:pointer; font-size:1.2rem;">✕</button>
            `;
            break;
    }
    
    div.innerHTML = content;
    return div;
}

function renderNotes() {
    const container = document.getElementById('notesList');
    if (!container) return;
    
    if (notes.length === 0) {
        container.innerHTML = '<p class="empty-message">📭 Chưa có ghi chú nào.</p>';
        return;
    }
    
    container.innerHTML = '';
    const sortedNotes = [...notes].reverse();
    
    sortedNotes.forEach(note => {
        const item = createNoteItem(note);
        container.appendChild(item);
    });
    
    updateBulkActionsUI();
}

window.deleteNote = function(id) {
    if (confirm('Xóa ghi chú này?')) {
        notes = notes.filter(n => n.id !== id);
        localStorage.setItem('studyNotes_v5', JSON.stringify(notes));
        renderNotes();
    }
};

// ===== 17. QUIZ ENGINE =====
function initQuizEngine() {
    const checkBtn = document.getElementById('checkAnswersBtn');
    if (checkBtn) checkBtn.addEventListener('click', submitQuizScore);

    const resetBtn = document.getElementById('resetQuizBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            userAnswers.fill(null);
            const answerSection = document.getElementById('answer-section');
            if (answerSection) answerSection.style.display = 'none';
            renderQuizSection(currentQuizSection);
            updateQuizProgress();
            saveQuizProgress();
        });
    }

    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', function() {
            if (quizQuestions.length === 0) return;
            shuffleQuestions();
            userAnswers.fill(null);
            const answerSection = document.getElementById('answer-section');
            if (answerSection) answerSection.style.display = 'none';
            renderQuizSection(0);
            updateQuizProgress();
            saveQuizProgress();
            buildQuizNavigation();
        });
    }

    const resetStatsBtn = document.getElementById('resetStatsBtn');
    if (resetStatsBtn) {
        resetStatsBtn.addEventListener('click', function() {
            scoreHistory = [];
            localStorage.removeItem('quizScoreHistory_v5');
            renderQuizChart();
        });
    }
    
    renderQuizChart();
}

function buildQuizNavigation() {
    const nav = document.getElementById('quizSectionNav');
    if (!nav) return;
    nav.innerHTML = '';
    const total = Math.ceil(quizQuestions.length / questionsPerSection);
    for (let i = 0; i < total; i++) {
        const btn = document.createElement('button');
        const start = i * questionsPerSection + 1;
        const end = Math.min((i + 1) * questionsPerSection, quizQuestions.length);
        btn.textContent = `Bài ${i + 1} (${start}-${end})`;
        btn.addEventListener('click', () => renderQuizSection(i));
        nav.appendChild(btn);
    }
    const btns = nav.querySelectorAll('button');
    btns.forEach((btn, idx) => {
        btn.classList.toggle('active-sec', idx === currentQuizSection);
    });
}

function renderQuizSection(sectionIdx) {
    currentQuizSection = sectionIdx;
    const container = document.getElementById('quizContainer');
    if (!container) return;
    
    if (quizQuestions.length === 0) {
        container.innerHTML = '<p class="empty-message">📝 Vui lòng nạp file quiz.csv</p>';
        return;
    }
    container.innerHTML = '';

    const navBtns = document.querySelectorAll('#quizSectionNav button');
    navBtns.forEach((btn, idx) => btn.classList.toggle('active-sec', idx === sectionIdx));

    const start = sectionIdx * questionsPerSection;
    const end = Math.min(start + questionsPerSection, quizQuestions.length);

    for (let i = start; i < end; i++) {
        const q = quizQuestions[i];
        const item = document.createElement('div');
        item.className = 'quiz-item';
        
        const displayNum = q.displayId || (i + 1);
        item.innerHTML = `
            <p class="quiz-question"><strong>Câu ${displayNum}:</strong> ${q.zhQ}</p>
            <p style="color:#8c5863; font-size:0.9rem; font-style:italic; margin-bottom:0.5rem;">${q.viQ}</p>
        `;
        
        const list = document.createElement('ul');
        list.className = 'quiz-options';
        const labels = ['A', 'B', 'C', 'D'];
        q.options.forEach((opt, optIdx) => {
            const li = document.createElement('li');
            li.textContent = `${labels[optIdx]}. ${opt}`;
            if (userAnswers[i] === optIdx) li.className = 'selected';
            li.addEventListener('click', function() {
                const answerSection = document.getElementById('answer-section');
                if (answerSection && answerSection.style.display === 'block') return;
                userAnswers[i] = optIdx;
                saveQuizProgress();
                renderQuizSection(currentQuizSection);
                updateQuizProgress();
            });
            list.appendChild(li);
        });
        item.appendChild(list);
        container.appendChild(item);
    }

    const answerSection = document.getElementById('answer-section');
    if (answerSection && answerSection.style.display === 'block') {
        revealAnswers();
    }
}

function saveQuizProgress() {
    if (activeQuizName && quizVault[activeQuizName]) {
        quizVault[activeQuizName].answers = userAnswers;
        localStorage.setItem('quizVault_v5', JSON.stringify(quizVault));
    }
}

function updateQuizProgress() {
    const el = document.getElementById('quizProgress');
    if (!el) return;
    const answered = userAnswers.filter(a => a !== null).length;
    el.textContent = `✅ ${answered}/${quizQuestions.length}`;
}

function submitQuizScore() {
    if (quizQuestions.length === 0) {
        alert('⚠️ Chưa có câu hỏi nào!');
        return;
    }
    
    const unanswered = userAnswers.filter(a => a === null).length;
    if (unanswered > 0) {
        if (!confirm(`⚠️ Bạn còn ${unanswered} câu chưa trả lời. Bạn có chắc muốn nộp bài không?`)) {
            return;
        }
    }
    
    let score = 0;
    const list = document.getElementById('answers-list');
    list.innerHTML = '';

    quizQuestions.forEach((q, idx) => {
        const isCorrect = userAnswers[idx] === q.correct;
        if (isCorrect) score++;
        const status = isCorrect ? '✅ Đúng' : '❌ Sai';
        const correctAnswer = q.options[q.correct];
        const userAnswer = userAnswers[idx] !== null ? q.options[userAnswers[idx]] : 'Chưa trả lời';
        const displayNum = q.displayId || (idx + 1);
        list.innerHTML += `
            <div style="padding:0.3rem 0; border-bottom:1px solid #f2dae0; ${isCorrect ? 'color:#1e421e;' : 'color:#6e201d;'}">
                <strong>Câu ${displayNum}:</strong> ${status}
                ${!isCorrect ? `<span style="font-size:0.8rem; color:#8c5863;"> (Đáp án đúng: ${correctAnswer})</span>` : ''}
            </div>
        `;
    });

    const percent = Math.round((score / quizQuestions.length) * 100);
    const answerSection = document.getElementById('answer-section');
    if (answerSection) answerSection.style.display = 'block';
    
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.cssText = 'font-weight:bold; font-size:1.2rem; text-align:center; padding:0.5rem; background:#fae1e6; border-radius:6px; margin-bottom:0.5rem;';
    scoreDisplay.textContent = `📊 Điểm số: ${score}/${quizQuestions.length} (${percent}%)`;
    list.prepend(scoreDisplay);
    
    scoreHistory.push(percent);
    if (scoreHistory.length > 5) scoreHistory.shift();
    localStorage.setItem('quizScoreHistory_v5', JSON.stringify(scoreHistory));
    renderQuizChart();
    revealAnswers();
}

function revealAnswers() {
    const container = document.getElementById('quizContainer');
    if (!container) return;
    
    const items = container.querySelectorAll('.quiz-item');
    items.forEach((item, idx) => {
        const actualIdx = currentQuizSection * questionsPerSection + idx;
        const q = quizQuestions[actualIdx];
        if (!q) return;
        
        const options = item.querySelectorAll('.quiz-options li');
        options.forEach((li, optIdx) => {
            // Lấy text của option (bỏ qua prefix A., B., ...)
            const optText = li.textContent.replace(/^[A-D]\.\s*/, '');
            let matchingIdx = -1;
            q.options.forEach((opt, i) => {
                if (opt === optText) matchingIdx = i;
            });
            
            if (matchingIdx === q.correct) {
                li.className = 'correct-answer';
            } else if (userAnswers[actualIdx] === matchingIdx && matchingIdx !== q.correct) {
                li.className = 'wrong-answer';
            }
        });
    });
}

// ===== 18. QUIZ CHART =====
function renderQuizChart() {
    const rows = document.getElementById('chartRows');
    if (!rows) return;
    rows.innerHTML = '';
    
    if (scoreHistory.length === 0) {
        rows.innerHTML = '<p style="font-size:0.88rem; font-style:italic;">📊 Chưa có dữ liệu</p>';
        return;
    }
    
    let sum = 0;
    scoreHistory.forEach((score, idx) => {
        sum += score;
        rows.innerHTML += `
            <div class="chart-row">
                <span class="chart-label">Lần ${idx + 1}</span>
                <div class="chart-bar">
                    <div class="chart-bar-fill" style="width: ${score}%"></div>
                </div>
                <span class="chart-value">${score}đ</span>
            </div>
        `;
    });
    
    const avgEl = document.getElementById('avgScoreDisplay');
    if (avgEl) {
        avgEl.textContent = `📊 Trung bình: ${Math.round(sum / scoreHistory.length)}/100`;
    }
}

console.log('📚 Hệ thống học tập đã được tải!');
console.log('💡 Mẹo: Bôi đen văn bản trong tab "Nguyên văn" để tạo ghi chú nhanh!');
console.log('⌨️ Phím tắt: Ctrl+Enter để lưu ghi chú, ESC để đóng popup');
