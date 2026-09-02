/* =========================================================
   GROOVEDNA — COMPLETE APPLICATION SCRIPT
   ========================================================= */

/* =========================================================
   1. CORE HELPERS / DOM UTILITIES
   ========================================================= */

const $ = (selector, scope = document) => scope.querySelector(selector);

const $$ = (selector, scope = document) =>
  Array.from(scope.querySelectorAll(selector));

const byId = (id) => document.getElementById(id);

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const clamp = (value, min, max) =>
  Math.min(Math.max(Number(value), min), max);

const randomId = (prefix = "id") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const escapeHTML = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const debounce = (fn, delay = 250) => {
  let timer;

  return (...args) => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

const isObject = (value) =>
  value !== null && typeof value === "object";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));


/* =========================================================
   2. APPLICATION STATE
   ========================================================= */

const appState = {
  initialized: false,

  user: null,
  session: null,

  currentPage: "home",
  selectedGenre: "All",
  searchTerm: "",

  isPlaying: false,
  isRecording: false,
  isMixerPlaying: false,
  isDrumPadPlaying: false,

  bpm: 96,
  pitch: 0,

  currentProject: null,
  currentTrack: null,

  audioContext: null,
  masterGain: null,

  activeOscillators: new Set(),
  activeSources: new Set(),

  drumPad: {
    active: false,
    currentPattern: null,
    pads: {},
  },

  mixer: {
    channels: [],
    masterVolume: 1,
    muted: false,
    soloChannel: null,
  },

  sequencer: {
    playing: false,
    currentStep: 0,
    notes: [],
    steps: 16,
    beatsPerBar: 4,
  },

  recorder: {
    mediaRecorder: null,
    stream: null,
    chunks: [],
    startedAt: null,
  },

  savedSamples: [],
  savedBeats: [],
  savedProjects: [],

  library: {
    items: [],
    filter: "all",
    searchTerm: "",
  },

  community: {
    posts: [],
    challenges: [],
  },

  messages: {
    conversations: [],
    activeConversation: null,
  },

  settings: {
    theme: "dark",
    notifications: true,
    autoplay: false,
  },

  ui: {
    menuOpen: false,
    modalOpen: false,
    activeModal: null,
  },
};


/* =========================================================
   3. LOCAL STORAGE HELPERS
   ========================================================= */

const STORAGE_KEYS = {
  savedSamples: "grooveDNA_saved",
  beatSaved: "grooveDNA_beatSaved",
  savedBeats: "grooveDNA_savedBeats",
  savedProjects: "grooveDNA_projects",
  settings: "grooveDNA_settings",
  library: "grooveDNA_library",
  community: "grooveDNA_community",
};

function loadStorage(key, fallback = null) {
  try {
    const stored = localStorage.getItem(key);

    if (stored === null) {
      return fallback;
    }

    return safeJsonParse(stored, fallback);
  } catch (error) {
    console.warn(`Unable to load localStorage key: ${key}`, error);
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Unable to save localStorage key: ${key}`, error);
    return false;
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Unable to remove localStorage key: ${key}`, error);
    return false;
  }
}


/* =========================================================
   4. TOAST / UI FEEDBACK
   ========================================================= */

const toast = byId("toast");

let toastTimer = null;

function showToast(message, type = "info") {
  if (!toast) {
    console.log(`[GrooveDNA] ${message}`);
    return;
  }

  toast.textContent = message;

  toast.dataset.type = type;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function showSuccess(message) {
  showToast(message, "success");
}

function showError(message) {
  showToast(message, "error");
}

function showWarning(message) {
  showToast(message, "warning");
}


/* =========================================================
   5. GLOBAL ERROR HANDLING
   ========================================================= */

window.addEventListener("error", (event) => {
  console.error(
    "GrooveDNA runtime error:",
    event.error || event.message
  );

  showError(
    "Something went wrong. GrooveDNA is still running."
  );
});

window.addEventListener("unhandledrejection", (event) => {
  console.error(
    "GrooveDNA promise error:",
    event.reason
  );

  showError(
    "A background operation could not be completed."
  );
});


/* =========================================================
   6. SAMPLE DATABASE / DISCOVER CATALOG
   ========================================================= */

const samples = [
  {
    id: 1,
    title: "Midnight Guitar Break",
    artist: "Demo Vault",
    genre: "Rock",
    type: "Guitar Riff",
    bpm: 112,
    key: "A Minor",
    rights: "Check Rights",
    icon: "🎸",
  },

  {
    id: 2,
    title: "Pocket Drums",
    artist: "Groove Archive",
    genre: "Funk",
    type: "Drum Break",
    bpm: 98,
    key: "C Minor",
    rights: "Cleared / Licensed",
    icon: "🥁",
  },

  {
    id: 3,
    title: "Velvet Keys",
    artist: "Soul Library",
    genre: "Soul",
    type: "Electric Piano",
    bpm: 84,
    key: "E♭ Major",
    rights: "Cleared / Licensed",
    icon: "🎹",
  },

  {
    id: 4,
    title: "Bassline 74",
    artist: "Funk Foundry",
    genre: "Funk",
    type: "Bassline",
    bpm: 96,
    key: "E Minor",
    rights: "Cleared / Licensed",
    icon: "🎸",
  },

  {
    id: 5,
    title: "Stadium Riff",
    artist: "Rock Archive",
    genre: "Rock",
    type: "Guitar Riff",
    bpm: 126,
    key: "D Major",
    rights: "Check Rights",
    icon: "⚡",
  },

  {
    id: 6,
    title: "Sunday Strings",
    artist: "Soul Library",
    genre: "Soul",
    type: "String Melody",
    bpm: 76,
    key: "G Major",
    rights: "Restricted",
    icon: "🎻",
  },
];


/* =========================================================
   7. DOM REFERENCES
   ========================================================= */

const sampleGrid = byId("sampleGrid");
const resultCount = byId("resultCount");

const searchInput = byId("searchInput");
const searchBtn = byId("searchBtn");

const audioUpload = byId("audioUpload");

const genreFilters = $$(".filter");

const labPlay = byId("labPlay");
const clearLab = byId("clearLab");
const saveBeat = byId("saveBeat");

const bpmControl = byId("bpm");
const bpmValue = byId("bpmValue");

const pitchControl = byId("pitch");
const pitchValue = byId("pitchValue");

const timeline = byId("timeline");
const labEmpty = byId("labEmpty");

const menuToggle = byId("menuToggle");
const mainNav = byId("mainNav");

const uploadBtn = byId("uploadBtn");
const uploadBtn2 = byId("uploadBtn2");

const profileBtn = byId("profileBtn");
const challengeBtn = byId("challengeBtn");


/* =========================================================
   8. RIGHTS / SAMPLE STATUS
   ========================================================= */

function rightsClass(rights) {
  if (!rights) {
    return "caution";
  }

  if (rights.startsWith("Cleared")) {
    return "cleared";
  }

  if (rights === "Restricted") {
    return "restricted";
  }

  return "caution";
}


/* =========================================================
   9. SAMPLE FILTERING
   ========================================================= */

function filteredSamples() {
  const term = appState.searchTerm.toLowerCase();

  return samples.filter((sample) => {
    const genreMatches =
      appState.selectedGenre === "All" ||
      sample.genre === appState.selectedGenre;

    const searchableText = [
      sample.title,
      sample.artist,
      sample.genre,
      sample.type,
      sample.key,
      sample.rights,
    ]
      .join(" ")
      .toLowerCase();

    const searchMatches =
      !term || searchableText.includes(term);

    return genreMatches && searchMatches;
  });
}


/* =========================================================
   10. SAMPLE CARD RENDERING
   ========================================================= */

function renderSamples() {
  if (!sampleGrid) {
    return;
  }

  const results = filteredSamples();

  if (resultCount) {
    resultCount.textContent =
      `${results.length} sounds found`;
  }

  if (!results.length) {
    sampleGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎧</div>
        <h3>No sounds found</h3>
        <p>
          Try another search term or choose a different genre.
        </p>
      </div>
    `;

    return;
  }

  sampleGrid.innerHTML = results
    .map((sample) => {
      const saved = appState.savedSamples.includes(sample.id);

      return `
        <article
          class="sample-card"
          data-sample-id="${sample.id}"
        >
          <div class="sample-art">
            <span class="sample-icon">
              ${sample.icon}
            </span>
          </div>

          <div class="sample-card-body">
            <div class="sample-card-top">
              <span class="sample-type">
                ${escapeHTML(sample.type)}
              </span>

              <span
                class="rights-badge ${rightsClass(sample.rights)}"
              >
                ${escapeHTML(sample.rights)}
              </span>
            </div>

            <h3>
              ${escapeHTML(sample.title)}
            </h3>

            <p class="sample-artist">
              ${escapeHTML(sample.artist)}
            </p>

            <div class="sample-meta">
              <span>${sample.bpm} BPM</span>
              <span>${escapeHTML(sample.key)}</span>
              <span>${escapeHTML(sample.genre)}</span>
            </div>

            <div class="sample-actions">
              <button
                type="button"
                class="sample-action"
                data-preview="${sample.id}"
              >
                ▶ Preview
              </button>

              <button
                type="button"
                class="sample-action"
                data-save="${sample.id}"
                aria-pressed="${saved}"
              >
                ${saved ? "✓ Saved" : "＋ Save"}
              </button>

              <button
                type="button"
                class="sample-action primary"
                data-add="${sample.id}"
              >
                ＋ Beat Lab
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}


/* =========================================================
   11. SEARCH
   ========================================================= */

function runSearch() {
  if (!searchInput) {
    return;
  }

  appState.searchTerm =
    searchInput.value.trim();

  renderSamples();

  const contentSection =
    $(".content-section");

  if (contentSection) {
    contentSection.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}


/* =========================================================
   12. GENRE FILTERS
   ========================================================= */

function setupGenreFilters() {
  genreFilters.forEach((button) => {
    button.addEventListener("click", () => {
      genreFilters.forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      appState.selectedGenre =
        button.dataset.genre || "All";

      renderSamples();
    });
  });
}


/* =========================================================
   13. SAMPLE ACTIONS
   ========================================================= */

function previewSample(sampleId) {
  const sample = samples.find(
    (item) => item.id === Number(sampleId)
  );

  if (!sample) {
    showError("Sample could not be found.");
    return;
  }

  showToast(
    `▶ Previewing "${sample.title}"`
  );
}

function saveSample(sampleId) {
  const id = Number(sampleId);

  if (!samples.some((sample) => sample.id === id)) {
    showError("Sample could not be saved.");
    return;
  }

  if (!appState.savedSamples.includes(id)) {
    appState.savedSamples.push(id);

    saveStorage(
      STORAGE_KEYS.savedSamples,
      appState.savedSamples
    );

    showSuccess("✓ Sample saved to your library.");
  } else {
    showToast("Already saved to your library.");
  }

  renderSamples();
}

function addSampleToBeatLab(sampleId) {
  const sample = samples.find(
    (item) => item.id === Number(sampleId)
  );

  if (!sample) {
    showError("Sample could not be added.");
    return;
  }

  if (labEmpty) {
    labEmpty.style.display = "none";
  }

  const melodyTrack =
    $(".track.melody");

  if (!melodyTrack) {
    showError("Beat Lab melody track is unavailable.");
    return;
  }

  const clip = document.createElement("div");

  clip.className = "clip melody";

  clip.dataset.sampleId = sample.id;

  clip.title = sample.title;

  clip.textContent = sample.title;

  const width =
    Math.floor(
      100 +
      Math.random() * 180
    );

  clip.style.width = `${width}px`;

  melodyTrack.appendChild(clip);

  showSuccess(
    `✓ "${sample.title}" added to Beat Lab.`
  );
}


/* =========================================================
   14. SAMPLE GRID EVENTS
   ========================================================= */

function setupSampleGrid() {
  if (!sampleGrid) {
    return;
  }

  sampleGrid.addEventListener("click", (event) => {
    const previewButton =
      event.target.closest("[data-preview]");

    const saveButton =
      event.target.closest("[data-save]");

    const addButton =
      event.target.closest("[data-add]");

    if (previewButton) {
      previewSample(
        previewButton.dataset.preview
      );

      return;
    }

    if (saveButton) {
      saveSample(
        saveButton.dataset.save
      );

      return;
    }

    if (addButton) {
      addSampleToBeatLab(
        addButton.dataset.add
      );
    }
  });
}


/* =========================================================
   15. AUDIO ENGINE INITIALIZATION
   ========================================================= */

function getAudioContext() {
  if (appState.audioContext) {
    return appState.audioContext;
  }

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    showError(
      "Your browser does not support Web Audio."
    );

    return null;
  }

  appState.audioContext =
    new AudioContextClass();

  appState.masterGain =
    appState.audioContext.createGain();

  appState.masterGain.gain.value = 0.85;

  appState.masterGain.connect(
    appState.audioContext.destination
  );

  return appState.audioContext;
}

async function resumeAudioContext() {
  const context = getAudioContext();

  if (!context) {
    return null;
  }

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch (error) {
      console.error(
        "Unable to resume AudioContext:",
        error
      );
    }
  }

  return context;
}


/* =========================================================
   16. BASIC SYNTHESIS
   ========================================================= */

function playTone(
  frequency = 440,
  duration = 0.25,
  type = "sine",
  volume = 0.15
) {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const oscillator =
    context.createOscillator();

  const gain =
    context.createGain();

  oscillator.type = type;

  oscillator.frequency.value =
    frequency;

  gain.gain.setValueAtTime(
    0,
    context.currentTime
  );

  gain.gain.linearRampToValueAtTime(
    volume,
    context.currentTime + 0.01
  );

  gain.gain.exponentialRampToValueAtTime(
    0.001,
    context.currentTime + duration
  );

  oscillator.connect(gain);

  gain.connect(
    appState.masterGain ||
    context.destination
  );

  oscillator.start();

  oscillator.stop(
    context.currentTime + duration + 0.02
  );

  appState.activeOscillators.add(
    oscillator
  );

  oscillator.addEventListener(
    "ended",
    () => {
      appState.activeOscillators.delete(
        oscillator
      );
    },
    { once: true }
  );
}


/* =========================================================
   17. DEMO PREVIEW BUTTONS
   ========================================================= */

function setupDemoPlayback() {
  $$("[data-demo-play]").forEach((button) => {
    button.addEventListener("click", async () => {
      await resumeAudioContext();

      const playing =
        button.dataset.playing === "true";

      if (playing) {
        button.dataset.playing = "false";

        button.textContent =
          "▶ Play Preview";

        showToast("Preview stopped.");

        return;
      }

      button.dataset.playing = "true";

      button.textContent =
        "⏸ Playing...";

      playTone(
        329.63,
        0.4,
        "triangle",
        0.12
      );

      setTimeout(() => {
        if (
          button.dataset.playing === "true"
        ) {
          button.dataset.playing = "false";

          button.textContent =
            "▶ Play Preview";
        }
      }, 900);
    });
  });
}


/* =========================================================
   18. BPM / PITCH CONTROLS
   ========================================================= */

function setupBeatLabControls() {
  if (bpmControl && bpmValue) {
    bpmControl.addEventListener(
      "input",
      () => {
        appState.bpm =
          Number(bpmControl.value);

        bpmValue.textContent =
          appState.bpm;
      }
    );
  }

  if (pitchControl && pitchValue) {
    pitchControl.addEventListener(
      "input",
      () => {
        appState.pitch =
          Number(pitchControl.value);

        const value =
          appState.pitch;

        pitchValue.textContent =
          value > 0
            ? `+${value}`
            : value;
      }
    );
  }
}


/* =========================================================
   19. BEAT LAB PLAYBACK
   ========================================================= */

async function toggleBeatLabPlayback() {
  await resumeAudioContext();

  appState.isPlaying =
    !appState.isPlaying;

  if (labPlay) {
    labPlay.textContent =
      appState.isPlaying
        ? "⏸"
        : "▶";
  }

  if (appState.isPlaying) {
    showSuccess(
      "▶ Beat Lab playback started."
    );

    startBeatLabClock();
  } else {
    showToast(
      "⏹ Beat Lab playback stopped."
    );

    stopBeatLabClock();
  }
}

let beatLabTimer = null;

function startBeatLabClock() {
  stopBeatLabClock();

  const interval =
    (60 / appState.bpm) * 1000;

  beatLabTimer =
    setInterval(() => {
      if (!appState.isPlaying) {
        return;
      }

      playTone(
        120,
        0.05,
        "sine",
        0.06
      );
    }, interval);
}

function stopBeatLabClock() {
  if (beatLabTimer) {
    clearInterval(beatLabTimer);

    beatLabTimer = null;
  }
}


/* =========================================================
   20. SAVE / CLEAR BEAT LAB
   ========================================================= */

function saveCurrentBeat() {
  const beat = {
    id: randomId("beat"),
    createdAt: new Date().toISOString(),
    bpm: appState.bpm,
    pitch: appState.pitch,
    clips: timeline
      ? $$(".clip", timeline).map(
          (clip) => ({
            sampleId:
              clip.dataset.sampleId ||
              null,
            title:
              clip.textContent.trim(),
          })
        )
      : [],
  };

  appState.savedBeats.push(beat);

  saveStorage(
    STORAGE_KEYS.savedBeats,
    appState.savedBeats
  );

  saveStorage(
    STORAGE_KEYS.beatSaved,
    true
  );

  showSuccess(
    "✓ Beat idea saved!"
  );
}

function clearBeatLab() {
  if (!timeline) {
    return;
  }

  $$(".clip", timeline).forEach(
    (clip) => clip.remove()
  );

  if (labEmpty) {
    labEmpty.style.display = "block";
  }

  showToast(
    "Beat Lab cleared."
  );
}


/* =========================================================
   21. MAIN NAVIGATION
   ========================================================= */

function navigateTo(target) {
  const element =
    typeof target === "string"
      ? $(target)
      : target;

  if (!element) {
    return;
  }

  element.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  appState.currentPage =
    element.id || appState.currentPage;

  if (mainNav) {
    mainNav.classList.remove("open");
  }

  appState.ui.menuOpen = false;
}

function setupNavigation() {
  $$("[data-scroll]").forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        navigateTo(
          button.dataset.scroll
        );
      }
    );
  });

  $$("a[href^='#']").forEach((link) => {
    link.addEventListener(
      "click",
      (event) => {
        const target =
          link.getAttribute("href");

        if (!target || target === "#") {
          return;
        }

        const element = $(target);

        if (!element) {
          return;
        }

        event.preventDefault();

        navigateTo(element);
      }
    );
  });

  if (menuToggle && mainNav) {
    menuToggle.addEventListener(
      "click",
      () => {
        appState.ui.menuOpen =
          !appState.ui.menuOpen;

        mainNav.classList.toggle(
          "open",
          appState.ui.menuOpen
        );

        menuToggle.setAttribute(
          "aria-expanded",
          String(
            appState.ui.menuOpen
          )
        );
      }
    );
  }
}


/* =========================================================
   22. AUDIO UPLOAD
   ========================================================= */

function openAudioUpload() {
  if (!audioUpload) {
    showError(
      "Audio upload control is unavailable."
    );

    return;
  }

  audioUpload.click();
}

function handleAudioUpload(event) {
  const file =
    event.target.files?.[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("audio/")) {
    showError(
      "Please choose a valid audio file."
    );

    event.target.value = "";

    return;
  }

  showSuccess(
    `✓ "${file.name}" uploaded for analysis.`
  );

  /*
    Production implementation:
    send the file to the backend/audio-recognition
    service here.
  */
}

function setupAudioUpload() {
  [uploadBtn, uploadBtn2]
    .filter(Boolean)
    .forEach((button) => {
      button.addEventListener(
        "click",
        openAudioUpload
      );
    });

  if (audioUpload) {
    audioUpload.addEventListener(
      "change",
      handleAudioUpload
    );
  }
}


/* =========================================================
   23. PROFILE / COMMUNITY BUTTONS
   ========================================================= */

function setupProfileActions() {
  if (profileBtn) {
    profileBtn.addEventListener(
      "click",
      () => {
        showToast(
          "Profile editor opened."
        );
      }
    );
  }

  if (challengeBtn) {
    challengeBtn.addEventListener(
      "click",
      () => {
        showToast(
          "Community challenge opened."
        );
      }
    );
  }
}


/* =========================================================
   24. INITIAL STATE LOADING
   ========================================================= */

function loadApplicationState() {
  appState.savedSamples =
    loadStorage(
      STORAGE_KEYS.savedSamples,
      []
    );

  appState.savedBeats =
    loadStorage(
      STORAGE_KEYS.savedBeats,
      []
    );

  appState.savedProjects =
    loadStorage(
      STORAGE_KEYS.savedProjects,
      []
    );

  appState.library.items =
    loadStorage(
      STORAGE_KEYS.library,
      []
    );

  const storedSettings =
    loadStorage(
      STORAGE_KEYS.settings,
      {}
    );

  if (isObject(storedSettings)) {
    appState.settings = {
      ...appState.settings,
      ...storedSettings,
    };
  }
}


/* =========================================================
   25. INITIALIZATION
   ========================================================= */

function initGrooveDNA() {
  if (appState.initialized) {
    return;
  }

  loadApplicationState();

  setupGenreFilters();
  setupSampleGrid();
  setupDemoPlayback();
  setupBeatLabControls();
  setupNavigation();
  setupAudioUpload();
  setupProfileActions();

  if (searchBtn) {
    searchBtn.addEventListener(
      "click",
      runSearch
    );
  }

  if (searchInput) {
    searchInput.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter") {
          runSearch();
        }
      }
    );
  }

  if (labPlay) {
    labPlay.addEventListener(
      "click",
      toggleBeatLabPlayback
    );
  }

  if (saveBeat) {
    saveBeat.addEventListener(
      "click",
      saveCurrentBeat
    );
  }

  if (clearLab) {
    clearLab.addEventListener(
      "click",
      clearBeatLab
    );
  }

  renderSamples();

  appState.initialized = true;

  console.log(
    "GrooveDNA core frontend initialized."
  );
}

document.addEventListener(
  "DOMContentLoaded",
  initGrooveDNA
);


```javascript
    source.connect(gain);
    gain.connect(masterGain);

    if (options.loop) {
        source.loop = true;
    }

    source.start(0);

    return {
        source,
        gain,
        stop() {
            try {
                source.stop();
            } catch (error) {
                // Already stopped.
            }
        }
    };
}

function setMasterVolume(value) {
    if (!masterGain) initAudioEngine();

    masterGain.gain.setTargetAtTime(
        Number(value),
        audioContext.currentTime,
        0.01
    );
}


// =======================================================
// 26. AUDIO UPLOAD
// =======================================================

const uploadInput = $("#audioUpload");

function openUpload() {
    if (uploadInput) {
        uploadInput.click();
    }
}

if ($("#uploadBtn")) {
    $("#uploadBtn").addEventListener("click", openUpload);
}

if ($("#uploadBtn2")) {
    $("#uploadBtn2").addEventListener("click", openUpload);
}

if (uploadInput) {
    uploadInput.addEventListener("change", async () => {
        const file = uploadInput.files[0];

        if (!file) return;

        try {
            const audio = await loadAudioFile(file);

            showToast(
                `✓ "${file.name}" loaded • ${audio.duration.toFixed(1)} sec`
            );

            window.grooveDNAUploadedAudio = audio;

        } catch (error) {
            console.error("Audio loading error:", error);
            showToast("⚠ Unable to load that audio file.");
        }
    });
}


/* =========================================================
   27. SUPABASE AUTHENTICATION
   ========================================================= */

/*
   Supabase Authentication is implemented here.

   Create Account:
   supabase.auth.signUp()

   Sign In:
   supabase.auth.signInWithPassword()

   Sign Out:
   supabase.auth.signOut()

   Session:
   supabase.auth.getSession()
*/


async function getCurrentSession() {
  if (!supabaseClient) {
    return null;
  }

  const {
    data,
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Session error:", error);
    return null;
  }

  GrooveDNA.session = data.session;
  GrooveDNA.user = data.session?.user || null;

  return data.session;
}


async function createAccount(email, password, displayName) {
  if (!supabaseClient) {
    showToast("Supabase is not configured yet.");
    return false;
  }

  try {
    const {
      data,
      error
    } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split("@")[0]
        },
        emailRedirectTo: window.location.origin + "/index.html"
      }
    });

    if (error) {
      throw error;
    }

    GrooveDNA.user = data.user;
    GrooveDNA.session = data.session;

    /*
      If email confirmation is enabled in Supabase,
      session can initially be null.
    */

    if (!data.session) {
      showToast(
        "Account created. Check your email to confirm your account."
      );

      return true;
    }

    await createUserProfile(data.user, displayName);

    showToast("Account created successfully!");

    navigate("home.html");

    return true;

  } catch (error) {
    console.error("Create account error:", error);
    showToast(
      error.message || "Unable to create account."
    );

    return false;
  }
}
```

```javascript
    source.connect(gain);
    gain.connect(masterGain);

    if (options.loop) {
        source.loop = true;
    }

    source.start(0);

    return {
        source,
        gain,
        stop() {
            try {
                source.stop();
            } catch (error) {
                // Already stopped.
            }
        }
    };
}

function setMasterVolume(value) {
    if (!masterGain) initAudioEngine();

    masterGain.gain.setTargetAtTime(
        Number(value),
        audioContext.currentTime,
        0.01
    );
}


```javascript
async function signIn(email, password) {
  if (!supabaseClient) {
    showToast("Supabase is not configured yet.");
    return false;
  }

  try {
    const {
      data,
      error
    } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    GrooveDNA.user = data.user;
    GrooveDNA.session = data.session;

    showToast("✓ Signed in successfully!");

    await getCurrentSession();

    return true;

  } catch (error) {
    console.error("Sign in error:", error);

    showToast(
      error.message || "Unable to sign in."
    );

    return false;
  }
}


async function signOut() {
  if (!supabaseClient) {
    showToast("Supabase is not configured yet.");
    return false;
  }

  try {
    const {
      error
    } = await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }

    GrooveDNA.user = null;
    GrooveDNA.session = null;

    showToast("✓ Signed out.");

    return true;

  } catch (error) {
    console.error("Sign out error:", error);

    showToast(
      error.message || "Unable to sign out."
    );

    return false;
  }
}


async function resetPassword(email) {
  if (!supabaseClient) {
    showToast("Supabase is not configured yet.");
    return false;
  }

  try {
    const {
      error
    } = await supabaseClient.auth.resetPasswordForEmail(
      email,
      {
        redirectTo:
          window.location.origin + "/reset-password.html"
      }
    );

    if (error) {
      throw error;
    }

    showToast(
      "✓ Password reset email sent."
    );

    return true;

  } catch (error) {
    console.error("Password reset error:", error);

    showToast(
      error.message || "Unable to send password reset email."
    );

    return false;
  }
}


/* =========================================================
   28. AUTH STATE LISTENER
   ========================================================= */

function listenForAuthChanges() {
  if (!supabaseClient) {
    return;
  }

  supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

      GrooveDNA.session = session;
      GrooveDNA.user = session?.user || null;

      console.log(
        "GrooveDNA auth event:",
        event
      );

      /*
        These events can include:

        SIGNED_IN
        SIGNED_OUT
        INITIAL_SESSION
        TOKEN_REFRESHED
        USER_UPDATED
        PASSWORD_RECOVERY
      */

      if (event === "SIGNED_IN") {
        updateAuthUI();
      }

      if (event === "SIGNED_OUT") {
        updateAuthUI();
      }

      if (event === "USER_UPDATED") {
        updateAuthUI();
      }
    }
  );
}


/* =========================================================
   29. USER PROFILE
   ========================================================= */

async function createUserProfile(user, displayName = "") {
  if (!supabaseClient || !user) {
    return false;
  }

  try {

    const profile = {
      id: user.id,
      username:
        displayName ||
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "Creator",
      email: user.email || null
    };

    const {
      error
    } = await supabaseClient
      .from("profiles")
      .upsert(
        profile,
        {
          onConflict: "id"
        }
      );

    if (error) {
      throw error;
    }

    return true;

  } catch (error) {

    console.error(
      "Create profile error:",
      error
    );

    return false;
  }
}


async function loadUserProfile() {
  if (!supabaseClient || !GrooveDNA.user) {
    return null;
  }

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", GrooveDNA.user.id)
      .single();

    if (error) {
      throw error;
    }

    GrooveDNA.profile = data;

    updateProfileUI();

    return data;

  } catch (error) {

    console.error(
      "Load profile error:",
      error
    );

    return null;
  }
}


/* =========================================================
   30. AUTH / PROFILE UI
   ========================================================= */

function updateAuthUI() {

  const authButtons =
    document.querySelectorAll(
      "[data-auth-required]"
    );

  authButtons.forEach(element => {

    if (GrooveDNA.user) {
      element.removeAttribute("disabled");
      element.classList.remove("disabled");

    } else {
      element.setAttribute("disabled", "true");
      element.classList.add("disabled");
    }
  });


  const userElements =
    document.querySelectorAll(
      "[data-user-name]"
    );

  userElements.forEach(element => {

    element.textContent =
      GrooveDNA.profile?.username ||
      GrooveDNA.user?.user_metadata?.display_name ||
      GrooveDNA.user?.email?.split("@")[0] ||
      "Guest";
  });


  const emailElements =
    document.querySelectorAll(
      "[data-user-email]"
    );

  emailElements.forEach(element => {

    element.textContent =
      GrooveDNA.user?.email ||
      "";
  });
}


function updateProfileUI() {

  if (!GrooveDNA.profile) {
    updateAuthUI();
    return;
  }

  const nameElements =
    document.querySelectorAll(
      "[data-profile-name]"
    );

  nameElements.forEach(element => {
    element.textContent =
      GrooveDNA.profile.username ||
      "Creator";
  });

  updateAuthUI();
}


/* =========================================================
   31. AUTH BUTTON EVENTS
   ========================================================= */

document.addEventListener(
  "click",
  async event => {

    const signOutButton =
      event.target.closest(
        "[data-signout]"
      );

    if (signOutButton) {
      event.preventDefault();

      await signOut();

      return;
    }


    const signInButton =
      event.target.closest(
        "[data-signin]"
      );

    if (signInButton) {
      event.preventDefault();

      const emailInput =
        document.querySelector(
          "[data-auth-email]"
        );

      const passwordInput =
        document.querySelector(
          "[data-auth-password]"
        );

      if (!emailInput || !passwordInput) {
        showToast(
          "Login fields were not found."
        );

        return;
      }

      await signIn(
        emailInput.value.trim(),
        passwordInput.value
      );

      return;
    }


    const createAccountButton =
      event.target.closest(
        "[data-create-account]"
      );

    if (createAccountButton) {
      event.preventDefault();

      const emailInput =
        document.querySelector(
          "[data-auth-email]"
        );

      const passwordInput =
        document.querySelector(
          "[data-auth-password]"
        );

      const nameInput =
        document.querySelector(
          "[data-display-name]"
        );

      if (!emailInput || !passwordInput) {
        showToast(
          "Account fields were not found."
        );

        return;
      }

      await createAccount(
        emailInput.value.trim(),
        passwordInput.value,
        nameInput?.value.trim() || ""
      );

      return;
    }


    const resetButton =
      event.target.closest(
        "[data-reset-password]"
      );

    if (resetButton) {
      event.preventDefault();

      const emailInput =
        document.querySelector(
          "[data-auth-email]"
        );

      if (!emailInput) {
        showToast(
          "Enter your email address first."
        );

        return;
      }

      await resetPassword(
        emailInput.value.trim()
      );
    }
  }
);


/* =========================================================
   32. DATABASE ERROR HANDLER
   ========================================================= */

function handleDatabaseError(
  error,
  fallbackMessage = "Something went wrong."
) {

  console.error(
    "GrooveDNA database error:",
    error
  );

  if (!error) {
    showToast(fallbackMessage);
    return;
  }

  if (error.code === "23505") {
    showToast(
      "That information already exists."
    );

    return;
  }

  if (error.code === "42501") {
    showToast(
      "You do not have permission to perform that action."
    );

    return;
  }

  if (error.code === "PGRST116") {
    showToast(
      "The requested record could not be found."
    );

    return;
  }

  showToast(
    error.message ||
    fallbackMessage
  );
}
```

/* =========================================================
   33. BEAT LAB CONTROLS
   ========================================================= */

function setupBeatControls() {

  const play =
    $("#labPlay");

  const bpm =
    $("#bpm");

  const bpmValue =
    $("#bpmValue");

  const pitch =
    $("#pitch");

  const pitchValue =
    $("#pitchValue");

  const loop =
    $("#loopToggle");


  play?.addEventListener(
    "click",
    () => {

      const playing =
        play.dataset.playing === "true";

      if (playing) {

        play.dataset.playing =
          "false";

        play.textContent = "▶";

        stopBeatLab();

      } else {

        play.dataset.playing =
          "true";

        play.textContent = "⏸";

        startBeatLab();
      }
    }
  );


  bpm?.addEventListener(
    "input",
    () => {

      GrooveDNA.currentBeat.bpm =
        Number(bpm.value);

      if (bpmValue) {

        bpmValue.textContent =
          bpm.value;
      }
    }
  );


  pitch?.addEventListener(
    "input",
    () => {

      GrooveDNA.currentBeat.pitch =
        Number(pitch.value);

      if (pitchValue) {

        const value =
          Number(pitch.value);

        pitchValue.textContent =
          value > 0
            ? `+${value}`
            : value;
      }
    }
  );


  loop?.addEventListener(
    "change",
    () => {

      GrooveDNA.currentBeat.loop =
        loop.checked;
    }
  );
}


/* =========================================================
   34. BEAT LAB INSTRUMENT BROWSER
   ========================================================= */

function createBeatLabBrowser() {

  let browser =
    $("#instrumentBrowser");

  if (!browser) {

    browser =
      document.createElement("aside");

    browser.id =
      "instrumentBrowser";

    browser.className =
      "instrument-browser";

    const lab =
      $(".beatlab");

    if (lab) {

      lab.prepend(browser);
    }
  }


  browser.innerHTML = `
    <div class="instrument-browser-header">

      <p class="eyebrow">
        SOUNDS
      </p>

      <h3>
        Instruments
      </h3>

    </div>

    <div class="instrument-list">

      ${instrumentCatalog.map(
        instrument => `

          <button
            class="instrument-button"
            data-instrument="${instrument.id}">

            <span>
              ${instrument.icon}
            </span>

            <strong>
              ${instrument.name}
            </strong>

          </button>
        `
      ).join("")}

    </div>

    <div
      class="sound-list"
      id="soundList">
    </div>
  `;


  browser.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-instrument]"
        );

      if (!button) {
        return;
      }


      const instrument =
        instrumentCatalog.find(
          item =>
            item.id ===
            button.dataset.instrument
        );


      if (instrument) {

        showInstrumentSounds(
          instrument
        );
      }
    }
  );
}


function showInstrumentSounds(
  instrument
) {

  GrooveDNA.selectedInstrument =
    instrument;

  const soundList =
    $("#soundList");

  if (!soundList) {
    return;
  }


  soundList.innerHTML = `
    <p class="eyebrow">
      ${escapeHTML(instrument.name)}
    </p>

    ${instrument.sounds.map(
      sound => `

        <div class="sound-item">

          <span>
            ${escapeHTML(sound)}
          </span>

          <button
            class="mini-play"
            data-sound-preview="${escapeHTML(sound)}">
            ▶
          </button>

          <button
            class="btn primary"
            data-add-sound="${escapeHTML(sound)}">
            +
          </button>

        </div>
      `
    ).join("")}
  `;


  soundList.addEventListener(
    "click",
    handleSoundListClick,
    { once: true }
  );
}


function handleSoundListClick(
  event
) {

  const preview =
    event.target.closest(
      "[data-sound-preview]"
    );

  const add =
    event.target.closest(
      "[data-add-sound]"
    );


  if (preview) {

    showToast(
      `Previewing ${preview.dataset.soundPreview}`
    );
  }


  if (add) {

    const sound =
      add.dataset.addSound;

    addInstrumentSound(
      GrooveDNA.selectedInstrument,
      sound
    );
  }
}


/* =========================================================
   35. ADD SAMPLE / SOUND TO BEAT
   ========================================================= */

function addSampleToBeatLab(sample) {

  GrooveDNA.currentBeat.clips.push({

    type: "sample",

    title: sample.title,

    bpm: sample.bpm,

    key: sample.key,

    cropStart:
      sample.cropStart || 0,

    cropEnd:
      sample.cropEnd || 100
  });


  const timeline =
    $("#timeline");


  if (timeline) {

    const lane =
      timeline.querySelector(
        ".track-lane:last-of-type"
      );


    if (lane) {

      const clip =
        document.createElement("div");

      clip.className =
        "clip melody";

      clip.textContent =
        sample.title;

      clip.title =
        sample.title;


      lane.appendChild(
        clip
      );
    }
  }


  showToast(
    `${sample.title} added to Beat Lab.`
  );
}


function addInstrumentSound(
  instrument,
  sound
) {

  if (!instrument) {
    return;
  }

  GrooveDNA.currentBeat.clips.push({

    type: "instrument",

    instrument:
      instrument.id,

    instrumentName:
      instrument.name,

    sound,

    time:
      Date.now()
  });

  showToast(
    `${sound} added to Beat Lab.`
  );
}

/* =========================================================
   36. BEAT LAB MODES
   ========================================================= */

function setupBeatLabModes() {

  let modeContainer =
    $("#beatModes");

  if (!modeContainer) {

    modeContainer =
      document.createElement("div");

    modeContainer.id =
      "beatModes";

    modeContainer.className =
      "beat-modes";

    const lab =
      $(".beatlab");

    if (lab) {
      lab.prepend(
        modeContainer
      );
    }
  }

  modeContainer.innerHTML = `
    <button
      class="beat-mode active"
      data-mode="mixer">
      🎚 Music Mixer
    </button>

    <button
      class="beat-mode"
      data-mode="drumpad">
      🥁 Drum Pad
    </button>

    <button
      class="beat-mode"
      data-mode="maker">
      🎼 Music Maker
    </button>
  `;

  modeContainer.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-mode]"
        );

      if (!button) {
        return;
      }

      $$(".beat-mode")
        .forEach(item =>
          item.classList.remove(
            "active"
          )
        );

      button.classList.add(
        "active"
      );

      GrooveDNA.beatMode =
        button.dataset.mode;

      showBeatMode(
        GrooveDNA.beatMode
      );
    }
  );
}


function showBeatMode(mode) {

  const label =
    mode === "mixer"
      ? "Music Mixer"
      : mode === "drumpad"
        ? "Drum Pad"
        : "Music Maker";

  renderBeatMode(mode);

  showToast(
    `Beat Lab switched to ${label}.`
  );
}


/* =========================================================
   37. BEAT LAB — INTERACTIVE MODE INTERFACES
   ========================================================= */

function getBeatModeHost() {

  const lab =
    $(".beatlab");

  if (!lab) {
    return null;
  }

  let host =
    $("#beatModeWorkspace", lab);

  if (!host) {

    host =
      document.createElement("div");

    host.id =
      "beatModeWorkspace";

    host.className =
      "beat-mode-workspace";

    lab.appendChild(host);
  }

  return host;
}


function renderMixerInterface() {

  const host =
    getBeatModeHost();

  if (!host) return;

  const channels = [
    ["Drums", "🥁", "drums"],
    ["Bass", "🎸", "bass"],
    ["Keys", "🎹", "keys"],
    ["Melody", "🎷", "melody"],
    ["Samples", "🎛", "samples"]
  ];

  host.innerHTML = `
    <section
      class="mixer-panel"
      aria-label="Music Mixer">

      <div class="mixer-header">

        <div>

          <p class="eyebrow">
            MIX
          </p>

          <h3>
            Music Mixer
          </h3>

          <p>
            Control volume, pan, mute and sound previews.
          </p>

        </div>

        <button
          class="btn secondary"
          type="button"
          id="mixerStopAll">
          Stop All
        </button>

      </div>

      <div class="mixer-channels">

        ${channels.map(
          ([name, icon, id]) => `

            <div class="mixer-channel">

              <div class="mixer-channel-top">

                <span class="mixer-icon">
                  ${icon}
                </span>

                <strong>
                  ${name}
                </strong>

              </div>

              <button
                class="mixer-preview"
                type="button"
                data-mixer-preview="${id}">
                ▶ Preview
              </button>

              <label>
                Volume

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value="0.8"
                  data-mixer-volume="${id}">
              </label>

              <label>
                Pan

                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value="0"
                  data-mixer-pan="${id}">
              </label>

              <button
                type="button"
                class="icon-btn"
                data-mixer-mute="${id}">
                M
              </button>

            </div>
          `
        ).join("")}

      </div>

    </section>
  `;

  channels.forEach(
    ([name, icon, id]) =>
      createMixerChannel(
        id,
        {
          volume: .8,
          pan: 0
        }
      )
  );

  host
    .querySelectorAll(
      "[data-mixer-volume]"
    )
    .forEach(
      input =>
        input.addEventListener(
          "input",
          () =>
            setChannelVolume(
              input.dataset.mixerVolume,
              input.value
            )
        )
    );

  host
    .querySelectorAll(
      "[data-mixer-pan]"
    )
    .forEach(
      input =>
        input.addEventListener(
          "input",
          () =>
            setChannelPan(
              input.dataset.mixerPan,
              input.value
            )
        )
    );

  host
    .querySelectorAll(
      "[data-mixer-mute]"
    )
    .forEach(
      button =>
        button.addEventListener(
          "click",
          () => {

            muteChannel(
              button.dataset.mixerMute
            );

            button.classList.toggle(
              "active"
            );
          }
        )
    );

  host
    .querySelectorAll(
      "[data-mixer-preview]"
    )
    .forEach(
      button =>
        button.addEventListener(
          "click",
          () =>
            previewMixerChannel(
              button.dataset.mixerPreview,
              button
            )
        )
    );

  $("#mixerStopAll")
    ?.addEventListener(
      "click",
      () =>
        showToast(
          "Mixer previews stopped."
        )
    );
}


function previewMixerChannel(
  id,
  button
) {

  resumeAudio();

  const channel =
    mixerChannels.get(id) ||
    createMixerChannel(
      id,
      {
        volume: .8,
        pan: 0
      }
    );

  const now =
    audioContext.currentTime;

  const osc =
    audioContext.createOscillator();

  const gain =
    audioContext.createGain();

  const frequencies = {
    drums: 110,
    bass: 55,
    keys: 220,
    melody: 330,
    samples: 165
  };

  const frequency =
    frequencies[id] || 220;

  osc.type =
    id === "bass"
      ? "sawtooth"
      : id === "keys"
        ? "triangle"
        : "sine";

  osc.frequency.value =
    frequency;

  gain.gain.setValueAtTime(
    .0001,
    now
  );

  gain.gain.exponentialRampToValueAtTime(
    .25,
    now + .02
  );

  gain.gain.exponentialRampToValueAtTime(
    .0001,
    now + .5
  );

  osc.connect(gain);

  gain.connect(
    channel.gain
  );

  osc.start(now);

  osc.stop(
    now + .55
  );

  button.classList.add(
    "active"
  );

  setTimeout(
    () =>
      button.classList.remove(
        "active"
      ),
    250
  );
}


/* =========================================================
   38. BEAT PLAYBACK
   ========================================================= */

function playBeat() {

  const clips =
    GrooveDNA.currentBeat.clips;

  if (!clips.length) {

    showToast(
      "Add sounds to your beat first."
    );

    return;
  }

  showToast(
    `Playing beat at ${GrooveDNA.currentBeat.bpm} BPM.`
  );
}


function stopBeat() {

  showToast(
    "Beat paused."
  );
}


// =======================================================
// 39. BEAT LAB PLAYBACK
// =======================================================

let beatLabPlaying = false;
let beatLabTimer = null;

function startBeatLab() {

  resumeAudio();

  if (beatLabPlaying) return;

  beatLabPlaying = true;

  if ($("#labPlay")) {

    $("#labPlay").textContent =
      "⏸";
  }

  scheduleBeatLab();
}


function stopBeatLab() {

  beatLabPlaying = false;

  if (beatLabTimer) {

    clearTimeout(
      beatLabTimer
    );

    beatLabTimer = null;
  }

  if ($("#labPlay")) {

    $("#labPlay").textContent =
      "▶";
  }
}


function scheduleBeatLab() {

  if (!beatLabPlaying) return;

  const bpm =
    Number(
      $("#bpm")?.value || 96
    );

  const beatLength =
    60000 / bpm;

  // This is the timing foundation.
  // Actual clips/patterns will be scheduled here.

  beatLabTimer =
    setTimeout(
      scheduleBeatLab,
      beatLength
    );
}


/* =========================================================
   40. RECORDING
   ========================================================= */

function setupBeatRecording() {

  let recordButton =
    $("#recordBeat");

  if (!recordButton) {

    recordButton =
      document.createElement(
        "button"
      );

    recordButton.id =
      "recordBeat";

    recordButton.className =
      "btn primary";

    recordButton.textContent =
      "● Record";

    const toolbar =
      $(".lab-toolbar");

    if (toolbar) {

      toolbar.appendChild(
        recordButton
      );
    }
  }

  recordButton.addEventListener(
    "click",
    toggleRecording
  );
}


async function toggleRecording() {

  if (GrooveDNA.isRecording) {

    GrooveDNA.mediaRecorder?.stop();

    return;
  }

  try {

    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });

    GrooveDNA.mediaRecorder =
      new MediaRecorder(
        stream
      );

    GrooveDNA.recordedChunks =
      [];

    GrooveDNA.mediaRecorder.ondataavailable =
      event => {

        if (event.data.size) {

          GrooveDNA.recordedChunks.push(
            event.data
          );
        }
      };

    GrooveDNA.mediaRecorder.onstop =
      () => {

        GrooveDNA.isRecording =
          false;

        stream
          .getTracks()
          .forEach(
            track =>
              track.stop()
          );

        showToast(
          "Recording saved."
        );
      };

    GrooveDNA.mediaRecorder.start();

    GrooveDNA.isRecording =
      true;

    showToast(
      "Recording started."
    );

  } catch (error) {

    console.error(
      "Recording error:",
      error
    );

    showToast(
      "⚠ Microphone access was not available."
    );
  }
}


  } catch (error) {

    console.error(
      "Recording error:",
      error
    );

    GrooveDNA.isRecording =
      false;

    const button =
      $("#recordBeat");

    if (button) {

      button.textContent =
        "● Record";
    }

    showToast(
      "⚠ Unable to access the microphone."
    );
  }
}


/* =========================================================
   41. DRUM PAD MACHINE
   ========================================================= */

const drumPadSounds = {
  kick: {
    frequency: 80,
    type: "sine"
  },

  snare: {
    frequency: 180,
    type: "triangle"
  },

  hat: {
    frequency: 6000,
    type: "square"
  },

  clap: {
    frequency: 1200,
    type: "sawtooth"
  },

  tom: {
    frequency: 140,
    type: "sine"
  },

  crash: {
    frequency: 3500,
    type: "square"
  }
};


function createDrumPadInterface() {

  const host =
    getBeatModeHost();

  if (!host) {
    return;
  }

  host.innerHTML = `
    <section
      class="drumpad-panel"
      aria-label="Drum Pad Machine">

      <div class="drumpad-header">

        <div>

          <p class="eyebrow">
            DRUMS
          </p>

          <h3>
            Drum Pad Machine
          </h3>

          <p>
            Tap the pads to generate drum sounds.
          </p>

        </div>

        <button
          type="button"
          class="btn secondary"
          id="clearDrumPads">
          Clear
        </button>

      </div>

      <div
        class="drum-pad-grid"
        id="drumPadGrid">

        <button
          type="button"
          class="drum-pad"
          data-drum="kick">
          <span>🥁</span>
          <strong>Kick</strong>
        </button>

        <button
          type="button"
          class="drum-pad"
          data-drum="snare">
          <span>🪘</span>
          <strong>Snare</strong>
        </button>

        <button
          type="button"
          class="drum-pad"
          data-drum="hat">
          <span>✨</span>
          <strong>Hi-Hat</strong>
        </button>

        <button
          type="button"
          class="drum-pad"
          data-drum="clap">
          <span>👏</span>
          <strong>Clap</strong>
        </button>

        <button
          type="button"
          class="drum-pad"
          data-drum="tom">
          <span>🥁</span>
          <strong>Tom</strong>
        </button>

        <button
          type="button"
          class="drum-pad"
          data-drum="crash">
          <span>💥</span>
          <strong>Crash</strong>
        </button>

      </div>

    </section>
  `;

  const grid =
    $("#drumPadGrid");

  grid?.addEventListener(
    "pointerdown",
    event => {

      const pad =
        event.target.closest(
          "[data-drum]"
        );

      if (!pad) {
        return;
      }

      playDrumSound(
        pad.dataset.drum
      );

      pad.classList.add(
        "active"
      );

      setTimeout(
        () =>
          pad.classList.remove(
            "active"
          ),
        120
      );
    }
  );

  $("#clearDrumPads")
    ?.addEventListener(
      "click",
      () => {

        showToast(
          "Drum Pad cleared."
        );
      }
    );
}


function playDrumSound(
  drum
) {

  resumeAudio();

  const sound =
    drumPadSounds[drum];

  if (!sound) {
    return;
  }

  const now =
    audioContext.currentTime;

  const oscillator =
    audioContext.createOscillator();

  const gain =
    audioContext.createGain();

  oscillator.type =
    sound.type;

  oscillator.frequency.setValueAtTime(
    sound.frequency,
    now
  );

  if (drum === "kick") {

    oscillator.frequency.exponentialRampToValueAtTime(
      35,
      now + .15
    );
  }

  if (
    drum === "snare" ||
    drum === "clap"
  ) {

    oscillator.frequency.exponentialRampToValueAtTime(
      80,
      now + .08
    );
  }

  gain.gain.setValueAtTime(
    .0001,
    now
  );

  gain.gain.exponentialRampToValueAtTime(
    .4,
    now + .005
  );

  gain.gain.exponentialRampToValueAtTime(
    .0001,
    now + .25
  );

  oscillator.connect(
    gain
  );

  gain.connect(
    audioContext.destination
  );

  oscillator.start(
    now
  );

  oscillator.stop(
    now + .3
  );
}


/* =========================================================
   42. MUSIC MAKER / SEQUENCER
   ========================================================= */

const sequencerSteps =
  16;

const sequencerRows = [
  "kick",
  "snare",
  "hat",
  "clap"
];

let sequencerPattern =
  {};

sequencerRows.forEach(
  row => {

    sequencerPattern[row] =
      new Array(
        sequencerSteps
      ).fill(false);
  }
);


function createMusicMakerInterface() {

  const host =
    getBeatModeHost();

  if (!host) {
    return;
  }

  host.innerHTML = `
    <section
      class="music-maker-panel"
      aria-label="Music Maker">

      <div class="music-maker-header">

        <div>

          <p class="eyebrow">
            CREATE
          </p>

          <h3>
            Music Maker
          </h3>

          <p>
            Build a beat by activating steps.
          </p>

        </div>

        <div class="sequencer-actions">

          <button
            type="button"
            class="btn primary"
            id="sequencerPlay">
            ▶ Play
          </button>

          <button
            type="button"
            class="btn secondary"
            id="sequencerClear">
            Clear
          </button>

        </div>

      </div>

      <div
        class="sequencer"
        id="sequencer">

        ${sequencerRows.map(
          row => `

            <div
              class="sequencer-row"
              data-row="${row}">

              <strong>
                ${row.toUpperCase()}
              </strong>

              <div class="sequencer-steps">

                ${Array.from(
                  {
                    length:
                      sequencerSteps
                  },
                  (_, index) => `

                    <button
                      type="button"
                      class="sequencer-step"
                      data-row="${row}"
                      data-step="${index}"
                      aria-label="${row} step ${index + 1}">
                    </button>

                  `
                ).join("")}

              </div>

            </div>

          `
        ).join("")}

      </div>

    </section>
  `;

  setupSequencerEvents();
}


function setupSequencerEvents() {

  const sequencer =
    $("#sequencer");

  if (!sequencer) {
    return;
  }

  sequencer.addEventListener(
    "click",
    event => {

      const step =
        event.target.closest(
          "[data-row][data-step]"
        );

      if (!step) {
        return;
      }

      const row =
        step.dataset.row;

      const index =
        Number(
          step.dataset.step
        );

      sequencerPattern[row][index] =
        !sequencerPattern[row][index];

      step.classList.toggle(
        "active",
        sequencerPattern[row][index]
      );

      if (
        sequencerPattern[row][index]
      ) {

        playDrumSound(
          row
        );
      }
    }
  );

  $("#sequencerClear")
    ?.addEventListener(
      "click",
      clearSequencer
    );

  $("#sequencerPlay")
    ?.addEventListener(
      "click",
      toggleSequencer
    );
}


function clearSequencer() {

  sequencerRows.forEach(
    row => {

      sequencerPattern[row] =
        new Array(
          sequencerSteps
        ).fill(false);
    }
  );

  $$(".sequencer-step")
    .forEach(
      step =>
        step.classList.remove(
          "active"
        )
    );

  showToast(
    "Music Maker cleared."
  );
}


let sequencerPlaying =
  false;

let sequencerTimer =
  null;

let sequencerPosition =
  0;


function toggleSequencer() {

  if (sequencerPlaying) {

    stopSequencer();

  } else {

    startSequencer();
  }
}


function startSequencer() {

  resumeAudio();

  if (sequencerPlaying) {
    return;
  }

  sequencerPlaying =
    true;

  sequencerPosition =
    0;

  const button =
    $("#sequencerPlay");

  if (button) {

    button.textContent =
      "⏸ Stop";
  }

  runSequencerStep();
}


function stopSequencer() {

  sequencerPlaying =
    false;

  if (sequencerTimer) {

    clearTimeout(
      sequencerTimer
    );

    sequencerTimer =
      null;
  }

  $$(".sequencer-step")
    .forEach(
      step =>
        step.classList.remove(
          "playing"
        )
    );

  const button =
    $("#sequencerPlay");

  if (button) {

    button.textContent =
      "▶ Play";
  }
}


function runSequencerStep() {

  if (!sequencerPlaying) {
    return;
  }

  const bpm =
    Number(
      $("#bpm")?.value || 96
    );

  const interval =
    60000 /
    bpm /
    4;

  $$(".sequencer-step")
    .forEach(
      step =>
        step.classList.remove(
          "playing"
        )
    );

  sequencerRows.forEach(
    row => {

      if (
        sequencerPattern[row]
          [sequencerPosition]
      ) {

        playDrumSound(
          row
        );

        const activeStep =
          $(
            `.sequencer-step[data-row="${row}"][data-step="${sequencerPosition}"]`
          );

        activeStep?.classList.add(
          "playing"
        );
      }
    }
  );

  sequencerPosition =
    (
      sequencerPosition + 1
    ) %
    sequencerSteps;

  sequencerTimer =
    setTimeout(
      runSequencerStep,
      interval
    );
}


/* =========================================================
   43. BEAT LAB MODE RENDERER
   ========================================================= */

function renderBeatMode(mode) {

  if (mode === "mixer") {

    renderMixerInterface();

    return;
  }

  if (mode === "drumpad") {

    createDrumPadInterface();

    return;
  }

  if (mode === "maker") {

    createMusicMakerInterface();

    return;
  }

  renderMixerInterface();
}


