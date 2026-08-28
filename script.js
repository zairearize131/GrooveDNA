/* =========================================================
   GROOVEDNA — SUPABASE + MUSICBRAINZ
   ========================================================= */

const SUPABASE_URL =
    "https://nzfzcnusmjboykledznh.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_qsskdrsPBxg1dECb1HY8Jg_x0rL7wR3";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


/* =========================================================
   MUSICBRAINZ
   ========================================================= */

const MUSICBRAINZ_API =
    "https://musicbrainz.org/ws/2";

const MUSICBRAINZ_HEADERS = {
    "Accept": "application/json"
};


/* ---------------------------------------------------------
   SEARCH MUSICBRAINZ
   --------------------------------------------------------- */

async function searchMusicBrainz(searchTerm) {

    if (!searchTerm || !searchTerm.trim()) {
        return [];
    }

    const query =
        encodeURIComponent(searchTerm.trim());

    const url =
        `${MUSICBRAINZ_API}/recording/?query=${query}&fmt=json&limit=10`;

    try {

        const response = await fetch(
            url,
            {
                method: "GET",
                headers: MUSICBRAINZ_HEADERS
            }
        );

        if (!response.ok) {
            throw new Error(
                `MusicBrainz error: ${response.status}`
            );
        }

        const data = await response.json();

        return data.recordings || [];

    } catch (error) {

        console.error(
            "MusicBrainz search failed:",
            error
        );

        return [];
    }
}


/* ---------------------------------------------------------
   SEARCH ARTISTS
   --------------------------------------------------------- */

async function searchMusicBrainzArtists(searchTerm) {

    if (!searchTerm || !searchTerm.trim()) {
        return [];
    }

    const query =
        encodeURIComponent(searchTerm.trim());

    const url =
        `${MUSICBRAINZ_API}/artist/?query=${query}&fmt=json&limit=10`;

    try {

        const response = await fetch(
            url,
            {
                method: "GET",
                headers: MUSICBRAINZ_HEADERS
            }
        );

        if (!response.ok) {
            throw new Error(
                `MusicBrainz error: ${response.status}`
            );
        }

        const data = await response.json();

        return data.artists || [];

    } catch (error) {

        console.error(
            "MusicBrainz artist search failed:",
            error
        );

        return [];
    }
}


/* =========================================================
   SUPABASE — LOAD TRACKS
   ========================================================= */

async function fetchTracksFromDatabase() {

    const {
        data: tracks,
        error
    } = await supabaseClient
        .from("tracks")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {

        console.error(
            "Error fetching tracks:",
            error
        );

        return [];
    }

    return tracks || [];
}


/* =========================================================
   SUPABASE — SAVE MUSICBRAINZ RESULT
   ========================================================= */

async function saveMusicBrainzTrack(recording) {

    if (!recording) {
        return null;
    }

    const artist =
        recording["artist-credit"]?.[0]?.name ||
        "Unknown Artist";

    const title =
        recording.title ||
        "Unknown Track";

    const musicbrainzId =
        recording.id || null;

    const trackData = {

        title: title,

        artist: artist,

        genre:
            recording.tags?.[0]?.name ||
            "Unknown",

        musicbrainz_id:
            musicbrainzId,

        created_at:
            new Date().toISOString()

    };

    const {
        data,
        error
    } = await supabaseClient
        .from("tracks")
        .insert([trackData])
        .select();

    if (error) {

        console.error(
            "Error saving MusicBrainz track:",
            error
        );

        return null;
    }

    return data?.[0] || null;
}


/* =========================================================
   RENDER DATABASE TRACKS
   ========================================================= */

async function loadDatabaseTracksUI() {

    const sampleContainer =
        document.querySelector(".sample-grid") ||
        document.querySelector("#sampleGrid");

    if (!sampleContainer) {
        return;
    }

    const tracks =
        await fetchTracksFromDatabase();

    if (!tracks.length) {
        return;
    }

    sampleContainer.innerHTML =
        tracks.map(track => {

            const title =
                escapeHTML(track.title || "Unknown Track");

            const artist =
                escapeHTML(track.artist || "Unknown Artist");

            const genre =
                escapeHTML(track.genre || "General");

            return `

                <article
                    class="sample-card"
                    data-genre="${genre}"
                >

                    <div class="sample-art">

                        ${
                            track.cover_art_url

                            ? `
                                <img
                                    src="${escapeAttribute(track.cover_art_url)}"
                                    alt="${title}"
                                >
                              `

                            : `
                                <div class="sample-icon">
                                    🎵
                                </div>
                              `
                        }

                        <span class="genre-tag">
                            ${genre}
                        </span>

                    </div>

                    <div class="sample-info">

                        <h3>
                            ${title}
                        </h3>

                        <p>
                            ${artist}

                            ${
                                track.bpm
                                ? ` • ${track.bpm} BPM`
                                : ""
                            }

                            ${
                                track.key_signature
                                ? ` • ${escapeHTML(track.key_signature)}`
                                : ""
                            }

                        </p>

                        <div class="sample-actions">

                            <button
                                class="btn primary play-btn"
                                onclick="startTrack(
                                    '${escapeJS(title)}',
                                    '${escapeJS(artist)}'
                                )"
                            >
                                Play
                            </button>

                            <button
                                class="btn secondary"
                                onclick="saveTrack('${escapeJS(title)}')"
                            >
                                Save
                            </button>

                        </div>

                    </div>

                </article>

            `;

        }).join("");
}


/* =========================================================
   SEARCH UI
   ========================================================= */

async function searchMusic(searchTerm) {

    const resultsContainer =
        document.querySelector("#musicResults");

    if (!resultsContainer) {
        console.warn(
            "Add an element with id='musicResults' to display search results."
        );
        return;
    }

    resultsContainer.innerHTML =
        "<p>Searching MusicBrainz...</p>";

    const results =
        await searchMusicBrainz(searchTerm);

    if (!results.length) {

        resultsContainer.innerHTML =
            "<p>No music found.</p>";

        return;
    }

    resultsContainer.innerHTML =
        results.map(recording => {

            const artist =
                recording["artist-credit"]?.[0]?.name ||
                "Unknown Artist";

            const title =
                recording.title ||
                "Unknown Track";

            return `

                <div class="music-result">

                    <h3>
                        ${escapeHTML(title)}
                    </h3>

                    <p>
                        ${escapeHTML(artist)}
                    </p>

                    <button
                        class="btn primary"
                        onclick='saveMusicBrainzResult(
                            ${JSON.stringify(recording)}
                        )'
                    >
                        Add to GrooveDNA
                    </button>

                </div>

            `;

        }).join("");
}


/* =========================================================
   ADD MUSICBRAINZ RESULT TO SUPABASE
   ========================================================= */

async function saveMusicBrainzResult(recording) {

    const saved =
        await saveMusicBrainzTrack(recording);

    if (saved) {

        alert(
            "Track added to your GrooveDNA library!"
        );

        await loadDatabaseTracksUI();

    } else {

        alert(
            "Could not save this track."
        );
    }
}


/* =========================================================
   SAVE BUTTON
   ========================================================= */

async function saveTrack(title) {

    console.log(
        "Saving track:",
        title
    );

    // You can connect this to a favorites table later.
}


/* =========================================================
   SECURITY / HTML HELPERS
   ========================================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}


function escapeJS(value) {

    return String(value)
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'")
        .replaceAll('"', '\\"')
        .replaceAll("\n", "\\n")
        .replaceAll("\r", "\\r");
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser(email, password) {

    const {
        data,
        error
    } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {

        console.error(
            "Login error:",
            error
        );

        alert(error.message);

        return false;
    }

    console.log(
        "Logged in:",
        data.user
    );

    return true;
}


/* =========================================================
   SIGN UP
   ========================================================= */

async function signupUser(email, password) {

    const {
        data,
        error
    } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    if (error) {

        console.error(
            "Signup error:",
            error
        );

        alert(error.message);

        return false;
    }

    console.log(
        "Account created:",
        data.user
    );

    return true;
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutUser() {

    const {
        error
    } = await supabaseClient.auth.signOut();

    if (error) {

        console.error(
            "Logout error:",
            error
        );

        return;
    }

    window.location.href =
        "index.html";
}


/* =========================================================
   AUTH FORM
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupAdvancedBeatLab();

        const authForm =
            document.querySelector("#authForm");

        if (authForm) {

            authForm.addEventListener(
                "submit",
                async (event) => {

                    event.preventDefault();

                    const email =
                        document.querySelector("#authEmail")
                        ?.value
                        ?.trim();

                    const password =
                        document.querySelector("#authPassword")
                        ?.value;

                    if (!email || !password) {

                        alert(
                            "Please enter your email and password."
                        );

                        return;
                    }

                    const success =
                        await loginUser(
                            email,
                            password
                        );

                    if (success) {

                        window.location.href =
                            "home.html";
                    }

                }
            );
        }


        /* Load Supabase tracks */

        if (
            document.querySelector("#sampleGrid") ||
            document.querySelector(".sample-grid")
        ) {

            loadDatabaseTracksUI();

        }

    }
);

function setupBeatLab() {
    const generateButton = document.querySelector("#generateBeat");
    const playButton = document.querySelector("#labPlay");
    const timeline = document.querySelector("#timeline");
    if (!generateButton || !timeline) return;

    const toolbar = document.querySelector(".lab-toolbar");
    const status = document.createElement("div");
    status.className = "editor-status";
    status.textContent = "Press Generate to open your sound editor.";
    toolbar?.after(status);

    const downloadButton = document.createElement("button");
    downloadButton.className = "btn export-btn";
    downloadButton.textContent = "↓ Export WAV";
    downloadButton.disabled = true;
    toolbar?.append(downloadButton);

    timeline.innerHTML = `
        <div class="timeline-ruler"><span>01</span><span>02</span><span>03</span><span>04</span><span>05</span><span>06</span><span>07</span><span>08</span></div>
        ${[
            ["DRUMS", "LOOP", "drum", "Deep house drums", "SFX/Drums/Deep house drums Loop - 126 BPM.mp3", 82],
            ["INSTRUMENT", "KEY", "bass", "Get Involved", "SFX/Instrumental/JAMES BROWN Get Involved instrumental.mp3", 68],
            ["ACAPELLA", "VOCAL", "melody", "Get Up Offa That Thing", "SFX/Instrumental/Get Up Offa That Thing (Isolated Vocal Only Acapella) by James Brown.mp3", 72],
            ["TEXTURE", "SFX", "sample", "Night Ripper OST", "SFX/Instrumental/Ill just walk Night Ripper OST (slowed).mp3", 45]
        ].map(([name, type, color, title, source, volume]) => `<div class="track"><span class="track-name">${name}<small>${type}</small></span><div class="track-lane"><div class="clip ${color}" data-source="${source}" data-title="${title}"><span>${title}</span><i></i></div></div><input class="track-volume" type="range" min="0" max="100" value="${volume}" aria-label="${name} volume"></div>`).join("")}
        <div class="empty-state">Click a colored clip to mute it. Adjust each lane before export.</div>`;

    const clips = [...timeline.querySelectorAll(".clip")];
    const players = clips.map((clip) => {
        const audio = new Audio(clip.dataset.source);
        audio.preload = "auto";
        audio.loop = true;
        return audio;
    });

    generateButton.addEventListener("click", () => {
        document.body.classList.add("editor-open");
        timeline.classList.add("is-ready");
        downloadButton.disabled = false;
        status.textContent = "Arrangement ready. Press play to audition your mix.";
    });

    playButton?.addEventListener("click", () => {
        if (!document.body.classList.contains("editor-open")) { generateButton.click(); return; }
        const shouldPlay = players.some((player) => player.paused);
        players.forEach((player, index) => {
            player.volume = Number(timeline.querySelectorAll(".track-volume")[index].value) / 100;
            if (shouldPlay && !clips[index].classList.contains("muted")) player.play().catch(() => {});
            else player.pause();
        });
        playButton.textContent = shouldPlay ? "Ⅱ" : "▶";
        status.textContent = shouldPlay ? "Playing generated arrangement." : "Playback paused.";
    });

    document.querySelector("#clearLab")?.addEventListener("click", () => {
        document.body.classList.remove("editor-open");
        timeline.classList.remove("is-ready");
        players.forEach((player) => { player.pause(); player.currentTime = 0; });
        downloadButton.disabled = true;
        status.textContent = "Press Generate to open your sound editor.";
        if (playButton) playButton.textContent = "▶";
    });

    document.querySelector("#saveBeat")?.addEventListener("click", () => {
        localStorage.setItem("grooveDNA-beatlab", JSON.stringify({ savedAt: Date.now() }));
        status.textContent = "Idea saved in this browser.";
    });

    clips.forEach((clip) => clip.addEventListener("click", () => clip.classList.toggle("muted")));
    downloadButton.addEventListener("click", async () => {
        downloadButton.disabled = true;
        status.textContent = "Rendering your mix...";
        try {
            const context = new OfflineAudioContext(2, 44100 * 16, 44100);
            for (let index = 0; index < players.length; index += 1) {
                if (clips[index].classList.contains("muted")) continue;
                const response = await fetch(players[index].src);
                const buffer = await context.decodeAudioData(await response.arrayBuffer());
                const source = context.createBufferSource();
                const gain = context.createGain();
                source.buffer = buffer; source.loop = true;
                gain.gain.value = Number(timeline.querySelectorAll(".track-volume")[index].value) / 100;
                source.connect(gain).connect(context.destination); source.start(0);
            }
            const blob = new Blob([audioBufferToWav(await context.startRendering())], { type: "audio/wav" });
            const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "grooveDNA-session.wav"; link.click(); URL.revokeObjectURL(link.href);
            status.textContent = "Export complete. Your WAV is ready.";
        } catch (error) {
            console.error("Beat export failed:", error);
            status.textContent = "Export needs the audio files to be served from a local web server.";
        } finally { downloadButton.disabled = false; }
    });
}

function audioBufferToWav(buffer) {
    const channels = buffer.numberOfChannels;
    const length = buffer.length * channels * 2 + 44;
    const view = new DataView(new ArrayBuffer(length));
    const write = (offset, value) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
    write(0, "RIFF"); view.setUint32(4, length - 8, true); write(8, "WAVE"); write(12, "fmt ");
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true); view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, length - 44, true);
    const channelData = Array.from({ length: channels }, (_, index) => buffer.getChannelData(index)); let offset = 44;
    for (let index = 0; index < buffer.length; index += 1) {
        for (let channel = 0; channel < channels; channel += 1) {
            const sample = Math.max(-1, Math.min(1, channelData[channel][index] || 0));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true); offset += 2;
        }
    }
    return view;
}

function setupAdvancedBeatLab() {
    const generateButton = document.querySelector("#generateBeat");
    const playButton = document.querySelector("#labPlay");
    const timeline = document.querySelector("#timeline");
    const toolbar = document.querySelector(".lab-toolbar");
    if (!generateButton || !playButton || !timeline || !toolbar) return;

    const catalog = {
        Drums: [
            ["Deep house drums", "SFX/Drums/Deep house drums Loop - 126 BPM.mp3"],
            ["Jazz funk drum loop", "SFX/Drums/Drum Loop - Jazz  Funk - 148 bpm - Backing Track - Play-along.mp3"],
            ["Electronic house dance", "SFX/Drums/ElectronicHouseDance Drum Loop 126 BPM.mp3"],
            ["Grunge drum track", "SFX/Drums/Grunge Drum Track  126 BPM.mp3"],
            ["Grunge drum track 7", "SFX/Drums/Grunge Drum Track 7 - 126 BPM.mp3"],
            ["Hip hop drum loop", "SFX/Drums/Hip Hop Drum Loop 148 BPM.mp3"],
            ["Post punk drum beat 7", "SFX/Drums/Post Punk Drum Beat #7 - 148 bpm.mp3"],
            ["Rock shuffle", "SFX/Drums/Rock Shuffle (Drum Loop 126 BPM).mp3"],
            ["Trap drum loop", "SFX/Drums/Trap Drum Loop 126 BPM.mp3"],
            ["Trap drum loop full", "SFX/Drums/trap drum loop bpm 148 (Full Drum Track).mp3"]
        ],
        Instrumental: [
            ["Get Involved", "SFX/Instrumental/JAMES BROWN Get Involved instrumental.mp3"],
            ["Get Up Offa That Thing", "SFX/Instrumental/Get Up Offa That Thing (Isolated Vocal Only Acapella) by James Brown.mp3"],
            ["Smooth Criminal", "SFX/Instrumental/Michael Jackson- Smooth Criminal Instrumental.mp3"],
            ["All Caps", "SFX/Instrumental/Madvillain - All Caps (Instrumental) ReProd. Nick T.mp3"],
            ["Night Ripper OST", "SFX/Instrumental/Ill just walk Night Ripper OST (slowed).mp3"],
            ["Night Time Is the Right Time", "SFX/Instrumental/Night Time is the Right Time - Ray Charles instrumental.mp3"],
            ["Heart's on Fire", "SFX/Instrumental/Rocky IV - Heart's on fire (Instrumental)  Up the mountain.mp3"],
            ["I Just Called to Say I Love You", "SFX/Instrumental/Stevie Wonder - I Just Called To Say I Love You Instrumental.mp3"],
            ["Spend the Night", "SFX/Instrumental/THE ISLEY BROTHERS - SPEND THE NIGHT(CE SOIR)ORIGINAL INSTRUMENTAL.mp3"],
            ["I Wanna Dance with Somebody", "SFX/Instrumental/Whitney Houston - I Wanna Dance With Somebody (Who Loves Me) (Instrumental).mp3"]
        ],
        Acapella: [],
        Piano: []
    };
    const colors = { Drums: "drum", Instrumental: "bass", Acapella: "melody", Piano: "sample" };
    const tracks = [
        { category: "Drums", sample: catalog.Drums[0], volume: 82, start: 0, length: 75, offset: 0 },
        { category: "Instrumental", sample: catalog.Instrumental[0], volume: 68, start: 12, length: 80, offset: 0 },
        { category: "Acapella", sample: null, volume: 72, start: 24, length: 60, offset: 0 },
        { category: "Piano", sample: null, volume: 45, start: 40, length: 45, offset: 0 }
    ];
    const sessionDuration = 240;
    const bpmControl = document.querySelector("#bpm");
    const pitchControl = document.querySelector("#pitch");
    const playbackRate = () => (Number(bpmControl?.value || 96) / 96) * Math.pow(2, Number(pitchControl?.value || 0) / 12);
    const status = document.createElement("div");
    status.className = "editor-status";
    status.textContent = "Press Generate to open your sound editor.";
    toolbar.after(status);
    const downloadButton = document.createElement("button");
    downloadButton.className = "btn export-btn";
    downloadButton.textContent = "↓ Export WAV";
    downloadButton.disabled = true;
    toolbar.append(downloadButton);
    const chooser = document.createElement("div");
    chooser.className = "sample-chooser";
    chooser.innerHTML = `<strong>ADD SOURCE</strong>${Object.keys(catalog).map((category) => `<button type="button" data-category="${category}">${category}</button>`).join("")}`;
    timeline.before(chooser);

    function renderTimeline() {
        timeline.innerHTML = `<div class="timeline-ruler"><span>00:00</span><span>00:30</span><span>01:00</span><span>01:30</span><span>02:00</span><span>02:30</span><span>03:00</span><span>03:30</span><span>04:00</span></div><div class="playhead" id="beatPlayhead"><span></span></div>${tracks.map((track, index) => {
            const title = track.sample?.[0] || "No audio loaded";
            const source = track.sample?.[1] || "";
            return `<div class="track"><span class="track-name">${track.category.toUpperCase()}<small>${track.sample ? "SOURCE" : "EMPTY"}</small></span><div class="track-lane"><div class="clip ${colors[track.category]} ${track.sample ? "" : "unavailable"}" data-index="${index}" data-source="${source}" style="left:${track.start / sessionDuration * 100}%;width:${track.length / sessionDuration * 100}%;"><button class="clip-handle clip-start" aria-label="Move and trim clip start"></button><span>${title}</span><i></i><button class="clip-handle clip-end" aria-label="Shorten clip end"></button></div></div><div class="track-edits"><label>START <input class="start-control" data-index="${index}" type="range" min="0" max="239" value="${track.start}" aria-label="${track.category} start in seconds"></label><label>LENGTH <input class="length-control" data-index="${index}" type="range" min="1" max="240" value="${track.length}" aria-label="${track.category} length in seconds"></label><input class="track-volume" data-index="${index}" type="range" min="0" max="100" value="${track.volume}" aria-label="${track.category} volume"></div></div>`;
        }).join("")}<div class="empty-state">Trim and resize clips with the lane controls. Click a clip to mute it.</div>`;
        timeline.querySelectorAll(".start-control, .length-control").forEach((control) => control.addEventListener("input", () => {
            const index = Number(control.dataset.index);
            tracks[index][control.classList.contains("start-control") ? "start" : "length"] = Number(control.value);
            const clip = timeline.querySelector(`.clip[data-index="${index}"]`);
            clip.style.left = `${tracks[index].start / sessionDuration * 100}%`;
            clip.style.width = `${tracks[index].length / sessionDuration * 100}%`;
        }));
        timeline.querySelectorAll(".clip").forEach((clip) => {
            clip.addEventListener("click", (event) => { if (!event.target.classList.contains("clip-handle")) clip.classList.toggle("muted"); });
            clip.addEventListener("pointerdown", (event) => {
                if (event.target.classList.contains("clip-end")) return;
                event.preventDefault();
                const index = Number(clip.dataset.index); const lane = clip.parentElement; const startX = event.clientX; const initial = tracks[index].start; const initialLength = tracks[index].length; const initialOffset = tracks[index].offset; const resizingStart = event.target.classList.contains("clip-start"); let moved = false;
                clip.setPointerCapture(event.pointerId);
                const move = (moveEvent) => {
                    const delta = (moveEvent.clientX - startX) / lane.clientWidth * sessionDuration;
                    moved = moved || Math.abs(delta) > 0.5;
                    if (resizingStart) { tracks[index].start = Math.max(0, Math.min(initial + initialLength - 1, initial + delta)); tracks[index].length = initial + initialLength - tracks[index].start; tracks[index].offset = Math.max(0, initialOffset + tracks[index].start - initial); }
                    else tracks[index].start = Math.max(0, Math.min(sessionDuration - tracks[index].length, initial + delta));
                    clip.style.left = `${tracks[index].start / sessionDuration * 100}%`; clip.style.width = `${tracks[index].length / sessionDuration * 100}%`;
                    timeline.querySelector(`.start-control[data-index="${index}"]`).value = tracks[index].start; timeline.querySelector(`.length-control[data-index="${index}"]`).value = tracks[index].length;
                };
                clip.addEventListener("pointermove", move); clip.addEventListener("pointerup", () => clip.removeEventListener("pointermove", move), { once: true });
                clip.addEventListener("click", (clickEvent) => { if (moved) { clickEvent.stopImmediatePropagation(); moved = false; } }, { once: true, capture: true });
            });
            clip.querySelector(".clip-end")?.addEventListener("pointerdown", (event) => {
                event.preventDefault(); event.stopPropagation(); const index = Number(clip.dataset.index); const lane = clip.parentElement; const startX = event.clientX; const initial = tracks[index].length;
                clip.setPointerCapture(event.pointerId);
                const resize = (resizeEvent) => { tracks[index].length = Math.max(1, Math.min(sessionDuration - tracks[index].start, initial + (resizeEvent.clientX - startX) / lane.clientWidth * sessionDuration)); clip.style.width = `${tracks[index].length / sessionDuration * 100}%`; timeline.querySelector(`.length-control[data-index="${index}"]`).value = tracks[index].length; };
                clip.addEventListener("pointermove", resize); clip.addEventListener("pointerup", () => clip.removeEventListener("pointermove", resize), { once: true });
            });
        });
    }
    renderTimeline();

    function openSampleTable(category) {
        document.querySelector(".sample-modal")?.remove();
        const samples = catalog[category];
        const modal = document.createElement("div");
        modal.className = "sample-modal";
        modal.innerHTML = `<div class="sample-modal-inner"><div class="modal-heading"><div><span class="eyebrow">SOURCE LIBRARY</span><h2>${category}</h2></div><button class="modal-close" aria-label="Close sample library">×</button></div>${samples.length ? `<div class="sample-table"><div class="sample-row sample-head"><span>NAME</span><span>PREVIEW</span><span>ADD</span></div>${samples.map((sample, index) => `<div class="sample-row"><strong>${sample[0]}</strong><audio controls preload="none" src="${sample[1]}"></audio><button class="btn primary add-sample" data-index="${index}">Add to track</button></div>`).join("")}</div>` : `<div class="sample-empty"><strong>No ${category.toLowerCase()} audio yet</strong><span>Add source files to the SFX folder and they will appear here.</span></div>`}<button class="btn secondary add-none">None / Empty Track</button></div>`;
        document.body.append(modal);
        modal.querySelector(".modal-close").addEventListener("click", () => modal.remove());
        modal.querySelectorAll(".add-sample").forEach((button) => button.addEventListener("click", () => {
            let index = tracks.findIndex((track) => track.category === category && !track.sample);
            if (index < 0) { index = tracks.length; tracks.push({ category, sample: null, volume: 70, start: 0, length: 60, offset: 0 }); }
            tracks[index].sample = samples[Number(button.dataset.index)];
            renderTimeline(); modal.remove(); status.textContent = `${tracks[index].sample[0]} added as a new ${category.toLowerCase()} clip.`;
        }));
        modal.querySelector(".add-none").addEventListener("click", () => { tracks.push({ category, sample: null, volume: 70, start: 0, length: 60, offset: 0 }); renderTimeline(); modal.remove(); status.textContent = `Empty ${category.toLowerCase()} track added.`; });
    }
    chooser.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => openSampleTable(button.dataset.category)));
    generateButton.addEventListener("click", () => { document.body.classList.add("editor-open"); timeline.classList.add("is-ready"); downloadButton.disabled = false; updatePlayhead(); status.textContent = "Arrangement ready. Drag clips, pull their edges, or choose a source."; });
    document.querySelector("#clearLab")?.addEventListener("click", () => { document.body.classList.remove("editor-open"); timeline.classList.remove("is-ready"); downloadButton.disabled = true; playbackSession += 1; players.forEach((player) => { player.pause(); }); clearInterval(playheadTimer); playButton.dataset.playing = "false"; status.textContent = "Press Generate to open your sound editor."; });

    const players = [];
    let playheadTime = 0;
    let playheadTimer;
    let playbackSession = 0;
    let playbackClockStart = 0;
    [bpmControl, pitchControl].forEach((control) => control?.addEventListener("input", () => {
        players.forEach((player) => { player.playbackRate = playbackRate(); player.preservesPitch = false; });
        status.textContent = `${bpmControl?.value || 96} BPM / ${pitchControl?.value || 0} semitones`;
    }));
    const updatePlayhead = () => {
        const playhead = timeline.querySelector("#beatPlayhead");
        if (playhead) {
            const ruler = timeline.querySelector(".timeline-ruler");
            playhead.style.left = `${ruler.offsetLeft + ruler.offsetWidth * playheadTime / sessionDuration}px`;
        }
    };
    timeline.addEventListener("click", (event) => {
        if (event.target.closest(".clip, input, button")) return;
        if (timeline.dataset.seeking === "true") { timeline.dataset.seeking = "false"; return; }
        const ruler = timeline.querySelector(".timeline-ruler").getBoundingClientRect();
        playheadTime = Math.max(0, Math.min(sessionDuration, (event.clientX - ruler.left) / ruler.width * sessionDuration));
        updatePlayhead();
        status.textContent = `Cursor moved to ${playheadTime.toFixed(1)} seconds.`;
    });
    timeline.addEventListener("pointerdown", (event) => {
        if (event.target.closest(".clip, input, button")) return;
        event.preventDefault(); timeline.dataset.seeking = "true";
        const movePlayhead = (moveEvent) => {
            const ruler = timeline.querySelector(".timeline-ruler").getBoundingClientRect();
            playheadTime = Math.max(0, Math.min(sessionDuration, (moveEvent.clientX - ruler.left) / ruler.width * sessionDuration));
            updatePlayhead(); syncPlayersToPlayhead();
        };
        movePlayhead(event);
        document.addEventListener("pointermove", movePlayhead);
        document.addEventListener("pointerup", () => document.removeEventListener("pointermove", movePlayhead), { once: true });
    });
    const syncPlayersToPlayhead = () => {
        const rate = playbackRate();
        const session = ++playbackSession;
        if (playButton.dataset.playing === "true") playbackClockStart = performance.now() - playheadTime * 1000 / rate;
        players.forEach((player) => {
            const position = playheadTime - player.grooveStart;
            player.currentTime = player.grooveOffset + Math.max(0, position) * rate;
            if (playButton.dataset.playing !== "true") return;
            if (position >= 0 && position < player.grooveLength) player.play().catch(() => {});
            else if (position < 0) { player.pause(); setTimeout(() => { if (session === playbackSession && playButton.dataset.playing === "true") player.play().catch(() => {}); }, -position * 1000 / rate); }
            else player.pause();
        });
    };
    playButton.addEventListener("click", () => {
        if (!document.body.classList.contains("editor-open")) { generateButton.click(); return; }
        if (playButton.dataset.playing === "true") {
            playbackSession += 1;
            players.forEach((player) => player.pause()); clearInterval(playheadTimer); playButton.dataset.playing = "false"; playButton.textContent = "▶"; status.textContent = "Playback paused."; return;
        }
        players.forEach((player) => player.pause()); players.length = 0;
        clearInterval(playheadTimer);
        const session = ++playbackSession;
        playbackClockStart = performance.now() - playheadTime * 1000 / playbackRate();
        tracks.forEach((track, index) => {
            if (!track.sample || timeline.querySelector(`.clip[data-index="${index}"]`).classList.contains("muted")) return;
            const player = new Audio(track.sample[1]); const start = track.start; const duration = track.length; const offset = playheadTime - start;
            player.grooveStart = start; player.grooveLength = duration; player.grooveOffset = track.offset;
            player.currentTime = track.offset + Math.max(0, offset) * playbackRate(); player.volume = track.volume / 100; player.loop = true; player.playbackRate = playbackRate(); player.preservesPitch = false;
            if (offset >= 0 && offset < duration) player.play().catch(() => {});
            else if (offset < 0) setTimeout(() => { if (session === playbackSession) player.play().catch(() => {}); }, (start - playheadTime) * 1000 / playbackRate());
            players.push(player);
        });
        playheadTimer = setInterval(() => {
            playheadTime = (performance.now() - playbackClockStart) / 1000 * playbackRate();
            if (playheadTime >= sessionDuration) { playheadTime = 0; clearInterval(playheadTimer); playButton.dataset.playing = "false"; players.forEach((player) => player.pause()); }
            players.forEach((player) => {
                const position = playheadTime - player.grooveStart;
                if (position < 0 || position >= player.grooveLength) player.pause();
                else if (player.paused) player.play().catch(() => {});
            });
            updatePlayhead();
        }, 50);
        playButton.dataset.playing = "true"; playButton.textContent = "Ⅱ"; status.textContent = "Playing from the timeline cursor.";
    });
    downloadButton.addEventListener("click", async () => {
        downloadButton.disabled = true; status.textContent = "Rendering your edited mix...";
        try {
            const context = new OfflineAudioContext(2, 44100 * sessionDuration, 44100);
            for (const [index, track] of tracks.entries()) {
                if (!track.sample || timeline.querySelector(`.clip[data-index="${index}"]`).classList.contains("muted")) continue;
                const buffer = await context.decodeAudioData(await (await fetch(track.sample[1])).arrayBuffer());
                const source = context.createBufferSource(); const gain = context.createGain(); source.buffer = buffer; source.loop = true; source.playbackRate.value = playbackRate(); gain.gain.value = track.volume / 100; source.connect(gain).connect(context.destination); source.start(track.start, track.offset); source.stop(Math.min(sessionDuration, track.start + track.length));
            }
            const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([audioBufferToWav(await context.startRendering())], { type: "audio/wav" })); link.download = "grooveDNA-edited-session.wav"; link.click(); status.textContent = "Export complete. Your edited WAV is ready.";
        } catch (error) { console.error("Beat export failed:", error); status.textContent = "Export needs the audio files to be served from a local web server."; } finally { downloadButton.disabled = false; }
    });
}


/* =========================================================
   START TRACK
   ========================================================= */

function startTrack(title, artist) {

    console.log(
        `Playing: ${title} — ${artist}`
    );

    // Connect this to your existing GrooveDNA
    // audio player when ready.
}


console.log(
    "GrooveDNA + Supabase + MusicBrainz loaded."
);