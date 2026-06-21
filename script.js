// ==========================================================================
// HỆ THỐNG HỌC TẬP SONG NGỮ TRUNG - VIỆT (FULL FEATURES - FIXED & UPGRADED)
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

// Biến điều khiển hệ thống Popup
let isPopupVisible = false;
let selectedText = '';
let selectedBlock = 'N/A';
let currentNoteView = 'grid'; // grid, list, original, detailed

// Tập hợp lưu trữ các ID ghi chú được chọn hàng loạt (Bulk Actions)
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
                selectedNotes.clear(); // Reset trạng thái chọn hàng loạt khi đổi tab
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

// ===== 4. KHỞI TẠO CHẾ ĐỘ CHỌN & XỬ LÝ HÀNG LOẠT (BULK ACTIONS) =====
function initBulkActions() {
    const selectAllBtn = document.getElementById('selectAllNotes');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            const visibleCheckboxes = document.querySelectorAll('.note-checkbox');
            const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);
            
            visibleCheckboxes.forEach(cb => {
                cb.checked = !allChecked;
                const noteId = parseInt(cb.dataset.id);
                if (!allChecked) {
                    selectedNotes.add(noteId);
                } else {
                    selectedNotes.delete(noteId);
                }
            });
            updateBulkActionsUI();
        });
    }

    const deleteSelectedBtn = document.getElementById('deleteSelectedNotes');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', function() {
            if (selectedNotes.size === 0) {
                alert('⚠️ Vui lòng chọn ít nhất một ghi chú để xóa!');
                return;
            }
            if (confirm(`Bạn có chắc chắn muốn xóa ${selectedNotes.size} ghi chú đã chọn không?`)) {
                notes = notes.filter(n => !selectedNotes.has(n.id));
                localStorage.setItem('studyNotes_v5', JSON.stringify(notes));
                selectedNotes.clear();
                renderNotes();
                updateBulkActionsUI();
            }
        });
    }

    const exportBtn = document.getElementById('exportNotesCSV');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            triggerExportModal();
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
    const visibleCheckboxes = document.querySelectorAll('.note-checkbox');
    const selectAllBtn = document.getElementById('selectAllNotes');
    const deleteSelectedBtn = document.getElementById('deleteSelectedNotes');
    
    if (selectAllBtn && visibleCheckboxes.length > 0) {
        const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);
        selectAllBtn.innerHTML = allChecked ? '⬜ Bỏ chọn tất cả' : '✅ Chọn tất cả';
    }
    
    if (deleteSelectedBtn) {
        deleteSelectedBtn.innerHTML = `🗑️ Xóa đã chọn (${selectedNotes.size})`;
        deleteSelectedBtn.disabled = selectedNotes.size === 0;
        deleteSelectedBtn.style.opacity = selectedNotes.size === 0 ? '0.5' : '1';
    }
}

// ===== 5. HÀM XUẤT FILE CSV NÂNG CAO =====
function triggerExportModal() {
    if (notes.length === 0) {
        alert('⚠️ Hiện không có ghi chú nào để xuất dữ liệu!');
        return;
    }
    
    const choice = prompt(
        "Chọn kiểu nội dung muốn kết xuất sang file CSV:\n\n" +
        "Nhập '1': Chỉ xuất [Nguyên văn] và [Lời bình/Note]\n" +
        "Nhập '2': Xuất toàn bộ dữ liệu (ID, Nguyên văn, Note, Đoạn, Thời gian)", 
        "1"
    );
    
    if (choice === null) return; 
    
    let csvContent = '';
    
    if (choice.trim() === '1') {
        csvContent = 'Nguyên văn,Lời bình\n';
        notes.forEach(n => {
            const rawText = `"${n.text.replace(/"/g, '""')}"`;
            const commentText = `"${(n.comment || '').replace(/"/g, '""')}"`;
            csvContent += `${rawText},${commentText}\n`;
        });
    } else if (choice.trim() === '2') {
        csvContent = 'ID,Nguyên văn,Lời bình,Vị trí đoạn,Thời gian tạo\n';
        notes.forEach(n => {
            const rawText = `"${n.text.replace(/"/g, '""')}"`;
            const commentText = `"${(n.comment || '').replace(/"/g, '""')}"`;
            csvContent += `${n.id},${rawText},${commentText},${n.block},${n.time}\n`;
        });
    } else {
        alert('❌ Lựa chọn không hợp lệ. Vui lòng thử lại!');
        return;
    }
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `HanViet_Notes_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// ===== 6. NHÓM NOTES THEO ĐOẠN =====
function groupNotesByBlock() {
    const grouped = {};
    notes.forEach(n => {
        const key = n.block || 'Unknown';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(n);
    });
    
    const container = document.getElementById('notesList');
    if (!container) return;
    container.innerHTML = '';
    
    Object.keys(grouped).forEach(block => {
        const groupDiv = document.createElement('div');
        groupDiv.style.cssText = 'margin:1rem 0; padding:1rem; border:1px solid #f2dae0; border-radius:12px; background:#fffdfd;';
        groupDiv.innerHTML = `<h4 style="margin-bottom:0.8rem; color:#4d2d35; border-bottom:1px dashed #f2dae0; padding-bottom:0.4rem;">📍 Đoạn ${block} (${grouped[block].length} ghi chú)</h4>`;
        
        grouped[block].forEach(note => {
            const item = createNoteItem(note);
            groupDiv.appendChild(item);
        });
        container.appendChild(groupDiv);
    });
}

// ===== 7. TẢI DỮ LIỆU TỰ ĐỘNG =====
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

// ===== 8. RENDER SIDEBAR LISTS =====
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

// ===== 9. PHÂN TÍCH CÚ PHÁP FILE CSV =====
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

// ĐÃ LƯỢC BỎ HOÀN TOÀN PHẦN RENDER TRÍCH YẾU (SUM UP) THỪA
function parseDocumentCSV(csvText) {
    const rows = parseCSVLine(csvText);
    const container = document.getElementById('originalContainer');
    
    if (!container) return;
    container.innerHTML = '';
    
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
            blockCount++;
        }
    });
    console.log(`📄 Đã tải ${blockCount} đoạn văn bản nguyên văn.`);
}

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
}

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
                options: [row[1] || 'A', row[2] || 'B', row[3] || 'C', row[4] || 'D'],
                correct: finalCorrect
            });
        }
    });
    
    if (quizQuestions.length > 0) {
        shuffleQuestions();
        userAnswers = new Array(quizQuestions.length).fill(null);
        buildQuizNavigation();
        renderQuizSection(0);
        updateQuizProgress();
    }
}

function shuffleQuestions() {
    for (let i = quizQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [quizQuestions[i], quizQuestions[j]] = [quizQuestions[j], quizQuestions[i]];
    }
    quizQuestions.forEach((q, idx) => {
        q.displayId = idx + 1;
    });
}

// ===== 10. HỆ THỐNG HIGHLIGHT & ĐỊNH VỊ CỐ ĐỊNH BÊN PHẢI CHỐNG LỖI ZOOM MÀN HÌNH =====
function initHighlightSystem() {
    const popup = document.getElementById('notePopup');
    if (!popup) return;

    let isPopupOpen = false;
    let selectedColor = 'yellow'; 

    // Bộ lắng nghe sự kiện click chọn màu thẻ học nâng cấp
    const colorSpans = document.querySelectorAll('#colorOptions span');
    colorSpans.forEach(span => {
        span.addEventListener('click', function() {
            colorSpans.forEach(s => s.classList.remove('active'));
            this.classList.add('active');
            selectedColor = this.dataset.color; 
        });
    });

    function showPopup(text, blockIdx, parentBlock) {
        const preview = document.getElementById('selectedTextPreview');
        if (preview) preview.textContent = text.length > 100 ? text.substring(0, 100) + '...' : text;
        
        const blockInfo = document.getElementById('selectedBlockInfo');
        if (blockInfo) blockInfo.textContent = `Đoạn: ${blockIdx}`;

        const textarea = document.getElementById('noteContent');
        if (textarea) textarea.value = '';

        // Reset về màu vàng mặc định mỗi lần mở popup mới
        colorSpans.forEach(s => s.classList.remove('active'));
        const defaultSpan = document.querySelector('#colorOptions span[data-color="yellow"]');
        if (defaultSpan) defaultSpan.classList.add('active');
        selectedColor = 'yellow';

        const tabOriginal = document.getElementById('tab-original');
        const tabRect = tabOriginal.getBoundingClientRect();

        if (parentBlock && parentBlock !== 'N/A') {
            const blockRect = parentBlock.getBoundingClientRect();

            // Đặt định vị cố định sang hẳn bên phải khối text, cách ra 40px cố định
            let left = blockRect.right - tabRect.left + 40;
            let top = blockRect.top - tabRect.top;

            const popupWidth = 340;
            if (left + popupWidth > tabRect.width) {
                left = tabRect.width - popupWidth - 20;
                top = blockRect.bottom - tabRect.top + 10;
            }

            popup.style.display = 'block';
            popup.style.left = left + 'px';
            popup.style.top = top + 'px';
        }

        isPopupOpen = true;
        isPopupVisible = true;
        selectedText = text;
        selectedBlock = blockIdx;

        setTimeout(() => { if (textarea) textarea.focus(); }, 100);
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
        if (!tabOriginal || !tabOriginal.classList.contains('active')) return;

        const container = document.getElementById('originalContainer');
        if (!container || !container.contains(selection.anchorNode)) {
            hidePopup();
            return;
        }

        let blockIdx = 'N/A';
        let parentBlock = null;
        let parent = selection.anchorNode.parentNode;
        while (parent && parent !== document.body) {
            if (parent.classList && parent.classList.contains('bilingual-block')) {
                blockIdx = parent.dataset.block || parent.dataset.index || 'N/A';
                parentBlock = parent;
                break;
            }
            parent = parent.parentNode;
        }

        showPopup(text, blockIdx, parentBlock);
    });

    document.addEventListener('mousedown', function(e) {
        if (isPopupOpen && !popup.contains(e.target)) {
            const sel = window.getSelection();
            if (!sel.toString().trim()) hidePopup();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (isPopupOpen && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            saveNote();
        }
        if (e.key === 'Escape' && isPopupOpen) hidePopup();
    });

    const saveBtn = document.getElementById('saveNoteBtn');
    if (saveBtn) {
        saveBtn.replaceWith(saveBtn.cloneNode(true));
        document.getElementById('saveNoteBtn').addEventListener('click', saveNote);
    }

    function saveNote() {
        if (!selectedText) return;

        const textarea = document.getElementById('noteContent');
        const comment = textarea ? textarea.value.trim() : '';

        notes.push({
            id: Date.now(),
            text: selectedText,
            comment: comment || '(Không có ghi chú)',
            color: selectedColor, // Đồng bộ màu sắc đã chọn
            block: selectedBlock,
            time: new Date().toLocaleString('vi-VN')
        });

        localStorage.setItem('studyNotes_v5', JSON.stringify(notes));
        hidePopup();
        window.getSelection().removeAllRanges();
        
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#e3a6b2; color:white; padding:12px 24px; border-radius:8px; font-weight:bold; z-index:100000;';
        toast.textContent = '✅ Đã lưu ghi chú!';
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 1500);

        if (document.getElementById('tab-notes').classList.contains('active')) {
            renderNotes();
        }
    }

    const cancelBtn = document.getElementById('cancelPopupBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', hidePopup);

    const closeBtn = document.getElementById('closePopupBtn');
    if (closeBtn) closeBtn.addEventListener('click', hidePopup);
}

// ===== 11. RENDER NOTES & ĐỒNG BỘ MÀU NỀN PASTEL CHUẨN =====
function createNoteItem(note) {
    const div = document.createElement('div');
    div.className = 'note-item';
    
    // Bản đồ gán màu sắc nhẹ nhàng
    const colorMap = {
        'yellow': '#fffdf2',
        'green': '#f3faf5',
        'blue': '#f2f8fd',
        'pink': '#fff5f7'
    };
    const colorBorderMap = {
        'yellow': '#f2dae0',
        'green': '#c3ebd0',
        'blue': '#cce3f7',
        'pink': '#f7cbd6'
    };
    
    const bgColor = colorMap[note.color] || '#fffcfd';
    const borderColor = colorBorderMap[note.color] || '#f2dae0';
    
    let baseStyle = `position:relative; padding:1rem; padding-right:2.5rem; margin:0.5rem 0; border:1px solid ${borderColor}; border-radius:8px; background:${bgColor};`;
    div.style.cssText = baseStyle;
    
    const isChecked = selectedNotes.has(note.id) ? 'checked' : '';
    const deleteButtonHTML = `<button onclick="deleteNote(${note.id})" style="position:absolute; top:0.8rem; right:0.6rem; background:none; border:none; color:#bd4f60; cursor:pointer; font-size:1.1rem; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'" title="Xóa ghi chú">🗑️</button>`;
    
    let content = '';
    switch(currentNoteView) {
        case 'grid':
            div.style.cssText += 'display:inline-block; width:calc(33.33% - 1rem); margin:0.5rem; vertical-align:top;';
            content = `
                <div style="display:flex; align-items:flex-start; gap:0.6rem;">
                    <input type="checkbox" class="note-checkbox" data-id="${note.id}" style="margin-top:0.3rem;" ${isChecked}>
                    <div style="flex:1; min-width:0; word-wrap: break-word;">
                        <div style="font-style:italic; border-left:3px solid #e3a6b2; padding-left:0.5rem; color:#4d2d35;">"${note.text}"</div>
                        <div style="font-size:0.85rem; color:#8c6870; margin-top:0.4rem;">💬 ${note.comment || 'Trống'}</div>
                        <div class="note-meta" style="font-size:0.75rem; margin-top:0.4rem; color:#a6828a;">📍 Đoạn: ${note.block} | ${note.time}</div>
                    </div>
                </div>
                ${deleteButtonHTML}
            `;
            break;
            
        case 'list':
            content = `
                <div style="display:flex; align-items:center; gap:1rem;">
                    <input type="checkbox" class="note-checkbox" data-id="${note.id}" ${isChecked}>
                    <div style="flex:1; min-width:0; display:flex; align-items:center; gap:0.5rem; justify-content:space-between;">
                        <span style="font-weight:500; color:#4d2d35; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:50%;">"${note.text}"</span>
                        <span style="font-size:0.85rem; color:#8c6870; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-left:0.5rem;">— ${note.comment || 'Trống'}</span>
                    </div>
                    <div style="font-size:0.75rem; color:#8c6870; min-width:50px;">📍 ${note.block}</div>
                    <div style="font-size:0.75rem; color:#8c6870; min-width:130px; text-align:right;">${note.time}</div>
                    <div style="min-width:30px; position:relative;"></div>
                </div>
                ${deleteButtonHTML}
            `;
            break;
            
        case 'original':
            content = `
                <div style="display:flex; align-items:flex-start; gap:0.6rem;">
                    <input type="checkbox" class="note-checkbox" data-id="${note.id}" style="margin-top:0.3rem;" ${isChecked}>
                    <div style="flex:1; min-width:0;">
                        <div style="background:#fff0f3; padding:0.5rem; border-radius:4px; font-style:italic; color:#4d2d35;">"${note.text}"</div>
                        <div style="margin-top:0.4rem; font-size:0.9rem; color:#5c3a42;">💬 ${note.comment || 'Trống'}</div>
                        <div class="note-meta" style="font-size:0.75rem; margin-top:0.3rem; color:#a6828a;">📍 Đoạn: ${note.block} | ${note.time}</div>
                    </div>
                </div>
                ${deleteButtonHTML}
            `;
            break;
            
        case 'detailed':
        default:
            content = `
                <div style="display:flex; align-items:flex-start; gap:0.6rem;">
                    <input type="checkbox" class="note-checkbox" data-id="${note.id}" style="margin-top:0.3rem;" ${isChecked}>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:bold; color:#4d2d35; margin-bottom:0.2rem;">📝 Trích xuất:</div>
                        <div style="background:#fff0f3; padding:0.5rem; border-radius:4px; font-style:italic; color:#4d2d35;">"${note.text}"</div>
                        <div style="margin-top:0.5rem; color:#2b1a1d;"><strong>💬 Bình luận:</strong> ${note.comment || 'Trống'}</div>
                        <div style="margin-top:0.4rem; display:flex; gap:1rem; font-size:0.8rem; color:#8c6870;">
                            <span>📍 Đoạn: ${note.block}</span>
                            <span>🕐 Lúc: ${note.time}</span>
                        </div>
                    </div>
                </div>
                ${deleteButtonHTML}
            `;
            break;
    }
    
    div.innerHTML = content;
    
    const cb = div.querySelector('.note-checkbox');
    if (cb) {
        cb.addEventListener('change', function() {
            if (this.checked) {
                selectedNotes.add(note.id);
            } else {
                selectedNotes.delete(note.id);
            }
            updateBulkActionsUI();
        });
    }
    
    return div;
}

function renderNotes() {
    const container = document.getElementById('notesList');
    if (!container) return;
    
    if (notes.length === 0) {
        container.innerHTML = '<p class="empty-message">📭 Chưa có ghi chú nào được lưu.</p>';
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
    if (confirm('Bạn có chắc chắn muốn xóa ghi chú này không?')) {
        notes = notes.filter(n => n.id !== id);
        selectedNotes.delete(id); 
        localStorage.setItem('studyNotes_v5', JSON.stringify(notes));
        renderNotes();
    }
};

// ===== 12. TRÌNH KIỂM TRA TRẮC NGHIỆM (QUIZ ENGINE) =====
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
    if (quizQuestions.length === 0) return;
    
    const unanswered = userAnswers.filter(a => a === null).length;
    if (unanswered > 0 && !confirm(`⚠️ Bạn còn ${unanswered} câu chưa trả lời. Bạn có chắc muốn nộp bài không?`)) {
        return;
    }
    
    let score = 0;
    const list = document.getElementById('answers-list');
    list.innerHTML = '';

    quizQuestions.forEach((q, idx) => {
        const isCorrect = userAnswers[idx] === q.correct;
        if (isCorrect) score++;
        const status = isCorrect ? '✅ Đúng' : '❌ Sai';
        const correctAnswer = q.options[q.correct];
        const displayNum = q.displayId || (idx + 1);
        
        const div = document.createElement('div');
        div.style.cssText = `padding:0.3rem 0; border-bottom:1px solid #f2dae0; ${isCorrect ? 'color:#1e421e;' : 'color:#6e201d;'}`;
        div.innerHTML = `<strong>Câu ${displayNum}:</strong> ${status}`;
        
        if (!isCorrect) {
            div.innerHTML += `<span style="font-size:0.8rem; color:#8c5863;"> (Đáp án đúng: ${correctAnswer})</span>`;
        }
        list.appendChild(div);
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

// ===== 13. BIỂU ĐỒ TIẾN ĐỘ =====
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
        const row = document.createElement('div');
        row.className = 'chart-row';
        row.innerHTML = `
            <span class="chart-label">Lần ${idx + 1}</span>
            <div class="chart-bar">
                <div class="chart-bar-fill" style="width: ${score}%"></div>
            </div>
            <span class="chart-value">${score}đ</span>
        `;
        rows.appendChild(row);
    });
    
    const avgEl = document.getElementById('avgScoreDisplay');
    if (avgEl) {
        avgEl.textContent = `📊 Trung bình: ${Math.round(sum / scoreHistory.length)}/100`;
    }
}

console.log('📚 Hệ thống học tập song ngữ đã sẵn sàng vận hành!');
