(() => {
  const DB_NAME = 'castle-battle-replay';
  const STORE_NAME = 'replays';
  const LAST_REPLAY_ID = 'last';
  const FALLBACK_KEY = 'castle:last-battle-replay';
  const RECORDER_OPTIONS = {
    fps: 8,
    mimeType: 'image/webp',
    quality: 0.62,
    includeInitialFrame: true
  };

  let replayButton = null;
  let recorder = null;

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

  function getCanvas() {
    return document.getElementById('game');
  }

  function getFrameRecorderClass() {
    return window.CanvasFrameReplay && window.CanvasFrameReplay.CanvasFrameRecorder;
  }

  function startRecording() {
    setReplayButton(false, '录制中');
    if (recorder && recorder.isRunning) recorder.stop();
    recorder = null;

    const canvas = getCanvas();
    const RecorderClass = getFrameRecorderClass();
    if (!canvas || !RecorderClass) {
      console.warn('[BattleReplay] canvas frame recorder is not ready');
      setReplayButton(false, '暂无回放');
      return;
    }

    recorder = new RecorderClass(canvas, RECORDER_OPTIONS);
    try {
      recorder.start();
    } catch (error) {
      console.warn('[BattleReplay] start canvas recording failed', error);
      recorder = null;
      setReplayButton(false, '暂无回放');
    }
  }

  function finishRecording(event) {
    requestAnimationFrame(async () => {
      if (!recorder) return;
      try {
        await recorder.captureFrame();
        const recording = recorder.stop();
        if (!recording.frames.length) {
          setReplayButton(false, '暂无回放');
          return;
        }
        await saveReplay({
          recording,
          meta: {
            winner: event.detail.state.winner,
            gameTime: event.detail.state.time,
            savedAt: Date.now()
          }
        });
        setReplayButton(true, '查看回放');
      } catch (error) {
        console.warn('[BattleReplay] save canvas replay failed', error);
        setReplayButton(false, '回放保存失败');
      } finally {
        recorder = null;
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
    addEventListener('gamefinish', finishRecording);
  }

  window.BattleReplay = { init, loadReplay };
})();
