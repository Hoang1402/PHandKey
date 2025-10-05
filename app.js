// Storage keys
const ITEMS_KEY = 'cp.items';
const SETTINGS_KEY = 'cp.settings';

const Deck = { place:'place', position:'position', outfit:'outfit', challenge:'challenge' };
const Intensity = { gentle:'Dịu', medium:'Vừa', hot:'Bốc 🔥' };

// Default data
const seedItems = [
  // Places
  {deck:Deck.place, text:'Phòng ngủ với đèn vàng nhẹ', intensity:Intensity.gentle},
  {deck:Deck.place, text:'Phòng tắm (nước ấm, thảm chống trượt)', intensity:Intensity.medium},
  {deck:Deck.place, text:'Sofa phòng khách (rèm kéo kín)', intensity:Intensity.medium},
  {deck:Deck.place, text:'Trước gương toàn thân', intensity:Intensity.hot},
  // Positions
  {deck:Deck.position, text:'Đối mặt ngồi ôm nhau', intensity:Intensity.gentle},
  {deck:Deck.position, text:'Nằm nghiêng thì thầm', intensity:Intensity.gentle},
  {deck:Deck.position, text:'Một người đứng, một người tựa bàn', intensity:Intensity.medium},
  {deck:Deck.position, text:'Tựa tường, chậm mà sâu', intensity:Intensity.hot},
  // Outfits
  {deck:Deck.outfit, text:'Áo sơ mi rộng (không nội y)', intensity:Intensity.gentle},
  {deck:Deck.outfit, text:'Đầm ngủ satin', intensity:Intensity.gentle},
  {deck:Deck.outfit, text:'Áo thun trắng + quần short', intensity:Intensity.medium},
  {deck:Deck.outfit, text:'Áo choàng tắm, trần bên trong', intensity:Intensity.hot},
  // Challenges
  {deck:Deck.challenge, text:'Massage 5 phút (không “vào việc” vội)', intensity:Intensity.gentle, durationSeconds:300},
  {deck:Deck.challenge, text:'Hôn 2 phút, dùng tay dẫn dắt', intensity:Intensity.gentle, durationSeconds:120},
  {deck:Deck.challenge, text:'Bịt mắt 3 phút, người kia dẫn đường', intensity:Intensity.medium, durationSeconds:180},
  {deck:Deck.challenge, text:'Nói cho nhau 3 điều muốn làm tối nay', intensity:Intensity.hot}
];

const el = {
  cards: document.getElementById('cards'),
  randomAll: document.getElementById('randomAll'),
  deckToggles: Array.from(document.querySelectorAll('.deckToggle')),
  intensityToggles: Array.from(document.querySelectorAll('.intensityToggle')),
  safeWord: document.getElementById('safeWord'),
  editBtn: document.getElementById('editBtn'),
  resetBtn: document.getElementById('resetBtn'),
  editDialog: document.getElementById('editDialog'),
  newDeck: document.getElementById('newDeck'),
  newIntensity: document.getElementById('newIntensity'),
  newText: document.getElementById('newText'),
  newDuration: document.getElementById('newDuration'),
  durationWrap: document.getElementById('durationWrap'),
  addItem: document.getElementById('addItem'),
  listContainer: document.getElementById('listContainer'),
  installBtn: document.getElementById('installBtn'),
  spinBtn: document.getElementById('spinBtn'),
  spinDialog: document.getElementById('spinDialog'),
  wheelDeck: document.getElementById('wheelDeck'),
  spinStart: document.getElementById('spinStart'),
  spinCancel: document.getElementById('spinCancel'),
  spinResult: document.getElementById('spinResult'),
  editDialog: document.getElementById('editDialog'),
  editDialogClose: document.getElementById('editDialogClose'),

};

let state = {
  items: [],
  settings: {
    enabledDecks: new Set([Deck.place, Deck.position, Deck.outfit, Deck.challenge]),
    allowedIntensity: new Set([Intensity.gentle, Intensity.medium, Intensity.hot]),
    safeWord: 'Đổi món!'
  },
  timers: {} // key: index in render order
};

// ----- Persistence helpers
function load() {
  try {
    const rawItems = localStorage.getItem(ITEMS_KEY);
    const rawSettings = localStorage.getItem(SETTINGS_KEY);
    state.items = rawItems ? JSON.parse(rawItems) : seedItems.slice();
    const s = rawSettings ? JSON.parse(rawSettings) : null;
    if (s) {
      state.settings.enabledDecks = new Set(s.enabledDecks);
      state.settings.allowedIntensity = new Set(s.allowedIntensity);
      state.settings.safeWord = s.safeWord || 'Đổi món!';
    }
  } catch (e) {
    console.error(e);
    state.items = seedItems.slice();
  }
}

function save() {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(state.items));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    enabledDecks: [...state.settings.enabledDecks],
    allowedIntensity: [...state.settings.allowedIntensity],
    safeWord: state.settings.safeWord
  }));
}

// ----- Utilities

function spinCard(cardEl){
  cardEl.classList.remove('spin');
  // trigger reflow to restart animation
  void cardEl.offsetWidth;
  cardEl.classList.add('spin');
}

function rand(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

function randomByDeck(deck) {
  const pool = state.items.filter(it => it.deck === deck && state.settings.allowedIntensity.has(it.intensity));
  return pool.length ? rand(pool) : null;
}

function renderCards(picks) {
  el.cards.innerHTML = '';
  const order = [Deck.place, Deck.position, Deck.outfit, Deck.challenge];
  order.forEach(deck => {
    if (!state.settings.enabledDecks.has(deck)) return;
    const item = picks[deck] || randomByDeck(deck);
    const card = document.createElement('div');
    card.className = 'card';
    const title = {place:'Nơi', position:'Động tác', outfit:'Trang phục', challenge:'Thử thách'}[deck];
    const header = document.createElement('div');
    header.className = 'row';
    header.innerHTML = `<h3>${title}</h3>
      <div class="row">
        <span class="badge">${item?.intensity ?? ''}</span>
        <button data-deck="${deck}" class="swapBtn">Đổi</button>
      </div>`;
    const text = document.createElement('p');
    text.textContent = item ? item.text : '— — —';
    card.appendChild(header);
    card.appendChild(text);

    if (deck === Deck.challenge && item?.durationSeconds) {
      const timer = document.createElement('div');
      timer.className = 'timer';
      timer.dataset.seconds = String(item.durationSeconds);
      timer.textContent = formatTime(item.durationSeconds);
      card.appendChild(timer);
      startTimer(timer, item.durationSeconds);
    }

    el.cards.appendChild(card);
  });

  /* auto spin cards once */
  el.cards.querySelectorAll('.card').forEach(c=>{ spinCard(c); });
  // hook up swap buttons
  el.cards.querySelectorAll('.swapBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const deck = btn.getAttribute('data-deck');
      const replacement = randomByDeck(deck);
      if (!replacement) return;
      // find closest card to spin
      const card = btn.closest('.card');
      if (card) spinCard(card);
      const p = {}; p[deck] = replacement;
      setTimeout(()=>renderCards(p), 180);
    });
  });
}

function formatTime(sec) {
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = (sec%60).toString().padStart(2,'0');
  return `⏱ ${m}:${s}`;
}

function startTimer(elTimer, seconds) {
  let remain = seconds;
  const t = setInterval(() => {
    remain = Math.max(remain-1, 0);
    elTimer.textContent = formatTime(remain);
    if (remain === 0) clearInterval(t);
  }, 1000);
}

// ----- Edit dialog
function refreshList() {
  const wrap = document.createElement('div');
  state.items.forEach((it, idx) => {
    const row = document.createElement('div'); row.className = 'itemRow';
    const deck = {place:'Nơi', position:'Động tác', outfit:'Trang phục', challenge:'Thử thách'}[it.deck];
    row.innerHTML = `
      <span class="badge">${deck}</span>
      <span class="badge">${it.intensity}</span>
      <span>${it.text}</span>
      <button data-idx="${idx}" class="delBtn">Xoá</button>
    `;
    wrap.appendChild(row);
  });
  el.listContainer.innerHTML = '';
  el.listContainer.appendChild(wrap);
  el.listContainer.querySelectorAll('.delBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-idx'));
      state.items.splice(i,1);
      save();
      refreshList();
    });
  });
}

// ----- Install prompt
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  el.installBtn.hidden = false;
});
el.installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  el.installBtn.hidden = true;
});

// ----- Events
function initEvents() {
  el.randomAll.addEventListener('click', () => { el.randomAll.classList.add('spinning'); setTimeout(()=>{ renderCards({}); el.randomAll.classList.remove('spinning'); }, 350); });
    // Đóng dialog khi bấm ✕
  el.editDialogClose.addEventListener('click', () => {
    el.editDialog.close();
  });

  // Bấm vào nền tối (backdrop) cũng đóng
  el.editDialog.addEventListener('click', (ev) => {
    const form = document.getElementById('editForm');
    const rect = form.getBoundingClientRect();
    const outside = ev.clientX < rect.left || ev.clientX > rect.right || ev.clientY < rect.top || ev.clientY > rect.bottom;
    if (outside) el.editDialog.close();
  });

  // Esc để đóng (đảm bảo hoạt động trên mọi trình duyệt)
  el.editDialog.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') el.editDialog.close();
  });

  el.deckToggles.forEach(tg => {
    tg.addEventListener('change', () => {
      const deck = tg.dataset.deck;
      if (tg.checked) state.settings.enabledDecks.add(deck);
      else state.settings.enabledDecks.delete(deck);
      save(); renderCards({});
    });
  });

  el.intensityToggles.forEach(tg => {
    tg.addEventListener('change', () => {
      if (tg.checked) state.settings.allowedIntensity.add(tg.value);
      else state.settings.allowedIntensity.delete(tg.value);
      save(); renderCards({});
    });
  });

  el.safeWord.addEventListener('input', () => {
    state.settings.safeWord = el.safeWord.value;
    save();
  });

  // Spin dialog events
  el.spinBtn.addEventListener('click', () => { el.spinResult.hidden = true; el.spinDialog.showModal(); setTimeout(wheelInit, 50); });
  el.spinCancel.addEventListener('click', () => { el.spinDialog.close(); });
  el.wheelDeck.addEventListener('change', () => { el.spinResult.hidden = true; refreshWheelData(); drawWheel(); });
  el.spinStart.addEventListener('click', (ev) => { ev.preventDefault(); spinWheel(); });

  el.editBtn.addEventListener('click', () => {
    refreshList();
    el.editDialog.showModal();
  });

  el.resetBtn.addEventListener('click', () => {
    if (confirm('Khôi phục dữ liệu mặc định?')) {
      state.items = seedItems.slice();
      save();
      renderCards({});
    }
  });

  el.newDeck.addEventListener('change', () => {
    el.durationWrap.style.display = el.newDeck.value === Deck.challenge ? 'block' : 'none';
  });

  el.addItem.addEventListener('click', (ev) => {
    ev.preventDefault();
    const item = {
      deck: el.newDeck.value,
      intensity: el.newIntensity.value,
      text: el.newText.value.trim(),
    };
    if (!item.text) return;
    if (item.deck === Deck.challenge) {
      const d = Number(el.newDuration.value);
      if (Number.isFinite(d) && d>0) item.durationSeconds = Math.round(d);
    }
    state.items.push(item);
    save();
    el.newText.value=''; el.newDuration.value='';
    refreshList();
  });
}

// ----- Boot
load();
document.addEventListener('DOMContentLoaded', () => {
  // Restore UI from settings
  el.deckToggles.forEach(tg => tg.checked = state.settings.enabledDecks.has(tg.dataset.deck));
  el.intensityToggles.forEach(tg => tg.checked = state.settings.allowedIntensity.has(tg.value));
  el.safeWord.value = state.settings.safeWord;
  initEvents();
  renderCards({});
});


// ===== Spin Wheel =====

// ---- tick sound (Web Audio)
let audioCtx = null;
function ensureAudio(){
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
}
function playTick(){
  try {
    ensureAudio();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.value = 900;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    o.start(now);
    // fast envelope for "tạch"
    g.gain.exponentialRampToValueAtTime(0.08, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    o.stop(now + 0.09);
  } catch (e) {}
}

const wheel = {
  canvas: null, ctx: null,
  items: [], // strings
  colors: [],
  angle: 0,
  spinning: false,
  targetIndex: -1,
  deck: Deck.place,
};

function wheelInit(){
  wheel.canvas = document.getElementById('wheelCanvas');
  if (!wheel.canvas) return;
  wheel.ctx = wheel.canvas.getContext('2d');
  wheel.deck = el.wheelDeck.value;
  refreshWheelData();
  drawWheel();
}

function refreshWheelData(){
  const deck = el.wheelDeck.value;
  wheel.deck = deck;
  const pool = state.items.filter(it => it.deck === deck && state.settings.allowedIntensity.has(it.intensity));
  wheel.items = pool.length ? pool.map(it => it.text) : ['(Không có mục phù hợp)'];
  wheel.colors = wheel.items.map((_,i)=> i%2 ? '#ff5bb3' : '#c77dff');
  if (wheel.angle==null) wheel.angle = 0;
}

function drawWheel(){
  const {canvas, ctx, items, angle} = wheel;
  const w = canvas.width, h = canvas.height;
  const cx = w/2, cy = h/2, r = Math.min(cx, cy) - 8;
  ctx.clearRect(0,0,w,h);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const n = items.length;
  const arc = (2*Math.PI)/n;

  for (let i=0;i<n;i++){
    // sector path
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,r,i*arc,(i+1)*arc);
    ctx.closePath();
    // fill
    ctx.fillStyle = wheel.colors[i % wheel.colors.length];
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    // border
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ---- text WITHOUT clipping: draw tangentially at a radius (so it won't be hidden)
    ctx.save();
    // rotate to sector center
    ctx.rotate(i*arc + arc/2);
    // choose a radius away from edges to avoid being cut off
    const textRadius = Math.max(60, r * 0.62);
    ctx.translate(textRadius, 0);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // width allowed by chord at this radius (minus padding)
    const chord = 2 * textRadius * Math.sin(arc/2);
    const maxWidth = Math.max(80, chord - 24);

    // auto font sizing & wrapping (max 4 lines)
    let fontSize = 18;
    const minFont = 12;
    let lines = [];
    do {
      ctx.font = fontSize + 'px system-ui, -apple-system, sans-serif';
      lines = measureWrap(ctx, items[i], maxWidth);
      if (lines.length <= 4) break;
      fontSize -= 1;
    } while (fontSize >= minFont);

    const lineHeight = Math.round(fontSize * 1.15);
    const maxLines = Math.min(lines.length, 4);
    const totalH = (maxLines - 1) * lineHeight;
    for (let li = 0; li < maxLines; li++) {
      const y = (li * lineHeight) - (totalH / 2);
      ctx.fillText(lines[li], 0, y);
    }

    ctx.restore();
  }

  ctx.restore();
  // center hub
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, 2*Math.PI);
  ctx.fillStyle = '#1a1122';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  ctx.stroke();
}

function measureWrap(ctx, text, maxWidth){
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (let i=0;i<words.length;i++){
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && line){
      lines.push(line);
      line = words[i];
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function spinWheel(){
  if (wheel.spinning) return;
  refreshWheelData();
  if (!wheel.items.length) return;
  // target index & final angle (we want target at pointer top: angle where segment center at -PI/2)
  const n = wheel.items.length;
  wheel.targetIndex = Math.floor(Math.random()*n);
  const arc = (2*Math.PI)/n;
  const targetAngle = (3*Math.PI/2) - (wheel.targetIndex*arc + arc/2); // pointer at top

  const current = wheel.angle % (2*Math.PI);
  const laps = 4 + Math.random()*2;
  let delta = targetAngle - current;
  // normalize delta to [-PI, PI] range
  delta = (delta + Math.PI)%(2*Math.PI) - Math.PI;
  const finalAngle = wheel.angle + delta + laps*(2*Math.PI);

  const duration = 1800 + Math.random()*800;
  const start = performance.now();
  wheel.spinning = true;

  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  let lastIndex = -1;
  function tick(now){
    const p = Math.min(1, (now - start)/duration);
    const eased = easeOutCubic(p);
    wheel.angle = current + (finalAngle - current)*eased;
    drawWheel();
    // tick on boundary pass
    const n = wheel.items.length;
    const arc = (2*Math.PI)/n;
    // pointer at top (3PI/2), compute which segment centered there
    let pointerAngle = (3*Math.PI/2) - (wheel.angle % (2*Math.PI));
    pointerAngle = (pointerAngle % (2*Math.PI) + 2*Math.PI) % (2*Math.PI);
    const idx = Math.floor(pointerAngle / arc);
    if (idx !== lastIndex){
      playTick();
      lastIndex = idx;
    }
    if (p < 1) requestAnimationFrame(tick);
    else {
      wheel.spinning = false;
      const text = wheel.items[wheel.targetIndex];
      showSpinResult(text);
      // apply to card
      applySpinToDeck(wheel.deck, text);
    }
  }
  requestAnimationFrame(tick);
}

function showSpinResult(text){
  el.spinResult.hidden = false;
  el.spinResult.textContent = 'Kết quả: ' + text;
}

function applySpinToDeck(deck, text){
  // create a temporary item and render only that deck with this pick
  const p = {}; p[deck] = {text, intensity: 'Vừa'};
  // Animated re-render is okay
  setTimeout(()=> renderCards(p), 200);
}


// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js');
  });
}
