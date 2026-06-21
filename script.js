// ==========================================================================
// HỆ THỐNG HỌC TẬP SONG NGỮ TRUNG - VIỆT (BẢN MỚI HOÀN TOÀN)
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
const questionsPerSection = 5;

// ===== 2. KHỞI TẠO TRANG =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Trang đã tải xong, khởi tạo hệ thống...');
    
    // Khởi tạo các tab
    initTabs();
    
    // Khởi tạo dark mode
    initDarkMode();
    
    // Khởi tạo sidebar
    initSidebar();
    
    // Khởi tạo hệ thống import file
    initFileImports();
    
    // Khởi tạo hệ thống highlight (QUAN TRỌNG)
    initHighlightSystem();
    
    // Khởi tạo quiz engine
    initQuizEngine();
    
    // Tải dữ liệu đã lưu
    autoLoadSavedData();
    
    console.log('✅ Hệ thống đã sẵn sàng!');
});

// ===== 3. HÀM KHỞI TẠO CÁC THÀNH PHẦN =====

// 3.1. Tab System
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

// 3.2. Dark Mode
function initDarkMode() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark');
            this.textContent = document.body.classList.contains('dark') ? '☀️ Light' : '🌙 Dark';
        });
    }
}

// 3.3. Sidebar
function initSidebar() {
    const sidebar = document.getElementById('progressSidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }
}

// 3.4. File Imports
function initFileImports() {
    // Import Document CSV
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

    // Import Term CSV
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

    // Import Quiz CSV
    const quizInput = document.getElementById('csvQuizInput');
    if (quizInput) {
        quizInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                quizVault[file.name] = { csvText: evt.target.result, answers: [] };
                activeQuizName = file.name;
                localStorage.setItem('quizVault_v5', JSON.stringify(quizVault));
                localStorage.setItem('activeQuizName_v5', activeQuizName);
                parseQuizCSV(evt.target.result);
                renderSidebarLists();
                document.getElementById('quizStatus').innerText = `✅ ${file.name}`;
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    // Clear cache
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

// ===== 9. PARSE QUIZ CSV =====
function parseQuizCSV(csvText) {
    const rows = parseCSVLine(csvText);
    quizQuestions = [];
    
    rows.forEach((row, idx) => {
        if (idx === 0) return;
        if (row.length >= 6) {
            const correct = parseInt(row[5]);
            quizQuestions.push({
                zhQ: row[0],
                viQ: 'Chọn đáp án đúng nhất:',
                options: [row[1], row[2], row[3], row[4]],
                correct: !isNaN(correct) ? correct - 1 : 0
            });
        }
    });
    
    userAnswers = new Array(quizQuestions.length).fill(null);
    buildQuizNavigation();
    renderQuizSection(0);
    updateQuizProgress();
}

// ===== 10. HỆ THỐNG HIGHLIGHT - QUAN TRỌNG NHẤT =====
function initHighlightSystem() {
    const popup = document.getElementById('notePopup');
    if (!popup) {
        console.error('❌ Không tìm thấy popup!');
        return;
    }

    console.log('🖍️ Đang khởi tạo hệ thống highlight...');

    // Biến lưu trạng thái
    let isPopupOpen = false;

    // Sự kiện mouseup - bắt sự kiện bôi đen
    document.addEventListener('mouseup', function(e) {
        // Nếu click vào popup thì bỏ qua
        if (popup.contains(e.target)) return;

        const selection = window.getSelection();
        const text = selection.toString().trim();

        // Nếu không có text hoặc text quá ngắn
        if (text.length < 2) {
            popup.style.display = 'none';
            isPopupOpen = false;
            return;
        }

        // KIỂM TRA XEM CÓ ĐANG Ở TAB NGUYÊN VĂN KHÔNG
        const tabOriginal = document.getElementById('tab-original');
        if (!tabOriginal || !tabOriginal.classList.contains('active')) {
            popup.style.display = 'none';
            isPopupOpen = false;
            return;
        }

        // KIỂM TRA XEM VĂN BẢN ĐƯỢC CHỌN CÓ NẰM TRONG CONTAINER KHÔNG
        const container = document.getElementById('originalContainer');
        if (!container) {
            popup.style.display = 'none';
            isPopupOpen = false;
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
            node = node.parentNode;
        }

        // Nếu không nằm trong container, ẩn popup
        if (!isInContainer) {
            popup.style.display = 'none';
            isPopupOpen = false;
            return;
        }

        // Lưu text được chọn
        window._selectedText = text;

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
        window._selectedBlock = blockIdx;

        // Tính vị trí hiển thị popup
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        let left = rect.left + window.scrollX;
        let top = rect.bottom + window.scrollY + 10;

        // Điều chỉnh vị trí để không bị tràn
        const popupWidth = 340;
        const popupHeight = 250;
        if (left + popupWidth > window.innerWidth) {
            left = window.innerWidth - popupWidth - 20;
        }
        if (top + popupHeight > window.scrollY + window.innerHeight) {
            top = rect.top + window.scrollY - popupHeight - 10;
        }
        if (left < 10) left = 10;
        if (top < 10) top = 10;

        // Hiển thị popup
        popup.style.display = 'block';
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
        isPopupOpen = true;

        // Cập nhật thông tin
        const blockInfo = document.getElementById('selectedBlockInfo');
        if (blockInfo) blockInfo.textContent = `Đoạn: ${blockIdx}`;

        // Xóa nội dung textarea cũ
        const textarea = document.getElementById('noteContent');
        if (textarea) {
            textarea.value = '';
            setTimeout(() => textarea.focus(), 100);
        }

        console.log(`📝 Đã chọn: "${text.substring(0, 30)}..." tại đoạn ${blockIdx}`);
    });

    // Sự kiện lưu ghi chú
    const saveBtn = document.getElementById('saveNoteBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            const text = window._selectedText || '';
            if (!text) {
                alert('⚠️ Chưa có văn bản nào được chọn!');
                return;
            }

            const textarea = document.getElementById('noteContent');
            const comment = textarea ? textarea.value.trim() : '';

            notes.push({
                id: Date.now(),
                text: text,
                comment: comment || '(Không có ghi chú)',
                color: 'yellow',
                block: window._selectedBlock || 'N/A',
                time: new Date().toLocaleString('vi-VN')
            });

            localStorage.setItem('studyNotes_v5', JSON.stringify(notes));
            popup.style.display = 'none';
            isPopupOpen = false;
            window.getSelection().removeAllRanges();
            
            alert('✅ Đã lưu ghi chú thành công!');
            console.log(`💾 Đã lưu ghi chú: "${text.substring(0, 30)}..."`);
        });
    }

    // Đóng popup
    const closeBtn = document.getElementById('closePopupBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            popup.style.display = 'none';
            isPopupOpen = false;
        });
    }

    // Đóng popup khi click ra ngoài
    document.addEventListener('mousedown', function(e) {
        if (isPopupOpen && !popup.contains(e.target)) {
            // Kiểm tra xem có đang bôi đen không
            const sel = window.getSelection();
            if (!sel.toString().trim()) {
                popup.style.display = 'none';
                isPopupOpen = false;
            }
        }
    });

    // Đóng popup bằng ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isPopupOpen) {
            popup.style.display = 'none';
            isPopupOpen = false;
        }
    });

    console.log('✅ Hệ thống highlight đã sẵn sàng!');
}

// ===== 11. RENDER NOTES =====
function renderNotes() {
    const container = document.getElementById('notesList');
    if (!container) return;
    
    if (notes.length === 0) {
        container.innerHTML = '<p style="color:#8c6870; text-align:center; padding:2rem;">📭 Chưa có ghi chú nào.</p>';
        return;
    }
    
    container.innerHTML = '';
    notes.slice().reverse().forEach(note => {
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

// Hàm xóa ghi chú
window.deleteNote = function(id) {
    if (confirm('Xóa ghi chú này?')) {
        notes = notes.filter(n => n.id !== id);
        localStorage.setItem('studyNotes_v5', JSON.stringify(notes));
        renderNotes();
    }
};

// ===== 12. QUIZ ENGINE =====
function initQuizEngine() {
    const checkBtn = document.getElementById('checkAnswersBtn');
    if (checkBtn) checkBtn.addEventListener('click', submitQuizScore);

    const resetBtn = document.getElementById('resetQuizBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            userAnswers.fill(null);
            document.getElementById('answer-section').style.display = 'none';
            renderQuizSection(0);
            updateQuizProgress();
            saveQuizProgress();
        });
    }

    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', function() {
            if (quizQuestions.length === 0) return;
            quizQuestions.sort(() => Math.random() - 0.5);
            userAnswers.fill(null);
            document.getElementById('answer-section').style.display = 'none';
            renderQuizSection(0);
            updateQuizProgress();
            saveQuizProgress();
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
        btn.textContent = `Câu ${start}-${end}`;
        btn.addEventListener('click', () => renderQuizSection(i));
        nav.appendChild(btn);
    }
}

function renderQuizSection(sectionIdx) {
    currentQuizSection = sectionIdx;
    const container = document.getElementById('quizContainer');
    if (!container || quizQuestions.length === 0) return;
    container.innerHTML = '';

    const navBtns = document.querySelectorAll('#quizSectionNav button');
    navBtns.forEach((btn, idx) => btn.classList.toggle('active-sec', idx === sectionIdx));

    const start = sectionIdx * questionsPerSection;
    const end = Math.min(start + questionsPerSection, quizQuestions.length);

    for (let i = start; i < end; i++) {
        const q = quizQuestions[i];
        const item = document.createElement('div');
        item.className = 'quiz-item';
        item.innerHTML = `<p class="quiz-question">Câu ${i + 1}: ${q.zhQ}</p>`;
        
        const list = document.createElement('ul');
        list.className = 'quiz-options';
        q.options.forEach((opt, optIdx) => {
            const li = document.createElement('li');
            li.textContent = opt;
            if (userAnswers[i] === optIdx) li.className = 'selected';
            li.addEventListener('click', function() {
                if (document.getElementById('answer-section').style.display === 'block') return;
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

    if (document.getElementById('answer-section').style.display === 'block') {
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
    let score = 0;
    const list = document.getElementById('answers-list');
    list.innerHTML = '';

    quizQuestions.forEach((q, idx) => {
        const correct = userAnswers[idx] === q.correct;
        if (correct) score++;
        list.innerHTML += `<div>Câu ${idx + 1}: ${correct ? '✅ Đúng' : '❌ Sai'}</div>`;
    });

    const percent = Math.round((score / quizQuestions.length) * 100);
    document.getElementById('answer-section').style.display = 'block';
    
    scoreHistory.push(percent);
    if (scoreHistory.length > 5) scoreHistory.shift();
    localStorage.setItem('quizScoreHistory_v5', JSON.stringify(scoreHistory));
    renderQuizChart();
    revealAnswers();
}

function revealAnswers() {
    document.querySelectorAll('.quiz-options li').forEach(li => {
        const item = li.closest('.quiz-item');
        const items = Array.from(document.getElementById('quizContainer').children);
        const idx = items.indexOf(item);
        const actualIdx = currentQuizSection * questionsPerSection + idx;
        const q = quizQuestions[actualIdx];
        if (!q) return;
        
        const optIdx = q.options.indexOf(li.textContent);
        if (optIdx === q.correct) {
            li.className = 'correct-answer';
        } else if (userAnswers[actualIdx] === optIdx) {
            li.className = 'wrong-answer';
        }
    });
}

// ===== 13. QUIZ CHART =====
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
