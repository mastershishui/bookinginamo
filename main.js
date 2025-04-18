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
            // Insert message before the button
            registerButton.parentNode.insertBefore(registerMessage, registerButton);


            registrationForm.addEventListener('submit', (event) => {
                event.preventDefault();
                registerButton.disabled = true;
                registerMessage.textContent = "Registering...";
                registerMessage.style.color = "blue";
                const selectedGender = [...genderInputs].find(input => input.checked)?.value || "";
                const password = passwordInput ? passwordInput.value : '';
                const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

                if (password.length < 8) {
                     registerMessage.textContent = "Password must be at least 8 characters long.";
                     registerMessage.style.color = "red";
                     registerButton.disabled = false;
                     return;
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
        } else {
            // Only log error if we are on a page expected to have the registration form
            if (document.getElementById('registerModal')) { // Check if the modal exists
                 console.error("Registration form or button not found inside #registerModal!");
            }
        }

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
                 // Optionally close modal or redirect after short delay
                 setTimeout(closeAllModals, 1500); // Close modal after 1.5 seconds
            } catch (error) {
                console.error("Registration error:", error);
                let errorMessage = "Registration failed.";
                if (error.code === 'auth/email-already-in-use') errorMessage = "Email already in use.";
                else if (error.code === 'auth/invalid-email') errorMessage = "Invalid email format.";
                else if (error.code === 'auth/weak-password') errorMessage = "Password is too weak (needs 6+ characters).";
                registerMessage.textContent = errorMessage;
                registerMessage.style.color = "red";
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
             // Insert message before the button
             loginButton.parentNode.insertBefore(loginMessage, loginButton);

            loginForm.addEventListener('submit', (event) => {
                event.preventDefault();
                loginButton.disabled = true;
                loginMessage.textContent = "Logging in...";
                loginMessage.style.color = "blue";
                loginUser(loginEmailInput.value, loginPasswordInput.value);
            });
        } else {
             // Only log error if we are on a page expected to have the login form
             if (document.getElementById('loginModal')) { // Check if the modal exists
                 console.error("Login form or button not found inside #loginModal!");
             }
        }


        async function loginUser(email, password) {
             if (!email || !password) {
                  loginMessage.textContent = "Please enter email and password.";
                  loginMessage.style.color = "red";
                  if (loginButton) loginButton.disabled = false;
                  return;
             }
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                console.log("Login success. UID:", user.uid);

                // Admin Check
                const userDocRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(userDocRef);
                let isAdmin = false;
                if (docSnap.exists()) { isAdmin = docSnap.data().isAdmin === true; }
                else { console.warn("User doc not found for admin check:", user.uid); }

                loginMessage.textContent = "Login successful! Redirecting...";
                loginMessage.style.color = "green";
                // Redirect after a short delay
                setTimeout(() => {
                    closeAllModals(); // Close modal before redirecting
                    window.location.href = isAdmin ? "admin-dashboard.html" : "dashboard.html";
                 }, 1500); // 1.5 second delay

            } catch (error) {
                console.error("Login error:", error);
                let errorMessage = "Login failed.";
                 if (error.code === 'auth/user-not-found' ||
                     error.code === 'auth/wrong-password' ||
                     error.code === 'auth/invalid-credential') {
                    errorMessage = "Invalid email or password.";
                 } else if (error.code === 'auth/invalid-email') {
                    errorMessage = "Invalid email format.";
                 } else if (error.code === 'auth/too-many-requests') {
                     errorMessage = "Access temporarily disabled due to too many attempts. Try again later.";
                 }
                loginMessage.textContent = errorMessage;
                loginMessage.style.color = "red";
                if (loginButton) loginButton.disabled = false;
            }
        }


        // --- Login/Register Modal & Nav UI Logic ---
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        const loginCloseButton = loginModal ? loginModal.querySelector('.login-close-button') : null;
        const registerCloseButton = registerModal ? registerModal.querySelector('.register-close-button') : null;
        const switchToRegister = document.getElementById('switchToRegister');
        const switchToLogin = document.getElementById('switchToLogin');
        const loginSignupNavLinkLI = document.getElementById('nav-login-signup-li'); // The <li> element
        const loginSignupLink = document.getElementById('loginSignupLink');       // The <a> element inside
        const userAccountNavLinkLI = document.getElementById('nav-user-account-li'); // The <li> element
        const userDropdown = document.getElementById('userDropdown');
        const logoutLink = document.getElementById('logout-link');

        function closeAllModals() {
            if (registerModal) registerModal.style.display = "none";
            if (loginModal) loginModal.style.display = "none";
            if (loginMessage && loginForm) loginMessage.textContent = ''; // Clear messages only if elements exist
            if (registerMessage && registrationForm) registerMessage.textContent = ''; // Clear messages only if elements exist
            // Reset form fields if needed (optional)
             if (loginForm) loginForm.reset();
             if (registrationForm) registrationForm.reset();
        }

        // Function to update Navigation based on login state
        function updateNavUI(user) {
            if (user) {
                // User is logged in
                if(loginSignupNavLinkLI) loginSignupNavLinkLI.style.display = 'none';
                if(userAccountNavLinkLI) userAccountNavLinkLI.style.display = 'list-item'; // Or 'block', 'flex' depending on CSS for li
                console.log("UI Update: User logged in, showing account icon");
            } else {
                // User is logged out
                 if(loginSignupNavLinkLI) loginSignupNavLinkLI.style.display = 'list-item'; // Or 'block', 'flex'
                if(userAccountNavLinkLI) userAccountNavLinkLI.style.display = 'none';
                if(userDropdown) userDropdown.classList.remove('show-dropdown'); // Hide dropdown on logout
                console.log("UI Update: User logged out, showing login/signup link");
            }
        }

         // --- Event listeners for Login/Register Modals & Nav ---
        if (loginSignupLink && loginModal) {
            loginSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                closeAllModals();
                loginModal.style.display = 'block';
            });
        }

        if (loginCloseButton) loginCloseButton.addEventListener('click', closeAllModals);
        if (registerCloseButton) registerCloseButton.addEventListener('click', closeAllModals);
        if (switchToRegister && registerModal) switchToRegister.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); registerModal.style.display = 'block'; });
        if (switchToLogin && loginModal) switchToLogin.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });

        // Close modals on outside click (check if click is on the modal background)
        window.addEventListener('click', (event) => {
            if (event.target === loginModal || event.target === registerModal) {
                 closeAllModals();
            }
        });

         // User Account Dropdown Toggle
         const userAccountIcon = document.getElementById('userAccountIcon');
         if (userAccountIcon && userDropdown) {
             userAccountIcon.addEventListener('click', (e) => {
                 e.preventDefault();
                 userDropdown.classList.toggle('show-dropdown'); // Need a CSS class '.show-dropdown { display: block; }'
             });
             // Optional: Close dropdown if clicked outside
             window.addEventListener('click', (event) => {
                 if (!userAccountNavLinkLI.contains(event.target)) { // If click is outside the user account LI
                     userDropdown.classList.remove('show-dropdown');
                 }
             });
         }


        // Logout Link Logic
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                 userDropdown.classList.remove('show-dropdown'); // Close dropdown first
                 signOut(auth).then(() => {
                    console.log('User signed out successfully');
                    // UI is updated by onAuthStateChanged listener
                    // Optional: Redirect to home page if desired after logout
                    // window.location.href = 'index.html';
                }).catch((error) => {
                    console.error('Sign Out Error', error);
                    alert('Logout failed. Please try again.'); // Notify user
                });
            });
        }

        // Check auth state when DOM is ready and set initial UI
        onAuthStateChanged(auth, (user) => {
            updateNavUI(user);
            // You could potentially fetch user-specific data here if needed after auth state is confirmed
             if(user) {
                 console.log("Auth state changed: User is logged in", user.uid);
             } else {
                 console.log("Auth state changed: User is logged out");
             }
        });


        // ================================================
        // --- Ad Notice Modal Script ---
        // ================================================

        // Get the modal elements for the Ad
        const adModal = document.getElementById('adNoticeModal');
        const closeAdButton = adModal ? adModal.querySelector('.close-ad-button') : null;
        const bookNowAdButton = adModal ? adModal.querySelector('.book-now-button') : null;

        // Function to open the Ad modal
        function openAdModal() {
            if (adModal) {
                 adModal.classList.add('show-modal');
                 console.log("Ad modal opened.");
            } else {
                // console.log("Ad modal element (#adNoticeModal) not found on this page."); // Don't log unless debugging
            }
        }

        // Function to close the Ad modal
        function closeAdModal() {
             if (adModal) {
                adModal.classList.remove('show-modal');
                console.log("Ad modal closed.");
             }
        }

        // --- Triggers for Ad Modal ---

        // Show the modal *after* the window (including images) is fully loaded
        window.addEventListener('load', openAdModal);

        // Close the modal if the close button is clicked
        if (closeAdButton) {
            closeAdButton.addEventListener('click', closeAdModal);
        } else if (adModal) {
             console.error("Ad modal close button (.close-ad-button) not found inside #adNoticeModal!");
        }

        // Optional: Close the modal if the user clicks the "Book Now" button
        if (bookNowAdButton) {
           // bookNowAdButton.addEventListener('click', closeAdModal); // Uncomment if needed
        } else if (adModal) {
            console.error("Ad modal book now button (.book-now-button) not found inside #adNoticeModal!");
        }

        // Optional: Close the Ad modal if the user clicks anywhere outside the modal content
        // This reuses the 'window' listener for outside clicks but adds a check for the ad modal
        window.addEventListener('click', (event) => {
            if (event.target === adModal) { // Check specifically for the ad modal overlay
                closeAdModal();
            }
            // The check for login/register modals (event.target === loginModal || event.target === registerModal)
            // should ideally be in a separate listener or handled carefully if combined,
            // but the current structure might work okay if modals don't overlap display.
            // Let's keep the separate check for adModal for clarity.
        });

        // --- End Ad Notice Modal Script ---


    }); // End of DOMContentLoaded listener

</script>
