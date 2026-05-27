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

  // Create a new room
  socket.on('room:create', ({ name }) => {
    if (!name || !name.trim()) return socket.emit('error', 'Enter your name!');
    const playerId = socket.id;
    const room = new Room(playerId, name.trim());
    rooms[room.code] = room;
    socket.playerId = playerId;
    socket.roomCode = room.code;
    socket.join(room.code);
    socket.emit('room:joined', { code: room.code, playerId });
    broadcastRoom(io, room.code);
  });

  // Join an existing room
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

  // Host starts the game
  socket.on('game:start', () => {
    const room = rooms[socket.roomCode];
    if (!room) return socket.emit('error', 'Room not found');
    const player = room.players[socket.playerId];
    if (!player?.host) return socket.emit('error', 'Only the host can start the game');
    if (Object.keys(room.players).length < 2) return socket.emit('error', 'Need at least 2 players!');
    room.startGame();
    broadcastRoom(io, socket.roomCode);
  });

  // Player submits an answer card
  socket.on('game:submit', ({ answer }) => {
    const room = rooms[socket.roomCode];
    if (!room || room.phase !== 'playing') return;
    const judge = room.getJudge();
    if (socket.playerId === judge.id) return socket.emit('error', 'Judges cannot submit answers!');
    if (room.submissions[socket.playerId]) return; // already submitted
    room.submitAnswer(socket.playerId, answer);
    broadcastRoom(io, socket.roomCode);
  });

  // Judge picks the winner
  socket.on('game:judge_pick', ({ winnerId }) => {
    const room = rooms[socket.roomCode];
    if (!room) return;
    const judge = room.getJudge();
    if (socket.playerId !== judge.id) return socket.emit('error', 'Only the judge can pick!');
    if (!room.allSubmitted()) return socket.emit('error', 'Not all players have submitted yet!');
    if (!room.players[winnerId]) return socket.emit('error', 'Invalid player!');
    room.judgePickWinner(winnerId);
    broadcastRoom(io, socket.roomCode);
  });

  // Host advances to next round
  socket.on('game:next_round', () => {
    const room = rooms[socket.roomCode];
    if (!room) return;
    const player = room.players[socket.playerId];
    if (!player?.host) return socket.emit('error', 'Only the host can advance rounds');
    if (room.phase !== 'result') return;
    room.nextRound();
    broadcastRoom(io, socket.roomCode);
  });

  // Player disconnects
  socket.on('disconnect', () => {
    const { playerId, roomCode } = socket;
    if (!roomCode || !rooms[roomCode]) return;
    const room = rooms[roomCode];
    room.removePlayer(playerId);
    if (Object.keys(room.players).length === 0) {
      delete rooms[roomCode];
    } else {
      // If judge disconnected during playing, skip to next round
      if (room.phase === 'playing' || room.phase === 'judging') {
        room.nextRound();
      }
      broadcastRoom(io, roomCode);
    }
  });
}

module.exports = { registerHandlers };
