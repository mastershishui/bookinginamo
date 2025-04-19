// firebase-auth.js - UPDATED with Live Chat Integration

// --- Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js"; // Use your specific version
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
    // Maybe add: signInAnonymously (if you want chat for non-logged-in users)
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    addDoc,             // <-- ADDED for chat
    serverTimestamp,    // <-- ADDED for chat
    onSnapshot,         // <-- ADDED for chat
    query,              // <-- ADDED for chat
    orderBy             // <-- ADDED for chat
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"; // Ensure version matches
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js"; // Optional

// --- Firebase Config ---
const firebaseConfig = {
    // Using the config you provided - MAKE SURE THIS IS CORRECT
    apiKey: "AIzaSyAp19_1RwloTbJLZ_K723-m8C2zka8Oh10",
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
// Existing Auth/Nav Variables
let loginSignupLink = null;
let loginSignupLi = null;
let loginModal = null;
let registerModal = null;
let loginMessage = null;
let registerMessage = null;
let myBookLinkLi = null;
let userAccountLi = null;
let logoutLink = null;
let dashboardWelcomeMessage = null;
let userAccountIcon = null;
let userDropdown = null;

// *** ADDED FOR LIVE CHAT: Global Variables ***
let chatWidgetContainer = null;
let chatOpenButton = null;
let chatWindow = null;
let chatCloseButton = null;
let chatMessagesDiv = null;
let chatInput = null;
let chatSendButton = null;

let currentUserId = null; // Store the logged-in user's ID (will be set in onAuthStateChanged)
let currentChatId = null; // Store the ID of the active chat document
let unsubscribeMessages = null; // Store the listener unsubscribe function
// *** END LIVE CHAT Global Variables ***
 // ================================================
    // --- Ad Notice Modal Script (ADDED HERE) ---      <--- SEE HERE
    // ================================================
    console.log("Ad modal script section REACHED."); // Log reaching this section

    // Get the modal elements for the Ad
    const adModal = document.getElementById('adNoticeModal');
    const closeAdButton = adModal ? adModal.querySelector('.close-ad-button') : null;
    const bookNowAdButton = adModal ? adModal.querySelector('.book-now-button') : null;

    // Function to open the Ad modal
    function openAdModal() {
        console.log("openAdModal function CALLED.");
        if (adModal) {
             adModal.classList.add('show-modal');
             console.log("Ad modal .show-modal class ADDED.");
        } else {
             // console.log("Ad modal element (#adNoticeModal) not found when trying to open.");
        }
    }

    // Function to close the Ad modal
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
        console.error("Ad modal close button (.close-ad-button) not found inside #adNoticeModal!");
    }

    // Optional: Close the modal if the user clicks the "Book Now" button
    if (bookNowAdButton) {
       // bookNowAdButton.addEventListener('click', closeAdModal); // Uncomment if needed
    } else if (adModal) {
       // console.error("Ad modal book now button (.book-now-button) not found inside #adNoticeModal!"); // Optional log
    }

    // Optional: Close the Ad modal if the user clicks anywhere outside the modal content
    // Add a separate listener specifically for the ad modal overlay
     if (adModal) {
        adModal.addEventListener('click', (event) => {
            if (event.target === adModal) {
                 console.log("Clicked on adModal overlay, closing.");
                 closeAdModal();
            }
        });
     }
    // --- End Ad Notice Modal Script ---
// --- Helper Function to Close Modals ---
// (Keep your existing closeAllModals function)
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
// (Keep your existing updateNavUI function)
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


// --- Helper Function to Protect Routes ---
// (Keep your existing protectRoute function)
function protectRoute(user) {
    const protectedPages = ['/dashboard.html', '/profile.html', '/mybook.html', '/admin-dashboard.html'];
    const currentPagePath = window.location.pathname;
    const isProtected = protectedPages.some(page => currentPagePath.endsWith(page));

    if (!user && isProtected) {
        console.log("User not logged in. Redirecting from protected route:", currentPagePath);
        window.location.href = '/index.html'; // Redirect to home
    }
}

// --- Update Dashboard Welcome Message ---
// (Keep your existing updateDashboardWelcome function)
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

// --- Firebase Logout Function ---
// (Keep your existing handleLogout function)
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
    // Existing Auth/Nav Elements
    loginSignupLink = document.getElementById('loginSignupLink');
    loginSignupLi = document.getElementById('nav-login-signup-li');
    loginModal = document.getElementById('loginModal');
    registerModal = document.getElementById('registerModal');
    myBookLinkLi = document.getElementById('nav-mybook-link-li');
    userAccountLi = document.getElementById('nav-user-account-li');
    logoutLink = document.getElementById('logout-link');
    dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message');
    userAccountIcon = document.getElementById('userAccountIcon');
    userDropdown = document.getElementById('userDropdown');

    // *** ADDED FOR LIVE CHAT: Select Live Chat Elements ***
    chatWidgetContainer = document.getElementById('chat-widget-container');
    chatOpenButton = document.getElementById('chat-open-button');
    chatWindow = document.getElementById('chat-window');
    chatCloseButton = document.getElementById('chat-close-button');
    chatMessagesDiv = document.getElementById('chat-messages');
    chatInput = document.getElementById('chat-input');
    chatSendButton = document.getElementById('chat-send-button');
    // *** END LIVE CHAT ELEMENT SELECTION ***


    // --- Setup Modal Listeners ---
    // (Keep your existing modal setup logic)
    const loginCloseButton = loginModal ? loginModal.querySelector('.login-close-button') : null;
    const registerCloseButton = registerModal ? registerModal.querySelector('.register-close-button') : null;
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');
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


    // --- User Dropdown Toggle Logic ---
    // (Keep your existing dropdown logic)
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
            if (userAccountLi.classList.contains('active') && !userAccountLi.contains(event.target)) {
                console.log("Clicked outside dropdown, closing.");
                userAccountLi.classList.remove('active');
                userAccountIcon.setAttribute('aria-expanded', 'false');
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
        console.warn("User account dropdown elements not all found. Dropdown will not function.");
    }


    // --- Firebase Registration Logic ---
    // (Keep your existing registration logic)
    const registrationForm = document.getElementById('registrationForm');
    const registerButton = registrationForm ? registrationForm.querySelector('button[type="submit"]') : null;
    registerMessage = document.createElement('p');
    if (registrationForm && registerButton) {
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


    // --- Firebase Login Logic ---
    // (Keep your existing login logic)
    const loginForm = document.getElementById('loginForm');
    const loginEmailInput = document.getElementById('login-email-user') || document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
    loginMessage = document.createElement('p');
    if (loginForm && loginButton && loginEmailInput && loginPasswordInput) {
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


    // *** ADDED FOR LIVE CHAT: Event Listeners Setup ***
    if (chatOpenButton && chatWindow && chatCloseButton && chatInput && chatSendButton && auth) { // Check auth too
        console.log("Chat elements found. Attaching chat listeners...");

        // Disable button initially; onAuthStateChanged will enable it
        chatOpenButton.disabled = true;

        // Open Chat Window
        chatOpenButton.addEventListener('click', () => {
            if (!currentUserId) { // Check if user is logged in
                console.error("Cannot open chat: No user ID.");
                // Show login modal if user tries to chat while logged out
                if(loginModal) loginModal.style.display = 'block';
                return;
            }
            if (chatWindow) chatWindow.style.display = 'flex';
            if (chatOpenButton) chatOpenButton.style.display = 'none';

            // Start a new chat or listen to existing one
            if (!currentChatId) { // Only start if no active chat ID for this session
                startNewChat(); // Defined below
            } else {
                 // If reopening the same session, ensure message listener is active
                 if (!unsubscribeMessages) {
                    listenForMessages(currentChatId); // Defined below
                 }
            }
        });

        // Close Chat Window
        chatCloseButton.addEventListener('click', () => {
            if (chatWindow) chatWindow.style.display = 'none';
            if (chatOpenButton) chatOpenButton.style.display = 'flex';

            // Unsubscribe from messages when chat is closed
            if (unsubscribeMessages) {
                unsubscribeMessages();
                unsubscribeMessages = null;
                console.log("Unsubscribed from chat messages.");
            }
            // Decide whether to reset currentChatId here.
            // currentChatId = null; // Uncomment for new chat each time
        });

        // Send Message Button
        chatSendButton.addEventListener('click', sendMessage); // Defined below

        // Send Message on Enter Key
        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                sendMessage(); // Defined below
            }
        });

    } else {
        console.warn("Chat Warning: Not all elements for chat widget found or Auth failed.");
    }
    // *** END LIVE CHAT EVENT LISTENERS SETUP ***


    // --- Setup Auth State Observer ---
    console.log("Setting up Firebase Auth state observer...");
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed! User:", user ? user.uid : 'None');

        // *** ADDED FOR LIVE CHAT: Update currentUserId and Chat Button State ***
        if (user) {
            currentUserId = user.uid; // Store the logged-in user's ID
            if (chatOpenButton) chatOpenButton.disabled = false; // Enable chat button
        } else {
            currentUserId = null; // Clear user ID on logout
            if (chatOpenButton) chatOpenButton.disabled = true; // Disable chat button

            // If chat window is open when user logs out, close it
            if (chatWindow && chatWindow.style.display !== 'none') {
                 if(chatCloseButton) chatCloseButton.click(); // Simulate click on close button
            }
            // Clean up chat state on logout
            currentChatId = null;
            if (unsubscribeMessages) {
                unsubscribeMessages();
                unsubscribeMessages = null;
            }
        }
        // *** END LIVE CHAT Auth State Update ***

        // Keep your existing logic:
        updateNavUI(user);
        protectRoute(user);

        if (window.location.pathname.includes('dashboard.html') && user) {
            updateDashboardWelcome(user);
        }
        if (window.location.pathname.includes('admin-dashboard.html') && user) {
            updateDashboardWelcome(user); // Reusing for admin for now
        }
    }); // End of onAuthStateChanged

}); // End of DOMContentLoaded listener


// --- Registration Function ---
// (Keep your existing registerUser function)
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


// --- Login Function ---
// (Keep your existing loginUser function)
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


// *** ADDED FOR LIVE CHAT: Chat Functions ***

// Function to start a new chat session in Firestore
async function startNewChat() {
    if (!currentUserId || !db) { // Check db instance exists
        console.error("Cannot start chat: Missing user ID or DB connection.");
        return;
    }
    console.log("Attempting to start new chat for user:", currentUserId);
    if(chatMessagesDiv) chatMessagesDiv.innerHTML = '<p>Starting new chat...</p>';

    try {
        const chatsCollectionRef = collection(db, "chats");
        // Add chat document to Firestore
        const newChatDocRef = await addDoc(chatsCollectionRef, {
            userId: currentUserId,
            createdAt: serverTimestamp(), // Use server time
            status: "new", // Initial status
            // Add userDisplayName, userEmail if available from auth or profile later
        });

        currentChatId = newChatDocRef.id; // Store the new chat ID
        console.log("New chat started with ID:", currentChatId);
        if(chatMessagesDiv) chatMessagesDiv.innerHTML = ''; // Clear status message

        // Start listening for messages in this new chat
        listenForMessages(currentChatId);

    } catch (error) {
        console.error("Error starting new chat:", error);
       if(chatMessagesDiv) chatMessagesDiv.innerHTML = '<p>Error starting chat. Please try closing and reopening.</p>';
    }
}

// Function to listen for messages in a specific chat
function listenForMessages(chatId) {
    if (!db || !chatMessagesDiv) { // Check dependencies
         console.error("Cannot listen for messages: Missing DB or messages container.");
         return;
    }
    console.log(`Listening for messages in chat: ${chatId}`);
    chatMessagesDiv.innerHTML = ''; // Clear previous

    const messagesCollectionRef = collection(db, "chats", chatId, "messages");
    // Create a query to order messages by timestamp
    const q = query(messagesCollectionRef, orderBy("timestamp", "asc"));

    // Detach any previous listener before starting a new one
    if (unsubscribeMessages) {
        unsubscribeMessages();
        console.log("Previous message listener unsubscribed.");
    }

    // Listen for real-time updates
    unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
        console.log("Received message snapshot");
        if(!chatMessagesDiv) return; // Check if element still exists
        chatMessagesDiv.innerHTML = ''; // Clear display area each time snapshot updates
        if (querySnapshot.empty) {
            chatMessagesDiv.innerHTML = '<p>No messages yet. Be the first!</p>';
        } else {
            querySnapshot.forEach((doc) => {
                displayMessage(doc.data()); // Display each message
            });
            // Scroll to the bottom of the chat messages div
            chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
        }
    }, (error) => {
        console.error("Error listening to messages: ", error);
        if(chatMessagesDiv) chatMessagesDiv.innerHTML = '<p>Error loading messages.</p>';
        unsubscribeMessages = null; // Clear listener on error
    });
}

// Function to display a single message in the chat window
function displayMessage(messageData) {
    if (!chatMessagesDiv) return; // Check element exists

    const msgElement = document.createElement('p');
    // Determine sender display name
    const sender = messageData.senderType === 'admin' ? 'Support' : 'You';
    // Use textContent for security
    msgElement.textContent = `${sender}: ${messageData.text}`;

    // Add CSS classes for styling based on sender
    msgElement.classList.add('chat-message');
    msgElement.classList.add(messageData.senderType === 'admin' ? 'admin-message' : 'user-message');

    chatMessagesDiv.appendChild(msgElement);
}

// Function to send a message to Firestore
async function sendMessage() {
    // Check all dependencies
    if (!chatInput || !currentChatId || !currentUserId || !db) {
        console.error("Cannot send message: Missing chatInput, currentChatId, currentUserId, or db.");
        return;
    }
    const messageText = chatInput.value.trim(); // Get text and remove whitespace
    if (messageText === '') {
        return; // Don't send empty messages
    }

    // Reference to the 'messages' subcollection for the current chat
    const messagesCollectionRef = collection(db, "chats", currentChatId, "messages");

    try {
        // Add the new message document
        await addDoc(messagesCollectionRef, {
            text: messageText,
            senderId: currentUserId, // ID of the logged-in user
            senderType: "user",      // Mark message as from a user
            timestamp: serverTimestamp() // Use server time for ordering
        });
        console.log("Message sent successfully.");
        chatInput.value = ''; // Clear the input field after sending

    } catch (error) {
        console.error("Error sending message:", error);
        // Optionally display an error message to the user in the chat window
    } finally {
        // Optional: Keep focus on the input field
        // chatInput.focus();
    }
}
// *** END LIVE CHAT FUNCTIONS ***

// === NEW: Hero Slider Script Added Here ===
        // ========================================
        const slides = document.querySelectorAll('.hero-slider .slide');
        // Check if the slider elements actually exist on the current page
        if (slides.length > 0) {
            let currentSlide = 0;
            const slideInterval = 3000; // Time per slide in milliseconds (5000ms = 5 seconds)

            function nextSlide() {
                // Hide the current slide (handle potential race condition if user clicks fast)
                if (slides[currentSlide]) {
                    slides[currentSlide].classList.remove('active');
                }

                // Calculate the next slide index
                currentSlide = (currentSlide + 1) % slides.length; // Loop back to 0 if at the end

                // Show the next slide
                 if (slides[currentSlide]) {
                    slides[currentSlide].classList.add('active');
                 }
            }

            // Make sure the first slide is active initially
            if (slides[currentSlide]) { // Check slide exists before adding class
               slides[currentSlide].classList.add('active');
            }

            // Start the automatic sliding
            const intervalID = setInterval(nextSlide, slideInterval);

             console.log("Hero slider initialized.");

            // Optional: Clear interval if the element is removed (less critical for simple pages)
            // slides[0]?.closest('.hero-slider')?.addEventListener('DOMNodeRemoved', () => clearInterval(intervalID));
        } else {
            // Optional: Log if slider isn't found on index.html (if expected)
            // if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
            //     console.log("Hero slider HTML elements not found on this page.");
            // }
        }
        // --- End Hero Slider Script ---

 
