// =========================================
// 1. الإعدادات والمتغيرات العالمية
// =========================================
let gameBoard = Array(9).fill(null).map(() => Array(9).fill(null));
let metaBoard = Array(9).fill(null);
let activeLocalBoard = null;
let currentTeam = 'X';
let gameActive = false;
let mathOp, timeLimit, countdown, targetCell, currentAns;
let playerAnswer = "";
let questionPool = []; // لمنع التكرار

// القسمة الذهبية (بدون رقم 1)
const goldDiv = [
    {a: 4, b: 2, ans: 2}, {a: 6, b: 2, ans: 3}, {a: 8, b: 2, ans: 4},
    {a: 6, b: 3, ans: 2}, {a: 9, b: 3, ans: 3}, {a: 8, b: 4, ans: 2}
];

// =========================================
// 2. إدارة الخلفية المتحركة (Matrix - نسخة هادئة)
// =========================================
function initMatrixBg() {
    const bg = document.getElementById('matrix-bg');
    const cols = Math.floor(window.innerWidth / 30);
    for (let i = 0; i < cols; i++) {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = (i * 30) + 'px';
        div.style.top = '-50px';
        div.style.color = '#475569';
        div.style.fontSize = '12px';
        div.style.transition = 'top 5s linear'; // سقوط بطيء جداً
        div.innerText = Math.floor(Math.random() * 9);
        bg.appendChild(div);
        
        // تحريك هادئ
        setInterval(() => {
            let top = parseInt(div.style.top);
            if (top > window.innerHeight) {
                div.style.top = '-50px';
            } else {
                div.style.top = (top + 2) + 'px';
            }
            if (Math.random() > 0.9) div.innerText = Math.floor(Math.random() * 9);
        }, 50);
    }
}

// =========================================
// 3. منطق توليد الأسئلة (منع التكرار + الضيف الخفيف)
// =========================================
function generateQuestion() {
    let qText, ans;
    let attempts = 0;
    
    do {
        let a, b, op;
        let type = mathOp === 'random' ? ['add', 'sub', 'mul', 'div'][Math.floor(Math.random()*4)] : mathOp;
        
        if (type === 'div') {
            const item = (Math.random() > 0.15) ? goldDiv[Math.floor(Math.random()*goldDiv.length)] : {a:5, b:5, ans:1};
            a = item.a; b = item.b; ans = item.ans; op = '÷';
        } else if (type === 'mul') {
            a = (Math.random() < 0.15) ? 1 : Math.floor(Math.random()*8)+2;
            b = (Math.random() < 0.15) ? 1 : Math.floor(Math.random()*8)+2;
            ans = a * b; op = '×';
        } else if (type === 'add') {
            a = Math.floor(Math.random()*8)+1; b = Math.floor(Math.random()*8)+1;
            ans = a + b; op = '+';
        } else {
            a = Math.floor(Math.random()*8)+2; b = Math.floor(Math.random()*(a-1))+1;
            ans = a - b; op = '-';
        }
        qText = `${a} ${op} ${b}`;
        attempts++;
    } while (questionPool.includes(qText) && attempts < 15);

    questionPool.push(qText);
    if (questionPool.length > 25) questionPool.shift();
    
    currentAns = ans;
    document.getElementById('math-q').textContent = qText;
}

// =========================================
// 4. إدارة اللعب والبوب آب
// =========================================
function onCellClick(cell) {
    const bIdx = parseInt(cell.parentElement.dataset.board);
    if (!gameActive || cell.textContent !== "" || metaBoard[bIdx] !== null) return;
    if (activeLocalBoard !== null && activeLocalBoard !== bIdx) return;

    targetCell = cell;
    playerAnswer = "";
    document.getElementById('math-ans-display').textContent = "_";
    document.getElementById('math-ans-display').style.color = "var(--text)";
    document.getElementById('success-tick').classList.add('hidden');
    document.getElementById('math-popup').classList.remove('hidden');
    generateQuestion();

    if (timeLimit > 0) startTimer();
}

function pressKey(n) {
    playerAnswer += n;
    const display = document.getElementById('math-ans-display');
    display.textContent = playerAnswer;

    if (parseInt(playerAnswer) === currentAns) {
        clearInterval(countdown);
        display.style.color = "var(--success)"; // تحويل الرقم للأخضر
        document.getElementById('success-tick').classList.remove('hidden'); // إظهار رسالة النجاح
        
        // تثبيت الإجابة لمدة ثانية قبل الإغلاق كما اتفقنا
        setTimeout(() => {
            document.getElementById('math-popup').classList.add('hidden');
            completeMove();
        }, 1000);
    } else if (playerAnswer.length >= currentAns.toString().length) {
        setTimeout(() => { playerAnswer = ""; display.textContent = "_"; }, 300);
    }
}

function completeMove() {
    const bIdx = parseInt(targetCell.parentElement.dataset.board);
    const cIdx = parseInt(targetCell.dataset.cell);
    
    gameBoard[bIdx][cIdx] = currentTeam;
    targetCell.textContent = currentTeam;
    targetCell.classList.add(currentTeam);

    checkWinState(bIdx, cIdx);
}

function checkWinState(bIdx, cIdx) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    
    // فحص المربع الصغير
    let won = wins.some(c => gameBoard[bIdx][c[0]] && gameBoard[bIdx][c[0]] === gameBoard[bIdx][c[1]] && gameBoard[bIdx][c[0]] === gameBoard[bIdx][c[2]]);
    
    if (won) {
        metaBoard[bIdx] = currentTeam;
        const boardDiv = document.querySelector(`[data-board="${bIdx}"]`);
        const mark = document.createElement('div');
        mark.className = 'big-mark';
        mark.style.color = currentTeam === 'X' ? 'var(--accent-x)' : 'var(--accent-o)';
        mark.innerText = currentTeam;
        boardDiv.appendChild(mark);
    }

    // فحص اللعبة كاملة
    if (wins.some(c => metaBoard[c[0]] && metaBoard[c[0]] === metaBoard[c[1]] && metaBoard[c[0]] === metaBoard[c[2]])) {
        gameActive = false;
        setTimeout(() => alert("🎉 الفائز هو: " + (currentTeam === 'X' ? 'فريق X' : 'فريق O')), 300);
    }

    activeLocalBoard = metaBoard[cIdx] ? null : cIdx;
    currentTeam = currentTeam === 'X' ? 'O' : 'X';
    updateUI();
}

// =========================================
// 5. وظائف التحكم والواجهة
// =========================================
function updateUI() {
    document.getElementById('game-timer').textContent = "--";
    document.getElementById('teamX-card').classList.toggle('active-turn', currentTeam === 'X');
    document.getElementById('teamO-card').classList.toggle('active-turn', currentTeam === 'O');
    document.querySelectorAll('.local-board').forEach((b, i) => {
        b.classList.toggle('active', activeLocalBoard === null || activeLocalBoard === i);
    });
    document.getElementById('scoreX').textContent = metaBoard.filter(v => v === 'X').length;
    document.getElementById('scoreO').textContent = metaBoard.filter(v => v === 'O').length;
}

function startTimer() {
    let left = timeLimit;
    countdown = setInterval(() => {
        left--;
        document.getElementById('game-timer').textContent = left;
        if (left <= 0) {
            clearInterval(countdown);
            document.getElementById('math-popup').classList.add('hidden');
            activeLocalBoard = null;
            currentTeam = currentTeam === 'X' ? 'O' : 'X';
            updateUI();
        }
    }, 1000);
}

function toggleInstructions(show) {
    document.getElementById('instructions-modal').classList.toggle('hidden', !show);
}

document.getElementById('startGameButton').onclick = () => {
    mathOp = document.getElementById('mathOperation').value;
    timeLimit = parseInt(document.getElementById('timerOption').value);
    document.getElementById('nameX').textContent = document.getElementById('teamXName').value || 'الفريق X';
    document.getElementById('nameO').textContent = document.getElementById('teamOName').value || 'الفريق O';
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    // بناء اللوحة
    const meta = document.getElementById('meta-board');
    meta.innerHTML = '';
    for(let i=0; i<9; i++) {
        let lb = document.createElement('div');
        lb.className = 'local-board'; lb.dataset.board = i;
        for(let j=0; j<9; j++) {
            let c = document.createElement('div');
            c.className = 'cell'; c.dataset.cell = j;
            c.onclick = (e) => onCellClick(e.target);
            lb.appendChild(c);
        }
        meta.appendChild(lb);
    }
    gameActive = true;
    updateUI();
};

// وظائف الكيبورد الإضافية
function clearKey() { playerAnswer = ""; document.getElementById('math-ans-display').textContent = "_"; }
function backspaceKey() { playerAnswer = playerAnswer.slice(0,-1); document.getElementById('math-ans-display').textContent = playerAnswer || "_"; }

window.onload = initMatrixBg;
