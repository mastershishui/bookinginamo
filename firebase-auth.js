// firebase-auth.js

// --- Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged, // <-- Import this
    signOut             // <-- Import this
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js"; // Optional

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // Replace with your actual key if hidden earlier
    authDomain: "gjsbooking-faba9.firebaseapp.com",
    projectId: "gjsbooking-faba9",
    storageBucket: "gjsbooking-faba9.appspot.com", // Use default bucket domain
    messagingSenderId: "708149149410",
    appId: "1:708149149410:web:dde6a5b99b4900dd8c28bb",
    measurementId: "G-5QB9413PJH" // Optional
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// const analytics = getAnalytics(app); // Optional

// --- Global variables for UI elements (to avoid repeated selections) ---
let loginLinkLi = null;
let registerLinkLi = null;
let userAccountLi = null;
let logoutLink = null;
let dashboardWelcomeMessage = null;
let myBookLink = null; // <-- Added for My Book link

// --- Helper Function to Update UI ---
function updateNavUI(user) {
    // Select elements once if not already selected
    if (!loginLinkLi) loginLinkLi = document.getElementById('nav-login-link-li');
    if (!registerLinkLi) registerLinkLi = document.getElementById('nav-register-link-li');
    if (!userAccountLi) userAccountLi = document.getElementById('nav-user-account-li');
    if (!logoutLink) logoutLink = document.getElementById('logout-link');
    if (!myBookLink) myBookLink = document.getElementById('nav-mybook-link-li'); // <-- Select My Book li

    if (user) {
        // User is logged in
        if (loginLinkLi) loginLinkLi.style.display = 'none';
        if (registerLinkLi) registerLinkLi.style.display = 'none';
        if (userAccountLi) userAccountLi.style.display = 'block'; // Or 'list-item' etc.
        if (myBookLink) myBookLink.style.display = 'block'; // <-- Show My Book link

        // Setup logout link functionality (if it exists on the page)
        if (logoutLink && !logoutLink.dataset.listenerAttached) {
             logoutLink.addEventListener('click', handleLogout);
             logoutLink.dataset.listenerAttached = 'true'; // Prevent adding multiple listeners
        }

        // --- Dropdown Toggle Logic (moved here) ---
        const userIcon = userAccountLi ? userAccountLi.querySelector('.user-icon') : null;
        if (userIcon && !userIcon.dataset.listenerAttached) {
            userIcon.addEventListener('click', (e) => {
                e.preventDefault();
                userAccountLi.classList.toggle('active');
            });
             // Close dropdown if clicking outside
             document.addEventListener('click', (e) => {
                if (userAccountLi && !userAccountLi.contains(e.target)) {
                    userAccountLi.classList.remove('active');
                }
            });
            userIcon.dataset.listenerAttached = 'true'; // Prevent adding multiple listeners
        }

    } else {
        // User is logged out
        if (loginLinkLi) loginLinkLi.style.display = 'block'; // Or 'list-item' etc.
        if (registerLinkLi) registerLinkLi.style.display = 'block'; // Or 'list-item' etc.
        if (userAccountLi) userAccountLi.style.display = 'none';
         if (myBookLink) myBookLink.style.display = 'none'; // <-- Hide My Book link
    }
}

// --- Helper Function to Protect Routes ---
function protectRoute(user) {
    const protectedPages = ['/dashboard.html', '/profile.html', '/mybook.html']; // Add pages that require login
    const currentPage = window.location.pathname;

    if (!user && protectedPages.some(page => currentPage.endsWith(page))) {
        console.log("User not logged in. Redirecting from protected route:", currentPage);
        // Redirect to homepage or login page
        window.location.href = '/index.html'; // Adjust if your homepage is different
    }
}

// --- Update Dashboard Welcome Message ---
 async function updateDashboardWelcome(user) {
    if (!dashboardWelcomeMessage) {
        dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message');
    }
    if (dashboardWelcomeMessage && user) {
        try {
             // Fetch user's first name from Firestore
             const userDocRef = doc(db, "users", user.uid);
             const docSnap = await getDoc(userDocRef);
             if (docSnap.exists()) {
                 const userData = docSnap.data();
                 // Use firstname if available, otherwise fallback to email/username
                 const name = userData.firstname || userData.username || user.email;
                 dashboardWelcomeMessage.textContent = `Welcome, ${name}!`;
             } else {
                 dashboardWelcomeMessage.textContent = `Welcome!`; // Fallback
             }
        } catch (error) {
             console.error("Error fetching user data for welcome message:", error);
             dashboardWelcomeMessage.textContent = `Welcome!`; // Fallback on error
        }
    }
}


// --- Firebase Logout Function ---
async function handleLogout(event) {
    event.preventDefault(); // Prevent link navigation
    console.log("Logging out...");
    try {
        await signOut(auth);
        console.log("User signed out successfully.");
        // The onAuthStateChanged listener will automatically update the UI
        // and redirect if necessary. Optionally, redirect immediately:
        window.location.href = '/index.html'; // Redirect to homepage after logout
    } catch (error) {
        console.error("Logout Error:", error);
        alert("Failed to log out. Please try again.");
    }
}


// --- DOMContentLoaded Listener (runs when HTML is ready) ---
document.addEventListener('DOMContentLoaded', () => {

    // --- Get references to Nav elements (important to do this *inside* DOMContentLoaded) ---
    loginLinkLi = document.getElementById('nav-login-link-li');
    registerLinkLi = document.getElementById('nav-register-link-li');
    userAccountLi = document.getElementById('nav-user-account-li');
    logoutLink = document.getElementById('logout-link');
    myBookLink = document.getElementById('nav-mybook-link-li'); // <-- Get My Book li
    dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message'); // For dashboard page

    // --- Setup Auth State Observer ---
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed. User:", user ? user.uid : 'None');
        updateNavUI(user); // Update navigation based on user state
        protectRoute(user); // Check if the current route needs protection

        // If on dashboard, update welcome message
         if (window.location.pathname.endsWith('/dashboard.html') && user) {
            updateDashboardWelcome(user);
        }

        // If modals exist on the page, ensure they are closed if user state changes somehow
        // (This might be redundant if they are closed on successful login/reg anyway)
        // closeAllModals(); // You might not need this here
    });


    // --- Existing Login/Registration Form Logic (keep as is) ---
    const registrationForm = document.getElementById('registrationForm');
    // ... (rest of your registration variables and event listener) ...
    async function registerUser(email, password, username, firstname, lastname, contact, gender) {
       // ... (your existing registerUser code) ...
       // Make sure to close modal on success
        setTimeout(closeAllModals, 1500); // Example
    }

    const loginForm = document.getElementById('loginForm');
    // ... (rest of your login variables and event listener) ...
     async function loginUser(emailOrUsername, password) {
         // ... (your existing loginUser code, BUT remove the redirect from here) ...
        // The redirect is handled by onAuthStateChanged now or implicitly by UI update

         // --- MODIFICATION inside loginUser's try block on success ---
         try {
             const userCredential = await signInWithEmailAndPassword(auth, email, password);
             const user = userCredential.user;
             console.log("Login success via form. UID:", user.uid);
             // DON'T redirect here anymore. onAuthStateChanged will handle UI update.
             loginMessage.textContent = "Login successful!"; // Just show message
             loginMessage.style.color = "green";
             // Optional: Close the modal after a short delay
             setTimeout(closeAllModals, 1500); // Close modal

         } catch (error) {
            // ... (existing error handling) ...
         } finally {
             if (loginButton) loginButton.disabled = false;
         }
         // --- End of modification ---
    }

    // --- Modal Handling Logic (keep as is) ---
    const loginModal = document.getElementById('loginModal');
    // ... (rest of your modal variables and functions like closeAllModals) ...
    function closeAllModals() {
        // ... (your existing closeAllModals code) ...
    }
    // ... (rest of your modal event listeners) ...

}); // End of DOMContentLoaded listener

// Make closeAllModals globally accessible if needed by inline JS, though better not to
// window.closeAllModals = closeAllModals;
