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
  initChat();
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
          alert('Account created! Please check your email for verification.');
          window.location.hash = '';
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

  if (btnSignOut) {
    btnSignOut.addEventListener('click', async () => {
      if (supabaseClient) {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) { 
        await supabaseClient.auth.signOut();
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

  window.addEventListener('keydown', (e) => {
    if (!e.key) return; //Guard clause to prevent undefined errors
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
 * 3. LIVE CHAT SIMULATION
 * ---------------------------------------------------- */
function initChat() {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;

      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg';
      msgDiv.innerHTML = `<strong>You:</strong> ${text}`;
      chatMessages.appendChild(msgDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      chatInput.value = '';
    });
  }
}
