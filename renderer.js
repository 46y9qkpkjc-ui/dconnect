'use strict';

const $ = (id) => document.getElementById(id);
let me = 'user';
let callStart = 0;
let timerInt = null;

const ROSTER = [
  { name: 'james.collins', role: 'CEO office' },
  { name: 'jonathan.lim', role: 'platform' },
];

function showView(name) {
  $('viewHome').style.display = name === 'home' ? 'flex' : 'none';
  $('viewJoin').classList.toggle('show', name === 'join');
  $('viewCall').classList.toggle('show', name === 'call');
}

function initials(name) {
  const parts = name.replace(/[^a-z0-9._-]/gi, ' ').split(/[.\s_-]+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]).join('') || '?').toUpperCase();
}

async function init() {
  const st = await window.dconnect.state();
  me = st.user || 'user';
  $('userName').textContent = me;
  const ini = initials(me);
  ['userInitials', 'joinMe', 'tileMe'].forEach((id) => { $(id).textContent = ini; });
  $('joinMeName').textContent = `${me} (you)`;
  $('tileMeName').textContent = me;

  const meEntry = ROSTER.find((p) => p.name === me);
  const other = ROSTER.find((p) => p.name !== me) || ROSTER[0];
  const otherIni = initials(other.name);
  $('joinOther').textContent = otherIni;
  $('joinOtherName').textContent = other.name;
  $('tileOther').textContent = otherIni;
  $('tileOtherName').textContent = other.name;
  $('tileOtherSub').textContent = other.role;
  $('tileMeSub').textContent = `you · ${meEntry ? meEntry.role : 'guest'}`;

  $('updBadge').classList.toggle('hidden', st.updated);
  $('homeState').textContent = st.updated
    ? `DConnect ${st.current} · up to date`
    : `DConnect ${st.current} · 2.4.0 available`;
  if (st.updated) postUpdate();

  const img = $('joinGif');
  const hideFallback = () => { $('gifFallback').style.display = 'none'; };
  img.addEventListener('error', () => { img.style.display = 'none'; });
  img.addEventListener('load', hideFallback);
  if (img.complete && img.naturalWidth > 0) hideFallback();
}

function startUpdate() {
  const log = $('updateLog');
  log.textContent = '';
  $('updBar').classList.remove('done');
  $('updateStatus').textContent = 'Preparing update…';
  $('updateOverlay').classList.add('show');
  window.dconnect.startUpdate();
}

window.dconnect.onLine((line) => {
  const log = $('updateLog');
  log.textContent += line + '\n';
  log.scrollTop = log.scrollHeight;
  $('updateStatus').textContent = 'Installing release…';
});

window.dconnect.onDone((version) => {
  $('updBar').classList.add('done');
  $('updateStatus').textContent = `Up to date — ${version} installed. Joining…`;
  setTimeout(() => {
    $('updateOverlay').classList.remove('show');
    $('updBadge').classList.add('hidden');
    $('homeState').textContent = `DConnect ${version} · up to date`;
    postUpdate();
    showView('join');
  }, 700);
});

window.dconnect.onFailed(() => {
  $('updateStatus').textContent = 'Update failed — check your connection and retry.';
});

function postUpdate() {
  $('waPane').classList.add('show');
  $('insightPane').classList.add('show');
  $('agentBadge').classList.remove('hidden');
  pollAgent();
}

async function pollAgent() {
  try {
    const a = await window.dconnect.agent();
    $('insightBody').textContent = a.running
      ? `agent pid ${a.pid}\nchannel: tcp-over-dns ready\ndashboard: dns1…:8443\nstatus: streaming`
      : 'agent: idle';
  } catch (e) { /* ignore */ }
  setTimeout(pollAgent, 4000);
}

function startTimer() {
  callStart = Date.now();
  timerInt = setInterval(() => {
    const s = Math.floor((Date.now() - callStart) / 1000);
    $('callTimer').textContent =
      String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }, 1000);
}

function bindToggle(id, onLabel, offLabel, icon) {
  const el = $(id);
  el.addEventListener('click', () => {
    const off = el.classList.toggle('off');
    el.innerHTML = `${icon} ${off ? offLabel : onLabel}`;
  });
}

$('btnJoinFlow').addEventListener('click', async () => {
  const st = await window.dconnect.state();
  if (st.updated) showView('join');
  else startUpdate();
});
$('btnJoinCall').addEventListener('click', () => {
  showView('call');
  startTimer();
  $('joinGifOverlay').classList.add('show');
});
$('btnLeave').addEventListener('click', () => {
  clearInterval(timerInt);
  showView('home');
});
bindToggle('micToggle', 'Microphone on', 'Microphone off', '&#127908;');
bindToggle('camToggle', 'Camera on', 'Camera off', '&#128247;');
bindToggle('callMic', 'Mute', 'Unmute', '&#127908;');
bindToggle('callCam', 'Stop video', 'Start video', '&#128247;');

init();
