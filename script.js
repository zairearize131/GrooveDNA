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
    loadSavedUserAvatar();
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
 * and plays sample audio from Supabase Storage bucket.
 */
async function triggerPad(element) {
  element.classList.add('active');
  setTimeout(() => element.classList.remove('active'), 120);

  const soundName = element.getAttribute('data-sound') || element.getAttribute('data-drum');

  // Record pattern event if recording state is active
  if (isRecordingPattern) {
    const timeOffset = Date.now() - patternStartTime;
    recordedPattern.push({ sound: soundName, pad: element, time: timeOffset });
  }

  // Play audio track from Supabase Storage
  playSupabaseAudioSample(soundName);
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
    // Pitch shift formula approximation via playbackRate
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

  // Clear any ongoing playback before starting a new run
  stopRecordedPattern();

  recordedPattern.forEach(note => {
    const timeoutId = setTimeout(() => {
      triggerPad(note.pad);
    }, note.time);
    
    activePatternTimeouts.push(timeoutId);
  });
}

function stopRecordedPattern() {
  // Clear all pending scheduled notes
  activePatternTimeouts.forEach(id => clearTimeout(id));
  activePatternTimeouts = [];
}

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

  // If a custom Freesound sample was loaded onto this pad, play it directly!
  if (customAudioUrl) {
    const customAudio = new Audio(customAudioUrl);
    
    const pitchSlider = document.getElementById('pitch');
    if (pitchSlider && pitchSlider.value != 0) {
      const semitones = parseFloat(pitchSlider.value);
      customAudio.playbackRate = Math.pow(2, semitones / 12);
    }
    
    customAudio.play().catch(e => console.error('Error playing sample:', e));
  } else {
    // Play audio track from Supabase Storage default
    playSupabaseAudioSample(soundName);
  }
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
        audioUrl = `${SUPABASE_URL}/storage/v1/object/public/tracks/track_${trackId}.mp3`;
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

  // Fetch real tracks from Supabase first
  const supabaseTracks = await fetchCatalogFromSupabase();
  if (supabaseTracks && supabaseTracks.length > 0) {
    renderTrackList(supabaseTracks);
  } else {
    renderSamples(sampleCatalog);
  }

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

// Replace 'YOUR_FREESOUND_API_KEY' with your actual API key from freesound.org/apiv2/apply/
const FREESOUND_API_KEY = ('USuQhVBqWDFi4yDssTqhY0MpenBtPi2m5MF8bKLX');
const FREESOUND_SEARCH_URL = 'https://freesound.org/apiv2/apply/';

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

    // Allow search on Enter key
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) searchFreesoundSamples(query);
      }
    });
  }
}

/**
 * Queries Freesound API for sounds matching the search string
 */
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

/**
 * Renders sample search results with preview and drum pad assignment options
 */
function renderFreesoundResults(samples) {
  const resultsContainer = document.getElementById('freesoundResults');
  if (!resultsContainer) return;

  if (samples.length === 0) {
    resultsContainer.innerHTML = '<p class="text-muted">No audio samples found on Freesound.</p>';
    return;
  }

  resultsContainer.innerHTML = '';

  samples.forEach(sample => {
    // High-quality MP3 preview URL provided by Freesound API
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

    // Preview button logic
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

    // Assign sample to Drum Pad logic
    const assignBtn = card.querySelector('.load-pad-btn');
    assignBtn.addEventListener('click', () => {
      const targetPadKey = prompt('Enter the pad key to assign this sample to (e.g., Q, W, E, R, A, S, D, F):');
      if (!targetPadKey) return;

      const keyUpper = targetPadKey.trim().toUpperCase();
      const targetPad = document.querySelector(`.pad-btn[data-key="${keyUpper}"], .drum-pad[data-key="${keyUpper}"]`);

      if (targetPad) {
        // Store the Freesound direct audio URL onto the drum pad
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
 * 6. INDIVIDUAL USER PROFILE LOGIC & PHOTO CANVAS EDITOR
 * ---------------------------------------------------- */
let currentProfileAudio = null;
let originalImage = null;
let editorZoom = 1.0;
let editorFilterIndex = 0;
const filterNames = ['Normal', 'Grayscale', 'Sepia', 'Vibrant Warm'];

function initProfile() {
  initProfileAvatar();
  initProfileHeading();
  initProfileMusicSearch();
  initProfileLocation();
  initPhotoEditor();
}

// ==========================================
// PROFILE CAMERA & PERSISTENCE MANAGEMENT
// ==========================================

const cameraModal = document.getElementById('cameraModal');
const cameraVideo = document.getElementById('cameraVideo');
const takePhotoBtn = document.getElementById('takePhotoBtn');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const captureFrameBtn = document.getElementById('captureFrameBtn');

const profileAvatarImage = document.getElementById('profileAvatarImage');
const profileAvatarPlaceholder = document.getElementById('profileAvatarPlaceholder');

let currentStream = null;

// 1. OPEN CAMERA STREAM
if (takePhotoBtn) {
  takePhotoBtn.addEventListener('click', async () => {
    try {
      currentStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      cameraVideo.srcObject = currentStream;
      cameraModal.classList.remove('hidden');
      cameraModal.setAttribute('aria-hidden', 'false');
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Unable to access camera. Please check your browser permissions.');
    }
  });
}

// 2. CLOSE CAMERA STREAM
function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  if (cameraVideo) cameraVideo.srcObject = null;
  if (cameraModal) {
    cameraModal.classList.add('hidden');
    cameraModal.setAttribute('aria-hidden', 'true');
  }
}

if (closeCameraBtn) {
  closeCameraBtn.addEventListener('click', stopCamera);
}

// 3. CAPTURE SNAPSHOT & SAVE PROFILE PHOTO
if (captureFrameBtn) {
  captureFrameBtn.addEventListener('click', async () => {
    if (!cameraVideo || !cameraVideo.videoWidth) return;

    // Draw frame to canvas
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/png');

    // Update DOM display immediately
    updateAvatarUI(imageDataUrl);

    // Stop camera stream
    stopCamera();

    // Persist photo for user session
    await saveUserProfilePhoto(imageDataUrl);
  });
}

// 4. UPDATE AVATAR UI
function updateAvatarUI(photoUrl) {
  if (profileAvatarImage) {
    profileAvatarImage.src = photoUrl;
    profileAvatarImage.hidden = false;
  }
  if (profileAvatarPlaceholder) {
    profileAvatarPlaceholder.hidden = true;
  }
}

// 5. SAVE USER PROFILE PHOTO (Supabase + LocalStorage)
async function saveUserProfilePhoto(photoDataUrl) {
  // Get active session / user
  const currentUser = supabase.auth.user ? supabase.auth.user() : null; // Adjust according to Supabase v2 client setup
  const userKey = currentUser ? currentUser.id : 'guest_user';

  // Save to localStorage as immediate offline cache
  localStorage.setItem(`groovedna_avatar_${userKey}`, photoDataUrl);

  // If user is authenticated with Supabase, persist to Database
  if (currentUser) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ 
          id: currentUser.id, 
          avatar_url: photoDataUrl,
          updated_at: new Date() 
        });

      if (error) console.error('Supabase profile save error:', error);
    } catch (err) {
      console.error('Failed to sync photo to Supabase:', err);
    }
  }
}

// 6. RESTORE PROFILE PHOTO ON LOGIN / PAGE LOAD
async function loadUserProfilePhoto() {
  const currentUser = supabase.auth.user ? supabase.auth.user() : null;
  const userKey = currentUser ? currentUser.id : 'guest_user';

  // Check localStorage first for instant rendering
  const cachedAvatar = localStorage.getItem(`groovedna_avatar_${userKey}`);
  if (cachedAvatar) {
    updateAvatarUI(cachedAvatar);
  }

  // Fetch latest profile avatar from Supabase database if logged in
  if (currentUser) {
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', currentUser.id)
      .single();

    if (data && data.avatar_url) {
      updateAvatarUI(data.avatar_url);
      localStorage.setItem(`groovedna_avatar_${userKey}`, data.avatar_url);
    }
  }
}

// Auto-load saved avatar on initialization
document.addEventListener('DOMContentLoaded', () => {
  loadUserProfilePhoto();
});

/**
 * Canvas Image Editing Logic (Filters, Zoom, Center Crop)
 */
function initPhotoEditor() {
  const photoEditModal = document.getElementById('photo-edit-modal');
  const closePhotoEditBtn = document.getElementById('closePhotoEditBtn');
  const editColorFilter = document.getElementById('editColorFilter');
  const editZoom = document.getElementById('editZoom');
  const filterValText = document.getElementById('filterVal');
  const zoomValText = document.getElementById('zoomVal');
  const cropSquareBtn = document.getElementById('cropSquareBtn');
  const resetEditBtn = document.getElementById('resetEditBtn');
  const saveEditedPhotoBtn = document.getElementById('saveEditedPhotoBtn');

  if (closePhotoEditBtn && photoEditModal) {
    closePhotoEditBtn.addEventListener('click', () => {
      photoEditModal.style.display = 'none';
    });
  }

  if (editColorFilter) {
    editColorFilter.addEventListener('input', (e) => {
      editorFilterIndex = parseInt(e.target.value, 10);
      if (filterValText) filterValText.textContent = filterNames[editorFilterIndex] || 'Normal';
      renderPhotoCanvas();
    });
  }

  if (editZoom) {
    editZoom.addEventListener('input', (e) => {
      editorZoom = parseFloat(e.target.value);
      if (zoomValText) zoomValText.textContent = `${editorZoom.toFixed(1)}x`;
      renderPhotoCanvas();
    });
  }

  if (resetEditBtn) {
    resetEditBtn.addEventListener('click', () => {
      resetEditorState();
      renderPhotoCanvas();
    });
  }

  if (cropSquareBtn) {
    cropSquareBtn.addEventListener('click', () => {
      cropCenterSquare();
    });
  }

  /**
 * Persists user avatar to local storage and Supabase profiles table
 */
async function saveUserAvatarData(imageDataUrl) {
  let userId = 'guest_user';

  if (supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
      userId = session.user.id;

      // Sync avatar to Supabase profile table
      try {
        await supabaseClient
          .from('profiles')
          .upsert({ id: userId, avatar_url: imageDataUrl, updated_at: new Date() });
      } catch (err) {
        console.error('Failed to sync avatar to Supabase:', err);
      }
    }
  }

  // Cache in browser storage using the user ID
  localStorage.setItem(`groovedna_avatar_${userId}`, imageDataUrl);
}

/**
 * Loads user avatar from local storage or Supabase profile table on login
 */
async function loadSavedUserAvatar() {
  let userId = 'guest_user';

  if (supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
      userId = session.user.id;

      // Check Supabase database record
      const { data } = await supabaseClient
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (data && data.avatar_url) {
        applyAvatarToUI(data.avatar_url);
        localStorage.setItem(`groovedna_avatar_${userId}`, data.avatar_url);
        return;
      }
    }
  }

  // Fallback to local storage cache
  const cachedAvatar = localStorage.getItem(`groovedna_avatar_${userId}`);
  if (cachedAvatar) {
    applyAvatarToUI(cachedAvatar);
  }
}

function applyAvatarToUI(photoUrl) {
  const avatarImg = document.getElementById('profileAvatarImage');
  const avatarPlaceholder = document.getElementById('profileAvatarPlaceholder');
  if (avatarImg) {
    avatarImg.src = photoUrl;
    avatarImg.hidden = false;
  }
  if (avatarPlaceholder) {
    avatarPlaceholder.hidden = true;
  }
}

function resetEditorState() {
  editorZoom = 1.0;
  editorFilterIndex = 0;
  
  const editZoom = document.getElementById('editZoom');
  const editColorFilter = document.getElementById('editColorFilter');
  const filterValText = document.getElementById('filterVal');
  const zoomValText = document.getElementById('zoomVal');

  if (editZoom) editZoom.value = '1.0';
  if (editColorFilter) editColorFilter.value = '0';
  if (filterValText) filterValText.textContent = 'Normal';
  if (zoomValText) zoomValText.textContent = '1.0x';
}

function openPhotoEditor() {
  const photoEditModal = document.getElementById('photo-edit-modal');
  if (photoEditModal) {
    photoEditModal.style.display = 'flex';
    renderPhotoCanvas();
  }
}

function renderPhotoCanvas() {
  const canvas = document.getElementById('photoEditCanvas');
  if (!canvas || !originalImage) return;

  const ctx = canvas.getContext('2d');
  canvas.width = originalImage.width;
  canvas.height = originalImage.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  switch (editorFilterIndex) {
    case 1:
      ctx.filter = 'grayscale(100%)';
      break;
    case 2:
      ctx.filter = 'sepia(80%)';
      break;
    case 3:
      ctx.filter = 'saturate(180%) contrast(110%)';
      break;
    default:
      ctx.filter = 'none';
      break;
  }

  const zoomedWidth = canvas.width * editorZoom;
  const zoomedHeight = canvas.height * editorZoom;
  const offsetX = (canvas.width - zoomedWidth) / 2;
  const offsetY = (canvas.height - zoomedHeight) / 2;

  ctx.drawImage(originalImage, offsetX, offsetY, zoomedWidth, zoomedHeight);
}

function cropCenterSquare() {
  const canvas = document.getElementById('photoEditCanvas');
  if (!canvas) return;

  const side = Math.min(canvas.width, canvas.height);
  const startX = (canvas.width - side) / 2;
  const startY = (canvas.height - side) / 2;

  const ctx = canvas.getContext('2d');
  const squareData = ctx.getImageData(startX, startY, side, side);

  canvas.width = side;
  canvas.height = side;
  ctx.putImageData(squareData, 0, 0);

  const croppedImg = new Image();
  croppedImg.onload = () => {
    originalImage = croppedImg;
    resetEditorState();
  };
  croppedImg.src = canvas.toDataURL('image/png');
}

/**
 * Live updates for Profile Heading/Bio
 */
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

/**
 * Search and load Profile Anthem using Supabase Storage ('tracks' bucket)
 */
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

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
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

/**
 * Location display and editing toggle
 */
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
 * 7. SINGLE PAGE APPLICATION (SPA) ROUTER & STATE MANAGEMENT
 * ========================================================================== */

function navigateToSection(targetSectionId) {
  const sections = document.querySelectorAll('.page-section');
  const navLinks = document.querySelectorAll('.nav-link');

  if (!sections.length) return;

  sections.forEach((section) => {
    section.style.display = 'none';
    section.classList.remove('active');
  });

  const activeSection = document.getElementById(targetSectionId);
  if (activeSection) {
    activeSection.style.display = 'block';
    activeSection.classList.add('active');
  }

  navLinks.forEach((link) => {
    const route = link.getAttribute('data-target');
    if (route === targetSectionId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const routeName = targetSectionId.replace('-section', '');
  window.history.pushState({ sectionId: targetSectionId }, '', `#${routeName}`);
}

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
  if (typeof supabaseClient === 'undefined' || !supabaseClient) {
    console.warn('Supabase client not initialized.');
    return [];
  }

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

async function fetchUserPlaylists() {
  if (!supabaseClient) return [];

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return [];

  try {
    const { data, error } = await supabaseClient
      .from('playlists')
      .select('*, playlist_tracks(track_id)')
      .eq('user_id', session.user.id);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching user playlists:', err.message);
    return [];
  }
}

async function createNewPlaylist(name) {
  if (!supabaseClient) return null;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    alert('Please log in to create a playlist.');
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from('playlists')
      .insert([{ name: name, user_id: session.user.id }])
      .select();

    if (error) throw error;
    return data[0];
  } catch (err) {
    console.error('Error creating playlist:', err.message);
    return null;
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
