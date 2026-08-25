/* =========================================================
   GROOVEDNA — MAIN JAVASCRIPT
   Matches the GrooveDNA HTML/CSS structure
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* =========================================================
     HELPERS
     ========================================================= */

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

  function showToast(message) {
    let toast = $(".toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.grooveToastTimer);

    window.grooveToastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }


  /* =========================================================
     MOBILE NAVIGATION
     ========================================================= */

  const menuToggle = $(".menu-toggle");
  const nav = $("nav");

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      nav.classList.toggle("open");

      const isOpen = nav.classList.contains("open");

      menuToggle.setAttribute("aria-expanded", isOpen);
      menuToggle.textContent = isOpen ? "×" : "☰";
    });

    $$("nav a").forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");

        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.textContent = "☰";
      });
    });
  }


  /* =========================================================
     SMOOTH SCROLLING
     ========================================================= */

  $$('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {

      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") return;

      const target = $(targetId);

      if (!target) return;

      event.preventDefault();

      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });


  /* =========================================================
     SEARCH
     ========================================================= */

  const searchInput = $(".search-box input");
  const sampleCards = $$(".sample-card");
  const resultCount = $(".result-count");

  function updateResultCount(count) {
    if (!resultCount) return;

    resultCount.textContent =
      `${count} ${count === 1 ? "result" : "results"}`;
  }

  function performSearch() {

    if (!searchInput) return;

    const query = searchInput.value
      .toLowerCase()
      .trim();

    let visibleCount = 0;

    sampleCards.forEach(card => {

      const text = card.textContent.toLowerCase();

      const matches =
        query === "" ||
        text.includes(query);

      card.style.display = matches ? "" : "none";

      if (matches) visibleCount++;
    });

    updateResultCount(visibleCount);
  }

  if (searchInput) {

    searchInput.addEventListener(
      "input",
      performSearch
    );

    searchInput.addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          performSearch();
          showToast(
            `Searching GrooveDNA for "${searchInput.value}"`
          );
        }
      }
    );
  }


  /* =========================================================
     GENRE FILTERS
     ========================================================= */

  const filters = $$(".filter");

  filters.forEach(filter => {

    filter.addEventListener("click", () => {

      filters.forEach(item =>
        item.classList.remove("active")
      );

      filter.classList.add("active");

      const genre =
        filter.dataset.genre ||
        filter.textContent.trim();

      let visibleCount = 0;

      sampleCards.forEach(card => {

        if (
          genre === "All" ||
          genre === "All Samples" ||
          card.dataset.genre === genre
        ) {
          card.style.display = "";
          visibleCount++;
        } else {
          card.style.display = "none";
        }
      });

      updateResultCount(visibleCount);

      showToast(
        genre === "All" || genre === "All Samples"
          ? "Showing all samples"
          : `Showing ${genre} samples`
      );
    });
  });


  /* =========================================================
     SAMPLE CARD BUTTONS
     ========================================================= */

  $$(".sample-actions button").forEach(button => {

    button.addEventListener("click", event => {

      event.stopPropagation();

      const card = button.closest(".sample-card");

      if (!card) return;

      const title =
        $("h3", card)?.textContent ||
        "Sample";

      const action =
        button.textContent.trim().toLowerCase();

      if (
        action.includes("play") ||
        action.includes("listen")
      ) {
        startTrack(title);
      }

      else if (
        action.includes("save") ||
        action.includes("add")
      ) {
        showToast(`${title} added to your library`);
      }

      else if (
        action.includes("download")
      ) {
        showToast(`Preparing ${title}...`);
      }

      else {
        showToast(`${title} selected`);
      }
    });
  });


  /* =========================================================
     QUICK ACTION BUTTONS
     ========================================================= */

  $$(".quick-card").forEach(card => {

    card.addEventListener("click", () => {

      const title =
        $("strong", card)?.textContent ||
        card.textContent.trim();

      showToast(title);
    });
  });


  /* =========================================================
     AUDIO PLAYER
     ========================================================= */

  let isPlaying = false;
  let currentTrack = {
    title: "No track selected",
    artist: "GrooveDNA"
  };

  let currentTime = 0;
  let duration = 180;
  let playerTimer = null;

  const player = $(".player");
  const playerPlay = $(".player-play");
  const playerTrackTitle =
    $(".player-track strong");
  const playerTrackArtist =
    $(".player-track span");
  const playerProgress =
    $(".progress i");

  const playerTime =
    $(".player-progress span");

  function formatTime(seconds) {

    seconds = Math.max(0, Math.floor(seconds));

    const minutes =
      Math.floor(seconds / 60);

    const secs =
      String(seconds % 60).padStart(2, "0");

    return `${minutes}:${secs}`;
  }

  function updatePlayer() {

    if (playerTrackTitle) {
      playerTrackTitle.textContent =
        currentTrack.title;
    }

    if (playerTrackArtist) {
      playerTrackArtist.textContent =
        currentTrack.artist;
    }

    if (playerProgress) {

      const percentage =
        (currentTime / duration) * 100;

      playerProgress.style.width =
        `${Math.min(100, percentage)}%`;
    }

    if (playerTime) {
      playerTime.textContent =
        `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }

    if (playerPlay) {
      playerPlay.textContent =
        isPlaying ? "❚❚" : "▶";
    }
  }

  function stopPlayerTimer() {

    if (playerTimer) {
      clearInterval(playerTimer);
      playerTimer = null;
    }
  }

  function startPlayerTimer() {

    stopPlayerTimer();

    playerTimer = setInterval(() => {

      if (!isPlaying) return;

      currentTime += 1;

      if (currentTime >= duration) {
        currentTime = 0;
        isPlaying = false;
        stopPlayerTimer();
      }

      updatePlayer();

    }, 1000);
  }

  function startTrack(title, artist = "GrooveDNA Sample") {

    currentTrack = {
      title,
      artist
    };

    currentTime = 0;
    duration = 180;
    isPlaying = true;

    updatePlayer();
    startPlayerTimer();

    showToast(`Playing ${title}`);
  }

  window.startTrack = startTrack;

  if (playerPlay) {

    playerPlay.addEventListener("click", () => {

      if (!currentTrack.title ||
          currentTrack.title === "No track selected") {

        showToast("Choose a track first");
        return;
      }

      isPlaying = !isPlaying;

      if (isPlaying) {
        startPlayerTimer();
      } else {
        stopPlayerTimer();
      }

      updatePlayer();
    });
  }


  /* =========================================================
     PLAYER PREVIOUS / NEXT
     ========================================================= */

  const playerButtons =
    player
      ? $$(".player-controls button", player)
      : [];

  if (playerButtons.length >= 3) {

    const previousButton =
      playerButtons[0];

    const nextButton =
      playerButtons[playerButtons.length - 1];

    previousButton.addEventListener(
      "click",
      () => {
        currentTime = 0;
        updatePlayer();
        showToast("Previous track");
      }
    );

    nextButton.addEventListener(
      "click",
      () => {
        currentTime = 0;
        updatePlayer();
        showToast("Next track");
      }
    );
  }


  /* =========================================================
     PLAYER PROGRESS CLICK
     ========================================================= */

  const progressBar = $(".progress");

  if (progressBar) {

    progressBar.addEventListener(
      "click",
      event => {

        const rect =
          progressBar.getBoundingClientRect();

        const position =
          (event.clientX - rect.left) /
          rect.width;

        currentTime =
          Math.floor(duration * position);

        updatePlayer();
      }
    );
  }


  /* =========================================================
     SAMPLE / PLAY BUTTONS
     ========================================================= */

  $$(".play-btn").forEach(button => {

    button.addEventListener("click", () => {

      const card =
        button.closest(".console-card") ||
        button.closest(".sample-card");

      const title =
        $("h3", card)?.textContent ||
        "GrooveDNA Track";

      startTrack(title);
    });
  });


  $$(".mini-play").forEach(button => {

    button.addEventListener("click", event => {

      event.stopPropagation();

      const card =
        button.closest(".post-card");

      const title =
        $("strong", card)?.textContent ||
        "Community Track";

      startTrack(title, "GrooveDNA Community");
    });
  });


  /* =========================================================
     NOTIFICATION DRAWER
     ========================================================= */

  const drawer = $(".drawer");
  const drawerBackdrop = $(".drawer-backdrop");
  const closeDrawer = $(".close-drawer");

  function openDrawer() {

    if (!drawer) return;

    drawer.classList.add("open");

    if (drawerBackdrop) {
      drawerBackdrop.classList.add("open");
    }

    document.body.style.overflow = "hidden";
  }

  function closeDrawerPanel() {

    if (!drawer) return;

    drawer.classList.remove("open");

    if (drawerBackdrop) {
      drawerBackdrop.classList.remove("open");
    }

    document.body.style.overflow = "";
  }

  if (closeDrawer) {
    closeDrawer.addEventListener(
      "click",
      closeDrawerPanel
    );
  }

  if (drawerBackdrop) {
    drawerBackdrop.addEventListener(
      "click",
      closeDrawerPanel
    );
  }

  const iconButtons = $$(".icon-btn");

  iconButtons.forEach(button => {

    button.addEventListener("click", () => {

      if (
        button.classList.contains("notification-btn") ||
        button.dataset.action === "notifications" ||
        button.querySelector(".badge")
      ) {
        openDrawer();
      }
    });
  });


  /* =========================================================
     NOTIFICATION ITEMS
     ========================================================= */

  $$(".notification-item").forEach(item => {

    item.addEventListener("click", () => {

      item.classList.remove("unread");

      const badge = $(".badge");

      if (badge) {

        let count =
          parseInt(badge.textContent, 10) || 0;

        count--;

        if (count <= 0) {
          badge.remove();
        } else {
          badge.textContent = count;
        }
      }
    });
  });


  /* =========================================================
     MODALS
     ========================================================= */

  const modalBackdrop = $(".modal-backdrop");
  const modalClose = $(".modal-close");

  function openModal() {

    if (!modalBackdrop) return;

    modalBackdrop.classList.add("open");

    document.body.style.overflow = "hidden";
  }

  function closeModal() {

    if (!modalBackdrop) return;

    modalBackdrop.classList.remove("open");

    document.body.style.overflow = "";
  }

  if (modalClose) {
    modalClose.addEventListener(
      "click",
      closeModal
    );
  }

  if (modalBackdrop) {

    modalBackdrop.addEventListener(
      "click",
      event => {

        if (event.target === modalBackdrop) {
          closeModal();
        }
      }
    );
  }


  /* =========================================================
     ESCAPE KEY
     ========================================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (event.key !== "Escape") return;

      closeDrawerPanel();
      closeModal();

      if (nav) {
        nav.classList.remove("open");
      }
    }
  );


  /* =========================================================
     LIBRARY TABS
     ========================================================= */

  $$(".library-tab").forEach(tab => {

    tab.addEventListener("click", () => {

      $$(".library-tab").forEach(item =>
        item.classList.remove("active")
      );

      tab.classList.add("active");

      const tabName =
        tab.textContent.trim();

      showToast(`${tabName} selected`);
    });
  });


  /* =========================================================
     MOOD CARDS
     ========================================================= */

  $$(".mood-card").forEach(card => {

    card.addEventListener("click", () => {

      const mood =
        $("strong", card)?.textContent ||
        "Mood";

      showToast(
        `Finding ${mood.toLowerCase()} sounds...`
      );
    });
  });


  /* =========================================================
     ARTIST CARDS
     ========================================================= */

  $$(".artist-card").forEach(card => {

    card.style.cursor = "pointer";

    card.addEventListener("click", () => {

      const artist =
        $("strong", card)?.textContent ||
        "Artist";

      showToast(`Opening ${artist}`);
    });
  });


  /* =========================================================
     DNA TAGS
     ========================================================= */

  $$(".dna-tags span").forEach(tag => {

    tag.addEventListener("click", () => {

      showToast(
        `Exploring ${tag.textContent.trim()}`
      );
    });

    tag.style.cursor = "pointer";
  });


  /* =========================================================
     DNA METERS — ANIMATION
     ========================================================= */

  const meters = $$(".meter i");

  if ("IntersectionObserver" in window) {

    const meterObserver =
      new IntersectionObserver(
        entries => {

          entries.forEach(entry => {

            if (!entry.isIntersecting) return;

            const meter =
              entry.target;

            const finalWidth =
              meter.dataset.width ||
              meter.style.width ||
              "50%";

            meter.style.width = "0";

            requestAnimationFrame(() => {
              meter.style.transition =
                "width 1s ease";

              meter.style.width =
                finalWidth;
            });

            meterObserver.unobserve(meter);
          });

        },
        { threshold: 0.3 }
      );

    meters.forEach(meter =>
      meterObserver.observe(meter)
    );
  }


  /* =========================================================
     BEAT LAB
     ========================================================= */

  const beatLab = $(".beatlab");

  if (beatLab) {

    const playLarge =
      $(".play-large", beatLab);

    const bpmInput =
      $('input[type="range"]', beatLab);

    const toggleInputs =
      $$(".toggle-label input", beatLab);

    let labPlaying = false;
    let bpm = bpmInput
      ? parseInt(bpmInput.value, 10) || 120
      : 120;

    if (playLarge) {

      playLarge.addEventListener(
        "click",
        () => {

          labPlaying = !labPlaying;

          playLarge.textContent =
            labPlaying ? "❚❚" : "▶";

          if (labPlaying) {
            showToast(
              `Beat Lab playing at ${bpm} BPM`
            );
          } else {
            showToast("Beat Lab paused");
          }
        }
      );
    }

    if (bpmInput) {

      bpmInput.addEventListener(
        "input",
        () => {

          bpm =
            parseInt(
              bpmInput.value,
              10
            ) || 120;

          const bpmDisplay =
            beatLab.querySelector(
              "[data-bpm]"
            );

          if (bpmDisplay) {
            bpmDisplay.textContent =
              `${bpm} BPM`;
          }
        }
      );
    }

    toggleInputs.forEach(toggle => {

      toggle.addEventListener(
        "change",
        () => {

          const label =
            toggle.closest("label");

          const name =
            label?.textContent.trim() ||
            "Track";

          showToast(
            `${name} ${toggle.checked ? "enabled" : "disabled"}`
          );
        }
      );
    });
  }


  /* =========================================================
     SETTINGS
     ========================================================= */

  $$(".settings-tab").forEach(tab => {

    tab.addEventListener("click", () => {

      $$(".settings-tab").forEach(item =>
        item.classList.remove("active")
      );

      tab.classList.add("active");

      const setting =
        tab.textContent.trim();

      showToast(`${setting} settings`);
    });
  });


  /* =========================================================
     SETTINGS SWITCHES
     ========================================================= */

  $$(".switch input").forEach(input => {

    input.addEventListener("change", () => {

      const row =
        input.closest(".setting-row");

      const title =
        $("strong", row)?.textContent ||
        "Setting";

      showToast(
        `${title} ${input.checked ? "enabled" : "disabled"}`
      );
    });
  });


  /* =========================================================
     COMMUNITY POST ACTIONS
     ========================================================= */

  $$(".post-actions button").forEach(button => {

    button.addEventListener("click", () => {

      const action =
        button.textContent.trim();

      if (
        action.includes("♥") ||
        action.includes("Like")
      ) {
        button.classList.toggle("liked");

        showToast(
          button.classList.contains("liked")
            ? "Liked"
            : "Like removed"
        );
      }

      else if (
        action.includes("Comment")
      ) {
        showToast("Comments opened");
      }

      else if (
        action.includes("Share")
      ) {
        shareContent();
      }

      else {
        showToast(action);
      }
    });
  });


  /* =========================================================
     SHARE
     ========================================================= */

  function shareContent() {

    const shareData = {
      title: "GrooveDNA",
      text: "Check out this track on GrooveDNA.",
      url: window.location.href
    };

    if (
      navigator.share &&
      typeof navigator.share === "function"
    ) {

      navigator.share(shareData)
        .catch(() => {});

    } else if (
      navigator.clipboard
    ) {

      navigator.clipboard
        .writeText(window.location.href)
        .then(() => {
          showToast("Link copied to clipboard");
        })
        .catch(() => {
          showToast("Share link ready");
        });

    } else {
      showToast("Share link ready");
    }
  }


  /* =========================================================
     CHALLENGE BUTTONS
     ========================================================= */

  $$(".challenge-card .btn").forEach(button => {

    button.addEventListener("click", () => {

      showToast(
        "You're joining the GrooveDNA challenge!"
      );
    });
  });


  /* =========================================================
     FOLLOW / ACTION BUTTONS
     ========================================================= */

  $$(".btn").forEach(button => {

    if (
      button.dataset.bound === "true"
    ) return;

    button.addEventListener("click", () => {

      const text =
        button.textContent.trim();

      if (
        text.toLowerCase().includes("follow")
      ) {

        const following =
          button.classList.toggle("following");

        button.textContent =
          following
            ? "Following"
            : "Follow";

        showToast(
          following
            ? "Following"
            : "Unfollowed"
        );
      }
    });
  });


  /* =========================================================
     KEYBOARD SHORTCUTS
     ========================================================= */

  document.addEventListener(
    "keydown",
    event => {

      const tag =
        document.activeElement?.tagName;

      const typing =
        tag === "INPUT" ||
        tag === "TEXTAREA";

      if (typing) return;

      // Space = Play / Pause
      if (event.code === "Space") {

        event.preventDefault();

        if (playerPlay) {
          playerPlay.click();
        }
      }

      // "/" = Search
      if (event.key === "/") {

        event.preventDefault();

        if (searchInput) {
          searchInput.focus();
        }
      }
    }
  );


  /* =========================================================
     ACTIVE NAVIGATION ON SCROLL
     ========================================================= */

  const sections =
    $$("section[id]");

  const navLinks =
    $$('nav a[href^="#"]');

  if (
    sections.length &&
    navLinks.length &&
    "IntersectionObserver" in window
  ) {

    const sectionObserver =
      new IntersectionObserver(
        entries => {

          entries.forEach(entry => {

            if (!entry.isIntersecting)
              return;

            const id =
              entry.target.getAttribute("id");

            navLinks.forEach(link => {

              link.classList.toggle(
                "active",
                link.getAttribute("href") ===
                `#${id}`
              );
            });

          });

        },
        {
          threshold: 0.25,
          rootMargin: "-20% 0px -60% 0px"
        }
      );

    sections.forEach(section =>
      sectionObserver.observe(section)
    );
  }


  /* =========================================================
     RECORD / HERO ANIMATION CONTROL
     ========================================================= */

  const record = $(".record");

  if (record) {

    record.addEventListener(
      "mouseenter",
      () => {
        record.style.animationPlayState =
          "paused";
      }
    );

    record.addEventListener(
      "mouseleave",
      () => {
        record.style.animationPlayState =
          "running";
      }
    );
  }


  /* =========================================================
     INITIALIZE
     ========================================================= */

  updateResultCount(sampleCards.length);
  updatePlayer();

  console.log(
    "%cGrooveDNA loaded successfully.",
    "font-weight:bold;font-size:16px"
  );

});
