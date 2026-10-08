/* Firestore/Storage repository and local compatibility cache. */
(function () {
  const F = window.AMFIT_FIREBASE;
  let uid = null;
  let email = null;
  let statusHandler = function () {};
  let remoteHandler = function () {};
  let unsubscribers = [];
  const pending = {};

  function setStatus(state, detail) {
    statusHandler({ state: state, detail: detail || "" });
  }

  function safeId(value) {
    return String(value || Date.now()).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 120);
  }

  function dataUrlBlob(url) {
    const parts = String(url).split(",");
    const type = (parts[0].match(/data:([^;]+)/) || [])[1] || "image/jpeg";
    const bytes = atob(parts[1] || "");
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) out[i] = bytes.charCodeAt(i);
    return new Blob([out], { type: type });
  }

  async function storeImage(dataUrl, path) {
    if (!dataUrl || String(dataUrl).indexOf("data:image/") !== 0) return dataUrl || "";
    const ref = F.storage.ref(path);
    await ref.put(dataUrlBlob(dataUrl), { cacheControl: "private,max-age=86400" });
    return ref.getDownloadURL();
  }

  async function cleanRecord(kind, id, row) {
    const copy = JSON.parse(JSON.stringify(row || {}));
    if (copy.thumb && String(copy.thumb).indexOf("data:image/") === 0) {
      copy.thumb = await storeImage(copy.thumb, "users/" + uid + "/photos/" + kind + "-" + safeId(id) + ".jpg");
    }
    if (copy.photo && String(copy.photo).indexOf("data:image/") === 0) {
      copy.photo = await storeImage(copy.photo, "users/" + uid + "/photos/" + kind + "-" + safeId(id) + ".jpg");
    }
    return copy;
  }

  async function replaceCollection(name, rows, idOf) {
    const col = F.db.collection("users").doc(uid).collection(name);
    const existing = await col.get();
    const wanted = new Set();
    const prepared = [];
    for (let i = 0; i < rows.length; i++) {
      const id = safeId(idOf(rows[i], i));
      wanted.add(id);
      prepared.push({ id: id, value: await cleanRecord(name, id, rows[i]) });
    }
    const batch = F.db.batch();
    existing.docs.forEach(function (doc) {
      if (!wanted.has(doc.id)) batch.delete(doc.ref);
    });
    prepared.forEach(function (x) {
      batch.set(col.doc(x.id), x.value, { merge: false });
    });
    await batch.commit();
  }

  async function write(kind, value) {
    if (!uid || !F.configured) return;
    setStatus("syncing", kind);
    if (kind === "profile") {
      const profile = await cleanRecord("profile", "profile", value);
      await F.db.collection("users").doc(uid).set({ profile: profile, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } else if (kind === "logs") {
      await replaceCollection("logs", value || [], function (x) { return x.id; });
    } else if (kind === "daily") {
      const rows = Object.keys(value || {}).map(function (day) { return Object.assign({ day: day }, value[day]); });
      await replaceCollection("daily", rows, function (x) { return x.day; });
    } else if (kind === "shots") {
      await replaceCollection("shots", value || [], function (x, i) { return x.day + "-" + i; });
    } else if (kind === "fixes" || kind === "pins") {
      await F.db.collection("users").doc(uid).collection("settings").doc(kind).set({ value: value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    }
    setStatus("synced", kind);
  }

  function mirror(kind, value) {
    if (!uid || !F.configured) return Promise.resolve();
    clearTimeout(pending[kind]);
    return new Promise(function (resolve) {
      pending[kind] = setTimeout(function () {
        write(kind, value).then(resolve).catch(function (err) {
          setStatus("error", F.message(err));
          resolve();
        });
      }, 120);
    });
  }

  async function docs(path) {
    const snap = await path.get();
    return snap.docs.map(function (d) { return d.data(); });
  }

  async function hydrate(userEmail) {
    if (!uid) return false;
    setStatus("syncing", "download");
    const root = F.db.collection("users").doc(uid);
    const results = await Promise.all([
      root.get(),
      docs(root.collection("logs")),
      docs(root.collection("daily")),
      docs(root.collection("shots")),
      root.collection("settings").doc("fixes").get(),
      root.collection("settings").doc("pins").get()
    ]);
    const userDoc = results[0].data() || {};
    if (userDoc.profile) {
      const list = JSON.parse(localStorage.getItem("amfit.users") || "[]");
      const i = list.findIndex(function (x) { return x.email === userEmail; });
      const base = { email: userEmail, name: userDoc.profile.name || userEmail.split("@")[0], cloud: true };
      if (i < 0) list.push(Object.assign(base, { profile: userDoc.profile }));
      else list[i] = Object.assign({}, list[i], base, { profile: userDoc.profile });
      localStorage.setItem("amfit.users", JSON.stringify(list));
    }
    localStorage.setItem("amfit.logs." + userEmail, JSON.stringify(results[1]));
    const daily = {};
    results[2].forEach(function (d) { const day = d.day; delete d.day; daily[day] = d; });
    localStorage.setItem("amfit.daily." + userEmail, JSON.stringify(daily));
    localStorage.setItem("amfit.shots." + userEmail, JSON.stringify(results[3]));
    if (results[4].exists) localStorage.setItem("amfit.fixes." + userEmail, JSON.stringify(results[4].data().value || {}));
    if (results[5].exists) localStorage.setItem("amfit.pins." + userEmail, JSON.stringify(results[5].data().value || []));
    setStatus("synced", "download");
    return Boolean(userDoc.profile);
  }

  async function account(user, name, employeeId) {
    const r = await F.role(user);
    const ref = F.db.collection("accounts").doc(user.uid);
    const existing = await ref.get();
    const data = {
      email: user.email,
      name: name || user.displayName || user.email.split("@")[0],
      role: r,
      status: "active",
      lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (employeeId) data.employeeId = String(employeeId).slice(0, 12);
    if (!existing.exists) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    await ref.set(data, { merge: true });
    return r;
  }

  async function migrate(user, oldEmail) {
    uid = user.uid;
    email = oldEmail;
    const raw = function (key, fallback) {
      try { return JSON.parse(localStorage.getItem(key) || fallback); } catch (_) { return JSON.parse(fallback); }
    };
    const list = raw("amfit.users", "[]");
    const old = list.find(function (x) { return x.email === oldEmail; });
    await account(user, old && old.name);
    if (old && old.profile) await write("profile", old.profile);
    await write("logs", raw("amfit.logs." + oldEmail, "[]"));
    await write("daily", raw("amfit.daily." + oldEmail, "{}"));
    await write("shots", raw("amfit.shots." + oldEmail, "[]"));
    await write("fixes", raw("amfit.fixes." + oldEmail, "{}"));
    await write("pins", raw("amfit.pins." + oldEmail, "[]"));
    if (old) {
      delete old.hash;
      delete old.recovery;
      old.cloud = true;
      old.uid = user.uid;
      localStorage.setItem("amfit.users", JSON.stringify(list));
    }
    localStorage.setItem("amfit.migrated." + oldEmail, user.uid);
  }

  async function attach(user) {
    unsubscribers.forEach(function (off) { off(); });
    unsubscribers = [];
    uid = user ? user.uid : null;
    email = user ? user.email : null;
    if (!user) return "user";
    const r = await account(user);
    await hydrate(user.email);
    subscribe(user.email);
    return r;
  }

  function subscribe(userEmail) {
    const root = F.db.collection("users").doc(uid);
    function changed(kind) {
      setStatus("synced", kind);
      remoteHandler(kind);
    }
    unsubscribers.push(root.onSnapshot(function (snap) {
      const data = snap.data() || {};
      if (!data.profile) return;
      const list = JSON.parse(localStorage.getItem("amfit.users") || "[]");
      const i = list.findIndex(function (x) { return x.email === userEmail; });
      if (i >= 0) list[i].profile = data.profile;
      localStorage.setItem("amfit.users", JSON.stringify(list));
      changed("profile");
    }));
    ["logs", "shots"].forEach(function (name) {
      unsubscribers.push(root.collection(name).onSnapshot(function (snap) {
        localStorage.setItem("amfit." + name + "." + userEmail, JSON.stringify(
          snap.docs.map(function (d) { return d.data(); })
        ));
        changed(name);
      }));
    });
    unsubscribers.push(root.collection("daily").onSnapshot(function (snap) {
      const value = {};
      snap.docs.forEach(function (d) {
        const row = d.data();
        const day = row.day;
        delete row.day;
        value[day] = row;
      });
      localStorage.setItem("amfit.daily." + userEmail, JSON.stringify(value));
      changed("daily");
    }));
    ["fixes", "pins"].forEach(function (name) {
      unsubscribers.push(root.collection("settings").doc(name).onSnapshot(function (snap) {
        if (snap.exists) localStorage.setItem("amfit." + name + "." + userEmail, JSON.stringify(snap.data().value));
        changed(name);
      }));
    });
    unsubscribers.push(F.db.collection("content").onSnapshot(function () { changed("content"); }));
    unsubscribers.push(F.db.collection("content").doc("foods").collection("items").onSnapshot(function () { changed("content"); }));
  }

  async function loadContent() {
    if (!F.configured) return {};
    const results = await Promise.all([
      F.db.collection("content").get(),
      F.db.collection("content").doc("foods").collection("items").get()
    ]);
    const out = {};
    results[0].docs.forEach(function (d) { out[d.id] = d.data(); });
    out.foods = {};
    results[1].docs.forEach(function (d) { out.foods[d.id] = d.data(); });
    return out;
  }

  window.AMFIT_STORE = {
    configured: F.configured,
    attach: attach,
    hydrate: hydrate,
    migrate: migrate,
    mirror: mirror,
    account: account,
    loadContent: loadContent,
    onStatus: function (cb) { statusHandler = cb || function () {}; },
    onRemote: function (cb) { remoteHandler = cb || function () {}; },
    uid: function () { return uid; },
    email: function () { return email; }
  };
})();
