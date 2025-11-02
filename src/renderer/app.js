// app.js - Versión completa con todas las mejoras
// Copia este archivo en src/renderer/app.js

class SudokuSolver {
  constructor(board) {
    this.board = board.map(row => [...row]);
    this.solutions = [];
  }

  isValid(row, col, num) {
    for (let x = 0; x < 9; x++) {
      if (this.board[row][x] === num) return false;
      if (this.board[x][col] === num) return false;
    }
    const startRow = row - row % 3;
    const startCol = col - col % 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.board[i + startRow][j + startCol] === num) return false;
      }
    }
    return true;
  }

  solve(limitSolutions = false) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this.board[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (this.isValid(row, col, num)) {
              this.board[row][col] = num;
              if (this.solve(limitSolutions)) {
                if (limitSolutions && this.solutions.length > 1) {
                  this.board[row][col] = 0;
                  return true;
                }
              }
              this.board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    this.solutions.push(this.board.map(row => [...row]));
    return true;
  }

  hasUniqueSolution() {
    this.solutions = [];
    this.solve(true);
    return this.solutions.length === 1;
  }
}

class SudokuGenerator {
  generateComplete() {
    const board = Array(9).fill(null).map(() => Array(9).fill(0));
    for (let box = 0; box < 9; box += 3) {
      const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
      let idx = 0;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          board[box + i][box + j] = nums[idx++];
        }
      }
    }
    const solver = new SudokuSolver(board);
    solver.solve();
    return solver.solutions[0];
  }

  generate(difficulty, seed = null) {
    if (seed) Math.seedrandom(seed); // Para daily challenge
    
    const settings = {
      easy: { minClues: 40, maxClues: 45 },
      medium: { minClues: 32, maxClues: 35 },
      hard: { minClues: 28, maxClues: 31 },
      expert: { minClues: 24, maxClues: 27 },
      master: { minClues: 22, maxClues: 24 }
    }[difficulty];

    const solution = this.generateComplete();
    const puzzle = solution.map(row => [...row]);
    const positions = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) positions.push([i, j]);
    }
    positions.sort(() => Math.random() - 0.5);
    
    let clues = 81;
    for (const [row, col] of positions) {
      if (clues <= settings.minClues) break;
      const backup = puzzle[row][col];
      puzzle[row][col] = 0;
      const solver = new SudokuSolver(puzzle);
      if (!solver.hasUniqueSolution()) {
        puzzle[row][col] = backup;
        continue;
      }
      clues--;
    }
    return { puzzle, solution, clues };
  }
}

// Sistema de sonidos
class SoundSystem {
  constructor() {
    this.enabled = JSON.parse(localStorage.getItem('sudoku-sound') || 'true');
    this.audioContext = null;
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playTone(frequency, duration, type = 'sine') {
    if (!this.enabled) return;
    this.init();
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  click() { this.playTone(800, 0.05); }
  input() { this.playTone(600, 0.1); }
  error() { this.playTone(200, 0.2, 'sawtooth'); }
  hint() { this.playTone(1000, 0.15); }
  complete() {
    this.playTone(523, 0.15); // C
    setTimeout(() => this.playTone(659, 0.15), 150); // E
    setTimeout(() => this.playTone(784, 0.3), 300); // G
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('sudoku-sound', JSON.stringify(this.enabled));
  }
}

// Estado del juego
const gameState = {
  currentPuzzle: null,
  userBoard: null,
  selectedCell: null,
  timer: 0,
  mistakes: 0,
  hintsUsed: 0,
  difficulty: 'medium',
  timerInterval: null,
  theme: localStorage.getItem('sudoku-theme') || 'dark',
  moveHistory: [], // Para deshacer
  stats: JSON.parse(localStorage.getItem('sudoku-stats') || '{"gamesWon":0,"bestTime":"--:--","streak":0,"totalTime":0}'),
  savedGames: JSON.parse(localStorage.getItem('sudoku-saved') || '[]'),
  dailyChallenge: JSON.parse(localStorage.getItem('sudoku-daily') || 'null'),
  sound: new SoundSystem()
};

// Temas
const themes = {
  dark: {
    bg: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    cardBg: 'rgba(255,255,255,0.1)',
    text: 'white',
    menuBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  light: {
    bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)',
    cardBg: 'rgba(255,255,255,0.9)',
    text: '#1e293b',
    menuBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  forest: {
    bg: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
    cardBg: 'rgba(255,255,255,0.1)',
    text: 'white',
    menuBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
  }
};

// Utilidades
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function saveStats() {
  localStorage.setItem('sudoku-stats', JSON.stringify(gameState.stats));
}

function saveGame() {
  if (!gameState.currentPuzzle) return;
  
  const saved = {
    id: Date.now(),
    puzzle: gameState.currentPuzzle,
    userBoard: gameState.userBoard,
    difficulty: gameState.difficulty,
    timer: gameState.timer,
    mistakes: gameState.mistakes,
    hintsUsed: gameState.hintsUsed,
    date: new Date().toLocaleString(),
    moveHistory: gameState.moveHistory
  };
  
  gameState.savedGames.unshift(saved);
  gameState.savedGames = gameState.savedGames.slice(0, 5); // Mantener solo 5
  localStorage.setItem('sudoku-saved', JSON.stringify(gameState.savedGames));
  gameState.sound.hint();
  alert('✅ Partida guardada correctamente');
}

function loadGame(id) {
  const saved = gameState.savedGames.find(g => g.id === id);
  if (!saved) return;
  
  gameState.currentPuzzle = saved.puzzle;
  gameState.userBoard = saved.userBoard;
  gameState.difficulty = saved.difficulty;
  gameState.timer = saved.timer;
  gameState.mistakes = saved.mistakes;
  gameState.hintsUsed = saved.hintsUsed;
  gameState.moveHistory = saved.moveHistory || [];
  
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  gameState.timerInterval = setInterval(() => {
    gameState.timer++;
    updateTimer();
  }, 1000);
  
  gameState.sound.click();
  renderGame();
}

function getDailyChallenge() {
  const today = new Date().toDateString();
  
  if (gameState.dailyChallenge && gameState.dailyChallenge.date === today) {
    return gameState.dailyChallenge;
  }
  
  // Generar nuevo daily challenge
  const seed = today; // Mismo seed = mismo puzzle
  const generator = new SudokuGenerator();
  const puzzle = generator.generate('hard', seed);
  
  const daily = {
    date: today,
    puzzle: puzzle,
    completed: false,
    time: null
  };
  
  gameState.dailyChallenge = daily;
  localStorage.setItem('sudoku-daily', JSON.stringify(daily));
  return daily;
}

function toggleTheme() {
  const themeKeys = Object.keys(themes);
  const currentIndex = themeKeys.indexOf(gameState.theme);
  const nextIndex = (currentIndex + 1) % themeKeys.length;
  gameState.theme = themeKeys[nextIndex];
  localStorage.setItem('sudoku-theme', gameState.theme);
  
  // Re-renderizar la pantalla actual
  if (gameState.currentPuzzle) {
    renderGame();
  } else {
    renderMenu();
  }
}

// Funciones del juego
function startNewGame(difficulty, isDailyChallenge = false) {
  gameState.difficulty = difficulty;
  
  if (isDailyChallenge) {
    const daily = getDailyChallenge();
    if (daily.completed) {
      alert('Ya completaste el reto diario de hoy 🎉\n¡Vuelve mañana!');
      return;
    }
    gameState.currentPuzzle = daily.puzzle;
  } else {
    const generator = new SudokuGenerator();
    gameState.currentPuzzle = generator.generate(difficulty);
  }
  
  gameState.userBoard = gameState.currentPuzzle.puzzle.map(row => [...row]);
  gameState.selectedCell = null;
  gameState.timer = 0;
  gameState.mistakes = 0;
  gameState.hintsUsed = 0;
  gameState.moveHistory = [];
  
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  gameState.timerInterval = setInterval(() => {
    gameState.timer++;
    updateTimer();
  }, 1000);
  
  gameState.sound.click();
  renderGame();
}

function selectCell(row, col) {
  if (gameState.currentPuzzle.puzzle[row][col] !== 0) return;
  gameState.selectedCell = [row, col];
  gameState.sound.click();
  renderBoard();
}

function inputNumber(num) {
  if (!gameState.selectedCell) return;
  const [row, col] = gameState.selectedCell;
  if (gameState.currentPuzzle.puzzle[row][col] !== 0) return;
  
  // Guardar en historial
  gameState.moveHistory.push({
    row,
    col,
    oldValue: gameState.userBoard[row][col],
    newValue: num
  });
  
  gameState.userBoard[row][col] = gameState.userBoard[row][col] === num ? 0 : num;
  
  if (num !== 0 && num !== gameState.currentPuzzle.solution[row][col]) {
    gameState.mistakes++;
    gameState.sound.error();
    updateMistakes();
  } else {
    gameState.sound.input();
  }
  
  renderBoard();
  checkWin();
}

function checkWin() {
  const isComplete = gameState.userBoard.every((row, i) => 
    row.every((cell, j) => cell === gameState.currentPuzzle.solution[i][j])
  );
  
  if (isComplete) {
    clearInterval(gameState.timerInterval);
    gameState.stats.gamesWon++;
    gameState.stats.streak++;
    gameState.stats.totalTime += gameState.timer;
    
    if (gameState.stats.bestTime === '--:--') {
      gameState.stats.bestTime = formatTime(gameState.timer);
    } else {
      const currentBest = parseInt(gameState.stats.bestTime.split(':')[0]) * 60 + 
                         parseInt(gameState.stats.bestTime.split(':')[1]);
      if (gameState.timer < currentBest) {
        gameState.stats.bestTime = formatTime(gameState.timer);
      }
    }
    
    // Marcar daily challenge como completado
    if (gameState.dailyChallenge && !gameState.dailyChallenge.completed) {
      gameState.dailyChallenge.completed = true;
      gameState.dailyChallenge.time = gameState.timer;
      localStorage.setItem('sudoku-daily', JSON.stringify(gameState.dailyChallenge));
    }
    
    saveStats();
    gameState.sound.complete();
    showWinScreen();
  }
}

function getHint() {
  if (!gameState.selectedCell) {
    alert('Selecciona una celda primero');
    return;
  }
  const [row, col] = gameState.selectedCell;
  if (gameState.currentPuzzle.puzzle[row][col] !== 0) return;
  
  gameState.userBoard[row][col] = gameState.currentPuzzle.solution[row][col];
  gameState.hintsUsed++;
  gameState.sound.hint();
  renderBoard();
  updateHints();
  checkWin();
}

function undoMove() {
  if (gameState.moveHistory.length === 0) {
    alert('No hay movimientos para deshacer');
    return;
  }
  
  const lastMove = gameState.moveHistory.pop();
  gameState.userBoard[lastMove.row][lastMove.col] = lastMove.oldValue;
  gameState.sound.click();
  renderBoard();
}

// Manejo de teclado
document.addEventListener('keydown', (e) => {
  if (!gameState.currentPuzzle) return;
  
  // Números 1-9
  if (e.key >= '1' && e.key <= '9') {
    inputNumber(parseInt(e.key));
  }
  
  // Backspace o Delete para borrar
  if (e.key === 'Backspace' || e.key === 'Delete') {
    inputNumber(0);
  }
  
  // Flechas para navegar
  if (gameState.selectedCell) {
    const [row, col] = gameState.selectedCell;
    let newRow = row;
    let newCol = col;
    
    if (e.key === 'ArrowUp' && row > 0) newRow--;
    if (e.key === 'ArrowDown' && row < 8) newRow++;
    if (e.key === 'ArrowLeft' && col > 0) newCol--;
    if (e.key === 'ArrowRight' && col < 8) newCol++;
    
    if (newRow !== row || newCol !== col) {
      selectCell(newRow, newCol);
    }
  }
  
  // Ctrl+Z para deshacer
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    undoMove();
  }
  
  // Ctrl+S para guardar
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveGame();
  }
  
  // H para hint
  if (e.key === 'h' || e.key === 'H') {
    getHint();
  }
});

// Funciones de renderizado
function renderMenu() {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="min-height: 100vh; background: ${theme.menuBg}; display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div style="max-width: 1200px; width: 100%;">
        <div style="text-align: center; margin-bottom: 60px;">
          <h1 style="font-size: 72px; font-weight: bold; color: white; margin: 0 0 20px 0; letter-spacing: -2px;">SUDOKU PRO</h1>
          <p style="font-size: 24px; color: rgba(255,255,255,0.9);">Lógica pura. Solución única garantizada.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 40px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 28px; font-weight: bold; color: white; margin-bottom: 30px;">🎮 Nueva Partida</h2>
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <button onclick="startNewGame('easy', true)" style="
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                padding: 20px 30px;
                border: none;
                border-radius: 15px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                🏆 Reto Diario
              </button>
              ${['easy', 'medium', 'hard', 'expert', 'master'].map(diff => `
                <button onclick="startNewGame('${diff}')" style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 20px 30px;
                  border: none;
                  border-radius: 15px;
                  font-size: 18px;
                  font-weight: bold;
                  cursor: pointer;
                  transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                  ${diff === 'easy' ? '⭐ Fácil' : ''}
                  ${diff === 'medium' ? '⭐⭐ Medio' : ''}
                  ${diff === 'hard' ? '⭐⭐⭐ Difícil' : ''}
                  ${diff === 'expert' ? '⭐⭐⭐⭐ Experto' : ''}
                  ${diff === 'master' ? '⭐⭐⭐⭐⭐ Maestro' : ''}
                </button>
              `).join('')}
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 40px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 28px; font-weight: bold; color: white; margin-bottom: 30px;">📊 Estadísticas</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 20px; text-align: center;">
                <div style="font-size: 48px; font-weight: bold; color: white;">${gameState.stats.gamesWon}</div>
                <div style="color: rgba(255,255,255,0.9); font-size: 14px;">Completados</div>
              </div>
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 20px; text-align: center;">
                <div style="font-size: 48px; font-weight: bold; color: white;">${gameState.stats.bestTime}</div>
                <div style="color: rgba(255,255,255,0.9); font-size: 14px;">Mejor tiempo</div>
              </div>
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 20px; text-align: center; grid-column: span 2;">
                <div style="font-size: 48px; font-weight: bold; color: white;">${gameState.stats.streak} 🔥</div>
                <div style="color: rgba(255,255,255,0.9); font-size: 14px;">Racha actual</div>
              </div>
            </div>
          </div>
        </div>

        ${gameState.savedGames.length > 0 ? `
        <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 40px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 40px;">
          <h2 style="font-size: 28px; font-weight: bold; color: white; margin-bottom: 20px;">💾 Partidas Guardadas</h2>
          <div style="display: grid; gap: 15px;">
            ${gameState.savedGames.map(game => `
              <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div style="color: white;">
                  <div style="font-weight: bold; font-size: 18px;">${game.difficulty.toUpperCase()}</div>
                  <div style="font-size: 14px; opacity: 0.8;">${game.date} • ${formatTime(game.timer)} • ${game.mistakes} errores</div>
                </div>
                <button onclick="loadGame(${game.id})" style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 12px 24px;
                  border: none;
                  border-radius: 10px;
                  font-weight: bold;
                  cursor: pointer;
                ">Cargar</button>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 40px; border: 1px solid rgba(255,255,255,0.2);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="font-size: 28px; font-weight: bold; color: white; margin: 0;">⚙️ Configuración</h2>
            <div style="display: flex; gap: 15px;">
              <button onclick="toggleTheme()" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
              ">🎨 Tema: ${gameState.theme}</button>
              <button onclick="gameState.sound.toggle(); renderMenu();" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 12px 24px;
                border: none;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
              ">${gameState.sound.enabled ? '🔊' : '🔇'} Sonido</button>
            </div>
          </div>
          <div style="color: white; font-size: 16px; line-height: 1.8;">
            <strong>⌨️ Atajos de teclado:</strong><br>
            • 1-9: Ingresar números<br>
            • Flechas: Navegar por el tablero<br>
            • Backspace/Delete: Borrar<br>
            • Ctrl+Z: Deshacer<br>
            • Ctrl+S: Guardar partida<br>
            • H: Pista
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderGame() {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="min-height: 100vh; background: ${theme.bg}; padding: 40px;">
      <div style="max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: 1fr 350px; gap: 40px;">
        <div>
          <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 30px; padding: 40px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
              <div style="display: flex; align-items: center; gap: 20px;">
                <button onclick="renderMenu()" style="background: rgba(255,255,255,0.2); border: none; padding: 15px 20px; border-radius: 15px; cursor: pointer; font-size: 24px;">🏠</button>
                <div style="color: ${theme.text};">
                  <div style="font-size: 28px; font-weight: bold; text-transform: uppercase;">${gameState.difficulty}</div>
                  <div style="font-size: 14px; opacity: 0.8;">${gameState.currentPuzzle.clues} pistas iniciales</div>
                </div>
              </div>
              <div style="text-align: right; color: ${theme.text};">
                <div id="timer" style="font-size: 48px; font-weight: bold;">${formatTime(gameState.timer)}</div>
                <div id="mistakes" style="font-size: 14px; opacity: 0.8;">Errores: ${gameState.mistakes}</div>
              </div>
            </div>
            <div style="display: flex; justify-content: center;">
              <div id="board"></div>
            </div>
          </div>

          <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 30px; padding: 30px; border: 1px solid rgba(255,255,255,0.2);">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
              <button onclick="undoMove()" style="background: rgba(249,115,22,0.8); color: white; padding: 15px; border: none; border-radius: 15px; font-size: 16px; font-weight: bold; cursor: pointer;">↶ Deshacer (Ctrl+Z)</button>
              <button onclick="getHint()" style="background: rgba(234,179,8,0.8); color: white; padding: 15px; border: none; border-radius: 15px; font-size: 16px; font-weight: bold; cursor: pointer;">💡 Pista (<span id="hints">${gameState.hintsUsed}</span>) [H]</button>
              <button onclick="saveGame()" style="background: rgba(16,185,129,0.8); color: white; padding: 15px; border: none; border-radius: 15px; font-size: 16px; font-weight: bold; cursor: pointer;">💾 Guardar (Ctrl+S)</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
              ${[1,2,3,4,5,6,7,8,9].map(num => `
                <button onclick="inputNumber(${num})" style="background: rgba(102, 126, 234, 0.8); color: white; padding: 20px; border: none; border-radius: 15px; font-size: 24px; font-weight: bold; cursor: pointer; transition: transform 0.1s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">${num}</button>
              `).join('')}
              <button onclick="inputNumber(0)" style="background: rgba(239,68,68,0.8); color: white; padding: 20px; border: none; border-radius: 15px; font-size: 20px; font-weight: bold; cursor: pointer;">✕</button>
            </div>
          </div>
        </div>

        <div>
          <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 30px; padding: 30px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 20px;">
            <h3 style="font-size: 20px; font-weight: bold; color: ${theme.text}; margin-bottom: 20px;">📊 Progreso</h3>
            <div style="background: rgba(102, 126, 234, 0.1); padding: 20px; border-radius: 15px; text-align: center; margin-bottom: 15px;">
              <div style="color: ${theme.text}; font-size: 14px; margin-bottom: 5px;">Racha actual</div>
              <div style="font-size: 40px; font-weight: bold; color: ${theme.text};">${gameState.stats.streak} 🔥</div>
            </div>
            <div style="background: rgba(16, 185, 129, 0.1); padding: 20px; border-radius: 15px; text-align: center;">
              <div style="color: ${theme.text}; font-size: 14px; margin-bottom: 5px;">Movimientos</div>
              <div style="font-size: 32px; font-weight: bold; color: ${theme.text};">${gameState.moveHistory.length}</div>
            </div>
          </div>
          
          <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 30px; padding: 30px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 20px;">
            <h3 style="font-size: 20px; font-weight: bold; color: ${theme.text}; margin-bottom: 20px;">⚙️ Opciones</h3>
            <button onclick="toggleTheme()" style="
              background: rgba(102, 126, 234, 0.2);
              color: ${theme.text};
              padding: 12px 20px;
              border: none;
              border-radius: 10px;
              font-weight: bold;
              cursor: pointer;
              width: 100%;
              margin-bottom: 10px;
            ">🎨 Cambiar tema</button>
            <button onclick="gameState.sound.toggle(); renderGame();" style="
              background: rgba(102, 126, 234, 0.2);
              color: ${theme.text};
              padding: 12px 20px;
              border: none;
              border-radius: 10px;
              font-weight: bold;
              cursor: pointer;
              width: 100%;
            ">${gameState.sound.enabled ? '🔊' : '🔇'} ${gameState.sound.enabled ? 'Silenciar' : 'Activar sonido'}</button>
          </div>

          <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 30px; padding: 30px; border: 1px solid rgba(255,255,255,0.2);">
            <h3 style="font-size: 20px; font-weight: bold; color: ${theme.text}; margin-bottom: 20px;">🎯 Técnicas básicas</h3>
            <div style="color: ${theme.text}; font-size: 14px; line-height: 1.8; opacity: 0.9;">
              <p style="margin: 0 0 12px 0;"><strong>Naked Single:</strong> Si una celda solo puede tener un número, ponlo.</p>
              <p style="margin: 0 0 12px 0;"><strong>Hidden Single:</strong> Si un número solo puede ir en una celda de su fila/columna/cuadro, ponlo.</p>
              <p style="margin: 0;"><strong>Eliminación:</strong> Descarta números que ya están en la misma fila, columna o cuadro.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  renderBoard();
}

function renderBoard() {
  const boardEl = document.getElementById('board');
  if (!boardEl) return;
  
  const theme = themes[gameState.theme];
  let html = '<div style="display: inline-block; background: #1f2937; padding: 4px; border-radius: 15px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">';
  
  for (let i = 0; i < 9; i++) {
    html += '<div style="display: flex;">';
    for (let j = 0; j < 9; j++) {
      const isGiven = gameState.currentPuzzle.puzzle[i][j] !== 0;
      const isSelected = gameState.selectedCell && gameState.selectedCell[0] === i && gameState.selectedCell[1] === j;
      const userValue = gameState.userBoard[i][j];
      const displayValue = isGiven ? gameState.currentPuzzle.puzzle[i][j] : userValue;
      
      const isError = !isGiven && userValue !== 0 && userValue !== gameState.currentPuzzle.solution[i][j];
      
      let bgColor = isSelected ? '#93c5fd' : (isGiven ? '#f3f4f6' : (isError ? '#fecaca' : 'white'));
      let textColor = isGiven ? '#1f2937' : (isError ? '#dc2626' : '#2563eb');
      let borderRight = (j % 3 === 2 && j !== 8) ? '3px solid #1f2937' : '1px solid #d1d5db';
      let borderBottom = (i % 3 === 2 && i !== 8) ? '3px solid #1f2937' : '1px solid #d1d5db';
      
      html += `
        <div onclick="selectCell(${i}, ${j})" style="
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          background: ${bgColor};
          color: ${textColor};
          border-right: ${borderRight};
          border-bottom: ${borderBottom};
          cursor: ${isGiven ? 'default' : 'pointer'};
          transition: all 0.15s;
          ${isSelected ? 'box-shadow: inset 0 0 0 3px #3b82f6;' : ''}
        ">${displayValue || ''}</div>
      `;
    }
    html += '</div>';
  }
  html += '</div>';
  boardEl.innerHTML = html;
}

function updateTimer() {
  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.textContent = formatTime(gameState.timer);
}

function updateMistakes() {
  const mistakesEl = document.getElementById('mistakes');
  if (mistakesEl) mistakesEl.textContent = `Errores: ${gameState.mistakes}`;
}

function updateHints() {
  const hintsEl = document.getElementById('hints');
  if (hintsEl) hintsEl.textContent = gameState.hintsUsed;
}

function showWinScreen() {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  const avgTime = gameState.stats.gamesWon > 0 ? 
    formatTime(Math.floor(gameState.stats.totalTime / gameState.stats.gamesWon)) : '--:--';
  
  root.innerHTML = `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #059669 0%, #047857 100%); display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div style="max-width: 800px; width: 100%; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 60px; border: 1px solid rgba(255,255,255,0.2); text-align: center;">
        <div style="font-size: 120px; margin-bottom: 30px; animation: bounce 1s;">🏆</div>
        <h1 style="font-size: 60px; font-weight: bold; color: white; margin: 0 0 20px 0;">¡Victoria!</h1>
        <div style="font-size: 32px; color: rgba(255,255,255,0.9); margin-bottom: 50px;">Sudoku completado</div>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px;">
          <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 20px;">
            <div style="font-size: 40px; font-weight: bold; color: white;">${formatTime(gameState.timer)}</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Tiempo</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 20px;">
            <div style="font-size: 40px; font-weight: bold; color: white;">${gameState.mistakes}</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Errores</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 20px;">
            <div style="font-size: 40px; font-weight: bold; color: white;">${gameState.hintsUsed}</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Pistas</div>
          </div>
        </div>

        <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 20px; margin-bottom: 40px;">
          <h3 style="color: white; font-size: 24px; margin-bottom: 20px;">📊 Tus estadísticas</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; color: white;">
            <div>
              <div style="font-size: 28px; font-weight: bold;">${gameState.stats.gamesWon}</div>
              <div style="font-size: 14px; opacity: 0.8;">Juegos ganados</div>
            </div>
            <div>
              <div style="font-size: 28px; font-weight: bold;">${gameState.stats.bestTime}</div>
              <div style="font-size: 14px; opacity: 0.8;">Mejor tiempo</div>
            </div>
            <div>
              <div style="font-size: 28px; font-weight: bold;">${avgTime}</div>
              <div style="font-size: 14px; opacity: 0.8;">Tiempo promedio</div>
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 15px;">
          <button onclick="startNewGame('${gameState.difficulty}')" style="
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 20px 40px;
            border: none;
            border-radius: 15px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🎮 Jugar de nuevo (${gameState.difficulty.toUpperCase()})</button>
          <button onclick="renderMenu()" style="
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 20px 40px;
            border: none;
            border-radius: 15px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🏠 Menú principal</button>
        </div>
      </div>
    </div>
    <style>
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-30px); }
      }
    </style>
  `;
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
}); 