// models/GameModel.js

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

const rooms = {};

// Cards loaded from DB
let QUESTIONS = [];
let ANSWERS = [];

function setCards(questions, answers) {
  QUESTIONS = questions;
  ANSWERS = answers;
  console.log(`Loaded ${QUESTIONS.length} questions and ${ANSWERS.length} answers from DB`);
}

function dealHand(usedAnswers = []) {
  const available = ANSWERS.filter(a => !usedAnswers.includes(a.text));
  return shuffle(available).slice(0, 10).map(a => a.text);
}

class Room {
  constructor(hostId, hostName, winningPoints = 5) {
    this.code = generateCode();
    this.phase = 'waiting';
    this.round = 0;
    this.judgeIndex = 0;
    this.currentQuestion = null;
    this.usedQuestions = [];       // track used question texts
    this.allQuestions = shuffle([...QUESTIONS]);
    this.submissions = {};         // playerId -> [answer] or [answer1, answer2]
    this.roundWinner = null;
    this.roundWinnerAnswer = null;
    this.gameWinner = null;
    this.winningPoints = winningPoints;
    this.players = {};
    this.createdAt = Date.now();
    this.addPlayer(hostId, hostName, true);
  }

  addPlayer(id, name, isHost = false) {
    const colors = ['gold', 'blue', 'green', 'red', 'purple'];
    const usedColors = Object.values(this.players).map(p => p.color);
    const color = colors.find(c => !usedColors.includes(c)) || colors[0];
    this.players[id] = {
      id, name, color,
      score: 0,
      hand: dealHand(),
      usedAnswers: [],   // answers dealt to this player this game
      host: isHost,
      wantsSwitch: false,
    };
    // Track dealt answers
    this.players[id].usedAnswers = [...this.players[id].hand];
  }

  removePlayer(id) { delete this.players[id]; }
  getPlayerList() { return Object.values(this.players); }
  getJudge() { const list = this.getPlayerList(); return list[this.judgeIndex % list.length]; }
  getNonJudgePlayers() { const judge = this.getJudge(); return this.getPlayerList().filter(p => p.id !== judge.id); }

  allSubmitted() {
    const nonJudge = this.getNonJudgePlayers();
    if (nonJudge.length === 0) return false;
    return nonJudge.every(p => {
      const sub = this.submissions[p.id];
      if (!sub) return false;
      // Check if enough answers submitted for this question
      return sub.length >= (this.currentQuestion?.answerCount || 1);
    });
  }

  getNextQuestion() {
    // Find a question not yet used this game
    const unused = this.allQuestions.filter(q => !this.usedQuestions.includes(q.text));
    if (unused.length === 0) {
      // All used — reshuffle but keep track
      this.usedQuestions = [];
      return shuffle([...QUESTIONS])[0];
    }
    return unused[0];
  }

  startGame() {
    this.phase = 'playing';
    this.round = 1;
    this.judgeIndex = 0;
    this.usedQuestions = [];
    this.allQuestions = shuffle([...QUESTIONS]);
    this.currentQuestion = this.getNextQuestion();
    if (this.currentQuestion) this.usedQuestions.push(this.currentQuestion.text);
    this.submissions = {};
    this.roundWinner = null;
    this.roundWinnerAnswer = null;
  }

  submitAnswer(playerId, answers) {
    // answers is an array
    this.submissions[playerId] = answers;
    const player = this.players[playerId];
    if (!player) return;
    // Remove used cards and deal fresh ones (not previously used by this player)
    answers.forEach(answer => {
      const idx = player.hand.indexOf(answer);
      if (idx !== -1) {
        player.hand.splice(idx, 1);
        // Deal new card not used by this player
        const available = ANSWERS.filter(a => !player.usedAnswers.includes(a.text));
        if (available.length > 0) {
          const newCard = shuffle(available)[0].text;
          player.hand.push(newCard);
          player.usedAnswers.push(newCard);
        }
      }
    });
  }

  switchCards(playerId, count) {
    // Costs 1 point, switches up to 10 cards
    const player = this.players[playerId];
    if (!player || player.score < 1) return false;
    if (count < 1 || count > 10) return false;
    player.score -= 1;
    const toSwitch = Math.min(count, player.hand.length);
    // Remove first `toSwitch` cards
    player.hand.splice(0, toSwitch);
    // Deal new ones not previously used
    for (let i = 0; i < toSwitch; i++) {
      const available = ANSWERS.filter(a => !player.usedAnswers.includes(a.text));
      if (available.length > 0) {
        const newCard = shuffle(available)[0].text;
        player.hand.push(newCard);
        player.usedAnswers.push(newCard);
      }
    }
    return true;
  }

  judgePickWinner(winnerId) {
    const winnerAnswers = this.submissions[winnerId];
    this.roundWinner = winnerId;
    this.roundWinnerAnswer = winnerAnswers;
    this.players[winnerId].score += 1;
    if (this.players[winnerId].score >= this.winningPoints) {
      this.phase = 'gameover';
      this.gameWinner = winnerId;
    } else {
      this.phase = 'result';
    }
  }

  nextRound() {
    this.round += 1;
    this.judgeIndex = (this.judgeIndex + 1) % this.getPlayerList().length;
    this.currentQuestion = this.getNextQuestion();
    if (this.currentQuestion) this.usedQuestions.push(this.currentQuestion.text);
    this.submissions = {};
    this.roundWinner = null;
    this.roundWinnerAnswer = null;
    this.phase = 'playing';
    // Reset switch flag
    Object.values(this.players).forEach(p => p.wantsSwitch = false);
  }

  toClientView(playerId) {
    const judge = this.getJudge();
    const isJudge = judge.id === playerId;
    const player = this.players[playerId];
    const answerCount = this.currentQuestion?.answerCount || 1;

    let shuffledSubmissions = null;
    if (this.allSubmitted()) {
      shuffledSubmissions = shuffle(Object.entries(this.submissions)).map(([pid, answers]) => ({ pid, answers }));
    }

    return {
      code: this.code,
      phase: this.phase,
      round: this.round,
      winningPoints: this.winningPoints,
      currentQuestion: this.currentQuestion?.text || '',
      answerCount,
      judge: { id: judge.id, name: judge.name },
      isJudge,
      players: this.getPlayerList().map(p => ({
        id: p.id, name: p.name, color: p.color, score: p.score,
        host: p.host, isYou: p.id === playerId,
        submitted: this.submissions[p.id]?.length >= answerCount,
      })),
      myHand: player ? player.hand : [],
      myScore: player ? player.score : 0,
      mySubmission: this.submissions[playerId] || null,
      allSubmitted: this.allSubmitted(),
      shuffledSubmissions,
      roundWinner: this.roundWinner,
      roundWinnerName: this.roundWinner ? this.players[this.roundWinner]?.name : null,
      roundWinnerAnswer: this.roundWinnerAnswer,
      gameWinner: this.gameWinner,
      gameWinnerName: this.gameWinner ? this.players[this.gameWinner]?.name : null,
      revealedAnswers: (this.phase === 'result' || this.phase === 'gameover')
        ? Object.entries(this.submissions).map(([pid, answers]) => ({
            pid, name: this.players[pid]?.name, answers, isWinner: pid === this.roundWinner,
          }))
        : null,
    };
  }
}

module.exports = { rooms, Room, setCards };
