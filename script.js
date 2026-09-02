
  /* =========================================================
   GROOVEDNA — MASTER SCRIPT
   =========================================================

   This file controls:

   1. Supabase authentication
      - Create Account
      - Sign In
      - Sign Out
      - Session checking
      - User profile creation

   2. Navigation
      - Page-to-page navigation
      - Mobile navigation

   3. Discover
      - Search
      - Genre filters
      - Play / Pause
      - Upload audio
      - Crop/sample workflow

   4. Beat Lab
      - Instrument browser
      - Sound browser
      - Play / Pause
      - Music Mixer
      - Drum Pad
      - Music Maker
      - Record
      - Save beat
      - Collaboration

   5. GrooveDNA
      - Mood buttons
      - Share DNA

   6. Library
      - Saved songs
      - Playlists
      - Artists

   7. Community
      - Likes
      - Comments
      - Follow
      - Remix
      - Challenges
      - Sharing

   8. Profile
      - User profile
      - Followers
      - Following
      - Settings
      - Sign out confirmation

   9. Messaging / Notifications
      - Notifications
      - Chat
      - Group chat
      - Voice/video call placeholders
      - Beat Lab collaboration invitations

   ========================================================= */


/* =========================================================
   1. SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";

const SUPABASE_PUBLISHABLE_KEY =
  "PASTE_YOUR_SB_PUBLISHABLE_KEY_HERE";


let supabaseClient = null;

if (
  window.supabase &&
  SUPABASE_URL !== "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE" &&
  SUPABASE_PUBLISHABLE_KEY !== "PASTE_YOUR_SB_PUBLISHABLE_KEY_HERE"
) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
}


/* =========================================================
   2. GLOBAL APP STATE
   ========================================================= */

const GrooveDNA = {
  user: null,
  session: null,

  authMode: "signin",

  currentPage:
    window.location.pathname.split("/").pop() || "index.html",

  currentAudio: null,
  currentAudioUrl: null,

  cropStart: 0,
  cropEnd: 0,

  selectedGenre: "All",
  searchTerm: "",

  selectedInstrument: null,
  selectedSound: null,

  beatMode: "mixer",

  isRecording: false,
  mediaRecorder: null,
  recordedChunks: [],

  currentBeat: {
    bpm: 96,
    pitch: 0,
    loop: true,
    clips: [],
    instruments: []
  }
};


/* =========================================================
   3. BASIC HELPERS
   ========================================================= */

function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPage() {
  return (
    window.location.pathname
      .split("/")
      .pop()
      .toLowerCase() || "index.html"
  );
}

function showToast(message) {
  let toast = $("#toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.__grooveToastTimer);

  window.__grooveToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function navigate(page) {
  window.location.href = page;
}


// =======================================================
// GROOVEDNA AUDIO ENGINE
// =======================================================

let audioContext = null;
let masterGain = null;
let audioBuffers = new Map();

function initAudioEngine() {
    if (audioContext) return;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = audioContext.createGain();
    masterGain.gain.value = 1;

    masterGain.connect(audioContext.destination);
}

async function resumeAudio() {
    initAudioEngine();

    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }
}

async function loadAudioFile(file) {
    await resumeAudio();

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const id = `upload-${Date.now()}`;
    audioBuffers.set(id, audioBuffer);

    return {
        id,
        name: file.name,
        buffer: audioBuffer,
        duration: audioBuffer.duration
    };
}

function playAudioBuffer(buffer, options = {}) {
    if (!buffer) return null;

    initAudioEngine();

    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();

    source.buffer = buffer;

    gain.gain.value =
        typeof options.volume === "number"
            ? options.volume
            : 1;

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
// AUDIO UPLOAD
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
   4. SUPABASE AUTHENTICATION
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
      error.message || "Unable to create your account."
    );

    return false;
  }
}


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

    await createUserProfile(
      data.user,
      data.user.user_metadata?.display_name
    );

    showToast("Welcome back!");

    navigate("home.html");

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
    navigate("index.html");
    return;
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

    showToast("Signed out.");

    setTimeout(() => {
      navigate("index.html");
    }, 400);

  } catch (error) {
    console.error("Sign out error:", error);

    showToast(
      error.message || "Unable to sign out."
    );
  }
}


/* =========================================================
   5. USER PROFILE CREATION
   ========================================================= */

async function createUserProfile(user, displayName = "") {
  if (!supabaseClient || !user) {
    return;
  }

  /*
    This expects a Supabase table named:

    profiles

    Recommended columns:

    id UUID PRIMARY KEY
    username TEXT
    display_name TEXT
    avatar_url TEXT
    bio TEXT
    created_at TIMESTAMP
  */

  try {
    const {
      data: existing,
      error: lookupError
    } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.warn(
        "Profile lookup:",
        lookupError.message
      );
      return;
    }

    if (!existing) {
      const username =
        displayName ||
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        `creator_${user.id.slice(0, 6)}`;

      const {
        error
      } = await supabaseClient
        .from("profiles")
        .insert({
          id: user.id,
          username,
          display_name: username
        });

      if (error) {
        console.warn(
          "Profile creation:",
          error.message
        );
      }
    }

  } catch (error) {
    console.warn(
      "Profile setup error:",
      error
    );
  }
}


/* =========================================================
   6. AUTH FORM
   ========================================================= */

function setupAuthForm() {
  const form = $("#authForm");

  if (!form) {
    return;
  }

  const toggle = $("#authModeToggle");
  const title = $("#authTitle");
  const submit = $("#authSubmit");
  const nameGroup = $("#authNameGroup");
  const toggleCopy = $("#authToggleCopy");

  function updateAuthUI() {
    const signup =
      GrooveDNA.authMode === "signup";

    if (title) {
      title.textContent = signup
        ? "Create your groove."
        : "Enter your groove.";
    }

    if (submit) {
      submit.textContent = signup
        ? "Create Account"
        : "Sign In";
    }

    if (nameGroup) {
      nameGroup.style.display =
        signup ? "block" : "none";
    }

    if (toggleCopy) {
      toggleCopy.innerHTML = signup
        ? `Already have an account?
           <a href="#" id="authModeToggle">
             Sign in
           </a>`
        : `New to GrooveDNA?
           <a href="#" id="authModeToggle">
             Create an account
           </a>`;

      const newToggle =
        $("#authModeToggle");

      if (newToggle) {
        newToggle.addEventListener(
          "click",
          event => {
            event.preventDefault();

            GrooveDNA.authMode =
              signup ? "signin" : "signup";

            updateAuthUI();
          }
        );
      }
    }
  }

  updateAuthUI();

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const email =
      $("#authEmail")?.value.trim();

    const password =
      $("#authPassword")?.value;

    const displayName =
      $("#authName")?.value.trim() || "";

    if (!email || !password) {
      showToast(
        "Enter your email and password."
      );
      return;
    }

    if (password.length < 6) {
      showToast(
        "Password must be at least 6 characters."
      );
      return;
    }

    submit.disabled = true;

    if (GrooveDNA.authMode === "signup") {
      await createAccount(
        email,
        password,
        displayName
      );
    } else {
      await signIn(
        email,
        password
      );
    }

    submit.disabled = false;
  });


  /*
    Sign In button on landing page
  */

  $("#signInLink")?.addEventListener(
    "click",
    event => {
      event.preventDefault();

      GrooveDNA.authMode = "signin";

      updateAuthUI();

      window.location.hash = "auth";
    }
  );


  /*
    Create Account button
  */

  $("#createAccountLink")?.addEventListener(
    "click",
    event => {
      event.preventDefault();

      GrooveDNA.authMode = "signup";

      updateAuthUI();

      window.location.hash = "auth";
    }
  );
}


/* =========================================================
   7. SESSION PROTECTION
   ========================================================= */

async function protectPrivatePages() {
  const publicPages = [
    "index.html",
    ""
  ];

  const page = getPage();

  if (
    !supabaseClient ||
    publicPages.includes(page)
  ) {
    return;
  }

  const session =
    await getCurrentSession();

  if (!session) {
    showToast(
      "Please sign in to use GrooveDNA."
    );

    setTimeout(() => {
      navigate("index.html");
    }, 500);
  }
}


function watchAuthentication() {
  if (!supabaseClient) {
    return;
  }

  supabaseClient.auth.onAuthStateChange(
    (event, session) => {

      GrooveDNA.session = session;
      GrooveDNA.user =
        session?.user || null;

      console.log(
        "GrooveDNA auth:",
        event
      );
    }
  );
}


/* =========================================================
   8. GLOBAL SIGN OUT BUTTONS
   ========================================================= */

function setupSignOutButtons() {
  const buttons =
    $$(
      '[href="index.html"]'
    ).filter(element =>
      /sign\s*out/i.test(
        element.textContent
      )
    );

  buttons.forEach(button => {
    button.addEventListener(
      "click",
      async event => {
        event.preventDefault();

        const confirmed =
          await showConfirmation(
            "Sign out?",
            "Are you sure you want to sign out?"
          );

        if (confirmed) {
          await signOut();
        }
      }
    );
  });

  /*
    Profile-specific sign-out buttons
  */

  $$(
    "[data-signout]"
  ).forEach(button => {
    button.addEventListener(
      "click",
      async () => {

        const confirmed =
          await showConfirmation(
            "Sign out?",
            "Are you sure you want to sign out?"
          );

        if (confirmed) {
          await signOut();
        }
      }
    );
  });
}


/* =========================================================
   9. CONFIRMATION DIALOG
   ========================================================= */

function showConfirmation(title, message) {
  return new Promise(resolve => {

    const existing =
      $("#grooveConfirmation");

    if (existing) {
      existing.remove();
    }

    const modal =
      document.createElement("div");

    modal.id =
      "grooveConfirmation";

    modal.className =
      "modal-backdrop";

    modal.innerHTML = `
      <div class="modal confirmation-modal">
        <p class="eyebrow">GROOVEDNA</p>
        <h2>${escapeHTML(title)}</h2>
        <p>${escapeHTML(message)}</p>

        <div class="modal-actions">
          <button
            class="btn secondary"
            id="confirmNo">
            No
          </button>

          <button
            class="btn primary"
            id="confirmYes">
            Yes
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    $("#confirmNo").onclick = () => {
      modal.remove();
      resolve(false);
    };

    $("#confirmYes").onclick = () => {
      modal.remove();
      resolve(true);
    };
  });
}


/* =========================================================
   10. PAGE NAVIGATION
   ========================================================= */

function setupNavigation() {

  const pageMap = {
    home: "home.html",
    discover: "discover.html",
    groovedna: "groovedna.html",
    beatlab: "beatlab.html",
    community: "community.html",
    library: "library.html",
    profile: "profile.html"
  };

  $$("[data-page]").forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const page =
          button.dataset.page;

        if (pageMap[page]) {
          navigate(pageMap[page]);
        }
      }
    );
  });


  /*
    Mobile navigation
  */

  const menuToggle =
    $("#menuToggle");

  const mainNav =
    $("#mainNav");

  if (menuToggle && mainNav) {

    menuToggle.addEventListener(
      "click",
      () => {

        const open =
          mainNav.classList.toggle(
            "open"
          );

        menuToggle.setAttribute(
          "aria-expanded",
          String(open)
        );
      }
    );
  }
}


/* =========================================================
   11. DISCOVER — MUSIC CATALOG
   ========================================================= */

const sampleCatalog = [

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
  }

];


/* =========================================================
   12. DISCOVER — FILTERING
   ========================================================= */

function filteredSamples() {

  return sampleCatalog.filter(sample => {

    const genreMatch =
      GrooveDNA.selectedGenre === "All" ||
      sample.genre === GrooveDNA.selectedGenre;

    const term =
      GrooveDNA.searchTerm.toLowerCase();

    const searchMatch =
      !term ||
      [
        sample.title,
        sample.artist,
        sample.genre,
        sample.type,
        sample.key
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);

    return genreMatch && searchMatch;
  });
}


/* =========================================================
   13. RIGHTS CLASS
   ========================================================= */

function rightsClass(rights) {

  if (
    rights
      ?.toLowerCase()
      .startsWith("cleared")
  ) {
    return "cleared";
  }

  if (
    rights === "Restricted"
  ) {
    return "restricted";
  }

  return "caution";
}


/* =========================================================
   14. RENDER SAMPLES
   ========================================================= */

function renderSamples() {

  const grid =
    $("#sampleGrid");

  const count =
    $("#resultCount");

  if (!grid) {
    return;
  }

  const results =
    filteredSamples();

  if (count) {
    count.textContent =
      `${results.length} sounds found`;
  }

  if (!results.length) {

    grid.innerHTML = `
      <div class="empty-state">
        <h3>No sounds found</h3>
        <p>
          Try another search or genre.
        </p>
      </div>
    `;

    return;
  }

  grid.innerHTML =
    results.map(sample => `

      <article
        class="sample-card"
        data-sample-id="${sample.id}"
      >

        <div class="sample-art">

          <div class="sample-icon">
            ${sample.icon}
          </div>

          <span class="genre-tag">
            ${escapeHTML(sample.genre)}
          </span>

        </div>

        <div class="sample-info">

          <p class="eyebrow">
            ${escapeHTML(sample.type)}
          </p>

          <h3>
            ${escapeHTML(sample.title)}
          </h3>

          <p>
            ${escapeHTML(sample.artist)}
          </p>

          <div class="sample-meta">
            ${sample.bpm} BPM
            •
            ${escapeHTML(sample.key)}
          </div>

          <div class="sample-rights">

            <span
              class="rights-badge ${rightsClass(sample.rights)}"
            >
              ${escapeHTML(sample.rights)}
            </span>

          </div>

          <div class="sample-actions">

            <button
              class="btn primary"
              data-preview="${sample.id}"
            >
              ▶ Preview
            </button>

            <button
              class="btn secondary"
              data-save="${sample.id}"
            >
              Save
            </button>

            <button
              class="btn secondary"
              data-add="${sample.id}"
            >
              Add to Beat Lab
            </button>

          </div>

        </div>

      </article>

    `).join("");
}


/* =========================================================
   15. DISCOVER — SEARCH
   ========================================================= */

function runSearch() {

  const input =
    $("#searchInput");

  GrooveDNA.searchTerm =
    input?.value.trim() || "";

  renderSamples();

  document
    .querySelector(".content-section")
    ?.scrollIntoView({
      behavior: "smooth"
    });
}


function setupDiscover() {

  const searchButton =
    $("#searchBtn");

  const searchInput =
    $("#searchInput");

  searchButton?.addEventListener(
    "click",
    runSearch
  );

  searchInput?.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        runSearch();
      }
    }
  );


  $$("#genreFilters .filter")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          $$("#genreFilters .filter")
            .forEach(item =>
              item.classList.remove(
                "active"
              )
            );

          button.classList.add(
            "active"
          );

          GrooveDNA.selectedGenre =
            button.dataset.genre ||
            "All";

          renderSamples();
        }
      );
    });


  const sampleGrid =
    $("#sampleGrid");

  sampleGrid?.addEventListener(
    "click",
    event => {

      const preview =
        event.target.closest(
          "[data-preview]"
        );

      const save =
        event.target.closest(
          "[data-save]"
        );

      const add =
        event.target.closest(
          "[data-add]"
        );


      if (preview) {

        const sample =
          sampleCatalog.find(
            item =>
              String(item.id) ===
              String(
                preview.dataset.preview
              )
          );

        if (sample) {

          showToast(
            `▶ Previewing ${sample.title}`
          );

          preview.textContent =
            "⏸ Playing...";

          setTimeout(() => {

            preview.textContent =
              "▶ Preview";

          }, 1500);
        }

        return;
      }


      if (save) {

        const id =
          Number(save.dataset.save);

        const saved =
          JSON.parse(
            localStorage.getItem(
              "grooveDNA_saved"
            ) || "[]"
          );

        if (!saved.includes(id)) {

          saved.push(id);

          localStorage.setItem(
            "grooveDNA_saved",
            JSON.stringify(saved)
          );

          showToast(
            "✓ Saved to your Library."
          );

        } else {

          showToast(
            "Already saved."
          );
        }

        return;
      }


      if (add) {

        const sample =
          sampleCatalog.find(
            item =>
              String(item.id) ===
              String(
                add.dataset.add
              )
          );

        if (!sample) {
          return;
        }

        const timeline =
          $("#timeline");

        const empty =
          $("#labEmpty");

        const melody =
          timeline?.querySelector(
            ".track.melody"
          );

        if (empty) {
          empty.style.display =
            "none";
        }

        if (melody) {

          const clip =
            document.createElement(
              "div"
            );

          clip.className =
            "clip melody";

          clip.textContent =
            sample.title;

          clip.title =
            sample.title;

          clip.style.width =
            `${120 + Math.random() * 120}px`;

          melody.appendChild(
            clip
          );
        }

        showToast(
          `✓ ${sample.title} added to Beat Lab.`
        );
      }

    }
  );
}


/* =========================================================
   16. BEAT LAB — BASIC CONTROLS
   ========================================================= */

function setupBeatLab() {

  const bpm =
    $("#bpm");

  const bpmValue =
    $("#bpmValue");

  const pitch =
    $("#pitch");

  const pitchValue =
    $("#pitchValue");

  const labPlay =
    $("#labPlay");

  const saveBeat =
    $("#saveBeat");

  const clearLab =
    $("#clearLab");


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


  labPlay?.addEventListener(
    "click",
    async () => {

      await resumeAudio();

      const playing =
        labPlay.dataset.playing === "true";

      if (playing) {

        labPlay.dataset.playing =
          "false";

        labPlay.textContent =
          "▶";

        showToast(
          "Beat Lab stopped."
        );

      } else {

        labPlay.dataset.playing =
          "true";

        labPlay.textContent =
          "⏸";

        showToast(
          "Beat Lab playing."
        );
      }
    }
  );


  saveBeat?.addEventListener(
    "click",
    () => {

      localStorage.setItem(
        "grooveDNA_beatSaved",
        "true"
      );

      showToast(
        "✓ Beat idea saved!"
      );
    }
  );


  clearLab?.addEventListener(
    "click",
    () => {

      $$("#timeline .clip")
        .forEach(
          clip => clip.remove()
        );

      const empty =
        $("#labEmpty");

      if (empty) {
        empty.style.display =
          "block";
      }

      showToast(
        "Beat Lab cleared."
      );
    }
  );
}


/* =========================================================
   17. GROOVEDNA MOOD SYSTEM
   ========================================================= */

function setupGrooveDNA() {

  $$("[data-mood]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          $$("[data-mood]")
            .forEach(item =>
              item.classList.remove(
                "active"
              )
            );

          button.classList.add(
            "active"
          );

          GrooveDNA.currentMood =
            button.dataset.mood;

          showToast(
            `Mood selected: ${button.dataset.mood}`
          );
        }
      );
    });


  $("#shareDNA")
    ?.addEventListener(
      "click",
      async () => {

        const mood =
          GrooveDNA.currentMood ||
          "Unknown";

        const text =
          `My GrooveDNA mood is ${mood}.`;

        try {

          if (
            navigator.share
          ) {

            await navigator.share({
              title: "My GrooveDNA",
              text
            });

          } else {

            await navigator.clipboard.writeText(
              text
            );

            showToast(
              "✓ GrooveDNA copied."
            );
          }

        } catch (error) {

          console.warn(
            "Share cancelled:",
            error
          );
        }
      }
    );
}


/* =========================================================
   18. LIBRARY
   ========================================================= */

function setupLibrary() {

  const saved =
    JSON.parse(
      localStorage.getItem(
        "grooveDNA_saved"
      ) || "[]"
    );

  GrooveDNA.savedSamples =
    saved;


  $$("[data-playlist]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const playlist =
            button.dataset.playlist;

          showToast(
            `Opening ${playlist} playlist.`
          );
        }
      );
    });
}


/* =========================================================
   19. PROFILE
   ========================================================= */

async function setupProfile() {

  if (!supabaseClient) {
    return;
  }

  if (!GrooveDNA.user) {
    return;
  }

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", GrooveDNA.user.id)
    .maybeSingle();

  if (error) {

    console.warn(
      "Profile load:",
      error.message
    );

    return;
  }

  if (!data) {
    return;
  }

  $("#profileName") &&
    ($("#profileName").textContent =
      data.display_name ||
      data.username ||
      "Creator");

  $("#profileBio") &&
    ($("#profileBio").textContent =
      data.bio ||
      "Building grooves.");
}


/* =========================================================
   20. COMMUNITY
   ========================================================= */

function setupCommunity() {

  $$("[data-like]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const liked =
            button.dataset.liked === "true";

          button.dataset.liked =
            String(!liked);

          button.textContent =
            liked
              ? "♡ Like"
              : "♥ Liked";
        }
      );
    });


  $$("[data-follow]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const following =
            button.dataset.following === "true";

          button.dataset.following =
            String(!following);

          button.textContent =
            following
              ? "Follow"
              : "Following";
        }
      );
    });


  $$("[data-remix]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          showToast(
            "✓ Remix added to your Beat Lab."
          );
        }
      );
    });


  $("#challengeBtn")
    ?.addEventListener(
      "click",
      () => {

        showToast(
          "Challenge mode opened."
        );
      }
    );
}


/* =========================================================
   21. MESSAGING
   ========================================================= */

function setupMessaging() {

  const send =
    $("#sendMessage");

  const input =
    $("#chatInput");

  const messages =
    $("#chatMessages");


  send?.addEventListener(
    "click",
    () => {

      if (!input || !messages) {
        return;
      }

      if (!input.value.trim()) {
        return;
      }

      const message =
        document.createElement(
          "div"
        );

      message.className =
        "chat-message";

      message.textContent =
        input.value.trim();

      messages.appendChild(
        message
      );

      input.value = "";
    }
  );


  input?.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        send?.click();
      }
    }
  );


  $("#voiceCall")
    ?.addEventListener(
      "click",
      () => {

        showToast(
          "Voice calling requires a realtime calling service."
        );
      }
    );


  $("#videoCall")
    ?.addEventListener(
      "click",
      () => {

        showToast(
          "Video calling requires WebRTC/signaling setup."
        );
      }
    );
}


/* =========================================================
   22. GLOBAL INITIALIZATION
   ========================================================= */

async function initGrooveDNA() {

  /*
    Initialize authentication first.
  */

  if (supabaseClient) {

    await getCurrentSession();

    watchAuthentication();
  }


  /*
    Public landing page
  */

  setupAuthForm();


  /*
    General navigation
  */

  setupNavigation();


  /*
    Authentication
  */

  setupSignOutButtons();


  /*
    Private page protection
  */

  await protectPrivatePages();


  /*
    Discover
  */

  setupDiscover();


  /*
    Audio
  */

  setupAudioUpload();


  /*
    Beat Lab
  */

  setupBeatLab();


  /*
    GrooveDNA
  */

  setupGrooveDNA();


  /*
    Community
  */

  setupCommunity();


  /*
    Library
  */

  setupLibrary();


  /*
    Profile
  */

  await setupProfile();


  /*
    Messages / notifications
  */

  setupMessaging();


  console.log(
    "GrooveDNA initialized.",
    {
      page:
        getPage(),

      authenticated:
        Boolean(GrooveDNA.user)
    }
  );
}


/* =========================================================
   23. MUSICBRAINZ
   ========================================================= */

const MUSICBRAINZ_API =
  "https://musicbrainz.org/ws/2";

const MUSICBRAINZ_HEADERS = {
  Accept: "application/json"
};


/* =========================================================
   24. MUSICBRAINZ SEARCH
   ========================================================= */

async function searchMusicBrainz(searchTerm) {

  if (
    !searchTerm ||
    !searchTerm.trim()
  ) {
    return [];
  }

  const query =
    encodeURIComponent(
      searchTerm.trim()
    );

  const url =
    `${MUSICBRAINZ_API}/recording/?query=${query}&fmt=json&limit=10`;

  try {

    const response =
      await safeMusicBrainzFetch(
        url
      );

    if (!response.ok) {

      throw new Error(
        `MusicBrainz error: ${response.status}`
      );
    }

    const data =
      await response.json();

    return data.recordings || [];

  } catch (error) {

    console.error(
      "MusicBrainz search failed:",
      error
    );

    return [];
  }
}


/* =========================================================
   25. MUSICBRAINZ ARTISTS
   ========================================================= */

async function searchMusicBrainzArtists(
  searchTerm
) {

  if (
    !searchTerm ||
    !searchTerm.trim()
  ) {
    return [];
  }

  const query =
    encodeURIComponent(
      searchTerm.trim()
    );

  const url =
    `${MUSICBRAINZ_API}/artist/?query=${query}&fmt=json&limit=10`;

  try {

    const response =
      await safeMusicBrainzFetch(
        url
      );

    if (!response.ok) {

      throw new Error(
        `MusicBrainz error: ${response.status}`
      );
    }

    const data =
      await response.json();

    return data.artists || [];

  } catch (error) {

    console.error(
      "MusicBrainz artist search failed:",
      error
    );

    return [];
  }
}


/* =========================================================
   26. SUPABASE — LOAD TRACKS
   ========================================================= */

async function fetchTracksFromDatabase() {

  if (!supabaseClient) {
    return [];
  }

  const {
    data: tracks,
    error
  } = await supabaseClient
    .from("tracks")
    .select("*")
    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (error) {

    console.error(
      "Error fetching tracks:",
      error
    );

    return [];
  }

  return tracks || [];
}


/* =========================================================
   27. SUPABASE — SAVE MUSICBRAINZ TRACK
   ========================================================= */

async function saveMusicBrainzTrack(
  recording
) {

  if (
    !recording ||
    !supabaseClient
  ) {
    return null;
  }

  const artist =
    recording["artist-credit"]?.[0]?.name ||
    "Unknown Artist";

  const title =
    recording.title ||
    "Unknown Track";

  const musicbrainzId =
    recording.id || null;

  const trackData = {

    title,

    artist,

    genre:
      recording.tags?.[0]?.name ||
      "Unknown",

    musicbrainz_id:
      musicbrainzId,

    created_at:
      new Date().toISOString()
  };

  const {
    data,
    error
  } = await supabaseClient
    .from("tracks")
    .insert([
      trackData
    ])
    .select();

  if (error) {

    console.error(
      "Error saving MusicBrainz track:",
      error
    );

    return null;
  }

  return data?.[0] || null;
}


/* =========================================================
   28. DATABASE TRACK UI
   ========================================================= */

async function loadDatabaseTracksUI() {

  const sampleContainer =
    document.querySelector(
      ".sample-grid"
    ) ||
    document.querySelector(
      "#sampleGrid"
    );

  if (!sampleContainer) {
    return;
  }

  const tracks =
    await fetchTracksFromDatabase();

  if (!tracks.length) {
    return;
  }

  sampleContainer.innerHTML =
    tracks.map(track => {

      const title =
        escapeHTML(
          track.title ||
          "Unknown Track"
        );

      const artist =
        escapeHTML(
          track.artist ||
          "Unknown Artist"
        );

      const genre =
        escapeHTML(
          track.genre ||
          "General"
        );

      return `
        <article
          class="sample-card"
          data-genre="${genre}"
        >

          <div class="sample-art">

            ${
              track.cover_art_url
              ? `
                <img
                  src="${escapeAttribute(track.cover_art_url)}"
                  alt="${title}"
                >
              `
              : `
                <div class="sample-icon">
                  🎵
                </div>
              `
            }

            <span class="genre-tag">
              ${genre}
            </span>

          </div>

          <div class="sample-info">

            <h3>${title}</h3>

            <p>
              ${artist}
              ${
                track.bpm
                ? ` • ${track.bpm} BPM`
                : ""
              }
              ${
                track.key_signature
                ? ` • ${escapeHTML(track.key_signature)}`
                : ""
              }
            </p>

            <div class="sample-actions">

              <button
                class="btn primary play-btn"
                onclick="startTrack(
                  '${escapeJS(title)}',
                  '${escapeJS(artist)}'
                )"
              >
                Play
              </button>

              <button
                class="btn secondary"
                onclick="saveTrack('${escapeJS(title)}')"
              >
                Save
              </button>

            </div>

          </div>

        </article>
      `;

    }).join("");
}


/* =========================================================
   29. MUSIC SEARCH UI
   ========================================================= */

async function searchMusic(
  searchTerm
) {

  const resultsContainer =
    document.querySelector(
      "#musicResults"
    );

  if (!resultsContainer) {
    return;
  }

  resultsContainer.innerHTML =
    "<p>Searching MusicBrainz...</p>";

  const results =
    await searchMusicBrainz(
      searchTerm
    );

  if (!results.length) {

    resultsContainer.innerHTML =
      "<p>No music found.</p>";

    return;
  }

  resultsContainer.innerHTML =
    results.map(recording => {

      const artist =
        recording["artist-credit"]?.[0]?.name ||
        "Unknown Artist";

      const title =
        recording.title ||
        "Unknown Track";

      return `
        <div class="music-result">

          <h3>
            ${escapeHTML(title)}
          </h3>

          <p>
            ${escapeHTML(artist)}
          </p>

          <button
            class="btn primary"
            onclick='saveMusicBrainzResult(
              ${JSON.stringify(recording)}
            )'
          >
            Add to GrooveDNA
          </button>

        </div>
      `;

    }).join("");
}


/* =========================================================
   30. SAVE MUSICBRAINZ RESULT
   ========================================================= */

async function saveMusicBrainzResult(
  recording
) {

  const saved =
    await saveMusicBrainzTrack(
      recording
    );

  if (saved) {

    showToast(
      "✓ Track added to GrooveDNA."
    );

  } else {

    showToast(
      "⚠ Unable to save track."
    );
  }
}


/* =========================================================
   31. MUSICBRAINZ SEARCH CONTROLS
   ========================================================= */

function setupMusicBrainz() {

  const searchButton =
    $("#musicSearchBtn");

  const searchInput =
    $("#musicSearchInput");

  if (!searchButton || !searchInput) {
    return;
  }

  searchButton.addEventListener(
    "click",
    async () => {

      const query =
        searchInput.value.trim();

      if (!query) {

        showToast(
          "Enter a song, artist, or recording."
        );

        return;
      }

      await searchMusic(query);
    }
  );


  searchInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        searchButton.click();
      }
    }
  );
}


/* =========================================================
   32. DRUM PAD ENGINE
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
    frequency: 7000,
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

  perc: {
    frequency: 350,
    type: "triangle"
  }

};


function playDrumSound(
  type
) {

  const sound =
    drumPadSounds[type];

  if (!sound) {
    return;
  }

  initAudioEngine();

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

  gain.gain.setValueAtTime(
    0.0001,
    now
  );

  gain.gain.exponentialRampToValueAtTime(
    0.7,
    now + 0.01
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.18
  );

  oscillator.connect(gain);

  gain.connect(
    masterGain
  );

  oscillator.start(now);

  oscillator.stop(
    now + 0.2
  );
}


/* =========================================================
   33. DRUM PAD UI
   ========================================================= */

function setupDrumPad() {

  $$("[data-drum]")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          await resumeAudio();

          const type =
            button.dataset.drum;

          playDrumSound(
            type
          );

          button.classList.add(
            "active"
          );

          setTimeout(() => {

            button.classList.remove(
              "active"
            );

          }, 100);
        }
      );
    });
}


/* =========================================================
   34. MUSIC MAKER SYNTH
   ========================================================= */

function playSynthNote(
  frequency,
  duration = 0.5
) {

  initAudioEngine();

  const now =
    audioContext.currentTime;

  const oscillator =
    audioContext.createOscillator();

  const gain =
    audioContext.createGain();

  oscillator.type =
    "sawtooth";

  oscillator.frequency.setValueAtTime(
    frequency,
    now
  );

  gain.gain.setValueAtTime(
    0.0001,
    now
  );

  gain.gain.exponentialRampToValueAtTime(
    0.4,
    now + 0.02
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + duration
  );

  oscillator.connect(
    gain
  );

  gain.connect(
    masterGain
  );

  oscillator.start(
    now
  );

  oscillator.stop(
    now + duration + 0.05
  );
}


/* =========================================================
   35. MUSIC MAKER KEYBOARD
   ========================================================= */

const synthNotes = {

  C: 261.63,
  D: 293.66,
  E: 329.63,
  F: 349.23,
  G: 392.00,
  A: 440.00,
  B: 493.88,

  C2: 523.25

};


function setupMusicMaker() {

  $$("[data-note]")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          await resumeAudio();

          const note =
            button.dataset.note;

          const frequency =
            synthNotes[note];

          if (!frequency) {
            return;
          }

          playSynthNote(
            frequency
          );

          button.classList.add(
            "active"
          );

          setTimeout(() => {

            button.classList.remove(
              "active"
            );

          }, 120);
        }
      );
    });
}


/* =========================================================
   36. MUSIC MIXER
   ========================================================= */

function setupMixer() {

  $$("[data-mixer-volume]")
    .forEach(slider => {

      slider.addEventListener(
        "input",
        () => {

          const value =
            Number(slider.value);

          const channel =
            slider.dataset.mixerVolume;

          const channelGain =
            document.querySelector(
              `[data-channel-gain="${channel}"]`
            );

          if (channelGain) {

            channelGain.style.width =
              `${value * 100}%`;
          }
        }
      );
    });


  $$("[data-mixer-mute]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const channel =
            button.dataset.mixerMute;

          const muted =
            button.dataset.muted === "true";

          button.dataset.muted =
            String(!muted);

          button.textContent =
            muted
              ? "Mute"
              : "Unmute";

          showToast(
            muted
              ? `${channel} unmuted.`
              : `${channel} muted.`
          );
        }
      );
    });
}


/* =========================================================
   37. BEAT LAB MODES
   ========================================================= */

function setupBeatModes() {

  $$("[data-beat-mode]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const mode =
            button.dataset.beatMode;

          GrooveDNA.beatMode =
            mode;

          $$("[data-beat-mode]")
            .forEach(item =>
              item.classList.remove(
                "active"
              )
            );

          button.classList.add(
            "active"
          );

          $$("[data-mode-panel]")
            .forEach(panel => {

              panel.style.display =
                panel.dataset.modePanel === mode
                  ? "block"
                  : "none";
            });
        }
      );
    });
}


/* =========================================================
   38. RECORDING
   ========================================================= */

async function startRecording() {

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    showToast(
      "Microphone recording is not supported."
    );

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

        if (
          event.data.size > 0
        ) {

          GrooveDNA.recordedChunks.push(
            event.data
          );
        }
      };


    GrooveDNA.mediaRecorder.onstop =
      () => {

        const blob =
          new Blob(
            GrooveDNA.recordedChunks,
            {
              type: "audio/webm"
            }
          );

        const url =
          URL.createObjectURL(
            blob
          );

        window.grooveDNARecording =
          {
            blob,
            url
          };

        showToast(
          "✓ Recording created."
        );

        stream
          .getTracks()
          .forEach(
            track =>
              track.stop()
          );
      };


    GrooveDNA.mediaRecorder.start();

    GrooveDNA.isRecording =
      true;

    showToast(
      "● Recording..."
    );

  } catch (error) {

    console.error(
      "Recording error:",
      error
    );

    showToast(
      "⚠ Unable to access microphone."
    );
  }
}


function stopRecording() {

  if (
    GrooveDNA.mediaRecorder &&
    GrooveDNA.isRecording
  ) {

    GrooveDNA.mediaRecorder.stop();

    GrooveDNA.isRecording =
      false;
  }
}


/* =========================================================
   39. RECORD BUTTON
   ========================================================= */

function setupRecording() {

  $$("[data-record]")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          if (
            GrooveDNA.isRecording
          ) {

            stopRecording();

            button.textContent =
              "Record";

          } else {

            await startRecording();

            button.textContent =
              "Stop";
          }
        }
      );
    });
}


/* =========================================================
   40. GLOBAL SEARCH
   ========================================================= */

function setupGlobalSearch() {

  const input =
    $("#globalSearch");

  const button =
    $("#globalSearchBtn");

  if (!input || !button) {
    return;
  }

  button.addEventListener(
    "click",
    () => {

      const term =
        input.value.trim();

      if (!term) {
        return;
      }

      GrooveDNA.searchTerm =
        term;

      navigate(
        `discover.html?search=${encodeURIComponent(term)}`
      );
    }
  );


  input.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        button.click();
      }
    }
  );
}


/* =========================================================
   41. URL SEARCH PARAMETER
   ========================================================= */

function applyURLSearch() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const search =
    params.get("search");

  if (!search) {
    return;
  }

  GrooveDNA.searchTerm =
    search;

  const input =
    $("#searchInput");

  if (input) {
    input.value =
      search;
  }

  renderSamples();
}


/* =========================================================
   42. SAVED TRACK HELPERS
   ========================================================= */

function saveTrack(
  title
) {

  const saved =
    JSON.parse(
      localStorage.getItem(
        "grooveDNA_saved_tracks"
      ) || "[]"
    );

  if (
    !saved.includes(title)
  ) {

    saved.push(title);

    localStorage.setItem(
      "grooveDNA_saved_tracks",
      JSON.stringify(saved)
    );

    showToast(
      "✓ Track saved."
    );

  } else {

    showToast(
      "Track already saved."
    );
  }
}


function startTrack(
  title,
  artist
) {

  showToast(
    `▶ Playing ${title} — ${artist}`
  );
}


/* =========================================================
   43. ACCESSIBILITY
   ========================================================= */

function setupAccessibility() {

  $$("button")
    .forEach(button => {

      if (
        !button.getAttribute(
          "aria-label"
        ) &&
        !button.textContent.trim()
      ) {

        button.setAttribute(
          "aria-label",
          "Button"
        );
      }
    });
}


/* =========================================================
   44. KEYBOARD SHORTCUTS
   ========================================================= */

function setupKeyboardShortcuts() {

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.target.matches(
          "input, textarea"
        )
      ) {
        return;
      }


      if (
        event.code === "Space"
      ) {

        const play =
          $("#labPlay");

        if (play) {

          event.preventDefault();

          play.click();
        }
      }


      if (
        event.key.toLowerCase() === "r"
      ) {

        const record =
          $("[data-record]");

        if (record) {
          record.click();
        }
      }
    }
  );
}


/* =========================================================
   45. OFFLINE / ONLINE STATUS
   ========================================================= */

function setupNetworkStatus() {

  function updateStatus() {

    if (
      navigator.onLine
    ) {

      document.body.classList.remove(
        "offline"
      );

    } else {

      document.body.classList.add(
        "offline"
      );

      showToast(
        "You are offline."
      );
    }
  }

  window.addEventListener(
    "online",
    updateStatus
  );

  window.addEventListener(
    "offline",
    updateStatus
  );

  updateStatus();
}


/* =========================================================
   46. SAFE LOCAL STORAGE
   ========================================================= */

function safeStorageGet(
  key,
  fallback = null
) {

  try {

    const value =
      localStorage.getItem(
        key
      );

    return value === null
      ? fallback
      : value;

  } catch (error) {

    console.warn(
      "localStorage read failed:",
      error
    );

    return fallback;
  }
}


function safeStorageSet(
  key,
  value
) {

  try {

    localStorage.setItem(
      key,
      value
    );

    return true;

  } catch (error) {

    console.warn(
      "localStorage write failed:",
      error
    );

    return false;
  }
}


/* =========================================================
   47. ERROR HANDLING
   ========================================================= */

window.addEventListener(
  "error",
  event => {

    console.error(
      "GrooveDNA global error:",
      event.error
    );
  }
);


window.addEventListener(
  "unhandledrejection",
  event => {

    console.error(
      "GrooveDNA unhandled promise rejection:",
      event.reason
    );
  }
);


/* =========================================================
   48. BUTTON LOADING PROTECTION
   ========================================================= */

function withButtonLoading(
  button,
  callback
) {

  if (!button) {
    return;
  }

  if (
    button.dataset.loading === "true"
  ) {
    return;
  }

  button.dataset.loading =
    "true";

  button.disabled =
    true;

  const originalText =
    button.textContent;

  button.dataset.originalText =
    originalText;

  Promise.resolve()
    .then(callback)
    .catch(error => {

      console.error(
        "Button action failed:",
        error
      );

      showToast(
        "⚠ Something went wrong."
      );

    })
    .finally(() => {

      button.dataset.loading =
        "false";

      button.disabled =
        false;

      button.textContent =
        button.dataset.originalText;
    });
}


/* =========================================================
   49. SAFE NAVIGATION
   ========================================================= */

function safeNavigate(
  page
) {

  if (
    typeof page !== "string" ||
    !page
  ) {
    return;
  }

  navigate(page);
}


/* =========================================================
   50. INITIALIZE APP
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    try {

      setupMusicBrainz();

      setupDrumPad();

      setupMusicMaker();

      setupMixer();

      setupBeatModes();

      setupRecording();

      setupGlobalSearch();

      applyURLSearch();

      setupAccessibility();

      setupKeyboardShortcuts();

      setupNetworkStatus();

      await initGrooveDNA();

      console.log(
        "GrooveDNA complete frontend loaded."
      );

    } catch (error) {

      console.error(
        "GrooveDNA initialization failed:",
        error
      );

      showToast(
        "⚠ GrooveDNA could not fully initialize."
      );
    }
  }
);

```javascript
  {
    id: 1,
    title: "Midnight Guitar Break",
    artist: "Demo Vault",
    genre: "Rock",
    type: "Guitar Riff",
    bpm: 112,
    key: "A Minor",
    rights: "Check Rights",
    icon: "🎸"
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
    icon: "🥁"
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
    icon: "🎹"
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
    icon: "🎸"
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
    icon: "⚡"
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
    icon: "🎻"
  }

];


function filteredSamples() {

  return sampleCatalog.filter(sample => {

    const genreMatch =
      GrooveDNA.selectedGenre === "All" ||
      sample.genre === GrooveDNA.selectedGenre;

    const term =
      GrooveDNA.searchTerm.toLowerCase();

    const searchMatch =
      !term ||
      [
        sample.title,
        sample.artist,
        sample.genre,
        sample.type,
        sample.key
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);

    return genreMatch && searchMatch;

  });

}


function rightsClass(rights) {

  if (
    rights &&
    rights.toLowerCase().startsWith("cleared")
  ) {
    return "cleared";
  }

  if (
    rights &&
    rights.toLowerCase() === "restricted"
  ) {
    return "restricted";
  }

  return "caution";

}


function renderSamples() {

  const grid =
    $("#sampleGrid");

  const count =
    $("#resultCount");

  if (!grid) {
    return;
  }

  const results =
    filteredSamples();

  if (count) {
    count.textContent =
      `${results.length} sounds found`;
  }

  if (!results.length) {

    grid.innerHTML = `
      <div class="empty-state">
        <h3>No sounds found</h3>
        <p>
          Try another search or genre.
        </p>
      </div>
    `;

    return;
  }

  grid.innerHTML =
    results.map(sample => `
      <article
        class="sample-card"
        data-sample-id="${sample.id}"
      >

        <div class="sample-icon">
          ${sample.icon}
        </div>

        <div class="sample-card-content">

          <p class="eyebrow">
            ${escapeHTML(sample.genre)}
          </p>

          <h3>
            ${escapeHTML(sample.title)}
          </h3>

          <p>
            ${escapeHTML(sample.artist)}
          </p>

          <div class="sample-meta">
            <span>${escapeHTML(sample.type)}</span>
            <span>${sample.bpm} BPM</span>
            <span>${escapeHTML(sample.key)}</span>
          </div>

          <span
            class="rights-badge ${rightsClass(sample.rights)}"
          >
            ${escapeHTML(sample.rights)}
          </span>

          <div class="sample-actions">

            <button
              class="btn secondary"
              type="button"
              data-preview="${sample.id}"
            >
              ▶ Preview
            </button>

            <button
              class="btn secondary"
              type="button"
              data-save="${sample.id}"
            >
              ♡ Save
            </button>

            <button
              class="btn primary"
              type="button"
              data-add="${sample.id}"
            >
              ＋ Add
            </button>

          </div>

        </div>

      </article>
    `).join("");

}


function setupDiscover() {

  const searchInput =
    $("#searchInput");

  const searchButton =
    $("#searchBtn");

  const filters =
    $$(".filter");

  filters.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        filters.forEach(item =>
          item.classList.remove("active")
        );

        button.classList.add("active");

        GrooveDNA.selectedGenre =
          button.dataset.genre || "All";

        renderSamples();

      }
    );

  });


  function runSearch() {

    GrooveDNA.searchTerm =
      searchInput?.value.trim() || "";

    renderSamples();

  }


  searchButton?.addEventListener(
    "click",
    runSearch
  );


  searchInput?.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        event.preventDefault();
        runSearch();
      }

    }
  );


  const sampleGrid =
    $("#sampleGrid");

  sampleGrid?.addEventListener(
    "click",
    event => {

      const preview =
        event.target.closest("[data-preview]");

      const save =
        event.target.closest("[data-save]");

      const add =
        event.target.closest("[data-add]");


      if (preview) {

        const id =
          Number(preview.dataset.preview);

        const sample =
          sampleCatalog.find(
            item => item.id === id
          );

        if (sample) {

          showToast(
            `▶ Previewing "${sample.title}"`
          );

        }

        return;
      }


      if (save) {

        const id =
          Number(save.dataset.save);

        const saved =
          JSON.parse(
            localStorage.getItem(
              "grooveDNA_saved"
            ) || "[]"
          );

        if (!saved.includes(id)) {
          saved.push(id);
        }

        localStorage.setItem(
          "grooveDNA_saved",
          JSON.stringify(saved)
        );

        showToast("✓ Sample saved.");

        return;
      }


      if (add) {

        const id =
          Number(add.dataset.add);

        const sample =
          sampleCatalog.find(
            item => item.id === id
          );

        if (!sample) {
          return;
        }

        const timeline =
          $("#timeline");

        const empty =
          $("#labEmpty");

        const melodyTrack =
          timeline?.querySelector(
            ".track.melody"
          );

        if (empty) {
          empty.style.display = "none";
        }

        if (melodyTrack) {

          const clip =
            document.createElement("div");

          clip.className =
            "clip melody";

          clip.textContent =
            sample.title;

          clip.title =
            sample.title;

          clip.style.width =
            `${Math.floor(
              120 + Math.random() * 140
            )}px`;

          melodyTrack.appendChild(
            clip
          );

          GrooveDNA.currentBeat.clips.push({
            sampleId: sample.id,
            title: sample.title,
            type: sample.type
          });

          showToast(
            `✓ "${sample.title}" added to Beat Lab.`
          );

        } else {

          showToast(
            "Beat Lab timeline is not available on this page."
          );

        }

      }

    }
  );

  renderSamples();

}


```

```javascript
function setChannelMute(name, muted = true) {

    const channel =
        mixerChannels.get(name);

    if (!channel) {
        return;
    }

    channel.muted = Boolean(muted);

    channel.gain.gain.setTargetAtTime(
        channel.muted
            ? 0
            : 1,
        audioContext.currentTime,
        0.01
    );
}


function setChannelSolo(name, solo = true) {

    const channel =
        mixerChannels.get(name);

    if (!channel) {
        return;
    }

    channel.solo = Boolean(solo);

    const anySolo =
        [...mixerChannels.values()]
            .some(item => item.solo);

    mixerChannels.forEach(item => {

        const shouldMute =
            anySolo &&
            !item.solo;

        item.gain.gain.setTargetAtTime(
            shouldMute || item.muted
                ? 0
                : 1,
            audioContext.currentTime,
            0.01
        );

    });
}


function resetMixerChannel(name) {

    const channel =
        mixerChannels.get(name);

    if (!channel) {
        return;
    }

    channel.muted = false;
    channel.solo = false;

    channel.gain.gain.setTargetAtTime(
        1,
        audioContext.currentTime,
        0.01
    );

    channel.pan.pan.setTargetAtTime(
        0,
        audioContext.currentTime,
        0.01
    );
}


function setupMixer() {

    const mixer =
        $("#musicMixer") ||
        $(".music-mixer") ||
        $("#mixer");

    if (!mixer) {
        return;
    }

    const channelElements =
        $$(
            "[data-mixer-channel]",
            mixer
        );

    channelElements.forEach(element => {

        const name =
            element.dataset.mixerChannel;

        if (!name) {
            return;
        }

        createMixerChannel(name);

        const volume =
            element.querySelector(
                "[data-mixer-volume]"
            );

        const pan =
            element.querySelector(
                "[data-mixer-pan]"
            );

        const mute =
            element.querySelector(
                "[data-mixer-mute]"
            );

        const solo =
            element.querySelector(
                "[data-mixer-solo]"
            );

        volume?.addEventListener(
            "input",
            event => {

                setChannelVolume(
                    name,
                    event.target.value
                );

            }
        );

        pan?.addEventListener(
            "input",
            event => {

                setChannelPan(
                    name,
                    event.target.value
                );

            }
        );

        mute?.addEventListener(
            "click",
            () => {

                const channel =
                    mixerChannels.get(name);

                if (!channel) {
                    return;
                }

                setChannelMute(
                    name,
                    !channel.muted
                );

                mute.classList.toggle(
                    "active",
                    channel.muted
                );

            }
        );

        solo?.addEventListener(
            "click",
            () => {

                const channel =
                    mixerChannels.get(name);

                if (!channel) {
                    return;
                }

                setChannelSolo(
                    name,
                    !channel.solo
                );

                solo.classList.toggle(
                    "active",
                    channel.solo
                );

            }
        );

    });


    $("#resetMixer")?.addEventListener(
        "click",
        () => {

            mixerChannels.forEach(
                (_, name) => {
                    resetMixerChannel(name);
                }
            );

            $$(
                "[data-mixer-mute]",
                mixer
            ).forEach(button => {
                button.classList.remove(
                    "active"
                );
            });

            $$(
                "[data-mixer-solo]",
                mixer
            ).forEach(button => {
                button.classList.remove(
                    "active"
                );
            });

            $$(
                "[data-mixer-volume]",
                mixer
            ).forEach(input => {
                input.value = 1;
            });

            $$(
                "[data-mixer-pan]",
                mixer
            ).forEach(input => {
                input.value = 0;
            });

            showToast(
                "Mixer reset."
            );

        }
    );

}


/* =========================================================
   16. BEAT LAB — DRUM PAD INTERACTION
   ========================================================= */

function setupDrumPadMachine() {

    const padContainer =
        $("#drumPadMachine") ||
        $(".drum-pad-machine") ||
        $("#drumPads");

    if (!padContainer) {
        return;
    }


    const pads =
        $$(
            "[data-drum-pad]",
            padContainer
        );

    pads.forEach(pad => {

        const type =
            pad.dataset.drumPad;

        if (!type) {
            return;
        }

        pad.addEventListener(
            "pointerdown",
            event => {

                event.preventDefault();

                triggerDrumPad(
                    type,
                    pad
                );

            }
        );

        pad.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    triggerDrumPad(
                        type,
                        pad
                    );

                }

            }
        );

    });


    const recordButton =
        $(
            "[data-drum-record]",
            padContainer
        );

    recordButton?.addEventListener(
        "click",
        () => {

            drumState.recording =
                !drumState.recording;

            if (
                drumState.recording
            ) {

                drumState.pattern = [];

                recordButton.classList.add(
                    "active"
                );

                recordButton.textContent =
                    "⏹ Stop Recording";

                showToast(
                    "Drum recording started."
                );

            } else {

                recordButton.classList.remove(
                    "active"
                );

                recordButton.textContent =
                    "● Record";

                showToast(
                    `${drumState.pattern.length} drum hits recorded.`
                );

            }

        }
    );


    const clearButton =
        $(
            "[data-drum-clear]",
            padContainer
        );

    clearButton?.addEventListener(
        "click",
        () => {

            drumState.pattern = [];

            showToast(
                "Drum pattern cleared."
            );

        }
    );

}


/* =========================================================
   17. BEAT LAB — KEYBOARD DRUM CONTROLS
   ========================================================= */

function setupDrumKeyboardControls() {

    if (
        window.__grooveDNADrumKeyboard
    ) {
        return;
    }

    window.__grooveDNADrumKeyboard =
        true;


    const keyMap = {
        a: "kick",
        s: "snare",
        d: "hihat",
        f: "clap",
        g: "tom",
        h: "open-hat",
        j: "crash",
        k: "perc"
    };


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.ctrlKey ||
                event.metaKey ||
                event.altKey
            ) {
                return;
            }

            const target =
                event.target;

            if (
                target instanceof
                    HTMLInputElement ||
                target instanceof
                    HTMLTextAreaElement ||
                target instanceof
                    HTMLSelectElement ||
                target?.isContentEditable
            ) {
                return;
            }

            const key =
                event.key.toLowerCase();

            const type =
                keyMap[key];

            if (!type) {
                return;
            }

            const pad =
                document.querySelector(
                    `[data-drum-pad="${type}"]`
                );

            triggerDrumPad(
                type,
                pad
            );

        }
    );

}


/* =========================================================
   18. BEAT LAB — MUSIC MAKER
   ========================================================= */

const musicMakerState = {

    playing: false,

    bpm: 96,

    step: 0,

    timer: null,

    sequence: Array.from(
        { length: 16 },
        () => ({
            kick: false,
            snare: false,
            hihat: false,
            bass: false
        })
    )

};


function setupMusicMaker() {

    const maker =
        $("#musicMaker") ||
        $(".music-maker") ||
        $("#beatMaker");

    if (!maker) {
        return;
    }


    const steps =
        $$(
            "[data-step]",
            maker
        );


    steps.forEach(step => {

        step.addEventListener(
            "click",
            () => {

                const index =
                    Number(
                        step.dataset.step
                    );

                const instrument =
                    step.dataset.instrument;

                if (
                    !Number.isInteger(index) ||
                    !instrument ||
                    !musicMakerState
                        .sequence[index]
                ) {
                    return;
                }

                const current =
                    musicMakerState
                        .sequence[index][
                            instrument
                        ];

                musicMakerState
                    .sequence[index][
                        instrument
                    ] =
                    !current;

                step.classList.toggle(
                    "active",
                    !current
                );

            }
        );

    });


    const bpmInput =
        $(
            "[data-maker-bpm]",
            maker
        );

    const bpmValue =
        $(
            "[data-maker-bpm-value]",
            maker
        );


    bpmInput?.addEventListener(
        "input",
        event => {

            const value =
                Number(
                    event.target.value
                );

            if (
                Number.isFinite(value)
            ) {

                musicMakerState.bpm =
                    value;

                if (bpmValue) {
                    bpmValue.textContent =
                        String(value);
                }

            }

        }
    );


    const playButton =
        $(
            "[data-maker-play]",
            maker
        );


    playButton?.addEventListener(
        "click",
        () => {

            if (
                musicMakerState.playing
            ) {

                stopMusicMaker();

            } else {

                startMusicMaker();

            }

        }
    );


    const clearButton =
        $(
            "[data-maker-clear]",
            maker
        );


    clearButton?.addEventListener(
        "click",
        () => {

            musicMakerState
                .sequence
                .forEach(step => {

                    Object.keys(step)
                        .forEach(key => {
                            step[key] = false;
                        });

                });


            steps.forEach(step => {
                step.classList.remove(
                    "active"
                );
            });


            showToast(
                "Music Maker pattern cleared."
            );

        }
    );

}


function playMusicMakerStep(stepIndex) {

    const step =
        musicMakerState
            .sequence[stepIndex];

    if (!step) {
        return;
    }


    if (step.kick) {
        playDrumSynth("kick");
    }

    if (step.snare) {
        playDrumSynth("snare");
    }

    if (step.hihat) {
        playDrumSynth("hihat");
    }

    if (step.bass) {
        playBassNote();
    }


    $$(
        "[data-step]"
    ).forEach(element => {

        element.classList.toggle(
            "playing",
            Number(
                element.dataset.step
            ) === stepIndex
        );

    });

}


function startMusicMaker() {

    initAudioEngine();

    if (
        musicMakerState.playing
    ) {
        return;
    }

    musicMakerState.playing =
        true;

    musicMakerState.step =
        0;


    const interval =
        60000 /
        musicMakerState.bpm /
        4;


    musicMakerState.timer =
        setInterval(
            () => {

                playMusicMakerStep(
                    musicMakerState.step
                );

                musicMakerState.step =
                    (
                        musicMakerState.step +
                        1
                    ) % 16;

            },
            interval
        );


    $$(
        "[data-maker-play]"
    ).forEach(button => {
        button.textContent =
            "⏸ Stop";
    });


    showToast(
        "Music Maker playing."
    );

}


function stopMusicMaker() {

    musicMakerState.playing =
        false;


    if (
        musicMakerState.timer
    ) {

        clearInterval(
            musicMakerState.timer
        );

        musicMakerState.timer =
            null;

    }


    $$(
        "[data-step]"
    ).forEach(element => {
        element.classList.remove(
            "playing"
        );
    });


    $$(
        "[data-maker-play]"
    ).forEach(button => {
        button.textContent =
            "▶ Play";
    });

}


function playBassNote() {

    initAudioEngine();

    const now =
        audioContext.currentTime;

    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();


    oscillator.type =
        "sawtooth";

    oscillator.frequency
        .setValueAtTime(
            55,
            now
        );


    gain.gain.setValueAtTime(
        0.18,
        now
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 0.3
    );


    oscillator.connect(gain);

    gain.connect(masterGain);


    oscillator.start(now);

    oscillator.stop(
        now + 0.35
    );

}


/* =========================================================
   19. BEAT LAB — MODE SWITCHING
   ========================================================= */

function setupBeatLabModes() {

    const buttons =
        $$(
            "[data-beat-mode]"
        );

    if (!buttons.length) {
        return;
    }


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const mode =
                    button.dataset.beatMode;

                if (!mode) {
                    return;
                }

                GrooveDNA.beatMode =
                    mode;

                buttons.forEach(item => {
                    item.classList.toggle(
                        "active",
                        item === button
                    );
                });

                renderBeatMode(
                    mode
                );

            }
        );

    });

}


function renderBeatMode(mode) {

    const modes = [
        "mixer",
        "drumpad",
        "musicmaker"
    ];


    modes.forEach(name => {

        const panel =
            document.querySelector(
                `[data-beat-panel="${name}"]`
            );

        if (!panel) {
            return;
        }

        panel.hidden =
            name !== mode;

    });


    const modeButton =
        document.querySelector(
            `[data-beat-mode="${mode}"]`
        );

    if (modeButton) {

        $$(
            "[data-beat-mode]"
        ).forEach(button => {

            button.classList.toggle(
                "active",
                button === modeButton
            );

        });

    }

}


/* =========================================================
   20. BEAT LAB — SAMPLE TO TRACK
   ========================================================= */

function addSampleToBeatLab(sample) {

    if (!sample) {
        return;
    }


    const timeline =
        $("#timeline");

    if (!timeline) {
        showToast(
            "Beat Lab timeline is unavailable."
        );
        return;
    }


    const empty =
        $("#labEmpty");

    if (empty) {
        empty.style.display =
            "none";
    }


    let track =
        timeline.querySelector(
            ".track.melody"
        );


    if (!track) {

        track =
            document.createElement(
                "div"
            );

        track.className =
            "track melody";

        track.innerHTML = `
            <span class="track-label">
                MELODY
            </span>
        `;

        timeline.appendChild(
            track
        );

    }


    const clip =
        document.createElement(
            "div"
        );

    clip.className =
        "clip melody";

    clip.textContent =
        sample.title;

    clip.title =
        `${sample.title} — ${sample.artist}`;

    clip.dataset.sampleId =
        sample.id;


    const width =
        Math.floor(
            Math.random() * 120
        ) + 120;


    clip.style.width =
        `${width}px`;


    clip.addEventListener(
        "click",
        () => {

            playSample(sample);

        }
    );


    track.appendChild(
        clip
    );


    GrooveDNA.beatLabSamples =
        GrooveDNA.beatLabSamples ||
        [];

    GrooveDNA.beatLabSamples.push(
        sample
    );


    showToast(
        `${sample.title} added to Beat Lab.`
    );

}


/* =========================================================
   21. BEAT LAB — SAVE / CLEAR
   ========================================================= */

function saveBeat() {

    try {

        const saved =
            safeStorageGet(
                "grooveDNA_beatProjects",
                []
            );


        const project = {

            id:
                `beat-${Date.now()}`,

            name:
                `GrooveDNA Beat ${new Date().toLocaleDateString()}`,

            bpm:
                GrooveDNA.bpm ||
                musicMakerState.bpm ||
                96,

            mode:
                GrooveDNA.beatMode ||
                "mixer",

            samples:
                GrooveDNA.beatLabSamples ||
                [],

            createdAt:
                new Date().toISOString()

        };


        saved.push(
            project
        );


        safeStorageSet(
            "grooveDNA_beatProjects",
            saved
        );

        safeStorageSet(
            "grooveDNA_beatSaved",
            true
        );


        showToast(
            "✓ Beat idea saved!"
        );

    } catch (error) {

        console.error(
            "Beat save error:",
            error
        );

        showToast(
            "Unable to save this beat."
        );

    }

}


function clearBeatLab() {

    const timeline =
        $("#timeline");

    if (timeline) {

        timeline
            .querySelectorAll(
                ".clip"
            )
            .forEach(clip => {
                clip.remove();
            });

    }


    const empty =
        $("#labEmpty");

    if (empty) {
        empty.style.display =
            "block";
    }


    GrooveDNA.beatLabSamples =
        [];


    showToast(
        "Beat Lab cleared."
    );

}


/* =========================================================
   22. BEAT LAB — GENERATED BEAT
   ========================================================= */

function generateBeat() {

    initAudioEngine();


    const maker =
        $("#musicMaker") ||
        $(".music-maker") ||
        $("#beatMaker");


    if (maker) {

        const steps =
            $$(
                "[data-step]",
                maker
            );


        musicMakerState
            .sequence
            .forEach((step, index) => {

                step.kick =
                    index % 4 === 0;

                step.snare =
                    index % 8 === 4;

                step.hihat =
                    index % 2 === 0;

                step.bass =
                    index % 4 === 0;

            });


        steps.forEach(element => {

            const index =
                Number(
                    element.dataset.step
                );

            const instrument =
                element.dataset.instrument;

            if (
                !Number.isInteger(index) ||
                !instrument
            ) {
                return;
            }

            element.classList.toggle(
                "active",
                Boolean(
                    musicMakerState
                        .sequence[index][
                            instrument
                        ]
                )
            );

        });

    }


    showToast(
        "A new groove has been generated."
    );

}
```

  GrooveDNA.currentBeat.instruments.push({
    instrument:
      instrument.name,
    sound
  });

  GrooveDNA.currentBeat.clips.push({
    type: "instrument",
    instrument:
      instrument.name,
    sound
  });

  showToast(
    `${sound} added to ${GrooveDNA.beatMode}.`
  );

  renderBeatClip(
    instrument,
    sound
  );
}


function renderBeatClip(
  instrument,
  sound
) {

  const timeline =
    $("#timeline");

  if (!timeline) {
    return;
  }

  const lanes =
    $$(".track-lane");

  const target =
    lanes[0];

  if (!target) {
    return;
  }

  const clip =
    document.createElement("div");

  clip.className =
    "clip";

  clip.textContent =
    `${instrument.icon} ${sound}`;

  target.appendChild(
    clip
  );
}


/* =========================================================
   19. BEAT LAB MODES
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
  const label = mode === "mixer" ? "Music Mixer" : mode === "drumpad" ? "Drum Pad" : "Music Maker";
  renderBeatMode(mode);
  showToast(`Beat Lab switched to ${label}.`);
}


/* =========================================================
   BEAT LAB — INTERACTIVE MODE INTERFACES
   ========================================================= */

function getBeatModeHost() { const lab = $(".beatlab"); if (!lab) return null; let host = $("#beatModeWorkspace", lab); if (!host) { host = document.createElement("div"); host.id = "beatModeWorkspace"; host.className = "beat-mode-workspace"; lab.appendChild(host); } return host; }

function renderMixerInterface() {
  const host=getBeatModeHost(); if(!host)return; const channels=[["Drums","🥁","drums"],["Bass","🎸","bass"],["Keys","🎹","keys"],["Melody","🎷","melody"],["Samples","🎛","samples"]];
  host.innerHTML=`<section class="mixer-panel" aria-label="Music Mixer"><div class="mixer-header"><div><p class="eyebrow">MIX</p><h3>Music Mixer</h3><p>Control volume, pan, mute and sound previews.</p></div><button class="btn secondary" type="button" id="mixerStopAll">Stop All</button></div><div class="mixer-channels">${channels.map(([name,icon,id])=>`<div class="mixer-channel"><div class="mixer-channel-top"><span class="mixer-icon">${icon}</span><strong>${name}</strong></div><button class="mixer-preview" type="button" data-mixer-preview="${id}">▶ Preview</button><label>Volume <input type="range" min="0" max="1" step="0.01" value="0.8" data-mixer-volume="${id}"></label><label>Pan <input type="range" min="-1" max="1" step="0.01" value="0" data-mixer-pan="${id}"></label><button type="button" class="icon-btn" data-mixer-mute="${id}">M</button></div>`).join("")}</div></section>`;
  channels.forEach(([name,icon,id])=>createMixerChannel(id,{volume:.8,pan:0}));
  host.querySelectorAll("[data-mixer-volume]").forEach(i=>i.addEventListener("input",()=>setChannelVolume(i.dataset.mixerVolume,i.value)));
  host.querySelectorAll("[data-mixer-pan]").forEach(i=>i.addEventListener("input",()=>setChannelPan(i.dataset.mixerPan,i.value)));
  host.querySelectorAll("[data-mixer-mute]").forEach(b=>b.addEventListener("click",()=>{muteChannel(b.dataset.mixerMute);b.classList.toggle("active");}));
  host.querySelectorAll("[data-mixer-preview]").forEach(b=>b.addEventListener("click",()=>previewMixerChannel(b.dataset.mixerPreview,b)));
  $("#mixerStopAll")?.addEventListener("click",()=>showToast("Mixer previews stopped."));
}

function previewMixerChannel(id,button){resumeAudio();const channel=mixerChannels.get(id)||createMixerChannel(id,{volume:.8});const now=audioContext.currentTime;const osc=audioContext.createOscillator();const gain=audioContext.createGain();const f={drums:110,bass:55,keys:220,melody:330,samples:165}[id]||220;osc.type=id==="bass"?"sawtooth":id==="keys"?"triangle":"sine";osc.frequency.value=f;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.25,now+.02);gain.gain.exponentialRampToValueAtTime(.0001,now+.5);osc.connect(gain);gain.connect(channel.gain);osc.start(now);osc.stop(now+.55);button.classList.add("active");setTimeout(()=>button.classList.remove("active"),250);}

function setupDrumKeyboardControls() {
  if (window.__grooveDrumKeyboardBound) return;
  window.__grooveDrumKeyboardBound = true;
  const keyMap = { q: "kick", w: "snare", e: "hihat", r: "clap", a: "tom", s: "open-hat", d: "crash", f: "perc" };
  document.addEventListener("keydown", event => {
    if (event.target.matches("input, textarea, select")) return;
    const type = keyMap[event.key.toLowerCase()];
    if (!type || GrooveDNA.beatMode !== "drumpad") return;
    const button = document.querySelector(`[data-drum-pad="${type}"]`);
    triggerDrumPad(type, button);
  });
}

function renderDrumPadInterface(){const host=getBeatModeHost();if(!host)return;const pads=[["kick","🥁","Kick","Q"],["snare","🪘","Snare","W"],["hihat","✳","Hi-Hat","E"],["clap","👏","Clap","R"],["tom","◉","Tom","A"],["open-hat","○","Open Hat","S"],["crash","💥","Crash","D"],["perc","◈","Perc","F"]];host.innerHTML=`<section class="drum-machine panel" aria-label="Drum Pad Machine"><div class="drum-machine-header"><div><p class="eyebrow">RHYTHM</p><h3>Drum Pad Machine</h3><p class="drum-machine-description">Tap pads or use Q–F keyboard keys. Program a 16-step pattern.</p></div><div class="drum-machine-controls"><button class="btn secondary" type="button" id="drumRecord">● Record</button><button class="btn secondary" type="button" id="drumClear">Clear</button><button class="btn primary" type="button" id="drumPlayPattern">▶ Play Pattern</button></div></div><div class="drum-pad-grid">${pads.map(([type,icon,name,key])=>`<button class="drum-pad ${type}" type="button" data-drum-pad="${type}"><span class="pad-icon">${icon}</span><strong>${name}</strong><small>${key}</small></button>`).join("")}</div><div class="drum-sequencer"><div class="drum-sequencer-header"><div><strong>16-Step Pattern</strong><span>Tap steps to program.</span></div></div><div class="drum-step-grid" id="drumStepGrid">${Array.from({length:16},(_,i)=>`<button type="button" class="drum-step" data-step="${i}" aria-label="Step ${i+1}"></button>`).join("")}</div></div></section>`;host.querySelectorAll("[data-drum-pad]").forEach(b=>b.addEventListener("click",()=>triggerDrumPad(b.dataset.drumPad,b)));$("#drumRecord")?.addEventListener("click",()=>{drumState.recording=!drumState.recording;if(drumState.recording)drumState.pattern=[];showToast(drumState.recording?"Drum recording started.":"Drum recording stopped.");});$("#drumClear")?.addEventListener("click",()=>{drumState.pattern=[];host.querySelectorAll(".drum-step").forEach(s=>s.classList.remove("active"));});$("#drumPlayPattern")?.addEventListener("click",playDrumPattern);host.querySelectorAll(".drum-step").forEach(s=>s.addEventListener("click",()=>s.classList.toggle("active")));}

function playDrumPattern(){const steps=[...document.querySelectorAll("#drumStepGrid .drum-step.active")];if(!steps.length){showToast("Activate some drum steps first.");return;}const ms=(60/Math.max(40,Number(GrooveDNA.currentBeat.bpm||96))/4)*1000;steps.forEach((step,i)=>setTimeout(()=>{triggerDrumPad(["kick","snare","hihat","clap"][i%4]);step.classList.add("current");setTimeout(()=>step.classList.remove("current"),ms*.8);},i*ms));}

function renderMusicMakerInterface(){const host=getBeatModeHost();if(!host)return;const notes=[["C4",261.63],["D4",293.66],["E4",329.63],["F4",349.23],["G4",392],["A4",440],["B4",493.88],["C5",523.25]];host.innerHTML=`<section class="music-maker panel" aria-label="Music Maker"><div class="maker-header"><div><p class="eyebrow">MELODY</p><h3>Music Maker</h3><p>Create a melody by placing notes on a 16-step grid.</p></div><div class="maker-actions"><button class="btn secondary" type="button" id="makerClear">Clear</button><button class="btn primary" type="button" id="makerPlay">▶ Play Melody</button></div></div><div class="maker-grid" id="makerGrid">${notes.map(([n])=>`<div class="maker-row"><strong>${n}</strong>${Array.from({length:16},(_,i)=>`<button type="button" class="maker-step" data-note="${n}" data-step="${i}" aria-label="${n}, step ${i+1}"></button>`).join("")}</div>`).join("")}</div></section>`;host.querySelectorAll(".maker-step").forEach(b=>b.addEventListener("click",()=>{b.classList.toggle("active");if(b.classList.contains("active")){const f=notes.find(n=>n[0]===b.dataset.note)?.[1]||440;addSequencerNote({pitch:f,time:Number(b.dataset.step),duration:1,velocity:.8});previewMakerNote(f);}}));$("#makerClear")?.addEventListener("click",()=>{clearSequencer();renderMusicMakerInterface();});$("#makerPlay")?.addEventListener("click",playMakerGrid);}

function previewMakerNote(frequency,duration=.28){resumeAudio();const now=audioContext.currentTime;const osc=audioContext.createOscillator();const gain=audioContext.createGain();osc.type="triangle";osc.frequency.value=frequency;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.18,now+.02);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(masterGain);osc.start(now);osc.stop(now+duration+.03);}

function playMakerGrid(){const cells=[...document.querySelectorAll("#makerGrid .maker-step.active")];if(!cells.length){showToast("Place some notes on the Music Maker grid first.");return;}const bpm=Math.max(40,Number(GrooveDNA.currentBeat.bpm||96));const ms=(60/bpm/4)*1000;cells.forEach(c=>{const f=({C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,C5:523.25})[c.dataset.note]||440;setTimeout(()=>{previewMakerNote(f);c.classList.add("current");setTimeout(()=>c.classList.remove("current"),ms*.8)},Number(c.dataset.step)*ms);});showToast(`Playing melody at ${bpm} BPM.`);}

function renderBeatMode(mode){if(mode==="mixer")renderMixerInterface();else if(mode==="drumpad")renderDrumPadInterface();else renderMusicMakerInterface();}

/* =========================================================
   20. BEAT PLAYBACK
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
// BEAT LAB PLAYBACK
// =======================================================

let beatLabPlaying = false;
let beatLabTimer = null;

function startBeatLab() {
    resumeAudio();

    if (beatLabPlaying) return;

    beatLabPlaying = true;

    if ($("#labPlay")) {
        $("#labPlay").textContent = "⏸";
    }

    scheduleBeatLab();
}

function stopBeatLab() {
    beatLabPlaying = false;

    if (beatLabTimer) {
        clearTimeout(beatLabTimer);
        beatLabTimer = null;
    }

    if ($("#labPlay")) {
        $("#labPlay").textContent = "▶";
    }
}

function scheduleBeatLab() {
    if (!beatLabPlaying) return;

    const bpm = Number($("#bpm")?.value || 96);
    const beatLength = 60000 / bpm;

    // This is the timing foundation.
    // Actual clips/patterns will be scheduled here.

    beatLabTimer = setTimeout(
        scheduleBeatLab,
        beatLength
    );
}

if ($("#labPlay")) {
    $("#labPlay").addEventListener("click", () => {
        if (beatLabPlaying) {
            stopBeatLab();
        } else {
            startBeatLab();
        }
    });
}

/* =========================================================
   21. RECORDING
   ========================================================= */

function setupBeatRecording() {

  let recordButton =
    $("#recordBeat");

  if (!recordButton) {

    recordButton =
      document.createElement("button");

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

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    showToast(
      "Your browser does not support microphone recording."
    );

    return;
  }

  try {

    const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });

    GrooveDNA.recordedChunks =
      [];

    const recorder =
      new MediaRecorder(stream);

    GrooveDNA.mediaRecorder =
      recorder;

    recorder.ondataavailable =
      event => {

        if (event.data.size > 0) {
          GrooveDNA.recordedChunks.push(
            event.data
          );
        }
      };

    recorder.onstop =
      () => {

        stream
          .getTracks()
          .forEach(track =>
            track.stop()
          );

        const blob =
          new Blob(
            GrooveDNA.recordedChunks,
            {
              type:
                recorder.mimeType ||
                "audio/webm"
            }
          );

        const url =
          URL.createObjectURL(blob);

        GrooveDNA.recordedAudio =
          url;

        GrooveDNA.isRecording =
          false;

        const button =
          $("#recordBeat");

        if (button) {
          button.textContent =
            "● Record";
        }

        showToast(
          "Recording saved to this Beat Lab session."
        );
      };

    recorder.start();

    GrooveDNA.isRecording =
      true;

    const button =
      $("#recordBeat");

    if (button) {
      button.textContent =
        "■ Stop Recording";
    }

    showToast(
      "Recording started."
    );

  } catch (error) {

    console.error(
      "Recording error:",
      error
    );

    showToast(
      "Microphone permission was not granted."
    );
  }
}


/* =========================================================
   22. SAVE / CLEAR / GENERATE BEAT
   ========================================================= */

function saveBeat() {

  const beats =
    JSON.parse(
      localStorage.getItem(
        "grooveDNA_beats"
      ) || "[]"
    );

  beats.push({
    id: Date.now(),
    createdAt:
      new Date().toISOString(),
    beat:
      GrooveDNA.currentBeat
  });

  localStorage.setItem(
    "grooveDNA_beats",
    JSON.stringify(beats)
  );

  showToast(
    "✓ Beat idea saved!"
  );
}


function clearBeatLab() {

  $$("#timeline .clip")
    .forEach(clip =>
      clip.remove()
    );

  GrooveDNA.currentBeat.clips =
    [];

  GrooveDNA.currentBeat.instruments =
    [];

  const empty =
    $("#labEmpty");

  if (empty) {
    empty.style.display =
      "block";
  }

  showToast(
    "Beat Lab cleared."
  );
}


function generateBeat() {

  const generated =
    instrumentCatalog[
      Math.floor(
        Math.random() *
        instrumentCatalog.length
      )
    ];

  const sound =
    generated.sounds[
      Math.floor(
        Math.random() *
        generated.sounds.length
      )
    ];

  addInstrumentSound(
    generated,
    sound
  );

  showToast(
    "GrooveDNA generated a new idea."
  );
}


// =======================================================
// PROJECT SAVE / LOAD
// =======================================================

const PROJECT_STORAGE_KEY = "grooveDNA_project";

function getCurrentProject() {
    return {
        bpm: Number($("#bpm")?.value || 96),
        pitch: Number($("#pitch")?.value || 0),
        notes: [...sequencerState.notes],
        drumPattern: [...drumState.pattern],
        savedAt: new Date().toISOString()
    };
}

function saveProject() {
    const project = getCurrentProject();

    localStorage.setItem(
        PROJECT_STORAGE_KEY,
        JSON.stringify(project)
    );

    showToast("✓ GrooveDNA project saved.");
}

function loadProject() {
    const saved =
        localStorage.getItem(PROJECT_STORAGE_KEY);

    if (!saved) {
        showToast("No saved GrooveDNA project found.");
        return null;
    }

    try {
        const project = JSON.parse(saved);

        if ($("#bpm")) {
            $("#bpm").value = project.bpm;
            $("#bpmValue").textContent = project.bpm;
        }

        if ($("#pitch")) {
            $("#pitch").value = project.pitch;
            $("#pitchValue").textContent =
                project.pitch > 0
                    ? `+${project.pitch}`
                    : project.pitch;
        }

        sequencerState.notes =
            project.notes || [];

        drumState.pattern =
            project.drumPattern || [];

        showToast("✓ GrooveDNA project loaded.");

        return project;

    } catch (error) {
        console.error("Project load error:", error);
        showToast("⚠ Saved project could not be loaded.");
        return null;
    }
}


/* =========================================================
   23. COLLABORATION
   ========================================================= */

function setupCollaboration() {

  let button =
    $("#collabBtn");

  if (!button) {

    button =
      document.createElement("button");

    button.id =
      "collabBtn";

    button.className =
      "btn secondary";

    button.textContent =
      "👥 Collab";

    const toolbar =
      $(".lab-toolbar");

    if (toolbar) {
      toolbar.appendChild(
        button
      );
    }
  }

  button.addEventListener(
    "click",
    openCollabPanel
  );
}


async function openCollabPanel() {

  const existing =
    $("#collabPanel");

  if (existing) {
    existing.remove();
  }

  const panel =
    document.createElement("div");

  panel.id =
    "collabPanel";

  panel.className =
    "modal-backdrop";

  panel.innerHTML = `
    <div class="modal">

      <button
        class="modal-close"
        id="closeCollab">
        ×
      </button>

      <p class="eyebrow">
        COLLABORATE
      </p>

      <h2>
        Invite a creator
      </h2>

      <div id="collabUsers">
        Loading creators...
      </div>

    </div>
  `;

  document.body.appendChild(panel);

  $("#closeCollab").onclick =
    () => panel.remove();

  await loadCollabUsers();
}


async function loadCollabUsers() {

  const container =
    $("#collabUsers");

  if (!container) {
    return;
  }

  if (!supabaseClient) {

    container.innerHTML =
      "<p>Supabase is not configured.</p>";

    return;
  }

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("profiles")
      .select("id, username, display_name")
      .limit(20);

    if (error) {
      throw error;
    }

    if (!data?.length) {

      container.innerHTML =
        "<p>No creators found yet.</p>";

      return;
    }

    container.innerHTML =
      data.map(user => `
        <div class="collab-user">

          <span>
            @${escapeHTML(
              user.username ||
              user.display_name ||
              "creator"
            )}
          </span>

          <button
            class="btn primary"
            data-invite-user="${user.id}">
            Add
          </button>

        </div>
      `).join("");

    container
      .addEventListener(
        "click",
        event => {

          const button =
            event.target.closest(
              "[data-invite-user]"
            );

          if (!button) {
            return;
          }

          sendCollaborationInvite(
            button.dataset.inviteUser
          );
        }
      );

  } catch (error) {

    console.error(
      "Collab users:",
      error
    );

    container.innerHTML =
      "<p>Unable to load creators.</p>";
  }
}


async function sendCollaborationInvite(
  recipientId
) {

  if (!supabaseClient ||
      !GrooveDNA.user) {

    showToast(
      "Please sign in first."
    );

    return;
  }

  /*
    Recommended Supabase table:

    collaboration_invites

    id
    sender_id
    recipient_id
    status
    created_at
  */

  try {

    const {
      error
    } = await supabaseClient
      .from("collaboration_invites")
      .insert({
        sender_id:
          GrooveDNA.user.id,
        recipient_id:
          recipientId,
        status:
          "pending"
      });

    if (error) {
      throw error;
    }

    showToast(
      "Collaboration invitation sent."
    );

  } catch (error) {

    console.error(
      "Invite error:",
      error
    );

    showToast(
      "Unable to send invitation."
    );
  }
}


/* =========================================================
   24. GROOVEDNA PAGE
   ========================================================= */

function setupGrooveDNA() {

  $("#shareDNA")?.addEventListener(
    "click",
    async () => {

      const shareText =
        "Check out my GrooveDNA musical profile.";

      if (
        navigator.share
      ) {

        await navigator.share({
          title:
            "My GrooveDNA",
          text:
            shareText,
          url:
            window.location.href
        });

      } else {

        await navigator.clipboard.writeText(
          window.location.href
        );

        showToast(
          "GrooveDNA link copied."
        );
      }
    }
  );


  $$(".mood-card")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const mood =
            button.dataset.mood;

          showToast(
            `${mood} sounds selected.`
          );

          localStorage.setItem(
            "grooveDNA_mood",
            mood
          );
        }
      );
    });
}


/* =========================================================
   25. COMMUNITY
   ========================================================= */

function setupCommunity() {

  $$("#community [data-like]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const count =
            button.querySelector(
              "span"
            );

          if (count) {

            const current =
              Number(
                count.textContent
              ) || 0;

            count.textContent =
              current + 1;
          }

          button.classList.toggle(
            "liked"
          );
        }
      );
    });


  $$("#community [data-remix]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          showToast(
            "Remix idea added to Beat Lab."
          );

          navigate(
            "beatlab.html"
          );
        }
      );
    });


  $$("#community [data-follow]")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const following =
            button.dataset.following ===
            "true";

          button.dataset.following =
            String(!following);

          button.textContent =
            following
              ? "＋ Follow"
              : "✓ Following";

          showToast(
            following
              ? "Unfollowed creator."
              : "Following creator."
          );
        }
      );
    });
