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