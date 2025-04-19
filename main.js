<script type="module">
    // Import the functions you need from the SDKs
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
    import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js"; // Added onAuthStateChanged, signOut
    import { getFirestore, collection, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js"; // Optional

    // Your web app's Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyAp19_1RwloTbJLZ_K723-m8C2zka8Oh10", // MAKE SURE TO REPLACE WITH YOUR ACTUAL KEY IF THIS ISN'T CORRECT/COMPLETE
        authDomain: "gjsbooking-faba9.firebaseapp.com",
        projectId: "gjsbooking-faba9",
        storageBucket: "gjsbooking-faba9.appspot.com", // Corrected common typo: .appspot.com
        messagingSenderId: "708149149410",
        appId: "1:708149149410:web:dde6a5b99b4900dd8c28bb",
        measurementId: "G-5QB9413PJH" // Optional
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    // Only initialize analytics if measurementId exists
    const analytics = firebaseConfig.measurementId ? getAnalytics(app) : null;

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
        const registerMessage = document.createElement('p'); // Create element to display messages

        if (registrationForm && registerButton) {
             registerMessage.classList.add('registration-message'); // Add class for potential styling
             registerMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;"; // Basic styling
             // Insert message element before the button
             registerButton.parentNode.insertBefore(registerMessage, registerButton);

            registrationForm.addEventListener('submit', (event) => {
                event.preventDefault();
                registerButton.disabled = true; // Disable button during processing
                registerMessage.textContent = "Registering..."; // Provide feedback
                registerMessage.style.color = "blue";

                const selectedGender = [...genderInputs].find(input => input.checked)?.value || "";
                const password = passwordInput ? passwordInput.value : '';
                const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

                // Basic client-side validation
                if (password.length < 8) { // Adjusted minimum length
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

                // If validation passes, call the registration function
                registerUser(emailInput.value, password, usernameInput.value, firstnameInput.value, lastnameInput.value, contactInput.value, selectedGender);
            });
        } else {
            if (document.getElementById('registerModal')) { // Check if the modal exists
                console.error("Registration form or button not found inside #registerModal!");
            }
        }

        async function registerUser(email, password, username, firstname, lastname, contact, gender) {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                console.log("Auth success. UID:", user.uid);

                // Save additional user info to Firestore
                const userDocRef = doc(db, "users", user.uid); // Use doc() to get a DocumentReference
                await setDoc(userDocRef, {
                    email: email,
                    username: username,
                    firstname: firstname,
                    lastname: lastname,
                    contact: contact,
                    gender: gender,
                    createdAt: new Date(), // Timestamp of registration
                    isAdmin: false // Default role
                });
                console.log("Firestore save success.");

                registerMessage.textContent = "Registration successful!";
                registerMessage.style.color = "green";
                // Optionally close modal or redirect after short delay
                setTimeout(closeAllModals, 1500); // Close modal after 1.5 seconds

            } catch (error) {
                console.error("Registration error:", error);
                // Provide user-friendly error messages
                let errorMessage = "Registration failed. Please try again.";
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = "This email address is already registered.";
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = "Please enter a valid email address.";
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = "Password is too weak. Please use at least 8 characters."; // Updated message
                }
                registerMessage.textContent = errorMessage;
                registerMessage.style.color = "red";
            } finally {
                 // Re-enable button regardless of success or failure
                 if (registerButton) registerButton.disabled = false;
            }
        }


        // --- Firebase Login ---
        const loginForm = document.getElementById('loginForm');
        const loginEmailInput = document.getElementById('login-email');
        const loginPasswordInput = document.getElementById('login-password');
        const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
        const loginMessage = document.createElement('p'); // Create element for messages

        if (loginForm && loginButton) {
             loginMessage.classList.add('login-message'); // Add class for potential styling
             loginMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;"; // Basic styling
             // Insert message element before the button
             loginButton.parentNode.insertBefore(loginMessage, loginButton);

            loginForm.addEventListener('submit', (event) => {
                event.preventDefault();
                 loginButton.disabled = true; // Disable button
                 loginMessage.textContent = "Logging in..."; // Provide feedback
                 loginMessage.style.color = "blue";
                loginUser(loginEmailInput.value, loginPasswordInput.value);
            });
        } else {
            if (document.getElementById('loginModal')) { // Check if the modal exists
                console.error("Login form or button not found inside #loginModal!");
            }
        }


        async function loginUser(email, password) {
            // Basic client-side validation
            if (!email || !password) {
                 loginMessage.textContent = "Please enter both email and password.";
                 loginMessage.style.color = "red";
                 if (loginButton) loginButton.disabled = false; // Re-enable button
                 return;
            }

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                console.log("Login success. UID:", user.uid);

                // Admin Check - Fetch user data from Firestore
                const userDocRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(userDocRef);
                let isAdmin = false;
                if (docSnap.exists()) {
                    isAdmin = docSnap.data().isAdmin === true; // Check the isAdmin field
                } else {
                    // This case should ideally not happen if registration always creates a doc
                    console.warn("User document not found in Firestore for UID:", user.uid);
                    // Decide how to handle - log them in as regular user or show error?
                    // For now, treat as non-admin
                }

                loginMessage.textContent = "Login successful! Redirecting...";
                loginMessage.style.color = "green";

                // Redirect after a short delay
                setTimeout(() => {
                     closeAllModals(); // Close modal before redirecting
                    // Redirect based on admin status
                    window.location.href = isAdmin ? "admin-dashboard.html" : "dashboard.html";
                 }, 1500); // 1.5 second delay

            } catch (error) {
                console.error("Login error:", error);
                 // Provide user-friendly error messages
                 let errorMessage = "Login failed. Please check your credentials.";
                 if (error.code === 'auth/user-not-found' ||
                     error.code === 'auth/wrong-password' ||
                     error.code === 'auth/invalid-credential') { // More general invalid credential error
                     errorMessage = "Invalid email or password.";
                 } else if (error.code === 'auth/invalid-email') {
                     errorMessage = "Invalid email format.";
                 } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = "Access temporarily disabled due to too many failed login attempts. Please reset your password or try again later.";
                 }
                 // Add more specific error handling if needed

                 loginMessage.textContent = errorMessage;
                 loginMessage.style.color = "red";
                 if (loginButton) loginButton.disabled = false; // Re-enable button on failure
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
        const loginSignupLink = document.getElementById('loginSignupLink');         // The <a> element inside
        const userAccountNavLinkLI = document.getElementById('nav-user-account-li'); // The <li> element
        const userDropdown = document.getElementById('userDropdown');
        const logoutLink = document.getElementById('logout-link');

        // Function to close modals and clear messages/forms
        function closeAllModals() {
            if (registerModal) registerModal.style.display = "none";
            if (loginModal) loginModal.style.display = "none";
            // Clear messages only if the elements exist
            if (loginMessage && loginForm) loginMessage.textContent = '';
            if (registerMessage && registrationForm) registerMessage.textContent = '';
            // Reset form fields if needed (optional)
            if (loginForm) loginForm.reset();
            if (registrationForm) registrationForm.reset();
        }

        // Function to update Navigation based on login state
        function updateNavUI(user) {
            if (user) {
                // User is logged in
                if(loginSignupNavLinkLI) loginSignupNavLinkLI.style.display = 'none';
                if(userAccountNavLinkLI) userAccountNavLinkLI.style.display = 'list-item'; // Or 'block', 'flex' depending on CSS
                console.log("UI Update: User logged in, showing account icon");
            } else {
                // User is logged out
                if(loginSignupNavLinkLI) loginSignupNavLinkLI.style.display = 'list-item'; // Or 'block', 'flex'
                if(userAccountNavLinkLI) userAccountNavLinkLI.style.display = 'none';
                if(userDropdown) userDropdown.classList.remove('show-dropdown'); // Ensure dropdown is hidden
                console.log("UI Update: User logged out, showing login/signup link");
            }
        }

        // --- Event listeners for Login/Register Modals & Nav ---
        if (loginSignupLink && loginModal) {
            loginSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                closeAllModals(); // Close any open modal first
                loginModal.style.display = 'block';
            });
        } else {
            // Optional: Log if elements are missing on pages expected to have them
            // console.warn("Login link or modal not found.");
        }

        if (loginCloseButton) loginCloseButton.addEventListener('click', closeAllModals);
        if (registerCloseButton) registerCloseButton.addEventListener('click', closeAllModals);
        if (switchToRegister && registerModal) switchToRegister.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); registerModal.style.display = 'block'; });
        if (switchToLogin && loginModal) switchToLogin.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });

        // Close modals on outside click (only if click is directly on the modal overlay)
        window.addEventListener('click', (event) => {
            if (event.target === loginModal || event.target === registerModal) {
                 closeAllModals();
            }
        });

        // User Account Dropdown Toggle
        const userAccountIcon = document.getElementById('userAccountIcon');
        if (userAccountIcon && userDropdown && userAccountNavLinkLI) { // Check LI exists too
            userAccountIcon.addEventListener('click', (e) => {
                e.preventDefault();
                // Toggle a class on the dropdown itself
                userDropdown.classList.toggle('show-dropdown'); // You need CSS: .user-dropdown.show-dropdown { display: block; }
            });

            // Close dropdown if clicked outside the parent LI element
            window.addEventListener('click', (event) => {
                 // Check if the click target is NOT the icon AND NOT inside the dropdown menu itself
                 if (!userAccountNavLinkLI.contains(event.target)) {
                     userDropdown.classList.remove('show-dropdown');
                 }
            });
        }


        // Logout Link Logic
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                 if(userDropdown) userDropdown.classList.remove('show-dropdown'); // Close dropdown first
                 signOut(auth).then(() => {
                     console.log('User signed out successfully');
                     // UI update is handled by onAuthStateChanged below
                     // Optional: Redirect to home page after logout
                     // window.location.href = 'index.html';
                 }).catch((error) => {
                     console.error('Sign Out Error', error);
                     alert('Logout failed. Please try again.'); // Simple user notification
                 });
            });
        }

        // --- Initialize Auth State Listener ---
        // This listener runs once when the page loads and whenever the user logs in or out
        onAuthStateChanged(auth, (user) => {
            updateNavUI(user); // Update the navigation links
            if (user) {
                 console.log("Auth state changed: User is logged in", user.uid);
                 // Fetch user-specific data here if needed globally after login
            } else {
                 console.log("Auth state changed: User is logged out");
            }
        });


       


    }); // End of DOMContentLoaded listener

</script>
