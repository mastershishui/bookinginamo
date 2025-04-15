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
    // IMPORTANT: Replace with your actual API key from Firebase Console!
    apiKey: "AIzaSyAp19_1RwloTbJLZ_K723-m8C2zka8Oh10", // Double-check this key is correct and complete.
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

// --- Global variable for login status --- // <-- ADDED
let isUserLoggedIn = false;

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

// --- Helper Function to Update Navigation UI ---
// --- MODIFIED to handle My Book visibility on logout ---
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
        bookingCount = window.updateBookingCounterGlobal(); // This updates the span and returns the count
        // console.log("Booking count from updateBookingCounterGlobal:", bookingCount); // Debug log
    } else {
        // Attempt to calculate count directly from localStorage as a fallback (less ideal)
        try {
             const bookingsJson = localStorage.getItem('gjsUserBookings');
             const bookings = bookingsJson ? JSON.parse(bookingsJson) : [];
             bookingCount = bookings.length;
             console.warn("updateBookingCounterGlobal function not found. Calculated count from localStorage as fallback:", bookingCount);
        } catch (e) {
            console.error("Error reading booking count from localStorage fallback:", e);
            bookingCount = 0; // Assume zero if fallback fails
        }
        // NOTE: Counter span itself won't be updated if the function is missing
    }
    // --- END BOOKING COUNTER INTEGRATION ---


    if (user) {
        // --- User is Logged In ---
        if (loginLinkLi) loginLinkLi.style.display = 'none';
        if (registerLinkLi) registerLinkLi.style.display = 'none';

        // Show user-specific links - use 'list-item' for proper layout
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

        // --- MODIFIED My Book Visibility on Logout ---
        // Show "My Book" link ONLY if there were bookings found (count > 0)
        if (myBookLinkLi) {
            if (bookingCount > 0) {
                myBookLinkLi.style.display = 'list-item'; // Show link if bookings exist
                // console.log("Showing My Book link on logout (bookings found)");
            } else {
                myBookLinkLi.style.display = 'none';      // Hide link if no bookings
                // console.log("Hiding My Book link on logout (no bookings found)");
            }
        }
        // --- End MODIFIED Section ---
    }
}


// --- Helper Function to Protect Routes ---
function protectRoute(user) {
    const protectedPages = ['/dashboard.html', '/profile.html', '/mybook.html']; // Add sensitive pages
    // Improved path matching
    const currentPagePath = window.location.pathname;
    const isProtected = protectedPages.some(page => currentPagePath.includes(page));


    if (!user && isProtected) {
        console.log("User not logged in. Redirecting from protected route:", currentPagePath);
        window.location.href = '/index.html'; // Redirect to home or login page
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
        // UI update is handled by onAuthStateChanged trigger
        // Redirect AFTER sign out completes
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
    // (Ensure modal elements exist before adding listeners)
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
    // Initialize message element (check if it exists before creating)
    registerMessage = document.querySelector('#registerModal .registration-message');
    if (!registerMessage && registerButton) {
        registerMessage = document.createElement('p');
        registerMessage.classList.add('registration-message');
        registerMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
        registerButton.parentNode.insertBefore(registerMessage, registerButton.nextSibling);
    } else if (!registerMessage && registrationForm) {
         // Fallback if button not found but form exists
         registerMessage = document.createElement('p');
         registerMessage.classList.add('registration-message');
         registrationForm.appendChild(registerMessage); // Append at end
    }


    if (registrationForm && registerButton) {
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
                if(registerMessage) { registerMessage.textContent = "Please fill in all fields."; registerMessage.style.color = "red";}
                return;
            }
            if (password.length < 8) { // Match validation with backend/Firebase rules
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
        console.warn("Registration form or button not found.");
    }

    // --- Firebase Login Logic ---
    const loginForm = document.getElementById('loginForm');
    const loginEmailInput = document.getElementById('login-email-user'); // Use the correct ID
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
    // Initialize message element
    loginMessage = document.querySelector('#loginModal .login-message');
     if (!loginMessage && loginButton) {
        loginMessage = document.createElement('p');
        loginMessage.classList.add('login-message');
        loginMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
        loginButton.parentNode.insertBefore(loginMessage, loginButton.nextSibling);
    } else if (!loginMessage && loginForm) {
         loginMessage = document.createElement('p');
         loginMessage.classList.add('login-message');
         loginForm.appendChild(loginMessage);
    }

    if (loginForm && loginButton && loginEmailInput && loginPasswordInput) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = loginEmailInput.value;
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
         console.warn("Login form or critical elements not found.");
    }

    // --- Setup Auth State Observer ---
    console.log("Setting up Firebase Auth state observer...");
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed! User:", user ? user.uid : 'None');

        isUserLoggedIn = !!user; // <-- ADDED: Update global login status flag

        updateNavUI(user);   // Call the updated function to show/hide correct links AND update counter
        protectRoute(user);   // Redirect if on protected page while logged out

        // Update dashboard welcome message if applicable
        if (window.location.pathname.includes('dashboard.html') && user) {
            updateDashboardWelcome(user);
        }
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
        else if (error.code === 'auth/weak-password') errorMessage = "Password needs 8+ characters.";
        if (currentRegisterMessage) {
            currentRegisterMessage.textContent = errorMessage;
            currentRegisterMessage.style.color = "red";
        }
    } finally {
        if (registerButton) registerButton.disabled = false;
    }
}

// --- Login Function ---
async function loginUser(email, password) { // Assuming email is passed, add username lookup if needed
    const currentLoginMessage = document.querySelector('#loginModal .login-message');
    const loginButton = document.querySelector('#loginForm button[type="submit"]');
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


// --- Function for booking.js to check login status --- // <-- ADDED
function checkUserLoginStatus() {
    // console.log("Checking login status:", isUserLoggedIn); // Optional debug log
    return isUserLoggedIn;
}
window.checkUserLoginStatus = checkUserLoginStatus; // Make it globally accessible
// --- End of new function ---

// --- Function to get current user ID (for booking.js / future Firestore use) --- // <-- ADDED
function getCurrentUserId() {
    return auth.currentUser ? auth.currentUser.uid : null;
}
window.getCurrentUserId = getCurrentUserId; // Make globally accessible
// --- End of new function ---
