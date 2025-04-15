// firebase-auth.js

// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js"; // Optional

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAp19_1RwloTbJLZ_K723-m8C2zka8Oh10", // ENSURE THIS IS YOUR FULL, CORRECT KEY
    authDomain: "gjsbooking-faba9.firebaseapp.com",
    projectId: "gjsbooking-faba9",
    storageBucket: "gjsbooking-faba9.firebasestorage.app", // Corrected typo: firebasestorage -> firebaseapp
    messagingSenderId: "708149149410",
    appId: "1:708149149410:web:dde6a5b99b4900dd8c28bb",
    measurementId: "G-5QB9413PJH" // Optional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app); // Optional

// --- Wait for the DOM to be fully loaded ---
document.addEventListener('DOMContentLoaded', () => {

    // --- Firebase Registration ---
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
    const registerMessage = document.createElement('p'); // Create message element

    if (registrationForm && registerButton) {
        // Style and append the message element ONLY if the form exists
        registerMessage.classList.add('registration-message');
        registerMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
        // Ensure it's added relative to the button or form end
        registerButton.parentNode.insertBefore(registerMessage, registerButton.nextSibling);

        registrationForm.addEventListener('submit', (event) => {
            event.preventDefault();
            registerButton.disabled = true;
            registerMessage.textContent = "Registering...";
            registerMessage.style.color = "blue";
            const selectedGender = [...genderInputs].find(input => input.checked)?.value || "";
            const password = passwordInput ? passwordInput.value : '';
            const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

            if (password.length < 8) { // Example: Enforcing 8 characters
                registerMessage.textContent = "Password must be at least 8 characters long.";
                registerMessage.style.color = "red";
                registerButton.disabled = false;
                return; // Stop submission
            }

            if (password !== confirmPassword) {
                registerMessage.textContent = "Passwords do not match.";
                registerMessage.style.color = "red";
                registerButton.disabled = false;
                return;
            }
            if (!emailInput?.value || !password || !usernameInput?.value || !firstnameInput?.value || !lastnameInput?.value || !contactInput?.value || !selectedGender) {
                registerMessage.textContent = "Please fill in all required fields.";
                registerMessage.style.color = "red";
                registerButton.disabled = false;
                return;
            }
            registerUser(emailInput.value, password, usernameInput.value, firstnameInput.value, lastnameInput.value, contactInput.value, selectedGender);
        });
    } else { console.error("Registration form or button not found!"); }

    async function registerUser(email, password, username, firstname, lastname, contact, gender) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("Auth success. UID:", user.uid);
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, { email, username, firstname, lastname, contact, gender, createdAt: new Date(), isAdmin: false });
            console.log("Firestore save success.");
            registerMessage.textContent = "Registration successful!";
            registerMessage.style.color = "green";
            // Optional: Close modal after a delay
            // setTimeout(closeAllModals, 2000);
        } catch (error) {
            console.error("Registration error:", error);
            let errorMessage = "Registration failed.";
            if (error.code === 'auth/email-already-in-use') errorMessage = "Email already in use.";
            else if (error.code === 'auth/invalid-email') errorMessage = "Invalid email.";
            else if (error.code === 'auth/weak-password') errorMessage = "Password needs 6+ characters."; // Firebase default is 6
            registerMessage.textContent = errorMessage;
            registerMessage.style.color = "red";
        } finally { if (registerButton) registerButton.disabled = false; }
    }


    // --- Firebase Login ---
    const loginForm = document.getElementById('loginForm');
    // *** IMPORTANT: Use the correct ID from your login form HTML ***
    // In index.html it's 'login-email', in reviews.html it's 'login-email-user'
    // For consistency, let's assume you'll update reviews.html to use 'login-email'
    const loginEmailInput = document.getElementById('login-email') || document.getElementById('login-email-user'); // Try both common IDs
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
    const loginMessage = document.createElement('p'); // Create message element

    if (loginForm && loginButton && loginEmailInput) { // Check if loginEmailInput exists
        // Style and append the message element ONLY if the form exists
        loginMessage.classList.add('login-message');
        loginMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
         // Ensure it's added relative to the button or form end
        loginButton.parentNode.insertBefore(loginMessage, loginButton.nextSibling);


        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            loginButton.disabled = true;
            loginMessage.textContent = "Logging in...";
            loginMessage.style.color = "blue";
            loginUser(loginEmailInput.value, loginPasswordInput.value);
        });
    } else { console.error("Login form, button, or email input not found!"); }

    async function loginUser(emailOrUsername, password) { // Parameter can be email or username now
        if (!emailOrUsername || !password) {
            loginMessage.textContent = "Please enter email/username and password.";
            loginMessage.style.color = "red";
            if (loginButton) loginButton.disabled = false;
            return;
        }

        // For Firebase Auth, we need the email. If the user entered a username,
        // we'd typically need to look up the email in Firestore first.
        // For simplicity now, we'll assume they enter the EMAIL here.
        // If you want username login, it requires an extra step (querying Firestore).
        const email = emailOrUsername; // Assuming input is email for now

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("Login success. UID:", user.uid);

            const userDocRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(userDocRef);
            let isAdmin = false;
            if (docSnap.exists()) { isAdmin = docSnap.data().isAdmin === true; }
            else { console.warn("User doc not found:", user.uid); }

            loginMessage.textContent = "Login successful! Redirecting...";
            loginMessage.style.color = "green";
            setTimeout(() => { window.location.href = isAdmin ? "admin-dashboard.html" : "dashboard.html"; }, 1500);

        } catch (error) {
            console.error("Login error:", error);
            let errorMessage = "Login failed.";
             if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') errorMessage = "Invalid email or password.";
             else if (error.code === 'auth/invalid-email') errorMessage = "Invalid email format.";
            loginMessage.textContent = errorMessage;
            loginMessage.style.color = "red";
            if (loginButton) loginButton.disabled = false;
        }
    }


    // --- Modal Logic ---
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginCloseButton = loginModal ? loginModal.querySelector('.login-close-button') : null;
    const registerCloseButton = registerModal ? registerModal.querySelector('.register-close-button') : null;
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');

    function closeAllModals() {
        if (registerModal) registerModal.style.display = "none";
        if (loginModal) loginModal.style.display = "none";
        // Clear messages when closing modals
        if (loginMessage) loginMessage.textContent = '';
        if (registerMessage) registerMessage.textContent = '';
    }

    // Check if all modal trigger elements exist before adding listeners
    if (loginLink && registerLink && loginModal && registerModal && loginCloseButton && registerCloseButton && switchToRegister && switchToLogin) {
        loginLink.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });
        registerLink.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); registerModal.style.display = 'block'; });
        loginCloseButton.addEventListener('click', closeAllModals);
        registerCloseButton.addEventListener('click', closeAllModals);
        window.addEventListener('click', (event) => { if (event.target === loginModal || event.target === registerModal) { closeAllModals(); } });
        switchToRegister.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); registerModal.style.display = 'block'; });
        switchToLogin.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });
    } else {
         // Be more specific about which elements might be missing
         console.warn("Modal Warning: Not all modal trigger/control elements were found. Modals might not open/close correctly.");
         // You could add individual checks here if needed:
         // if (!loginLink) console.error("loginLink not found");
         // etc.
     }

}); // End of DOMContentLoaded listener
