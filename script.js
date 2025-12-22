/* =========================================
   1. المتغيرات والبيانات الأساسية
   ========================================= */
let currentTurn = 'X';
let isGameActive = false;
let activeBigIdx = null; // يحدد المربع الكبير المسموح اللعب فيه
let bigBoardStatus = Array(9).fill(null); 
let internalLogic = Array(9).fill(null).map(() => Array(9).fill(null));

let selectedLevel = 1, timerLimit, countdown, targetCell, mathAns;
let inputBuffer = "";

// ربط العناصر الرئيسية لضمان الوصول السريع وعدم تعطل الأزرار
const setupView = document.getElementById('setup-view');
const gameView = document.getElementById('game-view');
const mathModal = document.getElementById('modalMathChallenge');
const helpModal = document.getElementById('modalInstructions');

/* =========================================
   2. تهيئة الواجهة عند التشغيل
   ========================================= */
document.querySelectorAll('.level-box').forEach(box => {
    box.addEventListener('click', () => {
        document.querySelectorAll('.level-box').forEach(b => b.classList.remove('active'));
        box.classList.add('active');
        selectedLevel = parseInt(box.dataset.lvl);
    });
});

// تفعيل زر البدء بشكل مباشر وصارم
document.getElementById('btnStartGame').addEventListener('click', launchTheGame);

function launchTheGame() {
    // جلب الإعدادات
    timerLimit = parseInt(document.getElementById('timerConfig').value);
    const pX = document.getElementById('nameX').value || "TEAM X";
    const pO = document.getElementById('nameO').value || "TEAM O";
    
    document.getElementById('displayNameX').textContent = pX;
    document.getElementById('displayNameO').textContent = pO;

    // تصفير بيانات اللعبة
    bigBoardStatus.fill(null);
    internalLogic = Array(9).fill(null).map(() => Array(9).fill(null));
    currentTurn = 'X'; activeBigIdx = null; isGameActive = true;

    // بناء اللوحة هندسياً برمجياً لضمان التمركز
    const grid = document.getElementById('grid-ultimate-81');
    grid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const lb = document.createElement('div');
        lb.className = 'local-board';
        lb.dataset.board = i;
        for (let j = 0; j < 9; j++) {
            const c = document.createElement('div');
            c.className = 'cell';
            c.dataset.cell = j;
            c.onclick = () => onCellInteraction(c);
            lb.appendChild(c);
        }
        grid.appendChild(lb);
    }

    // الانتقال بين الشاشات
    setupView.classList.remove('active');
    gameView.classList.add('active');
    syncArenaState();
}

/* =========================================
   3. منطق التحدي الرياضي (المستويات 1-4)
   ========================================= */
function generateChallenge() {
    let a, b, op, ans, text;
    const getRnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    // محرك العمليات الأساسية
    const types = ['+', '-', '*', '/'];
    const type = types[Math.floor(Math.random() * types.length)];

    if (type === '+') { a = getRnd(1, 9); b = getRnd(1, 9); ans = a + b; op = '+'; }
    else if (type === '-') { a = getRnd(10, 18); b = getRnd(1, 9); ans = a - b; op = '-'; }
    else if (type === '*') { a = getRnd(2, 9); b = getRnd(2, 9); ans = a * b; op = '×'; }
    else { ans = getRnd(2, 9); b = getRnd(2, 9); a = ans * b; op = '÷'; }

    // تشكيل السؤال حسب المستوى المختار
    switch(selectedLevel) {
        case 1: text = `${a} ${op} ${b} = ?`; mathAns = ans; break;
        case 2: text = `? ${op} ${b} = ${ans}`; mathAns = a; break;
        case 3: text = `? ${op} ? = ${ans}`; mathAns = a; break; // يمنع 1 من getRnd
        case 4: let offset = getRnd(1, 3); text = `${a} ${op} ${b} = ? + ${offset}`; mathAns = ans - offset; break;
    }

    document.getElementById('math-equation-text').textContent = text;
    document.getElementById('math-lvl-tag').textContent = `تحدي المستوى 0${selectedLevel}`;
}

/* =========================================
   4. إدارة اللعب والحركة
   ========================================= */
function onCellInteraction(cell) {
    const bIdx = parseInt(cell.parentElement.dataset.board);
    if (!isGameActive || cell.textContent || bigBoardStatus[bIdx]) return;
    if (activeBigIdx !== null && activeBigIdx !== bIdx) return;

    targetCell = cell;
    inputBuffer = "";
    document.getElementById('math-input-preview').textContent = "_";
    
    mathModal.style.display = "flex";
    generateChallenge();
    initTimer();
}

function handleKeyPress(num) {
    inputBuffer += num;
    document.getElementById('math-input-preview').textContent = inputBuffer;
    if (parseInt(inputBuffer) === mathAns) {
        clearInterval(countdown);
        setTimeout(finalizeMove, 300);
    } else if (inputBuffer.length >= 4) { handleClear(); }
}

function finalizeMove() {
    mathModal.style.display = "none";
    const bIdx = parseInt(targetCell.parentElement.dataset.board);
    const cIdx = parseInt(targetCell.dataset.cell);

    targetCell.textContent = currentTurn;
    targetCell.classList.add(currentTurn);
    internalLogic[bIdx][cIdx] = currentTurn;

    // تحديد المربع التالي (قوة التوجيه)
    activeBigIdx = (bigBoardStatus[cIdx] === null) ? cIdx : null;
    currentTurn = (currentTurn === 'X') ? 'O' : 'X';
    syncArenaState();
}

/* =========================================
   5. المساعدات والواجهة
   ========================================= */
function initTimer() {
    if (timerLimit === 0) return;
    let s = timerLimit;
    const prog = document.getElementById('timer-progress');
    const txt = document.getElementById('timer-countdown');
    clearInterval(countdown);
    countdown = setInterval(() => {
        s--;
        txt.textContent = s;
        prog.style.strokeDashoffset = 283 - (s / timerLimit * 283);
        if (s <= 0) {
            clearInterval(countdown);
            mathModal.style.display = "none";
            activeBigIdx = null; 
            currentTurn = (currentTurn === 'X') ? 'O' : 'X';
            syncArenaState();
        }
    }, 1000);
}

function syncArenaState() {
    document.getElementById('p-stats-X').style.opacity = (currentTurn === 'X') ? "1" : "0.3";
    document.getElementById('p-stats-O').style.opacity = (currentTurn === 'O') ? "1" : "0.3";
    document.querySelectorAll('.local-board').forEach((lb, i) => {
        lb.style.opacity = (activeBigIdx === null || activeBigIdx === i) ? "1" : "0.1";
    });
    document.getElementById('free-play-msg').classList.toggle('hidden', activeBigIdx !== null);
}

function toggleInstructionModal(show) { helpModal.style.display = show ? "flex" : "none"; }
function toggleVisualMode() { document.body.classList.toggle('dark-mode'); }
function handleClear() { inputBuffer = ""; document.getElementById('math-input-preview').textContent = "_"; }
function handleDelete() { inputBuffer = inputBuffer.slice(0, -1); document.getElementById('math-input-preview').textContent = inputBuffer || "_"; }
