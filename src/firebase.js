// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCZ9N2eT2AxA-T4MSCr_caOB5ueay2TSrE",
    authDomain: "admissionportal-d8d91.firebaseapp.com",
    projectId: "admissionportal-d8d91",
    storageBucket: "admissionportal-d8d91.appspot.com",
    messagingSenderId: "84767685388",
    appId: "1:84767685388:web:967d302f8b9f465dc26729",
    measurementId: "G-3E33GRV0SH"
};

// Initialize Firebase
let app;
let auth;
let db;

try {
    console.log('Initializing Firebase...');
    app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized successfully');

    console.log('Initializing Firebase Auth...');
    auth = getAuth(app);
    console.log('Firebase Auth initialized successfully');

    console.log('Initializing Firestore...');
    db = getFirestore(app);
    console.log('Firestore initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase:', error);
    throw new Error('Failed to initialize Firebase: ' + error.message);
}

// Export the Firebase instances
export { auth, db };
export default app;