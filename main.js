<script type="module">
        // Import the functions you need from the SDKs
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
        // **** REMOVED Firestore query imports if they were added ****
        import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
        import { getFirestore, collection, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
        import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js"; // Optional

        // Your web app's Firebase configuration (FROM YOUR LATEST SNIPPET)
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
            // ... (Registration code remains the same as before) ...
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
                registrationForm.appendChild(registerMessage);

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


            // --- Firebase Login (Reverted to Email/Password) ---
            const loginForm = document.getElementById('loginForm');
            // **** UPDATED GetElementById to use 'login-email' ****
            const loginEmailInput = document.getElementById('login-email'); // Changed ID
            const loginPasswordInput = document.getElementById('login-password');
            const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
            const loginMessage = document.createElement('p');

            if (loginForm && loginButton) {
                loginMessage.classList.add('login-message');
                loginMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
                loginForm.appendChild(loginMessage);

                loginForm.addEventListener('submit', (event) => {
                    event.preventDefault();
                    loginButton.disabled = true;
                    loginMessage.textContent = "Logging in...";
                    loginMessage.style.color = "blue";
                    // **** Pass the email input value directly ****
                    loginUser(loginEmailInput.value, loginPasswordInput.value);
                });
            } else { console.error("Login form or button not found!"); }


            // **** REVERTED loginUser function to original Email/Password logic ****
            async function loginUser(email, password) { // Changed parameter name back to email
                 if (!email || !password) {
                     loginMessage.textContent = "Please enter email and password.";
                     loginMessage.style.color = "red";
                     if (loginButton) loginButton.disabled = false;
                     return;
                 }
                try {
                    // Directly use email input for signing in
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;
                    console.log("Login success. UID:", user.uid);

                    // Admin Check remains the same
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
                     // Can be more specific again now
                     if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') errorMessage = "Invalid email or password.";
                     else if (error.code === 'auth/invalid-email') errorMessage = "Invalid email format.";
                    loginMessage.textContent = errorMessage;
                    loginMessage.style.color = "red";
                    if (loginButton) loginButton.disabled = false;
                }
            } // **** End of reverted loginUser function ****


            // --- Modal Logic (Remains the same) ---
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
                if (loginMessage) loginMessage.textContent = ''; // Clear messages when closing
                if (registerMessage) registerMessage.textContent = ''; // Clear messages when closing
            }

            if (loginLink && registerLink && loginModal && registerModal && loginCloseButton && registerCloseButton && switchToRegister && switchToLogin) {
                loginLink.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });
                registerLink.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); registerModal.style.display = 'block'; });
                loginCloseButton.addEventListener('click', closeAllModals);
                registerCloseButton.addEventListener('click', closeAllModals);
                window.addEventListener('click', (event) => { if (event.target === loginModal || event.target === registerModal) { closeAllModals(); } });
                switchToRegister.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); registerModal.style.display = 'block'; });
                switchToLogin.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });
            } else { console.error("Modal Error: One or more elements not found."); }

        }); // End of DOMContentLoaded listener

    </script>
