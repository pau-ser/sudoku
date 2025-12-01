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

  static async getDailyChallenge() {
    return this.request('/daily-challenge/today');
  }

  static async startDailyChallenge() {
    return this.request('/daily-challenge/start', {
      method: 'POST'
    });
  }

  static async getDailyLeaderboard(date = null) {
    const endpoint = date ? `/daily-challenge/leaderboard?date=${date}` : '/daily-challenge/leaderboard';
    return this.request(endpoint);
  }

  static async getMyDailyRank(date = null) {
    const endpoint = date ? `/daily-challenge/my-rank?date=${date}` : '/daily-challenge/my-rank';
    return this.request(endpoint);
  }

  static async getMyDailyHistory() {
    return this.request('/daily-challenge/my-history');
  }

  static async getDailyStats() {
    return this.request('/daily-challenge/stats');
  }

  // Battle Royale endpoints
  static async createBattleRoyale(settings) {
    return this.request('/battle-royale/create', {
      method: 'POST',
      body: settings
    });
  }

  static async getBattleRoyaleRooms() {
    return this.request('/battle-royale/rooms');
  }

  static async joinBattleRoyale(roomCode) {
    return this.request(`/battle-royale/join/${roomCode}`, {
      method: 'POST'
    });
  }

  static async getBattleRoyale(id) {
    return this.request(`/battle-royale/${id}`);
  }

  static async startBattleRoyale(id) {
    return this.request(`/battle-royale/${id}/start`, {
      method: 'POST'
    });
  }

  static async makeBattleRoyaleMove(id, moveData) {
    return this.request(`/battle-royale/${id}/move`, {
      method: 'POST',
      body: moveData
    });
  }

  static async leaveBattleRoyale(id) {
    return this.request(`/battle-royale/${id}/leave`, {
      method: 'POST'
    });
  }

  static async getBattleRoyaleHistory() {
    return this.request('/battle-royale/history/me');
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

  // Battle Royale
  battleRoyale: {
    currentRoomId: null,
    roomCode: null,
    socket: null,
    isHost: false,
    players: [],
    status: 'waiting', // waiting, starting, active, finished
    eliminationTimer: null,
    myProgress: 0,
    isAlive: true,
    countdown: null
  },

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

async function checkServerConnection() {
  try {
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Servidor no disponible:', error.message);
    return false;
  }
}

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

async function getDailyChallenge() {
  try {
    if (gameState.isOnline) {
      // Modo online - obtener del servidor
      const dailyData = await SudokuAPI.getDailyChallenge();
      
      const today = new Date().toDateString();
      
      // Verificar si ya lo completamos hoy
      const myRank = await SudokuAPI.getMyDailyRank().catch(() => null);
      
      const daily = {
        date: today,
        puzzle: {
          puzzle: dailyData.puzzle,
          solution: null, // No enviamos solución al cliente
          clues: dailyData.clues
        },
        completed: myRank?.participated || false,
        time: myRank?.time || null,
        mistakes: myRank?.mistakes || null,
        rank: myRank?.rank || null,
        totalPlayers: dailyData.stats.totalPlayers,
        avgTime: dailyData.stats.avgTime
      };
      
      return daily;
      
    } else {
      // Modo offline - generar localmente (código existente)
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
  } catch (error) {
    console.error('Error getting daily challenge:', error);
    showNotification('❌ Error al obtener reto diario');
    return null;
  }
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
    
    if (isDailyChallenge && gameState.isOnline) {
      // CORREGIDO: Iniciar Daily Challenge online
      try {
        const response = await SudokuAPI.startDailyChallenge();
        
        console.log('Daily Challenge response:', response); // Debug
        
        // Verificar si ya lo completó
        if (response.completed || response.error) {
          showNotification(response.error || 'Ya completaste el reto diario');
          
          // Mostrar ranking en su lugar
          setTimeout(() => {
            showDailyChallengeLeaderboard();
          }, 1500);
          return;
        }
        
        // Verificar que tenemos el puzzle
        if (!response.puzzle || !Array.isArray(response.puzzle)) {
          throw new Error('Respuesta del servidor inválida: no se recibió el puzzle');
        }
        
        gameState.currentPuzzle = {
          puzzle: response.puzzle,
          solution: null, // No tenemos solución en el cliente por seguridad
          clues: response.clues || response.puzzle.flat().filter(c => c !== 0).length
        };
        
        gameState.userBoard = response.userBoard || response.puzzle.map(row => [...row]);
        gameState.currentGameId = response.gameId;
        gameState.difficulty = 'hard'; // Daily siempre es hard
        
        showNotification(`🏆 Reto Diario iniciado`);
        
      } catch (apiError) {
        console.error('Error al iniciar Daily Challenge online:', apiError);
        showNotification(`❌ Error: ${apiError.message}`);
        
        // Fallback: intentar cargar offline
        showNotification('⚠️ Intentando modo offline...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const daily = await getDailyChallenge();
        if (!daily) {
          showNotification('❌ No se pudo cargar el reto diario');
          return;
        }
        
        gameState.currentPuzzle = daily.puzzle;
        gameState.userBoard = daily.puzzle.puzzle.map(row => [...row]);
        gameState.currentGameId = null;
        gameState.isOnline = false; // Marcar como offline temporalmente
        showNotification('📴 Jugando en modo offline');
      }
      
    } else if (isDailyChallenge && !gameState.isOnline) {
      // Daily Challenge offline
      const daily = await getDailyChallenge();
      if (!daily) {
        showNotification('❌ Error al cargar reto diario');
        return;
      }
      
      if (daily.completed) {
        showNotification('✅ Ya completaste el reto diario');
        return;
      }
      
      gameState.currentPuzzle = daily.puzzle;
      gameState.userBoard = daily.puzzle.puzzle.map(row => [...row]);
      gameState.currentGameId = null;
      showNotification('🏆 Reto Diario (offline)');
      
    } else if (gameState.isOnline && !isDailyChallenge) {
      // Juego normal online
      const mode = isTimeAttack ? 'timeAttack' : isExpert ? 'expert' : 'normal';
      
      const response = await SudokuAPI.createGame({
        difficulty,
        mode
      });
      
      if (!response.puzzle) {
        throw new Error('No se recibió el puzzle del servidor');
      }
      
      gameState.currentPuzzle = {
        puzzle: response.puzzle,
        solution: null,
        clues: response.clues
      };
      gameState.userBoard = response.puzzle.map(row => [...row]);
      gameState.currentGameId = response.gameId;
      gameState.expertMode = response.expertMode || false;
      gameState.timeAttackLimit = response.timeAttackLimit || 600;
      
      showNotification(`🎮 Nuevo juego ${difficulty}`);
      
    } else {
      // Juego offline normal
      const generator = new SudokuGenerator();
      gameState.currentPuzzle = generator.generate(difficulty);
      gameState.userBoard = gameState.currentPuzzle.puzzle.map(row => [...row]);
      gameState.currentGameId = null;
      showNotification(`🎮 Nuevo juego ${difficulty} (offline)`);
    }
    
    // Verificar que tenemos un puzzle válido antes de continuar
    if (!gameState.currentPuzzle || !gameState.currentPuzzle.puzzle) {
      throw new Error('No se pudo inicializar el puzzle correctamente');
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
    
    // Último fallback: generar offline
    if (!isDailyChallenge) {
      try {
        const generator = new SudokuGenerator();
        gameState.currentPuzzle = generator.generate(difficulty);
        gameState.userBoard = gameState.currentPuzzle.puzzle.map(row => [...row]);
        gameState.currentGameId = null;
        gameState.isOnline = false;
        showNotification('📴 Continuando en modo offline');
        renderGame();
      } catch (fallbackError) {
        showNotification('❌ Error crítico al iniciar juego');
        console.error('Fallback error:', fallbackError);
      }
    }
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

// Reemplazar la función inputNumber() completa en app.js

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
      // MODO ANOTACIONES (sin cambios)
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
      // MODO NORMAL - ENTRADA DE NÚMERO
      const oldValue = gameState.userBoard[row][col];
      
      if (gameState.isOnline && gameState.currentGameId) {
        // ========== MODO ONLINE ==========
        try {
          // Primero actualizamos el tablero localmente para feedback inmediato
          gameState.userBoard[row][col] = num;
          
          // Limpiar notas si existen
          if (gameState.notes[key]) {
            delete gameState.notes[key];
          }
          
          // Actualizar UI inmediatamente
          const conflicts = gameState.autoCheck ? findConflicts() : [];
          renderBoard(conflicts);
          
          // Enviar movimiento al servidor
          const response = await SudokuAPI.makeMove(gameState.currentGameId, {
            row,
            col,
            value: num,
            notesMode: false
          });
          
          // Actualizar estado con la respuesta del servidor
          gameState.mistakes = response.mistakes || gameState.mistakes;
          gameState.userBoard = response.userBoard || gameState.userBoard;
          
          // Sonido según si es correcto o no
          if (!response.isCorrect && num !== 0) {
            gameState.sound.error();
            updateMistakes();
            
            // Verificar límite de errores en torneo
            if (gameState.currentTournamentLevel) {
              const level = gameState.currentTournamentLevel;
              if (gameState.mistakes >= level.requiredMistakes) {
                showNotification(`⚠️ ¡Límite de errores alcanzado! (${level.requiredMistakes})`);
                setTimeout(() => {
                  clearInterval(gameState.timerInterval);
                  showTournamentLevelResult(false, `¡Demasiados errores! (${gameState.mistakes}/${level.requiredMistakes})`);
                }, 1500);
              }
            }
          } else if (num !== 0) {
            gameState.sound.input();
            cleanRelatedNotes(row, col, num);
          } else {
            gameState.sound.click();
          }
          
          // Verificar victoria
          if (response.completed) {
            clearInterval(gameState.timerInterval);
            gameState.timer = response.time || gameState.timer;
            gameState.sound.complete();
            
            // Verificar si es Daily Challenge
            if (response.mode === 'daily' || gameState.difficulty === 'hard') {
              showDailyChallengeWinScreen();
            } else {
              showWinScreen();
            }
            return;
          }
          
          // Re-renderizar con datos actualizados
          const newConflicts = gameState.autoCheck ? findConflicts() : [];
          renderBoard(newConflicts);
          
        } catch (apiError) {
          console.error('Error enviando movimiento al servidor:', apiError);
          
          // Revertir cambio local si falla
          gameState.userBoard[row][col] = oldValue;
          renderBoard();
          
          showNotification('⚠️ Error de conexión, reintentando...');
          
          // Reintentar una vez
          setTimeout(async () => {
            try {
              await SudokuAPI.makeMove(gameState.currentGameId, {
                row,
                col,
                value: num,
                notesMode: false
              });
              gameState.userBoard[row][col] = num;
              renderBoard();
            } catch (retryError) {
              showNotification('❌ No se pudo enviar el movimiento');
            }
          }, 1000);
        }
        
      } else {
        // ========== MODO OFFLINE ==========
        if (oldValue === num) {
          // Mismo número - borrar
          gameState.userBoard[row][col] = 0;
          gameState.sound.click();
        } else {
          // Nuevo número - actualizar tablero primero
          gameState.userBoard[row][col] = num;
          
          // Limpiar notas
          if (gameState.notes[key]) {
            delete gameState.notes[key];
          }
          
          // Actualizar UI inmediatamente
          const conflicts = gameState.autoCheck ? findConflicts() : [];
          renderBoard(conflicts);
          
          // Verificar si es correcto (solo si tenemos solución)
          let isCorrect = true;
          if (gameState.currentPuzzle.solution) {
            isCorrect = num === 0 || num === gameState.currentPuzzle.solution[row][col];
            
            if (!isCorrect && num !== 0) {
              // ES UN ERROR
              gameState.mistakes++;
              recordErrorHeatmap(row, col);
              gameState.sound.error();
              
              updateMistakes();
              
              // Verificar límite en torneo
              if (gameState.currentTournamentLevel) {
                const level = gameState.currentTournamentLevel;
                if (gameState.mistakes >= level.requiredMistakes) {
                  showNotification(`⚠️ ¡Límite de errores alcanzado! (${level.requiredMistakes})`);
                  setTimeout(() => {
                    clearInterval(gameState.timerInterval);
                    showTournamentLevelResult(false, `¡Demasiados errores! (${gameState.mistakes}/${level.requiredMistakes})`);
                  }, 1500);
                }
              }
            } else if (num !== 0) {
              // ES CORRECTO
              gameState.sound.input();
              cleanRelatedNotes(row, col, num);
            } else {
              gameState.sound.click();
            }
          } else {
            // Sin solución, asumir correcto
            if (num !== 0) {
              gameState.sound.input();
            } else {
              gameState.sound.click();
            }
          }
          
          // Guardar en historial
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
        
        // Verificar victoria (solo offline)
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

async function checkWin() {
  if (gameState.isOnline && gameState.currentGameId) {
    // En modo online, el servidor verifica la victoria automáticamente
    // cuando hacemos el último movimiento correcto
    return;
  }
  
  // Modo offline - verificar localmente
  if (gameState.currentPuzzle && gameState.currentPuzzle.solution) {
    const isComplete = gameState.userBoard.every((row, i) => 
      row.every((cell, j) => cell === gameState.currentPuzzle.solution[i][j])
    );
    
    if (isComplete) {
      clearInterval(gameState.timerInterval);
      
      // Verificar si es modo torneo
      if (gameState.currentTournamentLevel) {
        const level = gameState.currentTournamentLevel;
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
        // Actualizar estadísticas y mostrar victoria
        updateStatsAfterWin();
        gameState.sound.complete();
        
        // Si es Daily Challenge offline, mostrar opción de ver ranking
        if (gameState.dailyChallenge && 
            gameState.dailyChallenge.date === new Date().toDateString() &&
            !gameState.dailyChallenge.completed) {
          
          gameState.dailyChallenge.completed = true;
          gameState.dailyChallenge.time = gameState.timer;
          gameState.dailyChallenge.mistakes = gameState.mistakes;
          localStorage.setItem('sudoku-daily', JSON.stringify(gameState.dailyChallenge));
          
          showDailyChallengeWinScreen();
        } else {
          showWinScreen();
        }
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
              <button onclick="showDailyChallengeMenu()" style="
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
              <button onclick="showBattleRoyaleMenu()" style="
                background: linear-gradient(135deg, #ec4899, #db2777);
                color: white;
                padding: 15px 20px;
                border: none;
                border-radius: 12px;
                font-size: 15px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                ⚔️ Battle Royale
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

async function showDailyChallengeLeaderboard() {
  try {
    const leaderboardData = await SudokuAPI.getDailyLeaderboard();
    const myRank = await SudokuAPI.getMyDailyRank();
    
    const theme = themes[gameState.theme];
    const root = document.getElementById('root');
    
    root.innerHTML = `
      <div style="height: 100vh; background: ${theme.bg}; padding: 20px; overflow-y: auto;">
        <div style="max-width: 1000px; margin: 0 auto;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
            <button onclick="renderMenu()" style="background: rgba(255,255,255,0.2); color: ${theme.text}; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer;">← Volver</button>
            <h1 style="color: ${theme.text}; margin: 0;">🏆 Reto Diario - ${leaderboardData.date}</h1>
            <div style="width: 100px;"></div>
          </div>
          
          <!-- Estadísticas del día -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
            <div style="background: ${theme.cardBg}; padding: 20px; border-radius: 15px; text-align: center;">
              <div style="color: ${theme.text}; font-size: 36px; font-weight: bold;">${leaderboardData.stats.totalParticipants}</div>
              <div style="color: ${theme.text}; opacity: 0.8; font-size: 14px;">Participantes</div>
            </div>
            <div style="background: ${theme.cardBg}; padding: 20px; border-radius: 15px; text-align: center;">
              <div style="color: ${theme.text}; font-size: 36px; font-weight: bold;">${leaderboardData.stats.completedParticipants}</div>
              <div style="color: ${theme.text}; opacity: 0.8; font-size: 14px;">Completados</div>
            </div>
            <div style="background: ${theme.cardBg}; padding: 20px; border-radius: 15px; text-align: center;">
              <div style="color: ${theme.text}; font-size: 36px; font-weight: bold;">${leaderboardData.stats.completionRate}%</div>
              <div style="color: ${theme.text}; opacity: 0.8; font-size: 14px;">Tasa de éxito</div>
            </div>
          </div>
          
          <!-- Tu posición -->
          ${myRank.participated ? `
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 25px; border-radius: 20px; margin-bottom: 30px; color: white; text-align: center;">
            <div style="font-size: 18px; margin-bottom: 10px;">Tu Posición</div>
            <div style="font-size: 48px; font-weight: bold; margin-bottom: 10px;">#${myRank.rank}</div>
            <div style="display: flex; justify-content: center; gap: 30px; font-size: 14px;">
              <div>⏱️ ${formatTime(myRank.time)}</div>
              <div>❌ ${myRank.mistakes} errores</div>
              <div>💡 ${myRank.hintsUsed} pistas</div>
              <div>📊 Top ${myRank.percentile}%</div>
            </div>
          </div>
          ` : `
          <div style="background: rgba(239,68,68,0.2); padding: 25px; border-radius: 20px; margin-bottom: 30px; color: ${theme.text}; text-align: center;">
            <div style="font-size: 18px; margin-bottom: 10px;">❌ No has completado el reto de hoy</div>
            <button onclick="startNewGame('hard', true)" style="
              background: linear-gradient(135deg, #f59e0b, #d97706);
              color: white;
              padding: 15px 30px;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: bold;
              cursor: pointer;
              margin-top: 10px;
            ">🎮 Jugar Ahora</button>
          </div>
          `}
          
          <!-- Ranking -->
          <div style="background: ${theme.cardBg}; padding: 25px; border-radius: 20px;">
            <h2 style="color: ${theme.text}; margin-bottom: 20px;">🏅 Top ${leaderboardData.leaderboard.length}</h2>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${leaderboardData.leaderboard.map((entry, idx) => `
                <div style="
                  background: ${entry.userId === gameState.user?.id ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'}; 
                  padding: 15px 20px; 
                  border-radius: 12px; 
                  display: flex; 
                  justify-content: space-between; 
                  align-items: center;
                  ${entry.userId === gameState.user?.id ? 'border: 2px solid #f59e0b;' : ''}
                ">
                  <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 24px; font-weight: bold; color: ${idx < 3 ? '#fbbf24' : theme.text}; min-width: 40px;">
                      ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </div>
                    <div style="font-size: 24px;">${entry.avatar}</div>
                    <div style="color: ${theme.text};">
                      <div style="font-weight: bold; font-size: 16px;">
                        ${entry.username} ${entry.userId === gameState.user?.id ? '(Tú)' : ''}
                      </div>
                      <div style="font-size: 12px; opacity: 0.8;">Nivel ${entry.level}</div>
                    </div>
                  </div>
                  <div style="text-align: right; color: ${theme.text};">
                    <div style="font-size: 20px; font-weight: bold;">⏱️ ${formatTime(entry.time)}</div>
                    <div style="font-size: 12px; opacity: 0.8;">❌ ${entry.mistakes} • 💡 ${entry.hintsUsed}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error showing daily leaderboard:', error);
    showNotification('❌ Error al cargar ranking');
  }
}

async function showDailyChallengeMenu() {
  try {
    // Verificar conexión primero
    if (gameState.isOnline) {
      const isConnected = await checkServerConnection();
      if (!isConnected) {
        showNotification('⚠️ Servidor no disponible, usando modo offline');
        gameState.isOnline = false;
      }
    }
    
    const dailyData = await getDailyChallenge();
    
    if (!dailyData) {
      showNotification('❌ Error al cargar reto diario');
      renderMenu();
      return;
    }
    
    const theme = themes[gameState.theme];
    const root = document.getElementById('root');
    
    root.innerHTML = `
      <div style="height: 100vh; background: ${theme.bg}; padding: 20px; overflow-y: auto;">
        <div style="max-width: 800px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 40px;">
            <button onclick="renderMenu()" style="background: rgba(255,255,255,0.2); color: ${theme.text}; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer; position: absolute; left: 20px;">← Volver</button>
            <h1 style="color: ${theme.text}; font-size: 48px; margin: 0 0 10px 0;">🏆 Reto Diario</h1>
            <p style="color: ${theme.text}; opacity: 0.8; font-size: 18px;">
              ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            ${!gameState.isOnline ? `
              <div style="background: rgba(239,68,68,0.2); padding: 10px 20px; border-radius: 10px; margin-top: 15px; display: inline-block;">
                <span style="color: ${theme.text};">📴 Modo Offline</span>
              </div>
            ` : ''}
          </div>
          
          <!-- Estadísticas del día -->
          <div style="background: ${theme.cardBg}; padding: 30px; border-radius: 20px; margin-bottom: 30px;">
            <h2 style="color: ${theme.text}; margin-bottom: 20px;">📊 Estadísticas de Hoy</h2>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
              <div style="text-align: center;">
                <div style="color: ${theme.text}; font-size: 36px; font-weight: bold;">
                  ${dailyData?.totalPlayers || 0}
                </div>
                <div style="color: ${theme.text}; opacity: 0.8;">Jugadores</div>
              </div>
              <div style="text-align: center;">
                <div style="color: ${theme.text}; font-size: 36px; font-weight: bold;">
                  ${dailyData?.avgTime ? formatTime(dailyData.avgTime) : '--:--'}
                </div>
                <div style="color: ${theme.text}; opacity: 0.8;">Tiempo promedio</div>
              </div>
            </div>
          </div>
          
          <!-- Acciones -->
          <div style="display: flex; flex-direction: column; gap: 15px;">
            ${dailyData?.completed ? `
              <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 20px; text-align: center; color: white;">
                <div style="font-size: 24px; margin-bottom: 15px;">✅ ¡Reto Completado!</div>
                ${dailyData.rank ? `<div style="font-size: 18px; margin-bottom: 10px;">Posición: #${dailyData.rank}</div>` : ''}
                <div style="display: flex; justify-content: center; gap: 20px; font-size: 16px;">
                  <div>⏱️ ${formatTime(dailyData.time)}</div>
                  <div>❌ ${dailyData.mistakes}</div>
                </div>
              </div>
            ` : `
              <button onclick="startNewGame('hard', true)" style="
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: white;
                padding: 25px 40px;
                border: none;
                border-radius: 15px;
                font-size: 22px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
              " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                🎮 Jugar Reto Diario
              </button>
            `}
            
            ${gameState.isOnline ? `
              <button onclick="showDailyChallengeLeaderboard()" style="
                background: ${theme.cardBg};
                color: ${theme.text};
                padding: 20px 40px;
                border: none;
                border-radius: 15px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
              ">🏅 Ver Ranking Global</button>
              
              <button onclick="showMyDailyHistory()" style="
                background: ${theme.cardBg};
                color: ${theme.text};
                padding: 20px 40px;
                border: none;
                border-radius: 15px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
              ">📜 Mi Historial</button>
            ` : `
              <div style="background: rgba(239,68,68,0.1); padding: 20px; border-radius: 15px; text-align: center; color: ${theme.text};">
                <div style="font-size: 16px; margin-bottom: 10px;">🔌 Modo Offline</div>
                <div style="opacity: 0.8; font-size: 14px;">Inicia sesión online para acceder al ranking global</div>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error showing daily challenge menu:', error);
    showNotification('❌ Error al cargar reto diario');
    renderMenu();
  }
}

async function showMyDailyHistory() {
  try {
    const historyData = await SudokuAPI.getMyDailyHistory();
    const theme = themes[gameState.theme];
    const root = document.getElementById('root');
    
    root.innerHTML = `
      <div style="height: 100vh; background: ${theme.bg}; padding: 20px; overflow-y: auto;">
        <div style="max-width: 1000px; margin: 0 auto;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
            <button onclick="showDailyChallengeMenu()" style="background: rgba(255,255,255,0.2); color: ${theme.text}; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer;">← Volver</button>
            <h1 style="color: ${theme.text}; margin: 0;">📜 Mi Historial de Retos Diarios</h1>
            <div style="width: 100px;"></div>
          </div>
          
          <!-- Resumen -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px;">
            <div style="background: ${theme.cardBg}; padding: 25px; border-radius: 15px; text-align: center;">
              <div style="color: ${theme.text}; font-size: 48px; font-weight: bold;">${historyData.currentStreak} 🔥</div>
              <div style="color: ${theme.text}; opacity: 0.8; font-size: 16px;">Racha Actual</div>
            </div>
            <div style="background: ${theme.cardBg}; padding: 25px; border-radius: 15px; text-align: center;">
              <div style="color: ${theme.text}; font-size: 48px; font-weight: bold;">${historyData.totalCompleted}</div>
              <div style="color: ${theme.text}; opacity: 0.8; font-size: 16px;">Total Completados</div>
            </div>
          </div>
          
          <!-- Historial -->
          <div style="background: ${theme.cardBg}; padding: 25px; border-radius: 20px;">
            <h2 style="color: ${theme.text}; margin-bottom: 20px;">📅 Historial</h2>
            ${historyData.history.length === 0 ? `
              <div style="text-align: center; color: ${theme.text}; opacity: 0.6; padding: 40px;">
                No hay historial aún. ¡Completa tu primer reto diario!
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${historyData.history.map((entry, idx) => {
                  const date = new Date(entry.dailyChallengeDate);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const dateStr = isToday ? 'Hoy' : date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                  
                  return `
                    <div style="
                      background: ${isToday ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)'}; 
                      padding: 20px; 
                      border-radius: 12px; 
                      display: flex; 
                      justify-content: space-between; 
                      align-items: center;
                      ${isToday ? 'border: 2px solid #f59e0b;' : ''}
                    ">
                      <div style="display: flex; align-items: center; gap: 20px;">
                        <div style="color: ${theme.text}; font-weight: bold; font-size: 16px; min-width: 100px;">
                          ${dateStr}
                        </div>
                        <div style="color: ${theme.text}; opacity: 0.8; font-size: 14px;">
                          ${new Date(entry.completedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style="display: flex; gap: 30px; align-items: center;">
                        <div style="color: ${theme.text}; text-align: center;">
                          <div style="font-size: 18px; font-weight: bold;">⏱️ ${formatTime(entry.time)}</div>
                          <div style="font-size: 11px; opacity: 0.7;">Tiempo</div>
                        </div>
                        <div style="color: ${theme.text}; text-align: center;">
                          <div style="font-size: 18px; font-weight: bold;">❌ ${entry.mistakes}</div>
                          <div style="font-size: 11px; opacity: 0.7;">Errores</div>
                        </div>
                        <div style="color: ${theme.text}; text-align: center;">
                          <div style="font-size: 18px; font-weight: bold;">💡 ${entry.hintsUsed}</div>
                          <div style="font-size: 11px; opacity: 0.7;">Pistas</div>
                        </div>
                        <div style="color: #fbbf24; text-align: center;">
                          <div style="font-size: 18px; font-weight: bold;">${entry.score}</div>
                          <div style="font-size: 11px; opacity: 0.7;">Puntos</div>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error showing daily history:', error);
    showNotification('❌ Error al cargar historial');
  }
}

function showDailyChallengeWinScreen() {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  root.innerHTML = `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div style="max-width: 700px; width: 100%; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 60px; border: 1px solid rgba(255,255,255,0.2); text-align: center;">
        <div style="font-size: 120px; margin-bottom: 30px; animation: bounce 1s;">🏆</div>
        <h1 style="font-size: 60px; font-weight: bold; color: white; margin: 0 0 20px 0;">¡Reto Diario Completado!</h1>
        <div style="font-size: 24px; color: rgba(255,255,255,0.9); margin-bottom: 40px;">
          ${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px;">
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 20px;">
            <div style="font-size: 40px; font-weight: bold; color: white;">${formatTime(gameState.timer)}</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Tiempo</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 20px;">
            <div style="font-size: 40px; font-weight: bold; color: white;">${gameState.mistakes}</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 14px;">Errores</div>
          </div>
        </div>

        ${gameState.isOnline ? `
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 20px; margin-bottom: 30px; color: white;">
            <div style="font-size: 18px; margin-bottom: 10px;">💡 Conectado Online</div>
            <div style="opacity: 0.9;">Tu resultado se ha guardado en el ranking global</div>
          </div>
        ` : `
          <div style="background: rgba(239,68,68,0.2); padding: 20px; border-radius: 20px; margin-bottom: 30px; color: white;">
            <div style="font-size: 18px; margin-bottom: 10px;">🔌 Modo Offline</div>
            <div style="opacity: 0.9;">Inicia sesión para competir en el ranking global</div>
          </div>
        `}

        <div style="display: flex; flex-direction: column; gap: 15px;">
          ${gameState.isOnline ? `
            <button onclick="showDailyChallengeLeaderboard()" style="
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 20px 40px;
              border: none;
              border-radius: 15px;
              font-size: 20px;
              font-weight: bold;
              cursor: pointer;
              transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🏅 Ver Ranking Global</button>
          ` : ''}
          
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
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">🏠 Menú Principal</button>
        </div>
      </div>
    </div>
  `;
}

// BATTLE ROYALE FUNCTIONS

// Conectar a Socket.io
function connectBattleRoyaleSocket(battleRoyaleId) {
  if (gameState.battleRoyale.socket) {
    gameState.battleRoyale.socket.disconnect();
  }
  
  gameState.battleRoyale.socket = io('http://localhost:3000/battle-royale', {
    transports: ['websocket', 'polling']
  });
  
  const socket = gameState.battleRoyale.socket;
  
  // Eventos del socket
  socket.on('connect', () => {
    console.log('🎮 Conectado a Battle Royale Socket');
    
    // Unirse a la sala
    socket.emit('join-room', {
      battleRoyaleId: battleRoyaleId,
      userId: gameState.user.id
    });
  });
  
  socket.on('room-state', (data) => {
    console.log('📊 Estado de la sala:', data);
    gameState.battleRoyale.status = data.status;
    gameState.battleRoyale.players = data.players;
    updateBattleRoyaleLobby();
  });
  
  socket.on('player-joined', (data) => {
    console.log('👤 Jugador se unió:', data.username);
    showNotification(`${data.username} se unió a la sala`);
    
    // Actualizar contador de jugadores
    const playerCount = document.getElementById('br-player-count');
    if (playerCount) {
      playerCount.textContent = `${data.totalPlayers}`;
    }
  });
  
  socket.on('countdown', (count) => {
    gameState.battleRoyale.countdown = count;
    updateCountdownDisplay(count);
  });
  
  socket.on('game-started', () => {
    console.log('🎮 ¡Battle Royale iniciado!');
    gameState.battleRoyale.status = 'active';
    showNotification('🎮 ¡Battle Royale comenzó!');
    renderBattleRoyaleGame();
  });
  
  socket.on('leaderboard-update', (data) => {
    gameState.battleRoyale.players = data.players;
    updateBattleRoyaleLeaderboard();
  });
  
  socket.on('players-eliminated', (data) => {
    console.log('💀 Jugadores eliminados:', data.eliminated);
    
    // Verificar si yo fui eliminado
    const wasIEliminated = data.eliminated.some(
      p => p.username === gameState.user.username
    );
    
    if (wasIEliminated) {
      gameState.battleRoyale.isAlive = false;
      showNotification('💀 Has sido eliminado');
      showBattleRoyaleEliminatedScreen(data.playersRemaining);
    } else {
      showNotification(`💀 ${data.eliminated.length} jugador(es) eliminado(s). Quedan ${data.playersRemaining}`);
    }
  });
  
  socket.on('game-finished', (data) => {
    console.log('🏆 Battle Royale terminado:', data.winner);
    gameState.battleRoyale.status = 'finished';
    clearInterval(gameState.timerInterval);
    
    const isWinner = data.winner.userId === gameState.user.id;
    showBattleRoyaleResultScreen(isWinner, data.winner);
  });
  
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
    showNotification(`❌ ${error.message}`);
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Desconectado de Battle Royale Socket');
  });
}

// Menú principal de Battle Royale
async function showBattleRoyaleMenu() {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  root.innerHTML = `
    <div style="height: 100vh; background: ${theme.bg}; padding: 20px; overflow-y: auto;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
          <button onclick="renderMenu()" style="background: rgba(255,255,255,0.2); color: ${theme.text}; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer;">← Volver</button>
          <h1 style="color: ${theme.text}; margin: 0;">⚔️ Battle Royale</h1>
          <div style="width: 100px;"></div>
        </div>
        
        <!-- Descripción -->
        <div style="background: ${theme.cardBg}; padding: 25px; border-radius: 20px; margin-bottom: 30px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 15px;">⚔️</div>
          <h2 style="color: ${theme.text}; margin-bottom: 15px;">¡Sobrevive hasta el final!</h2>
          <p style="color: ${theme.text}; opacity: 0.8; font-size: 16px; line-height: 1.6;">
            Compite contra otros jugadores en tiempo real. Cada 60 segundos, los jugadores con menor progreso son eliminados. ¡Sé el último en pie!
          </p>
        </div>
        
        <!-- Acciones -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
          <button onclick="showCreateBattleRoyaleDialog()" style="
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            padding: 30px;
            border: none;
            border-radius: 20px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            <div style="font-size: 48px; margin-bottom: 10px;">🎮</div>
            Crear Sala
          </button>
          
          <button onclick="showBattleRoyaleRooms()" style="
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            color: white;
            padding: 30px;
            border: none;
            border-radius: 20px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            <div style="font-size: 48px; margin-bottom: 10px;">🚪</div>
            Unirse a Sala
          </button>
        </div>
        
        <!-- Historial -->
        <div style="background: ${theme.cardBg}; padding: 25px; border-radius: 20px;">
          <h2 style="color: ${theme.text}; margin-bottom: 20px;">📜 Tu Historial</h2>
          <div id="br-history-container">
            <div style="text-align: center; color: ${theme.text}; opacity: 0.6; padding: 40px;">
              Cargando historial...
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Cargar historial
  loadBattleRoyaleHistory();
}

// Cargar historial
async function loadBattleRoyaleHistory() {
  try {
    const historyData = await SudokuAPI.getBattleRoyaleHistory();
    const theme = themes[gameState.theme];
    const container = document.getElementById('br-history-container');
    
    if (!container) return;
    
    if (historyData.history.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: ${theme.text}; opacity: 0.6; padding: 40px;">
          No has jugado Battle Royale aún
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${historyData.history.map((entry, idx) => `
          <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 20px;">
              <div style="font-size: 36px;">
                ${entry.position === 1 ? '🏆' : entry.position <= 3 ? '🥈' : entry.position <= 5 ? '🥉' : '💀'}
              </div>
              <div style="color: ${theme.text};">
                <div style="font-weight: bold; font-size: 16px;">#${entry.position} de ${entry.totalPlayers}</div>
                <div style="font-size: 12px; opacity: 0.8;">${new Date(entry.date).toLocaleDateString()}</div>
              </div>
            </div>
            <div style="text-align: right; color: ${theme.text};">
              <div style="font-size: 18px; font-weight: bold;">${entry.progress}% completado</div>
              <div style="font-size: 12px; opacity: 0.8;">❌ ${entry.mistakes} errores</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading battle royale history:', error);
    const container = document.getElementById('br-history-container');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; color: #ef4444; padding: 40px;">
          Error al cargar historial
        </div>
      `;
    }
  }
}

// Mostrar diálogo para crear sala
function showCreateBattleRoyaleDialog() {
  const theme = themes[gameState.theme];
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  dialog.innerHTML = `
    <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); padding: 40px; border-radius: 20px; max-width: 500px; width: 90%;">
      <h2 style="color: ${theme.text}; margin-bottom: 20px;">🎮 Crear Sala</h2>
      
      <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
        <div>
          <label style="color: ${theme.text}; font-size: 14px; margin-bottom: 5px; display: block;">Jugadores Máximos</label>
          <input type="number" id="br-max-players" min="2" max="50" value="20" style="
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            background: rgba(255,255,255,0.1);
            color: ${theme.text};
          ">
        </div>
        
        <div>
          <label style="color: ${theme.text}; font-size: 14px; margin-bottom: 5px; display: block;">Jugadores Mínimos</label>
          <input type="number" id="br-min-players" min="2" max="10" value="2" style="
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            background: rgba(255,255,255,0.1);
            color: ${theme.text};
          ">
        </div>
      </div>
      
      <div style="display: flex; gap: 10px;">
        <button onclick="this.closest('div[style*=fixed]').remove()" style="
          flex: 1;
          background: rgba(255,255,255,0.1);
          color: ${theme.text};
          padding: 15px;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        ">Cancelar</button>
        
        <button onclick="createBattleRoyaleRoom()" style="
          flex: 1;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          padding: 15px;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        ">Crear</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
}

// Crear sala de Battle Royale
async function createBattleRoyaleRoom() {
  try {
    const maxPlayers = parseInt(document.getElementById('br-max-players').value);
    const minPlayers = parseInt(document.getElementById('br-min-players').value);
    
    if (minPlayers > maxPlayers) {
      showNotification('❌ Los jugadores mínimos no pueden ser más que los máximos');
      return;
    }
    
    showNotification('🎮 Creando sala...');
    
    const response = await SudokuAPI.createBattleRoyale({
      maxPlayers,
      minPlayers,
      difficulty: 'hard'
    });
    
    gameState.battleRoyale.currentRoomId = response.battleRoyaleId;
    gameState.battleRoyale.roomCode = response.roomCode;
    gameState.battleRoyale.isHost = true;
    
    // Cerrar diálogo
    document.querySelectorAll('div[style*="position: fixed"]').forEach(el => el.remove());
    
    showNotification(`✅ Sala creada: ${response.roomCode}`);
    
    // Conectar socket y mostrar lobby
    connectBattleRoyaleSocket(response.battleRoyaleId);
    showBattleRoyaleLobby(response.battleRoyaleId);
    
  } catch (error) {
    console.error('Error creating battle royale:', error);
    showNotification(`❌ Error: ${error.message}`);
  }
}

// Mostrar salas disponibles
async function showBattleRoyaleRooms() {
  try {
    const roomsData = await SudokuAPI.getBattleRoyaleRooms();
    const theme = themes[gameState.theme];
    const root = document.getElementById('root');
    
    root.innerHTML = `
      <div style="height: 100vh; background: ${theme.bg}; padding: 20px; overflow-y: auto;">
        <div style="max-width: 1000px; margin: 0 auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
            <button onclick="showBattleRoyaleMenu()" style="background: rgba(255,255,255,0.2); color: ${theme.text}; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer;">← Volver</button>
            <h1 style="color: ${theme.text}; margin: 0;">🚪 Salas Disponibles</h1>
            <button onclick="showBattleRoyaleRooms()" style="background: rgba(255,255,255,0.2); color: ${theme.text}; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer;">🔄 Actualizar</button>
          </div>
          
          ${roomsData.rooms.length === 0 ? `
            <div style="background: ${theme.cardBg}; padding: 60px; border-radius: 20px; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 20px;">🚫</div>
              <div style="color: ${theme.text}; font-size: 20px; margin-bottom: 10px;">No hay salas disponibles</div>
              <div style="color: ${theme.text}; opacity: 0.6; margin-bottom: 30px;">Sé el primero en crear una</div>
              <button onclick="showBattleRoyaleMenu()" style="
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                padding: 15px 30px;
                border: none;
                border-radius: 12px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
              ">Crear Sala</button>
            </div>
          ` : `
            <div style="display: grid; gap: 15px;">
              ${roomsData.rooms.map(room => `
                <div style="background: ${theme.cardBg}; padding: 25px; border-radius: 15px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="color: ${theme.text}; font-size: 24px; font-weight: bold; margin-bottom: 5px;">
                      🎮 ${room.roomCode}
                    </div>
                    <div style="color: ${theme.text}; opacity: 0.8; font-size: 14px;">
                      ${room.players}/${room.maxPlayers} jugadores • ${room.status === 'waiting' ? '⏳ Esperando' : '🎮 Comenzando'}
                    </div>
                  </div>
                  <button onclick="joinBattleRoyaleRoom('${room.roomCode}')" ${room.isFull ? 'disabled' : ''} style="
                    background: ${room.isFull ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)'};
                    color: white;
                    padding: 15px 30px;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: ${room.isFull ? 'not-allowed' : 'pointer'};
                  ">${room.isFull ? 'Llena' : 'Unirse'}</button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading rooms:', error);
    showNotification('❌ Error al cargar salas');
  }
}

// Unirse a sala
async function joinBattleRoyaleRoom(roomCode) {
  try {
    showNotification('🚪 Uniéndose a la sala...');
    
    const response = await SudokuAPI.joinBattleRoyale(roomCode);
    
    gameState.battleRoyale.currentRoomId = response.battleRoyaleId;
    gameState.battleRoyale.roomCode = response.roomCode;
    gameState.battleRoyale.isHost = false;
    
    showNotification(`✅ Te uniste a la sala: ${roomCode}`);
    
    // Conectar socket y mostrar lobby
    connectBattleRoyaleSocket(response.battleRoyaleId);
    showBattleRoyaleLobby(response.battleRoyaleId);
    
  } catch (error) {
    console.error('Error joining battle royale:', error);
    showNotification(`❌ Error: ${error.message}`);
  }
}

// Mostrar lobby de espera
async function showBattleRoyaleLobby(battleRoyaleId) {
  try {
    const brData = await SudokuAPI.getBattleRoyale(battleRoyaleId);
    const theme = themes[gameState.theme];
    const root = document.getElementById('root');
    
    gameState.battleRoyale.isHost = brData.isHost;
    gameState.battleRoyale.players = brData.players;
    
    root.innerHTML = `
      <div style="height: 100vh; background: ${theme.bg}; padding: 20px; overflow-y: auto;">
        <div style="max-width: 1200px; margin: 0 auto;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
            <button onclick="leaveBattleRoyale()" style="background: rgba(239,68,68,0.8); color: white; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer;">← Salir</button>
            <div style="text-align: center;">
              <h1 style="color: ${theme.text}; margin: 0;">⚔️ Battle Royale</h1>
              <div style="color: ${theme.text}; opacity: 0.8; font-size: 18px; margin-top: 5px;">Sala: ${brData.roomCode}</div>
            </div>
            <div style="width: 100px;"></div>
          </div>
          
          <!-- Contador de jugadores -->
          <div style="background: ${theme.cardBg}; padding: 30px; border-radius: 20px; margin-bottom: 30px; text-align: center;">
            <div style="font-size: 72px; font-weight: bold; color: ${theme.text}; margin-bottom: 10px;">
              <span id="br-player-count">${brData.players.length}</span>/${brData.settings.maxPlayers}
            </div>
            <div style="color: ${theme.text}; opacity: 0.8; font-size: 18px;">Jugadores en la sala</div>
            ${brData.players.length < brData.settings.minPlayers ? `
              <div style="color: #f59e0b; margin-top: 15px; font-size: 16px;">
                ⚠️ Se necesitan al menos ${brData.settings.minPlayers} jugadores para comenzar
              </div>
            ` : ''}
          </div>
          
          <!-- Lista de jugadores -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
            <div style="background: ${theme.cardBg}; padding: 25px; border-radius: 20px;">
              <h2 style="color: ${theme.text}; margin-bottom: 20px;">👥 Jugadores (${brData.players.length})</h2>
              <div id="br-players-list" style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto;">
                ${brData.players.map((player, idx) => `
                  <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 32px;">${player.avatar}</div>
                    <div style="flex: 1;">
                      <div style="color: ${theme.text}; font-weight: bold; font-size: 16px;">
                        ${player.username} ${player.userId === gameState.user.id ? '(Tú)' : ''}
                        ${brData.hostId === player.userId ? '👑' : ''}
                      </div>
                      <div style="color: ${theme.text}; opacity: 0.7; font-size: 12px;">Nivel ${player.level}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <!-- Reglas -->
            <div style="background: ${theme.cardBg}; padding: 25px; border-radius: 20px;">
              <h2 style="color: ${theme.text}; margin-bottom: 20px;">📜 Reglas</h2>
              <div style="color: ${theme.text}; font-size: 14px; line-height: 2;">
                <div>⚔️ Todos resuelven el mismo sudoku</div>
                <div>⏱️ Cada ${brData.settings.eliminationInterval}s se eliminan jugadores</div>
                <div>📊 Los que tengan menos progreso son eliminados</div>
                <div>💀 Aproximadamente ${Math.round(brData.settings.eliminationPercentage * 100)}% eliminados por ronda</div>
                <div>🏆 El último en pie gana</div>
                <div>❌ Los errores NO eliminan, pero ralentizan</div>
              </div>
            </div>
          </div>
          
          <!-- Botón de inicio (solo host) -->
          ${brData.isHost ? `
            <div style="text-align: center;">
              <button 
                onclick="startBattleRoyale()" 
                ${brData.players.length < brData.settings.minPlayers ? 'disabled' : ''}
                style="
                  background: ${brData.players.length < brData.settings.minPlayers ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};
                  color: white;
                  padding: 25px 60px;
                  border: none;
                  border-radius: 15px;
                  font-size: 24px;
                  font-weight: bold;
                  cursor: ${brData.players.length < brData.settings.minPlayers ? 'not-allowed' : 'pointer'};
                  transition: transform 0.2s;
                "
                ${brData.players.length >= brData.settings.minPlayers ? `onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"` : ''}
              >
                🎮 Iniciar Battle Royale
              </button>
              <div style="color: ${theme.text}; opacity: 0.6; margin-top: 15px; font-size: 14px;">
                Solo el host puede iniciar la partida
              </div>
            </div>
          ` : `
            <div style="background: rgba(139,92,246,0.2); padding: 25px; border-radius: 15px; text-align: center;">
              <div style="color: ${theme.text}; font-size: 18px;">
                ⏳ Esperando a que el host inicie la partida...
              </div>
            </div>
          `}
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Error showing lobby:', error);
    showNotification('❌ Error al cargar lobby');
  }
}

// Actualizar lobby cuando cambia algo
function updateBattleRoyaleLobby() {
  const playersList = document.getElementById('br-players-list');
  const playerCount = document.getElementById('br-player-count');
  
  if (playersList && gameState.battleRoyale.players) {
    const theme = themes[gameState.theme];
    playersList.innerHTML = gameState.battleRoyale.players.map((player, idx) => `
      <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; display: flex; align-items: center; gap: 15px;">
        <div style="font-size: 32px;">${player.avatar}</div>
        <div style="flex: 1;">
          <div style="color: ${theme.text}; font-weight: bold; font-size: 16px;">
            ${player.username} ${player.username === gameState.user.username ? '(Tú)' : ''}
          </div>
        </div>
      </div>
    `).join('');
  }
  
  if (playerCount) {
    playerCount.textContent = gameState.battleRoyale.players.length;
  }
}

// Actualizar cuenta regresiva
function updateCountdownDisplay(count) {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  if (count > 0) {
    root.innerHTML = `
      <div style="height: 100vh; background: linear-gradient(135deg, #ef4444, #dc2626); display: flex; align-items: center; justify-content: center;">
        <div style="text-align: center;">
          <div style="font-size: 200px; font-weight: bold; color: white; animation: pulse 1s;">${count}</div>
          <div style="font-size: 36px; color: white; opacity: 0.9;">Preparándose...</div>
        </div>
      </div>
    `;
  }
}

// Iniciar Battle Royale (solo host)
async function startBattleRoyale() {
  try {
    showNotification('🎮 Iniciando Battle Royale...');
    
    await SudokuAPI.startBattleRoyale(gameState.battleRoyale.currentRoomId);
    
    // Emitir evento para iniciar cuenta regresiva
    if (gameState.battleRoyale.socket) {
      gameState.battleRoyale.socket.emit('start-countdown', gameState.battleRoyale.currentRoomId);
    }
    
  } catch (error) {
    console.error('Error starting battle royale:', error);
    showNotification(`❌ Error: ${error.message}`);
  }
}

// Salir de Battle Royale
async function leaveBattleRoyale() {
  try {
    if (confirm('¿Seguro que quieres salir de la sala?')) {
      await SudokuAPI.leaveBattleRoyale(gameState.battleRoyale.currentRoomId);
      
      if (gameState.battleRoyale.socket) {
        gameState.battleRoyale.socket.disconnect();
        gameState.battleRoyale.socket = null;
      }
      
      gameState.battleRoyale.currentRoomId = null;
      gameState.battleRoyale.roomCode = null;
      gameState.battleRoyale.isHost = false;
      
      showNotification('👋 Saliste de la sala');
      showBattleRoyaleMenu();
    }
  } catch (error) {
    console.error('Error leaving battle royale:', error);
    showNotification(`❌ Error: ${error.message}`);
  }
}

// Renderizar juego de Battle Royale
async function renderBattleRoyaleGame() {
  try {
    const brData = await SudokuAPI.getBattleRoyale(gameState.battleRoyale.currentRoomId);
    
    gameState.currentPuzzle = {
      puzzle: brData.puzzle,
      solution: null, // No enviamos solución al cliente
      clues: brData.puzzle.flat().filter(c => c !== 0).length
    };
    
    gameState.userBoard = brData.myBoard;
    gameState.currentGameId = null; // No es un juego normal
    gameState.difficulty = brData.difficulty;
    gameState.selectedCell = null;
    gameState.timer = 0;
    gameState.mistakes = 0;
    gameState.hintsUsed = 0;
    gameState.moveHistory = [];
    gameState.notes = {};
    gameState.notesMode = false;
    gameState.battleRoyale.isAlive = true;
    gameState.battleRoyale.myProgress = 0;
    
    // Iniciar timer
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
      gameState.timer++;
      updateTimer();
    }, 1000);
    
    const theme = themes[gameState.theme];
    const root = document.getElementById('root');
    
    root.innerHTML = `
      <div style="height: 100vh; background: ${theme.bg}; padding: 10px; overflow: hidden; display: flex; flex-direction: column;">
        <div style="max-width: 1600px; margin: 0 auto; width: 100%; flex: 1; display: grid; grid-template-columns: 300px 1fr 300px; gap: 15px;">
          
          <!-- Columna izquierda: Leaderboard en vivo -->
          <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; overflow-y: auto;">
            <h3 style="color: ${theme.text}; margin-bottom: 15px;">🏆 Ranking en Vivo</h3>
            <div id="br-live-leaderboard">
              ${brData.players
                .filter(p => p.alive)
                .sort((a, b) => b.progress - a.progress)
                .map((player, idx) => `
                  <div style="
                    background: ${player.userId === gameState.user.id ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'}; 
                    padding: 12px; 
                    border-radius: 10px; 
                    margin-bottom: 8px;
                    ${player.userId === gameState.user.id ? 'border: 2px solid #f59e0b;' : ''}
                  ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="font-weight: bold; color: ${idx < 3 ? '#fbbf24' : theme.text}; min-width: 25px;">
                        #${idx + 1}
                      </div>
                      <div style="font-size: 20px;">${player.avatar}</div>
                      <div style="flex: 1; min-width: 0;">
                        <div style="color: ${theme.text}; font-size: 14px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${player.username}
                        </div>
                        <div style="color: ${theme.text}; opacity: 0.7; font-size: 12px;">
                          ${player.progress}% • ❌${player.mistakes}
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
            </div>
            
            <!-- Eliminados -->
            ${brData.players.filter(p => p.eliminated).length > 0 ? `
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                <h4 style="color: ${theme.text}; opacity: 0.6; margin-bottom: 10px; font-size: 14px;">💀 Eliminados</h4>
                ${brData.players
                  .filter(p => p.eliminated)
                  .map(player => `
                    <div style="padding: 8px; opacity: 0.5; color: ${theme.text}; font-size: 12px;">
                      ${player.username} - ${player.progress}%
                    </div>
                  `).join('')}
              </div>
            ` : ''}
          </div>
          
          <!-- Columna central: Tablero -->
          <div style="display: flex; flex-direction: column; gap: 15px;">
            <!-- Header del juego -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 15px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="color: ${theme.text};">
                  <div style="font-size: 18px; font-weight: bold;">⚔️ BATTLE ROYALE</div>
                  <div style="font-size: 12px; opacity: 0.8;">${brData.roomCode}</div>
                </div>
                <div style="text-align: center; color: ${theme.text};">
                  <div id="timer" style="font-size: 36px; font-weight: bold;">${formatTime(gameState.timer)}</div>
                  <div style="font-size: 12px; opacity: 0.8;">Tu progreso: <span id="my-progress">0</span>%</div>
                </div>
                <div style="text-align: right; color: ${theme.text};">
                  <div style="font-size: 24px; font-weight: bold;">${brData.players.filter(p => p.alive).length}</div>
                  <div style="font-size: 12px; opacity: 0.8;">Vivos</div>
                </div>
              </div>
            </div>
            
            <!-- Tablero -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 12px; flex: 1; display: flex; justify-content: center; align-items: center;">
              <div id="board"></div>
            </div>
            
            <!-- Controles -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 15px;">
              <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
                ${[1,2,3,4,5,6,7,8,9].map(num => `
                  <button onclick="inputBattleRoyaleNumber(${num})" style="
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
                <button onclick="inputBattleRoyaleNumber(0)" style="background: rgba(239,68,68,0.8); color: white; padding: 16px; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">✕</button>
              </div>
            </div>
          </div>
          
          <!-- Columna derecha: Info -->
          <div style="display: flex; flex-direction: column; gap: 15px;">
            <!-- Tu estado -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 20px;">
              <h3 style="color: ${theme.text}; margin-bottom: 15px;">📊 Tu Estado</h3>
              <div style="background: rgba(139,92,246,0.2); padding: 15px; border-radius: 10px; margin-bottom: 10px;">
                <div style="color: ${theme.text}; font-size: 12px; margin-bottom: 5px;">Progreso</div>
                <div style="color: ${theme.text}; font-size: 32px; font-weight: bold;">
                  <span id="my-progress-2">0</span>%
                </div>
              </div>
              <div style="background: rgba(239,68,68,0.2); padding: 15px; border-radius: 10px;">
                <div style="color: ${theme.text}; font-size: 12px; margin-bottom: 5px;">Errores</div>
                <div id="br-mistakes" style="color: ${theme.text}; font-size: 32px; font-weight: bold;">${gameState.mistakes}</div>
              </div>
            </div>
            
            <!-- Próxima eliminación -->
            <div style="background: rgba(239,68,68,0.2); backdrop-filter: blur(20px); border-radius: 20px; padding: 20px;">
              <h3 style="color: #ef4444; margin-bottom: 15px;">⚠️ Próxima Eliminación</h3>
              <div id="elimination-timer" style="font-size: 48px; font-weight: bold; color: #ef4444; text-align: center;">
                --:--
              </div>
              <div style="color: #ef4444; text-align: center; opacity: 0.8; font-size: 12px; margin-top: 10px;">
                Los más lentos serán eliminados
              </div>
            </div>
            
            <!-- Opciones -->
            <div style="background: ${theme.cardBg}; backdrop-filter: blur(20px); border-radius: 20px; padding: 15px;">
              <button onclick="toggleNotesMode()" style="
                background: ${gameState.notesMode ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(139,92,246,0.3)'};
                color: white;
                padding: 12px;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
                margin-bottom: 10px;
              ">${gameState.notesMode ? '✓ Notas ON' : '○ Notas OFF'}</button>
              
              <button onclick="leaveBattleRoyaleDuringGame()" style="
                background: rgba(239,68,68,0.6);
                color: white;
                padding: 12px;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
              ">🚪 Rendirse</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Renderizar tablero
    renderBoard();
    
    // Iniciar temporizador de eliminación
    startEliminationTimer();
    
  } catch (error) {
    console.error('Error rendering battle royale game:', error);
    showNotification('❌ Error al cargar juego');
  }
}

// Input de número en Battle Royale
async function inputBattleRoyaleNumber(num) {
  if (!gameState.selectedCell || !gameState.currentPuzzle) {
    showNotification('❌ Selecciona una celda primero');
    return;
  }
  
  if (!gameState.battleRoyale.isAlive) {
    showNotification('💀 Has sido eliminado');
    return;
  }
  
  const [row, col] = gameState.selectedCell;
  
  if (gameState.currentPuzzle.puzzle[row][col] !== 0) {
    showNotification('❌ No puedes modificar celdas fijas');
    return;
  }
  
  const key = `${row}-${col}`;
  
  try {
    if (gameState.notesMode) {
      // Modo anotaciones (igual que antes)
      if (!gameState.notes[key]) gameState.notes[key] = new Set();
      
      if (gameState.notes[key].has(num)) {
        gameState.notes[key].delete(num);
        if (gameState.notes[key].size === 0) delete gameState.notes[key];
      } else {
        gameState.notes[key].add(num);
      }
      
      gameState.sound.note();
      updateCellAndRelated(row, col);
      
    } else {
      // Modo normal
      const oldValue = gameState.userBoard[row][col];
      
      // Actualizar localmente
      gameState.userBoard[row][col] = num;
      if (gameState.notes[key]) delete gameState.notes[key];
      
      renderBoard();
      
      // Enviar al servidor
      const response = await SudokuAPI.makeBattleRoyaleMove(
        gameState.battleRoyale.currentRoomId,
        { row, col, value: num }
      );
      
      gameState.mistakes = response.mistakes;
      gameState.battleRoyale.myProgress = response.progress;
      
      // Actualizar UI
      const progressEls = document.querySelectorAll('#my-progress, #my-progress-2');
      progressEls.forEach(el => { if (el) el.textContent = response.progress; });
      
      const mistakesEl = document.getElementById('br-mistakes');
      if (mistakesEl) mistakesEl.textContent = gameState.mistakes;
      
      // Sonido
      if (!response.isCorrect && num !== 0) {
        gameState.sound.error();
      } else if (num !== 0) {
        gameState.sound.input();
        cleanRelatedNotes(row, col, num);
      } else {
        gameState.sound.click();
      }
      
      // Actualizar progreso en socket
      if (gameState.battleRoyale.socket) {
        gameState.battleRoyale.socket.emit('progress-update', {
          battleRoyaleId: gameState.battleRoyale.currentRoomId,
          userId: gameState.user.id,
          progress: response.progress
        });
      }
      
      // Victoria
      if (response.completed) {
        clearInterval(gameState.timerInterval);
        gameState.sound.complete();
        // El socket emitirá game-finished
      }
      
      renderBoard();
    }
    
  } catch (error) {
    console.error('Error in battle royale move:', error);
    showNotification(`❌ Error: ${error.message}`);
    
    // Revertir
    gameState.userBoard[row][col] = oldValue;
    renderBoard();
  }
}

// Temporizador de eliminación
function startEliminationTimer() {
  const timerEl = document.getElementById('elimination-timer');
  if (!timerEl) return;
  
  let secondsUntilElimination = 60;
  
  const interval = setInterval(() => {
    if (gameState.battleRoyale.status !== 'active') {
      clearInterval(interval);
      return;
    }
    
    secondsUntilElimination--;
    
    if (timerEl) {
      timerEl.textContent = formatTime(secondsUntilElimination);
      
      if (secondsUntilElimination <= 10) {
        timerEl.style.color = '#ef4444';
        timerEl.style.animation = 'pulse 1s infinite';
      }
    }
    
    if (secondsUntilElimination <= 0) {
      secondsUntilElimination = 60; // Reset
    }
  }, 1000);
}

// Actualizar leaderboard en vivo
function updateBattleRoyaleLeaderboard() {
  const leaderboard = document.getElementById('br-live-leaderboard');
  if (!leaderboard) return;
  
  const theme = themes[gameState.theme];
  
  leaderboard.innerHTML = gameState.battleRoyale.players
    .filter(p => p.alive)
    .sort((a, b) => b.progress - a.progress)
    .map((player, idx) => `
      <div style="
        background: ${player.username === gameState.user.username ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'}; 
        padding: 12px; 
        border-radius: 10px; 
        margin-bottom: 8px;
        ${player.username === gameState.user.username ? 'border: 2px solid #f59e0b;' : ''}
      ">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="font-weight: bold; color: ${idx < 3 ? '#fbbf24' : theme.text}; min-width: 25px;">
            #${idx + 1}
          </div>
          <div style="font-size: 20px;">${player.avatar}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="color: ${theme.text}; font-size: 14px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${player.username}
            </div>
            <div style="color: ${theme.text}; opacity: 0.7; font-size: 12px;">
              ${player.progress}% • ❌${player.mistakes}
            </div>
          </div>
        </div>
      </div>
    `).join('');
}

// Pantalla de eliminación
function showBattleRoyaleEliminatedScreen(playersRemaining) {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  clearInterval(gameState.timerInterval);
  
  root.innerHTML = `
    <div style="height: 100vh; background: linear-gradient(135deg, #dc2626, #991b1b); display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div style="max-width: 600px; width: 100%; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 60px; text-align: center; color: white;">
        <div style="font-size: 120px; margin-bottom: 30px;">💀</div>
        <h1 style="font-size: 48px; font-weight: bold; margin-bottom: 20px;">¡Eliminado!</h1>
        <div style="font-size: 24px; opacity: 0.9; margin-bottom: 40px;">
          No alcanzaste el progreso necesario
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px;">
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
            <div style="font-size: 40px; font-weight: bold;">${gameState.battleRoyale.myProgress}%</div>
            <div style="opacity: 0.8; font-size: 14px;">Tu progreso</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px;">
            <div style="font-size: 40px; font-weight: bold;">${playersRemaining}</div>
            <div style="opacity: 0.8; font-size: 14px;">Quedan en pie</div>
          </div>
        
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; margin-bottom: 30px;">
          <div style="font-size: 18px; margin-bottom: 10px;">⏱️ Sobreviviste</div>
          <div style="font-size: 32px; font-weight: bold;">${formatTime(gameState.timer)}</div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 15px;">
          <button onclick="showBattleRoyaleMenu()" style="
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            color: white;
            padding: 20px 40px;
            border: none;
            border-radius: 15px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
          ">🎮 Volver al Menú</button>
        </div>
      </div>
    </div>
  `;
}

// Pantalla de resultado final
function showBattleRoyaleResultScreen(isWinner, winnerData) {
  const theme = themes[gameState.theme];
  const root = document.getElementById('root');
  
  clearInterval(gameState.timerInterval);
  
  if (gameState.battleRoyale.socket) {
    gameState.battleRoyale.socket.disconnect();
    gameState.battleRoyale.socket = null;
  }
  
  const bgGradient = isWinner ? 
    'linear-gradient(135deg, #f59e0b, #d97706)' : 
    'linear-gradient(135deg, #8b5cf6, #7c3aed)';
  
  root.innerHTML = `
    <div style="height: 100vh; background: ${bgGradient}; display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div style="max-width: 700px; width: 100%; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 30px; padding: 60px; text-align: center; color: white;">
        <div style="font-size: 120px; margin-bottom: 30px; animation: bounce 1s;">
          ${isWinner ? '🏆' : '🥈'}
        </div>
        
        <h1 style="font-size: 60px; font-weight: bold; margin-bottom: 20px;">
          ${isWinner ? '¡Victoria!' : '¡Batalla Terminada!'}
        </h1>
        
        <div style="font-size: 24px; opacity: 0.9; margin-bottom: 40px;">
          ${isWinner ? 
            '¡Eres el último en pie!' : 
            `${winnerData.username} ganó la batalla`
          }
        </div>
        
        <!-- Estadísticas del ganador -->
        <div style="background: rgba(255,255,255,0.1); padding: 25px; border-radius: 20px; margin-bottom: 30px;">
          <h3 style="margin-bottom: 20px; font-size: 20px;">🏆 Ganador</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
            <div>
              <div style="font-size: 14px; opacity: 0.8;">Jugador</div>
              <div style="font-size: 20px; font-weight: bold; margin-top: 5px;">${winnerData.username}</div>
            </div>
            <div>
              <div style="font-size: 14px; opacity: 0.8;">Tiempo</div>
              <div style="font-size: 20px; font-weight: bold; margin-top: 5px;">${formatTime(winnerData.time)}</div>
            </div>
            <div>
              <div style="font-size: 14px; opacity: 0.8;">Errores</div>
              <div style="font-size: 20px; font-weight: bold; margin-top: 5px;">${winnerData.mistakes}</div>
            </div>
          </div>
        </div>
        
        ${!isWinner ? `
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; margin-bottom: 30px;">
            <h3 style="margin-bottom: 15px;">📊 Tus Estadísticas</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <div style="font-size: 14px; opacity: 0.8;">Progreso</div>
                <div style="font-size: 32px; font-weight: bold;">${gameState.battleRoyale.myProgress}%</div>
              </div>
              <div>
                <div style="font-size: 14px; opacity: 0.8;">Errores</div>
                <div style="font-size: 32px; font-weight: bold;">${gameState.mistakes}</div>
              </div>
            </div>
          </div>
        ` : ''}
        
        <div style="display: flex; flex-direction: column; gap: 15px;">
          <button onclick="showBattleRoyaleMenu()" style="
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            padding: 20px 40px;
            border: none;
            border-radius: 15px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
          ">🎮 Volver al Menú</button>
          
          <button onclick="renderMenu()" style="
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 20px 40px;
            border: none;
            border-radius: 15px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
          ">🏠 Menú Principal</button>
        </div>
      </div>
    </div>
  `;
}

// Rendirse durante el juego
async function leaveBattleRoyaleDuringGame() {
  if (confirm('¿Seguro que quieres rendirte? Serás eliminado.')) {
    try {
      gameState.battleRoyale.isAlive = false;
      
      await SudokuAPI.leaveBattleRoyale(gameState.battleRoyale.currentRoomId);
      
      if (gameState.battleRoyale.socket) {
        gameState.battleRoyale.socket.disconnect();
        gameState.battleRoyale.socket = null;
      }
      
      clearInterval(gameState.timerInterval);
      
      showNotification('👋 Te rendiste');
      showBattleRoyaleMenu();
      
    } catch (error) {
      console.error('Error leaving battle royale:', error);
      showNotification('❌ Error al salir');
    }
  }
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