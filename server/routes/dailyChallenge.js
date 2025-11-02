const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const User = require('../models/User');
const SudokuGenerator = require('../utils/sudokuGenerator');
const { authMiddleware } = require('./auth');

// Obtener el Daily Challenge del día (público - sin auth necesaria)
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // "2025-11-02"
    
    // Generar seed único basado en la fecha
    const dateParts = today.split('-');
    const seed = parseInt(dateParts[0]) * 10000 + 
                 parseInt(dateParts[1]) * 100 + 
                 parseInt(dateParts[2]);
    
    // Generar el puzzle del día (siempre el mismo para todos)
    const generator = new SudokuGenerator();
    const { puzzle, clues } = generator.generate('hard', seed);
    
    // Obtener estadísticas del reto de hoy
    const totalPlayers = await Game.countDocuments({ 
      dailyChallengeDate: today,
      completed: true 
    });
    
    const avgTime = await Game.aggregate([
      { 
        $match: { 
          dailyChallengeDate: today, 
          completed: true 
        } 
      },
      { 
        $group: { 
          _id: null, 
          avgTime: { $avg: '$time' },
          avgMistakes: { $avg: '$mistakes' }
        } 
      }
    ]);
    
    res.json({
      date: today,
      seed: seed,
      puzzle: puzzle,
      clues: clues,
      difficulty: 'hard',
      stats: {
        totalPlayers: totalPlayers,
        avgTime: avgTime[0]?.avgTime ? Math.round(avgTime[0].avgTime) : null,
        avgMistakes: avgTime[0]?.avgMistakes ? Math.round(avgTime[0].avgMistakes) : null
      }
    });
    
  } catch (error) {
    console.error('Error getting daily challenge:', error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar Daily Challenge (requiere auth)
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Verificar si ya completó el reto de hoy
    const existingGame = await Game.findOne({
      userId: req.user._id,
      dailyChallengeDate: today,
      completed: true
    });
    
    if (existingGame) {
      return res.status(400).json({ 
        error: 'Ya completaste el reto diario de hoy',
        completed: true
      });
    }
    
    // Verificar si ya tiene un juego en progreso
    const inProgressGame = await Game.findOne({
      userId: req.user._id,
      dailyChallengeDate: today,
      completed: false
    });
    
    if (inProgressGame) {
      return res.json({
        message: 'Juego en progreso recuperado',
        gameId: inProgressGame._id,
        puzzle: inProgressGame.puzzle,
        userBoard: inProgressGame.userBoard,
        clues: inProgressGame.puzzle.flat().filter(c => c !== 0).length,
        difficulty: 'hard',
        date: today
      });
    }
    
    // Generar el puzzle del día usando el mismo seed para todos
    const dateParts = today.split('-');
    const seed = parseInt(dateParts[0]) * 10000 + 
                 parseInt(dateParts[1]) * 100 + 
                 parseInt(dateParts[2]);
    
    const generator = new SudokuGenerator();
    const { puzzle, solution, clues } = generator.generate('hard', seed);
    
    // Crear nuevo juego
    const game = new Game({
      userId: req.user._id,
      difficulty: 'hard',
      mode: 'daily',
      puzzle: puzzle,
      solution: solution,
      userBoard: puzzle.map(row => [...row]),
      dailyChallengeDate: today,
      dailyChallengeSeed: seed
    });
    
    await game.save();
    
    res.json({
      success: true,
      message: 'Daily Challenge iniciado',
      gameId: game._id,
      puzzle: game.puzzle,
      clues: clues,
      difficulty: 'hard',
      date: today
    });
    
  } catch (error) {
    console.error('Error starting daily challenge:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ranking del Daily Challenge (público)
router.get('/leaderboard', async (req, res) => {
  try {
    const { date, limit = 100 } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Obtener top jugadores del día ordenados por:
    // 1. Tiempo (ascendente)
    // 2. Menos errores
    // 3. Menos pistas usadas
    const topGames = await Game.find({
      dailyChallengeDate: targetDate,
      completed: true
    })
      .sort({ time: 1, mistakes: 1, hintsUsed: 1 })
      .limit(parseInt(limit))
      .populate('userId', 'username avatar level');
    
    const leaderboard = topGames.map((game, index) => ({
      position: index + 1,
      userId: game.userId?._id,
      username: game.userId?.username || 'Anónimo',
      avatar: game.userId?.avatar || '🎮',
      level: game.userId?.level || 1,
      time: game.time,
      mistakes: game.mistakes,
      hintsUsed: game.hintsUsed,
      score: game.score,
      completedAt: game.completedAt
    }));
    
    // Obtener total de participantes
    const totalParticipants = await Game.countDocuments({
      dailyChallengeDate: targetDate
    });
    
    const completedParticipants = await Game.countDocuments({
      dailyChallengeDate: targetDate,
      completed: true
    });
    
    res.json({
      date: targetDate,
      leaderboard: leaderboard,
      stats: {
        totalParticipants: totalParticipants,
        completedParticipants: completedParticipants,
        completionRate: totalParticipants > 0 ? 
          Math.round((completedParticipants / totalParticipants) * 100) : 0
      }
    });
    
  } catch (error) {
    console.error('Error getting daily leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener posición del usuario en el ranking (requiere auth)
router.get('/my-rank', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Buscar el juego del usuario
    const userGame = await Game.findOne({
      userId: req.user._id,
      dailyChallengeDate: targetDate,
      completed: true
    });
    
    if (!userGame) {
      return res.json({
        participated: false,
        message: 'No has completado el reto de hoy'
      });
    }
    
    // Contar cuántos jugadores tienen mejor tiempo
    const betterPlayers = await Game.countDocuments({
      dailyChallengeDate: targetDate,
      completed: true,
      $or: [
        { time: { $lt: userGame.time } },
        { 
          time: userGame.time, 
          mistakes: { $lt: userGame.mistakes } 
        },
        { 
          time: userGame.time, 
          mistakes: userGame.mistakes,
          hintsUsed: { $lt: userGame.hintsUsed }
        }
      ]
    });
    
    const rank = betterPlayers + 1;
    
    // Obtener total de participantes
    const totalParticipants = await Game.countDocuments({
      dailyChallengeDate: targetDate,
      completed: true
    });
    
    // Calcular percentil
    const percentile = totalParticipants > 0 ? 
      Math.round(((totalParticipants - rank + 1) / totalParticipants) * 100) : 100;
    
    res.json({
      participated: true,
      rank: rank,
      totalParticipants: totalParticipants,
      percentile: percentile,
      time: userGame.time,
      mistakes: userGame.mistakes,
      hintsUsed: userGame.hintsUsed,
      score: userGame.score,
      completedAt: userGame.completedAt
    });
    
  } catch (error) {
    console.error('Error getting user rank:', error);
    res.status(500).json({ error: error.message });
  }
});

// Historial de Daily Challenges del usuario (requiere auth)
router.get('/my-history', authMiddleware, async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    
    const history = await Game.find({
      userId: req.user._id,
      mode: 'daily',
      completed: true
    })
      .sort({ dailyChallengeDate: -1 })
      .limit(parseInt(limit))
      .select('dailyChallengeDate time mistakes hintsUsed score completedAt');
    
    // Calcular racha actual
    let currentStreak = 0;
    let previousDate = null;
    
    for (const game of history) {
      const gameDate = new Date(game.dailyChallengeDate);
      
      if (previousDate === null) {
        // Verificar si es de hoy o ayer
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        gameDate.setHours(0, 0, 0, 0);
        
        if (gameDate.getTime() === today.getTime() || 
            gameDate.getTime() === yesterday.getTime()) {
          currentStreak = 1;
          previousDate = gameDate;
        } else {
          break;
        }
      } else {
        // Verificar si es el día anterior
        const expectedDate = new Date(previousDate);
        expectedDate.setDate(expectedDate.getDate() - 1);
        expectedDate.setHours(0, 0, 0, 0);
        gameDate.setHours(0, 0, 0, 0);
        
        if (gameDate.getTime() === expectedDate.getTime()) {
          currentStreak++;
          previousDate = gameDate;
        } else {
          break;
        }
      }
    }
    
    res.json({
      history: history,
      currentStreak: currentStreak,
      totalCompleted: history.length
    });
    
  } catch (error) {
    console.error('Error getting user history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas globales de Daily Challenges
router.get('/stats', async (req, res) => {
  try {
    const stats = await Game.aggregate([
      {
        $match: {
          mode: 'daily',
          completed: true
        }
      },
      {
        $group: {
          _id: null,
          totalGames: { $sum: 1 },
          avgTime: { $avg: '$time' },
          bestTime: { $min: '$time' },
          avgMistakes: { $avg: '$mistakes' },
          totalPlayers: { $addToSet: '$userId' }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalGames: 0,
      avgTime: 0,
      bestTime: 0,
      avgMistakes: 0,
      totalPlayers: []
    };
    
    res.json({
      totalGames: result.totalGames,
      avgTime: Math.round(result.avgTime),
      bestTime: result.bestTime,
      avgMistakes: Math.round(result.avgMistakes * 10) / 10,
      uniquePlayers: result.totalPlayers.length
    });
    
  } catch (error) {
    console.error('Error getting daily stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;