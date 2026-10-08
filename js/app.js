(function () {
  const KEYS = {
    users: "amfit.users",
    session: "amfit.session",
    logs: "amfit.logs.",
    daily: "amfit.daily.",
    shots: "amfit.shots.",
    fixes: "amfit.fixes.",
    pins: "amfit.pins."
  };
  const $ = (id) => document.getElementById(id);
  let mode = "register";
  let net = null;
  let stream = null;
  let resultBack = "home";
  let activeId = null;
  let trainDay = new Date().getDay();
  let resetStep = "id";
  let resetEmail = "";
  let resetHash = "";
  let resetTicket = "";
  let pendingPlainCodes = null;
  let cloudRole = "user";
  let cloudReady = false;
  let cloudSigningIn = false;
  let sharedContent = {};
  const CODE_ALPHA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

  function mealType(d) {
    const h = d.getHours() + d.getMinutes() / 60;
    if (h >= 4 && h < 10.5) return "Breakfast";
    if (h >= 10.5 && h < 12) return "Brunch";
    if (h >= 12 && h < 15.5) return "Lunch";
    if (h >= 15.5 && h < 17.5) return "Snack";
    if (h >= 17.5 && h < 21.5) return "Dinner";
    return "Late night";
  }
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  function dayKey(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  const ART = {
    plate:
      '<svg viewBox="0 0 120 80" aria-hidden="true">' +
      '<circle cx="60" cy="42" r="30" /><circle cx="60" cy="42" r="22" />' +
      '<path d="M26 42h-8M102 42h-8" /><path d="M46 34c5 6 13 8 22 4" />' +
      '<path d="M84 14l6 6-24 24-8 2 2-8z" /></svg>',
    path:
      '<svg viewBox="0 0 120 80" aria-hidden="true">' +
      '<path d="M14 70c18 0 12-18 30-18s14-20 32-20 18-12 30-12" stroke-dasharray="6 6" />' +
      '<circle cx="90" cy="24" r="5" /><path d="M90 29v12l-8 12M90 41l8 12M84 34l12 0" /></svg>'
  };

  // Lime sparks off the scan button, so the main action feels like it fired.
  function spark(host) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = host.getBoundingClientRect();
    const layer = document.createElement("div");
    layer.className = "sparks";
    layer.style.left = r.left + r.width / 2 + "px";
    layer.style.top = r.top + r.height / 2 + "px";
    for (let i = 0; i < 12; i++) {
      const bit = document.createElement("i");
      const a = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
      const dist = 26 + Math.random() * 22;
      bit.style.setProperty("--x", Math.cos(a) * dist + "px");
      bit.style.setProperty("--y", Math.sin(a) * dist + "px");
      bit.style.animationDelay = Math.random() * 60 + "ms";
      layer.appendChild(bit);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 700);
  }

  async function sha(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) || fb); } catch { return JSON.parse(fb); } };
  const users = () => read(KEYS.users, "[]");
  const saveUsers = (l) => localStorage.setItem(KEYS.users, JSON.stringify(l));
  const session = () => localStorage.getItem(KEYS.session);
  const logs = () => read(KEYS.logs + session(), "[]");
  const saveLogs = (l) => {
    localStorage.setItem(KEYS.logs + session(), JSON.stringify(l));
    if (window.AMFIT_STORE) AMFIT_STORE.mirror("logs", l);
  };
  const daily = () => read(KEYS.daily + session(), "{}");
  const saveDaily = (o) => {
    localStorage.setItem(KEYS.daily + session(), JSON.stringify(o));
    if (window.AMFIT_STORE) AMFIT_STORE.mirror("daily", o);
  };
  const shots = () => read(KEYS.shots + session(), "[]");
  const saveShots = (l) => {
    localStorage.setItem(KEYS.shots + session(), JSON.stringify(l));
    if (window.AMFIT_STORE) AMFIT_STORE.mirror("shots", l);
  };
  const fixes = () => read(KEYS.fixes + session(), "{}");
  const saveFixes = (o) => {
    localStorage.setItem(KEYS.fixes + session(), JSON.stringify(o));
    if (window.AMFIT_STORE) AMFIT_STORE.mirror("fixes", o);
  };
  const savePins = (l) => {
    localStorage.setItem(KEYS.pins + session(), JSON.stringify(l));
    if (window.AMFIT_STORE) AMFIT_STORE.mirror("pins", l);
  };

  function currentUser() { return users().find((u) => u.email === session()); }
  function profile() { const u = currentUser(); return u && u.profile ? u.profile : null; }
  function saveProfile(p) {
    const list = users();
    const i = list.findIndex((u) => u.email === session());
    if (i < 0) return;
    list[i].profile = p;
    if (p.name) list[i].name = p.name;
    saveUsers(list);
    if (window.AMFIT_STORE) AMFIT_STORE.mirror("profile", p);
  }
  function targets() {
    const p = profile();
    return p ? AMFIT_PLAN.targets(p) : null;
  }
  function today() {
    const d = daily()[dayKey(new Date())] || {};
    return {
      steps: d.steps || 0,
      weight: d.weight || null,
      done: d.done || [],
      moves: d.moves || [],
      deskFrom: d.deskFrom || null
    };
  }
  function patchToday(patch) {
    const all = daily();
    const k = dayKey(new Date());
    all[k] = Object.assign({}, all[k], patch);
    saveDaily(all);
  }

  function show(id) {
    const cloudOn = window.AMFIT_FIREBASE && AMFIT_FIREBASE.configured;
    if (id === "admin" && cloudOn && cloudRole !== "admin") id = "you";
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("on"));
    $("screen-" + id).classList.add("on");
    document.body.dataset.screen = id;
    if ($("styleFx")) $("styleFx").classList.add("hidden");
    document.querySelectorAll("#nav button[data-go]").forEach((b) => {
      const g = b.getAttribute("data-go");
      b.classList.toggle("on", g === id || (id === "result" && g === "scan"));
    });
    if (id === "scan") startCam(); else stopCam();
    if (id === "home") renderHome();
    if (id === "micros") renderMicros();
    if (id === "history") renderHistory();
    if (id === "train") renderTrain();
    if (id === "progress") renderProgress();
    if (id === "you") renderYou();
    if (id === "admin" && window.AMFIT_ADMIN) {
      $("nav").classList.add("hidden");
      AMFIT_ADMIN.render();
    }
  }

  function gated() {
    const u = currentUser();
    if (!u) { $("nav").classList.add("hidden"); document.querySelectorAll(".screen").forEach((s) => s.classList.remove("on")); $("screen-auth").classList.add("on"); return; }
    if (!amdocsEmail(u.email)) { localStorage.removeItem(KEYS.session); showAuth(true); $("authErr").textContent = "Use your @amdocs.com email."; return; }
    if (!u.profile || !employeeIdOk(u.employeeId)) { $("nav").classList.add("hidden"); fillProfileForm(u); document.querySelectorAll(".screen").forEach((s) => s.classList.remove("on")); $("screen-profile").classList.add("on"); return; }
    applyTheme(localStorage.getItem("amfit.theme") || u.profile.theme || "system");
    $("nav").classList.remove("hidden");
    show("home");
  }

  function ensureLocalCloudUser(user, name) {
    const list = users();
    let found = list.find((x) => x.email === user.email);
    if (!found) {
      found = {
        name: name || user.displayName || user.email.split("@")[0],
        email: user.email,
        created: Date.now(),
        cloud: true,
        uid: user.uid
      };
      list.push(found);
    } else {
      found.cloud = true;
      found.uid = user.uid;
    }
    saveUsers(list);
    localStorage.setItem(KEYS.session, user.email);
    return found;
  }

  function completeMicros(food) {
    food.micros = food.micros || {};
    AMFIT_MICRO_META.forEach(function (m) {
      if (typeof food.micros[m.key] !== "number") food.micros[m.key] = 0;
    });
    return food;
  }

  async function applySharedContent() {
    if (!window.AMFIT_STORE || !AMFIT_STORE.configured) return;
    try {
      sharedContent = await AMFIT_STORE.loadContent();
      Object.keys(sharedContent.foods || {}).forEach(function (key) {
        AMFIT_FOODS[key] = completeMicros(sharedContent.foods[key]);
      });
      window.__amfitCanteen = sharedContent.canteen && Array.isArray(sharedContent.canteen.keys)
        ? sharedContent.canteen.keys.filter((key) => AMFIT_FOODS[key])
        : null;
      const announcement = (sharedContent.announcements || {}).text || "";
      $("announcement").textContent = announcement;
      $("announcement").classList.toggle("hidden", !announcement);
      const lines = (sharedContent.motivation || {}).lines || [];
      if (lines.length) {
        const once = lines.map((line) => "<span>" + esc(line) + "</span><em>·</em>").join("");
        $("motivationTrack").innerHTML = once + once;
      }
    } catch (err) {
      // Built-in content remains the offline fallback.
    }
  }

  async function finishCloudSession(user, migrate) {
    ensureLocalCloudUser(user);
    if (migrate) await AMFIT_STORE.migrate(user, user.email);
    cloudRole = await AMFIT_STORE.attach(user);
    cloudReady = true;
    await applySharedContent();
    gated();
  }

  /* ---------- auth ---------- */

  function amdocsEmail(email) {
    return /^[a-z0-9._%+-]+@amdocs\.com$/.test(String(email || "").trim().toLowerCase());
  }
  function employeeIdOk(id) {
    return /^[A-Za-z0-9]{4,12}$/.test(String(id || "").trim());
  }
  function saveEmployeeId(email, id) {
    const list = users();
    const i = list.findIndex((u) => u.email === email);
    if (i < 0) return;
    list[i].employeeId = String(id).trim();
    saveUsers(list);
  }
  async function postJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(function () { return {}; });
    if (!res.ok || !json.ok) throw new Error(json.error || "Request failed.");
    return json;
  }

  function normCode(s) {
    return String(s || "").toUpperCase().replace(/[^2-9A-HJ-NP-Z]/g, "");
  }
  function formatCode(raw) {
    const n = normCode(raw);
    return n.length <= 4 ? n : n.slice(0, 4) + "-" + n.slice(4, 8);
  }
  function makePlainCode() {
    const buf = new Uint8Array(8);
    crypto.getRandomValues(buf);
    let s = "";
    for (let i = 0; i < 8; i++) s += CODE_ALPHA[buf[i] % CODE_ALPHA.length];
    return formatCode(s);
  }
  async function makeRecoverySet() {
    const plains = [];
    const hashes = [];
    for (let i = 0; i < 8; i++) {
      const c = makePlainCode();
      plains.push(c);
      hashes.push(await sha(normCode(c)));
    }
    return { plains: plains, hashes: hashes };
  }
  function showCodes(plains, thenHome) {
    pendingPlainCodes = plains;
    $("codeList").textContent = plains.join("\n");
    $("codeErr").textContent = "";
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("on"));
    $("nav").classList.add("hidden");
    $("screen-codes").classList.add("on");
    $("btnSavedCodes").onclick = function () {
      pendingPlainCodes = null;
      $("codeList").textContent = "";
      if (thenHome) gated();
      else showAuth(true);
    };
  }
  $("btnCopyCodes").onclick = async function () {
    const text = $("codeList").textContent;
    if (!text) return;
    try { await navigator.clipboard.writeText(text); $("codeErr").textContent = "Copied."; }
    catch (err) { $("codeErr").textContent = "Copy failed. Write them down instead."; }
  };

  function bindAuthToggle() {
    $("toggleAuth").onclick = function () {
      mode = mode === "register" ? "login" : "register";
      $("nameWrap").classList.toggle("hidden", mode === "login");
      $("forgotWrap").classList.toggle("hidden", mode !== "login");
      $("password").autocomplete = mode === "register" ? "new-password" : "current-password";
      $("password").required = true;
      $("authSubmit").textContent = mode === "register" ? "Create account and start" : "Sign in";
      $("authSwitch").innerHTML = mode === "register"
        ? 'Already have an account? <a id="toggleAuth">Sign in</a>'
        : 'New here? <a id="toggleAuth">Register</a>';
      $("authErr").textContent = "";
      bindAuthToggle();
    };
  }
  bindAuthToggle();

  function paintSsoAvailability() {
    const enabled = Boolean(window.AMFIT_FIREBASE && AMFIT_FIREBASE.configured);
    $("btnMicrosoftSso").disabled = !enabled;
    $("ssoNote").textContent = enabled
      ? "Uses your Amdocs Microsoft login. Email and employee ID come from the company directory."
      : "Amdocs SSO starts after IT registers AMFIT. Until then use your @amdocs.com email below.";
  }
  paintSsoAvailability();

  async function signInWithSso() {
    if (!window.AMFIT_FIREBASE || !AMFIT_FIREBASE.configured) {
      $("authErr").textContent = "Amdocs SSO is not set up yet. Use your @amdocs.com email below.";
      return;
    }
    $("authErr").textContent = "Opening Amdocs sign-in…";
    $("btnMicrosoftSso").disabled = true;
    cloudSigningIn = true;
    try {
      const result = await AMFIT_FIREBASE.sso();
      const user = result.user;
      const dir = await AMFIT_FIREBASE.directory(result);
      if (!amdocsEmail(dir.email || user.email)) {
        await AMFIT_FIREBASE.logout();
        throw new Error("Only an Amdocs work account can sign in.");
      }
      ensureLocalCloudUser(user, dir.name);
      if (employeeIdOk(dir.employeeId)) saveEmployeeId(user.email, dir.employeeId);
      await AMFIT_STORE.account(user, dir.name, dir.employeeId);
      const local = users().find(function (u) { return u.email === user.email; });
      const migrate = Boolean(local && local.hash && !localStorage.getItem("amfit.migrated." + user.email));
      await finishCloudSession(user, migrate);
    } catch (err) {
      $("authErr").textContent = AMFIT_FIREBASE.message(err);
    } finally {
      cloudSigningIn = false;
      paintSsoAvailability();
    }
  }
  $("btnMicrosoftSso").onclick = signInWithSso;

  function showAuth(login) {
    mode = login ? "login" : "register";
    $("nameWrap").classList.toggle("hidden", login);
    $("forgotWrap").classList.toggle("hidden", !login);
    $("password").autocomplete = login ? "current-password" : "new-password";
    $("authSubmit").textContent = login ? "Sign in" : "Create account and start";
    $("authSwitch").innerHTML = login
      ? 'New here? <a id="toggleAuth">Register</a>'
      : 'Already have an account? <a id="toggleAuth">Sign in</a>';
    bindAuthToggle();
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("on"));
    $("nav").classList.add("hidden");
    $("screen-auth").classList.add("on");
  }

  function resetUi(step) {
    resetStep = step;
    $("resetIdStep").classList.toggle("hidden", step === "pass");
    $("resetCodeWrap").classList.toggle("hidden", step !== "code");
    $("resetPassStep").classList.toggle("hidden", step !== "pass");
    $("resetErr").textContent = "";
    if (step === "email") {
      $("resetTitle").textContent = "Forgot password";
      $("resetSub").textContent = "Email a code";
      $("resetHint").textContent = "Enter your @amdocs.com address. AMFIT emails a 6-digit code. This resets your AMFIT password, not your Amdocs network password.";
      $("resetGo").textContent = "Email me a code";
    } else if (step === "code") {
      $("resetTitle").textContent = "Check your mail";
      $("resetSub").textContent = "6-digit code";
      $("resetHint").textContent = "Enter the code sent to " + resetEmail + ". It expires in 10 minutes.";
      $("resetGo").textContent = "Verify code";
    } else {
      $("resetTitle").textContent = "New AMFIT password";
      $("resetSub").textContent = "Code accepted";
      $("resetHint").textContent = "Choose a new AMFIT password of at least 6 characters.";
      $("resetGo").textContent = "Save password";
    }
  }

  function openReset() {
    resetHash = "";
    resetTicket = "";
    resetEmail = ($("email").value || "").trim().toLowerCase();
    $("resetEmail").value = resetEmail;
    $("resetCode").value = "";
    $("resetPass").value = "";
    $("resetPass2").value = "";
    resetUi("email");
    const cloud = window.AMFIT_FIREBASE && AMFIT_FIREBASE.configured;
    if (cloud) {
      $("resetTitle").textContent = "Reset password";
      $("resetSub").textContent = "Secure email link";
      $("resetHint").textContent = "Firebase emails a reset link to this @amdocs.com address.";
      $("resetGo").textContent = "Send reset email";
      $("resetCodeWrap").classList.add("hidden");
    }
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("on"));
    $("nav").classList.add("hidden");
    $("screen-reset").classList.add("on");
  }

  $("forgotLink").onclick = function (e) {
    e.preventDefault();
    openReset();
  };

  $("resetBack").onclick = function () {
    resetHash = "";
    resetTicket = "";
    showAuth(true);
  };

  $("resetGo").onclick = async function () {
    $("resetErr").textContent = "";
    $("resetGo").disabled = true;
    try {
      if (window.AMFIT_FIREBASE && AMFIT_FIREBASE.configured) {
        const cloudEmail = $("resetEmail").value.trim().toLowerCase();
        if (!amdocsEmail(cloudEmail)) throw new Error("Use your @amdocs.com email.");
        await AMFIT_FIREBASE.reset(cloudEmail);
        showAuth(true);
        $("authErr").textContent = "Password-reset email sent. Check your Amdocs inbox.";
        $("resetGo").disabled = false;
        return;
      }
      if (resetStep === "email") {
        const email = $("resetEmail").value.trim().toLowerCase();
        if (!amdocsEmail(email)) throw new Error("Use your @amdocs.com email.");
        if (!users().some((x) => x.email === email)) throw new Error("No AMFIT account on this browser uses that email.");
        await postJson("/api/send-otp", { email: email });
        resetEmail = email;
        resetUi("code");
        $("resetCode").focus();
      } else if (resetStep === "code") {
        const otp = String($("resetCode").value || "").replace(/\D/g, "");
        if (!/^\d{6}$/.test(otp)) throw new Error("Enter the 6-digit code from your email.");
        const verified = await postJson("/api/verify-otp", { email: resetEmail, otp: otp });
        resetTicket = verified.ticket;
        resetUi("pass");
        $("resetPass").focus();
      } else {
        const p1 = $("resetPass").value;
        const p2 = $("resetPass2").value;
        if (p1.length < 6) throw new Error("Password must be at least 6 characters.");
        if (p1 !== p2) throw new Error("Passwords do not match.");
        if (!resetEmail || !resetTicket) throw new Error("Start again from the email step.");
        await postJson("/api/consume-reset", { email: resetEmail, ticket: resetTicket });
        const list = users();
        const i = list.findIndex((x) => x.email === resetEmail);
        if (i < 0) throw new Error("Account is no longer on this browser.");
        list[i].hash = await sha(p1);
        saveUsers(list);
        resetTicket = "";
        $("email").value = resetEmail;
        $("password").value = "";
        $("authErr").textContent = "Password updated. Sign in with your new AMFIT password.";
        showAuth(true);
      }
    } catch (err) {
      $("resetErr").textContent = err.message || String(err);
    }
    $("resetGo").disabled = false;
  };

  $("authForm").onsubmit = async function (e) {
    e.preventDefault();
    $("authErr").textContent = "";
    const email = $("email").value.trim().toLowerCase();
    const password = $("password").value;
    const name = $("name").value.trim();
    const empId = $("empId").value.trim();
    if (!amdocsEmail(email)) {
      $("authErr").textContent = "Use your @amdocs.com email.";
      return;
    }
    if (mode === "register" && !employeeIdOk(empId)) {
      $("authErr").textContent = "Enter your employee ID: 4–12 letters or numbers.";
      return;
    }
    if (!email || password.length < 6) {
      $("authErr").textContent = "Use your Amdocs email and an AMFIT password of 6+ characters.";
      return;
    }
    const list = users();
    const local = list.find((u) => u.email === email);
    const hash = await sha(password);
    if (window.AMFIT_FIREBASE && AMFIT_FIREBASE.configured) {
      $("authSubmit").disabled = true;
      cloudSigningIn = true;
      $("authErr").textContent = mode === "register" ? "Creating secure cloud account…" : "Signing in…";
      try {
        if (mode === "register") {
          if (!name) throw new Error("Name is required to register.");
          const credential = await AMFIT_FIREBASE.register(email, password);
          await credential.user.updateProfile({ displayName: name });
          ensureLocalCloudUser(credential.user, name);
          saveEmployeeId(email, empId);
          await AMFIT_STORE.account(credential.user, name, empId);
          cloudRole = await AMFIT_STORE.attach(credential.user);
          cloudReady = true;
          gated();
        } else {
          let credential;
          try {
            credential = await AMFIT_FIREBASE.login(email, password);
          } catch (cloudErr) {
            // A valid legacy password can create the user's Firebase account once.
            if (!local || local.hash !== hash) throw cloudErr;
            credential = await AMFIT_FIREBASE.register(email, password);
          }
          const legacyMatches = local && local.hash === hash && !localStorage.getItem("amfit.migrated." + email);
          await finishCloudSession(credential.user, legacyMatches);
        }
      } catch (err) {
        $("authErr").textContent = AMFIT_FIREBASE.message(err);
      }
      cloudSigningIn = false;
      $("authSubmit").disabled = false;
      return;
    }
    if (mode === "register") {
      if (!name) { $("authErr").textContent = "Name is required to register."; return; }
      if (list.some((u) => u.email === email)) { $("authErr").textContent = "That email is already registered. Sign in."; return; }
      list.push({ name: name, email: email, employeeId: empId, hash: hash, created: Date.now(), recovery: [] });
      saveUsers(list);
      localStorage.setItem(KEYS.session, email);
      gated();
      return;
    }
    const u = list.find((x) => x.email === email && x.hash === hash);
    if (!u) { $("authErr").textContent = "Email or password does not match."; return; }
    localStorage.setItem(KEYS.session, email);
    gated();
  };

  /* ---------- profile ---------- */

  function segSet(id, val) {
    document.querySelectorAll("#" + id + " button").forEach((b) => {
      b.classList.toggle("on", b.getAttribute("data-v") === val);
    });
  }
  function bindSeg(id, field) {
    $(id).addEventListener("click", function (e) {
      const b = e.target.closest("button[data-v]");
      if (!b) return;
      draft[field] = b.getAttribute("data-v");
      segSet(id, draft[field]);
    });
  }
  bindSeg("segSex", "sex");
  bindSeg("segActivity", "activity");
  bindSeg("segGoal", "goal");
  bindSeg("segExp", "experience");

  function fillProfileForm(u) {
    const p = u.profile || {};
    draft = {
      sex: p.sex || "female",
      activity: p.activity || "light",
      goal: p.goal || "lose",
      experience: p.experience || "beginner",
      photo: p.photo || ""
    };
    $("pName").value = p.name || u.name || "";
    $("pEmp").value = u.employeeId || "";
    $("pWeight").value = p.weight || "";
    $("pHeight").value = p.height || "";
    $("pAge").value = p.age || "";
    segSet("segSex", draft.sex);
    segSet("segActivity", draft.activity);
    segSet("segGoal", draft.goal);
    segSet("segExp", draft.experience);
    $("profSub").textContent = u.profile ? "Edit your numbers" : "Set up once";
    $("profErr").textContent = "";
    const img = $("pPhoto");
    if (draft.photo) { img.src = draft.photo; img.classList.remove("hidden"); }
    else img.classList.add("hidden");
    $("btnPhoto").textContent = draft.photo ? "Change photo" : "Add photo";
  }

  $("btnPhoto").onclick = () => $("profFile").click();
  $("profFile").onchange = function () {
    const f = this.files && this.files[0];
    if (!f) return;
    loadImage(f, 420, (dataUrl) => {
      draft.photo = dataUrl;
      $("pPhoto").src = dataUrl;
      $("pPhoto").classList.remove("hidden");
      $("btnPhoto").textContent = "Change photo";
    });
  };

  $("profSave").onclick = function () {
    const name = $("pName").value.trim();
    const empId = $("pEmp").value.trim();
    const weight = parseFloat($("pWeight").value);
    const height = parseFloat($("pHeight").value);
    const age = parseInt($("pAge").value, 10);
    if (!name) { $("profErr").textContent = "Name is required."; return; }
    if (!employeeIdOk(empId)) { $("profErr").textContent = "Enter your employee ID: 4–12 letters or numbers."; return; }
    if (!(weight >= 25 && weight <= 300)) { $("profErr").textContent = "Enter weight in kg between 25 and 300."; return; }
    if (!(height >= 100 && height <= 250)) { $("profErr").textContent = "Enter height in cm between 100 and 250."; return; }
    if (!(age >= 10 && age <= 100)) { $("profErr").textContent = "Enter age between 10 and 100."; return; }
    const p = {
      name, weight, height, age,
      sex: draft.sex, activity: draft.activity, goal: draft.goal,
      experience: draft.experience, photo: draft.photo,
      startWeight: (profile() && profile().startWeight) || weight,
      startedOn: (profile() && profile().startedOn) || dayKey(new Date())
    };
    saveEmployeeId(session(), empId);
    saveProfile(p);
    if (draft.photo && !shots().length) {
      saveShots([{ day: p.startedOn, thumb: draft.photo, weight }]);
    }
    $("nav").classList.remove("hidden");
    show("home");
  };

  /* ---------- home ---------- */

  function todayLogs() {
    const k = dayKey(new Date());
    return logs().filter((x) => x.day === k);
  }
  function sumMacros(rows) {
    return rows.reduce((a, r) => {
      const m = r.food.macros;
      a.kcal += m.kcal; a.protein += m.protein; a.fiber += m.fiber || 0;
      a.carbs += m.carbs; a.fat += m.fat;
      return a;
    }, { kcal: 0, protein: 0, fiber: 0, carbs: 0, fat: 0 });
  }

  /* ---------- canteen: one-tap logging ---------- */

  // Office food repeats. Photographing the same filter coffee twice a day is the
  // friction that kills a food log, so pinned items log in one tap.
  function pins() {
    const stored = read(KEYS.pins + session(), "null");
    if (Array.isArray(stored)) return stored.filter((x) => x && x.key && pinFood(x));
    const defaults = window.__amfitCanteen || AMFIT_PLAN.CANTEEN;
    return defaults.filter((k) => AMFIT_FOODS[k]).map((k) => ({ key: k }));
  }
  function pinFood(p) { return (p && p.food) || (p && AMFIT_FOODS[p.key]) || null; }
  const isPinned = (key) => pins().some((p) => p.key === key);
  let pinEdit = false;

  // Pinned items have no photo, so stand in a tile with the dish initials.
  function tileThumb(name) {
    const c = document.createElement("canvas");
    c.width = 160;
    c.height = 160;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 160, 160);
    grad.addColorStop(0, "#c6f23a");
    grad.addColorStop(1, "#3dd68c");
    g.fillStyle = grad;
    g.fillRect(0, 0, 160, 160);
    const initials = String(name).split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
    g.fillStyle = "#10160a";
    g.font = "800 68px Outfit, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(initials || "•", 80, 86);
    return c.toDataURL("image/jpeg", 0.7);
  }

  function renderQuick() {
    const list = pins();
    const now = new Date();
    $("quickCard").classList.toggle("editing", pinEdit);
    $("quickCard").innerHTML =
      (list.length
        ? '<div class="pins">' + list.map(function (p, i) {
            const f = pinFood(p);
            return '<button type="button" class="pin" data-pin="' + i + '">' +
              "<b>" + esc(f.name) + "</b>" +
              "<span>" + Math.round(f.macros.kcal) + " kcal · " + f.macros.protein.toFixed(0) + " g P</span>" +
              '<i class="x" data-unpin="' + i + '" title="Unpin">×</i></button>';
          }).join("") + "</div>"
        : '<div class="empty art">' + ART.plate + "<p>No canteen items pinned. Open any logged meal and tap <b>Pin to canteen</b>.</p></div>") +
      '<p class="tiny" id="quickStatus">One tap logs it as ' + mealType(now).toLowerCase() + " at " + esc(fmtTime(now)) +
      ". Pin whatever your canteen actually serves.</p>" +
      (list.length
        ? '<button class="btn btn-ghost" type="button" id="btnPinEdit" style="margin-top:6px">' +
          (pinEdit ? "Done" : "Edit pins") + "</button>"
        : "");
    if (list.length) {
      $("btnPinEdit").onclick = function () { pinEdit = !pinEdit; renderQuick(); };
    }
  }

  function quickLog(p, el) {
    const f = pinFood(p);
    if (!f) return;
    const when = new Date();
    const list = logs();
    let id = String(when.getTime());
    // Two taps inside the same millisecond would otherwise share an id, and
    // deleting one would delete both.
    while (list.some((x) => x.id === id)) id += "1";
    const entry = {
      id: id,
      day: dayKey(when),
      time: fmtTime(when),
      iso: when.toISOString(),
      meal: mealType(when),
      foodKey: p.key,
      food: f,
      detected: "canteen pin",
      confirmed: true,
      thumb: tileThumb(f.name)
    };
    list.push(entry);
    saveLogs(list);
    if (el) spark(el);
    renderHome();
    $("quickStatus").textContent =
      f.name + " logged at " + entry.time + " · " + Math.round(f.macros.kcal) + " kcal, " +
      f.macros.protein.toFixed(0) + " g protein in.";
  }

  $("quickCard").addEventListener("click", function (e) {
    const un = e.target.closest("[data-unpin]");
    if (un && pinEdit) {
      e.stopPropagation();
      const i = parseInt(un.getAttribute("data-unpin"), 10);
      savePins(pins().filter((_, n) => n !== i));
      renderQuick();
      return;
    }
    const hit = e.target.closest("[data-pin]");
    if (!hit || pinEdit) return;
    const p = pins()[parseInt(hit.getAttribute("data-pin"), 10)];
    if (p) quickLog(p, hit);
  });

  /* ---------- desk: chair hours, breaks, two-minute reset ---------- */

  const SIT_LIMIT = 50; // minutes in the chair before the card starts nagging

  function deskState(now) {
    const d = today();
    const last = d.moves.length ? new Date(d.moves[d.moves.length - 1]) : null;
    const from = d.deskFrom ? new Date(d.deskFrom) : now;
    const since = last && last > from ? last : from;
    const sitMin = Math.max(0, Math.floor((now - since) / 60000));
    // Credit five minutes off the chair per logged break.
    const chairMin = Math.max(0, Math.floor((now - from) / 60000) - d.moves.length * 5);
    return { sitMin, chairMin, breaks: d.moves.length };
  }

  function renderDesk() {
    const now = new Date();
    if (!today().deskFrom) patchToday({ deskFrom: now.toISOString() });
    const st = deskState(now);
    const pct = Math.min(100, (st.sitMin / SIT_LIMIT) * 100);
    const over = st.sitMin >= SIT_LIMIT;
    $("deskCard").classList.toggle("nudge", over);
    $("deskCard").innerHTML =
      '<div class="line"><b>Desk</b><span>' + (st.chairMin / 60).toFixed(1) + " h in the chair · " +
        st.breaks + (st.breaks === 1 ? " break" : " breaks") + "</span></div>" +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="line" style="margin-top:8px"><b id="sitClock">' +
        (st.sitMin < 1 ? "Just moved" : "Sitting " + fmtMins(st.sitMin)) + "</b><span>limit " + SIT_LIMIT + " min</span></div>" +
      '<p class="tiny">' + (over
        ? "An hour in the chair undoes a good lunch. Two minutes fixes it."
        : "Steps are the cardio; standing up is the maintenance. Every break counts five minutes off the chair.") + "</p>" +
      '<div class="row-btns" style="margin-top:10px">' +
        '<button class="btn btn-ghost" type="button" data-desk="move">I moved</button>' +
        '<button class="btn btn-primary" type="button" data-desk="reset">2-min desk reset</button>' +
      "</div>";
  }

  function fmtMins(m) {
    return m >= 60 ? Math.floor(m / 60) + "h " + String(m % 60).padStart(2, "0") + "m" : m + " min";
  }

  function logMove() {
    const list = today().moves.slice();
    list.push(new Date().toISOString());
    patchToday({ moves: list });
    renderDesk();
  }

  $("deskCard").addEventListener("click", function (e) {
    const b = e.target.closest("[data-desk]");
    if (!b) return;
    if (b.getAttribute("data-desk") === "move") { spark(b); logMove(); return; }
    startDeskReset();
  });

  let deskTimer = null;

  function startDeskReset() {
    const moves = AMFIT_PLAN.DESK_RESET;
    let i = 0;
    let left = moves[0].s;
    let elapsed = 0;
    stopDeskReset(false);
    $("deskFx").classList.remove("hidden");
    paintDeskStep(moves, i, left, elapsed);
    deskTimer = setInterval(function () {
      left--;
      elapsed++;
      if (left <= 0) {
        i++;
        if (i >= moves.length) { stopDeskReset(true); return; }
        left = moves[i].s;
      }
      paintDeskStep(moves, i, left, elapsed);
    }, 1000);
  }

  function paintDeskStep(moves, i, left, elapsed) {
    $("deskStep").textContent = "Move " + (i + 1) + " of " + moves.length;
    $("deskMove").textContent = moves[i].n;
    $("deskCue").textContent = moves[i].cue;
    $("deskCount").textContent = String(left);
    $("deskBar").style.width = (elapsed / AMFIT_PLAN.DESK_SECONDS) * 100 + "%";
  }

  function stopDeskReset(finished) {
    if (deskTimer) { clearInterval(deskTimer); deskTimer = null; }
    if (!finished) return;
    $("deskFx").classList.add("hidden");
    logMove();
    celebrate("desk");
  }

  $("deskStop").onclick = function () {
    stopDeskReset(false);
    $("deskFx").classList.add("hidden");
  };

  /* ---------- animated chrome ---------- */

  const lastShown = {};

  // Count a number up to its new value instead of snapping, so progress feels earned.
  function countUp(id, to) {
    const el = $(id);
    if (!el) return;
    const from = typeof lastShown[id] === "number" ? lastShown[id] : 0;
    lastShown[id] = to;
    if (from === to) { el.textContent = to.toLocaleString(); return; }
    const start = performance.now();
    const span = 620;
    function step(now) {
      const k = Math.min(1, (now - start) / span);
      const eased = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function ringSvg(pct, colour) {
    const r = 34;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - Math.min(1, pct));
    return '<svg viewBox="0 0 92 92" aria-hidden="true">' +
      '<circle class="track" cx="46" cy="46" r="' + r + '"></circle>' +
      '<circle class="fill" cx="46" cy="46" r="' + r + '" stroke="' + colour + '" ' +
      'stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + circ.toFixed(1) + '" ' +
      'data-offset="' + offset.toFixed(1) + '"></circle>' +
      '<text class="val" x="46" y="51" text-anchor="middle">' + Math.round(pct * 100) + "%</text>" +
      "</svg>";
  }

  function renderRings(sum, t, d) {
    if (!t) { $("ringCard").classList.add("hidden"); return; }
    $("ringCard").classList.remove("hidden");
    const proteinPct = sum.protein / t.protein;
    // After 18:00 a half-empty protein ring breathes once — a nudge, not a lecture.
    const nudge = proteinPct < 0.5 && new Date().getHours() >= 18;
    const items = [
      { pct: sum.kcal / t.kcal, colour: "#c6f23a", label: "Calories", sub: Math.round(sum.kcal) + "/" + t.kcal },
      { pct: proteinPct, colour: "#4fd3e8", label: "Protein", sub: Math.round(sum.protein) + "/" + t.protein + "g", nudge: nudge },
      { pct: sum.fiber / t.fiber, colour: "#ffb03a", label: "Fibre", sub: Math.round(sum.fiber) + "/" + t.fiber + "g" },
      { pct: d.steps / t.steps, colour: "#a78bfa", label: "Steps", sub: d.steps.toLocaleString() }
    ];
    $("ringCard").innerHTML = items.map(function (it) {
      return '<div class="ring' + (it.pct >= 1 ? " done" : "") + (it.nudge ? " nudge" : "") + '">' +
        ringSvg(it.pct, it.colour) +
        "<b>" + it.label + "</b><span>" + it.sub + "</span></div>";
    }).join("");
    // Paint at zero first, then animate to the real offset on the next frame.
    requestAnimationFrame(function () {
      $("ringCard").querySelectorAll(".fill").forEach(function (c) {
        c.style.strokeDashoffset = c.getAttribute("data-offset");
      });
    });
  }

  // Confetti takes the colour of the ring that closed.
  const PARTY_COLOURS = {
    kcal: ["#c6f23a", "#d8ff5c", "#8bb82a", "#ffffff"],
    protein: ["#4fd3e8", "#7ae7ff", "#2aa7bd", "#ffffff"],
    fiber: ["#ffb03a", "#ffd27a", "#e48720", "#ffffff"],
    steps: ["#a78bfa", "#c7b3ff", "#7c5cf0", "#ffffff"]
  };

  // The chip carries the clock plus a streak flame from day 3. The clock ticks
  // every second, so the streak is read once per render and cached here rather
  // than recomputed from the log on every tick.
  let chipStreak = 0;
  function paintClock(now, streak) {
    if (typeof streak === "number") chipStreak = streak;
    $("liveClock").innerHTML = "<span>" + esc(fmtTime(now)) + "</span>" +
      (chipStreak >= 3 ? ' <b class="flame" title="' + chipStreak + '-day streak">🔥' + chipStreak + "</b>" : "");
  }

  function celebrate(reason) {
    const stampKey = "amfit.party." + dayKey(new Date()) + "." + reason;
    if (sessionStorage.getItem(stampKey)) return;
    sessionStorage.setItem(stampKey, "1");
    const layer = document.createElement("div");
    layer.className = "confetti";
    const colours = PARTY_COLOURS[reason] || ["#c6f23a", "#4fd3e8", "#a78bfa", "#ff8a6b", "#ffffff"];
    for (let i = 0; i < 28; i++) {
      const piece = document.createElement("i");
      piece.className = "conf";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.background = colours[i % colours.length];
      piece.style.setProperty("--dur", 1500 + Math.random() * 900 + "ms");
      piece.style.animationDelay = Math.random() * 260 + "ms";
      layer.appendChild(piece);
    }
    document.body.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 2800);
  }

  // Consecutive days, ending today, with at least one logged meal.
  function logStreak() {
    const days = new Set(logs().map((r) => r.day));
    let n = 0;
    const cursor = new Date();
    while (days.has(dayKey(cursor))) {
      n++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return n;
  }

  // Motivation from the user's own numbers. Rules only, no model, no network.
  function renderHype(sum, t, d, mealCount) {
    if (!t) { $("hypeCard").classList.add("hidden"); return; }
    $("hypeCard").classList.remove("hidden");
    const hour = new Date().getHours();
    const streak = logStreak();
    const proteinLeft = Math.max(0, t.protein - Math.round(sum.protein));
    const stepsLeft = Math.max(0, t.steps - d.steps);
    const session = AMFIT_PLAN.week(profile())[new Date().getDay()];
    let icon = "⚡";
    let line;

    if (!mealCount) {
      line = "Nothing logged yet. Tap <b>+</b> and photograph the plate — five seconds, that is the whole habit.";
      icon = "📸";
    } else if (proteinLeft > 0 && hour >= 17) {
      line = "<b>" + proteinLeft + " g protein</b> left today. Curd, dal, eggs or paneer closes it before bed.";
      icon = "🥛";
    } else if (stepsLeft === 0 && proteinLeft === 0) {
      line = "Steps hit and protein hit. <b>That is a complete day</b> — the rest is just repetition.";
      icon = "🏆";
    } else if (stepsLeft === 0) {
      line = "Step goal done — <b>that is your cardio handled</b>. Protein is the only box left.";
      icon = "✅";
    } else if (session.key && !(d.done || []).length) {
      line = "Today is <b>" + esc(session.name) + "</b>. The first set is the hard part; the rest follows.";
      icon = "🏋️";
    } else if (streak >= 2) {
      line = "<b>Day " + streak + "</b> logged in a row. Streaks beat motivation — do not break the chain tonight.";
      icon = "🔥";
    } else if (stepsLeft > 0 && stepsLeft <= 2000) {
      line = "Only <b>" + stepsLeft.toLocaleString() + " steps</b> short. One walk around the block closes it.";
      icon = "👟";
    } else {
      line = "Logged and moving. <b>Consistency</b>, not perfection — a 90% week beats a perfect Monday.";
      icon = "⚡";
    }
    $("hypeCard").innerHTML = "<i>" + icon + "</i><p>" + line + "</p>";
  }

  function renderHome() {
    const u = currentUser();
    const t = targets();
    const now = new Date();
    $("greet").textContent = now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
    $("homeName").textContent = u ? "Hi, " + u.name.split(" ")[0] : "AMFIT";
    $("mealNow").textContent = "Next likely: " + mealType(now);

    paintClock(now, logStreak());
    const p0 = profile();
    $("goalMark").textContent = p0 ? (p0.goal === "lose" ? "LEAN" : p0.goal === "gain" ? "BUILD" : "STAY") : "";
    const todaySession = p0 ? AMFIT_PLAN.week(p0)[now.getDay()] : null;
    document.body.dataset.train = todaySession && todaySession.key ? "lift" : "rest";

    const rows = todayLogs();
    const s = sumMacros(rows);
    countUp("tKcal", Math.round(s.kcal));
    countUp("tP", Math.round(s.protein));
    countUp("tFiber", Math.round(s.fiber));
    countUp("tC", Math.round(s.carbs));
    countUp("tF", Math.round(s.fat));
    if (t) {
      $("kcalSub").textContent = "of " + t.kcal + " kcal";
      $("pSub").textContent = "of " + t.protein + " g protein";
      $("fiberSub").textContent = "of " + t.fiber + " g fibre";
    }

    const d = today();
    const goal = t ? t.steps : 8000;
    const pct = Math.min(100, (d.steps / goal) * 100);
    renderHype(s, t, d, rows.length);
    renderRings(s, t, d);
    if (t) {
      if (d.steps >= t.steps) celebrate("steps");
      if (Math.round(s.protein) >= t.protein) celebrate("protein");
      if (Math.round(s.fiber) >= t.fiber) celebrate("fiber");
      // Only when calories land on target, not when they sail past it.
      if (s.kcal >= t.kcal && s.kcal <= t.kcal * 1.05) celebrate("kcal");
    }
    $("stepsCard").innerHTML =
      '<div class="line"><b>Steps</b><span>' + d.steps.toLocaleString() + " / " + goal.toLocaleString() + "</span></div>" +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="step-btns">' +
        '<button type="button" data-step="500">+500</button>' +
        '<button type="button" data-step="1000">+1,000</button>' +
        '<button type="button" data-step="2500">+2,500</button>' +
        '<button type="button" data-step="set">Set</button>' +
        '<button type="button" data-step="0">Reset</button>' +
      "</div>" +
      '<p class="tiny">Goal from your activity level and target' + (t && t.ratePerWeek ? ", raised for fat loss" : "") + ". Browsers cannot read your phone's pedometer, so log the count from your watch or Health app.</p>";

    if (t) {
      const w = AMFIT_PLAN.week(profile());
      const s2 = w[now.getDay()];
      $("todayTrain").innerHTML =
        '<div class="line"><b>' + esc(s2.name) + "</b><span>" + AMFIT_PLAN.program(profile()).label + "</span></div>" +
        '<p class="tiny" style="margin-top:4px">' + (s2.key ? "Today is a lifting day. Water target " + t.water + " L, fiber " + t.fiber + " g." : "Rest day — hit your step goal and keep protein at " + t.protein + " g.") + "</p>" +
        '<button class="btn btn-ghost" type="button" data-goto="train" style="margin-top:12px">' + (s2.key ? "Open today's session" : "See the week") + "</button>";
    }

    renderDesk();
    renderQuick();
    bindStyleThumbs();

    $("todayList").innerHTML = rows.length
      ? rows.map(mealRow).join("")
      : '<div class="empty art">' + ART.plate + "<p>Nothing logged yet. Tap + and photograph the plate.</p></div>";
  }

  $("stepsCard").addEventListener("click", function (e) {
    const b = e.target.closest("[data-step]");
    if (!b) return;
    const v = b.getAttribute("data-step");
    const cur = today().steps;
    if (v === "set") {
      const entered = window.prompt("Steps today", String(cur));
      if (entered === null) return;
      const n = parseInt(entered, 10);
      if (isNaN(n) || n < 0 || n > 100000) return;
      patchToday({ steps: n });
    } else if (v === "0") {
      patchToday({ steps: 0 });
    } else {
      patchToday({ steps: Math.min(100000, cur + parseInt(v, 10)) });
    }
    renderHome();
  });

  $("todayTrain").addEventListener("click", function (e) {
    if (e.target.closest("[data-goto]")) { trainDay = new Date().getDay(); show("train"); }
  });

  document.querySelectorAll(".quick [data-go]").forEach((b) => {
    b.onclick = () => show(b.getAttribute("data-go"));
  });

  function listBlock(title, items) {
    return "<h4>" + esc(title) + "</h4><ul>" +
      items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
      "</ul>";
  }
  function showImg(el, src, alt) {
    if (!el || !src) return;
    el.onload = function () { el.classList.remove("hidden"); };
    el.onerror = function () { el.classList.add("hidden"); el.removeAttribute("src"); };
    el.alt = alt || "";
    el.src = src;
  }
  // Tiles prefer the cover photo, then the first look that actually loaded.
  function bindStyleThumbs() {
    document.querySelectorAll(".pose-strip .style-thumb").forEach(function (img) {
      const key = img.closest("[data-style]").getAttribute("data-style");
      const tip = AMFIT_PLAN.STYLE_TIPS[key] || {};
      const queue = [img.getAttribute("data-src")].concat((tip.looks || []).map(function (l) { return l.img; }));
      (function next(i) {
        if (i >= queue.length) { img.classList.add("hidden"); return; }
        img.onload = function () { img.classList.remove("hidden"); };
        img.onerror = function () { next(i + 1); };
        img.src = queue[i];
      })(0);
    });
  }

  // Each look owns an image slot. Missing files fall back to a labelled frame,
  // so the gallery stays useful before any photography exists.
  function looksBlock(looks) {
    if (!looks || !looks.length) return "";
    return '<h4>Poses &amp; styles</h4><div class="look-grid">' +
      looks.map(function (l, i) {
        return '<figure class="look" data-look="' + i + '">' +
          '<img class="hidden" alt="' + esc(l.label) + '">' +
          '<span class="look-todo">Photo slot</span>' +
          "<figcaption><b>" + esc(l.label) + "</b><span>" + esc(l.cue) + "</span></figcaption>" +
          "</figure>";
      }).join("") + "</div>";
  }
  function openStyle(key) {
    const tip = AMFIT_PLAN.STYLE_TIPS[key];
    if (!tip) return;
    $("styleKicker").textContent = tip.kicker;
    $("styleTitle").textContent = tip.title;
    $("styleLead").textContent = tip.lead;
    $("styleBody").innerHTML =
      listBlock("Do this", tip.tips) + looksBlock(tip.looks) + listBlock("Fashion sense", tip.fashion);
    $("styleBody").querySelectorAll(".look").forEach(function (fig) {
      const look = tip.looks[Number(fig.getAttribute("data-look"))];
      const img = fig.querySelector("img");
      img.onload = function () {
        img.classList.remove("hidden");
        fig.querySelector(".look-todo").remove();
      };
      img.src = look.img;
    });
    const hero = $("styleHero");
    hero.classList.add("hidden");
    showImg(hero, tip.img, tip.title);
    $("styleFx").classList.remove("hidden");
  }
  function closeStyle() { $("styleFx").classList.add("hidden"); }
  document.querySelector(".pose-strip").addEventListener("click", function (e) {
    const b = e.target.closest("[data-style]");
    if (b) openStyle(b.getAttribute("data-style"));
  });
  $("styleClose").onclick = closeStyle;
  $("styleDone").onclick = closeStyle;
  $("styleFx").addEventListener("click", function (e) {
    if (e.target === $("styleFx")) closeStyle();
  });

  /* ---------- meal rows, details, delete ---------- */

  function mealRow(r) {
    return (
      '<div class="meal" data-id="' + r.id + '">' +
        '<img src="' + r.thumb + '" alt="">' +
        "<div>" +
          '<div class="name">' + esc(r.food.name) + "</div>" +
          '<div class="meta">' + esc(r.meal + " · " + r.time + " · " + r.food.serving) + "</div>" +
          '<div class="meal-actions">' +
            '<button type="button" class="meal-btn" data-open="' + r.id + '">Details</button>' +
            '<button type="button" class="meal-btn del" data-del="' + r.id + '">Delete</button>' +
          "</div>" +
        "</div>" +
        '<div class="kcal">' + Math.round(r.food.macros.kcal) + "</div>" +
      "</div>"
    );
  }
  const findLog = (id) => logs().find((x) => x.id === id);
  const deleteLog = (id) => saveLogs(logs().filter((x) => x.id !== id));

  function bindList(elId, back) {
    const el = $(elId);
    el.addEventListener("click", function (e) {
      const del = e.target.closest("[data-del]");
      const open = e.target.closest("[data-open]");
      if (del) {
        if (!window.confirm("Remove this item from the log?")) return;
        deleteLog(del.getAttribute("data-del"));
        back === "history" ? renderHistory() : renderHome();
        return;
      }
      if (open) {
        const entry = findLog(open.getAttribute("data-open"));
        if (!entry) return;
        resultBack = back;
        renderResult(entry, "Macros and micros for this item");
      }
    });
  }
  bindList("todayList", "home");
  bindList("histList", "history");

  /* ---------- micros / history ---------- */

  function microVal(key, v) {
    const fine = ["b1", "b2", "b3", "b6", "b12", "vitD", "vitE", "omega3"];
    return fine.indexOf(key) >= 0 ? v.toFixed(2) : String(Math.round(v));
  }

  function renderMicros() {
    const rows = todayLogs();
    const totals = {};
    AMFIT_MICRO_META.forEach((m) => { totals[m.key] = 0; });
    rows.forEach((r) => AMFIT_MICRO_META.forEach((m) => { totals[m.key] += r.food.micros[m.key] || 0; }));
    $("microList").innerHTML = AMFIT_MICRO_META.map((m) => {
      const v = totals[m.key];
      const pct = Math.min(100, (v / m.rda) * 100);
      return '<div class="micro-row"><span>' + m.label + '</span><span class="u">' + microVal(m.key, v) + " " + m.unit + " / " + m.rda + "</span>" +
        '<div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    }).join("");
  }

  function renderHistory() {
    const all = logs();
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
    const tk = dayKey(new Date());
    $("week").innerHTML = days.map((d) => {
      const k = dayKey(d);
      const kcal = sumMacros(all.filter((x) => x.day === k)).kcal;
      return '<div class="day' + (k === tk ? " today" : "") + '"><b>' + d.toLocaleDateString([], { weekday: "narrow" }) + "</b><span>" + Math.round(kcal) + "</span></div>";
    }).join("");
    $("histList").innerHTML = all.length
      ? all.slice().reverse().map(mealRow).join("")
      : '<div class="empty art">' + ART.plate + "<p>Your log will appear here after the first scan.</p></div>";
  }

  /* ---------- train ---------- */

  function renderTrain() {
    const p = profile();
    if (!p) return;
    const prog = AMFIT_PLAN.program(p);
    const w = AMFIT_PLAN.week(p);
    $("trainSub").textContent = prog.label;
    $("trainChip").textContent = p.goal === "lose" ? "Keep strength" : p.goal === "gain" ? "Build" : "Maintain";
    const todayIdx = new Date().getDay();
    $("trainWeek").innerHTML = w.map((d, i) =>
      '<div class="day' + (i === trainDay ? " today" : "") + '" data-day="' + i + '" style="cursor:pointer">' +
      "<b>" + d.day + "</b><span>" + (d.key ? "•" : "–") + "</span></div>"
    ).join("");
    const sel = w[trainDay];
    if (!sel.key) {
      $("sessionCard").innerHTML =
        "<h3>" + w[trainDay].day + " — rest</h3>" +
        '<p class="tiny">No lifting scheduled. Walk to your step goal, and keep protein up so the last session actually turns into muscle.</p>' +
        '<div class="empty art">' + ART.path + "<p>Rest day. The walk is the work.</p></div>";
    } else {
      const sess = prog.sessions[sel.key];
      $("sessionCard").innerHTML =
        "<h3>" + esc(sess.name) + "</h3>" +
        '<p class="tiny">' + (todayIdx === trainDay ? "Scheduled for today." : "Scheduled for " + sel.day + ".") + " Warm up 5 minutes, then two light ramp-up sets on the first lift.</p>" +
        '<div style="margin-top:8px">' + sess.ex.map((x) =>
          '<div class="ex"><div class="h"><b>' + esc(x.n) + "</b><span>" + x.s + " × " + esc(x.r) + '</span></div><div class="c">Rest ' + x.rest + " · " + esc(x.cue) + "</div></div>"
        ).join("") + "</div>" +
        '<button class="btn btn-primary" type="button" id="btnDone' + sel.key + '" style="margin-top:14px">' +
        (today().done.indexOf(sess.name) >= 0 ? "Done today ✓" : "Mark session done") + "</button>";
      const btn = $("btnDone" + sel.key);
      btn.onclick = function () {
        const done = today().done.slice();
        if (done.indexOf(sess.name) < 0) done.push(sess.name);
        patchToday({ done });
        btn.textContent = "Done today ✓";
      };
    }
    $("progressionCard").innerHTML =
      "<h3>How to progress</h3>" +
      '<p class="tiny">' + esc(prog.why) + "</p>" +
      '<p class="tiny"><b style="color:var(--text)">Load:</b> ' + esc(prog.progression) + "</p>" +
      '<p class="tiny"><b style="color:var(--text)">Stalling:</b> ' + esc(prog.deload) + "</p>" +
      '<p class="tiny"><b style="color:var(--text)">Cardio:</b> hit your daily step goal; that is the cardio. Add two 20-minute easy sessions only if you enjoy them.</p>' +
      '<p class="tiny">General fitness guidance. If you have an injury or a medical condition, clear it with a professional first.</p>';
  }

  $("trainWeek").addEventListener("click", function (e) {
    const d = e.target.closest("[data-day]");
    if (!d) return;
    trainDay = parseInt(d.getAttribute("data-day"), 10);
    renderTrain();
  });

  /* ---------- progress ---------- */

  function renderProgress() {
    const p = profile();
    const t = targets();
    if (!p || !t) return;
    const cur = today().weight || p.weight;
    const moved = Math.round((cur - p.startWeight) * 10) / 10;
    $("weightCard").innerHTML =
      '<div class="line"><b>' + cur + " kg</b><span>started " + p.startWeight + " kg</span></div>" +
      '<div class="line"><b>BMI ' + t.bmi + "</b><span>" + t.bmiLabel + " · healthy target " + t.idealWeight + " kg</span></div>" +
      '<p class="tiny">' + (moved === 0 ? "No change logged yet." : (moved < 0 ? Math.abs(moved) + " kg down" : moved + " kg up") + " since you started.") +
      (t.ratePerWeek ? " Planned pace " + Math.abs(t.ratePerWeek) + " kg per week." : " Holding steady.") + "</p>" +
      '<button class="btn btn-ghost" type="button" id="btnWeigh" style="margin-top:12px">Log today\'s weight</button>';
    $("btnWeigh").onclick = function () {
      const entered = window.prompt("Weight today in kg", String(cur));
      if (entered === null) return;
      const n = parseFloat(entered);
      if (!(n >= 25 && n <= 300)) return;
      patchToday({ weight: n });
      const up = Object.assign({}, p, { weight: n });
      saveProfile(up);
      renderProgress();
    };

    const ms = AMFIT_PLAN.milestones(p, t);
    $("milestoneCard").innerHTML = (ms.length
      ? ms.map((m) =>
          '<div class="ms"><div class="wk">wk ' + m.weeks + '</div><div><div class="w">' + m.weight + " kg</div>" +
          '<div class="d">BMI ' + m.bmi + " · " + (m.delta < 0 ? m.delta : "+" + m.delta) + " kg</div></div>" +
          '<div class="d">' + m.date + "</div></div>"
        ).join("")
      : '<p class="tiny" style="margin:0">Your goal is to maintain, so there is no projected weight change. Consistency on the training days is the milestone.</p>') +
      (t.recompNote ? '<p class="tiny">You are already in the healthy BMI band, so the scale will move slowly and that is fine. Judge this by the photos above and by whether the lifts go up — losing fat and gaining muscle at the same weight is the win here.</p>' : "");

    const list = shots();
    $("photoCard").innerHTML =
      (list.length
        ? '<div class="shots">' + list.slice(-9).map((s) =>
            '<div class="shot-cell"><img src="' + s.thumb + '" alt=""><b>' + (s.weight ? s.weight + "kg" : s.day.slice(5)) + "</b></div>"
          ).join("") + "</div>"
        : '<p class="tiny" style="margin:0">No photos yet. One shot a week, same light and same pose, is the most honest progress tracker there is — the scale lies on any given day.</p>') +
      '<button class="btn btn-ghost" type="button" id="btnShot" style="margin-top:12px">Add photo for today</button>';
    $("btnShot").onclick = () => $("progFile").click();

    renderCompare();
    renderWrap();
    renderAi();
    renderStickers();
    if (mySourcePhoto() && !window.__amfitStickers) makeStickers();
  }

  function renderCompare() {
    const list = shots();
    if (list.length < 2) {
      $("compareCard").innerHTML =
        '<p class="tiny" style="margin:0">' +
        (list.length === 1
          ? "One photo saved. Add another in a week — same pose, same light — and this becomes your before-and-after."
          : "Add two photos a week apart to unlock this. Seeing yourself change beats any generated picture.") +
        "</p>";
      return;
    }
    const first = list[0];
    const last = list[list.length - 1];
    const days = Math.max(0, Math.round((new Date(last.day) - new Date(first.day)) / 86400000));
    const delta = first.weight && last.weight ? Math.round((last.weight - first.weight) * 10) / 10 : null;
    $("compareCard").innerHTML =
      '<div class="compare">' +
      '<figure><img src="' + first.thumb + '" alt="First progress photo"><figcaption>' + first.day +
      (first.weight ? " · " + first.weight + " kg" : "") + "</figcaption></figure>" +
      '<figure><img src="' + last.thumb + '" alt="Latest progress photo"><figcaption>' + last.day +
      (last.weight ? " · " + last.weight + " kg" : "") + "</figcaption></figure>" +
      "</div>" +
      '<p class="tiny">' + days + " day" + (days === 1 ? "" : "s") + " apart" +
      (delta === null ? "" : delta === 0 ? ", same weight — look at the shape, not the scale."
        : delta < 0 ? ", " + Math.abs(delta) + " kg down." : ", " + delta + " kg up.") + "</p>";
  }

  $("progFile").onchange = function () {
    const f = this.files && this.files[0];
    if (!f) return;
    loadImage(f, 420, (dataUrl) => {
      const list = shots();
      list.push({ day: dayKey(new Date()), thumb: dataUrl, weight: today().weight || profile().weight });
      saveShots(list);
      this.value = "";
      // New photo means the cached poster is stale; build a fresh one without another tap.
      window.__amfitArt = null;
      window.__amfitPerson = null;
      window.__amfitStickers = null;
      renderProgress();
      autoPoster();
    });
  };

  function mySourcePhoto() {
    const list = shots();
    if (list.length) return list[list.length - 1].thumb;
    const p = profile();
    return p && p.photo ? p.photo : "";
  }

  const PALETTES = [
    { name: "Lime", dark: [12, 17, 16], mid: [22, 48, 40], light: [200, 245, 66],
      strokes: ["#c8f542", "#1f6f4a", "#0c1110", "#8fd14f", "#123a2c", "#e8f0ea"] },
    { name: "Dusk", dark: [14, 12, 26], mid: [56, 34, 82], light: [255, 148, 114],
      strokes: ["#ff9472", "#5b2a86", "#0e0c1a", "#c86dd7", "#241a3a", "#ffd9c0"] },
    { name: "Mono", dark: [10, 10, 10], mid: [78, 78, 78], light: [240, 240, 240],
      strokes: ["#f0f0f0", "#4e4e4e", "#0a0a0a", "#9a9a9a", "#1f1f1f", "#ffffff"] }
  ];

  function palette() { return PALETTES[(window.__amfitPal || 0) % PALETTES.length]; }

  function posterCache() {
    return read("amfit.poster." + session(), "null");
  }
  function savePosterCache(day, image) {
    try {
      localStorage.setItem("amfit.poster." + session(), JSON.stringify({ day: day, image: image }));
    } catch (err) {
      // Poster is a nicety; a full quota must never block logging.
    }
  }

  function renderAi() {
    const mine = mySourcePhoto();
    if (!window.__amfitArt) {
      const cached = posterCache();
      const list = shots();
      const latest = list.length ? list[list.length - 1].day : "";
      if (cached && cached.image && cached.day === latest) window.__amfitArt = cached.image;
    }
    $("aiCard").innerHTML =
      '<p class="tiny" style="margin:0">Built from your own latest photo, here on this device. No key, no account, nothing uploaded.</p>' +
      (mine
        ? (window.__amfitArt ? "" : '<button class="btn btn-primary" type="button" id="btnNeural">Make my poster</button>') +
          '<p class="status" id="aiStatus"></p>' +
          (window.__amfitArt ? '<img class="ai-art" src="' + window.__amfitArt + '" alt="AMFIT motivation poster">' : "") +
          '<div class="seg" id="segPoster" style="margin-top:12px">' +
          '<button type="button" data-v="cutout"' + (posterStyle() === "cutout" ? ' class="on"' : "") + ">Cut-out</button>" +
          '<button type="button" data-v="painted"' + (posterStyle() === "painted" ? ' class="on"' : "") + ">Painted</button>" +
          "</div>" +
          '<button class="btn btn-ghost" type="button" id="btnPal" style="margin-top:12px">New look · ' + palette().name + "</button>" +
          '<button class="btn btn-ghost" type="button" id="btnSave">Save poster</button>'
        : '<p class="tiny" style="color:var(--warn)">Add a photo above to get your poster.</p>' +
          '<p class="status" id="aiStatus"></p>');
    if (!mine) return;
    if ($("btnNeural")) $("btnNeural").onclick = autoPoster;
    $("segPoster").querySelectorAll("button").forEach(function (b) {
      b.onclick = function () {
        window.__amfitStyle = b.getAttribute("data-v");
        autoPoster();
      };
    });
    $("btnPal").onclick = function () {
      window.__amfitPal = (window.__amfitPal || 0) + 1;
      autoPoster();
    };
    $("btnSave").onclick = function () {
      if (!window.__amfitArt) { $("aiStatus").textContent = "Make a poster first."; return; }
      const a = document.createElement("a");
      a.href = window.__amfitArt;
      a.download = "amfit-poster-" + dayKey(new Date()) + ".png";
      a.click();
    };
  }

  // Draw instantly with the canvas filter, then upgrade to the chosen model in the background.
  function autoPoster() {
    if (!mySourcePhoto()) return;
    restyleMyPhoto();
    if (posterStyle() === "cutout") cutoutPoster(); else neuralRedraw();
    makeStickers();
  }

  function rgb(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }

  function posterStyle() {
    return window.__amfitStyle === "painted" ? "painted" : "cutout";
  }

  function loadPhoto(src) {
    return new Promise(function (resolve, reject) {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = function () { resolve(el); };
      el.onerror = function () { reject(new Error("photo unreadable")); };
      el.src = src;
    });
  }

  function coverDraw(img, size) {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d");
    const scale = Math.max(size / img.width, size / img.height);
    g.drawImage(img, (size - img.width * scale) / 2, (size - img.height * scale) / 2,
      img.width * scale, img.height * scale);
    return c;
  }

  function segModel() {
    if (!window.__amfitSeg) window.__amfitSeg = tf.loadGraphModel("models/bodypix/model.json");
    return window.__amfitSeg;
  }

  // Poster caption + AMFIT branding, shared by every style.
  function drawCaption(g, size) {
    const p = profile();
    const t = targets();
    const goal = p.goal === "lose" ? "LEAN STRONG" : p.goal === "gain" ? "BUILD STRONG" : "STAY STRONG";
    g.fillStyle = "#e8f0ea";
    g.font = "700 " + Math.round(size * 0.055) + "px Outfit, sans-serif";
    g.fillText("AMFIT", size * 0.07, size * 0.11);
    g.fillStyle = "#c8f542";
    g.font = "700 " + Math.round(size * 0.085) + "px Outfit, sans-serif";
    g.fillText(goal, size * 0.07, size * 0.89);
    g.fillStyle = "#d7e4db";
    g.font = "500 " + Math.round(size * 0.038) + "px Outfit, sans-serif";
    g.fillText(t.steps.toLocaleString() + " steps  ·  " + t.kcal + " kcal", size * 0.07, size * 0.945);
  }

  async function personCutout() {
    if (window.__amfitPerson) return window.__amfitPerson;
    const src = mySourcePhoto();
    if (!src || typeof tf === "undefined") return null;
    const [model, img] = await Promise.all([segModel(), loadPhoto(src)]);
    const inSize = 513;
    const input = coverDraw(img, inSize);
    const alpha = tf.tidy(function () {
      const pixels = tf.browser.fromPixels(input).toFloat().div(127.5).sub(1).expandDims();
      const logits = model.execute(pixels, "float_segments");
      const prob = tf.image.resizeBilinear(logits.sigmoid(), [inSize, inSize]).squeeze();
      return prob.sub(0.35).div(0.3).clipByValue(0, 1).mul(255).cast("int32");
    });
    const alphaData = await alpha.data();
    alpha.dispose();
    let covered = 0;
    for (let i = 0; i < alphaData.length; i++) if (alphaData[i] > 128) covered++;
    if (covered / alphaData.length < 0.03) return null;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = inSize;
    maskCanvas.height = inSize;
    const mg = maskCanvas.getContext("2d");
    const frame = mg.createImageData(inSize, inSize);
    for (let i = 0; i < alphaData.length; i++) {
      frame.data[i * 4] = 255;
      frame.data[i * 4 + 1] = 255;
      frame.data[i * 4 + 2] = 255;
      frame.data[i * 4 + 3] = alphaData[i];
    }
    mg.putImageData(frame, 0, 0);
    const size = 768;
    const person = coverDraw(img, size);
    const pg = person.getContext("2d");
    pg.globalCompositeOperation = "destination-in";
    pg.drawImage(maskCanvas, 0, 0, size, size);
    window.__amfitPerson = person;
    return person;
  }

  // Segment the person out of their photo and place them on a designed poster. All on device.
  async function cutoutPoster() {
    const src = mySourcePhoto();
    if (!src || typeof tf === "undefined") return;
    const started = Date.now();
    $("aiStatus").textContent = "Finding you in the photo (first run loads a 2 MB model)…";
    try {
      await new Promise(function (r) { setTimeout(r, 30); });
      const person = await personCutout();
      if (!person) {
        $("aiStatus").textContent = "Could not find a person in that photo, so this is the painted version.";
        neuralRedraw();
        return;
      }
      const size = 768;
      const pal = palette();
      const poster = document.createElement("canvas");
      poster.width = size;
      poster.height = size;
      const g = poster.getContext("2d");
      const bg = g.createLinearGradient(0, 0, size, size);
      bg.addColorStop(0, rgb(pal.dark));
      bg.addColorStop(0.65, rgb(pal.mid));
      bg.addColorStop(1, rgb(pal.light));
      g.fillStyle = bg;
      g.fillRect(0, 0, size, size);
      g.save();
      g.globalAlpha = 0.22;
      g.fillStyle = rgb(pal.light);
      g.beginPath();
      g.moveTo(0, size * 0.72);
      g.lineTo(size, size * 0.46);
      g.lineTo(size, size);
      g.lineTo(0, size);
      g.closePath();
      g.fill();
      g.restore();
      g.save();
      g.globalAlpha = 0.35;
      g.fillStyle = rgb(pal.dark);
      g.beginPath();
      g.ellipse(size / 2, size * 0.93, size * 0.32, size * 0.05, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
      g.drawImage(person, 0, 0);
      drawCaption(g, size);

      window.__amfitArt = poster.toDataURL("image/jpeg", 0.88);
      const list = shots();
      savePosterCache(list.length ? list[list.length - 1].day : dayKey(new Date()), window.__amfitArt);
      renderAi();
      $("aiStatus").textContent = "Cut out of your own photo in " +
        Math.round((Date.now() - started) / 1000) + "s. Nothing left this device.";
    } catch (err) {
      $("aiStatus").textContent = "Cut-out model unavailable (" +
        (err && err.message ? err.message.slice(0, 50) : "unknown") + "), showing the painted version.";
      neuralRedraw();
    }
  }

  /* ---------- weekly wrap card ---------- */

  // Seven days ending today, scored against the user's own targets.
  function weekStats() {
    const t = targets();
    const all = daily();
    const byDay = {};
    logs().forEach(function (r) { (byDay[r.day] = byDay[r.day] || []).push(r); });
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const c = new Date();
      c.setDate(c.getDate() - i);
      const k = dayKey(c);
      const rows = byDay[k] || [];
      const sum = sumMacros(rows);
      const d = all[k] || {};
      days.push({
        label: AMFIT_PLAN.DAYS[c.getDay()],
        date: c,
        logged: rows.length > 0,
        kcal: Math.round(sum.kcal),
        protein: Math.round(sum.protein),
        steps: d.steps || 0,
        sessions: (d.done || []).length
      });
    }
    const loggedDays = days.filter((x) => x.logged).length;
    return {
      days,
      loggedDays,
      steps: days.reduce((a, x) => a + x.steps, 0),
      sessions: days.reduce((a, x) => a + x.sessions, 0),
      proteinDays: days.filter((x) => x.protein >= t.protein * 0.9).length,
      onTargetDays: days.filter((x) => x.logged && x.kcal >= t.kcal * 0.85 && x.kcal <= t.kcal * 1.05).length,
      avgKcal: loggedDays ? Math.round(days.reduce((a, x) => a + x.kcal, 0) / loggedDays) : 0,
      streak: logStreak()
    };
  }

  function renderWrap() {
    const w = weekStats();
    const art = window.__amfitWrap;
    const stat = (v, l) => '<div class="stat"><b>' + v + "</b><span>" + l + "</span></div>";
    $("wrapCard").innerHTML =
      '<div class="line"><b>Last 7 days</b><span>' + w.loggedDays + "/7 days logged</span></div>" +
      '<div class="macro-grid" style="margin:10px 0;grid-template-columns:repeat(4,1fr)">' +
        stat(w.streak, "day streak") +
        stat(w.proteinDays, "protein days") +
        stat(Math.round(w.steps / 1000) + "k", "steps") +
        stat(w.sessions, "sessions") +
      "</div>" +
      (art ? '<img class="ai-art" src="' + art + '" alt="Your weekly wrap card">' : "") +
      '<p class="tiny" id="wrapStatus">A card for the team group or your own records. Drawn on this device — no upload, no account.</p>' +
      '<button class="btn btn-primary" type="button" id="btnWrap">' + (art ? "Rebuild card" : "Build this week's card") + "</button>" +
      (art
        ? '<button class="btn btn-ghost" type="button" id="btnWrapSave">Download PNG</button>' +
          '<button class="btn btn-ghost" type="button" id="btnWrapCopy">Copy image</button>'
        : "");
    $("btnWrap").onclick = buildWrap;
    if (!art) return;
    $("btnWrapSave").onclick = function () {
      const a = document.createElement("a");
      a.href = art;
      a.download = "amfit-week-" + dayKey(new Date()) + ".png";
      a.click();
    };
    $("btnWrapCopy").onclick = async function () {
      try {
        const blob = await (await fetch(art)).blob();
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        $("wrapStatus").textContent = "Copied. Paste it straight into Teams or WhatsApp.";
      } catch (err) {
        $("wrapStatus").textContent = "This browser blocks image copy — use Download PNG instead.";
      }
    };
  }

  function buildWrap() {
    const p = profile();
    const t = targets();
    if (!p || !t) return;
    const w = weekStats();
    const W = 1080;
    const H = 1350;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");

    g.fillStyle = "#0b1010";
    g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(W * 0.2, 0, 0, W * 0.2, 0, H * 0.8);
    glow.addColorStop(0, "rgba(198,242,58,0.22)");
    glow.addColorStop(1, "rgba(11,16,16,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H);
    const glow2 = g.createRadialGradient(W, H, 0, W, H, H * 0.7);
    glow2.addColorStop(0, "rgba(79,211,232,0.18)");
    glow2.addColorStop(1, "rgba(11,16,16,0)");
    g.fillStyle = glow2;
    g.fillRect(0, 0, W, H);

    const pad = 84;
    g.fillStyle = "#e8f0ea";
    g.font = "700 34px Outfit, sans-serif";
    g.fillText("AMFIT", pad, 118);
    g.fillStyle = "#c6f23a";
    g.font = "800 104px Outfit, sans-serif";
    g.fillText("WEEK WRAP", pad, 232);
    g.fillStyle = "#94a89a";
    g.font = "500 34px Outfit, sans-serif";
    const range = w.days[0].date.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " – " + w.days[6].date.toLocaleDateString([], { month: "short", day: "numeric" });
    g.fillText(String(p.name).split(" ")[0] + " · " + range, pad, 288);

    // Seven dots: filled for a logged day, hollow for a miss.
    let x = pad;
    w.days.forEach(function (d) {
      g.beginPath();
      g.arc(x + 26, 372, 26, 0, Math.PI * 2);
      if (d.logged) { g.fillStyle = "#c6f23a"; g.fill(); } else { g.strokeStyle = "#2c3a31"; g.lineWidth = 4; g.stroke(); }
      g.fillStyle = d.logged ? "#10160a" : "#6d7d72";
      g.font = "700 22px Outfit, sans-serif";
      g.textAlign = "center";
      g.fillText(d.label[0], x + 26, 380);
      g.textAlign = "left";
      x += 130;
    });

    const cells = [
      { v: String(w.streak), l: "DAY STREAK", c: "#c6f23a" },
      { v: w.loggedDays + "/7", l: "DAYS LOGGED", c: "#e8f0ea" },
      { v: w.proteinDays + "/7", l: "PROTEIN HIT", c: "#4fd3e8" },
      { v: w.onTargetDays + "/7", l: "CALORIES ON TARGET", c: "#c6f23a" },
      { v: w.steps.toLocaleString(), l: "STEPS WALKED", c: "#a78bfa" },
      { v: String(w.sessions), l: "SESSIONS DONE", c: "#ff8a6b" }
    ];
    cells.forEach(function (cell, i) {
      const cx = pad + (i % 2) * 468;
      const cy = 470 + Math.floor(i / 2) * 210;
      g.fillStyle = "rgba(255,255,255,0.045)";
      roundRect(g, cx, cy, 428, 172, 28);
      g.fill();
      g.strokeStyle = "rgba(255,255,255,0.08)";
      g.lineWidth = 2;
      roundRect(g, cx, cy, 428, 172, 28);
      g.stroke();
      g.fillStyle = cell.c;
      g.font = "800 72px Outfit, sans-serif";
      g.fillText(cell.v, cx + 32, cy + 96);
      g.fillStyle = "#8ea296";
      g.font = "600 24px Outfit, sans-serif";
      g.fillText(cell.l, cx + 32, cy + 138);
    });

    g.fillStyle = "#d7e4db";
    g.font = "500 30px Outfit, sans-serif";
    g.fillText("Averaging " + w.avgKcal + " kcal of " + t.kcal + " · " + goalWord() + " " +
      (t.ratePerWeek ? Math.abs(t.ratePerWeek) + " kg/wk" : "hold"), pad, 1188);
    g.fillStyle = "#6d7d72";
    g.font = "500 26px Outfit, sans-serif";
    g.fillText("Logged on-device with AMFIT. No account, no upload.", pad, 1240);

    const list = shots();
    const latest = list.length ? list[list.length - 1].thumb : null;
    const finish = function () {
      window.__amfitWrap = c.toDataURL("image/png");
      renderWrap();
      $("wrapStatus").textContent = "Card ready. Download it or copy it straight into a chat.";
    };
    if (!latest) { finish(); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      g.save();
      g.beginPath();
      g.arc(W - 200, 196, 108, 0, Math.PI * 2);
      g.clip();
      const s = Math.max(216 / img.width, 216 / img.height);
      g.drawImage(img, W - 200 - (img.width * s) / 2, 196 - (img.height * s) / 2, img.width * s, img.height * s);
      g.restore();
      g.strokeStyle = "#c6f23a";
      g.lineWidth = 6;
      g.beginPath();
      g.arc(W - 200, 196, 108, 0, Math.PI * 2);
      g.stroke();
      finish();
    };
    img.onerror = finish;
    img.src = latest;
  }

  function goalWord() {
    const p = profile();
    return p.goal === "lose" ? "LEAN" : p.goal === "gain" ? "BUILD" : "STAY";
  }

  function renderStickers() {
    const pack = window.__amfitStickers;
    $("stickerCard").innerHTML =
      '<p class="tiny" style="margin:0">Stickers of you, cut from your photo on this device. Tap one to download. Free, no key.</p>' +
      (pack && pack.length
        ? '<div class="stickers">' + pack.map(function (s, i) {
            return '<img src="' + s + '" alt="AMFIT sticker" data-i="' + i + '">';
          }).join("") + "</div>"
        : '<p class="status" id="stickerStatus">' +
          (mySourcePhoto() ? "Building stickers from your photo…" : "Add a photo above first.") + "</p>");
    if (!pack) return;
    $("stickerCard").querySelectorAll("img").forEach(function (img) {
      img.onclick = function () {
        const a = document.createElement("a");
        a.href = img.src;
        a.download = "amfit-sticker-" + img.getAttribute("data-i") + ".png";
        a.click();
      };
    });
  }

  function stickerCanvas(size) {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    return c;
  }

  function drawPersonFit(g, person, cx, cy, box) {
    g.drawImage(person, cx - box / 2, cy - box / 2, box, box);
  }

  async function makeStickers() {
    if (!mySourcePhoto()) { renderStickers(); return; }
    try {
      const person = await personCutout();
      const pal = palette();
      const size = 512;
      const t = targets();
      const label = goalWord();
      const shotsN = shots().length;

      function ringSticker() {
        const c = stickerCanvas(size);
        const g = c.getContext("2d");
        g.beginPath();
        g.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
        g.fillStyle = rgb(pal.light);
        g.fill();
        g.beginPath();
        g.arc(size / 2, size / 2, size * 0.40, 0, Math.PI * 2);
        g.fillStyle = rgb(pal.dark);
        g.fill();
        g.save();
        g.beginPath();
        g.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 2);
        g.clip();
        if (person) drawPersonFit(g, person, size / 2, size / 2 + 20, size * 0.92);
        g.restore();
        return c.toDataURL("image/png");
      }

      function borderSticker() {
        const c = stickerCanvas(size);
        const g = c.getContext("2d");
        g.fillStyle = "#fff";
        roundRect(g, 18, 18, size - 36, size - 36, 48);
        g.fill();
        g.save();
        roundRect(g, 42, 42, size - 84, size - 84, 36);
        g.clip();
        g.fillStyle = rgb(pal.mid);
        g.fillRect(42, 42, size - 84, size - 84);
        if (person) drawPersonFit(g, person, size / 2, size / 2 + 10, size * 0.95);
        g.restore();
        g.fillStyle = rgb(pal.dark);
        g.font = "800 36px Outfit, sans-serif";
        g.textAlign = "center";
        g.fillText("AMFIT", size / 2, size - 56);
        return c.toDataURL("image/png");
      }

      function badgeSticker() {
        const c = stickerCanvas(size);
        const g = c.getContext("2d");
        g.translate(size / 2, size / 2);
        g.rotate(-0.12);
        g.fillStyle = rgb(pal.light);
        roundRect(g, -210, -90, 420, 180, 40);
        g.fill();
        g.fillStyle = rgb(pal.dark);
        g.font = "800 72px Outfit, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(label, 0, -8);
        g.font = "700 28px Outfit, sans-serif";
        g.fillText("AMFIT", 0, 52);
        return c.toDataURL("image/png");
      }

      function countSticker() {
        const c = stickerCanvas(size);
        const g = c.getContext("2d");
        g.beginPath();
        g.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
        g.fillStyle = rgb(pal.dark);
        g.fill();
        g.strokeStyle = rgb(pal.light);
        g.lineWidth = 14;
        g.stroke();
        g.fillStyle = rgb(pal.light);
        g.textAlign = "center";
        g.font = "800 120px Outfit, sans-serif";
        g.fillText(String(Math.max(1, shotsN)), size / 2, size / 2 + 18);
        g.font = "700 28px Outfit, sans-serif";
        g.fillStyle = "#e8f0ea";
        g.fillText(shotsN === 1 ? "PHOTO" : "PHOTOS", size / 2, size / 2 + 78);
        g.font = "500 22px Outfit, sans-serif";
        g.fillText(t ? t.kcal + " kcal" : "", size / 2, size / 2 + 112);
        return c.toDataURL("image/png");
      }

      window.__amfitStickers = [ringSticker(), borderSticker(), badgeSticker(), countSticker()];
      renderStickers();
    } catch (err) {
      $("stickerCard").innerHTML =
        '<p class="tiny" style="margin:0">Could not build stickers: ' +
        esc(err && err.message ? err.message.slice(0, 80) : "unknown") + "</p>";
    }
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // Style image for the transfer network: painterly lime/green strokes, drawn here so nothing is downloaded.
  function styleCanvas() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const g = c.getContext("2d");
    const strokes = palette().strokes;
    g.fillStyle = strokes[2];
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i++) {
      g.save();
      g.translate(Math.random() * 256, Math.random() * 256);
      g.rotate(Math.random() * Math.PI);
      g.fillStyle = strokes[i % strokes.length];
      g.globalAlpha = 0.35 + Math.random() * 0.45;
      g.fillRect(-40, -6, 80 + Math.random() * 60, 8 + Math.random() * 14);
      g.restore();
    }
    return c;
  }

  async function styleModels() {
    if (window.__amfitNet) return window.__amfitNet;
    const [predictor, transformer] = await Promise.all([
      tf.loadGraphModel("models/style/model.json"),
      tf.loadGraphModel("models/transformer/model.json")
    ]);
    window.__amfitNet = { predictor, transformer };
    return window.__amfitNet;
  }

  async function neuralRedraw() {
    const src = mySourcePhoto();
    if (!src) return;
    if (typeof tf === "undefined") {
      $("aiStatus").textContent = "TensorFlow.js did not load. Refresh the page and try again.";
      return;
    }
    const started = Date.now();
    $("aiStatus").textContent = "Loading the style network (about 12 MB, first run only)…";
    try {
      const net = await styleModels();
      $("aiStatus").textContent = "Redrawing your photo on this device…";
      const img = await new Promise(function (resolve, reject) {
        const el = new Image();
        el.crossOrigin = "anonymous";
        el.onload = function () { resolve(el); };
        el.onerror = reject;
        el.src = src;
      });

      const size = 512;
      const content = document.createElement("canvas");
      content.width = size;
      content.height = size;
      const cg = content.getContext("2d");
      const scale = Math.max(size / img.width, size / img.height);
      cg.drawImage(img, (size - img.width * scale) / 2, (size - img.height * scale) / 2,
        img.width * scale, img.height * scale);

      // Give the browser a frame so the status text paints before the model blocks the thread.
      await new Promise(function (r) { setTimeout(r, 30); });

      const out = tf.tidy(function () {
        const styleTensor = tf.browser.fromPixels(styleCanvas()).toFloat().div(255).expandDims();
        const bottleneck = net.predictor.predict(styleTensor);
        const contentTensor = tf.browser.fromPixels(content).toFloat().div(255).expandDims();
        return net.transformer.predict([contentTensor, bottleneck]).squeeze();
      });

      const result = document.createElement("canvas");
      result.width = size;
      result.height = size;
      await tf.browser.toPixels(out, result);
      out.dispose();

      const g = result.getContext("2d");
      const fade = g.createLinearGradient(0, size * 0.6, 0, size);
      fade.addColorStop(0, "rgba(8,12,11,0)");
      fade.addColorStop(1, "rgba(8,12,11,0.85)");
      g.fillStyle = fade;
      g.fillRect(0, size * 0.6, size, size * 0.4);
      drawCaption(g, size);

      window.__amfitArt = result.toDataURL("image/jpeg", 0.88);
      const list = shots();
      savePosterCache(list.length ? list[list.length - 1].day : dayKey(new Date()), window.__amfitArt);
      renderAi();
      $("aiStatus").textContent = "Painted from your own photo in " +
        Math.round((Date.now() - started) / 1000) + "s. Nothing left this device.";
    } catch (err) {
      $("aiStatus").textContent = "Showing the fast version — the paint model could not load (" +
        (err && err.message ? err.message.slice(0, 60) : "unknown") + ").";
    }
  }

  // Duotone + posterise the user's own photo. Pure canvas, so nothing is uploaded.
  function restyleMyPhoto() {
    const src = mySourcePhoto();
    if (!src) return;
    $("aiStatus").textContent = "Restyling your photo on this device…";
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      const size = 768;
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const g = c.getContext("2d");
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      g.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

      const frame = g.getImageData(0, 0, size, size);
      const px = frame.data;
      const pal = palette();
      const dark = pal.dark;
      const mid = pal.mid;
      const lime = pal.light;
      for (let i = 0; i < px.length; i += 4) {
        let lum = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
        lum = Math.min(1, Math.max(0, (lum - 0.5) * 1.35 + 0.5));
        lum = Math.round(lum * 5) / 5;
        const from = lum < 0.5 ? dark : mid;
        const to = lum < 0.5 ? mid : lime;
        const k = lum < 0.5 ? lum * 2 : (lum - 0.5) * 2;
        px[i] = from[0] + (to[0] - from[0]) * k;
        px[i + 1] = from[1] + (to[1] - from[1]) * k;
        px[i + 2] = from[2] + (to[2] - from[2]) * k;
      }
      g.putImageData(frame, 0, 0);

      const vign = g.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.75);
      vign.addColorStop(0, "rgba(0,0,0,0)");
      vign.addColorStop(1, "rgba(8,12,11,0.75)");
      g.fillStyle = vign;
      g.fillRect(0, 0, size, size);

      drawCaption(g, size);

      window.__amfitArt = c.toDataURL("image/jpeg", 0.85);
      renderAi();
      $("aiStatus").textContent = "Your photo, restyled on this device. Refining it…";
    };
    img.onerror = function () {
      $("aiStatus").textContent = "Could not read that photo. Add a new one above and try again.";
    };
    img.src = src;
  }

  /* ---------- you ---------- */

  function applyTheme(choice) {
    const selected = ["system", "light", "dark"].indexOf(choice) >= 0 ? choice : "system";
    const dark = selected === "dark" ||
      (selected === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.themeChoice = selected;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("amfit.theme", selected);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#080d0c" : "#f4f7f5";
  }

  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const repaintSystemTheme = function () {
    if ((localStorage.getItem("amfit.theme") || "system") === "system") applyTheme("system");
  };
  if (systemTheme.addEventListener) systemTheme.addEventListener("change", repaintSystemTheme);
  else if (systemTheme.addListener) systemTheme.addListener(repaintSystemTheme);

  function renderYou() {
    const u = currentUser();
    const p = profile();
    const t = targets();
    const cloud = window.AMFIT_FIREBASE && AMFIT_FIREBASE.configured;
    const theme = localStorage.getItem("amfit.theme") || (p && p.theme) || "system";
    $("youName").textContent = u ? u.name : "You";
    $("youCard").innerHTML =
      '<div class="line"><b>' + esc(u.email) + "</b><span>" + (cloud ? "Firebase account" : "local account") + "</span></div>" +
      '<div class="line"><b>Data sync</b><span id="syncBadge">' + (cloud ? (cloudReady ? "cloud synced" : "connecting") : "this device only") + "</span></div>" +
      (p ? '<div class="line"><b>' + p.weight + " kg · " + p.height + " cm · " + p.age + "y</b><span>" + p.sex + "</span></div>" +
        '<div class="line"><b>' + t.kcal + " kcal · " + t.protein + " g protein</b><span>daily target</span></div>" +
        '<div class="line"><b>' + t.steps.toLocaleString() + " steps · " + t.water + " L water</b><span>daily target</span></div>" +
        '<div class="line"><b>BMR ' + t.bmr + " · TDEE " + t.tdee + "</b><span>Mifflin-St Jeor</span></div>" : "") +
      '<div class="theme-box"><label>Appearance</label><div class="seg" id="themeSeg">' +
        '<button type="button" data-theme="system">System</button>' +
        '<button type="button" data-theme="light">Light</button>' +
        '<button type="button" data-theme="dark">Dark</button>' +
      "</div></div>" +
      (cloud
        ? '<p class="tiny">Firebase Authentication protects this account. Password resets arrive by email; private health records are readable only by you.</p>'
        : '<p class="tiny">Local mode: data stays in this browser. Cloud Auth/DB start after Firebase web keys are in js/firebase-config.js.</p>') +
      '<div class="theme-box">' +
        '<label>Open these</label>' +
        '<p class="tiny" style="margin-top:0"><b>App / user console</b> — Home, Train, +, Log, You.</p>' +
        '<p class="tiny"><b>Admin console</b> — button below' +
          (cloud && cloudRole !== "admin" ? " (needs admin claim on chellurisandhyarani20@gmail.com)" : "") + ".</p>" +
        '<p class="tiny"><b>Database</b> — <a href="https://console.firebase.google.com/" target="_blank" rel="noopener">Firebase Console</a> → Firestore. Photos in Storage. Accounts in Authentication.</p>' +
      "</div>" +
      (cloud ? '<button class="btn btn-ghost" type="button" id="btnCloudReset">Email password-reset link</button>' :
        '<button class="btn btn-ghost" type="button" id="btnCodes">Generate recovery codes</button>') +
      ((cloud && cloudRole === "admin") || !cloud
        ? '<button class="btn btn-admin" type="button" id="btnAdmin">' +
          (cloud ? "Open admin console" : "Open admin console (local preview)") + "</button>"
        : "") +
      '<button class="btn btn-ghost" type="button" id="btnEdit">Edit my numbers</button>' +
      '<button class="btn btn-danger" type="button" id="btnOut">Sign out</button>';
    document.querySelectorAll("#themeSeg [data-theme]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-theme") === theme);
      b.onclick = function () {
        const value = b.getAttribute("data-theme");
        applyTheme(value);
        if (p) { p.theme = value; saveProfile(p); }
        renderYou();
      };
    });
    if (cloud) {
      $("btnCloudReset").onclick = async function () {
        await AMFIT_FIREBASE.reset(u.email);
        $("syncBadge").textContent = "reset email sent";
      };
      if (cloudRole === "admin" && $("btnAdmin")) $("btnAdmin").onclick = function () { show("admin"); };
    } else {
      if ($("btnAdmin")) $("btnAdmin").onclick = function () { show("admin"); };
      $("btnCodes").onclick = async function () {
        const set = await makeRecoverySet();
        const list = users();
        const i = list.findIndex((x) => x.email === session());
        if (i < 0) return;
        list[i].recovery = set.hashes;
        saveUsers(list);
        showCodes(set.plains, true);
      };
    }
    $("btnEdit").onclick = function () {
      fillProfileForm(currentUser());
      document.querySelectorAll(".screen").forEach((s) => s.classList.remove("on"));
      $("screen-profile").classList.add("on");
    };
    $("btnOut").onclick = async function () {
      if (cloud) await AMFIT_FIREBASE.logout();
      localStorage.removeItem(KEYS.session);
      cloudReady = false;
      cloudRole = "user";
      stopCam();
      showAuth(true);
    };
  }

  $("adminBack").onclick = function () {
    $("nav").classList.remove("hidden");
    show("you");
  };
  $("adminOpenUser").onclick = function () {
    $("nav").classList.remove("hidden");
    show("home");
  };

  if (window.AMFIT_STORE) {
    AMFIT_STORE.onStatus(function (s) {
      const badge = $("syncBadge");
      if (!badge) return;
      badge.textContent = s.state === "syncing" ? "syncing " + s.detail :
        s.state === "error" ? "sync error: " + s.detail : "cloud synced";
      badge.classList.toggle("sync-error", s.state === "error");
    });
    AMFIT_STORE.onRemote(function (kind) {
      if (kind === "content") { applySharedContent(); return; }
      if ($("screen-home").classList.contains("on")) renderHome();
      else if ($("screen-history").classList.contains("on")) renderHistory();
      else if ($("screen-progress").classList.contains("on")) renderProgress();
      else if ($("screen-you").classList.contains("on")) renderYou();
    });
  }

  document.querySelectorAll("#nav [data-go]").forEach((b) => {
    b.onclick = function () {
      if (b.classList.contains("snap")) spark(b);
      show(b.getAttribute("data-go"));
    };
  });

  /* ---------- camera + scan ---------- */

  async function startCam() {
    $("scanMeal").textContent = mealType(new Date());
    $("scanStatus").textContent = "Hold the plate in frame. Capture when ready.";
    $("shot").style.display = "none";
    $("cam").style.display = "block";
    $("scanBar").style.display = "none";
    $("btnCapture").disabled = false;
    if (stream) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      $("cam").srcObject = stream;
    } catch (err) {
      $("scanStatus").textContent = "Camera blocked. Use a photo from your library instead.";
    }
  }
  function stopCam() {
    if (!stream) return;
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
    $("cam").srcObject = null;
  }

  function loadImage(file, max, cb) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      cb(resize(img, max));
    };
    img.src = url;
  }
  function resize(img, max) {
    const c = document.createElement("canvas");
    const s = Math.min(max / img.naturalWidth, max / img.naturalHeight, 1);
    c.width = Math.max(1, Math.round(img.naturalWidth * s));
    c.height = Math.max(1, Math.round(img.naturalHeight * s));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.6);
  }

  $("btnUpload").onclick = () => $("fileIn").click();
  $("fileIn").onchange = function () {
    const f = this.files && this.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = $("shot");
    img.onload = () => { URL.revokeObjectURL(url); analyze(img); };
    img.src = url;
    this.value = "";
  };
  $("btnCapture").onclick = function () {
    const v = $("cam");
    if (!v.videoWidth) { $("fileIn").click(); return; }
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const img = $("shot");
    img.onload = () => analyze(img);
    img.src = c.toDataURL("image/jpeg", 0.85);
  };

  async function loadNet() {
    if (net) return net;
    if (!window.mobilenet) return null;
    net = await mobilenet.load({ version: 2, alpha: 1 });
    return net;
  }

  function pickFood(preds, meal) {
    const learned = fixes();
    const fallback = { key: AMFIT_MEAL_DEFAULTS[meal], sure: false, label: "not identified" };
    if (!preds || !preds.length) return fallback;
    for (const p of preds) {
      const slug = p.className.split(",")[0].trim().toLowerCase().replace(/\s+/g, "_");
      if (learned[slug] && AMFIT_FOODS[learned[slug]]) return { key: learned[slug], sure: true, label: slug };
      const key = AMFIT_LABEL_MAP[slug];
      if (key && AMFIT_FOODS[key] && p.probability >= 0.15) return { key, sure: true, label: slug };
    }
    return { key: fallback.key, sure: false, label: preds[0].className.split(",")[0] };
  }

  async function analyze(img) {
    const when = new Date();
    const meal = mealType(when);
    $("cam").style.display = "none";
    img.style.display = "block";
    $("scanBar").style.display = "block";
    $("scanBar").innerHTML = "<i></i>";
    $("scanStatus").textContent = "Reading the plate… stamping " + fmtTime(when) + " → " + meal + "…";
    $("btnCapture").disabled = true;
    let preds = null;
    try {
      const model = await loadNet();
      if (model) preds = await model.classify(img, 5);
    } catch (err) { preds = null; }
    const picked = pickFood(preds, meal);
    const entry = {
      id: String(when.getTime()),
      day: dayKey(when),
      time: fmtTime(when),
      iso: when.toISOString(),
      meal,
      foodKey: picked.key,
      food: AMFIT_FOODS[picked.key],
      detected: picked.label,
      confirmed: picked.sure,
      thumb: resize(img, 360)
    };
    const list = logs();
    list.push(entry);
    saveLogs(list);
    resultBack = "home";
    setTimeout(() => renderResult(entry, picked.sure ? "Logged automatically" : "Needs a quick correction"), 700);
  }

  /* ---------- result + fix food ---------- */

  function renderResult(entry, subtitle) {
    activeId = entry.id;
    const m = entry.food.macros;
    $("resultSub").textContent = subtitle || "Item details";
    $("pickerWrap").classList.add("hidden");
    const micros = AMFIT_MICRO_META.map((x) => {
      const v = entry.food.micros[x.key] || 0;
      const pct = Math.min(100, (v / x.rda) * 100);
      return '<div class="micro-row"><span>' + x.label + '</span><span class="u">' + microVal(x.key, v) + " " + x.unit + "</span>" +
        '<div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    }).join("");
    $("resultCard").innerHTML =
      '<img class="result-photo" src="' + entry.thumb + '" alt="">' +
      '<span class="badge">' + entry.meal + "</span>" +
      '<span class="badge">' + entry.time + "</span>" +
      '<span class="badge">' + (entry.confirmed ? "identified" : "not identified") + "</span>" +
      "<h3 style='margin:12px 0 4px'>" + esc(entry.food.name) + "</h3>" +
      '<p class="tiny">' + esc(entry.food.serving) + "</p>" +
      (entry.confirmed ? "" : '<p class="tiny" style="color:var(--warn)">The photo model could not name this dish, so these are placeholder numbers for a ' + entry.meal.toLowerCase() + '. Search the catalog or USDA below.</p>') +
      (entry.food.source ? '<p class="tiny">Nutrient source: ' + esc(entry.food.source) + "</p>" : "") +
      "<h3 style='margin:14px 0 6px'>Macros</h3>" +
      '<div class="macro-grid" style="margin:0 0 10px;grid-template-columns:repeat(4,1fr)">' +
        '<div class="stat kcal"><b>' + Math.round(m.kcal) + "</b><span>kcal</span></div>" +
        '<div class="stat"><b>' + m.protein.toFixed(1) + "</b><span>protein g</span></div>" +
        '<div class="stat"><b>' + m.carbs.toFixed(1) + "</b><span>carbs g</span></div>" +
        '<div class="stat"><b>' + m.fat.toFixed(1) + "</b><span>fat g</span></div>" +
      "</div>" +
      '<div class="macro-grid" style="margin:0 0 14px;grid-template-columns:1fr 1fr">' +
        '<div class="stat"><b>' + (m.fiber || 0).toFixed(1) + "</b><span>fiber g</span></div>" +
        '<div class="stat"><b>' + (m.sugar || 0).toFixed(1) + "</b><span>sugar g</span></div>" +
      "</div>" +
      "<h3 style='margin:8px 0'>Micros</h3>" +
      '<div class="micro">' + micros + "</div>" +
      '<button class="btn btn-primary" type="button" id="btnFix">Fix food</button>' +
      (entry.confirmed
        ? '<button class="btn btn-ghost" type="button" id="btnPin">' +
          (isPinned(entry.foodKey) ? "Pinned to canteen ✓" : "Pin to canteen") + "</button>"
        : "") +
      '<button class="btn btn-ghost" type="button" id="btnBack">Back</button>' +
      '<button class="btn btn-danger" type="button" id="btnDelItem">Delete this item</button>';
    show("result");
    $("btnBack").onclick = () => show(resultBack);
    $("btnDelItem").onclick = function () {
      if (!window.confirm("Remove this item from the log?")) return;
      deleteLog(entry.id);
      show(resultBack);
    };
    if (entry.confirmed) {
      $("btnPin").onclick = function () {
        if (isPinned(entry.foodKey)) { $("btnPin").textContent = "Already pinned ✓"; return; }
        const list = pins().slice();
        // Catalog items resolve by key; USDA items keep their own copy of the food.
        list.push(AMFIT_FOODS[entry.foodKey] ? { key: entry.foodKey } : { key: entry.foodKey, food: entry.food });
        savePins(list.slice(-12));
        $("btnPin").textContent = "Pinned to canteen ✓";
      };
    }
    $("btnFix").onclick = function () {
      $("pickerWrap").classList.remove("hidden");
      $("pickSearch").value = "";
      renderPicker("");
      $("pickSearch").focus();
    };
    if (!entry.confirmed) { $("pickerWrap").classList.remove("hidden"); renderPicker(""); }
  }

  let usdaHits = {};
  let pickSeq = 0;
  let pickTimer = null;

  function foodIndex() {
    return Object.keys(AMFIT_FOODS)
      .filter((k) => k.indexOf("default_") !== 0)
      .map((k) => ({ key: k, name: AMFIT_FOODS[k].name, kcal: AMFIT_FOODS[k].macros.kcal, p: AMFIT_FOODS[k].macros.protein, src: "AMFIT" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function pickerRow(x) {
    const attr = x.fdcId
      ? ' data-fdc="' + x.fdcId + '"'
      : ' data-key="' + x.key + '"';
    return '<button type="button" class="pick-item"' + attr + '><span style="color:var(--text);font-family:var(--font);font-size:13px">' +
      esc(x.name) + '</span><span>' + Math.round(x.kcal) + " kcal · " + Number(x.p).toFixed(0) + "g P · " + esc(x.src) + "</span></button>";
  }

  function renderPicker(q) {
    const term = q.trim().toLowerCase();
    const local = foodIndex().filter((x) => !term || x.name.toLowerCase().indexOf(term) >= 0 || x.key.indexOf(term) >= 0);
    const html = local.map(pickerRow).join("");
    if (!term || term.length < 2) {
      $("pickList").innerHTML = html || '<p class="tiny">Type a dish name. AMFIT catalog first, then USDA FoodData Central.</p>';
      return;
    }
    $("pickList").innerHTML = html + '<p class="tiny">Searching USDA FoodData Central…</p>';
    const seq = ++pickSeq;
    fetch("/api/foods?q=" + encodeURIComponent(term))
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (seq !== pickSeq) return;
        const foods = (json && json.foods) || [];
        foods.forEach(function (f) {
          if (f.fdcId) usdaHits[String(f.fdcId)] = f;
        });
        const extra = foods.map(function (f) {
          return pickerRow({ name: f.name, kcal: f.macros.kcal, p: f.macros.protein, src: "USDA", fdcId: f.fdcId });
        }).join("");
        const note = json && json.ok === false
          ? '<p class="tiny">' + esc(json.error || "USDA search failed") + "</p>"
          : (foods.length ? '<p class="tiny">USDA values are typically per 100 g unless a household serving is listed.</p>' : '<p class="tiny">No USDA match. Try a simpler English name (banana, lentil soup, cooked rice).</p>');
        $("pickList").innerHTML = html + extra + note;
      })
      .catch(function () {
        if (seq !== pickSeq) return;
        $("pickList").innerHTML = html + '<p class="tiny">USDA search needs the AMFIT server running. Local catalog still works.</p>';
      });
  }

  $("pickSearch").oninput = function () {
    const q = this.value;
    clearTimeout(pickTimer);
    pickTimer = setTimeout(function () { renderPicker(q); }, 320);
  };

  $("pickList").addEventListener("click", function (e) {
    const fdcBtn = e.target.closest("[data-fdc]");
    const keyBtn = e.target.closest("[data-key]");
    if (!activeId) return;
    const list = logs();
    const i = list.findIndex((x) => x.id === activeId);
    if (i < 0) return;
    const detected = list[i].detected;
    if (fdcBtn) {
      const food = usdaHits[fdcBtn.getAttribute("data-fdc")];
      if (!food) return;
      list[i].foodKey = "fdc_" + food.fdcId;
      list[i].food = food;
      list[i].confirmed = true;
      saveLogs(list);
      renderResult(list[i], "From USDA FoodData Central");
      return;
    }
    if (!keyBtn) return;
    const key = keyBtn.getAttribute("data-key");
    list[i].foodKey = key;
    list[i].food = AMFIT_FOODS[key];
    if (list[i].food && !list[i].food.source) list[i].food.source = "AMFIT catalog (typical serving)";
    list[i].confirmed = true;
    saveLogs(list);
    if (detected && detected !== "not identified") {
      const f = fixes();
      f[String(detected).toLowerCase().replace(/\s+/g, "_")] = key;
      saveFixes(f);
    }
    renderResult(list[i], "Corrected — totals updated");
  });

  // The chair timer only needs to be roughly right, so it repaints every 20s.
  setInterval(function () {
    if ($("screen-home").classList.contains("on") && profile()) renderDesk();
  }, 20000);

  setInterval(function () {
    if ($("screen-home").classList.contains("on")) paintClock(new Date());
    if ($("screen-scan").classList.contains("on")) $("scanMeal").textContent = mealType(new Date());
  }, 1000);

  if (window.AMFIT_FIREBASE && AMFIT_FIREBASE.configured) {
    $("authErr").textContent = "Connecting securely…";
    AMFIT_FIREBASE.onAuth(async function (user) {
      if (cloudSigningIn) return;
      if (!user) {
        cloudReady = false;
        cloudRole = "user";
        localStorage.removeItem(KEYS.session);
        showAuth(true);
        $("authErr").textContent = "";
        return;
      }
      try {
        const legacy = users().find(function (x) {
          return x.email === user.email && x.hash && !localStorage.getItem("amfit.migrated." + user.email);
        });
        if (legacy) {
          await AMFIT_FIREBASE.logout();
          showAuth(true);
          $("email").value = user.email;
          $("authErr").textContent = "Sign in once with your existing AMFIT password to migrate this device safely.";
          return;
        }
        ensureLocalCloudUser(user);
        cloudRole = await AMFIT_STORE.attach(user);
        cloudReady = true;
        await applySharedContent();
        gated();
      } catch (err) {
        showAuth(true);
        $("authErr").textContent = "Cloud data could not load: " + AMFIT_FIREBASE.message(err);
      }
    });
  } else {
    gated();
  }
})();
