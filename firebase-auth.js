// firebase-auth.js

// --- Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged, // Manages auth state changes
    signOut // For logging out
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
    apiKey: "YOUR_API_KEY", // !!! Replace with your actual API Key !!!
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
// ***** MODIFIED: Updated variable list for new nav structure *****
let loginSignupLink = null; // Combined Login/Sign Up Link <a> tag <-- NEW
let loginSignupLi = null;   // Combined Login/Sign Up Link <li> tag <-- NEW
let loginModal = null;
let registerModal = null;
let loginMessage = null;
let registerMessage = null;
// let loginLinkLi = null; // <-- REMOVED
// let registerLinkLi = null; // <-- REMOVED
let myBookLinkLi = null; // <li> containing My Book link
let profileLinkLi = null; // <li> containing My Profile link
let logoutLinkLi = null; // <li> containing Logout link
let logoutLink = null; // <a> tag for Logout <-- Still needed for event listener
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
// ***** MODIFIED: Updated to handle the new nav structure *****
function updateNavUI(user) {
    // Ensure elements are selected (they should be selected in DOMContentLoaded)
    // These checks are fallback, ideally they are assigned in DOMContentLoaded
    if (!loginSignupLi) loginSignupLi = document.getElementById('nav-login-signup-li'); // NEW
    if (!myBookLinkLi) myBookLinkLi = document.getElementById('nav-mybook-link-li');
    if (!profileLinkLi) profileLinkLi = document.getElementById('nav-profile-link-li');
    if (!logoutLinkLi) logoutLinkLi = document.getElementById('nav-logout-link-li');
    if (!logoutLink) logoutLink = document.getElementById('logout-link'); // Still need the actual link for click event

    if (user) {
        // --- User is Logged In ---
        if (loginSignupLi) loginSignupLi.style.display = 'none'; // Hide Combined Login/Sign Up <-- NEW
        if (myBookLinkLi) myBookLinkLi.style.display = 'block'; // Show My Book (use 'list-item' or 'flex' if 'block' looks wrong)
        if (profileLinkLi) profileLinkLi.style.display = 'block'; // Show My Profile
        if (logoutLinkLi) logoutLinkLi.style.display = 'block'; // Show Logout

        // Setup logout link functionality ONLY if the link exists and listener not yet attached
        if (logoutLink && !logoutLink.dataset.listenerAttached) {
            logoutLink.addEventListener('click', handleLogout);
            logoutLink.dataset.listenerAttached = 'true'; // Mark as attached
        }

    } else {
        // --- User is Logged Out ---
        if (loginSignupLi) loginSignupLi.style.display = 'block'; // Show Combined Login/Sign Up <-- NEW
        if (myBookLinkLi) myBookLinkLi.style.display = 'none'; // Hide My Book
        if (profileLinkLi) profileLinkLi.style.display = 'none'; // Hide My Profile
        if (logoutLinkLi) logoutLinkLi.style.display = 'none'; // Hide Logout
    }
}

// --- Helper Function to Protect Routes ---
function protectRoute(user) {
    const protectedPages = ['/dashboard.html', '/profile.html', '/mybook.html', '/admin-dashboard.html']; // Add sensitive pages
    const currentPagePath = window.location.pathname;
    const isProtected = protectedPages.some(page => {
        // Handle root paths and potential trailing slashes correctly
        const normalizedCurrent = currentPagePath.endsWith('/') ? currentPagePath : currentPagePath + '/';
        const normalizedProtected = page.endsWith('/') ? page : page + '/';
        return normalizedCurrent.endsWith(normalizedProtected);
    });

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
    // ***** MODIFIED: Select new nav elements, remove old ones *****
    loginSignupLink = document.getElementById('loginSignupLink'); // <-- NEW
    loginSignupLi = document.getElementById('nav-login-signup-li'); // <-- NEW
    // loginLink = document.getElementById('loginLink'); // <-- REMOVED
    // registerLink = document.getElementById('registerLink'); // <-- REMOVED
    loginModal = document.getElementById('loginModal');
    registerModal = document.getElementById('registerModal');
    // loginLinkLi = document.getElementById('nav-login-link-li'); // <-- REMOVED
    // registerLinkLi = document.getElementById('nav-register-link-li'); // <-- REMOVED
    myBookLinkLi = document.getElementById('nav-mybook-link-li');
    profileLinkLi = document.getElementById('nav-profile-link-li');
    logoutLinkLi = document.getElementById('nav-logout-link-li');
    logoutLink = document.getElementById('logout-link'); // Keep selecting the actual link
    dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message'); // Will be null if not on dashboard

    // --- Setup Modal Listeners ---
    // ***** MODIFIED: Use loginSignupLink to open login modal *****
    const loginCloseButton = loginModal ? loginModal.querySelector('.login-close-button') : null;
    const registerCloseButton = registerModal ? registerModal.querySelector('.register-close-button') : null;
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');

    // Check if essential modal elements and the NEW combined link exist
    if (loginSignupLink && loginModal && registerModal && loginCloseButton && registerCloseButton && switchToRegister && switchToLogin) {
        console.log("Modal elements and Login/Sign Up link found. Attaching modal listeners...");

        // NEW: Combined link opens the LOGIN modal
        loginSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            closeAllModals();
            loginModal.style.display = 'block';
        });

        // REMOVED old listeners for separate links
        // loginLink.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });
        // registerLink.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); registerModal.style.display = 'block'; });

        // Keep existing listeners for closing and switching modals
        loginCloseButton.addEventListener('click', closeAllModals);
        registerCloseButton.addEventListener('click', closeAllModals);
        window.addEventListener('click', (event) => { if (event.target === loginModal || event.target === registerModal) { closeAllModals(); } });
        switchToRegister.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); registerModal.style.display = 'block'; });
        switchToLogin.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });
    } else {
        console.warn("Modal Warning: Not all elements needed for modal interactions (including loginSignupLink) were found. Check IDs.");
        // Log which specific elements might be missing for easier debugging
        if (!loginSignupLink) console.warn("Missing: loginSignupLink");
        if (!loginModal) console.warn("Missing: loginModal");
        if (!registerModal) console.warn("Missing: registerModal");
        // Add checks for other elements if needed
    }


    // --- Firebase Registration Logic ---
    // No changes needed in the registration form setup or submission logic itself
    const registrationForm = document.getElementById('registrationForm');
    const registerButton = registrationForm ? registrationForm.querySelector('button[type="submit"]') : null;
    registerMessage = document.createElement('p'); // Assign to global

    if (registrationForm && registerButton) {
        registerMessage.classList.add('registration-message');
        registerMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
        // Ensure message element exists before inserting
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
            const currentRegisterMessage = registrationForm.querySelector('.registration-message'); // Get message element specific to this form

            // Basic validation (add more as needed)
            if (!email || !password || !confirmPassword || !username || !firstname || !lastname || !contact || !selectedGender) {
                if (currentRegisterMessage) {
                    currentRegisterMessage.textContent = "Please fill in all fields.";
                    currentRegisterMessage.style.color = "red";
                }
                return;
            }
            if (password.length < 8) {
                 if (currentRegisterMessage) {
                    currentRegisterMessage.textContent = "Password must be at least 8 characters long.";
                    currentRegisterMessage.style.color = "red";
                 }
                return;
            }
            if (password !== confirmPassword) {
                 if (currentRegisterMessage) {
                    currentRegisterMessage.textContent = "Passwords do not match.";
                    currentRegisterMessage.style.color = "red";
                 }
                return;
            }

            registerButton.disabled = true;
            if (currentRegisterMessage) {
                currentRegisterMessage.textContent = "Registering...";
                currentRegisterMessage.style.color = "blue";
            }

            registerUser(email, password, username, firstname, lastname, contact, selectedGender);
        });
    }

    // --- Firebase Login Logic ---
    // No changes needed in the login form setup or submission logic itself
    const loginForm = document.getElementById('loginForm');
    // Ensure we correctly select the input, handling potential ID variations
    const loginEmailInput = document.getElementById('login-email-user') || document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
    loginMessage = document.createElement('p'); // Assign to global

    if (loginForm && loginButton && loginEmailInput && loginPasswordInput) {
        loginMessage.classList.add('login-message');
        loginMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
         // Ensure message element exists before inserting
        if (!loginForm.querySelector('.login-message')) {
            loginButton.parentNode.insertBefore(loginMessage, loginButton.nextSibling);
        }

        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;
            const currentLoginMessage = loginForm.querySelector('.login-message'); // Get message element specific to this form


            if (!email || !password) {
                if (currentLoginMessage) {
                    currentLoginMessage.textContent = "Please enter email/username and password.";
                    currentLoginMessage.style.color = "red";
                }
                return;
            }

            // Disable button and set message here, before calling loginUser
            loginButton.disabled = true;
            if (currentLoginMessage) {
                currentLoginMessage.textContent = "Logging in...";
                currentLoginMessage.style.color = "blue";
            }

            loginUser(email, password); // Call the updated loginUser function
        });
    }

    // --- Setup Auth State Observer ---
    // This is the core part that reacts to login/logout
    console.log("Setting up Firebase Auth state observer...");
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed! User:", user ? user.uid : 'None');
        updateNavUI(user); // Call the updated function to show/hide correct links
        protectRoute(user); // Redirect if on protected page while logged out

        // Update dashboard welcome message if applicable
        if (window.location.pathname.includes('dashboard.html') && user) {
            updateDashboardWelcome(user);
        }
         // Update admin dashboard welcome message if applicable
        if (window.location.pathname.includes('admin-dashboard.html') && user) {
            // You might want a specific welcome message function for admin
            // updateAdminDashboardWelcome(user); or reuse updateDashboardWelcome
             updateDashboardWelcome(user); // Example: reuse if structure is similar
        }
        // Add similar checks for profile page if needed
        // if (window.location.pathname.includes('profile.html') && user) {
        // // e.g., loadProfileData(user);
        // }
    });

}); // End of DOMContentLoaded listener


// --- Registration Function ---
// No changes needed here
async function registerUser(email, password, username, firstname, lastname, contact, gender) {
    const currentRegisterMessage = document.querySelector('#registerModal .registration-message');
    const registerButton = document.querySelector('#registrationForm button[type="submit"]');
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Auth success. UID:", user.uid);
        const userDocRef = doc(db, "users", user.uid);
        // --- IMPORTANT: Ensure isAdmin is set to false for new registrations ---
        await setDoc(userDocRef, {
            email,
            username,
            firstname,
            lastname,
            contact,
            gender,
            createdAt: new Date().toISOString(), // Store as ISO string for consistency
            isAdmin: false // Explicitly set non-admin status
        });
        console.log("Firestore save success.");
        if (currentRegisterMessage) {
            currentRegisterMessage.textContent = "Registration successful!";
            currentRegisterMessage.style.color = "green";
        }
        setTimeout(closeAllModals, 1500); // Close modal on success
    } catch (error) {
        console.error("Registration error:", error);
        let errorMessage = "Registration failed.";
        if (error.code === 'auth/email-already-in-use') errorMessage = "Email already in use.";
        else if (error.code === 'auth/invalid-email') errorMessage = "Invalid email format.";
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
// No changes needed here, already handles admin/user redirects
async function loginUser(email, password) {
    const currentLoginMessage = document.querySelector('#loginModal .login-message');
    const loginButton = document.querySelector('#loginForm button[type="submit"]');

    // Button disabling and initial message are handled in the submit listener

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user; // Get the user object
        console.log("Login Auth success. UID:", user.uid);

        // --- START: Admin Check and Redirect Logic ---
        const userDocRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists() && docSnap.data().isAdmin === true) {
                console.log("Admin user detected. Redirecting to admin dashboard.");
                if (currentLoginMessage) {
                    currentLoginMessage.textContent = "Admin login successful! Redirecting...";
                    currentLoginMessage.style.color = "green";
                }
                setTimeout(() => {
                    closeAllModals();
                    window.location.href = 'admin-dashboard.html'; // Redirect Admin
                }, 1000);

            } else {
                console.log("Regular user detected. Redirecting to dashboard.");
                 if (currentLoginMessage) {
                    currentLoginMessage.textContent = "Login successful! Redirecting...";
                    currentLoginMessage.style.color = "green";
                }
                setTimeout(() => {
                    closeAllModals();
                    // <<< CHANGE 'dashboard.html' if regular users go elsewhere after login
                    window.location.href = 'dashboard.html'; // Redirect Regular Customer
                }, 1000);
            }
        } catch (error) {
            console.error("Error fetching user data for admin check:", error);
            if (currentLoginMessage) {
                currentLoginMessage.textContent = "Login successful, but couldn't verify role. Redirecting to default page.";
                currentLoginMessage.style.color = "orange";
            }
            if (loginButton) loginButton.disabled = false; // Re-enable button ONLY if role check fails after login
            setTimeout(() => {
                closeAllModals();
                window.location.href = 'index.html'; // Fallback redirect
            }, 1500);
        }
        // --- END: Admin Check and Redirect Logic ---

    } catch (error) {
        console.error("Login Auth error:", error);
        let errorMessage = "Login failed.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = "Invalid email/username or password.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email format.";
        }
        if (currentLoginMessage) {
            currentLoginMessage.textContent = errorMessage;
            currentLoginMessage.style.color = "red";
        }
        if (loginButton) loginButton.disabled = false; // Re-enable button on login failure
    }
}

// --- Optional: Add Exports if needed by other modules ---
// export { auth, db, app };
