// public/js/client.js
const socket = io();

let myPlayerId = null;
let myRoomCode = null;
let selectedCards = [];   // array for multi-answer support
let lastRound = null;

const $ = id => document.getElementById(id);
const showScreen = id => {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('screen-' + id)?.classList.add('active');
};
const showError = (elId, msg) => { const el=$(elId); if(el) el.innerHTML=`<div class="alert alert-error">${msg}</div>`; };
const clearError = elId => { const el=$(elId); if(el) el.innerHTML=''; };

// ── Lobby ──
$('btn-create').addEventListener('click', () => {
  const name = $('inp-name-create').value.trim();
  const winningPoints = $('inp-winning-points').value;
  if (!name) return showError('lobby-error', 'Shou esmak? Enter your name!');
  clearError('lobby-error');
  socket.emit('room:create', { name, winningPoints });
});

$('btn-join').addEventListener('click', () => {
  const name = $('inp-name-join').value.trim();
  const code = $('inp-code').value.trim().toUpperCase();
  if (!name) return showError('lobby-error', 'Shou esmak? Enter your name!');
  if (code.length < 4) return showError('lobby-error', 'Enter the room code!');
  clearError('lobby-error');
  socket.emit('room:join', { name, code });
});

$('inp-code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });

['inp-name-create','inp-name-join','inp-code'].forEach(id => {
  $(id)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { if(id==='inp-name-create') $('btn-create').click(); else $('btn-join').click(); }
  });
});

// ── Socket events ──
socket.on('room:joined', ({ code, playerId }) => {
  myPlayerId = playerId;
  myRoomCode = code;
  $('display-code').textContent = code;
  showScreen('waiting');
});

socket.on('room:update', state => renderState(state));
socket.on('error', msg => showError('lobby-error', msg));

// ── Game actions ──
function startGame() { socket.emit('game:start'); }
function nextRound() { socket.emit('game:next_round'); }
function resetToLobby() {
  myPlayerId=null; myRoomCode=null; selectedCards=[]; lastRound=null;
  $('inp-name-create').value=''; $('inp-name-join').value=''; $('inp-code').value='';
  showScreen('lobby');
}

function submitAnswer() {
  if (selectedCards.length === 0) return;
  socket.emit('game:submit', { answers: selectedCards });
  selectedCards = [];
}

function judgePickWinner(winnerId) {
  document.querySelectorAll('.judge-answer-card').forEach(el => {
    el.classList.toggle('chosen', el.dataset.pid === winnerId);
    el.classList.toggle('unchosen', el.dataset.pid !== winnerId);
  });
  socket.emit('game:judge_pick', { winnerId });
}

function switchCards() {
  const count = parseInt($('switch-count')?.value) || 1;
  socket.emit('game:switch_cards', { count });
}

// ── Main render ──
function renderState(state) {
  if (!state) return;
  if (state.phase === 'waiting') { showScreen('waiting'); renderWaiting(state); }
  else if (state.phase === 'playing') { showScreen('game'); renderGame(state); }
  else if (state.phase === 'result') { showScreen('game'); renderResult(state); }
  else if (state.phase === 'gameover') { showScreen('winner'); renderWinner(state); }
}

// ── Waiting room ──
function renderWaiting(state) {
  $('player-count').textContent = state.players.length;
  $('winning-points-display').textContent = state.winningPoints;
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
      : `<div class="alert alert-info">Waiting for at least 2 players...</div>`;
  } else {
    area.innerHTML = `<div class="alert alert-info">Waiting for host to start...</div>`;
  }
}

// ── Game screen ──
function renderGame(state) {
  if (lastRound !== state.round) {
    lastRound = state.round;
    selectedCards = [];
  }

  $('round-badge').textContent = `Round ${state.round}`;
  $('judge-badge').textContent = `Judge: ${state.judge.name}`;
  $('current-question').textContent = state.currentQuestion;

  // Answer count indicator
  const acEl = $('answer-count-badge');
  if (acEl) {
    acEl.textContent = state.answerCount === 2 ? '2 answers needed' : '1 answer needed';
    acEl.style.display = state.answerCount === 2 ? 'inline-block' : 'none';
  }

  // Score chips
  $('score-chips').innerHTML = state.players.map(p => `
    <div class="score-mini" title="${p.name}">
      <div class="score-mini-name">${p.name.split(' ')[0]}</div>
      <div class="score-mini-pts">${p.score}</div>
    </div>`).join('');

  const nonJudge = state.players.filter(p => p.id !== state.judge.id);
  ['panel-submit','panel-waiting-submit','panel-judge-waiting','panel-judge-pick','panel-result'].forEach(id => $(id).style.display='none');

  if (state.isJudge) {
    $('phase-text').textContent = 'You are the judge!';
    if (!state.allSubmitted) {
      $('panel-judge-waiting').style.display = 'block';
      $('judge-wait-msg').textContent = `Waiting for answers... (${nonJudge.filter(p=>p.submitted).length}/${nonJudge.length})`;
      $('judge-submit-chips').innerHTML = nonJudge.map(p => `
        <div class="player-chip ${p.submitted?'done':''}">
          ${p.submitted?'✓':''} ${p.name}
        </div>`).join('');
    } else {
      $('panel-judge-pick').style.display = 'block';
      $('judge-answers-list').innerHTML = state.shuffledSubmissions.map(({ pid, answers }) => `
        <div class="judge-answer-card" data-pid="${pid}"
             onclick="judgePickWinner('${pid}')">
          ${Array.isArray(answers) ? answers.map((a,i) => `<span class="answer-part">${state.answerCount>1?`<em>${i===0?'1st':'2nd'}:</em> `:''}${a}</span>`).join('') : answers}
        </div>`).join('');
    }
  } else {
    const alreadySubmitted = state.mySubmission && state.mySubmission.length >= state.answerCount;
    if (!alreadySubmitted) {
      $('phase-text').textContent = `Pick ${state.answerCount === 2 ? '2 answers in order' : 'your answer'}`;
      $('panel-submit').style.display = 'block';
      renderHand(state.myHand, state.answerCount);
    } else {
      $('phase-text').textContent = 'Waiting for judge...';
      $('panel-waiting-submit').style.display = 'block';
      $('submit-chips').innerHTML = nonJudge.map(p => `
        <div class="player-chip ${p.submitted?'done':''}">
          ${p.submitted?'✓':''} ${p.name}
        </div>`).join('');
      $('waiting-msg').textContent = state.allSubmitted
        ? `All answered! Waiting for ${state.judge.name} to pick...`
        : `Waiting... (${nonJudge.filter(p=>p.submitted).length}/${nonJudge.length})`;
    }
  }
}

// ── Hand ──
function renderHand(hand, answerCount) {
  const needed = answerCount || 1;
  $('hand-cards').innerHTML = hand.map(card => {
    const idx = selectedCards.indexOf(card);
    const isSelected = idx !== -1;
    return `
      <div class="answer-card ${isSelected ? 'selected' : ''}"
           onclick="selectCard('${card.replace(/'/g,"\\'")}')"
           data-card="${card.replace(/"/g,'&quot;')}">
        ${isSelected ? `<span class="card-order">${idx+1}</span>` : ''}
        ${card}
      </div>`;
  }).join('');

  const submitBtn = $('btn-submit');
  submitBtn.disabled = selectedCards.length < needed;
  submitBtn.textContent = needed === 2
    ? `Submit (${selectedCards.length}/2 selected)`
    : 'Submit Answer';
}

function selectCard(card) {
  const state_answerCount = parseInt($('answer-count-badge')?.dataset.count || '1');
  const needed = state_answerCount;
  const idx = selectedCards.indexOf(card);
  if (idx !== -1) {
    selectedCards.splice(idx, 1);
  } else {
    if (selectedCards.length >= needed) {
      selectedCards.shift(); // remove first if already have enough
    }
    selectedCards.push(card);
  }
  // Re-render hand from current state — use last known hand
  const hand = [...document.querySelectorAll('.answer-card')].map(el => el.dataset.card);
  renderHand(hand, needed);
}

// ── Result ──
function renderResult(state) {
  ['panel-submit','panel-waiting-submit','panel-judge-waiting','panel-judge-pick'].forEach(id => $(id).style.display='none');
  $('panel-result').style.display = 'block';

  const isWinner = state.roundWinner === myPlayerId;
  const winnerAnswers = Array.isArray(state.roundWinnerAnswer) ? state.roundWinnerAnswer.join(' + ') : state.roundWinnerAnswer;
  $('result-msg').textContent = isWinner
    ? `🎉 ${state.judge.name} ekhtar jawabak: "${winnerAnswers}"`
    : `🏆 ${state.judge.name} ekhtaret jawab ${state.roundWinnerName}: "${winnerAnswers}"`;

  $('result-answers-list').innerHTML = (state.revealedAnswers || []).map(a => `
    <div class="result-answer-item ${a.isWinner?'winner':''}">
      ${a.isWinner?'🏆 ':''}<strong>${a.name}:</strong>
      ${Array.isArray(a.answers) ? a.answers.join(' + ') : a.answers}
    </div>`).join('');

  // Switch cards panel
  const me = state.players.find(p => p.isYou);
  const switchHtml = me && me.score >= 1 ? `
    <div class="card-box mt8">
      <h2>Switch Cards (costs 1 point)</h2>
      <div style="display:flex;gap:8px;align-items:center;">
        <span style="font-size:13px;color:var(--text2);">Switch</span>
        <select id="switch-count" style="background:var(--surface2);color:var(--text);border:0.5px solid var(--border2);border-radius:8px;padding:6px 10px;font-size:13px;">
          ${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}">${n} card${n>1?'s':''}</option>`).join('')}
        </select>
        <button class="btn btn-outline" style="width:auto;padding:8px 16px;" onclick="switchCards()">Switch</button>
      </div>
      <p style="font-size:11px;color:var(--text2);margin-top:6px;">Your score: ${me.score} pts</p>
    </div>` : '';

  const nextArea = $('next-round-area');
  nextArea.innerHTML = switchHtml + (me?.host
    ? `<button class="btn btn-gold mt8" onclick="nextRound()">Next Round →</button>`
    : `<div class="alert alert-info mt8">Waiting for host to start next round...</div>`);
}

// ── Winner ──
function renderWinner(state) {
  const isMe = state.gameWinner === myPlayerId;
  $('winner-name').textContent = state.gameWinnerName || '???';
  $('winner-msg').textContent = isMe ? 'Enta rebe7et el da22! 🎊' : 'rebe7 el da22! Mabrouuuk!';
  const sorted = [...state.players].sort((a,b) => b.score-a.score);
  $('final-scores').innerHTML = sorted.map((p,i) => `
    <div class="score-row">
      <div style="font-size:18px;">${i===0?'🥇':i===1?'🥈':'🥉'}</div>
      <div class="player-avatar av-${p.color}">${p.name[0].toUpperCase()}</div>
      <div class="score-name">${p.name}</div>
      <div class="score-pts">${p.score}</div>
    </div>`).join('');
}
