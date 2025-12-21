/* =========================================
   1. المتغيرات العامة وحالة اللعبة
   ========================================= */
let currentTeam = 'X';
let gameActive = false;
let activeBoardIdx = null; // المربع الكبير النشط
let metaBoard = Array(9).fill(null); 
let localBoards = Array(9).fill(null).map(() => Array(9).fill(null));

let diffLevel, timeLimit, countdown, targetCell, currentAns;
let playerAnswer = "";

/* =========================================
   2. محرك توليد الأسئلة (قاعدة الـ 9 والـ 1%)
   ========================================= */
function generateQuestion() {
    let a, b, op, ans, qText;
    const level = parseInt(diffLevel);

    // دالة اختيار رقم بين 1 و 9 مع قاعدة الـ 1%
    const getNum = (allowOne) => {
        if (allowOne) {
            return (Math.random() < 0.01) ? 1 : Math.floor(Math.random() * 8) + 2;
        }
        return Math.floor(Math.random() * 8) + 2; // من 2 لـ 9
    };

    const types = ['+', '-', '*', '/'];
    const type = types[Math.floor(Math.random() * types.length)];

    if (type === '+') {
        a = getNum(true); b = getNum(true); ans = a + b; op = '+';
    } else if (type === '-') {
        a = Math.floor(Math.random() * 8) + 2; 
        b = Math.floor(Math.random() * (a - 1)) + 1; // لضمان ناتج موجب
        ans = a - b; op = '-';
    } else if (type === '*') {
        a = getNum(false); b = getNum(false); ans = a * b; op = '×';
    } else if (type === '/') {
        // في المستوى الأول: قسمة بسيطة جداً نتاجها صغير
        if (level === 1) {
            ans = Math.floor(Math.random() * 3) + 2; 
            b = Math.floor(Math.random() * 3) + 2;
        } else {
            // في المستويات الأخرى: يمكن أن يكون الطرف الأول كبيراً طالما الفراغ 1-9
            ans = getNum(false); b = getNum(false);
        }
        a = ans * b; op = '÷';
    }

    // تشكيل السؤال حسب المستوى (الاتجاه من اليسار لليمين)
    switch(level) {
        case 1: // كلاسيك
            qText = `${a} ${op} ${b} = ?`;
            currentAns = ans;
            break;
        case 2: // العدد المفقود
            if (Math.random() > 0.5) {
                qText = `? ${op} ${b} = ${ans}`;
                currentAns = a;
            } else {
                qText = `${a} ${op} ? = ${ans}`;
                currentAns = b;
            }
            break;
        case 3: // فراغين (بدون 1) - هنا نطلب رقم واحد مفقود لتسهيل اللعب من 1-9
            qText = `? ${op} ? = ${ans} (بدون 1)`;
            currentAns = a; // نبرمجها برقم واحد حالياً لضمان استقرار النمباد
            break;
        case 4: // الميزان
            let offset = 1;
            qText = `${a} ${op} ${b} = ? + ${offset}`;
            currentAns = ans - offset;
            break;
    }

    document.getElementById('equation-text').textContent = qText;
}

/* =========================================
   3. التحكم في سير اللعبة
   ========================================= */
function startGame() {
    diffLevel = document.getElementById('levelSelect').value;
    timeLimit = parseInt(document.getElementById('timerSelect').value);
    
    // تصفير البيانات
    metaBoard.fill(null);
    localBoards = Array(9).fill(null).map(() => Array(9).fill(null));
    currentTeam = 'X';
    activeBoardIdx = null;
    gameActive = true;

    // بناء اللوحة
    const container = document.getElementById('ultimate-board');
    container.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        let lb = document.createElement('div');
        lb.className = 'local-board';
        lb.dataset.board = i;
        for (let j = 0; j < 9; j++) {
            let c = document.createElement('div');
            c.className = 'cell';
            c.dataset.cell = j;
            c.onclick = () => handleCellClick(c);
            lb.appendChild(c);
        }
        container.appendChild(lb);
    }

    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    updateStatus();
}

function handleCellClick(cell) {
    const bIdx = parseInt(cell.parentElement.dataset.board);
    if (!gameActive || cell.textContent || metaBoard[bIdx]) return;
    if (activeBoardIdx !== null && activeBoardIdx !== bIdx) return;

    targetCell = cell;
    playerAnswer = "";
    document.getElementById('ans-display').textContent = "_";
    document.getElementById('math-popup').classList.remove('hidden');
    generateQuestion();
    startTimer();
}

function inputNum(n) {
    playerAnswer += n;
    document.getElementById('ans-display').textContent = playerAnswer;
    
    if (parseInt(playerAnswer) === currentAns) {
        clearInterval(countdown);
        setTimeout(executeMove, 300);
    } else if (playerAnswer.length >= currentAns.toString().length + 1) {
        clearInput();
    }
}

function executeMove() {
    document.getElementById('math-popup').classList.add('hidden');
    const bIdx = parseInt(targetCell.parentElement.dataset.board);
    const cIdx = parseInt(targetCell.dataset.cell);

    targetCell.textContent = currentTeam;
    targetCell.classList.add(currentTeam);
    localBoards[bIdx][cIdx] = currentTeam;

    // منطق الفوز والتوجيه
    activeBoardIdx = (metaBoard[cIdx] === null) ? cIdx : null;
    currentTeam = (currentTeam === 'X') ? 'O' : 'X';
    updateStatus();
}

/* =========================================
   4. الوظائف المساعدة
   ========================================= */
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
}

function openHelp() { document.getElementById('help-modal').classList.remove('hidden'); }
function closeHelp() { document.getElementById('help-modal').classList.add('hidden'); }
function clearInput() { playerAnswer = ""; document.getElementById('ans-display').textContent = "_"; }
function delInput() { playerAnswer = playerAnswer.slice(0, -1); document.getElementById('ans-display').textContent = playerAnswer || "_"; }

function startTimer() {
    if (timeLimit === 0) return;
    let time = timeLimit;
    document.getElementById('timerNum').textContent = time;
    clearInterval(countdown);
    countdown = setInterval(() => {
        time--;
        document.getElementById('timerNum').textContent = time;
        if (time <= 0) {
            clearInterval(countdown);
            document.getElementById('math-popup').classList.add('hidden');
            currentTeam = (currentTeam === 'X') ? 'O' : 'X';
            updateStatus();
        }
    }, 1000);
}

function updateStatus() {
    document.getElementById('cardX').classList.toggle('active', currentTeam === 'X');
    document.getElementById('cardO').classList.toggle('active', currentTeam === 'O');
    document.getElementById('free-play-alert').classList.toggle('hidden', activeBoardIdx !== null);
}
