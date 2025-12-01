// server/routes/battleRoyale.js
const express = require('express');
const router = express.Router();
const BattleRoyale = require('../models/BattleRoyale');
const User = require('../models/User');
const SudokuGenerator = require('../utils/sudokuGenerator');
const { authMiddleware } = require('./auth');

// Generar código único de sala
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Crear nueva sala de Battle Royale
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { maxPlayers = 20, minPlayers = 2, difficulty = 'hard' } = req.body;
    
    // Generar puzzle único
    const seed = Date.now();
    const generator = new SudokuGenerator();
    const { puzzle, solution } = generator.generate(difficulty, seed);
    
    // Generar código único de sala
    let roomCode;
    let attempts = 0;
    do {
      roomCode = generateRoomCode();
      const existing = await BattleRoyale.findOne({ roomCode });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);
    
    if (attempts >= 10) {
      return res.status(500).json({ error: 'No se pudo generar código de sala único' });
    }
    
    // Crear sala
    const battleRoyale = new BattleRoyale({
      roomCode,
      hostId: req.user._id,
      puzzle: {
        difficulty,
        data: puzzle,
        solution: solution,
        seed
      },
      settings: {
        maxPlayers: Math.min(Math.max(minPlayers, maxPlayers), 50),
        minPlayers: Math.max(2, minPlayers)
      },
      players: [{
        userId: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar,
        userBoard: puzzle.map(row => [...row]),
        progress: 0,
        mistakes: 0
      }]
    });
    
    await battleRoyale.save();
    
    res.json({
      success: true,
      roomCode: battleRoyale.roomCode,
      battleRoyaleId: battleRoyale._id,
      players: battleRoyale.players.length,
      maxPlayers: battleRoyale.settings.maxPlayers
    });
    
  } catch (error) {
    console.error('Error creating battle royale:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar salas disponibles
router.get('/rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await BattleRoyale.find({
      status: { $in: ['waiting', 'starting'] },
      'players.userId': { $ne: req.user._id } // No mostrar salas donde ya estoy
    })
      .select('roomCode status players settings createdAt')
      .sort({ createdAt: -1 })
      .limit(20);
    
    const roomsList = rooms.map(room => ({
      roomCode: room.roomCode,
      battleRoyaleId: room._id,
      status: room.status,
      players: room.players.length,
      maxPlayers: room.settings.maxPlayers,
      isFull: room.players.length >= room.settings.maxPlayers,
      createdAt: room.createdAt
    }));
    
    res.json({ rooms: roomsList });
    
  } catch (error) {
    console.error('Error getting rooms:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unirse a una sala
router.post('/join/:roomCode', authMiddleware, async (req, res) => {
  try {
    const { roomCode } = req.params;
    
    const battleRoyale = await BattleRoyale.findOne({ roomCode });
    
    if (!battleRoyale) {
      return res.status(404).json({ error: 'Sala no encontrada' });
    }
    
    if (battleRoyale.status !== 'waiting') {
      return res.status(400).json({ error: 'La partida ya comenzó' });
    }
    
    if (battleRoyale.players.length >= battleRoyale.settings.maxPlayers) {
      return res.status(400).json({ error: 'Sala llena' });
    }
    
    // Verificar si ya está en la sala
    const alreadyJoined = battleRoyale.players.find(
      p => p.userId.toString() === req.user._id.toString()
    );
    
    if (alreadyJoined) {
      return res.status(400).json({ error: 'Ya estás en esta sala' });
    }
    
    // Añadir jugador
    battleRoyale.players.push({
      userId: req.user._id,
      username: req.user.username,
      avatar: req.user.avatar,
      userBoard: battleRoyale.puzzle.data.map(row => [...row]),
      progress: 0,
      mistakes: 0
    });
    
    await battleRoyale.save();
    
    res.json({
      success: true,
      battleRoyaleId: battleRoyale._id,
      roomCode: battleRoyale.roomCode,
      players: battleRoyale.players.length,
      maxPlayers: battleRoyale.settings.maxPlayers
    });
    
  } catch (error) {
    console.error('Error joining battle royale:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener información de la sala
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const battleRoyale = await BattleRoyale.findById(req.params.id)
      .populate('players.userId', 'username avatar level');
    
    if (!battleRoyale) {
      return res.status(404).json({ error: 'Battle Royale no encontrado' });
    }
    
    // Verificar que el usuario está en la sala
    const player = battleRoyale.players.find(
      p => p.userId._id.toString() === req.user._id.toString()
    );
    
    if (!player) {
      return res.status(403).json({ error: 'No estás en esta sala' });
    }
    
    res.json({
      battleRoyaleId: battleRoyale._id,
      roomCode: battleRoyale.roomCode,
      status: battleRoyale.status,
      puzzle: battleRoyale.puzzle.data,
      difficulty: battleRoyale.puzzle.difficulty,
      players: battleRoyale.players.map(p => ({
        userId: p.userId._id,
        username: p.username || p.userId.username,
        avatar: p.avatar || p.userId.avatar,
        level: p.userId.level,
        progress: p.progress,
        mistakes: p.mistakes,
        alive: p.alive,
        eliminated: p.eliminated,
        finalPosition: p.finalPosition
      })),
      settings: battleRoyale.settings,
      rounds: battleRoyale.rounds,
      isHost: battleRoyale.hostId.toString() === req.user._id.toString(),
      startedAt: battleRoyale.startedAt,
      myBoard: player.userBoard
    });
    
  } catch (error) {
    console.error('Error getting battle royale:', error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar partida (solo host)
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const battleRoyale = await BattleRoyale.findById(req.params.id);
    
    if (!battleRoyale) {
      return res.status(404).json({ error: 'Battle Royale no encontrado' });
    }
    
    if (battleRoyale.hostId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Solo el host puede iniciar la partida' });
    }
    
    if (battleRoyale.status !== 'waiting') {
      return res.status(400).json({ error: 'La partida ya comenzó' });
    }
    
    if (battleRoyale.players.length < battleRoyale.settings.minPlayers) {
      return res.status(400).json({ 
        error: `Se necesitan al menos ${battleRoyale.settings.minPlayers} jugadores` 
      });
    }
    
    battleRoyale.status = 'starting';
    battleRoyale.startedAt = new Date();
    await battleRoyale.save();
    
    // El servidor Socket.io manejará la cuenta regresiva y cambio a 'active'
    
    res.json({ success: true, status: 'starting' });
    
  } catch (error) {
    console.error('Error starting battle royale:', error);
    res.status(500).json({ error: error.message });
  }
});

// Hacer movimiento en Battle Royale
router.post('/:id/move', authMiddleware, async (req, res) => {
  try {
    const { row, col, value } = req.body;
    const battleRoyale = await BattleRoyale.findById(req.params.id);
    
    if (!battleRoyale) {
      return res.status(404).json({ error: 'Battle Royale no encontrado' });
    }
    
    if (battleRoyale.status !== 'active') {
      return res.status(400).json({ error: 'La partida no está activa' });
    }
    
    const player = battleRoyale.players.find(
      p => p.userId.toString() === req.user._id.toString()
    );
    
    if (!player) {
      return res.status(403).json({ error: 'No estás en esta partida' });
    }
    
    if (!player.alive) {
      return res.status(400).json({ error: 'Has sido eliminado' });
    }
    
    // Verificar que la celda es editable
    if (battleRoyale.puzzle.data[row][col] !== 0) {
      return res.status(400).json({ error: 'No puedes modificar celdas fijas' });
    }
    
    // Actualizar tablero
    player.userBoard[row][col] = value;
    
    // Verificar si es correcto
    const isCorrect = value === 0 || value === battleRoyale.puzzle.solution[row][col];
    if (!isCorrect && value !== 0) {
      player.mistakes++;
    }
    
    // Calcular progreso
    player.progress = battleRoyale.calculateProgress(
      player.userBoard, 
      battleRoyale.puzzle.solution
    );
    
    // Verificar si completó el puzzle
    const completed = player.progress === 100;
    
    if (completed && !battleRoyale.winner) {
      battleRoyale.winner = {
        userId: player.userId,
        username: player.username,
        time: Math.floor((new Date() - battleRoyale.startedAt) / 1000),
        mistakes: player.mistakes
      };
      battleRoyale.status = 'finished';
      battleRoyale.finishedAt = new Date();
      
      // Asignar posiciones finales
      battleRoyale.players.forEach((p, idx) => {
        if (p.userId.toString() === player.userId.toString()) {
          p.finalPosition = 1;
        } else if (!p.finalPosition) {
          p.finalPosition = battleRoyale.players.length - idx;
        }
      });
    }
    
    await battleRoyale.save();
    
    res.json({
      success: true,
      isCorrect,
      completed,
      progress: player.progress,
      mistakes: player.mistakes,
      userBoard: player.userBoard
    });
    
  } catch (error) {
    console.error('Error making move in battle royale:', error);
    res.status(500).json({ error: error.message });
  }
});

// Salir de la sala
router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const battleRoyale = await BattleRoyale.findById(req.params.id);
    
    if (!battleRoyale) {
      return res.status(404).json({ error: 'Battle Royale no encontrado' });
    }
    
    battleRoyale.players = battleRoyale.players.filter(
      p => p.userId.toString() !== req.user._id.toString()
    );
    
    // Si era el host y quedan jugadores, asignar nuevo host
    if (battleRoyale.hostId.toString() === req.user._id.toString() && battleRoyale.players.length > 0) {
      battleRoyale.hostId = battleRoyale.players[0].userId;
    }
    
    // Si no quedan jugadores, eliminar sala
    if (battleRoyale.players.length === 0) {
      await BattleRoyale.findByIdAndDelete(req.params.id);
      return res.json({ success: true, roomDeleted: true });
    }
    
    await battleRoyale.save();
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error leaving battle royale:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial de Battle Royales del usuario
router.get('/history/me', authMiddleware, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const history = await BattleRoyale.find({
      'players.userId': req.user._id,
      status: 'finished'
    })
      .sort({ finishedAt: -1 })
      .limit(parseInt(limit))
      .select('roomCode players winner startedAt finishedAt');
    
    const formatted = history.map(br => {
      const myData = br.players.find(p => p.userId.toString() === req.user._id.toString());
      return {
        battleRoyaleId: br._id,
        roomCode: br.roomCode,
        position: myData?.finalPosition,
        won: br.winner?.userId?.toString() === req.user._id.toString(),
        totalPlayers: br.players.length,
        progress: myData?.progress,
        mistakes: myData?.mistakes,
        date: br.finishedAt
      };
    });
    
    res.json({ history: formatted });
    
  } catch (error) {
    console.error('Error getting battle royale history:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;