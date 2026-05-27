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

// { text, answerCount } objects
let QUESTIONS = [];
// { text } objects
let ANSWERS   = [];

function setCards(questions, answers) {
  QUESTIONS = questions;
  ANSWERS   = answers;
  console.log(`Cards set: ${QUESTIONS.length} questions, ${ANSWERS.length} answers`);
}

function dealHand(usedAnswerTexts = []) {
  const available = ANSWERS.filter(a => !usedAnswerTexts.includes(a.text));
  const pool = available.length >= 10 ? available : ANSWERS;
  return shuffle(pool).slice(0, 10).map(a => a.text);
}

class Room {
  constructor(hostId, hostName, winningPoints = 5) {
    this.code           = generateCode();
    this.phase          = 'waiting';
    this.round          = 0;
    this.judgeIndex     = 0;
    this.currentQuestion = null;
    this.usedQuestions  = [];
    this.allQuestions   = shuffle([...QUESTIONS]);
    this.submissions    = {};
    this.roundWinner    = null;
    this.roundWinnerAnswer = null;
    this.gameWinner     = null;
    this.winningPoints  = winningPoints;
    this.players        = {};
    this.createdAt      = Date.now();
    this.addPlayer(hostId, hostName, true);
  }

  addPlayer(id, name, isHost = false) {
    const colors = ['gold','blue','green','red','purple'];
    const used   = Object.values(this.players).map(p => p.color);
    const color  = colors.find(c => !used.includes(c)) || colors[0];
    const hand   = dealHand([]);
    this.players[id] = {
      id, name, color, score: 0,
      hand,
      usedAnswers: [...hand],
      host: isHost,
    };
  }

  removePlayer(id) { delete this.players[id]; }
  getPlayerList()  { return Object.values(this.players); }
  getJudge()       { const l = this.getPlayerList(); return l[this.judgeIndex % l.length]; }
  getNonJudge()    { const j = this.getJudge(); return this.getPlayerList().filter(p => p.id !== j.id); }

  allSubmitted() {
    const nonJudge = this.getNonJudge();
    if (!nonJudge.length) return false;
    const needed = this.currentQuestion?.answerCount || 1;
    return nonJudge.every(p => (this.submissions[p.id]?.length || 0) >= needed);
  }

  getNextQuestion() {
    const unused = this.allQuestions.filter(q => !this.usedQuestions.includes(q.text));
    if (!unused.length) {
      this.usedQuestions = [];
      return shuffle([...QUESTIONS])[0] || null;
    }
    return unused[0];
  }

  startGame() {
    this.phase          = 'playing';
    this.round          = 1;
    this.judgeIndex     = 0;
    this.usedQuestions  = [];
    this.allQuestions   = shuffle([...QUESTIONS]);
    this.currentQuestion = this.getNextQuestion();
    if (this.currentQuestion) this.usedQuestions.push(this.currentQuestion.text);
    this.submissions    = {};
    this.roundWinner    = null;
    this.roundWinnerAnswer = null;
  }

  submitAnswer(playerId, answers) {
    this.submissions[playerId] = answers;
    const player = this.players[playerId];
    if (!player) return;
    answers.forEach(answer => {
      const idx = player.hand.indexOf(answer);
      if (idx !== -1) {
        player.hand.splice(idx, 1);
        const available = ANSWERS.filter(a => !player.usedAnswers.includes(a.text));
        const pool = available.length > 0 ? available : ANSWERS;
        const newCard = shuffle(pool)[0].text;
        player.hand.push(newCard);
        player.usedAnswers.push(newCard);
      }
    });
  }

  switchCards(playerId, count) {
    const player = this.players[playerId];
    if (!player || player.score < 1) return false;
    count = Math.min(Math.max(1, count), 10, player.hand.length);
    player.score -= 1;
    player.hand.splice(0, count);
    for (let i = 0; i < count; i++) {
      const available = ANSWERS.filter(a => !player.usedAnswers.includes(a.text));
      const pool = available.length > 0 ? available : ANSWERS;
      const newCard = shuffle(pool)[0].text;
      player.hand.push(newCard);
      player.usedAnswers.push(newCard);
    }
    return true;
  }

  judgePickWinner(winnerId) {
    this.roundWinner       = winnerId;
    this.roundWinnerAnswer = this.submissions[winnerId];
    this.players[winnerId].score += 1;
    if (this.players[winnerId].score >= this.winningPoints) {
      this.phase      = 'gameover';
      this.gameWinner = winnerId;
    } else {
      this.phase = 'result';
    }
  }

  nextRound() {
    this.round        += 1;
    this.judgeIndex    = (this.judgeIndex + 1) % this.getPlayerList().length;
    this.currentQuestion = this.getNextQuestion();
    if (this.currentQuestion) this.usedQuestions.push(this.currentQuestion.text);
    this.submissions   = {};
    this.roundWinner   = null;
    this.roundWinnerAnswer = null;
    this.phase         = 'playing';
  }

  toClientView(playerId) {
    const judge      = this.getJudge();
    const isJudge    = judge.id === playerId;
    const player     = this.players[playerId];
    const answerCount = this.currentQuestion?.answerCount || 1;
    const nonJudge   = this.getNonJudge();

    let shuffledSubmissions = null;
    if (this.allSubmitted()) {
      shuffledSubmissions = shuffle(Object.entries(this.submissions))
        .map(([pid, answers]) => ({ pid, answers }));
    }

    return {
      code:          this.code,
      phase:         this.phase,
      round:         this.round,
      winningPoints: this.winningPoints,
      currentQuestion: this.currentQuestion?.text || '',
      answerCount,
      judge:         { id: judge.id, name: judge.name },
      isJudge,
      players: this.getPlayerList().map(p => ({
        id: p.id, name: p.name, color: p.color, score: p.score,
        host: p.host, isYou: p.id === playerId,
        submitted: (this.submissions[p.id]?.length || 0) >= answerCount,
      })),
      myHand:        player ? player.hand : [],
      myScore:       player ? player.score : 0,
      mySubmission:  this.submissions[playerId] || null,
      allSubmitted:  this.allSubmitted(),
      shuffledSubmissions,
      roundWinner:       this.roundWinner,
      roundWinnerName:   this.roundWinner ? this.players[this.roundWinner]?.name : null,
      roundWinnerAnswer: this.roundWinnerAnswer,
      gameWinner:        this.gameWinner,
      gameWinnerName:    this.gameWinner ? this.players[this.gameWinner]?.name : null,
      revealedAnswers: (this.phase === 'result' || this.phase === 'gameover')
        ? Object.entries(this.submissions).map(([pid, answers]) => ({
            pid,
            name:     this.players[pid]?.name,
            answers,
            isWinner: pid === this.roundWinner,
          }))
        : null,
    };
  }
}

module.exports = { rooms, Room, setCards };
