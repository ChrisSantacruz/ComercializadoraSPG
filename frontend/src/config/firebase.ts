// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, UserCredential } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC8fYI5D-X28u-tnjY3XkHlcj_RdKSUW7I",
  authDomain: "andinoexpress-5fa41.firebaseapp.com",
  projectId: "andinoexpress-5fa41",
  storageBucket: "andinoexpress-5fa41.firebasestorage.app",
  messagingSenderId: "1008893784088",
  appId: "1:1008893784088:web:49358b7cc85d586c49d36d",
  measurementId: "G-YBTHGZZB1H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Configure providers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Auth functions
export const signInWithGoogle = async (): Promise<UserCredential> => {
  return await signInWithPopup(auth, googleProvider);
};

export { auth, analytics, googleProvider };
export default app;
