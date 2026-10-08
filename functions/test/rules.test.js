const fs = require("fs");
const path = require("path");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} = require("@firebase/rules-unit-testing");
const {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc
} = require("firebase/firestore");
const {
  getBytes,
  ref,
  uploadBytes
} = require("firebase/storage");

let failed = 0;
async function check(name, work) {
  try {
    await work();
    console.log("ok   " + name);
  } catch (err) {
    failed++;
    console.error("FAIL " + name + "\n" + (err && err.message ? err.message : err));
  }
}

(async function () {
  const env = await initializeTestEnvironment({
    projectId: "demo-amfit",
    firestore: {
      rules: fs.readFileSync(path.join(__dirname, "../../firestore.rules"), "utf8")
    },
    storage: {
      rules: fs.readFileSync(path.join(__dirname, "../../storage.rules"), "utf8")
    }
  });

  const alice = env.authenticatedContext("alice", { email: "alice@example.com" });
  const bob = env.authenticatedContext("bob", { email: "bob@example.com" });
  const admin = env.authenticatedContext("admin", { email: "admin@example.com", admin: true });
  const guest = env.unauthenticatedContext();

  await env.withSecurityRulesDisabled(async function (ctx) {
    await setDoc(doc(ctx.firestore(), "accounts/alice"), {
      email: "alice@example.com", name: "Alice", role: "user", status: "active"
    });
    await setDoc(doc(ctx.firestore(), "accounts/bob"), {
      email: "bob@example.com", name: "Bob", role: "user", status: "active"
    });
    await setDoc(doc(ctx.firestore(), "users/alice"), { profile: { weight: 62 } });
    await setDoc(doc(ctx.firestore(), "users/bob"), { profile: { weight: 80 } });
  });

  await check("owner reads private health document", async function () {
    await assertSucceeds(getDoc(doc(alice.firestore(), "users/alice")));
  });
  await check("cross-user health read is denied", async function () {
    await assertFails(getDoc(doc(alice.firestore(), "users/bob")));
  });
  await check("admin cannot read private health document", async function () {
    await assertFails(getDoc(doc(admin.firestore(), "users/alice")));
  });
  await check("admin can list account metadata", async function () {
    await assertSucceeds(getDocs(collection(admin.firestore(), "accounts")));
  });
  await check("regular user cannot list account metadata", async function () {
    await assertFails(getDocs(collection(alice.firestore(), "accounts")));
  });
  await check("admin writes shared content", async function () {
    await assertSucceeds(setDoc(doc(admin.firestore(), "content/announcements"), { text: "Hello" }));
  });
  await check("regular user cannot write shared content", async function () {
    await assertFails(setDoc(doc(alice.firestore(), "content/announcements"), { text: "No" }));
  });
  await check("admin writes validated food content", async function () {
    await assertSucceeds(setDoc(doc(admin.firestore(), "content/foods/items/office_bowl"), {
      name: "Office bowl",
      serving: "1 bowl",
      macros: { kcal: 450, protein: 25, carbs: 55, fat: 12, fiber: 6, sugar: 4 }
    }));
  });
  await check("invalid food content is denied", async function () {
    await assertFails(setDoc(doc(admin.firestore(), "content/foods/items/bad_bowl"), {
      name: "Bad bowl",
      serving: "1 bowl",
      macros: { kcal: -1, protein: 0, carbs: 0, fat: 0 }
    }));
  });
  await check("signed-in user reads shared content", async function () {
    await assertSucceeds(getDoc(doc(bob.firestore(), "content/announcements")));
  });
  await check("guest cannot read shared content", async function () {
    await assertFails(getDoc(doc(guest.firestore(), "content/announcements")));
  });

  const photo = new Uint8Array([255, 216, 255, 217]);
  await check("owner uploads and reads own image", async function () {
    const own = ref(alice.storage(), "users/alice/photos/test.jpg");
    await assertSucceeds(uploadBytes(own, photo, { contentType: "image/jpeg" }));
    await assertSucceeds(getBytes(own));
  });
  await check("cross-user image read is denied", async function () {
    await assertFails(getBytes(ref(bob.storage(), "users/alice/photos/test.jpg")));
  });
  await check("admin cannot read a user's private image", async function () {
    await assertFails(getBytes(ref(admin.storage(), "users/alice/photos/test.jpg")));
  });
  await check("non-image upload is denied", async function () {
    await assertFails(uploadBytes(
      ref(alice.storage(), "users/alice/photos/not-image.txt"),
      new Uint8Array([1, 2, 3]),
      { contentType: "text/plain" }
    ));
  });

  await env.cleanup();
  console.log(failed ? "\n" + failed + " FAILURES" : "\nall rule checks passed");
  process.exit(failed ? 1 : 0);
})().catch(function (err) {
  console.error(err);
  process.exit(1);
});
