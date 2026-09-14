// GrooveDNA Application Javascript
// Initialize Supabase Client
const SUPABASE_URL = 'https://nzfzcnusmjboykledznh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qsskdrsPBxg1dECb1HY8Jg_x0rL7wR3';

let supabaseClient = null;

function initSupabase() {
  if (window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.error('Supabase CDN library not loaded yet.');
  }
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  initAuthUI();
  initDrumPads();
  initChat();
  initCommunitySection(); 
  checkUserSession();
});
}

// Global Auth State
let currentAuthMode = 'signup'; // 'signup' or 'login'

document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  initAuthUI();
  initDrumPads();
  initLibrary();
  initDiscover();
  checkUserSession();
});

/* ----------------------------------------------------
 * 1. AUTHENTICATION & MODAL TOGGLE LOGIC
 * ---------------------------------------------------- */
function initAuthUI() {
  const authToggleBtn = document.getElementById('auth-toggle-btn');
  const authForm = document.getElementById('auth-form');
  const btnSignUpNav = document.getElementById('btn-signup-nav');
  const btnSignInNav = document.getElementById('btn-signin-nav');
  const btnSignOut = document.getElementById('btn-signout');

  // Switch between Sign In and Sign Up modes inside Modal
  if (authToggleBtn) {
    authToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      currentAuthMode = currentAuthMode === 'signup' ? 'login' : 'signup';
      updateAuthModalUI();
    });
  }

  if (btnSignUpNav) {
    btnSignUpNav.addEventListener('click', () => {
      currentAuthMode = 'signup';
      updateAuthModalUI();
    });
  }

  if (btnSignInNav) {
    btnSignInNav.addEventListener('click', () => {
      currentAuthMode = 'login';
      updateAuthModalUI();
    });
  }

  // Form submission handler
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;

      if (!supabaseClient) {
        alert('Supabase client is not configured yet. Please check your Supabase CDN link.');
        window.location.hash = ''; // Close modal
        return;
      }

      if (currentAuthMode === 'signup') {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
          alert('Sign Up Error: ' + error.message);
        } else {
          alert('Account created! You are now signed in.');
          window.location.hash = '';
          checkUserSession();
        }
      } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
          alert('Sign In Error: ' + error.message);
        } else {
          alert('Successfully signed in!');
          window.location.hash = '';
          checkUserSession();
        }
      }
    });
  }

  // Safely handle Sign Out without triggering 403 errors
  if (btnSignOut) {
    btnSignOut.addEventListener('click', async () => {
      if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
          await supabaseClient.auth.signOut();
        }
      }
      checkUserSession();
    });
  }
}

function updateAuthModalUI() {
  const modalTitle = document.getElementById('auth-modal-title');
  const modalSubtitle = document.getElementById('auth-modal-subtitle');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleText = document.getElementById('auth-toggle-text');
  const toggleBtn = document.getElementById('auth-toggle-btn');

  if (currentAuthMode === 'signup') {
    if (modalTitle) modalTitle.textContent = 'Create Account';
    if (modalSubtitle) modalSubtitle.textContent = 'Join GrooveDNA to save your tracks and collaborate.';
    if (submitBtn) submitBtn.textContent = 'Create Account';
    if (toggleText) toggleText.textContent = 'Already have an account?';
    if (toggleBtn) toggleBtn.textContent = 'Sign In';
  } else {
    if (modalTitle) modalTitle.textContent = 'Sign In';
    if (modalSubtitle) modalSubtitle.textContent = 'Welcome back! Enter your credentials to access your studio.';
    if (submitBtn) submitBtn.textContent = 'Sign In';
    if (toggleText) toggleText.textContent = "Don't have an account?";
    if (toggleBtn) toggleBtn.textContent = 'Create Account';
  }
}

async function checkUserSession() {
  const userMenu = document.getElementById('user-profile-menu');
  const btnSignUpNav = document.getElementById('btn-signup-nav');
  const btnSignInNav = document.getElementById('btn-signin-nav');
  const userEmailDisplay = document.getElementById('user-email-display');

  if (!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session && session.user) {
    if (userMenu) userMenu.classList.remove('hidden');
    if (btnSignUpNav) btnSignUpNav.classList.add('hidden');
    if (btnSignInNav) btnSignInNav.classList.add('hidden');
    if (userEmailDisplay) userEmailDisplay.textContent = session.user.email;
  } else {
    if (userMenu) userMenu.classList.add('hidden');
    if (btnSignUpNav) btnSignUpNav.classList.remove('hidden');
    if (btnSignInNav) btnSignInNav.classList.remove('hidden');
  }
}

/* ----------------------------------------------------
 * 2. DRUM PAD INTERACTION & AUDIO
 * ---------------------------------------------------- */
function initDrumPads() {
  const padButtons = document.querySelectorAll('.pad-btn');
  const bpmSlider = document.getElementById('bpm-slider');
  const bpmVal = document.getElementById('bpm-val');

  if (bpmSlider && bpmVal) {
    bpmSlider.addEventListener('input', (e) => {
      bpmVal.textContent = e.target.value;
    });
  }

  padButtons.forEach(button => {
    button.addEventListener('click', () => triggerPad(button));
  });

  // Guarded keydown listener to prevent undefined errors
  window.addEventListener('keydown', (e) => {
    if (!e.key) return;
    const key = e.key.toUpperCase();
    const pad = document.querySelector(`.pad-btn[data-key="${key}"]`);
    if (pad) {
      triggerPad(pad);
    }
  });
}

function triggerPad(element) {
  element.classList.add('active');
  setTimeout(() => element.classList.remove('active'), 120);

  const soundName = element.getAttribute('data-sound');
  console.log(`[Audio Synth] Triggering sound: ${soundName}`);
  playAudioBeep();
}

function playAudioBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch(e) {
    // Audio context handle
  }
}

/* ----------------------------------------------------
 * 3. COMMUNITY FEED & SUPABASE MEDIA PLAYER
 * ---------------------------------------------------- */
let currentAudio = null;
let currentPlayBtn = null;

function initCommunitySection() {
  initCommunityAudio();
  initCommunityInteractions();
}

/**
 * Handles fetching public audio file URLs from Supabase Storage bucket ('tracks')
 * and plays/pauses the track on the client.
 */
function initCommunityAudio() {
  const playButtons = document.querySelectorAll('.mini-play, .btn-play');

  playButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const trackId = btn.getAttribute('data-id') || '4'; // Default track fallback
      
      // If clicking the currently playing track button, toggle pause/play
      if (currentAudio && currentPlayBtn === btn) {
        if (currentAudio.paused) {
          currentAudio.play();
          btn.textContent = '⏸';
        } else {
          currentAudio.pause();
          btn.textContent = '▶';
        }
        return;
      }

      // Stop any existing active track
      if (currentAudio) {
        currentAudio.pause();
        if (currentPlayBtn) currentPlayBtn.textContent = '▶';
      }

      // Fetch public media URL from Supabase storage bucket named 'tracks'
      let audioUrl = '';
      if (supabaseClient) {
        const { data } = supabaseClient
          .storage
          .from('tracks')
          .getPublicUrl(`track_${trackId}.mp3`);
          
        audioUrl = data?.publicUrl;
      }

      // Fallback synthetic audio if Supabase storage file isn't uploaded yet
      if (!audioUrl || audioUrl.includes('undefined')) {
        audioUrl = `https://nzfzcnusmjboykledznh.supabase.co/storage/v1/object/public/tracks/track_${trackId}.mp3`;
      }

      // Initialize and play new HTML5 Audio object
      currentAudio = new Audio(audioUrl);
      currentPlayBtn = btn;
      
      btn.textContent = '⏳'; // Loading state indicator

      currentAudio.play().then(() => {
        btn.textContent = '⏸';
      }).catch(err => {
        console.warn('[Supabase Media] Track file not found in storage bucket. Playing synthetic preview note.', err);
        playAudioBeep(); // Fallback audio sound
        btn.textContent = '▶';
        currentAudio = null;
        currentPlayBtn = null;
      });

      // Reset button state when audio finishes
      currentAudio.addEventListener('ended', () => {
        btn.textContent = '▶';
        currentAudio = null;
        currentPlayBtn = null;
      });
    });
  });
}

/**
 * Handles client-side interactivity for Likes, Follows, and Challenge joins.
 */
function initCommunityInteractions() {
  // Like Button Toggle
  const likeBtns = document.querySelectorAll('[data-like]');
  likeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isPressed = btn.getAttribute('aria-pressed') === 'true';
      const countSpan = btn.querySelector('.like-count') || btn.querySelector('span');
      
      let count = parseInt(countSpan?.textContent || '0', 10);
      
      if (isPressed) {
        btn.setAttribute('aria-pressed', 'false');
        if (countSpan) countSpan.textContent = count - 1;
      } else {
        btn.setAttribute('aria-pressed', 'true');
        if (countSpan) countSpan.textContent = count + 1;
      }
    });
  });

  // Follow Button Toggle
  const followBtns = document.querySelectorAll('[data-follow]');
  followBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isFollowing = btn.getAttribute('data-following') === 'true';
      if (isFollowing) {
        btn.setAttribute('data-following', 'false');
        btn.setAttribute('aria-pressed', 'false');
        btn.textContent = '＋ Follow';
      } else {
        btn.setAttribute('data-following', 'true');
        btn.setAttribute('aria-pressed', 'true');
        btn.textContent = '✓ Following';
      }
    });
  });

  // Challenge & DNA Match Actions
  const challengeBtn = document.getElementById('joinChallenge');
  if (challengeBtn) {
    challengeBtn.addEventListener('click', () => {
      alert('Awesome! You have entered this week\'s "Flip the Funk" challenge.');
    });
  }

  const dnaMatchBtn = document.getElementById('dnaMatch');
  if (dnaMatchBtn) {
    dnaMatchBtn.addEventListener('click', () => {
      alert('Opening DNA Match breakdown with @Maya...');
    });
  }
}

/* ----------------------------------------------------
 * 4. MUSIC LIBRARY & PLAYLIST MANAGER
 * ---------------------------------------------------- */
function initLibrary() {
  const librarySearchInput = document.getElementById('librarySearchInput');
  const librarySearchBtn = document.getElementById('librarySearchBtn');
  const grooveMoodBtn = document.getElementById('grooveMoodBtn');
  const addToPlaylistBtn = document.getElementById('addToPlaylistBtn');
  const editMoodBtn = document.getElementById('editMoodBtn');
  const grooveMoodPlayBtn = document.getElementById('grooveMoodPlayBtn');
  const newPlaylistBtn = document.getElementById('newPlaylist');

  // Library Search Action using Supabase Media Storage / Catalog
  if (librarySearchBtn && librarySearchInput) {
    librarySearchBtn.addEventListener('click', async () => {
      const query = librarySearchInput.value.trim();
      if (!query) {
        alert('Please enter a song, artist, or genre to search.');
        return;
      }
      await searchMusicMedia(query);
    });
  }

  // Groove of the Mood Actions
  if (grooveMoodBtn) {
    grooveMoodBtn.addEventListener('click', () => {
      const moodSection = document.getElementById('grooveMoodSection');
      if (moodSection) {
        moodSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  if (editMoodBtn) {
    editMoodBtn.addEventListener('click', () => {
      const songTitle = prompt('Enter the title for your mood song:');
      const artist = prompt('Enter the artist name:');
      if (songTitle && artist) {
        const titleElem = document.getElementById('grooveMoodSongTitle');
        const artistElem = document.getElementById('grooveMoodSongArtist');
        if (titleElem) titleElem.textContent = songTitle;
        if (artistElem) artistElem.textContent = artist;
      }
    });
  }

  if (grooveMoodPlayBtn) {
    grooveMoodPlayBtn.addEventListener('click', () => {
      playAudioBeep(); // Plays audio feedback using Web Audio API
      if (grooveMoodPlayBtn.textContent.includes('Play')) {
        grooveMoodPlayBtn.textContent = '⏸ Pause';
      } else {
        grooveMoodPlayBtn.textContent = '▶ Play';
      }
    });
  }

  // Add Playlist Action
  if (newPlaylistBtn) {
    newPlaylistBtn.addEventListener('click', () => {
      createNewPlaylistCard();
    });
  }

  if (addToPlaylistBtn) {
    addToPlaylistBtn.addEventListener('click', () => {
      createNewPlaylistCard();
    });
  }

  // Initialize Row Title Saving Logic
  initRowTitleSavers();
}

// Function to fetch music media authorized via Supabase
async function searchMusicMedia(query) {
  if (!supabaseClient) {
    console.warn('Supabase client not initialized. Querying local fallback for:', query);
    alert(`Searching media catalog for: "${query}"`);
    return;
  }

  try {
    // Example Supabase Query: Accessing media audio tracks from 'tracks' bucket/table
    const { data, error } = await supabaseClient
      .from('tracks')
      .select('*')
      .ilike('title', `%${query}%`);

    if (error) throw error;

    if (data && data.length > 0) {
      alert(`Found ${data.length} track(s) matching "${query}" in Supabase media repository!`);
    } else {
      alert(`No tracks found matching "${query}". Try searching for Rock, Funk, or Soul.`);
    }
  } catch (err) {
    console.error('Supabase Media Query Error:', err.message);
    alert(`Searching catalog for: "${query}"`);
  }
}

function createNewPlaylistCard() {
  const name = prompt('Enter a name for your new playlist:', 'My Groove Playlist');
  if (!name) return;

  const playlistGrid = document.getElementById('userPlaylistGrid');
  if (playlistGrid) {
    const card = document.createElement('article');
    card.className = 'playlist-card';
    card.innerHTML = `
      <strong>${name}</strong>
      <span>0 Songs</span>
      <button class="btn small secondary" style="margin-top: 8px;">▶ Play</button>
    `;
    playlistGrid.appendChild(card);
  }
}

function initRowTitleSavers() {
  const saveBtns = document.querySelectorAll('.save-row-title');
  saveBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const parent = e.target.closest('.row-heading');
      if (parent) {
        const input = parent.querySelector('.row-title-input');
        const h3 = parent.querySelector('h3');
        if (input && h3 && input.value.trim() !== '') {
          h3.textContent = input.value.trim();
          input.value = '';
          alert('Row title updated!');
        }
      }
    });
  });
}

/* ----------------------------------------------------
 * 5. MUSIC DISCOVERY & SOUND CATALOG
 * ---------------------------------------------------- */
// Sample Catalog Data
const sampleCatalog = [
  { id: 1, title: 'Neo-Soul Keys', artist: 'GrooveDNA Master', genre: 'Soul', bpm: 88, audioUrl: '#' },
  { id: 2, title: 'Funk Bassline #4', artist: 'Bootsy Vibes', genre: 'Funk', bpm: 110, audioUrl: '#' },
  { id: 3, title: 'Vintage Rock Riff', artist: 'Hendrix Sound', genre: 'Rock', bpm: 124, audioUrl: '#' },
  { id: 4, title: 'Lofi Jazz Chords', artist: 'Chill Beatmaker', genre: 'Jazz', bpm: 80, audioUrl: '#' },
  { id: 5, title: 'Modern R&B Vocal Hit', artist: 'Aria', genre: 'R&B', bpm: 95, audioUrl: '#' }
];

function initDiscover() {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const uploadBtn2 = document.getElementById('uploadBtn2');
  const discoverMore = document.getElementById('discoverMore');
  const genreFilters = document.querySelectorAll('#genreFilters .filter');

  // Render initial samples
  renderSamples(sampleCatalog);
  renderStretchRecommendations();

  // Search Button Action
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      filterDiscoverCatalog();
    });
  }

  // Genre Filter Buttons
  genreFilters.forEach(button => {
    button.addEventListener('click', () => {
      genreFilters.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      filterDiscoverCatalog();
    });
  });

  // Refresh Picks Action
  if (discoverMore) {
    discoverMore.addEventListener('click', () => {
      const shuffled = [...sampleCatalog].sort(() => 0.5 - Math.random());
      renderSamples(shuffled);
    });
  }

  // Audio Upload Action with Supabase Storage Integration
  if (uploadBtn2) {
    uploadBtn2.addEventListener('click', () => {
      handleAudioUpload();
    });
  }
}

function filterDiscoverCatalog() {
  const searchInput = document.getElementById('searchInput');
  const activeFilter = document.querySelector('#genreFilters .filter.active');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const selectedGenre = activeFilter ? activeFilter.getAttribute('data-genre') : 'All';

  const filtered = sampleCatalog.filter(sample => {
    const matchesQuery = sample.title.toLowerCase().includes(query) ||
                         sample.artist.toLowerCase().includes(query) ||
                         sample.genre.toLowerCase().includes(query);
    const matchesGenre = selectedGenre === 'All' || sample.genre === selectedGenre;
    return matchesQuery && matchesGenre;
  });

  renderSamples(filtered);
}

function renderSamples(samples) {
  const sampleGrid = document.getElementById('sampleGrid');
  const resultCount = document.getElementById('resultCount');

  if (resultCount) {
    resultCount.textContent = `${samples.length} sound(s) found`;
  }

  if (!sampleGrid) return;

  sampleGrid.innerHTML = '';

  if (samples.length === 0) {
    sampleGrid.innerHTML = '<p class="text-muted">No sounds found matching your search criteria.</p>';
    return;
  }

  samples.forEach(sample => {
    const card = document.createElement('article');
    card.className = 'sample-card';
    card.innerHTML = `
      <div class="sample-card-header">
        <span class="genre-tag">${sample.genre}</span>
        <span style="font-size: 0.8rem; color: var(--text-muted);">${sample.bpm} BPM</span>
      </div>
      <div>
        <h4>${sample.title}</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted);">${sample.artist}</p>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button class="btn small primary play-sample-btn" data-id="${sample.id}">▶ Play</button>
        <button class="btn small secondary save-sample-btn" data-id="${sample.id}">♡ Save</button>
      </div>
    `;
    sampleGrid.appendChild(card);
  });

  // Attach event handlers to dynamic play buttons
  document.querySelectorAll('.play-sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playAudioBeep(); // Triggers synthesized audio feedback
    });
  });

  // Attach event handlers to save buttons
  document.querySelectorAll('.save-sample-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.textContent = '♥ Saved';
      e.target.style.color = 'var(--accent-pink)';
    });
  });
}

function renderStretchRecommendations() {
  const stretchGrid = document.getElementById('stretchGrid');
  if (!stretchGrid) return;

  const stretchSamples = sampleCatalog.slice(0, 3);
  stretchGrid.innerHTML = '';

  stretchSamples.forEach(sample => {
    const card = document.createElement('article');
    card.className = 'sample-card';
    card.style.minWidth = '220px';
    card.innerHTML = `
      <span class="genre-tag">${sample.genre}</span>
      <h4 style="margin-top: 8px;">${sample.title}</h4>
      <p style="font-size: 0.85rem; color: var(--text-muted);">${sample.artist}</p>
      <button class="btn small outline play-sample-btn" style="margin-top: 8px;">▶ Explore</button>
    `;
    stretchGrid.appendChild(card);
  });
}

async function handleAudioUpload() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'audio/*';

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (supabaseClient) {
      try {
        alert(`Uploading "${file.name}" to Supabase storage...`);
        // Authorized Supabase Storage Upload
        const { data, error } = await supabaseClient
          .storage
          .from('audio-samples')
          .upload(`public/${Date.now()}_${file.name}`, file);

        if (error) throw error;

        alert('Upload successful! Your audio is available in GrooveDNA.');
      } catch (err) {
        console.error('Supabase Upload Error:', err.message);
        alert(`File selected: ${file.name}. Ready for studio processing.`);
      }
    } else {
      alert(`File loaded: ${file.name}`);
    }
  };

  fileInput.click();
}
