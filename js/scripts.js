(function(){
    // ---------- ПАРАМЕТРЫ ПОЛЯ ----------
    const COLS = 30;
    const ROWS = 20;
    const CELL_SIZE = 25;
    const CANVAS_W = COLS * CELL_SIZE;
    const CANVAS_H = ROWS * CELL_SIZE;

    const PLAYER_COLORS = {
        1: '#e34234',
        2: '#4682b4',
        3: '#3c9e3c',
        4: '#e8b323'
    };
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

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const turnText = document.getElementById('turnText');
    const diceDisplay = document.getElementById('diceDisplay');
    const msgArea = document.getElementById('msgArea');
    const rollBtn = document.getElementById('rollBtn');
    const skipBtn = document.getElementById('skipBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const resetBtn = document.getElementById('resetBtn');
    const sideScorePanel = document.getElementById('sideScorePanel');

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    function getPlayerName(player) {
        const names = {1: 'Красный', 2: 'Синий', 3: 'Зелёный', 4: 'Жёлтый'};
        return names[player];
    }

    function computeScores() {
        let scores = {1:0,2:0,3:0,4:0};
        for(let rect of rectangles) {
            scores[rect.owner] += rect.w * rect.h;
        }
        return scores;
    }

    function updateSideScores() {
        const scores = computeScores();
        let html = '';
        for(let p = 1; p <= 4; p++) {
            const color = PLAYER_COLORS[p];
            const name = getPlayerName(p);
            const score = scores[p];
            html += `
                <div class="player-score-card" style="border-left-color: ${color}">
                    <div class="player-color-badge" style="background: ${color}"></div>
                    <div class="player-score-info">
                        <div class="player-name">${name}</div>
                        <div class="player-score">${score}</div>
                    </div>
                </div>
            `;
        }
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

    function hasTerritory(player) {
        return rectangles.some(r => r.owner === player);
    }

    function nextTurn() {
        let next = (currentPlayer % 4) + 1;
        if (!hasTerritory(next)) {
            currentMsg = `Игрок ${getPlayerName(next)} не имеет территории и выбывает!`;
            updateUI();
            currentPlayer = next;
            nextTurn();
            return;
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
    }

    function finishMove() {
        drawBoard();
        const scores = computeScores();
        const totalCells = COLS * ROWS;
        for (let p = 1; p <= 4; p++) {
            if (scores[p] === totalCells) {
                currentMsg = `🏆 ПОБЕДА! Игрок ${getPlayerName(p)} захватил всё поле! 🏆`;
                updateUI();
                waitingForRoll = true;
                selectionMode = false;
                rollBtn.disabled = true;
                skipBtn.disabled = true;
                cancelBtn.disabled = true;
                return;
            }
        }
        nextTurn();
    }

    function rollDice() {
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
        if(waitingForRoll) {
            currentMsg = "Вы пропускаете ход, не бросая кубики";
        } else {
            currentMsg = "Ход пропущен (вы не разместили прямоугольник)";
        }
        finishMove();
    }

    function cancelSelection() {
        if (!selectionMode || waitingForRoll) {
            currentMsg = "Нечего отменять — вы ещё не выбрали первый угол.";
            updateUI();
            return;
        }
        firstCorner = null;
        currentMsg = `Выбор отменён. Можете начать заново с любого угла для прямоугольника ${diceN}×${diceM}.`;
        updateUI();
        drawBoard();
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
        
        if(isAreaFree(x, y, w, h)) {
            const tempRect = { x, y, w, h };
            if(isAdjacentToPlayer(tempRect, currentPlayer)) {
                rectangles.push({ owner: currentPlayer, x, y, w, h });
                currentMsg = `✅ Расширение: занята область ${w}×${h}`;
                return true;
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
                    targetRect.owner = currentPlayer;
                    currentMsg = `⚔️ ЗАХВАТ! Вы отобрали прямоугольник ${w}×${h} у ${getPlayerName(targetRect.owner)}`;
                    return true;
                } else {
                    currentMsg = "❌ Захват невозможен: вражеский прямоугольник не касается вашей территории (нет общей стороны)";
                    updateUI();
                    return false;
                }
            } else if(targetRect && targetRect.owner === currentPlayer) {
                currentMsg = "❌ Это ваш прямоугольник! Нельзя захватить самого себя.";
                updateUI();
                return false;
            } else {
                currentMsg = "❌ Невозможно: эта область частично перекрыта или не совпадает с существующим прямоугольником. Выберите целый чужой прямоугольник или пустое место.";
                updateUI();
                return false;
            }
        }
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
            ctx.fillStyle = PLAYER_COLORS[rect.owner];
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
        currentMsg = "Новая игра! Игрок 1 (красный) начинает. Бросьте кубики.";
        rollBtn.disabled = false;
        skipBtn.disabled = false;
        cancelBtn.disabled = false;
        updateUI();
        drawBoard();
    }
    
    function handleKey(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!rollBtn.disabled) rollDice();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelSelection();
        } else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            newGame();
        } else if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            skipTurn();
        }
    }
    
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', () => { ghostX = -1; drawBoard(); });
    rollBtn.addEventListener('click', rollDice);
    skipBtn.addEventListener('click', skipTurn);
    cancelBtn.addEventListener('click', cancelSelection);
    resetBtn.addEventListener('click', newGame);
    window.addEventListener('keydown', handleKey);
    
    newGame();
})();
