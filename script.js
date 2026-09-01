
        ```javascript
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
    audio: ""
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
    audio: ""
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
    audio: ""
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
    audio: ""
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
    audio: ""
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
    audio: ""
  },

  {
    id: 7,
    title: "Midnight Soul",
    artist: "GrooveDNA Library",
    genre: "Soul",
    type: "Vocal",
    bpm: 88,
    key: "F Minor",
    rights: "Cleared / Licensed",
    icon: "🎤",
    audio: ""
  },

  {
    id: 8,
    title: "Late Night R&B",
    artist: "GrooveDNA Library",
    genre: "R&B",
    type: "Keys",
    bpm: 92,
    key: "B Minor",
    rights: "Cleared / Licensed",
    icon: "🎹",
    audio: ""
  },

  {
    id: 9,
    title: "Blue Room",
    artist: "GrooveDNA Library",
    genre: "Jazz",
    type: "Saxophone",
    bpm: 72,
    key: "C Major",
    rights: "Cleared / Licensed",
    icon: "🎷",
    audio: ""
  }
];


function filteredSamples() {

  return sampleCatalog.filter(sample => {

    const genreMatch =
      GrooveDNA.selectedGenre === "All" ||
      sample.genre ===
        GrooveDNA.selectedGenre;

    const searchable = [
      sample.title,
      sample.artist,
      sample.genre,
      sample.type,
      sample.key
    ]
      .join(" ")
      .toLowerCase();

    const searchMatch =
      !GrooveDNA.searchTerm ||
      searchable.includes(
        GrooveDNA.searchTerm.toLowerCase()
      );

    return genreMatch && searchMatch;
  });
}


function renderSamples() {

  const grid =
    $("#sampleGrid");

  const count =
    $("#resultCount");

  if (!grid) {
    return;
  }

  const samples =
    filteredSamples();

  if (count) {
    count.textContent =
      `${samples.length} sounds found`;
  }

  if (!samples.length) {

    grid.innerHTML = `
      <div class="empty-state">
        No sounds found.
        Try another search or genre.
      </div>
    `;

    return;
  }

  grid.innerHTML =
    samples.map(sample => `
      <article
        class="sample-card"
        data-sample-id="${sample.id}">

        <div class="sample-icon">
          ${sample.icon}
        </div>

        <p class="eyebrow">
          ${escapeHTML(sample.genre)}
        </p>

        <h3>
          ${escapeHTML(sample.title)}
        </h3>

        <p>
          ${escapeHTML(sample.artist)}
        </p>

        <small>
          ${sample.bpm} BPM ·
          ${escapeHTML(sample.key)}
        </small>

        <div class="sample-actions">

          <button
            class="btn secondary"
            data-preview
            data-id="${sample.id}">
            ▶ Play
          </button>

          <button
            class="btn secondary"
            data-crop
            data-id="${sample.id}">
            ✂ Crop
          </button>

          <button
            class="btn primary"
            data-add
            data-id="${sample.id}">
            + Beat Lab
          </button>

        </div>

      </article>
    `).join("");
}


function setupDiscover() {

  const searchInput =
    $("#searchInput");

  const searchButton =
    $("#searchBtn");

  if (searchInput) {

    searchInput.addEventListener(
      "input",
      () => {

        GrooveDNA.searchTerm =
          searchInput.value.trim();

        renderSamples();
      }
    );

    searchInput.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter"
        ) {
          event.preventDefault();

          GrooveDNA.searchTerm =
            searchInput.value.trim();

          renderSamples();
        }
      }
    );
  }

  searchButton?.addEventListener(
    "click",
    () => {

      GrooveDNA.searchTerm =
        searchInput?.value.trim() || "";

      renderSamples();
    }
  );


  /*
    Genre buttons
  */

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


  /*
    Refresh picks
  */

  $("#discoverMore")?.addEventListener(
    "click",
    () => {

      GrooveDNA.selectedGenre =
        "All";

      GrooveDNA.searchTerm =
        "";

      if (searchInput) {
        searchInput.value = "";
      }

      renderSamples();

      showToast(
        "Your discovery picks were refreshed."
      );
    }
  );


  /*
    Sample cards
  */

  $("#sampleGrid")?.addEventListener(
    "click",
    event => {

      const preview =
        event.target.closest(
          "[data-preview]"
        );

      const crop =
        event.target.closest(
          "[data-crop]"
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
              preview.dataset.id
          );

        if (sample) {
          playSample(sample);
        }

        return;
      }

      if (crop) {

        const sample =
          sampleCatalog.find(
            item =>
              String(item.id) ===
              crop.dataset.id
          );

        if (sample) {
          openCropper(sample);
        }

        return;
      }

      if (add) {

        const sample =
          sampleCatalog.find(
            item =>
              String(item.id) ===
              add.dataset.id
          );

        if (sample) {
          addSampleToBeatLab(sample);
        }
      }
    }
  );

  renderSamples();
}


/* =========================================================
   12. AUDIO PLAYBACK
   ========================================================= */

function playSample(sample) {

  if (!sample.audio) {

    showToast(
      `${sample.title} is a catalog demo. Add an audio URL in Supabase to play it.`
    );

    return;
  }

  if (
    GrooveDNA.currentAudioUrl ===
    sample.audio &&
    GrooveDNA.currentAudio
  ) {

    if (
      GrooveDNA.currentAudio.paused
    ) {

      GrooveDNA.currentAudio.play();

      showToast(
        `Playing ${sample.title}`
      );

    } else {

      GrooveDNA.currentAudio.pause();

      showToast(
        `Paused ${sample.title}`
      );
    }

    return;
  }

  if (GrooveDNA.currentAudio) {
    GrooveDNA.currentAudio.pause();
  }

  const audio =
    new Audio(sample.audio);

  GrooveDNA.currentAudio =
    audio;

  GrooveDNA.currentAudioUrl =
    sample.audio;

  audio.play();

  showToast(
    `Playing ${sample.title}`
  );
}


/* =========================================================
   13. AUDIO UPLOAD
   ========================================================= */

function setupAudioUpload() {

  const uploadButtons =
    [
      $("#uploadBtn"),
      $("#uploadBtn2")
    ].filter(Boolean);

  if (!uploadButtons.length) {
    return;
  }

  let input =
    $("#audioUpload");

  if (!input) {

    input =
      document.createElement("input");

    input.type = "file";
    input.id = "audioUpload";
    input.accept = "audio/*";
    input.hidden = true;

    document.body.appendChild(input);
  }

  uploadButtons.forEach(button => {

    button.addEventListener(
      "click",
      () => input.click()
    );
  });


  input.addEventListener(
    "change",
    event => {

      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      const url =
        URL.createObjectURL(file);

      GrooveDNA.currentAudioUrl =
        url;

      GrooveDNA.currentAudio =
        new Audio(url);

      GrooveDNA.currentAudio.play();

      showToast(
        `${file.name} loaded.`
      );

      /*
        The uploaded file can now be
        cropped and added to Beat Lab.
      */

      GrooveDNA.currentUploadedFile =
        file;
    }
  );
}


/* =========================================================
   14. AUDIO CROPPER
   ========================================================= */

function openCropper(sample) {

  const existing =
    $("#audioCropper");

  if (existing) {
    existing.remove();
  }

  const modal =
    document.createElement("div");

  modal.id =
    "audioCropper";

  modal.className =
    "modal-backdrop";

  modal.innerHTML = `
    <div class="modal crop-modal">

      <button
        class="modal-close"
        id="closeCropper">
        ×
      </button>

      <p class="eyebrow">
        SAMPLE EDITOR
      </p>

      <h2>
        Crop ${escapeHTML(sample.title)}
      </h2>

      <p>
        Choose the section you want
        to use in Beat Lab.
      </p>

      <label>
        Start
        <input
          type="range"
          id="cropStart"
          min="0"
          max="100"
          value="0">
      </label>

      <label>
        End
        <input
          type="range"
          id="cropEnd"
          min="0"
          max="100"
          value="100">
      </label>

      <div class="modal-actions">

        <button
          class="btn secondary"
          id="previewCrop">
          ▶ Preview
        </button>

        <button
          class="btn primary"
          id="useCrop">
          ✂ Sample This
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  $("#closeCropper").onclick =
    () => modal.remove();

  $("#previewCrop").onclick =
    () => {

      showToast(
        "Previewing selected crop."
      );
    };

  $("#useCrop").onclick =
    () => {

      const start =
        Number(
          $("#cropStart").value
        );

      const end =
        Number(
          $("#cropEnd").value
        );

      GrooveDNA.cropStart =
        start;

      GrooveDNA.cropEnd =
        end;

      GrooveDNA.croppedSample = {
        ...sample,
        cropStart: start,
        cropEnd: end
      };

      modal.remove();

      addSampleToBeatLab(
        GrooveDNA.croppedSample
      );

      showToast(
        "Sample created and added to Beat Lab."
      );

      setTimeout(() => {
        navigate("beatlab.html");
      }, 500);
    };
}


/* =========================================================
   15. BEAT LAB — INSTRUMENT DATA
   ========================================================= */

const instrumentCatalog = [

  {
    id: "drums",
    name: "Drums",
    icon: "🥁",
    sounds: [
      "Kick",
      "Snare",
      "Hi-Hat",
      "Clap",
      "Tom",
      "Cymbal",
      "Percussion"
    ]
  },

  {
    id: "bass",
    name: "Bass",
    icon: "🎸",
    sounds: [
      "Sub Bass",
      "Funk Bass",
      "Electric Bass",
      "Synth Bass",
      "808 Bass"
    ]
  },

  {
    id: "piano",
    name: "Piano",
    icon: "🎹",
    sounds: [
      "Grand Piano",
      "Electric Piano",
      "Rhodes",
      "Wurlitzer",
      "Soul Keys"
    ]
  },

  {
    id: "guitar",
    name: "Guitar",
    icon: "🎸",
    sounds: [
      "Clean Guitar",
      "Funk Guitar",
      "Acoustic Guitar",
      "Blues Guitar",
      "Distorted Guitar"
    ]
  },

  {
    id: "synth",
    name: "Synth",
    icon: "🎛️",
    sounds: [
      "Lead",
      "Pad",
      "Pluck",
      "Arp",
      "Ambient"
    ]
  },

  {
    id: "strings",
    name: "Strings",
    icon: "🎻",
    sounds: [
      "Violin",
      "Cello",
      "Viola",
      "String Pad"
    ]
  },

  {
    id: "brass",
    name: "Brass",
    icon: "🎺",
    sounds: [
      "Trumpet",
      "Trombone",
      "Saxophone",
      "Brass Section"
    ]
  },

  {
    id: "vocals",
    name: "Vocals",
    icon: "🎤",
    sounds: [
      "Vocal Chop",
      "Harmony",
      "Ad Lib",
      "Vocal Texture"
    ]
  }
];


function setupBeatLab() {

  const lab =
    $("#beatlab") ||
    $(".beatlab");

  if (!lab) {
    return;
  }

  setupBeatControls();

  createBeatLabBrowser();

  setupBeatLabModes();

  setupBeatRecording();

  setupCollaboration();

  $("#saveBeat")?.addEventListener(
    "click",
    saveBeat
  );

  $("#clearLab")?.addEventListener(
    "click",
    clearBeatLab
  );

  $("#generateBeat")?.addEventListener(
    "click",
    generateBeat
  );
}


/* =========================================================
   16. BEAT LAB CONTROLS
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

        stopBeat();

      } else {

        play.dataset.playing =
          "true";

        play.textContent = "⏸";

        playBeat();
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
   17. BEAT LAB INSTRUMENT BROWSER
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
   18. ADD SAMPLE / SOUND TO BEAT
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

  showToast(
    `Beat Lab switched to ${
      mode === "mixer"
        ? "Music Mixer"
        : mode === "drumpad"
        ? "Drum Pad"
        : "Music Maker"
    }.`
  );
}


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


  $("#joinChallenge")
    ?.addEventListener(
      "click",
      () => {

        showToast(
          "You joined the weekly challenge."
        );
      }
    );


  $("#challengeBtn")
    ?.addEventListener(
      "click",
      () => {

        showToast(
          "Weekly challenge opened."
        );
      }
    );


  $("#dnaMatch")
    ?.addEventListener(
      "click",
      () => {

        navigate(
          "groovedna.html"
        );
      }
    );
}


/* =========================================================
   26. PROFILE
   ========================================================= */

async function setupProfile() {

  if (!GrooveDNA.user) {
    return;
  }

  const profile =
    await getProfile(
      GrooveDNA.user.id
    );

  if (!profile) {
    return;
  }

  const name =
    $(".profile-main h2");

  if (name) {

    name.textContent =
      profile.display_name ||
      profile.username ||
      GrooveDNA.user.email;
  }

  const avatar =
    $(".profile-avatar");

  if (
    avatar &&
    profile.display_name
  ) {

    avatar.textContent =
      profile.display_name
        .split(" ")
        .map(word =>
          word[0]
        )
        .join("")
        .slice(0, 2)
        .toUpperCase();
  }


  $("#profileBtn")
    ?.addEventListener(
      "click",
      openProfileEditor
    );


  setupProfileSettings();
}


async function getProfile(userId) {

  if (!supabaseClient) {
    return null;
  }

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;

  } catch (error) {

    console.warn(
      "Profile load:",
      error.message
    );

    return null;
  }
}


function openProfileEditor() {

  const modal =
    document.createElement("div");

  modal.className =
    "modal-backdrop";

  modal.innerHTML = `
    <div class="modal">

      <button
        class="modal-close"
        id="closeProfileEditor">
        ×
      </button>

      <p class="eyebrow">
        PROFILE
      </p>

      <h2>
        Edit your profile
      </h2>

      <form id="profileEditForm">

        <label>
          Username
          <input
            id="profileUsername"
            required>
        </label>

        <label>
          Display name
          <input
            id="profileDisplayName">
        </label>

        <label>
          Bio
          <textarea
            id="profileBio">
          </textarea>
        </label>

        <button
          class="btn primary"
          type="submit">
          Save Profile
        </button>

      </form>

    </div>
  `;

  document.body.appendChild(
    modal
  );

  $("#closeProfileEditor").onclick =
    () => modal.remove();


  $("#profileEditForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        if (
          !supabaseClient ||
          !GrooveDNA.user
        ) {
          return;
        }

        const username =
          $("#profileUsername")
            .value.trim();

        const displayName =
          $("#profileDisplayName")
            .value.trim();

        const bio =
          $("#profileBio")
            .value.trim();

        try {

          const {
            error
          } = await supabaseClient
            .from("profiles")
            .upsert({
              id:
                GrooveDNA.user.id,
              username,
              display_name:
                displayName,
              bio
            });

          if (error) {
            throw error;
          }

          modal.remove();

          showToast(
            "Profile updated."
          );

          await setupProfile();

        } catch (error) {

          console.error(
            error
          );

          showToast(
            "Unable to update profile."
          );
        }
      }
    );
}


/* =========================================================
   27. PROFILE SETTINGS
   ========================================================= */

function setupProfileSettings() {

  $$(".settings-tab")
    .forEach(tab => {

      tab.addEventListener(
        "click",
        () => {

          $$(".settings-tab")
            .forEach(item =>
              item.classList.remove(
                "active"
              )
            );

          tab.classList.add(
            "active"
          );

          renderSettings(
            tab.dataset.settings
          );
        }
      );
    });

  renderSettings(
    "account"
  );
}


function renderSettings(type) {

  const title =
    $("#settingsTitle");

  const list =
    $("#settingsList");

  if (!list) {
    return;
  }

  const settings = {

    account: {
      title:
        "Profile settings",

      items: [
        "Username",
        "Display name",
        "Email address",
        "Password"
      ]
    },

    playback: {
      title:
        "Playback settings",

      items: [
        "Autoplay",
        "Loop",
        "Audio quality"
      ]
    },

    notifications: {
      title:
        "Notification settings",

      items: [
        "Messages",
        "Followers",
        "Collaboration invites",
        "Community activity"
      ]
    },

    privacy: {
      title:
        "Privacy settings",

      items: [
        "Public profile",
        "Show followers",
        "Show following",
        "Allow messages"
      ]
    },

    appearance: {
      title:
        "Appearance settings",

      items: [
        "Dark mode",
        "Compact player",
        "Animation"
      ]
    }
  };

  const selected =
    settings[type] ||
    settings.account;

  if (title) {
    title.textContent =
      selected.title;
  }

  list.innerHTML =
    selected.items
      .map(item => `
        <div class="setting-row">

          <span>
            ${escapeHTML(item)}
          </span>

          <label class="toggle-label">
            <input
              type="checkbox"
              data-setting="${escapeHTML(item)}">
            <span>
              On
            </span>
          </label>

        </div>
      `)
      .join("");


  /*
    Sign out belongs in Account settings.
  */

  if (type === "account") {

    const button =
      document.createElement(
        "button"
      );

    button.className =
      "btn primary";

    button.textContent =
      "Sign Out";

    button.dataset.signout =
      "true";

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

    list.appendChild(
      button
    );
  }
}


/* =========================================================
   28. LIBRARY
   ========================================================= */

function setupLibrary() {

  $$(".library-tab")
    .forEach(tab => {

      tab.addEventListener(
        "click",
        () => {

          $$(".library-tab")
            .forEach(item =>
              item.classList.remove(
                "active"
              )
            );

          tab.classList.add(
            "active"
          );

          renderLibrary(
            tab.dataset.library
          );
        }
      );
    });

  renderLibrary(
    "all"
  );


  $("#newPlaylist")
    ?.addEventListener(
      "click",
      createPlaylist
    );
}


function renderLibrary(type) {

  const grid =
    $("#playlistGrid");

  if (!grid) {
    return;
  }

  const saved =
    JSON.parse(
      localStorage.getItem(
        "grooveDNA_saved"
      ) || "[]"
    );

  if (
    type === "songs" &&
    !saved.length
  ) {

    grid.innerHTML = `
      <div class="empty-state">
        Your liked songs will appear here.
      </div>
    `;

    return;
  }

  grid.innerHTML = `
    <article class="playlist-card">
      <div class="playlist-art">
        🎵
      </div>

      <p class="eyebrow">
        GROOVEDNA
      </p>

      <h3>
        Your Discoveries
      </h3>

      <p>
        ${saved.length}
        saved sounds
      </p>

      <button
        class="btn primary"
        data-library-play>
        ▶ Play
      </button>
    </article>

    <article class="playlist-card">
      <div class="playlist-art">
        🎸
      </div>

      <p class="eyebrow">
        PLAYLIST
      </p>

      <h3>
        Late Night Grooves
      </h3>

      <p>
        Soul · Funk · R&B
      </p>
    </article>
  `;
}


function createPlaylist() {

  const name =
    prompt(
      "Playlist name:"
    );

  if (!name) {
    return;
  }

  const playlists =
    JSON.parse(
      localStorage.getItem(
        "grooveDNA_playlists"
      ) || "[]"
    );

  playlists.push({
    id: Date.now(),
    name
  });

  localStorage.setItem(
    "grooveDNA_playlists",
    JSON.stringify(playlists)
  );

  showToast(
    `Playlist "${name}" created.`
  );

  renderLibrary(
    "playlists"
  );
}


/* =========================================================
   29. MESSAGING / NOTIFICATIONS
   ========================================================= */

function setupMessaging() {

  let button =
    $("#notificationBtn");

  if (!button) {

    button =
      document.createElement(
        "button"
      );

    button.id =
      "notificationBtn";

    button.className =
      "notification-button";

    button.textContent =
      "🔔";

    const header =
      $(".topbar");

    if (header) {
      header.appendChild(
        button
      );
    }
  }

  button.addEventListener(
    "click",
    openMessagingPanel
  );
}


function openMessagingPanel() {

  const existing =
    $("#messagePanel");

  if (existing) {
    existing.remove();
  }

  const panel =
    document.createElement(
      "div"
    );

  panel.id =
    "messagePanel";

  panel.className =
    "modal-backdrop";

  panel.innerHTML = `
    <div class="modal message-modal">

      <button
        class="modal-close"
        id="closeMessages">
        ×
      </button>

      <p class="eyebrow">
        MESSAGES
      </p>

      <h2>
        Your conversations
      </h2>

      <div
        id="conversationList">

        <button
          class="conversation"
          data-chat="community">
          @GrooveCreator
        </button>

        <button
          class="conversation"
          data-chat="collab">
          Beat Lab Collab
        </button>

      </div>

      <div
        class="chat-actions">

        <button
          class="btn secondary"
          id="voiceCall">
          📞 Call
        </button>

        <button
          class="btn secondary"
          id="videoCall">
          🎥 Video
        </button>

      </div>

      <div
        id="chatMessages"
        class="chat-messages">
      </div>

      <form id="chatForm">

        <input
          id="chatInput"
          placeholder="Write a message..."
          autocomplete="off">

        <button
          class="btn primary"
          type="submit">
          Send
        </button>

      </form>

    </div>
  `;

  document.body.appendChild(
    panel
  );

  $("#closeMessages").onclick =
    () => panel.remove();


  $("#chatForm")
    .addEventListener(
      "submit",
      event => {

        event.preventDefault();

        const input =
          $("#chatInput");

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

        $("#chatMessages")
          .appendChild(
            message
          );

        input.value = "";
      }
    );


  $("#voiceCall")
    .addEventListener(
      "click",
      () => {

        showToast(
          "Voice calling requires a realtime calling service."
        );
      }
    );


  $("#videoCall")
    .addEventListener(
      "click",
      () => {

        showToast(
          "Video calling requires WebRTC/signaling setup."
        );
      }
    );
}


/* =========================================================
   30. INITIALIZE EVERYTHING
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
   START APPLICATION
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initGrooveDNA
  );

} else {

  initGrooveDNA();
}
```
