/* =========================================
   1. الحالة العامة للمباراة (Game State)
   ========================================= */
let turn = 'X', gameActive = false, activeBigIdx = null;
let bigBoardStatus = Array(9).fill(null);
let fullLogic = Array(9).fill(null).map(() => Array(9).fill(null));

let selectedLevel = 1, timerLimit = 10, countdown, targetCell, correctAns;
let playerInput = "";

// ربط العناصر الرئيسية لضمان الوصول السريع
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const mathModal = document.getElementById('math-modal');
const helpModal = document.getElementById('help-modal');
const startBtn = document.getElementById('startActionBtn');

/* =========================================
   2. تهيئة الواجهة عند التشغيل (Initialization)
   ========================================= */
window.onload = () => {
    // التأكد من إخفاء النوافذ المنبثقة فور التحميل لمنع "التجميد"
    mathModal.style.display = "none";
    helpModal.style.display = "none";
    gameScreen.style.display = "none";
    
    // تفعيل اختيار المستويات من البطاقات
    document.querySelectorAll('.level-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.level-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedLevel = parseInt(card.dataset.lvl);
        });
    });

    // ربط زر البدء
    startBtn.onclick = launchGame;
};

/* =========================================
   3. منطق بدء المباراة (Game Launch)
   ========================================= */
function launchGame() {
    // جلب الإعدادات من الواجهة
    timerLimit = parseInt(document.getElementById('timerSelector').value);
    const nameX = document.getElementById('pXName').value || "TEAM X";
    const nameO = document.getElementById('pOName').value || "TEAM O";

    document.getElementById('view-X').textContent = nameX;
    document.getElementById('view-O').textContent = nameO;

    // تصفير البيانات
    bigBoardStatus.fill(null);
    fullLogic = Array(9).fill(null).map(() => Array(9).fill(null));
    turn = 'X'; activeBigIdx = null; gameActive = true;

    // بناء اللوحة هندسياً
    const boardContainer = document.getElementById('ultimate-board');
    boardContainer.innerHTML = '';

    for (let i = 0; i < 9; i++) {
        let lb = document.createElement('div');
        lb.className = 'local-board';
        lb.dataset.board = i;
        for (let j = 0; j < 9; j++) {
            let c = document.createElement('div');
            c.className = 'cell';
            c.dataset.cell = j;
            c.onclick = () => handleCellSelection(c);
            lb.appendChild(c);
        }
        boardContainer.appendChild(lb);
    }

    // الانتقال السلس بين الشاشات
    setupScreen.classList.add('hidden');
    setupScreen.style.display = "none";
    
    gameScreen.classList.remove('hidden');
    gameScreen.style.display = "flex";
    
    syncUI();
}

/* =========================================
   4. محرك الأسئلة الرياضية (Math Engine)
   ========================================= */
function generateTask() {
    let a, b, op, ans, display;
    const getNum = () => Math.floor(Math.random() * 8) + 2; // أرقام من 2 لـ 9

    const ops = ['+', '-', '*', '/'];
    const type = ops[Math.floor(Math.random() * ops.length)];

    // الحساب الأساسي
    if (type === '+') { a = getNum(); b = getNum(); ans = a + b; op = '+'; }
    else if (type === '-') { a = getNum() + 10; b = getNum(); ans = a - b; op = '-'; }
    else if (type === '*') { a = getNum(); b = getNum(); ans = a * b; op = '×'; }
    else { ans = getNum(); b = getNum(); a = ans * b; op = '÷'; }

    // تشكيل السؤال حسب المستوى
    switch(selectedLevel) {
        case 1: display = `${a} ${op} ${b} = ?`; correctAns = ans; break;
        case 2: 
            if (Math.random() > 0.5) { display = `? ${op} ${b} = ${ans}`; correctAns = a; }
            else { display = `${a} ${op} ? = ${ans}`; correctAns = b; }
            break;
        case 3: display = `? ${op} ? = ${ans}`; correctAns = a; break; // يمنع 1 برمجياً في getNum
        case 4: 
            let offset = Math.floor(Math.random() * 4) + 1;
            display = `${a} ${op} ${b} = ? + ${offset}`;
            correctAns = ans - offset;
            break;
    }

    document.getElementById('quest-text').textContent = display;
    document.getElementById('lvl-indicator').textContent = `المستوى 0${selectedLevel}`;
}

/* =========================================
   5. إدارة الحركة والمدخلات
   ========================================= */
function handleCellSelection(cell) {
    const bIdx = parseInt(cell.parentElement.dataset.board);
    if (!gameActive || cell.textContent || bigBoardStatus[bIdx]) return;
    if (activeBigIdx !== null && activeBigIdx !== bIdx) return;

    targetCell = cell;
    playerInput = "";
    document.getElementById('user-input').textContent = "_";
    
    // إظهار الحاسبة
    mathModal.style.display = "flex";
    mathModal.classList.remove('hidden');
    
    generateTask();
    initTimer();
}

function numPress(n) {
    playerInput += n;
    document.getElementById('user-input').textContent = playerInput;
    if (parseInt(playerInput) === correctAns) {
        clearInterval(countdown);
        setTimeout(completeMove, 300);
    } else if (playerInput.length >= 4) { numClear(); }
}

function completeMove() {
    mathModal.style.display = "none";
    const bIdx = parseInt(targetCell.parentElement.dataset.board);
    const cIdx = parseInt(targetCell.dataset.cell);

    targetCell.textContent = turn;
    targetCell.classList.add(turn);
    fullLogic[bIdx][cIdx] = turn;

    // توجيه الخصم (نظام اللعب الحر)
    activeBigIdx = (bigBoardStatus[cIdx] === null) ? cIdx : null;
    turn = (turn === 'X') ? 'O' : 'X';
    syncUI();
}

/* =========================================
   6. الوظائف المساعدة (Utilities)
   ========================================= */
function initTimer() {
    if (timerLimit === 0) return;
    let time = timerLimit;
    const progress = document.getElementById('progress');
    const text = document.getElementById('timer-text');
    
    clearInterval(countdown);
    countdown = setInterval(() => {
        time--;
        text.textContent = time;
        progress.style.strokeDashoffset = 283 - (time / timerLimit * 283);

        if (time <= 0) {
            clearInterval(countdown);
            mathModal.style.display = "none";
            activeBigIdx = null; // عقوبة: لعب حر للخصم
            turn = (turn === 'X') ? 'O' : 'X';
            syncUI();
        }
    }, 1000);
}

function syncUI() {
    document.getElementById('status-card-X').style.opacity = (turn === 'X') ? "1" : "0.3";
    document.getElementById('status-card-O').style.opacity = (turn === 'O') ? "1" : "0.3";
    
    document.querySelectorAll('.local-board').forEach((lb, i) => {
        lb.style.opacity = (activeBigIdx === null || activeBigIdx === i) ? "1" : "0.15";
        lb.style.pointerEvents = (activeBigIdx === null || activeBigIdx === i) ? "all" : "none";
    });

    document.getElementById('logic-banner').classList.toggle('hidden', activeBigIdx !== null);
}

function openInstructions() { helpModal.style.display = "flex"; helpModal.classList.remove('hidden'); }
function closeInstructions() { helpModal.style.display = "none"; helpModal.classList.add('hidden'); }
function numClear() { playerInput = ""; document.getElementById('user-input').textContent = "_"; }
function numDel() { playerInput = playerInput.slice(0, -1); document.getElementById('user-input').textContent = playerInput || "_"; }
function toggleDarkMode() { document.body.classList.toggle('dark-mode'); }
