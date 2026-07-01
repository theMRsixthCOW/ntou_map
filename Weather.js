// ============================================================
//  Weather.js — Live rain overlay for NTOU 3D Map
//  Uses OpenWeatherMap API to determine rain intensity,
//  then renders a pure-CSS rain animation at 3 levels:
//    • Medium Rain     (rain rate < 7.6 mm/h)
//    • Heavy Rain      (rain rate 7.6–50 mm/h)
//    • Very Strong Rain(rain rate > 50 mm/h)
//  The overlay is fully transparent to pointer events so
//  it never interferes with the map or search UI.
// ============================================================

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────
  // NTOU campus coordinates (Keelung, Taiwan)
  const LAT = 25.1497;
  const LON = 121.7762;

  // 🔑  Replace with your own free key from https://openweathermap.org/api
  const API_KEY = 'd1fdd03075aa36a162a1813f5c61c064';
   
  // Poll interval (milliseconds) — every 2 hours
  const POLL_INTERVAL = 2*60 * 60 * 1000;

  // Rain intensity thresholds (mm/h)  – based on WMO classification
  const THRESHOLDS = {
    MEDIUM_MIN: 0.1,   // anything above 0 counts as rain
    HEAVY_MIN: 7.6,
    VERY_STRONG_MIN: 50,
  };

  // Number of raindrops per level
  const DROP_COUNTS = {
    medium: 40,
    heavy: 80,
    veryStrong: 150,
  };

  // ── Inject CSS ─────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* ---- Weather overlay container ---- */
    #weather-rain-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 9999;
      pointer-events: none;
      overflow: visible;
      display: none;               /* hidden until rain detected */
    }
    #weather-rain-overlay.active {
      display: block;
    }

    /* Front & back layers for depth */
    .weather-rain-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .weather-rain-layer.back {
      opacity: 0.45;
      filter: blur(1px);
    }

    /* Individual raindrop */
    .weather-drop {
      position: absolute;
      top: -150px;
      width: 15px;
      height: 120px;
      pointer-events: none;
      animation: weatherDrop var(--drop-duration) linear infinite;
      animation-delay: var(--drop-delay);
    }

    .weather-stem {
      width: 1.5px;
      height: 60%;
      margin-left: 7px;
      background: linear-gradient(
        to bottom,
        rgba(100, 130, 180, 0),
        rgba(100, 130, 180, 0.55)
      );
      animation: weatherStem var(--drop-duration) linear infinite;
      animation-delay: var(--drop-delay);
    }

    .weather-splat {
      width: 15px;
      height: 10px;
      border-top: 2px dotted rgba(80, 120, 180, 0.5);
      border-radius: 50%;
      opacity: 1;
      transform: scale(0);
      animation: weatherSplat var(--drop-duration) linear infinite;
      animation-delay: var(--drop-delay);
      margin-top: -10px;
    }

    /* ---- Rain level tweaks ---- */
    /* Medium rain — thinner, lighter */
    #weather-rain-overlay.rain-medium .weather-stem {
      width: 1px;
      background: linear-gradient(
        to bottom,
        rgba(100, 140, 190, 0),
        rgba(100, 140, 190, 0.4)
      );
    }
    #weather-rain-overlay.rain-medium .weather-drop {
      height: 80px;
    }

    /* Heavy rain — default look (uses base .weather-stem styles) */

    /* Very Strong rain — bolder, darker, slight screen tint */
    #weather-rain-overlay.rain-verystrong .weather-stem {
      width: 2px;
      background: linear-gradient(
        to bottom,
        rgba(60, 90, 150, 0),
        rgba(60, 90, 150, 0.7)
      );
    }
    #weather-rain-overlay.rain-verystrong .weather-drop {
      height: 140px;
    }
    #weather-rain-overlay.rain-verystrong::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.1);
      pointer-events: none;
    }


    /* ---- Keyframes ---- */
    @keyframes weatherDrop {
      0%   { transform: translateY(0); }
      75%  { transform: translateY(calc(100vh + 150px)); }
      100% { transform: translateY(calc(100vh + 150px)); }
    }
    @keyframes weatherStem {
      0%   { opacity: 1; }
      65%  { opacity: 1; }
      75%  { opacity: 0; }
      100% { opacity: 0; }
    }
    @keyframes weatherSplat {
      0%   { opacity: 1; transform: scale(0); }
      80%  { opacity: 1; transform: scale(0); }
      90%  { opacity: 0.5; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.5); }
    }
  `;
  document.head.appendChild(style);

  // ── Build DOM ──────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'weather-rain-overlay';
  overlay.innerHTML = `
    <div class="weather-rain-layer front"></div>
    <div class="weather-rain-layer back"></div>
  `;
  document.body.appendChild(overlay);



  // ── Rain generator ─────────────────────────────────────────
  function generateDrops(count) {
    const frontLayer = overlay.querySelector('.weather-rain-layer.front');
    const backLayer  = overlay.querySelector('.weather-rain-layer.back');
    frontLayer.innerHTML = '';
    backLayer.innerHTML  = '';

    let increment = 0;
    let frontHTML = '';
    let backHTML  = '';

    for (let i = 0; i < count; i++) {
      const randDelay    = Math.floor(Math.random() * 98) + 1;  // 1-98
      const randSpacing  = Math.floor(Math.random() * 4) + 2;   // 2-5
      increment += randSpacing;
      if (increment > 100) increment = increment % 100;

      const delay    = '0.' + randDelay + 's';
      const duration = '0.5' + randDelay + 's';
      const style    = `left:${increment}%;--drop-delay:${delay};--drop-duration:${duration};`;
      const styleR   = `right:${increment}%;--drop-delay:${delay};--drop-duration:${duration};`;

      const dropInner =
        `<div class="weather-stem"></div>` +
        `<div class="weather-splat"></div>`;

      frontHTML += `<div class="weather-drop" style="${style}">${dropInner}</div>`;
      backHTML  += `<div class="weather-drop" style="${styleR}">${dropInner}</div>`;
    }

    frontLayer.innerHTML = frontHTML;
    backLayer.innerHTML  = backHTML;
  }

  // ── Level classifier ───────────────────────────────────────
  function classifyRain(rainRate) {
    if (rainRate >= THRESHOLDS.VERY_STRONG_MIN) return 'verystrong';
    if (rainRate >= THRESHOLDS.HEAVY_MIN)       return 'heavy';
    if (rainRate >= THRESHOLDS.MEDIUM_MIN)       return 'medium';
    return null; // no rain
  }

  const LEVEL_LABELS = {
    medium:     '🌧️ Medium Rain',
    heavy:      '🌧️🌧️ Heavy Rain',
    verystrong: '⛈️ Very Strong Rain',
  };

  // ── Apply rain level ───────────────────────────────────────
  let currentLevel = null;
  let manualOverride = false;   // true = console testing mode, API won't overwrite

  function applyRainLevel(level) {
    // Remove old classes
    overlay.classList.remove('active', 'rain-medium', 'rain-heavy', 'rain-verystrong');

    if (!level) {
      currentLevel = null;
      return; // sunny — no overlay
    }

    if (level !== currentLevel) {
      const count = level === 'verystrong' ? DROP_COUNTS.veryStrong
                  : level === 'heavy'      ? DROP_COUNTS.heavy
                  :                           DROP_COUNTS.medium;
      generateDrops(count);
      currentLevel = level;
    }

    overlay.classList.add('active', 'rain-' + level);
  }

  // ── Fetch weather ──────────────────────────────────────────
  async function fetchWeather() {
    // Skip if user is manually testing from the console
    if (manualOverride) {
      console.log('[Weather] Manual override active — skipping API fetch. Run Weather.auto() to resume.');
      return;
    }

    try {
      const url =
        `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}` +
        `&appid=${API_KEY}&units=metric`;

      const res  = await fetch(url);
      if (!res.ok) throw new Error('API ' + res.status);
      const data = await res.json();

      // rain.1h = mm in last 1 h  (may be absent if no rain)
      const rainRate = (data.rain && (data.rain['1h'] || data.rain['3h'] / 3)) || 0;

      console.log('[Weather] Rain rate:', rainRate, 'mm/h  →', classifyRain(rainRate) || 'no rain');

      applyRainLevel(classifyRain(rainRate));
    } catch (err) {
      console.warn('[Weather] Could not fetch weather data:', err.message);
      // On error, don't change current state
    }
  }

  // ── Public API ─────────────────────────────────────────────
  window.Weather = {
    /** Force a rain level (locks out auto-fetch until Weather.auto())
     *  Usage:  Weather.setLevel('medium')
     *          Weather.setLevel('heavy')
     *          Weather.setLevel('verystrong')
     *          Weather.setLevel(null)          // clear rain
     */
    setLevel: function (level) {
      manualOverride = true;
      applyRainLevel(level);
      console.log('[Weather] 🔒 Manual override ON — showing:', level || 'no rain',
                  '\n  Run Weather.auto() to return to live API mode.');
    },
    /** Return to live API mode (disables manual override & fetches immediately) */
    auto: function () {
      manualOverride = false;
      console.log('[Weather] 🔓 Manual override OFF — back to live API mode.');
      fetchWeather();
    },
    /** Re-fetch weather right now (respects manual override) */
    refresh: fetchWeather,
  };

  // ── Init ───────────────────────────────────────────────────
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    console.warn(
      '[Weather] ⚠️  No API key set!\n' +
      '  1. Get a free key at https://openweathermap.org/api\n' +
      '  2. Replace YOUR_API_KEY_HERE in Weather.js\n' +
      '  3. For testing, run:  Weather.setLevel("heavy")  in the console.'
    );
  } else {
    // First fetch immediately on page load, then poll every 2 hours
    fetchWeather();
    setInterval(fetchWeather, POLL_INTERVAL);
  }
})();
