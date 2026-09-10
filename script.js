// GrooveDNA Application JavaScript
// Initialize Supabase Client
const SUPABASE_URL = 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabase = null;
if (window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Global Auth State
let currentAuthMode = 'signup'; // 'signup' or 'login'

document.addEventListener('DOMContentLoaded', () => {
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

      if (!supabase) {
        alert('Supabase client is not configured yet. Please update SUPABASE_URL and SUPABASE_ANON_KEY in app.js.');
        window.location.hash = ''; // Close modal
        return;
      }

      if (currentAuthMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          alert('Sign Up Error: ' + error.message);
        } else {
          alert('Account created! Please check your email for verification.');
          window.location.hash = '';
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
      if (supabase) {
        await supabase.auth.signOut();
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
    modalTitle.textContent = 'Create Account';
    modalSubtitle.textContent = 'Join GrooveDNA to save your tracks and collaborate.';
    submitBtn.textContent = 'Create Account';
    toggleText.textContent = 'Already have an account?';
    toggleBtn.textContent = 'Sign In';
  } else {
    modalTitle.textContent = 'Sign In';
    modalSubtitle.textContent = 'Welcome back! Enter your credentials to access your studio.';
    submitBtn.textContent = 'Sign In';
    toggleText.textContent = "Don't have an account?";
    toggleBtn.textContent = 'Create Account';
  }
}

async function checkUserSession() {
  const userMenu = document.getElementById('user-profile-menu');
  const btnSignUpNav = document.getElementById('btn-signup-nav');
  const btnSignInNav = document.getElementById('btn-signin-nav');
  const userEmailDisplay = document.getElementById('user-email-display');

  if (!supabase) return;

  const { data: { session } } = await supabase.auth.getSession();

  if (session && session.user) {
    userMenu.classList.remove('hidden');
    btnSignUpNav.classList.add('hidden');
    btnSignInNav.classList.add('hidden');
    userEmailDisplay.textContent = session.user.email;
  } else {
    userMenu.classList.add('hidden');
    btnSignUpNav.classList.remove('hidden');
    btnSignInNav.classList.remove('hidden');
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
