// ---------------------------------------------------------------------------
// Apartment Café — page logic
// Loads this week's menu + event details from Firestore, renders them, and
// handles the sign-up form (with an atomic capacity check).
// ---------------------------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { firebaseConfig, ACTIVE_EVENT_ID } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const eventRef = doc(db, "events", ACTIVE_EVENT_ID);

const els = {
  hero: document.querySelector(".hero"),
  heroKicker: document.getElementById("hero-kicker"),
  heroTagline: document.getElementById("hero-tagline"),
  menuContent: document.getElementById("menu-content"),
  eventDate: document.getElementById("event-date"),
  eventSpots: document.getElementById("event-spots"),
  signupSub: document.getElementById("signup-sub"),
  form: document.getElementById("signup-form"),
  submitBtn: document.getElementById("signup-submit"),
  message: document.getElementById("signup-message"),
};

let currentEventData = null;

/** Formats a Firestore Timestamp, JS Date, or date string into a friendly string. */
function formatDateTime(value) {
  if (!value) return "To be announced";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "To be announced";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function renderMenu(menu) {
  if (!Array.isArray(menu) || menu.length === 0) {
    els.menuContent.innerHTML = '<p class="menu-error">This week\'s menu is being written up — check back soon!</p>';
    return;
  }

  const categories = [];
  const byCategory = new Map();
  for (const item of menu) {
    const category = item.category || "Menu";
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
      categories.push(category);
    }
    byCategory.get(category).push(item);
  }

  els.menuContent.innerHTML = categories
    .map((category) => {
      const items = byCategory
        .get(category)
        .map(
          (item) => `
        <div class="menu-item">
          <div class="menu-item-row">
            <span class="menu-item-name">${escapeHtml(item.name || "")}</span>
            <span class="menu-item-leader"></span>
            <span class="menu-item-price">${escapeHtml(item.price || "")}</span>
          </div>
          ${item.description ? `<p class="menu-item-desc">${escapeHtml(item.description)}</p>` : ""}
        </div>`
        )
        .join("");
      return `
        <div class="menu-category">
          <h3 class="menu-category-title">${escapeHtml(category)}</h3>
          ${items}
        </div>`;
    })
    .join("");
}

function renderEventDetails(data) {
  els.eventDate.textContent = formatDateTime(data.dateTime);

  const capacity = Number(data.capacity) || 0;
  const signupCount = Number(data.signupCount) || 0;
  const spotsLeft = Math.max(capacity - signupCount, 0);

  if (spotsLeft <= 0) {
    els.eventSpots.textContent = "Fully booked — see you next week!";
    els.eventSpots.classList.add("is-full");
    setFormFull();
  } else {
    els.eventSpots.textContent = `${spotsLeft} of ${capacity} spot${capacity === 1 ? "" : "s"} left`;
    els.eventSpots.classList.remove("is-full");
  }

  if (data.title) {
    els.heroKicker.textContent = data.title;
  }
  if (data.tagline) {
    els.heroTagline.textContent = data.tagline;
  }
  if (data.backgroundImage) {
    els.hero.style.backgroundImage =
      `linear-gradient(rgba(243,236,220,0.55), rgba(243,236,220,0.8)), url("${data.backgroundImage}")`;
    els.hero.style.backgroundSize = "cover";
    els.hero.style.backgroundPosition = "center";
  }
}

function setFormFull() {
  els.submitBtn.disabled = true;
  els.submitBtn.textContent = "Fully Booked";
  els.signupSub.textContent = "This week's seats are all taken — check back for next week's date!";
  for (const input of els.form.querySelectorAll("input")) {
    input.disabled = true;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadEvent() {
  try {
    const snap = await getDoc(eventRef);
    if (!snap.exists()) {
      els.menuContent.innerHTML = '<p class="menu-error">No event has been set up yet — check back soon!</p>';
      els.eventDate.textContent = "To be announced";
      return;
    }
    currentEventData = snap.data();
    renderMenu(currentEventData.menu);
    renderEventDetails(currentEventData);
  } catch (err) {
    console.error("Failed to load event data:", err);
    els.menuContent.innerHTML = '<p class="menu-error">Couldn\'t load the menu right now. Please refresh.</p>';
    els.eventDate.textContent = "—";
  }
}

function setMessage(text, type) {
  els.message.textContent = text;
  els.message.className = `form-message ${type || ""}`.trim();
}

async function handleSubmit(evt) {
  evt.preventDefault();
  setMessage("", "");

  const formData = new FormData(els.form);
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim();

  if (!firstName || !lastName || !email) {
    setMessage("Please fill in all fields.", "error");
    return;
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    setMessage("Please enter a valid email address.", "error");
    return;
  }

  els.submitBtn.disabled = true;
  els.submitBtn.textContent = "Saving…";

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(eventRef);
      if (!snap.exists()) {
        throw new Error("NO_EVENT");
      }
      const data = snap.data();
      const capacity = Number(data.capacity) || 0;
      const signupCount = Number(data.signupCount) || 0;

      if (signupCount >= capacity) {
        throw new Error("FULL");
      }

      tx.update(eventRef, { signupCount: signupCount + 1 });

      const signupRef = doc(collection(db, "signups"));
      tx.set(signupRef, {
        firstName,
        lastName,
        email,
        eventId: ACTIVE_EVENT_ID,
        eventTitle: data.title || "",
        eventDateTime: data.dateTime || null,
        createdAt: serverTimestamp(),
      });

      currentEventData = { ...data, signupCount: signupCount + 1 };
    });

    els.form.reset();
    setMessage("You're in! See you there. 🍵", "success");
    renderEventDetails(currentEventData);
    if (Number(currentEventData.signupCount) < Number(currentEventData.capacity)) {
      els.submitBtn.disabled = false;
      els.submitBtn.textContent = "Save My Seat";
    }
  } catch (err) {
    if (err.message === "FULL") {
      setMessage("Sorry — this week just filled up!", "error");
      renderEventDetails(currentEventData || {});
    } else if (err.message === "NO_EVENT") {
      setMessage("This event isn't available anymore. Please check back soon.", "error");
    } else {
      console.error("Signup failed:", err);
      setMessage("Something went wrong. Please try again.", "error");
      els.submitBtn.disabled = false;
      els.submitBtn.textContent = "Save My Seat";
    }
  }
}

els.form.addEventListener("submit", handleSubmit);
loadEvent();
