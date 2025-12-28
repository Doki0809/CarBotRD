// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCAkn8JxrTEyJ_fgA8VVbbheTMPm4lCjH4",
  authDomain: "carbot-5d709.firebaseapp.com",
  projectId: "carbot-5d709",
  storageBucket: "carbot-5d709.firebasestorage.app",
  messagingSenderId: "497790785110",
  appId: "1:497790785110:web:09a07aeba43b9505794df7",
  measurementId: "G-WPR5MC5J0L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
