// ==========================================
// GrooveDNA - JavaScript
// ==========================================

// Sample catalog
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


// ==========================================
// VARIABLES
// ==========================================

let selectedGenre = "All";
let searchTerm = "";

const sampleGrid = document.getElementById("sampleGrid");
const resultCount = document.getElementById("resultCount");
const toast = document.getElementById("toast");


// ==========================================
// TOAST MESSAGE
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
// FILTER SAMPLES
// ==========================================

function filteredSamples() {

  return samples.filter(sample => {

    const genreMatch =
      selectedGenre === "All" ||
      sample.genre === selectedGenre;

    const text =
      `${sample.title}
       ${sample.artist}
       ${sample.genre}
       ${sample.type}
       ${sample.key}`.toLowerCase();

    return (
      genreMatch &&
      text.includes(searchTerm.toLowerCase())
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
// DISPLAY SAMPLES
// ==========================================

function renderSamples() {

  if (!sampleGrid) return;

  const list = filteredSamples();

  if (resultCount) {

    resultCount.textContent =
      `${list.length} sound${list.length === 1 ? "" : "s"} found`;
  }


  if (list.length === 0) {

    sampleGrid.innerHTML = `
      <div class="empty-state"
           style="grid-column:1/-1">

        No sounds matched your search.

        Try another artist, instrument, or genre.

      </div>
    `;

    return;
  }


  sampleGrid.innerHTML = list.map(sample => {

    return `

      <article
        class="sample-card"
        data-genre="${sample.genre}">

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
            class="rights ${rightsClass(sample.rights)}">

            ${
              sample.rights === "Restricted"
                ? "×"
                : sample.rights.startsWith("Cleared")
                ? "✓"
                : "!"
            }

            ${sample.rights}

          </span>


          <div
            class="sample-actions"
            style="margin-top:14px">

            <button
              data-preview="${sample.id}">

              ▶ Preview

            </button>


            <button
              data-save="${sample.id}">

              ♡ Save

            </button>


            <button
              data-add="${sample.id}">

              ＋ Beat Lab

            </button>

          </div>

        </div>

      </article>

    `;

  }).join("");
}


// ==========================================
// GENRE FILTERS
// ==========================================

document.querySelectorAll(".filter").forEach(button => {

  button.addEventListener("click", () => {

    document
      .querySelectorAll(".filter")
      .forEach(btn => {

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

  const input =
    document.getElementById("searchInput");

  if (!input) return;


  searchTerm =
    input.value.trim();


  renderSamples();


  const section =
    document.querySelector(".content-section");


  if (section) {

    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }

}


const searchButton =
  document.getElementById("searchBtn");


if (searchButton) {

  searchButton.addEventListener(
    "click",
    runSearch
  );

}


const searchInput =
  document.getElementById("searchInput");


if (searchInput) {

  searchInput.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {

        runSearch();

      }

    }
  );

}


// ==========================================
// SAMPLE BUTTONS
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


      // Preview

      if (preview) {

        const sample =
          samples.find(
            item =>
              item.id ===
              Number(preview.dataset.preview)
          );


        if (sample) {

          showToast(
            `▶ Previewing "${sample.title}" — ${sample.bpm} BPM`
          );

        }

      }


      // Save

      if (save) {

        const sample =
          samples.find(
            item =>
              item.id ===
              Number(save.dataset.save)
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


      // Add to Beat Lab

      if (add) {

        const sample =
          samples.find(
            item =>
              item.id ===
              Number(add.dataset.add)
          );


        if (!sample) return;


        const labEmpty =
          document.getElementById(
            "labEmpty"
          );


        if (labEmpty) {

          labEmpty.style.display =
            "none";

        }


        const track =
          document.querySelector(
            ".track.melody"
          );


        if (track) {

          const clip =
            document.createElement("div");


          clip.className =
            "clip melody";


          clip.style.width =
            `${35 + Math.random() * 40}%`;


          clip.title =
            sample.title;


          track.appendChild(clip);

        }


        showToast(
          `＋ "${sample.title}" added to Beat Lab.`
        );

      }

    }
  );

}


// ==========================================
// DEMO AUDIO BUTTONS
// ==========================================

document
  .querySelectorAll("[data-demo-play]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        if (
          button.textContent.includes(
            "Play"
          )
        ) {

          button.textContent =
            "⏸ Playing...";

        } else {

          button.textContent =
            "▶ Play Preview";

        }


        showToast(
          "Demo audio control activated."
        );

      }
    );

  });


// ==========================================
// BEAT LAB PLAY
// ==========================================

const labPlay =
  document.getElementById(
    "labPlay"
  );


if (labPlay) {

  labPlay.addEventListener(
    "click",
    () => {

      if (
        labPlay.textContent === "▶"
      ) {

        labPlay.textContent =
          "⏸";

        showToast(
          "Beat Lab is playing."
        );

      } else {

        labPlay.textContent =
          "▶";

        showToast(
          "Beat Lab stopped."
        );

      }

    }
  );

}


// ==========================================
// BPM CONTROL
// ==========================================

const bpm =
  document.getElementById("bpm");

const bpmValue =
  document.getElementById(
    "bpmValue"
  );


if (bpm && bpmValue) {

  bpm.addEventListener(
    "input",
    event => {

      bpmValue.textContent =
        event.target.value;

    }
  );

}


// ==========================================
// PITCH CONTROL
// ==========================================

const pitch =
  document.getElementById(
    "pitch"
  );

const pitchValue =
  document.getElementById(
    "pitchValue"
  );


if (pitch && pitchValue) {

  pitch.addEventListener(
    "input",
    event => {

      const value =
        Number(event.target.value);


      pitchValue.textContent =
        value > 0
          ? `+${value}`
          : value;

    }
  );

}


// ==========================================
// SAVE BEAT
// ==========================================

const saveBeat =
  document.getElementById(
    "saveBeat"
  );


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


// ==========================================
// CLEAR BEAT LAB
// ==========================================

const clearLab =
  document.getElementById(
    "clearLab"
  );


if (clearLab) {

  clearLab.addEventListener(
    "click",
    () => {

      document
        .querySelectorAll(
          "#timeline .clip"
        )
        .forEach(
          clip => clip.remove()
        );


      const labEmpty =
        document.getElementById(
          "labEmpty"
        );


      if (labEmpty) {

        labEmpty.style.display =
          "block";

      }


      showToast(
        "Beat Lab cleared."
      );

    }
  );

}


// ==========================================
// AUDIO UPLOAD
// ==========================================

const uploadInput =
  document.getElementById(
    "audioUpload"
  );


function openUpload() {

  if (uploadInput) {

    uploadInput.click();

  }

}


const uploadButton =
  document.getElementById(
    "uploadBtn"
  );


const uploadButton2 =
  document.getElementById(
    "uploadBtn2"
  );


if (uploadButton) {

  uploadButton.addEventListener(
    "click",
    openUpload
  );

}


if (uploadButton2) {

  uploadButton2.addEventListener(
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
          `🎙 "${file.name}" selected.`
        );

      }

    }
  );

}


// ==========================================
// COMMUNITY LIKES
// ==========================================

document
  .querySelectorAll("[data-like]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const number =
          button.querySelector(
            "span"
          );


        if (number) {

          number.textContent =
            Number(number.textContent) + 1;

        }


        button.firstChild.textContent =
          "♥ ";

      }
    );

  });


// ==========================================
// REMIX
// ==========================================

document
  .querySelectorAll("[data-remix]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        showToast(
          "↻ Remix workspace opened."
        );

      }
    );

  });


// ==========================================
// CHALLENGE
// ==========================================

const challengeButton =
  document.getElementById(
    "challengeBtn"
  );


if (challengeButton) {

  challengeButton.addEventListener(
    "click",
    () => {

      const community =
        document.getElementById(
          "community"
        );


      if (community) {

        community.scrollIntoView({
          behavior: "smooth"
        });

      }


      showToast(
        "🔥 Weekly challenge: Flip the Funk!"
      );

    }
  );

}


const joinChallenge =
  document.getElementById(
    "joinChallenge"
  );


if (joinChallenge) {

  joinChallenge.addEventListener(
    "click",
    () => {

      showToast(
        "🔥 You joined the Flip the Funk challenge!"
      );

    }
  );

}


// ==========================================
// PROFILE
// ==========================================

const profileButton =
  document.getElementById(
    "profileBtn"
  );


if (profileButton) {

  profileButton.addEventListener(
    "click",
    () => {

      showToast(
        "Profile editor opened."
      );

    }
  );

}


// ==========================================
// MOBILE MENU
// ==========================================

const menuToggle =
  document.getElementById(
    "menuToggle"
  );


const mainNav =
  document.getElementById(
    "mainNav"
  );


if (menuToggle && mainNav) {

  menuToggle.addEventListener(
    "click",
    () => {

      const isOpen =
        mainNav.classList.toggle(
          "open"
        );


      menuToggle.setAttribute(
        "aria-expanded",
        String(isOpen)
      );

    }
  );


  mainNav
    .querySelectorAll("a")
    .forEach(link => {

      link.addEventListener(
        "click",
        () => {

          mainNav.classList.remove(
            "open"
          );

        }
      );

    });

}


// ==========================================
// START APP
// ==========================================

renderSamples();

console.log(
  "GrooveDNA JavaScript loaded successfully!"
);
