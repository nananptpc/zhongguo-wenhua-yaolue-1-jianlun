// ==========================================================================
// HỆ THỐNG HỌC TẬP SONG NGỮ TRUNG - VIỆT (FIX POPUP + QUIZ)
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

// Lưu lịch sử các lần làm bài để tránh trùng
let quizAttemptHistory = [];

// ===== 2. KHỞI TẠO TRANG =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Trang đã tải xong, khởi tạo hệ thống...');
    
    initTabs();
    initDarkMode();
    initSidebar();
    initFileImports();
    initHighlightSystem();
    initQuizEngine();
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
            if (this.dataset.tab === 'tab-notes') renderNotes();
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
                document.getElementById('docStatus').innerText = `✅ ${file.name}`;
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
                document.getElementById('termStatus').innerText = `✅ ${file.name}`;
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
                document.getElementById('quizStatus').innerText = `✅ ${file.name}`;
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

// ===== 4. TẢI DỮ LIỆU ĐÃ LƯU =====
function autoLoadSavedData() {
    if (activeDocName && docVault[activeDocName]) {
        parseDocumentCSV(docVault[activeDocName]);
        document.getElementById('docStatus').innerText = `✅ ${activeDocName}`;
    }
    if (activeTermName && termVault[activeTermName]) {
        parseTermCSV(termVault[activeTermName]);
        document.getElementById('termStatus').innerText = `✅ ${activeTermName}`;
    }
    if (activeQuizName && quizVault[activeQuizName]) {
        parseQuizCSV(quizVault[activeQuizName].csvText);
        if (quizVault[activeQuizName].answers) {
            userAnswers = quizVault[activeQuizName].answers;
        }
        document.getElementById('quizStatus').innerText = `✅ ${activeQuizName}`;
    }
    renderSidebarLists();
}

// ===== 5. RENDER SIDEBAR LISTS =====
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
                document.getElementById('docStatus').innerText = `✅ ${name}`;
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
                document.getElementById('termStatus').innerText = `✅ ${name}`;
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
                document.getElementById('quizStatus').innerText = `✅ ${name}`;
                document.getElementById('answer-section').style.display = 'none';
                renderQuizSection(0);
                updateQuizProgress();
            });
            quizList.appendChild(item);
        });
    }
}

// ===== 6. PARSE CSV =====
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

// ===== 7. PARSE DOCUMENT CSV =====
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

// ===== 8. PARSE TERM CSV =====
function parseTermCSV(csvText) {
    const rows = parseCSVLine(csvText);
    const container = document.getElementById('termsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="card">';
    rows.forEach((row, idx) => {
        if (idx === 0) return;
        const zh = row[0] ? row[0].trim() : '';
        const vi = row[1] ? row[1].trim() : '';
        if (zh && vi) {
            const term = document.createElement('div');
            term.className = 'term-card';
            term.innerHTML = `<span class="term-zh">📌 ${zh}</span><span class="term-vi">${vi}</span>`;
            container.firstChild.appendChild(term);
        }
    });
    container.firstChild.innerHTML += '</div>';
}

// ===== 9. PARSE QUIZ CSV - SỬA LỖI ĐÁP ÁN =====
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
    
    // Shuffle câu hỏi ngay khi load
    shuffleQuestions();
    
    userAnswers = new Array(quizQuestions.length).fill(null);
    buildQuizNavigation();
    renderQuizSection(0);
    updateQuizProgress();
    
    console.log(`📝 Đã tải ${quizQuestions.length} câu hỏi trắc nghiệm`);
}

// ===== 10. HÀM SHUFFLE CÂU HỎI =====
function shuffleQuestions() {
    // Fisher-Yates shuffle
    for (let i = quizQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [quizQuestions[i], quizQuestions[j]] = [quizQuestions[j], quizQuestions[i]];
    }
    // Reset lại đánh số thứ tự
    quizQuestions.forEach((q, idx) => {
        q.displayId = idx + 1;
    });
}

// ===== 11. HỆ THỐNG HIGHLIGHT - FIX POPUP =====
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

        // Tính vị trí - Đặt popup gần vị trí highlight
        let left = x + window.scrollX + 10;
        let top = y + window.scrollY + 15;

        const popupWidth = 340;
        const popupHeight = 320;
        
        // Điều chỉnh để popup không tràn khỏi màn hình
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

        console.log(`📝 Popup hiển thị tại (${left}, ${top})`);
    }

    function hidePopup() {
        popup.style.display = 'none';
        isPopupOpen = false;
        isPopupVisible = false;
    }

    // Sự kiện mouseup - bắt bôi đen
    document.addEventListener('mouseup', function(e) {
        // Nếu click vào popup thì bỏ qua
        if (popup.contains(e.target)) return;

        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (text.length < 2) {
            hidePopup();
            return;
        }

        // Kiểm tra tab nguyên văn
        const tabOriginal = document.getElementById('tab-original');
        if (!tabOriginal || !tabOriginal.classList.contains('active')) {
            hidePopup();
            return;
        }

        // Kiểm tra văn bản có nằm trong container không
        const container = document.getElementById('originalContainer');
        if (!container) {
            hidePopup();
            return;
        }

        // Kiểm tra xem văn bản được chọn có nằm trong container không
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

        // Tìm block chứa văn bản
        let blockIdx = 'N/A';
        let parent = selection.anchorNode.parentNode;
        while (parent && parent !== document.body) {
            if (parent.classList && parent.classList.contains('bilingual-block')) {
                blockIdx = parent.dataset.block || parent.dataset.index || 'N/A';
                break;
            }
            parent = parent.parentNode;
        }

        // Lấy vị trí của selection
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        const x = rect.left;
        const y = rect.bottom;

        showPopup(text, blockIdx, x, y);
    });

    // Sự kiện mousedown - đóng popup khi click ra ngoài
    document.addEventListener('mousedown', function(e) {
        if (isPopupOpen && !popup.contains(e.target)) {
            const sel = window.getSelection();
            const text = sel.toString().trim();
            if (!text || text.length < 2) {
                hidePopup();
            }
        }
    });

    // Nút lưu
    const saveBtn = document.getElementById('saveNoteBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
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
            
            alert('✅ Đã lưu ghi chú thành công!');
            
            const notesTab = document.getElementById('tab-notes');
            if (notesTab && notesTab.classList.contains('active')) {
                renderNotes();
            }
        });
    }

    // Nút hủy
    const cancelBtn = document.getElementById('cancelPopupBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            hidePopup();
        });
    }

    // Nút đóng
    const closeBtn = document.getElementById('closePopupBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            hidePopup();
        });
    }

    // ESC để đóng
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isPopupOpen) {
            hidePopup();
        }
    });

    console.log('✅ Hệ thống highlight đã sẵn sàng!');
}

// ===== 12. RENDER NOTES =====
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
        const item = document.createElement('div');
        item.className = 'note-item';
        item.innerHTML = `
            <div style="padding:0.4rem 0.8rem; border-left: 5px solid #e3a6b2; background:rgba(240,240,240,0.15); font-style:italic;">
                "${note.text}"
            </div>
            <p style="margin-top:0.5rem; font-weight:bold;">
                💬 Bình luận: <span style="font-weight:normal;">${note.comment || 'Trống'}</span>
            </p>
            <div class="note-meta">
                <span>📍 Đoạn ${note.block} | ${note.time}</span>
                <span style="color:#bd4f60; cursor:pointer; font-weight:bold;" onclick="deleteNote(${note.id})">🗑 Xóa</span>
            </div>
        `;
        container.appendChild(item);
    });
}

window.deleteNote = function(id) {
    if (confirm('Xóa ghi chú này?')) {
        notes = notes.filter(n => n.id !== id);
        localStorage.setItem('studyNotes_v5', JSON.stringify(notes));
        renderNotes();
    }
};

// ===== 13. QUIZ ENGINE =====
function initQuizEngine() {
    const checkBtn = document.getElementById('checkAnswersBtn');
    if (checkBtn) checkBtn.addEventListener('click', submitQuizScore);

    const resetBtn = document.getElementById('resetQuizBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            userAnswers.fill(null);
            document.getElementById('answer-section').style.display = 'none';
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
            document.getElementById('answer-section').style.display = 'none';
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
    // Đánh dấu bài đang active
    const btns = nav.querySelectorAll('button');
    btns.forEach((btn, idx) => {
        btn.classList.toggle('active-sec', idx === currentQuizSection);
    });
}

function renderQuizSection(sectionIdx) {
    currentQuizSection = sectionIdx;
    const container = document.getElementById('quizContainer');
    if (!container || quizQuestions.length === 0) {
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
        
        // Hiển thị số thứ tự câu hỏi
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
    document.getElementById('answer-section').style.display = 'block';
    
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
    document.querySelectorAll('.quiz-options li').forEach(li => {
        const item = li.closest('.quiz-item');
        if (!item) return;
        const items = Array.from(document.getElementById('quizContainer').children);
        const idx = items.indexOf(item);
        const actualIdx = currentQuizSection * questionsPerSection + idx;
        const q = quizQuestions[actualIdx];
        if (!q) return;
        
        const optText = li.textContent.replace(/^[A-D]\.\s*/, '');
        let optIdx = -1;
        q.options.forEach((opt, i) => {
            if (opt === optText) optIdx = i;
        });
        
        if (optIdx === q.correct) {
            li.className = 'correct-answer';
        } else if (userAnswers[actualIdx] === optIdx) {
            li.className = 'wrong-answer';
        }
    });
}

// ===== 14. QUIZ CHART =====
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
