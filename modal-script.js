// modal-script.js
import { auth, db } from './firebase-config.js'; // Import shared Firebase services
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { collection, doc, setDoc, getDoc, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

    // --- Firebase Registration ---
    const registrationForm = document.getElementById('registrationForm');
    const emailInput = document.getElementById('reg-email');
    // ... (get all other registration form elements: password, confirm, username, etc.)
    const registerButton = registrationForm ? registrationForm.querySelector('button[type="submit"]') : null;
    const registerMessage = document.createElement('p'); // Create dynamically or get existing element

    if (registrationForm && registerButton) {
        // Append message element if created dynamically
        registerMessage.classList.add('registration-message');
         registerMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
         registrationForm.appendChild(registerMessage);

        registrationForm.addEventListener('submit', (event) => {
            event.preventDefault();
            // ... (Your existing registration validation logic: check passwords match, fields filled) ...

            // Get values from form
            const email = emailInput.value;
            const password = document.getElementById('reg-password').value;
            const username = document.getElementById('reg-username').value;
             const firstname = document.getElementById('reg-firstname').value;
             const lastname = document.getElementById('reg-lastname').value;
             const contact = document.getElementById('reg-contact').value;
             const genderInputs = document.getElementsByName('gender');
             const selectedGender = [...genderInputs].find(input => input.checked)?.value || "";


            // Call the registration function
            registerUser(email, password, username, firstname, lastname, contact, selectedGender);
        });
    } else { console.error("Registration form or button not found!"); }

    async function registerUser(email, password, username, firstname, lastname, contact, gender) {
         registerButton.disabled = true;
         registerMessage.textContent = "Registering...";
         registerMessage.style.color = "blue";
        try {
            // ... (Your existing createUserWithEmailAndPassword and setDoc logic) ...
             const userCredential = await createUserWithEmailAndPassword(auth, email, password);
             const user = userCredential.user;
             const userDocRef = doc(db, "users", user.uid);
             await setDoc(userDocRef, { email, username, firstname, lastname, contact, gender, createdAt: new Date(), isAdmin: false });

            console.log("Registration successful.");
            registerMessage.textContent = "Registration successful! You can now log in.";
            registerMessage.style.color = "green";
            // Consider closing the modal or switching to login automatically
             setTimeout(() => {
                closeAllModals(); // Assumes closeAllModals is available or defined here
                document.getElementById('loginModal').style.display = 'block'; // Open login modal
             }, 2000);


        } catch (error) {
            console.error("Registration error:", error);
             // ... (Your existing error handling logic) ...
             let errorMessage = "Registration failed.";
             if (error.code === 'auth/email-already-in-use') errorMessage = "Email already in use.";
             else if (error.code === 'auth/invalid-email') errorMessage = "Invalid email format.";
             else if (error.code === 'auth/weak-password') errorMessage = "Password needs 6+ characters.";
             registerMessage.textContent = errorMessage;
             registerMessage.style.color = "red";

        } finally {
            if (registerButton) registerButton.disabled = false;
        }
    }


    // --- Firebase Login ---
    const loginForm = document.getElementById('loginForm');
    const loginUsernameInput = document.getElementById('login-email-user');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
    const loginMessage = document.createElement('p'); // Create dynamically or get existing

    if (loginForm && loginButton) {
        loginMessage.classList.add('login-message');
        loginMessage.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
        loginForm.appendChild(loginMessage);

        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            // Get values
            const usernameOrEmail = loginUsernameInput.value; // User might enter username or email
            const password = loginPasswordInput.value;
            // Call the login function
            loginUser(usernameOrEmail, password);
        });
    } else { console.error("Login form or button not found!"); }


    async function loginUser(usernameOrEmailInput, password) {
         loginButton.disabled = true;
         loginMessage.textContent = "Logging in...";
         loginMessage.style.color = "blue";

        if (!usernameOrEmailInput || !password) {
            loginMessage.textContent = "Please enter username/email and password.";
            loginMessage.style.color = "red";
            if (loginButton) loginButton.disabled = false;
            return;
        }

        let userEmail = null;
         let isLoginSuccessful = false; // Flag for success

         try {
            // --- Step 1: Check if input is an email. If so, try direct login ---
            if (usernameOrEmailInput.includes('@')) {
                console.log("Attempting login with email:", usernameOrEmailInput);
                 try {
                    const userCredential = await signInWithEmailAndPassword(auth, usernameOrEmailInput, password);
                    console.log("Direct email login success.");
                     isLoginSuccessful = true; // Mark as successful
                     userEmail = usernameOrEmailInput; // We know the email
                 } catch (emailError) {
                     // Ignore 'user-not-found' or 'wrong-password' here, proceed to username check
                    if (emailError.code !== 'auth/user-not-found' && emailError.code !== 'auth/wrong-password' && emailError.code !== 'auth/invalid-credential') {
                         console.error("Email login attempt error (not user/pass related):", emailError);
                         // Rethrow other errors if needed, or handle specifically
                     } else {
                         console.log("Direct email login failed, proceeding to check as username.");
                     }
                 }
            }

            // --- Step 2: If not logged in yet, assume input is a username and look it up ---
             if (!isLoginSuccessful) {
                 console.log("Attempting login by looking up username:", usernameOrEmailInput);
                 loginMessage.textContent = "Verifying username...";
                 const usersRef = collection(db, "users");
                 const q = query(usersRef, where("username", "==", usernameOrEmailInput), limit(1)); // Case-sensitive match
                 const querySnapshot = await getDocs(q);

                 if (!querySnapshot.empty) {
                     querySnapshot.forEach((doc) => {
                         userEmail = doc.data().email; // Get the email associated with the username
                     });
                     console.log(`Found email ${userEmail} for username ${usernameOrEmailInput}. Attempting sign in.`);

                     if (userEmail) {
                         // Now try signing in with the FOUND email and original password
                        const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
                        console.log("Username lookup + email sign-in success.");
                         isLoginSuccessful = true;
                     } else {
                         console.error("Username found, but email missing in Firestore document!");
                         // Don't set isLoginSuccessful = true
                     }
                 } else {
                     console.log("Username not found in Firestore.");
                     // Don't set isLoginSuccessful = true
                 }
             }


             // --- Step 3: Handle outcome ---
             if (isLoginSuccessful && auth.currentUser) {
                console.log("Login successful overall. UID:", auth.currentUser.uid);

                // Check for Admin status
                const userDocRef = doc(db, "users", auth.currentUser.uid);
                const docSnap = await getDoc(userDocRef);
                let isAdmin = false;
                if (docSnap.exists() && docSnap.data().isAdmin === true) {
                    isAdmin = true;
                }

                loginMessage.textContent = "Login successful! Redirecting...";
                loginMessage.style.color = "green";
                // Redirect after a short delay
                 setTimeout(() => {
                    window.location.href = isAdmin ? "admin-dashboard.html" : "dashboard.html";
                }, 1500);

             } else {
                // If we reached here, login failed either by email or username lookup
                console.log("Login failed: Invalid username/email or password.");
                loginMessage.textContent = "Invalid username/email or password.";
                loginMessage.style.color = "red";
                 if (loginButton) loginButton.disabled = false;
             }

         } catch (error) {
             // Catch errors from Firestore query or the second signInWithEmailAndPassword attempt
             console.error("Login process error:", error);
            loginMessage.textContent = "Login failed. Please try again."; // Generic error for unexpected issues
             // More specific error handling based on error.code if needed
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                 loginMessage.textContent = "Invalid username/email or password.";
             } else if (error.code === 'auth/user-not-found') {
                 loginMessage.textContent = "Account not found.";
             }
            loginMessage.style.color = "red";
            if (loginButton) loginButton.disabled = false;
         }
    } // End of loginUser function


    // --- Modal Opening/Closing Logic ---
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

    // Add event listeners for modal controls
    if (loginLink) loginLink.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); if(loginModal) loginModal.style.display = 'block'; });
    if (registerLink) registerLink.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); if(registerModal) registerModal.style.display = 'block'; });
    if (loginCloseButton) loginCloseButton.addEventListener('click', closeAllModals);
    if (registerCloseButton) registerCloseButton.addEventListener('click', closeAllModals);
    if (switchToRegister) switchToRegister.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); if(registerModal) registerModal.style.display = 'block'; });
    if (switchToLogin) switchToLogin.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); if(loginModal) loginModal.style.display = 'block'; });

    // Close modal if clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === loginModal || event.target === registerModal) {
            closeAllModals();
        }
    });

}); // End DOMContentLoaded for modal script
