(function(){
    // ---------- ПАРАМЕТРЫ ПОЛЯ ----------
    let COLS = 39;
    let ROWS = 28;
    const CELL_SIZE = 20;
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
    const GHOST_STYLE = 'rgba(255, 255, 200, 0.4)';

    let rectangles = [];
    let currentPlayer = 1;
    let diceN = 0, diceM = 0;
    let waitingForRoll = true;
    let selectionMode = false;
    let firstCorner = null;
    let currentMsg = "Бросьте кубики, чтобы начать ход";

    let turnCounter = 0;
    let activePlayers = [1,2,3,4];
    let eliminatedOrder = [];
    let gameActive = true;

    let timerSeconds = 0;
    let timerInterval = null;

    let botMode = true;
    let botPlayers = [2, 3, 4];
    let isBotThinking = false;

    let START_CELLS = {};

    function updateStartCells() {
        START_CELLS = {
            1: { x: 0, y: 0 },
            2: { x: COLS-2, y: 0 },
            3: { x: 0, y: ROWS-2 },
            4: { x: COLS-2, y: ROWS-2 }
        };
    }

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const turnText = document.getElementById('turnText');
    const diceDisplay = document.getElementById('diceDisplay');
    const msgArea = document.getElementById('msgArea');
    const rollBtn = document.getElementById('rollBtn');
    const skipBtn = document.getElementById('skipBtn');
    const resetBtnLeft = document.getElementById('resetBtnLeft');
    const sideScorePanel = document.getElementById('sideScorePanel');
    const turnCountDisplay = document.getElementById('turnCountDisplay');
    const timerDisplay = document.getElementById('timerDisplay');
    const fieldSizeLabel = document.getElementById('fieldSizeLabel');
    const botsLabel = document.getElementById('botsLabel');

    // Элементы настроек
    const settingsIcon = document.getElementById('settingsIcon');
    const settingsModal = document.getElementById('settingsModal');
    const closeModalSpan = document.querySelector('.close-modal');
    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    const applySettingsBtn = document.getElementById('applySettingsBtn');
    const botsToggle = document.getElementById('botsToggle');
    const customSizeInputs = document.getElementById('customSizeInputs');
    const customCols = document.getElementById('customCols');
    const customRows = document.getElementById('customRows');
    const radioStandard = document.querySelector('input[value="standard"]');
    const radioCustom = document.querySelector('input[value="custom"]');
    const colorModeRadios = document.querySelectorAll('input[name="colorMode"]');

    function getSelectedColorMode() {
        for (let radio of colorModeRadios) {
            if (radio.checked) return radio.value;
        }
        return 'normal';
    }

    function updateCanvasSize() {
        CANVAS_W = COLS * CELL_SIZE;
        CANVAS_H = ROWS * CELL_SIZE;
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
    }

    function getPlayerName(player) {
        return `Игрок ${player}`;
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay() { timerDisplay.textContent = formatTime(timerSeconds); }
    function startTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = setInterval(() => { if (gameActive) { timerSeconds++; updateTimerDisplay(); } }, 1000); }
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
        let html = '';
        for(let p = 1; p <= 4; p++) {
            const color = PLAYER_COLORS[p];
            const name = getPlayerName(p);
            const score = scores[p];
            const isEliminated = !activePlayers.includes(p);
            html += `<div class="player-score-card" style="border-left-color: ${color}">
                        <div class="player-color-badge" style="background: ${color}"></div>
                        <div class="player-score-info">
                            <div class="player-name">${name}${isEliminated ? ' (выбыл)' : ''}</div>
                            <div class="player-score">${score}</div>
                        </div>
                    </div>`;
        }
        html += `<div class="neutral-score-card"><div class="neutral-badge"></div><div class="neutral-info"><div class="neutral-name">Нейтральные</div><div class="neutral-score">${neutralCells}</div></div></div>`;
        sideScorePanel.innerHTML = html;
    }

    function updateUI() {
        turnText.innerHTML = `${getPlayerName(currentPlayer)} (ход)`;
        turnText.style.backgroundColor = PLAYER_COLORS[currentPlayer];
        if(diceN && diceM && !waitingForRoll) diceDisplay.innerHTML = `🎲 ${diceN}  ·  ${diceM} 🎲`;
        else diceDisplay.innerHTML = `🎲  ?  ?  🎲`;
        msgArea.innerText = currentMsg;
        updateSideScores();
        turnCountDisplay.innerText = turnCounter;
    }

    // --- Геометрические и игровые функции (без изменений) ---
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

    function redistributeTerritory(eliminatedPlayer, killerPlayer) {
        const alivePlayers = activePlayers.filter(p => p !== eliminatedPlayer);
        const eliminatedRects = rectangles.filter(r => r.owner === eliminatedPlayer);
        for (let rect of eliminatedRects) {
            const adjacentTo = alivePlayers.filter(p => isAdjacentToPlayer(rect, p));
            if (adjacentTo.length === 0) rect.owner = null;
            else if (adjacentTo.includes(killerPlayer)) rect.owner = killerPlayer;
            else rect.owner = adjacentTo[0];
        }
    }

    function eliminatePlayer(eliminated, killer) {
        if (!activePlayers.includes(eliminated)) return;
        eliminatedOrder.push(eliminated);
        activePlayers = activePlayers.filter(p => p !== eliminated);
        redistributeTerritory(eliminated, killer);
        currentMsg = `💀 ${getPlayerName(eliminated)} выбыл! Его территория перераспределена.`;
        updateUI(); drawBoard();
        if (activePlayers.length === 1) endGame('elimination');
    }

    function isFieldFullyOccupied() {
        const occupied = Array(ROWS).fill().map(() => Array(COLS).fill(false));
        for (let rect of rectangles) for (let i = rect.x; i < rect.x + rect.w; i++) for (let j = rect.y; j < rect.y + rect.h; j++) if (i>=0 && i<COLS && j>=0 && j<ROWS) occupied[j][i] = true;
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!occupied[y][x]) return false;
        return true;
    }

    function endGame(reason) {
        if (!gameActive) return;
        gameActive = false;
        stopTimer();
        rollBtn.disabled = true;
        skipBtn.disabled = true;
        let rankings = [];
        if (reason === 'elimination') {
            const winner = activePlayers[0];
            rankings.push({ player: winner, place: 1 });
            for (let i = eliminatedOrder.length - 1; i >= 0; i--) rankings.push({ player: eliminatedOrder[i], place: eliminatedOrder.length - i + 1 });
        } else {
            const scores = computeScores();
            let players = [1,2,3,4].filter(p => activePlayers.includes(p) || eliminatedOrder.includes(p));
            players.sort((a,b) => scores[b] - scores[a]);
            for (let i = 0; i < players.length; i++) rankings.push({ player: players[i], place: i+1 });
        }
        let message = "🏁 ИГРА ОКОНЧЕНА 🏁\n";
        for (let r of rankings) message += `${r.place} место: ${getPlayerName(r.player)}\n`;
        currentMsg = message;
        updateUI();
        alert(message);
    }

    function tryMakeMove(x, y, w, h) {
        if (!isValidSize(w, h, diceN, diceM)) { currentMsg = `❌ Ошибка: нужен прямоугольник ${diceN}×${diceM}`; updateUI(); return false; }
        if(x < 0 || y < 0 || x+w > COLS || y+h > ROWS) { currentMsg = "❌ Прямоугольник выходит за границы поля"; updateUI(); return false; }
        let success = false;
        if(isAreaFree(x, y, w, h)) {
            if(isAdjacentToPlayer({ x, y, w, h, owner: null }, currentPlayer)) { rectangles.push({ owner: currentPlayer, x, y, w, h }); currentMsg = `✅ Расширение: занята область ${w}×${h}`; success = true; }
            else { currentMsg = "❌ Расширение: прямоугольник не прилегает к вашей территории"; updateUI(); return false; }
        } else {
            const targetRect = getExactRectangle(x, y, w, h);
            if(targetRect && targetRect.owner !== currentPlayer) {
                if(isAdjacentToPlayer(targetRect, currentPlayer)) { const oldOwner = targetRect.owner; targetRect.owner = currentPlayer; currentMsg = `⚔️ ЗАХВАТ! Отобран прямоугольник у ${getPlayerName(oldOwner)}`; success = true; }
                else { currentMsg = "❌ Захват невозможен: вражеский прямоугольник не касается вашей территории"; updateUI(); return false; }
            } else if(targetRect && targetRect.owner === null) {
                if(isAdjacentToPlayer(targetRect, currentPlayer)) { targetRect.owner = currentPlayer; currentMsg = `🏴‍☠️ ЗАХВАТ НЕЙТРАЛЬНОЙ ТЕРРИТОРИИ!`; success = true; }
                else { currentMsg = "❌ Нейтральный прямоугольник не прилегает к вашей территории"; updateUI(); return false; }
            } else { currentMsg = "❌ Невозможно: область перекрыта или не совпадает с существующим прямоугольником."; updateUI(); return false; }
        }
        if (success) {
            const eliminated = coversStartCell(x, y, w, h, currentPlayer);
            if (eliminated !== null && activePlayers.includes(eliminated)) eliminatePlayer(eliminated, currentPlayer);
            return true;
        }
        return false;
    }

    function finishMove() {
        drawBoard();
        if (isFieldFullyOccupied() && gameActive) { endGame('full'); return; }
        turnCounter++;
        updateUI();
        if (!gameActive) return;
        let next = (currentPlayer % 4) + 1;
        while (!activePlayers.includes(next)) { next = (next % 4) + 1; if (next === currentPlayer) break; }
        currentPlayer = next;
        waitingForRoll = true; selectionMode = false; firstCorner = null; diceN = 0; diceM = 0;
        currentMsg = `${getPlayerName(currentPlayer)}, бросьте кубики`;
        updateUI(); drawBoard();
        if (botMode && botPlayers.includes(currentPlayer) && gameActive) setTimeout(() => maybeBotTurn(), 50);
    }

    // --- Боты ---
    async function botTurn() {
        if (!gameActive || isBotThinking || !botMode || !botPlayers.includes(currentPlayer)) return;
        isBotThinking = true;
        await new Promise(r => setTimeout(r, 400));
        if (!gameActive) { isBotThinking = false; return; }
        if (waitingForRoll) {
            diceN = Math.floor(Math.random() * 6) + 1;
            diceM = Math.floor(Math.random() * 6) + 1;
            waitingForRoll = false; selectionMode = true; firstCorner = null;
            currentMsg = `🎲 ${getPlayerName(currentPlayer)} (бот) выбросил ${diceN} и ${diceM}.`;
            updateUI(); drawBoard();
            await new Promise(r => setTimeout(r, 300));
        }
        const move = getBestMove(currentPlayer, diceN, diceM);
        if (move && tryMakeMove(move.x, move.y, move.w, move.h)) {
            currentMsg = `🤖 ${getPlayerName(currentPlayer)} (бот) сделал ход.`;
            updateUI(); drawBoard();
            await new Promise(r => setTimeout(r, 500));
            finishMove();
        } else {
            currentMsg = `🤖 ${getPlayerName(currentPlayer)} не может сходить, пропускает.`;
            updateUI(); await new Promise(r => setTimeout(r, 500));
            skipTurn();
        }
        isBotThinking = false;
    }
    function maybeBotTurn() { if (botMode && botPlayers.includes(currentPlayer) && gameActive && !isBotThinking) botTurn(); }

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
        if (botMode && botPlayers.includes(currentPlayer)) { currentMsg = "Сейчас ход бота..."; updateUI(); return; }
        if(!waitingForRoll) { currentMsg = "Вы уже бросили!"; updateUI(); return; }
        diceN = Math.floor(Math.random() * 6) + 1;
        diceM = Math.floor(Math.random() * 6) + 1;
        waitingForRoll = false; selectionMode = true; firstCorner = null;
        currentMsg = `🎲 Выпало ${diceN} и ${diceM}. Кликните на поле, чтобы выбрать прямоугольник.`;
        updateUI(); drawBoard();
    }

    function skipTurn() {
        if (!gameActive) return;
        currentMsg = "Ход пропущен";
        finishMove();
    }

    function drawBoard() {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.strokeStyle = GRID_COLOR;
        for (let row = 0; row <= ROWS; row++) { ctx.beginPath(); ctx.moveTo(0, row*CELL_SIZE); ctx.lineTo(CANVAS_W, row*CELL_SIZE); ctx.stroke(); }
        for (let col = 0; col <= COLS; col++) { ctx.beginPath(); ctx.moveTo(col*CELL_SIZE, 0); ctx.lineTo(col*CELL_SIZE, CANVAS_H); ctx.stroke(); }
        for(let rect of rectangles) {
            ctx.fillStyle = rect.owner === null ? NEUTRAL_COLOR : PLAYER_COLORS[rect.owner];
            ctx.fillRect(rect.x*CELL_SIZE, rect.y*CELL_SIZE, rect.w*CELL_SIZE, rect.h*CELL_SIZE);
            ctx.strokeStyle = RECT_BORDER; ctx.strokeRect(rect.x*CELL_SIZE, rect.y*CELL_SIZE, rect.w*CELL_SIZE, rect.h*CELL_SIZE);
            const area = rect.w * rect.h;
            const centerX = (rect.x + rect.w/2)*CELL_SIZE, centerY = (rect.y + rect.h/2)*CELL_SIZE;
            ctx.font = `bold ${Math.min(CELL_SIZE-4,18)}px "Segoe UI"`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5; ctx.strokeText(area.toString(), centerX, centerY);
            ctx.fillStyle = '#FFF'; ctx.fillText(area.toString(), centerX, centerY);
        }
        if(selectionMode && firstCorner) { ctx.fillStyle = 'rgba(255,255,100,0.6)'; ctx.fillRect(firstCorner.x*CELL_SIZE, firstCorner.y*CELL_SIZE, CELL_SIZE, CELL_SIZE); ctx.strokeStyle = 'gold'; ctx.strokeRect(firstCorner.x*CELL_SIZE, firstCorner.y*CELL_SIZE, CELL_SIZE, CELL_SIZE); }
    }

    let ghostX=-1,ghostY=-1;
    function onMouseMove(e) {
        if (!selectionMode || firstCorner === null) { ghostX=-1; return; }
        const rectCanvas = canvas.getBoundingClientRect();
        const scaleX = canvas.width/rectCanvas.width, scaleY = canvas.height/rectCanvas.height;
        let cellX = Math.floor((e.clientX - rectCanvas.left)*scaleX/CELL_SIZE), cellY = Math.floor((e.clientY - rectCanvas.top)*scaleY/CELL_SIZE);
        cellX = Math.min(Math.max(0,cellX), COLS-1); cellY = Math.min(Math.max(0,cellY), ROWS-1);
        ghostX=cellX; ghostY=cellY;
        drawBoard();
        let left = Math.min(firstCorner.x, ghostX), right = Math.max(firstCorner.x, ghostX), top = Math.min(firstCorner.y, ghostY), bottom = Math.max(firstCorner.y, ghostY);
        let width = right-left+1, height = bottom-top+1;
        let isValid = isValidSize(width, height, diceN, diceM);
        ctx.fillStyle = isValid ? GHOST_STYLE : 'rgba(255,80,80,0.3)';
        ctx.fillRect(left*CELL_SIZE, top*CELL_SIZE, width*CELL_SIZE, height*CELL_SIZE);
        ctx.strokeStyle = isValid ? '#ffff00' : '#ff0000';
        ctx.strokeRect(left*CELL_SIZE, top*CELL_SIZE, width*CELL_SIZE, height*CELL_SIZE);
    }

    function handleCanvasClick(e) {
        if(!gameActive) return;
        if (botMode && botPlayers.includes(currentPlayer)) { currentMsg = "Ход бота, подождите..."; updateUI(); return; }
        if(waitingForRoll) { currentMsg = "Сначала бросьте кубики!"; updateUI(); return; }
        if(!selectionMode) return;
        const rectCanvas = canvas.getBoundingClientRect();
        const scaleX = canvas.width/rectCanvas.width, scaleY = canvas.height/rectCanvas.height;
        let cellX = Math.floor((e.clientX - rectCanvas.left)*scaleX/CELL_SIZE), cellY = Math.floor((e.clientY - rectCanvas.top)*scaleY/CELL_SIZE);
        cellX = Math.min(Math.max(0,cellX), COLS-1); cellY = Math.min(Math.max(0,cellY), ROWS-1);
        if(firstCorner === null) { firstCorner = { x: cellX, y: cellY }; currentMsg = `Первый угол: (${cellX},${cellY}). Теперь выберите противоположный.`; updateUI(); drawBoard(); }
        else {
            let left = Math.min(firstCorner.x, cellX), right = Math.max(firstCorner.x, cellX), top = Math.min(firstCorner.y, cellY), bottom = Math.max(firstCorner.y, cellY);
            let width = right-left+1, height = bottom-top+1;
            if(tryMakeMove(left, top, width, height)) { drawBoard(); finishMove(); }
            else { firstCorner = null; updateUI(); drawBoard(); }
        }
    }

    // --- Управление цветами для дальтонизма ---
    function setColorPaletteForMode(mode) {
        PLAYER_COLORS = { ...BASE_PLAYER_COLORS };
        if (mode === 'protanopia' || mode === 'deuteranopia') {
            PLAYER_COLORS[4] = '#c154c1'; // пурпурный вместо жёлтого
        }
        // Для тританопии и normal оставляем жёлтый
    }

    function applyColorBlindMode(mode) {
        setColorPaletteForMode(mode);
        document.body.style.filter = 'none'; // убираем фильтры, меняем палитру
    }

    // --- Применение настроек и перезапуск ---
    function applySettingsAndRestart() {
        let newCols = COLS, newRows = ROWS;
        if (radioCustom.checked) {
            let colsVal = parseInt(customCols.value, 10);
            let rowsVal = parseInt(customRows.value, 10);
            if (isNaN(colsVal)) colsVal = 39;
            if (isNaN(rowsVal)) rowsVal = 28;
            colsVal = Math.min(100, Math.max(4, colsVal));
            rowsVal = Math.min(100, Math.max(4, rowsVal));
            newCols = colsVal;
            newRows = rowsVal;
        } else {
            newCols = 39;
            newRows = 28;
        }
        const newBotMode = botsToggle.checked;
        if (newCols !== COLS || newRows !== ROWS) {
            COLS = newCols;
            ROWS = newRows;
            updateCanvasSize();
            updateStartCells();
        }
        botMode = newBotMode;
        botPlayers = botMode ? [2,3,4] : [];
        
        const colorMode = getSelectedColorMode();
        applyColorBlindMode(colorMode);
        
        stopTimer();
        newGame();
        settingsModal.style.display = "none";
    }

    // --- Модальное окно ---
    function openModal() { settingsModal.style.display = "flex"; }
    function closeModal() { settingsModal.style.display = "none"; }
    radioStandard.addEventListener('change', () => customSizeInputs.style.display = radioCustom.checked ? 'flex' : 'none');
    radioCustom.addEventListener('change', () => customSizeInputs.style.display = radioCustom.checked ? 'flex' : 'none');
    settingsIcon.addEventListener('click', openModal);
    closeModalSpan.addEventListener('click', closeModal);
    cancelSettingsBtn.addEventListener('click', closeModal);
    applySettingsBtn.addEventListener('click', applySettingsAndRestart);
    window.addEventListener('click', (e) => { if (e.target === settingsModal) closeModal(); });
    customSizeInputs.style.display = 'none';

    function newGame() {
        stopTimer(); timerSeconds = 0; updateTimerDisplay();
        rectangles = [];
        rectangles.push({ owner: 1, x: 0, y: 0, w: 2, h: 2 });
        rectangles.push({ owner: 2, x: COLS-2, y: 0, w: 2, h: 2 });
        rectangles.push({ owner: 3, x: 0, y: ROWS-2, w: 2, h: 2 });
        rectangles.push({ owner: 4, x: COLS-2, y: ROWS-2, w: 2, h: 2 });
        currentPlayer = 1; waitingForRoll = true; selectionMode = false; firstCorner = null; diceN=0; diceM=0; turnCounter=0;
        activePlayers = [1,2,3,4]; eliminatedOrder = []; gameActive = true;
        currentMsg = "Новая игра! Бросьте кубики.";
        rollBtn.disabled = false; skipBtn.disabled = false;
        updateUI(); drawBoard();
        startTimer();
        fieldSizeLabel.innerText = (COLS===39 && ROWS===28) ? "Стандартное поле (39×28)" : `Кастомное поле (${COLS}×${ROWS})`;
        botsLabel.innerText = botMode ? "🤖 Игра с ботами" : "👤 Игра без ботов";
    }

    function init() {
        updateCanvasSize();
        updateStartCells();
        applyColorBlindMode('normal');
        newGame();
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseleave', () => { ghostX = -1; drawBoard(); });
        rollBtn.addEventListener('click', rollDice);
        skipBtn.addEventListener('click', skipTurn);
        resetBtnLeft.addEventListener('click', () => newGame());
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && gameActive && waitingForRoll && !(botMode && botPlayers.includes(currentPlayer))) rollDice();
            else if (e.key === 'Escape' && selectionMode && firstCorner && !(botMode && botPlayers.includes(currentPlayer))) { firstCorner = null; currentMsg = "Выбор отменён"; updateUI(); drawBoard(); }
            else if ((e.key === 's' || e.key === 'S') && gameActive && !(botMode && botPlayers.includes(currentPlayer))) skipTurn();
        });
    }
    init();
})();
