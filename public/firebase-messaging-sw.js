importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAc-dFc73nap2Jgn6nk6kgIKl79JAzuTq0",
  authDomain: "agent-app-35634.firebaseapp.com",
  databaseURL: "https://agent-app-35634-default-rtdb.firebaseio.com",
  projectId: "agent-app-35634",
  storageBucket: "agent-app-35634.appspot.com",
  messagingSenderId: "620541880901",
  appId: "1:620541880901:web:076e9c26c55d42a153512c",
  measurementId: "G-2PMBW9EYWM"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received: ', payload);
  const notificationTitle = payload.notification?.title || 'Ubuntium Dispatch';
  const notificationOptions = {
    body: payload.notification?.body || 'Protocol data received.',
    icon: '/logo.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});