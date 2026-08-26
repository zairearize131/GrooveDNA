/* =========================================================
   GROOVEDNA — MAIN JAVASCRIPT
   Matches the GrooveDNA HTML/CSS structure
   ========================================================= */

/* ---------------------------------------------------------
   SUPABASE INITIALIZATION & CLIENT SETUP
   Place this at the very top of script.js
   --------------------------------------------------------- */
const SUPABASE_URL = "nzfzcnusmjboykledznh";
const SUPABASE_ANON_KEY = "sb_publishable_qsskdrsPBxg1dECb1HY8Jg_x0rL7wR3";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fetch tracks from Supabase
async function fetchTracksFromDatabase() {
  const { data: tracks, error } = await supabase
    .from('tracks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tracks:', error);
    return [];
  }
  return tracks;
}

// Render DB tracks dynamically into the sample container
async function loadDatabaseTracksUI() {
  const sampleContainer = document.querySelector(".sample-grid") || document.querySelector("#sampleGrid");
  if (!sampleContainer) return;

  const tracks = await fetchTracksFromDatabase();
  if (!tracks.length) return;

  sampleContainer.innerHTML = tracks.map(track => `
    <article class="sample-card" data-genre="${track.genre || 'General'}">
      <div class="sample-art">
        ${track.cover_art_url ? `<img src="${track.cover_art_url}" alt="${track.title}">` : '<div class="sample-icon">🎵</div>'}
        <span class="genre-tag">${track.genre || 'General'}</span>
      </div>
      <div class="sample-info">
        <h3>${track.title}</h3>
        <p>${track.artist} • ${track.bpm ? track.bpm + ' BPM' : ''} ${track.key_signature ? '• ' + track.key_signature : ''}</p>
        <div class="sample-actions">
          <button class="btn primary play-btn" onclick="startTrack('${track.title}', '${track.artist}')">Play</button>
          <button class="btn secondary">Save</button>
        </div>
      </div>
    </article>
  `).join('');
}


document.addEventListener("DOMContentLoaded", () => {

  const authForm = document.querySelector("#authForm");
  if (authForm) {
    authForm.addEventListener("submit", (event) => {
      event.preventDefault();
      window.location.href = "home.html";
    });
  }

  /* =========================================================
     HELPERS
     ========================================================= */
  // ... rest of your existing JS ...


  /* =========================================================
     INITIALIZE
     ========================================================= */

  if (typeof updateResultCount === "function" && typeof sampleCards !== "undefined") {
    updateResultCount(sampleCards.length);
  }
  if (typeof updatePlayer === "function") {
    updatePlayer();
  }

  // --- ADD SUPABASE UI LOAD CALL HERE ---
  if (document.querySelector("#sampleGrid")) {
    loadDatabaseTracksUI();
  }

  console.log(
    "%cGrooveDNA loaded successfully.",
    "font-weight:bold;font-size:16px"
  );

});
