(function(){
    // ---------------------- Глобальные переменные --------------------------
    let COLS = 39;
    let ROWS = 28;
    let START_SIZE = 2;
    let PLAYER_COUNT = 4;
    let CELL_SIZE = 20;
    let CANVAS_W = COLS * CELL_SIZE;
    let CANVAS_H = ROWS * CELL_SIZE;

    const BASE_PLAYER_COLORS = {
        1: '#e34234',
        2: '#4682b4',
        3: '#3c9e3c',
        4: '#e8b323'
    };
    let PLAYER_COLORS = { ...BASE_PLAYER_COLORS };
    const NEUTRAL_COLOR = '#aaaaaa';
    const GRID_COLOR = '#c0b9a4';
    const RECT_BORDER = '#000000';
    const PREDEFINED_GHOST_STYLE = 'rgba(100, 200, 255, 0.5)';
    const KILL_GHOST_STYLE = 'rgba(255, 80, 80, 0.6)';
    const AVAILABLE_HIGHLIGHT = 'rgba(50, 255, 50, 0.3)';
    const AVAILABLE_BORDER = '#00ff00';

    let rectangles = [];
    let currentPlayer = 1;
    let diceN = 0, diceM = 0;
    let waitingForRoll = true;
    let turnCounter = 0;
    let activePlayers = [1,2,3,4];
    let eliminatedOrder = [];
    let gameActive = true;
    let timerSeconds = 0;
    let timerInterval = null;
    let botMode = true;
    let botPlayers = [2, 3, 4];
    let isBotThinking = false;
    let simulationMode = false;
    let pendingBotTimeout = null;
    let placementActive = false;
    let currentShape = { x: 0, y: 0, w: 0, h: 0 };
    let availableMoves = [];
    let showAvailableHighlight = true;
    let START_CELLS = {};
    let redrawScheduled = false;

    let gameGeneration = 0;
    let currentGameGeneration = 0;

    let touchMoved = false;
    let touchStartX = 0, touchStartY = 0;
    let longPressTimer = null;
    let isLongPress = false;

    // ---------------------- Определение мобильного устройства ------------------
    function isMobileDevice() {
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent)) {
            return true;
        }
        if (window.innerWidth <= 1024 && (navigator.maxTouchPoints > 1 || 'ontouchstart' in window)) {
            return true;
        }
        return false;
    }

    // ---------------------- Локализация --------------------------
    const isRussian = window.location.pathname.includes('index-ru.html');
    function getPlayerName(player) {
        return `${isRussian ? "Игрок" : "Player"} ${player}`;
    }
    function tt(ru, en) { return isRussian ? ru : en; }

    // ---------------------- DOM элементы --------------------------
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const turnText = document.getElementById('turnText');
    const diceDisplay = document.getElementById('diceDisplay');
    const rollBtn = document.getElementById('rollBtn');
    const skipBtn = document.getElementById('skipBtn');
    const resetBtnLeft = document.getElementById('resetBtnLeft');
    const sideScorePanel = document.getElementById('sideScorePanel');
    const turnCountDisplay = document.getElementById('turnCountDisplay');
    const timerDisplay = document.getElementById('timerDisplay');

    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const drawerCloseBtn = document.getElementById('drawerCloseBtn');
    const mobileRollBtn = document.getElementById('mobileRollBtn');
    const mobileSkipBtn = document.getElementById('mobileSkipBtn');
    const mobileNewGameBtn = document.getElementById('mobileNewGameBtn');
    const mobileSettingsBtn = document.getElementById('mobileSettingsBtn');
    const mobileProgressBtn = document.getElementById('mobileProgressBtn');
    const mobileHelpBtn = document.getElementById('mobileHelpBtn');
    const mobileLangBtn = document.getElementById('mobileLangBtn');
    const mobileScorePanel = document.getElementById('mobileScorePanel');
    const mobileTurnText = document.getElementById('mobileTurnText');
    const mobileTurnCount = document.getElementById('mobileTurnCount');
    const mobileTimerDisplay = document.getElementById('mobileTimerDisplay');

    const settingsIcon = document.getElementById('settingsIcon');
    const settingsModal = document.getElementById('settingsModal');
    const closeModalSpan = document.querySelector('.close-modal');
    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    const applySettingsBtn = document.getElementById('applySettingsBtn');
    const botsToggle = document.getElementById('botsToggle');
    const simulationToggle = document.getElementById('simulationToggle');
    const customSizeInputs = document.getElementById('customSizeInputs');
    const customCols = document.getElementById('customCols');
    const customRows = document.getElementById('customRows');
    const radioStandard = document.querySelector('input[value="standard"]');
    const radioCustom = document.querySelector('input[value="custom"]');
    const colorModeRadios = document.querySelectorAll('input[name="colorMode"]');
    const playerCountRadios = document.querySelectorAll('input[name="playerCount"]');
    const startSizeSlider = document.getElementById('startSizeSlider');
    const startSizeValue = document.getElementById('startSizeValue');
    const botsStatusText = document.getElementById('botsStatusText');
    const sizeWarning = document.getElementById('sizeWarning');
    const minFieldSizeSpan = document.getElementById('minFieldSizeSpan');
    const minFieldSizeSpan2 = document.getElementById('minFieldSizeSpan2');
    const highlightToggle = document.getElementById('highlightToggle');
    const helpButton = document.getElementById('helpButton');
    const helpModal = document.getElementById('helpModal');
    const closeHelpSpan = document.querySelector('.close-help-modal');
    const closeHelpBtn = document.getElementById('closeHelpBtn');
    const langButton = document.getElementById('langButton');
    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmYesBtn = document.getElementById('confirmYesBtn');
    const confirmNoBtn = document.getElementById('confirmNoBtn');
    const closeConfirmSpan = document.querySelector('.close-confirm-modal');
    const resultModal = document.getElementById('gameResultModal');
    const closeResultModal = document.querySelector('.close-result-modal');
    const resultNewGameBtn = document.getElementById('resultNewGameBtn');
    const resultCloseBtn = document.getElementById('resultCloseBtn');

    // Progress modal
    const progressButton = document.getElementById('progressButton');
    const progressModal = document.getElementById('progressModal');
    const closeProgressModalSpan = document.querySelector('.close-progress-modal');
    const progressBody = document.getElementById('progressBody');
    const progressTabs = document.querySelectorAll('.progress-tab');

    let pendingConfirmAction = null;
    let pendingConfirmActionType = null;

    // ========================================================================
    // ====================== ПРОГРЕСС: СТАТИСТИКА И ДОСТИЖЕНИЯ ===============
    // ========================================================================
    const STATS_KEY = 'capture_player_stats_v1';

    function createDefaultStats() {
        return {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            gamesByPlayerCount: { 2: 0, 4: 0 },
            winsByPlayerCount: { 2: 0, 4: 0 },
            currentWinStreak: 0,
            bestWinStreak: 0,
            currentLossStreak: 0,
            totalTimeSeconds: 0,
            totalTurns: 0,
            totalCellsCaptured: 0,
            neutralCellsCaptured: 0,
            enemyCellsCaptured: 0,
            biggestCapture: 0,
            biggestTerritoryPercent: 0,
            totalRolls: 0,
            doublesRolled: 0,
            deadRolls: 0,
            sumDistribution: [0,0,0,0,0,0,0,0,0,0,0,0,0],
            maxConsecutiveDeadRolls: 0,
            maxConsecutiveDoubles: 0,
            eliminatedOpponents: 0,
            timesEliminated: 0,
            eliminationsByMe: { 1:0, 2:0, 3:0, 4:0 },
            eliminationsOfMe: { 1:0, 2:0, 3:0, 4:0 },
            winsByDominance: 0,
            winsByElimination: 0,
            winsByFull: 0,
            simulationsWatched: 0,
            fieldSizesPlayed: [],
            customFieldGames: 0,
            bigStartWins: 0,
            colorblindGames: 0,
            achievements: {}
        };
    }

    let playerStats = createDefaultStats();

    // Промежуточные счётчики для текущей партии
    let currentGameTracking = {
        eliminationsByMe: 0,
        startPlayerCount: 4,
        startStartSize: 2,
        fieldSizeKey: '39x28',
        colorMode: 'normal',
        countedAsFinished: false
    };

    let _consecutiveDeadRolls = 0;
    let _consecutiveDoubles = 0;

    function loadStats() {
        try {
            const raw = localStorage.getItem(STATS_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            playerStats = Object.assign(createDefaultStats(), parsed);
            playerStats.gamesByPlayerCount = Object.assign({ 2: 0, 4: 0 }, parsed.gamesByPlayerCount || {});
            playerStats.winsByPlayerCount = Object.assign({ 2: 0, 4: 0 }, parsed.winsByPlayerCount || {});
            playerStats.eliminationsByMe = Object.assign({ 1:0,2:0,3:0,4:0 }, parsed.eliminationsByMe || {});
            playerStats.eliminationsOfMe = Object.assign({ 1:0,2:0,3:0,4:0 }, parsed.eliminationsOfMe || {});
            playerStats.achievements = parsed.achievements || {};
            if (!Array.isArray(playerStats.sumDistribution) || playerStats.sumDistribution.length !== 13) {
                playerStats.sumDistribution = [0,0,0,0,0,0,0,0,0,0,0,0,0];
            }
            if (!Array.isArray(playerStats.fieldSizesPlayed)) {
                playerStats.fieldSizesPlayed = [];
            }
        } catch(e) { /* ignore */ }
    }

    function saveStats() {
        try {
            localStorage.setItem(STATS_KEY, JSON.stringify(playerStats));
        } catch(e) { /* ignore */ }
    }

    function trackRoll(d1, d2, isDeadRoll) {
        if (simulationMode) return;
        if (currentPlayer !== 1) return;

        playerStats.totalRolls++;
        const sum = d1 + d2;
        if (sum >= 2 && sum <= 12) playerStats.sumDistribution[sum]++;

        if (d1 === d2) {
            playerStats.doublesRolled++;
            _consecutiveDoubles++;
            if (_consecutiveDoubles > playerStats.maxConsecutiveDoubles) {
                playerStats.maxConsecutiveDoubles = _consecutiveDoubles;
            }
        } else {
            _consecutiveDoubles = 0;
        }

        if (isDeadRoll) {
            playerStats.deadRolls++;
            _consecutiveDeadRolls++;
            if (_consecutiveDeadRolls > playerStats.maxConsecutiveDeadRolls) {
                playerStats.maxConsecutiveDeadRolls = _consecutiveDeadRolls;
            }
        } else {
            _consecutiveDeadRolls = 0;
        }

        checkAchievements();
        saveStats();
    }

    function trackMove(cells, captureType) {
        if (simulationMode) return;
        if (currentPlayer !== 1) return;

        playerStats.totalCellsCaptured += cells;
        if (captureType === 'enemy') {
            playerStats.enemyCellsCaptured += cells;
        } else {
            playerStats.neutralCellsCaptured += cells;
        }
        if (cells > playerStats.biggestCapture) {
            playerStats.biggestCapture = cells;
        }
        checkAchievements();
        saveStats();
    }

    function trackElimination(eliminatedPlayer, killerPlayer) {
        if (simulationMode) return;
        if (killerPlayer === 1) {
            playerStats.eliminatedOpponents++;
            playerStats.eliminationsByMe[eliminatedPlayer] = (playerStats.eliminationsByMe[eliminatedPlayer] || 0) + 1;
            currentGameTracking.eliminationsByMe++;
        }
        if (eliminatedPlayer === 1) {
            playerStats.timesEliminated++;
            playerStats.eliminationsOfMe[killerPlayer] = (playerStats.eliminationsOfMe[killerPlayer] || 0) + 1;
        }
        checkAchievements();
        saveStats();
    }

    function getMyTerritoryPercent() {
        const totalCells = COLS * ROWS;
        if (totalCells === 0) return 0;
        let mine = 0;
        for (let r of rectangles) if (r.owner === 1) mine += r.w * r.h;
        return (mine / totalCells) * 100;
    }

    function trackGameEnd(reason, winnerPlayer) {
        if (currentGameTracking.countedAsFinished) return;
        currentGameTracking.countedAsFinished = true;

        const myPercent = getMyTerritoryPercent();
        if (myPercent > playerStats.biggestTerritoryPercent) {
            playerStats.biggestTerritoryPercent = myPercent;
        }

        if (simulationMode) {
            playerStats.simulationsWatched++;
            if (!playerStats.fieldSizesPlayed.includes(currentGameTracking.fieldSizeKey)) {
                playerStats.fieldSizesPlayed.push(currentGameTracking.fieldSizeKey);
            }
            checkAchievements();
            saveStats();
            return;
        }

        playerStats.gamesPlayed++;
        playerStats.totalTimeSeconds += timerSeconds;
        playerStats.totalTurns += turnCounter;

        const pc = currentGameTracking.startPlayerCount;
        playerStats.gamesByPlayerCount[pc] = (playerStats.gamesByPlayerCount[pc] || 0) + 1;

        const isStandard = (COLS === 39 && ROWS === 28);
        if (!isStandard) playerStats.customFieldGames++;
        if (!playerStats.fieldSizesPlayed.includes(currentGameTracking.fieldSizeKey)) {
            playerStats.fieldSizesPlayed.push(currentGameTracking.fieldSizeKey);
        }

        if (currentGameTracking.colorMode !== 'normal') {
            playerStats.colorblindGames++;
        }

        const didWin = (winnerPlayer === 1);

        // Вспомогательные поля для достижений
        playerStats._lastGameWon = didWin;
        playerStats._lastGameTurns = turnCounter;
        playerStats._lastGameTime = timerSeconds;

        if (didWin) {
            playerStats.wins++;
            playerStats.winsByPlayerCount[pc] = (playerStats.winsByPlayerCount[pc] || 0) + 1;
            playerStats.currentWinStreak++;
            playerStats.currentLossStreak = 0;
            if (playerStats.currentWinStreak > playerStats.bestWinStreak) {
                playerStats.bestWinStreak = playerStats.currentWinStreak;
            }

            if (reason === 'dominance') playerStats.winsByDominance++;
            else if (reason === 'elimination') playerStats.winsByElimination++;
            else if (reason === 'full') playerStats.winsByFull++;

            if (currentGameTracking.startStartSize === 6) {
                playerStats.bigStartWins++;
            }
            if (botMode && !simulationMode) {
                playerStats._botHunterWins = (playerStats._botHunterWins || 0) + 1;
            }
            if (!isStandard) {
                playerStats._customWins = (playerStats._customWins || 0) + 1;
            }
        } else {
            playerStats.losses++;
            playerStats.currentLossStreak++;
            playerStats.currentWinStreak = 0;
        }

        checkAchievements();
        saveStats();
    }

    // ---- Определения достижений ----
    const ACHIEVEMENTS = [
        { id: 'first_game', cat: 'first_steps', icon: '🎮',
          name: () => tt('Первая партия', 'First game'),
          desc: () => tt('Завершить любую игру', 'Complete any game'),
          check: (s) => ({ cur: Math.min(s.gamesPlayed, 1), max: 1 }) },
        { id: 'first_blood', cat: 'first_steps', icon: '🩸',
          name: () => tt('Первая кровь', 'First blood'),
          desc: () => tt('Устранить первого противника', 'Eliminate your first opponent'),
          check: (s) => ({ cur: Math.min(s.eliminatedOpponents, 1), max: 1 }) },
        { id: 'first_win', cat: 'first_steps', icon: '🏅',
          name: () => tt('Первая победа', 'First victory'),
          desc: () => tt('Выиграть любую партию', 'Win any game'),
          check: (s) => ({ cur: Math.min(s.wins, 1), max: 1 }) },
        { id: 'first_double', cat: 'first_steps', icon: '🎲',
          name: () => tt('Первый дубль', 'First double'),
          desc: () => tt('Выбросить одинаковые кубики', 'Roll matching dice'),
          check: (s) => ({ cur: Math.min(s.doublesRolled, 1), max: 1 }) },

        { id: 'veteran_10', cat: 'regularity', icon: '⚔️',
          name: () => tt('Ветеран', 'Veteran'),
          desc: () => tt('Сыграть 10 партий', 'Play 10 games'),
          check: (s) => ({ cur: s.gamesPlayed, max: 10 }) },
        { id: 'regular_50', cat: 'regularity', icon: '🏰',
          name: () => tt('Завсегдатай', 'Regular'),
          desc: () => tt('Сыграть 50 партий', 'Play 50 games'),
          check: (s) => ({ cur: s.gamesPlayed, max: 50 }) },
        { id: 'centurion_100', cat: 'regularity', icon: '💯',
          name: () => tt('Сотник', 'Centurion'),
          desc: () => tt('Сыграть 100 партий', 'Play 100 games'),
          check: (s) => ({ cur: s.gamesPlayed, max: 100 }) },
        { id: 'winner_10', cat: 'regularity', icon: '🏆',
          name: () => tt('Победитель', 'Winner'),
          desc: () => tt('Одержать 10 побед', 'Win 10 games'),
          check: (s) => ({ cur: s.wins, max: 10 }) },
        { id: 'winner_50', cat: 'regularity', icon: '👑',
          name: () => tt('Властелин', 'Overlord'),
          desc: () => tt('Одержать 50 побед', 'Win 50 games'),
          check: (s) => ({ cur: s.wins, max: 50 }) },
        { id: 'winner_100', cat: 'regularity', icon: '🌟',
          name: () => tt('Легенда', 'Legend'),
          desc: () => tt('Одержать 100 побед', 'Win 100 games'),
          check: (s) => ({ cur: s.wins, max: 100 }) },
        { id: 'streak_3', cat: 'regularity', icon: '🔥',
          name: () => tt('Серия из 3', 'Streak of 3'),
          desc: () => tt('3 победы подряд', 'Win 3 in a row'),
          check: (s) => ({ cur: s.bestWinStreak, max: 3 }) },
        { id: 'streak_5', cat: 'regularity', icon: '⚡',
          name: () => tt('Серия из 5', 'Streak of 5'),
          desc: () => tt('5 побед подряд', 'Win 5 in a row'),
          check: (s) => ({ cur: s.bestWinStreak, max: 5 }) },

        { id: 'max_capture', cat: 'capture', icon: '🟩',
          name: () => tt('Максимальный захват', 'Max capture'),
          desc: () => tt('Занять прямоугольник 6×6', 'Capture a 6×6 rectangle'),
          check: (s) => ({ cur: s.biggestCapture, max: 36 }) },
        { id: 'neutralizer', cat: 'capture', icon: '⬜',
          name: () => tt('Нейтрализатор', 'Neutralizer'),
          desc: () => tt('Захватить 100 нейтральных клеток', 'Capture 100 neutral cells'),
          check: (s) => ({ cur: s.neutralCellsCaptured, max: 100 }) },
        { id: 'cleanup', cat: 'capture', icon: '🌍',
          name: () => tt('Зачистка', 'Cleanup'),
          desc: () => tt('Захватить 10 000 клеток за всё время', 'Capture 10,000 cells overall'),
          check: (s) => ({ cur: s.totalCellsCaptured, max: 10000 }) },
        { id: 'dominator', cat: 'capture', icon: '🎯',
          name: () => tt('Доминатор', 'Dominator'),
          desc: () => tt('Победить по правилу 2/3 поля', 'Win by controlling 2/3'),
          check: (s) => ({ cur: Math.min(s.winsByDominance, 1), max: 1 }) },
        { id: 'annihilator', cat: 'capture', icon: '💀',
          name: () => tt('Аннигилятор', 'Annihilator'),
          desc: () => tt('Победить, устранив всех', 'Win by eliminating all'),
          check: (s) => ({ cur: Math.min(s.winsByElimination, 1), max: 1 }) },
        { id: 'total_control', cat: 'capture', icon: '🏁',
          name: () => tt('Тотальный контроль', 'Total control'),
          desc: () => tt('Победить, полностью заполнив поле', 'Win by filling the board'),
          check: (s) => ({ cur: Math.min(s.winsByFull, 1), max: 1 }) },

        { id: 'snake_eyes', cat: 'dice', icon: '👀',
          name: () => tt('Змеиные глаза', 'Snake eyes'),
          desc: () => tt('Выбросить 1 и 1', 'Roll 1 and 1'),
          check: (s) => ({ cur: Math.min(s.sumDistribution[2], 1), max: 1 }) },
        { id: 'double_six', cat: 'dice', icon: '🎰',
          name: () => tt('Двойная шестёрка', 'Double six'),
          desc: () => tt('Выбросить 6 и 6', 'Roll 6 and 6'),
          check: (s) => ({ cur: Math.min(s.sumDistribution[12], 1), max: 1 }) },
        { id: 'triple_double', cat: 'dice', icon: '🎲',
          name: () => tt('Трижды подряд', 'Three in a row'),
          desc: () => tt('Три раза подряд выбросить дубль', 'Roll doubles 3 times in a row'),
          check: (s) => ({ cur: s.maxConsecutiveDoubles, max: 3 }) },
        { id: 'sum_collector', cat: 'dice', icon: '🧮',
          name: () => tt('Коллекционер сумм', 'Sum collector'),
          desc: () => tt('Выбросить все суммы от 2 до 12', 'Roll every sum from 2 to 12'),
          check: (s) => {
              let got = 0;
              for (let i = 2; i <= 12; i++) if (s.sumDistribution[i] > 0) got++;
              return { cur: got, max: 11 };
          } },

        { id: 'blitz', cat: 'situational', icon: '💨',
          name: () => tt('Блиц', 'Blitz'),
          desc: () => tt('Победить менее чем за 75 ходов', 'Win in fewer than 75 turns'),
          check: (s) => ({ cur: (s._lastGameWon && s._lastGameTurns <= 75) ? 1 : 0, max: 1 }) },
        { id: 'speedrun', cat: 'situational', icon: '⏱️',
          name: () => tt('Скороход', 'Speedrun'),
          desc: () => tt('Победить быстрее чем за 5 минут', 'Win in under 5 minutes'),
          check: (s) => ({ cur: (s._lastGameWon && s._lastGameTime <= 300) ? 1 : 0, max: 1 }) },
        { id: 'bot_hunter', cat: 'situational', icon: '🤖',
          name: () => tt('Охотник на ботов', 'Bot hunter'),
          desc: () => tt('Победить в партии, где все соперники боты', 'Win when all opponents are bots'),
          check: (s) => ({ cur: Math.min(s._botHunterWins || 0, 1), max: 1 }) },
        { id: 'customizer', cat: 'situational', icon: '🔧',
          name: () => tt('Кастомщик', 'Customizer'),
          desc: () => tt('Победить на нестандартном поле', 'Win on a non-standard field'),
          check: (s) => ({ cur: Math.min(s._customWins || 0, 1), max: 1 }) },
        { id: 'colorblind_friendly', cat: 'situational', icon: '🌈',
          name: () => tt('Цветотерапия', 'Color therapy'),
          desc: () => tt('Сыграть с включённым режимом цветовой коррекции', 'Play with a colorblind mode active'),
          check: (s) => ({ cur: Math.min(s.colorblindGames, 1), max: 1 }) }
    ];

    const CATEGORIES = [
        { key: 'first_steps', titleRu: '🥉 Первые шаги', titleEn: '🥉 First steps' },
        { key: 'regularity', titleRu: '🥈 Регулярность', titleEn: '🥈 Regularity' },
        { key: 'capture', titleRu: '🥇 Мастерство захвата', titleEn: '🥇 Capture mastery' },
        { key: 'dice', titleRu: '🎲 Кубиковая удача', titleEn: '🎲 Dice luck' },
        { key: 'situational', titleRu: '🏆 Ситуативные', titleEn: '🏆 Situational' }
    ];

    function checkAchievements() {
        let newlyUnlocked = [];
        for (const ach of ACHIEVEMENTS) {
            if (playerStats.achievements[ach.id]) continue;
            let res;
            try { res = ach.check(playerStats); } catch(e) { res = { cur: 0, max: 1 }; }
            if (res && res.cur >= res.max) {
                playerStats.achievements[ach.id] = Date.now();
                newlyUnlocked.push(ach);
            }
        }
        if (newlyUnlocked.length > 0) {
            saveStats();
        }
        return newlyUnlocked;
    }

    function getAchievementProgress(ach) {
        try {
            const res = ach.check(playerStats);
            if (!res) return { cur: 0, max: 1, unlocked: false };
            return { cur: res.cur, max: res.max, unlocked: res.cur >= res.max };
        } catch(e) {
            return { cur: 0, max: 1, unlocked: false };
        }
    }

    function formatPlayTime(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        if (h > 0) return `${h}${tt('ч','h')} ${m}${tt('м','m')}`;
        return `${m}${tt('м','m')}`;
    }

    function mostFrequentSum() {
        let best = 0, bestCount = 0;
        for (let i = 2; i <= 12; i++) {
            if (playerStats.sumDistribution[i] > bestCount) {
                bestCount = playerStats.sumDistribution[i];
                best = i;
            }
        }
        return best === 0 ? null : { sum: best, count: bestCount };
    }

    function favoriteTarget() {
        let best = 0, bestCount = 0;
        for (let p = 1; p <= 4; p++) {
            if (playerStats.eliminationsByMe[p] > bestCount) {
                bestCount = playerStats.eliminationsByMe[p];
                best = p;
            }
        }
        return best === 0 ? null : { player: best, count: bestCount };
    }

    function worstEnemy() {
        let best = 0, bestCount = 0;
        for (let p = 1; p <= 4; p++) {
            if (playerStats.eliminationsOfMe[p] > bestCount) {
                bestCount = playerStats.eliminationsOfMe[p];
                best = p;
            }
        }
        return best === 0 ? null : { player: best, count: bestCount };
    }

    function statRow(label, value) {
        return `<div class="stat-row"><span class="stat-row-label">${label}</span><span class="stat-row-value">${value}</span></div>`;
    }

    function renderStatsTab() {
        const s = playerStats;
        const total = s.wins + s.losses;
        const winrate = total > 0 ? ((s.wins / total) * 100).toFixed(1) : '0.0';
        const favTarget = favoriteTarget();
        const worst = worstEnemy();
        const favSum = mostFrequentSum();

        let html = '';
        html += `<div class="stat-section"><h4>📈 ${tt('Общее','General')}</h4>`;
        html += statRow(tt('Игр сыграно','Games played'), s.gamesPlayed);
        html += statRow(tt('Побед','Wins'), s.wins);
        html += statRow(tt('Поражений','Losses'), s.losses);
        html += statRow(tt('Винрейт','Winrate'), winrate + '%');
        html += statRow(tt('Текущая серия побед','Current win streak'), s.currentWinStreak);
        html += statRow(tt('Лучшая серия','Best win streak'), s.bestWinStreak);
        html += statRow(tt('Общее время в игре','Total playtime'), formatPlayTime(s.totalTimeSeconds));
        html += statRow(tt('Общее число ходов','Total turns'), s.totalTurns);
        html += `</div>`;

        html += `<div class="stat-section"><h4>🗺️ ${tt('Территория','Territory')}</h4>`;
        html += statRow(tt('Всего захвачено клеток','Total cells captured'), s.totalCellsCaptured);
        html += statRow(tt('Захвачено нейтралов','Neutral cells'), s.neutralCellsCaptured);
        html += statRow(tt('Захвачено у врагов','Enemy cells'), s.enemyCellsCaptured);
        html += statRow(tt('Крупнейший захват','Biggest capture'), s.biggestCapture);
        html += statRow(tt('Рекорд территории','Best territory'), s.biggestTerritoryPercent.toFixed(1) + '%');
        html += `</div>`;

        html += `<div class="stat-section"><h4>🎲 ${tt('Кубики','Dice')}</h4>`;
        html += statRow(tt('Всего бросков','Total rolls'), s.totalRolls);
        html += statRow(tt('Дублей выпало','Doubles rolled'), s.doublesRolled);
        html += statRow(tt('Пропущенных ходов','Dead rolls'), s.deadRolls);
        html += statRow(tt('Максимум дублей подряд','Max doubles in a row'), s.maxConsecutiveDoubles);
        html += statRow(tt('Максимум пропусков подряд','Max dead rolls in a row'), s.maxConsecutiveDeadRolls);
        html += statRow(tt('Самая частая сумма','Most frequent sum'),
            favSum ? `${favSum.sum} (${favSum.count}×)` : '—');
        html += `</div>`;

        html += `<div class="stat-section"><h4>⚔️ ${tt('Устранения','Eliminations')}</h4>`;
        html += statRow(tt('Устранено противников','Opponents eliminated'), s.eliminatedOpponents);
        html += statRow(tt('Сам был устранён','Times eliminated'), s.timesEliminated);
        html += statRow(tt('Любимая жертва','Favorite target'),
            favTarget ? `${getPlayerName(favTarget.player)} (${favTarget.count}×)` : '—');
        html += statRow(tt('Злейший враг','Nemesis'),
            worst ? `${getPlayerName(worst.player)} (${worst.count}×)` : '—');
        html += `</div>`;

        html += `<div class="stat-section"><h4>🏁 ${tt('Типы побед','Victory types')}</h4>`;
        html += statRow(tt('По доминированию (2/3)','By dominance (2/3)'), s.winsByDominance);
        html += statRow(tt('По устранению всех','By elimination'), s.winsByElimination);
        html += statRow(tt('По заполнению поля','By full board'), s.winsByFull);
        html += statRow(tt('Просмотрено симуляций','Simulations watched'), s.simulationsWatched);
        html += statRow(tt('Побед на кастомном поле','Custom field wins'), s._customWins || 0);
        html += `</div>`;

        html += `<div class="progress-summary">${tt('Сыграно с 2 игроками','Games with 2 players')}: <strong>${s.gamesByPlayerCount[2] || 0}</strong> · ${tt('с 4 игроками','with 4')}: <strong>${s.gamesByPlayerCount[4] || 0}</strong></div>`;

        progressBody.innerHTML = html;
    }

    function renderAchievementsTab() {
        let totalUnlocked = 0;
        let totalAch = ACHIEVEMENTS.length;

        for (const ach of ACHIEVEMENTS) {
            if (playerStats.achievements[ach.id]) totalUnlocked++;
        }

        let html = '';
        for (const cat of CATEGORIES) {
            const catAchs = ACHIEVEMENTS.filter(a => a.cat === cat.key);
            let catUnlocked = 0;
            catAchs.forEach(a => { if (playerStats.achievements[a.id]) catUnlocked++; });

            html += `<div class="stat-section"><h4>${tt(cat.titleRu, cat.titleEn)}<span class="ach-counter-badge">${catUnlocked} / ${catAchs.length}</span></h4>`;
            html += `<div class="ach-grid">`;
            for (const ach of catAchs) {
                const unlocked = !!playerStats.achievements[ach.id];
                const prog = getAchievementProgress(ach);
                const showProgress = !unlocked && prog.max > 1;
                const pct = prog.max > 0 ? Math.min(100, (prog.cur / prog.max) * 100) : 0;

                html += `<div class="ach-card ${unlocked ? '' : 'locked'}">`;
                html += `<div class="ach-icon">${ach.icon}</div>`;
                html += `<div class="ach-info">`;
                html += `<div class="ach-name">${ach.name()}</div>`;
                html += `<div class="ach-desc">${ach.desc()}</div>`;
                if (showProgress) {
                    html += `<div class="ach-progress"><div class="ach-progress-fill" style="width:${pct}%"></div></div>`;
                    html += `<div class="ach-progress-text">${prog.cur} / ${prog.max}</div>`;
                }
                html += `</div></div>`;
            }
            html += `</div></div>`;
        }

        html += `<div class="progress-summary">${tt('🔓 Разблокировано','🔓 Unlocked')} <strong>${totalUnlocked} ${tt('из','of')} ${totalAch}</strong></div>`;

        progressBody.innerHTML = html;
    }

    let currentProgressTab = 'stats';

    function renderProgressModal() {
        if (currentProgressTab === 'stats') {
            renderStatsTab();
        } else {
            renderAchievementsTab();
        }
        progressTabs.forEach(t => {
            t.classList.toggle('active', t.dataset.tab === currentProgressTab);
        });
    }

    function openProgressModal(tab = 'stats') {
        currentProgressTab = tab;
        renderProgressModal();
        progressModal.style.display = 'flex';
        if (progressBody) progressBody.scrollTop = 0;
    }

    function closeProgressModal() {
        progressModal.style.display = 'none';
    }

    progressTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            currentProgressTab = tab.dataset.tab;
            renderProgressModal();
            if (progressBody) progressBody.scrollTop = 0;
        });
    });

    if (progressButton) progressButton.addEventListener('click', () => openProgressModal('stats'));
    if (mobileProgressBtn) mobileProgressBtn.addEventListener('click', () => { closeDrawer(); openProgressModal('stats'); });
    if (closeProgressModalSpan) closeProgressModalSpan.addEventListener('click', closeProgressModal);
    window.addEventListener('click', (e) => { if (e.target === progressModal) closeProgressModal(); });

    // ========================================================================
    // ======================= КОНЕЦ БЛОКА ПРОГРЕССА ===========================
    // ========================================================================

    // ---------------------- Функции подтверждения --------------------------
    function showConfirmDialog(title, message, onConfirm, actionType) {
        if (!gameActive && actionType === 'skipTurn') return;
        confirmTitle.innerText = title;
        confirmMessage.innerText = message;
        pendingConfirmAction = onConfirm;
        pendingConfirmActionType = actionType;
        confirmModal.style.display = 'flex';
    }
    function closeConfirmDialog() {
        confirmModal.style.display = 'none';
        pendingConfirmAction = null;
        pendingConfirmActionType = null;
    }
    confirmYesBtn.addEventListener('click', () => {
        if (pendingConfirmAction) pendingConfirmAction();
        closeConfirmDialog();
    });
    confirmNoBtn.addEventListener('click', closeConfirmDialog);
    closeConfirmSpan.addEventListener('click', closeConfirmDialog);
    window.addEventListener('click', (e) => {
        if (e.target === confirmModal) closeConfirmDialog();
    });

    // ---------------------- Сохранение / загрузка --------------------------
    const SAVE_KEY = 'capture_game_save';
    function saveGameStateToLocalStorage() {
        const state = {
            COLS, ROWS, START_SIZE, PLAYER_COUNT,
            rectangles, currentPlayer, diceN, diceM, waitingForRoll,
            turnCounter, activePlayers, eliminatedOrder, gameActive, timerSeconds,
            placementActive, currentShape,
            botMode, botPlayers, simulationMode,
            showAvailableHighlight,
            colorMode: getSelectedColorMode(),
            playerCount: PLAYER_COUNT,
            startSize: START_SIZE,
            fieldSizeType: radioCustom.checked ? 'custom' : 'standard',
            customColsVal: parseInt(customCols.value, 10),
            customRowsVal: parseInt(customRows.value, 10),
            botsEnabled: botsToggle.checked,
            simulationEnabled: simulationToggle.checked,
            highlightEnabled: highlightToggle.checked,
            gameGeneration: gameGeneration
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    }
    function loadGameStateFromLocalStorage() {
        const saved = localStorage.getItem(SAVE_KEY);
        if (!saved) return false;
        try {
            const state = JSON.parse(saved);
            COLS = state.COLS;
            ROWS = state.ROWS;
            START_SIZE = state.START_SIZE;
            PLAYER_COUNT = state.PLAYER_COUNT;
            rectangles = state.rectangles;
            currentPlayer = state.currentPlayer;
            diceN = state.diceN;
            diceM = state.diceM;
            waitingForRoll = state.waitingForRoll;
            turnCounter = state.turnCounter;
            activePlayers = state.activePlayers;
            eliminatedOrder = state.eliminatedOrder;
            gameActive = state.gameActive;
            timerSeconds = state.timerSeconds;
            placementActive = state.placementActive;
            currentShape = state.currentShape;
            botMode = state.botMode;
            botPlayers = state.botPlayers;
            simulationMode = state.simulationMode;
            showAvailableHighlight = state.highlightEnabled !== undefined ? state.highlightEnabled : true;
            startSizeSlider.value = state.startSize;
            startSizeValue.textContent = state.startSize;
            if (state.fieldSizeType === 'custom') {
                radioCustom.checked = true;
                customSizeInputs.style.display = 'flex';
            } else {
                radioStandard.checked = true;
                customSizeInputs.style.display = 'none';
            }
            customCols.value = state.customColsVal;
            customRows.value = state.customRowsVal;
            botsToggle.checked = state.botsEnabled;
            simulationToggle.checked = state.simulationEnabled;
            highlightToggle.checked = state.highlightEnabled;
            for (let radio of playerCountRadios) {
                if (parseInt(radio.value, 10) === state.playerCount) radio.checked = true;
            }
            for (let radio of colorModeRadios) {
                if (radio.value === state.colorMode) radio.checked = true;
            }
            gameGeneration = state.gameGeneration || 0;
            currentGameGeneration = gameGeneration;
            updateCanvasSize();
            updateStartCells();
            applyColorBlindMode(state.colorMode);
            updateBotStatusText();
            return true;
        } catch(e) { return false; }
    }

    // ---------------------- Функции обновления UI --------------------------
    function updateBotStatusText() {
        if (simulationMode) {
            if (PLAYER_COUNT === 2) botsStatusText.innerText = isRussian ? "(режим симуляции: оба игрока боты)" : "(simulation mode: both players bots)";
            else botsStatusText.innerText = isRussian ? "(режим симуляции: все игроки боты)" : "(simulation mode: all players bots)";
            botsToggle.disabled = true;
            botsToggle.parentElement.style.opacity = '0.5';
        } else {
            if (PLAYER_COUNT === 2) {
                botsStatusText.innerText = botMode ? (isRussian ? "(игрок 2 — бот)" : "(player 2 is bot)") : (isRussian ? "(игроки оба живые)" : "(both human)");
            } else {
                botsStatusText.innerText = botMode ? (isRussian ? "(игроки 2,3,4 — боты)" : "(players 2,3,4 are bots)") : (isRussian ? "(все игроки люди)" : "(all human)");
            }
            botsToggle.disabled = false;
            botsToggle.parentElement.style.opacity = '1';
        }
    }
    function updateControlUI() {
        const isSimulation = simulationMode;
        const isBotTurnNow = (botMode && botPlayers.includes(currentPlayer)) || simulationMode;
        const isHumanControllable = !isSimulation && gameActive && !isBotTurnNow;
        if(rollBtn) rollBtn.disabled = !isHumanControllable || waitingForRoll === false;
        if(skipBtn) skipBtn.disabled = !isHumanControllable;
        if(mobileRollBtn) mobileRollBtn.disabled = !isHumanControllable || waitingForRoll === false;
        if(mobileSkipBtn) mobileSkipBtn.disabled = !isHumanControllable;
    }
    function getSelectedColorMode() {
        for (let radio of colorModeRadios) if (radio.checked) return radio.value;
        return 'normal';
    }
    function updateMinFieldSizeWarning() {
        const startSize = parseInt(startSizeSlider.value, 10);
        const minDim = 2 * startSize + 6;
        if (minFieldSizeSpan) minFieldSizeSpan.textContent = minDim;
        if (minFieldSizeSpan2) minFieldSizeSpan2.textContent = minDim;
        if (customCols && customRows) {
            const colsVal = parseInt(customCols.value, 10);
            const rowsVal = parseInt(customRows.value, 10);
            if (!isNaN(colsVal) && !isNaN(rowsVal) && (colsVal < minDim || rowsVal < minDim)) {
                sizeWarning.style.display = 'block';
            } else {
                sizeWarning.style.display = 'none';
            }
        }
    }
    startSizeSlider.addEventListener('input', () => {
        startSizeValue.textContent = startSizeSlider.value;
        updateMinFieldSizeWarning();
    });
    function updateCanvasSize() {
        const isMobile = document.body.classList.contains('mobile-device');
        if (isMobile) {
            const maxWidth = window.innerWidth - 10;
            const maxHeight = window.innerHeight - 10;
            const ratio = COLS / ROWS;
            let newWidth = maxWidth;
            let newHeight = newWidth / ratio;
            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                newWidth = newHeight * ratio;
            }
            CELL_SIZE = Math.floor(newWidth / COLS);
            if (CELL_SIZE < 12) CELL_SIZE = 12;
            CANVAS_W = COLS * CELL_SIZE;
            CANVAS_H = ROWS * CELL_SIZE;
        } else {
            CELL_SIZE = 20;
            CANVAS_W = COLS * CELL_SIZE;
            CANVAS_H = ROWS * CELL_SIZE;
        }
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        canvas.style.width = `${CANVAS_W}px`;
        canvas.style.height = `${CANVAS_H}px`;
    }
    function updateStartCells() {
        START_CELLS = {};
        if (PLAYER_COUNT === 2) {
            START_CELLS[1] = { x: 0, y: 0 };
            START_CELLS[2] = { x: COLS - START_SIZE, y: ROWS - START_SIZE };
        } else {
            START_CELLS[1] = { x: 0, y: 0 };
            START_CELLS[2] = { x: COLS - START_SIZE, y: 0 };
            START_CELLS[3] = { x: 0, y: ROWS - START_SIZE };
            START_CELLS[4] = { x: COLS - START_SIZE, y: ROWS - START_SIZE };
        }
    }
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    function updateTimerDisplay() {
        const timeStr = formatTime(timerSeconds);
        if(timerDisplay) timerDisplay.textContent = timeStr;
        if(mobileTimerDisplay) mobileTimerDisplay.textContent = timeStr;
    }
    function startTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = setInterval(() => { if (gameActive) { timerSeconds++; updateTimerDisplay(); saveGameStateToLocalStorage(); } }, 1000); }
    function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
    function resetTimer() { stopTimer(); timerSeconds = 0; updateTimerDisplay(); if (gameActive) startTimer(); }

    function computeScores() {
        let scores = {1:0,2:0,3:0,4:0};
        for(let rect of rectangles) if (rect.owner !== null && activePlayers.includes(rect.owner)) scores[rect.owner] += rect.w * rect.h;
        return scores;
    }
    function getNeutralCellCount() {
        let neutralCells = 0;
        for(let rect of rectangles) if (rect.owner === null) neutralCells += rect.w * rect.h;
        return neutralCells;
    }
    function updateSideScores() {
        const scores = computeScores();
        const neutralCells = getNeutralCellCount();
        const totalCells = COLS * ROWS;
        const percentOf = (cells) => totalCells > 0 ? ((cells / totalCells) * 100).toFixed(1) : '0.0';

        let html = '';
        const playersToShow = PLAYER_COUNT === 2 ? [1,2] : [1,2,3,4];
        for(let p of playersToShow) {
            const color = PLAYER_COLORS[p];
            const name = getPlayerName(p);
            const score = scores[p];
            const isEliminated = !activePlayers.includes(p);
            html += `<div class="player-score-card" style="border-left-color: ${color}">
                        <div class="player-color-badge" style="background: ${color}"></div>
                        <div class="player-score-info">
                            <div class="player-name">${name}${isEliminated ? (isRussian ? " (выбыл)" : " (eliminated)") : ''}</div>
                            <div class="player-score">${score} | ${percentOf(score)}%</div>
                        </div>
                    </div>`;
        }
        html += `<div class="neutral-score-card"><div class="neutral-badge" style="background:#aaaaaa;"></div><div class="neutral-info"><div class="neutral-name">${isRussian ? "Нейтральные" : "Neutral"}</div><div class="neutral-score">${neutralCells} | ${percentOf(neutralCells)}%</div></div></div>`;
        if(sideScorePanel) sideScorePanel.innerHTML = html;

        if(mobileScorePanel) {
            let mobileHtml = '';
            for(let p of playersToShow) {
                const color = PLAYER_COLORS[p];
                const name = getPlayerName(p);
                const score = scores[p];
                mobileHtml += `<div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;"><div style="width:20px; height:20px; background:${color}; border-radius:50%;"></div><div style="flex:1;">${name}</div><div style="font-weight:bold;">${score} | ${percentOf(score)}%</div></div>`;
            }
            mobileHtml += `<div style="display:flex; align-items:center; gap:10px;"><div style="width:20px; height:20px; background:#aaaaaa; border-radius:50%;"></div><div style="flex:1;">${isRussian ? "Нейтральные" : "Neutral"}</div><div style="font-weight:bold;">${neutralCells} | ${percentOf(neutralCells)}%</div></div>`;
            mobileScorePanel.innerHTML = mobileHtml;
        }
    }
    function updateUI() {
        const turnName = getPlayerName(currentPlayer);
        if(turnText) turnText.innerHTML = `${turnName} (${isRussian ? "ход" : "turn"})`;
        if(turnText) turnText.style.backgroundColor = PLAYER_COLORS[currentPlayer];
        if(mobileTurnText) mobileTurnText.textContent = turnName;
        if(mobileTurnCount) mobileTurnCount.textContent = turnCounter;
        if(turnCountDisplay) turnCountDisplay.innerText = turnCounter;
        if(diceN && diceM && !waitingForRoll) {
            if(diceDisplay) diceDisplay.innerHTML = `🎲 ${diceN}  ·  ${diceM} 🎲`;
        } else {
            if(diceDisplay) diceDisplay.innerHTML = `🎲  ?  ?  🎲`;
        }
        updateSideScores();
        updateControlUI();
        saveGameStateToLocalStorage();
    }

    // ---------------------- Игровая логика ------------------
    function areAdjacentByEdge(rect1, rect2) {
        const r1_left = rect1.x, r1_right = rect1.x + rect1.w - 1, r1_top = rect1.y, r1_bottom = rect1.y + rect1.h - 1;
        const r2_left = rect2.x, r2_right = rect2.x + rect2.w - 1, r2_top = rect2.y, r2_bottom = rect2.y + rect2.h - 1;
        const x_overlap = (r1_left <= r2_right && r1_right >= r2_left);
        const y_overlap = (r1_top <= r2_bottom && r1_bottom >= r2_top);
        if (x_overlap && (r1_bottom + 1 === r2_top || r2_bottom + 1 === r1_top)) return true;
        if (y_overlap && (r1_right + 1 === r2_left || r2_right + 1 === r1_left)) return true;
        return false;
    }
    function isAdjacentToPlayer(rect, player) {
        if (!activePlayers.includes(player)) return false;
        const playerRects = rectangles.filter(r => r.owner === player);
        for(let pr of playerRects) if(areAdjacentByEdge(rect, pr)) return true;
        return false;
    }
    function isAreaFree(x, y, w, h) {
        for(let r of rectangles) if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) return false;
        return true;
    }
    function getExactRectangle(x, y, w, h) {
        for(let r of rectangles) if(r.x === x && r.y === y && r.w === w && r.h === h) return r;
        return null;
    }
    function isValidSize(w, h, a, b) { return (w === a && h === b) || (w === b && h === a); }
    function coversStartCell(x, y, w, h, excludePlayer = null) {
        for (let p of activePlayers) {
            if (excludePlayer === p) continue;
            const start = START_CELLS[p];
            if (start && x <= start.x && start.x < x+w && y <= start.y && start.y < y+h) return p;
        }
        return null;
    }
    function getAvailableMoves(player, diceA, diceB) {
        const moves = [];
        const possibleSizes = [[diceA, diceB]];
        if (diceA !== diceB) possibleSizes.push([diceB, diceA]);
        for (let [w, h] of possibleSizes) {
            for (let y = 0; y <= ROWS - h; y++) {
                for (let x = 0; x <= COLS - w; x++) {
                    if (isAreaFree(x, y, w, h) && isAdjacentToPlayer({x,y,w,h,owner:null}, player)) {
                        moves.push({ x, y, w, h, isCaptureRect: false, rectRef: null });
                    }
                }
            }
            for (let rect of rectangles) {
                if (rect.owner === player) continue;
                if (isValidSize(rect.w, rect.h, diceA, diceB) && isAdjacentToPlayer(rect, player)) {
                    moves.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, isCaptureRect: true, rectRef: rect });
                }
            }
        }
        return moves;
    }
    function redistributeTerritory(eliminatedPlayer, killerPlayer) {
        const originalTerritories = {};
        for (let p of activePlayers) {
            if (p === eliminatedPlayer) continue;
            originalTerritories[p] = rectangles.filter(r => r.owner === p);
        }
        const eliminatedStart = START_CELLS[eliminatedPlayer];
        const startPositions = {};
        for (let p of activePlayers) {
            if (p !== eliminatedPlayer && START_CELLS[p]) {
                startPositions[p] = START_CELLS[p];
            }
        }
        const eliminatedRects = rectangles.filter(r => r.owner === eliminatedPlayer);
        for (let rect of eliminatedRects) {
            const adjacentPlayers = [];
            for (let p of Object.keys(originalTerritories)) {
                const playerId = parseInt(p, 10);
                const hasAdjacent = originalTerritories[playerId].some(territory => areAdjacentByEdge(rect, territory));
                if (hasAdjacent) adjacentPlayers.push(playerId);
            }
            if (adjacentPlayers.length === 0) {
                rect.owner = null;
            } else if (adjacentPlayers.includes(killerPlayer)) {
                rect.owner = killerPlayer;
            } else {
                let bestPlayer = null;
                let bestDistance = Infinity;
                for (let p of adjacentPlayers) {
                    const start = startPositions[p];
                    if (!start) continue;
                    const dx = start.x - eliminatedStart.x;
                    const dy = start.y - eliminatedStart.y;
                    const dist = dx * dx + dy * dy;
                    if (dist < bestDistance) {
                        bestDistance = dist;
                        bestPlayer = p;
                    } else if (dist === bestDistance && bestPlayer !== null && p < bestPlayer) {
                        bestPlayer = p;
                    }
                }
                rect.owner = bestPlayer !== null ? bestPlayer : adjacentPlayers[0];
            }
        }
    }
    function eliminatePlayer(eliminated, killer) {
        if (!activePlayers.includes(eliminated)) return;
        eliminatedOrder.push(eliminated);
        activePlayers = activePlayers.filter(p => p !== eliminated);
        redistributeTerritory(eliminated, killer);
        trackElimination(eliminated, killer);
        updateUI(); drawBoard();
        if (activePlayers.length === 1) endGame('elimination');
    }
    function isFieldFullyOccupied() {
        const occupied = Array(ROWS).fill().map(() => Array(COLS).fill(false));
        for (let rect of rectangles) for (let i = rect.x; i < rect.x + rect.w; i++) for (let j = rect.y; j < rect.y + rect.h; j++) if (i>=0 && i<COLS && j>=0 && j<ROWS) occupied[j][i] = true;
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!occupied[y][x]) return false;
        return true;
    }
    function isTwoThirdsDominance() {
        const totalCells = COLS * ROWS;
        const scores = computeScores();
        for (let p of activePlayers) {
            if (scores[p] >= (2 / 3) * totalCells) return p;
        }
        return null;
    }
    function showGameResultsModal(rankings, reason, finalScores, totalTurns, gameTimeSeconds, neutralCount) {
        const winner = rankings[0];
        const winnerColor = PLAYER_COLORS[winner.player];
        const winnerBlockDiv = document.getElementById('resultWinnerBlock');
        winnerBlockDiv.style.borderLeftColor = winnerColor;
        winnerBlockDiv.innerHTML = `<div class="winner-name" style="color: ${winnerColor}">🏆 ${getPlayerName(winner.player)} 🏆</div><div class="winner-score">${isRussian ? "Счёт:" : "Score:"} ${finalScores[winner.player]}</div>`;
        const rankingsListDiv = document.getElementById('resultRankingsList');
        rankingsListDiv.innerHTML = `<div style="font-weight: bold; margin-bottom: 8px;">${isRussian ? "📊 Итоговые места:" : "📊 Final rankings:"}</div>`;
        for (let r of rankings) {
            const playerColor = PLAYER_COLORS[r.player];
            rankingsListDiv.innerHTML += `<div class="ranking-item"><span class="rank-place">${r.place} ${isRussian ? "место" : "place"}</span><span class="rank-name" style="color: ${playerColor}">${getPlayerName(r.player)}</span><span class="rank-score">${finalScores[r.player]} ${isRussian ? "очков" : "points"}</span></div>`;
        }
        const statsDiv = document.getElementById('resultStats');
        const minutes = Math.floor(gameTimeSeconds / 60);
        const seconds = gameTimeSeconds % 60;
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        statsDiv.innerHTML = `<div class="stat-card"><div class="stat-label">${isRussian ? "⏱️ Время игры" : "⏱️ Game time"}</div><div class="stat-value">${timeStr}</div></div><div class="stat-card"><div class="stat-label">${isRussian ? "🎲 Всего ходов" : "🎲 Total turns"}</div><div class="stat-value">${totalTurns}</div></div><div class="stat-card"><div class="stat-label">${isRussian ? "⚪ Нейтральных клеток" : "⚪ Neutral cells"}</div><div class="stat-value">${neutralCount}</div></div>`;
        resultModal.style.display = 'flex';
    }
    function closeResultModalFunc() { resultModal.style.display = 'none'; }
    function restartFromResultModal() { closeResultModalFunc(); newGame(); }
    function endGame(reason, winnerPlayer = null) {
        if (!gameActive) return;
        gameActive = false;
        stopTimer();
        clearPendingBot();
        const finalScores = computeScores();
        const neutralCount = getNeutralCellCount();
        const totalTurns = turnCounter;
        const gameTime = timerSeconds;
        let rankings = [];
        if (reason === 'dominance') {
            rankings.push({ player: winnerPlayer, place: 1 });
            let remaining = activePlayers.filter(p => p !== winnerPlayer);
            remaining.sort((a,b) => finalScores[b] - finalScores[a]);
            for (let i = 0; i < remaining.length; i++) rankings.push({ player: remaining[i], place: i+2 });
        } else if (reason === 'elimination') {
            const winner = activePlayers[0];
            rankings.push({ player: winner, place: 1 });
            for (let i = eliminatedOrder.length - 1; i >= 0; i--) rankings.push({ player: eliminatedOrder[i], place: eliminatedOrder.length - i + 1 });
        } else {
            let players = (PLAYER_COUNT === 2 ? [1,2] : [1,2,3,4]).filter(p => activePlayers.includes(p) || eliminatedOrder.includes(p));
            players.sort((a,b) => finalScores[b] - finalScores[a]);
            for (let i = 0; i < players.length; i++) rankings.push({ player: players[i], place: i+1 });
        }
        // Обновляем статистику ДО показа модалки
        try {
            trackGameEnd(reason, rankings[0].player);
        } catch(e) { /* ignore */ }
        showGameResultsModal(rankings, reason, finalScores, totalTurns, gameTime, neutralCount);
        updateUI(); drawBoard();
    }
    closeResultModal.addEventListener('click', closeResultModalFunc);
    resultCloseBtn.addEventListener('click', closeResultModalFunc);
    resultNewGameBtn.addEventListener('click', restartFromResultModal);
    window.addEventListener('click', (e) => { if (e.target === resultModal) closeResultModalFunc(); });

    function tryMakeMove(x, y, w, h) {
        if (!isValidSize(w, h, diceN, diceM)) { updateUI(); return false; }
        if(x < 0 || y < 0 || x+w > COLS || y+h > ROWS) { updateUI(); return false; }
        let success = false;
        let captureType = 'neutral';
        let capturedCells = 0;
        if(isAreaFree(x, y, w, h)) {
            if(isAdjacentToPlayer({ x, y, w, h, owner: null }, currentPlayer)) {
                rectangles.push({ owner: currentPlayer, x, y, w, h });
                success = true;
                captureType = 'neutral';
                capturedCells = w * h;
            }
            else { updateUI(); return false; }
        } else {
            const targetRect = getExactRectangle(x, y, w, h);
            if(targetRect && targetRect.owner !== currentPlayer) {
                if(isAdjacentToPlayer(targetRect, currentPlayer)) {
                    captureType = (targetRect.owner === null) ? 'neutral' : 'enemy';
                    targetRect.owner = currentPlayer;
                    success = true;
                    capturedCells = w * h;
                }
                else { updateUI(); return false; }
            } else if(targetRect && targetRect.owner === null) {
                if(isAdjacentToPlayer(targetRect, currentPlayer)) {
                    targetRect.owner = currentPlayer;
                    success = true;
                    captureType = 'neutral';
                    capturedCells = w * h;
                }
                else { updateUI(); return false; }
            } else { updateUI(); return false; }
        }
        if (success) {
            trackMove(capturedCells, captureType);
            const eliminated = coversStartCell(x, y, w, h, currentPlayer);
            if (eliminated !== null && activePlayers.includes(eliminated)) eliminatePlayer(eliminated, currentPlayer);
            return true;
        }
        return false;
    }
    function finishMove() {
        drawBoard();
        if (isFieldFullyOccupied() && gameActive) { endGame('full'); return; }
        const dominatingPlayer = isTwoThirdsDominance();
        if (dominatingPlayer !== null && gameActive) { endGame('dominance', dominatingPlayer); return; }
        if (isFieldFullyOccupied() && gameActive) { endGame('full'); return; }
        turnCounter++;
        updateUI();
        if (!gameActive) return;
        let next = (currentPlayer % 4) + 1;
        if (PLAYER_COUNT === 2) {
            next = currentPlayer === 1 ? 2 : 1;
        } else {
            while (!activePlayers.includes(next)) { next = (next % 4) + 1; if (next === currentPlayer) break; }
        }
        currentPlayer = next;
        waitingForRoll = true;
        placementActive = false;
        diceN = 0; diceM = 0;
        updateUI(); drawBoard();
        saveGameStateToLocalStorage();
        if ((botMode && botPlayers.includes(currentPlayer)) || simulationMode) maybeBotTurn();
    }
    function constrainShapePosition() {
        if (!currentShape) return;
        let maxX = COLS - currentShape.w;
        let maxY = ROWS - currentShape.h;
        currentShape.x = Math.min(Math.max(0, currentShape.x), maxX);
        currentShape.y = Math.min(Math.max(0, currentShape.y), maxY);
    }
    function moveShape(dx, dy) {
        if (!placementActive || waitingForRoll || simulationMode) return false;
        if (botMode && botPlayers.includes(currentPlayer)) return false;
        let newX = currentShape.x + dx;
        let newY = currentShape.y + dy;
        let maxX = COLS - currentShape.w;
        let maxY = ROWS - currentShape.h;
        newX = Math.min(Math.max(0, newX), maxX);
        newY = Math.min(Math.max(0, newY), maxY);
        if (newX !== currentShape.x || newY !== currentShape.y) {
            currentShape.x = newX;
            currentShape.y = newY;
            drawBoard();
            return true;
        }
        return false;
    }
    function clearPendingBot() {
        if (pendingBotTimeout) { clearTimeout(pendingBotTimeout); pendingBotTimeout = null; }
        isBotThinking = false;
    }
    async function botTurn() {
        const myGeneration = currentGameGeneration;
        if (!gameActive || isBotThinking) return;
        const isBot = (botMode && botPlayers.includes(currentPlayer)) || simulationMode;
        if (!isBot) return;
        isBotThinking = true;
        clearPendingBot();
        await new Promise(r => { pendingBotTimeout = setTimeout(r, 400); });
        pendingBotTimeout = null;
        if (!gameActive || myGeneration !== currentGameGeneration) { isBotThinking = false; return; }
        if (waitingForRoll) {
            diceN = Math.floor(Math.random() * 6) + 1;
            diceM = Math.floor(Math.random() * 6) + 1;
            waitingForRoll = false;
            placementActive = false;
            updateUI(); drawBoard();
            await new Promise(r => { pendingBotTimeout = setTimeout(r, 300); });
            pendingBotTimeout = null;
            if (!gameActive || myGeneration !== currentGameGeneration) { isBotThinking = false; return; }
        }
        const move = getBestMove(currentPlayer, diceN, diceM);
        if (move && tryMakeMove(move.x, move.y, move.w, move.h)) {
            updateUI(); drawBoard();
            await new Promise(r => { pendingBotTimeout = setTimeout(r, 500); });
            pendingBotTimeout = null;
            if (!gameActive || myGeneration !== currentGameGeneration) { isBotThinking = false; return; }
            finishMove();
        } else {
            updateUI(); await new Promise(r => { pendingBotTimeout = setTimeout(r, 500); });
            pendingBotTimeout = null;
            if (!gameActive || myGeneration !== currentGameGeneration) { isBotThinking = false; return; }
            skipTurn(true);
        }
        isBotThinking = false;
    }
    function maybeBotTurn() {
        if (!gameActive) return;
        const isBot = (botMode && botPlayers.includes(currentPlayer)) || simulationMode;
        if (isBot && !isBotThinking) {
            clearPendingBot();
            pendingBotTimeout = setTimeout(() => {
                if (gameActive && ((botMode && botPlayers.includes(currentPlayer)) || simulationMode) && !isBotThinking) botTurn();
                pendingBotTimeout = null;
            }, 50);
        }
    }
    function getBestMove(player, diceA, diceB) {
        const possibleSizes = [[diceA, diceB]]; if (diceA !== diceB) possibleSizes.push([diceB, diceA]);
        let bestMove = null, bestScore = -Infinity;
        for (let [w, h] of possibleSizes) {
            for (let y = 0; y <= ROWS - h; y++) for (let x = 0; x <= COLS - w; x++) if (isAreaFree(x, y, w, h) && isAdjacentToPlayer({x,y,w,h,owner:null}, player)) {
                let score = w * h; if (coversStartCell(x, y, w, h, player) && activePlayers.includes(coversStartCell(x,y,w,h,player))) score += 10000;
                if (score > bestScore) { bestScore = score; bestMove = { x, y, w, h }; }
            }
            for (let rect of rectangles) if (rect.owner !== player && rect.w === w && rect.h === h && isAdjacentToPlayer(rect, player)) {
                let score = rect.w * rect.h * (rect.owner ? 2 : 1.5);
                if (coversStartCell(rect.x, rect.y, rect.w, rect.h, player) && activePlayers.includes(coversStartCell(rect.x,rect.y,rect.w,rect.h,player))) score += 10000;
                if (score > bestScore) { bestScore = score; bestMove = { x: rect.x, y: rect.y, w: rect.w, h: rect.h }; }
            }
        }
        return bestMove;
    }
    function rollDice() {
        if(!gameActive) return;
        if (simulationMode) { updateUI(); return; }
        if (botMode && botPlayers.includes(currentPlayer)) { updateUI(); return; }
        if(!waitingForRoll) { updateUI(); return; }
        diceN = Math.floor(Math.random() * 6) + 1;
        diceM = Math.floor(Math.random() * 6) + 1;
        waitingForRoll = false;
        const moves = getAvailableMoves(currentPlayer, diceN, diceM);
        availableMoves = moves;
        const isDeadRoll = (moves.length === 0);
        trackRoll(diceN, diceM, isDeadRoll);
        if (moves.length === 0) {
            updateUI(); drawBoard();
            finishMove();
            return;
        }
        placementActive = true;
        currentShape = { x: 0, y: 0, w: diceN, h: diceM };
        let placed = false;
        for (let y = 0; y <= ROWS - currentShape.h && !placed; y++) {
            for (let x = 0; x <= COLS - currentShape.w; x++) {
                if (isAreaFree(x, y, currentShape.w, currentShape.h) && isAdjacentToPlayer({x,y,w:currentShape.w,h:currentShape.h,owner:null}, currentPlayer)) {
                    currentShape.x = x;
                    currentShape.y = y;
                    placed = true;
                    break;
                }
            }
        }
        if (!placed) { currentShape.x = 0; currentShape.y = 0; constrainShapePosition(); }
        updateUI(); drawBoard();
    }
    function rotateShape() {
        if (!placementActive || waitingForRoll || simulationMode) return;
        if (botMode && botPlayers.includes(currentPlayer)) return;
        let newW = currentShape.h;
        let newH = currentShape.w;
        let maxX = COLS - newW;
        let maxY = ROWS - newH;
        let newX = Math.min(currentShape.x, maxX);
        let newY = Math.min(currentShape.y, maxY);
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        currentShape.w = newW;
        currentShape.h = newH;
        currentShape.x = newX;
        currentShape.y = newY;
        constrainShapePosition();
        drawBoard();
    }
    function skipTurn(fromBot = false) {
        if (!gameActive) return;
        if (!fromBot) {
            if (simulationMode) return;
            if (botMode && botPlayers.includes(currentPlayer)) return;
        }
        finishMove();
    }
    function newGameWithConfirm() {
        if (!gameActive) { newGame(); return; }
        const title = isRussian ? "Новая игра" : "New game";
        const message = isRussian ? "Вы уверены, что хотите начать новую игру? Текущий прогресс будет потерян." : "Are you sure you want to start a new game? Current progress will be lost.";
        showConfirmDialog(title, message, () => newGame(), 'newGame');
    }
    function skipTurnWithConfirm() {
        if (!gameActive) return;
        if (simulationMode) return;
        if (botMode && botPlayers.includes(currentPlayer)) return;
        const title = isRussian ? "Пропустить ход" : "Skip turn";
        const message = isRussian ? "Вы уверены, что хотите пропустить ход?" : "Are you sure you want to skip your turn?";
        showConfirmDialog(title, message, () => skipTurn(false), 'skipTurn');
    }

    // ---------------------- Отрисовка ------------------
    function drawBoard() {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1;
        for (let row = 0; row <= ROWS; row++) { ctx.beginPath(); ctx.moveTo(0, row*CELL_SIZE); ctx.lineTo(CANVAS_W, row*CELL_SIZE); ctx.stroke(); }
        for (let col = 0; col <= COLS; col++) { ctx.beginPath(); ctx.moveTo(col*CELL_SIZE, 0); ctx.lineTo(col*CELL_SIZE, CANVAS_H); ctx.stroke(); }
        for(let rect of rectangles) {
            ctx.fillStyle = rect.owner === null ? NEUTRAL_COLOR : PLAYER_COLORS[rect.owner];
            ctx.fillRect(rect.x*CELL_SIZE, rect.y*CELL_SIZE, rect.w*CELL_SIZE, rect.h*CELL_SIZE);
            ctx.strokeStyle = RECT_BORDER;
            ctx.strokeRect(rect.x*CELL_SIZE, rect.y*CELL_SIZE, rect.w*CELL_SIZE, rect.h*CELL_SIZE);
            const area = rect.w * rect.h;
            const centerX = (rect.x + rect.w/2)*CELL_SIZE, centerY = (rect.y + rect.h/2)*CELL_SIZE;
            let fontSize = Math.min(CELL_SIZE-4, 18);
            if(CELL_SIZE < 16) fontSize = 10;
            ctx.font = `bold ${fontSize}px "Segoe UI"`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5; ctx.strokeText(area.toString(), centerX, centerY);
            ctx.fillStyle = '#FFF'; ctx.fillText(area.toString(), centerX, centerY);
        }
        const isHumanTurn = !simulationMode && gameActive && !(botMode && botPlayers.includes(currentPlayer));
        if (isHumanTurn && !waitingForRoll && availableMoves.length > 0 && showAvailableHighlight) {
            for (let move of availableMoves) {
                const { x, y, w, h, isCaptureRect } = move;
                if (!isCaptureRect) {
                    ctx.fillStyle = AVAILABLE_HIGHLIGHT;
                    ctx.fillRect(x*CELL_SIZE, y*CELL_SIZE, w*CELL_SIZE, h*CELL_SIZE);
                } else {
                    ctx.strokeStyle = AVAILABLE_BORDER;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(x*CELL_SIZE, y*CELL_SIZE, w*CELL_SIZE, h*CELL_SIZE);
                    ctx.lineWidth = 1;
                }
            }
        }
        if (!simulationMode && gameActive && placementActive && !waitingForRoll && currentShape && currentShape.w > 0 && currentShape.h > 0) {
            const killed = coversStartCell(currentShape.x, currentShape.y, currentShape.w, currentShape.h, currentPlayer);
            let ghostColor = PREDEFINED_GHOST_STYLE;
            if (killed !== null && activePlayers.includes(killed)) {
                ghostColor = KILL_GHOST_STYLE;
                const centerX = (currentShape.x + currentShape.w/2) * CELL_SIZE;
                const centerY = (currentShape.y + currentShape.h/2) * CELL_SIZE;
                let skullSize = Math.min(CELL_SIZE * Math.min(currentShape.w, currentShape.h) * 0.6, 40);
                ctx.font = `bold ${skullSize}px "Segoe UI"`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#ffffff";
                ctx.fillText("💀", centerX, centerY);
            }
            ctx.fillStyle = ghostColor;
            ctx.fillRect(currentShape.x*CELL_SIZE, currentShape.y*CELL_SIZE, currentShape.w*CELL_SIZE, currentShape.h*CELL_SIZE);
            ctx.strokeStyle = killed ? '#ff0000' : '#00ffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(currentShape.x*CELL_SIZE, currentShape.y*CELL_SIZE, currentShape.w*CELL_SIZE, currentShape.h*CELL_SIZE);
        }
    }

    // ---------------------- Обработчики мыши/тач ------------------
    function startLongPress(e) {
        if (!placementActive || waitingForRoll) return;
        if (simulationMode) return;
        if (botMode && botPlayers.includes(currentPlayer)) return;
        isLongPress = false;
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            rotateShape();
            e.preventDefault();
        }, 500);
    }
    function cancelLongPress() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }
    function handleTouchStart(e) {
        e.preventDefault();
        cancelLongPress();
        const rectCanvas = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rectCanvas.width;
        const scaleY = canvas.height / rectCanvas.height;
        const touch = e.touches[0];
        let cellX = Math.floor((touch.clientX - rectCanvas.left) * scaleX / CELL_SIZE);
        let cellY = Math.floor((touch.clientY - rectCanvas.top) * scaleY / CELL_SIZE);
        cellX = Math.min(Math.max(0, cellX), COLS - 1);
        cellY = Math.min(Math.max(0, cellY), ROWS - 1);
        touchStartX = cellX;
        touchStartY = cellY;
        touchMoved = false;
        startLongPress(e);
    }
    function handleTouchMove(e) {
        e.preventDefault();
        if (longPressTimer) {
            cancelLongPress();
        }
        if (!placementActive || waitingForRoll) return;
        const rectCanvas = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rectCanvas.width;
        const scaleY = canvas.height / rectCanvas.height;
        const touch = e.touches[0];
        let cellX = Math.floor((touch.clientX - rectCanvas.left) * scaleX / CELL_SIZE);
        let cellY = Math.floor((touch.clientY - rectCanvas.top) * scaleY / CELL_SIZE);
        cellX = Math.min(Math.max(0, cellX), COLS - 1);
        cellY = Math.min(Math.max(0, cellY), ROWS - 1);
        if (Math.abs(cellX - touchStartX) > 0 || Math.abs(cellY - touchStartY) > 0) touchMoved = true;
        let newX = cellX;
        let newY = cellY;
        let maxX = COLS - currentShape.w;
        let maxY = ROWS - currentShape.h;
        newX = Math.min(Math.max(0, newX), maxX);
        newY = Math.min(Math.max(0, newY), maxY);
        if (currentShape.x !== newX || currentShape.y !== newY) {
            currentShape.x = newX;
            currentShape.y = newY;
            drawBoard();
        }
    }
    function handleTouchEnd(e) {
        e.preventDefault();
        cancelLongPress();
        if (!gameActive) return;
        if (simulationMode) return;
        if (botMode && botPlayers.includes(currentPlayer)) return;
        if (waitingForRoll) {
            rollDice();
            return;
        }
        if (placementActive && !isLongPress) {
            if (!touchMoved) {
                if (tryMakeMove(currentShape.x, currentShape.y, currentShape.w, currentShape.h)) {
                    placementActive = false;
                    drawBoard();
                    finishMove();
                } else {
                    updateUI();
                    drawBoard();
                }
            }
        }
        touchMoved = false;
        isLongPress = false;
    }
    function handleMouseMove(e) {
        if (simulationMode) return;
        const rectCanvas = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rectCanvas.width;
        const scaleY = canvas.height / rectCanvas.height;
        let cellX = Math.floor((e.clientX - rectCanvas.left) * scaleX / CELL_SIZE);
        let cellY = Math.floor((e.clientY - rectCanvas.top) * scaleY / CELL_SIZE);
        cellX = Math.min(Math.max(0, cellX), COLS - 1);
        cellY = Math.min(Math.max(0, cellY), ROWS - 1);
        if (!placementActive || waitingForRoll) return;
        let newX = cellX;
        let newY = cellY;
        let maxX = COLS - currentShape.w;
        let maxY = ROWS - currentShape.h;
        newX = Math.min(Math.max(0, newX), maxX);
        newY = Math.min(Math.max(0, newY), maxY);
        if (currentShape.x !== newX || currentShape.y !== newY) {
            currentShape.x = newX;
            currentShape.y = newY;
            drawBoard();
        }
    }
    function handleCanvasClick(e) {
        if(!gameActive) return;
        if (simulationMode) return;
        if (botMode && botPlayers.includes(currentPlayer)) return;
        if(waitingForRoll) { rollDice(); return; }
        if (!placementActive) return;
        if (tryMakeMove(currentShape.x, currentShape.y, currentShape.w, currentShape.h)) {
            placementActive = false;
            drawBoard();
            finishMove();
        } else {
            updateUI();
            drawBoard();
        }
    }
    function handleCanvasContextMenu(e) {
        e.preventDefault();
        if (!gameActive) return;
        if (simulationMode) return;
        if (botMode && botPlayers.includes(currentPlayer)) return;
        if (placementActive && !waitingForRoll) {
            rotateShape();
        }
    }

    // ---------------------- Цветовые режимы и настройки ------------------
    function setColorPaletteForMode(mode) {
        PLAYER_COLORS = { ...BASE_PLAYER_COLORS };
        if (mode === 'protanopia' || mode === 'deuteranopia') PLAYER_COLORS[4] = '#c154c1';
    }
    function applyColorBlindMode(mode) {
        setColorPaletteForMode(mode);
        document.body.style.filter = 'none';
    }
    function updateGlobalFromDOM() {
        let newCols = COLS, newRows = ROWS;
        const newStartSize = parseInt(startSizeSlider.value, 10);
        const newPlayerCount = getSelectedPlayerCount();
        const newSimulationMode = simulationToggle.checked;
        const minFieldDim = 2 * newStartSize + 6;
        if (radioCustom.checked) {
            let colsVal = parseInt(customCols.value, 10);
            let rowsVal = parseInt(customRows.value, 10);
            if (isNaN(colsVal)) colsVal = Math.max(minFieldDim, 39);
            if (isNaN(rowsVal)) rowsVal = Math.max(minFieldDim, 28);
            colsVal = Math.min(58, Math.max(minFieldDim, colsVal));
            rowsVal = Math.min(31, Math.max(minFieldDim, rowsVal));
            newCols = colsVal;
            newRows = rowsVal;
        } else {
            newCols = Math.max(minFieldDim, 39);
            newRows = Math.max(minFieldDim, 28);
        }
        const newBotMode = botsToggle.checked;
        COLS = newCols;
        ROWS = newRows;
        START_SIZE = newStartSize;
        PLAYER_COUNT = newPlayerCount;
        simulationMode = newSimulationMode;
        showAvailableHighlight = highlightToggle.checked;
        if (simulationMode) {
            botMode = true;
            if (PLAYER_COUNT === 2) botPlayers = [1,2];
            else botPlayers = [1,2,3,4];
            botsToggle.disabled = true;
        } else {
            botMode = newBotMode;
            if (PLAYER_COUNT === 2) botPlayers = botMode ? [2] : [];
            else botPlayers = botMode ? [2,3,4] : [];
            botsToggle.disabled = false;
        }
        updateBotStatusText();
        const colorMode = getSelectedColorMode();
        applyColorBlindMode(colorMode);
        updateCanvasSize();
        updateStartCells();
    }
    function getSelectedPlayerCount() {
        for (let radio of playerCountRadios) if (radio.checked) return parseInt(radio.value, 10);
        return 4;
    }
    function applySettingsAndRestart() {
        updateGlobalFromDOM();
        stopTimer();
        clearPendingBot();
        newGame();
        saveGameStateToLocalStorage();
        settingsModal.style.display = "none";
    }
    function openModal() { highlightToggle.checked = showAvailableHighlight; settingsModal.style.display = "flex"; updateMinFieldSizeWarning(); }
    function closeModal() { settingsModal.style.display = "none"; }
    radioStandard.addEventListener('change', () => customSizeInputs.style.display = radioCustom.checked ? 'flex' : 'none');
    radioCustom.addEventListener('change', () => customSizeInputs.style.display = radioCustom.checked ? 'flex' : 'none');
    settingsIcon.addEventListener('click', openModal);
    closeModalSpan.addEventListener('click', closeModal);
    cancelSettingsBtn.addEventListener('click', closeModal);
    applySettingsBtn.addEventListener('click', applySettingsAndRestart);
    window.addEventListener('click', (e) => { if (e.target === settingsModal) closeModal(); });
    customSizeInputs.style.display = 'none';
    customCols.addEventListener('input', updateMinFieldSizeWarning);
    customRows.addEventListener('input', updateMinFieldSizeWarning);
    function openHelpModal() { helpModal.style.display = 'flex'; }
    function closeHelpModal() { helpModal.style.display = 'none'; }
    helpButton.addEventListener('click', openHelpModal);
    closeHelpSpan.addEventListener('click', closeHelpModal);
    closeHelpBtn.addEventListener('click', closeHelpModal);
    window.addEventListener('click', (e) => { if (e.target === helpModal) closeHelpModal(); });

    // ---------------------- Новая игра ------------------
    function newGame() {
        stopTimer();
        clearPendingBot();
        gameGeneration++;
        currentGameGeneration = gameGeneration;
        timerSeconds = 0;
        updateTimerDisplay();
        rectangles = [];
        const positions = PLAYER_COUNT === 2 ? [1,2] : [1,2,3,4];
        for (let p of positions) {
            const pos = START_CELLS[p];
            if (pos) rectangles.push({ owner: p, x: pos.x, y: pos.y, w: START_SIZE, h: START_SIZE });
        }
        currentPlayer = 1;
        waitingForRoll = true;
        placementActive = false;
        diceN = 0; diceM = 0;
        turnCounter = 0;
        activePlayers = [...positions];
        eliminatedOrder = [];
        gameActive = true;
        availableMoves = [];

        // Сбрасываем per-game tracking
        currentGameTracking = {
            eliminationsByMe: 0,
            startPlayerCount: PLAYER_COUNT,
            startStartSize: START_SIZE,
            fieldSizeKey: `${COLS}x${ROWS}`,
            colorMode: getSelectedColorMode(),
            countedAsFinished: false
        };
        _consecutiveDeadRolls = 0;
        _consecutiveDoubles = 0;

        updateUI();
        drawBoard();
        startTimer();
        if (simulationMode || (botMode && botPlayers.includes(currentPlayer))) {
            maybeBotTurn();
        }
        saveGameStateToLocalStorage();
    }

    function switchLanguage() {
        const wasSettingsOpen = settingsModal.style.display === 'flex';
        const wasHelpOpen = helpModal.style.display === 'flex';
        const wasConfirmOpen = confirmModal.style.display === 'flex';
        if (wasConfirmOpen) {
            localStorage.setItem('wasConfirmOpen', 'true');
            localStorage.setItem('confirmActionType', pendingConfirmActionType);
        } else {
            localStorage.removeItem('wasConfirmOpen');
            localStorage.removeItem('confirmActionType');
        }
        saveGameStateToLocalStorage();
        localStorage.setItem('wasSettingsOpen', wasSettingsOpen);
        localStorage.setItem('wasHelpOpen', wasHelpOpen);
        window.location.href = isRussian ? 'index.html' : 'index-ru.html';
    }
    if (langButton) langButton.addEventListener('click', switchLanguage);
    if (mobileLangBtn) mobileLangBtn.addEventListener('click', switchLanguage);

    // ---------------------- Мобильная панель ------------------
    function openDrawer() { mobileDrawer.classList.add('open'); drawerOverlay.classList.add('open'); }
    function closeDrawer() { mobileDrawer.classList.remove('open'); drawerOverlay.classList.remove('open'); }
    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openDrawer);
    if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);
    if(mobileRollBtn) mobileRollBtn.addEventListener('click', rollDice);
    if(mobileSkipBtn) mobileSkipBtn.addEventListener('click', skipTurnWithConfirm);
    if(mobileNewGameBtn) mobileNewGameBtn.addEventListener('click', newGameWithConfirm);
    if(mobileSettingsBtn) mobileSettingsBtn.addEventListener('click', () => { closeDrawer(); openModal(); });
    if(mobileHelpBtn) mobileHelpBtn.addEventListener('click', () => { closeDrawer(); openHelpModal(); });

    // ---------------------- Инициализация и ресайз ------------------
    function handleResize() {
        updateCanvasSize();
        if(currentShape && placementActive) constrainShapePosition();
        drawBoard();
    }
    window.addEventListener('resize', handleResize);

    function init() {
        if (isMobileDevice()) {
            document.body.classList.add('mobile-device');
        } else {
            document.body.classList.remove('mobile-device');
        }

        // Загружаем статистику игрока
        loadStats();

        const loaded = loadGameStateFromLocalStorage();
        if (!loaded) updateGlobalFromDOM();
        else updateGlobalFromDOM();
        const wasSettingsOpenSaved = localStorage.getItem('wasSettingsOpen');
        const wasHelpOpenSaved = localStorage.getItem('wasHelpOpen');
        if (wasSettingsOpenSaved === 'true') { setTimeout(() => openModal(), 100); localStorage.removeItem('wasSettingsOpen'); }
        if (wasHelpOpenSaved === 'true') { setTimeout(() => openHelpModal(), 150); localStorage.removeItem('wasHelpOpen'); }
        const wasConfirmOpen = localStorage.getItem('wasConfirmOpen') === 'true';
        if (wasConfirmOpen) {
            const actionType = localStorage.getItem('confirmActionType');
            setTimeout(() => {
                if (actionType === 'newGame') newGameWithConfirm();
                else if (actionType === 'skipTurn') skipTurnWithConfirm();
            }, 300);
            localStorage.removeItem('wasConfirmOpen');
            localStorage.removeItem('confirmActionType');
        }
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', () => drawBoard());
        canvas.addEventListener('contextmenu', handleCanvasContextMenu);
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);
        rollBtn.addEventListener('click', rollDice);
        resetBtnLeft.addEventListener('click', newGameWithConfirm);
        skipBtn.addEventListener('click', skipTurnWithConfirm);
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyL') { e.preventDefault(); switchLanguage(); return; }
            if (confirmModal.style.display === 'flex') {
                if (e.code === 'Enter') { e.preventDefault(); if (pendingConfirmAction) pendingConfirmAction(); closeConfirmDialog(); }
                else if (e.code === 'Escape') { e.preventDefault(); closeConfirmDialog(); }
                return;
            }
            // Progress modal: навигация по вкладкам и закрытие
            if (progressModal.style.display === 'flex') {
                if (e.code === 'Escape') { e.preventDefault(); closeProgressModal(); return; }
                if (e.code === 'ArrowLeft') { e.preventDefault(); currentProgressTab = 'stats'; renderProgressModal(); if (progressBody) progressBody.scrollTop = 0; return; }
                if (e.code === 'ArrowRight') { e.preventDefault(); currentProgressTab = 'achievements'; renderProgressModal(); if (progressBody) progressBody.scrollTop = 0; return; }
                if (e.code === 'ArrowDown') { e.preventDefault(); if (progressBody) progressBody.scrollTop += 60; return; }
                if (e.code === 'ArrowUp') { e.preventDefault(); if (progressBody) progressBody.scrollTop -= 60; return; }
                // Блокируем остальные игровые клавиши, пока открыт прогресс
                return;
            }
            if (simulationMode) return;
            // Горячая клавиша C — открыть окно прогресса
            if (e.code === 'KeyC') {
                e.preventDefault();
                if (progressModal.style.display === 'flex') closeProgressModal();
                else openProgressModal('stats');
                return;
            }
            if (e.code === 'KeyN') { e.preventDefault(); newGameWithConfirm(); return; }
            if (e.code === 'Enter' && gameActive) {
                if (waitingForRoll && !(botMode && botPlayers.includes(currentPlayer))) { rollDice(); e.preventDefault(); return; }
                if (placementActive && !waitingForRoll && !(botMode && botPlayers.includes(currentPlayer))) {
                    e.preventDefault();
                    if (tryMakeMove(currentShape.x, currentShape.y, currentShape.w, currentShape.h)) {
                        placementActive = false; drawBoard(); finishMove();
                    } else { updateUI(); drawBoard(); }
                    return;
                }
            }
            if (e.code === 'KeyR' && placementActive && !waitingForRoll && !(botMode && botPlayers.includes(currentPlayer)) && gameActive) {
                e.preventDefault(); rotateShape(); return;
            }
            if (placementActive && !waitingForRoll && gameActive && !(botMode && botPlayers.includes(currentPlayer))) {
                let dx = 0, dy = 0;
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') dx = -1;
                else if (e.code === 'ArrowRight' || e.code === 'KeyD') dx = 1;
                else if (e.code === 'ArrowUp' || e.code === 'KeyW') dy = -1;
                else if (e.code === 'ArrowDown' || e.code === 'KeyS') dy = 1;
                if (dx !== 0 || dy !== 0) { e.preventDefault(); moveShape(dx, dy); return; }
            }
            if (e.code === 'KeyP' && gameActive && !simulationMode && !(botMode && botPlayers.includes(currentPlayer))) {
                e.preventDefault(); skipTurnWithConfirm(); return;
            }
            if (e.code === 'Escape') {
                e.preventDefault();
                if (settingsModal.style.display === 'flex') closeModal();
                else if (helpModal.style.display === 'flex') closeHelpModal();
                else openModal();
                return;
            }
            if (e.code === 'KeyQ') {
                e.preventDefault();
                if (helpModal.style.display === 'flex') closeHelpModal();
                else openHelpModal();
                return;
            }
        });
        if (!loaded) newGame();
        else {
            if (gameActive && !timerInterval) startTimer();
            drawBoard(); updateUI();
            if ((botMode && botPlayers.includes(currentPlayer)) || simulationMode) maybeBotTurn();
        }
    }
    init();
})();
