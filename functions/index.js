
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

exports.sendChatNotification = functions.firestore
  .document("conversations/{convoId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const convoId = context.params.convoId;

    // Get the conversation document
    const convoRef = db.collection("conversations").doc(convoId);
    const convoDoc = await convoRef.get();
    if (!convoDoc.exists) {
      console.log("Conversation doc not found:", convoId);
      return null;
    }
    const conversation = convoDoc.data();

    // Get sender ID
    const senderId = message.senderId;

    // Get recipient IDs
    const recipientIds = conversation.members.filter((id) => id !== senderId);
    if (recipientIds.length === 0) {
      console.log("No recipients to send notification to.");
      return null;
    }

    // Get recipient tokens
    const tokens = [];
    const userDocs = await db.collection("users").where(admin.firestore.FieldPath.documentId(), 'in', recipientIds).get();
    
    userDocs.forEach(doc => {
      const userData = doc.data();
      if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
        tokens.push(...userData.fcmTokens);
      }
    });

    if (tokens.length === 0) {
      console.log("No FCM tokens found for any recipient.");
      return null;
    }

    // Notification payload
    const payload = {
      notification: {
        title: message.senderName,
        body: message.text.substring(0, 100), // Truncate message for notification
      },
      data: {
        convoId: convoId,
        // This allows the client to navigate to the correct chat on notification click
      },
    };

    try {
      // Send notification
      const response = await admin.messaging().sendToDevice(tokens, payload);
      console.log("Successfully sent notification for message:", context.params.messageId);

      // --- Optional: Clean up invalid tokens ---
      const tokensToRemove = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          console.error("Failure sending notification to", tokens[index], error);
          if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
          ) {
            // This token is invalid and should be removed from the user's document
            // For simplicity, this part is omitted but would be a good addition for production.
          }
        }
      });
      // --- End of optional cleanup ---

      return response;
    } catch (error) {
      console.error("Error sending message:", error);
      return null;
    }
  });