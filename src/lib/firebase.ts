import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDvu2aZGXRIhSD_Q_vSHci0ed31Kaq78ug",
  authDomain: "mri-pro-1c09a.firebaseapp.com",
  projectId: "mri-pro-1c09a",
  storageBucket: "mri-pro-1c09a.firebasestorage.app",
  messagingSenderId: "199520709880",
  appId: "1:199520709880:web:702c04e29ed578df989f0d",
  measurementId: "G-Q11JNTSKKR"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Authenticate anonymously (so we can restrict Firestore rules to auth != null)
if (typeof window !== 'undefined') {
  signInAnonymously(auth).catch(err => {
    console.error("Anonymous auth failed:", err);
  });
}

// Analytics (only supported in browser)
export let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
