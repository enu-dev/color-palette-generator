/* ============================================================
   Color Palette Generator — script.js
   担当: 小山 優（FE2 / JSロジック）
   ============================================================ */

'use strict';

/* ============================================================
   § 1. カラー変換ユーティリティ
   ============================================================ */

/** HEX (6桁、#なし) → { r, g, b } */
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

/** { r, g, b } → HEX (6桁、#なし) */
function rgbToHex(r, g, b) {
  return [r, g, b]
    .map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
    .join('');
}

/** { r, g, b } → { h: 0-360, s: 0-100, l: 0-100 } */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/** h: 0-360, s: 0-100, l: 0-100 → { r, g, b } */
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

/** HEX → { h, s, l } */
function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

/** h, s, l → HEX */
function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

/** 色相を 0〜359 に正規化（負値・360超え対応） */
function wrapHue(h) {
  return ((h % 360) + 360) % 360;
}

/* ============================================================
   § 2. 配色理論ジェネレーター
   各関数は { h, s, l, label } の配列を返す
   ============================================================ */

const HARMONIES = {
  /** 補色: 色相環の反対側 */
  complementary(h, s, l) {
    return [
      { h, s, l, label: 'Base' },
      { h: wrapHue(h + 180), s, l, label: 'Complement' },
    ];
  },

  /** 類似色: ±30° / ±60° の隣接色 */
  analogous(h, s, l) {
    return [
      { h: wrapHue(h - 60), s, l, label: '−60°' },
      { h: wrapHue(h - 30), s, l, label: '−30°' },
      { h, s, l, label: 'Base' },
      { h: wrapHue(h + 30), s, l, label: '+30°' },
      { h: wrapHue(h + 60), s, l, label: '+60°' },
    ];
  },

  /** トライアド: 120° 間隔の3色 */
  triadic(h, s, l) {
    return [
      { h, s, l, label: 'Base' },
      { h: wrapHue(h + 120), s, l, label: 'Triad 2' },
      { h: wrapHue(h + 240), s, l, label: 'Triad 3' },
    ];
  },

  /** スプリットコンプリメンタリー: 補色の両隣 ±30° */
  split(h, s, l) {
    return [
      { h, s, l, label: 'Base' },
      { h: wrapHue(h + 150), s, l, label: 'Split 1' },
      { h: wrapHue(h + 210), s, l, label: 'Split 2' },
    ];
  },

  /** テトラード（スクエア）: 90° 間隔の4色 */
  tetradic(h, s, l) {
    return [
      { h, s, l, label: 'Base' },
      { h: wrapHue(h + 90),  s, l, label: 'Tetrad 2' },
      { h: wrapHue(h + 180), s, l, label: 'Tetrad 3' },
      { h: wrapHue(h + 270), s, l, label: 'Tetrad 4' },
    ];
  },

  /** モノクロマティック: 同色相・明度違い5段階 */
  monochromatic(h, s) {
    return [
      { h, s, l: 15, label: 'Darkest' },
      { h, s, l: 30, label: 'Dark' },
      { h, s, l: 50, label: 'Mid' },
      { h, s, l: 65, label: 'Light' },
      { h, s, l: 80, label: 'Lightest' },
    ];
  },
};

/** 配色タイプに応じた色配列を返す */
function getColors(h, s, l, harmony) {
  const fn = HARMONIES[harmony];
  return fn ? fn(h, s, l) : [];
}

/* ============================================================
   § 3. アクセシビリティ (WCAG コントラスト比)
   ============================================================ */

/** HEX → 相対輝度 (WCAG 2.1 準拠) */
function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = c => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** 2色のコントラスト比を返す (小数第2位まで) */
function contrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1), l2 = getLuminance(hex2);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

/** コントラスト比 → WCAG レベル */
function wcagLevel(ratio) {
  const r = parseFloat(ratio);
  if (r >= 7)   return { label: 'AAA',     cls: 'wcag-aaa' };
  if (r >= 4.5) return { label: 'AA',      cls: 'wcag-aa' };
  if (r >= 3)   return { label: 'AA(大)', cls: 'wcag-aa-large' };
  return           { label: 'NG',      cls: 'wcag-fail' };
}

/* ============================================================
   § 4. カラー値フォーマット
   ============================================================ */

const HARMONY_LABELS = {
  complementary: '補色',
  analogous:     '類似色',
  triadic:       'トライアド',
  split:         'スプリット',
  tetradic:      'テトラード',
  monochromatic: 'モノクロ',
};

/** hex（#なし） + 形式 → 表示用文字列 */
function formatColor(hex, fmt) {
  if (fmt === 'hex') return '#' + hex.toUpperCase();
  if (fmt === 'rgb') {
    const { r, g, b } = hexToRgb(hex);
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (fmt === 'hsl') {
    const { h, s, l } = hexToHsl(hex);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  return '#' + hex;
}

/* ============================================================
   § 5. アプリケーション状態
   ============================================================ */

const state = {
  hex: '00d4ff',
  hsl: { h: 195, s: 100, l: 50 },
  harmony: 'complementary',
  format: 'hex',
  favorites: JSON.parse(localStorage.getItem('cpg:fav') || '[]'),
  history:   JSON.parse(localStorage.getItem('cpg:his') || '[]'),
};

/* ============================================================
   § 6. クリップボード & トースト
   ============================================================ */

let toastTimer = null;

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

async function copyText(text, feedbackEl) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // navigator.clipboard 非対応ブラウザ向けフォールバック
    const ta = document.createElement('textarea');
    ta.value = text;
    Object.assign(ta.style, { position: 'fixed', top: '-9999px', left: '-9999px' });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }

  if (feedbackEl) {
    feedbackEl.classList.add('copied');
    setTimeout(() => feedbackEl.classList.remove('copied'), 1400);
  }

  const preview = text.length > 36 ? text.slice(0, 36) + '…' : text;
  showToast('コピーしました: ' + preview);
}

/* ============================================================
   § 7. UI 更新
   ============================================================ */

/** カラープレビュー（大きな四角）を更新 */
function updatePreview() {
  const el = document.getElementById('colorPreview');
  el.style.background = '#' + state.hex;
  el.style.boxShadow = `0 0 20px rgba(${Object.values(hexToRgb(state.hex)).join(',')},0.3)`;
}

/** HEX テキスト入力を更新 */
function updateHexInput() {
  document.getElementById('hexInput').value = state.hex.toUpperCase();
}

/** ネイティブカラーピッカーを更新 */
function updatePicker() {
  document.getElementById('colorPicker').value = '#' + state.hex;
}

/** HSL スライダーの値と背景グラデーションを更新 */
function updateSliders() {
  const { h, s, l } = state.hsl;

  const hEl = document.getElementById('hSlider');
  const sEl = document.getElementById('sSlider');
  const lEl = document.getElementById('lSlider');

  hEl.value = h; sEl.value = s; lEl.value = l;
  document.getElementById('hValue').textContent = h + '°';
  document.getElementById('sValue').textContent = s + '%';
  document.getElementById('lValue').textContent = l + '%';

  // スライダートラックのグラデーション（視覚的フィードバック）
  hEl.style.setProperty('--track-bg',
    'linear-gradient(to right,' +
    [0,30,60,90,120,150,180,210,240,270,300,330,360]
      .map(deg => `hsl(${deg},100%,50%)`)
      .join(',') + ')');

  sEl.style.setProperty('--track-bg',
    `linear-gradient(to right, hsl(${h},0%,${l}%), hsl(${h},100%,${l}%))`);

  lEl.style.setProperty('--track-bg',
    `linear-gradient(to right, hsl(${h},${s}%,0%), hsl(${h},${s}%,50%), hsl(${h},${s}%,100%))`);
}

/** カラーチップを描画（animate=true で フェード切り替え） */
function renderChips(animate) {
  const container = document.getElementById('paletteChips');
  const { h, s, l } = state.hsl;
  const colors = getColors(h, s, l, state.harmony);

  const build = () => {
    container.innerHTML = '';
    colors.forEach((color, i) => {
      const hex = hslToHex(color.h, color.s, color.l);
      const chip = document.createElement('div');
      chip.className = 'color-chip';
      chip.style.animationDelay = `${i * 0.045}s`;

      chip.innerHTML =
        `<div class="chip-color-area" style="background:#${hex}"></div>` +
        `<div class="chip-info">` +
          `<span class="chip-label">${color.label}</span>` +
          `<span class="chip-value">${formatColor(hex, state.format)}</span>` +
        `</div>`;

      chip.addEventListener('click', () => {
        copyText(formatColor(hex, state.format), chip);
      });

      container.appendChild(chip);
    });

    renderA11y(colors);
    scheduleSaveHistory();
  };

  if (animate) {
    container.classList.add('fading');
    setTimeout(() => { build(); container.classList.remove('fading'); }, 120);
  } else {
    build();
  }
}

/** アクセシビリティ情報（WCAG コントラスト比）を描画 */
function renderA11y(colors) {
  const container = document.getElementById('a11yInfo');
  container.innerHTML = '<p class="a11y-title">コントラスト比（WCAG）</p>';

  const grid = document.createElement('div');
  grid.className = 'a11y-grid';

  colors.forEach(color => {
    const hex = hslToHex(color.h, color.s, color.l);
    const rw = contrastRatio(hex, 'ffffff');
    const rb = contrastRatio(hex, '000000');
    const ww = wcagLevel(rw), wb = wcagLevel(rb);

    const row = document.createElement('div');
    row.className = 'a11y-row';
    row.innerHTML =
      `<div class="a11y-swatch" style="background:#${hex}"></div>` +
      `<div class="a11y-data">` +
        `<span class="a11y-name">${color.label}</span>` +
        `<div class="a11y-ratios">` +
          `<span class="ratio-item">白 ${rw}:1 <span class="wcag ${ww.cls}">${ww.label}</span></span>` +
          `<span class="ratio-item">黒 ${rb}:1 <span class="wcag ${wb.cls}">${wb.label}</span></span>` +
        `</div>` +
      `</div>`;
    grid.appendChild(row);
  });

  container.appendChild(grid);
}

/** お気に入り・履歴エリアを描画 */
function renderFavSection() {
  // お気に入り
  const favList = document.getElementById('favList');
  if (state.favorites.length === 0) {
    favList.innerHTML = '<p class="empty-msg">お気に入りはまだありません</p>';
  } else {
    favList.innerHTML = '<p class="fav-group-title">お気に入り</p>';
    state.favorites.forEach(e => favList.appendChild(buildEntry(e, true)));
  }

  // 履歴（最新5件）
  const hisList = document.getElementById('historyList');
  hisList.innerHTML = '';
  if (state.history.length > 0) {
    hisList.innerHTML = '<p class="fav-group-title">最近使ったパレット</p>';
    state.history.slice(0, 5).forEach(e => hisList.appendChild(buildEntry(e, false)));
  }
}

/** パレットエントリの DOM 要素を生成 */
function buildEntry(entry, isFav) {
  const div = document.createElement('div');
  div.className = 'palette-entry';

  const swatches = entry.colors
    .map(hex => `<span class="mini-swatch" style="background:#${hex}"></span>`)
    .join('');

  div.innerHTML =
    `<div class="entry-swatches">${swatches}</div>` +
    `<div class="entry-meta">` +
      `<span class="entry-harmony">${HARMONY_LABELS[entry.harmony] || entry.harmony}</span>` +
      `<span class="entry-hex">#${entry.hex.toUpperCase()}</span>` +
    `</div>` +
    (isFav ? `<button class="entry-del" title="削除">✕</button>` : '');

  div.addEventListener('click', e => {
    if (e.target.classList.contains('entry-del')) {
      state.favorites = state.favorites.filter(f => f.id !== entry.id);
      localStorage.setItem('cpg:fav', JSON.stringify(state.favorites));
      renderFavSection();
      return;
    }
    loadEntry(entry);
  });

  return div;
}

/* ============================================================
   § 8. 全体更新ヘルパー
   ============================================================ */

/** hex（6桁、#なし）を state に反映して全 UI を更新 */
function applyHex(hex, animateChips) {
  hex = hex.replace(/^#/, '').toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(hex)) return false;
  state.hex = hex;
  state.hsl = hexToHsl(hex);

  updatePreview();
  updateHexInput();
  updatePicker();
  updateSliders();
  renderChips(animateChips === true);
  return true;
}

/** 保存済みエントリを読み込んで表示 */
function loadEntry(entry) {
  state.harmony = entry.harmony;
  document.querySelectorAll('.harmony-tab').forEach(t => {
    const sel = t.dataset.harmony === entry.harmony;
    t.classList.toggle('active', sel);
    t.setAttribute('aria-selected', sel);
  });
  applyHex(entry.hex, true);
}

/* ============================================================
   § 9. 履歴・お気に入り保存
   ============================================================ */

let historyTimer = null;

/** 履歴保存を遅延実行（スライダー操作中の過剰書き込みを防ぐ） */
function scheduleSaveHistory() {
  clearTimeout(historyTimer);
  historyTimer = setTimeout(doSaveHistory, 900);
}

function doSaveHistory() {
  const { h, s, l } = state.hsl;
  const colors = getColors(h, s, l, state.harmony);
  const entry = {
    hex: state.hex,
    harmony: state.harmony,
    colors: colors.map(c => hslToHex(c.h, c.s, c.l)),
    ts: Date.now(),
  };
  // 同じ hex + harmony の重複を除去してから先頭に追加
  state.history = state.history
    .filter(e => !(e.hex === entry.hex && e.harmony === entry.harmony))
    .slice(0, 9);
  state.history.unshift(entry);
  localStorage.setItem('cpg:his', JSON.stringify(state.history));
  renderFavSection();
}

/** 現在のパレットをお気に入りに保存 */
function saveFavorite() {
  const isDupe = state.favorites.some(
    f => f.hex === state.hex && f.harmony === state.harmony
  );
  if (isDupe) { showToast('すでに保存済みです'); return; }

  const { h, s, l } = state.hsl;
  const colors = getColors(h, s, l, state.harmony);
  state.favorites.unshift({
    id: Date.now(),
    hex: state.hex,
    harmony: state.harmony,
    colors: colors.map(c => hslToHex(c.h, c.s, c.l)),
    ts: Date.now(),
  });
  localStorage.setItem('cpg:fav', JSON.stringify(state.favorites));
  showToast('お気に入りに保存しました ⭐');
  renderFavSection();
}

/* ============================================================
   § 10. エクスポート生成
   ============================================================ */

/** CSS カスタムプロパティとして出力 */
function buildCssVars() {
  const { h, s, l } = state.hsl;
  const colors = getColors(h, s, l, state.harmony);
  const vars = colors.map(c => {
    const hex = hslToHex(c.h, c.s, c.l);
    // ラベルを kebab-case に変換してCSS変数名に
    const name = '--color-' + c.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
    return `  ${name}: #${hex.toUpperCase()};`;
  }).join('\n');
  return `:root {\n  /* ${HARMONY_LABELS[state.harmony] || state.harmony} — base: #${state.hex.toUpperCase()} */\n${vars}\n}`;
}

/** JSON 形式で出力 */
function buildJson() {
  const { h, s, l } = state.hsl;
  const colors = getColors(h, s, l, state.harmony);
  return JSON.stringify({
    harmony: state.harmony,
    baseColor: '#' + state.hex.toUpperCase(),
    colors: colors.map(c => {
      const hex = hslToHex(c.h, c.s, c.l);
      const { r, g, b } = hexToRgb(hex);
      return {
        label: c.label,
        hex:   '#' + hex.toUpperCase(),
        rgb:   `rgb(${r}, ${g}, ${b})`,
        hsl:   `hsl(${c.h}, ${c.s}%, ${c.l}%)`,
      };
    }),
    generatedAt: new Date().toISOString(),
  }, null, 2);
}

/* ============================================================
   § 11. ランダム生成
   ============================================================ */

function randomColor() {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 55) + 45; // 45〜100
  const l = Math.floor(Math.random() * 35) + 30; // 30〜65
  state.hsl = { h, s, l };
  state.hex = hslToHex(h, s, l);

  updatePreview();
  updateHexInput();
  updatePicker();
  updateSliders();
  renderChips(true);
}

/* ============================================================
   § 12. イベントリスナー登録
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* --- HEX テキスト入力 --- */
  const hexInput = document.getElementById('hexInput');
  hexInput.addEventListener('input', () => {
    const v = hexInput.value.trim().replace(/^#/, '');
    if (v.length === 6) applyHex(v, false);
  });
  hexInput.addEventListener('blur', () => {
    // 入力完了時に表示を正規化
    hexInput.value = state.hex.toUpperCase();
  });

  /* --- カラーピッカー --- */
  document.getElementById('colorPicker').addEventListener('input', e => {
    applyHex(e.target.value.replace('#', ''), false);
  });

  /* --- HSL スライダー --- */
  ['h', 's', 'l'].forEach(key => {
    document.getElementById(`${key}Slider`).addEventListener('input', e => {
      state.hsl[key] = parseInt(e.target.value, 10);
      state.hex = hslToHex(state.hsl.h, state.hsl.s, state.hsl.l);

      document.getElementById(`${key}Value`).textContent =
        state.hsl[key] + (key === 'h' ? '°' : '%');

      updatePreview();
      updateHexInput();
      updatePicker();
      updateSliders();   // グラデーション再計算
      renderChips(false);
    });
  });

  /* --- 配色タイプ タブ --- */
  document.querySelectorAll('.harmony-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.harmony-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      state.harmony = tab.dataset.harmony;
      renderChips(true); // 配色タイプ変更時はアニメーションあり
    });
  });

  /* --- 出力形式ボタン --- */
  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.format-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      state.format = btn.dataset.format;
      renderChips(false); // 形式変更はアニメーションなし（即時反映）
    });
  });

  /* --- エクスポート: CSS変数 --- */
  document.getElementById('exportCssBtn').addEventListener('click', function () {
    copyText(buildCssVars(), this);
  });

  /* --- エクスポート: JSON --- */
  document.getElementById('exportJsonBtn').addEventListener('click', function () {
    copyText(buildJson(), this);
  });

  /* --- お気に入り保存 --- */
  document.getElementById('saveFavBtn').addEventListener('click', saveFavorite);

  /* --- ランダム生成 --- */
  document.getElementById('randomBtn').addEventListener('click', randomColor);

  /* --- お気に入り・履歴 折りたたみトグル --- */
  const favToggle = document.getElementById('favToggle');
  const favContent = document.getElementById('favContent');
  const toggleAction = () => {
    const isOpen = favContent.classList.toggle('open');
    favToggle.setAttribute('aria-expanded', isOpen);
    favContent.setAttribute('aria-hidden', !isOpen);
  };
  favToggle.addEventListener('click', toggleAction);
  favToggle.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAction(); }
  });

  /* --- 初期描画 --- */
  updatePreview();
  updateHexInput();
  updatePicker();
  updateSliders();
  renderChips(false);
  renderFavSection();
});
