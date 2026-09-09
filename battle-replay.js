(() => {
  const DB_NAME = 'castle-battle-replay';
  const STORE_NAME = 'replays';
  const LAST_REPLAY_ID = 'last';
  const FALLBACK_KEY = 'castle:last-battle-replay';
  const FRAME_INTERVAL = 0.12;

  let replayButton = null;
  let recording = false;
  let frames = [];
  let lastFrameTime = -Infinity;

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function withStore(mode, callback) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = callback(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  async function saveReplay(payload) {
    try {
      await withStore('readwrite', store => store.put({ id: LAST_REPLAY_ID, ...payload }));
    } catch (error) {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(payload));
    }
  }

  async function loadReplay() {
    try {
      const saved = await withStore('readonly', store => store.get(LAST_REPLAY_ID));
      if (saved) return saved;
    } catch (error) {
      // Fall through to localStorage for browsers with disabled IndexedDB.
    }
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function setReplayButton(enabled, label) {
    if (!replayButton) return;
    replayButton.disabled = !enabled;
    replayButton.textContent = label || (enabled ? '查看回放' : '暂无回放');
  }

  function pushFrame(state, force = false) {
    if (!recording || !state) return;
    if (!force && state.time - lastFrameTime < FRAME_INTERVAL) return;
    frames.push(cloneState(state));
    lastFrameTime = state.time;
  }

  function startRecording(event) {
    recording = true;
    frames = [];
    lastFrameTime = -Infinity;
    setReplayButton(false, '录制中');
    pushFrame(event.detail.state, true);
  }

  function finishRecording(event) {
    requestAnimationFrame(async () => {
      recording = false;
      pushFrame(event.detail.state, true);
      if (!frames.length) {
        setReplayButton(false, '暂无回放');
        return;
      }
      try {
        await saveReplay({
          frames,
          meta: {
            winner: event.detail.state.winner,
            duration: event.detail.state.time,
            savedAt: Date.now()
          }
        });
        setReplayButton(true, '查看回放');
      } catch (error) {
        console.warn('[BattleReplay] save replay failed', error);
        setReplayButton(false, '回放保存失败');
      }
    });
  }

  function init() {
    replayButton = document.getElementById('replayBtn');
    if (replayButton) {
      replayButton.onclick = () => window.open('rw/replay.html', '_blank');
      setReplayButton(false, '暂无回放');
    }
    addEventListener('gamestart', startRecording);
    addEventListener('gamechange', event => pushFrame(event.detail.state));
    addEventListener('gamefinish', finishRecording);
  }

  window.BattleReplay = { init, loadReplay };
})();
