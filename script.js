// BIẾN TOÀN CỤC CHỨA CƠ SỞ DỮ LIỆU
let quizQuestions = [];
let userAnswers = [];
let currentQuizSection = 0;
const questionsPerSection = 5; // Gom mỗi cụm 5 câu hỏi để giao diện gọn gàng
let scoreHistory = JSON.parse(localStorage.getItem('quizScoreHistory_v3')) || [];
let notes = JSON.parse(localStorage.getItem('studyNotes_v3')) || [];

let curSelectedText = '';
let curSelectedColor = 'yellow';
let curBlockIdx = null;

document.addEventListener('DOMContentLoaded', function() {
    // 1. Quản lý hệ thống chuyển Tabs
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

    // 2. Chuyển đổi Dark Mode
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark');
            this.textContent = document.body.classList.contains('dark') ? '☀️ Light / 亮色' : '🌙 Dark / 暗黑';
        });
    }

    // 3. Lắng nghe sự kiện nạp file CSV học liệu (data.csv)
    document.getElementById('csvDocInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(evt) {
            const text = evt.target.result;
            parseDocumentCSV(text);
            document.getElementById('docStatus').innerText = `✅ Đã nạp xong: ${file.name}`;
        };
        reader.readAsText(file, 'UTF-8');
    });

    // 4. Lắng nghe sự kiện nạp file CSV trắc nghiệm (quiz.csv)
    document.getElementById('csvQuizInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(evt) {
            const text = evt.target.result;
            parseQuizCSV(text);
            document.getElementById('quizStatus').innerText = `✅ Đã nạp xong: ${file.name}`;
        };
        reader.readAsText(file, 'UTF-8');
    });

    // Khởi tạo các cấu phần bổ trợ
    initHighlightSystem();
    initQuizEngine();
});

// BỘ GIẢI MÃ CSV CHUYÊN DỤNG (Hỗ trợ bọc dấu ngoặc kép có chứa dấu phẩy bên trong văn bản)
function parseCSVLine(text) {
    let lines = text.split(/\r\n|\n/);
    return lines.map(line => {
        let result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            let char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }).filter(row => row.length > 1);
}

// BÚNG DỮ LIỆU HỌC LIỆU RA CÁC TABS (1), (2), (4)
function parseDocumentCSV(csvText) {
    const dataRows = parseCSVLine(csvText);
    const originalContainer = document.getElementById('originalContainer');
    const summaryContainer = document.getElementById('summaryContainer');
    const termsContainer = document.getElementById('termsContainer');
    
    originalContainer.innerHTML = '';
    summaryContainer.innerHTML = '<div class="card">';
    termsContainer.innerHTML = '<div class="card">';
    
    let blockCount = 0;

    dataRows.forEach((row) => {
        // Bỏ qua dòng tiêu đề gốc đầu tiên nếu có chữ 'type' hoặc 'zhongwen'
        if (row[0].toLowerCase().includes('type')) return;
        
        let type = row[0] ? row[0].toLowerCase().trim() : 'p';
        let zh = row[1] ? row[1] : '';
        let vi = row[2] ? row[2] : '';

        if (type === 'h') {
            // Nếu là dòng tiêu đề: Dựng Heading h2 song ngữ sang Tab 1
            const headingBlock = document.createElement('div');
            headingBlock.style.marginTop = '2rem';
            headingBlock.style.borderBottom = '1px dashed #dbb1bc';
            headingBlock.innerHTML = `
                <h2 style="border:none; margin:0; padding:0; font-size:1.4rem;">${zh}</h2>
                <p style="font-family:'American Typewriter', serif; color:#7d545e; font-size:1rem; font-style:italic; margin-top:0.2rem;">${vi}</p>
            `;
            originalContainer.appendChild(headingBlock);
        } else {
            // Nếu là dòng đoạn văn: Tạo khối song ngữ mượt mà sang Tab 1
            const block = document.createElement('div');
            block.className = 'bilingual-block';
            block.dataset.block = blockCount;
            block.innerHTML = `
                <div class="zh">${zh}</div>
                <div class="vi">${vi}</div>
            `;
            originalContainer.appendChild(block);

            // Trích xuất tự động sang Tab 2 (Tóm tắt sơ bộ theo các đoạn cốt lõi ngắn)
            if (zh.length < 120 || blockCount % 2 === 0) {
                summaryContainer.firstChild.innerHTML += `
                    <div class="bilingual-block" style="border-left-color: #d48291; margin: 0.8rem 0;">
                        <div class="zh" style="font-size:0.98rem;">🎯 <strong>${zh.substring(0, 60)}...</strong></div>
                        <div class="vi" style="font-size:0.92rem;">${vi}</div>
                    </div>
                `;
            }

            // Trích xuất tự động sang Tab 4 (Tìm các thuật ngữ nằm trong ngoặc hoặc cụm từ khóa)
            let matches = zh.match(/《[^》]+》|“[^”]+”/g);
            if (matches) {
                matches.forEach(match => {
                    termsContainer.firstChild.innerHTML += `
                        <div class="term-card">
                            <span class="term-zh">📌 ${match}</span>
                            <span class="term-vi">Nằm trong ngữ cảnh: ${vi.substring(0, 80)}...</span>
                        </div>
                    `;
                });
            }
            
            blockCount++;
        }
    });
    
    if (summaryContainer.firstChild.innerHTML === '') {
        summaryContainer.innerHTML = '<p style="color:#8c6870;">Không có đủ dữ liệu để tạo tóm tắt.</p>';
    } else {
        summaryContainer.firstChild.innerHTML += '</div>';
    }
    
    if (termsContainer.firstChild.innerHTML === '') {
        termsContainer.innerHTML = '<p style="color:#8c6870;">Không tìm thấy thuật ngữ cổ văn đặc thù nào trong văn bản.</p>';
    } else {
        termsContainer.firstChild.innerHTML += '</div>';
    }
}

// BÚNG DỮ LIỆU TRẮC NGHIỆM SANG TAB (5)
function parseQuizCSV(csvText) {
    const rows = parseCSVLine(csvText);
    quizQuestions = [];

    rows.forEach(row => {
        if (row[0].toLowerCase().includes('zhq')) return; // Bỏ qua dòng header
        
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

/* ==========================================================================
   4. LOGIC ĐIỀU KHIỂN HIGHLIGHT NOTE (TAB 3)
   ========================================================================== */
function initHighlightSystem() {
    const originalContent = document.getElementById('tab-original');
    const notePopup = document.getElementById('notePopup');
    const closePopupBtn = document.getElementById('closePopupBtn');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const colorSpans = document.querySelectorAll('.color-options span');

    if (!originalContent || !notePopup) return;

    originalContent.addEventListener('mouseup', function(e) {
        const selection = window.getSelection();
        const txt = selection.toString().trim();
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
        document.getElementById('noteContent').value = '';
    });

    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', () => { notePopup.style.display = 'none'; });
    }

    colorSpans.forEach(span => {
        span.addEventListener('click', function() {
            colorSpans.forEach(s => s.classList.remove('active'));
            this.classList.add('active');
            curSelectedColor = this.dataset.color;
        });
    });

    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', function() {
            const comment = document.getElementById('noteContent').value.trim();
            if (!curSelectedText) return;

            notes.push({
                id: Date.now(),
                text: curSelectedText,
                comment: comment,
                color: curSelectedColor,
                block: curBlockIdx,
                time: new Date().toLocaleString('vi-VN')
            });

            localStorage.setItem('studyNotes_v3', JSON.stringify(notes));
            notePopup.style.display = 'none';
            window.getSelection().removeAllRanges();
            alert('Đã ghi lại ghi chú! Hãy chuyển qua Tab "Ghi chú" để ôn tập.');
        });
    }
}

function renderNotes() {
    const container = document.getElementById('notesList');
    if (!container) return;

    if (notes.length === 0) {
        container.innerHTML = '<p style="color:#8c6870; font-size:0.92rem; text-align:center; padding: 2rem 0;">Chưa có trích xuất ghi chú nào. Hãy bôi đen học liệu tại Tab "Nguyên văn" để lưu trữ kiến thức.</p>';
        return;
    }

    container.innerHTML = '';
    notes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item';
        let colorHex = '#fff1a1';
        if (note.color === 'green') colorHex = '#c3ebd0';
        if (note.color === 'blue') colorHex = '#cce3f7';
        if (note.color === 'pink') colorHex = '#f7cbd6';

        item.innerHTML = `
            <div style="padding:0.4rem 0.8rem; border-left: 5px solid ${colorHex}; background-color:rgba(240,240,240,0.15); font-style:italic; font-size:0.92rem;">
                "${note.text}"
            </div>
            <p style="margin-top:0.5rem; font-size:0.95rem; font-weight:bold; color:#3b2226;">👉 Bình luận cá nhân: <span style="font-weight:normal; color:#5c3f45;">${note.comment || 'Trống.'}</span></p>
            <div class="note-meta">
                <span>📍 Phân đoạn đoạn văn số: ${note.block} | Lịch lưu: ${note.time}</span>
                <span style="color:#bd4f60; cursor:pointer; font-weight:bold;" onclick="deleteNote(${note.id})">🗑 Xóa</span>
            </div>
        `;
        container.appendChild(item);
    });
}

window.deleteNote = function(id) {
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem('studyNotes_v3', JSON.stringify(notes));
    renderNotes();
};

/* ==========================================================================
   5. LOGIC ENGINE TRẮC NGHIỆM TRỰC QUAN (TAB 5)
   ========================================================================== */
function initQuizEngine() {
    document.getElementById('checkAnswersBtn').addEventListener('click', submitQuizScore);
    document.getElementById('resetQuizBtn').addEventListener('click', () => {
        userAnswers.fill(null);
        document.getElementById('answer-section').style.display = 'none';
        renderQuizSection(0);
        updateQuizProgress();
    });
    document.getElementById('shuffleBtn').addEventListener('click', () => {
        if (quizQuestions.length === 0) return;
        quizQuestions.sort(() => Math.random() - 0.5);
        userAnswers.fill(null);
        document.getElementById('answer-section').style.display = 'none';
        renderQuizSection(0);
        updateQuizProgress();
    });
    document.getElementById('resetStatsBtn').addEventListener('click', () => {
        scoreHistory = [];
        localStorage.removeItem('quizScoreHistory_v3');
        renderQuizChart();
        document.getElementById('avgScoreDisplay').innerText = `Điểm trung bình: -- / 100`;
    });

    renderQuizChart();
}

function buildQuizNavigation() {
    const nav = document.getElementById('quizSectionNav');
    nav.innerHTML = '';
    const totalSections = Math.ceil(quizQuestions.length / questionsPerSection);

    for (let i = 0; i < totalSections; i++) {
        const btn = document.createElement('button');
        btn.innerText = `Câu ${i * questionsPerSection + 1} - ${Math.min((i + 1) * questionsPerSection, quizQuestions.length)}`;
        btn.addEventListener('click', () => renderQuizSection(i));
        nav.appendChild(btn);
    }
}

function renderQuizSection(secIdx) {
    currentQuizSection = secIdx;
    const container = document.getElementById('quizContainer');
    const navButtons = document.querySelectorAll('#quizSectionNav button');
    
    if (!container || quizQuestions.length === 0) return;
    container.innerHTML = '';

    navButtons.forEach((btn, idx) => {
        btn.classList.toggle('active-sec', idx === secIdx);
    });

    const start = secIdx * questionsPerSection;
    const end = Math.min(start + questionsPerSection, quizQuestions.length);

    for (let i = start; i < end; i++) {
        const q = quizQuestions[i];
        const item = document.createElement('div');
        item.className = 'quiz-item';
        item.innerHTML = `<p class="quiz-question">Câu ${i + 1}: ${q.zhQ}<br><span style="font-weight:normal; font-size:0.92rem; color:#705157;">${q.viQ}</span></p>`;

        const optionsList = document.createElement('ul');
        optionsList.className = 'quiz-options';

        q.options.forEach((opt, optIdx) => {
            const li = document.createElement('li');
            li.innerText = opt;
            if (userAnswers[i] === optIdx) li.className = 'selected';

            li.addEventListener('click', function() {
                if (document.getElementById('answer-section').style.display === 'block') return; // Khóa khi đã nộp bài
                userAnswers[i] = optIdx;
                renderQuizSection(currentQuizSection);
                updateQuizProgress();
            });
            optionsList.appendChild(li);
        });

        item.appendChild(optionsList);
        container.appendChild(item);
    }

    if (document.getElementById('answer-section').style.display === 'block') {
        revealQuizAnswers();
    }
}

function updateQuizProgress() {
    const answered = userAnswers.filter(a => a !== null).length;
    document.getElementById('quizProgress').innerText = `Đã trả lời: ${answered}/${quizQuestions.length}`;
}

function submitQuizScore() {
    if (quizQuestions.length === 0) return;
    let score = 0;
    const list = document.getElementById('answers-list');
    list.innerHTML = '';

    quizQuestions.forEach((q, idx) => {
        const correct = userAnswers[idx] === q.correct;
        if (correct) score++;
        list.innerHTML += `<div>Câu ${idx + 1}: ${correct ? '<span style="color:green;font-weight:bold;">Đúng ✔</span>' : '<span style="color:red;font-weight:bold;">Sai ✘</span>'}</div>`;
    });

    const percent = Math.round((score / quizQuestions.length) * 100);
    document.getElementById('answer-section').style.display = 'block';

    scoreHistory.push(percent);
    if (scoreHistory.length > 5) scoreHistory.shift();
    localStorage.setItem('quizScoreHistory_v3', JSON.stringify(scoreHistory));

    renderQuizChart();
    revealQuizAnswers();
}

function revealQuizAnswers() {
    document.querySelectorAll('.quiz-options li').forEach(li => {
        // Tìm câu hỏi tương ứng trong khối DOM hiển thị hiện tại
        let itemEl = li.closest('.quiz-item');
        let questionNodes = Array.from(document.getElementById('quizContainer').children);
        let currentIdxInDom = questionNodes.indexOf(itemEl);
        let actualQuestionIdx = currentQuizSection * questionsPerSection + currentIdxInDom;

        let q = quizQuestions[actualQuestionIdx];
        if (!q) return;

        // Trích xuất text option để so sánh index chuẩn xác
        let optionsTextArray = q.options;
        let curOptIdx = optionsTextArray.indexOf(li.innerText);

        if (curOptIdx === q.correct) {
            li.className = 'correct-answer';
        } else if (userAnswers[actualQuestionIdx] === curOptIdx) {
            li.className = 'wrong-answer';
        }
    });
}

function renderQuizChart() {
    const rows = document.getElementById('chartRows');
    if (!rows) return;
    rows.innerHTML = '';

    if (scoreHistory.length === 0) {
        rows.innerHTML = '<p style="font-size:0.88rem; color:#8c6870; font-style:italic;">Chưa có dữ liệu làm bài thi.</p>';
        return;
    }

    let sum = 0;
    scoreHistory.forEach((score, idx) => {
        sum += score;
        rows.innerHTML += `
            <div class="chart-row">
                <span class="chart-label">Lần ${idx + 1}</span>
                <div class="chart-bar"><div class="chart-bar-fill" style="width: ${score}%"></div></div>
                <span class="chart-value">${score}đ</span>
            </div>
        `;
    });
    document.getElementById('avgScoreDisplay').innerText = `Điểm số trung bình: ${Math.round(sum / scoreHistory.length)} / 100`;
}
