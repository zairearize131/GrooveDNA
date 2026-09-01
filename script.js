/* =========================================================
   GROOVEDNA — SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
  "https://nzfzcnusmjboykledznh.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_qsskdrsPBxg1dECb1HY8Jg_x0rL7wR3";

const GROOVEDNA_LOGIN = "index.html";
const GROOVEDNA_HOME = "home.html";

let supabaseClient = null;

if (window.supabase) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
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
   TOAST
   ========================================================= */

function showToast(message) {
  let toast = document.getElementById("toast");

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

  clearTimeout(window.grooveDNAToastTimer);

  window.grooveDNAToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}


/* =========================================================
   AUTH MODAL
   ========================================================= */

let authMode = "signin";

function openAuthModal(mode = "signin") {
  const modal = document.getElementById("auth");

  if (!modal) return;

  const title = document.getElementById("authTitle");
  const submit = document.getElementById("authSubmit");
  const nameGroup = document.getElementById("authNameGroup");
  const toggleCopy = document.getElementById("authToggleCopy");

  authMode = mode;

  if (authMode === "signup") {
    if (title) {
      title.textContent = "Create your groove.";
    }

    if (submit) {
      submit.textContent = "Create Account";
    }

    if (nameGroup) {
      nameGroup.style.display = "block";
    }

    if (toggleCopy) {
      toggleCopy.innerHTML =
        'Already have an account? <a href="#" id="authModeToggle">Sign in</a>';
    }
  } else {
    if (title) {
      title.textContent = "Enter your groove.";
    }

    if (submit) {
      submit.textContent = "Sign In";
    }

    if (nameGroup) {
      nameGroup.style.display = "none";
    }

    if (toggleCopy) {
      toggleCopy.innerHTML =
        'New to GrooveDNA? <a href="#" id="authModeToggle">Create an account</a>';
    }
  }

  modal.classList.add("open");

  attachAuthToggle();

  const emailInput = document.getElementById("authEmail");

  if (emailInput) {
    setTimeout(() => {
      emailInput.focus();
    }, 100);
  }
}


function closeAuthModal() {
  const modal = document.getElementById("auth");

  if (modal) {
    modal.classList.remove("open");
  }
}


function attachAuthToggle() {
  const toggle =
    document.getElementById("authModeToggle");

  if (!toggle) return;

  toggle.onclick = function (event) {
    event.preventDefault();

    openAuthModal(
      authMode === "signin"
        ? "signup"
        : "signin"
    );
  };
}


/* =========================================================
   CREATE ACCOUNT
   ========================================================= */

async function createGrooveDNAAccount(
  email,
  password,
  displayName
) {
  if (!supabaseClient) {
    showToast(
      "Supabase could not be initialized."
    );
    return false;
  }

  const { data, error } =
    await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          display_name: displayName || ""
        }
      }
    });

  if (error) {
    console.error(
      "GrooveDNA sign-up error:",
      error
    );

    showToast(error.message);

    return false;
  }

  /*
    If email confirmation is enabled,
    Supabase creates the account but does not
    immediately create an active session.
  */

  if (data.user && !data.session) {
    closeAuthModal();

    showToast(
      "Account created! Check your email to confirm your account."
    );

    return true;
  }

  if (data.session) {
    showToast(
      "Your GrooveDNA account has been created!"
    );

    window.location.href = GROOVEDNA_HOME;

    return true;
  }

  showToast(
    "Account created. Please sign in."
  );

  return true;
}


/* =========================================================
   SIGN IN
   ========================================================= */

async function signIntoGrooveDNA(
  email,
  password
) {
  if (!supabaseClient) {
    showToast(
      "Supabase could not be initialized."
    );
    return false;
  }

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

  if (error) {
    console.error(
      "GrooveDNA sign-in error:",
      error
    );

    showToast(error.message);

    return false;
  }

  if (!data.session) {
    showToast(
      "No active session was created."
    );

    return false;
  }

  showToast(
    "Welcome back to GrooveDNA!"
  );

  window.location.href = GROOVEDNA_HOME;

  return true;
}


/* =========================================================
   SIGN OUT
   ========================================================= */

async function signOutOfGrooveDNA(event) {
  if (event) {
    event.preventDefault();
  }

  if (!supabaseClient) {
    window.location.href = GROOVEDNA_LOGIN;
    return;
  }

  const { error } =
    await supabaseClient.auth.signOut();

  if (error) {
    console.error(
      "GrooveDNA sign-out error:",
      error
    );

    showToast(error.message);

    return;
  }

  window.location.href =
    GROOVEDNA_LOGIN;
}


/* =========================================================
   AUTH FORM
   ========================================================= */

function setupAuthForm() {
  const form =
    document.getElementById("authForm");

  if (!form) return;

  form.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      const emailInput =
        document.getElementById("authEmail");

      const passwordInput =
        document.getElementById("authPassword");

      const nameInput =
        document.getElementById("authName");

      const submitButton =
        document.getElementById("authSubmit");

      const email =
        emailInput
          ? emailInput.value.trim()
          : "";

      const password =
        passwordInput
          ? passwordInput.value
          : "";

      const displayName =
        nameInput
          ? nameInput.value.trim()
          : "";

      if (!email || !password) {
        showToast(
          "Please enter your email and password."
        );

        return;
      }

      if (password.length < 6) {
        showToast(
          "Password must be at least 6 characters."
        );

        return;
      }

      if (submitButton) {
        submitButton.disabled = true;

        submitButton.textContent =
          authMode === "signup"
            ? "Creating Account..."
            : "Signing In...";
      }

      try {
        if (authMode === "signup") {
          await createGrooveDNAAccount(
            email,
            password,
            displayName
          );
        } else {
          await signIntoGrooveDNA(
            email,
            password
          );
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;

          submitButton.textContent =
            authMode === "signup"
              ? "Create Account"
              : "Sign In";
        }
      }
    }
  );
}


/* =========================================================
   LANDING PAGE AUTH BUTTONS
   ========================================================= */

function setupLandingAuthButtons() {
  const signInLink =
    document.getElementById("signInLink");

  const createAccountLink =
    document.getElementById(
      "createAccountLink"
    );

  if (signInLink) {
    signInLink.addEventListener(
      "click",
      function (event) {
        event.preventDefault();

        openAuthModal("signin");
      }
    );
  }

  if (createAccountLink) {
    createAccountLink.addEventListener(
      "click",
      function (event) {
        event.preventDefault();

        openAuthModal("signup");
      }
    );
  }

  const authModal =
    document.getElementById("auth");

  if (authModal) {
    authModal.addEventListener(
      "click",
      function (event) {
        if (
          event.target === authModal
        ) {
          closeAuthModal();
        }
      }
    );
  }

  const closeButton =
    document.querySelector(
      ".auth-modal-backdrop .modal-close"
    );

  if (closeButton) {
    closeButton.addEventListener(
      "click",
      function (event) {
        event.preventDefault();

        closeAuthModal();
      }
    );
  }

  attachAuthToggle();
}


/* =========================================================
   GET CURRENT SESSION
   ========================================================= */

async function getGrooveDNASession() {
  if (!supabaseClient) {
    return null;
  }

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();

  if (error) {
    console.error(
      "GrooveDNA session error:",
      error
    );

    return null;
  }

  return data.session;
}


/* =========================================================
   PROTECT APP PAGES
   ========================================================= */

async function protectGrooveDNAPage() {
  if (!supabaseClient) {
    return;
  }

  const currentPage =
    window.location.pathname
      .split("/")
      .pop()
      .toLowerCase();

  const publicPages = [
    "",
    "index.html"
  ];

  if (
    publicPages.includes(currentPage)
  ) {
    return;
  }

  const session =
    await getGrooveDNASession();

  if (!session) {
    window.location.href =
      GROOVEDNA_LOGIN;
  }
}


/* =========================================================
   SIGN-OUT LINKS
   ========================================================= */

function setupSignOutButtons() {
  const signOutButtons =
    document.querySelectorAll(
      'a[href="index.html"], [data-signout]'
    );

  signOutButtons.forEach(
    (button) => {
      const text =
        button.textContent
          .trim()
          .toLowerCase();

      if (
        text.includes("sign out") ||
        button.hasAttribute("data-signout")
      ) {
        button.addEventListener(
          "click",
          signOutOfGrooveDNA
        );
      }
    }
  );
}


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

function setupAuthStateListener() {
  if (!supabaseClient) {
    return;
  }

  supabaseClient.auth.onAuthStateChange(
    (event, session) => {
      console.log(
        "GrooveDNA auth event:",
        event
      );

      const currentPage =
        window.location.pathname
          .split("/")
          .pop()
          .toLowerCase();

      if (
        event === "SIGNED_OUT" &&
        currentPage !== "index.html"
      ) {
        window.location.href =
          GROOVEDNA_LOGIN;
      }

      if (
        event === "SIGNED_IN" &&
        session &&
        currentPage === "index.html"
      ) {
        window.location.href =
          GROOVEDNA_HOME;
      }
    }
  );
}


/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

function setupMobileNavigation() {
  const menuToggle =
    document.getElementById(
      "menuToggle"
    );

  const mainNav =
    document.getElementById(
      "mainNav"
    );

  if (!menuToggle || !mainNav) {
    return;
  }

  menuToggle.addEventListener(
    "click",
    function () {
      const isOpen =
        mainNav.classList.toggle("open");

      menuToggle.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    }
  );

  mainNav
    .querySelectorAll("a")
    .forEach((link) => {
      link.addEventListener(
        "click",
        () => {
          mainNav.classList.remove("open");

          menuToggle.setAttribute(
            "aria-expanded",
            "false"
          );
        }
      );
    });
}


/* =========================================================
   DISCOVER SAMPLE DATA
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
  },
  {
    id: 7,
    title: "Neon Pocket",
    artist: "After Hours",
    genre: "R&B",
    type: "Drum Groove",
    bpm: 90,
    key: "F Minor",
    rights: "Cleared / Licensed",
    icon: "🎧"
  },
  {
    id: 8,
    title: "Blue Room",
    artist: "Late Set",
    genre: "Jazz",
    type: "Piano Phrase",
    bpm: 78,
    key: "B♭ Major",
    rights: "Check Rights",
    icon: "🎷"
  }
];

let selectedGenre = "All";
let searchTerm = "";


/* =========================================================
   DISCOVER FILTERING
   ========================================================= */

function filteredSamples() {
  return samples.filter(
    (sample) => {
      const genreMatch =
        selectedGenre === "All" ||
        sample.genre === selectedGenre;

      const searchMatch =
        !searchTerm ||
        [
          sample.title,
          sample.artist,
          sample.genre,
          sample.type,
          sample.key
        ]
          .join(" ")
          .toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          );

      return genreMatch && searchMatch;
    }
  );
}


/* =========================================================
   RIGHTS
   ========================================================= */

function rightsClass(rights) {
  if (
    rights.startsWith("Cleared")
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
   RENDER SAMPLES
   ========================================================= */

function renderSamples() {
  const sampleGrid =
    document.getElementById(
      "sampleGrid"
    );

  const resultCount =
    document.getElementById(
      "resultCount"
    );

  if (!sampleGrid) {
    return;
  }

  const results =
    filteredSamples();

  if (resultCount) {
    resultCount.textContent =
      `${results.length} sounds found`;
  }

  if (!results.length) {
    sampleGrid.innerHTML =
      `<div class="empty-state">
        No sounds matched your search.
      </div>`;

    return;
  }

  sampleGrid.innerHTML =
    results.map(
      (sample) => `
        <article
          class="sample-card"
          data-genre="${sample.genre}"
          data-id="${sample.id}"
        >
          <div class="sample-art">
            <span class="genre-tag">
              ${sample.genre}
            </span>

            <span class="sample-icon">
              ${sample.icon}
            </span>
          </div>

          <div class="sample-info">
            <h3>${sample.title}</h3>

            <p>
              ${sample.artist} ·
              ${sample.type}
            </p>

            <div class="track-meta">
              <span>${sample.bpm} BPM</span>
              <span>${sample.key}</span>
            </div>

            <span class="rights ${rightsClass(sample.rights)}">
              ${sample.rights}
            </span>

            <div class="sample-actions">
              <button
                type="button"
                data-preview="${sample.id}"
              >
                ▶ Preview
              </button>

              <button
                type="button"
                data-save="${sample.id}"
              >
                ♡ Save
              </button>

              <button
                type="button"
                data-add="${sample.id}"
              >
                ＋ Beat Lab
              </button>
            </div>
          </div>
        </article>
      `
    ).join("");
}


/* =========================================================
   DISCOVER CONTROLS
   ========================================================= */

function setupDiscover() {
  const sampleGrid =
    document.getElementById(
      "sampleGrid"
    );

  const searchInput =
    document.getElementById(
      "searchInput"
    );

  const searchButton =
    document.getElementById(
      "searchBtn"
    );

  const uploadButton =
    document.getElementById(
      "uploadBtn2"
    );

  const audioUpload =
    document.getElementById(
      "audioUpload"
    );

  const filters =
    document.querySelectorAll(
      ".filter"
    );

  filters.forEach(
    (filter) => {
      filter.addEventListener(
        "click",
        () => {
          filters.forEach(
            (item) =>
              item.classList.remove(
                "active"
              )
          );

          filter.classList.add(
            "active"
          );

          selectedGenre =
            filter.dataset.genre ||
            "All";

          renderSamples();
        }
      );
    }
  );

  function runSearch() {
    searchTerm =
      searchInput
        ? searchInput.value.trim()
        : "";

    renderSamples();
  }

  if (searchButton) {
    searchButton.addEventListener(
      "click",
      runSearch
    );
  }

  if (searchInput) {
    searchInput.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter"
        ) {
          event.preventDefault();
          runSearch();
        }
      }
    );
  }

  if (uploadButton) {
    uploadButton.addEventListener(
      "click",
      () => {
        if (audioUpload) {
          audioUpload.click();
        } else {
          showToast(
            "Audio upload is not configured on this page."
          );
        }
      }
    );
  }

  if (audioUpload) {
    audioUpload.addEventListener(
      "change",
      () => {
        if (
          audioUpload.files &&
          audioUpload.files.length
        ) {
          showToast(
            `Selected: ${audioUpload.files[0].name}`
          );
        }
      }
    );
  }

  if (sampleGrid) {
    sampleGrid.addEventListener(
      "click",
      (event) => {
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
          const id =
            Number(
              preview.dataset.preview
            );

          const sample =
            samples.find(
              (item) =>
                item.id === id
            );

          if (sample) {
            showToast(
              `▶ Previewing ${sample.title}`
            );
          }
        }

        if (save) {
          const id =
            Number(
              save.dataset.save
            );

          let saved =
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
              "✓ Saved to your library!"
            );
          } else {
            showToast(
              "Already saved to your library."
            );
          }
        }

        if (add) {
          const id =
            Number(
              add.dataset.add
            );

          const sample =
            samples.find(
              (item) =>
                item.id === id
            );

          if (sample) {
            addSampleToBeatLab(sample);
          }
        }
      }
    );
  }

  renderSamples();
}


/* =========================================================
   ADD SAMPLE TO BEAT LAB
   ========================================================= */

function addSampleToBeatLab(sample) {
  const timeline =
    document.getElementById(
      "timeline"
    );

  const empty =
    document.getElementById(
      "labEmpty"
    );

  if (!timeline) {
    showToast(
      "Open Beat Lab to add samples."
    );

    return;
  }

  if (empty) {
    empty.style.display = "none";
  }

  let sampleTrack =
    timeline.querySelector(
      ".track.samples .track-lane"
    );

  if (!sampleTrack) {
    const tracks =
      timeline.querySelectorAll(
        ".track"
      );

    sampleTrack =
      tracks.length
        ? tracks[tracks.length - 1].querySelector(
            ".track-lane"
          )
        : null;
  }

  if (!sampleTrack) {
    showToast(
      "Sample track is unavailable."
    );

    return;
  }

  const clip =
    document.createElement("div");

  clip.className =
    "clip melody";

  clip.title =
    sample.title;

  clip.textContent =
    sample.title;

  clip.style.width =
    `${Math.floor(
      Math.random() * 30 + 35
    )}%`;

  sampleTrack.appendChild(
    clip
  );

  showToast(
    `✓ ${sample.title} added to Beat Lab`
  );
}


/* =========================================================
   BEAT LAB
   ========================================================= */

function setupBeatLab() {
  const labPlay =
    document.getElementById(
      "labPlay"
    );

  const bpm =
    document.getElementById(
      "bpm"
    );

  const bpmValue =
    document.getElementById(
      "bpmValue"
    );

  const pitch =
    document.getElementById(
      "pitch"
    );

  const pitchValue =
    document.getElementById(
      "pitchValue"
    );

  const saveBeat =
    document.getElementById(
      "saveBeat"
    );

  const clearLab =
    document.getElementById(
      "clearLab"
    );

  const generateBeat =
    document.getElementById(
      "generateBeat"
    );

  if (bpm && bpmValue) {
    bpm.addEventListener(
      "input",
      () => {
        bpmValue.textContent =
          bpm.value;
      }
    );
  }

  if (pitch && pitchValue) {
    pitch.addEventListener(
      "input",
      () => {
        const value =
          Number(pitch.value);

        pitchValue.textContent =
          value > 0
            ? `+${value}`
            : String(value);
      }
    );
  }

  if (labPlay) {
    labPlay.addEventListener(
      "click",
      () => {
        const playing =
          labPlay.dataset.playing ===
          "true";

        labPlay.dataset.playing =
          String(!playing);

        labPlay.textContent =
          playing
            ? "▶"
            : "⏸";

        showToast(
          playing
            ? "Beat Lab paused."
            : "Beat Lab playing."
        );
      }
    );
  }

  if (saveBeat) {
    saveBeat.addEventListener(
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
  }

  if (clearLab) {
    clearLab.addEventListener(
      "click",
      () => {
        const clips =
          document.querySelectorAll(
            "#timeline .clip"
          );

        clips.forEach(
          (clip) =>
            clip.remove()
        );

        const empty =
          document.getElementById(
            "labEmpty"
          );

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

  if (generateBeat) {
    generateBeat.addEventListener(
      "click",
      () => {
        const tracks =
          document.querySelectorAll(
            "#timeline .track"
          );

        tracks.forEach(
          (track) => {
            const lane =
              track.querySelector(
                ".track-lane"
              );

            if (!lane) return;

            const clip =
              document.createElement(
                "div"
              );

            clip.className =
              "clip melody";

            clip.style.width =
              `${Math.floor(
                Math.random() * 45 + 30
              )}%`;

            lane.appendChild(
              clip
            );
          }
        );

        const empty =
          document.getElementById(
            "labEmpty"
          );

        if (empty) {
          empty.style.display =
            "none";
        }

        showToast(
          "✦ New groove generated!"
        );
      }
    );
  }
}


/* =========================================================
   COMMUNITY
   ========================================================= */

function setupCommunity() {
  const likeButtons =
    document.querySelectorAll(
      "[data-like]"
    );

  likeButtons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          const count =
            button.querySelector(
              "span"
            );

          if (!button.dataset.liked) {
            button.dataset.liked =
              "true";

            if (count) {
              count.textContent =
                Number(
                  count.textContent
                ) + 1;
            }

            button.firstChild.textContent =
              "♥ ";
          }
        }
      );
    }
  );

  const followButtons =
    document.querySelectorAll(
      "[data-follow]"
    );

  followButtons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          const following =
            button.dataset.following ===
            "true";

          button.dataset.following =
            String(!following);

          button.textContent =
            following
              ? "＋ Follow"
              : "✓ Following";
        }
      );
    }
  );

  const remixButtons =
    document.querySelectorAll(
      "[data-remix]"
    );

  remixButtons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          showToast(
            "↻ Remix idea added to Beat Lab."
          );
        }
      );
    }
  );

  const joinChallenge =
    document.getElementById(
      "joinChallenge"
    );

  if (joinChallenge) {
    joinChallenge.addEventListener(
      "click",
      () => {
        showToast(
          "✓ You're in the challenge!"
        );
      }
    );
  }

  const challengeButton =
    document.getElementById(
      "challengeBtn"
    );

  if (challengeButton) {
    challengeButton.addEventListener(
      "click",
      () => {
        showToast(
          "Weekly Challenge: Flip the Funk"
        );
      }
    );
  }

  const dnaMatch =
    document.getElementById(
      "dnaMatch"
    );

  if (dnaMatch) {
    dnaMatch.addEventListener(
      "click",
      () => {
        window.location.href =
          "groovedna.html";
      }
    );
  }
}


/* =========================================================
   GROOVEDNA PAGE
   ========================================================= */

function setupGrooveDNA() {
  const shareDNA =
    document.getElementById(
      "shareDNA"
    );

  if (shareDNA) {
    shareDNA.addEventListener(
      "click",
      async () => {
        const shareText =
          "My GrooveDNA — Find the Sound. Flip the Groove.";

        if (
          navigator.share
        ) {
          try {
            await navigator.share({
              title: "My GrooveDNA",
              text: shareText,
              url: window.location.href
            });
          } catch (error) {
            if (
              error.name !==
              "AbortError"
            ) {
              showToast(
                "Unable to share right now."
              );
            }
          }
        } else {
          try {
            await navigator.clipboard.writeText(
              window.location.href
            );

            showToast(
              "✓ GrooveDNA link copied!"
            );
          } catch {
            showToast(
              "Copy this page URL to share your DNA."
            );
          }
        }
      }
    );
  }

  const moodButtons =
    document.querySelectorAll(
      "[data-mood]"
    );

  moodButtons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          showToast(
            `Playing ${button.dataset.mood} vibes.`
          );
        }
      );
    }
  );
}


/* =========================================================
   LIBRARY
   ========================================================= */

const playlists = [
  {
    title: "Funk Essentials",
    subtitle: "18 songs",
    icon: "🕺",
    type: "playlists"
  },
  {
    title: "Late Night Soul",
    subtitle: "24 songs",
    icon: "🌙",
    type: "playlists"
  },
  {
    title: "Guitar Energy",
    subtitle: "16 songs",
    icon: "🎸",
    type: "playlists"
  },
  {
    title: "Neon R&B",
    subtitle: "21 songs",
    icon: "🎧",
    type: "albums"
  }
];

function renderLibrary() {
  const grid =
    document.getElementById(
      "playlistGrid"
    );

  if (!grid) return;

  grid.innerHTML =
    playlists.map(
      (playlist) => `
        <article
          class="playlist-card"
          data-library-type="${playlist.type}"
        >
          <div class="playlist-art">
            ${playlist.icon}
          </div>

          <strong>
            ${playlist.title}
          </strong>

          <small>
            ${playlist.subtitle}
          </small>
        </article>
      `
    ).join("");
}


function setupLibrary() {
  const tabs =
    document.querySelectorAll(
      ".library-tab"
    );

  const grid =
    document.getElementById(
      "playlistGrid"
    );

  renderLibrary();

  tabs.forEach(
    (tab) => {
      tab.addEventListener(
        "click",
        () => {
          tabs.forEach(
            (item) =>
              item.classList.remove(
                "active"
              )
          );

          tab.classList.add(
            "active"
          );

          const type =
            tab.dataset.library;

          if (!grid) return;

          const cards =
            grid.querySelectorAll(
              ".playlist-card"
            );

          cards.forEach(
            (card) => {
              if (
                type === "all" ||
                card.dataset.libraryType ===
                  type
              ) {
                card.style.display =
                  "";
              } else {
                card.style.display =
                  "none";
              }
            }
          );
        }
      );
    }
  );

  const newPlaylist =
    document.getElementById(
      "newPlaylist"
    );

  if (newPlaylist) {
    newPlaylist.addEventListener(
      "click",
      () => {
        const name =
          window.prompt(
            "Name your new playlist:"
          );

        if (
          name &&
          name.trim()
        ) {
          showToast(
            `✓ Playlist "${name.trim()}" created!`
          );
        }
      }
    );
  }

  const viewArtists =
    document.getElementById(
      "viewArtists"
    );

  if (viewArtists) {
    viewArtists.addEventListener(
      "click",
      () => {
        showToast(
          "Showing artists in your orbit."
        );
      }
    );
  }
}


/* =========================================================
   PROFILE
   ========================================================= */

function setupProfile() {
  const profileButton =
    document.getElementById(
      "profileBtn"
    );

  if (profileButton) {
    profileButton.addEventListener(
      "click",
      () => {
        showToast(
          "Profile editing is ready."
        );
      }
    );
  }

  const settingsTabs =
    document.querySelectorAll(
      ".settings-tab"
    );

  const settingsTitle =
    document.getElementById(
      "settingsTitle"
    );

  const settingsList =
    document.getElementById(
      "settingsList"
    );

  const settings = {
    account: {
      title: "Profile settings",
      items: [
        [
          "Display name",
          "Change the name shown to creators."
        ],
        [
          "Email",
          "Manage your GrooveDNA account email."
        ]
      ]
    },

    playback: {
      title: "Playback settings",
      items: [
        [
          "Autoplay",
          "Start recommended sounds automatically."
        ],
        [
          "High quality audio",
          "Prefer higher quality playback."
        ]
      ]
    },

    notifications: {
      title: "Notification settings",
      items: [
        [
          "New recommendations",
          "Get notified about fresh sounds."
        ],
        [
          "Community activity",
          "Get updates about creators and challenges."
        ]
      ]
    },

    privacy: {
      title: "Privacy settings",
      items: [
        [
          "Public profile",
          "Allow other creators to discover your profile."
        ],
        [
          "Listening activity",
          "Show recent listening activity to followers."
        ]
      ]
    },

    appearance: {
      title: "Appearance settings",
      items: [
        [
          "Dark interface",
          "Use the GrooveDNA dark interface."
        ],
        [
          "Reduced motion",
          "Reduce interface animations."
        ]
      ]
    }
  };

  function renderSettings(type) {
    const setting =
      settings[type];

    if (!setting) return;

    if (settingsTitle) {
      settingsTitle.textContent =
        setting.title;
    }

    if (!settingsList) return;

    settingsList.innerHTML =
      setting.items.map(
        (item) => `
          <div class="setting-row">
            <div>
              <strong>${item[0]}</strong>
              <small>${item[1]}</small>
            </div>

            <label class="switch">
              <input type="checkbox">
              <span></span>
            </label>
          </div>
        `
      ).join("");
  }

  settingsTabs.forEach(
    (tab) => {
      tab.addEventListener(
        "click",
        () => {
          settingsTabs.forEach(
            (item) =>
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
    }
  );

  renderSettings("account");
}


/* =========================================================
   INITIALIZE GROOVEDNA
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    setupAuthForm();
    setupLandingAuthButtons();
    setupSignOutButtons();
    setupAuthStateListener();

    setupMobileNavigation();

    setupDiscover();
    setupBeatLab();
    setupCommunity();
    setupGrooveDNA();
    setupLibrary();
    setupProfile();

    await protectGrooveDNAPage();
  }
);
