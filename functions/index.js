const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Cloud functions for signup have been removed as per user request to simplify the authentication flow
// and move all logic to the client-side.
// Other cloud functions can be added here in the future.
