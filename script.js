/**
 * ULTIMATE X-O MATH ENGINE PRO
 * إصلاح منطق التوجيه + معالجة كافة المستويات (1-4)
 */

let gameState = {
    levelData: [],
    currentPlayer: 'X',
    bigBoard: Array(9).fill(null),
    forcedGrid: null, // المربع الذي يجب اللعب فيه
    activeCell: null,
    scores: { X: 0, O: 0 },
    timer: null,
    seconds: 0
};

// 1. إدارة جلب البيانات وتشغيل المستويات
document.getElementById('launch-btn').addEventListener('click', () => startGame());

async function startGame() {
    const level = document.getElementById('level-select-modal').value;
    try {
        const response = await fetch(`data/${level}.json`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        
        // معالجة البيانات بناءً على هيكلية ملفاتك المختلفة
        gameState.levelData = extractPool(data.pool, level);
        
        setupUI();
        initUltimateBoard();
        startTimer();
        
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
    } catch (e) {
        alert("خطأ: تأكد من اختيار المستوى من الإعدادات ووجود ملفات JSON في مجلد data");
    }
}

// استخراج الأسئلة بدقة من ملفاتك
function extractPool(pool, level) {
    let items = [];
    if (level === 'level1') items = [...pool.ones_group.slice(0,8), ...pool.core_challenges];
    else if (level === 'level2') items = [...pool.ones_group.slice(0,8), ...pool.addition_unknowns, ...pool.subtraction_unknowns];
    else if (level === 'level3') items = [...pool.only_ones_group.slice(0,8), ...pool.strict_challenges_2_to_9];
    else if (level === 'level4') items = [...pool.ones_group_10_percent.slice(0,8), ...pool.strict_challenges_90_percent];
    
    return items.sort(() => Math.random() - 0.5);
}

// 2. بناء اللوحة ومنطق "الإجبار"
function initUltimateBoard() {
    const board = document.getElementById('ultimate-board');
    board.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const subGrid = document.createElement('div');
        subGrid.className = 'sub-grid';
        subGrid.id = `grid-${i}`;
        
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => handleCellClick(i, j, cell);
            subGrid.appendChild(cell);
        }
        board.appendChild(subGrid);
    }
    updateForcedGridUI();
}

// 3. منطق النقر والتحقق من التوجيه
function handleCellClick(gridIdx, cellIdx, cell) {
    // شرط التوجيه: يجب اللعب في المربع المحدد إلا إذا كان حراً (null)
    if (gameState.forcedGrid !== null && gameState.forcedGrid !== gridIdx) {
        alert("عذراً! يجب عليك اللعب في المربع النشط فقط.");
        return;
    }
    if (gameState.bigBoard[gridIdx] || cell.textContent !== '') return;

    openMathModal(gridIdx, cellIdx, cell);
}

function openMathModal(gridIdx, cellIdx, cell) {
    const level = document.getElementById('level-select-modal').value;
    const op = gameState.levelData[(gridIdx * 9 + cellIdx) % gameState.levelData.length];
    gameState.activeCell = { gridIdx, cellIdx, cell, op };

    // تحويل الرموز للعرض
    let question = (level === 'level4') ? op.q : (op.target !== undefined ? `${op.target} = ? ${op.op} ...` : op.q);
    if (level === 'level3') question = `الناتج: ${op.target} (عملية ${op.op === '*' ? '×' : op.op})`;
    
    document.getElementById('modal-op-display').textContent = question.replace(/\*/g, '×').replace(/\//g, '÷');
    document.getElementById('modal-input-display').textContent = '';
    
    // توليد النمباد
    const pad = document.getElementById('modal-numpad');
    pad.innerHTML = '';
    [1,2,3,4,5,6,7,8,9,0].forEach(n => {
        const b = document.createElement('button');
        b.textContent = n;
        b.onclick = () => document.getElementById('modal-input-display').textContent += n;
        pad.appendChild(b);
    });
    
    document.getElementById('math-modal').classList.remove('hidden');
}

// 4. التحقق من الإجابة وتحديث المربع القادم
document.getElementById('confirm-ans').onclick = () => {
    const val = document.getElementById('modal-input-display').textContent;
    const { op, cell, gridIdx, cellIdx } = gameState.activeCell;
    const level = document.getElementById('level-select-modal').value;
    
    let isCorrect = false;
    if (level === 'level3') {
        // منطق المزدوج
        const nums = val.split('').map(Number);
        isCorrect = op.pairs.some(p => (p[0] == nums[0] && p[1] == nums[1]) || (p[0] == nums[1] && p[1] == nums[0]));
    } else {
        isCorrect = parseInt(val) === (op.a || op.target);
    }

    if (isCorrect) {
        cell.textContent = gameState.currentPlayer;
        cell.classList.add(gameState.currentPlayer === 'X' ? 'x-mark' : 'o-mark');
        
        checkSubGridWin(gridIdx);
        
        // أهم سطر: تحديد المربع القادم بناءً على مكان اللعب الحالي
        gameState.forcedGrid = (gameState.bigBoard[cellIdx] === null) ? cellIdx : null;
        
        switchTurn();
        document.getElementById('math-modal').classList.add('hidden');
    } else {
        alert("خطأ! ركز في العملية.");
        document.getElementById('modal-input-display').textContent = '';
    }
};

function switchTurn() {
    gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
    document.getElementById('turn-text').textContent = `دور: ${gameState.currentPlayer}`;
    updateForcedGridUI();
}

function updateForcedGridUI() {
    document.querySelectorAll('.sub-grid').forEach((g, i) => {
        g.classList.remove('active-target');
        if (gameState.forcedGrid === i) g.classList.add('active-target');
        if (gameState.forcedGrid === null && !gameState.bigBoard[i]) g.classList.add('active-target');
    });
}

function checkSubGridWin(idx) {
    const grid = document.getElementById(`grid-${idx}`);
    const cells = Array.from(grid.children).map(c => c.textContent);
    if (checkLine(cells)) {
        gameState.bigBoard[idx] = gameState.currentPlayer;
        grid.classList.add(gameState.currentPlayer === 'X' ? 'won-x' : 'won-o');
        grid.setAttribute('data-winner', gameState.currentPlayer);
        if (checkLine(gameState.bigBoard)) {
            alert(`نهاية اللعبة! فوز تاريخي لفريق ${gameState.currentPlayer}`);
            location.reload();
        }
    }
}

function checkLine(b) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return wins.some(l => b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]);
}

// إدارة النوافذ المنبثقة
document.querySelectorAll('.close-modal, #close-math').forEach(b => {
    b.onclick = () => document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
});
document.getElementById('open-settings-main').onclick = () => document.getElementById('settings-modal').classList.remove('hidden');
document.getElementById('open-settings-game').onclick = () => document.getElementById('settings-modal').classList.remove('hidden');

function setupUI() {
    document.getElementById('display-name-a').textContent = document.getElementById('team-a').value || "TEAM X";
    document.getElementById('display-name-b').textContent = document.getElementById('team-b').value || "TEAM O";
}

function startTimer() {
    gameState.timer = setInterval(() => {
        gameState.seconds++;
        let m = Math.floor(gameState.seconds / 60).toString().padStart(2, '0');
        let s = (gameState.seconds % 60).toString().padStart(2, '0');
        document.getElementById('timer-display').textContent = `${m}:${s}`;
    }, 1000);
}
