(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? factory(exports)
    : typeof define === 'function' && define.amd
      ? define(['exports'], factory)
      : factory((global.CanvasRrwebReplay = {}));
})(this, function (exports) {
  'use strict';

  const DEFAULT_OPTIONS = {
    fps: 8,
    recordCanvas: true,
    recordDOM: true,
    inlineImages: true,
    mousemoveSampling: 50,
    scrollSampling: 100,
    maxEvents: 0
  };

  function getRecord() {
    if (typeof window.rrwebRecord === 'function') return window.rrwebRecord;
    if (window.rrwebRecord && typeof window.rrwebRecord.record === 'function') return window.rrwebRecord.record;
    if (window.rrweb && typeof window.rrweb.record === 'function') return window.rrweb.record;
    return null;
  }

  class CanvasRrwebRecorder {
    constructor(options = {}) {
      this.options = Object.assign({}, DEFAULT_OPTIONS, options);
      this.events = [];
      this.stopHandler = null;
      this.isRunning = false;
      this.startedAt = 0;
      this.stoppedAt = 0;
    }

    start() {
      if (this.isRunning) return;
      const record = getRecord();
      if (!record) throw new Error('Missing rrweb record function. Load rrweb record UMD before this component.');
      this.clear();
      this.startedAt = performance.now();
      this.isRunning = true;
      this.stopHandler = record({
        emit: event => this._pushEvent(event),
        recordCanvas: this.options.recordCanvas,
        recordDOM: this.options.recordDOM,
        inlineImages: this.options.inlineImages,
        sampling: {
          canvas: this.options.fps,
          mousemove: this.options.mousemoveSampling,
          scroll: this.options.scrollSampling
        }
      });
    }

    stop() {
      if (!this.isRunning) return this.getRecording();
      if (this.stopHandler) this.stopHandler();
      this.stopHandler = null;
      this.isRunning = false;
      this.stoppedAt = performance.now();
      return this.getRecording();
    }

    clear() {
      this.events.length = 0;
      this.startedAt = 0;
      this.stoppedAt = 0;
    }

    getRecording() {
      return {
        type: 'canvas-rrweb-recording',
        version: 1,
        startedAt: this.startedAt,
        stoppedAt: this.stoppedAt || performance.now(),
        duration: Math.max(0, (this.stoppedAt || performance.now()) - this.startedAt),
        events: this.events.slice()
      };
    }

    _pushEvent(event) {
      this.events.push(event);
      if (this.options.maxEvents > 0) {
        while (this.events.length > this.options.maxEvents) this.events.shift();
      }
    }
  }

  exports.CanvasRrwebRecorder = CanvasRrwebRecorder;
  Object.defineProperty(exports, '__esModule', { value: true });
});
