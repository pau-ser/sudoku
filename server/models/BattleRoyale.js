const mongoose = require('mongoose');

const battleRoyaleSchema = new mongoose.Schema({
  status: { 
    type: String, 
    enum: ['waiting', 'starting', 'active', 'finished'], 
    default: 'waiting' 
  },
  
  puzzle: {
    difficulty: { type: String, default: 'hard' },
    data: [[Number]],
    solution: [[Number]]
  },
  
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    avatar: String,
    progress: { type: Number, default: 0 }, // % completado
    eliminated: { type: Boolean, default: false },
    eliminatedAt: { type: Date },
    finalPosition: { type: Number },
    mistakes: { type: Number, default: 0 }
  }],
  
  maxPlayers: { type: Number, default: 50 },
  minPlayers: { type: Number, default: 5 },
  
  eliminationInterval: { type: Number, default: 60 }, // segundos
  lastEliminationAt: { type: Date },
  
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  startedAt: { type: Date },
  finishedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BattleRoyale', battleRoyaleSchema);