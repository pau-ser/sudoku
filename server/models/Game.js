// models/Game.js - Versión actualizada
const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard', 'expert', 'master'] },
  mode: { type: String, enum: ['normal', 'timeAttack', 'expert', 'daily', 'tournament', 'battleRoyale'], default: 'normal' },
  
  // Estado del juego
  puzzle: [[Number]], // Tablero inicial
  solution: [[Number]], // Solución completa
  userBoard: [[Number]], // Estado actual del usuario
  completed: { type: Boolean, default: false },
  time: { type: Number, default: 0 }, // Segundos
  mistakes: { type: Number, default: 0 },
  hintsUsed: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  
  // Sistema de anotaciones y movimientos
  notes: { type: Map, of: [Number], default: {} }, // { "0-0": [1,2,3], "0-1": [4,5] }
  moveHistory: [{
    row: Number,
    col: Number,
    oldValue: Number,
    newValue: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Modos especiales
  timeAttackLimit: { type: Number, default: 600 },
  expertMode: { type: Boolean, default: false },
  
  // Para desafíos
  dailyChallengeDate: { type: String }, // "2025-11-02"
  tournamentLevel: { type: String }, // "1-1"
  battleRoyaleId: { type: mongoose.Schema.Types.ObjectId, ref: 'BattleRoyale' },
  
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  lastActivity: { type: Date, default: Date.now }
});

// Índices para búsquedas rápidas
gameSchema.index({ userId: 1, createdAt: -1 });
gameSchema.index({ difficulty: 1, time: 1 });
gameSchema.index({ dailyChallengeDate: 1, time: 1 });
gameSchema.index({ completed: 1, lastActivity: 1 });

// Método para verificar si el juego está completado
gameSchema.methods.checkCompletion = function() {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (this.userBoard[i][j] !== this.solution[i][j]) {
        return false;
      }
    }
  }
  return true;
};

// Método para calcular el progreso
gameSchema.methods.getProgress = function() {
  const totalCells = 81;
  const filledCells = this.userBoard.flat().filter(cell => cell !== 0).length;
  return Math.round((filledCells / totalCells) * 100);
};

module.exports = mongoose.model('Game', gameSchema);