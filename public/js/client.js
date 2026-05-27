// public/js/client.js
const socket = io();

// ── State ──
let myPlayerId = null;
let myRoomCode = null;
let selectedCard = null;
let lastRound = null;

// ── Helpers ──
const $ = id => document.getElementById(id);
const showScreen = id => {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('screen-' + id)?.classList.add('active');
};
const showError = (elId, msg) => {
  const el = $(elId);
  if (el) el.innerHTML = `<div class="alert alert-error">${msg}</div>`;
};
const clearError = elId => { const el = $(elId); if (el) el.innerHTML = ''; };

// ── Lobby ──
$('btn-create').addEventListener('click', () => {
  const name = $('inp-name-create').value.trim();
  if (!name) return showError('lobby-error', 'Shou esmak? Enter your name!');
  clearError('lobby-error');
  socket.emit('room:create', { name });
});

$('btn-join').addEventListener('click', () => {
  const name = $('inp-name-join').value.trim();
  const code = $('inp-code').value.trim().toUpperCase();
  if (!name) return showError('lobby-error', 'Shou esmak? Enter your name!');
  if (code.length < 4) return showError('lobby-error', 'Enter the room code!');
  clearError('lobby-error');
  socket.emit('room:join', { name, code });
});

$('inp-code').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase();
});

// Allow Enter key on lobby inputs
['inp-name-create', 'inp-name-join', 'inp-code'].forEach(id => {
  $(id)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (id === 'inp-name-create') $('btn-create').click();
      else $('btn-join').click();
    }
  });
});

// ── Socket events ──
socket.on('room:joined', ({ code, playerId }) => {
  myPlayerId = playerId;
  myRoomCode = code;
  $('display-code').textContent = code;
  showScreen('waiting');
});

socket.on('room:update', state => {
  renderState(state);
});

socket.on('error', msg => {
  showError('lobby-error', msg);
});

// ── Game start (host) ──
function startGame() {
  socket.emit('game:start');
}

// ── Submit answer ──
function submitAnswer() {
  if (!selectedCard) return;
  socket.emit('game:submit', { answer: selectedCard });
  selectedCard = null;
}

// ── Judge picks winner ──
function judgePickWinner(winnerId, answer) {
  // Visual feedback
  document.querySelectorAll('.judge-answer-card').forEach(el => {
    if (el.dataset.pid === winnerId) el.classList.add('chosen');
    else el.classList.add('unchosen');
  });
  socket.emit('game:judge_pick', { winnerId });
}

// ── Next round (host) ──
function nextRound() {
  socket.emit('game:next_round');
}

// ── Reset ──
function resetToLobby() {
  myPlayerId = null;
  myRoomCode = null;
  selectedCard = null;
  lastRound = null;
  $('inp-name-create').value = '';
  $('inp-name-join').value = '';
  $('inp-code').value = '';
  showScreen('lobby');
}

// ── Main render ──
function renderState(state) {
  if (!state) return;

  if (state.phase === 'waiting') {
    showScreen('waiting');
    renderWaiting(state);
  } else if (state.phase === 'playing') {
    showScreen('game');
    renderGame(state);
  } else if (state.phase === 'result') {
    showScreen('game');
    renderResult(state);
  } else if (state.phase === 'gameover') {
    showScreen('winner');
    renderWinner(state);
  }
}

// ── Waiting room ──
function renderWaiting(state) {
  $('player-count').textContent = state.players.length;
  $('players-list-waiting').innerHTML = state.players.map(p => `
    <div class="player-item">
      <div class="player-avatar av-${p.color}">${p.name[0].toUpperCase()}</div>
      <div class="player-name">${p.name}</div>
      ${p.host ? '<span class="badge badge-host">Host</span>' : ''}
      ${p.isYou ? '<span class="badge badge-you">You</span>' : ''}
    </div>`).join('');

  const me = state.players.find(p => p.isYou);
  const isHost = me?.host;
  const area = $('start-btn-area');
  if (isHost) {
    area.innerHTML = state.players.length >= 2
      ? `<button class="btn btn-gold" onclick="startGame()">Start Game (${state.players.length} players)</button>`
      : `<div class="alert alert-info">Waiting for at least 2 players to join...</div>`;
  } else {
    area.innerHTML = `<div class="alert alert-info">Waiting for host to start the game...</div>`;
  }
}

// ── Game screen ──
function renderGame(state) {
  // Reset selected card on new round
  if (lastRound !== state.round) {
    lastRound = state.round;
    selectedCard = null;
  }

  $('round-badge').textContent = `Round ${state.round}`;
  $('judge-badge').textContent = `Judge: ${state.judge.name}`;
  $('current-question').textContent = state.currentQuestion;

  // Score chips
  $('score-chips').innerHTML = state.players.map(p => `
    <div class="score-mini">
      <div class="score-mini-name">${p.name.split(' ')[0]}</div>
      <div class="score-mini-pts">${p.score}</div>
    </div>`).join('');

  // Hide all panels
  ['panel-submit', 'panel-waiting-submit', 'panel-judge-waiting', 'panel-judge-pick', 'panel-result']
    .forEach(id => $(id).style.display = 'none');

  const nonJudge = state.players.filter(p => p.id !== state.judge.id);

  if (state.isJudge) {
    $('phase-text').textContent = 'You are the judge!';

    if (!state.allSubmitted) {
      // Judge waiting for submissions
      $(  'panel-judge-waiting').style.display = 'block';
      $('judge-wait-msg').textContent =
        `Waiting for answers... (${nonJudge.filter(p => p.submitted).length}/${nonJudge.length})`;
      $('judge-submit-chips').innerHTML = nonJudge.map(p => `
        <div class="player-chip ${p.submitted ? 'done' : ''}">
          ${p.submitted ? '✓' : ''} ${p.name}
        </div>`).join('');
    } else {
      // All submitted — judge picks
      $('panel-judge-pick').style.display = 'block';
      $('judge-answers-list').innerHTML = state.shuffledSubmissions.map(({ pid, ans }) => `
        <div class="judge-answer-card" data-pid="${pid}" onclick="judgePickWinner('${pid}', '${ans.replace(/'/g, "\\'")}')">
          ${ans}
        </div>`).join('');
    }
  } else {
    // Non-judge player
    if (!state.mySubmission) {
      $('phase-text').textContent = 'Pick your answer';
      $('panel-submit').style.display = 'block';
      renderHand(state.myHand);
    } else {
      $('phase-text').textContent = 'Waiting for judge...';
      $('panel-waiting-submit').style.display = 'block';
      $('submit-chips').innerHTML = nonJudge.map(p => `
        <div class="player-chip ${p.submitted ? 'done' : ''}">
          ${p.submitted ? '✓' : ''} ${p.name}
        </div>`).join('');
      $('waiting-msg').textContent = state.allSubmitted
        ? `All answered! Waiting for ${state.judge.name} to pick the winner...`
        : `Waiting... (${nonJudge.filter(p => p.submitted).length}/${nonJudge.length} submitted)`;
    }
  }
}

// ── Hand ──
function renderHand(hand) {
  $('hand-cards').innerHTML = hand.map(card => `
    <div class="answer-card ${selectedCard === card ? 'selected' : ''}"
         onclick="selectCard(this, '${card.replace(/'/g, "\\'")}')">
      ${card}
    </div>`).join('');
  $('btn-submit').disabled = !selectedCard;
}

function selectCard(el, card) {
  selectedCard = card;
  document.querySelectorAll('.answer-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  $('btn-submit').disabled = false;
}

// ── Result ──
function renderResult(state) {
  ['panel-submit', 'panel-waiting-submit', 'panel-judge-waiting', 'panel-judge-pick']
    .forEach(id => $(id).style.display = 'none');
  $('panel-result').style.display = 'block';

  const isWinner = state.roundWinner === myPlayerId;
  $('result-msg').textContent = isWinner
    ? `🎉 ${state.judge.name} ekhtar jawabak: "${state.roundWinnerAnswer}"`
    : `🏆 ${state.judge.name} ekhtaret jawab ${state.roundWinnerName}: "${state.roundWinnerAnswer}"`;

  $('result-answers-list').innerHTML = (state.revealedAnswers || []).map(a => `
    <div class="result-answer-item ${a.isWinner ? 'winner' : ''}">
      ${a.isWinner ? '🏆 ' : ''}<strong>${a.name}:</strong> ${a.ans}
    </div>`).join('');

  const me = state.players.find(p => p.isYou);
  $('next-round-area').innerHTML = me?.host
    ? `<button class="btn btn-gold" onclick="nextRound()">Next Round →</button>`
    : `<div class="alert alert-info">Waiting for host to start next round...</div>`;
}

// ── Winner ──
function renderWinner(state) {
  const isMe = state.gameWinner === myPlayerId;
  $('winner-name').textContent = state.gameWinnerName || '???';
  $('winner-msg').textContent = isMe ? 'Enta rebe7et el da22! 🎊' : 'rebe7 el da22! Mabrouuuk!';

  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  $('final-scores').innerHTML = sorted.map((p, i) => `
    <div class="score-row">
      <div style="font-size:18px;">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
      <div class="player-avatar av-${p.color}">${p.name[0].toUpperCase()}</div>
      <div class="score-name">${p.name}</div>
      <div class="score-pts">${p.score}</div>
    </div>`).join('');
}
