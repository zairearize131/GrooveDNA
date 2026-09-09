/* =========================================================
   GROOVEDNA — SUPABASE AUTHENTICATION
   ========================================================= */

/*
   ========================================================
   SUPABASE PROJECT
   ========================================================
*/

const SUPABASE_URL =
  "https://nzfzcnusmjboykledznh.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_qsskdrsPBxg1dECb1HY8Jg_x0rL7wR3";


/*
   ========================================================
   GROOVEDNA PRODUCTION URL
   ========================================================

   This is the page GrooveDNA should use after authentication.
*/

const GROOVEDNA_HOME_URL =
  "https://zairearize131.github.io/GrooveDNA/index.html";


/*
   ========================================================
   SUPABASE CLIENT
   ========================================================
*/

let client = null;


/* =========================================================
   INITIALIZE SUPABASE
   ========================================================= */

function initializeSupabase() {

  /*
     Make sure the Supabase JavaScript library exists.
  */

  if (!window.supabase) {

    console.error(
      "GrooveDNA: Supabase JavaScript library was not loaded."
    );

    return null;
  }


  /*
     Prevent multiple Supabase clients.
  */

  if (client) {

    return client;

  }


  /*
     Create the Supabase client.
  */

  client =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {

          /*
             Keep the user signed in between page loads.
          */

          persistSession: true,

          /*
             Automatically refresh expired tokens.
          */

          autoRefreshToken: true,

          /*
             Allow Supabase to process authentication
             information returned in the URL.
          */

          detectSessionInUrl: true

        }
      }
    );


  /*
     Make the client available globally.
  */

  window.supabaseClient =
    client;


  console.log(
    "GrooveDNA: Supabase client initialized."
  );


  return client;

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

    currentPage: "account",

    currentBeat: {

      bpm: 96,

      pitch: 0,

      loop: false,

      clips: []

    }

  };


/* =========================================================
   AUTH STATUS HELPERS
   ========================================================= */

function showError(message) {

  const status =
    document.getElementById(
      "authStatus"
    );


  if (status) {

    status.textContent =
      message;

    status.className =
      "auth-status error";

    status.style.display =
      "block";

  }


  console.error(
    "GrooveDNA:",
    message
  );

}


function showSuccess(message) {

  const status =
    document.getElementById(
      "authStatus"
    );


  if (status) {

    status.textContent =
      message;

    status.className =
      "auth-status success";

    status.style.display =
      "block";

  }


  console.log(
    "GrooveDNA:",
    message
  );

}


/* =========================================================
   GET CURRENT SESSION
   ========================================================= */

async function getCurrentSession() {

  const supabase =
    initializeSupabase();


  if (!supabase) {

    return null;

  }


  try {

    const {
      data,
      error
    } =
      await supabase.auth.getSession();


    if (error) {

      console.error(
        "GrooveDNA: Unable to get Supabase session:",
        error
      );

      return null;

    }


    window.GrooveDNA.session =
      data.session || null;


    window.GrooveDNA.user =
      data.session?.user || null;


    return (
      data.session || null
    );


  } catch (error) {

    console.error(
      "GrooveDNA: Session error:",
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


  if (
    window.location.hash !==
    "#account"
  ) {

    window.location.hash =
      "account";

  }


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


  if (
    window.location.hash !==
    "#home"
  ) {

    window.location.hash =
      "home";

  }


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

  const supabase =
    initializeSupabase();


  if (!supabase) {

    return {

      user: null,

      session: null,

      error:
        new Error(
          "Supabase is unavailable."
        )

    };

  }


  try {

    /*
       Normalize the email address.
    */

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();


    /*
       Normalize display name.
    */

    const normalizedDisplayName =
      displayName
        .trim();


    /*
       IMPORTANT:

       Supabase email confirmation should return the
       user to GrooveDNA's actual index.html page.
    */

    const emailRedirectTo =
      GROOVEDNA_HOME_URL;


    console.log(
      "GrooveDNA: Creating Supabase account for:",
      normalizedEmail
    );


    /*
       CREATE THE SUPABASE AUTH USER
    */

    const {
      data,
      error
    } =
      await supabase.auth.signUp({

        email:
          normalizedEmail,

        password:
          password,

        options: {

          data: {

            display_name:
              normalizedDisplayName

          },

          emailRedirectTo:
            emailRedirectTo

        }

      });


    /*
       Supabase returned an error.
    */

    if (error) {

      console.error(
        "GrooveDNA: Create account error:",
        error
      );


      return {

        user: null,

        session: null,

        error

      };

    }


    /*
       Store the Supabase user.
    */

    window.GrooveDNA.user =
      data.user || null;


    /*
       Store the Supabase session.

       This will be null when Supabase requires the
       user to confirm their email first.
    */

    window.GrooveDNA.session =
      data.session || null;


    console.log(
      "GrooveDNA: Supabase account creation successful.",
      data.user
    );


    console.log(
      "GrooveDNA: Session returned:",
      !!data.session
    );


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
      "GrooveDNA: Create account exception:",
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

  const supabase =
    initializeSupabase();


  if (!supabase) {

    return {

      user: null,

      session: null,

      error:
        new Error(
          "Supabase is unavailable."
        )

    };

  }


  try {

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();


    console.log(
      "GrooveDNA: Attempting Supabase sign in for:",
      normalizedEmail
    );


    /*
       SIGN IN WITH SUPABASE EMAIL/PASSWORD
    */

    const {
      data,
      error
    } =
      await supabase.auth.signInWithPassword({

        email:
          normalizedEmail,

        password:
          password

      });


    /*
       Supabase rejected the credentials.
    */

    if (error) {

      console.error(
        "GrooveDNA: Sign in error:",
        error
      );


      return {

        user: null,

        session: null,

        error

      };

    }


    /*
       Store authenticated user/session.
    */

    window.GrooveDNA.user =
      data.user || null;


    window.GrooveDNA.session =
      data.session || null;


    console.log(
      "GrooveDNA: Supabase sign in successful.",
      data.user
    );


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
      "GrooveDNA: Sign in exception:",
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

  const supabase =
    initializeSupabase();


  if (!supabase) {

    return false;

  }


  try {

    const {
      error
    } =
      await supabase.auth.signOut();


    if (error) {

      console.error(
        "GrooveDNA: Sign out error:",
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


    showSuccess(
      "You have been signed out."
    );


    return true;


  } catch (error) {

    console.error(
      "GrooveDNA: Sign out exception:",
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

  const supabase =
    initializeSupabase();


  if (!supabase) {

    return false;

  }


  try {

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();


    const {
      error
    } =
      await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {

          redirectTo:
            GROOVEDNA_HOME_URL

        }
      );


    if (error) {

      console.error(
        "GrooveDNA: Password reset error:",
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
      "GrooveDNA: Password reset exception:",
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

    return (
      "Authentication failed."
    );

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
      "The email address or password is incorrect. Make sure you created the account in Supabase and, if email confirmation is enabled, confirmed your email."
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

    console.warn(
      "GrooveDNA: #authForm was not found."
    );

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


  /* =======================================================
     CREATE ACCOUNT / SIGN IN
     ======================================================= */

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


      /* ---------------------------------------------------
         VALIDATE EMAIL
         --------------------------------------------------- */

      if (!email) {

        showError(
          "Please enter your email address."
        );

        authEmail?.focus();

        return;

      }


      /* ---------------------------------------------------
         VALIDATE PASSWORD
         --------------------------------------------------- */

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


      /* ---------------------------------------------------
         VALIDATE DISPLAY NAME
         --------------------------------------------------- */

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


      /* ---------------------------------------------------
         DISABLE SUBMIT
         --------------------------------------------------- */

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


        /* =================================================
           CREATE ACCOUNT
           ================================================= */

        if (
          mode === "signup"
        ) {

          result =
            await createAccount(
              email,
              password,
              displayName
            );


        /* =================================================
           SIGN IN
           ================================================= */

        } else {

          result =
            await signIn(
              email,
              password
            );

        }


        /* =================================================
           HANDLE ERROR
           ================================================= */

        if (result.error) {

          showError(
            friendlyAuthError(
              result.error
            )
          );

          return;

        }


        /* =================================================
           EMAIL CONFIRMATION
           ================================================= */

        if (
          mode === "signup" &&
          !result.session
        ) {

          showSuccess(
            "Account created successfully. Please check your email and confirm your account before signing in."
          );


          authForm.reset();


          setAuthMode(
            "signin"
          );


          return;

        }


        /* =================================================
           REQUIRE REAL SESSION
           ================================================= */

        if (
          !result.session
        ) {

          showError(
            "Authentication was not completed. Please try again."
          );

          return;

        }


        /* =================================================
           SAVE AUTH STATE
           ================================================= */

        window.GrooveDNA.session =
          result.session;


        window.GrooveDNA.user =
          result.user;


        /* =================================================
           SUCCESS
           ================================================= */

        showSuccess(
          mode === "signup"
            ? "Account created successfully."
            : "Signed in successfully."
        );


        /* =================================================
           SHOW HOME
           ================================================= */

        setTimeout(
          () => {

            showHomeView();

          },
          350
        );


      } catch (error) {

        console.error(
          "GrooveDNA: Authentication form error:",
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


  /* =======================================================
     SWITCH SIGN IN / CREATE ACCOUNT
     ======================================================= */

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


  /* =======================================================
     SIGN OUT
     ======================================================= */

  if (signOutBtn) {

    signOutBtn.addEventListener(
      "click",
      async (event) => {

        event.preventDefault();

        await signOut();

      }
    );

  }


  /* =======================================================
     PASSWORD VISIBILITY
     ======================================================= */

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


  /* =======================================================
     ACCOUNT → HOME LINKS
     ======================================================= */

  document
    .querySelectorAll(
      "[data-home-view]"
    )
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

  const supabase =
    initializeSupabase();


  /*
     Set up the form.
  */

  setupAuthForm();


  /*
     Check existing Supabase session.
  */

  const session =
    await getCurrentSession();


  /* -------------------------------------------------------
     EXISTING SESSION
     ------------------------------------------------------- */

  if (session) {

    if (
      window.location.hash ===
      "#account"
    ) {

      showAccountView();

    } else {

      showHomeView();

    }


  /* -------------------------------------------------------
     NO SESSION
     ------------------------------------------------------- */

  } else {

    showAccountView();

  }


  /* -------------------------------------------------------
     SUPABASE AUTH STATE CHANGES
     ------------------------------------------------------- */

  if (supabase) {

    supabase.auth.onAuthStateChange(
      (event, session) => {

        window.GrooveDNA.session =
          session || null;


        window.GrooveDNA.user =
          session?.user || null;


        /* -----------------------------------------------
           SIGNED OUT
           ----------------------------------------------- */

        if (
          event === "SIGNED_OUT"
        ) {

          showAccountView();

          return;

        }


        /* -----------------------------------------------
           SIGNED IN
           ----------------------------------------------- */

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
