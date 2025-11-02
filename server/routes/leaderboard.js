// routes/games.js - Versión completa
const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const User = require('../models/User');
const authMiddleware = require('./auth').authMiddleware;

router.use(authMiddleware);

// Crear nuevo juego
router.post('/new', async (req, res) => {
  try {
    const { difficulty = 'medium', mode = 'normal' } = req.body;
    
    // Generar puzzle usando el generador
    const generator = new SudokuGenerator();
    const { puzzle, solution, clues } = generator.generate(difficulty);
    
    // Crear juego en la base de datos
    const game = new Game({
      userId: req.user._id,
      difficulty,
      mode,
      puzzle,
      solution,
      userBoard: puzzle.map(row => [...row]), // Copia del puzzle inicial
      expertMode: mode === 'expert',
      timeAttackLimit: mode === 'timeAttack' ? 600 : null
    });
    
    await game.save();
    
    res.json({
      success: true,
      gameId: game._id,
      puzzle: game.puzzle,
      difficulty: game.difficulty,
      mode: game.mode,
      clues: clues,
      expertMode: game.expertMode,
      timeAttackLimit: game.timeAttackLimit
    });
    
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Error al crear el juego: ' + error.message });
  }
});

// Hacer movimiento
router.post('/:id/move', async (req, res) => {
  try {
    const { row, col, value, notesMode = false } = req.body;
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }
    
    if (game.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'No tienes permiso para este juego' });
    }
    
    if (game.completed) {
      return res.status(400).json({ error: 'Este juego ya está completado' });
    }
    
    // Verificar que la celda sea editable
    if (game.puzzle[row][col] !== 0) {
      return res.status(400).json({ error: 'No puedes modificar celdas fijas' });
    }
    
    const key = `${row}-${col}`;
    let isCorrect = true;
    let completed = false;
    
    if (notesMode) {
      // Modo anotaciones
      if (!game.notes) game.notes = new Map();
      
      if (value === 0) {
        // Limpiar anotaciones
        game.notes.delete(key);
      } else {
        // Toggle anotación
        const currentNotes = game.notes.get(key) || [];
        const noteIndex = currentNotes.indexOf(value);
        
        if (noteIndex > -1) {
          currentNotes.splice(noteIndex, 1);
        } else {
          currentNotes.push(value);
        }
        
        if (currentNotes.length > 0) {
          game.notes.set(key, currentNotes);
        } else {
          game.notes.delete(key);
        }
      }
    } else {
      // Modo normal - entrada de número
      const oldValue = game.userBoard[row][col];
      
      // Solo registrar movimiento si es un cambio real
      if (oldValue !== value) {
        game.moveHistory.push({
          row,
          col,
          oldValue,
          newValue: value
        });
      }
      
      // Actualizar el tablero
      game.userBoard[row][col] = value;
      
      // Limpiar anotaciones de esta celda
      if (game.notes) {
        game.notes.delete(key);
      }
      
      // Verificar si es correcto
      isCorrect = value === 0 || value === game.solution[row][col];
      
      if (!isCorrect && value !== 0) {
        game.mistakes++;
      }
      
      // Verificar si el juego está completado
      completed = game.checkCompletion();
      if (completed) {
        game.completed = true;
        game.completedAt = new Date();
        game.time = Math.floor((game.completedAt - game.createdAt) / 1000);
        game.score = calculateScore(game);
        
        // Actualizar estadísticas del usuario
        await updateUserStats(req.user._id, game);
      }
    }
    
    game.lastActivity = new Date();
    await game.save();
    
    res.json({
      success: true,
      isCorrect,
      completed,
      mistakes: game.mistakes,
      time: game.time || Math.floor((new Date() - game.createdAt) / 1000),
      progress: game.getProgress(),
      userBoard: game.userBoard,
      notes: Object.fromEntries(game.notes || new Map())
    });
    
  } catch (error) {
    console.error('Error making move:', error);
    res.status(500).json({ error: 'Error al realizar movimiento: ' + error.message });
  }
});

// Obtener juego
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game || game.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }
    
    res.json({
      gameId: game._id,
      puzzle: game.puzzle,
      userBoard: game.userBoard,
      difficulty: game.difficulty,
      mode: game.mode,
      completed: game.completed,
      time: game.time,
      mistakes: game.mistakes,
      hintsUsed: game.hintsUsed,
      notes: Object.fromEntries(game.notes || new Map()),
      moveHistory: game.moveHistory,
      expertMode: game.expertMode,
      timeAttackLimit: game.timeAttackLimit,
      progress: game.getProgress(),
      createdAt: game.createdAt
    });
    
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({ error: 'Error al obtener juego: ' + error.message });
  }
});

// Listar juegos del usuario
router.get('/', async (req, res) => {
  try {
    const games = await Game.find({ userId: req.user._id })
      .sort({ lastActivity: -1 })
      .limit(10)
      .select('difficulty mode completed time mistakes createdAt lastActivity');
    
    res.json(games);
  } catch (error) {
    console.error('Error getting games:', error);
    res.status(500).json({ error: 'Error al obtener juegos: ' + error.message });
  }
});

// Usar pista
router.post('/:id/hint', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game || game.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }
    
    if (game.completed) {
      return res.status(400).json({ error: 'Este juego ya está completado' });
    }
    
    if (game.expertMode) {
      return res.status(400).json({ error: 'Pistas deshabilitadas en modo experto' });
    }
    
    // Encontrar una celda vacía para dar pista
    let emptyCells = [];
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (game.puzzle[i][j] === 0 && game.userBoard[i][j] === 0) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }
    
    if (emptyCells.length === 0) {
      return res.status(400).json({ error: 'No hay celdas vacías para dar pista' });
    }
    
    // Elegir una celda aleatoria
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const { row, col } = randomCell;
    
    // Dar la pista
    game.userBoard[row][col] = game.solution[row][col];
    game.hintsUsed++;
    
    // Limpiar anotaciones de esta celda
    if (game.notes) {
      game.notes.delete(`${row}-${col}`);
    }
    
    // Verificar si está completado
    const completed = game.checkCompletion();
    if (completed) {
      game.completed = true;
      game.completedAt = new Date();
      game.time = Math.floor((game.completedAt - game.createdAt) / 1000);
      game.score = calculateScore(game);
      await updateUserStats(req.user._id, game);
    }
    
    game.lastActivity = new Date();
    await game.save();
    
    res.json({
      success: true,
      row,
      col,
      value: game.solution[row][col],
      hintsUsed: game.hintsUsed,
      completed,
      userBoard: game.userBoard
    });
    
  } catch (error) {
    console.error('Error using hint:', error);
    res.status(500).json({ error: 'Error al usar pista: ' + error.message });
  }
});

// Deshacer movimiento
router.post('/:id/undo', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game || game.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ error: 'Juego no encontrado' });
    }
    
    if (game.expertMode) {
      return res.status(400).json({ error: 'Deshacer deshabilitado en modo experto' });
    }
    
    if (game.moveHistory.length === 0) {
      return res.status(400).json({ error: 'No hay movimientos para deshacer' });
    }
    
    const lastMove = game.moveHistory.pop();
    game.userBoard[lastMove.row][lastMove.col] = lastMove.oldValue;
    
    game.lastActivity = new Date();
    await game.save();
    
    res.json({
      success: true,
      userBoard: game.userBoard,
      moveHistory: game.moveHistory
    });
    
  } catch (error) {
    console.error('Error undoing move:', error);
    res.status(500).json({ error: 'Error al deshacer movimiento: ' + error.message });
  }
});

// Funciones auxiliares
function calculateScore(game) {
  const baseScore = 1000;
  const timeBonus = Math.max(0, 300 - game.time) * 2;
  const mistakePenalty = game.mistakes * 50;
  const hintPenalty = game.hintsUsed * 30;
  const difficultyMultiplier = {
    easy: 1,
    medium: 1.5,
    hard: 2,
    expert: 3,
    master: 5
  };
  
  return Math.max(0, 
    (baseScore + timeBonus - mistakePenalty - hintPenalty) * difficultyMultiplier[game.difficulty]
  );
}

async function updateUserStats(userId, game) {
  const user = await User.findById(userId);
  const difficulty = game.difficulty;
  
  // Estadísticas generales
  user.stats.gamesPlayed++;
  user.stats.gamesWon++;
  user.stats.totalTime += game.time;
  user.stats.lastPlayedDate = new Date();
  
  // Mejor tiempo
  if (!user.stats.bestTime || game.time < user.stats.bestTime) {
    user.stats.bestTime = game.time;
  }
  
  // Estadísticas por dificultad
  if (!user.stats.byDifficulty[difficulty]) {
    user.stats.byDifficulty[difficulty] = { played: 0, won: 0, bestTime: null };
  }
  
  user.stats.byDifficulty[difficulty].played++;
  user.stats.byDifficulty[difficulty].won++;
  
  const diffBest = user.stats.byDifficulty[difficulty].bestTime;
  if (!diffBest || game.time < diffBest) {
    user.stats.byDifficulty[difficulty].bestTime = game.time;
  }
  
  // XP y monedas
  user.xp += Math.floor(game.score / 10);
  user.coins += Math.floor(game.score / 20);
  user.level = Math.floor(user.xp / 100) + 1;
  
  await user.save();
}

module.exports = router;