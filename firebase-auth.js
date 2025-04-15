// firebase-auth.js

// --- Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged, // Manages auth state changes
    signOut          // For logging out
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
    apiKey: "AIzaSyAp19_1RwloTbJLZ_K723-m8C2zka8Oh10", // IMPORTANT: Replace with your actual API key
    authDomain: "gjsbooking-faba9.firebaseapp.com",
    projectId: "gjsbooking-faba9",
    storageBucket: "gjsbooking-faba9.appspot.com",
    messagingSenderId: "708149149410",
    appId: "1:708149149410:web:dde6a5b99b4900dd8c28bb",
    measurementId: "G-5QB9413PJH" // Optional
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// const analytics = getAnalytics(app); // Optional

// --- Global variables for UI elements ---
let loginLink = null;
let registerLink = null;
let loginModal = null;
let registerModal = null;
let loginMessage = null;
let registerMessage = null;
let loginLinkLi = null;
let registerLinkLi = null;
let myBookLinkLi = null;
let profileLinkLi = null;
let logoutLinkLi = null;
let logoutLink = null;
let dashboardWelcomeMessage = null;

// --- Global variable for login status --- // <-- NEW
let isUserLoggedIn = false; // <-- NEW: Track login state

// --- Helper Function to Close Modals ---
function closeAllModals() {
    if (registerModal) registerModal.style.display = "none";
    if (loginModal) loginModal.style.display = "none";
    const currentLoginMessage = document.querySelector('#loginModal .login-message');
    const currentRegisterMessage = document.querySelector('#registerModal .registration-message');
    if (currentLoginMessage) currentLoginMessage.textContent = '';
    if (currentRegisterMessage) currentRegisterMessage.textContent = '';
}

// --- Helper Function to Update Navigation UI ---
function updateNavUI(user) {
    // Ensure elements are selected
    if (!loginLinkLi) loginLinkLi = document.getElementById('nav-login-link-li');
    if (!registerLinkLi) registerLinkLi = document.getElementById('nav-register-link-li');
    if (!myBookLinkLi) myBookLinkLi = document.getElementById('nav-mybook-link-li');
    if (!profileLinkLi) profileLinkLi = document.getElementById('nav-profile-link-li');
    if (!logoutLinkLi) logoutLinkLi = document.getElementById('nav-logout-link-li');
    if (!logoutLink) logoutLink = document.getElementById('logout-link');

    if (user) {
        // --- User is Logged In ---
        if (loginLinkLi) loginLinkLi.style.display = 'none';
        if (registerLinkLi) registerLinkLi.style.display = 'none';
        // Use 'list-item' for proper layout in a <ul>
        if (myBookLinkLi) myBookLinkLi.style.display = 'list-item'; // Changed to list-item
        if (profileLinkLi) profileLinkLi.style.display = 'list-item'; // Changed to list-item
        if (logoutLinkLi) logoutLinkLi.style.display = 'list-item'; // Changed to list-item

        // Setup logout link functionality
        if (logoutLink && !logoutLink.dataset.listenerAttached) {
            logoutLink.addEventListener('click', handleLogout);
            logoutLink.dataset.listenerAttached = 'true';
        }

    } else {
        // --- User is Logged Out ---
        // Use 'list-item' for proper layout in a <ul>
        if (loginLinkLi) loginLinkLi.style.display = 'list-item'; // Changed to list-item
        if (registerLinkLi) registerLinkLi.style.display = 'list-item'; // Changed to list-item
        if (myBookLinkLi) myBookLinkLi.style.display = 'none';
        if (profileLinkLi) profileLinkLi.style.display = 'none';
        if (logoutLinkLi) logoutLinkLi.style.display = 'none';
    }

    // --- **BOOKING COUNTER INTEGRATION** --- // <-- ADDED THIS SECTION
    // Call the counter update function from booking.js AFTER updating link visibility.
    // Make sure booking.js is loaded and window.updateBookingCounterGlobal exists.
    if (typeof window.updateBookingCounterGlobal === 'function') {
        console.log("Calling updateBookingCounterGlobal..."); // Debug log
        window.updateBookingCounterGlobal();
    } else {
        // This might happen if booking.js hasn't loaded yet or has an error
        console.warn("updateBookingCounterGlobal function not found. Booking counter won't update automatically on auth change.");
    }
    // --- **END BOOKING COUNTER INTEGRATION** ---
}


// --- Helper Function to Protect Routes ---
function protectRoute(user) {
    const protectedPages = ['/dashboard.html', '/profile.html', '/mybook.html'];
    // Make path matching more robust
    const currentPagePath = window.location.pathname;
    const isProtected = protectedPages.some(page => currentPagePath.includes(page));


    if (!user && isProtected) {
        console.log("User not logged in. Redirecting from protected route:", currentPagePath);
        // Redirect to the root index.html - adjust if your structure differs
        window.location.href = '/index.html';
    }
}

// --- Update Dashboard Welcome Message ---
async function updateDashboardWelcome(user) {
    if (!dashboardWelcomeMessage) {
        dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message');
    }
    if (dashboardWelcomeMessage && user) {
        dashboardWelcomeMessage.textContent = `Welcome! Fetching name...`;
        try {
            const userDocRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                const name = userData.firstname || userData.username || user.email;
                dashboardWelcomeMessage.textContent = `Welcome, ${name}!`;
            } else {
                console.warn("User document not found in Firestore for welcome message.");
                dashboardWelcomeMessage.textContent = `Welcome!`;
            }
        } catch (error) {
            console.error("Error fetching user data for welcome message:", error);
            dashboardWelcomeMessage.textContent = `Welcome!`;
        }
    }
}


// --- Firebase Logout Function ---
async function handleLogout(event) {
    event.preventDefault();
    console.log("Logging out...");
    try {
        await signOut(auth);
        console.log("User signed out successfully.");
        // UI update is handled by onAuthStateChanged
        // Redirect to the root index.html - adjust if your structure differs
        window.location.href = '/index.html';
    } catch (error) {
        console.error("Logout Error:", error);
        alert("Failed to log out. Please try again.");
    }
}

// --- Wait for the DOM to be fully loaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // --- Select ALL Elements Needed Across Functions ---
    loginLink = document.getElementById('loginLink');
    registerLink = document.getElementById('registerLink');
    loginModal = document.getElementById('loginModal');
    registerModal = document.getElementById('registerModal');
    loginLinkLi = document.getElementById('nav-login-link-li');
    registerLinkLi = document.getElementById('nav-register-link-li');
    myBookLinkLi = document.getElementById('nav-mybook-link-li');
    profileLinkLi = document.getElementById('nav-profile-link-li');
    logoutLinkLi = document.getElementById('nav-logout-link-li');
    logoutLink = document.getElementById('logout-link');
    dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message');

    // --- Setup Modal Listeners ---
    const loginCloseButton = loginModal ? loginModal.querySelector('.login-close-button') : null;
    const registerCloseButton = registerModal ? registerModal.querySelector('.register-close-button') : null;
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');

    if (loginLink && registerLink && loginModal && registerModal && loginCloseButton && registerCloseButton && switchToRegister && switchToLogin) {
        console.log("Modal elements found. Attaching modal listeners...");
        loginLink.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });
        registerLink.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); registerModal.style.display = 'block'; });
        loginCloseButton.addEventListener('click', closeAllModals);
        registerCloseButton.addEventListener('click', closeAllModals);
        window.addEventListener('click', (event) => { if (event.target === loginModal || event.target === registerModal) { closeAllModals(); } });
        switchToRegister.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); registerModal.style.display = 'block'; });
        switchToLogin.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });
    } else {
        console.warn("Modal Warning: Not all elements needed for modal interactions were found. Check IDs.");
    }

    // --- Firebase Registration Logic ---
    const registrationForm = document.getElementById('registrationForm');
    const registerButton = registrationForm ? registrationForm.querySelector('button[type="submit"]') : null;
    registerMessage = document.createElement('p'); // Initialize here

    if (registrationForm && registerButton) {
        registerMessage.classList.add('registration-message');
        registerMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
        // Ensure message element exists before inserting
        if (!document.querySelector('#registerModal .registration-message')) {
             registerButton.parentNode.insertBefore(registerMessage, registerButton.nextSibling);
        } else {
            // If it somehow already exists (e.g., static HTML), reassign variable
            registerMessage = document.querySelector('#registerModal .registration-message');
        }

        registrationForm.addEventListener('submit', (event) => {
             event.preventDefault();
             const email = document.getElementById('reg-email')?.value;
             const password = document.getElementById('reg-password')?.value;
             const confirmPassword = document.getElementById('reg-confirm-password')?.value;
             const username = document.getElementById('reg-username')?.value;
             const firstname = document.getElementById('reg-firstname')?.value;
             const lastname = document.getElementById('reg-lastname')?.value;
             const contact = document.getElementById('reg-contact')?.value;
             const genderInputs = document.getElementsByName('gender');
             const selectedGender = [...genderInputs].find(input => input.checked)?.value || "";

             if (!email || !password || !confirmPassword || !username || !firstname || !lastname || !contact || !selectedGender) {
                 registerMessage.textContent = "Please fill in all fields.";
                 registerMessage.style.color = "red";
                 return;
             }
             if (password.length < 8) { // Assuming 8 is your minimum
                 registerMessage.textContent = "Password must be at least 8 characters long.";
                 registerMessage.style.color = "red";
                 return;
             }
             if (password !== confirmPassword) {
                 registerMessage.textContent = "Passwords do not match.";
                 registerMessage.style.color = "red";
                 return;
             }

             registerButton.disabled = true;
             registerMessage.textContent = "Registering...";
             registerMessage.style.color = "blue";

             registerUser(email, password, username, firstname, lastname, contact, selectedGender);
         });
    } else {
        console.warn("Registration form or button not found.");
    }

    // --- Firebase Login Logic ---
    const loginForm = document.getElementById('loginForm');
    const loginEmailInput = document.getElementById('login-email-user'); // Use the correct ID from your HTML
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
    loginMessage = document.createElement('p'); // Initialize here

    if (loginForm && loginButton && loginEmailInput && loginPasswordInput) {
        loginMessage.classList.add('login-message');
        loginMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
         // Ensure message element exists before inserting
         if (!document.querySelector('#loginModal .login-message')) {
            loginButton.parentNode.insertBefore(loginMessage, loginButton.nextSibling);
        } else {
            loginMessage = document.querySelector('#loginModal .login-message');
        }

        loginForm.addEventListener('submit', (event) => {
             event.preventDefault();
             const email = loginEmailInput.value; // Use the correct input variable
             const password = loginPasswordInput.value;

             if (!email || !password) {
                 loginMessage.textContent = "Please enter email/username and password.";
                 loginMessage.style.color = "red";
                 return;
             }

             loginButton.disabled = true;
             loginMessage.textContent = "Logging in...";
             loginMessage.style.color = "blue";
             loginUser(email, password); // Pass email directly (Firebase handles email/username logic if configured, otherwise it assumes email)
         });
    } else {
         console.warn("Login form, button, email/user input, or password input not found.");
    }

    // --- Setup Auth State Observer ---
    console.log("Setting up Firebase Auth state observer...");
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed! User:", user ? user.uid : 'None');

        isUserLoggedIn = !!user; // <-- NEW: Update global login status flag

        updateNavUI(user);   // Call the updated function to show/hide correct links AND update counter
        protectRoute(user);   // Redirect if on protected page while logged out

        // Update dashboard welcome message if applicable
        if (window.location.pathname.includes('dashboard.html') && user) {
            updateDashboardWelcome(user);
        }
        // Add similar checks for profile page if needed
    });

}); // End of DOMContentLoaded listener


// --- Registration Function ---
async function registerUser(email, password, username, firstname, lastname, contact, gender) {
    const currentRegisterMessage = document.querySelector('#registerModal .registration-message');
    const registerButton = document.querySelector('#registrationForm button[type="submit"]');
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Auth success. UID:", user.uid);
        const userDocRef = doc(db, "users", user.uid);
        // Store all fields
        await setDoc(userDocRef, { email, username, firstname, lastname, contact, gender, createdAt: new Date(), isAdmin: false });
        console.log("Firestore save success.");
        if (currentRegisterMessage) {
            currentRegisterMessage.textContent = "Registration successful!";
            currentRegisterMessage.style.color = "green";
        }
        setTimeout(closeAllModals, 1500);
    } catch (error) {
        console.error("Registration error:", error);
        let errorMessage = "Registration failed.";
        if (error.code === 'auth/email-already-in-use') errorMessage = "Email already in use.";
        else if (error.code === 'auth/invalid-email') errorMessage = "Invalid email.";
        else if (error.code === 'auth/weak-password') errorMessage = "Password needs 8+ characters."; // Ensure this matches validation
        if (currentRegisterMessage) {
            currentRegisterMessage.textContent = errorMessage;
            currentRegisterMessage.style.color = "red";
        }
    } finally {
        if (registerButton) registerButton.disabled = false;
    }
}

// --- Login Function ---
async function loginUser(emailOrUsername, password) { // Parameter can be email or username, but Firebase signIn expects email by default
    const currentLoginMessage = document.querySelector('#loginModal .login-message');
    const loginButton = document.querySelector('#loginForm button[type="submit"]');

    // Firebase's signInWithEmailAndPassword expects an email.
    // If you allow username login, you'd typically need to first query Firestore
    // to find the email associated with the username, then sign in with that email.
    // For simplicity here, we assume the input is the email. Add username lookup if needed.
    const email = emailOrUsername; // Assuming input is email for now

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Login form success. UID:", userCredential.user.uid);

        if (currentLoginMessage) {
            currentLoginMessage.textContent = "Login successful!";
            currentLoginMessage.style.color = "green";
        }
        setTimeout(closeAllModals, 1500);

    } catch (error) {
        console.error("Login error:", error);
        let errorMessage = "Login failed.";
         if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') errorMessage = "Invalid email or password.";
         else if (error.code === 'auth/invalid-email') errorMessage = "Invalid email format.";
        if (currentLoginMessage) {
            currentLoginMessage.textContent = errorMessage;
            currentLoginMessage.style.color = "red";
        }
    } finally {
        if (loginButton) loginButton.disabled = false;
    }
}

// --- Function for booking.js to check login status --- // <-- NEW
function checkUserLoginStatus() {
    // console.log("Checking login status:", isUserLoggedIn); // Optional debug log
    return isUserLoggedIn;
}
window.checkUserLoginStatus = checkUserLoginStatus; // Make it globally accessible
// --- End of new function ---
