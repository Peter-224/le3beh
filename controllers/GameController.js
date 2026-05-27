// controllers/GameController.js
const { rooms, Room } = require('../models/GameModel');

function broadcastRoom(io, code) {
  const room = rooms[code];
  if (!room) return;
  Object.keys(room.players).forEach(playerId => {
    const sockets = [...io.sockets.sockets.values()].filter(s => s.playerId === playerId && s.roomCode === code);
    sockets.forEach(s => s.emit('room:update', room.toClientView(playerId)));
  });
}

function registerHandlers(io, socket) {

  socket.on('room:create', ({ name, winningPoints }) => {
    if (!name || !name.trim()) return socket.emit('error', 'Enter your name!');
    const pts = parseInt(winningPoints) || 5;
    const playerId = socket.id;
    const room = new Room(playerId, name.trim(), pts);
    rooms[room.code] = room;
    socket.playerId = playerId;
    socket.roomCode = room.code;
    socket.join(room.code);
    socket.emit('room:joined', { code: room.code, playerId });
    broadcastRoom(io, room.code);
  });

  socket.on('room:join', ({ name, code }) => {
    if (!name || !name.trim()) return socket.emit('error', 'Enter your name!');
    const upperCode = code?.trim().toUpperCase();
    const room = rooms[upperCode];
    if (!room) return socket.emit('error', 'Room not found. Check the code!');
    if (room.phase !== 'waiting') return socket.emit('error', 'Game already started!');
    if (Object.keys(room.players).length >= 8) return socket.emit('error', 'Room is full (max 8 players)!');
    const playerId = socket.id;
    room.addPlayer(playerId, name.trim());
    socket.playerId = playerId;
    socket.roomCode = upperCode;
    socket.join(upperCode);
    socket.emit('room:joined', { code: upperCode, playerId });
    broadcastRoom(io, upperCode);
  });

  socket.on('game:start', () => {
    const room = rooms[socket.roomCode];
    if (!room) return socket.emit('error', 'Room not found');
    const player = room.players[socket.playerId];
    if (!player?.host) return socket.emit('error', 'Only the host can start');
    if (Object.keys(room.players).length < 2) return socket.emit('error', 'Need at least 2 players!');
    room.startGame();
    broadcastRoom(io, socket.roomCode);
  });

  socket.on('game:submit', ({ answers }) => {
    const room = rooms[socket.roomCode];
    if (!room || room.phase !== 'playing') return;
    const judge = room.getJudge();
    if (socket.playerId === judge.id) return socket.emit('error', 'Judges cannot submit!');
    const existing = room.submissions[socket.playerId];
    const answerCount = room.currentQuestion?.answerCount || 1;
    if (existing && existing.length >= answerCount) return; // already submitted enough
    if (!Array.isArray(answers)) return;
    room.submitAnswer(socket.playerId, answers);
    broadcastRoom(io, socket.roomCode);
  });

  socket.on('game:judge_pick', ({ winnerId }) => {
    const room = rooms[socket.roomCode];
    if (!room) return;
    const judge = room.getJudge();
    if (socket.playerId !== judge.id) return socket.emit('error', 'Only the judge can pick!');
    if (!room.allSubmitted()) return socket.emit('error', 'Not all players submitted!');
    if (!room.players[winnerId]) return socket.emit('error', 'Invalid player!');
    room.judgePickWinner(winnerId);
    broadcastRoom(io, socket.roomCode);
  });

  socket.on('game:switch_cards', ({ count }) => {
    const room = rooms[socket.roomCode];
    if (!room || room.phase !== 'result') return socket.emit('error', 'Can only switch cards between rounds!');
    const n = parseInt(count) || 1;
    const success = room.switchCards(socket.playerId, n);
    if (!success) return socket.emit('error', 'Not enough points to switch cards! (costs 1 point)');
    broadcastRoom(io, socket.roomCode);
  });

  socket.on('game:next_round', () => {
    const room = rooms[socket.roomCode];
    if (!room) return;
    const player = room.players[socket.playerId];
    if (!player?.host) return socket.emit('error', 'Only the host can advance rounds');
    if (room.phase !== 'result') return;
    room.nextRound();
    broadcastRoom(io, socket.roomCode);
  });

  socket.on('disconnect', () => {
    const { playerId, roomCode } = socket;
    if (!roomCode || !rooms[roomCode]) return;
    const room = rooms[roomCode];
    room.removePlayer(playerId);
    if (Object.keys(room.players).length === 0) {
      delete rooms[roomCode];
    } else {
      if (room.phase === 'playing') room.nextRound();
      broadcastRoom(io, roomCode);
    }
  });
}

module.exports = { registerHandlers };
