
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC7Pt1hH2AZTPmNW3XGLpgJWa4US0P3RoE",
  authDomain: "taskswave.firebaseapp.com",
  projectId: "taskswave",
  storageBucket: "taskswave.firebasestorage.app",
  messagingSenderId: "91401216844",
  appId: "1:91401216844:web:257dcd0daa86fa6306e5e9",
  measurementId: "G-8R3HV9YQTL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Services (Global variables)
const auth = firebase.auth();
const db = firebase.firestore();

