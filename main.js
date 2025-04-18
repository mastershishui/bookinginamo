<script type="module">
    // Import the functions you need from the SDKs
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
    import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js"; // Added onAuthStateChanged, signOut
    import { getFirestore, collection, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js"; // Optional

    // Your web app's Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyAp19_1RwloTbJLZ_K723-m8C2zka8Oh10", // ENSURE THIS IS YOUR FULL, CORRECT KEY
        authDomain: "gjsbooking-faba9.firebaseapp.com",
        projectId: "gjsbooking-faba9",
        storageBucket: "gjsbooking-faba9.firebasestorage.app",
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
        console.log("DOM fully loaded and parsed"); // Log DOM ready

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
        const registerMessage = document.createElement('p');

        if (registrationForm && registerButton) {
            registerMessage.classList.add('registration-message');
            registerMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
            registerButton.parentNode.insertBefore(registerMessage, registerButton);

            registrationForm.addEventListener('submit', (event) => {
                event.preventDefault();
                // ... (rest of registration submit code) ...
                 registerUser(emailInput.value, passwordInput.value, usernameInput.value, firstnameInput.value, lastnameInput.value, contactInput.value, /* selectedGender */ [...genderInputs].find(input => input.checked)?.value || "");
            });
        } else {
             if (document.getElementById('registerModal')) {
                 console.error("Registration form or button not found inside #registerModal!");
             }
        }

        async function registerUser(email, password, username, firstname, lastname, contact, gender) {
            // ... (rest of registerUser function) ...
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // ... rest of try block ...
                setTimeout(closeAllModals, 1500);
            } catch (error) {
                // ... rest of catch block ...
            } finally { if (registerButton) registerButton.disabled = false; }
        }


        // --- Firebase Login ---
        const loginForm = document.getElementById('loginForm');
        const loginEmailInput = document.getElementById('login-email');
        const loginPasswordInput = document.getElementById('login-password');
        const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
        const loginMessage = document.createElement('p');

        if (loginForm && loginButton) {
            loginMessage.classList.add('login-message');
            loginMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
            loginButton.parentNode.insertBefore(loginMessage, loginButton);

            loginForm.addEventListener('submit', (event) => {
                event.preventDefault();
                 // ... (rest of login submit code) ...
                loginUser(loginEmailInput.value, loginPasswordInput.value);
            });
        } else {
             if (document.getElementById('loginModal')) {
                 console.error("Login form or button not found inside #loginModal!");
             }
        }

        async function loginUser(email, password) {
             // ... (rest of loginUser function) ...
             try {
                 const userCredential = await signInWithEmailAndPassword(auth, email, password);
                 // ... rest of try block ...
                 setTimeout(() => { /* ... redirect ... */ }, 1500);
             } catch (error) {
                 // ... rest of catch block ...
             }
        }


        // --- Login/Register Modal & Nav UI Logic ---
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        const loginCloseButton = loginModal ? loginModal.querySelector('.login-close-button') : null;
        const registerCloseButton = registerModal ? registerModal.querySelector('.register-close-button') : null;
        const switchToRegister = document.getElementById('switchToRegister');
        const switchToLogin = document.getElementById('switchToLogin');
        const loginSignupNavLinkLI = document.getElementById('nav-login-signup-li');
        const loginSignupLink = document.getElementById('loginSignupLink');
        const userAccountNavLinkLI = document.getElementById('nav-user-account-li');
        const userDropdown = document.getElementById('userDropdown');
        const logoutLink = document.getElementById('logout-link');
        const userAccountIcon = document.getElementById('userAccountIcon');

        function closeAllModals() {
            // ... (closeAllModals function code) ...
        }

        function updateNavUI(user) {
             // ... (updateNavUI function code) ...
        }

        // --- Event listeners for Login/Register Modals & Nav ---
        if (loginSignupLink && loginModal) {
             console.log("Modal elements and Login/Sign Up link found. Attaching modal listeners..."); // Combined log
            loginSignupLink.addEventListener('click', (e) => { /* ... */ });
            if (loginCloseButton) loginCloseButton.addEventListener('click', closeAllModals);
            if (switchToLogin) switchToLogin.addEventListener('click', (e) => { /* ... */ });
        } else {
            console.log("Login/Signup link or Login Modal not found.");
        }
        if (registerModal) {
             if (registerCloseButton) registerCloseButton.addEventListener('click', closeAllModals);
             if (switchToRegister) switchToRegister.addEventListener('click', (e) => { /* ... */ });
        }

        // Close login/register modals on outside click
        window.addEventListener('click', (event) => {
            if (event.target === loginModal || event.target === registerModal) {
                 closeAllModals();
            }
        });

        // User Account Dropdown Toggle
        if (userAccountIcon && userDropdown && userAccountNavLinkLI) {
             console.log("Attaching dropdown toggle listeners."); // Log dropdown setup
             userAccountIcon.addEventListener('click', (e) => { /* ... */ });
             window.addEventListener('click', (event) => { /* ... */ });
        } else {
             console.log("User account icon, dropdown, or LI not found.");
        }

        // Logout Link Logic
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => { /* ... signOut ... */ });
        }

        // --- Auth State Observer ---
        console.log("Setting up Firebase Auth state observer..."); // Log observer setup
        onAuthStateChanged(auth, (user) => {
            console.log("Auth state changed! User:", user ? user.uid : 'None'); // Log auth state change
            updateNavUI(user);
        });


        // ================================================
        // --- Ad Notice Modal Script ---
        // ================================================
        console.log("Ad modal script section REACHED."); // Log reaching this section

        // Get the modal elements for the Ad
        const adModal = document.getElementById('adNoticeModal');
        const closeAdButton = adModal ? adModal.querySelector('.close-ad-button') : null;
        const bookNowAdButton = adModal ? adModal.querySelector('.book-now-button') : null;

        // Function to open the Ad modal (ensure this is present)
        function openAdModal() {
            console.log("openAdModal function CALLED.");
            if (adModal) {
                 adModal.classList.add('show-modal');
                 console.log("Ad modal .show-modal class ADDED.");
            } else {
                 // This log might be excessive if the modal isn't on every page
                 // console.log("Ad modal element (#adNoticeModal) not found when trying to open.");
            }
        }

        // Function to close the Ad modal (ensure this is present)
        function closeAdModal() {
            console.log("closeAdModal function CALLED."); // Add log
            if (adModal) {
                adModal.classList.remove('show-modal');
                console.log("Ad modal .show-modal class REMOVED."); // Add log
            }
        }

        // --- Triggers for Ad Modal ---
        console.log("Setting up listener for window load to open ad modal...");
        // Show the modal *after* the window (including images, etc.) is fully loaded
        window.addEventListener('load', openAdModal);

        // VITAL: Close the modal if the close button is clicked
        if (closeAdButton) {
            console.log("Found .close-ad-button, attaching click listener."); // Add log
            closeAdButton.addEventListener('click', closeAdModal); // This line makes the 'X' work
        } else if (adModal) {
            // Only log error if the modal exists but the button inside doesn't
            console.error("Ad modal close button (.close-ad-button) not found inside #adNoticeModal!");
        }

        // Optional: Close the modal if the user clicks the "Book Now" button
        if (bookNowAdButton) {
           // bookNowAdButton.addEventListener('click', closeAdModal); // Uncomment if needed
        } else if (adModal) {
           // console.error("Ad modal book now button (.book-now-button) not found inside #adNoticeModal!"); // Optional log
        }

        // Optional: Close the Ad modal if the user clicks anywhere outside the modal content
        // NOTE: This listener is separate from the one for login/register modals
        window.addEventListener('click', (event) => {
            // Check specifically for the ad modal overlay background
            if (event.target === adModal) {
                 closeAdModal();
            }
        });

        // --- End Ad Notice Modal Script ---


    }); // End of DOMContentLoaded listener

</script>
