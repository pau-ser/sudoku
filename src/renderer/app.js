
// API Client
class SudokuAPI {
  static baseURL = 'http://localhost:3000/api';

  static async request(endpoint, options = {}) {
    const token = localStorage.getItem('sudoku-token');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  static async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: userData,
    });
  }

  static async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: credentials,
    });
  }

  static async getProfile() {
    return this.request('/auth/profile');
  }

  // Game endpoints
  static async createGame(gameData) {
    return this.request('/games/new', {
      method: 'POST',
      body: gameData,
    });
  }

  static async makeMove(gameId, moveData) {
    return this.request(`/games/${gameId}/move`, {
      method: 'POST',
      body: moveData,
    });
  }

  static async getGame(gameId) {
    return this.request(`/games/${gameId}`);
  }

  static async getGames() {
    return this.request('/games');
  }

  static async useHint(gameId) {
    return this.request(`/games/${gameId}/hint`, {
      method: 'POST',
    });
  }

  static async undoMove(gameId) {
    return this.request(`/games/${gameId}/undo`, {
      method: 'POST',
    });
  }

  // Leaderboard
  static async getLeaderboard() {
    return this.request('/leaderboard/global');
  }

  static async getDifficultyLeaderboard(difficulty) {
    return this.request(`/leaderboard/difficulty/${difficulty}`);
  }
}

// Generador de Sudoku para modo offline
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
  generateComplete(seed = null) {
    if (seed !== null) Math.seedrandom(seed);
    
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
    const settings = {
      easy: { minClues: 40, maxClues: 45 },
      medium: { minClues: 32, maxClues: 35 },
      hard: { minClues: 28, maxClues: 31 },
      expert: { minClues: 24, maxClues: 27 },
      master: { minClues: 22, maxClues: 24 }
    }[difficulty];

    const solution = this.generateComplete(seed);
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

// Sistema de sonidos mejorado
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
  tick() { this.playTone(1200, 0.03); }
  note() { this.playTone(900, 0.08); }
  complete() {
    this.playTone(523, 0.15);
    setTimeout(() => this.playTone(659, 0.15), 150);
    setTimeout(() => this.playTone(784, 0.3), 300);
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('sudoku-sound', JSON.stringify(this.enabled));
  }
}

// Estado del juego actualizado para Opción 1
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
  moveHistory: [],
  notes: {},
  notesMode: false,
  autoCheck: JSON.parse(localStorage.getItem('sudoku-autocheck') || 'true'),
  expertMode: false,
  timeAttackMode: false,
  timeAttackLimit: 600,
  
  // Propiedades para online
  user: JSON.parse(localStorage.getItem('sudoku-user') || 'null'),
  token: localStorage.getItem('sudoku-token') || null,
  isOnline: false,
  currentGameId: null,
  
  stats: JSON.parse(localStorage.getItem('sudoku-stats') || '{"gamesWon":0,"bestTime":"--:--","streak":0,"totalTime":0,"byDifficulty":{}}'),
  savedGames: JSON.parse(localStorage.getItem('sudoku-saved') || '[]'),
  dailyChallenge: JSON.parse(localStorage.getItem('sudoku-daily') || 'null'),
  leaderboard: JSON.parse(localStorage.getItem('sudoku-leaderboard') || '[]'),
  progressData: JSON.parse(localStorage.getItem('sudoku-progress') || '{"dates":[],"times":[],"accuracies":[]}'),
  customColors: JSON.parse(localStorage.getItem('sudoku-colors') || '{"given":"#f3f4f6","selected":"#93c5fd","user":"#ffffff","error":"#fecaca"}'),
  sound: new SoundSystem(),

  advancedStats: JSON.parse(localStorage.getItem('sudoku-advanced-stats') || `{
    "sessionHistory": [],
    "errorHeatmap": ${JSON.stringify(Array(9).fill(0).map(() => Array(9).fill(0)))},
    "techniqueUsage": {
      "singleCandidate": 0,
      "singlePosition": 0, 
      "candidateLine": 0,
      "doublePair": 0,
      "multipleLines": 0,
      "xWing": 0,
      "swordfish": 0,
      "hiddenPairs": 0
    },
    "timeDistribution": {
      "easy": 0,
      "medium": 0,
      "hard": 0,
      "expert": 0,
      "master": 0
    },
    "improvementTimeline": [],
    "personalBests": {},
    "averageTimes": {
      "easy": null,
      "medium": null,
      "hard": null,
      "expert": null,
      "master": null
    },
    "consistencyScore": 0,
    "totalSessions": 0
  }`),

  tournamentProgress: JSON.parse(localStorage.getItem('sudoku-tournament') || `{
    "currentLevel": 1,
    "lives": 3,
    "completedLevels": [],
    "totalScore": 0,
    "currentChapter": 1,
    "unlockedChapters": [1]
  }`),

  battleRoyale: JSON.parse(localStorage.getItem('sudoku-battle-royale') || `{
    "gamesPlayed": 0,
    "gamesWon": 0,
    "bestPosition": null,
    "averagePosition": null
  }`),

  globalRanking: JSON.parse(localStorage.getItem('sudoku-global-ranking') || `{
    "globalRank": null,
    "countryRank": null,
    "friendsRank": [],
    "rating": 1000,
    "lastUpdated": null
  }`),

  dailyChallenges: JSON.parse(localStorage.getItem('sudoku-daily-challenges') || `{
    "currentStreak": 0,
    "longestStreak": 0,
    "totalCompleted": 0,
    "monthlyCompletions": [],
    "bestDailyTime": null,
    "dailyRankings": {}
  }`)
};

const tournamentStructure = {
  chapters: [
    {
      id: 1,
      name: "Aprendiz del Sudoku",
      description: "Domina los fundamentos",
      levels: [
        { id: 1, difficulty: 'easy', timeLimit: 600, requiredMistakes: 5, stars: [180, 300, 420] },
        { id: 2, difficulty: 'easy', timeLimit: 480, requiredMistakes: 4, stars: [150, 240, 360] },
        { id: 3, difficulty: 'easy', timeLimit: 360, requiredMistakes: 3, stars: [120, 200, 300] },
        { id: 4, difficulty: 'medium', timeLimit: 600, requiredMistakes: 4, stars: [240, 400, 540] },
        { id: 5, difficulty: 'medium', timeLimit: 480, requiredMistakes: 3, stars: [200, 320, 440] }
      ],
      boss: {
        difficulty: 'hard',
        timeLimit: 600,
        requiredMistakes: 2,
        specialRule: "Sin pistas permitidas",
        stars: [300, 450, 570]
      }
    },
    {
      id: 2,
      name: "Maestro de la Lógica", 
      description: "Perfecciona tu técnica",
      levels: [
        { id: 6, difficulty: 'medium', timeLimit: 420, requiredMistakes: 3, stars: [180, 280, 380] },
        { id: 7, difficulty: 'hard', timeLimit: 600, requiredMistakes: 3, stars: [300, 450, 550] },
        { id: 8, difficulty: 'hard', timeLimit: 480, requiredMistakes: 2, stars: [240, 360, 450] },
        { id: 9, difficulty: 'expert', timeLimit: 720, requiredMistakes: 3, stars: [420, 580, 680] },
        { id: 10, difficulty: 'expert', timeLimit: 600, requiredMistakes: 2, stars: [360, 500, 580] }
      ],
      boss: {
        difficulty: 'master', 
        timeLimit: 600,
        requiredMistakes: 1,
        specialRule: "Modo experto activado",
        stars: [420, 540, 600]
      }
    },
    {
      id: 3,
      name: "Leyenda del Sudoku",
      description: "El desafío definitivo",
      levels: [
        { id: 11, difficulty: 'expert', timeLimit: 480, requiredMistakes: 2, stars: [300, 400, 460] },
        { id: 12, difficulty: 'master', timeLimit: 660, requiredMistakes: 2, stars: [420, 540, 620] },
        { id: 13, difficulty: 'master', timeLimit: 540, requiredMistakes: 1, stars: [360, 460, 520] },
        { id: 14, difficulty: 'master', timeLimit: 480, requiredMistakes: 1, stars: [300, 400, 450] },
        { id: 15, difficulty: 'master', timeLimit: 420, requiredMistakes: 0, stars: [240, 330, 390] }
      ],
      boss: {
        difficulty: 'master',
        timeLimit: 480, 
        requiredMistakes: 0,
        specialRule: "Contrarreloj + Modo experto",
        stars: [300, 400, 450]
      }
    }
  ]
};

// Sistema de escalado responsivo
function getScaleFactor() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const baseWidth = 1366;
  const baseHeight = 768;
  
  const scaleX = width / baseWidth;
  const scaleY = height / baseHeight;
  
  const scale = Math.min(scaleX, scaleY);
  return Math.max(0.8, Math.min(scale, 1.5));
}

function getCellSize() {
  const scale = getScaleFactor();
  return Math.floor(50 * scale);
}

function getFontSize(base) {
  const scale = getScaleFactor();
  return Math.floor(base * scale);
}

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
  },
  sunset: {
    bg: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)',
    cardBg: 'rgba(255,255,255,0.1)',
    text: 'white',
    menuBg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
  },
  ocean: {
    bg: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
    cardBg: 'rgba(255,255,255,0.1)',
    text: 'white',
    menuBg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
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

function saveToLeaderboard() {
  const entry = {
    id: Date.now(),
    difficulty: gameState.difficulty,
    time: gameState.timer,
    mistakes: gameState.mistakes,
    hintsUsed: gameState.hintsUsed,
    date: new Date().toLocaleDateString()
  };
  
  gameState.leaderboard.push(entry);
  gameState.leaderboard.sort((a, b) => a.time - b.time);
  gameState.leaderboard = gameState.leaderboard.slice(0, 10);
  localStorage.setItem('sudoku-leaderboard', JSON.stringify(gameState.leaderboard));
}

function saveProgress() {
  const today = new Date().toLocaleDateString();
  const accuracy = gameState.userBoard.flat().filter(c => c !== 0).length > 0 ?
    Math.round((1 - gameState.mistakes / gameState.userBoard.flat().filter(c => c !== 0).length) * 100) : 100;
  
  gameState.progressData.dates.push(today);
  gameState.progressData.times.push(gameState.timer);
  gameState.progressData.accuracies.push(accuracy);
  
  if (gameState.progressData.dates.length > 30) {
    gameState.progressData.dates.shift();
    gameState.progressData.times.shift();
    gameState.progressData.accuracies.shift();
  }
  
  localStorage.setItem('sudoku-progress', JSON.stringify(gameState.progressData));
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
    moveHistory: gameState.moveHistory,
    notes: Object.fromEntries(
      Object.entries(gameState.notes).map(([k, v]) => [k, Array.from(v)])
    ),
    expertMode: gameState.expertMode,
    timeAttackMode: gameState.timeAttackMode
  };
  
  gameState.savedGames.unshift(saved);
  gameState.savedGames = gameState.savedGames.slice(0, 5);
  localStorage.setItem('sudoku-saved', JSON.stringify(gameState.savedGames));
  gameState.sound.hint();
  showNotification('✅ Partida guardada');
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
  gameState.notes = {};
  if (saved.notes) {
    Object.entries(saved.notes).forEach(([k, v]) => {
      gameState.notes[k] = new Set(v);
    });
  }
  gameState.expertMode = saved.expertMode || false;
  gameState.timeAttackMode = saved.timeAttackMode || false;
  
  if (gameState.timerInterval) clearInterval(gameState.timerInterval);
  gameState.timerInterval = setInterval(() => {
    if (gameState.timeAttackMode && gameState.timer >= gameState.timeAttackLimit) {
      clearInterval(gameState.timerInterval);
      showTimeUpScreen();
      return;
    }
    gameState.timer++;
    if (gameState.timer % 60 === 0) gameState.sound.tick();
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
  
  const seedValue = new Date().getFullYear() * 10000 + 
                    (new Date().getMonth() + 1) * 100 + 
                    new Date().getDate();
  
  const generator = new SudokuGenerator();
  const puzzle = generator.generate('hard', seedValue);
  
  const daily = {
    date: today,
    puzzle: puzzle,
    completed: false,
    time: null,
    mistakes: null
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
  
  if (gameState.currentPuzzle) {
    renderGame();
  } else {
    renderMenu();
  }
}

function toggleNotesMode() {
  gameState.notesMode = !gameState.notesMode;
  gameState.sound.click();
  showNotification(gameState.notesMode ? '📝 Modo Anotaciones: ON' : '✏️ Modo Normal: ON');
  
  const notesButton = document.querySelector('button[onclick="toggleNotesMode()"]');
  if (notesButton) {
    notesButton.textContent = gameState.notesMode ? '✓ Modo ON' : '○ Modo OFF';
    notesButton.style.background = gameState.notesMode ? 
      'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'rgba(139,92,246,0.3)';
    notesButton.style.border = gameState.notesMode ? '2px solid #a78bfa' : '2px solid transparent';
  }
}

function clearAllNotes() {
  if (confirm('¿Borrar todas las anotaciones?')) {
    gameState.notes = {};
    gameState.sound.click();
    showNotification('🗑️ Anotaciones borradas');
    renderGame();
  }
}

function clearCellNotes() {
  if (!gameState.selectedCell) {
    showNotification('Selecciona una celda primero');
    return;
  }
  const [row, col] = gameState.selectedCell;
  const key = `${row}-${col}`;
  if (gameState.notes[key]) {
    delete gameState.notes[key];
    gameState.sound.click();
    showNotification('🗑️ Anotaciones borradas de la celda');
    renderBoard();
  }
}

function autoFillNotes() {
  let filled = 0;
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (gameState.userBoard[i][j] === 0 && gameState.currentPuzzle.puzzle[i][j] === 0) {
        const key = `${i}-${j}`;
        const candidates = getCandidates(i, j);
        if (candidates.length > 0) {
          gameState.notes[key] = new Set(candidates);
          filled++;
        }
      }
    }
  }
  gameState.sound.hint();
  showNotification(`✨ ${filled} celdas con anotaciones automáticas`);
  renderGame();
}

function getCandidates(row, col) {
  const candidates = [];
  for (let num = 1; num <= 9; num++) {
    if (isValidMove(row, col, num)) {
      candidates.push(num);
    }
  }
  return candidates;
}

function isValidMove(row, col, num) {
  // En modo online, el servidor valida los movimientos
  if (gameState.isOnline && gameState.currentGameId) {
    return true;
  }
  
  // Verificar fila
  for (let j = 0; j < 9; j++) {
    if (gameState.userBoard[row][j] === num) return false;
  }
  
  // Verificar columna
  for (let i = 0; i < 9; i++) {
    if (gameState.userBoard[i][col] === num) return false;
  }
  
  // Verificar cuadro 3x3
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = boxRow; i < boxRow + 3; i++) {
    for (let j = boxCol; j < boxCol + 3; j++) {
      if (gameState.userBoard[i][j] === num) return false;
    }
  }
  
  return true;
}

function showNotification(message) {
  const notif = document.createElement('div');
  notif.textContent = message;
  notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0,0,0,0.9);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    font-weight: bold;
    z-index: 1000;
    animation: slideIn 0.3s;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s';
    setTimeout(() => notif.remove(), 300);
  }, 2000);
}

function showTimeUpScreen() {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  root.innerHTML = `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div style="max-width: 600px; width: 100%; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 60px; border: 1px solid rgba(255,255,255,0.2); text-align: center;">
        <div style="font-size: 120px; margin-bottom: 30px;">⏰</div>
        <h1 style="font-size: 48px; font-weight: bold; color: white; margin: 0 0 20px 0;">¡Tiempo agotado!</h1>
        <div style="font-size: 24px; color: rgba(255,255,255,0.9); margin-bottom: 40px;">No completaste el sudoku a tiempo</div>
        
        <div style="display: flex; flex-direction: column; gap: 15px;">
          <button onclick="startNewGame('${gameState.difficulty}', false, true)" style="
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            padding: 20px 40px;
            border: none;
            border-radius: 15px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
          ">⏱️ Intentar de nuevo</button>
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

async function startNewGame(difficulty, isDailyChallenge = false, isTimeAttack = false, isExpert = false) {
  try {
    gameState.difficulty = difficulty;
    gameState.timeAttackMode = isTimeAttack;
    gameState.expertMode = isExpert;
    
    if (isDailyChallenge) {
      const daily = getDailyChallenge();
      if (daily.completed) {
        showNotification('Ya completaste el reto diario 🎉');
        return;
      }
      gameState.currentPuzzle = daily.puzzle;
      gameState.userBoard = daily.puzzle.puzzle.map(row => [...row]);
      gameState.currentGameId = null;
      showNotification(`🏆 Reto diario ${difficulty}`);
    } else if (gameState.isOnline) {
      const mode = isTimeAttack ? 'timeAttack' : isExpert ? 'expert' : 'normal';
      
      const response = await SudokuAPI.createGame({
        difficulty,
        mode
      });
      
      gameState.currentPuzzle = {
        puzzle: response.puzzle,
        solution: null,
        clues: response.clues
      };
      gameState.userBoard = response.puzzle.map(row => [...row]);
      gameState.currentGameId = response.gameId;
      gameState.expertMode = response.expertMode || false;
      gameState.timeAttackLimit = response.timeAttackLimit || 600;
      
      showNotification(`🎮 Nuevo juego ${difficulty} creado online`);
    } else {
      const generator = new SudokuGenerator();
      gameState.currentPuzzle = generator.generate(difficulty);
      gameState.userBoard = gameState.currentPuzzle.puzzle.map(row => [...row]);
      gameState.currentGameId = null;
      showNotification(`🎮 Nuevo juego ${difficulty} (offline)`);
    }
    
    // Reiniciar estado del juego
    gameState.selectedCell = null;
    gameState.timer = 0;
    gameState.mistakes = 0;
    gameState.hintsUsed = 0;
    gameState.moveHistory = [];
    gameState.notes = {};
    gameState.notesMode = false;
    
    // Limpiar timer anterior
    if (gameState.timerInterval) {
      clearInterval(gameState.timerInterval);
    }
    
    // Iniciar nuevo timer
    gameState.timerInterval = setInterval(() => {
      if (gameState.timeAttackMode && gameState.timer >= gameState.timeAttackLimit) {
        clearInterval(gameState.timerInterval);
        showTimeUpScreen();
        return;
      }
      gameState.timer++;
      if (gameState.timer % 60 === 0) gameState.sound.tick();
      updateTimer();
    }, 1000);
    
    gameState.sound.click();
    renderGame();
    
  } catch (error) {
    console.error('Error starting new game:', error);
    showNotification(`❌ Error: ${error.message}`);
    
    // Fallback a modo offline
    const generator = new SudokuGenerator();
    gameState.currentPuzzle = generator.generate(difficulty);
    gameState.userBoard = gameState.currentPuzzle.puzzle.map(row => [...row]);
    gameState.currentGameId = null;
    renderGame();
  }
}

function selectCell(row, col) {
  // Solo actualizar si realmente cambió la selección
  if (gameState.selectedCell && 
      gameState.selectedCell[0] === row && 
      gameState.selectedCell[1] === col) {
    return; // Ya está seleccionada, no hacer nada
  }

  const previousSelected = gameState.selectedCell;
  gameState.selectedCell = [row, col];
  gameState.sound.click();
  
  // Actualizar solo las celdas afectadas por el cambio de selección
  updateSelectedCells(previousSelected, [row, col]);
}

// Reemplaza la función inputNumber con esta versión corregida
async function inputNumber(num) {
  if (!gameState.selectedCell || !gameState.currentPuzzle) {
    showNotification('❌ Selecciona una celda primero');
    return;
  }
  
  const [row, col] = gameState.selectedCell;
  
  // Verificar que la celda sea editable (no fija)
  if (gameState.currentPuzzle.puzzle[row][col] !== 0) {
    showNotification('❌ No puedes modificar celdas fijas');
    return;
  }
  
  const key = `${row}-${col}`;
  
  try {
    if (gameState.notesMode) {
      // Modo anotaciones (sin cambios)
      if (!gameState.notes[key]) {
        gameState.notes[key] = new Set();
      }
      
      if (gameState.notes[key].has(num)) {
        gameState.notes[key].delete(num);
        if (gameState.notes[key].size === 0) {
          delete gameState.notes[key];
        }
      } else {
        gameState.notes[key].add(num);
      }
      
      gameState.sound.note();
      updateCellAndRelated(row, col);
      
    } else {
      // Modo normal - entrada de número
      const oldValue = gameState.userBoard[row][col];
      
      if (gameState.isOnline && gameState.currentGameId) {
        // Código online (sin cambios)
        // ... 
      } else {
        // MODO OFFLINE - VERSIÓN CORREGIDA
        if (oldValue === num) {
          // Mismo número - borrar
          gameState.userBoard[row][col] = 0;
          gameState.sound.click();
        } else {
          // Nuevo número - ACTUALIZAR EL TABLERO PRIMERO
          gameState.userBoard[row][col] = num;
          
          // Limpiar notas si existen
          if (gameState.notes[key]) {
            delete gameState.notes[key];
          }
          
          // ACTUALIZAR LA INTERFAZ INMEDIATAMENTE para mostrar el número
          const conflicts = gameState.autoCheck ? findConflicts() : [];
          renderBoard(conflicts);
          
          // VERIFICAR SI ES UN ERROR (después de mostrar el número)
          let isCorrect = true;
          if (gameState.currentPuzzle.solution) {
            isCorrect = num === gameState.currentPuzzle.solution[row][col];
            
            if (!isCorrect && num !== 0) {
              // ES UN ERROR - incrementar contador
              gameState.mistakes++;
              recordErrorHeatmap(row, col);
              gameState.sound.error();
              
              console.log(`Error registrado! Total: ${gameState.mistakes}`);
              
              // ACTUALIZAR SOLO EL CONTADOR sin re-renderizar todo
              updateTournamentMistakesCounter();
              
              // Verificar si se alcanzó el límite de errores
              if (gameState.currentTournamentLevel) {
                const level = gameState.currentTournamentLevel;
                if (gameState.mistakes >= level.requiredMistakes) {
                  showNotification(`⚠️ ¡Límite de errores alcanzado! (${level.requiredMistakes})`);
                  // FINALIZAR EL NIVEL INMEDIATAMENTE
                  setTimeout(() => {
                    clearInterval(gameState.timerInterval);
                    showTournamentLevelResult(false, `¡Demasiados errores! (${gameState.mistakes}/${level.requiredMistakes})`);
                  }, 1500);
                }
              }
            } else {
              // ES CORRECTO
              gameState.sound.input();
              cleanRelatedNotes(row, col, num);
            }
          } else {
            // Sin solución disponible
            gameState.sound.input();
          }
          
          // Guardar en historial solo si es correcto
          if (oldValue !== num && !gameState.expertMode && isCorrect) {
            gameState.moveHistory.push({
              row,
              col,
              oldValue: oldValue,
              newValue: num,
              oldNotes: gameState.notes[key] ? new Set(gameState.notes[key]) : null
            });
          }
        }
        
        // Verificar victoria
        checkWin();
      }
    }
    
  } catch (error) {
    console.error('Error in inputNumber:', error);
    showNotification(`❌ Error: ${error.message}`);
  }
}

// Función mejorada para actualizar solo el contador
function updateTournamentMistakesCounter() {
  if (!gameState.currentTournamentLevel) return;
  
  const level = gameState.currentTournamentLevel;
  
  // Buscar los elementos en el DOM
  const mistakesCounter = document.getElementById('mistakes-counter');
  const mistakesCheck = document.getElementById('mistakes-check');
  
  console.log('Buscando elementos:', {
    mistakesCounter: mistakesCounter ? 'ENCONTRADO' : 'NO ENCONTRADO',
    mistakesCheck: mistakesCheck ? 'ENCONTRADO' : 'NO ENCONTRADO'
  });
  
  // Si no se encuentran los elementos, forzar re-render completo
  if (!mistakesCounter || !mistakesCheck) {
    console.log('Elementos no encontrados, re-renderizando...');
    renderTournamentGame(level, gameState.currentTournamentChapter?.boss === level);
    return;
  }
  
  // Actualizar contador principal
  const mistakesColor = gameState.mistakes >= level.requiredMistakes ? '#ef4444' : 
                       gameState.mistakes >= level.requiredMistakes - 1 ? '#f59e0b' : '#10b981';
  
  mistakesCounter.textContent = `${gameState.mistakes}/${level.requiredMistakes}`;
  mistakesCounter.style.color = mistakesColor;
  mistakesCounter.style.fontWeight = 'bold';
  
  // Actualizar marca de verificación
  mistakesCheck.textContent = gameState.mistakes < level.requiredMistakes ? '✓' : '✗';
  mistakesCheck.style.color = gameState.mistakes < level.requiredMistakes ? '#10b981' : '#ef4444';
  
  console.log('Contador actualizado a:', mistakesCounter.textContent);
}

// Función específica para actualizar el contador en modo torneo
function updateTournamentMistakesCounter() {
  if (!gameState.currentTournamentLevel) return;
  
  const level = gameState.currentTournamentLevel;
  const mistakesCounter = document.getElementById('mistakes-counter');
  const mistakesCheck = document.getElementById('mistakes-check');
  
  console.log('updateTournamentMistakesCounter llamado:', {
    mistakes: gameState.mistakes,
    required: level.requiredMistakes,
    mistakesCounter: mistakesCounter ? 'EXISTE' : 'NO EXISTE',
    mistakesCheck: mistakesCheck ? 'EXISTE' : 'NO EXISTE'
  });
  
  // Actualizar contador principal
  if (mistakesCounter) {
    const mistakesColor = gameState.mistakes >= level.requiredMistakes ? '#ef4444' : 
                         gameState.mistakes >= level.requiredMistakes - 1 ? '#f59e0b' : '#10b981';
    
    mistakesCounter.textContent = `${gameState.mistakes}/${level.requiredMistakes}`;
    mistakesCounter.style.color = mistakesColor;
    mistakesCounter.style.fontWeight = 'bold';
    console.log('Contador actualizado:', mistakesCounter.textContent);
  }
  
  // Actualizar marca de verificación
  if (mistakesCheck) {
    mistakesCheck.textContent = gameState.mistakes < level.requiredMistakes ? '✓' : '✗';
    mistakesCheck.style.color = gameState.mistakes < level.requiredMistakes ? '#10b981' : '#ef4444';
    console.log('Check actualizado:', mistakesCheck.textContent);
  }
}

// Función auxiliar para actualizar el contador de errores en tiempo real
function updateMistakes() {
  const mistakesEl = document.getElementById('mistakes');
  if (mistakesEl) {
    mistakesEl.textContent = `Errores: ${gameState.mistakes}`;
    
    // En modo torneo, resaltar si se acerca al límite
    if (gameState.currentTournamentLevel) {
      const level = gameState.currentTournamentLevel;
      if (gameState.mistakes >= level.requiredMistakes) {
        mistakesEl.style.color = '#ef4444';
        mistakesEl.style.fontWeight = 'bold';
      } else if (gameState.mistakes >= level.requiredMistakes - 1) {
        mistakesEl.style.color = '#f59e0b';
        mistakesEl.style.fontWeight = 'bold';
      } else {
        mistakesEl.style.color = '';
        mistakesEl.style.fontWeight = '';
      }
    }
  }
}

function cleanRelatedNotes(row, col, num) {
  if (num === 0 || !gameState.notes) return;
  
  // Limpiar el número de las anotaciones en la fila
  for (let j = 0; j < 9; j++) {
    const rowKey = `${row}-${j}`;
    if (gameState.notes[rowKey]) {
      gameState.notes[rowKey].delete(num);
      if (gameState.notes[rowKey].size === 0) {
        delete gameState.notes[rowKey];
      }
    }
  }
  
  // Limpiar el número de las anotaciones en la columna
  for (let i = 0; i < 9; i++) {
    const colKey = `${i}-${col}`;
    if (gameState.notes[colKey]) {
      gameState.notes[colKey].delete(num);
      if (gameState.notes[colKey].size === 0) {
        delete gameState.notes[colKey];
      }
    }
  }
  
  // Limpiar el número de las anotaciones en el cuadro 3x3
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = boxRow; i < boxRow + 3; i++) {
    for (let j = boxCol; j < boxCol + 3; j++) {
      const boxKey = `${i}-${j}`;
      if (gameState.notes[boxKey]) {
        gameState.notes[boxKey].delete(num);
        if (gameState.notes[boxKey].size === 0) {
          delete gameState.notes[boxKey];
        }
      }
    }
  }
}

function checkWin() {
  // En modo online, el servidor se encarga de verificar victoria
  if (gameState.isOnline && gameState.currentGameId) {
    return;
  }
  
  // En modo offline, verificar localmente solo si tenemos solución
  if (gameState.currentPuzzle && gameState.currentPuzzle.solution) {
    const isComplete = gameState.userBoard.every((row, i) => 
      row.every((cell, j) => cell === gameState.currentPuzzle.solution[i][j])
    );
    
    if (isComplete) {
      clearInterval(gameState.timerInterval);
      
      // Verificar si estamos en modo torneo
      if (gameState.currentTournamentLevel) {
        const level = gameState.currentTournamentLevel;
        
        // Verificar si se cumplen los requisitos del nivel
        const withinMistakeLimit = gameState.mistakes < level.requiredMistakes;
        const withinTimeLimit = gameState.timer <= level.timeLimit;
        
        if (withinMistakeLimit && withinTimeLimit) {
          showTournamentLevelResult(true, "¡Nivel completado con éxito!");
        } else {
          let message = "¡Completado pero ";
          if (!withinMistakeLimit) message += `demasiados errores (${gameState.mistakes}/${level.requiredMistakes})`;
          else if (!withinTimeLimit) message += "se agotó el tiempo";
          message += "!";
          showTournamentLevelResult(false, message);
        }
      } else {
        updateStatsAfterWin();
        gameState.sound.complete();
        showWinScreen();
      }
    }
  }
  
  // En modo offline, verificar localmente solo si tenemos solución
  if (gameState.currentPuzzle && gameState.currentPuzzle.solution) {
    const isComplete = gameState.userBoard.every((row, i) => 
      row.every((cell, j) => cell === gameState.currentPuzzle.solution[i][j])
    );
    
    if (isComplete) {
      clearInterval(gameState.timerInterval);
      updateStatsAfterWin();
      gameState.sound.complete();
      showWinScreen();
    }
  }
}

// Función auxiliar para actualizar estadísticas
function updateStatsAfterWin() {
  if (!gameState.stats) gameState.stats = { gamesWon: 0, bestTime: '--:--', streak: 0, totalTime: 0, byDifficulty: {} };
  
  gameState.stats.gamesWon = (gameState.stats.gamesWon || 0) + 1;
  gameState.stats.streak = (gameState.stats.streak || 0) + 1;
  gameState.stats.totalTime = (gameState.stats.totalTime || 0) + gameState.timer;
  
  if (!gameState.stats.byDifficulty[gameState.difficulty]) {
    gameState.stats.byDifficulty[gameState.difficulty] = { won: 0, bestTime: null };
  }
  gameState.stats.byDifficulty[gameState.difficulty].won++;
  
  const diffBest = gameState.stats.byDifficulty[gameState.difficulty].bestTime;
  if (!diffBest || gameState.timer < diffBest) {
    gameState.stats.byDifficulty[gameState.difficulty].bestTime = gameState.timer;
  }
  
  if (gameState.stats.bestTime === '--:--') {
    gameState.stats.bestTime = formatTime(gameState.timer);
  } else {
    const currentBest = parseInt(gameState.stats.bestTime.split(':')[0]) * 60 + 
                       parseInt(gameState.stats.bestTime.split(':')[1]);
    if (gameState.timer < currentBest) {
      gameState.stats.bestTime = formatTime(gameState.timer);
    }
  }
  
  if (gameState.dailyChallenge && gameState.dailyChallenge.date === new Date().toDateString()) {
    if (!gameState.dailyChallenge.completed) {
      gameState.dailyChallenge.completed = true;
      gameState.dailyChallenge.time = gameState.timer;
      gameState.dailyChallenge.mistakes = gameState.mistakes;
      localStorage.setItem('sudoku-daily', JSON.stringify(gameState.dailyChallenge));
    }
  }
  
  saveStats();
  saveToLeaderboard();
  saveProgress();
}

async function getHint() {
  if (gameState.expertMode) {
    showNotification('❌ Pistas deshabilitadas en modo experto');
    return;
  }
  
  if (!gameState.selectedCell || !gameState.currentPuzzle) {
    showNotification('❌ Selecciona una celda primero');
    return;
  }
  
  const [row, col] = gameState.selectedCell;
  if (gameState.currentPuzzle.puzzle[row][col] !== 0) {
    showNotification('❌ Esta celda ya tiene un valor fijo');
    return;
  }
  
  try {
    if (gameState.isOnline && gameState.currentGameId) {
      const response = await SudokuAPI.useHint(gameState.currentGameId);
      
      gameState.userBoard = response.userBoard || gameState.userBoard;
      gameState.hintsUsed = response.hintsUsed || gameState.hintsUsed;
      
      if (response.completed) {
        clearInterval(gameState.timerInterval);
        gameState.timer = response.time || gameState.timer;
        showWinScreen();
        return;
      }
      
    } else {
      // Modo offline - usar solución local
      if (!gameState.currentPuzzle.solution) {
        showNotification('❌ No hay solución disponible para pistas');
        return;
      }
      
      gameState.userBoard[row][col] = gameState.currentPuzzle.solution[row][col];
      gameState.hintsUsed++;
      
      // Limpiar anotaciones de esta celda
      const key = `${row}-${col}`;
      if (gameState.notes[key]) delete gameState.notes[key];
      
      if (gameState.currentPuzzle.solution) {
        cleanRelatedNotes(row, col, gameState.currentPuzzle.solution[row][col]);
      }
      
      checkWin();
    }
    
    gameState.sound.hint();
    renderBoard();
    updateHints();
    
  } catch (error) {
    console.error('Error getting hint:', error);
    showNotification(`❌ Error: ${error.message}`);
  }
}

async function undoMove() {
  if (gameState.expertMode) {
    showNotification('❌ Deshacer deshabilitado en modo experto');
    return;
  }
  
  try {
    if (gameState.isOnline && gameState.currentGameId) {
      const response = await SudokuAPI.undoMove(gameState.currentGameId);
      
      gameState.userBoard = response.userBoard || gameState.userBoard;
      gameState.moveHistory = response.moveHistory || gameState.moveHistory;
      
    } else {
      // Modo offline
      if (!gameState.moveHistory || gameState.moveHistory.length === 0) {
        showNotification('❌ No hay movimientos para deshacer');
        return;
      }
      
      const lastMove = gameState.moveHistory.pop();
      gameState.userBoard[lastMove.row][lastMove.col] = lastMove.oldValue;
      
      if (lastMove.oldNotes) {
        gameState.notes[`${lastMove.row}-${lastMove.col}`] = lastMove.oldNotes;
      } else {
        delete gameState.notes[`${lastMove.row}-${lastMove.col}`];
      }
    }
    
    gameState.sound.click();
    renderBoard();
    
  } catch (error) {
    console.error('Error undoing move:', error);
    showNotification(`❌ Error: ${error.message}`);
  }
}

function findConflicts() {
  const conflicts = [];
  if (!gameState.userBoard || !gameState.currentPuzzle) return conflicts;
  
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const val = gameState.userBoard[i][j];
      if (val === 0 || gameState.currentPuzzle.puzzle[i][j] !== 0) continue;
      
      // Verificar fila
      for (let k = 0; k < 9; k++) {
        if (k !== j && gameState.userBoard[i][k] === val) {
          conflicts.push([i, j]);
          break;
        }
      }
      
      // Verificar columna
      for (let k = 0; k < 9; k++) {
        if (k !== i && gameState.userBoard[k][j] === val) {
          if (!conflicts.find(c => c[0] === i && c[1] === j)) {
            conflicts.push([i, j]);
          }
          break;
        }
      }
      
      // Verificar cuadro
      const boxRow = Math.floor(i / 3) * 3;
      const boxCol = Math.floor(j / 3) * 3;
      for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
          if ((r !== i || c !== j) && gameState.userBoard[r][c] === val) {
            if (!conflicts.find(co => co[0] === i && co[1] === j)) {
              conflicts.push([i, j]);
            }
            break;
          }
        }
      }
    }
  }
  
  return conflicts;
}

// Manejo de teclado
document.addEventListener('keydown', (e) => {
  if (!gameState.currentPuzzle) return;
  
  if (e.key >= '1' && e.key <= '9') {
    inputNumber(parseInt(e.key));
  }
  
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
    if (gameState.notesMode && gameState.selectedCell) {
      clearCellNotes();
    } else {
      inputNumber(0);
    }
  }
  
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
  
  if (e.ctrlKey && e.key === 'z' && !gameState.expertMode) {
    e.preventDefault();
    undoMove();
  }
  
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveGame();
  }
  
  if ((e.key === 'h' || e.key === 'H') && !gameState.expertMode) {
    getHint();
  }
  
  if (e.key === 'n' || e.key === 'N') {
    toggleNotesMode();
  }
  
  if (e.key === 'a' || e.key === 'A') {
    autoFillNotes();
  }
  
  if (e.ctrlKey && e.key === 'd') {
    e.preventDefault();
    clearAllNotes();
  }
});

// CSS para animaciones
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-30px); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  ::-webkit-scrollbar {
    width: 10px;
  }
  ::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(102,126,234,0.5);
    border-radius: 10px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(102,126,234,0.8);
  }
  /* Mejoras visuales para el tablero */
  #board {
      font-family: 'Arial', sans-serif;
  }
  /* Efectos hover para celdas */
  #board div[onclick]:hover {
      filter: brightness(0.95);
      transform: scale(1.02);
      z-index: 2;
  }
  /* Animación para números nuevos */
  @keyframes popIn {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
  }
  /* Mejora para botones numéricos */
  button {
      transition: all 0.2s ease;
  }
  button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  }
  button:active {
      transform: translateY(0);
  }
`;
document.head.appendChild(style);

// Funciones de autenticación y renderizado (se mantienen igual que antes)
function renderAuth() {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  root.innerHTML = `
    <div style="height: 100vh; background: ${theme.menuBg}; display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div style="max-width: 500px; width: 100%; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 50px; border: 1px solid rgba(255,255,255,0.2); text-align: center;">
        <h1 style="font-size: 48px; font-weight: bold; color: white; margin-bottom: 10px;">SUDOKU PRO</h1>
        <p style="color: rgba(255,255,255,0.8); margin-bottom: 40px;">Juega online y compite con otros</p>
        
        <div id="auth-form">
          <div style="display: flex; gap: 15px; margin-bottom: 30px;">
            <button onclick="showLoginForm()" style="
              flex: 1;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
            ">Iniciar Sesión</button>
            <button onclick="showRegisterForm()" style="
              flex: 1;
              background: rgba(255,255,255,0.2);
              color: white;
              padding: 15px;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
            ">Registrarse</button>
          </div>
          
          <div id="login-form" style="display: none;">
            <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
              <input type="email" id="login-email" placeholder="Email" style="
                padding: 15px;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                background: rgba(255,255,255,0.9);
              ">
              <input type="password" id="login-password" placeholder="Contraseña" style="
                padding: 15px;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                background: rgba(255,255,255,0.9);
              ">
            </div>
            <button onclick="handleLogin()" style="
              width: 100%;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 15px;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              margin-bottom: 15px;
            ">🎮 Iniciar Sesión</button>
          </div>
          
          <div id="register-form" style="display: none;">
            <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
              <input type="text" id="register-username" placeholder="Nombre de usuario" style="
                padding: 15px;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                background: rgba(255,255,255,0.9);
              ">
              <input type="email" id="register-email" placeholder="Email" style="
                padding: 15px;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                background: rgba(255,255,255,0.9);
              ">
              <input type="password" id="register-password" placeholder="Contraseña" style="
                padding: 15px;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                background: rgba(255,255,255,0.9);
              ">
            </div>
            <button onclick="handleRegister()" style="
              width: 100%;
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
              color: white;
              padding: 15px;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              margin-bottom: 15px;
            ">🚀 Crear Cuenta</button>
          </div>
        </div>
        
        <button onclick="playOffline()" style="
          width: 100%;
          background: rgba(255,255,255,0.1);
          color: white;
          padding: 15px;
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 12px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        ">🎯 Jugar Sin Conexión</button>
        
        <div style="margin-top: 30px; color: rgba(255,255,255,0.6); font-size: 14px;">
          Al registrarte, podrás guardar tu progreso en la nube y competir en rankings globales
        </div>
      </div>
    </div>
  `;
}

function showLoginForm() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('register-form').style.display = 'none';
}

function showRegisterForm() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
}

async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  if (!email || !password) {
    showNotification('❌ Por favor completa todos los campos');
    return;
  }
  
  try {
    const result = await SudokuAPI.login({ email, password });
    
    localStorage.setItem('sudoku-token', result.token);
    localStorage.setItem('sudoku-user', JSON.stringify(result.user));
    
    gameState.user = result.user;
    gameState.token = result.token;
    gameState.isOnline = true;
    
    gameState.sound.complete();
    showNotification(`🎉 ¡Bienvenido de nuevo, ${result.user.username}!`);
    renderMenu();
    
  } catch (error) {
    showNotification(`❌ Error: ${error.message}`);
  }
}

async function handleRegister() {
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  
  if (!username || !email || !password) {
    showNotification('❌ Por favor completa todos los campos');
    return;
  }
  
  if (password.length < 6) {
    showNotification('❌ La contraseña debe tener al menos 6 caracteres');
    return;
  }
  
  try {
    const result = await SudokuAPI.register({ username, email, password });
    
    localStorage.setItem('sudoku-token', result.token);
    localStorage.setItem('sudoku-user', JSON.stringify(result.user));
    
    gameState.user = result.user;
    gameState.token = result.token;
    gameState.isOnline = true;
    
    gameState.sound.complete();
    showNotification(`🎉 ¡Cuenta creada exitosamente, ${result.user.username}!`);
    renderMenu();
    
  } catch (error) {
    showNotification(`❌ Error: ${error.message}`);
  }
}

function playOffline() {
  gameState.isOnline = false;
  gameState.user = null;
  gameState.token = null;
  showNotification('🔌 Modo sin conexión activado');
  renderMenu();
}

function logout() {
  localStorage.removeItem('sudoku-token');
  localStorage.removeItem('sudoku-user');
  gameState.user = null;
  gameState.token = null;
  gameState.isOnline = false;
  showNotification('👋 Sesión cerrada');
  renderAuth();
}

// Funciones de renderizado
function renderMenu() {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="height: 100vh; background: ${theme.menuBg}; padding: 20px; overflow-y: scroll; box-sizing: border-box; display: flex; flex-direction: column;">
      <div style="max-width: 1400px; margin: 0 auto; width: 100%; flex: 1; overflow-y: auto;">
        <div style="text-align: right; margin-bottom: 20px;">
          <button onclick="window.electron.closeApp()" style="background: rgba(239,68,68,0.8); color: white; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: bold;">✕ Cerrar</button>
        </div>
        <div style="text-align: center; margin-bottom: 50px;">
          <h1 style="font-size: 64px; font-weight: bold; color: white; margin: 0 0 15px 0; letter-spacing: -2px;">SUDOKU PRO</h1>
          <p style="font-size: 20px; color: rgba(255,255,255,0.9);">Lógica pura. Solución única garantizada.</p>
        </div>
        ${gameState.user ? `
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 24px; color: white; margin-bottom: 10px;">
            👋 ¡Hola, <strong>${gameState.user.username}</strong>!
          </div>
          <div style="display: flex; justify-content: center; gap: 20px; color: rgba(255,255,255,0.8); font-size: 14px;">
            <div>Nivel ${gameState.user.level}</div>
            <div>${gameState.user.xp} XP</div>
            <div>${gameState.user.coins} 🪙</div>
          </div>
          <button onclick="logout()" style="
            background: rgba(239,68,68,0.6);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 12px;
            cursor: pointer;
            margin-top: 10px;
          ">Cerrar Sesión</button>
        </div>
        ` : ''}
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-bottom: 30px;">
          <!-- Nueva Partida -->
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">🎮 Nueva Partida</h2>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <button onclick="startNewGame('hard', true)" style="
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                padding: 15px 20px;
                border: none;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                🏆 Reto Diario
              </button>
              ${['easy', 'medium', 'hard', 'expert', 'master'].map(diff => `
                <button onclick="startNewGame('${diff}')" style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 15px 20px;
                  border: none;
                  border-radius: 12px;
                  font-size: 15px;
                  font-weight: bold;
                  cursor: pointer;
                  transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                  ${diff === 'easy' ? '⭐ Fácil' : ''}
                  ${diff === 'medium' ? '⭐⭐ Medio' : ''}
                  ${diff === 'hard' ? '⭐⭐⭐ Difícil' : ''}
                  ${diff === 'expert' ? '⭐⭐⭐⭐ Experto' : ''}
                  ${diff === 'master' ? '⭐⭐⭐⭐⭐ Maestro' : ''}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Modos Especiales -->
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">⚡ Modos Especiales</h2>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <button onclick="startNewGame('medium', false, true)" style="
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                padding: 15px 20px;
                border: none;
                border-radius: 12px;
                font-size: 15px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                ⏱️ Contrarreloj (10 min)
              </button>
              <button onclick="startNewGame('hard', false, false, true)" style="
                background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
                color: white;
                padding: 15px 20px;
                border: none;
                border-radius: 12px;
                font-size: 15px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                💪 Modo Experto
              </button>
              <button onclick="showTournamentMenu()" style="
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                color: white;
                padding: 15px 20px;
                border: none;
                border-radius: 12px;
                font-size: 15px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                🏆 Modo Torneo
              </button>
              <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 10px; font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.4;">
                <strong>Experto:</strong> Sin pistas ni deshacer
              </div>
            </div>
          </div>

          <!-- Estadísticas -->
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">📊 Estadísticas</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px; text-align: center;">
                <div style="font-size: 36px; font-weight: bold; color: white;">${gameState.stats.gamesWon}</div>
                <div style="color: rgba(255,255,255,0.9); font-size: 12px;">Completados</div>
              </div>
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 15px; text-align: center;">
                <div style="font-size: 36px; font-weight: bold; color: white;">${gameState.stats.bestTime}</div>
                <div style="color: rgba(255,255,255,0.9); font-size: 12px;">Mejor tiempo</div>
              </div>
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 15px; text-align: center; grid-column: span 2;">
                <div style="font-size: 36px; font-weight: bold; color: white;">${gameState.stats.streak} 🔥</div>
                <div style="color: rgba(255,255,255,0.9); font-size: 12px;">Racha actual</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Leaderboard -->
        ${gameState.leaderboard.length > 0 ? `
        <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 30px;">
          <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">🏆 Top 10 Mejores Tiempos</h2>
          <div style="display: grid; gap: 10px;">
            ${gameState.leaderboard.map((entry, idx) => `
              <div style="background: rgba(255,255,255,0.05); padding: 15px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="font-size: 24px; font-weight: bold; color: ${idx < 3 ? '#fbbf24' : 'rgba(255,255,255,0.6)'};">
                    ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </div>
                  <div style="color: white;">
                    <div style="font-weight: bold; font-size: 16px;">${entry.difficulty.toUpperCase()}</div>
                    <div style="font-size: 13px; opacity: 0.8;">${entry.date}</div>
                  </div>
                </div>
                <div style="text-align: right; color: white;">
                  <div style="font-size: 20px; font-weight: bold;">${formatTime(entry.time)}</div>
                  <div style="font-size: 12px; opacity: 0.8;">${entry.mistakes} errores • ${entry.hintsUsed} pistas</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Partidas Guardadas y Gráfico -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
          ${gameState.savedGames.length > 0 ? `
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">💾 Partidas Guardadas</h2>
            <div style="display: grid; gap: 12px;">
              ${gameState.savedGames.map(game => `
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                  <div style="color: white;">
                    <div style="font-weight: bold; font-size: 15px;">${game.difficulty.toUpperCase()} ${game.expertMode ? '💪' : ''} ${game.timeAttackMode ? '⏱️' : ''}</div>
                    <div style="font-size: 12px; opacity: 0.8;">${game.date.split(',')[0]} • ${formatTime(game.timer)}</div>
                  </div>
                  <button onclick="loadGame(${game.id})" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 13px;
                    cursor: pointer;
                  ">Cargar</button>
                </div>
              `).join('')}
            </div>
          </div>
          ` : '<div></div>'}

          <!-- Gráfico de Progreso -->
          ${gameState.progressData.dates.length > 0 ? `
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">📈 Progreso (Últimos ${gameState.progressData.dates.length} juegos)</h2>
            <div style="color: white;">
              <div style="margin-bottom: 20px;">
                <div style="font-size: 14px; opacity: 0.8; margin-bottom: 5px;">Tiempo promedio</div>
                <div style="font-size: 32px; font-weight: bold;">
                  ${formatTime(Math.floor(gameState.progressData.times.reduce((a,b) => a+b, 0) / gameState.progressData.times.length))}
                </div>
              </div>
              <div style="margin-bottom: 20px;">
                <div style="font-size: 14px; opacity: 0.8; margin-bottom: 5px;">Precisión promedio</div>
                <div style="font-size: 32px; font-weight: bold;">
                  ${Math.round(gameState.progressData.accuracies.reduce((a,b) => a+b, 0) / gameState.progressData.accuracies.length)}%
                </div>
              </div>
              <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px;">
                <div style="font-size: 13px; opacity: 0.8; margin-bottom: 10px;">Evolución de tiempos</div>
                <div style="display: flex; align-items: flex-end; gap: 3px; height: 80px;">
                  ${gameState.progressData.times.slice(-10).map(time => {
                    const maxTime = Math.max(...gameState.progressData.times.slice(-10));
                    const height = (time / maxTime) * 100;
                    return `<div style="flex: 1; background: linear-gradient(to top, #10b981, #059669); border-radius: 3px 3px 0 0; height: ${height}%;" title="${formatTime(time)}"></div>`;
                  }).join('')}
                </div>
              </div>
            </div>
          </div>
          ` : '<div></div>'}
        </div>

        <!-- Configuración y Atajos -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">⚙️ Configuración</h2>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <button onclick="toggleTheme()" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 12px 20px;
                border: none;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
                text-align: left;
                display: flex;
                justify-content: space-between;
                align-items: center;
              ">
                <span>🎨 Tema</span>
                <span style="opacity: 0.8;">${gameState.theme}</span>
              </button>
              <button onclick="gameState.sound.toggle(); renderMenu();" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 12px 20px;
                border: none;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
                text-align: left;
                display: flex;
                justify-content: space-between;
                align-items: center;
              ">
                <span>${gameState.sound.enabled ? '🔊' : '🔇'} Sonido</span>
                <span style="opacity: 0.8;">${gameState.sound.enabled ? 'Activado' : 'Desactivado'}</span>
              </button>
              <button onclick="gameState.autoCheck = !gameState.autoCheck; localStorage.setItem('sudoku-autocheck', JSON.stringify(gameState.autoCheck)); renderMenu();" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 12px 20px;
                border: none;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
                text-align: left;
                display: flex;
                justify-content: space-between;
                align-items: center;
              ">
                <span>🔍 Auto-verificar</span>
                <span style="opacity: 0.8;">${gameState.autoCheck ? 'Activado' : 'Desactivado'}</span>
              </button>
              <button onclick="showAdvancedAnalytics()" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 12px 20px;
                border: none;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
                text-align: left;
                display: flex;
                justify-content: space-between;
                align-items: center;
              ">
                <span>📊 Análisis Avanzado</span>
                <span style="opacity: 0.8;">→</span>
              </button>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="font-size: 24px; font-weight: bold; color: white; margin-bottom: 20px;">⌨️ Atajos de Teclado</h2>
            <div style="color: white; font-size: 14px; line-height: 2;">
              <div><strong>1-9:</strong> Ingresar números</div>
              <div><strong>N:</strong> Modo anotaciones</div>
              <div><strong>A:</strong> Auto-llenar anotaciones</div>
              <div><strong>Delete:</strong> Borrar celda/notas</div>
              <div><strong>Ctrl+D:</strong> Borrar todas las notas</div>
              <div><strong>H:</strong> Pista</div>
              <div><strong>Ctrl+Z:</strong> Deshacer</div>
              <div><strong>Ctrl+S:</strong> Guardar</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderGame() {
  const theme = themes[gameState.theme];
  const conflicts = gameState.autoCheck ? findConflicts() : [];
  const timeLeft = gameState.timeAttackMode ? gameState.timeAttackLimit - gameState.timer : 0;
  const timeWarning = gameState.timeAttackMode && timeLeft < 60;
  
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="height: 100vh; background: ${theme.bg}; padding: 10px; overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column;">
      <div style="max-width: 1400px; margin: 0 auto; width: 100%; flex: 1; overflow-y: auto;">
        <div style="display: grid; grid-template-columns: 1fr 280px; gap: 15px; height: 100%;">
          <!-- Columna izquierda -->
          <div style="display: flex; flex-direction: column; gap: 15px; overflow-y: auto; height: fit-content; max-height: 100%;">
            <!-- Tablero -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 12px; border: 1px solid rgba(255,255,255,0.2);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <button onclick="renderMenu()" style="background: rgba(255,255,255,0.2); border: none; padding: 10px 14px; border-radius: 10px; cursor: pointer; font-size: 18px;">🏠</button>
                  <div style="color: ${theme.text};">
                    <div style="font-size: 20px; font-weight: bold; text-transform: uppercase;">
                      ${gameState.difficulty} 
                      ${gameState.expertMode ? '💪' : ''} 
                      ${gameState.timeAttackMode ? '⏱️' : ''}
                    </div>
                    <div style="font-size: 12px; opacity: 0.8;">${gameState.currentPuzzle.clues} pistas</div>
                  </div>
                </div>
                <div style="text-align: right; color: ${theme.text};">
                  <div id="timer" style="font-size: 36px; font-weight: bold; ${timeWarning ? 'color: #ef4444; animation: pulse 1s infinite;' : ''}">${gameState.timeAttackMode ? formatTime(timeLeft) : formatTime(gameState.timer)}</div>
                  <div id="mistakes" style="font-size: 12px; opacity: 0.8;">Errores: ${gameState.mistakes}</div>
                </div>
              </div>
              <div style="display: flex; justify-content: center;">
                <div id="board"></div>
              </div>
            </div>

            <!-- Controles principales -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;">
                ${!gameState.expertMode ? `
                <button onclick="undoMove()" style="background: rgba(249,115,22,0.8); color: white; padding: 10px; border: none; border-radius: 10px; font-size: 13px; font-weight: bold; cursor: pointer;">↶ Deshacer</button>
                <button onclick="getHint()" style="background: rgba(234,179,8,0.8); color: white; padding: 10px; border: none; border-radius: 10px; font-size: 13px; font-weight: bold; cursor: pointer;">💡 Pista (<span id="hints">${gameState.hintsUsed}</span>)</button>
                ` : '<div></div><div></div>'}
                <button onclick="saveGame()" style="background: rgba(16,185,129,0.8); color: white; padding: 10px; border: none; border-radius: 10px; font-size: 13px; font-weight: bold; cursor: pointer;">💾 Guardar</button>
              </div>
              <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
                ${[1,2,3,4,5,6,7,8,9].map(num => `
                  <button onclick="inputNumber(${num})" style="
                    background: rgba(102, 126, 234, 0.8); 
                    color: white; 
                    padding: 16px; 
                    border: none; 
                    border-radius: 10px; 
                    font-size: 20px; 
                    font-weight: bold; 
                    cursor: pointer; 
                  " onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">${num}</button>
                `).join('')}
                <button onclick="inputNumber(0)" style="background: rgba(239,68,68,0.8); color: white; padding: 16px; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">✕</button>
              </div>
            </div>
          </div>

          <!-- Columna derecha: Información -->
          <div style="display: flex; flex-direction: column; gap: 15px; overflow-y: auto; max-height: calc(100vh - 20px);">
            <!-- Progreso -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
              <h3 style="font-size: 16px; font-weight: bold; color: ${theme.text}; margin-bottom: 12px;">📊 Progreso</h3>
              <div style="background: rgba(102, 126, 234, 0.1); padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 10px;">
                <div style="color: ${theme.text}; font-size: 12px; margin-bottom: 4px;">Racha actual</div>
                <div style="font-size: 28px; font-weight: bold; color: ${theme.text};">${gameState.stats.streak} 🔥</div>
              </div>
              <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 10px;">
                <div style="color: ${theme.text}; font-size: 12px; margin-bottom: 4px;">Completado</div>
                <div style="font-size: 28px; font-weight: bold; color: ${theme.text};">
                  ${Math.round((gameState.userBoard.flat().filter(c => c !== 0).length / 81) * 100)}%
                </div>
              </div>
              ${conflicts.length > 0 ? `
              <div style="background: rgba(239, 68, 68, 0.1); padding: 15px; border-radius: 10px; text-align: center;">
                <div style="color: #ef4444; font-size: 12px; margin-bottom: 4px;">⚠️ Conflictos</div>
                <div style="font-size: 28px; font-weight: bold; color: #ef4444;">${conflicts.length}</div>
              </div>
              ` : ''}
            </div>
            
            <!-- Anotaciones -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
              <h3 style="font-size: 16px; font-weight: bold; color: ${theme.text}; margin-bottom: 12px;">📝 Anotaciones</h3>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <button onclick="toggleNotesMode()" style="
                  background: ${gameState.notesMode ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'rgba(139,92,246,0.3)'};
                  color: white;
                  padding: 10px;
                  border: none;
                  border-radius: 8px;
                  font-size: 13px;
                  font-weight: bold;
                  cursor: pointer;
                  width: 100%;
                  border: ${gameState.notesMode ? '2px solid #a78bfa' : '2px solid transparent'};
                ">${gameState.notesMode ? '✓ Modo ON' : '○ Modo OFF'}</button>
                
                ${!gameState.expertMode ? `
                <button onclick="getHint()" style="
                  background: rgba(234,179,8,0.8);
                  color: white;
                  padding: 10px;
                  border: none;
                  border-radius: 8px;
                  font-size: 13px;
                  font-weight: bold;
                  cursor: pointer;
                  width: 100%;
                ">💡 Pista (${gameState.hintsUsed})</button>
                ` : ''}
                
                <button onclick="clearAllNotes()" style="
                  background: rgba(239,68,68,0.6);
                  color: white;
                  padding: 10px;
                  border: none;
                  border-radius: 8px;
                  font-size: 13px;
                  font-weight: bold;
                  cursor: pointer;
                  width: 100%;
                ">🗑️ Limpiar notas</button>
              </div>
              <div style="background: rgba(139,92,246,0.1); padding: 10px; border-radius: 8px; color: ${theme.text}; font-size: 11px; line-height: 1.4; margin-top: 10px;">
                <strong>Notas activas:</strong> ${Object.keys(gameState.notes).length} celdas
              </div>
            </div>
                        
            <!-- Opciones -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
              <h3 style="font-size: 16px; font-weight: bold; color: ${theme.text}; margin-bottom: 12px;">⚙️ Opciones</h3>
              <button onclick="toggleTheme()" style="
                background: rgba(102, 126, 234, 0.2);
                color: ${theme.text};
                padding: 10px 14px;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 12px;
                cursor: pointer;
                width: 100%;
                margin-bottom: 8px;
              ">🎨 Cambiar tema</button>
              <button onclick="gameState.sound.toggle(); showNotification(gameState.sound.enabled ? '🔊 Sonido activado' : '🔇 Sonido desactivado');" style="
                background: rgba(102, 126, 234, 0.2);
                color: ${theme.text};
                padding: 10px 14px;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 12px;
                cursor: pointer;
                width: 100%;
              ">${gameState.sound.enabled ? '🔊' : '🔇'} ${gameState.sound.enabled ? 'Silenciar' : 'Activar'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Renderizar el tablero después de crear la estructura
  renderBoard(conflicts);
}

function renderBoard(conflicts = []) {
  const boardEl = document.getElementById('board');
  if (!boardEl || !gameState.currentPuzzle) return;

  // Solo renderizar completamente si no existe el tablero
  const existingBoard = boardEl.querySelector('[data-board]');
  if (!existingBoard) {
    renderFullBoard(conflicts);
  } else {
    updateBoard(conflicts);
  }
}

function renderFullBoard(conflicts = []) {
  const boardEl = document.getElementById('board');
  const cellSize = getCellSize();
  const fontSize = getFontSize(20);
  const noteFontSize = getFontSize(10);
  
  let selectedValue = null;
  let selectedRow = null;
  let selectedCol = null;
  
  if (gameState.selectedCell) {
    selectedRow = gameState.selectedCell[0];
    selectedCol = gameState.selectedCell[1];
    selectedValue = gameState.currentPuzzle.puzzle[selectedRow][selectedCol] !== 0 
      ? gameState.currentPuzzle.puzzle[selectedRow][selectedCol] 
      : gameState.userBoard[selectedRow][selectedCol];
  }
  
  let html = '<div data-board style="display: inline-block; background: #374151; padding: 4px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">';
  
  for (let i = 0; i < 9; i++) {
    html += '<div style="display: flex;">';
    for (let j = 0; j < 9; j++) {
      html += createCellHTML(i, j, selectedValue, selectedRow, selectedCol, conflicts, 
                            cellSize, fontSize, noteFontSize);
    }
    html += '</div>';
  }
  html += '</div>';
  boardEl.innerHTML = html;
}

function updateBoard(conflicts = []) {
  const boardEl = document.getElementById('board');
  if (!boardEl) return;

  const cellSize = getCellSize();
  const fontSize = getFontSize(20);
  const noteFontSize = getFontSize(10);
  
  let selectedValue = null;
  let selectedRow = null;
  let selectedCol = null;
  
  if (gameState.selectedCell) {
    selectedRow = gameState.selectedCell[0];
    selectedCol = gameState.selectedCell[1];
    selectedValue = gameState.currentPuzzle.puzzle[selectedRow][selectedCol] !== 0 
      ? gameState.currentPuzzle.puzzle[selectedRow][selectedCol] 
      : gameState.userBoard[selectedRow][selectedCol];
  }

  // Actualizar solo las celdas que necesitan cambio
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const cellEl = boardEl.querySelector(`[data-cell="${i}-${j}"]`);
      if (cellEl) {
        updateSingleCell(cellEl, i, j, selectedValue, selectedRow, selectedCol, conflicts,
                        cellSize, fontSize, noteFontSize);
      }
    }
  }
}

// Función auxiliar para crear el HTML de una celda individual
function createCellHTML(i, j, selectedValue, selectedRow, selectedCol, conflicts, 
                       cellSize, fontSize, noteFontSize) {
  const isGiven = gameState.currentPuzzle.puzzle[i][j] !== 0;
  const isSelected = selectedRow === i && selectedCol === j;
  const userValue = gameState.userBoard[i][j];
  const displayValue = isGiven ? gameState.currentPuzzle.puzzle[i][j] : userValue;
  const key = `${i}-${j}`;
  const notes = gameState.notes[key];
  const hasConflict = conflicts.some(c => c[0] === i && c[1] === j);
  
  const isError = !isGiven && userValue !== 0 && gameState.currentPuzzle.solution && 
                 userValue !== gameState.currentPuzzle.solution[i][j];
  
  // Determinar colores base
  let bgColor, textColor;
  
  if (isSelected) {
    bgColor = '#3b82f6';
    textColor = 'white';
  } else if (isGiven) {
    bgColor = '#f3f4f6';
    textColor = '#1f2937';
  } else if (isError || hasConflict) {
    bgColor = '#fecaca';
    textColor = '#dc2626';
  } else {
    bgColor = '#ffffff';
    textColor = '#2563eb';
  }
  
  // Sistema de resaltados
  if (selectedValue !== null && selectedValue !== 0 && !isSelected) {
    const sameRow = i === selectedRow;
    const sameCol = j === selectedCol;
    const sameBox = Math.floor(i / 3) === Math.floor(selectedRow / 3) && 
                   Math.floor(j / 3) === Math.floor(selectedCol / 3);
    const sameNumber = displayValue === selectedValue;
    
    if (sameNumber) {
      bgColor = '#60a5fa';
      textColor = 'white';
    } else if (sameRow || sameCol) {
      bgColor = '#dbeafe';
      if (isGiven) {
        textColor = '#1e40af';
      }
    } else if (sameBox) {
      bgColor = '#eff6ff';
    }
  }
  
  // Bordes para los cuadros 3x3
  const borderRight = (j % 3 === 2 && j !== 8) ? '2px solid #1f2937' : '1px solid #9ca3af';
  const borderBottom = (i % 3 === 2 && i !== 8) ? '2px solid #1f2937' : '1px solid #9ca3af';
  
  // Contenido de la celda
  let cellContent = '';
  if (displayValue !== 0) {
    cellContent = `<div style="font-size: ${fontSize}px; font-weight: bold;">${displayValue}</div>`;
  } else if (notes && notes.size > 0) {
    const notesArray = Array.from(notes).sort();
    cellContent = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); width: 100%; height: 100%; padding: 2px; gap: 1px;">
        ${[1,2,3,4,5,6,7,8,9].map(n => 
          `<div style="display: flex; align-items: center; justify-content: center; font-size: ${noteFontSize}px; color: #6b7280; font-weight: normal;">
            ${notesArray.includes(n) ? n : ''}
          </div>`
        ).join('')}
      </div>
    `;
  }
  
  return `
    <div data-cell="${i}-${j}" onclick="selectCell(${i}, ${j})" style="
      width: ${cellSize}px;
      height: ${cellSize}px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${bgColor};
      color: ${textColor};
      border-right: ${borderRight};
      border-bottom: ${borderBottom};
      cursor: pointer;
      transition: all 0.15s;
      user-select: none;
      ${isSelected ? 'box-shadow: inset 0 0 0 2px #1d4ed8; z-index: 1;' : ''}
      position: relative;
      font-family: Arial, sans-serif;
    ">
      ${cellContent}
    </div>
  `;
}

// Función para actualizar una sola celda sin re-renderizar todo
function updateSingleCell(cellEl, i, j, selectedValue, selectedRow, selectedCol, conflicts, 
                         cellSize, fontSize, noteFontSize) {
  const isGiven = gameState.currentPuzzle.puzzle[i][j] !== 0;
  const isSelected = selectedRow === i && selectedCol === j;
  const userValue = gameState.userBoard[i][j];
  const displayValue = isGiven ? gameState.currentPuzzle.puzzle[i][j] : userValue;
  const key = `${i}-${j}`;
  const notes = gameState.notes[key];
  const hasConflict = conflicts.some(c => c[0] === i && c[1] === j);
  
  const isError = !isGiven && userValue !== 0 && gameState.currentPuzzle.solution && 
                 userValue !== gameState.currentPuzzle.solution[i][j];
  
  // Determinar colores base
  let bgColor, textColor;
  
  if (isSelected) {
    bgColor = '#3b82f6';
    textColor = 'white';
  } else if (isGiven) {
    bgColor = '#f3f4f6';
    textColor = '#1f2937';
  } else if (isError || hasConflict) {
    bgColor = '#fecaca';
    textColor = '#dc2626';
  } else {
    bgColor = '#ffffff';
    textColor = '#2563eb';
  }
  
  // Sistema de resaltados
  if (selectedValue !== null && selectedValue !== 0 && !isSelected) {
    const sameRow = i === selectedRow;
    const sameCol = j === selectedCol;
    const sameBox = Math.floor(i / 3) === Math.floor(selectedRow / 3) && 
                   Math.floor(j / 3) === Math.floor(selectedCol / 3);
    const sameNumber = displayValue === selectedValue;
    
    if (sameNumber) {
      bgColor = '#60a5fa';
      textColor = 'white';
    } else if (sameRow || sameCol) {
      bgColor = '#dbeafe';
      if (isGiven) {
        textColor = '#1e40af';
      }
    } else if (sameBox) {
      bgColor = '#eff6ff';
    }
  }
  
  // Actualizar estilos
  cellEl.style.background = bgColor;
  cellEl.style.color = textColor;
  cellEl.style.boxShadow = isSelected ? 'inset 0 0 0 2px #1d4ed8' : 'none';
  cellEl.style.zIndex = isSelected ? '1' : 'auto';
  
  // Actualizar contenido
  if (displayValue !== 0) {
    cellEl.innerHTML = `<div style="font-size: ${fontSize}px; font-weight: bold;">${displayValue}</div>`;
  } else if (notes && notes.size > 0) {
    const notesArray = Array.from(notes).sort();
    cellEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); width: 100%; height: 100%; padding: 2px; gap: 1px;">
        ${[1,2,3,4,5,6,7,8,9].map(n => 
          `<div style="display: flex; align-items: center; justify-content: center; font-size: ${noteFontSize}px; color: #6b7280; font-weight: normal;">
            ${notesArray.includes(n) ? n : ''}
          </div>`
        ).join('')}
      </div>
    `;
  } else {
    cellEl.innerHTML = '';
  }
}

function updateSelectedCells(previousSelected, newSelected) {
  const boardEl = document.getElementById('board');
  if (!boardEl) return;

  const conflicts = gameState.autoCheck ? findConflicts() : [];
  const cellSize = getCellSize();
  const fontSize = getFontSize(20);
  const noteFontSize = getFontSize(10);
  
  let selectedValue = null;
  if (newSelected) {
    const [selectedRow, selectedCol] = newSelected;
    selectedValue = gameState.currentPuzzle.puzzle[selectedRow][selectedCol] !== 0 
      ? gameState.currentPuzzle.puzzle[selectedRow][selectedCol] 
      : gameState.userBoard[selectedRow][selectedCol];
  }

  // Celdas que necesitan actualización
  const cellsToUpdate = new Set();

  // Añadir celdas previamente seleccionadas y sus relacionadas
  if (previousSelected) {
    const [prevRow, prevCol] = previousSelected;
    cellsToUpdate.add(`${prevRow}-${prevCol}`);
    addRelatedCells(prevRow, prevCol, cellsToUpdate);
  }

  // Añadir nuevas celdas seleccionadas y sus relacionadas
  if (newSelected) {
    const [newRow, newCol] = newSelected;
    cellsToUpdate.add(`${newRow}-${newCol}`);
    addRelatedCells(newRow, newCol, cellsToUpdate);
  }

  // Actualizar solo las celdas que cambiaron
  cellsToUpdate.forEach(cellKey => {
    const [i, j] = cellKey.split('-').map(Number);
    const cellEl = boardEl.querySelector(`[data-cell="${i}-${j}"]`);
    if (cellEl) {
      updateSingleCell(cellEl, i, j, selectedValue, newSelected?.[0], newSelected?.[1], conflicts,
                      cellSize, fontSize, noteFontSize);
    }
  });
}

function addRelatedCells(row, col, cellsSet) {
  // Añadir fila completa
  for (let j = 0; j < 9; j++) {
    cellsSet.add(`${row}-${j}`);
  }
  
  // Añadir columna completa
  for (let i = 0; i < 9; i++) {
    cellsSet.add(`${i}-${col}`);
  }
  
  // Añadir cuadro 3x3
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = boxRow; i < boxRow + 3; i++) {
    for (let j = boxCol; j < boxCol + 3; j++) {
      cellsSet.add(`${i}-${j}`);
    }
  }
}

function updateTimer() {
  const timerEl = document.getElementById('timer');
  if (timerEl) {
    if (gameState.timeAttackMode) {
      const timeLeft = gameState.timeAttackLimit - gameState.timer;
      timerEl.textContent = formatTime(timeLeft);
      if (timeLeft < 60) {
        timerEl.style.color = '#ef4444';
        timerEl.style.animation = 'pulse 1s infinite';
      } else {
        timerEl.style.color = '';
        timerEl.style.animation = '';
      }
    } else {
      timerEl.textContent = formatTime(gameState.timer);
      timerEl.style.color = '';
      timerEl.style.animation = '';
    }
  }
}

function updateMistakes() {
  // Actualizar el contador principal
  const mistakesCounter = document.getElementById('mistakes-counter');
  if (mistakesCounter && gameState.currentTournamentLevel) {
    const level = gameState.currentTournamentLevel;
    const mistakesColor = gameState.mistakes >= level.requiredMistakes ? '#ef4444' : 
                         gameState.mistakes >= level.requiredMistakes - 1 ? '#f59e0b' : '#10b981';
    
    mistakesCounter.textContent = `${gameState.mistakes}/${level.requiredMistakes}`;
    mistakesCounter.style.color = mistakesColor;
  }

  // Actualizar la marca de verificación de errores
  const mistakesCheck = document.getElementById('mistakes-check');
  if (mistakesCheck && gameState.currentTournamentLevel) {
    const level = gameState.currentTournamentLevel;
    mistakesCheck.textContent = gameState.mistakes < level.requiredMistakes ? '✓' : '✗';
    mistakesCheck.style.color = gameState.mistakes < level.requiredMistakes ? '#10b981' : '#ef4444';
  }

  // También actualizar el contador general si existe
  const generalMistakes = document.getElementById('mistakes');
  if (generalMistakes) {
    generalMistakes.textContent = `Errores: ${gameState.mistakes}`;
  }
}

function updateHints() {
  const hintsEl = document.getElementById('hints');
  if (hintsEl) hintsEl.textContent = gameState.hintsUsed;
}

function showWinScreen() {
  recordSessionAnalysis();
  recordTimeDistribution(gameState.difficulty, gameState.timer);
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
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 20px;">
            <div style="font-size: 40px; font-weight: bold; color: white;">${formatTime(gameState.timer)}</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Tiempo</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 20px;">
            <div style="font-size: 40px; font-weight: bold; color: white;">${gameState.mistakes}</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Errores</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 20px;">
            <div style="font-size: 40px; font-weight: bold; color: white;">${gameState.hintsUsed}</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Pistas</div>
          </div>
        </div>

        <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 20px; margin-bottom: 40px;">
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
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-30px); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    ::-webkit-scrollbar {
      width: 10px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(255,255,255,0.1);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(102,126,234,0.5);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(102,126,234,0.8);
    }
    /* Mejoras visuales para el tablero */
    #board {
        font-family: 'Arial', sans-serif;
    }
    /* Efectos hover para celdas - CORREGIDO */
    #board div[onclick]:not([style*="cursor: default"]):hover {
        filter: brightness(0.95);
        transform: scale(1.02);
        z-index: 2;
    }
    /* Animación para números nuevos */
    @keyframes popIn {
        0% { transform: scale(0.8); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
    }
    #board div[onclick] div {
        animation: popIn 0.2s ease-out;
    }
    /* Mejora para botones numéricos */
    button {
        transition: all 0.2s ease;
    }
    button:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
    button:active {
        transform: translateY(0);
    }
  `;
  document.head.appendChild(style);
}

function updateCellAndRelated(row, col) {
  const boardEl = document.getElementById('board');
  if (!boardEl) return;

  const conflicts = gameState.autoCheck ? findConflicts() : [];
  const cellSize = getCellSize();
  const fontSize = getFontSize(20);
  const noteFontSize = getFontSize(10);
  
  let selectedValue = null;
  let selectedRow = null;
  let selectedCol = null;
  
  if (gameState.selectedCell) {
    selectedRow = gameState.selectedCell[0];
    selectedCol = gameState.selectedCell[1];
    selectedValue = gameState.currentPuzzle.puzzle[selectedRow][selectedCol] !== 0 
      ? gameState.currentPuzzle.puzzle[selectedRow][selectedCol] 
      : gameState.userBoard[selectedRow][selectedCol];
  }

  // Actualizar la celda modificada y todas las relacionadas
  const cellsToUpdate = new Set();
  cellsToUpdate.add(`${row}-${col}`);
  addRelatedCells(row, col, cellsToUpdate);

  // Si hay una celda seleccionada, también actualizar sus relacionadas
  if (gameState.selectedCell) {
    const [selRow, selCol] = gameState.selectedCell;
    addRelatedCells(selRow, selCol, cellsToUpdate);
  }

  // Actualizar solo las celdas que necesitan cambio
  cellsToUpdate.forEach(cellKey => {
    const [i, j] = cellKey.split('-').map(Number);
    const cellEl = boardEl.querySelector(`[data-cell="${i}-${j}"]`);
    if (cellEl) {
      updateSingleCell(cellEl, i, j, selectedValue, selectedRow, selectedCol, conflicts,
                      cellSize, fontSize, noteFontSize);
    }
  });
}

function recordSessionAnalysis() {
  if (!gameState.currentPuzzle) return;
  
  const sessionData = {
    date: new Date().toISOString(),
    difficulty: gameState.difficulty,
    time: gameState.timer,
    mistakes: gameState.mistakes,
    hintsUsed: gameState.hintsUsed,
    completed: true,
    puzzleId: gameState.currentGameId || `local_${Date.now()}`
  };
  
  gameState.advancedStats.sessionHistory.push(sessionData);
  
  // Mantener solo los últimos 100 registros
  if (gameState.advancedStats.sessionHistory.length > 100) {
    gameState.advancedStats.sessionHistory.shift();
  }
  
  updatePersonalBests();
  updateImprovementTimeline();
  saveAdvancedStats();
}

// Actualizar mejores marcas personales
function updatePersonalBests() {
  const difficulty = gameState.difficulty;
  const time = gameState.timer;
  const mistakes = gameState.mistakes;
  
  if (!gameState.advancedStats.personalBests[difficulty]) {
    gameState.advancedStats.personalBests[difficulty] = {
      bestTime: time,
      bestTimeDate: new Date().toISOString(),
      lowestMistakes: mistakes,
      lowestMistakesDate: new Date().toISOString()
    };
  } else {
    const pb = gameState.advancedStats.personalBests[difficulty];
    
    if (time < pb.bestTime) {
      pb.bestTime = time;
      pb.bestTimeDate = new Date().toISOString();
    }
    
    if (mistakes < pb.lowestMistakes) {
      pb.lowestMistakes = mistakes;
      pb.lowestMistakesDate = new Date().toISOString();
    }
  }
}

// Actualizar línea de tiempo de mejora
function updateImprovementTimeline() {
  const last30Sessions = gameState.advancedStats.sessionHistory.slice(-30);
  
  if (last30Sessions.length === 0) return;
  
  // Agrupar por semana para ver tendencias
  const weeklyAverages = {};
  
  last30Sessions.forEach(session => {
    const date = new Date(session.date);
    const weekKey = `${date.getFullYear()}-W${Math.floor(date.getDate() / 7)}`;
    
    if (!weeklyAverages[weekKey]) {
      weeklyAverages[weekKey] = { totalTime: 0, totalSessions: 0, weekStart: date };
    }
    
    weeklyAverages[weekKey].totalTime += session.time;
    weeklyAverages[weekKey].totalSessions++;
  });
  
  gameState.advancedStats.improvementTimeline = Object.entries(weeklyAverages).map(([week, data]) => ({
    week,
    averageTime: Math.round(data.totalTime / data.totalSessions),
    sessions: data.totalSessions,
    weekStart: data.weekStart
  }));
}

// Registrar error en el heatmap
function recordErrorHeatmap(row, col) {
  if (row >= 0 && row < 9 && col >= 0 && col < 9) {
    gameState.advancedStats.errorHeatmap[row][col]++;
    saveAdvancedStats();
  }
}

// Registrar uso de técnicas
function recordTechniqueUsage(technique) {
  if (gameState.advancedStats.techniqueUsage[technique] !== undefined) {
    gameState.advancedStats.techniqueUsage[technique]++;
    saveAdvancedStats();
  }
}

// Registrar tiempo por dificultad
function recordTimeDistribution(difficulty, time) {
  if (gameState.advancedStats.timeDistribution[difficulty] !== undefined) {
    gameState.advancedStats.timeDistribution[difficulty] += time;
    saveAdvancedStats();
  }
}

// Guardar estadísticas avanzadas
function saveAdvancedStats() {
  localStorage.setItem('sudoku-advanced-stats', JSON.stringify(gameState.advancedStats));
}

function showAdvancedAnalytics() {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  root.innerHTML = `
    <div style="height: 100vh; background: ${theme.bg}; padding: 20px; overflow-y: auto; box-sizing: border-box;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
          <button onclick="renderMenu()" style="background: rgba(255,255,255,0.2); color: ${theme.text}; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer; font-size: 16px;">← Volver</button>
          <h1 style="color: ${theme.text}; margin: 0;">📊 Análisis Avanzado</h1>
          <div style="width: 100px;"></div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <!-- Heatmap de Errores -->
          <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="color: ${theme.text}; margin-bottom: 20px;">🔥 Heatmap de Errores</h2>
            <div style="display: flex; justify-content: center;">
              ${renderErrorHeatmap()}
            </div>
            <div style="color: ${theme.text}; font-size: 14px; margin-top: 15px; text-align: center;">
              Áreas donde cometes más errores
            </div>
          </div>

          <!-- Mejores Marcas -->
          <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="color: ${theme.text}; margin-bottom: 20px;">🏆 Mejores Marcas</h2>
            <div style="display: flex; flex-direction: column; gap: 15px;">
              ${renderPersonalBests()}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <!-- Distribución de Tiempo -->
          <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="color: ${theme.text}; margin-bottom: 20px;">⏱️ Tiempo por Dificultad</h2>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${renderTimeDistribution()}
            </div>
          </div>

          <!-- Técnicas Utilizadas -->
          <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
            <h2 style="color: ${theme.text}; margin-bottom: 20px;">🔧 Técnicas Utilizadas</h2>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${renderTechniqueUsage()}
            </div>
          </div>
        </div>

        <!-- Progreso Temporal -->
        <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
          <h2 style="color: ${theme.text}; margin-bottom: 20px;">📈 Progreso en el Tiempo</h2>
          <div style="color: ${theme.text};">
            ${renderImprovementTimeline()}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Función para renderizar el heatmap de errores
function renderErrorHeatmap() {
  const maxErrors = Math.max(...gameState.advancedStats.errorHeatmap.flat());
  const cellSize = 30;
  
  let html = '<div style="display: inline-block; background: #374151; padding: 10px; border-radius: 10px;">';
  
  for (let i = 0; i < 9; i++) {
    html += '<div style="display: flex;">';
    for (let j = 0; j < 9; j++) {
      const errors = gameState.advancedStats.errorHeatmap[i][j];
      const intensity = maxErrors > 0 ? (errors / maxErrors) : 0;
      const color = intensity > 0.7 ? '#ef4444' : 
                   intensity > 0.4 ? '#f97316' : 
                   intensity > 0.1 ? '#fbbf24' : '#6b7280';
      
      html += `
        <div style="
          width: ${cellSize}px;
          height: ${cellSize}px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${color};
          color: white;
          font-size: 10px;
          font-weight: bold;
          border: 1px solid #4b5563;
        " title="Errores: ${errors}">
          ${errors > 0 ? errors : ''}
        </div>
      `;
    }
    html += '</div>';
  }
  html += '</div>';
  
  return html;
}

// Función para renderizar mejores marcas personales
function renderPersonalBests() {
  const pbs = gameState.advancedStats.personalBests;
  const difficulties = ['easy', 'medium', 'hard', 'expert', 'master'];
  
  return difficulties.map(diff => {
    const pb = pbs[diff];
    if (!pb) return `
      <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px;">
        <div style="color: ${themes[gameState.theme].text}; font-weight: bold; text-transform: capitalize;">${diff}</div>
        <div style="color: rgba(255,255,255,0.6); font-size: 12px;">Sin datos</div>
      </div>
    `;
    
    return `
      <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px;">
        <div style="color: ${themes[gameState.theme].text}; font-weight: bold; text-transform: capitalize;">${diff}</div>
        <div style="display: flex; justify-content: space-between; margin-top: 8px;">
          <div style="color: rgba(255,255,255,0.8); font-size: 12px;">
            ⏱️ ${formatTime(pb.bestTime)}
          </div>
          <div style="color: rgba(255,255,255,0.8); font-size: 12px;">
            ❌ ${pb.lowestMistakes}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Función para renderizar distribución de tiempo
function renderTimeDistribution() {
  const timeDist = gameState.advancedStats.timeDistribution;
  const totalTime = Object.values(timeDist).reduce((a, b) => a + b, 0);
  
  if (totalTime === 0) {
    return '<div style="color: rgba(255,255,255,0.6); text-align: center;">Sin datos de tiempo</div>';
  }
  
  return Object.entries(timeDist).map(([diff, time]) => {
    const percentage = totalTime > 0 ? Math.round((time / totalTime) * 100) : 0;
    const width = Math.max(10, percentage);
    
    return `
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="color: ${themes[gameState.theme].text}; text-transform: capitalize;">${diff}</span>
          <span style="color: rgba(255,255,255,0.8);">${formatTime(time)} (${percentage}%)</span>
        </div>
        <div style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: ${width}%; border-radius: 4px;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Función para renderizar uso de técnicas
function renderTechniqueUsage() {
  const techniques = gameState.advancedStats.techniqueUsage;
  const totalUses = Object.values(techniques).reduce((a, b) => a + b, 0);
  
  const techniqueNames = {
    singleCandidate: "Candidato Único",
    singlePosition: "Posición Única",
    candidateLine: "Línea de Candidatos", 
    doublePair: "Pares Dobles",
    multipleLines: "Múltiples Líneas"
  };
  
  return Object.entries(techniques).map(([tech, count]) => {
    const percentage = totalUses > 0 ? Math.round((count / totalUses) * 100) : 0;
    
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
        <span style="color: ${themes[gameState.theme].text}; font-size: 14px;">${techniqueNames[tech]}</span>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="background: rgba(255,255,255,0.1); width: 60px; height: 6px; border-radius: 3px;">
            <div style="background: #10b981; height: 100%; width: ${percentage}%; border-radius: 3px;"></div>
          </div>
          <span style="color: rgba(255,255,255,0.8); font-size: 12px; min-width: 30px;">${count}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Función para renderizar línea de tiempo de mejora
function renderImprovementTimeline() {
  const timeline = gameState.advancedStats.improvementTimeline;
  
  if (timeline.length === 0) {
    return '<div style="color: rgba(255,255,255,0.6); text-align: center;">No hay datos suficientes para mostrar progreso</div>';
  }
  
  const maxTime = Math.max(...timeline.map(item => item.averageTime));
  const minTime = Math.min(...timeline.map(item => item.averageTime));
  const timeRange = maxTime - minTime;
  
  return `
    <div style="display: flex; align-items: flex-end; gap: 10px; height: 120px; padding: 20px 0;">
      ${timeline.map((item, index) => {
        const height = timeRange > 0 ? 80 - ((item.averageTime - minTime) / timeRange) * 60 : 40;
        return `
          <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
            <div style="
              background: linear-gradient(to top, #667eea, #764ba2); 
              width: 20px; 
              height: ${height}px; 
              border-radius: 10px 10px 0 0;
              position: relative;
            " title="${formatTime(item.averageTime)} - ${item.sessions} sesiones">
            </div>
            <div style="color: rgba(255,255,255,0.7); font-size: 10px; margin-top: 5px;">${item.week.split('-W')[1]}</div>
          </div>
        `;
      }).join('')}
    </div>
    <div style="display: flex; justify-content: space-between; margin-top: 10px; color: rgba(255,255,255,0.6); font-size: 12px;">
      <div>Mejor: ${formatTime(minTime)}</div>
      <div>Peor: ${formatTime(maxTime)}</div>
    </div>
  `;
}

// Funciones Torneos 
function startTournamentLevel(chapterId, levelId, isBoss = false) {
  const chapter = tournamentStructure.chapters.find(c => c.id === chapterId);
  if (!chapter) return;
  
  const level = isBoss ? chapter.boss : chapter.levels.find(l => l.id === levelId);
  if (!level) return;
  
  // GUARDAR EL NIVEL ACTUAL
  gameState.currentTournamentLevel = level;
  gameState.currentTournamentChapter = chapter;
  
  // REINICIAR CONTADORES
  gameState.selectedCell = null;
  gameState.timer = 0;
  gameState.mistakes = 0; // ¡IMPORTANTE! Reiniciar a 0
  gameState.hintsUsed = 0;
  gameState.moveHistory = [];
  gameState.notes = {};
  gameState.notesMode = false;
  
  console.log(`Iniciando nivel torneo. Errores: ${gameState.mistakes}`); // Debug
  
  // Configurar modo de juego
  gameState.difficulty = level.difficulty;
  gameState.timeAttackMode = true;
  gameState.timeAttackLimit = level.timeLimit;
  gameState.expertMode = level.specialRule?.includes("Modo experto") || false;
  
  // Limpiar timer anterior
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
  }
  
  // Generar puzzle
  const generator = new SudokuGenerator();
  gameState.currentPuzzle = generator.generate(level.difficulty);
  gameState.userBoard = gameState.currentPuzzle.puzzle.map(row => [...row]);
  
  // Timer
  gameState.timerInterval = setInterval(() => {
    gameState.timer++;
    
    if (gameState.timer >= level.timeLimit) {
      clearInterval(gameState.timerInterval);
      showTournamentLevelResult(false, "¡Tiempo agotado!");
      return;
    }
    
    updateTimer();
  }, 1000);
  
  gameState.sound.click();
  renderTournamentGame(level, isBoss);
}

function renderTournamentGame(level, isBoss = false) {
  const theme = themes[gameState.theme];
  const timeLeft = level.timeLimit - gameState.timer;
  const timeWarning = timeLeft < 60;
  
  const mistakesColor = gameState.mistakes >= level.requiredMistakes ? '#ef4444' : 
                       gameState.mistakes >= level.requiredMistakes - 1 ? '#f59e0b' : '#10b981';
  
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="height: 100vh; background: ${theme.bg}; padding: 10px; overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column;">
      <div style="max-width: 1400px; margin: 0 auto; width: 100%; flex: 1; overflow-y: auto;">
        <div style="display: grid; grid-template-columns: 1fr 300px; gap: 15px; height: 100%;">
          
          <!-- Columna izquierda: Tablero -->
          <div style="display: flex; flex-direction: column; gap: 15px;">
            <!-- Header del torneo -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <button onclick="showTournamentChapter(${getCurrentChapter().id})" style="background: rgba(255,255,255,0.2); color: ${theme.text}; border: none; padding: 10px 15px; border-radius: 10px; cursor: pointer; font-size: 14px;">← Volver</button>
                <div style="text-align: center; color: ${theme.text};">
                  <div style="font-size: 18px; font-weight: bold;">${isBoss ? '👑 ' : ''}Nivel ${level.id}</div>
                  <div style="font-size: 12px; opacity: 0.8;">${level.difficulty.toUpperCase()}</div>
                </div>
                <div style="width: 100px; text-align: right;">
                  <div style="font-size: 24px; font-weight: bold; color: ${timeWarning ? '#ef4444' : theme.text};">
                    ${formatTime(timeLeft)}
                  </div>
                </div>
              </div>
              
              ${isBoss ? `
              <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 10px; border-radius: 10px; text-align: center; color: white; font-weight: bold;">
                👑 BOSS BATTLE: ${level.specialRule}
              </div>
              ` : ''}
              
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 15px;">
                <div style="text-align: center;">
                  <div style="color: ${theme.text}; font-size: 12px;">Errores</div>
                  <div id="mistakes-counter" style="color: ${mistakesColor}; font-size: 18px; font-weight: bold;">
                    ${gameState.mistakes}/${level.requiredMistakes}
                  </div>
                </div>
                <div style="text-align: center;">
                  <div style="color: ${theme.text}; font-size: 12px;">Vidas</div>
                  <div style="color: ${theme.text}; font-size: 18px; font-weight: bold;">${gameState.tournamentProgress.lives} ❤️</div>
                </div>
                <div style="text-align: center;">
                  <div style="color: ${theme.text}; font-size: 12px;">Estrellas</div>
                  <div style="color: #fbbf24; font-size: 18px; font-weight: bold;">
                    ${calculateEarnedStars(level, gameState.timer, gameState.mistakes)}/3 ⭐
                  </div>
                </div>
              </div>
            </div>

            <!-- Tablero -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 12px; border: 1px solid rgba(255,255,255,0.2);">
              <div style="display: flex; justify-content: center;">
                <div id="board"></div>
              </div>
            </div>

            <!-- Controles -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
              <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
                ${[1,2,3,4,5,6,7,8,9].map(num => `
                  <button onclick="inputNumber(${num})" style="
                    background: rgba(102, 126, 234, 0.8); 
                    color: white; 
                    padding: 16px; 
                    border: none; 
                    border-radius: 10px; 
                    font-size: 20px; 
                    font-weight: bold; 
                    cursor: pointer; 
                  ">${num}</button>
                `).join('')}
                <button onclick="inputNumber(0)" style="background: rgba(239,68,68,0.8); color: white; padding: 16px; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">✕</button>
              </div>
            </div>
          </div>

          <!-- Columna derecha: Información del nivel -->
          <div style="display: flex; flex-direction: column; gap: 15px;">
            <!-- Objetivos -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
              <h3 style="color: ${theme.text}; margin-bottom: 15px;">🎯 Objetivos</h3>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: ${theme.text}; font-size: 14px;">Completar el sudoku</span>
                  <span style="color: #10b981; font-size: 18px;">✓</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: ${theme.text}; font-size: 14px;">Menos de ${level.requiredMistakes} errores</span>
                  <span id="mistakes-check" style="color: ${gameState.mistakes < level.requiredMistakes ? '#10b981' : '#ef4444'}; font-size: 18px;">
                    ${gameState.mistakes < level.requiredMistakes ? '✓' : '✗'}
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: ${theme.text}; font-size: 14px;">Dentro del tiempo límite</span>
                  <span style="color: ${timeLeft > 0 ? '#10b981' : '#ef4444'}; font-size: 18px;">
                    ${timeLeft > 0 ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            </div>

            <!-- Recompensas de estrellas -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
              <h3 style="color: ${theme.text}; margin-bottom: 15px;">⭐ Recompensas</h3>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${level.stars.map((starTime, index) => {
                  const starsEarned = calculateEarnedStars(level, gameState.timer, gameState.mistakes);
                  const isUnlocked = starsEarned > index;
                  const currentTime = gameState.timer;
                  
                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: ${isUnlocked ? '#fbbf24' : '#6b7280'}; font-size: 16px;">
                          ${isUnlocked ? '⭐' : '☆'}
                        </span>
                        <span style="color: ${theme.text}; font-size: 14px;">
                          ${index + 1} estrella${index > 0 ? 's' : ''}
                        </span>
                      </div>
                      <span style="color: ${currentTime <= starTime ? '#10b981' : '#6b7280'}; font-size: 12px; font-family: monospace;">
                        < ${formatTime(starTime)}
                      </span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Reglas especiales -->
            ${isBoss ? `
            <div style="background: rgba(245, 158, 11, 0.1); backdrop-filter: blur(20px); border-radius: 20px; padding: 15px; border: 1px solid rgba(245, 158, 11, 0.3);">
              <h3 style="color: #f59e0b; margin-bottom: 10px;">⚡ Reglas del Boss</h3>
              <div style="color: #f59e0b; opacity: 0.9; font-size: 13px; line-height: 1.4;">
                ${level.specialRule}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
  
  renderBoard();

  setTimeout(() => {
    const mistakesCounter = document.getElementById('mistakes-counter');
    const mistakesCheck = document.getElementById('mistakes-check');
    console.log('Elementos después de render:', {
      mistakesCounter: mistakesCounter ? 'EXISTE' : 'NO EXISTE',
      mistakesCheck: mistakesCheck ? 'EXISTE' : 'NO EXISTE',
      mistakes: gameState.mistakes,
      requiredMistakes: level.requiredMistakes
    });
  }, 100);
}

function calculateEarnedStars(level, time, mistakes) {
  if (mistakes >= level.requiredMistakes) return 0;
  
  if (time <= level.stars[0]) return 3;
  if (time <= level.stars[1]) return 2;
  if (time <= level.stars[2]) return 1;
  return 0;
}

function showTournamentLevelResult(success, message) {
  const level = gameState.currentTournamentLevel;
  if (!level) return;
  
  const starsEarned = success ? calculateEarnedStars(level, gameState.timer, gameState.mistakes) : 0;
  
  if (success) {
    // Registrar victoria
    const levelCompletion = {
      levelId: level.id,
      stars: starsEarned,
      time: gameState.timer,
      mistakes: gameState.mistakes,
      date: new Date().toISOString()
    };
    
    if (!gameState.tournamentProgress.completedLevels.find(l => l.levelId === level.id)) {
      gameState.tournamentProgress.completedLevels.push(levelCompletion);
    } else {
      // Actualizar si mejoró el resultado
      const existing = gameState.tournamentProgress.completedLevels.find(l => l.levelId === level.id);
      if (starsEarned > existing.stars) {
        existing.stars = starsEarned;
        existing.time = gameState.timer;
        existing.mistakes = gameState.mistakes;
      }
    }
    
    gameState.tournamentProgress.totalScore += starsEarned * 100;
    
    // Desbloquear siguiente nivel si es necesario
    const chapter = gameState.currentTournamentChapter;
    if (chapter && !chapter.levels.find(l => l.id === level.id + 1) && !gameState.tournamentProgress.completedLevels.find(l => l.levelId === chapter.boss.id)) {
      // Este era el último nivel normal, desbloquear boss
      if (!gameState.tournamentProgress.completedLevels.find(l => l.levelId === chapter.boss.id)) {
        showNotification("👑 ¡Boss battle desbloqueado!");
      }
    }
    
  } else {
    // Registrar derrota - perder vida
    gameState.tournamentProgress.lives--;
    
    // Verificar game over
    if (gameState.tournamentProgress.lives <= 0) {
      gameState.tournamentProgress.lives = 0;
      showNotification("💀 ¡Game Over! Se acabaron las vidas");
    }
  }
  
  saveStats();
  
  // Mostrar pantalla de resultado
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  const bgGradient = success ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #dc2626, #991b1b)';
  
  root.innerHTML = `
    <div style="height: 100vh; background: ${bgGradient}; display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div style="max-width: 600px; width: 100%; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 50px; border: 1px solid rgba(255,255,255,0.2); text-align: center; color: white;">
        <div style="font-size: 100px; margin-bottom: 30px;">
          ${success ? '🏆' : '💀'}
        </div>
        <h1 style="font-size: 48px; font-weight: bold; margin: 0 0 20px 0;">
          ${success ? '¡Nivel Completado!' : 'Nivel Fallido'}
        </h1>
        <div style="font-size: 24px; opacity: 0.9; margin-bottom: 30px;">
          ${message}
        </div>
        
        ${success ? `
        <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 40px;">
          ${[1,2,3].map(star => `
            <div style="font-size: 50px; color: ${star <= starsEarned ? '#fbbf24' : 'rgba(255,255,255,0.3)'};">
              ${star <= starsEarned ? '⭐' : '☆'}
            </div>
          `).join('')}
        </div>
        
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; margin-bottom: 30px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div>
              <div style="font-size: 14px; opacity: 0.8;">Tiempo</div>
              <div style="font-size: 24px; font-weight: bold;">${formatTime(gameState.timer)}</div>
            </div>
            <div>
              <div style="font-size: 14px; opacity: 0.8;">Errores</div>
              <div style="font-size: 24px; font-weight: bold;">${gameState.mistakes}</div>
            </div>
            <div>
              <div style="font-size: 14px; opacity: 0.8;">Puntos</div>
              <div style="font-size: 24px; font-weight: bold;">+${starsEarned * 100}</div>
            </div>
          </div>
        </div>
        ` : `
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; margin-bottom: 30px;">
          <div style="font-size: 36px; font-weight: bold;">
            Vidas restantes: ${gameState.tournamentProgress.lives} ❤️
          </div>
          ${gameState.tournamentProgress.lives === 0 ? 
            '<div style="opacity: 0.8; margin-top: 10px;">¡Se acabaron las vidas! El torneo ha terminado.</div>' : 
            ''
          }
        </div>
        `}
        
        <div style="display: flex; flex-direction: column; gap: 15px;">
          ${success ? `
            ${getNextLevel() ? `
              <button onclick="startTournamentLevel(${getCurrentChapter().id}, ${getNextLevel().id})" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 20px 40px;
                border: none;
                border-radius: 15px;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🎮 Siguiente Nivel</button>
            ` : `
              <button onclick="showTournamentChapter(${getCurrentChapter().id})" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 20px 40px;
                border: none;
                border-radius: 15px;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🏆 Volver al Capítulo</button>
            `}
          ` : `
            ${gameState.tournamentProgress.lives > 0 ? `
              <button onclick="startTournamentLevel(${getCurrentChapter().id}, ${getCurrentLevel().id})" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 20px 40px;
                border: none;
                border-radius: 15px;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🔄 Reintentar Nivel</button>
            ` : `
              <button onclick="showTournamentMenu()" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 20px 40px;
                border: none;
                border-radius: 15px;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">📖 Volver al Torneo</button>
            `}
          `}
          
          <button onclick="showTournamentChapter(${getCurrentChapter().id})" style="
            background: rgba(255,255,255,0.1);
            color: white;
            padding: 20px 40px;
            border: none;
            border-radius: 15px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">📖 Volver al Capítulo</button>
          
          <button onclick="renderMenu()" style="
            background: rgba(255,255,255,0.05);
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 15px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🏠 Menú Principal</button>
        </div>
      </div>
    </div>
  `;
}
// Funciones auxiliares
function getCurrentChapter() {
  return gameState.currentTournamentChapter || tournamentStructure.chapters[0];
}

function getCurrentLevel() {
  return gameState.currentTournamentLevel;
}

function getNextLevel() {
  const chapter = getCurrentChapter();
  const currentLevel = getCurrentLevel();
  if (!currentLevel || !chapter) return null;
  
  // Si es el boss, no hay siguiente nivel en este capítulo
  if (currentLevel.id === chapter.boss.id) {
    return null;
  }
  
  // Buscar siguiente nivel normal
  const nextNormalLevel = chapter.levels.find(l => l.id === currentLevel.id + 1);
  if (nextNormalLevel) {
    return nextNormalLevel;
  }
  
  // Si no hay siguiente nivel normal, devolver el boss si está desbloqueado
  const allNormalLevelsCompleted = chapter.levels.every(level => 
    gameState.tournamentProgress.completedLevels.find(l => l.levelId === level.id)
  );
  
  if (allNormalLevelsCompleted && !gameState.tournamentProgress.completedLevels.find(l => l.levelId === chapter.boss.id)) {
    return chapter.boss;
  }
  
  return null;
}

function showTournamentChapter(chapterId) {
  const chapter = tournamentStructure.chapters.find(c => c.id === chapterId);
  if (!chapter) return;
  
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  root.innerHTML = `
    <div style="height: 100vh; background: ${theme.bg}; padding: 20px; overflow-y: auto; box-sizing: border-box;">
      <div style="max-width: 1000px; margin: 0 auto;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
          <button onclick="showTournamentMenu()" style="background: rgba(255,255,255,0.2); color: ${theme.text}; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer; font-size: 16px;">← Volver</button>
          <h1 style="color: ${theme.text}; margin: 0; text-align: center;">${chapter.name}</h1>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="color: ${theme.text}; background: rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 10px;">
              ❤️ ${gameState.tournamentProgress.lives}
            </div>
            <div style="color: ${theme.text}; background: rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 10px;">
              ⭐ ${gameState.tournamentProgress.totalScore}
            </div>
          </div>
        </div>
        
        <!-- Descripción del capítulo -->
        <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 25px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 30px;">
          <div style="color: ${theme.text}; font-size: 18px; line-height: 1.5; text-align: center;">
            ${chapter.description}
          </div>
        </div>
        
        <!-- Niveles del capítulo -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
          ${chapter.levels.map(level => {
            const completion = gameState.tournamentProgress.completedLevels.find(l => l.levelId === level.id);
            const isUnlocked = level.id === 1 || 
              gameState.tournamentProgress.completedLevels.find(l => l.levelId === level.id - 1);
            
            return `
              <div onclick="${isUnlocked ? `startTournamentLevel(${chapter.id}, ${level.id})` : ''}" style="
                background: ${isUnlocked ? theme.cardBg : 'rgba(255,255,255,0.05)'};
                backdrop-filter: blur(20px);
                border-radius: 15px;
                padding: 20px;
                border: 1px solid ${isUnlocked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'};
                cursor: ${isUnlocked ? 'pointer' : 'not-allowed'};
                opacity: ${isUnlocked ? 1 : 0.6};
                transition: transform 0.2s;
              " onmouseover="this.style.transform='${isUnlocked ? 'scale(1.05)' : 'none'}'" onmouseout="this.style.transform='scale(1)'">
                <div style="text-align: center; color: ${theme.text};">
                  <div style="font-size: 14px; opacity: 0.8; margin-bottom: 5px;">Nivel ${level.id}</div>
                  <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">${level.difficulty.toUpperCase()}</div>
                  
                  ${completion ? `
                    <div style="display: flex; justify-content: center; gap: 5px; margin-bottom: 10px;">
                      ${[1,2,3].map(star => `
                        <span style="color: ${star <= completion.stars ? '#fbbf24' : '#6b7280'}; font-size: 16px;">
                          ${star <= completion.stars ? '⭐' : '☆'}
                        </span>
                      `).join('')}
                    </div>
                    <div style="font-size: 12px; opacity: 0.8;">
                      ${formatTime(completion.time)}
                    </div>
                  ` : `
                    <div style="font-size: 12px; opacity: 0.8; margin-bottom: 15px;">
                      ${formatTime(level.timeLimit)} límite
                    </div>
                    ${!isUnlocked ? `
                      <div style="font-size: 11px; color: #ef4444;">
                        Completa el nivel anterior
                      </div>
                    ` : `
                      <div style="font-size: 11px; color: #10b981;">
                        ¡Comenzar!
                      </div>
                    `}
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <!-- Boss Battle -->
        <div onclick="${isBossUnlocked(chapter) ? `startTournamentLevel(${chapter.id}, ${chapter.boss.id}, true)` : ''}" style="
          background: ${isBossUnlocked(chapter) ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(245, 158, 11, 0.3)'};
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 30px;
          border: 2px solid ${isBossUnlocked(chapter) ? 'rgba(245, 158, 11, 0.5)' : 'rgba(245, 158, 11, 0.2)'};
          cursor: ${isBossUnlocked(chapter) ? 'pointer' : 'not-allowed'};
          opacity: ${isBossUnlocked(chapter) ? 1 : 0.6};
          transition: transform 0.2s;
          text-align: center;
        " onmouseover="this.style.transform='${isBossUnlocked(chapter) ? 'scale(1.02)' : 'none'}'" onmouseout="this.style.transform='scale(1)'">
          <div style="color: white;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">👑 BOSS BATTLE</div>
            <div style="font-size: 16px; margin-bottom: 15px; opacity: 0.9;">${chapter.boss.specialRule}</div>
            <div style="font-size: 14px; opacity: 0.8;">
              ${isBossUnlocked(chapter) ? 
                '¡Completa todos los niveles para desbloquear!' : 
                'Completa todos los niveles normales primero'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function isBossUnlocked(chapter) {
  return chapter.levels.every(level => 
    gameState.tournamentProgress.completedLevels.find(l => l.levelId === level.id)
  );
}

function showTournamentMenu() {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  root.innerHTML = `
    <div style="height: 100vh; background: ${theme.bg}; padding: 20px; overflow-y: auto; box-sizing: border-box;">
      <div style="max-width: 800px; margin: 0 auto;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <button onclick="renderMenu()" style="background: rgba(255,255,255,0.2); color: ${theme.text}; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer; font-size: 16px; position: absolute; left: 20px;">← Menú</button>
          <h1 style="color: ${theme.text}; font-size: 48px; margin: 0 0 10px 0;">🏆 Torneo</h1>
          <p style="color: ${theme.text}; opacity: 0.8; font-size: 18px;">Completa niveles, gana estrellas y conviértete en leyenda</p>
        </div>
        
        <!-- Estadísticas del torneo -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px;">
          <div style="background: ${theme.cardBg}; padding: 25px; border-radius: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
            <div style="color: ${theme.text}; font-size: 36px; font-weight: bold;">${gameState.tournamentProgress.lives}</div>
            <div style="color: ${theme.text}; opacity: 0.8;">Vidas</div>
          </div>
          <div style="background: ${theme.cardBg}; padding: 25px; border-radius: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
            <div style="color: ${theme.text}; font-size: 36px; font-weight: bold;">${gameState.tournamentProgress.totalScore}</div>
            <div style="color: ${theme.text}; opacity: 0.8;">Puntos</div>
          </div>
          <div style="background: ${theme.cardBg}; padding: 25px; border-radius: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.2);">
            <div style="color: ${theme.text}; font-size: 36px; font-weight: bold;">${gameState.tournamentProgress.completedLevels.length}</div>
            <div style="color: ${theme.text}; opacity: 0.8;">Niveles</div>
          </div>
        </div>
        
        <!-- Capítulos -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          ${tournamentStructure.chapters.map(chapter => {
            const isUnlocked = gameState.tournamentProgress.unlockedChapters.includes(chapter.id);
            const completedLevels = gameState.tournamentProgress.completedLevels.filter(l => 
              chapter.levels.some(cl => cl.id === l.levelId) || l.levelId === chapter.boss.id
            ).length;
            const totalLevels = chapter.levels.length + 1; // +1 for boss
            
            return `
              <div onclick="${isUnlocked ? `showTournamentChapter(${chapter.id})` : ''}" style="
                background: ${isUnlocked ? theme.cardBg : 'rgba(255,255,255,0.05)'};
                backdrop-filter: blur(20px);
                border-radius: 20px;
                padding: 25px;
                border: 1px solid ${isUnlocked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'};
                cursor: ${isUnlocked ? 'pointer' : 'not-allowed'};
                opacity: ${isUnlocked ? 1 : 0.6};
                transition: transform 0.2s;
                color: ${theme.text};
              " onmouseover="this.style.transform='${isUnlocked ? 'scale(1.02)' : 'none'}'" onmouseout="this.style.transform='scale(1)'">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px;">
                      ${chapter.name}
                    </div>
                    <div style="opacity: 0.7; font-size: 14px;">
                      ${chapter.description}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 24px; font-weight: bold;">
                      ${completedLevels}/${totalLevels}
                    </div>
                    <div style="opacity: 0.7; font-size: 12px;">
                      Niveles
                    </div>
                  </div>
                </div>
                ${!isUnlocked ? `
                  <div style="color: #ef4444; font-size: 12px; margin-top: 10px;">
                    Completa el capítulo anterior para desbloquear
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function showTournamentChapter(chapterId) {
  const chapter = tournamentStructure.chapters.find(c => c.id === chapterId);
  if (!chapter) return;
  
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  root.innerHTML = `
    <div style="height: 100vh; background: ${theme.bg}; padding: 20px; overflow-y: auto; box-sizing: border-box;">
      <div style="max-width: 1000px; margin: 0 auto;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
          <button onclick="showTournamentMenu()" style="background: rgba(255,255,255,0.2); color: ${theme.text}; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer; font-size: 16px;">← Volver</button>
          <h1 style="color: ${theme.text}; margin: 0; text-align: center;">${chapter.name}</h1>
          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="color: ${theme.text}; background: rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 10px;">
              ❤️ ${gameState.tournamentProgress.lives}
            </div>
            <div style="color: ${theme.text}; background: rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 10px;">
              ⭐ ${gameState.tournamentProgress.totalScore}
            </div>
          </div>
        </div>
        
        <!-- Descripción del capítulo -->
        <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 25px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 30px;">
          <div style="color: ${theme.text}; font-size: 18px; line-height: 1.5; text-align: center;">
            ${chapter.description}
          </div>
        </div>
        
        <!-- Niveles del capítulo -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
          ${chapter.levels.map(level => {
            const completion = gameState.tournamentProgress.completedLevels.find(l => l.levelId === level.id);
            const isUnlocked = level.id === 1 || 
              gameState.tournamentProgress.completedLevels.find(l => l.levelId === level.id - 1);
            
            return `
              <div onclick="${isUnlocked ? `startTournamentLevel(${chapter.id}, ${level.id})` : ''}" style="
                background: ${isUnlocked ? theme.cardBg : 'rgba(255,255,255,0.05)'};
                backdrop-filter: blur(20px);
                border-radius: 15px;
                padding: 20px;
                border: 1px solid ${isUnlocked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'};
                cursor: ${isUnlocked ? 'pointer' : 'not-allowed'};
                opacity: ${isUnlocked ? 1 : 0.6};
                transition: transform 0.2s;
                color: ${theme.text};
              " onmouseover="this.style.transform='${isUnlocked ? 'scale(1.05)' : 'none'}'" onmouseout="this.style.transform='scale(1)'">
                <div style="text-align: center;">
                  <div style="opacity: 0.8; margin-bottom: 5px;">Nivel ${level.id}</div>
                  <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">${level.difficulty.toUpperCase()}</div>
                  
                  ${completion ? `
                    <div style="display: flex; justify-content: center; gap: 5px; margin-bottom: 10px;">
                      ${[1,2,3].map(star => `
                        <span style="color: ${star <= completion.stars ? '#fbbf24' : '#6b7280'}; font-size: 16px;">
                          ${star <= completion.stars ? '⭐' : '☆'}
                        </span>
                      `).join('')}
                    </div>
                    <div style="opacity: 0.8; font-size: 12px;">
                      ${formatTime(completion.time)}
                    </div>
                  ` : `
                    <div style="opacity: 0.8; margin-bottom: 15px; font-size: 12px;">
                      ${formatTime(level.timeLimit)} límite
                    </div>
                    ${!isUnlocked ? `
                      <div style="color: #ef4444; font-size: 11px;">
                        Completa el nivel anterior
                      </div>
                    ` : `
                      <div style="color: #10b981; font-size: 11px;">
                        ¡Comenzar!
                      </div>
                    `}
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <!-- Boss Battle -->
        <div onclick="${isBossUnlocked(chapter) ? `startTournamentLevel(${chapter.id}, ${chapter.boss.id}, true)` : ''}" style="
          background: ${isBossUnlocked(chapter) ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(245, 158, 11, 0.3)'};
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 30px;
          border: 2px solid ${isBossUnlocked(chapter) ? 'rgba(245, 158, 11, 0.5)' : 'rgba(245, 158, 11, 0.2)'};
          cursor: ${isBossUnlocked(chapter) ? 'pointer' : 'not-allowed'};
          opacity: ${isBossUnlocked(chapter) ? 1 : 0.6};
          transition: transform 0.2s;
          text-align: center;
          color: white;
        " onmouseover="this.style.transform='${isBossUnlocked(chapter) ? 'scale(1.02)' : 'none'}'" onmouseout="this.style.transform='scale(1)'">
          <div>
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">👑 BOSS BATTLE</div>
            <div style="font-size: 16px; margin-bottom: 15px; opacity: 0.9;">${chapter.boss.specialRule}</div>
            <div style="font-size: 14px; opacity: 0.8;">
              ${isBossUnlocked(chapter) ? 
                '¡Desbloqueado! ¡Haz clic para comenzar!' : 
                'Completa todos los niveles normales primero'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderTournamentGame(level, isBoss = false) {
  const theme = themes[gameState.theme];
  const timeLeft = level.timeLimit - gameState.timer;
  const timeWarning = timeLeft < 60;
  
  const mistakesColor = gameState.mistakes >= level.requiredMistakes ? '#ef4444' : 
                       gameState.mistakes >= level.requiredMistakes - 1 ? '#f59e0b' : '#10b981';
  
  const root = document.getElementById('root');
  root.innerHTML = `
    <div style="height: 100vh; background: ${theme.bg}; padding: 10px; overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column;">
      <div style="max-width: 1400px; margin: 0 auto; width: 100%; flex: 1; overflow-y: auto;">
        <div style="display: grid; grid-template-columns: 1fr 300px; gap: 15px; height: 100%;">
          
          <!-- Columna izquierda: Tablero -->
          <div style="display: flex; flex-direction: column; gap: 15px;">
            <!-- Header del torneo -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <button onclick="showTournamentChapter(${getCurrentChapter().id})" style="background: rgba(255,255,255,0.2); color: ${theme.text}; border: none; padding: 10px 15px; border-radius: 10px; cursor: pointer; font-size: 14px;">← Volver</button>
                <div style="text-align: center; color: ${theme.text};">
                  <div style="font-size: 18px; font-weight: bold;">${isBoss ? '👑 ' : ''}Nivel ${level.id}</div>
                  <div style="font-size: 12px; opacity: 0.8;">${level.difficulty.toUpperCase()}</div>
                </div>
                <div style="width: 100px; text-align: right;">
                  <div style="font-size: 24px; font-weight: bold; color: ${timeWarning ? '#ef4444' : theme.text};">
                    ${formatTime(timeLeft)}
                  </div>
                </div>
              </div>
              
              ${isBoss ? `
              <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 10px; border-radius: 10px; text-align: center; color: white; font-weight: bold;">
                👑 BOSS BATTLE: ${level.specialRule}
              </div>
              ` : ''}
              
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 15px;">
                <div style="text-align: center;">
                  <div style="color: ${theme.text}; font-size: 12px;">Errores</div>
                  <div id="mistakes-counter" style="color: ${mistakesColor}; font-size: 18px; font-weight: bold;">
                    ${gameState.mistakes}/${level.requiredMistakes}
                  </div>
                </div>
                <div style="text-align: center;">
                  <div style="color: ${theme.text}; font-size: 12px;">Vidas</div>
                  <div style="color: ${theme.text}; font-size: 18px; font-weight: bold;">${gameState.tournamentProgress.lives} ❤️</div>
                </div>
                <div style="text-align: center;">
                  <div style="color: ${theme.text}; font-size: 12px;">Estrellas</div>
                  <div style="color: #fbbf24; font-size: 18px; font-weight: bold;">
                    ${calculateEarnedStars(level, gameState.timer, gameState.mistakes)}/3 ⭐
                  </div>
                </div>
              </div>
            </div>

            <!-- Tablero -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 12px; border: 1px solid rgba(255,255,255,0.2);">
              <div style="display: flex; justify-content: center;">
                <div id="board"></div>
              </div>
            </div>

            <!-- Controles -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 15px; border: 1px solid rgba(255,255,255,0.2);">
              <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
                ${[1,2,3,4,5,6,7,8,9].map(num => `
                  <button onclick="inputNumber(${num})" style="
                    background: rgba(102, 126, 234, 0.8); 
                    color: white; 
                    padding: 16px; 
                    border: none; 
                    border-radius: 10px; 
                    font-size: 20px; 
                    font-weight: bold; 
                    cursor: pointer; 
                  ">${num}</button>
                `).join('')}
                <button onclick="inputNumber(0)" style="background: rgba(239,68,68,0.8); color: white; padding: 16px; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">✕</button>
              </div>
            </div>
          </div>

          <!-- Columna derecha: Información del nivel -->
          <div style="display: flex; flex-direction: column; gap: 15px;">
            <!-- Objetivos -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.2);">
              <h3 style="color: ${theme.text}; margin-bottom: 15px;">🎯 Objetivos</h3>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: ${theme.text}; font-size: 14px;">Completar el sudoku</span>
                  <span style="color: #10b981; font-size: 18px;">✓</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: ${theme.text}; font-size: 14px;">Menos de ${level.requiredMistakes} errores</span>
                  <span id="mistakes-check" style="color: ${gameState.mistakes < level.requiredMistakes ? '#10b981' : '#ef4444'}; font-size: 18px;">
                    ${gameState.mistakes < level.requiredMistakes ? '✓' : '✗'}
                  </span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: ${theme.text}; font-size: 14px;">Dentro del tiempo límite</span>
                  <span style="color: ${timeLeft > 0 ? '#10b981' : '#ef4444'}; font-size: 18px;">
                    ${timeLeft > 0 ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            </div>

            <!-- Resto del código igual... -->
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Renderizar el tablero después de crear la estructura
  renderBoard();
  
  // Debug para verificar que los elementos se crearon
  setTimeout(() => {
    const mistakesCounter = document.getElementById('mistakes-counter');
    const mistakesCheck = document.getElementById('mistakes-check');
    console.log('Después de renderTournamentGame:', {
      mistakesCounter: mistakesCounter ? `EXISTE: "${mistakesCounter.textContent}"` : 'NO EXISTE',
      mistakesCheck: mistakesCheck ? `EXISTE: "${mistakesCheck.textContent}"` : 'NO EXISTE'
    });
  }, 100);
}

function showTournamentLevelResult(success, message) {
  const level = getCurrentLevel();
  const starsEarned = success ? calculateEarnedStars(level, gameState.timer, gameState.mistakes) : 0;
  
  if (success) {
    // Registrar victoria
    const levelCompletion = {
      levelId: level.id,
      stars: starsEarned,
      time: gameState.timer,
      mistakes: gameState.mistakes,
      date: new Date().toISOString()
    };
    
    if (!gameState.tournamentProgress.completedLevels.find(l => l.levelId === level.id)) {
      gameState.tournamentProgress.completedLevels.push(levelCompletion);
    } else {
      // Actualizar si mejoró el resultado
      const existing = gameState.tournamentProgress.completedLevels.find(l => l.levelId === level.id);
      if (starsEarned > existing.stars) {
        existing.stars = starsEarned;
        existing.time = gameState.timer;
        existing.mistakes = gameState.mistakes;
      }
    }
    
    gameState.tournamentProgress.totalScore += starsEarned * 100;
    
  } else {
    // Registrar derrota - perder vida
    gameState.tournamentProgress.lives--;
  }
  
  saveStats();
  
  // Mostrar pantalla de resultado
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  const bgGradient = success ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #dc2626, #991b1b)';
  
  root.innerHTML = `
    <div style="height: 100vh; background: ${bgGradient}; display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div style="max-width: 600px; width: 100%; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 50px; border: 1px solid rgba(255,255,255,0.2); text-align: center; color: white;">
        <div style="font-size: 100px; margin-bottom: 30px;">
          ${success ? '🏆' : '💀'}
        </div>
        <h1 style="font-size: 48px; font-weight: bold; margin: 0 0 20px 0;">
          ${success ? '¡Nivel Completado!' : 'Nivel Fallido'}
        </h1>
        <div style="font-size: 24px; opacity: 0.9; margin-bottom: 30px;">
          ${message}
        </div>
        
        ${success ? `
        <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 40px;">
          ${[1,2,3].map(star => `
            <div style="font-size: 50px; color: ${star <= starsEarned ? '#fbbf24' : 'rgba(255,255,255,0.3)'};">
              ${star <= starsEarned ? '⭐' : '☆'}
            </div>
          `).join('')}
        </div>
        
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; margin-bottom: 30px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
            <div>
              <div style="font-size: 14px; opacity: 0.8;">Tiempo</div>
              <div style="font-size: 24px; font-weight: bold;">${formatTime(gameState.timer)}</div>
            </div>
            <div>
              <div style="font-size: 14px; opacity: 0.8;">Errores</div>
              <div style="font-size: 24px; font-weight: bold;">${gameState.mistakes}</div>
            </div>
            <div>
              <div style="font-size: 14px; opacity: 0.8;">Puntos</div>
              <div style="font-size: 24px; font-weight: bold;">+${starsEarned * 100}</div>
            </div>
          </div>
        </div>
        ` : `
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; margin-bottom: 30px;">
          <div style="font-size: 36px; font-weight: bold;">
            Vidas restantes: ${gameState.tournamentProgress.lives} ❤️
          </div>
          ${gameState.tournamentProgress.lives === 0 ? 
            '<div style="opacity: 0.8; margin-top: 10px;">¡Se acabaron las vidas! El torneo ha terminado.</div>' : 
            ''
          }
        </div>
        `}
        
        <div style="display: flex; flex-direction: column; gap: 15px;">
          ${success ? `
            ${getNextLevel() ? `
              <button onclick="startTournamentLevel(${getCurrentChapter().id}, ${getNextLevel().id})" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 20px 40px;
                border: none;
                border-radius: 15px;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🎮 Siguiente Nivel</button>
            ` : `
              <button onclick="showTournamentChapter(${getCurrentChapter().id})" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 20px 40px;
                border: none;
                border-radius: 15px;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🏆 Volver al Capítulo</button>
            `}
          ` : `
            ${gameState.tournamentProgress.lives > 0 ? `
              <button onclick="startTournamentLevel(${getCurrentChapter().id}, ${getCurrentLevel().id})" style="
                background: rgba(255,255,255,0.2);
                color: white;
                padding: 20px 40px;
                border: none;
                border-radius: 15px;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🔄 Reintentar Nivel</button>
            ` : ''}
          `}
          
          <button onclick="showTournamentChapter(${getCurrentChapter().id})" style="
            background: rgba(255,255,255,0.1);
            color: white;
            padding: 20px 40px;
            border: none;
            border-radius: 15px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">📖 Volver al Capítulo</button>
          
          <button onclick="renderMenu()" style="
            background: rgba(255,255,255,0.05);
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 15px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🏠 Menú Principal</button>
        </div>
      </div>
    </div>
  `;
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
  // Verificar si hay usuario logueado
  const token = localStorage.getItem('sudoku-token');
  const user = localStorage.getItem('sudoku-user');
  
  if (token && user) {
    try {
      gameState.token = token;
      gameState.user = JSON.parse(user);
      gameState.isOnline = true;
      
      // Verificar que el token sea válido
      SudokuAPI.getProfile().catch(() => {
        // Token inválido, limpiar y mostrar auth
        logout();
      });
      
      renderMenu();
    } catch (error) {
      console.error('Error initializing app:', error);
      renderAuth();
    }
  } else {
    renderAuth();
  }
});

// Listener para redimensionar ventana
window.addEventListener('resize', () => {
  if (gameState.currentPuzzle) {
    renderGame();
  } else {
    renderMenu();
  }
});