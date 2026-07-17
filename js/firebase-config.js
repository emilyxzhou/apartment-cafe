// ---------------------------------------------------------------------------
// Firebase project configuration
// ---------------------------------------------------------------------------
// Replace the placeholder values below with the config object from your own
// Firebase project. You'll find it in the Firebase Console under:
//   Project settings (gear icon) → General → "Your apps" → Web app → SDK setup
//
// This config is safe to commit/expose publicly — it identifies your project
// but does not grant access on its own. Access is controlled by the rules in
// firestore.rules. See README.md for full setup instructions.
// ---------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// The Firestore document ID of the event that should currently be shown on
// the site. Update this each week when you create a new event document
// (see README.md → "Weekly update workflow").
export const ACTIVE_EVENT_ID = "current-event";
