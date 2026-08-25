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
    artist: "Afterdark Audio",
    genre: "R&B",
    type: "Drum & Percussion",
    bpm: 91,
    key: "F Minor",
    rights: "Cleared / Licensed",
    icon: "🌃"
  },
  {
    id: 8,
    title: "Blue Room Horns",
    artist: "Midnight Sessions",
    genre: "Jazz",
    type: "Horn Phrase",
    bpm: 88,
    key: "B♭ Major",
    rights: "Check Rights",
    icon: "🎷"
  },
  {
    id: 9,
    title: "Golden Chords",
    artist: "Analog House",
    genre: "Soul",
    type: "Guitar Chords",
    bpm: 82,
    key: "A Major",
    rights: "Cleared / Licensed",
    icon: "✨"
  }
];

let selectedGenre = "All";
let searchTerm = "";
let currentTrack = null;
let isPlaying = false;

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

const sampleGrid = $("#sampleGrid");
const toast = $("#toast");


// ==========================================
// TOAST SYSTEM
// ==========================================

function showToast(message) {

  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}


// ==========================================
// SAMPLE FILTERING
// ==========================================

function filteredSamples() {

  return samples.filter(sample => {

    const genreMatch =
      selectedGenre === "All" ||
      sample.genre === selectedGenre;

    const searchableText = `
      ${sample.title}
      ${sample.artist}
      ${sample.genre}
      ${sample.type}
      ${sample.key}
    `.toLowerCase();

    return (
      genreMatch &&
      searchableText.includes(searchTerm.toLowerCase())
    );
  });
}


// ==========================================
// RIGHTS STATUS
// ==========================================

function rightsClass(rights) {

  if (rights.startsWith("Cleared")) {
    return "cleared";
  }

  if (rights === "Restricted") {
    return "restricted";
  }

  return "caution";
}


// ==========================================
// RENDER SAMPLE CARDS
// ==========================================

function renderSamples() {

  if (!sampleGrid) return;

  const list = filteredSamples();

  const resultCount = $("#resultCount");

  if (resultCount) {

    resultCount.textContent =
      `${list.length} sound${list.length === 1 ? "" : "s"} found`;
  }

  if (list.length === 0) {

    sampleGrid.innerHTML = `
      <div
        class="empty-state"
        style="grid-column:1/-1"
      >
        No sounds matched your search.
        Try another artist, instrument, or genre.
      </div>
    `;

    return;
  }

  sampleGrid.innerHTML = list.map(sample => `

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
          ${sample.type}
          •
          ${sample.artist}
          <br>
          ${sample.bpm} BPM
          •
          ${sample.key}
        </p>

        <span
          class="rights ${rightsClass(sample.rights)}"
        >

          ${
            sample.rights === "Restricted"
              ? "×"
              : sample.rights.startsWith("Cleared")
              ? "✓"
              : "!"
          }

          ${sample.rights}

        </span>

        <div class="sample-actions">

          <button data-preview="${sample.id}">
            ▶ Preview
          </button>

          <button data-save="${sample.id}">
            ♡ Save
          </button>

          <button data-add="${sample.id}">
            ＋ Beat Lab
          </button>

        </div>

      </div>

    </article>

  `).join("");
}


// ==========================================
// MUSIC PLAYER
// ==========================================

function playTrack(
  title,
  icon = "🎵",
  artist = "GrooveDNA Library"
) {

  currentTrack = {
    title,
    icon,
    artist
  };

  const playerTitle = $("#playerTitle");
  const playerArtist = $("#playerArtist");
  const playerCover = $("#playerCover");
  const playerPlay = $("#playerPlay");

  if (playerTitle) {
    playerTitle.textContent = title;
  }

  if (playerArtist) {
    playerArtist.textContent = artist;
  }

  if (playerCover) {
    playerCover.textContent = icon;
  }

  if (playerPlay) {
    playerPlay.textContent = "⏸";
  }

  isPlaying = true;

  showToast(`▶ Playing "${title}"`);
}


function togglePlayer() {

  if (!currentTrack) {

    playTrack(
      "Funky Guitar Break",
      "🎸",
      "Demo Vault"
    );

    return;
  }

  isPlaying = !isPlaying;

  const playerPlay = $("#playerPlay");

  if (playerPlay) {
    playerPlay.textContent =
      isPlaying ? "⏸" : "▶";
  }

  showToast(
    isPlaying
      ? `▶ Playing "${currentTrack.title}"`
      : "⏸ Playback paused"
  );
}


// ==========================================
// GENRE FILTERS
// ==========================================

$$(".filter").forEach(button => {

  button.addEventListener("click", () => {

    $$(".filter").forEach(btn => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    selectedGenre =
      button.dataset.genre;

    renderSamples();
  });

});


// ==========================================
// SEARCH
// ==========================================

function runSearch() {

  const input = $("#searchInput");

  if (!input) return;

  searchTerm =
    input.value.trim();

  renderSamples();

  const section =
    $(".content-section");

  if (section) {

    section.scrollIntoView({
      behavior: "smooth"
    });

  }
}


if ($("#searchBtn")) {

  $("#searchBtn").addEventListener(
    "click",
    runSearch
  );
}


if ($("#searchInput")) {

  $("#searchInput").addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        runSearch();
      }

    }
  );

}


// ==========================================
// SAMPLE CARD ACTIONS
// ==========================================

if (sampleGrid) {

  sampleGrid.addEventListener(
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


      // PREVIEW

      if (preview) {

        const sample =
          samples.find(
            item =>
              item.id ==
              preview.dataset.preview
          );

        if (sample) {

          playTrack(
            sample.title,
            sample.icon,
            sample.artist
          );

        }

      }


      // SAVE

      if (save) {

        const sample =
          samples.find(
            item =>
              item.id ==
              save.dataset.save
          );

        if (!sample) return;

        let saved =
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
          `♡ "${sample.title}" saved to your collection.`
        );

      }


      // ADD TO BEAT LAB

      if (add) {

        const sample =
          samples.find(
            item =>
              item.id ==
              add.dataset.add
          );

        if (!sample) return;

        const lanes =
          $$(".track-lane");

        const lane =
          lanes.length
            ? lanes[3]
            : $(".track.melody");

        if (lane) {

          const clip =
            document.createElement("div");

          clip.className =
            "clip melody";

          clip.style.width =
            `${25 + Math.random() * 55}%`;

          clip.title =
            sample.title;

          lane.appendChild(clip);

        }

        const labEmpty =
          $("#labEmpty");

        if (labEmpty) {
          labEmpty.style.display = "none";
        }

        showToast(
          `＋ "${sample.title}" added to Beat Lab.`
        );

      }

    }
  );

}


// ==========================================
// DEMO PLAY BUTTONS
// ==========================================

$$("[data-demo-play]").forEach(button => {

  button.addEventListener(
    "click",
    () => {

      playTrack(
        button.dataset.title ||
        "Funky Guitar Break",

        "🎵",

        "GrooveDNA Demo"
      );

    }
  );

});


// ==========================================
// PLAYER CONTROLS
// ==========================================

if ($("#playerPlay")) {

  $("#playerPlay").addEventListener(
    "click",
    togglePlayer
  );

}

if ($("#prevBtn")) {

  $("#prevBtn").addEventListener(
    "click",
    () => {
      showToast("Previous track");
    }
  );

}

if ($("#nextBtn")) {

  $("#nextBtn").addEventListener(
    "click",
    () => {
      showToast("Next track");
    }
  );

}

if ($("#shuffleBtn")) {

  $("#shuffleBtn").addEventListener(
    "click",
    () => {
      showToast("Shuffle enabled");
    }
  );

}

if ($("#queueBtn")) {

  $("#queueBtn").addEventListener(
    "click",
    () => {

      openModal(
        "Queue",
        `
          <h2>Up next</h2>

          <div class="modal-content-grid">

            <button class="modal-option">
              Bassline 74 — Funk Foundry
            </button>

            <button class="modal-option">
              Velvet Keys — Soul Library
            </button>

            <button class="modal-option">
              Neon Pocket — Afterdark Audio
            </button>

          </div>
        `
      );

    }
  );

}


// ==========================================
// AUDIO UPLOAD
// ==========================================

const uploadInput =
  $("#audioUpload");

function openUpload() {

  if (uploadInput) {
    uploadInput.click();
  }

}

if ($("#uploadBtn")) {

  $("#uploadBtn").addEventListener(
    "click",
    openUpload
  );

}

if ($("#uploadBtn2")) {

  $("#uploadBtn2").addEventListener(
    "click",
    openUpload
  );

}

if (uploadInput) {

  uploadInput.addEventListener(
    "change",
    () => {

      const file =
        uploadInput.files[0];

      if (file) {

        showToast(
          `🎙 "${file.name}" selected. Audio analysis ready for backend integration.`
        );

      }

    }
  );

}


// ==========================================
// BEAT LAB
// ==========================================

if ($("#bpm")) {

  $("#bpm").addEventListener(
    "input",
    event => {

      $("#bpmValue").textContent =
        event.target.value;

    }
  );

}


if ($("#pitch")) {

  $("#pitch").addEventListener(
    "input",
    event => {

      const value =
        Number(event.target.value);

      $("#pitchValue").textContent =
        value > 0
          ? `+${value}`
          : value;

    }
  );

}


if ($("#labPlay")) {

  $("#labPlay").addEventListener(
    "click",
    () => {

      const button =
        $("#labPlay");

      const playing =
        button.textContent === "▶";

      button.textContent =
        playing ? "⏸" : "▶";

      showToast(
        playing
          ? "Beat Lab is playing."
          : "Beat Lab stopped."
      );

    }
  );

}


if ($("#saveBeat")) {

  $("#saveBeat").addEventListener(
    "click",
    () => {

      localStorage.setItem(
        "grooveDNA_beatSaved",
        "true"
      );

      showToast(
        "✓ Beat idea saved to your library!"
      );

    }
  );

}


if ($("#clearLab")) {

  $("#clearLab").addEventListener(
    "click",
    () => {

      $$(".timeline .clip")
        .forEach(
          clip => clip.remove()
        );

      const empty =
        $("#labEmpty");

      if (empty) {
        empty.style.display = "block";
      }

      showToast(
        "Beat Lab cleared."
      );

    }
  );

}


if ($("#generateBeat")) {

  $("#generateBeat").addEventListener(
    "click",
    () => {

      const lanes =
        $$(".track-lane");

      const lane =
        lanes.length
          ? lanes[3]
          : $(".track.melody");

      if (!lane) return;

      const clip =
        document.createElement("div");

      clip.className =
        "clip melody";

      clip.style.width =
        "68%";

      lane.appendChild(clip);

      const empty =
        $("#labEmpty");

      if (empty) {
        empty.style.display = "none";
      }

      showToast(
        "✦ GrooveDNA generated a starting groove."
      );

    }
  );

}


// ==========================================
// MOOD DISCOVERY
// ==========================================

$$(".mood-card").forEach(button => {

  button.addEventListener(
    "click",
    () => {

      searchTerm = "";

      selectedGenre = "All";

      if ($("#searchInput")) {
        $("#searchInput").value = "";
      }

      showToast(
        `🎧 Building a ${button.dataset.mood} mix for you...`
      );

      setTimeout(() => {

        if ($("#discover")) {

          $("#discover").scrollIntoView({
            behavior: "smooth"
          });

        }

      }, 200);

    }
  );

});


// ==========================================
// MORE DISCOVERIES
// ==========================================

if ($("#discoverMore")) {

  $("#discoverMore").addEventListener(
    "click",
    () => {

      samples.push({
        id: Date.now(),
        title: "Fresh DNA Discovery",
        artist: "GrooveDNA Picks",
        genre: "Funk",
        type: "Percussion Loop",
        bpm: 103,
        key: "D Minor",
        rights: "Cleared / Licensed",
        icon: "✦"
      });

      renderSamples();

      showToast(
        "↻ Fresh recommendations added."
      );

    }
  );

}


// ==========================================
// STRETCH YOUR DNA
// ==========================================

function renderStretch() {

  const container =
    $("#stretchGrid");

  if (!container) return;

  const picks = [
    samples[7],
    samples[6],
    samples[4]
  ];

  container.innerHTML =
    picks.map(sample => `

      <article class="stretch-card">

        <span class="big-icon">
          ${sample.icon}
        </span>

        <div>

          <strong>
            ${sample.title}
          </strong>

          <p>
            ${sample.artist}
          </p>

          <small>
            ${sample.genre}
            •
            ${sample.bpm} BPM
          </small>

        </div>

        <button
          class="icon-btn"
          data-preview="${sample.id}"
        >
          ▶
        </button>

      </article>

    `).join("");

}


// ==========================================
// PLAYLISTS
// ==========================================

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
              index === 7 &&
              saved.length
                ? ` • ${saved.length} saved`
                : ""
            }

          </small>

        </article>

      `
    ).join("");

}


// ==========================================
// LIBRARY TABS
// ==========================================

$$(".library-tab").forEach(button => {

  button.addEventListener(
    "click",
    () => {

      $$(".library-tab")
        .forEach(
          item =>
            item.classList.remove("active")
        );

      button.classList.add("active");

      showToast(
        `Library: ${button.textContent}`
      );

    }
  );

});


// ==========================================
// CREATE PLAYLIST
// ==========================================

if ($("#newPlaylist")) {

  $("#newPlaylist").addEventListener(
    "click",
    () => {

      openModal(
        "Create playlist",

        `
          <h2>
            Build a new playlist
          </h2>

          <p class="muted">
            Give your playlist a name and
            GrooveDNA will help fill it.
          </p>

          <label class="search-box">

            <input
              id="playlistName"
              placeholder="Playlist name"
            >

          </label>

          <br>

          <button
            class="btn primary"
            id="createPlaylist"
          >
            Create Playlist
          </button>
        `
      );

    }
  );

}


// ==========================================
// ARTISTS
// ==========================================

const artists = [

  ["Anderson .Paak", "🎙"],
  ["Khruangbin", "🪩"],
  ["Stevie Wonder", "🎹"],
  ["Curtis Mayfield", "🎸"],
  ["Hiatus Kaiyote", "🌿"],
  ["Sade", "💜"]

];


if ($("#artistGrid")) {

  $("#artistGrid").innerHTML =
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


if ($("#viewArtists")) {

  $("#viewArtists").addEventListener(
    "click",
    () => {

      openModal(
        "Artists in your orbit",

        `
          <h2>
            Your artist network
          </h2>

          <div class="modal-content-grid">

            ${artists.map(
              artist => `

                <button class="modal-option">

                  ${artist[1]}
                  ${artist[0]}

                  <span class="muted">
                    • 89% match
                  </span>

                </button>

              `
            ).join("")}

          </div>
        `
      );

    }
  );

}


// ==========================================
// COMMUNITY
// ==========================================

$$("[data-like]").forEach(button => {

  button.addEventListener(
    "click",
    () => {

      const number =
        button.querySelector("span");

      if (number) {

        number.textContent =
          Number(number.textContent) + 1;

      }

      button.firstChild.textContent =
        "♥ ";

      showToast(
        "♥ Added to your liked activity."
      );

    }
  );

});


$$("[data-remix]").forEach(button => {

  button.addEventListener(
    "click",
    () => {

      if ($("#beatlab")) {

        $("#beatlab").scrollIntoView({
          behavior: "smooth"
        });

      }

      showToast(
        "↻ Remix workspace ready."
      );

    }
  );

});


$$("[data-follow]").forEach(button => {

  button.addEventListener(
    "click",
    () => {

      button.textContent =
        "✓ Following";

      showToast(
        "Following @JayGrooves."
      );

    }
  );

});


// ==========================================
// CHALLENGES
// ==========================================

if ($("#joinChallenge")) {

  $("#joinChallenge").addEventListener(
    "click",
    () => {

      showToast(
        "🔥 You joined the Flip the Funk challenge!"
      );

    }
  );

}


if ($("#challengeBtn")) {

  $("#challengeBtn").addEventListener(
    "click",
    () => {

      openModal(
        "Weekly Challenge",

        `
          <p class="eyebrow">
            5 DAYS LEFT
          </p>

          <h2>
            Flip the Funk
          </h2>

          <p>
            Build an original instrumental
            around approved source material.
            Entries are judged on groove,
            creativity, and transformation.
          </p>

          <button
            class="btn primary"
            id="modalJoin"
          >
            Join Challenge
          </button>
        `
      );

    }
  );

}


// ==========================================
// DNA MATCH
// ==========================================

if ($("#dnaMatch")) {

  $("#dnaMatch").addEventListener(
    "click",
    () => {

      openModal(
        "DNA Match",

        `
          <p class="eyebrow">
            89% COMPATIBILITY
          </p>

          <h2>
            You + Maya
          </h2>

          <p>
            You share a strong love of
            rhythmic soul, analog textures,
            and groove-heavy production.
          </p>

          <div class="dna-tags">

            <span>
              7 shared artists
            </span>

            <span>
              4 shared genres
            </span>

            <span>
              12 shared songs
            </span>

          </div>

          <br>

          <button
            class="btn primary"
            id="matchPlaylist"
          >
            Make a Match Playlist
          </button>
        `
      );

    }
  );

}


// ==========================================
// SHARE DNA
// ==========================================

if ($("#shareDNA")) {

  $("#shareDNA").addEventListener(
    "click",
    () => {

      showToast(
        "🧬 GrooveDNA profile link copied!"
      );

    }
  );

}


// ==========================================
// PROFILE
// ==========================================

if ($("#profileBtn")) {

  $("#profileBtn").addEventListener(
    "click",
    () => {

      openModal(
        "Edit Profile",

        `
          <h2>
            Edit your profile
          </h2>

          <label class="search-box">

            <input
              value="Zaire's Groove"
              id="profileName"
            >

          </label>

          <br>

          <label class="search-box">

            <input
              value="Creator • Funk, Soul & Rock"
              id="profileBio"
            >

          </label>

          <br>

          <button
            class="btn primary"
            id="saveProfile"
          >
            Save Changes
          </button>
        `
      );

    }
  );

}


// ==========================================
// MODALS
// ==========================================

function openModal(title, content) {

  const modalContent =
    $("#modalContent");

  const modalBackdrop =
    $("#modalBackdrop");

  if (!modalContent ||
      !modalBackdrop) {
    return;
  }

  modalContent.innerHTML = `

    <p class="eyebrow">
      GROOVEDNA
    </p>

    ${content}

  `;

  modalBackdrop.classList.add("open");

  modalBackdrop.dataset.title =
    title;
}


function closeModal() {

  const backdrop =
    $("#modalBackdrop");

  if (backdrop) {
    backdrop.classList.remove("open");
  }

}


if ($("#modalClose")) {

  $("#modalClose").addEventListener(
    "click",
    closeModal
  );

}


if ($("#modalBackdrop")) {

  $("#modalBackdrop").addEventListener(
    "click",
    event => {

      if (
        event.target ===
        $("#modalBackdrop")
      ) {

        closeModal();

      }

    }
  );

}


// ==========================================
// MODAL ACTIONS
// ==========================================

if ($("#modalBackdrop")) {

  $("#modalBackdrop").addEventListener(
    "click",
    event => {

      if (
        event.target.id ===
        "createPlaylist"
      ) {

        const name =
          $("#playlistName").value.trim()
          || "New Groove";

        playlists.unshift([
          name,
          "0 tracks",
          "✦"
        ]);

        renderPlaylists();

        closeModal();

        showToast(
          `✓ "${name}" created.`
        );

      }


      if (
        event.target.id ===
        "saveProfile"
      ) {

        closeModal();

        showToast(
          "✓ Profile updated."
        );

      }


      if (
        event.target.id ===
        "modalJoin"
      ) {

        closeModal();

        showToast(
          "🔥 Challenge joined."
        );

      }


      if (
        event.target.id ===
        "matchPlaylist"
      ) {

        closeModal();

        showToast(
          "✦ Match playlist created."
        );

      }

    }
  );

}


// ==========================================
// NOTIFICATIONS DRAWER
// ==========================================

if ($("#notificationsBtn")) {

  $("#notificationsBtn").addEventListener(
    "click",
    () => {

      $("#notificationDrawer")
        .classList.add("open");

      $("#drawerBackdrop")
        .classList.add("open");

      $("#notificationDrawer")
        .setAttribute(
          "aria-hidden",
          "false"
        );

    }
  );

}


function closeDrawer() {

  if ($("#notificationDrawer")) {

    $("#notificationDrawer")
      .classList.remove("open");

  }

  if ($("#drawerBackdrop")) {

    $("#drawerBackdrop")
      .classList.remove("open");

  }

  if ($("#notificationDrawer")) {

    $("#notificationDrawer")
      .setAttribute(
        "aria-hidden",
        "true"
      );

  }

  if ($("#notificationBadge")) {

    $("#notificationBadge")
      .style.display = "none";

  }

}


if ($(".close-drawer")) {

  $(".close-drawer")
    .addEventListener(
      "click",
      closeDrawer
    );

}


if ($("#drawerBackdrop")) {

  $("#drawerBackdrop")
    .addEventListener(
      "click",
      closeDrawer
    );

}


// ==========================================
// SCROLL BUTTONS
// ==========================================

$$("[data-scroll]").forEach(button => {

  button.addEventListener(
    "click",
    () => {

      const target =
        $(button.dataset.scroll);

      if (target) {

        target.scrollIntoView({
          behavior: "smooth"
        });

      }

    }
  );

});


// ==========================================
// SETTINGS
// ==========================================

const settingsData = {

  account: [
    [
      "Display name",
      "Zaire's Groove",
      "Edit your public creator identity"
    ],
    [
      "Public profile",
      "Visible",
      "Let other creators discover your profile"
    ],
    [
      "Email updates",
      "On",
      "Occasional product updates"
    ]
  ],

  playback: [
    [
      "Autoplay",
      "On",
      "Continue with similar music"
    ],
    [
      "Crossfade",
      "On",
      "Blend tracks smoothly"
    ],
    [
      "High quality audio",
      "On",
      "Use higher-quality streaming when available"
    ]
  ],

  notifications: [
    [
      "New releases",
      "On",
      "Artists you follow"
    ],
    [
      "Recommendations",
      "On",
      "Weekly GrooveDNA picks"
    ],
    [
      "Community activity",
      "On",
      "Likes, follows and remixes"
    ]
  ],

  privacy: [
    [
      "Private listening",
      "Off",
      "Hide listening activity from followers"
    ],
    [
      "Public playlists",
      "On",
      "Allow others to view your public playlists"
    ],
    [
      "Personalized recommendations",
      "On",
      "Use activity to improve recommendations"
    ]
  ],

  appearance: [
    [
      "Dark theme",
      "On",
      "GrooveDNA's signature theme"
    ],
    [
      "Motion effects",
      "On",
      "Animated transitions and visualizations"
    ],
    [
      "Compact player",
      "Off",
      "Use a smaller persistent player"
    ]
  ]

};


function renderSettings(
  key = "account"
) {

  const title =
    $("#settingsTitle");

  const list =
    $("#settingsList");

  if (!title || !list) return;

  title.textContent =
    key[0].toUpperCase() +
    key.slice(1) +
    " settings";

  list.innerHTML =
    settingsData[key]
      .map(setting => `

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
              ${
                setting[1] === "On" ||
                setting[1] === "Visible"
                  ? "checked"
                  : ""
              }
            >

            <span></span>

          </label>

        </div>

      `)
      .join("");

}


$$(".settings-tab").forEach(button => {

  button.addEventListener(
    "click",
    () => {

      $$(".settings-tab")
        .forEach(
          item =>
            item.classList.remove("active")
        );

      button.classList.add("active");

      renderSettings(
        button.dataset.settings
      );

    }
  );

});


// ==========================================
// TOP PROFILE BUTTON
// ==========================================

if ($("#profileTop")) {

  $("#profileTop").addEventListener(
    "click",
    () => {

      if ($("#profile")) {

        $("#profile").scrollIntoView({
          behavior: "smooth"
        });

      }

    }
  );

}


// ==========================================
// MOBILE NAVIGATION
// ==========================================

if ($("#menuToggle")) {

  $("#menuToggle").addEventListener(
    "click",
    () => {

      const nav =
        $("#mainNav");

      if (!nav) return;

      const open =
        nav.classList.toggle("open");

      $("#menuToggle")
        .setAttribute(
          "aria-expanded",
          open
        );

    }
  );

}


$$("nav a").forEach(link => {

  link.addEventListener(
    "click",
    () => {

      if ($("#mainNav")) {

        $("#mainNav")
          .classList.remove("open");

      }

    }
  );

});


// ==========================================
// ESCAPE KEY
// ==========================================

document.addEventListener(
  "keydown",
  event => {

    if (event.key === "Escape") {

      closeModal();
      closeDrawer();

    }

  }
);


// ==========================================
// START APPLICATION
// ==========================================

renderSamples();

renderStretch();

renderPlaylists();

renderSettings();

console.log(
  "GrooveDNA complete frontend loaded."
);
