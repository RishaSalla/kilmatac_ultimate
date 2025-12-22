/* =========================================
   1. المتغيرات والبيانات الأساسية
   ========================================= */
let turn = 'X';
let gameActive = false;
let activeBigIdx = null; // المربع الكبير النشط حالياً
let bigBoardStatus = Array(9).fill(null); 
let fullLogic = Array(9).fill(null).map(() => Array(9).fill(null));

let currentLevel, timerDuration, timerInt, targetCellObj, correctAns;
let userAnsStr = "";

/* =========================================
   2. بناء الخلفية الرقمية (Digital Background)
   ========================================= */
function initBackground() {
    const layer = document.getElementById('background-canvas-layer');
    for (let i = 0; i < 40; i++) {
        const span = document.createElement('span');
        span.textContent = Math.floor(Math.random() * 9) + 1;
        span.style.position = 'absolute';
        span.style.left = Math.random() * 100 + 'vw';
        span.style.top = Math.random() * 100 + 'vh';
        span.style.fontSize = Math.random() * 20 + 10 + 'px';
        layer.appendChild(span);
    }
}
initBackground();

/* =========================================
   3. محرك الأسئلة الذكي (قواعد 1-9 و 1%)
   ========================================= */
function createMathQuest() {
    let a, b, op, ans, text;
    const lvl = parseInt(currentLevel);

    const getSafeNum = (allowOne) => {
        if (allowOne && Math.random() < 0.01) return 1;
        return Math.floor(Math.random() * 8) + 2; 
    };

    const opsList = ['+', '-', '*', '/'];
    const type = opsList[Math.floor(Math.random() * opsList.length)];

    if (type === '+') {
        a = getSafeNum(true); b = getSafeNum(true); ans = a + b; op = '+';
    } else if (type === '-') {
        a = Math.floor(Math.random() * 8) + 2;
        b = Math.floor(Math.random() * (a - 1)) + 1;
        ans = a - b; op = '-';
    } else if (type === '*') {
        a = getSafeNum(false); b = getSafeNum(false); ans = a * b; op = '×';
    } else if (type === '/') {
        ans = getSafeNum(false); b = getSafeNum(false); a = ans * b; op = '÷';
    }

    switch(lvl) {
        case 1: text = `${a} ${op} ${b} = ?`; correctAns = ans; break;
        case 2: 
            if (Math.random() > 0.5) { text = `? ${op} ${b} = ${ans}`; correctAns = a; }
            else { text = `${a} ${op} ? = ${ans}`; correctAns = b; }
            break;
        case 3: text = `? ${op} ? = ${ans}`; correctAns = a; break; 
        case 4: 
            let off = Math.floor(Math.random() * 2) + 1;
            text = `${a} ${op} ${b} = ? + ${off}`;
            correctAns = ans - off;
            break;
    }
    document.getElementById('equation-view').textContent = text;
}

/* =========================================
   4. إدارة المباراة (Logic & UI)
   ========================================= */
function startGame() {
    currentLevel = document.getElementById('diffLevel').value;
    timerDuration = parseInt(document.getElementById('timerVal').value);
    
    // تصفير اللوحة
    bigBoardStatus.fill(null);
    fullLogic = Array(9).fill(null).map(() => Array(9).fill(null));
    turn = 'X';
    activeBigIdx = null;
    gameActive = true;

    const container = document.getElementById('grid-81-container');
    container.innerHTML = '';

    for (let i = 0; i < 9; i++) {
        let lb = document.createElement('div');
        lb.className = 'local-board';
        lb.dataset.board = i;
        for (let j = 0; j < 9; j++) {
            let c = document.createElement('div');
            c.className = 'cell';
            c.dataset.cell = j;
            c.onclick = () => onCellClick(c);
            lb.appendChild(c);
        }
        container.appendChild(lb);
    }

    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    syncUI();
}

function onCellClick(cell) {
    const bIdx = parseInt(cell.parentElement.dataset.board);
    if (!gameActive || cell.dataset.content || bigBoardStatus[bIdx]) return;
    if (activeBigIdx !== null && activeBigIdx !== bIdx) return;

    targetCellObj = cell;
    userAnsStr = "";
    document.getElementById('ans-preview-box').textContent = "_";
    document.getElementById('correct-feedback').classList.add('hidden');
    document.getElementById('math-modal').classList.remove('hidden');
    
    createMathQuest();
    runTimer();
}

function numIn(n) {
    userAnsStr += n;
    document.getElementById('ans-preview-box').textContent = userAnsStr;
    if (parseInt(userAnsStr) === correctAns) {
        clearInterval(timerInt);
        document.getElementById('correct-feedback').classList.remove('hidden');
        setTimeout(completeMove, 500);
    } else if (userAnsStr.length >= 4) { numClear(); }
}

function completeMove() {
    document.getElementById('math-modal').classList.add('hidden');
    const bIdx = parseInt(targetCellObj.parentElement.dataset.board);
    const cIdx = parseInt(targetCellObj.dataset.cell);

    // فرض العلامة (الحل الجذري للزحف)
    targetCellObj.setAttribute('data-content', turn);
    fullLogic[bIdx][cIdx] = turn;

    // توجيه الخصم
    activeBigIdx = (bigBoardStatus[cIdx] === null) ? cIdx : null;
    turn = (turn === 'X') ? 'O' : 'X';
    syncUI();
}

function runTimer() {
    if (timerDuration === 0) return;
    let remain = timerDuration;
    const bar = document.getElementById('timer-fill');
    document.getElementById('timer-display').textContent = remain;
    
    clearInterval(timerInt);
    timerInt = setInterval(() => {
        remain--;
        bar.style.width = (remain / timerDuration * 100) + "%";
        document.getElementById('timer-display').textContent = remain;
        if (remain <= 0) {
            clearInterval(timerInt);
            document.getElementById('math-modal').classList.add('hidden');
            activeBigIdx = null; 
            turn = (turn === 'X') ? 'O' : 'X';
            syncUI();
        }
    }, 1000);
}

function syncUI() {
    document.getElementById('card-X').style.opacity = (turn === 'X') ? "1" : "0.5";
    document.getElementById('card-O').style.opacity = (turn === 'O') ? "1" : "0.5";
    
    document.querySelectorAll('.local-board').forEach((b, i) => {
        b.style.boxShadow = (activeBigIdx === i) ? "0 0 15px var(--accent)" : "none";
        b.style.opacity = (activeBigIdx === null || activeBigIdx === i) ? "1" : "0.2";
    });

    document.getElementById('free-play-alert').classList.toggle('hidden', activeBigIdx !== null);
}

function toggleDisplayMode() { document.body.classList.toggle('dark-mode'); }
function openHelp() { document.getElementById('help-modal').classList.remove('hidden'); }
function closeHelp() { document.getElementById('help-modal').classList.add('hidden'); }
function numClear() { userAnsStr = ""; document.getElementById('ans-preview-box').textContent = "_"; }
function numDel() { userAnsStr = userAnsStr.slice(0, -1); document.getElementById('ans-preview-box').textContent = userAnsStr || "_"; }
