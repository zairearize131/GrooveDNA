/* =========================================================
   GROOVEDNA
   MAIN JAVASCRIPT
   AUTH + NAVIGATION + DISCOVER + BEAT LAB + LIBRARY
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
} else {
    console.error(
        "GrooveDNA: Supabase library was not loaded."
    );
}


/* =========================================================
   SAFE DOM HELPERS
   ========================================================= */

const $ = (selector) =>
    document.querySelector(selector);

const $$ = (selector) =>
    document.querySelectorAll(selector);

function on(selector, event, handler) {
    const element = $(selector);

    if (element) {
        element.addEventListener(event, handler);
    }
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message) {

    let toast = $("#toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");

        document.body.appendChild(toast);
    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

let authMode = "signin";


/* ---------------------------------------------------------
   OPEN AUTH MODAL
   --------------------------------------------------------- */

function openAuthModal(mode = "signin") {

    const authBackdrop =
        $("#auth");

    if (!authBackdrop) {
        console.error(
            "GrooveDNA: #auth modal was not found."
        );

        return;
    }

    setAuthMode(mode);

    authBackdrop.classList.add("open");

    document.body.style.overflow = "hidden";

    setTimeout(() => {

        const email =
            $("#authEmail");

        if (email) {
            email.focus();
        }

    }, 100);
}


/* ---------------------------------------------------------
   CLOSE AUTH MODAL
   --------------------------------------------------------- */

function closeAuthModal() {

    const authBackdrop =
        $("#auth");

    if (!authBackdrop) {
        return;
    }

    authBackdrop.classList.remove("open");

    document.body.style.overflow = "";

}


/* ---------------------------------------------------------
   SET SIGN IN / SIGN UP MODE
   --------------------------------------------------------- */

function setAuthMode(mode) {

    authMode =
        mode === "signup"
            ? "signup"
            : "signin";

    const title =
        $("#authTitle");

    const submit =
        $("#authSubmit");

    const nameGroup =
        $("#authNameGroup");

    const toggleCopy =
        $("#authToggleCopy");

    const nameInput =
        $("#authName");

    if (authMode === "signup") {

        if (title) {
            title.textContent =
                "Create your GrooveDNA account";
        }

        if (submit) {
            submit.textContent =
                "Create Account";
        }

        if (nameGroup) {
            nameGroup.style.display = "";
        }

        if (nameInput) {
            nameInput.disabled = false;
        }

        if (toggleCopy) {
            toggleCopy.innerHTML =
                'Already have an account? <a href="#" id="authModeToggle">Sign in</a>';
        }

    } else {

        if (title) {
            title.textContent =
                "Enter your groove.";
        }

        if (submit) {
            submit.textContent =
                "Sign In";
        }

        if (nameGroup) {
            nameGroup.style.display = "none";
        }

        if (nameInput) {
            nameInput.disabled = true;
        }

        if (toggleCopy) {
            toggleCopy.innerHTML =
                'New to GrooveDNA? <a href="#" id="authModeToggle">Create an account</a>';
        }
    }
}


/* ---------------------------------------------------------
   HANDLE AUTH MODE TOGGLE
   --------------------------------------------------------- */

function handleAuthModeToggle(event) {

    event.preventDefault();

    setAuthMode(
        authMode === "signin"
            ? "signup"
            : "signin"
    );
}


/* ---------------------------------------------------------
   CREATE ACCOUNT
   --------------------------------------------------------- */

async function createAccount(
    email,
    password,
    displayName
) {

    if (!supabaseClient) {

        showToast(
            "Supabase is not connected."
        );

        return false;
    }

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.signUp({

                email: email,

                password: password,

                options: {
                    data: {
                        full_name:
                            displayName ||
                            "GrooveDNA Creator",

                        name:
                            displayName ||
                            "GrooveDNA Creator"
                    }
                }

            });


        if (error) {

            console.error(
                "GrooveDNA signup error:",
                error
            );

            showToast(
                error.message
            );

            return false;
        }


        if (!data.user) {

            showToast(
                "Account could not be created."
            );

            return false;
        }


        /*
         * Supabase may require email confirmation.
         */

        if (!data.session) {

            showToast(
                "Account created! Check your email to confirm your account."
            );

            closeAuthModal();

            return true;
        }


        /*
         * If email confirmation is disabled,
         * Supabase gives us a session immediately.
         */

        showToast(
            "Account created successfully!"
        );


        setTimeout(() => {

            window.location.replace(
                "profile.html"
            );

        }, 500);


        return true;

    } catch (error) {

        console.error(
            "Unexpected signup error:",
            error
        );

        showToast(
            "Something went wrong creating your account."
        );

        return false;
    }
}


/* ---------------------------------------------------------
   SIGN IN
   --------------------------------------------------------- */

async function signInUser(
    email,
    password
) {

    if (!supabaseClient) {

        showToast(
            "Supabase is not connected."
        );

        return false;
    }

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.signInWithPassword({

                email: email,

                password: password

            });


        if (error) {

            console.error(
                "GrooveDNA login error:",
                error
            );

            showToast(
                error.message
            );

            return false;
        }


        if (!data.session) {

            showToast(
                "Login failed. No active session was created."
            );

            return false;
        }


        showToast(
            "Welcome back to GrooveDNA!"
        );


        setTimeout(() => {

            window.location.replace(
                "profile.html"
            );

        }, 500);


        return true;

    } catch (error) {

        console.error(
            "Unexpected login error:",
            error
        );

        showToast(
            "Something went wrong signing in."
        );

        return false;
    }
}


/* ---------------------------------------------------------
   SIGN OUT
   --------------------------------------------------------- */

async function signOutUser() {

    if (!supabaseClient) {

        window.location.replace(
            "index.html"
        );

        return;
    }

    try {

        const {
            error
        } =
            await supabaseClient.auth.signOut();


        if (error) {

            console.error(
                "GrooveDNA sign out error:",
                error
            );

            showToast(
                error.message
            );

            return;
        }


        /*
         * Clear any locally stored GrooveDNA data
         * that should not remain on the signed-out device.
         */

        sessionStorage.removeItem(
            "grooveDNA_auth"
        );


        window.location.replace(
            "index.html"
        );

    } catch (error) {

        console.error(
            "Unexpected sign out error:",
            error
        );

        window.location.replace(
            "index.html"
        );
    }
}


/* =========================================================
   AUTH FORM
   ========================================================= */

function initializeAuthentication() {

    const authForm =
        $("#authForm");

    const authBackdrop =
        $("#auth");

    const signInLink =
        $("#signInLink");

    const createAccountLink =
        $("#createAccountLink");


    /*
     * Sign In button
     */

    if (signInLink) {

        signInLink.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                openAuthModal("signin");

            }
        );
    }


    /*
     * Create Account button
     */

    if (createAccountLink) {

        createAccountLink.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                openAuthModal("signup");

            }
        );
    }


    /*
     * Start listening button
     * also opens authentication.
     */

    $$('a[href="#auth"]').forEach(
        link => {

            link.addEventListener(
                "click",
                function(event) {

                    /*
                     * Don't override the
                     * Sign In/Create Account
                     * handlers above.
                     */

                    if (
                        link.id === "signInLink" ||
                        link.id === "createAccountLink"
                    ) {
                        return;
                    }

                    event.preventDefault();

                    openAuthModal("signin");

                }
            );

        }
    );


    /*
     * Close button
     */

    const closeButton =
        authBackdrop?.querySelector(
            ".modal-close"
        );

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                closeAuthModal();

            }
        );
    }


    /*
     * Click outside modal
     */

    if (authBackdrop) {

        authBackdrop.addEventListener(
            "click",
            function(event) {

                if (
                    event.target ===
                    authBackdrop
                ) {

                    closeAuthModal();

                }

            }
        );
    }


    /*
     * Toggle between Sign In
     * and Create Account.
     *
     * Event delegation is used so
     * the dynamically replaced
     * toggle link always works.
     */

    document.addEventListener(
        "click",
        function(event) {

            const toggle =
                event.target.closest(
                    "#authModeToggle"
                );

            if (!toggle) {
                return;
            }

            handleAuthModeToggle(
                event
            );

        }
    );


    /*
     * Authentication form submission
     */

    if (authForm) {

        authForm.addEventListener(
            "submit",
            async function(event) {

                event.preventDefault();


                const email =
                    $("#authEmail")?.value
                        .trim()
                        .toLowerCase();


                const password =
                    $("#authPassword")?.value;


                const displayName =
                    $("#authName")?.value
                        .trim();


                if (!email) {

                    showToast(
                        "Please enter your email."
                    );

                    return;
                }


                if (!password) {

                    showToast(
                        "Please enter your password."
                    );

                    return;
                }


                if (
                    authMode === "signup" &&
                    password.length < 6
                ) {

                    showToast(
                        "Your password must be at least 6 characters."
                    );

                    return;
                }


                const submitButton =
                    $("#authSubmit");


                if (submitButton) {

                    submitButton.disabled =
                        true;

                    submitButton.textContent =
                        authMode === "signup"
                            ? "Creating Account..."
                            : "Signing In...";
                }


                try {

                    if (
                        authMode === "signup"
                    ) {

                        await createAccount(
                            email,
                            password,
                            displayName
                        );

                    } else {

                        await signInUser(
                            email,
                            password
                        );
                    }

                } finally {

                    if (submitButton) {

                        submitButton.disabled =
                            false;

                        submitButton.textContent =
                            authMode === "signup"
                                ? "Create Account"
                                : "Sign In";
                    }
                }

            }
        );
    }


    /*
     * If someone loads index.html#auth,
     * automatically open the login modal.
     */

    if (
        authBackdrop &&
        window.location.hash === "#auth"
    ) {

        openAuthModal("signin");

    }


    /*
     * Initialize Sign In mode.
     */

    if (authForm) {

        setAuthMode("signin");

    }
}


/* =========================================================
   PROTECTED PAGES
   ========================================================= */

const publicPages = [
    "",
    "index.html",
    "index"
];


function getCurrentPage() {

    const path =
        window.location.pathname;

    const file =
        path.split("/").pop();

    return (
        file ||
        "index.html"
    ).toLowerCase();
}


async function protectPages() {

    if (!supabaseClient) {
        return;
    }


    const page =
        getCurrentPage();


    /*
     * Landing/login page is public.
     */

    if (
        publicPages.includes(page)
    ) {
        return;
    }


    /*
     * Check Supabase session.
     */

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "Session check failed:",
                error
            );

            return;
        }


        if (!data.session) {

            console.warn(
                "No active GrooveDNA session."
            );

            window.location.replace(
                "index.html"
            );

            return;
        }

    } catch (error) {

        console.error(
            "Protected page check failed:",
            error
        );
    }
}


/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfile() {

    if (!supabaseClient) {
        return;
    }


    const profileName =
        $("#profileName");

    const profileEmail =
        $("#profileEmail");

    const profileAvatar =
        $("#profileAvatar");


    if (
        !profileName &&
        !profileEmail &&
        !profileAvatar
    ) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getUser();


        if (error || !data.user) {

            window.location.replace(
                "index.html"
            );

            return;
        }


        const user =
            data.user;


        const metadata =
            user.user_metadata || {};


        const name =
            metadata.full_name ||
            metadata.name ||
            "GrooveDNA Creator";


        const email =
            user.email ||
            "";


        if (profileName) {

            profileName.textContent =
                name;

        }


        if (profileEmail) {

            profileEmail.textContent =
                email;

        }


        if (profileAvatar) {

            const initials =
                name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(
                        word =>
                            word
                                .charAt(0)
                                .toUpperCase()
                    )
                    .join("");


            profileAvatar.textContent =
                initials || "GD";
        }

    } catch (error) {

        console.error(
            "Could not load profile:",
            error
        );
    }
}


/* =========================================================
   SIGN OUT BUTTONS
   ========================================================= */

function initializeSignOut() {

    const signOutButtons =
        $$(
            "#signOutBtn, #footerSignOutBtn, [data-signout]"
        );


    signOutButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                async function(event) {

                    event.preventDefault();

                    await signOutUser();

                }
            );

        }
    );
}


/* =========================================================
   MOBILE NAVIGATION
   ========================================================= */

function initializeNavigation() {

    const menuToggle =
        $("#menuToggle");

    const mainNav =
        $("#mainNav");


    if (
        menuToggle &&
        mainNav
    ) {

        menuToggle.addEventListener(
            "click",
            function() {

                const open =
                    mainNav.classList.toggle(
                        "open"
                    );


                menuToggle.setAttribute(
                    "aria-expanded",
                    String(open)
                );

            }
        );


        mainNav
            .querySelectorAll("a")
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        function() {

                            mainNav.classList.remove(
                                "open"
                            );

                            menuToggle.setAttribute(
                                "aria-expanded",
                                "false"
                            );

                        }
                    );

                }
            );
    }
}


/* =========================================================
   DISCOVER
   ========================================================= */

const samples = [
    {
        id: 1,
        title: "Midnight Guitar Break",
        artist: "Demo Vault",
        genre: "Rock",
        type: "Guitar Riff",
        bpm: 112,
        key: "A Minor",
        rights: "Check Rights",
        icon: "🎸"
    },
    {
        id: 2,
        title: "Pocket Drums",
        artist: "Groove Archive",
        genre: "Funk",
        type: "Drum Break",
        bpm: 98,
        key: "C Minor",
        rights: "Cleared / Licensed",
        icon: "🥁"
    },
    {
        id: 3,
        title: "Velvet Keys",
        artist: "Soul Library",
        genre: "Soul",
        type: "Electric Piano",
        bpm: 84,
        key: "E♭ Major",
        rights: "Cleared / Licensed",
        icon: "🎹"
    },
    {
        id: 4,
        title: "Bassline 74",
        artist: "Funk Foundry",
        genre: "Funk",
        type: "Bassline",
        bpm: 96,
        key: "E Minor",
        rights: "Cleared / Licensed",
        icon: "🎸"
    },
    {
        id: 5,
        title: "Stadium Riff",
        artist: "Rock Archive",
        genre: "Rock",
        type: "Guitar Riff",
        bpm: 126,
        key: "D Major",
        rights: "Check Rights",
        icon: "⚡"
    },
    {
        id: 6,
        title: "Sunday Strings",
        artist: "Soul Library",
        genre: "Soul",
        type: "String Melody",
        bpm: 76,
        key: "G Major",
        rights: "Restricted",
        icon: "🎻"
    },
    {
        id: 7,
        title: "Neon Pocket",
        artist: "Afterdark Audio",
        genre: "R&B",
        type: "Drum & Percussion",
        bpm: 91,
        key: "F Minor",
        rights: "Cleared / Licensed",
        icon: "🌃"
    },
    {
        id: 8,
        title: "Blue Room Horns",
        artist: "Midnight Sessions",
        genre: "Jazz",
        type: "Horn Phrase",
        bpm: 88,
        key: "B♭ Major",
        rights: "Check Rights",
        icon: "🎷"
    },
    {
        id: 9,
        title: "Golden Chords",
        artist: "Analog House",
        genre: "Soul",
        type: "Guitar Chords",
        bpm: 82,
        key: "A Major",
        rights: "Cleared / Licensed",
        icon: "✨"
    }
];


let selectedGenre =
    "All";


let searchTerm =
    "";


let currentTrack =
    null;


let isPlaying =
    false;


function rightsClass(rights) {

    if (
        rights.startsWith(
            "Cleared"
        )
    ) {
        return "cleared";
    }

    if (
        rights === "Restricted"
    ) {
        return "restricted";
    }

    return "caution";
}


function filteredSamples() {

    return samples.filter(
        sample => {

            const genreMatch =
                selectedGenre === "All" ||
                sample.genre ===
                    selectedGenre;


            const text =
                `${sample.title}
                 ${sample.artist}
                 ${sample.genre}
                 ${sample.type}
                 ${sample.key}`
                    .toLowerCase();


            const searchMatch =
                text.includes(
                    searchTerm.toLowerCase()
                );


            return (
                genreMatch &&
                searchMatch
            );
        }
    );
}


function renderSamples() {

    const sampleGrid =
        $("#sampleGrid");

    if (!sampleGrid) {
        return;
    }


    const resultCount =
        $("#resultCount");


    const list =
        filteredSamples();


    if (resultCount) {

        resultCount.textContent =
            `${list.length} sound${
                list.length === 1
                    ? ""
                    : "s"
            } found`;
    }


    if (!list.length) {

        sampleGrid.innerHTML = `
            <div
                class="empty-state"
                style="grid-column:1/-1"
            >
                No sounds matched your search.
                Try another artist, instrument,
                or genre.
            </div>
        `;

        return;
    }


    sampleGrid.innerHTML =
        list.map(
            sample => `
                <article
                    class="sample-card"
                    data-genre="${sample.genre}"
                >

                    <div class="sample-art">

                        <span class="genre-tag">
                            ${sample.genre}
                        </span>

                        <span class="sample-icon">
                            ${sample.icon}
                        </span>

                    </div>

                    <div class="sample-info">

                        <h3>
                            ${sample.title}
                        </h3>

                        <p>
                            ${sample.type}
                            •
                            ${sample.artist}
                            <br>
                            ${sample.bpm} BPM
                            •
                            ${sample.key}
                        </p>

                        <span
                            class="rights ${rightsClass(
                                sample.rights
                            )}"
                        >
                            ${
                                sample.rights ===
                                "Restricted"
                                    ? "×"
                                    : sample.rights.startsWith(
                                        "Cleared"
                                    )
                                    ? "✓"
                                    : "!"
                            }
                            ${sample.rights}
                        </span>

                        <div class="sample-actions">

                            <button
                                type="button"
                                data-preview="${sample.id}"
                            >
                                ▶ Preview
                            </button>

                            <button
                                type="button"
                                data-save="${sample.id}"
                            >
                                ♡ Save
                            </button>

                            <button
                                type="button"
                                data-add="${sample.id}"
                            >
                                ＋ Beat Lab
                            </button>

                        </div>

                    </div>

                </article>
            `
        ).join("");
}


/* =========================================================
   DISCOVER CONTROLS
   ========================================================= */

function initializeDiscover() {

    $$(".filter").forEach(
        button => {

            button.addEventListener(
                "click",
                function() {

                    $$(".filter")
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );


                    button.classList.add(
                        "active"
                    );


                    selectedGenre =
                        button.dataset.genre ||
                        "All";


                    renderSamples();

                }
            );

        }
    );


    on(
        "#searchBtn",
        "click",
        runSearch
    );


    on(
        "#searchInput",
        "keydown",
        function(event) {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                runSearch();
            }

        }
    );


    const sampleGrid =
        $("#sampleGrid");


    if (sampleGrid) {

        sampleGrid.addEventListener(
            "click",
            function(event) {

                const preview =
                    event.target.closest(
                        "[data-preview]"
                    );


                const save =
                    event.target.closest(
                        "[data-save]"
                    );


                const add =
                    event.target.closest(
                        "[data-add]"
                    );


                if (preview) {

                    const sample =
                        samples.find(
                            item =>
                                item.id ==
                                preview.dataset.preview
                        );


                    if (sample) {

                        playTrack(
                            sample.title,
                            sample.icon,
                            sample.artist
                        );
                    }
                }


                if (save) {

                    const sample =
                        samples.find(
                            item =>
                                item.id ==
                                save.dataset.save
                        );


                    if (sample) {

                        let saved =
                            JSON.parse(
                                localStorage.getItem(
                                    "grooveDNA_saved"
                                ) || "[]"
                            );


                        if (
                            !saved.includes(
                                sample.id
                            )
                        ) {

                            saved.push(
                                sample.id
                            );
                        }


                        localStorage.setItem(
                            "grooveDNA_saved",
                            JSON.stringify(saved)
                        );


                        showToast(
                            `♡ "${sample.title}" saved to your collection.`
                        );
                    }
                }


                if (add) {

                    const sample =
                        samples.find(
                            item =>
                                item.id ==
                                add.dataset.add
                        );


                    const lanes =
                        $$(".track-lane");


                    const lane =
                        lanes[3] ||
                        lanes[2];


                    if (
                        sample &&
                        lane
                    ) {

                        const clip =
                            document.createElement(
                                "div"
                            );


                        clip.className =
                            "clip melody";


                        clip.style.width =
                            `${25 + Math.random() * 55}%`;


                        clip.title =
                            sample.title;


                        lane.appendChild(
                            clip
                        );


                        const empty =
                            $("#labEmpty");


                        if (empty) {

                            empty.style.display =
                                "none";
                        }


                        showToast(
                            `＋ "${sample.title}" added to Beat Lab.`
                        );
                    }
                }

            }
        );
    }
}


function runSearch() {

    const input =
        $("#searchInput");

    if (!input) {
        return;
    }


    searchTerm =
        input.value.trim();


    renderSamples();


    const content =
        document.querySelector(
            ".content-section"
        );


    if (content) {

        content.scrollIntoView({
            behavior: "smooth"
        });

    }
}


function renderStretch() {

    const stretchGrid =
        $("#stretchGrid");

    if (!stretchGrid) {
        return;
    }


    const picks = [
        samples[7],
        samples[6],
        samples[4]
    ];


    stretchGrid.innerHTML =
        picks.map(
            sample => `
                <article class="stretch-card">

                    <span class="big-icon">
                        ${sample.icon}
                    </span>

                    <div>

                        <strong>
                            ${sample.title}
                        </strong>

                        <p>
                            ${sample.artist}
                        </p>

                        <small>
                            ${sample.genre}
                            •
                            ${sample.bpm} BPM
                        </small>

                    </div>

                    <button
                        class="icon-btn"
                        type="button"
                        data-preview="${sample.id}"
                    >
                        ▶
                    </button>

                </article>
            `
        ).join("");
}


/* =========================================================
   PLAYER
   ========================================================= */

function playTrack(
    title,
    icon = "🎵",
    artist = "GrooveDNA Library"
) {

    currentTrack = {
        title,
        icon,
        artist
    };


    const playerTitle =
        $("#playerTitle");


    const playerArtist =
        $("#playerArtist");


    const playerCover =
        $("#playerCover");


    const playerPlay =
        $("#playerPlay");


    if (playerTitle) {

        playerTitle.textContent =
            title;
    }


    if (playerArtist) {

        playerArtist.textContent =
            artist;
    }


    if (playerCover) {

        playerCover.textContent =
            icon;
    }


    if (playerPlay) {

        playerPlay.textContent =
            "⏸";
    }


    isPlaying = true;


    showToast(
        `▶ Playing "${title}"`
    );
}


function togglePlayer() {

    if (!currentTrack) {

        playTrack(
            "Funky Guitar Break",
            "🎸",
            "Demo Vault"
        );

        return;
    }


    isPlaying =
        !isPlaying;


    const playerPlay =
        $("#playerPlay");


    if (playerPlay) {

        playerPlay.textContent =
            isPlaying
                ? "⏸"
                : "▶";
    }


    showToast(
        isPlaying
            ? `▶ Playing "${currentTrack.title}"`
            : "⏸ Playback paused"
    );
}


function initializePlayer() {

    on(
        "#playerPlay",
        "click",
        togglePlayer
    );


    on(
        "#prevBtn",
        "click",
        function() {
            showToast(
                "Previous track"
            );
        }
    );


    on(
        "#nextBtn",
        "click",
        function() {
            showToast(
                "Next track"
            );
        }
    );


    on(
        "#shuffleBtn",
        "click",
        function() {
            showToast(
                "Shuffle enabled"
            );
        }
    );


    $$("[data-demo-play]").forEach(
        button => {

            button.addEventListener(
                "click",
                function() {

                    playTrack(
                        button.dataset.title ||
                            "Funky Guitar Break",
                        "🎵",
                        "GrooveDNA Demo"
                    );

                }
            );

        }
    );
}


/* =========================================================
   AUDIO UPLOAD
   ========================================================= */

function initializeUpload() {

    const uploadInput =
        $("#audioUpload");


    if (!uploadInput) {
        return;
    }


    const uploadButtons =
        $(
            "#uploadBtn, #uploadBtn2"
        );


    if (uploadButtons) {

        uploadButtons
            .forEach?.(
                button => {}
            );
    }


    $(
        "#uploadBtn"
    )?.addEventListener(
        "click",
        function() {

            uploadInput.click();

        }
    );


    $(
        "#uploadBtn2"
    )?.addEventListener(
        "click",
        function() {

            uploadInput.click();

        }
    );


    uploadInput.addEventListener(
        "change",
        function() {

            const file =
                uploadInput.files?.[0];


            if (file) {

                showToast(
                    `🎙 "${file.name}" selected.`
                );
            }

        }
    );
}


/* =========================================================
   BEAT LAB
   ========================================================= */

function initializeBeatLab() {

    on(
        "#bpm",
        "input",
        function(event) {

            const value =
                $("#bpmValue");


            if (value) {

                value.textContent =
                    event.target.value;
            }

        }
    );


    on(
        "#pitch",
        "input",
        function(event) {

            const value =
                Number(
                    event.target.value
                );


            const output =
                $("#pitchValue");


            if (output) {

                output.textContent =
                    value > 0
                        ? `+${value}`
                        : value;
            }

        }
    );


    on(
        "#labPlay",
        "click",
        function() {

            const button =
                $("#labPlay");


            if (!button) {
                return;
            }


            const playing =
                button.textContent ===
                "▶";


            button.textContent =
                playing
                    ? "⏸"
                    : "▶";


            showToast(
                playing
                    ? "Beat Lab is playing."
                    : "Beat Lab stopped."
            );

        }
    );


    on(
        "#saveBeat",
        "click",
        function() {

            localStorage.setItem(
                "grooveDNA_beatSaved",
                "true"
            );


            showToast(
                "✓ Beat idea saved to your library!"
            );

        }
    );


    on(
        "#clearLab",
        "click",
        function() {

            $$(".timeline .clip")
                .forEach(
                    clip =>
                        clip.remove()
                );


            const empty =
                $("#labEmpty");


            if (empty) {

                empty.style.display =
                    "block";
            }


            showToast(
                "Beat Lab cleared."
            );

        }
    );


    on(
        "#generateBeat",
        "click",
        function() {

            const lanes =
                $$(".track-lane");


            const lane =
                lanes[3] ||
                lanes[2];


            if (!lane) {
                return;
            }


            const clip =
                document.createElement(
                    "div"
                );


            clip.className =
                "clip melody";


            clip.style.width =
                "68%";


            lane.appendChild(
                clip
            );


            const empty =
                $("#labEmpty");


            if (empty) {

                empty.style.display =
                    "none";
            }


            showToast(
                "✦ GrooveDNA generated a starting groove."
            );

        }
    );
}


/* =========================================================
   MOODS
   ========================================================= */

function initializeMoods() {

    $$(".mood-card").forEach(
        button => {

            button.addEventListener(
                "click",
                function() {

                    const mood =
                        button.dataset.mood ||
                        "Custom";


                    showToast(
                        `🎧 Building a ${mood} mix for you...`
                    );


                    setTimeout(
                        function() {

                            const discover =
                                $("#discover");


                            if (
                                discover
                            ) {

                                discover.scrollIntoView({
                                    behavior: "smooth"
                                });
                            }

                        },
                        200
                    );

                }
            );

        }
    );
}


/* =========================================================
   LIBRARY
   ========================================================= */

const playlists = [
    ["Late Night Soul", "24 tracks", "🌙"],
    ["Funk Essentials", "31 tracks", "🕺"],
    ["Guitar After Dark", "18 tracks", "🎸"],
    ["New DNA Discoveries", "16 tracks", "🧬"],
    ["Sunday Morning", "22 tracks", "☀️"],
    ["Deep Focus", "42 tracks", "◌"],
    ["Analog Heat", "27 tracks", "🔥"],
    ["Saved Samples", "38 sounds", "＋"]
];


function renderPlaylists() {

    const grid =
        $("#playlistGrid");


    if (!grid) {
        return;
    }


    const saved =
        JSON.parse(
            localStorage.getItem(
                "grooveDNA_saved"
            ) || "[]"
        );


    grid.innerHTML =
        playlists.map(
            (playlist, index) => `

                <article class="playlist-card">

                    <div class="playlist-art">
                        ${playlist[2]}
                    </div>

                    <strong>
                        ${playlist[0]}
                    </strong>

                    <small>
                        ${playlist[1]}
                        ${
                            index === 7 &&
                            saved.length
                                ? ` • ${saved.length} saved`
                                : ""
                        }
                    </small>

                </article>

            `
        ).join("");
}


function initializeLibrary() {

    $$(".library-tab").forEach(
        button => {

            button.addEventListener(
                "click",
                function() {

                    $$(".library-tab")
                        .forEach(
                            tab =>
                                tab.classList.remove(
                                    "active"
                                )
                        );


                    button.classList.add(
                        "active"
                    );


                    showToast(
                        `Library: ${button.textContent.trim()}`
                    );

                }
            );

        }
    );


    on(
        "#newPlaylist",
        "click",
        function() {

            showToast(
                "New playlist creator opened."
            );

        }
    );
}


/* =========================================================
   COMMUNITY
   ========================================================= */

function initializeCommunity() {

    $$("[data-like]").forEach(
        button => {

            button.addEventListener(
                "click",
                function() {

                    const count =
                        button.querySelector(
                            "span"
                        );


                    if (count) {

                        count.textContent =
                            Number(
                                count.textContent
                            ) + 1;
                    }


                    button.firstChild.textContent =
                        "♥ ";


                    showToast(
                        "♥ Added to your liked activity."
                    );

                }
            );

        }
    );


    $$("[data-follow]").forEach(
        button => {

            button.addEventListener(
                "click",
                function() {

                    button.textContent =
                        "✓ Following";


                    showToast(
                        "Following creator."
                    );

                }
            );

        }
    );


    $$("[data-remix]").forEach(
        button => {

            button.addEventListener(
                "click",
                function() {

                    window.location.href =
                        "beatlab.html";

                }
            );

        }
    );


    on(
        "#joinChallenge",
        "click",
        function() {

            showToast(
                "🔥 You joined the Flip the Funk challenge!"
            );

        }
    );


    on(
        "#challengeBtn",
        "click",
        function() {

            showToast(
                "🔥 Weekly Challenge opened."
            );

        }
    );


    on(
        "#dnaMatch",
        "click",
        function() {

            showToast(
                "🧬 DNA Match opened."
            );

        }
    );


    on(
        "#shareDNA",
        "click",
        async function() {

            const url =
                window.location.href;


            try {

                if (
                    navigator.clipboard
                ) {

                    await navigator.clipboard.writeText(
                        url
                    );

                    showToast(
                        "🧬 GrooveDNA profile link copied!"
                    );

                } else {

                    showToast(
                        "🧬 Profile link ready to share."
                    );
                }

            } catch {

                showToast(
                    "🧬 Profile link ready to share."
                );
            }

        }
    );
}


/* =========================================================
   SETTINGS
   ========================================================= */

const settingsData = {

    account: [
        [
            "Display name",
            "Visible",
            "Edit your public creator identity"
        ],
        [
            "Public profile",
            "Visible",
            "Let other creators discover your profile"
        ],
        [
            "Email updates",
            "On",
            "Occasional product updates"
        ]
    ],

    playback: [
        [
            "Autoplay",
            "On",
            "Continue with similar music"
        ],
        [
            "Crossfade",
            "On",
            "Blend tracks smoothly"
        ],
        [
            "High quality audio",
            "On",
            "Use higher-quality streaming"
        ]
    ],

    notifications: [
        [
            "New releases",
            "On",
            "Artists you follow"
        ],
        [
            "Recommendations",
            "On",
            "Weekly GrooveDNA picks"
        ],
        [
            "Community activity",
            "On",
            "Likes, follows and remixes"
        ]
    ],

    privacy: [
        [
            "Private listening",
            "Off",
            "Hide listening activity from followers"
        ],
        [
            "Public playlists",
            "On",
            "Allow others to view your public playlists"
        ],
        [
            "Personalized recommendations",
            "On",
            "Use activity to improve recommendations"
        ]
    ],

    appearance: [
        [
            "Dark theme",
            "On",
            "GrooveDNA's signature theme"
        ],
        [
            "Motion effects",
            "On",
            "Animated transitions and visualizations"
        ],
        [
            "Compact player",
            "Off",
            "Use a smaller persistent player"
        ]
    ]
};


function renderSettings(
    key = "account"
) {

    const title =
        $("#settingsTitle");

    const list =
        $("#settingsList");


    if (!title || !list) {
        return;
    }


    const settings =
        settingsData[key] ||
        settingsData.account;


    title.textContent =
        `${key.charAt(0).toUpperCase()}${key.slice(1)} settings`;


    list.innerHTML =
        settings.map(
            setting => `

                <div class="setting-row">

                    <div>

                        <strong>
                            ${setting[0]}
                        </strong>

                        <small>
                            ${setting[2]}
                        </small>

                    </div>

                    <label class="switch">

                        <input
                            type="checkbox"
                            ${
                                setting[1] === "On" ||
                                setting[1] === "Visible"
                                    ? "checked"
                                    : ""
                            }
                        >

                        <span></span>

                    </label>

                </div>

            `
        ).join("");
}


function initializeSettings() {

    $$(".settings-tab").forEach(
        button => {

            button.addEventListener(
                "click",
                function() {

                    $$(".settings-tab")
                        .forEach(
                            tab =>
                                tab.classList.remove(
                                    "active"
                                )
                        );


                    button.classList.add(
                        "active"
                    );


                    renderSettings(
                        button.dataset.settings ||
                        "account"
                    );

                }
            );

        }
    );


    renderSettings();
}


/* =========================================================
   PAGE INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        /*
         * Authentication
         */

        initializeAuthentication();

        initializeSignOut();

        initializeNavigation();


        /*
         * Check protected pages.
         */

        await protectPages();


        /*
         * Load profile information.
         */

        await loadProfile();


        /*
         * Discover
         */

        renderSamples();

        renderStretch();

        initializeDiscover();


        /*
         * Player
         */

        initializePlayer();


        /*
         * Upload
         */

        initializeUpload();


        /*
         * Beat Lab
         */

        initializeBeatLab();


        /*
         * Mood controls
         */

        initializeMoods();


        /*
         * Library
         */

        renderPlaylists();

        initializeLibrary();


        /*
         * Community
         */

        initializeCommunity();


        /*
         * Settings
         */

        initializeSettings();


        console.log(
            "GrooveDNA JavaScript loaded successfully."
        );

    }
);
