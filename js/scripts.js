(function(){
    // ---------- ПАРАМЕТРЫ ПОЛЯ ----------
    const COLS = 39;
    const ROWS = 28;
    const CELL_SIZE = 20;
    const CANVAS_W = COLS * CELL_SIZE;
    const CANVAS_H = ROWS * CELL_SIZE;

    const PLAYER_COLORS = {
        1: '#e34234',
        2: '#4682b4',
        3: '#3c9e3c',
        4: '#e8b323'
    };
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

    // Таймер
    let timerSeconds = 0;
    let timerInterval = null;

    // ---------- Режим ботов ----------
    let botMode = true;            // боты включены
    let botPlayers = [2, 3, 4];    // кто управляется ботами
    let isBotThinking = false;     // чтобы боты не накладывались

    const START_CELLS = {
        1: { x: 0, y: 0 },
        2: { x: COLS-2, y: 0 },
        3: { x: 0, y: ROWS-2 },
        4: { x: COLS-2, y: ROWS-2 }
    };

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

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    function getPlayerName(player) {
        const names = {1: 'Красный', 2: 'Синий', 3: 'Зелёный', 4: 'Жёлтый'};
        return names[player];
    }

    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        timerDisplay.textContent = formatTime(timerSeconds);
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (gameActive) {
                timerSeconds++;
                updateTimerDisplay();
            }
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function resetTimer() {
        stopTimer();
        timerSeconds = 0;
        updateTimerDisplay();
        if (gameActive) startTimer();
    }

    function computeScores() {
        let scores = {1:0,2:0,3:0,4:0};
        for(let rect of rectangles) {
            if (rect.owner !== null && activePlayers.includes(rect.owner)) {
                scores[rect.owner] += rect.w * rect.h;
            }
        }
        return scores;
    }

    function getNeutralCellCount() {
        let neutralCells = 0;
        for(let rect of rectangles) {
            if (rect.owner === null) {
                neutralCells += rect.w * rect.h;
            }
        }
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
            const eliminatedText = isEliminated ? ' (выбыл)' : '';
            html += `
                <div class="player-score-card" style="border-left-color: ${color}">
                    <div class="player-color-badge" style="background: ${color}"></div>
                    <div class="player-score-info">
                        <div class="player-name">${name}${eliminatedText}</div>
                        <div class="player-score">${score}</div>
                    </div>
                </div>
            `;
        }
        html += `
            <div class="neutral-score-card" style="border-left-color: #aaaaaa">
                <div class="neutral-badge"></div>
                <div class="neutral-info">
                    <div class="neutral-name">Нейтральные</div>
                    <div class="neutral-score">${neutralCells}</div>
                </div>
            </div>
        `;
        sideScorePanel.innerHTML = html;
    }

    function updateUI() {
        turnText.innerHTML = `Игрок ${currentPlayer} (${getPlayerName(currentPlayer)})`;
        turnText.style.backgroundColor = PLAYER_COLORS[currentPlayer];
        turnText.style.textShadow = '0 0 3px black';
        
        if(diceN && diceM && !waitingForRoll) {
            diceDisplay.innerHTML = `🎲 ${diceN}  ·  ${diceM} 🎲`;
        } else {
            diceDisplay.innerHTML = `🎲  ?  ?  🎲`;
        }
        msgArea.innerText = currentMsg;
        updateSideScores();
        turnCountDisplay.innerText = turnCounter;
    }

    function areAdjacentByEdge(rect1, rect2) {
        const r1_left = rect1.x;
        const r1_right = rect1.x + rect1.w - 1;
        const r1_top = rect1.y;
        const r1_bottom = rect1.y + rect1.h - 1;
        
        const r2_left = rect2.x;
        const r2_right = rect2.x + rect2.w - 1;
        const r2_top = rect2.y;
        const r2_bottom = rect2.y + rect2.h - 1;
        
        const x_overlap = (r1_left <= r2_right && r1_right >= r2_left);
        const y_overlap = (r1_top <= r2_bottom && r1_bottom >= r2_top);
        
        if (x_overlap) {
            if (r1_bottom + 1 === r2_top) return true;
            if (r2_bottom + 1 === r1_top) return true;
        }
        if (y_overlap) {
            if (r1_right + 1 === r2_left) return true;
            if (r2_right + 1 === r1_left) return true;
        }
        return false;
    }

    function isAdjacentToPlayer(rect, player) {
        if (!activePlayers.includes(player)) return false;
        const playerRects = rectangles.filter(r => r.owner === player);
        for(let pr of playerRects) {
            if(areAdjacentByEdge(rect, pr)) return true;
        }
        return false;
    }

    function isAreaFree(x, y, w, h) {
        for(let r of rectangles) {
            if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) {
                return false;
            }
        }
        return true;
    }

    function getExactRectangle(x, y, w, h) {
        for(let r of rectangles) {
            if(r.x === x && r.y === y && r.w === w && r.h === h) return r;
        }
        return null;
    }

    function isValidSize(w, h, a, b) {
        return (w === a && h === b) || (w === b && h === a);
    }

    function coversStartCell(x, y, w, h, excludePlayer = null) {
        for (let p of activePlayers) {
            if (excludePlayer === p) continue;
            const start = START_CELLS[p];
            if (start && x <= start.x && start.x < x+w && y <= start.y && start.y < y+h) {
                return p;
            }
        }
        return null;
    }

    function redistributeTerritory(eliminatedPlayer, killerPlayer) {
        const startEliminated = START_CELLS[eliminatedPlayer];
        const alivePlayers = activePlayers.filter(p => p !== eliminatedPlayer);
        const eliminatedRects = rectangles.filter(r => r.owner === eliminatedPlayer);
        
        const adjacencyMap = new Map();
        for (let rect of eliminatedRects) {
            const adjacentTo = alivePlayers.filter(p => isAdjacentToPlayer(rect, p));
            adjacencyMap.set(rect, adjacentTo);
        }
        
        for (let rect of eliminatedRects) {
            const adjacentTo = adjacencyMap.get(rect);
            if (adjacentTo.length === 0) {
                rect.owner = null;
                continue;
            }
            if (adjacentTo.includes(killerPlayer)) {
                rect.owner = killerPlayer;
                continue;
            }
            const candidates = [...adjacentTo];
            if (candidates.length === 1) {
                rect.owner = candidates[0];
            } else {
                candidates.sort((a, b) => {
                    const distA = Math.abs(START_CELLS[a].x - startEliminated.x) + Math.abs(START_CELLS[a].y - startEliminated.y);
                    const distB = Math.abs(START_CELLS[b].x - startEliminated.x) + Math.abs(START_CELLS[b].y - startEliminated.y);
                    if (distA !== distB) return distA - distB;
                    const orderA = (a - killerPlayer + 4) % 4;
                    const orderB = (b - killerPlayer + 4) % 4;
                    return orderA - orderB;
                });
                rect.owner = candidates[0];
            }
        }
    }

    function eliminatePlayer(eliminated, killer) {
        if (!activePlayers.includes(eliminated)) return;
        eliminatedOrder.push(eliminated);
        activePlayers = activePlayers.filter(p => p !== eliminated);
        redistributeTerritory(eliminated, killer);
        currentMsg = `💀 Игрок ${getPlayerName(eliminated)} выбыл! Его территория перераспределена.`;
        updateUI();
        drawBoard();
        if (activePlayers.length === 1) {
            endGame('elimination');
        }
    }

    function isFieldFullyOccupied() {
        const occupied = Array(ROWS).fill().map(() => Array(COLS).fill(false));
        for (let rect of rectangles) {
            for (let i = rect.x; i < rect.x + rect.w; i++) {
                for (let j = rect.y; j < rect.y + rect.h; j++) {
                    if (i >= 0 && i < COLS && j >= 0 && j < ROWS) {
                        occupied[j][i] = true;
                    }
                }
            }
        }
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (!occupied[y][x]) return false;
            }
        }
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
            for (let i = eliminatedOrder.length - 1; i >= 0; i--) {
                const place = eliminatedOrder.length - i + 1;
                rankings.push({ player: eliminatedOrder[i], place: place });
            }
        } else if (reason === 'full') {
            const scores = computeScores();
            let players = [1,2,3,4].filter(p => activePlayers.includes(p) || eliminatedOrder.includes(p));
            players.sort((a,b) => scores[b] - scores[a]);
            for (let i = 0; i < players.length; i++) {
                rankings.push({ player: players[i], place: i+1 });
            }
        }
        
        let message = "🏁 ИГРА ОКОНЧЕНА 🏁\n";
        for (let r of rankings) {
            message += `${r.place} место: ${getPlayerName(r.player)}\n`;
        }
        currentMsg = message;
        updateUI();
        alert(message);
    }

    function tryMakeMove(x, y, w, h) {
        if (!isValidSize(w, h, diceN, diceM)) {
            currentMsg = `❌ Ошибка: нужен прямоугольник ${diceN}×${diceM} (или ${diceM}×${diceN})`;
            updateUI();
            return false;
        }
        if(x < 0 || y < 0 || x+w > COLS || y+h > ROWS) {
            currentMsg = "❌ Прямоугольник выходит за границы поля";
            updateUI();
            return false;
        }
        
        let success = false;
        if(isAreaFree(x, y, w, h)) {
            const tempRect = { x, y, w, h };
            if(isAdjacentToPlayer(tempRect, currentPlayer)) {
                rectangles.push({ owner: currentPlayer, x, y, w, h });
                currentMsg = `✅ Расширение: занята область ${w}×${h}`;
                success = true;
            } else {
                currentMsg = "❌ Расширение: прямоугольник не прилегает к вашей территории (нужна общая сторона)";
                updateUI();
                return false;
            }
        } 
        else {
            const targetRect = getExactRectangle(x, y, w, h);
            if(targetRect && targetRect.owner !== currentPlayer) {
                if(isAdjacentToPlayer(targetRect, currentPlayer)) {
                    const oldOwner = targetRect.owner;
                    targetRect.owner = currentPlayer;
                    currentMsg = `⚔️ ЗАХВАТ! Вы отобрали прямоугольник ${w}×${h} у ${getPlayerName(oldOwner)}`;
                    success = true;
                } else {
                    currentMsg = "❌ Захват невозможен: вражеский прямоугольник не касается вашей территории (нет общей стороны)";
                    updateUI();
                    return false;
                }
            } else if(targetRect && targetRect.owner === currentPlayer) {
                currentMsg = "❌ Это ваш прямоугольник! Нельзя захватить самого себя.";
                updateUI();
                return false;
            } else if(targetRect && targetRect.owner === null) {
                if(isAdjacentToPlayer(targetRect, currentPlayer)) {
                    targetRect.owner = currentPlayer;
                    currentMsg = `🏴‍☠️ ЗАХВАТ НЕЙТРАЛЬНОЙ ТЕРРИТОРИИ! Прямоугольник ${w}×${h} теперь ваш.`;
                    success = true;
                } else {
                    currentMsg = "❌ Нейтральный прямоугольник не прилегает к вашей территории";
                    updateUI();
                    return false;
                }
            } else {
                currentMsg = "❌ Невозможно: эта область частично перекрыта или не совпадает с существующим прямоугольником. Выберите целый чужой или нейтральный прямоугольник, либо пустое место.";
                updateUI();
                return false;
            }
        }
        
        if (success) {
            const eliminated = coversStartCell(x, y, w, h, currentPlayer);
            if (eliminated !== null && activePlayers.includes(eliminated)) {
                eliminatePlayer(eliminated, currentPlayer);
            }
            return true;
        }
        return false;
    }

    function finishMove() {
        drawBoard();
        if (isFieldFullyOccupied() && gameActive) {
            endGame('full');
            return;
        }
        turnCounter++;
        updateUI();
        
        if (!gameActive) return;
        
        let next = (currentPlayer % 4) + 1;
        while (!activePlayers.includes(next)) {
            next = (next % 4) + 1;
            if (next === currentPlayer) break;
        }
        currentPlayer = next;
        waitingForRoll = true;
        selectionMode = false;
        firstCorner = null;
        diceN = 0;
        diceM = 0;
        currentMsg = `Игрок ${currentPlayer} (${getPlayerName(currentPlayer)}), бросьте кубики`;
        updateUI();
        drawBoard();

        // --- ИСПРАВЛЕНИЕ: запускаем бота через setTimeout, чтобы текущий бот успел сбросить флаг ---
        if (botMode && botPlayers.includes(currentPlayer) && gameActive) {
            setTimeout(() => maybeBotTurn(), 50);
        }
    }

    // ---------- Функции ботов ----------
    function maybeBotTurn() {
        if (botMode && botPlayers.includes(currentPlayer) && gameActive && !isBotThinking) {
            botTurn();
        }
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function botTurn() {
        if (!gameActive || isBotThinking) return;
        if (!botPlayers.includes(currentPlayer)) return;
        isBotThinking = true;
        
        await delay(400);
        if (!gameActive) {
            isBotThinking = false;
            return;
        }
        
        if (waitingForRoll) {
            diceN = Math.floor(Math.random() * 6) + 1;
            diceM = Math.floor(Math.random() * 6) + 1;
            waitingForRoll = false;
            selectionMode = true;
            firstCorner = null;
            currentMsg = `🎲 Бот ${getPlayerName(currentPlayer)} выбросил ${diceN} и ${diceM}.`;
            updateUI();
            drawBoard();
            await delay(300);
        }
        
        const move = getBestMove(currentPlayer, diceN, diceM);
        if (move) {
            const success = tryMakeMove(move.x, move.y, move.w, move.h);
            if (success) {
                currentMsg = `🤖 Бот ${getPlayerName(currentPlayer)} сделал ход.`;
                updateUI();
                drawBoard();
                await delay(500);
                finishMove();
            } else {
                currentMsg = `🤖 Бот ${getPlayerName(currentPlayer)} не смог сходить, пропускает.`;
                updateUI();
                await delay(500);
                skipTurn();
            }
        } else {
            currentMsg = `🤖 Бот ${getPlayerName(currentPlayer)} не нашёл ходов, пропускает.`;
            updateUI();
            await delay(500);
            skipTurn();
        }
        
        isBotThinking = false;
    }

    function getBestMove(player, diceA, diceB) {
        const possibleSizes = [[diceA, diceB]];
        if (diceA !== diceB) possibleSizes.push([diceB, diceA]);
        
        let bestMove = null;
        let bestScore = -Infinity;
        
        for (let [w, h] of possibleSizes) {
            // Расширение на пустое место
            for (let y = 0; y <= ROWS - h; y++) {
                for (let x = 0; x <= COLS - w; x++) {
                    if (isAreaFree(x, y, w, h)) {
                        const tempRect = { x, y, w, h, owner: null };
                        if (isAdjacentToPlayer(tempRect, player)) {
                            let score = w * h;
                            const killed = coversStartCell(x, y, w, h, player);
                            if (killed && activePlayers.includes(killed)) {
                                score += 10000;
                            }
                            if (score > bestScore) {
                                bestScore = score;
                                bestMove = { x, y, w, h };
                            }
                        }
                    }
                }
            }
            
            // Захват существующего прямоугольника
            for (let rect of rectangles) {
                if (rect.owner === player) continue;
                if (rect.w === w && rect.h === h) {
                    if (isAdjacentToPlayer(rect, player)) {
                        let score = rect.w * rect.h;
                        if (rect.owner !== null) {
                            score *= 2;
                            const killed = coversStartCell(rect.x, rect.y, rect.w, rect.h, player);
                            if (killed && activePlayers.includes(killed)) {
                                score += 10000;
                            }
                        } else {
                            score *= 1.5;
                        }
                        if (score > bestScore) {
                            bestScore = score;
                            bestMove = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
                        }
                    }
                }
            }
        }
        return bestMove;
    }

    function rollDice() {
        if(!gameActive) {
            currentMsg = "Игра окончена. Нажмите 'Новая игра'.";
            updateUI();
            return;
        }
        if (botMode && botPlayers.includes(currentPlayer)) {
            currentMsg = "Сейчас ход бота, подождите...";
            updateUI();
            return;
        }
        if(!waitingForRoll) {
            currentMsg = "Вы уже бросили! Сначала разместите прямоугольник или пропустите ход.";
            updateUI();
            return;
        }
        diceN = Math.floor(Math.random() * 6) + 1;
        diceM = Math.floor(Math.random() * 6) + 1;
        waitingForRoll = false;
        selectionMode = true;
        firstCorner = null;
        currentMsg = `🎲 Выпало ${diceN} и ${diceM}. Кликните на поле, чтобы выбрать прямоугольник ${diceN}×${diceM} (или ${diceM}×${diceN}). Первый клик — угол, второй — противоположный.`;
        updateUI();
        drawBoard();
    }

    function skipTurn() {
        if (!gameActive) {
            currentMsg = "Игра окончена. Нажмите 'Новая игра'.";
            updateUI();
            return;
        }
        // Убрана блокировка для ботов — теперь любой игрок может пропустить ход
        if (waitingForRoll) {
            currentMsg = "Ход пропущен (без броска кубиков)";
        } else {
            currentMsg = "Ход пропущен (прямоугольник не размещён)";
        }
        finishMove();
    }

    function drawBoard() {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        
        ctx.beginPath();
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1;
        for (let row = 0; row <= ROWS; row++) {
            ctx.moveTo(0, row * CELL_SIZE);
            ctx.lineTo(CANVAS_W, row * CELL_SIZE);
            ctx.stroke();
        }
        for (let col = 0; col <= COLS; col++) {
            ctx.moveTo(col * CELL_SIZE, 0);
            ctx.lineTo(col * CELL_SIZE, CANVAS_H);
            ctx.stroke();
        }
        
        for(let rect of rectangles) {
            if (rect.owner === null) {
                ctx.fillStyle = NEUTRAL_COLOR;
            } else {
                ctx.fillStyle = PLAYER_COLORS[rect.owner];
            }
            ctx.fillRect(rect.x * CELL_SIZE, rect.y * CELL_SIZE, rect.w * CELL_SIZE, rect.h * CELL_SIZE);
            ctx.strokeStyle = RECT_BORDER;
            ctx.lineWidth = 2;
            ctx.strokeRect(rect.x * CELL_SIZE, rect.y * CELL_SIZE, rect.w * CELL_SIZE, rect.h * CELL_SIZE);
        }
        
        for(let rect of rectangles) {
            const area = rect.w * rect.h;
            const centerX = (rect.x + rect.w/2) * CELL_SIZE;
            const centerY = (rect.y + rect.h/2) * CELL_SIZE;
            let fontSize = Math.min(CELL_SIZE - 4, 18);
            if (rect.w === 1 && rect.h === 1) {
                fontSize = Math.max(10, CELL_SIZE - 8);
            }
            ctx.font = `bold ${fontSize}px "Segoe UI", system-ui`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowBlur = 0;
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#000000';
            ctx.strokeText(area.toString(), centerX, centerY);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(area.toString(), centerX, centerY);
        }
        
        if(selectionMode && firstCorner) {
            ctx.fillStyle = 'rgba(255,255,100,0.6)';
            ctx.fillRect(firstCorner.x * CELL_SIZE, firstCorner.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = 'gold';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(firstCorner.x * CELL_SIZE, firstCorner.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }

    let ghostX = -1, ghostY = -1;
    function onMouseMove(e) {
        if (!selectionMode || firstCorner === null) {
            ghostX = -1;
            return;
        }
        const rectCanvas = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rectCanvas.width;
        const scaleY = canvas.height / rectCanvas.height;
        let mouseX = (e.clientX - rectCanvas.left) * scaleX;
        let mouseY = (e.clientY - rectCanvas.top) * scaleY;
        let cellX = Math.floor(mouseX / CELL_SIZE);
        let cellY = Math.floor(mouseY / CELL_SIZE);
        if(cellX < 0) cellX = 0;
        if(cellY < 0) cellY = 0;
        if(cellX >= COLS) cellX = COLS-1;
        if(cellY >= ROWS) cellY = ROWS-1;
        ghostX = cellX;
        ghostY = cellY;
        drawBoard();
        if (firstCorner && ghostX >= 0 && ghostY >= 0) {
            let x1 = firstCorner.x, y1 = firstCorner.y;
            let x2 = ghostX, y2 = ghostY;
            let left = Math.min(x1, x2);
            let right = Math.max(x1, x2);
            let top = Math.min(y1, y2);
            let bottom = Math.max(y1, y2);
            let width = right - left + 1;
            let height = bottom - top + 1;
            let isValid = isValidSize(width, height, diceN, diceM);
            ctx.fillStyle = isValid ? GHOST_STYLE : 'rgba(255, 80, 80, 0.3)';
            ctx.fillRect(left * CELL_SIZE, top * CELL_SIZE, width * CELL_SIZE, height * CELL_SIZE);
            ctx.strokeStyle = isValid ? '#ffff00' : '#ff0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(left * CELL_SIZE, top * CELL_SIZE, width * CELL_SIZE, height * CELL_SIZE);
        }
    }

    function handleCanvasClick(e) {
        if(!gameActive) {
            currentMsg = "Игра окончена. Нажмите 'Новая игра'.";
            updateUI();
            return;
        }
        if (botMode && botPlayers.includes(currentPlayer)) {
            currentMsg = "Сейчас ход бота, подождите...";
            updateUI();
            return;
        }
        if(waitingForRoll) {
            currentMsg = "Сначала бросьте кубики (кнопка 'Бросить кубики')";
            updateUI();
            return;
        }
        if(!selectionMode) {
            currentMsg = "Сейчас не режим выбора (пропустите ход или бросьте кубики заново)";
            updateUI();
            return;
        }
        const rectCanvas = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rectCanvas.width;
        const scaleY = canvas.height / rectCanvas.height;
        let mouseX = (e.clientX - rectCanvas.left) * scaleX;
        let mouseY = (e.clientY - rectCanvas.top) * scaleY;
        let cellX = Math.floor(mouseX / CELL_SIZE);
        let cellY = Math.floor(mouseY / CELL_SIZE);
        if(cellX < 0) cellX = 0;
        if(cellY < 0) cellY = 0;
        if(cellX >= COLS) cellX = COLS-1;
        if(cellY >= ROWS) cellY = ROWS-1;
        
        if(firstCorner === null) {
            firstCorner = { x: cellX, y: cellY };
            currentMsg = `Первый угол: (${cellX},${cellY}). Теперь выберите противоположный угол для прямоугольника ${diceN}×${diceM}.`;
            updateUI();
            drawBoard();
        } else {
            let x1 = firstCorner.x, y1 = firstCorner.y;
            let x2 = cellX, y2 = cellY;
            let left = Math.min(x1, x2);
            let right = Math.max(x1, x2);
            let top = Math.min(y1, y2);
            let bottom = Math.max(y1, y2);
            let width = right - left + 1;
            let height = bottom - top + 1;
            
            let success = tryMakeMove(left, top, width, height);
            if(success) {
                drawBoard();
                finishMove();
            } else {
                firstCorner = null;
                updateUI();
                drawBoard();
            }
        }
    }
    
    function newGame() {
        stopTimer();
        timerSeconds = 0;
        updateTimerDisplay();
        
        rectangles = [];
        rectangles.push({ owner: 1, x: 0, y: 0, w: 2, h: 2 });
        rectangles.push({ owner: 2, x: COLS-2, y: 0, w: 2, h: 2 });
        rectangles.push({ owner: 3, x: 0, y: ROWS-2, w: 2, h: 2 });
        rectangles.push({ owner: 4, x: COLS-2, y: ROWS-2, w: 2, h: 2 });
        currentPlayer = 1;
        waitingForRoll = true;
        selectionMode = false;
        firstCorner = null;
        diceN = 0; diceM = 0;
        turnCounter = 0;
        activePlayers = [1,2,3,4];
        eliminatedOrder = [];
        gameActive = true;
        currentMsg = "Новая игра! Игрок 1 (красный) начинает. Бросьте кубики.";
        rollBtn.disabled = false;
        skipBtn.disabled = false;
        updateUI();
        drawBoard();
        
        startTimer();
        
        // Если вдруг первый игрок бот (но у нас боты 2-4), не запускаем
    }
    
    function handleKey(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!rollBtn.disabled && gameActive && waitingForRoll && !(botMode && botPlayers.includes(currentPlayer))) {
                rollDice();
            } else if (botMode && botPlayers.includes(currentPlayer)) {
                currentMsg = "Сейчас ход бота, не мешайте!";
                updateUI();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (selectionMode && firstCorner !== null && !(botMode && botPlayers.includes(currentPlayer))) {
                firstCorner = null;
                currentMsg = `Выбор отменён. Можете начать заново для прямоугольника ${diceN}×${diceM}.`;
                updateUI();
                drawBoard();
            }
        } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            newGame();
        } else if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            if (gameActive && !(botMode && botPlayers.includes(currentPlayer))) skipTurn();
        }
    }
    
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', () => { ghostX = -1; drawBoard(); });
    rollBtn.addEventListener('click', rollDice);
    skipBtn.addEventListener('click', skipTurn);
    resetBtnLeft.addEventListener('click', newGame);
    window.addEventListener('keydown', handleKey);
    
    newGame();
})();
