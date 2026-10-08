/* One-time first-admin bootstrap.
   Usage: GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json npm run bootstrap-admin -- admin@example.com */
const { applicationDefault, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const email = String(process.argv[2] || "chellurisandhyarani20@gmail.com").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npm run bootstrap-admin -- admin@example.com");
  process.exit(2);
}

initializeApp({ credential: applicationDefault() });

(async function () {
  const user = await getAuth().getUserByEmail(email);
  const claims = Object.assign({}, user.customClaims || {}, { admin: true });
  await getAuth().setCustomUserClaims(user.uid, claims);
  await getFirestore().collection("accounts").doc(user.uid).set({
    email,
    name: user.displayName || email.split("@")[0],
    role: "admin",
    status: "active",
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  console.log("Admin role granted to " + email + ". Sign out and back in to refresh the token.");
})().catch(function (err) {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
