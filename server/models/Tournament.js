const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  chapters: [{
    number: { type: Number, required: true },
    name: { type: String, required: true },
    description: { type: String },
    levels: [{
      number: { type: Number, required: true },
      difficulty: { type: String, required: true },
      stars: { type: Number, min: 0, max: 3 },
      isBoss: { type: Boolean, default: false },
      timeLimit: { type: Number }, // Opcional para desafío extra
      requirements: {
        maxMistakes: { type: Number },
        maxHints: { type: Number },
        maxTime: { type: Number }
      }
    }]
  }]
});

module.exports = mongoose.model('Tournament', tournamentSchema);