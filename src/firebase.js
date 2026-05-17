import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDKqrV1hNWjsT8QVhMlbSB73Ql_0ItTRIE",
  authDomain: "goal-portal-a49b9.firebaseapp.com",
  projectId: "goal-portal-a49b9",
  storageBucket: "goal-portal-a49b9.firebasestorage.app",
  messagingSenderId: "58516867776",
  appId: "1:58516867776:web:b218bb142d34917d553b25"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); 
