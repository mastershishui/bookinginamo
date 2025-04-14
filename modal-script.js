// Inside modal-script.js, within the DOMContentLoaded listener

// --- Modal Opening/Closing Logic ---
const loginLink = document.getElementById('loginLink');
const registerLink = document.getElementById('registerLink');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const loginCloseButton = loginModal ? loginModal.querySelector('.login-close-button') : null;
const registerCloseButton = registerModal ? registerModal.querySelector('.register-close-button') : null;
const switchToRegister = document.getElementById('switchToRegister');
const switchToLogin = document.getElementById('switchToLogin');

// Function to close modals (should also be inside DOMContentLoaded or globally accessible)
function closeAllModals() {
    const loginMessage = loginForm ? loginForm.querySelector('.login-message') : null; // Find message elements if needed
    const registerMessage = registrationForm ? registrationForm.querySelector('.registration-message') : null; // Find message elements if needed

    if (registerModal) registerModal.style.display = "none";
    if (loginModal) loginModal.style.display = "none";
    // Clear messages when closing modals (optional)
    if (loginMessage) loginMessage.textContent = '';
    if (registerMessage) registerMessage.textContent = '';
}

// --- THIS IS THE CRUCIAL PART ---
// Add event listeners for modal controls
if (loginLink) {
    loginLink.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default anchor behavior
        closeAllModals();
        if (loginModal) loginModal.style.display = 'block';
        console.log("Login link clicked"); // Add for debugging
    });
} else {
    console.error("Login link element not found!"); // Check console for this
}

if (registerLink) {
    registerLink.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default anchor behavior
        closeAllModals();
        if (registerModal) registerModal.style.display = 'block';
        console.log("Register link clicked"); // Add for debugging
    });
} else {
    console.error("Register link element not found!"); // Check console for this
}

// Add listeners for close buttons, switch links, and background clicks
if (loginCloseButton) loginCloseButton.addEventListener('click', closeAllModals);
if (registerCloseButton) registerCloseButton.addEventListener('click', closeAllModals);
if (switchToRegister) switchToRegister.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); if (registerModal) registerModal.style.display = 'block'; });
if (switchToLogin) switchToLogin.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); if (loginModal) loginModal.style.display = 'block'; });

// Close modal if clicking outside of it
window.addEventListener('click', (event) => {
    if (event.target === loginModal || event.target === registerModal) {
        closeAllModals();
    }
});
// --- END OF CRUCIAL PART ---

// Ensure the login/register form variables are defined before being used in closeAllModals if messages are cleared there
const loginForm = document.getElementById('loginForm');
const registrationForm = document.getElementById('registrationForm');

// ... (rest of your modal-script.js, including loginUser, registerUser, etc.)
