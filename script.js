/* =========================================================
   GROOVEDNA — SUPABASE AUTHENTICATION
   ========================================================= */

const SUPABASE_URL =
  "https://nzfzcnusmjboykledznh.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_qsskdrsPBxg1dECb1HY8Jg_x0rL7wR3";

let supabaseClient = null;


/* =========================================================
   INITIALIZE SUPABASE
   ========================================================= */

function initializeSupabase() {

  if (!window.supabase) {
    console.error(
      "Supabase JavaScript library was not loaded."
    );

    return null;
  }

  if (supabaseClient) {
    return supabaseClient;
  }

  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

  window.supabaseClient =
    supabaseClient;

  return supabaseClient;
}


/* =========================================================
   GROOVEDNA GLOBAL STATE
   ========================================================= */

window.GrooveDNA =
  window.GrooveDNA || {

    user: null,

    session: null,

    profile: null,

    authMode: "signin",

    currentBeat: {
      bpm: 96,
      pitch: 0,
      loop: false,
      clips: []
    }

  };


/* =========================================================
   GET CURRENT SESSION
   ========================================================= */

async function getCurrentSession() {

  const client =
    initializeSupabase();

  if (!client) {
    return null;
  }

  try {

    const {
      data,
      error
    } =
      await client.auth.getSession();

    if (error) {
      console.error(
        "Unable to get Supabase session:",
        error
      );

      return null;
    }

    window.GrooveDNA.session =
      data.session || null;

    window.GrooveDNA.user =
      data.session?.user || null;

    return data.session || null;

  } catch (error) {

    console.error(
      "Session error:",
      error
    );

    return null;
  }
}


/* =========================================================
   SWITCH AUTH MODE
   ========================================================= */

function setAuthMode(mode) {

  const authTitle =
    document.getElementById(
      "authTitle"
    );

  const authNameGroup =
    document.getElementById(
      "authNameGroup"
    );

  const authName =
    document.getElementById(
      "authName"
    );

  const authSubmit =
    document.getElementById(
      "authSubmit"
    );

  const authToggleCopy =
    document.getElementById(
      "authToggleCopy"
    );

  window.GrooveDNA.authMode =
    mode;

  const creatingAccount =
    mode === "signup";

  if (authTitle) {

    authTitle.textContent =
      creatingAccount
        ? "Create Account"
        : "Sign In";

  }

  if (authNameGroup) {

    authNameGroup.classList.toggle(
      "hidden",
      !creatingAccount
    );

  }

  if (authName) {

    authName.required =
      creatingAccount;

  }

  if (authSubmit) {

    authSubmit.textContent =
      creatingAccount
        ? "Create Account"
        : "Sign In";

  }

  if (authToggleCopy) {

    authToggleCopy.textContent =
      creatingAccount
        ? "Already have an account? Sign in"
        : "Don't have an account? Create one";

  }

}


/* =========================================================
   SHOW ACCOUNT VIEW
   ========================================================= */

function showAccountView() {

  const accountView =
    document.getElementById(
      "accountView"
    );

  const homeView =
    document.getElementById(
      "homeView"
    );

  if (accountView) {

    accountView.classList.add(
      "active"
    );

    accountView.classList.remove(
      "hidden"
    );

  }

  if (homeView) {

    homeView.classList.add(
      "hidden"
    );

    homeView.classList.remove(
      "active"
    );

  }

  window.GrooveDNA.currentPage =
    "account";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   SHOW HOME VIEW
   ========================================================= */

function showHomeView() {

  const accountView =
    document.getElementById(
      "accountView"
    );

  const homeView =
    document.getElementById(
      "homeView"
    );

  if (homeView) {

    homeView.classList.add(
      "active"
    );

    homeView.classList.remove(
      "hidden"
    );

  }

  if (accountView) {

    accountView.classList.add(
      "hidden"
    );

    accountView.classList.remove(
      "active"
    );

  }

  window.GrooveDNA.currentPage =
    "home";

  window.location.hash =
    "home";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   CREATE ACCOUNT
   ========================================================= */

async function createAccount(
  email,
  password,
  displayName
) {

  const client =
    initializeSupabase();

  if (!client) {

    return {
      user: null,
      session: null,
      error: new Error(
        "Supabase is unavailable."
      )
    };

  }

  try {

    const redirectUrl =
      `${window.location.origin}${window.location.pathname}#home`;

    const {
      data,
      error
    } =
      await client.auth.signUp({

        email:
          email.trim(),

        password:

          password,

        options: {

          data: {

            display_name:
              displayName.trim()

          },

          emailRedirectTo:
            redirectUrl

        }

      });

    if (error) {

      console.error(
        "Create account error:",
        error
      );

      return {
        user: null,
        session: null,
        error
      };

    }

    window.GrooveDNA.user =
      data.user || null;

    window.GrooveDNA.session =
      data.session || null;

    return {

      user:
        data.user || null,

      session:
        data.session || null,

      error:
        null

    };

  } catch (error) {

    console.error(
      "Create account exception:",
      error
    );

    return {
      user: null,
      session: null,
      error
    };

  }

}


/* =========================================================
   SIGN IN
   ========================================================= */

async function signIn(
  email,
  password
) {

  const client =
    initializeSupabase();

  if (!client) {

    return {
      user: null,
      session: null,
      error: new Error(
        "Supabase is unavailable."
      )
    };

  }

  try {

    const {
      data,
      error
    } =
      await client.auth.signInWithPassword({

        email:
          email.trim(),

        password:
          password

      });

    if (error) {

      console.error(
        "Sign in error:",
        error
      );

      return {
        user: null,
        session: null,
        error
      };

    }

    window.GrooveDNA.user =
      data.user || null;

    window.GrooveDNA.session =
      data.session || null;

    return {

      user:
        data.user || null,

      session:
        data.session || null,

      error:
        null

    };

  } catch (error) {

    console.error(
      "Sign in exception:",
      error
    );

    return {
      user: null,
      session: null,
      error
    };

  }

}


/* =========================================================
   SIGN OUT
   ========================================================= */

async function signOut() {

  const client =
    initializeSupabase();

  if (!client) {
    return false;
  }

  try {

    const {
      error
    } =
      await client.auth.signOut();

    if (error) {

      console.error(
        "Sign out error:",
        error
      );

      return false;

    }

    window.GrooveDNA.user =
      null;

    window.GrooveDNA.session =
      null;

    window.GrooveDNA.profile =
      null;

    showAccountView();

    setAuthMode(
      "signin"
    );

    showToast(
      "You have been signed out.",
      "success"
    );

    return true;

  } catch (error) {

    console.error(
      "Sign out exception:",
      error
    );

    return false;

  }

}


/* =========================================================
   PASSWORD RESET
   ========================================================= */

async function resetPassword(
  email
) {

  const client =
    initializeSupabase();

  if (!client) {
    return false;
  }

  try {

    const redirectUrl =
      `${window.location.origin}${window.location.pathname}#account`;

    const {
      error
    } =
      await client.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo:
            redirectUrl
        }
      );

    if (error) {

      console.error(
        "Password reset error:",
        error
      );

      showError(
        error.message
      );

      return false;

    }

    showSuccess(
      "Password reset instructions were sent to your email."
    );

    return true;

  } catch (error) {

    console.error(
      "Password reset exception:",
      error
    );

    showError(
      "Unable to send password reset instructions."
    );

    return false;

  }

}


/* =========================================================
   AUTH ERROR MESSAGES
   ========================================================= */

function friendlyAuthError(
  error
) {

  if (!error) {
    return "Authentication failed.";
  }

  const message =
    String(
      error.message || error
    );

  const lower =
    message.toLowerCase();

  if (
    lower.includes(
      "invalid login credentials"
    )
  ) {

    return (
      "The email address or password is incorrect."
    );

  }

  if (
    lower.includes(
      "email not confirmed"
    )
  ) {

    return (
      "Please confirm your email address before signing in."
    );

  }

  if (
    lower.includes(
      "password should be at least"
    )
  ) {

    return (
      "Your password must contain at least 6 characters."
    );

  }

  if (
    lower.includes(
      "user already registered"
    )
  ) {

    return (
      "An account with this email already exists. Please sign in."
    );

  }

  return message;
}


/* =========================================================
   REQUIRE AUTHENTICATION
   ========================================================= */

async function requireAuthentication() {

  const session =
    await getCurrentSession();

  if (session) {

    return true;

  }

  showAccountView();

  showError(
    "Please sign in to use this feature."
  );

  return false;

}


/* =========================================================
   AUTH FORM
   ========================================================= */

function setupAuthForm() {

  const authForm =
    document.getElementById(
      "authForm"
    );

  if (!authForm) {
    return;
  }

  const authName =
    document.getElementById(
      "authName"
    );

  const authEmail =
    document.getElementById(
      "authEmail"
    );

  const authPassword =
    document.getElementById(
      "authPassword"
    );

  const authSubmit =
    document.getElementById(
      "authSubmit"
    );

  const authToggleCopy =
    document.getElementById(
      "authToggleCopy"
    );

  const signOutBtn =
    document.getElementById(
      "signOutBtn"
    );


  /* -------------------------------------------------------
     CREATE ACCOUNT / SIGN IN
     ------------------------------------------------------- */

  authForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const email =
        authEmail?.value.trim() || "";

      const password =
        authPassword?.value || "";

      const displayName =
        authName?.value.trim() || "";

      const mode =
        window.GrooveDNA.authMode;


      if (!email) {

        showError(
          "Please enter your email address."
        );

        authEmail?.focus();

        return;

      }


      if (!password) {

        showError(
          "Please enter your password."
        );

        authPassword?.focus();

        return;

      }


      if (password.length < 6) {

        showError(
          "Your password must contain at least 6 characters."
        );

        authPassword?.focus();

        return;

      }


      if (
        mode === "signup" &&
        !displayName
      ) {

        showError(
          "Please enter your display name."
        );

        authName?.focus();

        return;

      }


      if (authSubmit) {

        authSubmit.disabled =
          true;

        authSubmit.dataset.originalText =
          authSubmit.textContent;

        authSubmit.textContent =
          mode === "signup"
            ? "Creating Account..."
            : "Signing In...";

      }


      try {

        let result;


        if (
          mode === "signup"
        ) {

          result =
            await createAccount(
              email,
              password,
              displayName
            );

        } else {

          result =
            await signIn(
              email,
              password
            );

        }


        if (result.error) {

          showError(
            friendlyAuthError(
              result.error
            )
          );

          return;

        }


        /*
          Supabase can return a user without
          a session when email confirmation
          is enabled.
        */

        if (
          mode === "signup" &&
          !result.session
        ) {

          showSuccess(
            "Account created. Please check your email and confirm your account before signing in."
          );

          authForm.reset();

          setAuthMode(
            "signin"
          );

          return;

        }


        if (
          !result.session
        ) {

          showError(
            "Authentication was not completed. Please try again."
          );

          return;

        }


        window.GrooveDNA.session =
          result.session;

        window.GrooveDNA.user =
          result.user;


        showSuccess(
          mode === "signup"
            ? "Account created successfully."
            : "Signed in successfully."
        );


        setTimeout(
          () => {

            showHomeView();

          },
          350
        );


      } catch (error) {

        console.error(
          "Authentication form error:",
          error
        );

        showError(
          friendlyAuthError(
            error
          )
        );


      } finally {

        if (authSubmit) {

          authSubmit.disabled =
            false;

          authSubmit.textContent =
            authSubmit.dataset.originalText ||
            (
              mode === "signup"
                ? "Create Account"
                : "Sign In"
            );

        }

      }

    }
  );


  /* -------------------------------------------------------
     SIGN IN / CREATE ACCOUNT SWITCH
     ------------------------------------------------------- */

  if (authToggleCopy) {

    authToggleCopy.addEventListener(
      "click",
      (event) => {

        event.preventDefault();

        setAuthMode(
          window.GrooveDNA.authMode ===
            "signup"
              ? "signin"
              : "signup"
        );

      }
    );

  }


  /* -------------------------------------------------------
     SIGN OUT
     ------------------------------------------------------- */

  if (signOutBtn) {

    signOutBtn.addEventListener(
      "click",
      async (event) => {

        event.preventDefault();

        await signOut();

      }
    );

  }


  /* -------------------------------------------------------
     PASSWORD VISIBILITY
     ------------------------------------------------------- */

  const passwordToggle =
    document.getElementById(
      "passwordToggle"
    );

  if (passwordToggle) {

    passwordToggle.addEventListener(
      "click",
      () => {

        if (!authPassword) {
          return;
        }

        const showing =
          authPassword.type ===
          "text";

        authPassword.type =
          showing
            ? "password"
            : "text";

        passwordToggle.textContent =
          showing
            ? "Show"
            : "Hide";

      }
    );

  }


  /* -------------------------------------------------------
     ACCOUNT → HOME LINKS
     ------------------------------------------------------- */

  $$("[data-home-view]")
    .forEach(
      (link) => {

        link.addEventListener(
          "click",
          async (event) => {

            event.preventDefault();

            const session =
              await getCurrentSession();

            if (!session) {

              showError(
                "Please sign in first."
              );

              return;

            }

            showHomeView();

          }
        );

      }
    );

}


/* =========================================================
   INITIALIZE COMBINED AUTHENTICATION
   ========================================================= */

async function initializeCombinedAuthentication() {

  initializeSupabase();

  setupAuthForm();

  const session =
    await getCurrentSession();


  if (session) {

    /*
      If the user explicitly opens
      #account, keep them on Account.
    */

    if (
      window.location.hash ===
      "#account"
    ) {

      showAccountView();

    } else {

      showHomeView();

    }

  } else {

    showAccountView();

  }


  if (supabaseClient) {

    supabaseClient.auth.onAuthStateChange(
      (event, session) => {

        window.GrooveDNA.session =
          session || null;

        window.GrooveDNA.user =
          session?.user || null;


        if (
          event === "SIGNED_OUT"
        ) {

          showAccountView();

          return;

        }


        if (
          event === "SIGNED_IN" &&
          session
        ) {

          showHomeView();

        }

      }
    );

  }

}


/* =========================================================
   PROTECTED AUDIO UPLOAD
   ========================================================= */

function openAudioUpload() {

  const session =
    window.GrooveDNA?.session;

  if (!session) {

    showAccountView();

    showError(
      "Please sign in before uploading audio."
    );

    return;

  }

  const input =
    document.getElementById(
      "audioUpload"
    );

  if (input) {

    input.click();

  }

}


/* =========================================================
   APPLICATION STARTUP
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    try {

      await initializeCombinedAuthentication();

      console.log(
        "GrooveDNA authentication initialized."
      );

    } catch (error) {

      console.error(
        "GrooveDNA initialization error:",
        error
      );

      showError(
        "GrooveDNA could not initialize correctly."
      );

    }

  }
);
