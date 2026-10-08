# AMFIT

Snap a photo of food. AMFIT stamps the local time, assigns breakfast / brunch / lunch / snack / dinner / late night, and logs macros plus micronutrients. Strength programming and step goals come from your own numbers. No premium tier.

## Run

Double-click `start-amfit.cmd`. It serves the folder and opens the app. Keep that window open while you use AMFIT; closing it or pressing Ctrl+C stops the server.

Equivalent by hand — camera and TensorFlow.js need http/https, not `file://`:

```powershell
cd amfit
python serve.py 8765
```

Open http://127.0.0.1:8765

`ERR_CONNECTION_REFUSED` means the local server is not running. Start it again. With Firebase configured, Firestore and Storage are the source of truth and the browser keeps an offline cache; without Firebase configuration, AMFIT remains in local-only compatibility mode.

Before opening the app, run the checks — they parse every script and verify each element lookup resolves, which catches the class of error that leaves the page rendered but dead:

```powershell
node selftest.js
```

## Firebase setup

1. Create a Firebase project and Web app. Enable **Authentication → Email/Password**, **Google**, and (for corporate Microsoft accounts) **Microsoft**, plus **Cloud Firestore**, **Storage**, **Functions**, and **Hosting**.
   - Google: Firebase Console → Authentication → Sign-in method → Google → Enable.
   - Microsoft: register an app in Microsoft Entra, add Firebase's OAuth redirect URI, then paste the Entra client ID and secret into Firebase Authentication → Microsoft. Add the deployed AMFIT domain under Authentication → Settings → Authorized domains.
   - SSO verifies identity through the provider; AMFIT never receives or stores the Google/Microsoft password. Email/password remains a compatibility fallback.
2. Copy `js/firebase-config.example.js` to `js/firebase-config.js`, then paste the Web app values from **Project settings → Your apps**. Firebase's Web config identifies the project; it is not a service-account private key.
   Optionally register reCAPTCHA v3 under **App Check** and set `AMFIT_RECAPTCHA_SITE_KEY`; after verifying requests, change callable Functions to `enforceAppCheck: true`.
3. Install the Functions/test dependencies:

```powershell
cd functions
npm install
cd ..
```

The pinned emulator test command supports JDK 17. Production Functions deploy to the Node 20 runtime even if a newer Node version is installed on the developer workstation.

4. Authenticate and select the project, test the security rules, then deploy:

```powershell
npx firebase-tools login
npx firebase-tools use --add
cd functions
npm run test:rules
cd ..
npx firebase-tools deploy
```

5. Register the account that will become the first administrator. Download a service-account JSON only to your workstation, set `GOOGLE_APPLICATION_CREDENTIALS`, and run:

```powershell
cd functions
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure\amfit-service-account.json"
npm run bootstrap-admin -- admin@company.com
```

Never put the service-account JSON in this folder, source control, browser code, or Firebase Hosting. Sign out and in after assigning a role so Firebase refreshes the custom claim.

### Consoles and data boundaries

- The **user console** owns profile, meal logs, daily activity, progress photos, pins, and learned corrections. Firestore rules restrict every `users/{uid}` document and Storage path to that same UID.
- The **admin console** appears under **You** only for a token with the `admin` custom claim. It can list account metadata, disable/enable users, assign roles, publish announcements/motivation/canteen defaults, and maintain remote food records.
- Administrators cannot read users' meals, weight, profile, daily activity, or photos. Role and disable operations run only through callable Cloud Functions; a client-written `role: admin` field grants nothing.
- Remote food/content records override or extend the built-in catalog after sign-in. If Firebase is offline, built-in content remains available.

### Appearance

**You → Appearance** offers System, Light, and Dark. The choice is applied before first paint to avoid a flash, follows operating-system changes in System mode, and syncs in the Firebase profile. Both themes use semantic surface/text tokens with WCAG-oriented contrast; cyan, violet, coral, and lime are accents rather than body-text colors.

### Existing local accounts

The first successful Firebase sign-in with a valid legacy local password migrates that browser's data. AMFIT creates/signs into the Firebase account, uploads photos to Storage, writes health records to the owner's Firestore path, verifies the upload, and then removes the local password hash/recovery codes. Non-sensitive local data remains as an offline cache. If upload fails, local data remains retryable.

Firebase accounts use password-reset emails. Recovery codes remain available only in local-only compatibility mode.

## Flow

1. Register with your **@amdocs.com** email, employee ID (4–12 letters or numbers), and an AMFIT password. Other email domains are rejected. This password is for AMFIT only.
2. If you forget it, **Forgot password** emails a 6-digit code to that Amdocs address, then lets you set a new AMFIT password. The local server needs `mail.json` (see `mail.json.example`) before it can send mail. With Firebase configured, Firebase sends the reset link instead.
2. Tap **+**. Camera starts. Capture or pick a photo.
3. Time and meal type fill in automatically. If the dish is not recognised the entry is marked **not identified** and the food picker opens — pick the real dish once and AMFIT remembers that label next time.
4. Every logged item has **Details** (its own macros and micros) and **Delete**.
5. With Firebase configured, **Forgot password** sends Firebase's secure reset email. In local-only mode it uses the existing one-time recovery codes.

With Firebase configured, account credentials are handled by Firebase Authentication, structured data is in Firestore, photos are in private per-user Storage paths, and a browser cache supports offline use.

## Screens

| Screen | What it holds |
|---|---|
| Home | kcal/protein against target, step goal, chair hours and desk reset, canteen one-tap log, today's session, meal log |
| Train | Weekly split, today's exercises with sets, reps, rest, form cues, progression rules |
| Log | 7-day calorie strip and every meal ever logged |
| Progress | Weight vs start, BMI, 4/8/12/24-week milestones, your progress photos, shareable weekly wrap card, optional AI poster |
| You | Targets, cloud sync state, system/light/dark theme, password reset, admin entry when authorized, sign out |
| Admin | Account metadata/status/roles and shared content/catalog management; no private health records |

## Meal windows (local clock)

| Hours | Meal |
|---|---|
| 04:00–10:29 | Breakfast |
| 10:30–11:59 | Brunch |
| 12:00–15:29 | Lunch |
| 15:30–17:29 | Snack |
| 17:30–21:29 | Dinner |
| 21:30–03:59 | Late night |

## How the numbers are derived

- BMR: Mifflin-St Jeor. TDEE: BMR × activity factor (1.2 / 1.375 / 1.55 / 1.725).
- Fat loss: 20% deficit, capped between 300 and 700 kcal, floored at 1300 kcal (female) / 1500 (male). Build: TDEE + 300.
- Protein: 1.9 g/kg for fat loss or building, 1.6 g/kg maintaining. Fat 27% of calories, carbs the remainder.
- Steps: activity baseline (6k / 8k / 10k / 12k), +2000 when the goal is fat loss, capped at 15k. Browsers cannot read a phone pedometer, so steps are entered from your watch or Health app.
- Projection: 0.5 kg/week loss, 0.75 kg/week above BMI 30, 0.25 kg/week gain. Loss projections stop at BMI 20.

## Built for a desk job

The failure modes of an office day are not the gym. They are a canteen thali, four coffees, six hours in a chair, and a 9pm release. These three features target exactly that.

**Canteen — one tap, no photo.** Office food repeats, and photographing the same filter coffee twice a day is what kills a food log. Home has a pinned row of canteen items that log in one tap at the current time and meal window. Six sensible defaults ship out of the box (filter coffee, chai with biscuits, idli with sambar, full veg thali, curd rice, banana); **Edit pins** removes what you don't eat, and any identified meal has **Pin to canteen** on its Details screen, capped at twelve. Pinned entries get a generated initials tile instead of a photo, so they still open, edit, and delete like any other row.

**Desk — chair hours and a two-minute reset.** The card tracks how long you have been sitting since the last break and total chair hours for the day, crediting five minutes off the chair per break. Past 50 minutes the card turns coral and the timer pulses. **I moved** logs a break; **2-min desk reset** runs four 30-second moves with form cues — shoulder rolls, chin tucks, a desk hip-flexor stretch, calf raises — all of which work at a desk in office clothes with no mat and no equipment. Finishing counts as a break.

**Weekly wrap.** On Progress, **Build this week's card** draws a 1080×1350 PNG of the last seven days: streak, days logged, protein days, calories on target, steps, sessions, average calories against target, and seven dots for the week. Download it or copy it straight into a Teams or WhatsApp group. Your latest progress photo becomes a circular crop in the corner if you have one. Drawn on canvas here — nothing uploaded.

## Motivation and visual layer

Everything here is driven by your own data — no stock imagery, no fake numbers.

- **Coach line** on Home reads your log, streak, protein left, steps left, and today's session, then says the one thing that matters right now. A scrolling strip underneath carries short cues.
- **Progress rings** for calories, protein, and steps animate from zero on every visit and pop when closed. Closing one drops confetti in that ring's colour — lime for calories (only when you land on target, not past it), cyan for protein, violet for steps, once per goal per day.
- **Protein nudge**: after 18:00, if protein is under half the target, the cyan ring breathes three times. No banner, no guilt.
- **Streak flame**: from three consecutive logged days, the time chip shows 🔥 and the day count.
- **Goal watermark**: a giant faint LEAN / BUILD / STAY sits behind Home, matching your goal.
- **Sky follows the plan**: the drifting aurora runs warm (coral/amber) on lifting days and cool (cyan/violet) on rest days, and shifts hue per screen.
- **Scan sparks**: tapping **+** throws a burst of lime particles.
- **Polaroid shots**: progress photos get a paper frame, a strip of tape, and a slight tilt that straightens on hover.
- **Sketched empty states**: an empty log shows a drawn plate and "snap it"; a rest day shows a dotted walking path.

All of it respects `prefers-reduced-motion` — with that set, every animation and transition is disabled.

## Food recognition limits

Classification runs on-device with MobileNet, which is trained on ImageNet. ImageNet has no class for idli, dosa, sambar, or most Indian dishes, so those photos come back unidentified rather than guessed. Unidentified entries get a clearly-labelled placeholder and prompt you to pick the dish. Corrections are remembered per user.

Nutrient values are typical-serving estimates, not lab assays. Training and nutrition targets are general fitness guidance, not medical advice.

## On-device motivation art — no paid LLM

AMFIT does not fabricate a photo of your future body, and it no longer generates pictures of strangers. Motivation comes from your own photos:

- **Then and now** puts your first progress photo beside the latest, with days elapsed and weight change.
- **Your poster** turns your latest photo into poster art. A canvas filter paints it instantly, then a TensorFlow.js model refines it. Two styles: **Cut-out** (BodyPix, you on a designed poster) and **Painted** (style transfer). **New look** cycles Lime / Dusk / Mono.
- **Your stickers** cut you out of the photo and lay you on four WhatsApp-style stickers (ring, bordered, goal badge, photo count). Tap any sticker to download a PNG. Same on-device model; no API key.

Both transformations run entirely in the browser with no image-generation API. With Firebase configured, the source/result photo can be stored in the user's private Storage path for cross-device access; the model processing itself stays on-device. Without `models/` (~14 MB) the instant filter still works.

Neither model can reshape your body — they restyle and cut out pixels. AMFIT deliberately uses no paid LLM, image-generation subscription, API-key purchase, or premium tier. Its employee-focused value comes from private on-device meal recognition, one-tap canteen logging, desk resets, workday streaks, and weekly wrap cards.

## Files

```
amfit/
├── index.html
├── firebase.json
├── firestore.rules
├── storage.rules
├── functions/           # privileged callable functions + emulator tests
├── serve.py             # local static/API server
├── selftest.js
├── css/app.css
└── js/
    ├── firebase.js      # Firebase Auth boundary
    ├── store.js         # Firestore/Storage repository + migration
    ├── admin.js         # administrator console
    └── app.js           # user console
```

## Test and rollback

```powershell
node selftest.js
cd functions
npm run lint
npm run test:rules
```

For a rollout, deploy rules/functions first, verify one test account and one legacy migration, bootstrap the first admin, then deploy Hosting. Export Firestore/Auth before bulk migration. To roll back the UI, redeploy the previous Hosting release; do not roll back rules to a version that broadens access. Migrated records remain in Firebase and local non-sensitive caches remain readable by the prior local build.
