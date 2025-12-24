/**
 * ULTIMATE X-O MATH ENGINE - THE FINAL STABLE VERSION
 */

let gameState = {
    selectedLevel: 'level1',
    levelData: [],
    currentPlayer: 'X',
    bigBoard: Array(9).fill(null),
    forcedGrid: null,
    activeCell: null,
    inputBuffer: ["", ""], // تخزين الإدخال للخانتين
    activeSlot: 0,
    timer: null,
    seconds: 0
};

// 1. إعدادات البداية واختيار المستوى
document.querySelectorAll('.level-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameState.selectedLevel = btn.dataset.level;
        updateLevelDescription(btn.dataset.level);
    };
});

function updateLevelDescription(lvl) {
    const desc = {
        level1: "المستوى الكلاسيكي: حل عمليات مباشرة (أ × ب) لوضع علامتك.",
        level2: "مستوى المجهول: أوجد الرقمين المفقودين اللذين يحققان المعادلة.",
        level3: "المستوى المزدوج: أوجد رقمين ناتجهما هو الرقم المعطى.",
        level4: "المستوى الاحترافي: عمليات مركبة وتحديات الميزان بدقة عالية."
    };
    document.getElementById('level-desc').textContent = desc[lvl];
}

// 2. تشغيل اللعبة وجلب البيانات
document.getElementById('start-game-btn').onclick = async () => {
    try {
        const response = await fetch(`data/${gameState.selectedLevel}.json`);
        const data = await response.json();
        
        // فرز البيانات بناءً على هيكلية الملفات لديك
        gameState.levelData = processPool(data.pool, gameState.selectedLevel);
        
        setupGameUI();
        initBoard();
        startTimer();
        
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
    } catch (e) {
        alert("فشل تحميل مستوى " + gameState.selectedLevel + ". تأكد من وجود ملف الـ JSON في مجلد data.");
    }
};

function processPool(pool, lvl) {
    if (lvl === 'level1') return [...pool.ones_group.slice(0, 10), ...pool.core_challenges].sort(() => Math.random() - 0.5);
    if (lvl === 'level2') return [...pool.addition_unknowns, ...pool.subtraction_unknowns].sort(() => Math.random() - 0.5);
    if (lvl === 'level3') return [...pool.strict_challenges_2_to_9].sort(() => Math.random() - 0.5);
    if (lvl === 'level4') return [...pool.strict_challenges_90_percent, ...pool.ones_group_10_percent].sort(() => Math.random() - 0.5);
    return [];
}

// 3. بناء اللوحة ومنطق الإجبار
function initBoard() {
    const board = document.getElementById('ultimate-board');
    board.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const subGrid = document.createElement('div');
        subGrid.className = 'sub-grid';
        subGrid.id = `grid-${i}`;
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => onCellClick(i, j, cell);
            subGrid.appendChild(cell);
        }
        board.appendChild(subGrid);
    }
    highlightForcedGrid();
}

function onCellClick(gIdx, cIdx, cell) {
    if (gameState.forcedGrid !== null && gameState.forcedGrid !== gIdx) {
        alert("إجبار! يجب اللعب في المربع المضيء.");
        return;
    }
    if (gameState.bigBoard[gIdx] || cell.textContent !== '') return;
    
    showMathModal(gIdx, cIdx, cell);
}

// 4. الحاسبة ونظام الخانات (Slots)
function showMathModal(gIdx, cIdx, cell) {
    const op = gameState.levelData[(gIdx * 9 + cIdx) % gameState.levelData.length];
    gameState.activeCell = { gIdx, cIdx, cell, op };
    gameState.inputBuffer = ["", ""];
    gameState.activeSlot = 0;

    // تجهيز السؤال والواجهة
    const qEl = document.getElementById('math-question');
    const slot2 = document.getElementById('ans-slot-2');
    slot2.classList.add('hidden');
    
    if (gameState.selectedLevel === 'level2') {
        qEl.textContent = `? ${op.op} ? = ${op.target}`;
        slot2.classList.remove('hidden');
    } else if (gameState.selectedLevel === 'level3') {
        qEl.textContent = `أوجد رقمين ناتجهما: ${op.target}`;
        slot2.classList.remove('hidden');
    } else {
        qEl.textContent = op.q.replace('*', '×').replace('/', '÷');
    }

    updateSlotsUI();
    buildNumpad();
    document.getElementById('math-modal').classList.remove('hidden');
}

function buildNumpad() {
    const pad = document.getElementById('numpad');
    pad.innerHTML = '';
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach(n => {
        const b = document.createElement('button');
        b.textContent = n;
        b.onclick = () => {
            gameState.inputBuffer[gameState.activeSlot] += n;
            updateSlotsUI();
        };
        pad.appendChild(b);
    });
    
    // زر المسح (C)
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'C';
    clearBtn.className = 'clear-btn';
    clearBtn.onclick = () => {
        gameState.inputBuffer = ["", ""];
        gameState.activeSlot = 0;
        updateSlotsUI();
    };
    pad.appendChild(clearBtn);
}

function updateSlotsUI() {
    document.getElementById('ans-slot-1').textContent = gameState.inputBuffer[0] || '?';
    document.getElementById('ans-slot-2').textContent = gameState.inputBuffer[1] || '?';
    
    document.getElementById('ans-slot-1').classList.toggle('active', gameState.activeSlot === 0);
    document.getElementById('ans-slot-2').classList.toggle('active', gameState.activeSlot === 1);

    // التبديل التلقائي للخانات في المستويات المزدوجة
    if (gameState.inputBuffer[0].length > 0 && (gameState.selectedLevel === 'level2' || gameState.selectedLevel === 'level3')) {
        if (gameState.activeSlot === 0) gameState.activeSlot = 1;
        document.getElementById('ans-slot-2').classList.add('active');
        document.getElementById('ans-slot-1').classList.remove('active');
    }
}

// 5. التحقق من الإجابة (Logic Verification)
document.getElementById('confirm-btn').onclick = () => {
    const { op, cell, gIdx, cIdx } = gameState.activeCell;
    const val1 = parseInt(gameState.inputBuffer[0]);
    const val2 = parseInt(gameState.inputBuffer[1]);
    let correct = false;

    if (gameState.selectedLevel === 'level2') {
        // التحقق من المعادلة: هل المدخلين يحققان الهدف؟
        correct = (op.op === '+' ? val1 + val2 : val1 - val2) === op.target;
    } else if (gameState.selectedLevel === 'level3') {
        // التحقق من مصفوفة الـ pairs
        correct = op.pairs.some(p => (p[0] === val1 && p[1] === val2) || (p[0] === val2 && p[1] === val1));
    } else {
        correct = val1 === (op.a || op.target);
    }

    if (correct) {
        cell.textContent = gameState.currentPlayer;
        cell.classList.add(gameState.currentPlayer === 'X' ? 'x-mark' : 'o-mark');
        checkWin(gIdx);
        gameState.forcedGrid = (gameState.bigBoard[cIdx] === null) ? cIdx : null;
        switchPlayer();
        document.getElementById('math-modal').classList.add('hidden');
    } else {
        alert("إجابة خاطئة! حاول مرة أخرى.");
        gameState.inputBuffer = ["", ""];
        gameState.activeSlot = 0;
        updateSlotsUI();
    }
};

function switchPlayer() {
    gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
    document.getElementById('current-player-name').textContent = 
        gameState.currentPlayer === 'X' ? document.getElementById('team-a').value || 'X' : document.getElementById('team-b').value || 'O';
    highlightForcedGrid();
}

function highlightForcedGrid() {
    document.querySelectorAll('.sub-grid').forEach((g, i) => {
        g.classList.remove('active-target');
        if (gameState.forcedGrid === i || (gameState.forcedGrid === null && !gameState.bigBoard[i])) {
            g.classList.add('active-target');
        }
    });
}

// 6. التحقق من الفوز (Winning Logic)
function checkWin(gIdx) {
    const subGridCells = Array.from(document.querySelectorAll(`#grid-${gIdx} .cell`)).map(c => c.textContent);
    if (isWinningLine(subGridCells)) {
        gameState.bigBoard[gIdx] = gameState.currentPlayer;
        const g = document.getElementById(`grid-${gIdx}`);
        g.classList.add(gameState.currentPlayer === 'X' ? 'won-x' : 'won-o');
        if (isWinningLine(gameState.bigBoard)) {
            alert("مبروك! فاز الفريق " + gameState.currentPlayer);
            location.reload();
        }
    }
}

function isWinningLine(b) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return lines.some(l => b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]);
}

// التوقيت والواجهة
function startTimer() {
    gameState.timer = setInterval(() => {
        gameState.seconds++;
        const m = Math.floor(gameState.seconds/60).toString().padStart(2,'0');
        const s = (gameState.seconds%60).toString().padStart(2,'0');
        document.getElementById('timer-display').textContent = `${m}:${s}`;
    }, 1000);
}

function setupGameUI() {
    document.getElementById('hud-name-a').textContent = document.getElementById('team-a').value || 'TEAM X';
    document.getElementById('hud-name-b').textContent = document.getElementById('team-b').value || 'TEAM O';
    document.getElementById('current-player-name').textContent = document.getElementById('team-a').value || 'X';
}

// إغلاق المودال
document.getElementById('close-math-btn').onclick = () => document.getElementById('math-modal').classList.add('hidden');
