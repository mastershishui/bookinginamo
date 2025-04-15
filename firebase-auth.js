// firebase-auth.js

// --- Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged, // Manages auth state changes
    signOut           // For logging out
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
    apiKey: "YOUR_API_KEY", // Replace with your actual API key if needed
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
// MODIFIED: Updated variable list for new nav structure
let loginLink = null;
let registerLink = null;
let loginModal = null;
let registerModal = null;
let loginMessage = null;
let registerMessage = null;
let loginLinkLi = null;         // <li> containing Login link
let registerLinkLi = null;      // <li> containing Register link
let myBookLinkLi = null;        // <li> containing My Book link (renamed for consistency)
let profileLinkLi = null;       // <li> containing My Profile link <-- NEW
let logoutLinkLi = null;        // <li> containing Logout link <-- NEW
let logoutLink = null;          // <a> tag for Logout <-- Still needed for event listener
let dashboardWelcomeMessage = null;

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
// MODIFIED: Updated to handle the new nav structure
function updateNavUI(user) {
    // Ensure elements are selected (they should be selected in DOMContentLoaded)
    // These checks are fallback, ideally they are assigned in DOMContentLoaded
    if (!loginLinkLi) loginLinkLi = document.getElementById('nav-login-link-li');
    if (!registerLinkLi) registerLinkLi = document.getElementById('nav-register-link-li');
    if (!myBookLinkLi) myBookLinkLi = document.getElementById('nav-mybook-link-li'); // Corrected variable name
    if (!profileLinkLi) profileLinkLi = document.getElementById('nav-profile-link-li'); // NEW
    if (!logoutLinkLi) logoutLinkLi = document.getElementById('nav-logout-link-li'); // NEW
    if (!logoutLink) logoutLink = document.getElementById('logout-link'); // Still need the actual link for click event

    if (user) {
        // --- User is Logged In ---
        if (loginLinkLi) loginLinkLi.style.display = 'none';      // Hide Login
        if (registerLinkLi) registerLinkLi.style.display = 'none';  // Hide Register
        if (myBookLinkLi) myBookLinkLi.style.display = 'block';    // Show My Book (use 'list-item' or 'flex' if 'block' looks wrong)
        if (profileLinkLi) profileLinkLi.style.display = 'block';   // Show My Profile (use 'list-item' or 'flex' etc.) <-- NEW
        if (logoutLinkLi) logoutLinkLi.style.display = 'block';    // Show Logout (use 'list-item' or 'flex' etc.) <-- NEW

        // Setup logout link functionality ONLY if the link exists and listener not yet attached
        // This targets the <a id="logout-link"> inside the new nav-logout-link-li
        if (logoutLink && !logoutLink.dataset.listenerAttached) {
            logoutLink.addEventListener('click', handleLogout);
            logoutLink.dataset.listenerAttached = 'true'; // Mark as attached
        }

        // REMOVED: User icon dropdown logic is no longer needed

    } else {
        // --- User is Logged Out ---
        if (loginLinkLi) loginLinkLi.style.display = 'block';      // Show Login (use 'list-item' or 'flex' etc.)
        if (registerLinkLi) registerLinkLi.style.display = 'block';  // Show Register (use 'list-item' or 'flex' etc.)
        if (myBookLinkLi) myBookLinkLi.style.display = 'none';      // Hide My Book
        if (profileLinkLi) profileLinkLi.style.display = 'none';    // Hide My Profile <-- NEW
        if (logoutLinkLi) logoutLinkLi.style.display = 'none';     // Hide Logout <-- NEW

        // No need to explicitly remove logout listener here,
        // it's on an element that gets hidden. If logoutLink is re-found later,
        // the listenerAttached flag prevents re-adding.
    }
}

// --- Helper Function to Protect Routes ---
function protectRoute(user) {
    const protectedPages = ['/dashboard.html', '/profile.html', '/mybook.html']; // Add sensitive pages
    const currentPagePath = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
    const isProtected = protectedPages.some(page => currentPagePath.endsWith(page.endsWith('/') ? page : page + '/'));

    if (!user && isProtected) {
        console.log("User not logged in. Redirecting from protected route:", window.location.pathname);
        window.location.href = '/index.html'; // Redirect to home
    }
}

// --- Update Dashboard Welcome Message ---
async function updateDashboardWelcome(user) {
    // This function remains the same, no changes needed here
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
    // This function remains the same, no changes needed here
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
    // MODIFIED: Select new nav elements, remove old one
    loginLink = document.getElementById('loginLink');
    registerLink = document.getElementById('registerLink');
    loginModal = document.getElementById('loginModal');
    registerModal = document.getElementById('registerModal');
    loginLinkLi = document.getElementById('nav-login-link-li');
    registerLinkLi = document.getElementById('nav-register-link-li');
    myBookLinkLi = document.getElementById('nav-mybook-link-li'); // Corrected variable name assignment
    profileLinkLi = document.getElementById('nav-profile-link-li'); // <-- NEW
    logoutLinkLi = document.getElementById('nav-logout-link-li'); // <-- NEW
    logoutLink = document.getElementById('logout-link'); // Keep selecting the actual link
    // userAccountLi = document.getElementById('nav-user-account-li'); // <-- REMOVED
    dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message'); // Will be null if not on dashboard

    // --- Setup Modal Listeners ---
    // This section remains the same, handles login/register modals
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
    // This section remains the same, handles registration form
    const registrationForm = document.getElementById('registrationForm');
    const emailInput = document.getElementById('reg-email');
    // ... other registration inputs ...
    const registerButton = registrationForm ? registrationForm.querySelector('button[type="submit"]') : null;
    registerMessage = document.createElement('p');

    if (registrationForm && registerButton) {
        // ... (rest of registration form setup remains the same) ...
        registerMessage.classList.add('registration-message');
        registerMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
        registerButton.parentNode.insertBefore(registerMessage, registerButton.nextSibling);
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

              // Basic validation (add more as needed)
             if (!email || !password || !confirmPassword || !username || !firstname || !lastname || !contact || !selectedGender) {
                 registerMessage.textContent = "Please fill in all fields.";
                 registerMessage.style.color = "red";
                 return;
             }
              if (password.length < 8) {
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
    }

    // --- Firebase Login Logic ---
    // This section remains the same, handles login form
    const loginForm = document.getElementById('loginForm');
    const loginEmailInput = document.getElementById('login-email') || document.getElementById('login-email-user');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
    loginMessage = document.createElement('p');

    if (loginForm && loginButton && loginEmailInput && loginPasswordInput) {
        // ... (rest of login form setup remains the same) ...
        loginMessage.classList.add('login-message');
        loginMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
        loginButton.parentNode.insertBefore(loginMessage, loginButton.nextSibling);
        loginForm.addEventListener('submit', (event) => {
             event.preventDefault();
             const email = loginEmailInput.value;
             const password = loginPasswordInput.value;

             if (!email || !password) {
                 loginMessage.textContent = "Please enter email and password.";
                 loginMessage.style.color = "red";
                 return;
             }

             loginButton.disabled = true;
             loginMessage.textContent = "Logging in...";
             loginMessage.style.color = "blue";
             loginUser(email, password);
        });
    }

    // --- Setup Auth State Observer ---
    // This is the core part that reacts to login/logout
    console.log("Setting up Firebase Auth state observer...");
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed! User:", user ? user.uid : 'None');
        updateNavUI(user);    // Call the updated function to show/hide correct links
        protectRoute(user);   // Redirect if on protected page while logged out

        // Update dashboard welcome message if applicable
        if (window.location.pathname.includes('dashboard.html') && user) {
            updateDashboardWelcome(user);
        }
        // Add similar checks for profile page if needed
        // if (window.location.pathname.includes('profile.html') && user) {
        //     // e.g., loadProfileData(user);
        // }
    });

}); // End of DOMContentLoaded listener


// --- Registration Function ---
// This function remains the same
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
        setTimeout(closeAllModals, 1500); // Close modal on success
    } catch (error) {
        console.error("Registration error:", error);
        let errorMessage = "Registration failed.";
        // ... (error handling remains the same) ...
        if (error.code === 'auth/email-already-in-use') errorMessage = "Email already in use.";
        else if (error.code === 'auth/invalid-email') errorMessage = "Invalid email.";
        else if (error.code === 'auth/weak-password') errorMessage = "Password needs 8+ characters."; // Adjusted to 8 as per validation
        if (currentRegisterMessage) {
            currentRegisterMessage.textContent = errorMessage;
            currentRegisterMessage.style.color = "red";
        }
    } finally {
        if (registerButton) registerButton.disabled = false;
    }
}

// --- Login Function ---
// This function remains the same
async function loginUser(email, password) {
    const currentLoginMessage = document.querySelector('#loginModal .login-message');
    const loginButton = document.querySelector('#loginForm button[type="submit"]');
    // Validation moved to the submit event listener

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Login form success. UID:", userCredential.user.uid);

        if (currentLoginMessage) {
            currentLoginMessage.textContent = "Login successful!";
            currentLoginMessage.style.color = "green";
        }
        setTimeout(closeAllModals, 1500); // Close modal on success

    } catch (error) {
        console.error("Login error:", error);
        let errorMessage = "Login failed.";
        // ... (error handling remains the same) ...
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
