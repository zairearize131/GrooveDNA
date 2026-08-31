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


// --- Auth UI toggle + signup/profile creation helpers ---

let authMode = "signin"; // "signin" or "signup"

function setAuthMode(mode) {
    authMode = mode;
    const authTitle = document.getElementById("authTitle");
    const authSubmit = document.getElementById("authSubmit");
    const authNameGroup = document.getElementById("authNameGroup");

    if (mode === "signup") {
        if (authTitle) authTitle.textContent = "Create your GrooveDNA account";
        if (authSubmit) authSubmit.textContent = "Create account";
        if (authNameGroup) authNameGroup.style.display = ""; // show
    } else {
        if (authTitle) authTitle.textContent = "Enter your groove.";
        if (authSubmit) authSubmit.textContent = "Sign In";
        if (authNameGroup) authNameGroup.style.display = "none"; // hide
    }
}

// Create a profile row in the `profiles` table (assumes 'id' is user's auth uid)
async function createProfileRow(userId, displayName = "", email = "") {
    if (!supabaseClient || !userId) return null;

    const profile = {
        id: userId, // use auth UID as PK if you want
        email: email || null,
        full_name: displayName || null,
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
        .from("profiles")
        .insert([profile])
        .select()
        .single();

    if (error) {
        console.error("Could not create profile row:", error);
        return null;
    }

    return data || null;
}

// Updated submit handling logic — call this from DOMContentLoaded submit handler
async function handleAuthSubmit(email, password, displayName) {
    if (authMode === "signup") {
        // 1) sign up
        const signedUp = await signupUser(email, password);

        if (!signedUp) {
            // signupUser already alerts on error
            return false;
        }

        // 2) try to get the newly created user object (may require confirmation depending on supabase settings)
        try {
            const { data: userData, error: userError } = await supabaseClient.auth.getUser();
            if (userError) {
                console.warn("getUser after signUp returned error:", userError);
            }

            const user = userData?.user || null;

            // If create succeeded and we have a user id, create profile row
            if (user?.id) {
                await createProfileRow(user.id, displayName || "", email);
            } else {
                // If there's no user (email confirmation required), we can't create a profile yet.
                // Tell the user to check their email and stop here.
                alert("Account created — check your email to confirm and then sign in.");
                return true;
            }

            // 3) try to sign the user in immediately (if signUp didn't already sign them in)
            const signedIn = await loginUser(email, password);
            if (signedIn) {
                window.location.href = "profile.html";
                return true;
            } else {
                alert("Account created. Please sign in using your credentials.");
                return true;
            }
        } catch (err) {
            console.error("Error post-signup:", err);
            alert("Account created but something went wrong — please sign in.");
            return true;
        }
    } else {
        // signin mode
        const ok = await loginUser(email, password);
        if (ok) {
            window.location.href = "profile.html";
        }
        return ok;
    }
}

// Wire up the toggle control and ensure the modal uses the new submit handler
document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("authModeToggle");
    if (toggle) {
        toggle.addEventListener("click", (e) => {
            e.preventDefault();
            setAuthMode(authMode === "signin" ? "signup" : "signin");
            const toggleCopy = document.getElementById("authToggleCopy");
            if (authMode === "signup") {
                if (toggleCopy) toggleCopy.innerHTML = 'Already have an account? <a href="#" id="authModeToggle">Sign in</a>';
            } else {
                if (toggleCopy) toggleCopy.innerHTML = 'New to GrooveDNA? <a href="#" id="authModeToggle">Create an account</a>';
            }
            const newToggle = document.getElementById("authModeToggle");
            if (newToggle) {
                newToggle.addEventListener("click", (ev) => {
                    ev.preventDefault();
                    setAuthMode(authMode === "signin" ? "signup" : "signin");
                });
            }
        });
    }

    // set initial mode explicitly in case UI should show/hide name
    setAuthMode("signin");

    // replace existing auth submit handling if present
    const authForm = document.querySelector("#authForm");
    if (authForm) {
        const clone = authForm.cloneNode(true);
        authForm.parentNode.replaceChild(clone, authForm);

        clone.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = document.querySelector("#authEmail")?.value?.trim();
            const password = document.querySelector("#authPassword")?.value;
            const displayName = document.querySelector("#authName")?.value?.trim();

            if (!email || !password) {
                alert("Please enter your email and password.");
                return;
            }

            await handleAuthSubmit(email, password, displayName);
        });
    }
});


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

    // ... rest of BeatLab unchanged (file continues)
