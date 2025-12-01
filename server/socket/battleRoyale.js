// server/socket/battleRoyale.js
const BattleRoyale = require('../models/BattleRoyale');

module.exports = (io) => {
  // Namespace específico para Battle Royale
  const brNamespace = io.of('/battle-royale');
  
  brNamespace.on('connection', (socket) => {
    console.log('🎮 Usuario conectado a Battle Royale:', socket.id);
    
    // Unirse a una sala
    socket.on('join-room', async (data) => {
      try {
        const { battleRoyaleId, userId } = data;
        
        const br = await BattleRoyale.findById(battleRoyaleId);
        if (!br) {
          socket.emit('error', { message: 'Sala no encontrada' });
          return;
        }
        
        // Actualizar socketId del jugador
        const player = br.players.find(p => p.userId.toString() === userId);
        if (player) {
          player.socketId = socket.id;
          await br.save();
        }
        
        // Unirse a la sala de Socket.io
        socket.join(battleRoyaleId);
        
        // Notificar a todos los jugadores
        brNamespace.to(battleRoyaleId).emit('player-joined', {
          username: player?.username,
          totalPlayers: br.players.length
        });
        
        // Enviar estado actual al jugador que se une
        socket.emit('room-state', {
          status: br.status,
          players: br.players.map(p => ({
            username: p.username,
            avatar: p.avatar,
            progress: p.progress,
            alive: p.alive
          }))
        });
        
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: error.message });
      }
    });
    
    // Iniciar cuenta regresiva
    socket.on('start-countdown', async (battleRoyaleId) => {
      try {
        const br = await BattleRoyale.findById(battleRoyaleId);
        if (!br || br.status !== 'starting') return;
        
        let countdown = 3;
        const countdownInterval = setInterval(() => {
          brNamespace.to(battleRoyaleId).emit('countdown', countdown);
          countdown--;
          
          if (countdown < 0) {
            clearInterval(countdownInterval);
            startBattleRoyale(battleRoyaleId);
          }
        }, 1000);
        
      } catch (error) {
        console.error('Error starting countdown:', error);
      }
    });
    
    // Actualización de progreso
    socket.on('progress-update', async (data) => {
      try {
        const { battleRoyaleId, userId, progress } = data;
        
        const br = await BattleRoyale.findById(battleRoyaleId);
        if (!br) return;
        
        const player = br.players.find(p => p.userId.toString() === userId);
        if (player) {
          player.progress = progress;
          await br.save();
          
          // Broadcast a todos en la sala
          brNamespace.to(battleRoyaleId).emit('leaderboard-update', {
            players: br.players
              .filter(p => p.alive)
              .sort((a, b) => b.progress - a.progress)
              .map(p => ({
                username: p.username,
                avatar: p.avatar,
                progress: p.progress,
                mistakes: p.mistakes
              }))
          });
        }
        
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    });
    
    // Desconexión
    socket.on('disconnect', () => {
      console.log('❌ Usuario desconectado de Battle Royale:', socket.id);
    });
  });
  
  // Función para iniciar el Battle Royale
  async function startBattleRoyale(battleRoyaleId) {
    try {
      const br = await BattleRoyale.findById(battleRoyaleId);
      if (!br) return;
      
      br.status = 'active';
      br.startedAt = new Date();
      await br.save();
      
      brNamespace.to(battleRoyaleId).emit('game-started');
      
      // Iniciar ciclo de eliminación
      startEliminationCycle(battleRoyaleId);
      
    } catch (error) {
      console.error('Error starting battle royale:', error);
    }
  }
  
  // Ciclo de eliminación
  function startEliminationCycle(battleRoyaleId) {
    const eliminationInterval = setInterval(async () => {
      try {
        const br = await BattleRoyale.findById(battleRoyaleId);
        if (!br || br.status !== 'active') {
          clearInterval(eliminationInterval);
          return;
        }
        
        const alivePlayers = br.players.filter(p => p.alive).length;
        
        if (alivePlayers <= 1) {
          clearInterval(eliminationInterval);
          endBattleRoyale(battleRoyaleId);
          return;
        }
        
        // Eliminar jugadores
        const eliminated = br.eliminatePlayers();
        await br.save();
        
        if (eliminated.length > 0) {
          brNamespace.to(battleRoyaleId).emit('players-eliminated', {
            eliminated: eliminated,
            playersRemaining: alivePlayers - eliminated.length
          });
        }
        
      } catch (error) {
        console.error('Error in elimination cycle:', error);
        clearInterval(eliminationInterval);
      }
    }, 60000); // Cada 60 segundos
  }
  
  // Finalizar Battle Royale
  async function endBattleRoyale(battleRoyaleId) {
    try {
      const br = await BattleRoyale.findById(battleRoyaleId);
      if (!br) return;
      
      br.status = 'finished';
      br.finishedAt = new Date();
      
      const winner = br.players.find(p => p.alive);
      if (winner) {
        br.winner = {
          userId: winner.userId,
          username: winner.username,
          time: Math.floor((br.finishedAt - br.startedAt) / 1000),
          mistakes: winner.mistakes
        };
        winner.finalPosition = 1;
      }
      
      await br.save();
      
      brNamespace.to(battleRoyaleId).emit('game-finished', {
        winner: br.winner
      });
      
    } catch (error) {
      console.error('Error ending battle royale:', error);
    }
  }
};