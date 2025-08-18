import { getFirestore, collection, addDoc } from "firebase/firestore"; 
import { getApp, initializeApp } from "firebase/app";

// إعدادات Firebase الخاصة بك
const firebaseConfig = {
  apiKey: "AIzaSyBrXrf_tHxB7tg1ScmrhYIphP0I2p7BLlc",
  authDomain: "rock-paper-scissors-xo-game.firebaseapp.com",
  projectId: "rock-paper-scissors-xo-game",
  storageBucket: "rock-paper-scissors-xo-game.appspot.com",
  messagingSenderId: "252348182097",
  appId: "1:252348182097:web:f974d2e23d5b4377cd9270",
  measurementId: "G-VLJBYZZ2BR"
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);

// تهيئة Firestore
const db = getFirestore(app);
