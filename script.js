/* =========================================
   1. المتغيرات والبيانات الأساسية
   ========================================= */
let currentTurn = 'X';
let isGameActive = false;
let activeBigSquare = null; 
let bigBoardStatus = Array(9).fill(null); 
let internalLogic = Array(9).fill(null).map(() => Array(9).fill(null));

let selectedLevel = 1;
let timeLimit, timerInterval, targetCell, mathAnswer;
let currentInputStr = "";

// ربط العناصر برمجياً لضمان عدم التعطل
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const btnLaunch = document.getElementById('btnLaunchGame');
const boardWrapper = document.getElementById('board-81-wrapper');

/* =========================================
   2. نظام إدارة المستويات والبطاقات
   ========================================= */
document.querySelectorAll('.lvl-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.lvl-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedLevel = parseInt(card.dataset.lvl);
    });
});

/* =========================================
   3. دالة بدء اللعبة (الحل الجذري لتعطل الأزرار)
   ========================================= */
btnLaunch.onclick = () => {
    // جلب الإعدادات
    timeLimit = parseInt(document.getElementById('selectTimer').value);
    const nameX = document.getElementById('inputNameX').value || "TEAM X";
    const nameO = document.getElementById('inputNameO').value || "TEAM O";
    
    document.getElementById('displayNameX').textContent = nameX;
    document.getElementById('displayNameO').textContent = nameO;

    // تصفير بيانات اللعب
    bigBoardStatus.fill(null);
    internalLogic = Array(9).fill(null).map(() => Array(9).fill(null));
    currentTurn = 'X';
    activeBigSquare = null;
    isGameActive = true;

    // بناء اللوحة برمجياً لضمان الدقة الهندسية
    boardWrapper.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const localBoard = document.createElement('div');
        localBoard.className = 'local-board';
        localBoard.dataset.board = i;
        
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.cell = j;
            cell.onclick = () => handleCellClick(cell);
            localBoard.appendChild(cell);
        }
        boardWrapper.appendChild(localBoard);
    }

    // الانتقال بين الشاشات
    setupScreen.classList.add('hidden');
    setupScreen.classList.remove('active');
    gameScreen.classList.remove('hidden');
    gameScreen.classList.add('active');
    
    updateUI();
};

/* =========================================
   4. منطق اللعب والتوجيه الاستراتيجي
   ========================================= */
function handleCellClick(cell) {
    const bIdx = parseInt(cell.parentElement.dataset.board);
    const cIdx = parseInt(cell.dataset.cell);

    if (!isGameActive || cell.textContent || bigBoardStatus[bIdx]) return;
    
    // التحقق من نظام التوجيه (أو اللعب الحر)
    if (activeBigSquare !== null && activeBigSquare !== bIdx) return;

    targetCell = cell;
    currentInputStr = "";
    document.getElementById('mathPreview').textContent = "_";
    
    // توليد التحدي الرياضي بناءً على المستوى المختار
    generateMathChallenge();
    
    // فتح نافذة التحدي
    document.getElementById('modalMath').classList.remove('hidden');
    startTimer();
}

/* =========================================
   5. محرك التحدي الرياضي (المستويات 1-4)
   ========================================= */
function generateMathChallenge() {
    let a, b, op, ans, display;
    const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    if (selectedLevel === 1) { // كلاسيكي
        a = getRandom(1, 9); b = getRandom(1, 9);
        ans = a + b; display = `${a} + ${b} = ?`;
    } 
    else if (selectedLevel === 2) { // عدد مفقود
        a = getRandom(2, 12); b = getRandom(2, 5); ans = a * b;
        display = `? × ${b} = ${ans}`; mathAnswer = a; return;
    } 
    else if (selectedLevel === 3) { // فراغ مزدوج (يمنع الرقم 1)
        a = getRandom(2, 9); b = getRandom(2, 9);
        ans = a * b; display = `? × ? = ${ans}`;
    } 
    else { // ميزان
        a = getRandom(5, 15); b = 3; let c = 4;
        ans = (a + b) - c; display = `${a} + ${b} = ? + ${c}`;
    }

    mathAnswer = ans;
    document.getElementById('mathLevelTag').textContent = `مستوى ${selectedLevel}`;
    document.getElementById('mathEquation').textContent = display;
}

/* =========================================
   6. لوحة مفاتيح التحدي ومعالجة الإدخال
   ========================================= */
function pressKey(num) {
    currentInputStr += num;
    document.getElementById('mathPreview').textContent = currentInputStr;
    
    if (parseInt(currentInputStr) === mathAnswer) {
        clearInterval(timerInterval);
        setTimeout(executeMove, 300);
    } else if (currentInputStr.length >= 3) {
        clearKey();
    }
}

function executeMove() {
    document.getElementById('modalMath').classList.add('hidden');
    const bIdx = parseInt(targetCell.parentElement.dataset.board);
    const cIdx = parseInt(targetCell.dataset.cell);

    targetCell.textContent = currentTurn;
    targetCell.classList.add(currentTurn);
    internalLogic[bIdx][cIdx] = currentTurn;

    // التحقق من الفوز في المربع المحلي
    if (checkWin(internalLogic[bIdx])) {
        bigBoardStatus[bIdx] = currentTurn;
        targetCell.parentElement.classList.add('captured-' + currentTurn);
        targetCell.parentElement.innerHTML = `<div class="big-mark">${currentTurn}</div>`;
    }

    // تحديد التوجيه القادم (قوة اللعب الحر)
    activeBigSquare = (bigBoardStatus[cIdx] === null) ? cIdx : null;

    // تبديل الدور
    currentTurn = (currentTurn === 'X') ? 'O' : 'X';
    updateUI();
}

/* =========================================
   7. المساعدات البرمجية والواجهة
   ========================================= */
function startTimer() {
    if (timeLimit === 0) return;
    let sec = timeLimit;
    const prog = document.getElementById('ring-progress');
    const text = document.getElementById('timerText');
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        sec--;
        text.textContent = sec;
        prog.style.strokeDashoffset = 283 - (sec / timeLimit * 283);

        if (sec <= 0) {
            clearInterval(timerInterval);
            document.getElementById('modalMath').classList.add('hidden');
            activeBigSquare = null; // عقوبة: الخصم يأخذ لعب حر
            currentTurn = (currentTurn === 'X') ? 'O' : 'X';
            updateUI();
        }
    }, 1000);
}

function updateUI() {
    document.getElementById('cardX').style.opacity = (currentTurn === 'X') ? "1" : "0.4";
    document.getElementById('cardO').style.opacity = (currentTurn === 'O') ? "1" : "0.4";
    
    const boards = document.querySelectorAll('.local-board');
    boards.forEach((b, i) => {
        b.style.opacity = (activeBigSquare === null || activeBigSquare === i) ? "1" : "0.1";
        b.style.pointerEvents = (activeBigSquare === null || activeBigSquare === i) ? "all" : "none";
    });

    document.getElementById('statusBanner').classList.toggle('hidden', activeBigSquare !== null);
}

function checkWin(board) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return lines.some(l => board[l[0]] && board[l[0]] === board[l[1]] && board[l[0]] === board[l[2]]);
}

function toggleHelpModal(show) { document.getElementById('modalHelp').classList.toggle('hidden', !show); }
function toggleDarkMode() { document.body.classList.toggle('dark-mode'); }
function clearKey() { currentInputStr = ""; document.getElementById('mathPreview').textContent = "_"; }
function delKey() { currentInputStr = currentInputStr.slice(0, -1); document.getElementById('mathPreview').textContent = currentInputStr || "_"; }
