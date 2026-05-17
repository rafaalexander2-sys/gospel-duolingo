// Web Audio API — sem arquivos externos, tudo gerado em runtime

let _ctx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (_ctx.state === "suspended") _ctx.resume();
    return _ctx;
  } catch { return null; }
}

function tone(
  freq: number, dur: number, vol = 0.25,
  type: OscillatorType = "sine", delay = 0
) {
  const c = ctx();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.value = freq;
    const t = c.currentTime + delay;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch {}
}

// ── Efeitos sonoros ────────────────────────────────────────────────

export function sfxAcerto() {
  tone(523.25, 0.12, 0.22);
  tone(659.25, 0.12, 0.22, "sine", 0.10);
  tone(783.99, 0.22, 0.22, "sine", 0.20);
}

export function sfxErro() {
  tone(311.13, 0.14, 0.20, "sawtooth");
  tone(233.08, 0.24, 0.20, "sawtooth", 0.13);
}

export function sfxCapituloCompleto() {
  [523.25, 587.33, 659.25, 783.99, 1046.50].forEach((f, i) =>
    tone(f, 0.32, 0.28, "sine", i * 0.13)
  );
}

export function sfxUnlock() {
  [880, 1108.73, 1318.51].forEach((f, i) =>
    tone(f, 0.26, 0.24, "triangle", i * 0.10)
  );
}

export function sfxClick() {
  tone(1047, 0.04, 0.07, "sine");
}

export function sfxRevisao() {
  tone(440, 0.10, 0.18, "triangle");
  tone(523.25, 0.15, 0.18, "triangle", 0.12);
}

export function sfxVidaPerdida() {
  tone(180, 0.30, 0.22, "sawtooth");
}

// ── BGM — melodia pentatônica ambiente ────────────────────────────

const NOTAS  = [392.00, 440.00, 523.25, 587.33, 659.25, 587.33, 523.25, 440.00];
const DURACOES = [0.70,  0.45,   0.70,   0.45,   0.90,   0.45,   0.70,   0.70];
const LOOP_MS  = DURACOES.reduce((a, b) => a + b, 0) * 1000;

let bgmAtivo = false;
let bgmTimer: ReturnType<typeof setTimeout> | null = null;

function tocarLoop() {
  if (!bgmAtivo) return;
  const c = ctx();
  if (!c) return;

  const master = c.createGain();
  master.gain.value = 0.05;
  master.connect(c.destination);

  let t = c.currentTime;
  NOTAS.forEach((freq, i) => {
    const dur = DURACOES[i];

    // Melodia (triângulo - som suave medieval)
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.connect(g); g.connect(master);
    osc.type = "triangle";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.8, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.80);
    osc.start(t); osc.stop(t + dur);

    // Baixo (oitava abaixo, seno - âncora)
    const bass = c.createOscillator();
    const bg = c.createGain();
    bass.connect(bg); bg.connect(master);
    bass.type = "sine";
    bass.frequency.value = freq / 2;
    bg.gain.setValueAtTime(0.001, t);
    bg.gain.linearRampToValueAtTime(0.5, t + 0.08);
    bg.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.75);
    bass.start(t); bass.stop(t + dur);

    t += dur;
  });

  bgmTimer = setTimeout(tocarLoop, LOOP_MS - 200);
}

export function startBgm() {
  if (bgmAtivo) return;
  bgmAtivo = true;
  tocarLoop();
}

export function stopBgm() {
  bgmAtivo = false;
  if (bgmTimer) { clearTimeout(bgmTimer); bgmTimer = null; }
}

export function isBgmAtivo() { return bgmAtivo; }

export function toggleBgm(): boolean {
  if (bgmAtivo) { stopBgm(); return false; }
  startBgm(); return true;
}
