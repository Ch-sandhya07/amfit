(function () {
  const F = window.AMFIT_FIREBASE;
  const $ = function (id) { return document.getElementById(id); };
  const esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };

  function status(text, bad) {
    $("adminStatus").textContent = text || "";
    $("adminStatus").classList.toggle("err", Boolean(bad));
  }

  function friendly(err) {
    return F.message(err).replace(/^FirebaseError:\s*/, "");
  }

  async function loadUsers() {
    status("Loading users…");
    $("adminUsers").innerHTML = '<p class="tiny">Loading account directory…</p>';
    try {
      let pageToken = null;
      let users = [];
      do {
        const result = await F.call("listUsers", pageToken ? { pageToken: pageToken } : {});
        users = users.concat((result && result.users) || []);
        pageToken = result && result.pageToken;
      } while (pageToken && users.length < 5000);
      $("adminUsers").innerHTML = users.length ? users.map(function (u) {
        return '<div class="admin-row" data-uid="' + esc(u.uid) + '">' +
          '<div><b>' + esc(u.name || u.email) + '</b><span>' + esc(u.email) + '</span></div>' +
          '<span class="role ' + esc(u.role) + '">' + esc(u.role) + '</span>' +
          '<span class="state ' + (u.disabled ? "off" : "on") + '">' + (u.disabled ? "disabled" : "active") + '</span>' +
          '<div class="admin-actions">' +
            '<button type="button" data-action="role">' + (u.role === "admin" ? "Make user" : "Make admin") + '</button>' +
            '<button type="button" data-action="disable">' + (u.disabled ? "Enable" : "Disable") + '</button>' +
          '</div></div>';
      }).join("") : '<p class="tiny">No Firebase users yet.</p>';
      status(users.length + " account" + (users.length === 1 ? "" : "s") + " loaded.");
    } catch (err) {
      $("adminUsers").innerHTML = '<p class="err">' + esc(friendly(err)) + '</p>';
      status("Could not load users.", true);
    }
  }

  $("adminUsers").addEventListener("click", async function (e) {
    const button = e.target.closest("[data-action]");
    const row = e.target.closest("[data-uid]");
    if (!button || !row) return;
    const uid = row.getAttribute("data-uid");
    const role = row.querySelector(".role").textContent.trim();
    const disabled = row.querySelector(".state").classList.contains("off");
    const action = button.getAttribute("data-action");
    const prompt = action === "role"
      ? "Change this account to " + (role === "admin" ? "user" : "admin") + "?"
      : (disabled ? "Enable this account?" : "Disable this account? They will be unable to sign in.");
    if (!window.confirm(prompt)) return;
    button.disabled = true;
    try {
      if (action === "role") await F.call("setUserRole", { uid: uid, role: role === "admin" ? "user" : "admin" });
      else await F.call("setUserDisabled", { uid: uid, disabled: !disabled });
      await loadUsers();
    } catch (err) {
      status(friendly(err), true);
      button.disabled = false;
    }
  });

  function splitLines(value) {
    return String(value || "").split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 50);
  }

  async function loadContent() {
    status("Loading shared content…");
    try {
      const docs = await Promise.all([
        F.db.collection("content").doc("announcements").get(),
        F.db.collection("content").doc("motivation").get(),
        F.db.collection("content").doc("canteen").get()
      ]);
      $("adminAnnouncement").value = (docs[0].data() || {}).text || "";
      $("adminMotivation").value = ((docs[1].data() || {}).lines || []).join("\n");
      $("adminCanteen").value = ((docs[2].data() || {}).keys || []).join("\n");
      status("Shared content loaded.");
    } catch (err) {
      status(friendly(err), true);
    }
  }

  $("adminContentSave").onclick = async function () {
    const announcement = $("adminAnnouncement").value.trim().slice(0, 280);
    const motivation = splitLines($("adminMotivation").value);
    const canteen = splitLines($("adminCanteen").value).map(function (x) {
      return x.toLowerCase().replace(/[^a-z0-9_]/g, "");
    }).filter(Boolean);
    $("adminContentSave").disabled = true;
    status("Saving shared content…");
    try {
      const stamp = firebase.firestore.FieldValue.serverTimestamp();
      const batch = F.db.batch();
      batch.set(F.db.collection("content").doc("announcements"), { text: announcement, updatedAt: stamp }, { merge: true });
      batch.set(F.db.collection("content").doc("motivation"), { lines: motivation, updatedAt: stamp }, { merge: true });
      batch.set(F.db.collection("content").doc("canteen"), { keys: canteen, updatedAt: stamp }, { merge: true });
      await batch.commit();
      status("Shared content published.");
    } catch (err) {
      status(friendly(err), true);
    }
    $("adminContentSave").disabled = false;
  };

  async function loadFoods() {
    $("adminFoodList").innerHTML = '<p class="tiny">Loading remote foods…</p>';
    try {
      const snap = await F.db.collection("content").doc("foods").collection("items").orderBy("name").get();
      $("adminFoodList").innerHTML = snap.empty ? '<p class="tiny">No remote foods. Built-in foods remain available.</p>' :
        snap.docs.map(function (d) {
          const f = d.data();
          return '<button type="button" class="food-admin-item" data-key="' + esc(d.id) + '">' +
            '<b>' + esc(f.name) + '</b><span>' + Math.round((f.macros || {}).kcal || 0) + ' kcal · edit</span></button>';
        }).join("");
    } catch (err) {
      $("adminFoodList").innerHTML = '<p class="err">' + esc(friendly(err)) + '</p>';
    }
  }

  $("adminFoodList").addEventListener("click", async function (e) {
    const b = e.target.closest("[data-key]");
    if (!b) return;
    const doc = await F.db.collection("content").doc("foods").collection("items").doc(b.getAttribute("data-key")).get();
    const f = doc.data();
    if (!f) return;
    $("foodKey").value = doc.id;
    $("foodKey").disabled = true;
    $("foodName").value = f.name || "";
    $("foodServing").value = f.serving || "";
    ["kcal", "protein", "carbs", "fat", "fiber", "sugar"].forEach(function (k) {
      $("food" + k[0].toUpperCase() + k.slice(1)).value = (f.macros || {})[k] || 0;
    });
    $("adminFoodDelete").classList.remove("hidden");
  });

  function foodPayload() {
    const key = $("foodKey").value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    const name = $("foodName").value.trim();
    const serving = $("foodServing").value.trim();
    if (!key || !name || !serving) throw new Error("Food key, name, and serving are required.");
    const macros = {};
    ["kcal", "protein", "carbs", "fat", "fiber", "sugar"].forEach(function (k) {
      const v = Number($("food" + k[0].toUpperCase() + k.slice(1)).value);
      if (!Number.isFinite(v) || v < 0 || v > 10000) throw new Error("Enter a valid " + k + " value.");
      macros[k] = v;
    });
    return { key: key, value: { name: name.slice(0, 100), serving: serving.slice(0, 120), macros: macros, source: "AMFIT admin catalog" } };
  }

  $("adminFoodSave").onclick = async function () {
    try {
      const payload = foodPayload();
      payload.value.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await F.db.collection("content").doc("foods").collection("items").doc(payload.key).set(payload.value, { merge: true });
      status("Food saved: " + payload.value.name);
      clearFood();
      await loadFoods();
    } catch (err) {
      status(friendly(err), true);
    }
  };

  $("adminFoodDelete").onclick = async function () {
    const key = $("foodKey").value;
    if (!key || !window.confirm("Delete this remote food? Built-in foods are not affected.")) return;
    await F.db.collection("content").doc("foods").collection("items").doc(key).delete();
    clearFood();
    await loadFoods();
    status("Remote food deleted.");
  };

  function clearFood() {
    ["foodKey", "foodName", "foodServing", "foodKcal", "foodProtein", "foodCarbs", "foodFat", "foodFiber", "foodSugar"].forEach(function (id) {
      $(id).value = "";
    });
    $("foodKey").disabled = false;
    $("adminFoodDelete").classList.add("hidden");
  }

  $("adminFoodNew").onclick = clearFood;
  $("adminRefresh").onclick = function () { loadUsers(); loadContent(); loadFoods(); };

  window.AMFIT_ADMIN = {
    render: function () {
      if (!F.configured) {
        status("Firebase is not configured. Add js/firebase-config.js first.", true);
        return;
      }
      loadUsers();
      loadContent();
      loadFoods();
    }
  };
})();
