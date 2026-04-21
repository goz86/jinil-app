import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDIzwbjeKw7zKM7u6SmAfCdwWJO1UOar9g",
    authDomain: "gozkr-6d7ac.firebaseapp.com",
    projectId: "gozkr-6d7ac",
    storageBucket: "gozkr-6d7ac.firebasestorage.app",
    messagingSenderId: "212959567719",
    appId: "1:212959567719:web:b8366eb7b17b209d61d9c2",
    measurementId: "G-V3Y8VGPNFH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// Initialize Firestore with ONLY memory cache to fix the persistent Assertion Failures (Internal SDK bugs)
export const db = initializeFirestore(app, {
    localCache: memoryLocalCache()
});

export const storage = getStorage(app);
