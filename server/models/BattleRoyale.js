const mongoose = require('mongoose');

const battleRoyaleSchema = new mongoose.Schema({
  status: { 
    type: String, 
    enum: ['waiting', 'starting', 'active', 'finished'], 
    default: 'waiting' 
  },
  
  roomCode: { type: String, unique: true, required: true }, // Código único de sala
  
  puzzle: {
    difficulty: { type: String, default: 'hard' },
    data: { type: [[Number]], required: true },
    solution: { type: [[Number]], required: true },
    seed: { type: Number }
  },
  
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String, required: true },
    avatar: { type: String, default: '🎮' },
    socketId: { type: String }, // Para comunicación en tiempo real
    
    // Estado del juego
    userBoard: { type: [[Number]] },
    progress: { type: Number, default: 0 }, // % completado
    mistakes: { type: Number, default: 0 },
    
    // Estado en la partida
    alive: { type: Boolean, default: true },
    eliminated: { type: Boolean, default: false },
    eliminatedAt: { type: Date },
    eliminatedRound: { type: Number },
    finalPosition: { type: Number },
    
    joinedAt: { type: Date, default: Date.now }
  }],
  
  settings: {
    maxPlayers: { type: Number, default: 20, min: 2, max: 50 },
    minPlayers: { type: Number, default: 2 },
    eliminationInterval: { type: Number, default: 60 }, // segundos
    eliminationPercentage: { type: Number, default: 0.25 } // 25% por ronda
  },
  
  rounds: [{
    number: { type: Number },
    timestamp: { type: Date },
    playersAlive: { type: Number },
    playersEliminated: [{ 
      userId: mongoose.Schema.Types.ObjectId,
      username: String,
      progress: Number
    }]
  }],
  
  winner: { 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    time: Number,
    mistakes: Number
  },
  
  startedAt: { type: Date },
  finishedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  
  // Host de la sala (quien la creó)
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Índices
battleRoyaleSchema.index({ status: 1, createdAt: -1 });
battleRoyaleSchema.index({ roomCode: 1 });

// Método para calcular progreso de un jugador
battleRoyaleSchema.methods.calculateProgress = function(userBoard, solution) {
  let correct = 0;
  let total = 0;
  
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (solution[i][j] !== 0) {
        total++;
        if (userBoard[i][j] === solution[i][j]) {
          correct++;
        }
      }
    }
  }
  
  return total > 0 ? Math.round((correct / total) * 100) : 0;
};

// Método para eliminar jugadores
battleRoyaleSchema.methods.eliminatePlayers = function() {
  const alivePlayers = this.players.filter(p => p.alive && !p.eliminated);
  
  if (alivePlayers.length <= 1) {
    return []; // No eliminar si queda 1 o menos
  }
  
  // Ordenar por progreso (menor a mayor)
  alivePlayers.sort((a, b) => a.progress - b.progress);
  
  // Calcular cuántos eliminar (mínimo 1, máximo la mitad)
  const toEliminate = Math.max(
    1, 
    Math.min(
      Math.floor(alivePlayers.length * this.settings.eliminationPercentage),
      Math.floor(alivePlayers.length / 2)
    )
  );
  
  // Marcar como eliminados
  const eliminated = [];
  for (let i = 0; i < toEliminate; i++) {
    const player = alivePlayers[i];
    player.eliminated = true;
    player.alive = false;
    player.eliminatedAt = new Date();
    player.eliminatedRound = this.rounds.length + 1;
    eliminated.push({
      userId: player.userId,
      username: player.username,
      progress: player.progress
    });
  }
  
  // Registrar ronda
  this.rounds.push({
    number: this.rounds.length + 1,
    timestamp: new Date(),
    playersAlive: alivePlayers.length - toEliminate,
    playersEliminated: eliminated
  });
  
  return eliminated;
};

module.exports = mongoose.model('BattleRoyale', battleRoyaleSchema);