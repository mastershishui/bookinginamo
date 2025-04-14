// modal-script.js (Replace the existing loginUser function with this)

async function loginUser(emailInput, password) { // Renamed parameter for clarity
    // --- Input Validation ---
    if (!emailInput || !password) {
        loginMessage.textContent = "Please enter email and password.";
        loginMessage.style.color = "red";
        if (loginButton) loginButton.disabled = false;
        return;
    }

    // --- Disable button and show progress ---
    if (loginButton) loginButton.disabled = true;
    loginMessage.textContent = "Logging in...";
    loginMessage.style.color = "blue";

    try {
        // --- Attempt Direct Email/Password Sign-in ---
        console.log("Attempting login with email:", emailInput);
        const userCredential = await signInWithEmailAndPassword(auth, emailInput, password);
        const user = userCredential.user;
        console.log("Login successful. UID:", user.uid);

        // --- Check for Admin Status (Keep this part) ---
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        let isAdmin = false;
        if (docSnap.exists() && docSnap.data().isAdmin === true) {
            isAdmin = true;
            console.log("User is an admin.");
        } else {
            console.log("User is not an admin or user doc not found.");
        }

        // --- Success Message and Redirect ---
        loginMessage.textContent = "Login successful! Redirecting...";
        loginMessage.style.color = "green";
        setTimeout(() => {
            window.location.href = isAdmin ? "admin-dashboard.html" : "dashboard.html";
        }, 1500); // 1.5 second delay before redirect

    } catch (error) {
        // --- Handle Login Errors ---
        console.error("Login failed:", error);
        // Provide user-friendly error messages based on Firebase error codes
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            loginMessage.textContent = "Invalid email or password.";
        } else if (error.code === 'auth/invalid-email') {
            loginMessage.textContent = "Invalid email format.";
        } else {
            loginMessage.textContent = "Login failed. Please try again."; // Generic error
        }
        loginMessage.style.color = "red";
        if (loginButton) loginButton.disabled = false; // Re-enable button on failure
    }
} // End of updated loginUser function

// --- Make sure the event listener calls this updated function ---
// (This part should already be in your modal-script.js)
if (loginForm && loginButton) {
    // ... (message element setup) ...
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = loginUsernameInput.value; // Get value from the input field
        const password = loginPasswordInput.value;
        loginUser(email, password); // Call the updated function
    });
}
