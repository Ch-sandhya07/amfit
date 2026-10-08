const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

function requireAdmin(request) {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Administrator access required.");
  }
}

function cleanUid(data) {
  const uid = String((data && data.uid) || "");
  if (!/^[A-Za-z0-9:_-]{6,128}$/.test(uid)) {
    throw new HttpsError("invalid-argument", "A valid user id is required.");
  }
  return uid;
}

async function audit(request, action, target, detail) {
  await getFirestore().collection("audit").add({
    action,
    target,
    detail: detail || {},
    actorUid: request.auth.uid,
    actorEmail: request.auth.token.email || "",
    createdAt: FieldValue.serverTimestamp()
  });
}

exports.listUsers = onCall({ enforceAppCheck: false }, async (request) => {
  requireAdmin(request);
  const pageToken = request.data && request.data.pageToken ? String(request.data.pageToken) : undefined;
  const result = await getAuth().listUsers(100, pageToken);
  const db = getFirestore();
  const accountDocs = result.users.length
    ? await db.getAll(...result.users.map((u) => db.collection("accounts").doc(u.uid)))
    : [];
  const users = result.users.map((u, index) => {
    const meta = (accountDocs[index] && accountDocs[index].data()) || {};
    return {
      uid: u.uid,
      email: u.email || "",
      name: meta.name || u.displayName || "",
      disabled: u.disabled,
      role: u.customClaims && u.customClaims.admin === true ? "admin" : "user",
      createdAt: u.metadata.creationTime || "",
      lastSignInAt: u.metadata.lastSignInTime || ""
    };
  });
  return { users, pageToken: result.pageToken || null };
});

exports.setUserDisabled = onCall({ enforceAppCheck: false }, async (request) => {
  requireAdmin(request);
  const uid = cleanUid(request.data);
  const disabled = request.data && request.data.disabled === true;
  if (uid === request.auth.uid && disabled) {
    throw new HttpsError("failed-precondition", "You cannot disable your own account.");
  }
  await getAuth().updateUser(uid, { disabled });
  await getFirestore().collection("accounts").doc(uid).set({
    status: disabled ? "disabled" : "active",
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  await audit(request, disabled ? "user.disable" : "user.enable", uid);
  return { ok: true };
});

exports.setUserRole = onCall({ enforceAppCheck: false }, async (request) => {
  requireAdmin(request);
  const uid = cleanUid(request.data);
  const role = request.data && request.data.role === "admin" ? "admin" : "user";
  if (uid === request.auth.uid && role !== "admin") {
    throw new HttpsError("failed-precondition", "You cannot remove your own administrator role.");
  }
  const user = await getAuth().getUser(uid);
  const claims = Object.assign({}, user.customClaims || {});
  if (role === "admin") claims.admin = true;
  else delete claims.admin;
  await getAuth().setCustomUserClaims(uid, claims);
  await getFirestore().collection("accounts").doc(uid).set({
    role,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  await audit(request, "user.role", uid, { role });
  return { ok: true, role };
});
