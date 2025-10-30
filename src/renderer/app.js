// app.js - Versión JavaScript vanilla (sin React)
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

  generate(difficulty) {
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
  stats: JSON.parse(localStorage.getItem('sudoku-stats') || '{"gamesWon":0,"bestTime":"--:--","streak":0}')
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

// Funciones del juego
function startNewGame(difficulty) {
  gameState.difficulty = difficulty;
  const generator = new SudokuGenerator();
  gameState.currentPuzzle = generator.generate(difficulty);
  gameState.userBoard = gameState.currentPuzzle.puzzle.map(row => [...row]);
  gameState.selectedCell = null;
  gameState.timer = 0;
  gameState.mistakes = 0;
  gameState.hintsUsed = 0;
  
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  gameState.timerInterval = setInterval(() => {
    gameState.timer++;
    updateTimer();
  }, 1000);
  
  renderGame();
}

function selectCell(row, col) {
  if (gameState.currentPuzzle.puzzle[row][col] !== 0) return;
  gameState.selectedCell = [row, col];
  renderBoard();
}

function inputNumber(num) {
  if (!gameState.selectedCell) return;
  const [row, col] = gameState.selectedCell;
  if (gameState.currentPuzzle.puzzle[row][col] !== 0) return;
  
  gameState.userBoard[row][col] = gameState.userBoard[row][col] === num ? 0 : num;
  
  if (num !== 0 && num !== gameState.currentPuzzle.solution[row][col]) {
    gameState.mistakes++;
    updateMistakes();
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
    
    if (gameState.stats.bestTime === '--:--') {
      gameState.stats.bestTime = formatTime(gameState.timer);
    } else {
      const currentBest = parseInt(gameState.stats.bestTime.split(':')[0]) * 60 + 
                         parseInt(gameState.stats.bestTime.split(':')[1]);
      if (gameState.timer < currentBest) {
        gameState.stats.bestTime = formatTime(gameState.timer);
      }
    }
    
    saveStats();
    showWinScreen();
  }
}

function getHint() {
  if (!gameState.selectedCell) return;
  const [row, col] = gameState.selectedCell;
  if (gameState.currentPuzzle.puzzle[row][col] !== 0) return;
  
  gameState.userBoard[row][col] = gameState.currentPuzzle.solution[row][col];
  gameState.hintsUsed++;
  renderBoard();
  updateHints();
}

function undoMove() {
  if (!gameState.selectedCell) return;
  const [row, col] = gameState.selectedCell;
  if (gameState.currentPuzzle.puzzle[row][col] !== 0) return;
  
  gameState.userBoard[row][col] = 0;
  renderBoard();
}

// Funciones de renderizado
function renderMenu() {
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div style="max-width: 1200px; width: 100%;">
        <div style="text-align: center; margin-bottom: 60px;">
          <h1 style="font-size: 72px; font-weight: bold; color: white; margin: 0 0 20px 0; letter-spacing: -2px;">SUDOKU PRO</h1>
          <p style="font-size: 24px; color: rgba(255,255,255,0.9);">Lógica pura. Solución única garantizada.</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 40px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 28px; font-weight: bold; color: white; margin-bottom: 30px;">🎮 Nueva Partida</h2>
            <div style="display: flex; flex-direction: column; gap: 16px;">
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

        <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 40px; border: 1px solid rgba(255,255,255,0.2);">
          <h2 style="font-size: 28px; font-weight: bold; color: white; margin-bottom: 20px;">✨ Características</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; color: white;">
            <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 20px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🧠</div>
              <div style="font-weight: 600; margin-bottom: 5px;">Solo Lógica</div>
              <div style="font-size: 14px; opacity: 0.8;">Sin adivinanzas</div>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 20px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">⚡</div>
              <div style="font-weight: 600; margin-bottom: 5px;">Sistema de Pistas</div>
              <div style="font-size: 14px; opacity: 0.8;">Cuando lo necesites</div>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 20px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🏆</div>
              <div style="font-weight: 600; margin-bottom: 5px;">Seguimiento</div>
              <div style="font-size: 14px; opacity: 0.8;">Estadísticas detalladas</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderGame() {
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 40px;">
      <div style="max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: 1fr 350px; gap: 40px;">
        <div>
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 40px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
              <div style="display: flex; align-items: center; gap: 20px;">
                <button onclick="renderMenu()" style="background: rgba(255,255,255,0.2); border: none; padding: 15px 20px; border-radius: 15px; cursor: pointer; font-size: 24px;">🏠</button>
                <div style="color: white;">
                  <div style="font-size: 28px; font-weight: bold; text-transform: uppercase;">${gameState.difficulty}</div>
                  <div style="font-size: 14px; opacity: 0.8;">${gameState.currentPuzzle.clues} pistas</div>
                </div>
              </div>
              <div style="text-align: right; color: white;">
                <div id="timer" style="font-size: 48px; font-weight: bold;">${formatTime(gameState.timer)}</div>
                <div id="mistakes" style="font-size: 14px; opacity: 0.8;">Errores: ${gameState.mistakes}</div>
              </div>
            </div>
            <div style="display: flex; justify-content: center;">
              <div id="board"></div>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 30px; border: 1px solid rgba(255,255,255,0.2);">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
              <button onclick="undoMove()" style="background: rgba(249,115,22,0.8); color: white; padding: 15px; border: none; border-radius: 15px; font-size: 16px; font-weight: bold; cursor: pointer;">↶ Deshacer</button>
              <button onclick="getHint()" style="background: rgba(234,179,8,0.8); color: white; padding: 15px; border: none; border-radius: 15px; font-size: 16px; font-weight: bold; cursor: pointer;">💡 Pista (<span id="hints">${gameState.hintsUsed}</span>)</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
              ${[1,2,3,4,5,6,7,8,9].map(num => `
                <button onclick="inputNumber(${num})" style="background: rgba(255,255,255,0.2); color: white; padding: 20px; border: none; border-radius: 15px; font-size: 24px; font-weight: bold; cursor: pointer;">${num}</button>
              `).join('')}
              <button onclick="inputNumber(0)" style="background: rgba(239,68,68,0.8); color: white; padding: 20px; border: none; border-radius: 15px; font-size: 20px; font-weight: bold; cursor: pointer;">✕</button>
            </div>
          </div>
        </div>

        <div>
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 30px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 20px;">
            <h3 style="font-size: 20px; font-weight: bold; color: white; margin-bottom: 20px;">📊 Progreso</h3>
            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px; text-align: center;">
              <div style="color: white; font-size: 14px; margin-bottom: 5px;">Racha actual</div>
              <div style="font-size: 40px; font-weight: bold; color: white;">${gameState.stats.streak} 🔥</div>
            </div>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 30px; border: 1px solid rgba(255,255,255,0.2);">
            <h3 style="font-size: 20px; font-weight: bold; color: white; margin-bottom: 20px;">🎯 Consejos</h3>
            <div style="color: rgba(255,255,255,0.8); font-size: 14px; line-height: 1.6;">
              <p style="margin: 0 0 10px 0;">• Busca números únicos en filas, columnas y cuadrantes</p>
              <p style="margin: 0 0 10px 0;">• Usa el proceso de eliminación</p>
              <p style="margin: 0;">• No adivines, usa solo lógica</p>
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
  
  let html = '<div style="display: inline-block; background: #1f2937; padding: 4px; border-radius: 15px;">';
  
  for (let i = 0; i < 9; i++) {
    html += '<div style="display: flex;">';
    for (let j = 0; j < 9; j++) {
      const isGiven = gameState.currentPuzzle.puzzle[i][j] !== 0;
      const isSelected = gameState.selectedCell && gameState.selectedCell[0] === i && gameState.selectedCell[1] === j;
      const userValue = gameState.userBoard[i][j];
      const displayValue = isGiven ? gameState.currentPuzzle.puzzle[i][j] : userValue;
      
      let bgColor = isSelected ? '#93c5fd' : (isGiven ? '#f3f4f6' : 'white');
      let textColor = isGiven ? '#1f2937' : '#2563eb';
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
          transition: background 0.2s;
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
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #059669 0%, #047857 100%); display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div style="max-width: 800px; width: 100%; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 60px; border: 1px solid rgba(255,255,255,0.2); text-align: center;">
        <div style="font-size: 120px; margin-bottom: 30px;">🏆</div>
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
          ">🎮 Jugar de nuevo</button>
          <button onclick="renderMenu()" style="
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 20px 40px;
            border: none;
            border-radius: 15px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
          ">🏠 Menú principal</button>
        </div>
      </div>
    </div>
  `;
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
});