// firebase-auth.js - UPDATED for User Icon Dropdown Navigation

// --- Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
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
    apiKey: "AIzaSyAp19_1RwloTbJLZ_K723-m8C2zka8Oh10", // !!! Replace with your actual API Key !!!
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
// ***** UPDATED: Variables for new nav structure *****
let loginSignupLink = null; // Combined Login/Sign Up Link <a> tag
let loginSignupLi = null;   // Combined Login/Sign Up Link <li> tag
let loginModal = null;
let registerModal = null;
let loginMessage = null;
let registerMessage = null;
let myBookLinkLi = null;    // <li> containing My Book link
let userAccountLi = null;   // <li> containing user icon & dropdown <-- NEW
let logoutLink = null;      // <a> tag for Logout (now inside dropdown)
let dashboardWelcomeMessage = null;
let userAccountIcon = null; // The clickable user icon <a> tag <-- NEW
let userDropdown = null;    // The dropdown div itself <-- NEW

// --- Helper Function to Close Modals ---
function closeAllModals() {
    if (registerModal) registerModal.style.display = "none";
    if (loginModal) loginModal.style.display = "none";
    // Clear messages
    const currentLoginMessage = document.querySelector('#loginModal .login-message');
    const currentRegisterMessage = document.querySelector('#registerModal .registration-message');
    if (currentLoginMessage) currentLoginMessage.textContent = '';
    if (currentRegisterMessage) currentRegisterMessage.textContent = '';
}

// --- Helper Function to Update Navigation UI ---
// ***** UPDATED: Handles the new nav structure *****
function updateNavUI(user) {
    // Ensure elements are selected (they should be selected in DOMContentLoaded)
    // Add fallback selection just in case
    if (!loginSignupLi) loginSignupLi = document.getElementById('nav-login-signup-li');
    if (!myBookLinkLi) myBookLinkLi = document.getElementById('nav-mybook-link-li');
    if (!userAccountLi) userAccountLi = document.getElementById('nav-user-account-li'); // Get the new container
    if (!logoutLink) logoutLink = document.getElementById('logout-link'); // Still need the actual link for click event

    if (user) {
        // --- User is Logged In ---
        if (loginSignupLi) loginSignupLi.style.display = 'none';   // Hide Login/Sign Up
        if (myBookLinkLi) myBookLinkLi.style.display = 'block';    // Show My Book (adjust display type if needed)
        if (userAccountLi) userAccountLi.style.display = 'block';   // Show User Icon Dropdown Container

        // Ensure dropdown itself is closed initially on login/page load
        if (userAccountLi) userAccountLi.classList.remove('active');
        if (userAccountIcon) userAccountIcon.setAttribute('aria-expanded', 'false');

        // Setup logout link functionality if needed and not already attached
        if (logoutLink && !logoutLink.dataset.listenerAttached) {
            logoutLink.addEventListener('click', handleLogout);
            logoutLink.dataset.listenerAttached = 'true'; // Mark as attached
        }

    } else {
        // --- User is Logged Out ---
        if (loginSignupLi) loginSignupLi.style.display = 'block'; // Show Login/Sign Up
        if (myBookLinkLi) myBookLinkLi.style.display = 'none';   // Hide My Book
        if (userAccountLi) userAccountLi.style.display = 'none';    // Hide User Icon Dropdown Container

        // Optional: Remove listener if you strictly want it only when visible
        // if (logoutLink && logoutLink.dataset.listenerAttached) {
        //     logoutLink.removeEventListener('click', handleLogout);
        //     delete logoutLink.dataset.listenerAttached;
        // }
    }
}


// --- Helper Function to Protect Routes --- (No changes needed here)
function protectRoute(user) {
    const protectedPages = ['/dashboard.html', '/profile.html', '/mybook.html', '/admin-dashboard.html']; // Add sensitive pages
    const currentPagePath = window.location.pathname;
    // Simple check - might need refinement for complex paths or subdirectories
    const isProtected = protectedPages.some(page => currentPagePath.endsWith(page));

    if (!user && isProtected) {
        console.log("User not logged in. Redirecting from protected route:", window.location.pathname);
        window.location.href = '/index.html'; // Redirect to home
    }
}

// --- Update Dashboard Welcome Message --- (No changes needed here)
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


// --- Firebase Logout Function --- (No changes needed here)
async function handleLogout(event) {
    event.preventDefault();
    console.log("Logging out...");
    try {
        await signOut(auth);
        console.log("User signed out successfully.");
        // UI update is handled by onAuthStateChanged
        window.location.href = '/index.html'; // Redirect to homepage after logout
    } catch (error) {
        console.error("Logout Error:", error);
        alert("Failed to log out. Please try again.");
    }
}

// --- Wait for the DOM to be fully loaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // --- Select ALL Elements Needed Across Functions ---
    // ***** UPDATED: Select new nav elements *****
    loginSignupLink = document.getElementById('loginSignupLink');
    loginSignupLi = document.getElementById('nav-login-signup-li');
    loginModal = document.getElementById('loginModal');
    registerModal = document.getElementById('registerModal');
    myBookLinkLi = document.getElementById('nav-mybook-link-li');
    userAccountLi = document.getElementById('nav-user-account-li'); // <-- NEW
    logoutLink = document.getElementById('logout-link');
    dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message');
    userAccountIcon = document.getElementById('userAccountIcon'); // <-- NEW
    userDropdown = document.getElementById('userDropdown');       // <-- NEW

    // --- Setup Modal Listeners ---
    const loginCloseButton = loginModal ? loginModal.querySelector('.login-close-button') : null;
    const registerCloseButton = registerModal ? registerModal.querySelector('.register-close-button') : null;
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');

    // Setup listeners for login/register modals and combined link
    if (loginSignupLink && loginModal && registerModal && loginCloseButton && registerCloseButton && switchToRegister && switchToLogin) {
        console.log("Modal elements and Login/Sign Up link found. Attaching modal listeners...");
        loginSignupLink.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });
        loginCloseButton.addEventListener('click', closeAllModals);
        registerCloseButton.addEventListener('click', closeAllModals);
        window.addEventListener('click', (event) => { if (event.target === loginModal || event.target === registerModal) { closeAllModals(); } });
        switchToRegister.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); registerModal.style.display = 'block'; });
        switchToLogin.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });
    } else {
        console.warn("Modal Warning: Not all elements needed for modal interactions (including loginSignupLink) were found.");
    }

    // --- ** NEW: User Dropdown Toggle Logic ** ---
    if (userAccountIcon && userDropdown && userAccountLi) {
        userAccountIcon.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default link behavior '#'
            event.stopPropagation(); // Prevent click reaching document listener immediately
            const isActive = userAccountLi.classList.toggle('active'); // Toggle 'active' class on the LI
            userAccountIcon.setAttribute('aria-expanded', isActive); // Toggle accessibility state
        });

        // Close dropdown if clicking anywhere else on the page
        document.addEventListener('click', (event) => {
            if (!userAccountLi.contains(event.target) && userAccountLi.classList.contains('active')) {
                userAccountLi.classList.remove('active');
                userAccountIcon.setAttribute('aria-expanded', 'false');
            }
        });

        // Close dropdown if the Escape key is pressed
        window.addEventListener('keydown', (event) => {
             if (event.key === 'Escape' && userAccountLi.classList.contains('active')) {
                 userAccountLi.classList.remove('active');
                 userAccountIcon.setAttribute('aria-expanded', 'false');
             }
         });

    } else {
        console.warn("User account dropdown elements (#nav-user-account-li, #userAccountIcon, #userDropdown) not all found. Dropdown will not function.");
    }
    // --- ** END: User Dropdown Toggle Logic ** ---


    // --- Firebase Registration Logic --- (No changes needed)
    const registrationForm = document.getElementById('registrationForm');
    const registerButton = registrationForm ? registrationForm.querySelector('button[type="submit"]') : null;
    registerMessage = document.createElement('p');

    if (registrationForm && registerButton) {
        // (Keep registration form logic as is)
        registerMessage.classList.add('registration-message');
        registerMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
        if (!registrationForm.querySelector('.registration-message')) {
             registerButton.parentNode.insertBefore(registerMessage, registerButton.nextSibling);
        }
        registrationForm.addEventListener('submit', (event) => {
            event.preventDefault();
            // ... (get form values) ...
            const email = document.getElementById('reg-email')?.value;
            const password = document.getElementById('reg-password')?.value;
            const confirmPassword = document.getElementById('reg-confirm-password')?.value;
            const username = document.getElementById('reg-username')?.value;
            const firstname = document.getElementById('reg-firstname')?.value;
            const lastname = document.getElementById('reg-lastname')?.value;
            const contact = document.getElementById('reg-contact')?.value;
            const genderInputs = document.getElementsByName('gender');
            const selectedGender = [...genderInputs].find(input => input.checked)?.value || "";
            const currentRegisterMessage = registrationForm.querySelector('.registration-message');

            // ... (validations) ...
            if (!email || !password || !confirmPassword || !username || !firstname || !lastname || !contact || !selectedGender) {
                if (currentRegisterMessage) { currentRegisterMessage.textContent = "Please fill in all fields."; currentRegisterMessage.style.color = "red"; } return;
            }
            if (password.length < 8) {
                if (currentRegisterMessage) { currentRegisterMessage.textContent = "Password must be at least 8 characters long."; currentRegisterMessage.style.color = "red"; } return;
            }
            if (password !== confirmPassword) {
                if (currentRegisterMessage) { currentRegisterMessage.textContent = "Passwords do not match."; currentRegisterMessage.style.color = "red"; } return;
            }


            registerButton.disabled = true;
            if (currentRegisterMessage) { currentRegisterMessage.textContent = "Registering..."; currentRegisterMessage.style.color = "blue"; }

            registerUser(email, password, username, firstname, lastname, contact, selectedGender);
        });
    }

    // --- Firebase Login Logic --- (No changes needed)
    const loginForm = document.getElementById('loginForm');
    const loginEmailInput = document.getElementById('login-email-user') || document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
    loginMessage = document.createElement('p');

    if (loginForm && loginButton && loginEmailInput && loginPasswordInput) {
        // (Keep login form logic as is)
        loginMessage.classList.add('login-message');
        loginMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
        if (!loginForm.querySelector('.login-message')) {
             loginButton.parentNode.insertBefore(loginMessage, loginButton.nextSibling);
        }
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;
            const currentLoginMessage = loginForm.querySelector('.login-message');

            if (!email || !password) {
                if (currentLoginMessage) { currentLoginMessage.textContent = "Please enter email/username and password."; currentLoginMessage.style.color = "red"; } return;
            }

            loginButton.disabled = true;
            if (currentLoginMessage) { currentLoginMessage.textContent = "Logging in..."; currentLoginMessage.style.color = "blue"; }

            loginUser(email, password);
        });
    }

    // --- Setup Auth State Observer ---
    // This will run initially and whenever the user logs in or out
    console.log("Setting up Firebase Auth state observer...");
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed! User:", user ? user.uid : 'None');
        updateNavUI(user); // Update nav based on logged in status
        protectRoute(user); // Protect pages if user is logged out

        // Update dashboard welcome message if on dashboard page and logged in
        if (window.location.pathname.includes('dashboard.html') && user) {
            updateDashboardWelcome(user);
        }
         // Update admin dashboard welcome message if applicable
         if (window.location.pathname.includes('admin-dashboard.html') && user) {
             updateDashboardWelcome(user); // Example: reuse if structure is similar
         }
        // Add other page-specific updates here if needed
    });

}); // End of DOMContentLoaded listener


// --- Registration Function --- (No changes needed)
async function registerUser(email, password, username, firstname, lastname, contact, gender) {
    const currentRegisterMessage = document.querySelector('#registerModal .registration-message');
    const registerButton = document.querySelector('#registrationForm button[type="submit"]');
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
            email, username, firstname, lastname, contact, gender,
            createdAt: new Date().toISOString(), isAdmin: false // Ensure isAdmin is false
        });
        if (currentRegisterMessage) { currentRegisterMessage.textContent = "Registration successful!"; currentRegisterMessage.style.color = "green"; }
        setTimeout(closeAllModals, 1500);
    } catch (error) {
        console.error("Registration error:", error);
        let errorMessage = "Registration failed.";
        if (error.code === 'auth/email-already-in-use') errorMessage = "Email already in use.";
        else if (error.code === 'auth/invalid-email') errorMessage = "Invalid email format.";
        else if (error.code === 'auth/weak-password') errorMessage = "Password needs 8+ characters.";
        if (currentRegisterMessage) { currentRegisterMessage.textContent = errorMessage; currentRegisterMessage.style.color = "red"; }
    } finally {
        if (registerButton) registerButton.disabled = false;
    }
}


// --- Login Function --- (No changes needed)
async function loginUser(email, password) {
    const currentLoginMessage = document.querySelector('#loginModal .login-message');
    const loginButton = document.querySelector('#loginForm button[type="submit"]');
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDocRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data().isAdmin === true) {
                console.log("Admin user detected. Redirecting to admin dashboard.");
                if (currentLoginMessage) { currentLoginMessage.textContent = "Admin login successful! Redirecting..."; currentLoginMessage.style.color = "green"; }
                setTimeout(() => { closeAllModals(); window.location.href = 'admin-dashboard.html'; }, 1000);
            } else {
                console.log("Regular user detected. Redirecting to dashboard.");
                 if (currentLoginMessage) { currentLoginMessage.textContent = "Login successful! Redirecting..."; currentLoginMessage.style.color = "green"; }
                setTimeout(() => { closeAllModals(); window.location.href = 'dashboard.html'; }, 1000);
            }
        } catch (error) {
            console.error("Error fetching user data for admin check:", error);
            if (currentLoginMessage) { currentLoginMessage.textContent = "Login successful, but couldn't verify role. Redirecting."; currentLoginMessage.style.color = "orange"; }
            if (loginButton) loginButton.disabled = false;
            setTimeout(() => { closeAllModals(); window.location.href = 'index.html'; }, 1500);
        }
    } catch (error) {
        console.error("Login Auth error:", error);
        let errorMessage = "Login failed.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = "Invalid email/username or password.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email format.";
        }
        if (currentLoginMessage) { currentLoginMessage.textContent = errorMessage; currentLoginMessage.style.color = "red"; }
        if (loginButton) loginButton.disabled = false;
    }
}

// --- Optional: Add Exports if needed ---
// export { auth, db, app };
