const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '🎮' },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    totalTime: { type: Number, default: 0 },
    bestTime: { type: Number, default: null },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastPlayedDate: { type: Date, default: null },
    
    byDifficulty: {
      easy: { played: { type: Number, default: 0 }, won: { type: Number, default: 0 }, bestTime: { type: Number, default: null } },
      medium: { played: { type: Number, default: 0 }, won: { type: Number, default: 0 }, bestTime: { type: Number, default: null } },
      hard: { played: { type: Number, default: 0 }, won: { type: Number, default: 0 }, bestTime: { type: Number, default: null } },
      expert: { played: { type: Number, default: 0 }, won: { type: Number, default: 0 }, bestTime: { type: Number, default: null } },
      master: { played: { type: Number, default: 0 }, won: { type: Number, default: 0 }, bestTime: { type: Number, default: null } }
    },
    
    heatmap: { type: Map, of: Number, default: {} }, // {"0-0": 5, "0-1": 3} errores por celda
    techniques: { type: Map, of: Number, default: {} }
  },
  
  tournament: {
    currentChapter: { type: Number, default: 1 },
    completedLevels: [{ type: String }], // ["1-1", "1-2", "2-1"]
    lives: { type: Number, default: 3 },
    stars: { type: Number, default: 0 }
  },
  
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  achievements: [{ 
    id: String, 
    unlockedAt: { type: Date, default: Date.now } 
  }],
  
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

// Hash password antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Método para comparar passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);