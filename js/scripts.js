(function(){
    let COLS = 39;
    let ROWS = 28;
    let START_SIZE = 2;
    let PLAYER_COUNT = 4;
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
    const PREDEFINED_GHOST_STYLE = 'rgba(100, 200, 255, 0.5)';
    const KILL_GHOST_STYLE = 'rgba(255, 80, 80, 0.6)';
    const AVAILABLE_HIGHLIGHT = 'rgba(50, 255, 50, 0.3)';
    const AVAILABLE_BORDER = '#00ff00';

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
    let simulationMode = false;

    let gameMode = 'predefined';

    let placementActive = false;
    let currentShape = { x: 0, y: 0, w: 0, h: 0 };

    let availableMoves = [];
    let killWarning = null;
    let showAvailableHighlight = true;  // НОВАЯ ПЕРЕМЕННАЯ

    let START_CELLS = {};

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
    const rotateHint = document.getElementById('rotateHint');

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
    const gameModeRadios = document.querySelectorAll('input[name="gameMode"]');
    const highlightToggle = document.getElementById('highlightToggle'); // НОВЫЙ ЭЛЕМЕНТ

    function updateControlUI() {
        const isSimulation = simulationMode;
        const isBotTurnNow = (botMode && botPlayers.includes(currentPlayer)) || simulationMode;
        const isHumanControllable = !isSimulation && gameActive && !isBotTurnNow;
        rollBtn.disabled = !isHumanControllable || waitingForRoll === false;
        skipBtn.disabled = !isHumanControllable;
        if (isSimulation) {
            rollBtn.style.opacity = '0.5';
            skipBtn.style.opacity = '0.5';
        } else {
            rollBtn.style.opacity = '1';
            skipBtn.style.opacity = '1';
        }
    }

    function getSelectedPlayerCount() {
        for (let radio of playerCountRadios) if (radio.checked) return parseInt(radio.value, 10);
        return 4;
    }

    function getSelectedColorMode() {
        for (let radio of colorModeRadios) if (radio.checked) return radio.value;
        return 'normal';
    }

    function getSelectedGameMode() {
        for (let radio of gameModeRadios) if (radio.checked) return radio.value;
        return 'predefined';
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
        const playersToShow = PLAYER_COUNT === 2 ? [1,2] : [1,2,3,4];
        for(let p of playersToShow) {
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
        updateControlUI();

        if (gameMode === 'predefined' && placementActive && !waitingForRoll && !simulationMode && !(botMode && botPlayers.includes(currentPlayer))) {
            rotateHint.style.display = 'inline-block';
        } else {
            rotateHint.style.display = 'none';
        }
    }

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

    const resultModal = document.getElementById('gameResultModal');
    const closeResultModal = document.querySelector('.close-result-modal');
    const resultNewGameBtn = document.getElementById('resultNewGameBtn');
    const resultCloseBtn = document.getElementById('resultCloseBtn');

    function showGameResultsModal(rankings, reason, finalScores, totalTurns, gameTimeSeconds, neutralCount) {
        const winner = rankings[0];
        const winnerColor = PLAYER_COLORS[winner.player];
        const winnerBlock = document.getElementById('resultWinnerBlock');
        winnerBlock.style.borderLeftColor = winnerColor;
        winnerBlock.innerHTML = `
            <div class="winner-name" style="color: ${winnerColor}">🏆 ${getPlayerName(winner.player)} 🏆</div>
            <div class="winner-score">Счёт: ${finalScores[winner.player]}</div>
        `;

        const rankingsList = document.getElementById('resultRankingsList');
        rankingsList.innerHTML = '<div style="font-weight: bold; margin-bottom: 8px;">📊 Итоговые места:</div>';
        for (let r of rankings) {
            const playerColor = PLAYER_COLORS[r.player];
            rankingsList.innerHTML += `
                <div class="ranking-item">
                    <span class="rank-place">${r.place} место</span>
                    <span class="rank-name" style="color: ${playerColor}">${getPlayerName(r.player)}</span>
                    <span class="rank-score">${finalScores[r.player]} очков</span>
                </div>
            `;
        }

        const statsDiv = document.getElementById('resultStats');
        const minutes = Math.floor(gameTimeSeconds / 60);
        const seconds = gameTimeSeconds % 60;
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        statsDiv.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">⏱️ Время игры</div>
                <div class="stat-value">${timeStr}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">🎲 Всего ходов</div>
                <div class="stat-value">${totalTurns}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">⚪ Нейтральных клеток</div>
                <div class="stat-value">${neutralCount}</div>
            </div>
        `;

        resultModal.style.display = 'flex';
    }

    function isTwoThirdsDominance() {
        const totalCells = COLS * ROWS;
        const scores = computeScores();
        for (let p of activePlayers) {
            if (scores[p] >= (2 / 3) * totalCells) {
                return p;
            }
        }
        return null;
    }

    function closeResultModalFunc() {
        resultModal.style.display = 'none';
    }

    function restartFromResultModal() {
        closeResultModalFunc();
        newGame();
    }

    function endGame(reason, winnerPlayer = null) {
        if (!gameActive) return;
        gameActive = false;
        stopTimer();
        const finalScores = computeScores();
        const neutralCount = getNeutralCellCount();
        const totalTurns = turnCounter;
        const gameTime = timerSeconds;

        let rankings = [];
        if (reason === 'dominance') {
            rankings.push({ player: winnerPlayer, place: 1 });
            let remaining = activePlayers.filter(p => p !== winnerPlayer);
            remaining.sort((a,b) => finalScores[b] - finalScores[a]);
            for (let i = 0; i < remaining.length; i++) {
                rankings.push({ player: remaining[i], place: i+2 });
            }
        } else if (reason === 'elimination') {
            const winner = activePlayers[0];
            rankings.push({ player: winner, place: 1 });
            for (let i = eliminatedOrder.length - 1; i >= 0; i--) {
                rankings.push({ player: eliminatedOrder[i], place: eliminatedOrder.length - i + 1 });
            }
        } else {
            let players = (PLAYER_COUNT === 2 ? [1,2] : [1,2,3,4]).filter(p => activePlayers.includes(p) || eliminatedOrder.includes(p));
            players.sort((a,b) => finalScores[b] - finalScores[a]);
            for (let i = 0; i < players.length; i++) {
                rankings.push({ player: players[i], place: i+1 });
            }
        }
        showGameResultsModal(rankings, reason, finalScores, totalTurns, gameTime, neutralCount);
        currentMsg = "Игра окончена. Результаты в окне.";
        updateUI();
        drawBoard();
    }

    closeResultModal.addEventListener('click', closeResultModalFunc);
    resultCloseBtn.addEventListener('click', closeResultModalFunc);
    resultNewGameBtn.addEventListener('click', restartFromResultModal);
    window.addEventListener('click', (e) => {
        if (e.target === resultModal) closeResultModalFunc();
    });

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
        const dominatingPlayer = isTwoThirdsDominance();
        if (dominatingPlayer !== null && gameActive) {
            endGame('dominance', dominatingPlayer);
            return;
        }
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
        selectionMode = false;
        firstCorner = null;
        placementActive = false;
        diceN = 0; diceM = 0;
        currentMsg = `${getPlayerName(currentPlayer)}, бросьте кубики`;
        updateUI(); drawBoard();
        if ((botMode && botPlayers.includes(currentPlayer)) || simulationMode) {
            setTimeout(() => maybeBotTurn(), 50);
        }
    }

    function constrainShapePosition() {
        if (!currentShape) return;
        let maxX = COLS - currentShape.w;
        let maxY = ROWS - currentShape.h;
        currentShape.x = Math.min(Math.max(0, currentShape.x), maxX);
        currentShape.y = Math.min(Math.max(0, currentShape.y), maxY);
    }

    async function botTurn() {
        if (!gameActive || isBotThinking) return;
        const isBot = (botMode && botPlayers.includes(currentPlayer)) || simulationMode;
        if (!isBot) return;
        isBotThinking = true;
        await new Promise(r => setTimeout(r, 400));
        if (!gameActive) { isBotThinking = false; return; }
        if (waitingForRoll) {
            diceN = Math.floor(Math.random() * 6) + 1;
            diceM = Math.floor(Math.random() * 6) + 1;
            waitingForRoll = false;
            selectionMode = false;
            firstCorner = null;
            placementActive = false;
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
            skipTurn(true);
        }
        isBotThinking = false;
    }

    function maybeBotTurn() {
        const isBot = (botMode && botPlayers.includes(currentPlayer)) || simulationMode;
        if (gameActive && isBot && !isBotThinking) botTurn();
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
        if (simulationMode) { currentMsg = "Режим симуляции: все игроки — боты. Вы не можете бросать кубики."; updateUI(); return; }
        if (botMode && botPlayers.includes(currentPlayer)) { currentMsg = "Сейчас ход бота..."; updateUI(); return; }
        if(!waitingForRoll) { currentMsg = "Вы уже бросили!"; updateUI(); return; }
        diceN = Math.floor(Math.random() * 6) + 1;
        diceM = Math.floor(Math.random() * 6) + 1;
        waitingForRoll = false;

        const moves = getAvailableMoves(currentPlayer, diceN, diceM);
        availableMoves = moves;

        if (moves.length === 0) {
            currentMsg = "❌ Нет доступных ходов, ход пропущен автоматически.";
            updateUI();
            drawBoard();
            finishMove();
            return;
        }

        if (gameMode === 'classic') {
            selectionMode = true;
            firstCorner = null;
            placementActive = false;
            currentMsg = `🎲 Выпало ${diceN} и ${diceM}. Кликните на поле, чтобы выбрать прямоугольник.`;
        } else {
            selectionMode = false;
            firstCorner = null;
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
            if (!placed) {
                currentShape.x = 0;
                currentShape.y = 0;
                constrainShapePosition();
            }
            currentMsg = `🎲 Выпало ${diceN} и ${diceM}. Перемещайте прямоугольник мышью, вращайте клавишей R. Кликните для размещения.`;
        }
        updateUI();
        drawBoard();
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
        currentMsg = `Прямоугольник повёрнут: ${currentShape.w}×${currentShape.h}`;
        updateUI();
        drawBoard();
    }

    function skipTurn(fromBot = false) {
        if (!gameActive) return;
        if (!fromBot) {
            if (simulationMode) { currentMsg = "Режим симуляции: вы не можете пропускать ход ботов."; updateUI(); return; }
            if (botMode && botPlayers.includes(currentPlayer)) {
                currentMsg = "Сейчас ход бота, вы не можете пропустить его ход.";
                updateUI();
                return;
            }
        }
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
            ctx.strokeStyle = RECT_BORDER;
            ctx.strokeRect(rect.x*CELL_SIZE, rect.y*CELL_SIZE, rect.w*CELL_SIZE, rect.h*CELL_SIZE);
            const area = rect.w * rect.h;
            const centerX = (rect.x + rect.w/2)*CELL_SIZE, centerY = (rect.y + rect.h/2)*CELL_SIZE;
            ctx.font = `bold ${Math.min(CELL_SIZE-4,18)}px "Segoe UI"`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5; ctx.strokeText(area.toString(), centerX, centerY);
            ctx.fillStyle = '#FFF'; ctx.fillText(area.toString(), centerX, centerY);
        }

        const isHumanTurn = !simulationMode && gameActive && !(botMode && botPlayers.includes(currentPlayer));
        // Подсветка доступных ходов только если включена настройка
        if (isHumanTurn && !waitingForRoll && gameMode === 'predefined' && availableMoves.length > 0 && showAvailableHighlight) {
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

        if (!simulationMode && gameActive && gameMode === 'predefined' && placementActive && !waitingForRoll && currentShape && currentShape.w > 0 && currentShape.h > 0) {
            const killed = coversStartCell(currentShape.x, currentShape.y, currentShape.w, currentShape.h, currentPlayer);
            let ghostColor = PREDEFINED_GHOST_STYLE;
            if (killed !== null && activePlayers.includes(killed)) {
                ghostColor = KILL_GHOST_STYLE;
                const centerX = (currentShape.x + currentShape.w/2) * CELL_SIZE;
                const centerY = (currentShape.y + currentShape.h/2) * CELL_SIZE;
                ctx.font = `bold ${Math.min(CELL_SIZE * Math.min(currentShape.w, currentShape.h) * 0.6, 40)}px "Segoe UI"`;
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

        if (!simulationMode && gameActive && gameMode === 'classic' && selectionMode && firstCorner && !placementActive) {
            ctx.fillStyle = 'rgba(255,255,100,0.6)';
            ctx.fillRect(firstCorner.x*CELL_SIZE, firstCorner.y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = 'gold';
            ctx.strokeRect(firstCorner.x*CELL_SIZE, firstCorner.y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }

    let ghostX=-1,ghostY=-1;
    function onMouseMove(e) {
        if (simulationMode) return;
        const rectCanvas = canvas.getBoundingClientRect();
        const scaleX = canvas.width/rectCanvas.width, scaleY = canvas.height/rectCanvas.height;
        let cellX = Math.floor((e.clientX - rectCanvas.left)*scaleX/CELL_SIZE);
        let cellY = Math.floor((e.clientY - rectCanvas.top)*scaleY/CELL_SIZE);
        cellX = Math.min(Math.max(0,cellX), COLS-1);
        cellY = Math.min(Math.max(0,cellY), ROWS-1);

        if (gameMode === 'classic') {
            if (!selectionMode || firstCorner === null) { ghostX=-1; drawBoard(); return; }
            ghostX=cellX; ghostY=cellY;
            drawBoard();
            let left = Math.min(firstCorner.x, ghostX), right = Math.max(firstCorner.x, ghostX), top = Math.min(firstCorner.y, ghostY), bottom = Math.max(firstCorner.y, ghostY);
            let width = right-left+1, height = bottom-top+1;
            let isValid = isValidSize(width, height, diceN, diceM);
            ctx.fillStyle = isValid ? GHOST_STYLE : 'rgba(255,80,80,0.3)';
            ctx.fillRect(left*CELL_SIZE, top*CELL_SIZE, width*CELL_SIZE, height*CELL_SIZE);
            ctx.strokeStyle = isValid ? '#ffff00' : '#ff0000';
            ctx.strokeRect(left*CELL_SIZE, top*CELL_SIZE, width*CELL_SIZE, height*CELL_SIZE);
        } else if (gameMode === 'predefined') {
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
                const killed = coversStartCell(currentShape.x, currentShape.y, currentShape.w, currentShape.h, currentPlayer);
                if (killed !== null && activePlayers.includes(killed)) {
                    currentMsg = `⚠️ Этим ходом вы убьёте ${getPlayerName(killed)}!`;
                } else {
                    if (currentMsg.startsWith("⚠️")) currentMsg = `🎲 Выпало ${diceN} и ${diceM}. Перемещайте прямоугольник мышью, вращайте клавишей R. Кликните для размещения.`;
                }
                updateUI();
                drawBoard();
            }
        }
    }

    function handleCanvasClick(e) {
        if(!gameActive) return;
        if (simulationMode) { currentMsg = "Режим симуляции: вы не можете взаимодействовать с полем."; updateUI(); return; }
        if (botMode && botPlayers.includes(currentPlayer)) { currentMsg = "Ход бота, подождите..."; updateUI(); return; }
        if(waitingForRoll) { currentMsg = "Сначала бросьте кубики!"; updateUI(); return; }

        if (gameMode === 'classic') {
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
        } else if (gameMode === 'predefined') {
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
    }

    function setColorPaletteForMode(mode) {
        PLAYER_COLORS = { ...BASE_PLAYER_COLORS };
        if (mode === 'protanopia' || mode === 'deuteranopia') {
            PLAYER_COLORS[4] = '#c154c1';
        }
    }

    function applyColorBlindMode(mode) {
        setColorPaletteForMode(mode);
        document.body.style.filter = 'none';
    }

    function applySettingsAndRestart() {
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
        gameMode = getSelectedGameMode();
        
        // Чтение настройки подсветки
        const newHighlight = highlightToggle.checked;
        showAvailableHighlight = newHighlight;
        
        updateCanvasSize();
        updateStartCells();
        
        if (simulationMode) {
            botMode = true;
            if (PLAYER_COUNT === 2) {
                botPlayers = [1,2];
                botsStatusText.innerText = "(режим симуляции: оба игрока боты)";
            } else {
                botPlayers = [1,2,3,4];
                botsStatusText.innerText = "(режим симуляции: все игроки боты)";
            }
            botsToggle.disabled = true;
            botsToggle.parentElement.style.opacity = '0.5';
        } else {
            botMode = newBotMode;
            if (PLAYER_COUNT === 2) {
                botPlayers = botMode ? [2] : [];
                botsStatusText.innerText = botMode ? "(игрок 2 — бот)" : "(игроки оба живые)";
            } else {
                botPlayers = botMode ? [2,3,4] : [];
                botsStatusText.innerText = botMode ? "(игроки 2,3,4 — боты)" : "(все игроки люди)";
            }
            botsToggle.disabled = false;
            botsToggle.parentElement.style.opacity = '1';
        }
        
        const colorMode = getSelectedColorMode();
        applyColorBlindMode(colorMode);
        
        stopTimer();
        newGame();
        settingsModal.style.display = "none";
    }

    function openModal() {
        for (let radio of gameModeRadios) {
            if (radio.value === gameMode) radio.checked = true;
        }
        // Устанавливаем текущее значение подсветки в модальном окне
        highlightToggle.checked = showAvailableHighlight;
        settingsModal.style.display = "flex";
        updateMinFieldSizeWarning();
    }
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

    function newGame() {
        stopTimer(); timerSeconds = 0; updateTimerDisplay();
        rectangles = [];
        const positions = PLAYER_COUNT === 2 ? [1,2] : [1,2,3,4];
        for (let p of positions) {
            const pos = START_CELLS[p];
            if (pos) rectangles.push({ owner: p, x: pos.x, y: pos.y, w: START_SIZE, h: START_SIZE });
        }
        currentPlayer = 1;
        waitingForRoll = true;
        selectionMode = false;
        firstCorner = null;
        placementActive = false;
        diceN = 0; diceM = 0;
        turnCounter = 0;
        activePlayers = [...positions];
        eliminatedOrder = [];
        gameActive = true;
        availableMoves = [];
        killWarning = null;
        // showAvailableHighlight сохраняется из настроек, не сбрасываем
        currentMsg = simulationMode ? "Режим симуляции: наблюдение за игрой ботов." : "Новая игра! Бросьте кубики.";
        rollBtn.disabled = false;
        skipBtn.disabled = false;
        updateUI();
        drawBoard();
        startTimer();
        fieldSizeLabel.innerText = (COLS===39 && ROWS===28 && START_SIZE===2 && PLAYER_COUNT===4 && !simulationMode) ? "Стандартное поле (39×28)" : `Поле ${COLS}×${ROWS}, старт ${START_SIZE}, игроков ${PLAYER_COUNT}${simulationMode ? ' [СИМУЛЯЦИЯ]' : ''}`;
        botsLabel.innerText = simulationMode ? "🎬 Режим симуляции (все боты)" : (botMode ? "🤖 Игра с ботами" : "👤 Игра без ботов");
        if (simulationMode || (botMode && botPlayers.includes(currentPlayer))) {
            setTimeout(() => maybeBotTurn(), 100);
        }
    }

    function init() {
        updateCanvasSize();
        updateStartCells();
        applyColorBlindMode('normal');
        gameMode = 'predefined';
        showAvailableHighlight = true; // по умолчанию включено
        newGame();
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseleave', () => { ghostX = -1; drawBoard(); });
        rollBtn.addEventListener('click', rollDice);
        skipBtn.addEventListener('click', () => skipTurn(false));
        resetBtnLeft.addEventListener('click', () => newGame());
        window.addEventListener('keydown', (e) => {
            if (simulationMode) return;
            if (e.code === 'Enter' && gameActive && waitingForRoll && !(botMode && botPlayers.includes(currentPlayer))) {
                rollDice();
            }
            else if (e.code === 'Escape' && selectionMode && firstCorner && !(botMode && botPlayers.includes(currentPlayer)) && gameMode === 'classic') {
                firstCorner = null;
                currentMsg = "Выбор отменён";
                updateUI();
                drawBoard();
            }
            else if (e.code === 'KeyR' && gameMode === 'predefined' && placementActive && !waitingForRoll && !(botMode && botPlayers.includes(currentPlayer)) && gameActive) {
                e.preventDefault();
                rotateShape();
            }
            else if (e.code === 'KeyS' && gameActive && !(botMode && botPlayers.includes(currentPlayer))) {
                skipTurn(false);
            }
        });
    }
    init();
})();
