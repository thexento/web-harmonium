/* ═══════════════════════════════════════════════════════════════════════════
   WEB HARMONIUM — AUDIO ENGINE & SYSTEM CORE (sound_sys.js)
   Auto-Loading Sample Buffer · Instant Autoplay Resume · Zero Latency
   ═══════════════════════════════════════════════════════════════════════════ */

var sampleURL = 'Sounds/harmonium-trad-orig.wav';
var reverbURL = 'Sounds/reverb.wav';

var AudioContext = window.AudioContext || window.webkitAudioContext;
var context = null;
var audioBuffer = null;
var gainNode = null;
var reverbNode = null;
var useReverb = false;

// Active voice tracking: Maps note index -> array of active AudioBufferSourceNodes
var activeVoices = {};

var keyboardMap = {
  "s": 53, "S": 53, "a": 54, "A": 54, "`": 55, "~": 55, "Tab": 55,
  "1": 56, "q": 57, "Q": 57, "2": 58, "w": 59, "W": 59,
  "e": 60, "E": 60, "4": 61, "r": 62, "R": 62, "5": 63,
  "t": 64, "T": 64, "y": 65, "Y": 65, "7": 66, "u": 67, "U": 67,
  "8": 68, "i": 69, "I": 69, "9": 70, "o": 71, "O": 71,
  "p": 72, "P": 72, "-": 73, "[": 74, "=": 75, "+": 75,
  "]": 76, "\\": 77, "'": 78, ";": 79
};

var swaramMap = {
  "s": "Ṃ", "S": "Ṃ", "a": "Ṃ", "A": "Ṃ", "`": "P̣", "1": "Ḍ", "q": "Ḍ", "Q": "Ḍ", "2": "Ṇ",
  "w": "Ṇ", "W": "Ṇ", "e": "S", "E": "S", "4": "R", "r": "R", "R": "R", "5": "G", "t": "G", "T": "G",
  "y": "M", "Y": "M", "7": "M", "u": "P", "U": "P", "8": "D", "i": "D", "I": "D", "9": "N",
  "o": "N", "O": "N", "p": "Ṡ", "P": "Ṡ", "-": "Ṙ", "[": "Ṙ", "=": "Ġ", "]": "Ġ", "\\": "Ṁ", "'": "Ṁ", ";": "Ṗ"
};

var notation = "";
var loopStart = 0.5;
var loopEnd = 7.5;
var loop = true;

var keyMap = new Array(128);
var baseKeyMap = new Array(128);
var middleC = 60;
var rootKey = 62; // Default key D
var currentOctave = 3;
var stackCount = 0;
var octaveMap = [-36, -24, -12, 0, 12, 24, 36];
var baseKeyNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function getCharLength(str) {
  return [...str].length;
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUDIO INITIALIZATION & RESUME
   ═══════════════════════════════════════════════════════════════════════════ */

function initAudioContext() {
  if (!context) {
    context = new AudioContext();
    gainNode = context.createGain();
    
    var volInput = document.getElementById("myRange");
    var initialVol = volInput ? parseFloat(volInput.value) / 100 : 0.3;
    gainNode.gain.value = initialVol;
    gainNode.connect(context.destination);
  }
  
  if (context.state === 'suspended') {
    context.resume();
  }
}

function initKeymap() {
  var transposeEl = document.getElementById('transpose');
  var transpose = transposeEl ? parseInt(transposeEl.innerText) || 0 : 0;
  var startKey = (middleC - 124) + (rootKey - middleC);
  
  for (var i = 0; i < 128; ++i) {
    baseKeyMap[i] = startKey++;
    keyMap[i] = baseKeyMap[i] + transpose;
  }
  
  var mainScreen = document.getElementById('mainScreen');
  if (mainScreen) {
    mainScreen.style.display = 'block';
  }
}

function load() {
  initAudioContext();

  // Restore saved preferences
  if (typeof Storage !== "undefined") {
    var savedVol = localStorage.getItem("webharmonium.volume");
    if (savedVol !== null) {
      var range = document.getElementById("myRange");
      if (range) range.value = savedVol;
      onGainChange();
    }

    var savedReverb = localStorage.getItem("webharmonium.useReverb");
    if (savedReverb !== null) {
      useReverb = (savedReverb === "true");
      var revCheck = document.getElementById("useReverb");
      if (revCheck) revCheck.checked = useReverb;
    }

    var savedOctave = localStorage.getItem("webharmonium.octave");
    if (savedOctave !== null) {
      currentOctave = parseInt(savedOctave) || 3;
    }
    var octEl = document.getElementById('octave');
    if (octEl) octEl.innerText = currentOctave;

    var savedTranspose = localStorage.getItem("webharmonium.transpose");
    if (savedTranspose !== null) {
      var trVal = parseInt(savedTranspose) || 0;
      var trEl = document.getElementById('transpose');
      if (trEl) trEl.innerText = trVal;
      
      var rootEl = document.getElementById('rootNote');
      if (rootEl) {
        var normIndex = (trVal >= 0) ? (trVal % 12) : ((trVal % 12) + 12) % 12;
        rootEl.innerText = baseKeyNames[normIndex];
      }
    }

    var savedStack = localStorage.getItem("webharmonium.stack");
    if (savedStack !== null) {
      stackCount = parseInt(savedStack) || 0;
    }
    var stackEl = document.getElementById('stack');
    if (stackEl) stackEl.innerText = stackCount;
  }

  initReverbNode();

  // Fetch audio sample automatically
  var req = new XMLHttpRequest();
  req.open('GET', sampleURL, true);
  req.responseType = 'arraybuffer';
  req.addEventListener('load', function () {
    context.decodeAudioData(
      req.response,
      function (buf) {
        audioBuffer = buf;
        initKeymap();
      },
      function (e) {
        console.error('Failed to decode harmonium audio buffer:', e);
      }
    );
  });
  req.send();

  requestMIDIAccess();
}

function initReverbNode() {
  if (!context) return;
  reverbNode = context.createConvolver();
  var req = new XMLHttpRequest();
  req.open('GET', reverbURL, true);
  req.responseType = 'arraybuffer';
  req.addEventListener('load', function () {
    context.decodeAudioData(
      req.response,
      function (buf) {
        reverbNode.buffer = buf;
        reverbNode.connect(context.destination);
        updateReverbState(useReverb);
      },
      function (e) {
        console.warn('Reverb buffer load error:', e);
      }
    );
  });
  req.send();
}

/* ═══════════════════════════════════════════════════════════════════════════
   NOTE SOUND PLAYBACK & POLYPHONIC VOICE MANAGEMENT
   ═══════════════════════════════════════════════════════════════════════════ */

function createVoiceSource(keyIndex) {
  if (!audioBuffer || !context) return null;

  var source = context.createBufferSource();
  source.buffer = audioBuffer;
  source.loop = loop;
  source.loopStart = loopStart;
  source.loopEnd = loopEnd;

  var pitchDetune = keyMap[keyIndex] * 100;
  if (isFinite(pitchDetune)) {
    source.detune.value = pitchDetune;
  }

  source.connect(gainNode);
  return source;
}

function noteOn(note) {
  initAudioContext();
  if (!audioBuffer) return;

  if (activeVoices[note] && activeVoices[note].length > 0) {
    return;
  }

  activeVoices[note] = [];

  // Primary note voice
  var primaryIndex = note + octaveMap[currentOctave];
  if (primaryIndex >= 0 && primaryIndex < keyMap.length) {
    var src = createVoiceSource(primaryIndex);
    if (src) {
      src.start(0);
      activeVoices[note].push(src);
    }
  }

  // Additional stacked octave reeds
  for (var c = 1; c <= stackCount; ++c) {
    var stackedOct = currentOctave + c;
    if (stackedOct >= 0 && stackedOct <= 6) {
      var stackIndex = note + octaveMap[stackedOct];
      if (stackIndex >= 0 && stackIndex < keyMap.length) {
        var stackSrc = createVoiceSource(stackIndex);
        if (stackSrc) {
          stackSrc.start(0);
          activeVoices[note].push(stackSrc);
        }
      }
    }
  }
}

function noteOff(note) {
  if (!activeVoices[note] || activeVoices[note].length === 0) {
    return;
  }

  var sourcesToStop = activeVoices[note];
  delete activeVoices[note];

  sourcesToStop.forEach(function (src) {
    try {
      src.stop(0);
      src.disconnect();
    } catch (e) {}
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD INPUT HANDLERS
   ═══════════════════════════════════════════════════════════════════════════ */

window.addEventListener('keydown', function (event) {
  initAudioContext();
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return;
  }
  if (!event.repeat && typeof keyboardMap[event.key] !== "undefined") {
    noteOn(keyboardMap[event.key]);
  }
});

window.addEventListener('keyup', function (event) {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return;
  }
  var key = event.key;
  if (typeof keyboardMap[key] !== "undefined") {
    noteOff(keyboardMap[key]);
  }

  if (key === "Backspace" && getCharLength(notation) > 0) {
    notation = notation.substring(0, getCharLength(notation) - 1);
  } else if (key === "Delete") {
    notation = "";
  } else if (key === "Enter") {
    notation = "";
  } else if (key === "Tab") {
    notation += ",";
  } else if (typeof swaramMap[key] !== "undefined") {
    notation += swaramMap[key];
  }
});


function play(el) {
  initAudioContext();
  if (!el) return;
  var keyAttr = el.getAttribute('key');
  var note = keyboardMap[keyAttr];
  if (note === undefined) return;

  el._playingNote = note;
  noteOn(note);
}

function stop(el) {
  if (!el) return;
  var note = el._playingNote;
  if (note === undefined) {
    var keyAttr = el.getAttribute('key');
    note = keyboardMap[keyAttr];
  }
  if (note !== undefined) {
    el._playingNote = undefined;
    noteOff(note);
  }
}


function onGainChange() {
  var range = document.getElementById("myRange");
  if (!range) return;

  var val = range.value;
  var volText = document.getElementById('volumeLevel');
  if (volText) volText.innerText = val + "%";

  if (gainNode) {
    gainNode.gain.value = parseFloat(val) / 100;
  }

  if (typeof Storage !== "undefined") {
    localStorage.setItem("webharmonium.volume", val);
  }
}

function updateReverbState(enabled) {
  useReverb = enabled;
  if (typeof Storage !== "undefined") {
    localStorage.setItem("webharmonium.useReverb", useReverb ? "true" : "false");
  }

  if (!gainNode || !reverbNode) return;

  if (useReverb) {
    try { gainNode.connect(reverbNode); } catch (e) {}
  } else {
    try { gainNode.disconnect(reverbNode); } catch (e) {}
  }
}

function shiftOctave(delta) {
  if (currentOctave + delta >= 0 && currentOctave + delta <= 6) {
    currentOctave += delta;
    if (typeof Storage !== "undefined") {
      localStorage.setItem("webharmonium.octave", currentOctave);
    }
  }
  var octEl = document.getElementById('octave');
  if (octEl) octEl.innerText = currentOctave;
}

function changeStack(delta) {
  stackCount += delta;
  if (stackCount < 0) stackCount = 0;
  else if (currentOctave + stackCount > 6) stackCount = 6 - currentOctave;

  var stackEl = document.getElementById('stack');
  if (stackEl) stackEl.innerText = stackCount;

  if (typeof Storage !== "undefined") {
    localStorage.setItem("webharmonium.stack", stackCount);
  }
}

function shiftSemitone(st) {
  var trEl = document.getElementById('transpose');
  if (!trEl) return;

  var cs = parseInt(trEl.innerText) || 0;
  if (cs + st >= -11 && cs + st <= 11) {
    cs += st;
    trEl.innerText = cs;

    var rootEl = document.getElementById('rootNote');
    if (rootEl) {
      var normIndex = (cs >= 0) ? (cs % 12) : ((cs % 12) + 12) % 12;
      rootEl.innerText = baseKeyNames[normIndex];
    }
  }

  if (typeof Storage !== "undefined") {
    localStorage.setItem("webharmonium.transpose", cs);
  }

  initKeymap();
}



var midiAccess = null;

function requestMIDIAccess() {
  var infoEl = document.getElementById('midiInputDevicesInfo');
  try {
    if (navigator.requestMIDIAccess) {
      if (infoEl && infoEl.innerText.indexOf('Supported') === -1) {
        infoEl.innerText = "MIDI Subsystem: Active";
      }
      navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    } else {
      if (infoEl) infoEl.innerText = "MIDI Subsystem: Not supported in this browser";
    }
  } catch (err) {
    if (infoEl) infoEl.innerText = "MIDI Subsystem Error: " + err;
  }
}

function onMIDISuccess(ma) {
  midiAccess = ma;
  updateMIDIDevicesList();
  midiAccess.onstatechange = function () {
    updateMIDIDevicesList();
  };
}

function updateMIDIDevicesList() {
  if (!midiAccess) return;
  var selectEl = document.getElementById("midiInputDevices");
  if (!selectEl) return;

  selectEl.innerHTML = '';
  var inputs = midiAccess.inputs.values();
  var count = 0;

  for (var input of inputs) {
    var opt = document.createElement("option");
    opt.value = input.id;
    opt.text = (input.name || "MIDI Device") + (input.manufacturer ? " (" + input.manufacturer + ")" : "");
    selectEl.add(opt);
    input.onmidimessage = getMIDIMessage;
    count++;
  }

  var infoEl = document.getElementById('midiInputDevicesInfo');
  if (infoEl) {
    infoEl.innerText = count > 0 ? "MIDI Devices Connected (" + count + ")" : "No MIDI keyboards detected";
  }
}

function onMIDIFailure(e) {
  var infoEl = document.getElementById('midiInputDevicesInfo');
  if (infoEl) infoEl.innerText = "MIDI Access Denied or Failed";
}

function getMIDIMessage(msg) {
  var cmd = msg.data[0];
  var note = msg.data[1];
  var vel = (msg.data.length > 2) ? msg.data[2] : 0;

  var selectEl = document.getElementById("midiInputDevices");
  if (selectEl && selectEl.selectedIndex >= 0) {
    var selectedId = selectEl.options[selectEl.selectedIndex].value;
    if (msg.target.id !== selectedId) return;
  }

  switch (cmd) {
    case 144: // Note On
      if (vel > 0) noteOn(note);
      else noteOff(note);
      break;
    case 128: // Note Off
      noteOff(note);
      break;
    case 176: // CC Volume
      if (note === 7) {
        var slider = document.getElementById("myRange");
        if (slider) {
          slider.value = Math.round((100 * vel) / 127);
          onGainChange();
        }
      }
      break;
  }
}



window.addEventListener('DOMContentLoaded', function () {
  load();
});

// Resume audio on first user click, touch, or keydown
['click', 'touchstart', 'pointerdown', 'keydown'].forEach(function (evt) {
  window.addEventListener(evt, function () {
    initAudioContext();
  }, { passive: true });
});

/* Service Worker Registration */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("Scripts/serviceworker.js").catch(function (e) {});
  });
}