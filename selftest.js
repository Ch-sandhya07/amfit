/* Node smoke test: loads the data + plan modules and checks the numbers. Not shipped to the browser. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const SCRIPTS = [
  "js/foods.js",
  "js/foods-indian.js",
  "js/plan.js",
  "js/firebase-config.js",
  "js/firebase.js",
  "js/store.js",
  "js/admin.js",
  "js/app.js",
  "functions/src/index.js",
  "functions/scripts/bootstrap-admin.js",
  "functions/test/rules.test.js"
];
let syntaxFail = 0;
SCRIPTS.forEach((f) => {
  try {
    execFileSync(process.execPath, ["--check", path.join(__dirname, f)], { stdio: "pipe" });
    console.log("ok   parses: " + f);
  } catch (e) {
    syntaxFail++;
    console.log("FAIL syntax error in " + f + "\n" + String(e.stderr));
  }
});
try {
  execFileSync("python", ["-m", "py_compile", path.join(__dirname, "serve.py")], { stdio: "pipe" });
  console.log("ok   parses: serve.py");
} catch (e) {
  syntaxFail++;
  console.log("FAIL serve.py did not compile\n" + String(e.stderr || e));
}
if (syntaxFail) { console.log("\n" + syntaxFail + " FAILURES"); process.exit(1); }

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const appSrc = fs.readFileSync(path.join(__dirname, "js/app.js"), "utf8");
const adminSrc = fs.readFileSync(path.join(__dirname, "js/admin.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "css/app.css"), "utf8");
const firestoreRules = fs.readFileSync(path.join(__dirname, "firestore.rules"), "utf8");
const storageRules = fs.readFileSync(path.join(__dirname, "storage.rules"), "utf8");
const ids = (src) => [...src.matchAll(/\bid="([\w-]+)"/g)].map((m) => m[1]);
const available = new Set([...ids(html), ...ids(appSrc), ...ids(adminSrc)]);
const wanted = new Set(
  [...(appSrc + "\n" + adminSrc).matchAll(/\$\("([A-Za-z][\w-]*)"\)/g)].map((m) => m[1])
);
const missing = [...wanted].filter((id) => !available.has(id));
if (missing.length) {
  console.log("FAIL app.js looks up ids nothing defines: " + missing.join(", "));
  process.exit(1);
}
console.log("ok   all " + wanted.size + " element lookups resolve to a defined id");

const fbSrc = fs.readFileSync(path.join(__dirname, "js/firebase.js"), "utf8");
if (!/OAuthProvider\("microsoft\.com"\)/.test(fbSrc) || !/AMFIT_MS_TENANT/.test(fbSrc) ||
    !/employeeId/.test(fbSrc) || !/id="btnMicrosoftSso"/.test(html) || /id="btnGoogleSso"/.test(html)) {
  console.log("FAIL Amdocs Microsoft SSO (tenant pin + directory employee ID) is missing");
  process.exit(1);
}
console.log("ok   Amdocs SSO is tenant-pinned and reads employee ID from the directory");
if (!html.includes('placeholder="name@amdocs.com"') || !html.includes('id="empId"') || !html.includes('id="pEmp"')) {
  console.log("FAIL Amdocs email or employee ID fields are missing");
  process.exit(1);
}
const appJs = fs.readFileSync(path.join(__dirname, "js/app.js"), "utf8");
const server = fs.readFileSync(path.join(__dirname, "serve.py"), "utf8");
if (!appJs.includes("@amdocs\\.com") || !appJs.includes("/api/send-otp") || !server.includes('email.endswith("@amdocs.com")')) {
  console.log("FAIL Amdocs domain gate or email reset is missing");
  process.exit(1);
}
console.log("ok   Amdocs email, employee ID, and email reset are wired");

if (!/data-theme="light"/.test(css) || !/data-theme="dark"/.test(css)) {
  console.log("FAIL light/dark semantic theme selectors are missing");
  process.exit(1);
}
console.log("ok   light and dark theme selectors exist");
if (!/request\.auth\.uid == uid/.test(firestoreRules) || !/request\.auth\.token\.admin == true/.test(firestoreRules)) {
  console.log("FAIL Firestore rules lack owner/admin authorization");
  process.exit(1);
}
console.log("ok   Firestore rules contain owner and custom-claim admin gates");
if (!/contentType\.matches\('image\/\.\*'\)/.test(storageRules) || !/request\.auth\.uid == uid/.test(storageRules)) {
  console.log("FAIL Storage rules lack image validation or owner isolation");
  process.exit(1);
}
console.log("ok   Storage rules isolate owners and validate image uploads");

const ctx = { window: {}, console };
ctx.window.window = ctx.window;
vm.createContext(ctx);

["js/foods.js", "js/foods-indian.js", "js/plan.js"].forEach((f) => {
  const src = fs.readFileSync(path.join(__dirname, f), "utf8");
  vm.runInContext(src.replace(/\bwindow\.AMFIT/g, "window.AMFIT"), ctx, { filename: f });
});

const FOODS = ctx.window.AMFIT_FOODS;
const META = ctx.window.AMFIT_MICRO_META;
const PLAN = ctx.window.AMFIT_PLAN;
let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log("FAIL " + msg); } else console.log("ok   " + msg); };

ok(FOODS.idli_sambar, "idli_sambar exists");
ok(FOODS.idli_sambar.macros.protein < 14, "idli+sambar protein is realistic: " + FOODS.idli_sambar.macros.protein + " g");
ok(FOODS.default_dinner.macros.protein <= 16, "unconfirmed dinner no longer claims 36 g protein: " + FOODS.default_dinner.macros.protein + " g");
ok(/Unconfirmed/.test(FOODS.default_dinner.name), "fallback is labelled unconfirmed");
ok(!ctx.window.AMFIT_LABEL_MAP.plate, "generic 'plate' label no longer auto-maps to a meal estimate");

const indian = ["idli_sambar", "dosa_sambar", "masala_dosa", "upma", "poha", "pongal", "curd_rice", "rajma_chawal", "chicken_biryani", "thali"];
indian.forEach((k) => ok(!!FOODS[k], "dish present: " + k));

Object.keys(FOODS).forEach((k) => {
  const f = FOODS[k];
  const m = f.macros;
  const derived = m.protein * 4 + m.carbs * 4 + m.fat * 9;
  const drift = Math.abs(derived - m.kcal) / m.kcal;
  if (drift > 0.18) { fail++; console.log("FAIL macro/kcal drift " + k + " " + Math.round(drift * 100) + "%"); }
  META.forEach((x) => {
    if (typeof f.micros[x.key] !== "number") { fail++; console.log("FAIL missing micro " + x.key + " on " + k); }
  });
});
console.log("ok   " + Object.keys(FOODS).length + " foods, all micros present, kcal within 18% of macro math");

const p = { name: "T", weight: 62, height: 165, age: 30, sex: "female", activity: "light", goal: "lose", experience: "beginner", startWeight: 62 };
const t = PLAN.targets(p);
ok(t.bmr === Math.round(10 * 62 + 6.25 * 165 - 5 * 30 - 161), "BMR matches Mifflin-St Jeor: " + t.bmr);
ok(t.kcal < t.tdee && t.kcal >= 1300, "fat-loss kcal in a safe deficit: " + t.kcal + " vs TDEE " + t.tdee);
ok(t.protein === Math.round(62 * 1.9), "protein target " + t.protein + " g");
ok(t.steps === 10000, "step goal raised for fat loss: " + t.steps);
ok(t.bmi > 22 && t.bmiLabel === "Healthy", "BMI " + t.bmi + " " + t.bmiLabel);

const ms = PLAN.milestones(p, t);
ok(ms.length === 4 && ms[0].weight < 62 && ms[3].weight >= t.floorWeight, "milestones descend and stop at BMI 20: " + ms.map((m) => m.weight).join(", "));
ok(ms[3].weight < ms[0].weight, "projection keeps moving instead of flattening at week 4");
ok(t.recompNote === true, "healthy-BMI user gets the recomposition note instead of a scale promise");

const obese = PLAN.targets({ weight: 95, height: 165, age: 40, sex: "male", activity: "sedentary", goal: "lose" });
ok(obese.ratePerWeek === -0.75, "higher BMI gets the faster safe rate: " + obese.ratePerWeek + " kg/wk");
ok(obese.recompNote === false, "obese user does not get the recomposition note");

const maint = PLAN.targets(Object.assign({}, p, { goal: "maintain" }));
ok(maint.kcal === maint.tdee, "maintain eats at TDEE");
ok(PLAN.milestones(p, maint).length === 0, "maintain has no weight projection");

ok(PLAN.program({ experience: "beginner" }).schedule[1] === "A", "beginner trains Monday");
ok(Object.keys(PLAN.program({ experience: "intermediate" }).sessions).length === 4, "intermediate has 4 sessions");
PLAN.week({ experience: "intermediate" }).forEach((d) => {
  if (d.key && !PLAN.program({ experience: "intermediate" }).sessions[d.key]) { fail++; console.log("FAIL bad session key " + d.key); }
});
ok(PLAN.week({ experience: "beginner" }).filter((d) => d.key).length === 3, "beginner week has 3 lifting days");

ok(PLAN.DESK_SECONDS === 120, "desk reset is two minutes: " + PLAN.DESK_SECONDS + "s");
ok(PLAN.DESK_RESET.length === 4 && PLAN.DESK_RESET.every((m) => m.n && m.cue && m.s > 0),
  "every desk move has a name, a cue, and a duration");
const unknownPins = PLAN.CANTEEN.filter((k) => !FOODS[k]);
ok(unknownPins.length === 0, "canteen default pins all resolve to real foods" +
  (unknownPins.length ? ": missing " + unknownPins.join(", ") : ""));
ok(PLAN.CANTEEN.length >= 4 && new Set(PLAN.CANTEEN).size === PLAN.CANTEEN.length,
  PLAN.CANTEEN.length + " canteen pins, no duplicates");
ok(PLAN.STYLE_TIPS.posture && PLAN.STYLE_TIPS.smile && PLAN.STYLE_TIPS.balance,
  "style tips exist for posture, smile, and balance");
ok(["posture", "smile", "balance"].every(function (k) {
  const t = PLAN.STYLE_TIPS[k];
  return t.tips.length >= 3 && t.fashion.length >= 2 && /img\/style\//.test(t.img);
}), "each style tile has tips, fashion lines, and an image slot");
const looks = ["posture", "smile", "balance"].flatMap(function (k) { return PLAN.STYLE_TIPS[k].looks; });
ok(looks.length >= 18 && looks.every(function (l) { return l.label && l.cue && /^img\/style\/[\w-]+\.jpg$/.test(l.img); }),
  looks.length + " looks, each with a label, a cue, and an image path");
ok(new Set(looks.map(function (l) { return l.img; })).size === looks.length, "no two looks share an image file");
ok(["posture", "smile", "balance"].every(function (k) {
  const labels = PLAN.STYLE_TIPS[k].looks.map(function (l) { return l.label; }).join(" ");
  return /Women/.test(labels) && /Men/.test(labels) && /traditional/i.test(labels);
}), "every tile covers women, men, and traditional wear");

const pyMap = execFileSync("python", ["-c",
  "import serve; f=serve.map_fdc_food({'fdcId':1,'description':'BANANA RAW','foodNutrients':[{'nutrientNumber':'1008','value':89},{'nutrientNumber':'1003','value':1.1}]}); assert f['macros']['kcal']==89 and f['macros']['protein']==1.1 and f['source'].startswith('USDA')"
], { encoding: "utf8" });
console.log("ok   USDA FDC mapper maps energy and protein");

console.log(fail ? "\n" + fail + " FAILURES" : "\nall checks passed");
process.exit(fail ? 1 : 0);
