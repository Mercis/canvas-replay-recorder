# Canvas Replay Recorder

Browser-only canvas recorder and replay toolkit for H5 games, interactive canvas apps, rrweb canvas sessions, and frame snapshot playback.

Keywords: canvas recorder, canvas replay, rrweb canvas, H5 game replay, HTML5 canvas recording, session replay, canvas frame capture.

Suggested GitHub description:

> Browser-only canvas recorder and replay toolkit for H5 games, interactive canvas apps, rrweb canvas sessions, and frame snapshot playback.

Suggested GitHub topics:

`canvas`, `canvas-recorder`, `canvas-replay`, `rrweb`, `rrweb-canvas`, `html5-canvas`, `h5-game`, `game-replay`, `session-replay`, `canvas-snapshot`

This repository tries two practical ways to record and replay canvas:

1. **Canvas frame snapshots**: record the canvas pixels with `canvas.toDataURL()`.
2. **rrweb canvas recording**: record a page session with rrweb canvas support enabled.

## Quick Start

Clone the repository and run the local demo server:

```bash
npm run dev
```

Open:

- `http://127.0.0.1:8124/frame-recorder-demo.html`
- `http://127.0.0.1:8124/rrweb-recorder-demo.html`

No build step is required. The core files are plain UMD browser scripts.

## Files

Core:

- `canvas-frame-recorder.js`: canvas-only frame recorder and player.
- `canvas-rrweb-recorder.js`: rrweb-based session recorder with canvas recording enabled.
- `rrweb-capture.js`: generic rrweb buffer/realtime upload wrapper.

Demos:

- `index.html`: demo entry page.
- `frame-recorder-demo.html`: canvas frame recorder demo.
- `rrweb-recorder-demo.html`: rrweb canvas recorder demo.
- `record.umd.min.cjs`: vendored rrweb recorder UMD build for the rrweb demo.

Integration example:

- `battle-replay.js`: example integration that records the Castle demo game's canvas with `CanvasFrameRecorder`.
- `replay.html`: example replay page that restores the recorded battle canvas with `CanvasFramePlayer`.

## Option 1: Canvas Frame Recorder

Use this when you want to replay exactly what appeared inside a single canvas.

```html
<canvas id="live" width="420" height="320"></canvas>
<canvas id="replay" width="420" height="320"></canvas>
<script src="canvas-frame-recorder.js"></script>
```

```js
const liveCanvas = document.getElementById('live');
const replayCanvas = document.getElementById('replay');

const recorder = new CanvasFrameReplay.CanvasFrameRecorder(liveCanvas, {
  fps: 12,
  mimeType: 'image/webp',
  quality: 0.75,
  maxFrames: 0
});

recorder.start();

// Later:
const recording = recorder.stop();

const player = new CanvasFrameReplay.CanvasFramePlayer(replayCanvas, recording, {
  autoPlay: true,
  loop: true
});
```

### Frame Recorder API

```js
const recorder = new CanvasFrameReplay.CanvasFrameRecorder(canvas, options);
```

Options:

- `fps`: frames per second. Default: `10`.
- `mimeType`: image format used by `canvas.toDataURL()`. Default: `image/webp`.
- `quality`: encoder quality passed to `toDataURL()`. Default: `0.72`.
- `maxFrames`: ring-buffer limit. `0` means unlimited. Default: `0`.
- `includeInitialFrame`: capture one frame immediately on `start()`. Default: `true`.

Methods:

- `start()`: begin capturing frames.
- `stop()`: stop capturing and return a recording object.
- `captureFrame()`: manually capture one frame.
- `getRecording()`: return the current recording object.
- `clear()`: clear captured frames.

Recording shape:

```js
{
  type: 'canvas-frame-recording',
  version: 1,
  width: 420,
  height: 320,
  fps: 12,
  mimeType: 'image/webp',
  duration: 2800,
  frames: [
    { t: 0, width: 420, height: 320, dataURL: 'data:image/webp;base64,...' }
  ]
}
```

### Frame Player API

```js
const player = new CanvasFrameReplay.CanvasFramePlayer(canvas, recording, options);
```

Options:

- `autoPlay`: start playback immediately. Default: `false`.
- `loop`: loop playback. Default: `false`.
- `background`: fill color before each frame. Default: `#000`.

Methods:

- `play()`: resume playback.
- `pause()`: pause playback.
- `seek(ms)`: jump to a timestamp.
- `destroy()`: stop playback and release cached images.

## Option 2: rrweb Canvas Recorder

Use this when you want a page/session replay and also want rrweb to include canvas drawing changes.

```html
<script src="record.umd.min.cjs"></script>
<script src="canvas-rrweb-recorder.js"></script>
```

```js
const recorder = new CanvasRrwebReplay.CanvasRrwebRecorder({
  fps: 8,
  recordCanvas: true,
  recordDOM: true,
  inlineImages: true
});

recorder.start();

// Later:
const recording = recorder.stop();
console.log(recording.events);
```

Playback uses `rrweb-player`:

```html
<link rel="stylesheet" href="https://cdn.rrweb.com/rrweb-player/current/style.css">
<script type="module">
  import rrwebPlayer from 'https://cdn.rrweb.com/rrweb-player/current/rrweb-player.js';

  new rrwebPlayer({
    target: document.getElementById('player'),
    props: {
      events: recording.events,
      autoPlay: true
    }
  });
</script>
```

### rrweb Recorder API

```js
const recorder = new CanvasRrwebReplay.CanvasRrwebRecorder(options);
```

Options:

- `fps`: rrweb canvas sampling FPS. Default: `8`.
- `recordCanvas`: enable rrweb canvas recording. Default: `true`.
- `recordDOM`: enable DOM recording. Default: `true`.
- `inlineImages`: inline image resources where possible. Default: `true`.
- `mousemoveSampling`: mousemove sampling. Default: `50`.
- `scrollSampling`: scroll sampling. Default: `100`.
- `maxEvents`: ring-buffer limit. `0` means unlimited. Default: `0`.

Methods:

- `start()`: begin rrweb recording.
- `stop()`: stop and return a recording object.
- `getRecording()`: return the current recording object.
- `clear()`: clear captured events.

Recording shape:

```js
{
  type: 'canvas-rrweb-recording',
  version: 1,
  duration: 6000,
  events: []
}
```

## Which One Should I Use?

Use the frame recorder when:

- You need a canvas-only visual replay.
- You are building a canvas game or an H5 activity.
- The page viewport is much larger than the canvas.
- You do not need to replay DOM inputs, clicks, or scrolls.
- You want playback to restore canvas pixels without the original game engine.

Use the rrweb recorder when:

- You need full page/session replay.
- DOM context, clicks, inputs, and scrolls matter.
- Canvas is only one part of the page.
- You already use rrweb in your observability or bug-reporting stack.

For deterministic game replay, the best long-term solution is usually neither bitmap frames nor rrweb events. Record game inputs or game-state snapshots, then render them again with your game engine.

## Known Limitations

- `canvas.toDataURL()` fails when the canvas is tainted by cross-origin images without proper CORS headers.
- Frame recordings can become large. Lower `fps`, canvas size, or image quality for long sessions.
- rrweb playback is page-oriented, so a small mobile canvas can appear tiny inside a large desktop viewport.
- rrweb canvas support depends on browser behavior, canvas context type, drawing APIs, and resource loading.

## License

MIT. See `LICENSE`.

Third-party notices are listed in `THIRD_PARTY_NOTICES.md`.
