import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyDxRxmUKiySbnbcabgUDHq91haFTuZUuj8",
  authDomain: "alwazer-557ac.firebaseapp.com",
  projectId: "alwazer-557ac",
  storageBucket: "alwazer-557ac.firebasestorage.app",
  messagingSenderId: "774761575724",
  appId: "1:774761575724:web:3da3724ed3e8b9e2606889",
  measurementId: "G-T4ZT8N5XN8",
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
