/* Firebase boundary. AMFIT remains usable in local mode until valid config is added. */
(function () {
  const cfg = window.AMFIT_FIREBASE_CONFIG || {};
  const configured = Boolean(
    window.firebase &&
    cfg.apiKey &&
    cfg.projectId &&
    String(cfg.apiKey).indexOf("REPLACE_") !== 0
  );
  let app = null;
  let auth = null;
  let db = null;
  let storage = null;
  let functions = null;

  if (configured) {
    app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
    functions = firebase.functions();
    if (firebase.appCheck && window.AMFIT_RECAPTCHA_SITE_KEY) {
      firebase.appCheck().activate(window.AMFIT_RECAPTCHA_SITE_KEY, true);
    }
    db.enablePersistence({ synchronizeTabs: true }).catch(function () {
      // Firestore still works if persistence is unavailable or another tab owns it.
    });
  }

  function message(err) {
    const code = err && err.code ? String(err.code) : "";
    const known = {
      "auth/email-already-in-use": "That email is already registered. Sign in instead.",
      "auth/invalid-credential": "Email or password does not match.",
      "auth/user-disabled": "This account is disabled. Contact your AMFIT administrator.",
      "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
      "auth/network-request-failed": "Firebase is unreachable. Check your connection.",
      "auth/weak-password": "Use a password of at least 6 characters.",
      "auth/popup-closed-by-user": "Sign-in was cancelled before it finished.",
      "auth/popup-blocked": "The browser blocked the sign-in window. Allow pop-ups for AMFIT and retry.",
      "auth/account-exists-with-different-credential": "That email already uses another sign-in method. Use that method first, then link this work account."
    };
    return known[code] || (err && err.message ? err.message : "Firebase request failed.");
  }

  async function role(user, force) {
    if (!user) return "user";
    const token = await user.getIdTokenResult(Boolean(force));
    return token.claims && token.claims.admin === true ? "admin" : "user";
  }

  window.AMFIT_FIREBASE = {
    configured: configured,
    app: app,
    auth: auth,
    db: db,
    storage: storage,
    functions: functions,
    message: message,
    role: role,
    register: function (email, password) {
      return auth.createUserWithEmailAndPassword(email, password);
    },
    login: function (email, password) {
      return auth.signInWithEmailAndPassword(email, password);
    },
    // Amdocs company SSO through Microsoft Entra ID. The tenant pin rejects
    // personal and other-company Microsoft accounts before AMFIT sees them.
    sso: function () {
      if (!configured) return Promise.reject(new Error("Firebase SSO is not configured."));
      const provider = new firebase.auth.OAuthProvider("microsoft.com");
      ["openid", "email", "profile", "User.Read"].forEach(function (s) { provider.addScope(s); });
      const params = { prompt: "select_account" };
      if (window.AMFIT_MS_TENANT) params.tenant = window.AMFIT_MS_TENANT;
      provider.setCustomParameters(params);
      return auth.signInWithPopup(provider);
    },
    // Employee ID comes from the Amdocs directory, not from what the user types.
    directory: async function (result) {
      const token = result && result.credential && result.credential.accessToken;
      if (!token) throw new Error("Microsoft did not return a directory token.");
      const res = await fetch(
        "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,employeeId",
        { headers: { Authorization: "Bearer " + token } }
      );
      if (!res.ok) throw new Error("Could not read your Amdocs directory profile (HTTP " + res.status + ").");
      const me = await res.json();
      return {
        name: me.displayName || "",
        email: String(me.mail || me.userPrincipalName || "").toLowerCase(),
        employeeId: me.employeeId || ""
      };
    },
    logout: function () {
      return auth.signOut();
    },
    reset: function (email) {
      return auth.sendPasswordResetEmail(email);
    },
    onAuth: function (cb) {
      if (!configured) { cb(null); return function () {}; }
      return auth.onAuthStateChanged(cb);
    },
    call: async function (name, payload) {
      if (!configured) throw new Error("Firebase is not configured.");
      const result = await functions.httpsCallable(name)(payload || {});
      return result.data;
    }
  };
})();
