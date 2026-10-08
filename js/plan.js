/* AMFIT targets and strength programming. General fitness guidance, not medical advice. */
window.AMFIT_PLAN = (function () {
  const ACTIVITY = {
    sedentary: { factor: 1.2, steps: 6000, label: "Desk job, little walking" },
    light: { factor: 1.375, steps: 8000, label: "Light activity 1-3 days" },
    moderate: { factor: 1.55, steps: 10000, label: "Moderate activity 3-5 days" },
    active: { factor: 1.725, steps: 12000, label: "Hard training 6-7 days" }
  };

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function targets(p) {
    const w = Number(p.weight), h = Number(p.height), a = Number(p.age);
    const act = ACTIVITY[p.activity] || ACTIVITY.light;
    const bmr = Math.round(10 * w + 6.25 * h - 5 * a + (p.sex === "female" ? -161 : 5));
    const tdee = Math.round(bmr * act.factor);

    let kcal = tdee;
    if (p.goal === "lose") kcal = Math.round(tdee - clamp(tdee * 0.2, 300, 700));
    if (p.goal === "gain") kcal = tdee + 300;
    kcal = Math.max(kcal, p.sex === "female" ? 1300 : 1500);

    const perKg = p.goal === "gain" ? 1.9 : p.goal === "lose" ? 1.9 : 1.6;
    const protein = Math.round(w * perKg);
    const fat = Math.round((kcal * 0.27) / 9);
    const carbs = Math.max(60, Math.round((kcal - protein * 4 - fat * 9) / 4));
    const fiber = Math.round((kcal / 1000) * 14);

    let steps = act.steps + (p.goal === "lose" ? 2000 : 0);
    steps = clamp(steps, 5000, 15000);

    const bmi = w / Math.pow(h / 100, 2);
    const bmiLabel = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy" : bmi < 30 ? "Overweight" : "Obese";
    const idealWeight = Math.round(22 * Math.pow(h / 100, 2) * 10) / 10;
    const floorWeight = Math.round(20 * Math.pow(h / 100, 2) * 10) / 10;

    let ratePerWeek = 0;
    if (p.goal === "lose") ratePerWeek = -(bmi >= 30 ? 0.75 : 0.5);
    if (p.goal === "gain") ratePerWeek = 0.25;

    return {
      bmr, tdee, kcal, protein, fat, carbs, fiber, steps,
      water: Math.round(w * 35) / 1000,
      bmi: Math.round(bmi * 10) / 10, bmiLabel, idealWeight, floorWeight, ratePerWeek,
      activityLabel: act.label,
      recompNote: p.goal === "lose" && bmi < 23
    };
  }

  function milestones(p, t) {
    if (!t.ratePerWeek) return [];
    const start = Number(p.weight);
    return [4, 8, 12, 24].map((wk) => {
      const d = new Date();
      d.setDate(d.getDate() + wk * 7);
      let w = start + t.ratePerWeek * wk;
      if (t.ratePerWeek < 0) w = Math.max(w, t.floorWeight);
      else w = Math.min(w, Math.max(t.idealWeight, start + 6));
      const bmi = w / Math.pow(Number(p.height) / 100, 2);
      return {
        weeks: wk,
        date: d.toLocaleDateString([], { month: "short", day: "numeric" }),
        weight: Math.round(w * 10) / 10,
        delta: Math.round((w - start) * 10) / 10,
        bmi: Math.round(bmi * 10) / 10
      };
    });
  }

  const PROGRAMS = {
    beginner: {
      label: "3-day full body",
      why: "New lifters build fastest hitting each muscle 3x a week with few, well-drilled lifts.",
      schedule: { 1: "A", 3: "B", 5: "A" },
      progression: "Hit the top of the rep range on every set, then add 2.5 kg lower body / 1.25 kg upper body next session.",
      deload: "Stalled twice on the same weight? Drop 10% and build back up.",
      sessions: {
        A: {
          name: "Full body A",
          ex: [
            { n: "Goblet squat", s: 3, r: "8-10", rest: "120s", cue: "Heels planted, chest tall, knees track over toes" },
            { n: "Push-up (or bench press)", s: 3, r: "8-12", rest: "90s", cue: "Elbows ~45°, ribs down, full lockout" },
            { n: "One-arm dumbbell row", s: 3, r: "10 each", rest: "90s", cue: "Pull to hip, no torso twist" },
            { n: "Romanian deadlift", s: 3, r: "10", rest: "120s", cue: "Push hips back, bar close, stop at mid-shin" },
            { n: "Plank", s: 3, r: "30-45s", rest: "60s", cue: "Squeeze glutes, no sagging hips" }
          ]
        },
        B: {
          name: "Full body B",
          ex: [
            { n: "Dumbbell deadlift", s: 3, r: "8", rest: "150s", cue: "Brace before you pull, drive the floor away" },
            { n: "Overhead press", s: 3, r: "8-10", rest: "90s", cue: "Squeeze glutes, head through at the top" },
            { n: "Assisted pull-up / lat pulldown", s: 3, r: "8-10", rest: "90s", cue: "Lead with elbows, chest up" },
            { n: "Split squat", s: 3, r: "10 each", rest: "90s", cue: "Back knee to floor, front shin vertical" },
            { n: "Dead bug", s: 3, r: "10 each", rest: "60s", cue: "Low back glued to floor" }
          ]
        }
      }
    },
    intermediate: {
      label: "4-day upper / lower",
      why: "With 6+ months of lifting you need more volume per muscle; splitting upper and lower buys it.",
      schedule: { 1: "UA", 2: "LA", 4: "UB", 5: "LB" },
      progression: "Double progression: add reps to the top of the range, then add load and reset to the bottom.",
      deload: "Every 6-8 weeks run one week at 60% load and half the sets.",
      sessions: {
        UA: {
          name: "Upper A (push focus)",
          ex: [
            { n: "Bench press", s: 4, r: "6-8", rest: "150s", cue: "Shoulder blades pinned, bar to lower chest" },
            { n: "Barbell / dumbbell row", s: 4, r: "8-10", rest: "120s", cue: "Torso still, pull to lower ribs" },
            { n: "Incline dumbbell press", s: 3, r: "10", rest: "90s", cue: "Control the negative, no bouncing" },
            { n: "Lat pulldown", s: 3, r: "10-12", rest: "90s", cue: "Lean back slightly, drive elbows down" },
            { n: "Lateral raise", s: 3, r: "12-15", rest: "60s", cue: "Lead with elbows, no shrugging" },
            { n: "Biceps curl", s: 3, r: "12", rest: "60s", cue: "Elbows fixed at your sides" }
          ]
        },
        LA: {
          name: "Lower A (squat focus)",
          ex: [
            { n: "Back squat", s: 4, r: "6-8", rest: "180s", cue: "Break at hips and knees together, depth over load" },
            { n: "Romanian deadlift", s: 3, r: "8", rest: "150s", cue: "Feel the hamstrings, spine neutral" },
            { n: "Leg press", s: 3, r: "10-12", rest: "90s", cue: "Knees out, don't round the lower back" },
            { n: "Leg curl", s: 3, r: "12", rest: "75s", cue: "Slow eccentric, hips down" },
            { n: "Standing calf raise", s: 4, r: "12-15", rest: "60s", cue: "Full stretch at the bottom, pause on top" },
            { n: "Hanging knee raise", s: 3, r: "12", rest: "60s", cue: "Curl the pelvis, don't swing" }
          ]
        },
        UB: {
          name: "Upper B (pull focus)",
          ex: [
            { n: "Overhead press", s: 4, r: "6-8", rest: "150s", cue: "Ribs down, don't lean back" },
            { n: "Pull-up", s: 4, r: "as many as possible", rest: "150s", cue: "Chin over bar, controlled descent" },
            { n: "Chest-supported row", s: 3, r: "10", rest: "90s", cue: "Pause one second at the top" },
            { n: "Cable fly", s: 3, r: "12-15", rest: "75s", cue: "Slight elbow bend, squeeze at midline" },
            { n: "Face pull", s: 3, r: "15", rest: "60s", cue: "Pull to forehead, thumbs back" },
            { n: "Triceps rope pushdown", s: 3, r: "12-15", rest: "60s", cue: "Elbows tucked, full extension" }
          ]
        },
        LB: {
          name: "Lower B (hinge focus)",
          ex: [
            { n: "Deadlift", s: 4, r: "5", rest: "180s", cue: "Bar over mid-foot, wedge in before lifting" },
            { n: "Bulgarian split squat", s: 3, r: "8 each", rest: "120s", cue: "Weight on the front leg, torso upright" },
            { n: "Hip thrust", s: 3, r: "10", rest: "90s", cue: "Chin tucked, ribs down, squeeze at the top" },
            { n: "Leg extension", s: 3, r: "12-15", rest: "75s", cue: "Pause at full extension" },
            { n: "Ab wheel / cable crunch", s: 3, r: "10-12", rest: "60s", cue: "Keep ribs pulled toward hips" }
          ]
        }
      }
    }
  };

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function program(p) { return PROGRAMS[p.experience === "intermediate" ? "intermediate" : "beginner"]; }

  function week(p) {
    const prog = program(p);
    return DAYS.map((d, i) => ({
      day: d,
      key: prog.schedule[i] || null,
      name: prog.schedule[i] ? prog.sessions[prog.schedule[i]].name : "Rest / walk"
    }));
  }

  /* Two minutes, four moves, 30 seconds each. No floor, no mat, no equipment —
     all of it works at a desk in office clothes without drawing a crowd. */
  const DESK_RESET = [
    { n: "Stand up and roll the shoulders back", s: 30, cue: "Ten slow circles back, chest open. Undo the hunch." },
    { n: "Chin tuck, then look slowly left and right", s: 30, cue: "Pull the chin straight back, don't tip the head. Screen neck fix." },
    { n: "Hip flexor stretch, hands on the desk", s: 30, cue: "One foot back, squeeze that glute, stand tall. Fifteen seconds each side." },
    { n: "Calf raises and four deep breaths", s: 30, cue: "Slow up, slower down. Breathe into the belly, not the chest." }
  ];

  /* Canteen starters: what an office day is actually made of. Pinned for one-tap
     logging so nobody has to photograph the same filter coffee twice a day. */
  const CANTEEN = ["filter_coffee", "chai_biscuit", "idli_sambar", "thali", "curd_rice", "banana"];

  const DESK_SECONDS = DESK_RESET.reduce((a, m) => a + m.s, 0);

  /* Home style tiles. Confidence cues, not medical advice or beauty standards.
     Every look carries its own image slot; the tile falls back to line art until
     a photo with that exact filename exists in img/style/. */
  const STYLE_TIPS = {
    posture: {
      title: "Open posture",
      kicker: "How you stand",
      img: "img/style/posture.jpg",
      lead: "Tall through the spine reads as calm before anyone hears you speak.",
      looks: [
        { label: "Women · jeans + shirt", img: "img/style/posture-women-jeans.jpg",
          cue: "Tucked cream shirt, straight dark jeans, low bun. Stand 3/4, one thumb in a pocket." },
        { label: "Men · jeans + shirt", img: "img/style/posture-men-jeans.jpg",
          cue: "Light-blue oxford, sleeves rolled once, dark jeans. Shoulders stacked over hips." },
        { label: "Women · traditional", img: "img/style/posture-women-ethnic.jpg",
          cue: "Cotton kurta + palazzo or a simple saree. One hand at the waist, spine long." },
        { label: "Men · traditional", img: "img/style/posture-men-ethnic.jpg",
          cue: "Fitted cotton kurta, churidar or straight trousers. Arms relaxed, chin level." },
        { label: "Seated · desk", img: "img/style/posture-seated.jpg",
          cue: "Hips back in the chair, feet flat, screen at eye height. No forward head." },
        { label: "Walking · corridor", img: "img/style/posture-walking.jpg",
          cue: "Lead with the chest, phone down, easy arm swing. Looks confident on camera too." }
      ],
      tips: [
        "Drop the shoulders. Let them hang, then roll them back once.",
        "Chin parallel to the floor — not a phone-hunch, not a chin-up pose.",
        "Weight even on both feet. Soft knees. Ribs stacked over hips.",
        "In a selfie: hold the phone slightly above eye level so you look into it, not down at it."
      ],
      fashion: [
        "Women: tucked shirt or kurta + straight jeans or palazzo. Fitted through the shoulder, easy through the hip.",
        "Men: oxford or short kurta, sleeves rolled once, dark jeans or chinos. Belt visible.",
        "Hair: low bun / sleek ponytail, or short fade / neat side-part. Keep the neck line clear so posture shows."
      ]
    },
    smile: {
      title: "Natural smile",
      kicker: "How you land on camera",
      img: "img/style/smile.jpg",
      lead: "A real smile is an exhale, not a performance.",
      looks: [
        { label: "Women · selfie", img: "img/style/smile-women-selfie.jpg",
          cue: "White shirt, side-part layers. Phone just above the eyes, chin down 5°." },
        { label: "Men · selfie", img: "img/style/smile-men-selfie.jpg",
          cue: "Navy polo or oxford, textured crop. Closed-mouth smile, eyes engaged." },
        { label: "Women · traditional", img: "img/style/smile-women-ethnic.jpg",
          cue: "Pastel salwar or simple saree, centre-part braid or bun. Soft eyes." },
        { label: "Men · traditional", img: "img/style/smile-men-ethnic.jpg",
          cue: "Muted kurta, neat stubble. Smile after an exhale, not on command." },
        { label: "Laughing · candid", img: "img/style/smile-candid.jpg",
          cue: "Look slightly off-camera mid-laugh. The most honest frame of any set." },
        { label: "Team · group", img: "img/style/smile-group.jpg",
          cue: "Stand shoulder-to-shoulder at a slight angle, not a straight police line-up." }
      ],
      tips: [
        "Breathe out, then smile. Eyes soften first; mouth follows.",
        "Closed or barely-open lips beat a forced teeth grin.",
        "Phone slightly above the eyes, chin down 5°. Elbows away from the ribs.",
        "Window light on the face. Skip bathroom-mirror flash."
      ],
      fashion: [
        "Women: white or cream shirt, or a pastel salwar / simple saree blouse. Small studs, not heavy jewellery.",
        "Men: navy polo or oxford, or a muted kurta. Neat stubble or clean shave.",
        "Hair: side part with layers, or a centre-part braid/bun. Men: textured crop. Nothing covering the eyes."
      ]
    },
    balance: {
      title: "Clean balance",
      kicker: "How the outfit sits",
      img: "img/style/balance.jpg",
      lead: "One fitted piece + one relaxed piece. That is the whole rule.",
      looks: [
        { label: "Women · jeans + shirt", img: "img/style/balance-women-jeans.jpg",
          cue: "Fitted white shirt, relaxed straight jeans, open blazer, loafers." },
        { label: "Men · jeans + shirt", img: "img/style/balance-men-jeans.jpg",
          cue: "Oxford untucked but not baggy, dark jeans, unstructured jacket, clean sneakers." },
        { label: "Women · traditional", img: "img/style/balance-women-ethnic.jpg",
          cue: "Fitted cotton kurta + relaxed palazzo, light dupatta, kolhapuris." },
        { label: "Men · traditional", img: "img/style/balance-men-ethnic.jpg",
          cue: "Straight kurta over churidar, one watch, leather sandals. No sequins." },
        { label: "Indo-western", img: "img/style/balance-indo-western.jpg",
          cue: "Short kurta over dark jeans, loafers. The office-festive middle ground." },
        { label: "Saree · office", img: "img/style/balance-saree.jpg",
          cue: "Crisp cotton saree, simple blouse, hair in a bun. Everyday, not bridal." }
      ],
      tips: [
        "Fitted on top, easy on the bottom — or the reverse. Never baggy-on-baggy.",
        "Tuck or French-tuck a shirt. Show a waist so the silhouette reads.",
        "Shoes simple: white sneakers, loafers, or kolhapuris. One metal: watch or small earrings.",
        "Same rule for ethnic: fitted kurta + relaxed palazzo, or short kurta + dark jeans."
      ],
      fashion: [
        "Women jeans + shirt: fitted white shirt, relaxed straight jeans, open blazer, loafers.",
        "Men jeans + shirt: oxford untucked but not oversized, dark jeans, unstructured jacket.",
        "Traditional: cotton kurta + palazzo / churidar, or saree with a simple blouse. Everyday office-festive, not bridal.",
        "Hair: low ponytail or bun with the blazer; short fade with the jeans-kurta mix."
      ]
    }
  };

  return { ACTIVITY, targets, milestones, program, week, DAYS, DESK_RESET, DESK_SECONDS, CANTEEN, STYLE_TIPS };
})();
