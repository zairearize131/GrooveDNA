/* =========================================================
   GROOVEDNA — FRONTEND + AUTHENTICATION
   ========================================================= */

const SUPABASE_URL =
  "https://nzfzcnusmjboykledznh.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_qsskdrsPBxg1dECb1HY8Jg_x0rL7wR3";


let supabaseClient = null;


if (window.supabase?.createClient) {

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

}


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (selector, root = document) =>
  root.querySelector(selector);


const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));


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

  clearTimeout(window.grooveToastTimer);

  window.grooveToastTimer = setTimeout(() => {

    toast.classList.remove("show");

  }, 2800);

}


/* =========================================================
   AUTH ERROR MESSAGES
   ========================================================= */

function friendlyAuthError(error) {

  const message =
    error?.message ||
    "Something went wrong.";

  const lower =
    message.toLowerCase();


  if (lower.includes("invalid login credentials")) {

    return "Incorrect email or password.";

  }


  if (lower.includes("user already registered")) {

    return "An account with this email already exists. Try signing in.";

  }


  if (lower.includes("password")) {

    return message;

  }


  if (lower.includes("email")) {

    return message;

  }


  return message;

}


/* =========================================================
   AUTH MODAL
   ========================================================= */

let authMode = "signin";


function openAuth(mode = "signin") {

  const modal =
    $("#auth");

  if (!modal) return;


  authMode =
    mode === "signup"
      ? "signup"
      : "signin";


  updateAuthUI();


  modal.classList.add("open");


  document.body.style.overflow = "hidden";


  setTimeout(() => {

    $("#authEmail")?.focus();

  }, 50);

}


function closeAuth() {

  const modal =
    $("#auth");

  if (!modal) return;


  modal.classList.remove("open");


  document.body.style.overflow = "";

}


function updateAuthUI() {

  const title =
    $("#authTitle");

  const eyebrow =
    $("#authEyebrow");

  const submit =
    $("#authSubmit");

  const nameGroup =
    $("#authNameGroup");

  const toggleCopy =
    $("#authToggleCopy");

  const message =
    $("#authMessage");


  if (!title ||
      !eyebrow ||
      !submit ||
      !nameGroup ||
      !toggleCopy) {
    return;
  }


  if (message) {

    message.textContent = "";

  }


  if (authMode === "signup") {

    eyebrow.textContent =
      "CREATE YOUR ACCOUNT";

    title.textContent =
      "Create your groove.";

    submit.textContent =
      "Create Account";

    nameGroup.style.display =
      "block";

    const password =
      $("#authPassword");

    if (password) {

      password.autocomplete =
        "new-password";

    }


    toggleCopy.innerHTML =
      'Already have an account? <a href="#" id="authModeToggle">Sign in</a>';

  } else {

    eyebrow.textContent =
      "WELCOME BACK";

    title.textContent =
      "Enter your groove.";

    submit.textContent =
      "Sign In";

    nameGroup.style.display =
      "none";

    const password =
      $("#authPassword");

    if (password) {

      password.autocomplete =
        "current-password";

    }


    toggleCopy.innerHTML =
      'New to GrooveDNA? <a href="#" id="authModeToggle">Create an account</a>';

  }


  $("#authModeToggle")?.addEventListener(
    "click",
    event => {

      event.preventDefault();

      authMode =
        authMode === "signin"
          ? "signup"
          : "signin";

      updateAuthUI();

    }
  );

}


/* =========================================================
   SIGN UP
   ========================================================= */

async function createAccount() {

  if (!supabaseClient) {

    throw new Error(
      "Supabase could not be initialized."
    );

  }


  const email =
    $("#authEmail")?.value.trim();

  const password =
    $("#authPassword")?.value;

  const name =
    $("#authName")?.value.trim();


  if (!email ||
      !password) {

    throw new Error(
      "Please enter your email and password."
    );

  }


  if (password.length < 6) {

    throw new Error(
      "Your password must be at least 6 characters."
    );

  }


  const { data, error } =
    await supabaseClient.auth.signUp({

      email,

      password,

      options: {

        data: {

          full_name:
            name || "GrooveDNA Creator",

          name:
            name || "GrooveDNA Creator"

        }

      }

    });


  if (error) {

    throw error;

  }


  return data;

}


/* =========================================================
   SIGN IN
   ========================================================= */

async function signIn() {

  if (!supabaseClient) {

    throw new Error(
      "Supabase could not be initialized."
    );

  }


  const email =
    $("#authEmail")?.value.trim();

  const password =
    $("#authPassword")?.value;


  if (!email ||
      !password) {

    throw new Error(
      "Please enter your email and password."
    );

  }


  const { data, error } =
    await supabaseClient.auth.signInWithPassword({

      email,

      password

    });


  if (error) {

    throw error;

  }


  return data;

}


/* =========================================================
   SIGN OUT
   ========================================================= */

async function signOut() {

  if (!supabaseClient) {

    window.location.href =
      "index.html";

    return;

  }


  const { error } =
    await supabaseClient.auth.signOut();


  if (error) {

    alert(
      friendlyAuthError(error)
    );

    return;

  }


  window.location.replace(
    "index.html"
  );

}


/* =========================================================
   AUTH FORM
   ========================================================= */

function initLandingAuth() {

  const authForm =
    $("#authForm");

  if (!authForm) return;


  $("#signInLink")?.addEventListener(
    "click",
    event => {

      event.preventDefault();

      openAuth("signin");

    }
  );


  $("#createAccountLink")?.addEventListener(
    "click",
    event => {

      event.preventDefault();

      openAuth("signup");

    }
  );


  $("#startListeningBtn")?.addEventListener(
    "click",
    event => {

      event.preventDefault();

      openAuth("signup");

    }
  );


  $("#authClose")?.addEventListener(
    "click",
    event => {

      event.preventDefault();

      closeAuth();

    }
  );


  $("#auth")?.addEventListener(
    "click",
    event => {

      if (event.target === $("#auth")) {

        closeAuth();

      }

    }
  );


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape" &&
        $("#auth")?.classList.contains("open")
      ) {

        closeAuth();

      }

    }
  );


  updateAuthUI();


  authForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const submit =
        $("#authSubmit");

      const message =
        $("#authMessage");


      if (submit) {

        submit.disabled = true;

        submit.textContent =
          authMode === "signup"
            ? "Creating Account..."
            : "Signing In...";

      }


      if (message) {

        message.textContent =
          "";

      }


      try {

        if (authMode === "signup") {

          const data =
            await createAccount();


          /*
            If email confirmation is enabled
            in Supabase, there will be no active
            session immediately after signup.
          */

          if (!data.session) {

            if (message) {

              message.textContent =
                "Account created. Check your email to confirm your account, then sign in.";

            }

            showToast(
              "✓ Account created. Check your email."
            );

            return;

          }


          showToast(
            "✓ Account created!"
          );


        } else {

          await signIn();


          showToast(
            "✓ Welcome back!"
          );

        }


        window.location.replace(
          "profile.html"
        );

      } catch (error) {

        console.error(
          "Authentication error:",
          error
        );


        const friendly =
          friendlyAuthError(error);


        if (message) {

          message.textContent =
            friendly;

        }


        showToast(
          friendly
        );

      } finally {

        if (submit) {

          submit.disabled = false;

          submit.textContent =
            authMode === "signup"
              ? "Create Account"
              : "Sign In";

        }

      }

    }
  );

}


/* =========================================================
   AUTH SESSION CHECK
   ========================================================= */

async function requireAuth() {

  if (!supabaseClient) {

    window.location.replace(
      "index.html"
    );

    return null;

  }


  const { data, error } =
    await supabaseClient.auth.getSession();


  if (error ||
      !data?.session) {

    window.location.replace(
      "index.html"
    );

    return null;

  }


  return data.session;

}


/* =========================================================
   LOAD PROFILE
   ========================================================= */

async function loadProfile() {

  if (!supabaseClient) return;


  const { data, error } =
    await supabaseClient.auth.getUser();


  if (error ||
      !data?.user) {

    window.location.replace(
      "index.html"
    );

    return;

  }


  const user =
    data.user;


  const metadata =
    user.user_metadata || {};


  const name =
    metadata.full_name ||
    metadata.name ||
    user.email?.split("@")[0] ||
    "GrooveDNA Creator";


  const email =
    user.email ||
    "";


  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part =>
        part.charAt(0).toUpperCase()
      )
      .join("") ||
    "GD";


  if ($("#profileName")) {

    $("#profileName").textContent =
      `${name}'s Groove`;

  }


  if ($("#profileEmail")) {

    $("#profileEmail").textContent =
      email;

  }


  if ($("#profileAvatar")) {

    $("#profileAvatar").textContent =
      initials;

  }

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function initNavigation() {

  const menuToggle =
    $("#menuToggle");

  const mainNav =
    $("#mainNav");


  if (!menuToggle ||
      !mainNav) {
    return;
  }


  menuToggle.addEventListener(
    "click",
    () => {

      const open =
        mainNav.classList.toggle("open");


      menuToggle.setAttribute(
        "aria-expanded",
        String(open)
      );

    }
  );

}


/* =========================================================
   SAMPLE DATA
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
  }

];


let selectedGenre =
  "All";


let searchTerm =
  "";


/* =========================================================
   DISCOVER
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


function filteredSamples() {

  return samples.filter(sample => {

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


    return genreMatch &&
      searchMatch;

  });

}


function renderSamples() {

  const grid =
    $("#sampleGrid");

  const count =
    $("#resultCount");


  if (!grid) return;


  const list =
    filteredSamples();


  if (count) {

    count.textContent =
      `${list.length} sounds found`;

  }


  if (!list.length) {

    grid.innerHTML =
      `<div class="empty-state">No sounds found. Try another search.</div>`;

    return;

  }


  grid.innerHTML =
    list.map(sample => `

      <article
        class="sample-card"
        data-genre="${sample.genre}"
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

          <h3>
            ${sample.title}
          </h3>

          <p>
            ${sample.artist}
            · ${sample.type}
            · ${sample.bpm} BPM
            · ${sample.key}
          </p>


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

    `).join("");

}


function initDiscover() {

  const grid =
    $("#sampleGrid");


  if (!grid) return;


  renderSamples();


  $$(".filter").forEach(button => {

    button.addEventListener(
      "click",
      () => {

        $$(".filter").forEach(
          b => b.classList.remove("active")
        );


        button.classList.add(
          "active"
        );


        selectedGenre =
          button.dataset.genre ||
          "All";


        renderSamples();

      }
    );

  });


  $("#searchBtn")?.addEventListener(
    "click",
    () => {

      searchTerm =
        $("#searchInput")?.value.trim() ||
        "";

      renderSamples();

    }
  );


  $("#searchInput")?.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {

        searchTerm =
          event.currentTarget.value.trim();

        renderSamples();

      }

    }
  );


  $("#sampleGrid")?.addEventListener(
    "click",
    event => {

      const preview =
        event.target.closest("[data-preview]");

      const save =
        event.target.closest("[data-save]");

      const add =
        event.target.closest("[data-add]");


      if (preview) {

        const sample =
          samples.find(
            item =>
              item.id == preview.dataset.preview
          );


        if (sample) {

          showToast(
            `▶ Previewing "${sample.title}"`
          );

        }

      }


      if (save) {

        const sample =
          samples.find(
            item =>
              item.id == save.dataset.save
          );


        if (!sample) return;


        const saved =
          JSON.parse(
            localStorage.getItem(
              "grooveDNA_saved"
            ) || "[]"
          );


        if (!saved.includes(sample.id)) {

          saved.push(sample.id);

        }


        localStorage.setItem(
          "grooveDNA_saved",
          JSON.stringify(saved)
        );


        showToast(
          `♡ "${sample.title}" saved.`
        );

      }


      if (add) {

        const sample =
          samples.find(
            item =>
              item.id == add.dataset.add
          );


        if (!sample) return;


        localStorage.setItem(
          "grooveDNA_lastBeatSample",
          JSON.stringify(sample)
        );


        showToast(
          `＋ "${sample.title}" added to Beat Lab.`
        );


        setTimeout(() => {

          window.location.href =
            "beatlab.html";

        }, 400);

      }

    }
  );

}


/* =========================================================
   BEAT LAB
   ========================================================= */

function initBeatLab() {

  const timeline =
    $("#timeline");


  if (!timeline) return;


  $("#bpm")?.addEventListener(
    "input",
    event => {

      if ($("#bpmValue")) {

        $("#bpmValue").textContent =
          event.target.value;

      }

    }
  );


  $("#pitch")?.addEventListener(
    "input",
    event => {

      const value =
        Number(event.target.value);


      if ($("#pitchValue")) {

        $("#pitchValue").textContent =
          value > 0
            ? `+${value}`
            : String(value);

      }

    }
  );


  $("#labPlay")?.addEventListener(
    "click",
    event => {

      const button =
        event.currentTarget;


      button.textContent =
        button.textContent === "▶"
          ? "⏸"
          : "▶";


      showToast(
        button.textContent === "⏸"
          ? "Beat Lab is playing."
          : "Beat Lab stopped."
      );

    }
  );


  $("#clearLab")?.addEventListener(
    "click",
    () => {

      $$("#timeline .clip")
        .forEach(
          clip => clip.remove()
        );


      if ($("#labEmpty")) {

        $("#labEmpty").style.display =
          "block";

      }


      showToast(
        "Beat Lab cleared."
      );

    }
  );


  $("#generateBeat")?.addEventListener(
    "click",
    () => {

      const lanes =
        $$(".track-lane");


      const lane =
        lanes[3] ||
        lanes[2];


      if (!lane) return;


      const clip =
        document.createElement("div");


      clip.className =
        "clip melody";


      clip.style.width =
        "68%";


      lane.appendChild(
        clip
      );


      if ($("#labEmpty")) {

        $("#labEmpty").style.display =
          "none";

      }


      showToast(
        "✦ GrooveDNA generated a starting groove."
      );

    }
  );


  $("#saveBeat")?.addEventListener(
    "click",
    () => {

      localStorage.setItem(
        "grooveDNA_beatSaved",
        "true"
      );


      showToast(
        "✓ Beat idea saved to your library."
      );

    }
  );

}


/* =========================================================
   COMMUNITY
   ========================================================= */

function initCommunity() {

  $("#joinChallenge")?.addEventListener(
    "click",
    () => {

      showToast(
        "🔥 You joined the Flip the Funk challenge!"
      );

    }
  );


  $("#challengeBtn")?.addEventListener(
    "click",
    () => {

      showToast(
        "🔥 Weekly Challenge opened."
      );

    }
  );


  $("#dnaMatch")?.addEventListener(
    "click",
    () => {

      showToast(
        "🧬 DNA Match: 89% compatibility."
      );

    }
  );


  $$("[data-like]").forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          const count =
            $("span", button);


          if (count) {

            count.textContent =
              String(
                Number(
                  count.textContent || 0
                ) + 1
              );

          }


          button.firstChild.textContent =
            "♥ ";

        }
      );

    }
  );


  $$("[data-follow]").forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          button.textContent =
            "✓ Following";

        }
      );

    }
  );


  $$("[data-remix]").forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          localStorage.setItem(
            "grooveDNA_lastBeatSample",
            JSON.stringify(samples[3])
          );


          window.location.href =
            "beatlab.html";

        }
      );

    }
  );

}


/* =========================================================
   GROOVEDNA
   ========================================================= */

function initGrooveDNA() {

  $("#shareDNA")?.addEventListener(
    "click",
    async () => {

      const text =
        "My GrooveDNA score is 92.";


      try {

        await navigator.clipboard.writeText(
          text
        );


        showToast(
          "🧬 GrooveDNA copied to your clipboard."
        );

      } catch {

        showToast(
          "🧬 Your GrooveDNA is ready to share."
        );

      }

    }
  );


  $$(".mood-card").forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          localStorage.setItem(
            "grooveDNA_mood",
            button.dataset.mood || ""
          );


          showToast(
            `🎧 Building a ${button.dataset.mood} mix for you...`
          );

        }
      );

    }
  );

}


/* =========================================================
   LIBRARY
   ========================================================= */

function initLibrary() {

  if (
    !$("#playlistGrid") &&
    !$("#artistGrid")
  ) {

    return;

  }


  const playlists = [

    ["Late Night Soul", "24 tracks", "🌙"],

    ["Funk Essentials", "31 tracks", "🕺"],

    ["Guitar After Dark", "18 tracks", "🎸"],

    ["New DNA Discoveries", "16 tracks", "🧬"],

    ["Sunday Morning", "22 tracks", "☀️"],

    ["Deep Focus", "42 tracks", "◌"],

    ["Analog Heat", "27 tracks", "🔥"],

    ["Saved Samples", "38 sounds", "＋"]

  ];


  function renderPlaylists() {

    const grid =
      $("#playlistGrid");


    if (!grid) return;


    const saved =
      JSON.parse(
        localStorage.getItem(
          "grooveDNA_saved"
        ) || "[]"
      );


    grid.innerHTML =
      playlists.map(
        (playlist, index) => `

          <article class="playlist-card">

            <div class="playlist-art">
              ${playlist[2]}
            </div>

            <strong>
              ${playlist[0]}
            </strong>

            <small>
              ${playlist[1]}
              ${
                index === 7 && saved.length
                  ? ` • ${saved.length} saved`
                  : ""
              }
            </small>

          </article>

        `
      ).join("");

  }


  renderPlaylists();


  $$(".library-tab").forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          $$(".library-tab")
            .forEach(
              item =>
                item.classList.remove(
                  "active"
                )
            );


          button.classList.add(
            "active"
          );


          showToast(
            `Library: ${button.textContent}`
          );

        }
      );

    }
  );


  $("#newPlaylist")?.addEventListener(
    "click",
    () => {

      const name =
        prompt(
          "What would you like to call your playlist?"
        );


      if (!name?.trim()) return;


      playlists.unshift([
        name.trim(),
        "0 tracks",
        "✦"
      ]);


      renderPlaylists();


      showToast(
        `✓ "${name.trim()}" created.`
      );

    }
  );


  const artists = [

    ["Anderson .Paak", "🎙"],

    ["Khruangbin", "🪩"],

    ["Stevie Wonder", "🎹"],

    ["Curtis Mayfield", "🎸"],

    ["Hiatus Kaiyote", "🌿"],

    ["Sade", "💜"]

  ];


  const artistGrid =
    $("#artistGrid");


  if (artistGrid) {

    artistGrid.innerHTML =
      artists.map(
        artist => `

          <div class="artist-card">

            <div class="artist-photo">
              ${artist[1]}
            </div>

            <strong>
              ${artist[0]}
            </strong>

            <span>
              Followed
            </span>

          </div>

        `
      ).join("");

  }


  $("#viewArtists")?.addEventListener(
    "click",
    () => {

      showToast(
        "Your artist network is ready."
      );

    }
  );

}


/* =========================================================
   PROFILE
   ========================================================= */

function initProfile() {

  if (!$("#profile")) return;


  loadProfile();


  $("#signOutBtn")?.addEventListener(
    "click",
    signOut
  );


  $("#footerSignOutBtn")?.addEventListener(
    "click",
    signOut
  );


  $$(".settings-tab").forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          $$(".settings-tab")
            .forEach(
              item =>
                item.classList.remove(
                  "active"
                )
            );


          button.classList.add(
            "active"
          );


          const key =
            button.dataset.settings ||
            "account";


          if ($("#settingsTitle")) {

            $("#settingsTitle").textContent =
              `${key.charAt(0).toUpperCase()}${key.slice(1)} settings`;

          }


          const settings = {

            account: [

              [
                "Display name",
                true,
                "Your public creator name"
              ],

              [
                "Public profile",
                true,
                "Let creators discover your profile"
              ],

              [
                "Email updates",
                true,
                "Occasional GrooveDNA updates"
              ]

            ],


            playback: [

              [
                "Autoplay",
                true,
                "Continue with similar music"
              ],

              [
                "Crossfade",
                true,
                "Blend tracks smoothly"
              ],

              [
                "High quality audio",
                true,
                "Use higher-quality streaming when available"
              ]

            ],


            notifications: [

              [
                "New releases",
                true,
                "Artists you follow"
              ],

              [
                "Recommendations",
                true,
                "Weekly GrooveDNA picks"
              ],

              [
                "Community activity",
                true,
                "Likes, follows and remixes"
              ]

            ],


            privacy: [

              [
                "Private listening",
                false,
                "Hide listening activity"
              ],

              [
                "Public playlists",
                true,
                "Allow others to view playlists"
              ],

              [
                "Personalized recommendations",
                true,
                "Use activity to improve recommendations"
              ]

            ],


            appearance: [

              [
                "Dark theme",
                true,
                "GrooveDNA signature theme"
              ],

              [
                "Motion effects",
                true,
                "Animated transitions"
              ],

              [
                "Compact player",
                false,
                "Use a smaller player"
              ]

            ]

          };


          const list =
            $("#settingsList");


          if (!list) return;


          list.innerHTML =
            settings[key]
              .map(
                setting => `

                  <div class="setting-row">

                    <div>

                      <strong>
                        ${setting[0]}
                      </strong>

                      <small>
                        ${setting[2]}
                      </small>

                    </div>


                    <label class="switch">

                      <input
                        type="checkbox"
                        ${setting[1] ? "checked" : ""}
                      >

                      <span></span>

                    </label>

                  </div>

                `
              )
              .join("");

        }
      );

    }
  );


  $(".settings-tab.active")?.click();


  $("#profileBtn")?.addEventListener(
    "click",
    async () => {

      if (!supabaseClient) return;


      const current =
        $("#profileName")?.textContent
          .replace(/'s Groove$/, "") ||
        "GrooveDNA Creator";


      const name =
        prompt(
          "Enter your display name:",
          current
        );


      if (!name?.trim()) return;


      const { error } =
        await supabaseClient.auth.updateUser({

          data: {

            full_name:
              name.trim(),

            name:
              name.trim()

          }

        });


      if (error) {

        alert(
          friendlyAuthError(error)
        );

        return;

      }


      await loadProfile();


      showToast(
        "✓ Profile updated."
      );

    }
  );

}


/* =========================================================
   STARTUP
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    initNavigation();

    initLandingAuth();

    initDiscover();

    initBeatLab();

    initCommunity();

    initGrooveDNA();

    initLibrary();

    initProfile();


    const page =
      location.pathname
        .split("/")
        .pop() ||
      "index.html";


    const protectedPages =
      new Set([

        "home.html",
        "discover.html",
        "groovedna.html",
        "beatlab.html",
        "community.html",
        "library.html",
        "profile.html"

      ]);


    if (
      protectedPages.has(page)
    ) {

      await requireAuth();

    }


    console.log(
      "GrooveDNA loaded."
    );

  }
);
