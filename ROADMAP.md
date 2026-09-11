# Roadmap

Canvas Replay Recorder is focused on browser-side canvas recording and replay for H5 games, interactive canvas apps, and debugging workflows.

The short-term goal is to make canvas frame replay reliable and easy to integrate. The long-term goal is to offer multiple capture strategies so projects can choose between visual fidelity, smaller files, and deeper session context.

## 1. Stable Canvas Recording

- Support explicit target canvas selection for pages with multiple canvases.
- Add `pause()` and `resume()` to `CanvasFrameRecorder`. Done in `0.1.0-dev`.
- Improve metadata: recording id, canvas size, fps, duration, frame count, user agent, and custom business fields.
- Add safer handling for tainted canvas errors caused by cross-origin images.
- Add adaptive capture behavior for hidden tabs and low-performance devices.

## 2. Playback Experience

- Improve player controls: play, pause, replay, seek, speed, and frame-by-frame stepping.
- Add event callbacks such as `onPlay`, `onPause`, `onEnd`, and `onFrame`.
- Support loading a recording from a local JSON file.
- Support overlay metadata such as match id, winner, duration, or debug notes.
- Add examples for embedding a replay player inside an existing app page.

## 3. File Size Optimization

- Skip duplicate frames when the canvas is visually unchanged. Exact duplicate skipping is available in `0.1.0-dev`; near-identical frame detection is still planned.
- Add configurable downscaling for long recordings.
- Add chunked recordings so long sessions can be stored and uploaded in parts.
- Document compression recommendations for backend upload, such as gzip or brotli.
- Explore video-oriented capture with `MediaRecorder` or `WebCodecs` for use cases that need compact video output.

## 4. Storage And Upload

- Provide IndexedDB helpers for saving recent recordings in the browser.
- Provide export/import helpers for `.json` or `.canvas-replay` files.
- Add upload helpers for end-of-session batch upload.
- Add optional realtime chunk upload with retry behavior.
- Add examples for backend storage and replay loading.

## 5. SDK Usability

- Keep the core SDK independent from any specific game or business app.
- Keep app integrations, such as battle recording, as examples instead of core APIs.
- Provide UMD builds for CDN usage and package-friendly entry points for bundlers.
- Add TypeScript declarations.
- Add focused automated checks for recorder/player behavior.

## 6. Documentation And Examples

- Maintain a minimal canvas animation demo.
- Maintain an H5 game-style battle replay demo.
- Maintain an rrweb canvas recording comparison demo.
- Add troubleshooting guides for blank replay, tainted canvas, large files, and browser compatibility.
- Add integration recipes for start-on-match-begin and stop-on-match-end flows.

## Current Priority

The current priority is the frame snapshot recorder because it can restore the actual canvas pixels without depending on the original game engine or rrweb playback behavior.

Recommended next milestones:

1. Add local export/import examples.
2. Add TypeScript declarations.
3. Add near-identical frame detection.
4. Add chunked upload examples.
5. Prepare a browser CDN release package.
