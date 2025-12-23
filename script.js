/* =========================================
   1. الحالة العامة والمتغيرات (State Management)
   ========================================= */
let turn = 'X', gameActive = false, activeBoardIdx = null;
let bigBoardWins = Array(9).fill(null); 
let logicMatrix = Array(9).fill(null).map(() => Array(9).fill(null));

let selectedLevel = 1, timerLimit = 10, countdown, mathCorrectAnswer;
let targetCellRef, playerInputStr = "";

// ربط العناصر الحيوية بالواجهة
const vSetup = document.getElementById('view-setup');
const vGame = document.getElementById('view-game');
const mHelp = document.getElementById('modal-help');
const mMath = document.getElementById('modal-math');

/* =========================================
   2. التهيئة وضوابط البدء (Launch Control)
   ========================================= */
document.querySelectorAll('.lvl-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.lvl-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedLevel = parseInt(card.dataset.lvl);
    });
});

document.getElementById('launchBtn').addEventListener('click', initGame);

function initGame() {
    // إعدادات اللاعبين والمؤقت
    timerLimit = parseInt(document.getElementById('timerConfig').value);
    document.getElementById('displayNameX').textContent = document.getElementById('nameX').value || "فريق X";
    document.getElementById('displayNameO').textContent = document.getElementById('nameO').value || "فريق O";

    // تصفير البيانات للبدء
    bigBoardWins.fill(null);
    logicMatrix = Array(9).fill(null).map(() => Array(9).fill(null));
    turn = 'X'; activeBoardIdx = null; gameActive = true;

    // بناء اللوحة برمجياً لضمان الثبات الهندسي (81 خلية)
    const gridContainer = document.getElementById('ultimate-grid');
    gridContainer.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const localBoard = document.createElement('div');
        localBoard.className = 'local-board';
        localBoard.id = `lb-${i}`;
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.b = i; cell.dataset.c = j;
            cell.onclick = () => handleCellClick(cell);
            localBoard.appendChild(cell);
        }
        gridContainer.appendChild(localBoard);
    }

    vSetup.classList.remove('active');
    vGame.classList.add('active');
    updateVisuals();
}

/* =========================================
   3. المحرك الرياضي (الفلترة الصارمة والمستويات)
   ========================================= */
function generateChallenge() {
    let a, b, op, ans, taskText, hintText;
    const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    if (selectedLevel === 1) {
        // فلترة المستوى الأول: الأرقام من 1 إلى 9 حصراً لجميع الأطراف
        const ops = ['+', '-', '*', '/'];
        const type = ops[rnd(0, 3)];
        
        if (type === '+') { a = rnd(1, 9); b = rnd(1, 9); ans = a + b; op = '+'; }
        else if (type === '-') { a = rnd(1, 9); b = rnd(1, a); ans = a - b; op = '-'; }
        else if (type === '*') { a = rnd(1, 9); b = rnd(1, 9); ans = a * b; op = '×'; }
        else { b = rnd(1, 9); ans = rnd(1, 9); a = b * ans; 
               // إذا كان المقسوم > 9، نعيد المحاولة برقم أصغر لضمان شرط (1-9)
               if (a > 9) { a = rnd(1,9); b = 1; ans = a; }
               op = '÷';
        }
        taskText = `${a} ${op} ${b} = ?`; mathCorrectAnswer = ans;
        hintText = "المستوى 1: أوجد الناتج المباشر";
    } 
    else if (selectedLevel === 2) {
        a = rnd(2, 9); b = rnd(2, 9); ans = a + b;
        taskText = `? + ${a} = ${ans}`; mathCorrectAnswer = b;
        hintText = "المستوى 2: أوجد الرقم المجهول";
    }
    else if (selectedLevel === 3) {
        // الفراغ المزدوج: يمنع استخدام رقم 1
        a = rnd(2, 9); b = rnd(2, 9); ans = a * b;
        taskText = `? × ? = ${ans}`; mathCorrectAnswer = a; // يقبل أي من العاملين
        hintText = "المستوى 3: أوجد أحد الرقمين (ممنوع استخدام 1)";
    }
    else {
        // المستوى 4: الميزان
        a = rnd(2, 5); b = rnd(6, 9); // كفة 1
        let c = rnd(2, 5); mathCorrectAnswer = (a * b) / c;
        // نضمن أن الناتج عدد صحيح
        while ((a * b) % c !== 0) { c = rnd(2, 9); mathCorrectAnswer = (a * b) / c; }
        taskText = `${a} × ${b} = ${c} × ?`;
        hintText = "المستوى 4: وازن كفتي الميزان";
    }

    document.getElementById('math-eq').textContent = taskText;
    document.getElementById('math-hint').textContent = hintText;
}

/* =========================================
   4. منطق اللعبة والوميض (Game Logic)
   ========================================= */
function handleCellClick(cell) {
    const bIdx = parseInt(cell.dataset.b);
    if (!gameActive || cell.textContent || bigBoardWins[bIdx]) return;
    if (activeBoardIdx !== null && activeBoardIdx !== bIdx) return;

    targetCellRef = cell;
    playerInputStr = "";
    document.getElementById('math-preview').textContent = "_";
    mMath.style.display = "flex";
    generateChallenge();
    startTimer();
}

function numIn(n) {
    playerInputStr += n;
    document.getElementById('math-preview').textContent = playerInputStr;
    if (parseInt(playerInputStr) === mathCorrectAnswer) {
        clearInterval(countdown);
        setTimeout(executeMove, 200);
    } else if (playerInputStr.length >= 4) { numC(); }
}

function executeMove() {
    mMath.style.display = "none";
    const bIdx = parseInt(targetCellRef.dataset.b);
    const cIdx = parseInt(targetCellRef.dataset.c);

    targetCellRef.textContent = turn;
    targetCellRef.classList.add(turn);
    logicMatrix[bIdx][cIdx] = turn;

    // فحص الفوز بالمربع الكبير
    if (checkSmallWin(logicMatrix[bIdx])) {
        bigBoardWins[bIdx] = turn;
        const lb = document.getElementById(`lb-${bIdx}`);
        const overlay = document.createElement('div');
        overlay.className = 'win-layer';
        overlay.textContent = turn;
        overlay.style.color = (turn === 'X') ? 'var(--accent-x)' : 'var(--accent-o)';
        lb.appendChild(overlay);
    }

    // قانون التوجيه القادم (Smart Targeting)
    activeBoardIdx = (bigBoardWins[cIdx] === null) ? cIdx : null;
    turn = (turn === 'X') ? 'O' : 'X';
    updateVisuals();
}

function updateVisuals() {
    // تحديث بطاقات اللاعبين (التباين)
    document.getElementById('cardX').style.opacity = (turn === 'X') ? "1" : "0.3";
    document.getElementById('cardO').style.opacity = (turn === 'O') ? "1" : "0.3";
    
    // إدارة الوميض والتعتيم (Guidance)
    document.querySelectorAll('.local-board').forEach((lb, i) => {
        lb.classList.remove('smart-glow');
        if (activeBoardIdx === i) lb.classList.add('smart-glow');
        lb.style.opacity = (activeBoardIdx === null || activeBoardIdx === i) ? "1" : "0.1";
    });

    document.getElementById('free-msg').classList.toggle('hidden', activeBoardIdx !== null);
}

/* =========================================
   5. الوظائف المساعدة (Timer & Checks)
   ========================================= */
function startTimer() {
    if (timerLimit === 0) return;
    let sec = timerLimit;
    const prog = document.getElementById('t-prog');
    clearInterval(countdown);
    countdown = setInterval(() => {
        sec--;
        document.getElementById('t-text').textContent = sec;
        prog.style.strokeDashoffset = 283 - (sec / timerLimit * 283);
        if (sec <= 0) {
            clearInterval(countdown);
            mMath.style.display = "none";
            activeBoardIdx = null; // عقوبة: لعب حر للخصم
            turn = (turn === 'X') ? 'O' : 'X';
            updateVisuals();
        }
    }, 1000);
}

function checkSmallWin(b) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return wins.some(w => b[w[0]] && b[w[0]] === b[w[1]] && b[w[0]] === b[w[2]]);
}

function toggleHelp(show) { mHelp.style.display = show ? "flex" : "none"; }
function numC() { playerInputStr = ""; document.getElementById('math-preview').textContent = "_"; }
function numD() { playerInputStr = playerInputStr.slice(0, -1); document.getElementById('math-preview').textContent = playerInputStr || "_"; }
