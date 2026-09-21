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
}

// Global Auth State
let currentAuthMode = 'signup'; // 'signup' or 'login'

document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  initAuthUI();
  initDrumPads();
  initCommunity(); 
  initLibrary();
  initDiscover();
  initProfile();
  initSPARouter();
  checkUserSession();
  initFreesoundSearch();
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

    // Auto restore profile avatar for logged-in user
    loadUserProfilePhoto();
  } else {
    if (userMenu) userMenu.classList.add('hidden');
    if (btnSignUpNav) btnSignUpNav.classList.remove('hidden');
    if (btnSignInNav) btnSignInNav.classList.remove('hidden');
  }
}

/* ----------------------------------------------------
 * 2. BEAT LAB WORKSTATION & SUPABASE DRUM PAD AUDIO
 * ---------------------------------------------------- */
let isRecordingPattern = false;
let recordedPattern = [];
let activePatternTimeouts = [];
let patternStartTime = 0;

function initDrumPads() {
  const padButtons = document.querySelectorAll('.pad-btn, .drum-pad');
  const bpmSlider = document.getElementById('bpm-slider');
  const bpmVal = document.getElementById('bpm-val');
  const pitchSlider = document.getElementById('pitch');
  const pitchValue = document.getElementById('pitchValue');

  // Sync BPM Slider
  if (bpmSlider && bpmVal) {
    bpmSlider.addEventListener('input', (e) => {
      bpmVal.textContent = e.target.value;
    });
  }

  // Sync Pitch Slider
  if (pitchSlider && pitchValue) {
    pitchSlider.addEventListener('input', (e) => {
      pitchValue.textContent = e.target.value;
    });
  }

  // Click handler for Drum Pads
  padButtons.forEach(button => {
    button.addEventListener('click', () => triggerPad(button));
  });

  // Keydown listener for Q, W, E, R, A, S, D, F
  window.addEventListener('keydown', (e) => {
    if (!e.key || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const key = e.key.toUpperCase();
    const pad = document.querySelector(`.pad-btn[data-key="${key}"], .drum-pad[data-key="${key}"]`);
    if (pad) {
      triggerPad(pad);
    }
  });

  // Initialize Beat Lab Mode Switching & Pattern Controls
  initBeatLabControls();
}

/**
 * Triggers visual pad activation, records note events, 
 * and plays sample audio from Supabase Storage or custom Freesound link.
 */
async function triggerPad(element) {
  element.classList.add('active');
  setTimeout(() => element.classList.remove('active'), 120);

  const soundName = element.getAttribute('data-sound') || element.getAttribute('data-drum');
  const customAudioUrl = element.getAttribute('data-custom-audio-url');

  // Record pattern event if recording state is active
  if (isRecordingPattern) {
    const timeOffset = Date.now() - patternStartTime;
    recordedPattern.push({ sound: soundName, pad: element, time: timeOffset });
  }

  // Play custom sample or default Supabase track
  if (customAudioUrl) {
    const customAudio = new Audio(customAudioUrl);
    const pitchSlider = document.getElementById('pitch');
    if (pitchSlider && pitchSlider.value != 0) {
      const semitones = parseFloat(pitchSlider.value);
      customAudio.playbackRate = Math.pow(2, semitones / 12);
    }
    customAudio.play().catch(e => console.error('Error playing sample:', e));
  } else {
    playSupabaseAudioSample(soundName);
  }
}

/**
 * Fetches sample media URL from Supabase Storage bucket ('tracks')
 * and plays it with client-side audio fallback.
 */
function playSupabaseAudioSample(soundName) {
  let audioUrl = '';

  if (supabaseClient) {
    const { data } = supabaseClient
      .storage
      .from('tracks')
      .getPublicUrl(`${soundName}.mp3`);
      
    audioUrl = data?.publicUrl;
  }

  // Supabase CDN Direct Media URL fallback
  if (!audioUrl || audioUrl.includes('undefined')) {
    audioUrl = `${SUPABASE_URL}/storage/v1/object/public/tracks/${soundName}.mp3`;
  }

  const sampleAudio = new Audio(audioUrl);
  
  // Apply pitch playback rate adjustment if set
  const pitchSlider = document.getElementById('pitch');
  if (pitchSlider && pitchSlider.value != 0) {
    const semitones = parseFloat(pitchSlider.value);
    sampleAudio.playbackRate = Math.pow(2, semitones / 12);
  }

  sampleAudio.play().catch(() => {
    // Synthetic Web Audio API Fallback if file isn't uploaded to bucket yet
    playAudioBeep(soundName);
  });
}

function playAudioBeep(soundName = 'kick') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Map sound names to synthetic frequencies
    const freqMap = {
      kick: 80,
      snare: 240,
      hihat: 800,
      clap: 450,
      synth1: 320,
      synth2: 440,
      bass: 110,
      vocal: 520,
      tom: 150,
      openhat: 700,
      crash: 900,
      perc: 380
    };

    const targetFreq = freqMap[soundName] || 300;

    osc.type = soundName === 'kick' || soundName === 'bass' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(targetFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch(e) {
    // Audio Context fallback safety
  }
}

/**
 * Initializes Beat Modes, Step Sequencer controls, and Beat Lab actions.
 */
function initBeatLabControls() {
  // Mode Selector Tabs
  const modeBtns = document.querySelectorAll('.beat-mode');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Pattern Recording Controls
  const drumRecordBtn = document.getElementById('drumRecord');
  const drumClearBtn = document.getElementById('drumClear');
  const drumPatternPlay = document.getElementById('drumPatternPlay');
  const drumPatternStop = document.getElementById('drumPatternStop');
  const drumPatternStatus = document.getElementById('drumPatternStatus');

  if (drumRecordBtn) {
    drumRecordBtn.addEventListener('click', () => {
      isRecordingPattern = !isRecordingPattern;
      if (isRecordingPattern) {
        recordedPattern = [];
        patternStartTime = Date.now();
        drumRecordBtn.setAttribute('aria-pressed', 'true');
        drumRecordBtn.textContent = '⏹ Stop Rec';
        if (drumPatternStatus) drumPatternStatus.textContent = 'Recording pattern... Play pads now.';
      } else {
        drumRecordBtn.setAttribute('aria-pressed', 'false');
        drumRecordBtn.textContent = '● Rec';
        if (drumPatternStatus) drumPatternStatus.textContent = `Pattern recorded (${recordedPattern.length} notes).`;
      }
    });
  }

  if (drumClearBtn) {
    drumClearBtn.addEventListener('click', () => {
      stopRecordedPattern();
      recordedPattern = [];
      if (drumPatternStatus) drumPatternStatus.textContent = 'Recorded pattern cleared.';
    });
  }

  if (drumPatternPlay) {
    drumPatternPlay.addEventListener('click', () => {
      if (recordedPattern.length === 0) {
        if (drumPatternStatus) drumPatternStatus.textContent = 'No pattern recorded to play.';
        return;
      }
      playRecordedPattern();
    });
  }

  if (drumPatternStop) {
    drumPatternStop.addEventListener('click', () => {
      stopRecordedPattern();
      if (drumPatternStatus) drumPatternStatus.textContent = 'Playback stopped.';
    });
  }
}

function playRecordedPattern() {
  const drumPatternStatus = document.getElementById('drumPatternStatus');
  if (drumPatternStatus) drumPatternStatus.textContent = 'Playing recorded pattern...';

  stopRecordedPattern();

  recordedPattern.forEach(note => {
    const timeoutId = setTimeout(() => {
      triggerPad(note.pad);
    }, note.time);
    
    activePatternTimeouts.push(timeoutId);
  });
}

function stopRecordedPattern() {
  activePatternTimeouts.forEach(id => clearTimeout(id));
  activePatternTimeouts = [];
}

/* ----------------------------------------------------
 * 3. COMMUNITY FEED & SUPABASE MEDIA PLAYER
 * ---------------------------------------------------- */
let currentAudio = null;
let currentPlayBtn = null;

function initCommunity() {
  initCommunityAudio();
  initCommunityInteractions();
}

function initCommunityAudio() {
  const playButtons = document.querySelectorAll('.mini-play, .btn-play');

  playButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const trackId = btn.getAttribute('data-id') || '4'; 
      
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

      if (currentAudio) {
        currentAudio.pause();
        if (currentPlayBtn) currentPlayBtn.textContent = '▶';
      }

      let audioUrl = '';
      if (supabaseClient) {
        const { data } = supabaseClient
          .storage
          .from('tracks')
          .getPublicUrl(`track_${trackId}.mp3`);
          
        audioUrl = data?.publicUrl;
      }

      if (!audioUrl || audioUrl.includes('undefined')) {
        audioUrl = `${SUPABASE_URL}/storage/v1/object/public/tracks/track_${trackId}.mp3`;
      }

      currentAudio = new Audio(audioUrl);
      currentPlayBtn = btn;
      
      btn.textContent = '⏳';

      currentAudio.play().then(() => {
        btn.textContent = '⏸';
      }).catch(err => {
        console.warn('[Supabase Media] Track file not found in storage bucket. Playing synthetic preview note.', err);
        playAudioBeep();
        btn.textContent = '▶';
        currentAudio = null;
        currentPlayBtn = null;
      });

      currentAudio.addEventListener('ended', () => {
        btn.textContent = '▶';
        currentAudio = null;
        currentPlayBtn = null;
      });
    });
  });
}

function initCommunityInteractions() {
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
      playAudioBeep();
      if (grooveMoodPlayBtn.textContent.includes('Play')) {
        grooveMoodPlayBtn.textContent = '⏸ Pause';
      } else {
        grooveMoodPlayBtn.textContent = '▶ Play';
      }
    });
  }

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

  initRowTitleSavers();
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
const sampleCatalog = [
  { id: '1', title: 'Funky Bassline', artist: 'Groove Master', genre: 'Funk', bpm: 120 },
  { id: '2', title: 'Chill Lo-Fi Beat', artist: 'Aesthetic Vibe', genre: 'Lo-Fi', bpm: 85 },
  { id: '3', title: 'Synthwave Drive', artist: 'Retro Future', genre: 'Electronic', bpm: 110 }
];

async function initDiscover() {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const uploadBtn2 = document.getElementById('uploadBtn2');
  const discoverMore = document.getElementById('discoverMore');
  const genreFilters = document.querySelectorAll('#genreFilters .filter');

  const supabaseTracks = await fetchCatalogFromSupabase();
  if (supabaseTracks && supabaseTracks.length > 0) {
    renderTrackList(supabaseTracks);
  } else {
    renderSamples(sampleCatalog);
  }

  renderStretchRecommendations();

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      filterDiscoverCatalog();
    });
  }

  genreFilters.forEach(button => {
    button.addEventListener('click', () => {
      genreFilters.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      filterDiscoverCatalog();
    });
  });

  if (discoverMore) {
    discoverMore.addEventListener('click', () => {
      const shuffled = [...sampleCatalog].sort(() => 0.5 - Math.random());
      renderSamples(shuffled);
    });
  }

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

  document.querySelectorAll('.play-sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playAudioBeep();
    });
  });

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

/* ----------------------------------------------------
 * FREESOUND API INTEGRATION FOR GROOVEDNA SAMPLER
 * ---------------------------------------------------- */

const FREESOUND_API_KEY = 'USuQhVBqWDFi4yDssTqhY0MpenBtPi2m5MF8bKLX';
const FREESOUND_SEARCH_URL = 'https://freesound.org/apiv2/search/text/';

function initFreesoundSearch() {
  const searchBtn = document.getElementById('freesoundSearchBtn');
  const searchInput = document.getElementById('freesoundInput');

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        searchFreesoundSamples(query);
      }
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) searchFreesoundSamples(query);
      }
    });
  }
}

async function searchFreesoundSamples(query) {
  const resultsContainer = document.getElementById('freesoundResults');
  if (resultsContainer) {
    resultsContainer.innerHTML = '<p class="text-muted">Searching Freesound samples...</p>';
  }

  try {
    const response = await fetch(
      `${FREESOUND_SEARCH_URL}?query=${encodeURIComponent(query)}&token=${FREESOUND_API_KEY}&fields=id,name,previews,tags,username`
    );

    if (!response.ok) {
      throw new Error(`Freesound API error: ${response.statusText}`);
    }

    const data = await response.json();
    renderFreesoundResults(data.results || []);
  } catch (error) {
    console.error('Freesound search failed:', error);
    if (resultsContainer) {
      resultsContainer.innerHTML = `<p style="color: var(--accent-pink, red);">Failed to load samples. Please verify your API key.</p>`;
    }
  }
}

function renderFreesoundResults(samples) {
  const resultsContainer = document.getElementById('freesoundResults');
  if (!resultsContainer) return;

  if (samples.length === 0) {
    resultsContainer.innerHTML = '<p class="text-muted">No audio samples found on Freesound.</p>';
    return;
  }

  resultsContainer.innerHTML = '';

  samples.forEach(sample => {
    const audioPreviewUrl = sample.previews['preview-hq-mp3'] || sample.previews['preview-lq-mp3'];

    const card = document.createElement('article');
    card.className = 'sample-card';
    card.innerHTML = `
      <div class="sample-card-header">
        <span class="genre-tag">Freesound</span>
        <span style="font-size: 0.8rem; color: var(--text-muted);">by @${sample.username}</span>
      </div>
      <div>
        <h4>${sample.name}</h4>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
        <button class="btn small primary preview-freesound-btn">▶ Preview</button>
        <button class="btn small secondary load-pad-btn">⚡ Assign to Pad</button>
      </div>
    `;

    const previewBtn = card.querySelector('.preview-freesound-btn');
    let audioObj = null;

    previewBtn.addEventListener('click', () => {
      if (audioObj && !audioObj.paused) {
        audioObj.pause();
        previewBtn.textContent = '▶ Preview';
      } else {
        if (audioObj) {
          audioObj.play();
        } else {
          audioObj = new Audio(audioPreviewUrl);
          audioObj.play();
        }
        previewBtn.textContent = '⏸ Pause';

        audioObj.addEventListener('ended', () => {
          previewBtn.textContent = '▶ Preview';
        });
      }
    });

    const assignBtn = card.querySelector('.load-pad-btn');
    assignBtn.addEventListener('click', () => {
      const targetPadKey = prompt('Enter the pad key to assign this sample to (e.g., Q, W, E, R, A, S, D, F):');
      if (!targetPadKey) return;

      const keyUpper = targetPadKey.trim().toUpperCase();
      const targetPad = document.querySelector(`.pad-btn[data-key="${keyUpper}"], .drum-pad[data-key="${keyUpper}"]`);

      if (targetPad) {
        targetPad.setAttribute('data-custom-audio-url', audioPreviewUrl);
        alert(`Sample "${sample.name}" assigned to Pad [${keyUpper}]!`);
      } else {
        alert(`Pad with key [${keyUpper}] not found.`);
      }
    });

    resultsContainer.appendChild(card);
  });
}

/* ----------------------------------------------------
 * 6. INDIVIDUAL USER PROFILE LOGIC & CAMERA SYSTEM
 * ---------------------------------------------------- */
let currentProfileAudio = null;
let currentStream = null;

function initProfile() {
  initProfileHeading();
  initProfileMusicSearch();
  initProfileLocation();
  initCameraControls();
  loadUserProfilePhoto();
}

/**
 * Initializes webcam controls and photo capturing logic
 */
function initCameraControls() {
  const cameraModal = document.getElementById('cameraModal');
  const cameraVideo = document.getElementById('cameraVideo');
  const takePhotoBtn = document.getElementById('takePhotoBtn');
  const closeCameraBtn = document.getElementById('closeCameraBtn');
  const captureFrameBtn = document.getElementById('captureFrameBtn');

  // Open camera feed
  if (takePhotoBtn) {
    takePhotoBtn.addEventListener('click', async () => {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: false 
        });
        if (cameraVideo) {
          cameraVideo.srcObject = currentStream;
        }
        if (cameraModal) {
          cameraModal.classList.remove('hidden');
          cameraModal.setAttribute('aria-hidden', 'false');
        }
      } catch (err) {
        console.error('Camera access error:', err);
        alert('Unable to access camera. Please check device permissions.');
      }
    });
  }

  // Close camera modal and stop tracks
  if (closeCameraBtn) {
    closeCameraBtn.addEventListener('click', stopCamera);
  }

  // Take photo snapshot and save to profile
  if (captureFrameBtn) {
    captureFrameBtn.addEventListener('click', async () => {
      if (!cameraVideo || !cameraVideo.videoWidth) return;

      const canvas = document.createElement('canvas');
      canvas.width = cameraVideo.videoWidth;
      canvas.height = cameraVideo.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

      const imageDataUrl = canvas.toDataURL('image/png');

      // Update current profile avatar UI immediately
      updateAvatarUI(imageDataUrl);

      // Turn off camera
      stopCamera();

      // Persist picture across logins
      await saveUserProfilePhoto(imageDataUrl);
    });
  }
}

function stopCamera() {
  const cameraModal = document.getElementById('cameraModal');
  const cameraVideo = document.getElementById('cameraVideo');

  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  if (cameraVideo) {
    cameraVideo.srcObject = null;
  }
  if (cameraModal) {
    cameraModal.classList.add('hidden');
    cameraModal.setAttribute('aria-hidden', 'true');
  }
}

function updateAvatarUI(photoUrl) {
  const profileAvatarImage = document.getElementById('profileAvatarImage');
  const profileAvatarPlaceholder = document.getElementById('profileAvatarPlaceholder');

  if (profileAvatarImage) {
    profileAvatarImage.src = photoUrl;
    profileAvatarImage.hidden = false;
  }
  if (profileAvatarPlaceholder) {
    profileAvatarPlaceholder.hidden = true;
  }
}

async function saveUserProfilePhoto(photoDataUrl) {
  let userId = 'guest_user';

  if (supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
      userId = session.user.id;

      // Persist into Supabase database table
      try {
        await supabaseClient
          .from('profiles')
          .upsert({ 
            id: userId, 
            avatar_url: photoDataUrl,
            updated_at: new Date() 
          });
      } catch (err) {
        console.error('Failed to sync avatar with Supabase:', err);
      }
    }
  }

  // Always save to LocalStorage for offline and persistent session lookup
  localStorage.setItem(`groovedna_avatar_${userId}`, photoDataUrl);
}

async function loadUserProfilePhoto() {
  let userId = 'guest_user';

  if (supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
      userId = session.user.id;

      try {
        const { data } = await supabaseClient
          .from('profiles')
          .select('avatar_url')
          .eq('id', userId)
          .single();

        if (data && data.avatar_url) {
          updateAvatarUI(data.avatar_url);
          localStorage.setItem(`groovedna_avatar_${userId}`, data.avatar_url);
          return;
        }
      } catch(e) {
        console.warn('Unable to load avatar from Supabase:', e);
      }
    }
  }

  // Restore cached picture from browser storage
  const cachedAvatar = localStorage.getItem(`groovedna_avatar_${userId}`);
  if (cachedAvatar) {
    updateAvatarUI(cachedAvatar);
  }
}

function initProfileHeading() {
  const headingInput = document.getElementById('profileHeading');
  const headingPreview = document.getElementById('profileHeadingPreview');

  if (headingInput && headingPreview) {
    headingInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      headingPreview.textContent = val ? val : 'Your profile heading';
    });
  }
}

function initProfileMusicSearch() {
  const addAnthemBtn = document.getElementById('addProfileMusicBtn');
  const anthemSearchSection = document.getElementById('profileMusicSearch');
  const executeSearchBtn = document.getElementById('profileMusicSearchBtn');
  const anthemInputElem = document.getElementById('profileMusicInput');
  const anthemResultsContainer = document.getElementById('profileMusicResults');

  if (addAnthemBtn && anthemSearchSection) {
    addAnthemBtn.addEventListener('click', () => {
      anthemSearchSection.hidden = !anthemSearchSection.hidden;
    });
  }

  async function searchSupabaseMusic(queryText, targetContainer) {
    if (!targetContainer) return;

    targetContainer.innerHTML = '<div class="profile-empty-state">Searching Supabase media...</div>';

    let tracks = [];

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.storage.from('tracks').list();
        if (data && !error) {
          tracks = data.filter(file => file.name.toLowerCase().includes(queryText.toLowerCase()));
        }
      } catch (err) {
        console.error('Supabase storage search error:', err);
      }
    }

    if (tracks.length === 0) {
      const defaultSamples = ['kick', 'snare', 'synth1', 'synth2', 'bass', 'vocal'];
      tracks = defaultSamples
        .filter(s => s.includes(queryText.toLowerCase()))
        .map(s => ({ name: `${s}.mp3` }));
    }

    if (tracks.length === 0) {
      targetContainer.innerHTML = `<div class="profile-empty-state">No track matching "${queryText}"</div>`;
      return;
    }

    targetContainer.innerHTML = '';
    tracks.forEach(track => {
      const fileName = track.name.replace('.mp3', '');
      const trackUrl = `${SUPABASE_URL}/storage/v1/object/public/tracks/${track.name}`;

      const card = document.createElement('div');
      card.className = 'audio-player-mock';
      card.style.marginBottom = '8px';
      card.innerHTML = `
        <strong style="text-transform: capitalize; flex-grow: 1;">${fileName}</strong>
        <button class="btn primary small btn-set-anthem">Set as Anthem</button>
      `;

      card.querySelector('.btn-set-anthem').addEventListener('click', () => {
        setProfileAnthem(fileName, trackUrl);
      });

      targetContainer.appendChild(card);
    });
  }

  if (executeSearchBtn && anthemInputElem) {
    executeSearchBtn.addEventListener('click', async () => {
      const searchQuery = anthemInputElem.value.trim().toLowerCase();
      if (!searchQuery) return;
      await searchSupabaseMusic(searchQuery, anthemResultsContainer);
    });
  }
}

function setProfileAnthem(title, url) {
  const currentMusicDiv = document.getElementById('profileCurrentMusic');
  const musicSearchDiv = document.getElementById('profileMusicSearch');

  if (musicSearchDiv) musicSearchDiv.hidden = true;

  if (currentProfileAudio) {
    currentProfileAudio.pause();
  }

  currentProfileAudio = new Audio(url);

  if (currentMusicDiv) {
    currentMusicDiv.innerHTML = `
      <div class="audio-player-mock">
        <button class="btn-play" id="btnPlayAnthem">▶ Play</button>
        <div style="flex-grow: 1;">
          <strong style="text-transform: capitalize; display: block;">${title}</strong>
          <small style="color: var(--text-muted);">Profile Anthem</small>
        </div>
      </div>
    `;

    const playBtn = document.getElementById('btnPlayAnthem');
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        if (currentProfileAudio.paused) {
          currentProfileAudio.play().catch(() => playAudioBeep());
          e.target.textContent = '⏸ Pause';
        } else {
          currentProfileAudio.pause();
          e.target.textContent = '▶ Play';
        }
      });
    }
  }
}

function initProfileLocation() {
  const editLocationBtn = document.getElementById('editProfileLocationBtn');
  const locationText = document.getElementById('profileLocationText');

  if (editLocationBtn) {
    editLocationBtn.addEventListener('click', () => {
      const current = locationText ? locationText.textContent : '';
      const newLoc = prompt('Enter your location (e.g., Los Angeles, CA):', current.includes('sharing is off') ? '' : current);
      if (newLoc !== null) {
        if (locationText) {
          locationText.textContent = newLoc.trim() ? newLoc.trim() : 'Location sharing is off';
        }
      }
    });
  }
}

/* ==========================================================================
 * 7. SINGLE PAGE APPLICATION (SPA) ROUTER
 * ========================================================================== */

function initSPARouter() {
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash || '#home';
    console.log('Navigated to:', hash);
  });
}

/* ==========================================================================
 * 8. SUPABASE DATABASE QUERY INTEGRATION
 * ========================================================================== */

async function fetchCatalogFromSupabase() {
  if (!supabaseClient) return [];

  try {
    const { data, error } = await supabaseClient
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching catalog from Supabase:', err.message);
    return [];
  }
}

async function searchMusicMedia(query) {
  if (!query || !supabaseClient) return [];

  try {
    const { data, error } = await supabaseClient
      .from('tracks')
      .select('*')
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%,genre.ilike.%${query}%`);

    if (error) throw error;

    renderTrackList(data);
    return data;
  } catch (err) {
    console.error('Error performing search:', err.message);
    return [];
  }
}

function renderTrackList(tracks) {
  const catalogContainer = document.querySelector('.track-grid') || document.querySelector('#discoverCatalog');
  if (!catalogContainer) return;

  if (tracks.length === 0) {
    catalogContainer.innerHTML = '<p class="no-results">No tracks found in the database.</p>';
    return;
  }

  catalogContainer.innerHTML = tracks.map(track => `
    <div class="track-card" data-track-id="${track.id}" data-audio-url="${track.audio_url}">
      <img src="${track.cover_url || 'https://via.placeholder.com/150'}" alt="${track.title} Cover" class="track-cover" />
      <div class="track-info">
        <h4>${track.title}</h4>
        <p>${track.artist}</p>
        <span class="genre-badge">${track.genre}</span>
      </div>
      <button class="play-btn" onclick="playTrack('${track.audio_url}', '${track.title}', '${track.artist}')">▶</button>
    </div>
  `).join('');
}
