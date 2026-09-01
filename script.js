/* =========================================================
   GROOVEDNA AUTH SYSTEM
   ========================================================= */

const SUPABASE_URL =
  "https://nzfzcnusmjboykledznh.supabase.co";

const SUPABASE_ANON_KEY =
  "YOUR_SUPABASE_PUBLISHABLE_KEY";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );


/* =========================================================
   GET CURRENT GROOVEDNA USER
   ========================================================= */

async function getGrooveDNAUser() {

  const {
    data,
    error
  } = await supabaseClient.auth.getUser();

  if (error) {
    console.error(
      "Could not get GrooveDNA user:",
      error
    );

    return null;
  }

  return data.user || null;
}


/* =========================================================
   CREATE GROOVEDNA PROFILE
   ========================================================= */

async function createGrooveDNAProfile(user) {

  if (!user) {
    return null;
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "GrooveDNA Creator";

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        full_name: displayName,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "id"
      }
    )
    .select()
    .single();

  if (error) {

    console.error(
      "Could not create GrooveDNA profile:",
      error
    );

    return null;
  }

  return data;
}


/* =========================================================
   CREATE ACCOUNT
   ========================================================= */

async function createGrooveDNAAccount(
  name,
  email,
  password
) {

  name = name.trim();
  email = email.trim();

  if (!name) {

    alert(
      "Please enter your name."
    );

    return false;
  }

  if (!email) {

    alert(
      "Please enter your email."
    );

    return false;
  }

  if (!password) {

    alert(
      "Please enter a password."
    );

    return false;
  }

  if (password.length < 6) {

    alert(
      "Your password must be at least 6 characters."
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
            full_name: name
          },

          /*
           * Change this to your real
           * deployed GrooveDNA URL later.
           */

          emailRedirectTo:
            window.location.origin +
            "/index.html"
        }
      });


    if (error) {

      console.error(
        "GrooveDNA signup error:",
        error
      );

      alert(
        getGrooveDNAAuthError(error)
      );

      return false;
    }


    const user = data?.user;

    if (!user) {

      alert(
        "GrooveDNA could not create your account."
      );

      return false;
    }


    /*
     * IMPORTANT:
     *
     * Supabase can create the Auth user
     * without creating a session when
     * email confirmation is enabled.
     */

    if (!data.session) {

      console.log(
        "GrooveDNA account created:",
        user.id
      );

      alert(
        "Your GrooveDNA account was created! Check your email to confirm your account, then sign in."
      );

      return true;
    }


    /*
     * Email confirmation is not required.
     * We already have a live session.
     */

    await createGrooveDNAProfile(user);


    /*
     * Send the creator into GrooveDNA.
     */

    window.location.replace(
      "profile.html"
    );

    return true;

  } catch (error) {

    console.error(
      "Unexpected GrooveDNA signup error:",
      error
    );

    alert(
      "Something went wrong creating your GrooveDNA account."
    );

    return false;
  }
}


/* =========================================================
   SIGN IN
   ========================================================= */

async function signInToGrooveDNA(
  email,
  password
) {

  email = email.trim();

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .signInWithPassword({

          email: email,

          password: password
        });


    if (error) {

      console.error(
        "GrooveDNA login error:",
        error
      );

      alert(
        getGrooveDNAAuthError(error)
      );

      return false;
    }


    const user = data?.user;

    if (!user) {

      alert(
        "GrooveDNA could not find your account."
      );

      return false;
    }


    /*
     * Make sure this creator has
     * a GrooveDNA profile.
     */

    await createGrooveDNAProfile(user);


    /*
     * Login is successful.
     */

    console.log(
      "GrooveDNA login successful:",
      user.email
    );


    window.location.replace(
      "profile.html"
    );

    return true;

  } catch (error) {

    console.error(
      "Unexpected GrooveDNA login error:",
      error
    );

    alert(
      "Something went wrong signing you in."
    );

    return false;
  }
}


/* =========================================================
   SIGN OUT
   ========================================================= */

async function signOutOfGrooveDNA() {

  const {
    error
  } =
    await supabaseClient.auth.signOut();

  if (error) {

    console.error(
      "GrooveDNA logout error:",
      error
    );

    alert(
      "Could not sign you out."
    );

    return;
  }


  window.location.replace(
    "index.html"
  );
}


/* =========================================================
   PROTECT GROOVEDNA PAGES
   ========================================================= */

async function protectGrooveDNAPage() {

  const page =
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
    publicPages.includes(page)
  ) {
    return;
  }


  const user =
    await getGrooveDNAUser();


  if (!user) {

    console.warn(
      "No GrooveDNA session."
    );

    window.location.replace(
      "index.html"
    );

    return;
  }


  /*
   * Make the logged-in creator's
   * information available throughout
   * the page.
   */

  document
    .querySelectorAll("[data-user-email]")
    .forEach(element => {

      element.textContent =
        user.email || "";
    });


  const name =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Creator";


  document
    .querySelectorAll("[data-user-name]")
    .forEach(element => {

      element.textContent =
        name;
    });
}


/* =========================================================
   AUTH ERROR TRANSLATOR
   ========================================================= */

function getGrooveDNAAuthError(error) {

  const message =
    String(
      error?.message || ""
    ).toLowerCase();


  if (
    message.includes(
      "invalid login credentials"
    )
  ) {

    return (
      "Incorrect email or password."
    );
  }


  if (
    message.includes(
      "email not confirmed"
    )
  ) {

    return (
      "Please confirm your email before signing in."
    );
  }


  if (
    message.includes(
      "user already registered"
    )
  ) {

    return (
      "An account with this email already exists. Please sign in instead."
    );
  }


  if (
    message.includes(
      "rate limit"
    )
  ) {

    return (
      "Too many attempts. Please wait a moment and try again."
    );
  }


  return (
    error?.message ||
    "Authentication failed. Please try again."
  );
}


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  (event, session) => {

    console.log(
      "GrooveDNA auth event:",
      event
    );

    if (event === "SIGNED_IN") {

      console.log(
        "GrooveDNA creator signed in:",
        session?.user?.email
      );
    }

    if (event === "SIGNED_OUT") {

      console.log(
        "GrooveDNA creator signed out."
      );
    }
  }
);


/* =========================================================
   PAGE STARTUP
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    await protectGrooveDNAPage();

  }
);
