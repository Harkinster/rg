(() => {
  const SYMBOL_HEIGHT = 96;
  const REPEAT = 6; // fewer repeats -> less distance -> slower spin (same duration)
  const SYMBOLS = [
    { key: 'fille', label: '👧 Fille', cls: 'girl' },
    { key: 'garcon', label: '👦 Garçon', cls: 'boy' },
  ];

  // Elements
  const form = document.getElementById('guessForm');
  const firstNameInput = document.getElementById('firstName');
  const slotWrapper = document.getElementById('slotWrapper');
  const revealText = document.getElementById('revealText');
  const slotMachine = document.getElementById('slotMachine');
  const guestbookSection = document.getElementById('guestbookSection');
  const participantsSection = document.getElementById('participantsSection');
  // Utiliser trois roues (style machine à sous)
  const reels = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3'),
  ];
  const entriesList = document.getElementById('entriesList');
  const guestbookList = document.getElementById('guestbook');
  const messageInput = document.getElementById('messageInput');
  const messageForm = document.getElementById('messageForm');
  const saveMessageBtn = document.getElementById('saveMessageBtn');
  const statsEl = document.getElementById('stats');

  const settingsDialog = document.getElementById('settingsDialog');
  const openSettingsBtn = document.getElementById('openSettings');
  const saveSettingsBtn = document.getElementById('saveSettings');

  // Storage helpers
  const load = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch(e) { return fallback; }
  };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  // Config: reveal gender (host can set via settings)
  const getRevealGender = () => load('revealGender', 'garcon'); // default can be changed
  const setRevealGender = (val) => save('revealGender', val);

  // Data
  const getEntries = () => load('entries', []);
  const setEntries = (arr) => save('entries', arr);

  // Build reels content
  function makeReelDom(targetKey) {
    const container = document.createElement('div');
    container.className = 'symbols';
    // Fill many cycles; ensure last item is the target so we can align exactly
    const cycle = [];
    for (let i = 0; i < REPEAT; i++) {
      for (const s of SYMBOLS) cycle.push(s);
    }
    // Push target at the end to align
    const last = SYMBOLS.find(s => s.key === targetKey) || SYMBOLS[0];
    cycle.push(last);
    cycle.forEach(s => {
      const el = document.createElement('div');
      el.className = `symbol ${s.cls}`;
      el.textContent = s.label;
      container.appendChild(el);
    });
    return container;
  }

  function clearReels() {
    for (const reel of reels) reel.innerHTML = '';
  }

  function setupReels(targetKey) {
    clearReels();
    for (const reel of reels) {
      reel.appendChild(makeReelDom(targetKey));
    }
  }

  function spinReels(targetKey) {
    const targetIndex = REPEAT * SYMBOLS.length; // final appended target
    const baseDuration = 7000; // 7s total (dernier arrêt)
    // Durées échelonnées par roue pour un effet slot-machine
    const reelDurations = [
      Math.max(1500, baseDuration - 2000),
      Math.max(2000, baseDuration - 1000),
      baseDuration,
    ];

    reels.forEach((reel, idx) => {
      const syms = reel.querySelector('.symbols');
      const distance = targetIndex * SYMBOL_HEIGHT;
      const duration = reelDurations[Math.min(idx, reelDurations.length - 1)];

      // Reset any previous transition/animation
      if (syms.getAnimations) syms.getAnimations().forEach(a => a.cancel());
      syms.style.transition = 'none';
      syms.style.transform = 'translateY(0px)';
      void syms.offsetHeight; // reflow

      // Mouvement simple et continu sans ré-accélération ni rebond
      const keyframes = [
        { transform: 'translateY(0px)' },
        { transform: `translateY(-${distance}px)` },
      ];

      // Use WAAPI if available; fallback to simple transition
      if (syms.animate) {
        syms.animate(keyframes, { duration, fill: 'forwards', easing: 'cubic-bezier(.2,.8,0,1)' });
      } else {
        syms.style.transition = `transform ${duration}ms cubic-bezier(.2,.7,0,1)`;
        syms.style.transform = `translateY(-${distance}px)`;
      }
    });

    // Retourne la plus longue durée pour synchroniser la suite
    return Math.max(...reelDurations);
  }

  function renderStats(entries) {
    const boy = entries.filter(e => e.guess === 'garcon').length;
    const girl = entries.filter(e => e.guess === 'fille').length;
    const ok = entries.filter(e => e.correct === true).length;
    const total = entries.length;
    statsEl.innerHTML = [
      `<span class="stat">👦 Garçon: <strong>${boy}</strong></span>`,
      `<span class="stat">👧 Fille: <strong>${girl}</strong></span>`,
      `<span class="stat">✅ Juste: <strong>${ok}</strong></span>`,
      `<span class="stat">👥 Total: <strong>${total}</strong></span>`,
    ].join(' ');
  }

  function renderEntries() {
    const entries = getEntries();
    renderStats(entries);
    entriesList.innerHTML = '';
    for (const e of entries.slice().reverse()) {
      const li = document.createElement('li');
      li.className = 'entry';
      const when = new Date(e.time).toLocaleString();
      li.innerHTML = `
        <div class="meta">
          <strong>${escapeHtml(e.name)}</strong>
          <span class="tag ${e.guess === 'garcon' ? 'boy' : 'girl'}">${e.guess === 'garcon' ? '👦 Garçon' : '👧 Fille'}</span>
          <span class="tag ${e.correct ? 'ok' : 'ko'}">${e.correct ? '✔️ juste' : '✖️ faux'}</span>
          <span class="small muted">${when}</span>
        </div>
        ${e.message ? `<div class="body">${escapeHtml(e.message)}</div>` : ''}
      `;
      entriesList.appendChild(li);
    }
  }

  function renderGuestbook() {
    // Guestbook is derived from entries with a message
    const messages = getEntries().filter(e => e.message && e.message.trim() !== '');
    guestbookList.innerHTML = '';
    for (const m of messages.slice().reverse()) {
      const li = document.createElement('li');
      li.className = 'message';
      const when = new Date(m.time).toLocaleString();
      li.innerHTML = `
        <div class="meta">
          <strong>${escapeHtml(m.name)}</strong>
          <span class="small muted">${when}</span>
        </div>
        <div>${escapeHtml(m.message)}</div>
      `;
      guestbookList.appendChild(li);
    }
  }

  function showReveal(finalKey) {
    const sym = SYMBOLS.find(s => s.key === finalKey) || SYMBOLS[0];
    const cls = finalKey === 'garcon' ? 'reveal-boy' : 'reveal-girl';
    revealText.innerHTML = `<span class="${cls}">C'est un ${sym.key === 'garcon' ? 'Garçon' : 'Fille'} ! ${sym.label.split(' ')[0]}</span>`;
    slotWrapper.classList.remove('hidden');
  }

  let lastSubmission = null; // holds name+guess to allow message posting

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = (fd.get('firstName') || '').toString().trim();
    const guess = (fd.get('guess') || '').toString();
    if (!name || !guess) return;

    const finalKey = getRevealGender();
    // Prepare reels and spin
    setupReels(finalKey);
    // Show machine now, reveal text later
    slotWrapper.classList.remove('hidden');
    revealText.innerHTML = '';
    const duration = spinReels(finalKey);
    // Reveal text and sections right when spin ends
    window.setTimeout(() => {
      showReveal(finalKey);
      guestbookSection && guestbookSection.classList.remove('hidden');
      participantsSection && participantsSection.classList.remove('hidden');
    }, duration);

    // Disable form during spin
    form.querySelector('#spinButton').disabled = true;
    Array.from(form.elements).forEach(el => el.disabled = true);

    // After spin, record entry and enable message box
    window.setTimeout(() => {
      const correct = guess === finalKey;
      lastSubmission = { name, guess, correct };
      // Pre-fill message with empty and enable input
      messageInput.disabled = false;
      saveMessageBtn.disabled = false;

      // Save entry now (without message yet)
      const entries = getEntries();
      entries.push({ name, guess, correct, message: '', time: Date.now() });
      setEntries(entries);
      renderEntries();
      renderGuestbook();

      // Reset form (keep name for convenience)
      form.reset();
      firstNameInput.value = name;
      Array.from(form.elements).forEach(el => el.disabled = false);
      form.querySelector('#spinButton').disabled = false;
    }, duration + 50);
  });

  // Save message to the latest entry by this name without message
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = (messageInput.value || '').trim();
    if (!lastSubmission) return;
    const entries = getEntries();
    // find most recent matching entry without message
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].name === lastSubmission.name && entries[i].message === '') {
        entries[i].message = text;
        break;
      }
    }
    setEntries(entries);
    messageInput.value = '';
    renderEntries();
    renderGuestbook();
  });

  // Settings dialog
  openSettingsBtn.addEventListener('click', () => {
    const current = getRevealGender();
    settingsDialog.querySelectorAll('input[name="revealGender"]').forEach(i => {
      i.checked = (i.value === current);
    });
    settingsDialog.showModal();
  });

  saveSettingsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const sel = settingsDialog.querySelector('input[name="revealGender"]:checked');
    if (sel) setRevealGender(sel.value);
    settingsDialog.close();
  });

  // Utilities
  function escapeHtml(str) {
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // Initial render
  (function init() {
    // Build idle reels with current config
    setupReels(getRevealGender());
    renderEntries();
    renderGuestbook();
  })();
})();
