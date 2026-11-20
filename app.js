(() => {
  'use strict';

  const CFG = Object.assign(
    {
      TITLE: 'Title & abstract screening',
      APPS_SCRIPT_URL: '',
      EXCLUSION_REASONS: [],
    },
    window.SCREENING_CONFIG || {}
  );

  const $ = (id) => document.getElementById(id);
  const SESSION_KEY = 'screening.code';

  const state = {
    code: null,
    reviewer: null,
    records: [],
    decisions: {}, // this reviewer's own decisions only: record_id -> {decision, reason, note}
    idx: 0,
    filter: 'all',
    saving: false,
    absOpen: false, // abstract collapsed by default; the reviewer's choice carries across records
    listEls: new Map(),
    kw: { include: [], exclude: [] },
  };

  /* ---------------- API ---------------- */

  async function api(action, payload) {
    const res = await fetch(CFG.APPS_SCRIPT_URL, {
      method: 'POST',
      // text/plain keeps this a "simple" request (no CORS preflight, which Apps Script can't answer)
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action, code: state.code }, payload || {})),
      redirect: 'follow',
    });
    if (!res.ok) throw new Error('Network error (' + res.status + ')');
    return res.json();
  }

  /* ---------------- Login / logout ---------------- */

  function isConfigured() {
    return /^https:\/\/script\.google\.com\//.test(CFG.APPS_SCRIPT_URL);
  }

  async function login(code, silent) {
    state.code = code;
    const res = await api('init');
    if (!res.ok) {
      state.code = null;
      throw new Error(res.error === 'invalid_code' ? 'That access code was not recognised.' : 'Could not load records (' + res.error + ').');
    }
    state.reviewer = res.reviewer;
    state.records = res.records;
    state.decisions = res.decisions || {};
    try { sessionStorage.setItem(SESSION_KEY, code); } catch (e) { /* ignore */ }
    loadKeywords();
    showApp();
  }

  function logout(message) {
    state.code = null;
    state.reviewer = null;
    state.records = [];
    state.decisions = {};
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    $('app-view').hidden = true;
    $('login-view').hidden = false;
    $('code-input').value = '';
    const err = $('login-error');
    err.hidden = !message;
    err.textContent = message || '';
  }

  /* ---------------- Rendering ---------------- */

  function showApp() {
    $('login-view').hidden = true;
    $('app-view').hidden = false;
    $('reviewer-name').textContent = state.reviewer.name || state.reviewer.id;
    buildReasonList();
    const empty = state.records.length === 0;
    $('empty-msg').hidden = !empty;
    $('record-wrap').hidden = empty;
    renderList();
    updateProgress();
    if (!empty) {
      const first = findNextTodo(-1);
      goTo(first === -1 ? 0 : first);
    }
  }

  /* ---------------- Exclusion reasons ---------------- */

  function buildReasonList() {
    const list = $('reason-list');
    list.replaceChildren();
    CFG.EXCLUSION_REASONS.forEach((r, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'reason';
      b.dataset.reason = r;
      b.setAttribute('aria-pressed', 'false');
      if (i < 9) {
        const k = document.createElement('kbd');
        k.textContent = String(i + 1);
        b.appendChild(k);
      }
      b.appendChild(document.createTextNode(r));
      list.appendChild(b);
    });
  }

  const reasonsOpen = () => !$('reason-panel').hidden;

  const maybeOpen = () => !$('maybe-panel').hidden;

  function openMaybe() {
    if (state.saving || !current()) return;
    const d = state.decisions[current().record_id];
    const box = $('maybe-note');
    box.value = d && d.decision === 'Maybe' ? d.note || '' : '';
    box.classList.remove('invalid');
    $('maybe-error').hidden = true;
    $('reason-panel').hidden = true;
    setStatus('');
    $('maybe-panel').hidden = false;
    box.focus();
  }

  function closeMaybe() {
    $('maybe-panel').hidden = true;
  }

  function cancelMaybe() {
    closeMaybe();
    $('decision-buttons').querySelector('.maybe').focus();
  }

  function submitMaybe() {
    const note = $('maybe-note').value.trim();
    if (!note) {
      $('maybe-note').classList.add('invalid');
      $('maybe-error').hidden = false;
      $('maybe-note').focus();
      return;
    }
    save('Maybe', '', note);
  }

  function openReasons() {
    closeMaybe();
    if (state.saving || !current()) return;
    if (!CFG.EXCLUSION_REASONS.length) {
      setStatus('No exclusion reasons are configured (see config.js).', 'error');
      return;
    }
    const d = state.decisions[current().record_id];
    const previous = d && d.decision === 'Exclude' ? d.reason : '';
    const buttons = Array.from(document.querySelectorAll('#reason-list .reason'));
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.reason === previous)));
    setStatus('');
    $('reason-panel').hidden = false;
    (buttons.find((b) => b.dataset.reason === previous) || buttons[0]).focus();
  }

  function closeReasons() {
    closeMaybe();
    $('reason-panel').hidden = true;
  }

  function cancelReasons() {
    closeReasons();
    $('decision-buttons').querySelector('.exclude').focus();
  }

  function current() {
    return state.records[state.idx];
  }

  function goTo(i) {
    if (!state.records.length) return;
    state.idx = Math.max(0, Math.min(state.records.length - 1, i));
    setStatus('');
    renderRecord();
    markActive();
  }

  function renderRecord() {
    const rec = current();
    if (!rec) return;
    $('rec-position').textContent = 'Record ' + (state.idx + 1) + ' of ' + state.records.length + ' · ID ' + rec.record_id;
    renderHighlighted($('rec-title'), rec.title || '(no title)');
    $('rec-meta').textContent = [rec.authors, rec.year, rec.journal].filter(Boolean).join(' · ');

    const links = $('rec-links');
    links.replaceChildren();
    const doi = (rec.doi || '').trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
    if (/^10\.\d{4,9}\/\S+$/.test(doi)) {
      const a = document.createElement('a');
      a.href = 'https://doi.org/' + encodeURI(doi);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'DOI: ' + doi;
      links.appendChild(a);
    }

    const abs = $('rec-abstract');
    const hasAbs = !!(rec.abstract && rec.abstract.trim());
    if (hasAbs) {
      abs.classList.remove('muted');
      renderHighlighted(abs, rec.abstract);
    } else {
      abs.classList.add('muted');
      abs.textContent = 'No abstract available.';
    }
    $('abstract-toggle').hidden = !hasAbs;
    applyAbstractState();

    const d = state.decisions[rec.record_id];
    document.querySelectorAll('#decision-buttons .dec').forEach((b) => {
      b.setAttribute('aria-pressed', d && d.decision === b.dataset.decision ? 'true' : 'false');
    });
    closeReasons();
    $('current-decision').textContent = d
      ? 'Your saved decision: ' + d.decision + (d.reason ? ' (' + d.reason + ')' : '') + '. You can change it below.'
      : 'Not screened yet.';
  }

  /** Re-apply keyword highlighting without touching the note or the reason list. */
  function rehighlight() {
    const rec = current();
    if (!rec) return;
    renderHighlighted($('rec-title'), rec.title || '(no title)');
    if (rec.abstract && rec.abstract.trim()) renderHighlighted($('rec-abstract'), rec.abstract);
  }

  function applyAbstractState() {
    const open = state.absOpen;
    $('rec-abstract').classList.toggle('collapsed', !open);
    const t = $('abstract-toggle');
    t.setAttribute('aria-expanded', String(open));
    t.textContent = open ? 'Collapse abstract' : 'Show full abstract';
  }

  function renderHighlighted(el, text) {
    el.replaceChildren();
    const terms = [];
    state.kw.exclude.forEach((k) => terms.push([k, 'hl-exc']));
    state.kw.include.forEach((k) => terms.push([k, 'hl-inc'])); // include wins if a term is in both
    if (!terms.length) {
      el.textContent = text;
      return;
    }
    const classOf = new Map(terms.map(([k, c]) => [k, c]));
    const pattern = terms
      .map(([k]) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => b.length - a.length)
      .join('|');
    const re = new RegExp('(' + pattern + ')', 'gi');
    text.split(re).forEach((part, i) => {
      if (i % 2 === 1) {
        const m = document.createElement('mark');
        m.className = classOf.get(part.toLowerCase()) || 'hl-inc';
        m.textContent = part;
        el.appendChild(m);
      } else if (part) {
        el.appendChild(document.createTextNode(part));
      }
    });
  }

  function matchesFilter(rec) {
    const d = state.decisions[rec.record_id];
    switch (state.filter) {
      case 'todo': return !d;
      case 'done': return !!d;
      case 'Include':
      case 'Maybe':
      case 'Exclude': return !!d && d.decision === state.filter;
      default: return true;
    }
  }

  function renderList() {
    const frag = document.createDocumentFragment();
    state.listEls.clear();
    state.records.forEach((rec, i) => {
      if (!matchesFilter(rec)) return;
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'item';
      btn.dataset.index = String(i);
      const d = state.decisions[rec.record_id];
      if (d) btn.dataset.status = d.decision.toLowerCase();
      const dot = document.createElement('span');
      dot.className = 'dot';
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = (i + 1) + '. ' + (rec.title || '(no title)');
      btn.append(dot, label);
      li.appendChild(btn);
      frag.appendChild(li);
      state.listEls.set(rec.record_id, btn);
    });
    $('record-list').replaceChildren(frag);
    markActive();
  }

  function markActive() {
    document.querySelectorAll('#record-list .item.active').forEach((b) => b.classList.remove('active'));
    const rec = current();
    const btn = rec && state.listEls.get(rec.record_id);
    if (btn) {
      btn.classList.add('active');
      btn.scrollIntoView({ block: 'nearest' });
    }
  }

  function updateListItem(recordId) {
    const btn = state.listEls.get(recordId);
    const d = state.decisions[recordId];
    if (btn && d) btn.dataset.status = d.decision.toLowerCase();
  }

  function updateProgress() {
    const total = state.records.length;
    const done = state.records.filter((r) => state.decisions[r.record_id]).length;
    $('progress-text').textContent = done + ' / ' + total + ' screened';
    $('progress-bar').style.width = (total ? (done / total) * 100 : 0) + '%';
  }

  function setStatus(text, kind) {
    const el = $('status-msg');
    el.textContent = text || '';
    el.className = 'msg' + (kind ? ' ' + kind : '');
  }

  function setBusy(busy) {
    document.querySelectorAll('#decision-buttons .dec, #reason-list .reason, #maybe-save').forEach((b) => (b.disabled = busy));
  }

  /* ---------------- Navigation ---------------- */

  function findNextTodo(fromIdx) {
    const n = state.records.length;
    for (let step = 1; step <= n; step++) {
      const j = (fromIdx + step + n) % n;
      if (!state.decisions[state.records[j].record_id]) return j;
    }
    return -1;
  }

  /* ---------------- Saving ---------------- */

  async function save(decision, reason, noteOverride) {
    if (state.saving || !current()) return;
    const rec = current();
    reason = decision === 'Exclude' ? reason || '' : '';
    if (decision === 'Exclude' && !reason) {
      // A reason is mandatory: show the list instead of saving
      openReasons();
      return;
    }
    let note = ''; // only a Maybe carries a note
    if (decision === 'Maybe') {
      note = (noteOverride || '').trim();
      if (!note) {
        // A note is mandatory: show the note box instead of saving
        openMaybe();
        return;
      }
    }

    state.saving = true;
    setBusy(true);
    setStatus('Saving…');
    try {
      const res = await api('save', { record_id: rec.record_id, decision, reason, note });
      if (!res.ok) {
        if (res.error === 'invalid_code') {
          logout('Your session is no longer valid. Please sign in again.');
          return;
        }
        if (res.error === 'note_required') {
          openMaybe();
          $('maybe-note').classList.add('invalid');
          $('maybe-error').hidden = false;
          return;
        }
        throw new Error(res.error || 'save failed');
      }
      state.decisions[rec.record_id] = { decision, reason, note };
      updateListItem(rec.record_id);
      updateProgress();
      if ($('auto-advance').checked) {
        const next = findNextTodo(state.idx);
        if (next === -1) {
          renderRecord();
          setStatus('Saved ✓ All records are screened.', 'ok');
        } else {
          goTo(next);
          setStatus('Saved ✓', 'ok');
        }
      } else {
        renderRecord();
        setStatus('Saved ✓', 'ok');
      }
    } catch (e) {
      setStatus('Not saved (' + e.message + '). Please try again.', 'error');
    } finally {
      state.saving = false;
      setBusy(false);
    }
  }

  /* ---------------- Keyword highlighting (local to this browser) ---------------- */

  const kwKey = () => 'screening.kw.' + (state.reviewer ? state.reviewer.id : '');

  function parseTerms(s) {
    return s.split(/[,\n]/).map((t) => t.trim().toLowerCase()).filter(Boolean);
  }

  function loadKeywords() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(kwKey()) || '{}'); } catch (e) { /* ignore */ }
    $('kw-include').value = saved.include || '';
    $('kw-exclude').value = saved.exclude || '';
    applyKeywords(false);
  }

  function applyKeywords(persist) {
    state.kw.include = parseTerms($('kw-include').value);
    state.kw.exclude = parseTerms($('kw-exclude').value);
    if (persist) {
      try {
        localStorage.setItem(kwKey(), JSON.stringify({ include: $('kw-include').value, exclude: $('kw-exclude').value }));
      } catch (e) { /* ignore */ }
    }
    rehighlight();
  }

  /* ---------------- Wiring ---------------- */

  function wire() {
    $('login-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const code = $('code-input').value.trim();
      if (!code) return;
      const btn = $('login-btn');
      const err = $('login-error');
      btn.disabled = true;
      err.hidden = true;
      btn.textContent = 'Checking…';
      try {
        await login(code);
      } catch (e) {
        err.textContent = e.message || 'Something went wrong. Please try again.';
        err.hidden = false;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Start screening';
      }
    });

    $('logout-btn').addEventListener('click', () => logout());
    $('decision-buttons').addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-decision]');
      if (!b) return;
      if (b.dataset.decision === 'Exclude') {
        openReasons(); // choosing a reason saves the decision
      } else if (b.dataset.decision === 'Maybe') {
        openMaybe(); // saving needs a note
      } else {
        closeReasons();
        save(b.dataset.decision);
      }
    });
    $('maybe-save').addEventListener('click', submitMaybe);
    $('maybe-cancel').addEventListener('click', cancelMaybe);
    $('maybe-note').addEventListener('input', () => {
      if ($('maybe-note').value.trim()) {
        $('maybe-note').classList.remove('invalid');
        $('maybe-error').hidden = true;
      }
    });
    $('maybe-note').addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        submitMaybe();
      }
    });
    $('reason-list').addEventListener('click', (ev) => {
      const b = ev.target.closest('button.reason');
      if (b) save('Exclude', b.dataset.reason);
    });
    $('reason-cancel').addEventListener('click', cancelReasons);
    $('abstract-toggle').addEventListener('click', () => {
      state.absOpen = !state.absOpen;
      applyAbstractState();
    });
    $('prev-btn').addEventListener('click', () => goTo(state.idx - 1));
    $('next-btn').addEventListener('click', () => goTo(state.idx + 1));
    $('next-todo-btn').addEventListener('click', () => {
      const n = findNextTodo(state.idx);
      if (n === -1) setStatus('All records are screened.', 'ok');
      else goTo(n);
    });
    $('filter-select').addEventListener('change', (ev) => {
      state.filter = ev.target.value;
      renderList();
    });
    $('record-list').addEventListener('click', (ev) => {
      const b = ev.target.closest('button.item');
      if (!b) return;
      goTo(Number(b.dataset.index));
      $('sidebar').classList.remove('open');
      $('list-toggle').setAttribute('aria-expanded', 'false');
    });
    $('list-toggle').addEventListener('click', () => {
      const open = $('sidebar').classList.toggle('open');
      $('list-toggle').setAttribute('aria-expanded', String(open));
    });
    $('kw-include').addEventListener('input', () => applyKeywords(true));
    $('kw-exclude').addEventListener('input', () => applyKeywords(true));

    document.addEventListener('keydown', (ev) => {
      if ($('app-view').hidden || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.key === 'Escape' && maybeOpen()) {
        cancelMaybe();
        ev.preventDefault();
        return;
      }
      if (ev.key === 'Escape' && reasonsOpen()) {
        cancelReasons();
        ev.preventDefault();
        return;
      }
      const t = ev.target;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (reasonsOpen() && /^[1-9]$/.test(ev.key)) {
        // number keys pick the matching reason, which saves the Exclude decision
        const b = document.querySelectorAll('#reason-list .reason')[Number(ev.key) - 1];
        if (b) save('Exclude', b.dataset.reason);
        ev.preventDefault();
        return;
      }
      switch (ev.key.toLowerCase()) {
        case 'i': closeReasons(); save('Include'); break;
        case 'm': openMaybe(); break;
        case 'e': openReasons(); break;
        case 'arrowleft': goTo(state.idx - 1); break;
        case 'arrowright': goTo(state.idx + 1); break;
        case 'n': $('next-todo-btn').click(); break;
        default: return;
      }
      ev.preventDefault();
    });
  }

  async function start() {
    document.title = CFG.TITLE;
    $('login-title').textContent = CFG.TITLE;
    $('app-title').textContent = CFG.TITLE;
    wire();
    if (!isConfigured()) {
      $('config-warning').hidden = false;
      $('login-btn').disabled = true;
      return;
    }
    let saved = null;
    try { saved = sessionStorage.getItem(SESSION_KEY); } catch (e) { /* ignore */ }
    if (saved) {
      try { await login(saved); } catch (e) { logout(); }
    }
  }

  start();
})();
