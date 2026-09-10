/* GrooveDNA Master Stylesheet */
:root {
  --bg-dark: #0f1117;
  --bg-card: #181b24;
  --bg-card-hover: #212532;
  --accent-purple: #7c3aed;
  --accent-purple-hover: #6d28d9;
  --accent-pink: #ec4899;
  --accent-cyan: #06b6d4;
  --text-main: #f3f4f6;
  --text-muted: #9ca3af;
  --border-color: #2e3440;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg-dark);
  color: var(--text-main);
  line-height: 1.6;
  padding-top: 70px;
}

/* Header & Nav */
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 70px;
  background-color: rgba(15, 17, 23, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
  z-index: 1000;
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.logo {
  text-decoration: none;
  color: var(--text-main);
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-text strong {
  color: var(--accent-pink);
}

.nav-links {
  display: flex;
  gap: 24px;
}

.nav-link {
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-link:hover, .nav-link.active {
  color: var(--accent-cyan);
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-profile-menu {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-email {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.hidden {
  display: none !important;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.btn.primary {
  background-color: var(--accent-purple);
  color: #fff;
}

.btn.primary:hover {
  background-color: var(--accent-purple-hover);
}

.btn.secondary {
  background-color: var(--bg-card-hover);
  color: var(--text-main);
  border-color: var(--border-color);
}

.btn.outline {
  background: transparent;
  border-color: var(--accent-purple);
  color: var(--accent-purple);
}

.btn.outline:hover {
  background: var(--accent-purple);
  color: #fff;
}

.btn.small {
  padding: 4px 10px;
  font-size: 0.8rem;
}

.btn.full-width {
  width: 100%;
}

/* Layout */
.main-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.app-section {
  margin-bottom: 60px;
}

.section-header {
  margin-bottom: 24px;
}

.section-header h1, .section-header h2 {
  font-size: 2rem;
  font-weight: 700;
}

.section-subtitle {
  color: var(--text-muted);
}

.card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 24px;
}

/* Studio Section */
.studio-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.pad-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.pad-btn {
  aspect-ratio: 1;
  background-color: var(--bg-card-hover);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-main);
  font-weight: bold;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.1s ease;
}

.pad-btn span {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: normal;
}

.pad-btn:active, .pad-btn.active {
  background-color: var(--accent-pink);
  border-color: #fff;
  transform: scale(0.96);
  box-shadow: 0 0 15px rgba(236, 72, 153, 0.6);
}

.fader-group {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fader-group label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.studio-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

/* Feed Section */
.feed-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feed-item {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent-purple);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.track-date {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.audio-player-mock {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-card-hover);
  padding: 12px;
  border-radius: var(--radius-sm);
  margin-top: 10px;
}

.btn-play {
  background: var(--accent-cyan);
  border: none;
  color: #000;
  font-weight: bold;
  padding: 6px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.waveform-bar {
  flex-grow: 1;
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
}

.feed-footer {
  display: flex;
  gap: 16px;
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
}

.action-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.9rem;
}

/* Stream Layout */
.stream-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.stream-viewport {
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000;
}

.live-badge {
  background: #ef4444;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  display: inline-block;
  margin-bottom: 8px;
}

.stream-chat {
  display: flex;
  flex-direction: column;
  height: 320px;
}

.chat-messages {
  flex-grow: 1;
  overflow-y: auto;
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-msg {
  font-size: 0.85rem;
  background: var(--bg-card-hover);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
}

.chat-input-row {
  display: flex;
  gap: 8px;
}

.chat-input-row input {
  flex-grow: 1;
  background: var(--bg-dark);
  border: 1px solid var(--border-color);
  padding: 8px;
  border-radius: var(--radius-sm);
  color: var(--text-main);
}

/* Gaming Grid */
.gaming-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.gaming-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.gaming-icon {
  font-size: 2.5rem;
}

/* AUTH MODAL STYLES & FIXES */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(5px);
  z-index: 2000;
  display: none;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

/* CSS Target pseudo-class trigger for Modal display */
.modal-backdrop:target {
  display: flex;
  opacity: 1;
  pointer-events: auto;
}

.auth-container {
  width: 100%;
  max-width: 420px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 32px;
  position: relative;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 20px;
  font-size: 1.8rem;
  color: var(--text-muted);
  text-decoration: none;
  line-height: 1;
}

.form-group {
  margin-top: 16px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.form-group input {
  width: 100%;
  padding: 10px 14px;
  background-color: var(--bg-dark);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-main);
  font-size: 0.95rem;
}

.form-group input:focus {
  outline: none;
  border-color: var(--accent-purple);
}

.auth-toggle-copy {
  margin-top: 16px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.auth-toggle {
  color: var(--accent-cyan);
  text-decoration: none;
  font-weight: 600;
}

.footer {
  text-align: center;
  padding: 30px;
  border-top: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.85rem;
}
