```javascript
/* =========================================================
   GROOVEDNA - MAIN JAVASCRIPT
   Shared across all GrooveDNA pages
   ========================================================= */

/* =========================================================
   SUPABASE CONFIGURATION
   Replace these with your actual Supabase project values.
   Supabase Dashboard:
   Project Settings -> API
   ========================================================= */

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

let supabaseClient = null;

if (
  window.supabase &&
  SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY"
) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

function showToast(message) {
  const toast = $("#toast");

  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.grooveToastTimer);

  window.grooveToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function safeClick(selector, callback) {
  const element = $(selector);

  if (element) {
    element.addEventListener("click", callback);
  }

  return element;
}

function getCurrentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

function initMobileNavigation() {
  const menuToggle = $("#menuToggle");
  const mainNav = $("#mainNav");

  if (!menuToggle || !mainNav) return;

  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation" : "Open navigation"
    );
  });

  $$("#mainNav a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
    });
  });
}

/* =========================================================
   LANDING PAGE AUTH MODAL
   ========================================================= */

let authMode = "signin";

function initAuthModal() {
  const authModal = $("#auth");
  const authForm = $("#authForm");

  if (!authModal || !authForm) return;

  const authTitle = $("#authTitle");
  const authSubmit = $("#authSubmit");
  const authNameGroup = $("#authNameGroup");
  const authToggleCopy = $("#authToggleCopy");
  const authModeToggle = $("#authModeToggle");

  function openAuth(mode = "signin") {
    authMode = mode;

    authModal.classList.add("open");
    document.body.classList.add("modal-open");

    updateAuthUI();

    const emailInput = $("#authEmail");

    if (emailInput) {
      setTimeout(() => emailInput.focus(), 100);
    }
  }

  function closeAuth() {
    authModal.classList.remove("open");
    document.body.classList.remove("modal-open");
  }

  function updateAuthUI() {
    if (authMode === "signup") {
      if (authTitle) {
        authTitle.textContent = "Create your GrooveDNA account.";
      }

      if (authSubmit) {
        authSubmit.textContent = "Create Account";
      }

      if (authNameGroup) {
        authNameGroup.style.display = "block";
      }

      if (authToggleCopy) {
        authToggleCopy.innerHTML =
          'Already have an account? <a href="#" id="authModeToggle">Sign in</a>';
      }
    } else {
      if (authTitle) {
        authTitle.textContent = "Enter your groove.";
      }

      if (authSubmit) {
        authSubmit.textContent = "Sign In";
      }

      if (authNameGroup) {
        authNameGroup.style.display = "none";
      }

      if (authToggleCopy) {
        authToggleCopy.innerHTML =
          'New to GrooveDNA? <a href="#" id="authModeToggle">Create an account</a>';
      }
    }

    const newToggle = $("#authModeToggle");

    if (newToggle) {
      newToggle.addEventListener("click", (event) => {
        event.preventDefault();

        authMode =
          authMode === "signin"
            ? "signup"
            : "signin";

        updateAuthUI();
      });
    }
  }

  /* Open authentication modal */

  $$("#signInLink, [href='#auth']").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      const text = link.textContent.toLowerCase();

      if (
        text.includes("create") ||
        text.includes("start")
      ) {
        openAuth("signup");
      } else {
        openAuth("signin");
      }
    });
  });

  /* Close button */

  const closeButton = authModal.querySelector(".modal-close");

  if (closeButton) {
    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      closeAuth();
    });
  }

  /* Click outside modal */

  authModal.addEventListener("click", (event) => {
    if (event.target === authModal) {
      closeAuth();
    }
  });

  /* Escape key */

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      authModal.classList.contains("open")
    ) {
      closeAuth();
    }
  });

  /* Authentication */

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
      showToast(
        "Supabase is not configured. Add your project URL and anon key to script.js."
      );
      return;
    }

    const email = $("#authEmail")?.value.trim();
    const password = $("#authPassword")?.value;
    const displayName = $("#authName")?.value.trim();

    if (!email || !password) {
      showToast("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters.");
      return;
    }

    if (authSubmit) {
      authSubmit.disabled = true;
      authSubmit.textContent =
        authMode === "signup"
          ? "Creating..."
          : "Signing in...";
    }

    try {
      if (authMode === "signup") {
        const { data, error } =
          await supabaseClient.auth.signUp({
            email,
            password,
            options: {
              data: {
                display_name:
                  displayName || email.split("@")[0]
              }
            }
          });

        if (error) {
          throw error;
        }

        /*
          Supabase may require email confirmation.
        */

        if (data.session) {
          showToast("Account created. Welcome to GrooveDNA!");

          window.location.href = "home.html";
        } else {
          showToast(
            "Account created! Check your email to confirm your account."
          );
        }
      } else {
        const { data, error } =
          await supabaseClient.auth.signInWithPassword({
            email,
            password
          });

        if (error) {
          throw error;
        }

        if (!data.session) {
          throw new Error(
            "Sign in completed but no session was created."
          );
        }

        showToast("Welcome back!");

        window.location.href = "home.html";
      }
    } catch (error) {
      console.error("Authentication error:", error);

      let message = error.message || "Authentication failed.";

      if (
        message.toLowerCase().includes("invalid login credentials")
      ) {
        message =
          "Email or password is incorrect.";
      }

      if (
        message.toLowerCase().includes("user already registered")
      ) {
        message =
          "An account with this email already exists. Try signing in.";
      }

      showToast(message);
    } finally {
      if (authSubmit) {
        authSubmit.disabled = false;
        authSubmit.textContent =
          authMode === "signup"
            ? "Create Account"
            : "Sign In";
      }
    }
  });

  updateAuthUI();
}

/* =========================================================
   SESSION / LOGIN PROTECTION
   ========================================================= */

async function getCurrentUser() {
  if (!supabaseClient) {
    return null;
  }

  const { data, error } =
    await supabaseClient.auth.getUser();

  if (error) {
    console.error("Unable to get user:", error);
    return null;
  }

  return data.user;
}

async function requireAuthentication() {
  if (!supabaseClient) {
    console.warn(
      "Supabase is not configured. Page protection is disabled."
    );
    return null;
  }

  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "index.html#auth";
    return null;
  }

  return user;
}

async function initAuthenticatedPage() {
  const page = getCurrentPage();

  /*
    index.html is the public landing page.
  */

  if (page === "index.html") {
    return;
  }

  const protectedPages = [
    "home.html",
    "discover.html",
    "groovedna.html",
    "beatlab.html",
    "community.html",
    "library.html",
    "profile.html"
  ];

  if (!protectedPages.includes(page)) {
    return;
  }

  const user = await requireAuthentication();

  if (!user) return;

  /*
    Put current user's display name into elements
    that request it.
  */

  const metadata = user.user_metadata || {};

  const displayName =
    metadata.display_name ||
    user.email?.split("@")[0] ||
    "Creator";

  $$(".current-user-name").forEach((element) => {
    element.textContent = displayName;
  });

  $$(".current-user-email").forEach((element) => {
    element.textContent = user.email || "";
  });
}

/* =========================================================
   SIGN OUT
   ========================================================= */

async function signOutUser() {
  if (!supabaseClient) {
    showToast(
      "Supabase is not configured."
    );
    return;
  }

  try {
    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }

    localStorage.removeItem("grooveDNA_saved");
    localStorage.removeItem("grooveDNA_beatSaved");

    window.location.href = "index.html";
  } catch (error) {
    console.error("Sign out error:", error);
    showToast(
      error.message || "Unable to sign out."
    );
  }
}

function initSignOutButtons() {
  $$("#signOutBtn, #footerSignOutBtn, .sign-out-btn").forEach(
    (button) => {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        await signOutUser();
      });
    }
  );
}

/* =========================================================
   DISCOVER PAGE
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
    title: "Neon Rhythm",
    artist: "City Soul",
    genre: "R&B",
    type: "Rhythm",
    bpm: 102,
    key: "F Minor",
    rights: "Cleared / Licensed",
    icon: "🎙"
  },
  {
    id: 8,
    title: "Late Night Sax",
    artist: "Jazz Archive",
    genre: "Jazz",
    type: "Saxophone",
    bpm: 88,
    key: "B♭ Major",
    rights: "Check Rights",
    icon: "🎷"
  }
];

let selectedGenre = "All";
let searchTerm = "";

function rightsClass(rights) {
  if (rights.startsWith("Cleared")) {
    return "cleared";
  }

  if (rights === "Restricted") {
    return "restricted";
  }

  return "caution";
}

function filteredSamples() {
  return samples.filter((sample) => {
    const matchesGenre =
      selectedGenre === "All" ||
      sample.genre === selectedGenre;

    const searchable = [
      sample.title,
      sample.artist,
      sample.genre,
      sample.type,
      sample.key
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !searchTerm ||
      searchable.includes(searchTerm.toLowerCase());

    return matchesGenre && matchesSearch;
  });
}

function renderSamples() {
  const sampleGrid = $("#sampleGrid");
  const resultCount = $("#resultCount");

  if (!sampleGrid) return;

  const results = filteredSamples();

  if (resultCount) {
    resultCount.textContent =
      `${results.length} sounds found`;
  }

  if (!results.length) {
    sampleGrid.innerHTML = `
      <div class="empty-state">
        No sounds found. Try another search or genre.
      </div>
    `;
    return;
  }

  sampleGrid.innerHTML = results
    .map(
      (sample) => `
      <article class="sample-card" data-id="${sample.id}" data-genre="${sample.genre}">
        <div class="sample-art">
          <span class="genre-tag">${sample.genre}</span>
          <span class="sample-icon">${sample.icon}</span>
        </div>

        <div class="sample-info">
          <h3>${sample.title}</h3>
          <p>
            ${sample.artist} • ${sample.type}
          </p>

          <div class="track-meta">
            <span>${sample.bpm} BPM</span>
            <span>${sample.key}</span>
          </div>

          <span class="rights ${rightsClass(sample.rights)}">
            ● ${sample.rights}
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
    )
    .join("");
}

function initDiscoverPage() {
  const sampleGrid = $("#sampleGrid");

  if (!sampleGrid) return;

  $$("#genreFilters .filter").forEach((button) => {
    button.addEventListener("click", () => {
      $$("#genreFilters .filter").forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      selectedGenre =
        button.dataset.genre || "All";

      renderSamples();
    });
  });

  safeClick("#searchBtn", () => {
    searchTerm =
      $("#searchInput")?.value.trim() || "";

    renderSamples();
  });

  const searchInput = $("#searchInput");

  if (searchInput) {
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();

        searchTerm =
          searchInput.value.trim();

        renderSamples();
      }
    });
  }

  safeClick("#discoverMore", () => {
    searchTerm = "";

    if (searchInput) {
      searchInput.value = "";
    }

    selectedGenre = "All";

    $$("#genreFilters .filter").forEach(
      (button) => {
        button.classList.toggle(
          "active",
          button.dataset.genre === "All"
        );
      }
    );

    renderSamples();

    showToast("Fresh GrooveDNA picks loaded.");
  });

  sampleGrid.addEventListener("click", (event) => {
    const previewButton =
      event.target.closest("[data-preview]");

    const saveButton =
      event.target.closest("[data-save]");

    const addButton =
      event.target.closest("[data-add]");

    if (previewButton) {
      const sample = samples.find(
        (item) =>
          item.id ===
          Number(previewButton.dataset.preview)
      );

      if (sample) {
        showToast(
          `▶ Previewing ${sample.title}`
        );
      }

      return;
    }

    if (saveButton) {
      const id =
        Number(saveButton.dataset.save);

      const saved = JSON.parse(
        localStorage.getItem("grooveDNA_saved") ||
          "[]"
      );

      if (!saved.includes(id)) {
        saved.push(id);

        localStorage.setItem(
          "grooveDNA_saved",
          JSON.stringify(saved)
        );

        showToast("✓ Saved to your library.");
      } else {
        showToast("Already saved to your library.");
      }

      return;
    }

    if (addButton) {
      const sample = samples.find(
        (item) =>
          item.id ===
          Number(addButton.dataset.add)
      );

      if (!sample) return;

      localStorage.setItem(
        "grooveDNA_lastSample",
        JSON.stringify(sample)
      );

      showToast(
        `${sample.title} added to Beat Lab.`
      );

      setTimeout(() => {
        window.location.href =
          "beatlab.html";
      }, 500);
    }
  });

  renderSamples();
}

/* =========================================================
   AUDIO UPLOAD
   ========================================================= */

function initAudioUpload() {
  const uploadButton =
    $("#uploadBtn2") || $("#uploadBtn");

  const audioUpload =
    $("#audioUpload");

  if (!uploadButton || !audioUpload) return;

  uploadButton.addEventListener("click", () => {
    audioUpload.click();
  });

  audioUpload.addEventListener("change", () => {
    const file = audioUpload.files?.[0];

    if (!file) return;

    showToast(
      `Uploaded: ${file.name}`
    );
  });
}

/* =========================================================
   BEAT LAB
   ========================================================= */

function initBeatLab() {
  const timeline = $("#timeline");

  if (!timeline) return;

  const labPlay = $("#labPlay");
  const bpm = $("#bpm");
  const bpmValue = $("#bpmValue");
  const pitch = $("#pitch");
  const pitchValue = $("#pitchValue");
  const loopToggle = $("#loopToggle");
  const labEmpty = $("#labEmpty");

  safeClick("#clearLab", () => {
    timeline
      .querySelectorAll(".clip")
      .forEach((clip) => clip.remove());

    if (labEmpty) {
      labEmpty.style.display = "block";
    }

    showToast("Beat Lab cleared.");
  });

  if (labPlay) {
    labPlay.addEventListener("click", () => {
      const playing =
        labPlay.dataset.playing === "true";

      labPlay.dataset.playing =
        String(!playing);

      labPlay.textContent =
        playing ? "▶" : "⏸";

      showToast(
        playing
          ? "Beat Lab stopped."
          : "Beat Lab playing."
      );
    });
  }

  if (bpm && bpmValue) {
    bpm.addEventListener("input", () => {
      bpmValue.textContent = bpm.value;
    });
  }

  if (pitch && pitchValue) {
    pitch.addEventListener("input", () => {
      const value = Number(pitch.value);

      pitchValue.textContent =
        value > 0 ? `+${value}` : value;
    });
  }

  safeClick("#saveBeat", () => {
    localStorage.setItem(
      "grooveDNA_beatSaved",
      "true"
    );

    showToast("✓ Beat idea saved!");
  });

  safeClick("#generateBeat", () => {
    if (labEmpty) {
      labEmpty.style.display = "none";
    }

    const melodyLane =
      timeline.querySelector(
        ".track:nth-of-type(4) .track-lane"
      ) ||
      timeline.querySelector(
        ".track:last-of-type .track-lane"
      );

    if (melodyLane) {
      const generatedClip =
        document.createElement("div");

      generatedClip.className =
        "clip melody";

      generatedClip.style.width =
        `${35 + Math.random() * 40}%`;

      melodyLane.appendChild(
        generatedClip
      );
    }

    showToast(
      `✦ ${loopToggle?.checked ? "Looping" : "One-shot"} beat generated.`
    );
  });

  /*
    Restore the sample that was added
    from Discover.
  */

  const savedSample =
    localStorage.getItem(
      "grooveDNA_lastSample"
    );

  if (savedSample) {
    try {
      const sample =
        JSON.parse(savedSample);

      const sampleLane =
        timeline.querySelector(
          ".track:last-of-type .track-lane"
        );

      if (sampleLane && sample) {
        if (labEmpty) {
          labEmpty.style.display = "none";
        }

        const clip =
          document.createElement("div");

        clip.className = "clip melody";
        clip.title = sample.title;

        sampleLane.appendChild(clip);
      }
    } catch (error) {
      console.error(
        "Could not restore Beat Lab sample:",
        error
      );
    }

    localStorage.removeItem(
      "grooveDNA_lastSample"
    );
  }
}

/* =========================================================
   COMMUNITY
   ========================================================= */

function initCommunity() {
  if (!$(".community-section")) return;

  safeClick("#challengeBtn", () => {
    showToast("Weekly Challenge opened.");
  });

  safeClick("#joinChallenge", () => {
    showToast(
      "✓ You're in! Challenge added to your activity."
    );
  });

  safeClick("#dnaMatch", () => {
    showToast(
      "DNA Match: 89% compatibility."
    );
  });

  $$("#community [data-like]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        const count =
          button.querySelector("span");

        if (!count) return;

        const current =
          Number(count.textContent) || 0;

        count.textContent =
          String(current + 1);

        button.classList.add("liked");

        showToast("♥ Liked.");
      });
    }
  );

  $$("#community [data-follow]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        button.textContent = "✓ Following";
        showToast("Creator followed.");
      });
    }
  );

  $$("#community [data-remix]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        showToast(
          "Remix idea added to Beat Lab."
        );

        setTimeout(() => {
          window.location.href =
            "beatlab.html";
        }, 500);
      });
    }
  );
}

/* =========================================================
   GROOVEDNA PAGE
   ========================================================= */

function initGrooveDNA() {
  if (!$("#dna")) return;

  safeClick("#shareDNA", async () => {
    const shareData = {
      title: "My GrooveDNA",
      text: "Check out my GrooveDNA musical fingerprint."
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          window.location.href
        );

        showToast(
          "DNA link copied to clipboard."
        );
      }
    } catch (error) {
      console.log(
        "Share cancelled or unavailable."
      );
    }
  });

  $$(".mood-card").forEach((button) => {
    button.addEventListener("click", () => {
      const mood =
        button.dataset.mood ||
        "your vibe";

      showToast(
        `${mood} mode selected.`
      );

      localStorage.setItem(
        "grooveDNA_mood",
        mood
      );
    });
  });
}

/* =========================================================
   LIBRARY
   ========================================================= */

const playlists = [
  {
    title: "Funk Essentials",
    description: "Groove-heavy favorites",
    icon: "🕺"
  },
  {
    title: "Soul After Dark",
    description: "Warm late-night cuts",
    icon: "💜"
  },
  {
    title: "Rock DNA",
    description: "Guitars and big riffs",
    icon: "🎸"
  },
  {
    title: "R&B Motion",
    description: "Smooth rhythmic energy",
    icon: "🎙"
  }
];

const artists = [
  {
    name: "Anderson .Paak",
    genre: "Funk / Soul",
    icon: "AP"
  },
  {
    name: "Kaytranada",
    genre: "Electronic / Funk",
    icon: "K"
  },
  {
    name: "Jill Scott",
    genre: "Soul / R&B",
    icon: "JS"
  },
  {
    name: "Stevie Wonder",
    genre: "Soul",
    icon: "SW"
  },
  {
    name: "D'Angelo",
    genre: "Soul / R&B",
    icon: "D"
  },
  {
    name: "Nile Rodgers",
    genre: "Funk / Rock",
    icon: "NR"
  }
];

function renderLibrary() {
  const playlistGrid = $("#playlistGrid");
  const artistGrid = $("#artistGrid");

  if (playlistGrid) {
    playlistGrid.innerHTML =
      playlists
        .map(
          (playlist) => `
          <article class="playlist-card">
            <div class="playlist-art">
              ${playlist.icon}
            </div>
            <strong>${playlist.title}</strong>
            <small>${playlist.description}</small>
          </article>
        `
        )
        .join("");
  }

  if (artistGrid) {
    artistGrid.innerHTML =
      artists
        .map(
          (artist) => `
          <article class="artist-card">
            <div class="artist-photo">
              ${artist.icon}
            </div>
            <strong>${artist.name}</strong>
            <span>${artist.genre}</span>
          </article>
        `
        )
        .join("");
  }
}

function initLibrary() {
  if (!$("#library")) return;

  renderLibrary();

  $$(".library-tab").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".library-tab").forEach(
        (tab) =>
          tab.classList.remove("active")
      );

      button.classList.add("active");

      showToast(
        `${button.textContent.trim()} selected.`
      );
    });
  });

  safeClick("#newPlaylist", () => {
    const name =
      prompt("Name your new playlist:");

    if (!name?.trim()) return;

    showToast(
      `✓ Playlist "${name.trim()}" created.`
    );
  });

  safeClick("#viewArtists", () => {
    showToast("Showing all artists.");
  });
}

/* =========================================================
   PROFILE / SETTINGS
   ========================================================= */

const settingsData = {
  account: {
    title: "Profile settings",
    rows: [
      [
        "Display name",
        "Change the name shown to other creators.",
        "Edit"
      ],
      [
        "Email",
        "Manage the email connected to your account.",
        "Manage"
      ]
    ]
  },

  playback: {
    title: "Playback settings",
    rows: [
      [
        "Autoplay",
        "Continue playing related sounds automatically.",
        true
      ],
      [
        "High quality audio",
        "Use higher quality playback when available.",
        true
      ]
    ]
  },

  notifications: {
    title: "Notification settings",
    rows: [
      [
        "New discoveries",
        "Get notified when GrooveDNA finds new sounds.",
        true
      ],
      [
        "Community activity",
        "Receive updates about follows, likes and challenges.",
        true
      ]
    ]
  },

  privacy: {
    title: "Privacy settings",
    rows: [
      [
        "Public profile",
        "Allow other creators to discover your profile.",
        true
      ],
      [
        "Listening activity",
        "Show your recent listening activity to followers.",
        false
      ]
    ]
  },

  appearance: {
    title: "Appearance settings",
    rows: [
      [
        "Dark interface",
        "Use GrooveDNA's dark visual experience.",
        true
      ],
      [
        "Motion effects",
        "Enable animations and visual transitions.",
        true
      ]
    ]
  }
};

function renderSettings(type = "account") {
  const settingsTitle =
    $("#settingsTitle");

  const settingsList =
    $("#settingsList");

  if (!settingsTitle || !settingsList) {
    return;
  }

  const config =
    settingsData[type] ||
    settingsData.account;

  settingsTitle.textContent =
    config.title;

  settingsList.innerHTML =
    config.rows
      .map((row, index) => {
        const title = row[0];
        const description = row[1];
        const control = row[2];

        if (typeof control === "boolean") {
          return `
            <div class="setting-row">
              <div>
                <strong>${title}</strong>
                <small>${description}</small>
              </div>

              <label class="switch">
                <input
                  type="checkbox"
                  data-setting="${type}-${index}"
                  ${control ? "checked" : ""}
                >
                <span></span>
              </label>
            </div>
          `;
        }

        return `
          <div class="setting-row">
            <div>
              <strong>${title}</strong>
              <small>${description}</small>
            </div>

            <button
              class="btn secondary"
              type="button"
              data-setting-action="${title}"
            >
              ${control}
            </button>
          </div>
        `;
      })
      .join("");

  $$("[data-setting-action]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        showToast(
          `${button.dataset.settingAction} selected.`
        );
      });
    }
  );

  $$("[data-setting]").forEach(
    (input) => {
      input.addEventListener("change", () => {
        localStorage.setItem(
          `grooveDNA_${input.dataset.setting}`,
          String(input.checked)
        );

        showToast(
          input.checked
            ? "Setting enabled."
            : "Setting disabled."
        );
      });
    }
  );
}

function initProfile() {
  if (!$("#profile")) return;

  renderSettings("account");

  $$(".settings-tab").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".settings-tab").forEach(
        (tab) =>
          tab.classList.remove("active")
      );

      button.classList.add("active");

      renderSettings(
        button.dataset.settings
      );
    });
  });

  safeClick("#profileBtn", () => {
    showToast(
      "Profile editing is ready."
    );
  });
}

/* =========================================================
   GENERIC DEMO PLAY BUTTONS
   ========================================================= */

function initDemoPlayers() {
  $$("[data-demo-play]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        const playing =
          button.dataset.playing === "true";

        button.dataset.playing =
          String(!playing);

        button.textContent =
          playing
            ? "▶"
            : "⏸";

        const title =
          button.dataset.title ||
          "Preview";

        showToast(
          playing
            ? "Playback paused."
            : `Playing ${title}`
        );
      });
    }
  );
}

/* =========================================================
   GLOBAL PAGE NAVIGATION
   ========================================================= */

function initNavigation() {
  /*
    These are intentionally simple page links.
    Each page should exist in the same folder.
  */

  const routes = {
    home: "home.html",
    discover: "discover.html",
    groovedna: "groovedna.html",
    beatlab: "beatlab.html",
    community: "community.html",
    library: "library.html",
    profile: "profile.html"
  };

  $$("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      const route =
        routes[button.dataset.route];

      if (route) {
        window.location.href = route;
      }
    });
  });
}

/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    initMobileNavigation();
    initAuthModal();
    initSignOutButtons();
    initDiscoverPage();
    initAudioUpload();
    initBeatLab();
    initCommunity();
    initGrooveDNA();
    initLibrary();
    initProfile();
    initDemoPlayers();
    initNavigation();

    /*
      Run authentication protection last.
      This prevents protected pages from displaying
      when there is no signed-in user.
    */

    await initAuthenticatedPage();
  }
);
```
