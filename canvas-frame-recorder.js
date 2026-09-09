(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? factory(exports)
    : typeof define === 'function' && define.amd
      ? define(['exports'], factory)
      : factory((global.CanvasFrameReplay = {}));
})(this, function (exports) {
  'use strict';

  const DEFAULT_RECORDER_OPTIONS = {
    fps: 10,
    mimeType: 'image/webp',
    quality: 0.72,
    maxFrames: 0,
    includeInitialFrame: true
  };

  class CanvasFrameRecorder {
    constructor(canvas, options = {}) {
      if (!canvas || canvas.tagName !== 'CANVAS') throw new Error('CanvasFrameRecorder requires a canvas element');
      this.canvas = canvas;
      this.options = Object.assign({}, DEFAULT_RECORDER_OPTIONS, options);
      this.frames = [];
      this.isRunning = false;
      this.startedAt = 0;
      this.stoppedAt = 0;
      this._timer = null;
      this._captureBusy = false;
    }

    start() {
      if (this.isRunning) return;
      this.clear();
      this.startedAt = performance.now();
      this.stoppedAt = 0;
      this.isRunning = true;
      if (this.options.includeInitialFrame) this.captureFrame();
      this._scheduleNext();
    }

    stop() {
      if (!this.isRunning) return this.getRecording();
      this.isRunning = false;
      this.stoppedAt = performance.now();
      if (this._timer) clearTimeout(this._timer);
      this._timer = null;
      return this.getRecording();
    }

    clear() {
      this.frames.length = 0;
      this.startedAt = 0;
      this.stoppedAt = 0;
    }

    async captureFrame() {
      if (this._captureBusy || !this.startedAt) return null;
      this._captureBusy = true;
      try {
        const frame = {
          t: Math.max(0, performance.now() - this.startedAt),
          width: this.canvas.width,
          height: this.canvas.height,
          dataURL: this.canvas.toDataURL(this.options.mimeType, this.options.quality)
        };
        this.frames.push(frame);
        if (this.options.maxFrames > 0) {
          while (this.frames.length > this.options.maxFrames) this.frames.shift();
        }
        return frame;
      } finally {
        this._captureBusy = false;
      }
    }

    getRecording() {
      return {
        type: 'canvas-frame-recording',
        version: 1,
        width: this.canvas.width,
        height: this.canvas.height,
        fps: this.options.fps,
        mimeType: this.options.mimeType,
        startedAt: this.startedAt,
        stoppedAt: this.stoppedAt || performance.now(),
        duration: Math.max(0, (this.stoppedAt || performance.now()) - this.startedAt),
        frames: this.frames.slice()
      };
    }

    _scheduleNext() {
      if (!this.isRunning) return;
      const delay = Math.max(16, 1000 / this.options.fps);
      this._timer = setTimeout(async () => {
        try {
          await this.captureFrame();
        } catch (error) {
          console.warn('[CanvasFrameRecorder] capture failed', error);
          this.stop();
          return;
        }
        this._scheduleNext();
      }, delay);
    }
  }

  class CanvasFramePlayer {
    constructor(canvas, recording, options = {}) {
      if (!canvas || canvas.tagName !== 'CANVAS') throw new Error('CanvasFramePlayer requires a canvas element');
      if (!recording || !Array.isArray(recording.frames)) throw new Error('CanvasFramePlayer requires a frame recording');
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.recording = recording;
      this.options = Object.assign({ loop: false, autoPlay: false, background: '#000' }, options);
      this.currentTime = 0;
      this.isPlaying = false;
      this._raf = null;
      this._last = 0;
      this._images = new Map();
      this.canvas.width = recording.width || recording.frames[0]?.width || canvas.width;
      this.canvas.height = recording.height || recording.frames[0]?.height || canvas.height;
      if (this.options.autoPlay) this.play();
      else this.drawAt(0);
    }

    play() {
      if (this.isPlaying) return;
      this.isPlaying = true;
      this._last = performance.now();
      this._tick(this._last);
    }

    pause() {
      this.isPlaying = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
    }

    seek(ms) {
      this.currentTime = Math.max(0, Math.min(ms, this.duration));
      return this.drawAt(this.currentTime);
    }

    destroy() {
      this.pause();
      this._images.clear();
    }

    get duration() {
      const frames = this.recording.frames;
      return frames.length ? frames[frames.length - 1].t : 0;
    }

    async drawAt(ms) {
      const frame = this._findFrame(ms);
      if (!frame) return;
      const image = await this._loadImage(frame);
      this.ctx.fillStyle = this.options.background;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
    }

    _tick(now) {
      if (!this.isPlaying) return;
      const dt = now - this._last;
      this._last = now;
      this.currentTime += dt;
      if (this.currentTime >= this.duration) {
        if (this.options.loop) this.currentTime = 0;
        else {
          this.currentTime = this.duration;
          this.pause();
        }
      }
      this.drawAt(this.currentTime);
      this._raf = requestAnimationFrame(time => this._tick(time));
    }

    _findFrame(ms) {
      const frames = this.recording.frames;
      if (!frames.length) return null;
      let left = 0, right = frames.length - 1;
      while (left < right) {
        const mid = Math.ceil((left + right) / 2);
        if (frames[mid].t <= ms) left = mid;
        else right = mid - 1;
      }
      return frames[left];
    }

    _loadImage(frame) {
      if (this._images.has(frame.t)) return this._images.get(frame.t);
      const promise = new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = frame.dataURL;
      });
      this._images.set(frame.t, promise);
      return promise;
    }
  }

  exports.CanvasFrameRecorder = CanvasFrameRecorder;
  exports.CanvasFramePlayer = CanvasFramePlayer;
  Object.defineProperty(exports, '__esModule', { value: true });
});
