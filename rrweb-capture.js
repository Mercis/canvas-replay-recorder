(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? factory(exports)
    : typeof define === 'function' && define.amd
      ? define(['exports'], factory)
      : factory((global.RrwebCapture = {}));
})(this, function (exports) {
  'use strict';

  /**
   * RrwebCapture UMD 开源组件
   * mode: buffer 前端环形缓存，触发后批量上报(默认)
   * mode: realtime 每条事件实时异步上传
   * 依赖外部CDN @rrweb/record
   */

  const DEFAULT_OPT = {
    mode: 'buffer', // buffer / realtime
    maxCacheSize: 250,
    canvasSampling: 8,
    mousemoveSampling: 20,
    scrollSampling: 10,
    recordCanvas: true,
    reportUrl: '',
    reportMethod: 'POST',
    maskPassword: true,
    realtimeThrottleMs: 200 // 实时模式节流，避免请求爆炸
  };

  function getRrwebRecord() {
    if (typeof window.rrwebRecord === 'function') return window.rrwebRecord;
    if (window.rrwebRecord && typeof window.rrwebRecord.record === 'function') return window.rrwebRecord.record;
    if (window.rrweb && typeof window.rrweb.record === 'function') return window.rrweb.record;
    return null;
  }

  class RrwebCapture {
    constructor(customOpt = {}) {
      this.opt = Object.assign({}, DEFAULT_OPT, customOpt);
      this.cache = [];
      this.stopHandler = null;
      this.isRunning = false;
      // 实时模式节流
      this.realtimeTimer = null;
      this.realtimeQueue = [];

      if (!getRrwebRecord()) {
        console.error('[RrwebCapture] require external @rrweb/record UMD script');
      }
    }

    // 环形缓存
    _pushEvent(evt) {
      if (this.opt.mode !== 'buffer') return;
      this.cache.push(evt);
      while (this.cache.length > this.opt.maxCacheSize) {
        this.cache.shift();
      }
    }

    // 实时模式批量节流发送
    async _flushRealtimeQueue() {
      const list = [...this.realtimeQueue];
      this.realtimeQueue.length = 0;
      this.realtimeTimer = null;
      if (!list.length || !this.opt.reportUrl) return;

      try {
        await fetch(this.opt.reportUrl, {
          method: this.opt.reportMethod,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: list, realtime: true })
        });
      } catch (e) {
        console.warn('[RrwebCapture] realtime upload fail', e);
      }
    }

    _onRrwebEvent(event) {
      if (this.opt.mode === 'buffer') {
        this._pushEvent(event);
      } else if (this.opt.mode === 'realtime') {
        this.realtimeQueue.push(event);
        if (!this.realtimeTimer) {
          this.realtimeTimer = setTimeout(() => {
            this._flushRealtimeQueue();
          }, this.opt.realtimeThrottleMs);
        }
      }
    }

    /**
     * 开启录制
     */
    start() {
      if (this.isRunning) return;
      const record = getRrwebRecord();
      if (!record) throw new Error('missing rrweb record function');

      this.stopHandler = record({
        emit: (event) => {
          this._onRrwebEvent(event);
        },
        recordCanvas: this.opt.recordCanvas,
        sampling: {
          mousemove: this.opt.mousemoveSampling,
          scroll: this.opt.scrollSampling,
          canvas: this.opt.canvasSampling
        },
        maskInputOptions: {
          password: this.opt.maskPassword
        }
      });
      this.isRunning = true;
    }

    /**
     * 停止录制
     */
    stop() {
      if (this.realtimeTimer) {
        clearTimeout(this.realtimeTimer);
        this._flushRealtimeQueue();
      }
      if (this.stopHandler) {
        this.stopHandler();
        this.stopHandler = null;
      }
      this.isRunning = false;
    }

    getEvents() {
      return [...this.cache];
    }

    clearCache() {
      this.cache.length = 0;
      this.realtimeQueue.length = 0;
    }

    /**
     * buffer模式有效：触发批量上报缓存数据
     */
    async triggerReport(extraData = {}) {
      if (this.opt.mode !== 'buffer') {
        console.warn('[RrwebCapture] triggerReport only work on buffer mode');
        return { ok: false, reason: 'mode not buffer' };
      }
      const events = [...this.cache];
      if (!events.length) return Promise.resolve({ ok: true, empty: true });
      if (!this.opt.reportUrl) {
        console.warn('[RrwebCapture] reportUrl not set');
        return Promise.resolve({ ok: false, reason: 'no reportUrl' });
      }

      const resp = await fetch(this.opt.reportUrl, {
        method: this.opt.reportMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events, extra: extraData, realtime: false })
      });
      return { ok: resp.ok, status: resp.status };
    }
  }

  exports.RrwebCapture = RrwebCapture;
  Object.defineProperty(exports, '__esModule', { value: true });
});
