// ==========================================================================
// BỘ BA ENGINE LƯU TRỮ ĐA TIẾN TRÌNH KHÉP KÍN (BẢN SỬA LỖI ĐỘNG BÔI ĐEN HIGHLIGHT)
// ==========================================================================
let quizQuestions = [];
let userAnswers = [];
let currentQuizSection = 0;
const questionsPerSection = 5;

// Kho lưu trữ dữ liệu vĩnh cửu đa bài học trong bộ nhớ ẩn trình duyệt
let docVault = JSON.parse(localStorage.getItem('docVault_v5')) || {};
let termVault = JSON.parse(localStorage.getItem('termVault_v5')) || {};
let quizVault = JSON.parse(localStorage.getItem('quizVault_v5')) || {};

let activeDocName = localStorage.getItem('activeDocName_v5') || '';
let activeTermName = localStorage.getItem('activeTermName_v5') || '';
let activeQuizName = localStorage.getItem('activeQuizName_v5') || '';

let scoreHistory = JSON.parse(localStorage.getItem('quizScoreHistory_v5')) || [];
let notes = JSON.parse(localStorage.getItem('studyNotes_v5')) || [];

let curSelectedText = '';
let curSelectedColor = 'yellow';
let curBlockIdx = null;

// Biến để theo dõi trạng thái popup
let isPopupVisible = false;

document.addEventListener('DOMContentLoaded', function() {
    // 1. Quản lý hệ thống chuyển đổi 5 Tabs mượt mà
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const targetTab = document.getElementById(this.dataset.tab);
            if (targetTab) targetTab.classList.add('active');
            if (this.dataset.tab === 'tab-notes') renderNotes();
        });
    });

    // 2. Chế độ ban đêm và Thanh Sidebar (Kiểm tra an toàn)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark');
            this.textContent = document.body.classList.contains('dark') ? '☀️ Light / 亮色' : '🌙 Dark / 暗黑';
        });
    }

    const sidebar = document.getElementById('progressSidebar');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }

    // 3. Xử lý sự kiện nạp file dữ liệu độc lập
    const csvDocInput = document.getElementById('csvDocInput');
    if (csvDocInput) {
        csvDocInput.addEventListener('change', function(e) {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                docVault[file.name] = evt.target.result;
                activeDocName = file.name;
                localStorage.setItem('docVault_v5', JSON.stringify(docVault));
                localStorage.setItem('activeDocName_v5', activeDocName);
                parseDocumentCSV(evt.target.result);
                renderSidebarLists();
                const docStatus = document.getElementById('docStatus');
                if (docStatus) docStatus.innerText = `✅ Đang chạy: ${file.name}`;
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    const csvTermInput = document.getElementById('csvTermInput');
    if (csvTermInput) {
        csvTermInput.addEventListener('change', function(e) {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                termVault[file.name] = evt.target.result;
                activeTermName = file.name;
                localStorage.setItem('termVault_v5', JSON.stringify(termVault));
                localStorage.setItem('activeTermName_v5', activeTermName);
                parseTermCSV(evt.target.result);
                renderSidebarLists();
                const termStatus = document.getElementById('termStatus');
                if (termStatus) termStatus.innerText = `✅ Đang chạy: ${file.name}`;
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    const csvQuizInput = document.getElementById('csvQuizInput');
    if (csvQuizInput) {
        csvQuizInput.addEventListener('change', function(e) {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                quizVault[file.name] = { csvText: evt.target.result, answers: [] };
                activeQuizName = file.name;
                localStorage.setItem('quizVault_v5', JSON.stringify(quizVault));
                localStorage.setItem('activeQuizName_v5', activeQuizName);
                parseQuizCSV(evt.target.result);
                renderSidebarLists();
                const quizStatus = document.getElementById('quizStatus');
                if (quizStatus) quizStatus.innerText = `✅ Đang chạy: ${file.name}`;
            };
            reader.readAsText(file, 'UTF-8');
        });
    }

    const clearAllCacheBtn = document.getElementById('clearAllCacheBtn');
    if (clearAllCacheBtn) {
        clearAllCacheBtn.addEventListener('click', function() {
            localStorage.clear();
            alert('Đã xóa sạch bộ nhớ tạm. Trang web sẽ tải lại!');
            window.location.reload();
        });
    }

    // Khởi động các Module lõi
    autoLoadSavedProgress();
    initHighlightSystem();
    initQuizEngine();
});

// KHÔI PHỤC TIẾN TRÌNH CŨ TỪ LOCALSTORAGE
function autoLoadSavedProgress() {
    if (activeDocName && docVault[activeDocName]) {
        parseDocumentCSV(docVault[activeDocName]);
        const docStatus = document.getElementById('docStatus');
        if (docStatus) docStatus.innerText = `✅ Khôi phục: ${activeDocName}`;
    }
    if (activeTermName && termVault[activeTermName]) {
        parseTermCSV(termVault[activeTermName]);
        const termStatus = document.getElementById('termStatus');
        if (termStatus) termStatus.innerText = `✅ Khôi phục: ${activeTermName}`;
    }
    if (activeQuizName && quizVault[activeQuizName]) {
        parseQuizCSV(quizVault[activeQuizName].csvText);
        if (quizVault[activeQuizName].answers && quizVault[activeQuizName].answers.length > 0) {
            userAnswers = quizVault[activeQuizName].answers;
        }
        const quizStatus = document.getElementById('quizStatus');
        if (quizStatus) quizStatus.innerText = `✅ Khôi phục: ${activeQuizName}`;
    }
    renderSidebarLists();
}

function renderSidebarLists() {
    const docList = document.getElementById('historyDocsList');
    const termList = document.getElementById('historyTermsList');
    const quizList = document.getElementById('historyQuizList');
    
    if (!docList || !termList || !quizList) return;
    docList.innerHTML = ''; termList.innerHTML = ''; quizList.innerHTML = '';

    Object.keys(docVault).forEach(name => {
        const item = document.createElement('div');
        item.className = `history-item ${name === activeDocName ? 'active-history' : ''}`;
        item.innerHTML = `📄 ${name}`;
        item.addEventListener('click', () => {
            activeDocName = name; localStorage.setItem('activeDocName_v5', activeDocName);
            parseDocumentCSV(docVault[name]); renderSidebarLists();
            const docStatus = document.getElementById('docStatus');
            if (docStatus) docStatus.innerText = `✅ Đang chạy: ${name}`;
        });
        docList.appendChild(item);
    });

    Object.keys(termVault).forEach(name => {
        const item = document.createElement('div');
        item.className = `history-item ${name === activeTermName ? 'active-history' : ''}`;
        item.innerHTML = `📚 ${name}`;
        item.addEventListener('click', () => {
            activeTermName = name; localStorage.setItem('termVault_v5', JSON.stringify(termVault));
            parseTermCSV(termVault[name]); renderSidebarLists();
            const termStatus = document.getElementById('termStatus');
            if (termStatus) termStatus.innerText = `✅ Đang chạy: ${name}`;
        });
        termList.appendChild(item);
    });

    Object.keys(quizVault).forEach(name => {
        const item = document.createElement('div');
        item.className = `history-item ${name === activeQuizName ? 'active-history' : ''}`;
        item.innerHTML = `📝 ${name}`;
        item.addEventListener('click', () => {
            if (activeQuizName && quizVault[activeQuizName]) {
                quizVault[activeQuizName].answers = userAnswers;
                localStorage.setItem('quizVault_v5', JSON.stringify(quizVault));
            }
            activeQuizName = name; localStorage.setItem('activeQuizName_v5', activeQuizName);
            parseQuizCSV(quizVault[name].csvText);
            if (quizVault[name].answers && quizVault[name].answers.length > 0) userAnswers = quizVault[name].answers;
            renderSidebarLists();
            const quizStatus = document.getElementById('quizStatus');
            if (quizStatus) quizStatus.innerText = `✅ Đang chạy: ${name}`;
            const answerSec = document.getElementById('answer-section');
            if (answerSec) answerSec.style.display = 'none';
            renderQuizSection(0); updateQuizProgress();
        });
        quizList.appendChild(item);
    });
}

// BỘ GIẢI MÃ CHUỖI CSV
function parseCSVLine(text) {
    let lines = text.split(/\r\n|\n/);
    return lines.map(line => {
        let result = []; let current = ''; let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            let char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
            else current += char;
        }
        result.push(current.trim()); return result;
    }).filter(row => row.length > 0 && row.some(cell => cell !== ''));
}

// BÚNG ĐIỀU KHIỂN HỌC LIỆU (TAB 1 & TAB 2)
function parseDocumentCSV(csvText) {
    const dataRows = parseCSVLine(csvText);
    const originalContainer = document.getElementById('originalContainer');
    const summaryContainer = document.getElementById('summaryContainer');
    
    if (!originalContainer || !summaryContainer) return;
    originalContainer.innerHTML = '';
    summaryContainer.innerHTML = '<div class="card">';
    
    let blockCount = 0; let lastBlockEl = null;

    dataRows.forEach((row, idx) => {
        if (idx === 0 && row[0] && row[0].toLowerCase().includes('type')) return;
        
        let type = row[0] ? row[0].toLowerCase().trim() : 'p';
        let zh = row[1] ? row[1].trim() : ''; 
        let vi = row[2] ? row[2].trim() : '';

        if (type === 'h') {
            const headingBlock = document.createElement('div');
            headingBlock.style.marginTop = '2.2rem'; headingBlock.style.borderBottom = '1px dashed #dbb1bc';
            headingBlock.innerHTML = `<h2 style="border:none; margin:0; padding:0; font-size:1.4rem;">${zh}</h2><p style="font-family:'American Typewriter', serif; color:#7d545e; font-size:1rem; font-style:italic; margin-top:0.2rem;">${vi}</p>`;
            originalContainer.appendChild(headingBlock);
            lastBlockEl = null;
        } 
        else if (lastBlockEl && (zh === '' || zh === '|' || zh === lastBlockEl.querySelector('.zh').innerText.trim())) {
            if (vi !== '') {
                const viContainer = lastBlockEl.querySelector('.vi');
                if (viContainer) viContainer.innerHTML += `<p style="margin-top: 0.5rem; border-left: none; padding-left: 0;">${vi}</p>`;
            }
        } 
        else {
            if (zh === '' && vi === '') return;
            const block = document.createElement('div');
            block.className = 'bilingual-block'; block.dataset.block = blockCount;
            block.innerHTML = `<div class="zh">${zh}</div><div class="vi">${vi}</div>`;
            originalContainer.appendChild(block);
            lastBlockEl = block;

            if (zh.length > 5 && (zh.length < 150 || blockCount % 2 === 0)) {
                summaryContainer.firstChild.innerHTML += `<div class="bilingual-block" style="border-left-color: #d48291; margin: 0.8rem 0;"><div class="zh" style="font-size:0.98rem;">🎯 <strong>${zh.substring(0, 45)}...</strong></div><div class="vi" style="font-size:0.92rem;">${vi}</div></div>`;
            }
            blockCount++;
        }
    });
    summaryContainer.firstChild.innerHTML += '</div>';
}

// BÚNG ĐIỀU KHIỂN THUẬT NGỮ (TAB 4)
function parseTermCSV(csvText) {
    const rows = parseCSVLine(csvText);
    const termsContainer = document.getElementById('termsContainer');
    if (!termsContainer) return;
    
    termsContainer.innerHTML = '<div class="card">';
    let count = 0;

    rows.forEach((row, idx) => {
        if (idx === 0) return;
        let zh = row[0] ? row[0].trim() : ''; 
        let vi = row[1] ? row[1].trim() : '';
        if (zh && vi) {
            const termEl = document.createElement('div');
            termEl.className = 'term-card';
            termEl.innerHTML = `<span class="term-zh">📌 ${zh}</span><span class="term-vi">${vi}</span>`;
            termsContainer.firstChild.appendChild(termEl);
            count++;
        }
    });
    termsContainer.firstChild.innerHTML += '</div>';
}

// BÚNG ĐIỀU KHIỂN TRẮC NGHIỆM CHUẨN ĐÚNG HỆ ĐẾM EXCEL 1-4
function parseQuizCSV(csvText) {
    const rows = parseCSVLine(csvText);
    quizQuestions = [];
    
    rows.forEach((row, idx) => {
        if (idx === 0) return;
        if (row.length >= 6) {
            let rawCorrect = parseInt(row[5]);
            let finalCorrect = !isNaN(rawCorrect) ? (rawCorrect - 1) : 0;

            quizQuestions.push({ 
                zhQ: row[0], 
                viQ: "Chọn đáp án đúng nhất dưới đây:", 
                options: [row[1], row[2], row[3], row[4]], 
                correct: finalCorrect
            });
        }
    });
    
    userAnswers = new Array(quizQuestions.length).fill(null);
    buildQuizNavigation(); 
    renderQuizSection(0); 
    updateQuizProgress();
}

// ==========================================================================
// HỆ THỐNG HIGHLIGHT - ĐÃ SỬA LỖI POPUP KHÔNG HIỆN
// ==========================================================================
function initHighlightSystem() {
    const notePopup = document.getElementById('notePopup');
    if (!notePopup) {
        console.warn('Không tìm thấy notePopup element');
        return;
    }

    // Lắng nghe sự kiện mouseup trên toàn bộ document
    document.addEventListener('mouseup', function(e) {
        // Nếu đang click vào popup thì bỏ qua
        if (notePopup.contains(e.target)) return;

        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        // Kiểm tra xem có text được chọn không
        if (selectedText.length < 2) {
            notePopup.style.display = 'none';
            isPopupVisible = false;
            return;
        }

        // KIỂM TRA XEM VĂN BẢN ĐƯỢC CHỌN CÓ NẰM TRONG VÙNG NỘI DUNG HỌC KHÔNG
        // Sử dụng nhiều cách kiểm tra khác nhau để đảm bảo tương thích
        let isInContent = false;
        let targetElement = e.target;
        
        // Kiểm tra xem target có nằm trong originalContainer không
        while (targetElement && targetElement !== document.body) {
            if (targetElement.id === 'originalContainer' || 
                targetElement.closest && targetElement.closest('#originalContainer')) {
                isInContent = true;
                break;
            }
            // Kiểm tra nếu đang ở tab original (tab-1)
            const tabContent = targetElement.closest ? targetElement.closest('.tab-content') : null;
            if (tabContent && tabContent.id === 'tab-original') {
                isInContent = true;
                break;
            }
            targetElement = targetElement.parentNode;
        }

        // Nếu không nằm trong vùng nội dung, ẩn popup và thoát
        if (!isInContent) {
            notePopup.style.display = 'none';
            isPopupVisible = false;
            return;
        }

        // Lưu text được chọn
        curSelectedText = selectedText;

        // Tìm block cha chứa đoạn văn bản được bôi đen
        let parent = selection.anchorNode.parentNode;
        let foundBlock = false;
        while (parent && parent !== document.body) {
            if (parent.classList && parent.classList.contains('bilingual-block')) {
                curBlockIdx = parent.dataset.block || "N/A";
                foundBlock = true;
                break;
            }
            parent = parent.parentNode;
        }
        if (!foundBlock) {
            curBlockIdx = "N/A";
        }

        // Tính toán vị trí hiển thị popup
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        let left = rect.left + window.scrollX;
        let top = rect.bottom + window.scrollY + 15;

        // Đảm bảo popup không bị tràn ra ngoài màn hình
        const popupWidth = 340;
        const popupHeight = 200;
        if (left + popupWidth > window.innerWidth) {
            left = window.innerWidth - popupWidth - 20;
        }
        if (top + popupHeight > window.scrollY + window.innerHeight) {
            top = rect.top + window.scrollY - popupHeight - 15;
        }
        if (left < 10) left = 10;
        if (top < 10) top = 10;

        // Hiển thị popup
        notePopup.style.display = 'block';
        notePopup.style.left = left + 'px';
        notePopup.style.top = top + 'px';
        isPopupVisible = true;

        // Xóa nội dung textarea cũ
        const noteContent = document.getElementById('noteContent');
        if (noteContent) {
            noteContent.value = '';
            noteContent.focus();
        }

        // Cập nhật thông báo block hiện tại
        const blockInfo = document.getElementById('selectedBlockInfo');
        if (blockInfo) {
            blockInfo.textContent = `Đoạn: ${curBlockIdx}`;
        }
    });

    // Sự kiện lưu ghi chú trích xuất vào bộ nhớ cục bộ
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', function() {
            const noteContent = document.getElementById('noteContent');
            const comment = noteContent ? noteContent.value.trim() : '';
            
            if (!curSelectedText) {
                alert('Chưa có văn bản nào được chọn!');
                return;
            }

            notes.push({
                id: Date.now(),
                text: curSelectedText,
                comment: comment || '(Không có ghi chú)',
                color: curSelectedColor,
                block: curBlockIdx,
                time: new Date().toLocaleString('vi-VN')
            });

            localStorage.setItem('studyNotes_v5', JSON.stringify(notes));
            notePopup.style.display = 'none';
            isPopupVisible = false;
            window.getSelection().removeAllRanges();
            alert('✅ Đã lưu ghi chú thành công! Hãy sang Tab 3 để xem nhật ký.');
        });
    }

    // Đóng popup
    const closePopupBtn = document.getElementById('closePopupBtn');
    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', function() {
            notePopup.style.display = 'none';
            isPopupVisible = false;
        });
    }

    // Đóng popup khi click ra ngoài
    document.addEventListener('mousedown', function(e) {
        if (isPopupVisible && !notePopup.contains(e.target)) {
            // Kiểm tra xem click có phải là đang bôi đen văn bản không
            const selection = window.getSelection();
            if (selection.toString().trim().length < 2) {
                notePopup.style.display = 'none';
                isPopupVisible = false;
            }
        }
    });

    // Đóng popup khi nhấn ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isPopupVisible) {
            notePopup.style.display = 'none';
            isPopupVisible = false;
        }
    });

    console.log('✅ Hệ thống Highlight đã được khởi tạo thành công!');
}

function renderNotes() {
    const container = document.getElementById('notesList'); if (!container) return;
    if (notes.length === 0) { container.innerHTML = '<p style="color:#8c6870; text-align:center; padding:2rem;">Chưa có dữ liệu trích xuất ghi chú nào.</p>'; return; }
    
    container.innerHTML = '';
    notes.forEach(note => {
        const item = document.createElement('div'); item.className = 'note-item';
        item.innerHTML = `<div style="padding:0.4rem 0.8rem; border-left: 5px solid #e3a6b2; background-color:rgba(240,240,240,0.15); font-style:italic;">"${note.text}"</div><p style="margin-top:0.5rem; font-weight:bold;">👉 Bình luận / Phân tích sư phạm: <span style="font-weight:normal;">${note.comment || 'Trống.'}</span></p><div class="note-meta"><span>📍 Phân đoạn gốc số: ${note.block} | Lịch sử lưu: ${note.time}</span><span style="color:#bd4f60; cursor:pointer; font-weight:bold;" onclick="deleteNote(${note.id})">🗑 Xóa</span></div>`;
        container.appendChild(item);
    });
}
window.deleteNote = function(id) { notes = notes.filter(n => n.id !== id); localStorage.setItem('studyNotes_v5', JSON.stringify(notes)); renderNotes(); };

// TRẮC NGHIỆM ENGINE
function initQuizEngine() {
    const checkAnswersBtn = document.getElementById('checkAnswersBtn');
    if (checkAnswersBtn) checkAnswersBtn.addEventListener('click', submitQuizScore);

    const resetQuizBtn = document.getElementById('resetQuizBtn');
    if (resetQuizBtn) {
        resetQuizBtn.addEventListener('click', () => { 
            userAnswers.fill(null); 
            const answerSec = document.getElementById('answer-section');
            if (answerSec) answerSec.style.display = 'none'; 
            renderQuizSection(0); updateQuizProgress(); saveCurrentQuizProgress(); 
        });
    }

    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => { 
            if (quizQuestions.length === 0) return; 
            quizQuestions.sort(() => Math.random() - 0.5); 
            userAnswers.fill(null); 
            const answerSec = document.getElementById('answer-section');
            if (answerSec) answerSec.style.display = 'none'; 
            renderQuizSection(0); updateQuizProgress(); saveCurrentQuizProgress(); 
        });
    }

    const resetStatsBtn = document.getElementById('resetStatsBtn');
    if (resetStatsBtn) {
        resetStatsBtn.addEventListener('click', () => { 
            scoreHistory = []; 
            localStorage.removeItem('quizScoreHistory_v5'); 
            renderQuizChart(); 
        });
    }
    renderQuizChart();
}

function buildQuizNavigation() {
    const nav = document.getElementById('quizSectionNav'); if (!nav) return;
    nav.innerHTML = '';
    const totalSections = Math.ceil(quizQuestions.length / questionsPerSection);
    for (let i = 0; i < totalSections; i++) {
        const btn = document.createElement('button'); 
        btn.innerText = `Câu ${i * questionsPerSection + 1}-${Math.min((i + 1) * questionsPerSection, quizQuestions.length)}`;
        btn.addEventListener('click', () => renderQuizSection(i)); 
        nav.appendChild(btn);
    }
}

function renderQuizSection(secIdx) {
    currentQuizSection = secIdx; const container = document.getElementById('quizContainer');
    const navButtons = document.querySelectorAll('#quizSectionNav button');
    
    if (!container || quizQuestions.length === 0) return; container.innerHTML = '';
    navButtons.forEach((btn, idx) => btn.classList.toggle('active-sec', idx === secIdx));

    const start = secIdx * questionsPerSection; const end = Math.min(start + questionsPerSection, quizQuestions.length);
    for (let i = start; i < end; i++) {
        const q = quizQuestions[i]; const item = document.createElement('div'); item.className = 'quiz-item';
        item.innerHTML = `<p class="quiz-question">Câu ${i + 1}: ${q.zhQ}</p>`;
        
        const optionsList = document.createElement('ul'); optionsList.className = 'quiz-options';
        q.options.forEach((opt, optIdx) => {
            const li = document.createElement('li'); li.innerText = opt; if (userAnswers[i] === optIdx) li.className = 'selected';
            li.addEventListener('click', function() {
                const answerSec = document.getElementById('answer-section');
                if (answerSec && answerSec.style.display === 'block') return; 
                userAnswers[i] = optIdx; saveCurrentQuizProgress(); renderQuizSection(currentQuizSection); updateQuizProgress();
            });
            optionsList.appendChild(li);
        });
        item.appendChild(optionsList); container.appendChild(item);
    }
    const answerSec = document.getElementById('answer-section');
    if (answerSec && answerSec.style.display === 'block') revealQuizAnswers();
}

function saveCurrentQuizProgress() {
    if (activeQuizName && quizVault[activeQuizName]) {
        quizVault[activeQuizName].answers = userAnswers;
        localStorage.setItem('quizVault_v5', JSON.stringify(quizVault));
    }
}
function updateQuizProgress() { 
    const progressEl = document.getElementById('quizProgress'); if (!progressEl) return;
    const answered = userAnswers.filter(a => a !== null).length; 
    progressEl.innerText = `Đã trả lời: ${answered}/${quizQuestions.length}`; 
}

function submitQuizScore() {
    if (quizQuestions.length === 0) return; let score = 0;
    const list = document.getElementById('answers-list'); if (!list) return;
    list.innerHTML = '';
    
    quizQuestions.forEach((q, idx) => {
        const correct = userAnswers[idx] === q.correct; if (correct) score++;
        list.innerHTML += `<div>Câu ${idx + 1}: ${correct ? '<span style="color:green;font-weight:bold;">Đúng ✔</span>' : '<span style="color:red;font-weight:bold;">Sai ✘</span>'}</div>`;
    });
    
    const percent = Math.round((score / quizQuestions.length) * 100);
    const answerSec = document.getElementById('answer-section');
    if (answerSec) answerSec.style.display = 'block';
    
    scoreHistory.push(percent); if (scoreHistory.length > 5) scoreHistory.shift();
    localStorage.setItem('quizScoreHistory_v5', JSON.stringify(scoreHistory));
    renderQuizChart(); revealQuizAnswers();
}

function revealQuizAnswers() {
    document.querySelectorAll('.quiz-options li').forEach(li => {
        let itemEl = li.closest('.quiz-item'); let questionNodes = Array.from(document.getElementById('quizContainer').children);
        let currentIdxInDom = questionNodes.indexOf(itemEl); let actualQuestionIdx = currentQuizSection * questionsPerSection + currentIdxInDom;
        let q = quizQuestions[actualQuestionIdx]; if (!q) return;
        let curOptIdx = q.options.indexOf(li.innerText);
        
        if (curOptIdx === q.correct) li.className = 'correct-answer';
        else if (userAnswers[actualQuestionIdx] === curOptIdx) li.className = 'wrong-answer';
    });
}

// THỐNG KÊ ĐỒ THỊ LỊCH SỬ
function renderQuizChart() {
    const rows = document.getElementById('chartRows'); if (!rows) return; rows.innerHTML = '';
    if (scoreHistory.length === 0) { rows.innerHTML = '<p style="font-size:0.88rem; font-style:italic;">Chưa có dữ liệu thống kê điểm số.</p>'; return; }
    let sum = 0; scoreHistory.forEach((score, idx) => { sum += score; rows.innerHTML += `<div class="chart-row"><span class="chart-label">Lần ${idx + 1}</span><div class="chart-bar"><div class="chart-bar-fill" style="width: ${score}%"></div></div><span class="chart-value">${score}đ</span></div>`; });
    const avgScoreDisplay = document.getElementById('avgScoreDisplay');
    if (avgScoreDisplay) avgScoreDisplay.innerText = `Điểm số trung bình: ${Math.round(sum / scoreHistory.length)} / 100`;
}
