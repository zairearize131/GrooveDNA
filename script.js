/* =========================================================
   GROOVEDNA AUTHENTICATION
   Supabase Login / Signup / Logout / Protected Pages
   ========================================================= */

const SUPABASE_URL = "https://nzfzcnusmjboykledznh.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_qsskdrsPBxg1dECb1HY8Jg_x0rL7wR3";

let supabaseClient = null;

if (window.supabase) {
    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );
} else {
    console.error("Supabase library failed to load.");
}


/* =========================================================
   AUTH STATE
   ========================================================= */

let currentUser = null;

async function getCurrentUser() {

    if (!supabaseClient) {
        console.error("Supabase is not initialized.");
        return null;
    }

    try {

        const {
            data,
            error
        } = await supabaseClient.auth.getUser();

        if (error) {
            console.warn("No authenticated user:", error.message);
            return null;
        }

        currentUser = data?.user || null;

        return currentUser;

    } catch (error) {

        console.error(
            "Could not get current user:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser(email, password) {

    if (!supabaseClient) {

        alert(
            "GrooveDNA authentication is unavailable. Please refresh the page."
        );

        return false;
    }

    email = String(email || "").trim();
    password = String(password || "");

    if (!email || !password) {

        alert(
            "Please enter your email and password."
        );

        return false;
    }

    try {

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

            alert(
                getFriendlyAuthError(error)
            );

            return false;
        }

        currentUser = data?.user || null;

        if (!currentUser) {

            alert(
                "Login succeeded, but GrooveDNA could not find your account session."
            );

            return false;
        }

        console.log(
            "GrooveDNA login successful:",
            currentUser.email
        );

        return true;

    } catch (error) {

        console.error(
            "Unexpected login error:",
            error
        );

        alert(
            "Something went wrong while signing in. Please try again."
        );

        return false;
    }
}


/* =========================================================
   SIGN UP
   ========================================================= */

async function signupUser(
    email,
    password,
    displayName = ""
) {

    if (!supabaseClient) {

        alert(
            "GrooveDNA authentication is unavailable. Please refresh the page."
        );

        return {
            success: false,
            needsConfirmation: false
        };
    }

    email = String(email || "").trim();
    password = String(password || "");
    displayName = String(displayName || "").trim();

    if (!email || !password) {

        alert(
            "Please enter your email and password."
        );

        return {
            success: false,
            needsConfirmation: false
        };
    }

    if (password.length < 6) {

        alert(
            "Your password must be at least 6 characters."
        );

        return {
            success: false,
            needsConfirmation: false
        };
    }

    try {

        const {
            data,
            error
        } = await supabaseClient.auth.signUp({

            email: email,

            password: password,

            options: {
                data: {
                    full_name: displayName
                }
            }
        });

        if (error) {

            console.error(
                "Signup error:",
                error
            );

            alert(
                getFriendlyAuthError(error)
            );

            return {
                success: false,
                needsConfirmation: false
            };
        }

        const user = data?.user || null;

        if (!user) {

            alert(
                "Your account could not be created."
            );

            return {
                success: false,
                needsConfirmation: false
            };
        }

        currentUser = user;

        /*
         * If Supabase requires email confirmation,
         * session will be null here.
         */

        if (!data.session) {

            console.log(
                "Account created. Email confirmation required."
            );

            return {
                success: true,
                needsConfirmation: true,
                user: user
            };
        }

        /*
         * If email confirmation is disabled,
         * the user is already logged in.
         */

        await createOrUpdateProfile(
            user.id,
            displayName,
            email
        );

        return {
            success: true,
            needsConfirmation: false,
            user: user
        };

    } catch (error) {

        console.error(
            "Unexpected signup error:",
            error
        );

        alert(
            "Something went wrong while creating your account."
        );

        return {
            success: false,
            needsConfirmation: false
        };
    }
}


/* =========================================================
   CREATE / UPDATE PROFILE
   ========================================================= */

async function createOrUpdateProfile(
    userId,
    displayName = "",
    email = ""
) {

    if (!supabaseClient || !userId) {
        return null;
    }

    try {

        const profile = {

            id: userId,

            email: email || null,

            full_name: displayName || null,

            updated_at: new Date().toISOString()
        };

        const {
            data,
            error
        } = await supabaseClient
            .from("profiles")
            .upsert(
                profile,
                {
                    onConflict: "id"
                }
            )
            .select()
            .single();

        if (error) {

            console.error(
                "Profile database error:",
                error
            );

            return null;
        }

        return data || null;

    } catch (error) {

        console.error(
            "Could not save profile:",
            error
        );

        return null;
    }
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutUser() {

    if (!supabaseClient) {

        window.location.href = "index.html";

        return;
    }

    try {

        const {
            error
        } = await supabaseClient.auth.signOut();

        if (error) {

            console.error(
                "Logout error:",
                error
            );

            alert(
                "Could not sign you out. Please try again."
            );

            return;
        }

        currentUser = null;

        /*
         * Make sure the browser leaves the protected page.
         */

        window.location.replace(
            "index.html"
        );

    } catch (error) {

        console.error(
            "Unexpected logout error:",
            error
        );

        window.location.replace(
            "index.html"
        );
    }
}


/* =========================================================
   PROTECTED PAGE CHECK
   ========================================================= */

async function requireAuthentication() {

    const user = await getCurrentUser();

    if (!user) {

        console.warn(
            "No active GrooveDNA session. Redirecting to login."
        );

        window.location.replace(
            "index.html"
        );

        return null;
    }

    console.log(
        "Authenticated GrooveDNA user:",
        user.email
    );

    return user;
}


/* =========================================================
   AUTH ERROR MESSAGES
   ========================================================= */

function getFriendlyAuthError(error) {

    const message =
        String(error?.message || "").toLowerCase();

    if (
        message.includes("invalid login credentials")
    ) {
        return "Incorrect email or password.";
    }

    if (
        message.includes("email not confirmed")
    ) {
        return "Please confirm your email address before signing in.";
    }

    if (
        message.includes("user already registered")
    ) {
        return "An account with this email already exists. Try signing in instead.";
    }

    if (
        message.includes("password should be at least")
    ) {
        return "Your password is too short.";
    }

    if (
        message.includes("rate limit")
    ) {
        return "Too many attempts. Please wait a moment and try again.";
    }

    return (
        error?.message ||
        "Authentication failed. Please try again."
    );
}


/* =========================================================
   AUTH MODE
   ========================================================= */

let authMode = "signin";


function setAuthMode(mode) {

    authMode =
        mode === "signup"
            ? "signup"
            : "signin";

    const authTitle =
        document.getElementById("authTitle");

    const authSubmit =
        document.getElementById("authSubmit");

    const authNameGroup =
        document.getElementById("authNameGroup");

    const authToggleCopy =
        document.getElementById("authToggleCopy");

    if (authMode === "signup") {

        if (authTitle) {
            authTitle.textContent =
                "Create your GrooveDNA account";
        }

        if (authSubmit) {
            authSubmit.textContent =
                "Create account";
        }

        if (authNameGroup) {
            authNameGroup.style.display =
                "";
        }

        if (authToggleCopy) {

            authToggleCopy.innerHTML =
                'Already have an account? <a href="#" id="authModeToggle">Sign in</a>';
        }

    } else {

        if (authTitle) {
            authTitle.textContent =
                "Enter your groove.";
        }

        if (authSubmit) {
            authSubmit.textContent =
                "Sign In";
        }

        if (authNameGroup) {
            authNameGroup.style.display =
                "none";
        }

        if (authToggleCopy) {

            authToggleCopy.innerHTML =
                'New to GrooveDNA? <a href="#" id="authModeToggle">Create an account</a>';
        }
    }
}


/* =========================================================
   LOGIN / SIGNUP FORM
   ========================================================= */

async function handleAuthSubmit(
    email,
    password,
    displayName
) {

    if (authMode === "signup") {

        const result =
            await signupUser(
                email,
                password,
                displayName
            );

        if (!result.success) {
            return false;
        }

        /*
         * Supabase requires email confirmation.
         */

        if (result.needsConfirmation) {

            alert(
                "Your GrooveDNA account has been created. Please check your email and confirm your account before signing in."
            );

            setAuthMode("signin");

            return true;
        }

        /*
         * User is already authenticated.
         */

        window.location.replace(
            "profile.html"
        );

        return true;
    }

    /*
     * SIGN IN
     */

    const success =
        await loginUser(
            email,
            password
        );

    if (!success) {
        return false;
    }

    window.location.replace(
        "profile.html"
    );

    return true;
}


/* =========================================================
   AUTH PAGE INITIALIZATION
   ========================================================= */

function initializeAuthPage() {

    const authForm =
        document.getElementById("authForm");

    if (!authForm) {
        return;
    }

    setAuthMode("signin");

    authForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const email =
                document
                    .getElementById("authEmail")
                    ?.value
                    ?.trim();

            const password =
                document
                    .getElementById("authPassword")
                    ?.value || "";

            const displayName =
                document
                    .getElementById("authName")
                    ?.value
                    ?.trim() || "";

            const submitButton =
                document.getElementById(
                    "authSubmit"
                );

            if (!email || !password) {

                alert(
                    "Please enter your email and password."
                );

                return;
            }

            if (authMode === "signup" && !displayName) {

                alert(
                    "Please enter your name."
                );

                return;
            }

            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.dataset.originalText =
                    submitButton.textContent;

                submitButton.textContent =
                    authMode === "signup"
                        ? "Creating account..."
                        : "Signing in...";
            }

            try {

                await handleAuthSubmit(
                    email,
                    password,
                    displayName
                );

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        submitButton.dataset.originalText ||
                        (
                            authMode === "signup"
                                ? "Create account"
                                : "Sign In"
                        );
                }
            }
        }
    );

    /*
     * Use event delegation so the Sign In /
     * Create Account toggle continues working
     * after its HTML is replaced.
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

            event.preventDefault();

            setAuthMode(
                authMode === "signin"
                    ? "signup"
                    : "signin"
            );
        }
    );
}


/* =========================================================
   SIGN OUT BUTTONS
   ========================================================= */

function initializeLogoutButtons() {

    const logoutButtons =
        document.querySelectorAll(
            "[data-logout]"
        );

    logoutButtons.forEach(
        function(button) {

            button.addEventListener(
                "click",
                async function(event) {

                    event.preventDefault();

                    await logoutUser();
                }
            );
        }
    );
}


/* =========================================================
   PROTECTED PAGES
   ========================================================= */

async function initializeProtectedPage() {

    /*
     * Do not protect the login page itself.
     */

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

    const publicPages = [
        "",
        "index.html",
        "login.html"
    ];

    if (
        publicPages.includes(
            currentPage
        )
    ) {
        return;
    }

    /*
     * Only run the authentication check
     * after Supabase has initialized.
     */

    const user =
        await requireAuthentication();

    if (!user) {
        return;
    }

    /*
     * Display the authenticated user's
     * information if the page supports it.
     */

    const emailElements =
        document.querySelectorAll(
            "[data-user-email]"
        );

    emailElements.forEach(
        element => {
            element.textContent =
                user.email || "";
        }
    );

    const name =
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Creator";

    const nameElements =
        document.querySelectorAll(
            "[data-user-name]"
        );

    nameElements.forEach(
        element => {
            element.textContent =
                name;
        }
    );
}


/* =========================================================
   AUTH SESSION LISTENER
   ========================================================= */

function initializeAuthListener() {

    if (!supabaseClient) {
        return;
    }

    supabaseClient.auth.onAuthStateChange(
        function(event, session) {

            console.log(
                "GrooveDNA auth event:",
                event
            );

            currentUser =
                session?.user || null;
        }
    );
}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        initializeAuthPage();

        initializeLogoutButtons();

        initializeAuthListener();

        await initializeProtectedPage();
    }
);
