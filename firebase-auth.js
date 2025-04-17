// firebase-auth.js - UPDATED for User Icon Dropdown Navigation & Consistent UI Updates

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
let app, auth, db;
try {
    // Use initializeApp to get the default app instance
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase Auth: Initialized successfully.");
} catch (e) {
    console.error("Firebase Auth: Error initializing Firebase:", e);
    // Handle initialization error (e.g., display message to user)
}

// --- Global variables for UI elements ---
// ***** UPDATED: Variables for new nav structure *****
let loginSignupLink = null;
let loginSignupLi = null;
let loginModal = null;
let registerModal = null;
let loginMessage = null;
let registerMessage = null;
let myBookLinkLi = null;
let userAccountLi = null;   // <-- NEW: Container for icon/dropdown
let logoutLink = null;      // The actual logout link inside the dropdown
let dashboardWelcomeMessage = null;
let userAccountIcon = null; // <-- NEW: The clickable icon
let userDropdown = null;    // <-- NEW: The dropdown div

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
    // Ensure elements are selected (fallback, ideally assigned in DOMContentLoaded)
    if (!loginSignupLi) loginSignupLi = document.getElementById('nav-login-signup-li');
    if (!myBookLinkLi) myBookLinkLi = document.getElementById('nav-mybook-link-li');
    if (!userAccountLi) userAccountLi = document.getElementById('nav-user-account-li'); // Use the new LI ID
    if (!logoutLink) logoutLink = document.getElementById('logout-link'); // Still need the link itself

    // ** Select userAccountIcon here as well for safety **
    if (!userAccountIcon) userAccountIcon = document.getElementById('userAccountIcon');

    const displayStyle = 'block'; // Or 'list-item', 'flex', depending on your CSS needs

    if (user) {
        // --- User is Logged In ---
        if (loginSignupLi) loginSignupLi.style.display = 'none';       // Hide Login/Sign Up
        if (myBookLinkLi) myBookLinkLi.style.display = displayStyle; // Show My Book
        if (userAccountLi) userAccountLi.style.display = displayStyle;  // Show User Icon Dropdown Container

        // Ensure dropdown itself is closed initially on state change/load
        if (userAccountLi) userAccountLi.classList.remove('active');
        if (userAccountIcon) userAccountIcon.setAttribute('aria-expanded', 'false'); // Reset accessibility

        // Setup logout link functionality ONLY if the link exists and listener not yet attached
        // Check data attribute before adding listener to prevent duplicates
        if (logoutLink && !logoutLink.dataset.listenerAttached) {
            logoutLink.addEventListener('click', handleLogout);
            logoutLink.dataset.listenerAttached = 'true'; // Mark as attached
        }

    } else {
        // --- User is Logged Out ---
        if (loginSignupLi) loginSignupLi.style.display = displayStyle; // Show Login/Sign Up
        if (myBookLinkLi) myBookLinkLi.style.display = 'none';       // Hide My Book
        if (userAccountLi) userAccountLi.style.display = 'none';        // Hide User Icon Dropdown Container

        // Ensure dropdown is closed when logged out
         if (userAccountLi) userAccountLi.classList.remove('active');
         if (userAccountIcon) userAccountIcon.setAttribute('aria-expanded', 'false');

        // Optional: remove listener on logout if needed, though checking existence is often enough
        // if (logoutLink && logoutLink.dataset.listenerAttached) {
        //     logoutLink.removeEventListener('click', handleLogout);
        //     delete logoutLink.dataset.listenerAttached;
        // }
    }
}


// --- Helper Function to Protect Routes --- (No changes needed here)
function protectRoute(user) {
    const protectedPages = ['/dashboard.html', '/profile.html', '/mybook.html', '/admin-dashboard.html'];
    const currentPagePath = window.location.pathname;
    const isProtected = protectedPages.some(page => currentPagePath.endsWith(page));

    if (!user && isProtected) {
        console.log("User not logged in. Redirecting from protected route:", currentPagePath);
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
                console.warn("User document not found for welcome message.");
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
    userAccountLi = document.getElementById('nav-user-account-li'); // <-- Get the LI container
    logoutLink = document.getElementById('logout-link');          // <-- Get the logout link itself
    dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message');
    userAccountIcon = document.getElementById('userAccountIcon');   // <-- Get the icon link
    userDropdown = document.getElementById('userDropdown');         // <-- Get the dropdown div

    // --- Setup Modal Listeners ---
    const loginCloseButton = loginModal ? loginModal.querySelector('.login-close-button') : null;
    const registerCloseButton = registerModal ? registerModal.querySelector('.register-close-button') : null;
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');

    // Setup listeners for login/register modals and the combined login/signup link
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
        console.log("Attaching dropdown toggle listeners.");
        userAccountIcon.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent navigating to '#'
            event.stopPropagation(); // Important: Prevent click from immediately closing dropdown via document listener
            const isActive = userAccountLi.classList.toggle('active'); // Toggle class on the LI
            userAccountIcon.setAttribute('aria-expanded', isActive); // Update accessibility state
            console.log("Dropdown toggled. Active:", isActive);
        });

        // Close dropdown if clicking anywhere else on the page
        document.addEventListener('click', (event) => {
            // Check if the dropdown is active and the click was OUTSIDE the dropdown container LI
            if (userAccountLi.classList.contains('active') && !userAccountLi.contains(event.target)) {
                console.log("Clicked outside dropdown, closing.");
                userAccountLi.classList.remove('active');
                userAccountIcon.setAttribute('aria-expanded', 'false'); // Reset accessibility state
            }
        });

        // Close dropdown if the Escape key is pressed
         window.addEventListener('keydown', (event) => {
             if (event.key === 'Escape' && userAccountLi.classList.contains('active')) {
                 console.log("Escape key pressed, closing dropdown.");
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

            // Validations
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
    // This runs once on load and whenever auth state changes
    console.log("Setting up Firebase Auth state observer...");
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed! User:", user ? user.uid : 'None');
        updateNavUI(user); // ** THIS IS WHERE THE NAV GETS UPDATED **
        protectRoute(user);

        if (window.location.pathname.includes('dashboard.html') && user) {
            updateDashboardWelcome(user);
        }
        if (window.location.pathname.includes('admin-dashboard.html') && user) {
             updateDashboardWelcome(user); // Reusing for admin for now
        }
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
        await setDoc(userDocRef, { email, username, firstname, lastname, contact, gender, createdAt: new Date().toISOString(), isAdmin: false });
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
                console.log("Admin user detected.");
                if (currentLoginMessage) { currentLoginMessage.textContent = "Admin login successful! Redirecting..."; currentLoginMessage.style.color = "green"; }
                setTimeout(() => { closeAllModals(); window.location.href = 'admin-dashboard.html'; }, 1000);
            } else {
                console.log("Regular user detected.");
                 if (currentLoginMessage) { currentLoginMessage.textContent = "Login successful! Redirecting..."; currentLoginMessage.style.color = "green"; }
                setTimeout(() => { closeAllModals(); window.location.href = 'dashboard.html'; }, 1000); // Default redirect for regular users
            }
        } catch (error) {
            console.error("Error checking user role:", error);
            if (currentLoginMessage) { currentLoginMessage.textContent = "Login successful, but couldn't verify role. Redirecting."; currentLoginMessage.style.color = "orange"; }
            if (loginButton) loginButton.disabled = false;
            setTimeout(() => { closeAllModals(); window.location.href = 'index.html'; }, 1500); // Fallback redirect
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
