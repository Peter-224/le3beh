// models/GameModel.js
const { v4: uuidv4 } = require('uuid');

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCode() {
  return Math.random().toString(36).substr(2, 4).toUpperCase();
}

// In-memory store
const rooms = {};

// Cards loaded from DB at startup
let QUESTIONS = [];
let ANSWERS = [];

function setCards(questions, answers) {
  QUESTIONS = questions;
  ANSWERS = answers;
  console.log(`Loaded ${QUESTIONS.length} questions and ${ANSWERS.length} answers from DB`);
}

function getQuestions() { return QUESTIONS; }
function getAnswers() { return ANSWERS; }

function dealHand() {
  return shuffle(ANSWERS).slice(0, 10);
}

class Room {
  constructor(hostId, hostName) {
    this.code = generateCode();
    this.phase = 'waiting';
    this.round = 0;
    this.judgeIndex = 0;
    this.currentQuestion = '';
    this.allQuestions = shuffle(QUESTIONS);
    this.submissions = {};
    this.roundWinner = null;
    this.roundWinnerAnswer = null;
    this.gameWinner = null;
    this.players = {};
    this.createdAt = Date.now();
    this.addPlayer(hostId, hostName, true);
  }

  addPlayer(id, name, isHost = false) {
    const colors = ['gold', 'blue', 'green', 'red', 'purple'];
    const usedColors = Object.values(this.players).map(p => p.color);
    const color = colors.find(c => !usedColors.includes(c)) || colors[0];
    this.players[id] = { id, name, color, score: 0, hand: dealHand(), host: isHost };
  }

  removePlayer(id) { delete this.players[id]; }
  getPlayerList() { return Object.values(this.players); }
  getJudge() { const list = this.getPlayerList(); return list[this.judgeIndex % list.length]; }
  getNonJudgePlayers() { const judge = this.getJudge(); return this.getPlayerList().filter(p => p.id !== judge.id); }

  allSubmitted() {
    const nonJudge = this.getNonJudgePlayers();
    return nonJudge.length > 0 && nonJudge.every(p => this.submissions[p.id] !== undefined);
  }

  startGame() {
    this.phase = 'playing';
    this.round = 1;
    this.judgeIndex = 0;
    this.allQuestions = shuffle(QUESTIONS);
    this.currentQuestion = this.allQuestions[0];
    this.submissions = {};
    this.roundWinner = null;
    this.roundWinnerAnswer = null;
  }

  submitAnswer(playerId, answer) {
    this.submissions[playerId] = answer;
    const player = this.players[playerId];
    if (player) {
      const idx = player.hand.indexOf(answer);
      if (idx !== -1) {
        const available = ANSWERS.filter(a => !player.hand.includes(a));
        const newCard = available.length > 0
          ? available[Math.floor(Math.random() * available.length)]
          : ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
        player.hand.splice(idx, 1, newCard);
      }
    }
  }

  judgePickWinner(winnerId) {
    const winnerAnswer = this.submissions[winnerId];
    this.roundWinner = winnerId;
    this.roundWinnerAnswer = winnerAnswer;
    this.players[winnerId].score += 1;
    if (this.players[winnerId].score >= 5) {
      this.phase = 'gameover';
      this.gameWinner = winnerId;
    } else {
      this.phase = 'result';
    }
  }

  nextRound() {
    this.round += 1;
    this.judgeIndex = (this.judgeIndex + 1) % this.getPlayerList().length;
    const qi = (this.round - 1) % this.allQuestions.length;
    this.currentQuestion = this.allQuestions[qi];
    this.submissions = {};
    this.roundWinner = null;
    this.roundWinnerAnswer = null;
    this.phase = 'playing';
  }

  toClientView(playerId) {
    const judge = this.getJudge();
    const isJudge = judge.id === playerId;
    const player = this.players[playerId];
    let shuffledSubmissions = null;
    if (this.allSubmitted()) {
      shuffledSubmissions = shuffle(Object.entries(this.submissions)).map(([pid, ans]) => ({ pid, ans }));
    }
    return {
      code: this.code,
      phase: this.phase,
      round: this.round,
      currentQuestion: this.currentQuestion,
      judge: { id: judge.id, name: judge.name },
      isJudge,
      players: this.getPlayerList().map(p => ({
        id: p.id, name: p.name, color: p.color, score: p.score,
        host: p.host, isYou: p.id === playerId, submitted: this.submissions[p.id] !== undefined,
      })),
      myHand: player ? player.hand : [],
      mySubmission: this.submissions[playerId] || null,
      allSubmitted: this.allSubmitted(),
      shuffledSubmissions,
      roundWinner: this.roundWinner,
      roundWinnerName: this.roundWinner ? this.players[this.roundWinner]?.name : null,
      roundWinnerAnswer: this.roundWinnerAnswer,
      gameWinner: this.gameWinner,
      gameWinnerName: this.gameWinner ? this.players[this.gameWinner]?.name : null,
      revealedAnswers: (this.phase === 'result' || this.phase === 'gameover')
        ? Object.entries(this.submissions).map(([pid, ans]) => ({
            pid, name: this.players[pid]?.name, ans, isWinner: pid === this.roundWinner,
          }))
        : null,
    };
  }
}

module.exports = { rooms, Room, setCards, getQuestions, getAnswers };
