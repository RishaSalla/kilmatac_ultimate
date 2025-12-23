// الكيان المركزي للعبة (Game Engine Object)
const GameEngine = {
    currentPool: [],
    selectedLevel: 'level1',
    activeCell: null,
    teams: { a: "TEAM A", b: "TEAM B" },
    scores: { a: 0, b: 0 },
    
    // 1. تشغيل النظام وتحميل البيانات
    async init() {
        this.bindEvents();
    },

    bindEvents() {
        // زر بدء التحدي
        document.getElementById('launch-btn').onclick = () => this.launchGame();
        
        // أزرار التحكم في التعليمات الجانبية
        document.getElementById('help-btn').onclick = () => this.toggleManual(true);
        document.getElementById('close-manual').onclick = () => this.toggleManual(false);
        
        // أزرار العمليات
        document.getElementById('clear-btn').onclick = () => this.clearActiveCell();
        document.getElementById('exit-btn').onclick = () => location.reload();
    },

    async launchGame() {
        const nameA = document.getElementById('team-a').value;
        const nameB = document.getElementById('team-b').value;
        if (nameA) this.teams.a = nameA.toUpperCase();
        if (nameB) this.teams.b = nameB.toUpperCase();

        this.selectedLevel = document.getElementById('level-select').value;
        
        // جلب البيانات مع معالجة خطأ المسار
        try {
            const response = await fetch(`./data/${this.selectedLevel}.json`);
            if (!response.ok) throw new Error('File not found');
            const data = await response.json();
            
            this.preparePool(data.pool);
            this.setupUI();
        } catch (err) {
            alert("خطأ تقني: تأكد من تشغيل المشروع عبر (Live Server) أو خادم محلي لقراءة ملفات JSON.");
            console.error(err);
        }
    },

    // 2. تطبيق منطق الشمولية ومنع التكرار (81 خلية)
    preparePool(pool) {
        let g1 = [], g2 = [];
        if (this.selectedLevel === 'level3') {
            g1 = pool.ones_group;
            g2 = [...pool.multi_solution_group, ...pool.unique_challenges];
        } else {
            g1 = pool.ones_group_10_percent || pool.only_ones_group;
            g2 = pool.strict_challenges_90_percent || pool.strict_challenges_2_to_9 || pool.challenges;
        }

        // خلط البيانات (Shuffle) واختيار 81 عملية
        const s1 = g1.sort(() => Math.random() - 0.5).slice(0, 8);
        const s2 = g2.sort(() => Math.random() - 0.5).slice(0, 73);
        
        this.currentPool = [...s1, ...s2].sort(() => Math.random() - 0.5);
    },

    // 3. تهيئة واجهة اللعب وتوزيع المهام
    setupUI() {
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        
        document.getElementById('display-team-a').textContent = this.teams.a;
        document.getElementById('display-team-b').textContent = this.teams.b;
        
        this.renderBoard();
        this.renderNumpad();
        this.updateManualContent();
    },

    renderBoard() {
        const board = document.getElementById('game-board');
        board.innerHTML = '';
        
        this.currentPool.forEach((item, idx) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.idx = idx;
            
            if (this.selectedLevel === 'level3') {
                cell.innerHTML = `<small>${item.op}</small><span>${item.target}</span>`;
            } else {
                cell.textContent = item.q;
            }

            cell.onclick = () => {
                document.querySelectorAll('.cell').forEach(c => c.classList.remove('active'));
                cell.classList.add('active');
                this.activeCell = cell;
            };
            board.appendChild(cell);
        });
    },

    renderNumpad() {
        const pad = document.getElementById('numpad');
        pad.innerHTML = '';
        for (let i = 1; i <= 9; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.onclick = () => this.processInput(i);
            pad.appendChild(btn);
        }
    },

    // 4. منطق التحقق المتقدم (Validation Engine)
    processInput(num) {
        if (!this.activeCell) return;
        const idx = this.activeCell.dataset.idx;
        const data = this.currentPool[idx];
        let correct = false;

        if (this.selectedLevel === 'level3') {
            if (!this.activeCell.dataset.val1) {
                this.activeCell.dataset.val1 = num;
                this.activeCell.textContent = `${num}, ?`;
                return;
            } else {
                const v1 = parseInt(this.activeCell.dataset.val1);
                correct = data.pairs.some(p => (p[0] === v1 && p[1] === num) || (p[0] === num && p[1] === v1));
                if (correct) this.markCorrect(this.activeCell, `${v1},${num}`);
                else this.flashError(this.activeCell);
            }
        } else {
            if (num === data.a) {
                this.markCorrect(this.activeCell, num);
                correct = true;
            } else {
                this.flashError(this.activeCell);
            }
        }
    },

    markCorrect(cell, val) {
        cell.classList.add('correct');
        cell.textContent = val;
        cell.onclick = null;
        this.activeCell = null;
        this.scores.a++; // نظام نقاط افتراضي
        document.getElementById('score-a').textContent = this.scores.a;
        this.checkVictory();
    },

    flashError(cell) {
        cell.classList.add('error-shake');
        setTimeout(() => {
            cell.classList.remove('error-shake');
            if(this.selectedLevel === 'level3') {
                delete cell.dataset.val1;
                cell.textContent = this.currentPool[cell.dataset.idx].target;
            }
        }, 400);
    },

    // 5. إدارة التعليمات الجانبية والنتائج
    toggleManual(show) {
        const panel = document.getElementById('side-manual');
        show ? panel.classList.remove('hidden') : panel.classList.add('hidden');
    },

    updateManualContent() {
        const content = {
            level1: "المستوى الكلاسيكي: أدخل الناتج المباشر للعملية الظاهرة في الخلية.",
            level2: "مستوى المجهول: ابحث عن الرقم الذي يكمل المعادلة (المجهول في المنتصف).",
            level3: "المستوى المزدوج: أدخل رقمين بالتوالي يحققان الناتج المستهدف عبر العملية الموضحة.",
            level4: "مستوى الميزان: أوجد الرقم الذي يحقق التساوي بين الطرف الأيمن والأيسر للمعادلة."
        };
        document.getElementById('dynamic-manual-content').textContent = content[this.selectedLevel];
    },

    checkVictory() {
        const correctCount = document.querySelectorAll('.correct').length;
        if (correctCount === 81) {
            alert(`تهانينا لفريق ${this.teams.a}! تم إكمال المهمة بنجاح.`);
        }
    }
};

// تشغيل المحرك عند تحميل الصفحة
window.onload = () => GameEngine.init();
