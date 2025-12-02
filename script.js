// =======================================================
// 1. متغيرات الحالة العامة (Global State Variables)
// =======================================================

// بيانات اللاعبين والفرق (يتم ملؤها من شاشة الإعداد)
let gameMode = ''; // 'PVP' or 'PVA'
let teamXName = '';
let teamOName = '';
let teamXPlayers = [];
let teamOPlayers = [];
let difficulty = ''; // لنمط PVA

// متغيرات تتبع حالة اللعب
let currentTeam = 'X'; // من يبدأ الدور: 'X'
let playerIndexX = 0; // مؤشر اللاعب الحالي في فريق X
let playerIndexO = 0; // مؤشر اللاعب الحالي في فريق O
let gameActive = true; // للتحكم في استمرار اللعب

// متغيرات حالة اللوحة
// لوحة 9x9 لتمثيل جميع الحركات الممكنة
let gameBoard = Array(9).fill(null).map(() => Array(9).fill(null)); 
// لوحة 3x3 لتمثيل الفائز في كل لوحة محلية
let metaBoard = Array(9).fill(null); 
let activeLocalBoard = null; // فهرس اللوحة المحلية المسموح اللعب فيها (0-8)، null يعني أي لوحة

// دوال الفوز الممكنة (Rows, Columns, Diagonals)
const winningCombos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]            // Diagonals
];

// =======================================================
// 2. إدارة شاشة الإعداد (Setup Screen Logic)
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    const modeRadios = document.querySelectorAll('input[name="gameMode"]');
    const teamSetupDiv = document.getElementById('team-setup');
    const aiSetupDiv = document.getElementById('ai-setup');
    const startGameButton = document.getElementById('startGameButton');
    
    // مُستمع أحداث لاختيار نمط اللعب لتحديد الأقسام المرئية
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const mode = e.target.value;
            gameMode = mode;
            
            if (mode === 'PVP') {
                teamSetupDiv.style.display = 'block';
                aiSetupDiv.style.display = 'none';
            } else if (mode === 'PVA') {
                teamSetupDiv.style.display = 'none';
                aiSetupDiv.style.display = 'block';
            }
            startGameButton.disabled = false;
        });
    });

    // بناء هيكل اللوحة HTML مرة واحدة
    createBoardElements();
    
    // مُستمع أحداث لزر بدء اللعبة
    startGameButton.addEventListener('click', startGame);
});

// دالة تهيئة وبدء اللعبة
function startGame() {
    // إعادة تعيين الحالة العامة في حال إعادة اللعب
    gameBoard = Array(9).fill(null).map(() => Array(9).fill(null)); 
    metaBoard = Array(9).fill(null);
    activeLocalBoard = null;
    currentTeam = 'X';
    playerIndexX = 0;
    playerIndexO = 0;
    gameActive = true;
    
    // 1. جمع البيانات من حقول الإدخال
    if (gameMode === 'PVP') {
        teamXName = document.getElementById('teamXName').value || 'الفريق X';
        teamOName = document.getElementById('teamOName').value || 'الفريق O';
        
        const playersXString = document.getElementById('playersX').value;
        const playersOString = document.getElementById('playersO').value;
        
        // تحويل الأسماء إلى مصفوفة
        teamXPlayers = playersXString.split(',').map(name => name.trim()).filter(name => name.length > 0);
        teamOPlayers = playersOString.split(',').map(name => name.trim()).filter(name => name.length > 0);

        if (teamXPlayers.length === 0 || teamOPlayers.length === 0) {
            alert('يجب إدخال اسم لاعب واحد على الأقل لكل فريق.');
            return;
        }

    } else if (gameMode === 'PVA') {
        difficulty = document.getElementById('difficulty').value;
        const playerRole = document.querySelector('input[name="playerRole"]:checked').value;
        const humanPlayerName = document.getElementById('teamXName').value || 'اللاعب البشري';
        
        if (playerRole === 'X') {
            teamXName = humanPlayerName;
            teamXPlayers = [humanPlayerName];
            teamOName = 'الذكاء الاصطناعي (' + difficulty + ')';
            teamOPlayers = [teamOName];
        } else {
            teamOName = humanPlayerName;
            teamOPlayers = [humanPlayerName];
            teamXName = 'الذكاء الاصطناعي (' + difficulty + ')';
            teamXPlayers = [teamXName];
            currentTeam = 'X'; // الكمبيوتر يبدأ إذا كان X
        }
    } else {
        alert('الرجاء اختيار نمط اللعب.');
        return;
    }

    // 2. إخفاء شاشة الإعداد وإظهار شاشة اللعب
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('game-message').textContent = 'ابدأ اللعب!';

    // 3. مسح وتحديث اللوحة بصرياً
    document.querySelectorAll('.cell').forEach(cell => {
        cell.textContent = '';
        cell.className = 'cell'; // لإزالة فئات X و O
    });
    document.querySelectorAll('.local-board').forEach(board => {
        board.className = 'local-board'; // إزالة won, disabled-board
        const overlay = board.querySelector('.winner-overlay');
        if (overlay) overlay.remove();
    });

    // 4. تحديث لوحة الحالة
    updateStatusPanel();
    updateActiveBoardHighlight();
    updateStatusPanelScores();
    
    // 5. إذا كان الدور الأول للـ AI، اجعله يلعب
    if (gameMode === 'PVA' && currentTeam === (teamXPlayers.length > 1 ? 'X' : currentTeam) && teamXName.includes('الذكاء الاصطناعي')) {
        setTimeout(makeAIMove, 500);
    }
}


// =======================================================
// 3. دوال التحقق المساعدة (Helper Check Functions)
// =======================================================

// التحقق من فوز اللاعب الحالي (symbol) في اللوحة المحلية (boardIndex)
function checkLocalWinner(boardIndex, symbol) {
    const localBoard = gameBoard[boardIndex];
    
    for (const combo of winningCombos) {
        const [a, b, c] = combo;
        if (localBoard[a] === symbol && localBoard[b] === symbol && localBoard[c] === symbol) {
            return symbol; // وجد الفائز
        }
    }
    
    // التحقق من حالة التعادل (Tie)
    if (!localBoard.includes(null)) {
        return 'Tie';
    }

    return null; // لا يوجد فائز بعد
}

// التحقق من الفوز في اللوحة الكبرى (Meta-Board)
function checkOverallWinner(symbol) {
    for (const combo of winningCombos) {
        const [a, b, c] = combo;
        if (metaBoard[a] === symbol && metaBoard[b] === symbol && metaBoard[c] === symbol) {
            return symbol; // وجد الفائز
        }
    }
    return null;
}

// =======================================================
// 4. دوال التحديث البصري (Visual Update Functions)
// =======================================================

// تحديث لوحة الحالة بالأسماء واللاعب النشط
function updateStatusPanel() {
    const teamXStatus = document.getElementById('teamX-status');
    const teamOStatus = document.getElementById('teamO-status');

    document.getElementById('displayTeamXName').textContent = teamXName;
    document.getElementById('displayTeamOName').textContent = teamOName;

    const currentPlayerX = teamXPlayers[playerIndexX];
    const currentPlayerO = teamOPlayers[playerIndexO];

    document.getElementById('currentPlayerXName').textContent = currentPlayerX;
    document.getElementById('currentPlayerOName').textContent = currentPlayerO;

    if (currentTeam === 'X') {
        teamXStatus.classList.add('active-turn');
        teamOStatus.classList.remove('active-turn');
    } else {
        teamXStatus.classList.remove('active-turn');
        teamOStatus.classList.add('active-turn');
    }
}

// تحديث النقاط في لوحة الحالة
function updateStatusPanelScores() {
    let scoreX = metaBoard.filter(winner => winner === 'X').length;
    let scoreO = metaBoard.filter(winner => winner === 'O').length;
    
    document.getElementById('teamXScore').textContent = scoreX;
    document.getElementById('teamOScore').textContent = scoreO;
}

// تطبيق تأثير بصري على اللوحة التي تم الفوز بها
function markLocalBoardAsWon(boardIndex, winner) {
    const localBoardDiv = document.querySelector(`[data-board="${boardIndex}"]`);
    localBoardDiv.classList.add('won', winner);
    
    const winnerOverlay = document.createElement('div');
    winnerOverlay.classList.add('winner-overlay');
    winnerOverlay.textContent = winner;
    localBoardDiv.appendChild(winnerOverlay);
}

// تطبيق 'الزوم الناعم' والتعتيم
function updateActiveBoardHighlight() {
    const localBoards = document.querySelectorAll('.local-board');
    
    localBoards.forEach(board => {
        const boardIndex = parseInt(board.dataset.board);
        
        board.classList.remove('active');
        
        // إذا كانت اللوحة ممتلئة (تم الفوز بها أو تعادلت)، أظهرها كمعطلة
        if (metaBoard[boardIndex] !== null) {
            board.classList.add('disabled-board'); 
            return;
        } else {
             board.classList.remove('disabled-board');
        }

        // تطبيق فئة التنشيط على اللوحة الصحيحة
        if (activeLocalBoard === null || activeLocalBoard === boardIndex) {
            board.classList.add('active');
        } else {
            board.classList.remove('active');
        }
    });
}

// بناء هيكل اللوحة HTML (يتم استدعاؤها مرة واحدة عند تحميل الصفحة)
function createBoardElements() {
    const metaBoardDiv = document.getElementById('meta-board');
    
    for (let localBoardIndex = 0; localBoardIndex < 9; localBoardIndex++) {
        const localBoardDiv = document.createElement('div');
        localBoardDiv.classList.add('local-board');
        localBoardDiv.dataset.board = localBoardIndex; 
        
        for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
            const cellDiv = document.createElement('div');
            cellDiv.classList.add('cell');
            cellDiv.dataset.cell = cellIndex;
            cellDiv.addEventListener('click', handleMove);
            localBoardDiv.appendChild(cellDiv);
        }

        metaBoardDiv.appendChild(localBoardDiv);
    }
}

// =======================================================
// 5. منطق الذكاء الاصطناعي (AI Logic)
// =======================================================

function makeAIMove() {
    if (!gameActive) return;

    let move = null;
    const aiSymbol = currentTeam;

    if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') {
        move = findMediumMove(aiSymbol);
    } else {
        move = findRandomMove(); 
    }
    
    if (move) {
        const [localBoard, cell] = move;
        const cellElement = document.querySelector(`[data-board="${localBoard}"] > [data-cell="${cell}"]`);
        
        if (cellElement) {
            // محاكاة النقر على الخلية لتشغيل handleMove
            handleMove({ target: cellElement });
        }
    }
}

// دالة الحركة العشوائية (لصعوبة سهل)
function findRandomMove() {
    const validMoves = [];

    const boardsToCheck = activeLocalBoard === null 
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => metaBoard[i] === null) 
        : [activeLocalBoard];

    for (const boardIndex of boardsToCheck) {
        for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
            if (gameBoard[boardIndex][cellIndex] === null) {
                validMoves.push([boardIndex, cellIndex]);
            }
        }
    }

    if (validMoves.length > 0) {
        const randomIndex = Math.floor(Math.random() * validMoves.length);
        return validMoves[randomIndex];
    }
    return null; 
}

// دالة الحركة الاستراتيجية (لصعوبة متوسط/صعب)
function findMediumMove(aiSymbol) {
    const opponentSymbol = (aiSymbol === 'X' ? 'O' : 'X');
    
    const moves = [];
    const boardsToCheck = activeLocalBoard === null 
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => metaBoard[i] === null) 
        : [activeLocalBoard];

    for (const boardIndex of boardsToCheck) {
        for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
            if (gameBoard[boardIndex][cellIndex] === null) {
                moves.push([boardIndex, cellIndex]);
            }
        }
    }
    
    // 1. محاولة الفوز في لوحة محلية
    for (const [board, cell] of moves) {
        gameBoard[board][cell] = aiSymbol;
        if (checkLocalWinner(board, aiSymbol)) {
            gameBoard[board][cell] = null;
            return [board, cell];
        }
        gameBoard[board][cell] = null;
    }

    // 2. محاولة منع فوز الخصم في لوحة محلية
    for (const [board, cell] of moves) {
        gameBoard[board][cell] = opponentSymbol;
        if (checkLocalWinner(board, opponentSymbol)) {
            gameBoard[board][cell] = null;
            return [board, cell];
        }
        gameBoard[board][cell] = null;
    }

    // 3. إذا لم يكن هناك فوز أو منع وشيك، العب عشوائياً
    return findRandomMove();
}
// =======================================================
// 6. دالة التعامل مع الحركة الرئيسية (handleMove) - النسخة المصححة
// =======================================================

function handleMove(event) {
    if (!gameActive) return;

    const cellElement = event.target;
    const localBoardIndex = parseInt(cellElement.parentElement.dataset.board);
    const cellIndex = parseInt(cellElement.dataset.cell);

    // 1. التحقق من صحة الحركة والقواعد
    if (gameBoard[localBoardIndex][cellIndex] !== null) return;
    if (metaBoard[localBoardIndex] !== null) return; // لا يمكن اللعب في لوحة فاز بها أحد بالفعل!
    if (activeLocalBoard !== null && activeLocalBoard !== localBoardIndex) return;

    const currentPlayerSymbol = currentTeam;
    
    // 2. تنفيذ الحركة
    gameBoard[localBoardIndex][cellIndex] = currentPlayerSymbol;
    cellElement.textContent = currentPlayerSymbol;
    cellElement.classList.add(currentPlayerSymbol);

    // 3. تطبيق قاعدة Ultimate Tic-Tac-Toe لتحديد اللوحة النشطة التالية
    let nextLocalBoardIndex = cellIndex;
    
    // 4. التحقق من الفوز في اللوحة المحلية قبل تعيين اللوحة النشطة التالية
    const localWinner = checkLocalWinner(localBoardIndex, currentPlayerSymbol);
    if (localWinner) {
        metaBoard[localBoardIndex] = localWinner;
        markLocalBoardAsWon(localBoardIndex, localWinner);
        updateStatusPanelScores();
        
        // التحقق من فوز اللوحة الكبرى (نهاية اللعبة)
        const overallWinner = checkOverallWinner(localWinner);
        if (overallWinner) {
            gameActive = false;
            const winnerName = overallWinner === 'X' ? teamXName : teamOName;
            document.getElementById('game-message').textContent = `انتهت اللعبة! الفائز هو: ${winnerName}`;
            alert(`الفائز باللعبة هو ${winnerName}!`);
            return; 
        }
    }
    
    // 5. الآن نحدد اللوحة النشطة للدور القادم
    if (metaBoard[nextLocalBoardIndex] !== null) {
        // حالة "الإرسال الحر"
        activeLocalBoard = null; 
        document.getElementById('game-message').textContent = 'اللوحة المستهدفة ممتلئة! الإرسال حر.';
    } else {
        // الإرسال العادي
        activeLocalBoard = nextLocalBoardIndex;
        document.getElementById('game-message').textContent = '';
    }

    // 6. تبديل اللاعب والدور (Rotation Logic)
    if (currentTeam === 'X') {
        playerIndexX = (playerIndexX + 1) % teamXPlayers.length;
    } else {
        playerIndexO = (playerIndexO + 1) % teamOPlayers.length;
    }
    currentTeam = (currentTeam === 'X') ? 'O' : 'X';
    
    // 7. تحديث العرض البصري للدور الجديد واللوحة النشطة
    updateStatusPanel();
    updateActiveBoardHighlight();
    
    // 8. إذا كان الدور الآن للـ AI، استدعه
    if (gameMode === 'PVA' && (currentTeam === 'X' && teamXName.includes('الذكاء الاصطناعي')) || (currentTeam === 'O' && teamOName.includes('الذكاء الاصطناعي'))) {
        // تعطيل النقر للاعب البشري
        document.querySelectorAll('.cell').forEach(cell => cell.style.pointerEvents = 'none');
        setTimeout(() => {
            makeAIMove();
            // إعادة السماح للاعب البشري بالنقر
            document.querySelectorAll('.cell').forEach(cell => cell.style.pointerEvents = 'auto');
        }, 800);
    }
    
    // 9. في حالة وضع PVP، تأكد من تمكين النقر
    if (gameMode === 'PVP') {
         document.querySelectorAll('.cell').forEach(cell => cell.style.pointerEvents = 'auto');
    }
}
