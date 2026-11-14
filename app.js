const DHIKR_PRESETS = [
  { id: 'subhanallah', name: 'SubhanAllah', arabic: 'سُبْحَانَ اللَّهِ', meaning: 'Maha Suci Allah', defaultTarget: 33 },
  { id: 'alhamdulillah', name: 'Alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', meaning: 'Segala Puji Bagi Allah', defaultTarget: 33 },
  { id: 'allahuakbar', name: 'Allahu Akbar', arabic: 'اللَّهُ أَكْبَرُ', meaning: 'Allah Maha Besar', defaultTarget: 33 },
  { id: 'tahlil', name: 'La ilaha illallah', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', meaning: 'Tiada Tuhan Selain Allah', defaultTarget: 100 },
  { id: 'istighfar', name: 'Astaghfirullah', arabic: 'أَسْتَغْفِرُ اللَّهَ', meaning: 'Aku Memohon Ampun kepada Allah', defaultTarget: 100 },
  { id: 'shalawat', name: 'Shalawat Nabi', arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ', meaning: 'Ya Allah, Limpahkan Rahmat atas Nabi Muhammad', defaultTarget: 100 }
];

const STORAGE_KEY = 'tasbih_app_state_v1';
const RING_CIRCUMFERENCE = 2 * Math.PI * 114; // 716.28

let state = {
  count: 0,
  total: 0,
  target: 33,
  dhikrId: 'subhanallah',
  soundEnabled: true,
  theme: 'emerald'
};

// Audio Context for tactile click sound
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playClickSound(isTargetReached = false) {
  if (!state.soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  if (isTargetReached) {
    // Soft chime when target is reached
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } else {
    // Tactile wooden bead click
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.045);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

// DOM Elements
const tapZone = document.getElementById('tap-zone');
const countDisplay = document.getElementById('count-display');
const targetDisplay = document.getElementById('target-display');
const totalDisplay = document.getElementById('total-display');
const progressCircle = document.getElementById('progress-circle');
const beadsOrbit = document.getElementById('beads-orbit');

const currentDhikrName = document.getElementById('current-dhikr-name');
const dhikrArabic = document.getElementById('dhikr-arabic');
const dhikrMeaning = document.getElementById('dhikr-meaning');

const btnSound = document.getElementById('btn-sound');
const iconSoundOn = document.getElementById('icon-sound-on');
const iconSoundOff = document.getElementById('icon-sound-off');
const btnTheme = document.getElementById('btn-theme');

const btnUndo = document.getElementById('btn-undo');
const btnReset = document.getElementById('btn-reset');
const btnTarget = document.getElementById('btn-target');
const btnDhikrSelect = document.getElementById('btn-dhikr-select');

const modalDhikr = document.getElementById('modal-dhikr');
const closeDhikrModal = document.getElementById('close-dhikr-modal');
const dhikrListEl = document.getElementById('dhikr-list');

const modalTarget = document.getElementById('modal-target');
const closeTargetModal = document.getElementById('close-target-modal');

// Load & Save State
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      state = { ...state, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Could not load state', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save state', e);
  }
}

// Render 12 subtle beads around the ring
function createBeads() {
  beadsOrbit.innerHTML = '';
  const totalBeads = 12;
  const radius = 125;
  for (let i = 0; i < totalBeads; i++) {
    const angle = (i * (360 / totalBeads) - 90) * (Math.PI / 180);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const dot = document.createElement('div');
    dot.className = 'bead-dot';
    dot.style.transform = `translate(${x}px, ${y}px)`;
    beadsOrbit.appendChild(dot);
  }
}

function updateUI() {
  countDisplay.textContent = state.count;
  totalDisplay.textContent = state.total.toLocaleString('id-ID');
  targetDisplay.textContent = state.target === 0 ? '∞' : state.target;

  // Progress Ring
  if (state.target > 0) {
    const progress = Math.min(state.count / state.target, 1);
    const offset = RING_CIRCUMFERENCE * (1 - progress);
    progressCircle.style.strokeDashoffset = offset;
  } else {
    progressCircle.style.strokeDashoffset = RING_CIRCUMFERENCE;
  }

  // Active bead highlight
  const dots = beadsOrbit.querySelectorAll('.bead-dot');
  const activeIndex = state.count % dots.length;
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', state.count > 0 && idx === activeIndex);
  });

  // Dhikr info
  const dhikr = DHIKR_PRESETS.find(d => d.id === state.dhikrId) || DHIKR_PRESETS[0];
  currentDhikrName.textContent = dhikr.name;
  dhikrArabic.textContent = dhikr.arabic;
  dhikrMeaning.textContent = dhikr.meaning;

  // Sound icon
  iconSoundOn.classList.toggle('hidden', !state.soundEnabled);
  iconSoundOff.classList.toggle('hidden', state.soundEnabled);

  // Theme
  document.body.className = `theme-${state.theme}`;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', state.theme === 'emerald' ? '#07130f' : '#f7f4ed');
  }
}

function createRipple(x, y) {
  const rect = tapZone.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const size = 90;
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${(x || rect.left + rect.width / 2) - rect.left - size / 2}px`;
  ripple.style.top = `${(y || rect.top + rect.height / 2) - rect.top - size / 2}px`;
  tapZone.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

function handleTap(e) {
  let clientX = null;
  let clientY = null;
  if (e && e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else if (e && e.clientX) {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  state.count += 1;
  state.total += 1;

  const reachedTarget = state.target > 0 && state.count === state.target;
  playClickSound(reachedTarget);

  if (navigator.vibrate) {
    navigator.vibrate(reachedTarget ? [30, 50, 30] : 15);
  }

  tapZone.classList.add('tapped');
  setTimeout(() => tapZone.classList.remove('tapped'), 100);
  createRipple(clientX, clientY);

  saveState();
  updateUI();
}

// Event Listeners
tapZone.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  handleTap(e);
});

tapZone.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    handleTap();
  }
});

btnUndo.addEventListener('click', () => {
  if (state.count > 0) {
    state.count -= 1;
    if (state.total > 0) state.total -= 1;
    saveState();
    updateUI();
  }
});

btnReset.addEventListener('click', () => {
  if (state.count === 0) return;
  if (confirm('Reset hitungan dzikir saat ini ke 0?')) {
    state.count = 0;
    saveState();
    updateUI();
  }
});

btnSound.addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  saveState();
  updateUI();
});

btnTheme.addEventListener('click', () => {
  state.theme = state.theme === 'emerald' ? 'sand' : 'emerald';
  saveState();
  updateUI();
});

// Dhikr Modal
function renderDhikrList() {
  dhikrListEl.innerHTML = '';
  DHIKR_PRESETS.forEach(item => {
    const btn = document.createElement('button');
    btn.className = `dhikr-item ${item.id === state.dhikrId ? 'active' : ''}`;
    btn.innerHTML = `
      <div class="dhikr-item-info">
        <h3>${item.name}</h3>
        <p>${item.meaning}</p>
      </div>
      <div class="dhikr-item-arabic" dir="rtl">${item.arabic}</div>
    `;
    btn.addEventListener('click', () => {
      state.dhikrId = item.id;
      state.target = item.defaultTarget;
      state.count = 0;
      saveState();
      updateUI();
      modalDhikr.classList.add('hidden');
    });
    dhikrListEl.appendChild(btn);
  });
}

btnDhikrSelect.addEventListener('click', () => {
  renderDhikrList();
  modalDhikr.classList.remove('hidden');
});

closeDhikrModal.addEventListener('click', () => modalDhikr.classList.add('hidden'));
modalDhikr.addEventListener('click', (e) => {
  if (e.target === modalDhikr) modalDhikr.classList.add('hidden');
});

// Target Modal
btnTarget.addEventListener('click', () => modalTarget.classList.remove('hidden'));
closeTargetModal.addEventListener('click', () => modalTarget.classList.add('hidden'));
modalTarget.addEventListener('click', (e) => {
  if (e.target === modalTarget) modalTarget.classList.add('hidden');
});

document.querySelectorAll('.target-option').forEach(btn => {
  btn.addEventListener('click', () => {
    state.target = parseInt(btn.dataset.target, 10);
    saveState();
    updateUI();
    modalTarget.classList.add('hidden');
  });
});

// Register Service Worker for offline PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// Initialize
loadState();
createBeads();
updateUI();
