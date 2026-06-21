// ==========================================================================
// BỘ BA ENGINE LƯU TRỮ ĐA TIẾN TRÌNH KHÉP KÍN (VERSION CHỐNG LỆCH PHA DỮ LIỆU)
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

    // 2. Chế độ ban đêm trầm lắng (Dark Mode) và Thanh Sidebar
    document.getElementById('themeToggle').addEventListener('click', function() {
        document.body.classList.toggle('dark');
        this.textContent = document.body.classList.contains('dark') ? '☀️ Light / 亮色' : '🌙 Dark / 暗黑';
    });

    const sidebar = document.getElementById('progressSidebar');
    document.getElementById('sidebarToggleBtn').addEventListener('click', function() {
        sidebar.classList.toggle('open');
    });

    // 3. Xử lý sự kiện nạp 3 file dữ liệu hoàn toàn độc lập thông qua File Input
    document.getElementById('csvDocInput').addEventListener('change', function(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            docVault[file.name] = evt.target.result;
            activeDocName = file.name;
            localStorage.setItem('docVault_v5', JSON.stringify(docVault));
            localStorage.setItem('activeDocName_v5', activeDocName);
            parseDocumentCSV(evt.target.result);
            renderSidebarLists();
            document.getElementById('docStatus').innerText = `✅ Đang chạy: ${file.name}`;
        };
        reader.readAsText(file, 'UTF-8');
    });

    document.getElementById('csvTermInput').addEventListener('change', function(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            termVault[file.name] = evt.target.result;
            activeTermName = file.name;
            localStorage.setItem('termVault_v5', JSON.stringify(termVault));
            localStorage.setItem('activeTermName_v5', activeTermName);
            parseTermCSV(evt.target.result);
            renderSidebarLists();
            document.getElementById('termStatus').innerText = `✅ Đang chạy: ${file.name}`;
        };
        reader.readAsText(file, 'UTF-8');
    });

    document.getElementById('csvQuizInput').addEventListener('change', function(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            quizVault[file.name] = { csvText: evt.target.result, answers: [] };
            activeQuizName = file.name;
            localStorage.setItem('quizVault_v5', JSON.stringify(quizVault));
            localStorage.setItem('activeQuizName_v5', activeQuizName);
            parseQuizCSV(evt.target.result);
            renderSidebarLists();
            document.getElementById('quizStatus').innerText = `✅ Đang chạy: ${file.name}`;
        };
        reader.readAsText(file, 'UTF-8');
    });

    // Nút xóa toàn bộ dữ liệu lưu trữ đệm cục bộ
    document.getElementById('clearAllCacheBtn').addEventListener('click', function() {
        localStorage.clear();
        alert('Đã xóa sạch bộ nhớ tạm của trình duyệt. Trang web sẽ khởi động lại!');
        window.location.reload();
    });

    // Tự động khôi phục dữ liệu tiến trình học tập cũ từ bộ nhớ ẩn nếu có sẵn
    autoLoadSavedProgress();
    initHighlightSystem();
    initQuizEngine();
});

// KHÔI PHỤC TIẾN TRÌNH KHI BẤM F5 TẢI LẠI TRANG
function autoLoadSavedProgress() {
    if (activeDocName && docVault[activeDocName]) {
        parseDocumentCSV(docVault[activeDocName]);
        document.getElementById('docStatus').innerText = `✅ Khôi phục: ${activeDocName}`;
    }
    if (activeTermName && termVault[activeTermName]) {
        parseTermCSV(termVault[activeTermName]);
        document.getElementById('termStatus').innerText = `✅ Khôi phục: ${activeTermName}`;
    }
    if (activeQuizName && quizVault[activeQuizName]) {
        parseQuizCSV(quizVault[activeQuizName].csvText);
        if (quizVault[activeQuizName].answers && quizVault[activeQuizName].answers.length > 0) {
            userAnswers = quizVault[activeQuizName].answers;
        }
        document.getElementById('quizStatus').innerText = `✅ Khôi phục: ${activeQuizName}`;
    }
    renderSidebarLists();
}

// DỰNG DANH SÁCH LỊCH SỬ TIẾN TRÌNH TRÊN THANH BAR GÓC MÀN HÌNH
function renderSidebarLists() {
    const docList = document.getElementById('historyDocsList');
    const termList = document.getElementById('historyTermsList');
    const quizList = document.getElementById('historyQuizList');
    
    if (!docList || !termList || !quizList) return;
    docList.innerHTML = ''; termList.innerHTML = ''; quizList.innerHTML = '';

    // Khôi phục học liệu
    Object.keys(docVault).forEach(name => {
        const item = document.createElement('div');
        item.className = `history-item ${name === activeDocName ? 'active-history' : ''}`;
        item.innerHTML = `📄 ${name}`;
        item.title = name;
        item.addEventListener('click', () => {
            activeDocName = name; localStorage.setItem('activeDocName_v5', activeDocName);
            parseDocumentCSV(docVault[name]); renderSidebarLists();
            document.getElementById('docStatus').innerText = `✅ Đang chạy: ${name}`;
        });
        docList.appendChild(item);
    });

    // Khôi phục bộ thuật ngữ
    Object.keys(termVault).forEach(name => {
        const item = document.createElement('div');
        item.className = `history-item ${name === activeTermName ? 'active-history' : ''}`;
        item.innerHTML = `📚 ${name}`;
        item.title = name;
        item.addEventListener('click', () => {
            activeTermName = name; localStorage.setItem('activeTermName_v5', activeTermName);
            parseTermCSV(termVault[name]); renderSidebarLists();
            document.getElementById('termStatus').innerText = `✅ Đang chạy: ${name}`;
        });
        termList.appendChild(item);
    });

    // Khôi phục bài thi trắc nghiệm dở dang
    Object.keys(quizVault).forEach(name => {
        const item = document.createElement('div');
        item.className = `history-item ${name === activeQuizName ? 'active-history' : ''}`;
        item.innerHTML = `📝 ${name}`;
        item.title = name;
        item.addEventListener('click', () => {
            if (activeQuizName && quizVault[activeQuizName]) {
                quizVault[activeQuizName].answers = userAnswers;
                localStorage.setItem('quizVault_v5', JSON.stringify(quizVault));
            }
            activeQuizName = name; localStorage.setItem('activeQuizName_v5', activeQuizName);
            parseQuizCSV(quizVault[name].csvText);
            if (quizVault[name].answers && quizVault[name].answers.length > 0) userAnswers = quizVault[name].answers;
            renderSidebarLists();
            document.getElementById('quizStatus').innerText = `✅ Đang chạy: ${name}`;
            document.getElementById('answer-section').style.display = 'none';
            renderQuizSection(0); updateQuizProgress();
        });
        quizList.appendChild(item);
    });
}

// BỘ GIẢI MÃ CSV TRUYỀN THỐNG CHẤT LƯỢNG CAO (Hỗ trợ ngoặc kép bao chuỗi phức tạp)
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
    }).filter(row => row.length > 1 || (row.length === 1 && row[0] !== ''));
}

// BÚNG DỮ LIỆU FILE HỌC LIỆU (TAB 1: NGUYÊN VĂN & TAB 2: TÓM TẮT ĐỘNG)
// Thuật toán tích hợp cơ chế tự gộp nối đoạn tiếng Việt mồ côi vào khối tiếng Trung phía trước
function parseDocumentCSV(csvText) {
    const dataRows = parseCSVLine(csvText);
    const originalContainer = document.getElementById('originalContainer');
    const summaryContainer = document.getElementById('summaryContainer');
    
    if (!originalContainer || !summaryContainer) return;
    
    originalContainer.innerHTML = '';
    summaryContainer.innerHTML = '<div class="card">';
    
    let blockCount = 0;
    let lastBlockEl = null; // Ghi nhớ khối song ngữ gần nhất để phục vụ việc append dòng dịch mồ côi

    dataRows.forEach((row) => {
        if (row[0] && row[0].toLowerCase().includes('type')) return; // Bỏ qua dòng header mẫu
        
        let type = row[0] ? row[0].toLowerCase().trim() : 'p';
        let zh = row[1] ? row[1].trim() : ''; 
        let vi = row[2] ? row[2].trim() : '';

        // TRƯỜNG HỢP 1: DÒNG TIÊU ĐỀ ĐỀ MỤC SÁCH
        if (type === 'h') {
            const headingBlock = document.createElement('div');
            headingBlock.style.marginTop = '2.2rem'; 
            headingBlock.style.borderBottom = '1px dashed #dbb1bc';
            headingBlock.innerHTML = `
                <h2 style="border:none; margin:0; padding:0; font-size:1.4rem;">${zh}</h2>
                <p style="font-family:'American Typewriter', serif; color:#7d545e; font-size:1rem; font-style:italic; margin-top:0.2rem;">${vi}</p>
            `;
            originalContainer.appendChild(headingBlock);
            lastBlockEl = null; // Đứt mạch khối cũ khi va chạm tiêu đề bài mới
        } 
        // TRƯỜNG HỢP 2: LỖI LỆCH PHA - Một tiếng Trung ứng với nhiều dòng tiếng Việt mồ côi bên dưới
        // Nhận diện khi: Có khối cũ đứng trước VÀ (Cột Trung bị rỗng HOẶC chứa ký tự nối dòng '|' HOẶC lặp lại tiêu đề nhỏ)
        else if (lastBlockEl && (zh === '' || zh === '|' || zh === lastBlockEl.querySelector('.zh').innerText.trim())) {
            if (vi !== '') {
                // Tự gộp nội dung tiếng Việt mồ côi vào khối cũ dưới dạng một paragraph mới, không sinh ra khối trống
                const viContainer = lastBlockEl.querySelector('.vi');
                if (viContainer) {
                    viContainer.innerHTML += `<p style="margin-top: 0.5rem; border-left: none; padding-left: 0;">${vi}</p>`;
                }
            }
        } 
        // TRƯỜNG HỢP 3: KHỐI SONG NGỮ MỚI CHUẨN XÁC, TOÀN VẸN
        else {
            if (zh === '' && vi === '') return; // Bỏ qua hoàn toàn hàng trống rỗng hoàn toàn

            const block = document.createElement('div');
            block.className = 'bilingual-block'; 
            block.dataset.block = blockCount;
            block.innerHTML = `
                <div class="zh">${zh}</div>
                <div class="vi">${vi}</div>
            `;
            originalContainer.appendChild(block);
            lastBlockEl = block; // Lưu con trỏ tham chiếu phục vụ gộp dòng phía sau

            // Tự động phân hóa các phân đoạn ngắn tiêu biểu sang Tab 2 (Tóm tắt sơ yếu)
            if (zh.length > 5 && (zh.length < 150 || blockCount % 2 === 0)) {
                summaryContainer.firstChild.innerHTML += `
                    <div class="bilingual-block" style="border-left-color: #d48291; margin: 0.8rem 0;">
                        <div class="zh" style="font-size:0.98rem;">🎯 <strong>${zh.substring(0, 45)}...</strong></div>
                        <div class="vi" style="font-size:0.92rem;">${vi}</div>
                    </div>
                `;
            }
            blockCount++;
        }
    });
    
    summaryContainer.firstChild.innerHTML += '</div>';
    if (blockCount === 0) {
        originalContainer.innerHTML = '<p class="empty-message">Vui lòng chọn nạp file "data.csv" ở trên để hiển thị nội dung nguyên văn...</p>';
    }
}

// BÚNG DỮ LIỆU FILE THUẬT NGỮ ĐỘC LẬP (TAB 4: THUẬT NGỮ CỐ ĐỊNH)
function parseTermCSV(csvText) {
    const rows = parseCSVLine(csvText);
    const termsContainer = document.getElementById('termsContainer');
    if (!termsContainer) return;
    
    termsContainer.innerHTML = '<div class="card">';
    let count = 0;

    rows.forEach(row => {
        if (row[0] && (row[0].toLowerCase().includes('zhongwen') || row[0].toLowerCase().includes('term'))) return;
        let zh = row[0] || ''; let vi = row[1] || '';
        if (zh && vi) {
            const termEl = document.createElement('div');
            termEl.className = 'term-card';
            termEl.innerHTML = `<span class="term-zh">📌 ${zh}</span><span class="term-vi">${vi}</span>`;
            termsContainer.firstChild.appendChild(termEl);
            count++;
        }
    });
    
    termsContainer.firstChild.innerHTML += '</div>';
    if (count === 0) {
        termsContainer.innerHTML = '<p class="empty-message">Vui lòng chọn nạp file "terms.csv" ở trên để hiển thị danh mục thuật ngữ học thuật...</p>';
    }
}

// BÚNG DỮ LIỆU FILE TRẮC NGHIỆM ĐỘC LẬP (TAB 5: CÂU HỎI LUYỆN TẬP)
function parseQuizCSV(csvText) {
    const rows = parseCSVLine(csvText);
    quizQuestions = [];
    
    rows.forEach(row => {
        if (row[0] && row[0].toLowerCase().includes('zhq')) return; // Bỏ qua header cột
        if (row.length >= 7) {
            quizQuestions.push({ 
                zhQ: row[0], 
                viQ: row[1], 
                options: [row[2], row[3], row[4], row[5]], 
                correct: parseInt(row[6]) || 0 
            });
        }
    });
    
    userAnswers = new Array(quizQuestions.length).fill(null);
    buildQuizNavigation(); 
    renderQuizSection(0); 
    updateQuizProgress();
}

// HIGHLIGHT ĐỘNG & POPUP TRÍCH XUẤT NHẬT KÝ GHI CHÚ (TAB 3)
function initHighlightSystem() {
    const originalContent = document.getElementById('tab-original');
    const notePopup = document.getElementById('notePopup');
    if (!originalContent || !notePopup) return;

    originalContent.addEventListener('mouseup', function(e) {
        const selection = window.getSelection(); const txt = selection.toString().trim();
        if (txt.length < 2) return;
        curSelectedText = txt;
        
        let parent = selection.anchorNode.parentNode;
        while (parent && parent !== originalContent && !parent.classList.contains('bilingual-block')) {
            parent = parent.parentNode;
        }
        curBlockIdx = (parent && parent.classList.contains('bilingual-block')) ? parent.dataset.block : "N/A";
        
        notePopup.style.display = 'block';
        notePopup.style.left = Math.min(e.clientX, window.innerWidth - 350) + 'px';
        notePopup.style.top = (e.clientY + window.scrollY + 15) + 'px';
    });

    document.getElementById('saveNoteBtn').addEventListener('click', function() {
        const comment = document.getElementById('noteContent').value.trim();
        notes.push({ 
            id: Date.now(), 
            text: curSelectedText, 
            comment: comment, 
            color: curSelectedColor, 
            block: curBlockIdx, 
            time: new Date().toLocaleString('vi-VN') 
        });
        
        localStorage.setItem('studyNotes_v5', JSON.stringify(notes));
        notePopup.style.display = 'none'; 
        window.getSelection().removeAllRanges();
        alert('Đã lưu tri thức trích xuất thành công!');
    });
    
    document.getElementById('closePopupBtn').addEventListener('click', () => { notePopup.style.display = 'none'; });
}

function renderNotes() {
    const container = document.getElementById('notesList'); if (!container) return;
    if (notes.length === 0) { container.innerHTML = '<p style="color:#8c6870; text-align:center; padding:2rem;">Chưa có dữ liệu trích xuất ghi chú nào.</p>'; return; }
    
    container.innerHTML = '';
    notes.forEach(note => {
        const item = document.createElement('div'); item.className = 'note-item';
        item.innerHTML = `
            <div style="padding:0.4rem 0.8rem; border-left: 5px solid #e3a6b2; background-color:rgba(240,240,240,0.15); font-style:italic;">"${note.text}"</div>
            <p style="margin-top:0.5rem; font-weight:bold;">👉 Bình luận / Phân tích sư phạm: <span style="font-weight:normal;">${note.comment || 'Trống.'}</span></p>
            <div class="note-meta">
                <span>📍 Phân đoạn gốc số: ${note.block} | Lịch sử lưu: ${note.time}</span>
                <span style="color:#bd4f60; cursor:pointer; font-weight:bold;" onclick="deleteNote(${note.id})">🗑 Xóa</span>
            </div>
        `;
        container.appendChild(item);
    });
}
window.deleteNote = function(id) { 
    notes = notes.filter(n => n.id !== id); 
    localStorage.setItem('studyNotes_v5', JSON.stringify(notes)); 
    renderNotes(); 
};

// TRẮC NGHIỆM ENGINE PHẢN XẠ LUYỆN TẬP
function initQuizEngine() {
    document.getElementById('checkAnswersBtn').addEventListener('click', submitQuizScore);
    document.getElementById('resetQuizBtn').addEventListener('click', () => { 
        userAnswers.fill(null); 
        document.getElementById('answer-section').style.display = 'none'; 
        renderQuizSection(0); updateQuizProgress(); saveCurrentQuizProgress(); 
    });
    document.getElementById('shuffleBtn').addEventListener('click', () => { 
        if (quizQuestions.length === 0) return; 
        quizQuestions.sort(() => Math.random() - 0.5); 
        userAnswers.fill(null); 
        document.getElementById('answer-section').style.display = 'none'; 
        renderQuizSection(0); updateQuizProgress(); saveCurrentQuizProgress(); 
    });
    document.getElementById('resetStatsBtn').addEventListener('click', () => { 
        scoreHistory = []; 
        localStorage.removeItem('quizScoreHistory_v5'); 
        renderQuizChart(); 
    });
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
        item.innerHTML = `<p class="quiz-question">Câu ${i + 1}: ${q.zhQ}<br><span style="font-weight:normal; font-size:0.92rem; color:#705157;">${q.viQ}</span></p>`;
        
        const optionsList = document.createElement('ul'); optionsList.className = 'quiz-options';
        q.options.forEach((opt, optIdx) => {
            const li = document.createElement('li'); li.innerText = opt; if (userAnswers[i] === optIdx) li.className = 'selected';
            li.addEventListener('click', function() {
                if (document.getElementById('answer-section').style.display === 'block') return;
                userAnswers[i] = optIdx; saveCurrentQuizProgress(); renderQuizSection(currentQuizSection); updateQuizProgress();
            });
            optionsList.appendChild(li);
        });
        item.appendChild(optionsList); container.appendChild(item);
    }
    if (document.getElementById('answer-section').style.display === 'block') revealQuizAnswers();
}

function saveCurrentQuizProgress() {
    if (activeQuizName && quizVault[activeQuizName]) {
        quizVault[activeQuizName].answers = userAnswers;
        localStorage.setItem('quizVault_v5', JSON.stringify(quizVault));
    }
}
function updateQuizProgress() { 
    const progressEl = document.getElementById('quizProgress');
    if (!progressEl) return;
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
    document.getElementById('answer-section').style.display = 'block';
    
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

function renderQuizChart() {
    const rows = document.getElementById('chartRows'); if (!rows) return; rows.innerHTML = '';
    if (scoreHistory.length === 0) { rows.innerHTML = '<p style="font-size:0.88rem; font-style:italic;">Chưa có dữ liệu thống kê điểm số.</p>'; return; }
    
    let sum = 0; 
    scoreHistory.forEach((score, idx) => { 
        sum += score; 
        rows.innerHTML += `<div class="chart-row"><span class="chart-label">Lần ${idx + 1}</span><div class="chart-bar"><div class="chart-bar-fill" style="width: ${score}%"></div></div><span class="chart-value">${score}đ</span></div>`; 
    });
    document.getElementById('avgScoreDisplay').innerText = `Điểm số trung bình: ${Math.round(sum / scoreHistory.length)} / 100`;
}
