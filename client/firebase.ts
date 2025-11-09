// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBXIwZtbJwfTVWrXB3VAGNMakcb4ayfWRk",
    authDomain: "general-2ed6c.firebaseapp.com",
    projectId: "general-2ed6c",
    storageBucket: "general-2ed6c.appspot.com",
    messagingSenderId: "435839427932",
    appId: "1:435839427932:web:a0129a5f945d87cdc98d99",
    measurementId: "G-0HK7RN392Z"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;

export const initFirebase = () => {
  return app;
};