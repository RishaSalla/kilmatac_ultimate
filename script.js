// --- المتغيرات العامة الجديدة ---
let mathOp = 'random';
let timeLimit = 10;
let currentQuestion = { a: 0, b: 0, ans: 0 };
let playerAnswer = "";
let countdown;
let targetCell = null; // الخلية التي تم الضغط عليها

// --- تهيئة اللعبة ---
document.getElementById('startGameButton').addEventListener('click', () => {
    mathOp = document.getElementById('mathOperation').value;
    timeLimit = parseInt(document.getElementById('timerOption').value);
    
    // سحب الأسماء
    teamXName = document.getElementById('teamXName').value || 'الفريق X';
    teamOName = document.getElementById('teamOName').value || 'الفريق O';
    
    startGame();
});

// تبديل الوضع (Light/Dark)
document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
});

// --- منطق الحساب ---
function generateQuestion() {
    let a = Math.floor(Math.random() * 9) + 1;
    let b = Math.floor(Math.random() * 9) + 1;
    let op = mathOp === 'random' ? ['add', 'sub', 'mul', 'div'][Math.floor(Math.random()*4)] : mathOp;
    
    let questionText = "";
    let ans = 0;

    switch(op) {
        case 'add': questionText = `${a} + ${b}`; ans = a + b; break;
        case 'sub': 
            if(a < b) [a, b] = [b, a]; // لضمان نتائج موجبة بسيطة
            questionText = `${a} - ${b}`; ans = a - b; break;
        case 'mul': questionText = `${a} × ${b}`; ans = a * b; break;
        case 'div': 
            ans = a; a = a * b; // لضمان قسمة بدون فواصل
            questionText = `${a} ÷ ${b}`; break;
    }
    
    currentQuestion = { ans: ans };
    document.getElementById('math-question').textContent = questionText;
    playerAnswer = "";
    document.getElementById('answer-display').textContent = "_";
}

// دالة الضغط على خلية
function handleMove(event) {
    if (!gameActive) return;
    const cell = event.target;
    const lIdx = parseInt(cell.parentElement.dataset.board);
    
    // التحقق من القوانين
    if (cell.textContent !== "" || metaBoard[lIdx] !== null) return;
    if (activeLocalBoard !== null && activeLocalBoard !== lIdx) return;

    targetCell = cell; // حفظ الخلية مؤقتاً
    showPopup();
}

function showPopup() {
    generateQuestion();
    document.getElementById('math-popup').classList.remove('hidden');
    
    if (timeLimit > 0) {
        let timeLeft = timeLimit;
        document.getElementById('popup-timer-bar').style.width = "100%";
        countdown = setInterval(() => {
            timeLeft -= 0.1;
            document.getElementById('popup-timer-bar').style.width = (timeLeft/timeLimit)*100 + "%";
            if (timeLeft <= 0) {
                clearInterval(countdown);
                failChallenge();
            }
        }, 100);
    }
}

function appendNum(num) {
    playerAnswer += num.toString();
    document.getElementById('answer-display').textContent = playerAnswer;
    
    if (parseInt(playerAnswer) === currentQuestion.ans) {
        clearInterval(countdown);
        successChallenge();
    } else if (playerAnswer.length >= currentQuestion.ans.toString().length && parseInt(playerAnswer) !== currentQuestion.ans) {
        // إذا كتب عدد خانات كافية والجواب خطأ، نمسح للتصحيح
        setTimeout(() => {
            playerAnswer = "";
            document.getElementById('answer-display').textContent = "_";
        }, 300);
    }
}

function successChallenge() {
    document.getElementById('math-popup').classList.add('hidden');
    // تنفيذ الحركة الفعلية على اللوح
    confirmMove(targetCell);
}

function failChallenge() {
    document.getElementById('math-popup').classList.add('hidden');
    // عقاب: لعب حر للخصم
    activeLocalBoard = null;
    currentTeam = (currentTeam === 'X') ? 'O' : 'X'; // تبديل الدور
    document.getElementById('free-move-msg').classList.remove('hidden');
    updateStatusPanel();
    updateActiveBoardHighlight();
}

function confirmMove(cell) {
    const lIdx = parseInt(cell.parentElement.dataset.board);
    const cIdx = parseInt(cell.dataset.cell);
    
    gameBoard[lIdx][cIdx] = currentTeam;
    cell.textContent = currentTeam;
    cell.classList.add(currentTeam);
    document.getElementById('free-move-msg').classList.add('hidden');

    // تحقق من الفوز المحلي والكبير (نفس منطق كودك السابق)
    // ... (تكملة منطق checkLocalWinner و checkOverallWinner) ...
    
    // تحديث اللوحة النشطة التالية
    activeLocalBoard = (metaBoard[cIdx] === null) ? cIdx : null;
    currentTeam = (currentTeam === 'X') ? 'O' : 'X';
    
    updateStatusPanel();
    updateActiveBoardHighlight();
}
