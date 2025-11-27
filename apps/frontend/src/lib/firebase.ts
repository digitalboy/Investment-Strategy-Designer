import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBNubXGVv6aHykbdFsB4kR0BNDZkoyCewI",
    authDomain: "beike-e6301.firebaseapp.com",
    databaseURL: "https://beike-e6301-default-rtdb.firebaseio.com",
    projectId: "beike-e6301",
    storageBucket: "beike-e6301.firebasestorage.app",
    messagingSenderId: "889627047453",
    appId: "1:889627047453:web:f4f27acf754f8cff05b8f4",
    measurementId: "G-B92HLJ8J15"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider, analytics };
