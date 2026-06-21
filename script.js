/* ==========================================================================
   1. ĐIỀU HƯỚNG TABS & CHẾ ĐỘ NỀN TỐI (DARK MODE)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo điều hướng 5 Tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Loại bỏ trạng thái active cũ
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Kích hoạt tab mới
            this.classList.add('active');
            const targetTab = document.getElementById(this.dataset.tab);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            
            // Nếu chuyển sang Tab 5 (Ghi chú), tiến hành tải lại danh sách
            if (this.dataset.tab === 'tab-notes') {
                renderNotes();
            }
        });
    });

    // Xử lý bật/tắt Dark Mode
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark');
            this.textContent = document.body.classList.contains('dark') ? '☀️ Light / 亮色' : '🌙 Dark / 暗黑';
        });
    }

    // Khởi chạy hệ thống Ghi chú và Trắc nghiệm
    initHighlightSystem();
    initQuizEngine();
});


/* ==========================================================================
   2. HỆ THỐNG HIGHLIGHT ĐỘNG & NHẬT KÝ GHI CHÚ (LOCALSTORAGE)
   ========================================================================== */
let notes = JSON.parse(localStorage.getItem('studyNotes_v2')) || [];
let curSelectedText = '';
let curSelectedColor = 'yellow';
let curBlockIdx = null;

function initHighlightSystem() {
    const originalContent = document.getElementById('tab-original');
    const notePopup = document.getElementById('notePopup');
    const closePopupBtn = document.getElementById('closePopupBtn');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const colorSpans = document.querySelectorAll('.color-options span');

    if (!originalContent || !notePopup) return;

    // Kích hoạt popup khi người dùng buông chuột sau khi bôi đen văn bản
    originalContent.addEventListener('mouseup', function(e) {
        const selection = window.getSelection();
        const txt = selection.toString().trim();
        
        // Chỉ kích hoạt nếu bôi đen từ 2 ký tự trở lên và nằm trong vùng học liệu
        if (txt.length < 2) return;

        curSelectedText = txt;
        
        // Truy vết khối song ngữ cha để đánh dấu vị trí phân đoạn gốc
        let parent = selection.anchorNode.parentNode;
        while (parent && parent !== originalContent && !parent.classList.contains('bilingual-block')) {
            parent = parent.parentNode;
        }
        curBlockIdx = (parent && parent.classList.contains('bilingual-block')) ? parent.dataset.block : "N/A";

        // Định vị Popup bám theo tọa độ click chuột của người dùng
        notePopup.style.display = 'block';
        notePopup.style.left = Math.min(e.clientX, window.innerWidth - 350) + 'px';
        notePopup.style.top = (e.clientY + window.scrollY + 15) + 'px';
        
        const noteTextarea = document.getElementById('noteContent');
        if (noteTextarea) noteTextarea.value = '';
    });

    // Đóng nhanh popup khi click dấu x
    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', () => {
            notePopup.style.display = 'none';
        });
    }

    // Chọn lựa màu sắc highlight mềm mại
    colorSpans.forEach(span => {
        span.addEventListener('click', function() {
            colorSpans.forEach(s => s.classList.remove('active'));
            this.classList.add('active');
            curSelectedColor = this.dataset.color;
        });
    });

    // Lưu trữ ghi chú trích xuất vào LocalStorage
    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', function() {
            const noteTextarea = document.getElementById('noteContent');
            const comment = noteTextarea ? noteTextarea.value.trim() : '';
            if (!curSelectedText) return;

            const newNote = {
                id: Date.now(),
                text: curSelectedText,
                comment: comment,
                color: curSelectedColor,
                block: curBlockIdx,
                time: new Date().toLocaleString('vi-VN')
            };

            notes.push(newNote);
            localStorage.setItem('studyNotes_v2', JSON.stringify(notes));
            notePopup.style.display = 'none';
            window.getSelection().removeAllRanges();
            
            alert('Đã trích xuất kiến thức thành công! Chuyển sang Tab "Ghi chú" để xem nhật ký tư duy.');
        });
    }

    // Tự động đóng popup nếu click ra ngoài vùng trống
    document.addEventListener('mousedown', function(e) {
        if (notePopup.style.display === 'block' && !notePopup.contains(e.target) && !e.target.closest('#tab-original')) {
            notePopup.style.display = 'none';
        }
    });
}

// Hàm hiển thị danh sách ghi chú tại Tab 5
function renderNotes() {
    const container = document.getElementById('notesList');
    if (!container) return;

    if (notes.length === 0) {
        container.innerHTML = '<p style="color:#8c6870; font-size:0.92rem; text-align:center; padding: 2rem 0;">Chưa có đoạn tri thức trích xuất nào. Hãy bôi đen văn bản ở Tab "Nguyên văn" để lưu trữ ghi chú cá nhân.</p>';
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
            <div style="padding:0.5rem 0.8rem; border-left: 5px solid ${colorHex}; background-color:rgba(240,240,240,0.15); font-style:italic; font-size:0.92rem; border-radius: 0 4px 4px 0;">
                "${note.text}"
            </div>
            <p style="margin-top:0.6rem; font-size:0.95rem; font-weight:bold; color:#3b2226;">👉 Nhận xét / Phân tích sư phạm: <span style="font-weight:normal; color:#5c3f45;">${note.comment || 'Chưa ghi chú bình luận.'}</span></p>
            <div class="note-meta">
                <span>📍 Vị trí: Đoạn gốc số ${note.block} | ⏰ Thời gian: ${note.time}</span>
                <span style="color:#bd4f60; cursor:pointer; font-weight:bold;" onclick="deleteNote(${note.id})">🗑 Xóa ghi chú</span>
            </div>
        `;
        container.appendChild(item);
    });
}

// Hàm xóa ghi chú
window.deleteNote = function(id) {
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem('studyNotes_v2', JSON.stringify(notes));
    renderNotes();
};


/* ==========================================================================
   3. ENGINE ĐIỀU KHIỂN QUIZ TRẮC NGHIỆM & ĐỒ THỊ LỊCH SỬ LƯU TRỮ
   ========================================================================== */
// Biến lưu trữ lịch sử 5 lần điểm số gần nhất
let scoreHistory = JSON.parse(localStorage.getItem('quizScoreHistory_v2')) || [];
const questionsPerSection = 3;

function initQuizEngine() {
    const shuffleBtn = document.getElementById('shuffleBtn');
    const resetQuizBtn = document.getElementById('resetQuizBtn');
    const checkAnswersBtn = document.getElementById('checkAnswersBtn');
    const resetStatsBtn = document.getElementById('resetStatsBtn');
    const secButtons = document.querySelectorAll('.section-nav button');

    if (!checkAnswersBtn) return; // Nếu chưa tải xong giao diện

    // Trình phân đoạn câu hỏi (Phân trang câu hỏi từ nút bấm)
    secButtons.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            renderSection(idx);
        });
    });

    // Nút trộn câu hỏi ngẫu nhiên
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            if (typeof quizQuestions !== 'undefined') {
                quizQuestions.sort(() => Math.random() - 0.5);
                userAnswers.fill(null);
                document.getElementById('answer-section').style.display = 'none';
                renderSection(0);
                updateProgress();
            }
        });
    }

    // Nút làm lại từ đầu
    if (resetQuizBtn) {
        resetQuizBtn.addEventListener('click', () => {
            if (typeof userAnswers !== 'undefined') {
                userAnswers.fill(null);
                document.getElementById('answer-section').style.display = 'none';
                renderSection(0);
                updateProgress();
            }
        });
    }

    // Nút chấm điểm nộp bài
    checkAnswersBtn.addEventListener('click', processQuizSubmission);

    // Nút xóa lịch sử thống kê điểm số
    if (resetStatsBtn) {
        resetStatsBtn.addEventListener('click', () => {
            scoreHistory = [];
            localStorage.removeItem('quizScoreHistory_v2');
            renderChart();
            document.getElementById('avgScoreDisplay').innerText = `Điểm trung bình: -- / 100`;
        });
    }

    // Khởi tạo trạng thái Quiz ban đầu
    setTimeout(() => {
        if (typeof quizQuestions !== 'undefined') {
            renderSection(0);
            updateProgress();
            renderChart();
        }
    }, 200);
}

// Hàm hiển thị phân đoạn câu hỏi theo tab nhỏ (Ví dụ: Câu 1-3, Câu 4-5)
function renderSection(sectionIdx) {
    const container = document.getElementById('quizContainer');
    const secButtons = document.querySelectorAll('.section-nav button');
    if (!container || typeof quizQuestions === 'undefined') return;

    container.innerHTML = '';
    secButtons.forEach((btn, idx) => {
        btn.classList.toggle('active-sec', idx === sectionIdx);
    });

    const start = sectionIdx * questionsPerSection;
    const end = Math.min(start + questionsPerSection, quizQuestions.length);

    for (let i = start; i < end; i++) {
        const q = quizQuestions[i];
        const item = document.createElement('div');
        item.className = 'quiz-item';
        
        const qText = document.createElement('p');
        qText.className = 'quiz-question';
        qText.innerHTML = `Câu ${i + 1}: ${q.zhQ}<br><span style="font-weight:normal; font-size:0.92rem; color:#705157;">${q.viQ}</span>`;
        item.appendChild(qText);

        const optionsList = document.createElement('ul');
        optionsList.className = 'quiz-options';

        q.options.forEach((opt, optIdx) => {
            const li = document.createElement('li');
            li.innerText = opt;
            li.dataset.q = i;
            li.dataset.opt = optIdx;

            // Đánh dấu nếu câu hỏi này đã được chọn trước đó
            if (userAnswers[i] === optIdx) {
                li.className = 'selected';
            }

            // Sự kiện chọn đáp án trắc nghiệm
            li.addEventListener('click', function() {
                // Nếu đã bấm nộp bài hiển thị đáp án thì khóa tương tác
                if (document.getElementById('answer-section').style.display === 'block') return;
                
                const qIndex = parseInt(this.dataset.q);
                const oIndex = parseInt(this.dataset.opt);
                userAnswers[qIndex] = oIndex;
                
                renderSection(sectionIdx);
                updateProgress();
            });

            optionsList.appendChild(li);
        });

        item.appendChild(optionsList);
        container.appendChild(item);
    }
    
    // Nếu hệ thống đã nộp bài, phải giữ nguyên trạng thái bôi màu đỏ/xanh kết quả
    if (document.getElementById('answer-section').style.display === 'block') {
        highlightAnswers();
    }
}

function updateProgress() {
    const progressEl = document.getElementById('quizProgress');
    if (!progressEl || typeof userAnswers === 'undefined') return;
    const answered = userAnswers.filter(a => a !== null).length;
    progressEl.innerText = `Đã trả lời: ${answered}/${userAnswers.length}`;
}

// Xử lý nộp bài, tính toán điểm số và đẩy vào đồ thị lịch sử
function processQuizSubmission() {
    if (typeof quizQuestions === 'undefined' || typeof userAnswers === 'undefined') return;
    
    let score = 0;
    const listContainer = document.getElementById('answers-list');
    listContainer.innerHTML = '';

    quizQuestions.forEach((q, idx) => {
        const isCorrect = userAnswers[idx] === q.correct;
        if (isCorrect) score++;

        const statusEl = document.createElement('div');
        statusEl.style.marginBottom = '0.4rem';
        statusEl.innerHTML = `Câu ${idx + 1}: ${isCorrect ? '<span style="color:#2b4c2b; font-weight:bold;">Đúng ✔</span>' : '<span style="color:#bd4f60; font-weight:bold;">Sai ✘</span>'}`;
        listContainer.appendChild(statusEl);
    });

    const finalScorePercent = Math.round((score / quizQuestions.length) * 100);
    document.getElementById('answer-section').style.display = 'block';

    // Lưu kết quả điểm số vào lịch sử mảng (Tối đa lưu 5 lần làm bài gần nhất)
    scoreHistory.push(finalScorePercent);
    if (scoreHistory.length > 5) scoreHistory.shift();
    localStorage.setItem('quizScoreHistory_v2', JSON.stringify(scoreHistory));
    
    renderChart();
    highlightAnswers();
}

// Bôi màu Đỏ (Sai) / Xanh (Đúng) trực quan sau khi nộp bài
function highlightAnswers() {
    document.querySelectorAll('.quiz-options li').forEach(li => {
        const qIdx = parseInt(li.dataset.q);
        const optIdx = parseInt(li.dataset.opt);
        const q = quizQuestions[qIdx];

        if (optIdx === q.correct) {
            li.classList.add('correct-answer');
        } else if (userAnswers[qIdx] === optIdx) {
            li.classList.add('wrong-answer');
        }
    });
}

// Vẽ đồ thị thống kê lịch sử làm bài bằng CSS thuần tinh tế
function renderChart() {
    const rowsContainer = document.getElementById('chartRows');
    if (!rowsContainer) return;
    
    rowsContainer.innerHTML = '';
    
    if (scoreHistory.length === 0) {
        rowsContainer.innerHTML = '<p style="font-size:0.88rem; color:#8c6870; font-style:italic;">Chưa có dữ liệu làm bài nào được ghi nhận.</p>';
        return;
    }

    let sum = 0;
    scoreHistory.forEach((score, idx) => {
        sum += score;
        const row = document.createElement('div');
        row.className = 'chart-row';
        row.innerHTML = `
            <span class="chart-label">Lần thi ${idx + 1}</span>
            <div class="chart-bar"><div class="chart-bar-fill" style="width: ${score}%"></div></div>
            <span class="chart-value">${score}đ</span>
        `;
        rowsContainer.appendChild(row);
    });

    const avg = Math.round(sum / scoreHistory.length);
    const avgDisplay = document.getElementById('avgScoreDisplay');
    if (avgDisplay) avgDisplay.innerText = `Điểm số trung bình hiện tại: ${avg} / 100`;
}
