/* =========================================================
   GROOVEDNA
   SUPABASE + MUSICBRAINZ + BEAT LAB
   ========================================================= */

/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
    "https://nzfzcnusmjboykledznh.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_qsskdrsPBxg1dECb1HY8Jg_x0rL7wR3";

let supabaseClient = null;

if (window.supabase) {
    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );
}


/* =========================================================
   MUSICBRAINZ
   ========================================================= */

const MUSICBRAINZ_API =
    "https://musicbrainz.org/ws/2";

const MUSICBRAINZ_HEADERS = {
    Accept: "application/json"
};


/* =========================================================
   MUSICBRAINZ SEARCH
   ========================================================= */

async function searchMusicBrainz(searchTerm) {

    if (!searchTerm || !searchTerm.trim()) {
        return [];
    }

    const query =
        encodeURIComponent(searchTerm.trim());

    const url =
        `${MUSICBRAINZ_API}/recording/?query=${query}&fmt=json&limit=10`;

    try {

        const response = await fetch(url, {
            method: "GET",
            headers: MUSICBRAINZ_HEADERS
        });

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


/* =========================================================
   MUSICBRAINZ ARTISTS
   ========================================================= */

async function searchMusicBrainzArtists(searchTerm) {

    if (!searchTerm || !searchTerm.trim()) {
        return [];
    }

    const query =
        encodeURIComponent(searchTerm.trim());

    const url =
        `${MUSICBRAINZ_API}/artist/?query=${query}&fmt=json&limit=10`;

    try {

        const response = await fetch(url, {
            method: "GET",
            headers: MUSICBRAINZ_HEADERS
        });

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

    if (!supabaseClient) {
        return [];
    }

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
   SUPABASE — SAVE MUSICBRAINZ TRACK
   ========================================================= */

async function saveMusicBrainzTrack(recording) {

    if (!recording || !supabaseClient) {
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

        title,

        artist,

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
   DATABASE TRACK UI
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
                escapeHTML(
                    track.title ||
                    "Unknown Track"
                );

            const artist =
                escapeHTML(
                    track.artist ||
                    "Unknown Artist"
                );

            const genre =
                escapeHTML(
                    track.genre ||
                    "General"
                );

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

                        <h3>${title}</h3>

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
   MUSIC SEARCH UI
   ========================================================= */

async function searchMusic(searchTerm) {

    const resultsContainer =
        document.querySelector("#musicResults");

    if (!resultsContainer) {
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
   SAVE MUSICBRAINZ RESULT
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
   SAVE TRACK
   ========================================================= */

async function saveTrack(title) {

    console.log(
        "Saving track:",
        title
    );
}


/* =========================================================
   SECURITY HELPERS
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
   AUTH
   ========================================================= */

async function loginUser(email, password) {

    if (!supabaseClient) {
        return false;
    }

    const {
        data,
        error
    } = await supabaseClient.auth.signInWithPassword({
        email,
        password
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


async function signupUser(email, password) {

    if (!supabaseClient) {
        return false;
    }

    const {
        data,
        error
    } = await supabaseClient.auth.signUp({
        email,
        password
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


async function logoutUser() {

    if (!supabaseClient) {
        return;
    }

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
   BEAT LAB
   ========================================================= */

const BeatLab = {

    bars: 16,

    beatsPerBar: 4,

    timelineBpm: 96,

    snapBeats: 0.25,

    playing: false,

    playheadBeat: 0,

    animationFrame: null,

    playbackStartedAt: 0,

    audioPlayers: [],

    playbackToken: 0,

    selectedClipId: null,

    tracks: [],

    catalog: {

        Drums: [

            [
                "Deep house drums",
                "SFX/Drums/Deep house drums Loop - 126 BPM.mp3"
            ],

            [
                "Jazz funk drum loop",
                "SFX/Drums/Drum Loop - Jazz  Funk - 148 bpm - Backing Track - Play-along.mp3"
            ],

            [
                "Electronic house dance",
                "SFX/Drums/ElectronicHouseDance Drum Loop 126 BPM.mp3"
            ],

            [
                "Grunge drum track",
                "SFX/Drums/Grunge Drum Track  126 BPM.mp3"
            ],

            [
                "Grunge drum track 7",
                "SFX/Drums/Grunge Drum Track 7 - 126 BPM.mp3"
            ],

            [
                "Hip hop drum loop",
                "SFX/Drums/Hip Hop Drum Loop 148 BPM.mp3"
            ],

            [
                "Post punk drum beat 7",
                "SFX/Drums/Post Punk Drum Beat #7 - 148 bpm.mp3"
            ],

            [
                "Rock shuffle",
                "SFX/Drums/Rock Shuffle (Drum Loop 126 BPM).mp3"
            ],

            [
                "Trap drum loop",
                "SFX/Drums/Trap Drum Loop 126 BPM.mp3"
            ],

            [
                "Trap drum loop full",
                "SFX/Drums/trap drum loop bpm 148 (Full Drum Track).mp3"
            ]
        ],

        Instrumental: [

            [
                "Get Involved",
                "SFX/Instrumental/JAMES BROWN Get Involved instrumental.mp3"
            ],

            [
                "Get Up Offa That Thing",
                "SFX/Instrumental/Get Up Offa That Thing (Isolated Vocal Only Acapella) by James Brown.mp3"
            ],

            [
                "Smooth Criminal",
                "SFX/Instrumental/Michael Jackson- Smooth Criminal Instrumental.mp3"
            ],

            [
                "All Caps",
                "SFX/Instrumental/Madvillain - All Caps (Instrumental) ReProd. Nick T.mp3"
            ],

            [
                "Night Ripper OST",
                "SFX/Instrumental/Ill just walk Night Ripper OST (slowed).mp3"
            ],

            [
                "Night Time Is the Right Time",
                "SFX/Instrumental/Night Time is the Right Time - Ray Charles instrumental.mp3"
            ],

            [
                "Heart's on Fire",
                "SFX/Instrumental/Rocky IV - Heart's on fire (Instrumental)  Up the mountain.mp3"
            ],

            [
                "I Just Called to Say I Love You",
                "SFX/Instrumental/Stevie Wonder - I Just Called To Say I Love You Instrumental.mp3"
            ],

            [
                "Spend the Night",
                "SFX/Instrumental/THE ISLEY BROTHERS - SPEND THE NIGHT(CE SOIR)ORIGINAL INSTRUMENTAL.mp3"
            ],

            [
                "I Wanna Dance with Somebody",
                "SFX/Instrumental/Whitney Houston - I Wanna Dance With Somebody (Who Loves Me) (Instrumental).mp3"
            ]
        ],

        Acapella: [],

        Piano: []
    },

    colors: {

        Drums: "drum",

        Instrumental: "bass",

        Acapella: "melody",

        Piano: "sample"
    },


    /* -----------------------------------------------------
       INITIALIZE
       ----------------------------------------------------- */

    init() {

        const timeline =
            document.querySelector("#timeline");

        if (!timeline) {
            return;
        }

        this.timeline =
            timeline;

        this.playButton =
            document.querySelector("#labPlay");

        this.bpmControl =
            document.querySelector("#bpm");

        this.pitchControl =
            document.querySelector("#pitch");

        this.bpmValue =
            document.querySelector("#bpmValue");

        this.pitchValue =
            document.querySelector("#pitchValue");

        this.loopToggle =
            document.querySelector("#loopToggle");

        this.generateButton =
            document.querySelector("#generateBeat");

        this.clearButton =
            document.querySelector("#clearLab");

        this.saveButton =
            document.querySelector("#saveBeat");

        this.toolbar =
            document.querySelector(".lab-toolbar");

        this.status =
            this.createStatus();

        this.createExportButton();

        this.createChooser();

        this.createDefaultTracks();

        this.bindControls();

        this.render();

        this.loadSavedProject();
    },


    /* -----------------------------------------------------
       CREATE STATUS
       ----------------------------------------------------- */

    createStatus() {

        let status =
            document.querySelector(".editor-status");

        if (!status) {

            status =
                document.createElement("div");

            status.className =
                "editor-status";

            this.toolbar?.after(status);
        }

        status.textContent =
            "Add sounds to begin building your beat.";

        return status;
    },


    /* -----------------------------------------------------
       EXPORT BUTTON
       ----------------------------------------------------- */

    createExportButton() {

        if (
            document.querySelector("#exportBeat")
        ) {
            return;
        }

        const button =
            document.createElement("button");

        button.id =
            "exportBeat";

        button.className =
            "btn secondary";

        button.textContent =
            "↓ Export WAV";

        button.addEventListener(
            "click",
            () => this.exportWav()
        );

        this.toolbar?.append(button);

        this.exportButton =
            button;
    },


    /* -----------------------------------------------------
       SAMPLE CHOOSER
       ----------------------------------------------------- */

    createChooser() {

        let chooser =
            document.querySelector(".sample-chooser");

        if (!chooser) {

            chooser =
                document.createElement("div");

            chooser.className =
                "sample-chooser";

            this.timeline.before(
                chooser
            );
        }

        chooser.innerHTML = `
            <strong>ADD SOUND</strong>

            ${Object.keys(this.catalog)
                .map(category => `
                    <button
                        type="button"
                        data-category="${category}"
                    >
                        + ${category}
                    </button>
                `)
                .join("")}
        `;

        chooser
            .querySelectorAll("button")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        this.openSamplePicker(
                            button.dataset.category
                        );

                    }
                );

            });
    },


    /* -----------------------------------------------------
       DEFAULT TRACKS
       ----------------------------------------------------- */

    createDefaultTracks() {

        this.tracks = [

            {
                id: this.uid(),

                category: "Drums",

                volume: 82,

                clips: [

                    this.createClip(
                        "Deep house drums",
                        "SFX/Drums/Deep house drums Loop - 126 BPM.mp3",
                        0,
                        4
                    )
                ]
            },

            {
                id: this.uid(),

                category: "Instrumental",

                volume: 68,

                clips: [

                    this.createClip(
                        "Get Involved",
                        "SFX/Instrumental/JAMES BROWN Get Involved instrumental.mp3",
                        4,
                        8
                    )
                ]
            },

            {
                id: this.uid(),

                category: "Acapella",

                volume: 72,

                clips: []
            },

            {
                id: this.uid(),

                category: "Piano",

                volume: 45,

                clips: []
            }
        ];
    },


    /* -----------------------------------------------------
       CREATE CLIP
       ----------------------------------------------------- */

    createClip(
        title,
        source,
        startBeat = 0,
        lengthBeats = 4
    ) {

        return {

            id: this.uid(),

            title,

            source,

            startBeat,

            lengthBeats,

            offset: 0,

            muted: false
        };
    },


    /* -----------------------------------------------------
       UNIQUE ID
       ----------------------------------------------------- */

    uid() {

        return (
            "clip-" +
            Math.random()
                .toString(36)
                .slice(2) +
            Date.now()
        );
    },


    /* -----------------------------------------------------
       BPM
       ----------------------------------------------------- */

    bpm() {

        return Number(
            this.bpmControl?.value || 96
        );
    },


    /* -----------------------------------------------------
       PITCH
       ----------------------------------------------------- */

    pitch() {

        return Number(
            this.pitchControl?.value || 0
        );
    },


    /* -----------------------------------------------------
       PLAYBACK RATE
       ----------------------------------------------------- */

    bpmRate() {

        return (
            this.bpm() / 96
        );
    },


    pitchRate() {

        return Math.pow(
            2,
            this.pitch() / 12
        );
    },


    audioPlaybackRate() {

        return (
            this.bpmRate() *
            this.pitchRate()
        );
    },


    /* -----------------------------------------------------
       TIMELINE RATE
       ----------------------------------------------------- */

    timelineRate() {

        return 1;
    },


    /* -----------------------------------------------------
       TOTAL BEATS
       ----------------------------------------------------- */

    totalBeats() {

        return (
            this.bars *
            this.beatsPerBar
        );
    },


    /* -----------------------------------------------------
       SESSION SECONDS
       ----------------------------------------------------- */

    sessionSeconds() {

        return (
            this.totalBeats() *
            (60 / this.timelineBpm)
        );
    },


    /* -----------------------------------------------------
       SNAP
       ----------------------------------------------------- */

    snap(value) {

        return Math.round(
            value / this.snapBeats
        ) * this.snapBeats;
    },


    /* -----------------------------------------------------
       RENDER
       ----------------------------------------------------- */

    render() {

        const totalBeats =
            this.totalBeats();

        const ruler =
            this.createRuler();

        const tracksHTML =
            this.tracks
                .map(track =>
                    this.renderTrack(
                        track,
                        totalBeats
                    )
                )
                .join("");

        this.timeline.innerHTML = `

            ${ruler}

            <div
                class="playhead"
                id="beatPlayhead"
            >
                <span></span>
            </div>

            <div class="beatlab-tracks">

                ${tracksHTML}

            </div>

            <div
                class="empty-state"
                id="labEmpty"
            >
                Drag clips to move them.
                Add more sounds to the same lane
                whenever you want.
            </div>
        `;

        this.bindRenderedElements();

        this.updatePlayhead();

        this.updateEmptyState();
    },


    /* -----------------------------------------------------
       RULER
       ----------------------------------------------------- */

    createRuler() {

        let output =
            `<div class="timeline-ruler">`;

        for (
            let bar = 1;
            bar <= this.bars;
            bar++
        ) {

            output += `
                <span>
                    ${String(bar).padStart(2, "0")}
                </span>
            `;
        }

        output +=
            `</div>`;

        return output;
    },


    /* -----------------------------------------------------
       RENDER TRACK
       ----------------------------------------------------- */

    renderTrack(track, totalBeats) {

        const clips =
            track.clips
                .map(
                    clip =>
                        this.renderClip(
                            clip,
                            totalBeats
                        )
                )
                .join("");

        return `

            <div
                class="track"
                data-track-id="${track.id}"
            >

                <span class="track-name">

                    ${escapeHTML(
                        track.category
                            .toUpperCase()
                    )}

                    <small>
                        ${track.clips.length}
                        ${track.clips.length === 1
                            ? "CLIP"
                            : "CLIPS"}
                    </small>

                </span>

                <div class="track-lane">

                    ${clips}

                </div>

                <div class="track-edits">

                    <label>
                        VOL
                        <input
                            class="track-volume"
                            type="range"
                            min="0"
                            max="100"
                            value="${track.volume}"
                            data-track-id="${track.id}"
                        >
                    </label>

                </div>

            </div>
        `;
    },


    /* -----------------------------------------------------
       RENDER CLIP
       ----------------------------------------------------- */

    renderClip(clip, totalBeats) {

        const left =
            (
                clip.startBeat /
                totalBeats
            ) * 100;

        const width =
            Math.max(
                2,
                (
                    clip.lengthBeats /
                    totalBeats
                ) * 100
            );

        return `

            <div
                class="
                    clip
                    ${this.colorsForClip(clip)}
                    ${clip.muted ? "muted" : ""}
                "
                data-clip-id="${clip.id}"
                data-source="${escapeAttribute(clip.source)}"
                style="
                    left:${left}%;
                    width:${width}%;
                "
                title="Drag to move • Double-click to duplicate"
            >

                <button
                    class="clip-delete"
                    type="button"
                    aria-label="Delete clip"
                    title="Delete"
                >
                    ×
                </button>

                <button
                    class="clip-handle clip-start"
                    type="button"
                    aria-label="Resize clip start"
                ></button>

                <span>
                    ${escapeHTML(clip.title)}
                </span>

                <i></i>

                <button
                    class="clip-handle clip-end"
                    type="button"
                    aria-label="Resize clip end"
                ></button>

            </div>
        `;
    },


    /* -----------------------------------------------------
       CLIP COLOR
       ----------------------------------------------------- */

    colorsForClip(clip) {

        for (const track of this.tracks) {

            if (
                track.clips.some(
                    item =>
                        item.id === clip.id
                )
            ) {

                return (
                    this.colors[
                        track.category
                    ] || "sample"
                );
            }
        }

        return "sample";
    },


    /* -----------------------------------------------------
       BIND RENDERED ELEMENTS
       ----------------------------------------------------- */

    bindRenderedElements() {

        this.timeline
            .querySelectorAll(".clip")
            .forEach(clip => {

                this.bindClip(clip);

            });


        this.timeline
            .querySelectorAll(".track-volume")
            .forEach(control => {

                control.addEventListener(
                    "input",
                    event => {

                        const track =
                            this.findTrack(
                                event.target.dataset.trackId
                            );

                        if (!track) {
                            return;
                        }

                        track.volume =
                            Number(
                                event.target.value
                            );

                        this.applyVolume(
                            track
                        );
                    }
                );
            });


        if (this.timeline.dataset.seekBound !== "true") {
            this.timeline.dataset.seekBound = "true";
            this.timeline.addEventListener(
                "pointerdown",
                event => {

                if (
                    event.target.closest(
                        ".clip, input, button"
                    )
                ) {
                    return;
                }

                    event.preventDefault();
                    this.timeline.setPointerCapture(event.pointerId);
                    this.timeline.dataset.seeking = "true";
                    this.seekFromPointer(event.clientX);
                }
            );
            this.timeline.addEventListener(
                "pointermove",
                event => {
                    if (this.timeline.dataset.seeking === "true") {
                        this.seekFromPointer(event.clientX);
                    }
                }
            );
            this.timeline.addEventListener(
                "pointerup",
                () => { this.timeline.dataset.seeking = "false"; }
            );
        }
    },


    /* -----------------------------------------------------
       BIND CLIP
       ----------------------------------------------------- */

    bindClip(element) {

        const clipId =
            element.dataset.clipId;

        let moved =
            false;

        let dragStartX =
            0;

        let originalStart =
            0;

        let originalLength =
            0;

        let mode =
            "move";


        element.addEventListener(
            "pointerdown",
            event => {

                if (
                    event.target.closest(
                        ".clip-delete"
                    )
                ) {
                    return;
                }

                event.preventDefault();

                const clip =
                    this.findClip(
                        clipId
                    );

                if (!clip) {
                    return;
                }

                this.selectedClipId =
                    clip.id;

                if (
                    event.target.closest(
                        ".clip-start"
                    )
                ) {

                    mode =
                        "resize-start";

                } else if (
                    event.target.closest(
                        ".clip-end"
                    )
                ) {

                    mode =
                        "resize-end";

                } else {

                    mode =
                        "move";
                }

                const lane =
                    element.parentElement;

                dragStartX =
                    event.clientX;

                originalStart =
                    clip.startBeat;

                originalLength =
                    clip.lengthBeats;

                moved =
                    false;

                element.setPointerCapture(
                    event.pointerId
                );


                const onMove =
                    moveEvent => {

                        const rect =
                            lane.getBoundingClientRect();

                        const laneWidth =
                            Math.max(
                                lane.clientWidth,
                                lane.scrollWidth
                            );

                        const deltaBeats =
                            (
                                (
                                    moveEvent.clientX -
                                    dragStartX
                                ) /
                                laneWidth
                            ) *
                            this.totalBeats();

                        if (
                            Math.abs(
                                deltaBeats
                            ) > 0.05
                        ) {

                            moved =
                                true;
                        }


                        if (
                            mode === "move"
                        ) {

                            clip.startBeat =
                                this.snap(
                                    Math.max(
                                        0,
                                        Math.min(
                                            this.totalBeats() -
                                            clip.lengthBeats,
                                            originalStart +
                                            deltaBeats
                                        )
                                    )
                                );
                        }


                        if (
                            mode ===
                            "resize-start"
                        ) {

                            const originalEnd =
                                originalStart +
                                originalLength;

                            const newStart =
                                this.snap(
                                    Math.max(
                                        0,
                                        Math.min(
                                            originalEnd -
                                            this.snapBeats,
                                            originalStart +
                                            deltaBeats
                                        )
                                    )
                                );

                            clip.startBeat =
                                newStart;

                            clip.lengthBeats =
                                originalEnd -
                                newStart;
                        }


                        if (
                            mode ===
                            "resize-end"
                        ) {

                            clip.lengthBeats =
                                this.snap(
                                    Math.max(
                                        this.snapBeats,
                                        Math.min(
                                            this.totalBeats() -
                                            clip.startBeat,
                                            originalLength +
                                            deltaBeats
                                        )
                                    )
                                );
                        }


                        this.updateClipElement(
                            element,
                            clip
                        );

                        this.status.textContent =
                            `${clip.title} • ${this.formatBeat(clip.startBeat)}`;
                    };


                const onUp =
                    () => {

                        element.removeEventListener(
                            "pointermove",
                            onMove
                        );

                        if (!moved) {

                            clip.muted =
                                !clip.muted;

                            element.classList.toggle(
                                "muted",
                                clip.muted
                            );

                        }

                        this.saveProjectSilently();

                    };


                element.addEventListener(
                    "pointermove",
                    onMove
                );

                element.addEventListener(
                    "pointerup",
                    onUp,
                    {
                        once: true
                    }
                );

            }
        );


        element.addEventListener(
            "dblclick",
            event => {

                if (
                    event.target.closest(
                        ".clip-delete"
                    )
                ) {
                    return;
                }

                event.preventDefault();

                this.duplicateClip(
                    clipId
                );
            }
        );


        element
            .querySelector(".clip-delete")
            ?.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    this.deleteClip(
                        clipId
                    );
                }
            );
    },


    /* -----------------------------------------------------
       UPDATE CLIP VISUALLY
       ----------------------------------------------------- */

    updateClipElement(
        element,
        clip
    ) {

        const left =
            (
                clip.startBeat /
                this.totalBeats()
            ) * 100;

        const width =
            Math.max(
                2,
                (
                    clip.lengthBeats /
                    this.totalBeats()
                ) * 100
            );

        element.style.left =
            `${left}%`;

        element.style.width =
            `${width}%`;
    },


    /* -----------------------------------------------------
       FIND TRACK
       ----------------------------------------------------- */

    findTrack(id) {

        return this.tracks.find(
            track =>
                track.id === id
        );
    },


    /* -----------------------------------------------------
       FIND CLIP
       ----------------------------------------------------- */

    findClip(id) {

        for (
            const track
            of this.tracks
        ) {

            const clip =
                track.clips.find(
                    item =>
                        item.id === id
                );

            if (clip) {

                return clip;
            }
        }

        return null;
    },


    /* -----------------------------------------------------
       FIND CLIP TRACK
       ----------------------------------------------------- */

    findClipTrack(id) {

        return this.tracks.find(
            track =>
                track.clips.some(
                    clip =>
                        clip.id === id
                )
        );
    },


    /* -----------------------------------------------------
       DUPLICATE CLIP
       ----------------------------------------------------- */

    duplicateClip(id) {

        const track =
            this.findClipTrack(id);

        const original =
            this.findClip(id);

        if (
            !track ||
            !original
        ) {
            return;
        }

        let newStart =
            original.startBeat +
            original.lengthBeats;

        if (
            newStart +
            original.lengthBeats >
            this.totalBeats()
        ) {

            newStart =
                original.startBeat +
                1;
        }

        newStart =
            Math.max(
                0,
                Math.min(
                    this.totalBeats() -
                    original.lengthBeats,
                    this.snap(newStart)
                )
            );

        const copy =
            this.createClip(
                original.title,
                original.source,
                newStart,
                original.lengthBeats
            );

        copy.offset =
            original.offset;

        track.clips.push(
            copy
        );

        this.render();

        this.status.textContent =
            `${original.title} duplicated on ${track.category}.`;

        this.saveProjectSilently();
    },


    /* -----------------------------------------------------
       DELETE CLIP
       ----------------------------------------------------- */

    deleteClip(id) {

        const track =
            this.findClipTrack(id);

        if (!track) {
            return;
        }

        const clip =
            this.findClip(id);

        if (!clip) {
            return;
        }

        this.stopAudio();

        track.clips =
            track.clips.filter(
                item =>
                    item.id !== id
            );

        this.render();

        this.status.textContent =
            `${clip.title} removed.`;

        this.saveProjectSilently();
    },


    /* -----------------------------------------------------
       FORMAT BEAT
       ----------------------------------------------------- */

    formatBeat(beat) {

        const bar =
            Math.floor(
                beat / this.beatsPerBar
            ) + 1;

        const beatInBar =
            (
                Math.floor(beat) %
                this.beatsPerBar
            ) + 1;

        return (
            `Bar ${bar} • Beat ${beatInBar}`
        );
    },


    /* -----------------------------------------------------
       SEEK
       ----------------------------------------------------- */

    seekFromPointer(clientX) {

        const ruler =
            this.timeline
                .querySelector(
                    ".timeline-ruler"
                );

        if (!ruler) {
            return;
        }

        const rect =
            ruler.getBoundingClientRect();

        const percentage =
            Math.max(
                0,
                Math.min(
                    1,
                    (
                        clientX -
                        rect.left
                    ) /
                    rect.width
                )
            );

        this.playheadBeat =
            this.snap(
                percentage *
                this.totalBeats()
            );

        this.updatePlayhead();

        if (this.playing) {

            this.syncAudioToPlayhead();
        }

        this.status.textContent =
            `Cursor: ${this.formatBeat(this.playheadBeat)}`;
    },


    /* -----------------------------------------------------
       PLAYHEAD
       ----------------------------------------------------- */

    updatePlayhead() {

        const playhead =
            document.querySelector(
                "#beatPlayhead"
            );

        const ruler =
            this.timeline?.querySelector(
                ".timeline-ruler"
            );

        if (
            !playhead ||
            !ruler
        ) {
            return;
        }

        const percentage =
            this.playheadBeat /
            this.totalBeats();

        playhead.style.left =
            `${ruler.offsetLeft + percentage * ruler.offsetWidth}px`;
    },


    /* -----------------------------------------------------
       PLAY
       ----------------------------------------------------- */

    play() {

        if (this.playing) {

            this.pause();

            return;
        }

        this.playing =
            true;

        this.playbackStartedAt =
            performance.now() -
            (
                this.playheadBeat /
                this.timelineBpm
            ) *
            60 *
            1000 /
            this.timelineRate();

        this.playButton.dataset.playing =
            "true";

        this.playButton.textContent =
            "Ⅱ";

        this.status.textContent =
            "Playing your arrangement.";

        this.startAudio();

        this.tick();
    },


    /* -----------------------------------------------------
       PAUSE
       ----------------------------------------------------- */

    pause() {

        this.playing =
            false;

        cancelAnimationFrame(
            this.animationFrame
        );

        this.stopAudio();

        this.playButton.dataset.playing =
            "false";

        this.playButton.textContent =
            "▶";

        this.status.textContent =
            "Playback paused.";
    },


    /* -----------------------------------------------------
       STOP AUDIO
       ----------------------------------------------------- */

    stopAudio() {

        this.playbackToken += 1;

        this.audioPlayers.forEach(
            player => {

                try {
                    player.pause();
                } catch {}
            }
        );

        this.audioPlayers =
            [];
    },


    /* -----------------------------------------------------
       START AUDIO
       ----------------------------------------------------- */

    startAudio() {

        this.stopAudio();

        const playbackToken =
            this.playbackToken;

        const currentBeat =
            this.playheadBeat;

        for (
            const track
            of this.tracks
        ) {

            for (
                const clip
                of track.clips
            ) {

                if (
                    clip.muted
                ) {
                    continue;
                }

                const clipEnd =
                    clip.startBeat +
                    clip.lengthBeats;

                if (
                    currentBeat >=
                        clipEnd
                ) {
                    continue;
                }

                const audio =
                    new Audio(
                        clip.source
                    );

                audio.preload =
                    "auto";

                audio.loop =
                    true;

                audio.volume =
                    track.volume /
                    100;

                audio.playbackRate =
                    this.audioPlaybackRate();

                audio.preservesPitch =
                    false;

                audio.dataset.clipId =
                    clip.id;

                audio.dataset.clipEnd =
                    clipEnd;

                this.audioPlayers.push(
                    audio
                );

                const elapsedBeats =
                    Math.max(
                        0,
                        currentBeat -
                        clip.startBeat
                    );

                audio.currentTime =
                    clip.offset +
                    (
                        elapsedBeats *
                        60 /
                        this.timelineBpm *
                        this.audioPlaybackRate()
                    );

                if (
                    currentBeat >=
                    clip.startBeat
                ) {

                    audio.play()
                        .catch(
                            error =>
                                console.warn(
                                    "Audio playback blocked:",
                                    error
                                )
                        );

                } else {

                    const delay =
                        (
                            clip.startBeat -
                            currentBeat
                        ) *
                        60 /
                        this.timelineBpm;

                    setTimeout(
                        () => {

                            if (
                                this.playing &&
                                playbackToken === this.playbackToken &&
                                this.playheadBeat >= clip.startBeat &&
                                this.playheadBeat < clipEnd
                            ) {

                                audio.play()
                                    .catch(
                                        () => {}
                                    );
                            }

                        },
                        delay * 1000
                    );
                }
            }
        }
    },


    /* -----------------------------------------------------
       SYNC AUDIO
       ----------------------------------------------------- */

    syncAudioToPlayhead() {

        this.startAudio();
    },

    tick() {

        if (!this.playing) {
            return;
        }

        const elapsedSeconds =
            (
                performance.now() -
                this.playbackStartedAt
            ) / 1000;

        this.playheadBeat =
            elapsedSeconds *
            this.timelineBpm /
            60 *
            this.timelineRate();

        this.audioPlayers =
            this.audioPlayers.filter(player => {
                if (this.playheadBeat >= Number(player.dataset.clipEnd)) {
                    player.pause();
                    return false;
                }

                const clip =
                    this.findClip(player.dataset.clipId);

                if (
                    clip &&
                    this.playheadBeat < clip.startBeat
                ) {
                    player.pause();
                }

                return true;
            });

        if (
            this.playheadBeat >=
            this.totalBeats()
        ) {

            if (
                this.loopToggle?.checked
            ) {

                this.playheadBeat =
                    0;

                this.playbackStartedAt =
                    performance.now();

                this.startAudio();

            } else {

                this.playheadBeat =
                    this.totalBeats();

                this.pause();

                this.updatePlayhead();

                return;
            }
        }

        this.updatePlayhead();

        this.animationFrame =
            requestAnimationFrame(
                () => this.tick()
            );
    },


    /* -----------------------------------------------------
       APPLY VOLUME
       ----------------------------------------------------- */

    applyVolume(track) {

        this.audioPlayers
            .forEach(player => {

                const clip =
                    track.clips.find(
                        item =>
                            item.id ===
                            player.dataset.clipId
                    );

                if (clip) {

                    player.volume =
                        track.volume /
                        100;
                }
            });
    },


    /* -----------------------------------------------------
       OPEN SAMPLE PICKER
       ----------------------------------------------------- */

    openSamplePicker(category) {

        document
            .querySelector(
                ".sample-modal"
            )
            ?.remove();

        const samples =
            this.catalog[
                category
            ] || [];

        const modal =
            document.createElement(
                "div"
            );

        modal.className =
            "sample-modal";

        modal.innerHTML = `

            <div
                class="sample-modal-inner"
            >

                <div class="modal-heading">

                    <div>

                        <span class="eyebrow">
                            SOURCE LIBRARY
                        </span>

                        <h2>
                            ${escapeHTML(
                                category
                            )}
                        </h2>

                    </div>

                    <button
                        class="modal-close"
                        type="button"
                    >
                        ×
                    </button>

                </div>

                ${
                    samples.length

                    ? `

                        <div class="sample-table">

                            <div class="sample-row sample-head">

                                <span>NAME</span>

                                <span>PREVIEW</span>

                                <span>ADD</span>

                            </div>

                            ${samples
                                .map(
                                    (sample, index) => `

                                    <div
                                        class="sample-row"
                                    >

                                        <strong>
                                            ${escapeHTML(
                                                sample[0]
                                            )}
                                        </strong>

                                        <audio
                                            controls
                                            preload="none"
                                            src="${escapeAttribute(
                                                sample[1]
                                            )}"
                                        ></audio>

                                        <button
                                            class="btn primary add-sample"
                                            data-index="${index}"
                                            type="button"
                                        >
                                            Add Clip
                                        </button>

                                    </div>
                                `
                                )
                                .join("")}

                        </div>

                    `

                    : `

                        <div class="sample-empty">

                            <strong>
                                No ${category.toLowerCase()}
                                audio yet
                            </strong>

                            <span>
                                Add source files to
                                the SFX folder.
                            </span>

                        </div>
                    `
                }

            </div>
        `;

        document.body.append(
            modal
        );

        modal
            .querySelector(
                ".modal-close"
            )
            .addEventListener(
                "click",
                () =>
                    modal.remove()
            );

        modal
            .querySelectorAll(
                ".add-sample"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const sample =
                            samples[
                                Number(
                                    button.dataset.index
                                )
                            ];

                        this.addClipToCategory(
                            category,
                            sample
                        );

                        modal.remove();
                    }
                );
            });
    },


    /* -----------------------------------------------------
       ADD CLIP
       ----------------------------------------------------- */

    addClipToCategory(
        category,
        sample
    ) {

        if (!sample) {
            return;
        }

        let track =
            this.tracks.find(
                item =>
                    item.category ===
                    category
            );

        if (!track) {

            track = {

                id: this.uid(),

                category,

                volume: 70,

                clips: []
            };

            this.tracks.push(
                track
            );
        }

        /*
           IMPORTANT:
           We PUSH instead of replacing
           the existing clip.

           This is what allows:

           DRUMS
           ├── Kick
           ├── Snare
           ├── Kick
           └── Hi-hat
        */

        const lastClip =
            track.clips[
                track.clips.length - 1
            ];

        let start =
            lastClip
            ? lastClip.startBeat +
              lastClip.lengthBeats
            : 0;

        start =
            Math.min(
                start,
                this.totalBeats() - 4
            );

        const clip =
            this.createClip(
                sample[0],
                sample[1],
                this.snap(start),
                4
            );

        track.clips.push(
            clip
        );

        this.render();

        this.status.textContent =
            `${sample[0]} added to ${category}.`;

        this.saveProjectSilently();
    },


    /* -----------------------------------------------------
       CONTROLS
       ----------------------------------------------------- */

    bindControls() {

        this.playButton?.addEventListener(
            "click",
            () => this.play()
        );


        this.generateButton?.addEventListener(
            "click",
            () => {

                document.body.classList.add(
                    "editor-open"
                );

                this.timeline.classList.add(
                    "is-ready"
                );

                this.status.textContent =
                    "Beat Lab ready. Drag clips, duplicate them, or add more sounds.";

            }
        );


        this.clearButton?.addEventListener(
            "click",
            () => {

                this.pause();

                this.playheadBeat =
                    0;

                this.createDefaultTracks();

                document.body.classList.remove(
                    "editor-open"
                );

                this.timeline.classList.remove(
                    "is-ready"
                );

                this.render();

                this.status.textContent =
                    "Beat Lab cleared.";
            }
        );


        this.saveButton?.addEventListener(
            "click",
            () => {

                this.saveProject();

            }
        );


        this.bpmControl?.addEventListener(
            "input",
            () => {

                if (
                    this.bpmValue
                ) {

                    this.bpmValue.textContent =
                        this.bpm();
                }

                if (
                    this.playing
                ) {

                    this.playbackStartedAt =
                        performance.now() -
                        (
                            this.playheadBeat /
                            this.timelineBpm
                        ) *
                        60 *
                        1000 /
                        this.timelineRate();

                    this.audioPlayers.forEach(player => {
                        player.playbackRate =
                            this.audioPlaybackRate();
                    });
                }

                this.status.textContent =
                    `${this.bpm()} BPM`;
            }
        );


        this.pitchControl?.addEventListener(
            "input",
            () => {

                if (
                    this.pitchValue
                ) {

                    const pitch =
                        this.pitch();

                    this.pitchValue.textContent =
                        pitch > 0
                            ? `+${pitch}`
                            : pitch;
                }

                this.audioPlayers
                    .forEach(
                        player => {

                            player.playbackRate =
                                this.audioPlaybackRate();

                            player.preservesPitch =
                                false;
                        }
                    );

                this.status.textContent =
                    `Pitch: ${this.pitch() > 0 ? "+" : ""}${this.pitch()} semitones`;
            }
        );


        window.addEventListener(
            "keydown",
            event => {

                if (
                    event.code ===
                    "Space" &&
                    event.target.tagName !==
                    "INPUT"
                ) {

                    event.preventDefault();

                    this.play();
                }
            }
        );
    },


    /* -----------------------------------------------------
       UPDATE EMPTY STATE
       ----------------------------------------------------- */

    updateEmptyState() {

        const empty =
            document.querySelector(
                "#labEmpty"
            );

        if (!empty) {
            return;
        }

        const clipCount =
            this.tracks.reduce(
                (
                    total,
                    track
                ) =>
                    total +
                    track.clips.length,
                0
            );

        empty.style.display =
            clipCount
                ? "none"
                : "block";
    },


    /* -----------------------------------------------------
       SAVE PROJECT
       ----------------------------------------------------- */

    saveProject() {

        const project = {

            version: 2,

            bars:
                this.bars,

            bpm:
                this.bpm(),

            pitch:
                this.pitch(),

            tracks:
                this.tracks,

            savedAt:
                new Date().toISOString()
        };

        localStorage.setItem(
            "grooveDNA-beatlab-project",
            JSON.stringify(project)
        );

        this.status.textContent =
            "Beat saved to this browser.";
    },


    saveProjectSilently() {

        const project = {

            version: 2,

            bars:
                this.bars,

            bpm:
                this.bpm(),

            pitch:
                this.pitch(),

            tracks:
                this.tracks,

            savedAt:
                new Date().toISOString()
        };

        localStorage.setItem(
            "grooveDNA-beatlab-project",
            JSON.stringify(project)
        );
    },


    /* -----------------------------------------------------
       LOAD PROJECT
       ----------------------------------------------------- */

    loadSavedProject() {

        const raw =
            localStorage.getItem(
                "grooveDNA-beatlab-project"
            );

        if (!raw) {
            return;
        }

        try {

            const project =
                JSON.parse(raw);

            if (
                !project.tracks ||
                !Array.isArray(
                    project.tracks
                )
            ) {
                return;
            }

            this.tracks =
                project.tracks;

            if (
                project.bpm &&
                this.bpmControl
            ) {

                this.bpmControl.value =
                    project.bpm;
            }

            if (
                project.pitch &&
                this.pitchControl
            ) {

                this.pitchControl.value =
                    project.pitch;
            }

            this.render();

            if (
                this.bpmValue
            ) {

                this.bpmValue.textContent =
                    this.bpm();
            }

            if (
                this.pitchValue
            ) {

                const pitch =
                    this.pitch();

                this.pitchValue.textContent =
                    pitch > 0
                        ? `+${pitch}`
                        : pitch;
            }

            this.status.textContent =
                "Saved Beat Lab project restored.";

        } catch (error) {

            console.error(
                "Could not load Beat Lab project:",
                error
            );
        }
    },


    /* -----------------------------------------------------
       EXPORT WAV
       ----------------------------------------------------- */

    async exportWav() {

        if (
            !window.OfflineAudioContext &&
            !window.webkitOfflineAudioContext
        ) {

            this.status.textContent =
                "WAV export is not supported in this browser.";

            return;
        }

        this.status.textContent =
            "Rendering WAV...";

        if (this.exportButton) {
            this.exportButton.disabled =
                true;
        }

        try {

            const sampleRate =
                44100;

            const duration =
                Math.ceil(
                    this.sessionSeconds()
                );

            const OfflineContext =
                window.OfflineAudioContext ||
                window.webkitOfflineAudioContext;

            const context =
                new OfflineContext(
                    2,
                    sampleRate *
                    duration,
                    sampleRate
                );

            for (
                const track
                of this.tracks
            ) {

                for (
                    const clip
                    of track.clips
                ) {

                    if (
                        clip.muted
                    ) {
                        continue;
                    }

                    try {

                        const response =
                            await fetch(
                                clip.source
                            );

                        if (
                            !response.ok
                        ) {
                            continue;
                        }

                        const arrayBuffer =
                            await response.arrayBuffer();

                        const buffer =
                            await context.decodeAudioData(
                                arrayBuffer
                            );

                        const source =
                            context.createBufferSource();

                        const gain =
                            context.createGain();

                        source.buffer =
                            buffer;

                        source.loop =
                            true;

                        source.playbackRate.value =
                            this.audioPlaybackRate();

                        gain.gain.value =
                            track.volume /
                            100;

                        source
                            .connect(gain)
                            .connect(
                                context.destination
                            );

                        const startSeconds =
                            clip.startBeat *
                            60 /
                            this.timelineBpm;

                        const durationSeconds =
                            clip.lengthBeats *
                            60 /
                            this.timelineBpm;

                        source.start(
                            startSeconds,
                            clip.offset
                        );

                        source.stop(
                            Math.min(
                                duration,
                                startSeconds +
                                durationSeconds
                            )
                        );

                    } catch (
                        clipError
                    ) {

                        console.warn(
                            "Could not render clip:",
                            clip.title,
                            clipError
                        );
                    }
                }
            }

            const rendered =
                await context.startRendering();

            const wav =
                audioBufferToWav(
                    rendered
                );

            const blob =
                new Blob(
                    [wav],
                    {
                        type:
                            "audio/wav"
                    }
                );

            const url =
                URL.createObjectURL(
                    blob
                );

            const link =
                document.createElement(
                    "a"
                );

            link.href =
                url;

            link.download =
                "grooveDNA-beat.wav";

            document.body.appendChild(
                link
            );

            link.click();

            link.remove();

            URL.revokeObjectURL(
                url
            );

            this.status.textContent =
                "WAV export complete.";

        } catch (error) {

            console.error(
                "Beat export failed:",
                error
            );

            this.status.textContent =
                "Export failed. Make sure GrooveDNA is running from a web server and the SFX files exist.";

        } finally {

            if (this.exportButton) {
                this.exportButton.disabled =
                    false;
            }
        }
    }
};


/* =========================================================
   WAV ENCODER
   ========================================================= */

function audioBufferToWav(buffer) {

    const channels =
        buffer.numberOfChannels;

    const length =
        buffer.length *
        channels *
        2 +
        44;

    const arrayBuffer =
        new ArrayBuffer(
            length
        );

    const view =
        new DataView(
            arrayBuffer
        );


    function writeString(
        offset,
        value
    ) {

        for (
            let i = 0;
            i < value.length;
            i++
        ) {

            view.setUint8(
                offset + i,
                value.charCodeAt(i)
            );
        }
    }


    writeString(
        0,
        "RIFF"
    );

    view.setUint32(
        4,
        length - 8,
        true
    );

    writeString(
        8,
        "WAVE"
    );

    writeString(
        12,
        "fmt "
    );

    view.setUint32(
        16,
        16,
        true
    );

    view.setUint16(
        20,
        1,
        true
    );

    view.setUint16(
        22,
        channels,
        true
    );

    view.setUint32(
        24,
        buffer.sampleRate,
        true
    );

    view.setUint32(
        28,
        buffer.sampleRate *
        channels *
        2,
        true
    );

    view.setUint16(
        32,
        channels * 2,
        true
    );

    view.setUint16(
        34,
        16,
        true
    );

    writeString(
        36,
        "data"
    );

    view.setUint32(
        40,
        length - 44,
        true
    );


    const channelData =
        [];

    for (
        let channel = 0;
        channel < channels;
        channel++
    ) {

        channelData.push(
            buffer.getChannelData(
                channel
            )
        );
    }


    let offset =
        44;


    for (
        let index = 0;
        index < buffer.length;
        index++
    ) {

        for (
            let channel = 0;
            channel < channels;
            channel++
        ) {

            const sample =
                Math.max(
                    -1,
                    Math.min(
                        1,
                        channelData[
                            channel
                        ][index] || 0
                    )
                );

            view.setInt16(
                offset,
                sample < 0
                    ? sample * 0x8000
                    : sample * 0x7fff,
                true
            );

            offset += 2;
        }
    }

    return view;
}


/* =========================================================
   START TRACK
   ========================================================= */

function startTrack(
    title,
    artist
) {

    console.log(
        `Playing: ${title} — ${artist}`
    );
}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
         * Beat Lab exists only on beatlab.html,
         * so this safely does nothing on the
         * other GrooveDNA pages.
         */

        BeatLab.init();


        const authForm =
            document.querySelector(
                "#authForm"
            );

        if (authForm) {

            authForm.addEventListener(
                "submit",
                async event => {

                    event.preventDefault();

                    const email =
                        document.querySelector(
                            "#authEmail"
                        )?.value?.trim();

                    const password =
                        document.querySelector(
                            "#authPassword"
                        )?.value;

                    if (
                        !email ||
                        !password
                    ) {

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


        if (
            document.querySelector(
                "#sampleGrid"
            ) ||
            document.querySelector(
                ".sample-grid"
            )
        ) {

            loadDatabaseTracksUI();
        }
    }
);


/* =========================================================
   GLOBAL LOG
   ========================================================= */

console.log(
    "GrooveDNA + Supabase + MusicBrainz + Beat Lab loaded."
);