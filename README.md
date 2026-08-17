# Web Harmonium

A browser-based digital harmonium built with native web technologies.

**Live:** https://harmonium.xento.us.kg/

---

## Overview

Web Harmonium is a lightweight digital harmonium that runs entirely in the browser.

It uses the Web Audio API for sample playback and audio processing, with the keyboard interface.

The project is frontend-only and does not require a backend, database, or server-side application.

---

## Technology

- HTML5
- CSS3
- JavaScript (ES6+)
- Web Audio API
- Web MIDI API
- Web Storage API
- Progressive Web App APIs

No frontend framework is required.

---

## Project Structure
```text
web-harmonium/
├── index.html
├── Styles/
│   └── style.css
├── Scripts/
│   ├── sound_sys.js
│   └── keys.js
├── Sounds/
│   ├── harmonium-trad-orig.wav
│   └── reverb.wav
├── Configs/
│   └── manifest.json
└── icons/
    └── favicon.png

```

### index.html

Contains the application structure, instrument keyboard, controls, settings interface, and PWA metadata.

### Styles/style.css

Contains the visual styling and layout of the application, including the harmonium cabinet, keybed, controls, responsive layout, and key interaction states.

### Scripts/sound_sys.js

Contains the audio engine.

Responsibilities include:

- AudioContext initialization
- Harmonium sample loading
- AudioBufferSourceNode management
- Polyphonic playback
- Pitch detuning
- Octave shifting
- Transposition
- Reed stacking
- Master volume
- Reverb
- MIDI input

### Scripts/keys.js

Contains keyboard interaction and UI-related JavaScript.

It handles keyboard interaction, key visual states, responsive key layout, and touch interaction.

### Sounds/harmonium-trad-orig.wav

The primary harmonium sample used by the audio engine.

### Sounds/reverb.wav

The impulse response used by the convolution reverb.

### Configs/manifest.json

Progressive Web App manifest.

### icons/favicon.png

Application and browser icon.

---

## Keyboard Mapping

The keyboard contains 14 white keys and 9 black keys.

### White Keys

| Keyboard Key | MIDI Note |
| :----------- | ---------: |
| `` ` ``      | 55 |
| `q`          | 57 |
| `w`          | 59 |
| `e`          | 60 |
| `r`          | 62 |
| `t`          | 64 |
| `y`          | 65 |
| `u`          | 67 |
| `i`          | 69 |
| `o`          | 71 |
| `p`          | 72 |
| `[`          | 74 |
| `]`          | 76 |
| `\`          | 77 |

### Black Keys

| Keyboard Key | MIDI Note |
| :----------- | ---------: |
| `1`          | 56 |
| `2`          | 58 |
| `4`          | 61 |
| `5`          | 63 |
| `7`          | 66 |
| `8`          | 68 |
| `9`          | 70 |
| `-`          | 73 |
| `=`          | 75 |

The mapping is defined in `Scripts/sound_sys.js`.

---

## Audio Engine

The audio system is built around the browser's native Web Audio API.
```text
The basic signal path is:

AudioBufferSourceNode
        |
        v
    GainNode
        |
        +--------------------> AudioContext.destination
        |
        v
   ConvolverNode
      (Reverb)
        |
        v
 AudioContext.destination
 ```

The harmonium sample is loaded into an AudioBuffer and played through individual AudioBufferSourceNode instances.

Each source can be detuned to represent a different key.

---

## Polyphony

Notes are handled independently so multiple keys can be played simultaneously.

When a note is triggered, the audio engine determines its position using the current octave and transpose settings.

Additional reed voices can be enabled through the stack control.

The stack is limited by the available octave range.

---

## Pitch

Pitch is adjusted using AudioBufferSourceNode.detune.

The engine works in cents:

Detune = Key Offset × 100

A semitone corresponds to 100 cents.

The base mapping is generated around the configured root key and can then be modified using the transpose control.

---

## Transpose

Transpose shifts the keyboard by semitones.

The current implementation allows a range of:

-11 ... +11

The selected value is stored locally and restored when the application is loaded again.

---

## Octave

The octave control changes the register used when calculating the note position.

The available octave range is:

0 ... 6

The selected octave is stored locally.

---

## Reed Stack

The stack control allows additional octave voices to be played alongside the selected note.

For example:

Stack 0
    Base voice

Stack 1
    Base voice
    +1 octave

Stack 2
    Base voice
    +1 octave
    +2 octaves

The maximum stack value is constrained by the current octave.

---

## Reverb

Web Harmonium uses a ConvolverNode for its reverb effect.

The impulse response is loaded from:

Sounds/reverb.wav

The reverb can be enabled or disabled without changing the underlying instrument configuration.

---

## MIDI

Where supported by the browser, Web Harmonium can access MIDI input devices through the Web MIDI API.

The MIDI implementation handles:

- Note On
- Note Off
- Note On with zero velocity
- MIDI CC 7 volume control

The application can detect available MIDI input devices and bind MIDI messages to the harmonium audio engine.

MIDI support depends on browser and operating-system support for the Web MIDI API.

---

## Local Storage

The application uses browser local storage for user preferences.

Currently stored settings include:

webharmonium.volume
webharmonium.useReverb
webharmonium.octave
webharmonium.transpose
webharmonium.stack

These values allow the instrument to restore its previous configuration when reopened.

---

## Progressive Web App

The project includes a web app manifest and service worker.

This allows supported browsers to treat Web Harmonium as an installable web application.

The application remains entirely frontend-based.

---

## Running the Project

Web Harmonium is a static frontend application.

The project does not require:

- a backend
- a database
- an API server
- a build system
- a frontend framework

The files can be deployed directly to a static web host.

The application should be served over HTTP or HTTPS because audio files and other assets are loaded by the browser at runtime.

---

## Custom Audio

The default harmonium sample is:

Sounds/harmonium-trad-orig.wav

To use a different harmonium sample, replace the file while keeping the same path, or update the `sampleURL` value in:

Scripts/sound_sys.js

The sample uses a looped playback region configured by:

var loopStart = 0.5;
var loopEnd = 7.5;

If a different sample is used, these values should be adjusted to match its loop points.

---

## Custom Reverb

The default impulse response is:

Sounds/reverb.wav

It can be replaced with another compatible WAV impulse-response file.

The file path is defined in `Scripts/sound_sys.js`.

---

## Browser Requirements

Web Harmonium requires a modern browser with support for the APIs used by the application.

| Technology | Purpose |
| :--------- | :------ |
| Web Audio API | Audio playback and processing |
| Web MIDI API | MIDI input |
| Web Storage API | Local settings |
| Service Worker API | PWA functionality |

MIDI availability varies between browsers and operating systems.

---

## Development Notes

The project intentionally avoids unnecessary dependencies.

The main application is implemented using browser-native technologies so that the instrument remains small, portable, and easy to deploy.

When modifying the project:

- Preserve the keyboard mapping.
- Avoid unnecessary dependencies.
- Keep audio interaction responsive.
- Test multiple simultaneous notes.
- Test transpose and octave changes together.
- Test reverb switching.
- Test MIDI input when available.
- Test the application after clearing local storage.
- Ensure audio assets remain accessible from their configured paths.

---

## Deployment

Since the project is static, deployment consists of serving the project directory and its assets.

Production:

https://harmonium.xento.us.kg/

No application server is required.

---

## License

See [`LICENSE`](LICENSE) for the license applicable to this project.

---

## Author

**Xento**

GitHub: https://github.com/thexento