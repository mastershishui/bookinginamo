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
    collection, // Needed for registerUser, but getDoc needed here
    doc,
    setDoc, // Needed for registerUser
    getDoc  // Needed for admin check and welcome message
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js"; // Optional

// --- Firebase Config ---
const firebaseConfig = {
    // IMPORTANT: Replace with your actual API key from Firebase Console!
    apiKey: "AIzaSyAp19_1RwloTbJLZ_K723-m8C2zka8Oh10", // <<< REPLACE THIS
    authDomain: "gjsbooking-faba9.firebaseapp.com",
    projectId: "gjsbooking-faba9",
    storageBucket: "gjsbooking-faba9.appspot.com",
    messagingSenderId: "708149149410",
    appId: "1:708149149410:web:dde6a5b99b4900dd8c28bb",
    measurementId: "G-5QB9413PJH" // Optional
};

// --- Initialize Firebase ---
// Ensure Firebase is initialized only once
let app, auth, db;
try {
    app = initializeApp(firebaseConfig); // Initialize default app
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully in firebase-auth.js");
} catch (e) {
     // Handle potential re-initialization errors if this script is loaded multiple times
     // This basic catch might not be sufficient in complex modular setups
     console.warn("Firebase initialization skipped or failed (might already be initialized):", e.message);
     // Attempt to get existing instances if initialization failed assuming it already exists
     if (!auth) auth = getAuth();
     if (!db) db = getFirestore();
}
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

// --- Global State Variables ---
let isUserLoggedIn = false;
let isAdminUser = false; // Cache for admin status
let authInitialized = false; // Flag to track if initial auth check is done
let authInitPromiseResolver; // To resolve the promise
const authInitPromise = new Promise(resolve => { authInitPromiseResolver = resolve; }); // Promise for other scripts to wait on
window.waitForAuthInit = authInitPromise; // Expose the promise globally


// --- Helper Function to Close Modals ---
function closeAllModals() {
    // Ensure modals exist before trying to hide
    const regModal = document.getElementById('registerModal');
    const logModal = document.getElementById('loginModal');
    if (regModal) regModal.style.display = "none";
    if (logModal) logModal.style.display = "none";

    // Clear messages safely
    const currentLoginMessage = logModal ? logModal.querySelector('.login-message') : null;
    const currentRegisterMessage = regModal ? regModal.querySelector('.registration-message') : null;
    if (currentLoginMessage) currentLoginMessage.textContent = '';
    if (currentRegisterMessage) currentRegisterMessage.textContent = '';
}
// Expose globally if booking.js needs it to open login modal
window.closeAllModals = closeAllModals;


// --- Helper Function to Update Navigation UI ---
// Handles visibility based on login status AND booking count
function updateNavUI(user) {
    // Ensure elements are selected
    if (!loginLinkLi) loginLinkLi = document.getElementById('nav-login-link-li');
    if (!registerLinkLi) registerLinkLi = document.getElementById('nav-register-link-li');
    if (!myBookLinkLi) myBookLinkLi = document.getElementById('nav-mybook-link-li');
    if (!profileLinkLi) profileLinkLi = document.getElementById('nav-profile-link-li');
    if (!logoutLinkLi) logoutLinkLi = document.getElementById('nav-logout-link-li');
    if (!logoutLink) logoutLink = document.getElementById('logout-link');

    // --- BOOKING COUNTER INTEGRATION (Get Count First) ---
    let bookingCount = 0;
    // Get the count AND update the counter span by calling the global function from booking.js
    if (typeof window.updateBookingCounterGlobal === 'function') {
        // Note: updateBookingCounterGlobal itself is now async, but we don't await it here.
        // We trigger the update, and it will update the span when the data is ready.
        // We get the *last known* or initial count if needed immediately.
        // For visibility logic below, we might need a synchronous way or accept slight delay.
        // Let's call it to trigger the update and proceed with visibility based on login state primarily.
        window.updateBookingCounterGlobal(); // Trigger the async update of the counter span

        // If we need the count *immediately* for logout logic, we might need a synchronous fallback:
        try {
             const bookingsJson = localStorage.getItem('gjsUserBookings'); // Check localStorage as fallback for immediate check
             const bookings = bookingsJson ? JSON.parse(bookingsJson) : [];
             bookingCount = bookings.length; // Use LS count for immediate visibility decision on logout
        } catch (e) { bookingCount = 0; } // Default to 0 if LS fails

    } else {
        console.warn("updateBookingCounterGlobal function not found in booking.js.");
         try { // Fallback to LS if function not found
             const bookingsJson = localStorage.getItem('gjsUserBookings');
             const bookings = bookingsJson ? JSON.parse(bookingsJson) : [];
             bookingCount = bookings.length;
         } catch (e) { bookingCount = 0; }
    }
    // --- END BOOKING COUNTER INTEGRATION ---


    if (user) {
        // --- User is Logged In ---
        if (loginLinkLi) loginLinkLi.style.display = 'none';
        if (registerLinkLi) registerLinkLi.style.display = 'none';

        // Show user-specific links - use 'list-item'
        if (profileLinkLi) profileLinkLi.style.display = 'list-item';
        if (logoutLinkLi) logoutLinkLi.style.display = 'list-item';

        // Always show "My Book" link when logged in
        if (myBookLinkLi) myBookLinkLi.style.display = 'list-item';

        // Setup logout link functionality
        if (logoutLink && !logoutLink.dataset.listenerAttached) {
            logoutLink.addEventListener('click', handleLogout);
            logoutLink.dataset.listenerAttached = 'true';
        }

    } else {
        // --- User is Logged Out ---
        // Show public links - use 'list-item'
        if (loginLinkLi) loginLinkLi.style.display = 'list-item';
        if (registerLinkLi) registerLinkLi.style.display = 'list-item';

        // Hide user-specific links
        if (profileLinkLi) profileLinkLi.style.display = 'none';
        if (logoutLinkLi) logoutLinkLi.style.display = 'none';

        // Show "My Book" link ONLY if the immediate check found bookings
        if (myBookLinkLi) {
            if (bookingCount > 0) { // Use the count obtained earlier
                myBookLinkLi.style.display = 'list-item';
            } else {
                myBookLinkLi.style.display = 'none';
            }
        }
    }
}


// --- MODIFIED Helper Function to Protect Routes (Async & Admin Check) ---
async function protectRoute(user) { // Make async
    const adminPages = ['/admin-bookings.html', '/admin-dashboard.html']; // Add all admin page paths
    const protectedUserPages = ['/profile.html', '/mybook.html']; // Regular protected pages
    const currentPagePath = window.location.pathname; // Get current path

    // Function to check if current path matches any in the list
    const isCurrentPage = (pages) => pages.some(page => currentPagePath.includes(page));

    const onAdminPage = isCurrentPage(adminPages);
    const onUserPage = isCurrentPage(protectedUserPages);

    if (!user) {
        // --- Logged Out ---
        if (onUserPage || onAdminPage) {
            console.log("User not logged in. Redirecting from protected route:", currentPagePath);
            window.location.href = '/index.html'; // Redirect to home or login
        }
    } else {
        // --- Logged In ---
        if (onAdminPage) {
            // Check if the logged-in user is an admin, fetch if not cached
            if (!isAdminUser) { // Check cache first only if already tried fetching
                try {
                    console.log("Checking Firestore for admin status...");
                    const userDocRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(userDocRef);
                    if (docSnap.exists() && docSnap.data().isAdmin === true) {
                        isAdminUser = true; // Cache positive result
                        console.log("Admin access confirmed via Firestore for:", user.uid);
                    } else {
                        isAdminUser = false; // Cache negative result
                        console.log("Admin access denied via Firestore for user:", user.uid);
                    }
                } catch (error) {
                    console.error("Error checking admin status during route protection:", error);
                    isAdminUser = false; // Deny access on error
                }
            } else {
                 console.log("Using cached admin status:", isAdminUser);
            }

            // Redirect if confirmed not an admin
            if (!isAdminUser) {
                console.log("Non-admin user confirmed. Redirecting from admin page.");
                alert("Access Denied. Administrator privileges required.");
                window.location.href = '/index.html'; // Redirect non-admins
            }
        }
        // No action needed for regular logged-in users on regular user pages or public pages
    }
}


// --- Update Dashboard Welcome Message ---
async function updateDashboardWelcome(user) {
    // Ensure element exists on the current page
    const welcomeEl = document.getElementById('dashboard-welcome-message');
    if (welcomeEl && user) {
        welcomeEl.textContent = `Welcome! Fetching name...`; // Use the specific element
        try {
            const userDocRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                const name = userData.firstname || userData.username || user.email; // Use available name fields
                welcomeEl.textContent = `Welcome, ${name}!`;
            } else {
                console.warn("User document not found in Firestore for welcome message.");
                welcomeEl.textContent = `Welcome!`;
            }
        } catch (error) {
            console.error("Error fetching user data for welcome message:", error);
            welcomeEl.textContent = `Welcome!`; // Display default on error
        }
    }
}


// --- Firebase Logout Function ---
async function handleLogout(event) {
    event.preventDefault();
    console.log("Logging out...");
    try {
        await signOut(auth);
        console.log("User signed out successfully via button.");
        // Clear admin status cache on logout
        isAdminUser = false;
        isUserLoggedIn = false;
        // Optional: Clear user-specific localStorage if needed
        // localStorage.removeItem('someUserSpecificData');
        // UI update is handled by onAuthStateChanged trigger
        window.location.href = '/index.html'; // Redirect after sign out
    } catch (error) {
        console.error("Logout Error:", error);
        alert("Failed to log out. Please try again.");
    }
}

// --- Wait for the DOM to be fully loaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed for firebase-auth.js");

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
    dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message'); // May be null

    // --- Setup Modal Listeners ---
    // Added checks to ensure elements exist before adding listeners
    const loginCloseButton = loginModal ? loginModal.querySelector('.login-close-button') : null;
    const registerCloseButton = registerModal ? registerModal.querySelector('.register-close-button') : null;
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');

    if (loginLink) {
         loginLink.addEventListener('click', (e) => {
             e.preventDefault();
             if (loginModal) { closeAllModals(); loginModal.style.display = 'block'; }
        });
    }
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (registerModal) { closeAllModals(); registerModal.style.display = 'block'; }
        });
    }
    if (loginCloseButton) loginCloseButton.addEventListener('click', closeAllModals);
    if (registerCloseButton) registerCloseButton.addEventListener('click', closeAllModals);
    window.addEventListener('click', (event) => {
        if (event.target === loginModal || event.target === registerModal) {
             closeAllModals();
        }
    });
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
             e.preventDefault();
             if (registerModal) { closeAllModals(); registerModal.style.display = 'block'; }
        });
    }
     if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginModal) { closeAllModals(); loginModal.style.display = 'block'; }
        });
    }

    // --- Firebase Registration Logic ---
    const registrationForm = document.getElementById('registrationForm');
    const registerButton = registrationForm ? registrationForm.querySelector('button[type="submit"]') : null;
    // Initialize message element safely
    registerMessage = registerModal ? registerModal.querySelector('.registration-message') : null;
    if (!registerMessage && registerButton) { // Create if doesn't exist and button does
        registerMessage = document.createElement('p');
        registerMessage.classList.add('registration-message');
        registerMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
        registerButton.parentNode.insertBefore(registerMessage, registerButton.nextSibling);
    }

    if (registrationForm && registerButton) {
        registrationForm.addEventListener('submit', (event) => {
            event.preventDefault();
            // Get form values safely
            const email = document.getElementById('reg-email')?.value;
            const password = document.getElementById('reg-password')?.value;
            const confirmPassword = document.getElementById('reg-confirm-password')?.value;
            const username = document.getElementById('reg-username')?.value;
            const firstname = document.getElementById('reg-firstname')?.value;
            const lastname = document.getElementById('reg-lastname')?.value;
            const contact = document.getElementById('reg-contact')?.value;
            const genderInputs = document.getElementsByName('gender');
            const selectedGender = [...genderInputs].find(input => input.checked)?.value || "";

            // Validation
            if (!email || !password || !confirmPassword || !username || !firstname || !lastname || !contact || !selectedGender) {
                if(registerMessage) { registerMessage.textContent = "Please fill in all fields."; registerMessage.style.color = "red";}
                return;
            }
            if (password.length < 8) { // Use consistent password length rule
                if(registerMessage) { registerMessage.textContent = "Password must be at least 8 characters long."; registerMessage.style.color = "red"; }
                return;
            }
            if (password !== confirmPassword) {
                if(registerMessage) { registerMessage.textContent = "Passwords do not match."; registerMessage.style.color = "red"; }
                return;
            }

            registerButton.disabled = true;
            if(registerMessage) { registerMessage.textContent = "Registering..."; registerMessage.style.color = "blue"; }

            registerUser(email, password, username, firstname, lastname, contact, selectedGender);
        });
    } else {
        // Only log warning if the form is expected on the current page
        // if (document.getElementById('registrationForm')) {
             console.warn("Registration form or button could not be fully initialized.");
        // }
    }

    // --- Firebase Login Logic ---
    const loginForm = document.getElementById('loginForm');
    const loginEmailInput = document.getElementById('login-email-user'); // Correct ID
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
    // Initialize message element safely
    loginMessage = loginModal ? loginModal.querySelector('.login-message') : null;
     if (!loginMessage && loginButton) { // Create if doesn't exist and button does
        loginMessage = document.createElement('p');
        loginMessage.classList.add('login-message');
        loginMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
        loginButton.parentNode.insertBefore(loginMessage, loginButton.nextSibling);
    }

    if (loginForm && loginButton && loginEmailInput && loginPasswordInput) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = loginEmailInput.value; // Use correct variable
            const password = loginPasswordInput.value;

            if (!email || !password) {
                 if(loginMessage) { loginMessage.textContent = "Please enter email/username and password."; loginMessage.style.color = "red"; }
                return;
            }

            loginButton.disabled = true;
            if(loginMessage) { loginMessage.textContent = "Logging in..."; loginMessage.style.color = "blue"; }
            loginUser(email, password);
        });
    } else {
        // Only log warning if the form is expected on the current page
        // if (document.getElementById('loginForm')) {
            console.warn("Login form or critical elements could not be fully initialized.");
        // }
    }

    // --- Setup Auth State Observer ---
    console.log("Setting up Firebase Auth state observer...");
    onAuthStateChanged(auth, async (user) => { // Make async
        console.log("Auth state changed! User:", user ? user.uid : 'None');
        isUserLoggedIn = !!user; // Update global login status flag
        isAdminUser = false; // Reset admin cache on any auth change, forces re-check if needed

        // --- Cache admin status immediately if user is logged in ---
        // This runs *before* protectRoute usually
        if (user) {
            try {
                const userDocRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists() && docSnap.data().isAdmin === true) {
                    isAdminUser = true; // Cache admin status
                    // console.log("Admin status cached as TRUE on auth change.");
                } else {
                     isAdminUser = false;
                     // console.log("Admin status cached as FALSE on auth change.");
                }
            } catch (error) {
                console.error("Error caching admin status on auth change:", error);
                isAdminUser = false; // Assume not admin if error occurs
            }
        }
        // --- End admin status caching ---

        // Protect route *before* updating UI that might depend on protection status
        await protectRoute(user);

        // Update navigation UI (now uses booking count for logout state)
        updateNavUI(user);

        // Update dashboard welcome message etc.
        if (window.location.pathname.includes('dashboard.html') && user) {
            updateDashboardWelcome(user);
        }

        // Resolve the auth initialization promise ONCE
         if (!authInitialized) {
             authInitialized = true;
             authInitPromiseResolver(); // Signal that auth state is known
             console.log("Firebase Auth state initialized and promise resolved.");
         }
    });

}); // End of DOMContentLoaded listener


// --- Registration Function ---
// Creates user in Auth and saves details (including isAdmin: false) to Firestore
async function registerUser(email, password, username, firstname, lastname, contact, gender) {
    const currentRegisterMessage = registerModal ? registerModal.querySelector('.registration-message') : null;
    const registerButton = registrationForm ? registrationForm.querySelector('button[type="submit"]') : null;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Auth registration success. UID:", user.uid);
        const userDocRef = doc(db, "users", user.uid);
        // Save user details to Firestore, explicitly setting isAdmin to false
        await setDoc(userDocRef, {
            email: email,
            username: username,
            firstname: firstname,
            lastname: lastname,
            contact: contact,
            gender: gender,
            createdAt: new Date().toISOString(), // Use ISO string for consistency
            isAdmin: false // Default new users are not admins
        });
        console.log("User details saved to Firestore.");
        if (currentRegisterMessage) {
            currentRegisterMessage.textContent = "Registration successful!";
            currentRegisterMessage.style.color = "green";
        }
        setTimeout(closeAllModals, 1500); // Close modal after success message
    } catch (error) {
        console.error("Registration error:", error.code, error.message);
        let errorMessage = "Registration failed. Please try again.";
        if (error.code === 'auth/email-already-in-use') errorMessage = "This email address is already registered.";
        else if (error.code === 'auth/invalid-email') errorMessage = "Please enter a valid email address.";
        else if (error.code === 'auth/weak-password') errorMessage = "Password must be at least 6 characters long."; // Firebase default is 6
        if (currentRegisterMessage) {
            currentRegisterMessage.textContent = errorMessage;
            currentRegisterMessage.style.color = "red";
        }
    } finally {
        if (registerButton) registerButton.disabled = false;
    }
}

// --- Login Function ---
// Signs user in via Firebase Auth
async function loginUser(email, password) {
    const currentLoginMessage = loginModal ? loginModal.querySelector('.login-message') : null;
    const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Login success. UID:", userCredential.user.uid);

        if (currentLoginMessage) {
            currentLoginMessage.textContent = "Login successful!";
            currentLoginMessage.style.color = "green";
        }
        // Let onAuthStateChanged handle UI updates and redirects based on admin status
        setTimeout(closeAllModals, 1000); // Close modal after slight delay

    } catch (error) {
        console.error("Login error:", error.code, error.message);
        let errorMessage = "Login failed. Please try again.";
         if (error.code === 'auth/user-not-found' ||
             error.code === 'auth/wrong-password' ||
             error.code === 'auth/invalid-credential' || // More recent error code
             error.code === 'auth/invalid-email') {
                errorMessage = "Invalid email or password.";
        }
        if (currentLoginMessage) {
            currentLoginMessage.textContent = errorMessage;
            currentLoginMessage.style.color = "red";
        }
    } finally {
        if (loginButton) loginButton.disabled = false;
    }
}


// --- Function for booking.js to check login status ---
function checkUserLoginStatus() {
    return isUserLoggedIn;
}
window.checkUserLoginStatus = checkUserLoginStatus; // Make it globally accessible

// --- Function to get current user ID (for booking.js / admin.js / mybook.js) ---
function getCurrentUserId() {
    return auth.currentUser ? auth.currentUser.uid : null;
}
window.getCurrentUserId = getCurrentUserId; // Make globally accessible

// --- Function to get current user email (for booking.js) ---
function getCurrentUserEmail() {
    return auth.currentUser ? auth.currentUser.email : null;
}
window.getCurrentUserEmail = getCurrentUserEmail; // Make globally accessible


// Make db and auth globally accessible (alternative to exports, use with caution)
// Consider using ES Module exports/imports for better dependency management if possible
window.db = db;
window.auth = auth;
