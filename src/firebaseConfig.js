import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCAkn8JxrTEyJ_fgA8VVbbheTMPm4lCjH4",
  authDomain: "carbot-5d709.firebaseapp.com",
  projectId: "carbot-5d709",
  storageBucket: "carbot-5d709.firebasestorage.app",
  messagingSenderId: "497790785110",
  appId: "1:497790785110:web:09a07aeba43b9505794df7",
  measurementId: "G-WPR5MC5J0L"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Exportar herramientas para usar en la App
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;