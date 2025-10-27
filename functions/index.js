
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

// Note: Cloud Functions for creating notifications and activity items have been removed.
// This logic has been centralized in the client-side `apiService.ts` to prevent
// duplicate entries and improve consistency, especially with offline-first support.
// The client-side service now reliably creates these documents when an action (e.g., approve member, create post)
// is performed.
