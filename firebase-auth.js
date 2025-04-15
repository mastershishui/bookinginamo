// firebase-auth.js

// --- Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
// NEW: Import onAuthStateChanged and signOut
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged, // <-- NEW
    signOut             // <-- NEW
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
    // IMPORTANT: Make sure this apiKey is correct and complete!
    apiKey: "AIzaSyAp19_1RwloTbJLZ_K723-m8C2zka8Oh10",
    authDomain: "gjsbooking-faba9.firebaseapp.com",
    projectId: "gjsbooking-faba9",
    // MODIFIED: Use the default storage bucket name convention
    storageBucket: "gjsbooking-faba9.appspot.com",
    messagingSenderId: "708149149410",
    appId: "1:708149149410:web:dde6a5b99b4900dd8c28bb",
    measurementId: "G-5QB9413PJH" // Optional
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// const analytics = getAnalytics(app); // Optional - uncomment if you use it

// --- Global variables for UI elements ---
// NEW: Declare variables for elements we'll manipulate often
let loginLink = null;
let registerLink = null;
let loginModal = null;
let registerModal = null;
let loginMessage = null;
let registerMessage = null;
let loginLinkLi = null;
let registerLinkLi = null;
let userAccountLi = null;
let logoutLink = null;
let myBookLink = null;
let dashboardWelcomeMessage = null;

// --- Helper Function to Close Modals ---
// MODIFIED: Moved this function definition higher up
function closeAllModals() {
    if (registerModal) registerModal.style.display = "none";
    if (loginModal) loginModal.style.display = "none";
    // Clear messages when closing modals
    // Check if message elements exist before trying to clear them
    const currentLoginMessage = document.querySelector('#loginModal .login-message');
    const currentRegisterMessage = document.querySelector('#registerModal .registration-message');
    if (currentLoginMessage) currentLoginMessage.textContent = '';
    if (currentRegisterMessage) currentRegisterMessage.textContent = '';
}

// --- NEW: Helper Function to Update Navigation UI ---
function updateNavUI(user) {
    // Ensure elements are selected (they should be selected in DOMContentLoaded)
    if (!loginLinkLi) loginLinkLi = document.getElementById('nav-login-link-li');
    if (!registerLinkLi) registerLinkLi = document.getElementById('nav-register-link-li');
    if (!userAccountLi) userAccountLi = document.getElementById('nav-user-account-li');
    if (!logoutLink) logoutLink = document.getElementById('logout-link');
    if (!myBookLink) myBookLink = document.getElementById('nav-mybook-link-li');

    if (user) {
        // User is logged in
        if (loginLinkLi) loginLinkLi.style.display = 'none';
        if (registerLinkLi) registerLinkLi.style.display = 'none';
        if (userAccountLi) userAccountLi.style.display = 'block'; // Or 'list-item' or flex etc depending on CSS
        if (myBookLink) myBookLink.style.display = 'block'; // Or 'list-item' etc.

        // Setup logout link functionality ONLY if the link exists and listener not yet attached
        if (logoutLink && !logoutLink.dataset.listenerAttached) {
            logoutLink.addEventListener('click', handleLogout);
            logoutLink.dataset.listenerAttached = 'true'; // Mark as attached
        }

        // Setup user icon dropdown toggle ONLY if the element exists and listener not yet attached
        const userIcon = userAccountLi ? userAccountLi.querySelector('.user-icon') : null;
        if (userIcon && !userIcon.dataset.listenerAttached) {
            userIcon.addEventListener('click', (e) => {
                e.preventDefault();
                userAccountLi.classList.toggle('active');
            });
            // Close dropdown if clicking outside (add this listener only once)
            document.addEventListener('click', (e) => {
                if (userAccountLi && !userAccountLi.contains(e.target)) {
                    userAccountLi.classList.remove('active');
                }
            }, { once: true }); // Attach document click listener carefully, maybe only once per page load needed
            userIcon.dataset.listenerAttached = 'true'; // Mark as attached
        }

    } else {
        // User is logged out
        if (loginLinkLi) loginLinkLi.style.display = 'block'; // Or 'list-item' etc.
        if (registerLinkLi) registerLinkLi.style.display = 'block'; // Or 'list-item' etc.
        if (userAccountLi) userAccountLi.style.display = 'none';
        if (myBookLink) myBookLink.style.display = 'none';
    }
}

// --- NEW: Helper Function to Protect Routes ---
function protectRoute(user) {
    const protectedPages = ['/dashboard.html', '/profile.html', '/mybook.html']; // Add sensitive pages
    // Ensure pathname comparison is robust (handles cases with/without trailing slash etc.)
    const currentPagePath = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
    const isProtected = protectedPages.some(page => currentPagePath.endsWith(page.endsWith('/') ? page : page + '/'));


    if (!user && isProtected) {
        console.log("User not logged in. Redirecting from protected route:", window.location.pathname);
        window.location.href = '/index.html'; // Redirect to home
    }
}

// --- NEW: Update Dashboard Welcome Message ---
async function updateDashboardWelcome(user) {
    if (!dashboardWelcomeMessage) {
        dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message');
    }
    if (dashboardWelcomeMessage && user) {
        // Set a default message quickly
        dashboardWelcomeMessage.textContent = `Welcome! Fetching name...`;
        try {
            const userDocRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                const name = userData.firstname || userData.username || user.email; // Prioritize firstname
                dashboardWelcomeMessage.textContent = `Welcome, ${name}!`;
            } else {
                 console.warn("User document not found in Firestore for welcome message.");
                dashboardWelcomeMessage.textContent = `Welcome!`; // Fallback if no doc
            }
        } catch (error) {
            console.error("Error fetching user data for welcome message:", error);
            dashboardWelcomeMessage.textContent = `Welcome!`; // Fallback on error
        }
    }
}


// --- NEW: Firebase Logout Function ---
async function handleLogout(event) {
    event.preventDefault();
    console.log("Logging out...");
    try {
        await signOut(auth);
        console.log("User signed out successfully.");
        // UI update will be handled by onAuthStateChanged firing
        // Redirect to homepage is often desired after logout
        window.location.href = '/index.html';
    } catch (error) {
        console.error("Logout Error:", error);
        alert("Failed to log out. Please try again.");
    }
}

// --- Wait for the DOM to be fully loaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed"); // Log that DOM is ready

    // --- Select ALL Elements Needed Across Functions ---
    // MODIFIED: Select elements here and assign to global vars
    loginLink = document.getElementById('loginLink');
    registerLink = document.getElementById('registerLink');
    loginModal = document.getElementById('loginModal');
    registerModal = document.getElementById('registerModal');
    loginLinkLi = document.getElementById('nav-login-link-li');
    registerLinkLi = document.getElementById('nav-register-link-li');
    userAccountLi = document.getElementById('nav-user-account-li');
    logoutLink = document.getElementById('logout-link');
    myBookLink = document.getElementById('nav-mybook-link-li');
    dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message'); // Will be null if not on dashboard

    // --- Setup Modal Listeners ---
    // Keep the exact logic that was working for you before
    const loginCloseButton = loginModal ? loginModal.querySelector('.login-close-button') : null;
    const registerCloseButton = registerModal ? registerModal.querySelector('.register-close-button') : null;
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');

    if (loginLink && registerLink && loginModal && registerModal && loginCloseButton && registerCloseButton && switchToRegister && switchToLogin) {
        console.log("Modal elements found. Attaching modal listeners..."); // Debug log
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Login link clicked"); // Debug log
            closeAllModals();
            loginModal.style.display = 'block';
        });
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Register link clicked"); // Debug log
            closeAllModals();
            registerModal.style.display = 'block';
        });
        loginCloseButton.addEventListener('click', closeAllModals);
        registerCloseButton.addEventListener('click', closeAllModals);
        window.addEventListener('click', (event) => { if (event.target === loginModal || event.target === registerModal) { closeAllModals(); } });
        switchToRegister.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); registerModal.style.display = 'block'; });
        switchToLogin.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });
    } else {
        console.warn("Modal Warning: Not all elements needed for modal interactions were found. Check IDs.");
        // Log details
        if (!loginLink) console.warn("- Missing: loginLink (<a> tag with id='loginLink')");
        if (!registerLink) console.warn("- Missing: registerLink (<a> tag with id='registerLink')");
        // Add more checks if needed
    }

    // --- Firebase Registration Logic ---
    const registrationForm = document.getElementById('registrationForm');
    const emailInput = document.getElementById('reg-email');
    const passwordInput = document.getElementById('reg-password');
    const confirmPasswordInput = document.getElementById('reg-confirm-password');
    const usernameInput = document.getElementById('reg-username');
    const firstnameInput = document.getElementById('reg-firstname');
    const lastnameInput = document.getElementById('reg-lastname');
    const contactInput = document.getElementById('reg-contact');
    const genderInputs = document.getElementsByName('gender');
    const registerButton = registrationForm ? registrationForm.querySelector('button[type="submit"]') : null;
    registerMessage = document.createElement('p'); // Assign to global var

    if (registrationForm && registerButton) {
        registerMessage.classList.add('registration-message'); // Use the global var
        registerMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
        registerButton.parentNode.insertBefore(registerMessage, registerButton.nextSibling);
        registrationForm.addEventListener('submit', (event) => {
            event.preventDefault();
            // ... (rest of validation logic from your code)
             if (password.length < 8) { /* ... */ return; }
             if (password !== confirmPassword) { /* ... */ return; }
             if (!emailInput?.value /* ... */) { /* ... */ return; }

            registerButton.disabled = true;
            registerMessage.textContent = "Registering...";
            registerMessage.style.color = "blue";
            const selectedGender = [...genderInputs].find(input => input.checked)?.value || "";

            registerUser(emailInput.value, password, usernameInput.value, firstnameInput.value, lastnameInput.value, contactInput.value, selectedGender);
        });
    } // No need for console.error here if form doesn't exist on page

    // --- Firebase Login Logic ---
    const loginForm = document.getElementById('loginForm');
    const loginEmailInput = document.getElementById('login-email') || document.getElementById('login-email-user');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
    loginMessage = document.createElement('p'); // Assign to global var

    if (loginForm && loginButton && loginEmailInput) {
        loginMessage.classList.add('login-message'); // Use the global var
        loginMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
        loginButton.parentNode.insertBefore(loginMessage, loginButton.nextSibling);
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            // ... (rest of login submit logic from your code)
            loginButton.disabled = true;
            loginMessage.textContent = "Logging in...";
            loginMessage.style.color = "blue";
            loginUser(loginEmailInput.value, loginPasswordInput.value);
        });
    } // No need for console.error here if form doesn't exist on page

    // --- NEW: Setup Auth State Observer ---
    console.log("Setting up Firebase Auth state observer...");
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed! User:", user ? user.uid : 'None');
        updateNavUI(user);    // Update navigation links/menus
        protectRoute(user);   // Redirect if on protected page while logged out

        // If on dashboard page and logged in, update welcome message
        if (window.location.pathname.includes('dashboard.html') && user) {
            updateDashboardWelcome(user);
        }
    });

}); // End of DOMContentLoaded listener


// --- Registration Function ---
async function registerUser(email, password, username, firstname, lastname, contact, gender) {
    // Use the globally selected message element
    const currentRegisterMessage = document.querySelector('#registerModal .registration-message');
    const registerButton = document.querySelector('#registrationForm button[type="submit"]');

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Auth success. UID:", user.uid);
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { email, username, firstname, lastname, contact, gender, createdAt: new Date(), isAdmin: false });
        console.log("Firestore save success.");
        if (currentRegisterMessage) {
             currentRegisterMessage.textContent = "Registration successful!";
             currentRegisterMessage.style.color = "green";
        }
        // MODIFIED: Close modal after success
        setTimeout(closeAllModals, 1500);
    } catch (error) {
        console.error("Registration error:", error);
        let errorMessage = "Registration failed.";
        if (error.code === 'auth/email-already-in-use') errorMessage = "Email already in use.";
        else if (error.code === 'auth/invalid-email') errorMessage = "Invalid email.";
        else if (error.code === 'auth/weak-password') errorMessage = "Password needs 6+ characters.";
        if (currentRegisterMessage) {
            currentRegisterMessage.textContent = errorMessage;
            currentRegisterMessage.style.color = "red";
        }
    } finally {
         if (registerButton) registerButton.disabled = false;
     }
}

// --- Login Function ---
async function loginUser(email, password) { // Renamed param for clarity
    // Use the globally selected message element
    const currentLoginMessage = document.querySelector('#loginModal .login-message');
    const loginButton = document.querySelector('#loginForm button[type="submit"]');

    if (!email || !password) {
        if (currentLoginMessage) {
            currentLoginMessage.textContent = "Please enter email and password.";
            currentLoginMessage.style.color = "red";
        }
        if (loginButton) loginButton.disabled = false;
        return;
    }

    try {
        // Note: We still assume the input 'email' is actually an email here.
        // Username login requires an extra step not implemented here.
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // const user = userCredential.user; // No need to use user var here directly
        console.log("Login form success. UID:", userCredential.user.uid);

        // MODIFIED: Don't check admin or redirect here. onAuthStateChanged handles UI/redirects.
        if (currentLoginMessage) {
            currentLoginMessage.textContent = "Login successful!";
            currentLoginMessage.style.color = "green";
        }
        // MODIFIED: Close modal after success instead of redirecting
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
