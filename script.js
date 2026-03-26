const boardElement = document.getElementById('board');
const mineCountDisplay = document.getElementById('mine-count');
const timerDisplay = document.getElementById('timer');
const resetBtn = document.getElementById('reset-btn');
const modal = document.getElementById('modal');

let ROWS, COLS, MINES_COUNT;
let board = [];
let gameOver = false;
let minesPlaced = false;
let timerInterval;
let seconds = 0;
let cellSize = 35;
let flagsPlaced = 0;


document.addEventListener('contextmenu', (e) => e.preventDefault());

// --- DIFICULTAD Y CONFIGURACIÓN ---
function setDifficulty(level) {
    if (level === 'beginner') { ROWS = 9; COLS = 9; MINES_COUNT = 10; }
    else if (level === 'intermediate') { ROWS = 16; COLS = 16; MINES_COUNT = 40; }
    else if (level === 'expert') { ROWS = 16; COLS = 30; MINES_COUNT = 99; }
    else {
        ROWS = parseInt(document.getElementById('custom-rows').value) || 10;
        COLS = parseInt(document.getElementById('custom-cols').value) || 10;
        MINES_COUNT = parseInt(document.getElementById('custom-mines').value) || 10;
    }
    modal.classList.add('hidden');
    initGame();
}

function toggleCustom() { document.getElementById('custom-form').classList.toggle('hidden'); }

function changeZoom(val) {
    cellSize = Math.max(20, Math.min(80, cellSize + val));
    document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);
}

// --- LÓGICA DEL JUEGO ---
function initGame() {
    clearInterval(timerInterval);
    seconds = 0;
    flagsPlaced = 0;
    gameOver = false;
    minesPlaced = false;
    board = [];
    boardElement.innerHTML = '';
    timerDisplay.textContent = "000";
    mineCountDisplay.textContent = MINES_COUNT.toString().padStart(3, '0');
    resetBtn.textContent = '😊';

    boardElement.style.gridTemplateColumns = `repeat(${COLS}, var(--cell-size))`;

    for (let r = 0; r < ROWS; r++) {
        board[r] = [];
        for (let c = 0; c < COLS; c++) {
            const el = document.createElement('div');
            el.classList.add('cell');
            el.addEventListener('click', () => handleClick(r, c));
            el.addEventListener('contextmenu', (e) => { e.preventDefault(); handleRightClick(r, c); });
            
            boardElement.appendChild(el);
            board[r][c] = { mine: false, revealed: false, flagged: false, count: 0, element: el };
        }
    }
}

function handleClick(r, c) {
    if (gameOver) return;
    const cell = board[r][c];

    // Chording: Si ya está revelada y es un número
    if (cell.revealed && cell.count > 0) {
        return handleChording(r, c);
    }

    if (cell.flagged || cell.revealed) return;

    if (!minesPlaced) {
        placeMines(r, c);
        startTimer();
        minesPlaced = true;
    }

    if (cell.mine) {
        endGame(false);
    } else {
        revealCell(r, c);
        checkWin();
    }
}

// LÓGICA DE CHORDING
function handleChording(r, c) {
    const cell = board[r][c];
    let flagsAround = 0;

    // Contar banderas alrededor
    iterateNeighbors(r, c, (nr, nc) => {
        if (board[nr][nc].flagged) flagsAround++;
    });

    if (flagsAround === cell.count) {
        iterateNeighbors(r, c, (nr, nc) => {
            const neighbor = board[nr][nc];
            if (!neighbor.revealed && !neighbor.flagged) {
                if (neighbor.mine) {
                    endGame(false);
                    return;
                }
                revealCell(nr, nc);
            }
        });
        checkWin();
    }
}

function handleRightClick(r, c) {
    if (gameOver || board[r][c].revealed) return;
    const cell = board[r][c];
    cell.flagged = !cell.flagged;
    cell.element.classList.toggle('flagged');
    flagsPlaced += cell.flagged ? 1 : -1;
    mineCountDisplay.textContent = Math.max(0, MINES_COUNT - flagsPlaced).toString().padStart(3, '0');
}

function placeMines(firstR, firstC) {
    let placed = 0;
    while (placed < MINES_COUNT) {
        let r = Math.floor(Math.random() * ROWS);
        let c = Math.floor(Math.random() * COLS);
        // No poner mina en el primer click ni en sus vecinos (3x3 seguro)
        if (!board[r][c].mine && (Math.abs(r - firstR) > 1 || Math.abs(c - firstC) > 1)) {
            board[r][c].mine = true;
            placed++;
        }
    }

    // Calcular números
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!board[r][c].mine) {
                let count = 0;
                iterateNeighbors(r, c, (nr, nc) => {
                    if (board[nr][nc].mine) count++;
                });
                board[r][c].count = count;
            }
        }
    }
}

function revealCell(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const cell = board[r][c];
    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;
    cell.element.classList.add('revealed');

    if (cell.count > 0) {
        cell.element.textContent = cell.count;
        cell.element.style.color = getNumberColor(cell.count);
    } else {
        iterateNeighbors(r, c, (nr, nc) => revealCell(nr, nc));
    }
}

function iterateNeighbors(r, c, callback) {
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            let nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) callback(nr, nc);
        }
    }
}

function checkWin() {
    const cells = board.flat();
    const safeCells = cells.filter(c => !c.mine);
    if (safeCells.every(c => c.revealed)) endGame(true);
}

function endGame(win) {
    gameOver = true;
    clearInterval(timerInterval);
    resetBtn.textContent = win ? '😎' : '😵';
    
    board.flat().forEach(c => {
        if (c.mine) {
            if(!win){
                c.element.classList.remove('flagged');
                c.element.classList.add('mine');
                c.element.textContent = '💣';
            }
            
            //c.element.textContent = '';
        }
    });

    setTimeout(() => {
        document.getElementById('modal-title').textContent = win ? "¡Victoria! 🎉" : "¡BOOM! 💥";
        document.getElementById('modal-msg').textContent = win ? `Despejaste el campo en ${seconds} segundos.` : "Has pisado una mina.";
        modal.classList.remove('hidden');
    }, 2000);
}

function startTimer() {
    timerInterval = setInterval(() => {
        seconds++;
        timerDisplay.textContent = seconds.toString().padStart(3, '0');
    }, 1000);
}

function getNumberColor(n) {
    return ['#3b82f6', '#10b981', '#ef4444', '#6366f1', '#f59e0b', '#06b6d4', '#111827', '#6b7280'][n - 1];
}

resetBtn.addEventListener('click', () => modal.classList.remove('hidden'));

window.addEventListener('click', (e) => {
    // Si el elemento donde se hizo click es exactamente el overlay (el fondo)
    if (e.target === modal) {
        // Solo lo cerramos si ya hay una partida en curso o iniciada 
        // (para evitar que el usuario se quede sin tablero al abrir la web)
        if (board.length > 0) {
            modal.classList.add('hidden');
        }
    }
});