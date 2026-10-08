/* Firebase web configuration.
   Replace these placeholders with Firebase Console > Project settings > Your apps.
   This object identifies the Firebase project; it is not a service-account secret. */
window.AMFIT_FIREBASE_CONFIG = {
  apiKey: "REPLACE_WITH_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_PROJECT_ID.firebaseapp.com",
  projectId: "REPLACE_WITH_PROJECT_ID",
  storageBucket: "REPLACE_WITH_PROJECT_ID.appspot.com",
  messagingSenderId: "REPLACE_WITH_SENDER_ID",
  appId: "REPLACE_WITH_APP_ID"
};

/* Amdocs Microsoft Entra tenant ID (a GUID from Amdocs IT). When set, the
   Microsoft button only accepts accounts from that tenant. */
window.AMFIT_MS_TENANT = "";

/* Optional after registering reCAPTCHA v3 in Firebase App Check. */
window.AMFIT_RECAPTCHA_SITE_KEY = "";
