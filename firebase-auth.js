// firebase-auth.js - UPDATED with Live Chat Integration AND Ad Notice Modal

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
    addDoc,            // <-- ADDED for chat
    serverTimestamp,   // <-- ADDED for chat
    onSnapshot,        // <-- ADDED for chat
    query,             // <-- ADDED for chat
    orderBy            // <-- ADDED for chat
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"; // Ensure version matches
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js"; // Optional

// --- Firebase Config ---
const firebaseConfig = {
    // Using the config you provided - MAKE SURE THIS IS CORRECT
    apiKey: "AIzaSyAp19_1RwloTbJLZ_K723-m8C2zka8Oh10",
    authDomain: "gjsbooking-faba9.firebaseapp.com",
    projectId: "gjsbooking-faba9",
    storageBucket: "gjsbooking-faba9.appspot.com", // Ensure this is correct (often ends .firebaseapp.com too)
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
let myBookLinkLi = null;
let userAccountLi = null;
let logoutLink = null;
let dashboardWelcomeMessage = null;
let userAccountIcon = null;
let userDropdown = null;

// Live Chat Global Variables
let chatWidgetContainer = null;
let chatOpenButton = null;
let chatWindow = null;
let chatCloseButton = null;
let chatMessagesDiv = null;
let chatInput = null;
let chatSendButton = null;

let currentUserId = null; // Store the logged-in user's ID
let currentChatId = null; // Store the ID of the active chat document
let unsubscribeMessages = null; // Store the listener unsubscribe function

// --- Helper Function to Close Login/Register Modals ---
function closeAllModals() {
    if (registerModal) registerModal.style.display = "none";
    if (loginModal) loginModal.style.display = "none";
    // Clear messages
    const currentLoginMessage = document.querySelector('#loginModal .login-message');
    const currentRegisterMessage = document.querySelector('#registerModal .registration-message');
    if (currentLoginMessage) currentLoginMessage.textContent = '';
    if (currentRegisterMessage) currentRegisterMessage.textContent = '';
     // Optionally reset forms
     const loginFormElem = document.getElementById('loginForm');
     const registrationFormElem = document.getElementById('registrationForm');
     if (loginFormElem) loginFormElem.reset();
     if (registrationFormElem) registrationFormElem.reset();
}

// --- Helper Function to Update Navigation UI ---
function updateNavUI(user) {
    // Ensure elements are selected (fallback, ideally assigned in DOMContentLoaded)
    if (!loginSignupLi) loginSignupLi = document.getElementById('nav-login-signup-li');
    if (!myBookLinkLi) myBookLinkLi = document.getElementById('nav-mybook-link-li');
    if (!userAccountLi) userAccountLi = document.getElementById('nav-user-account-li'); // Use the LI ID
    if (!logoutLink) logoutLink = document.getElementById('logout-link');
    if (!userAccountIcon) userAccountIcon = document.getElementById('userAccountIcon');

    const displayStyle = 'list-item'; // Use 'list-item' for li elements, or 'block'/'flex' if needed

    if (user) {
        // --- User is Logged In ---
        if (loginSignupLi) loginSignupLi.style.display = 'none';
        if (myBookLinkLi) myBookLinkLi.style.display = displayStyle;
        if (userAccountLi) userAccountLi.style.display = displayStyle;

        if (userAccountLi) userAccountLi.classList.remove('active'); // Close dropdown on state change
        if (userAccountIcon) userAccountIcon.setAttribute('aria-expanded', 'false');

        // Setup logout link functionality (ensure it's only added once)
        if (logoutLink && !logoutLink.dataset.listenerAttached) {
            logoutLink.addEventListener('click', handleLogout);
            logoutLink.dataset.listenerAttached = 'true';
        }

    } else {
        // --- User is Logged Out ---
        if (loginSignupLi) loginSignupLi.style.display = displayStyle;
        if (myBookLinkLi) myBookLinkLi.style.display = 'none';
        if (userAccountLi) userAccountLi.style.display = 'none';

         if (userAccountLi) userAccountLi.classList.remove('active'); // Ensure dropdown closed
         if (userAccountIcon) userAccountIcon.setAttribute('aria-expanded', 'false');
    }
}

// --- Helper Function to Protect Routes ---
function protectRoute(user) {
    const protectedPages = ['/dashboard.html', '/profile.html', '/mybook.html', '/admin-dashboard.html'];
    // Ensure pathname comparison handles potential trailing slashes or variations
    const currentPagePath = window.location.pathname.replace(/\/$/, ""); // Remove trailing slash
    const isProtected = protectedPages.some(page => currentPagePath.endsWith(page.replace(/\/$/, "")));

    if (!user && isProtected) {
        console.log("User not logged in. Redirecting from protected route:", currentPagePath);
        window.location.href = '/index.html'; // Redirect to home (ensure this path is correct)
    }
}

// --- Update Dashboard Welcome Message ---
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
                // Prioritize firstname, then username, then email
                const name = userData.firstname || userData.username || user.email || "User";
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
async function handleLogout(event) {
    event.preventDefault();
    console.log("Logging out...");
    try {
        await signOut(auth);
        console.log("User signed out successfully.");
        // UI update is handled by onAuthStateChanged
        // Redirect immediately after sign-out confirmation
        window.location.href = '/index.html'; // Redirect to homepage
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
    dashboardWelcomeMessage = document.getElementById('dashboard-welcome-message'); // Might be null if not on dashboard
    userAccountIcon = document.getElementById('userAccountIcon');
    userDropdown = document.getElementById('userDropdown');

    // Live Chat Elements
    chatWidgetContainer = document.getElementById('chat-widget-container');
    chatOpenButton = document.getElementById('chat-open-button');
    chatWindow = document.getElementById('chat-window');
    chatCloseButton = document.getElementById('chat-close-button');
    chatMessagesDiv = document.getElementById('chat-messages');
    chatInput = document.getElementById('chat-input');
    chatSendButton = document.getElementById('chat-send-button');


    // --- Setup Modal Listeners ---
    const loginCloseButton = loginModal ? loginModal.querySelector('.login-close-button') : null;
    const registerCloseButton = registerModal ? registerModal.querySelector('.register-close-button') : null;
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');

    // Check for existence before adding listeners
    if (loginSignupLink && loginModal) {
        loginSignupLink.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });
    }
    if (loginCloseButton) loginCloseButton.addEventListener('click', closeAllModals);
    if (registerModal && registerCloseButton) registerCloseButton.addEventListener('click', closeAllModals);
    if (switchToRegister && registerModal) switchToRegister.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); registerModal.style.display = 'block'; });
    if (switchToLogin && loginModal) switchToLogin.addEventListener('click', (e) => { e.preventDefault(); closeAllModals(); loginModal.style.display = 'block'; });

    // Close login/register modals on outside click
     window.addEventListener('click', (event) => {
         if (event.target === loginModal || event.target === registerModal) {
              closeAllModals();
         }
     });


    // --- User Dropdown Toggle Logic ---
    if (userAccountIcon && userDropdown && userAccountLi) {
        console.log("Attaching dropdown toggle listeners.");
        userAccountIcon.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const isActive = userAccountLi.classList.toggle('active');
            userAccountIcon.setAttribute('aria-expanded', isActive);
            console.log("Dropdown toggled. Active:", isActive);
        });
        // Close dropdown if clicking anywhere else
        document.addEventListener('click', (event) => {
            if (userAccountLi.classList.contains('active') && !userAccountLi.contains(event.target)) {
                console.log("Clicked outside dropdown, closing.");
                userAccountLi.classList.remove('active');
                userAccountIcon.setAttribute('aria-expanded', 'false');
            }
        });
         // Close dropdown on Escape key
         window.addEventListener('keydown', (event) => {
             if (event.key === 'Escape' && userAccountLi.classList.contains('active')) {
                 console.log("Escape key pressed, closing dropdown.");
                 userAccountLi.classList.remove('active');
                 userAccountIcon.setAttribute('aria-expanded', 'false');
             }
         });
    } else {
        console.warn("User account dropdown elements not all found.");
    }


    // --- Firebase Registration Logic ---
    const registrationForm = document.getElementById('registrationForm');
    const registerButton = registrationForm ? registrationForm.querySelector('button[type="submit"]') : null;
    const registerMessageElem = document.createElement('p'); // Use different var name
    if (registrationForm && registerButton) {
         registerMessageElem.classList.add('registration-message');
         registerMessageElem.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
         if (!registrationForm.querySelector('.registration-message')) {
              registerButton.parentNode.insertBefore(registerMessageElem, registerButton.nextSibling);
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
            const currentRegisterMessage = registrationForm.querySelector('.registration-message'); // Get message element here

            // --- Validation ---
             if (!email || !password || !confirmPassword || !username || !firstname || !lastname || !contact || !selectedGender) {
                 if (currentRegisterMessage) { currentRegisterMessage.textContent = "Please fill in all fields."; currentRegisterMessage.style.color = "red"; } return;
             }
             if (password.length < 8) {
                  if (currentRegisterMessage) { currentRegisterMessage.textContent = "Password must be at least 8 characters long."; currentRegisterMessage.style.color = "red"; } return;
             }
             if (password !== confirmPassword) {
                  if (currentRegisterMessage) { currentRegisterMessage.textContent = "Passwords do not match."; currentRegisterMessage.style.color = "red"; } return;
             }
            // --- End Validation ---

            registerButton.disabled = true;
            if (currentRegisterMessage) { currentRegisterMessage.textContent = "Registering..."; currentRegisterMessage.style.color = "blue"; }

            registerUser(email, password, username, firstname, lastname, contact, selectedGender); // Call global function
        });
    }


    // --- Firebase Login Logic ---
    const loginForm = document.getElementById('loginForm');
    const loginEmailInput = document.getElementById('login-email'); // Use correct ID
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
    const loginMessageElem = document.createElement('p'); // Use different var name
    if (loginForm && loginButton && loginEmailInput && loginPasswordInput) {
         loginMessageElem.classList.add('login-message');
         loginMessageElem.style.cssText = "text-align: center; margin-top: 10px; font-weight: bold; color: blue;";
         if (!loginForm.querySelector('.login-message')) {
              loginButton.parentNode.insertBefore(loginMessageElem, loginButton.nextSibling);
         }
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;
            const currentLoginMessage = loginForm.querySelector('.login-message'); // Get message element here

            if (!email || !password) {
                 if (currentLoginMessage) { currentLoginMessage.textContent = "Please enter email and password."; currentLoginMessage.style.color = "red"; } return;
            }

            loginButton.disabled = true;
            if (currentLoginMessage) { currentLoginMessage.textContent = "Logging in..."; currentLoginMessage.style.color = "blue"; }

            loginUser(email, password); // Call global function
        });
    }


    // --- Live Chat Event Listeners Setup ---
    if (chatOpenButton && chatWindow && chatCloseButton && chatInput && chatSendButton && auth) {
        console.log("Chat elements found. Attaching chat listeners...");
        chatOpenButton.disabled = true; // Disabled until user logs in

        chatOpenButton.addEventListener('click', () => {
            if (!currentUserId) {
                console.error("Cannot open chat: User not logged in.");
                 if(loginModal && typeof closeAllModals === 'function') closeAllModals(); // Close others first
                 if(loginModal) loginModal.style.display = 'block'; // Show login modal
                return;
            }
            if (chatWindow) chatWindow.style.display = 'flex'; // Use flex for consistency
            if (chatOpenButton) chatOpenButton.style.display = 'none';

             if (!currentChatId) {
                 startNewChat();
             } else if (!unsubscribeMessages) { // Re-attach listener if needed
                 listenForMessages(currentChatId);
             }
        });

        chatCloseButton.addEventListener('click', () => {
            if (chatWindow) chatWindow.style.display = 'none';
            if (chatOpenButton) chatOpenButton.style.display = 'flex'; // Use flex for consistency
            if (unsubscribeMessages) {
                unsubscribeMessages();
                unsubscribeMessages = null;
                console.log("Unsubscribed from chat messages.");
            }
            // currentChatId = null; // Optional: uncomment for new chat each time
        });

        chatSendButton.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

    } else {
        console.warn("Chat Warning: Not all elements for chat widget found or Auth failed.");
    }

    // ================================================
    // --- Ad Notice Modal Script (ADDED HERE) ---
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
     if (adModal) { // Check if adModal exists before adding listener
        adModal.addEventListener('click', (event) => {
            // Check specifically for the ad modal overlay background (event.target is the overlay itself)
            if (event.target === adModal) {
                 console.log("Clicked on adModal overlay, closing.");
                 closeAdModal();
            }
        });
     }

    // --- End Ad Notice Modal Script ---


    // --- Setup Auth State Observer ---
    // Moved this setup to the end of DOMContentLoaded to ensure all UI elements it might affect are selected
    console.log("Setting up Firebase Auth state observer...");
    onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed! User:", user ? user.uid : 'None');

        // Update currentUserId for chat and chat button state
        if (user) {
            currentUserId = user.uid;
            if (chatOpenButton) chatOpenButton.disabled = false;
        } else {
            currentUserId = null;
            if (chatOpenButton) chatOpenButton.disabled = true;
            if (chatWindow && chatWindow.style.display !== 'none' && chatCloseButton) {
                 chatCloseButton.click(); // Close chat if open on logout
            }
            currentChatId = null; // Reset chat ID on logout
            if (unsubscribeMessages) { unsubscribeMessages(); unsubscribeMessages = null; } // Unsubscribe
        }

        // Update general UI
        updateNavUI(user);
        protectRoute(user);

        // Update dashboard welcome message if applicable
        const currentPath = window.location.pathname;
        if ((currentPath.includes('dashboard.html') || currentPath.includes('admin-dashboard.html')) && user) {
             updateDashboardWelcome(user);
        }
    }); // End of onAuthStateChanged

}); // End of DOMContentLoaded listener


// --- Registration Function ---
// Defined outside DOMContentLoaded as it's called by an event listener
async function registerUser(email, password, username, firstname, lastname, contact, gender) {
    const currentRegisterMessage = document.querySelector('#registrationForm .registration-message'); // Re-select here
    const registerButton = document.querySelector('#registrationForm button[type="submit"]'); // Re-select here
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Auth registration success. UID:", user.uid);
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { email, username, firstname, lastname, contact, gender, createdAt: serverTimestamp(), isAdmin: false }); // Use serverTimestamp
        console.log("Firestore user save success.");
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
// Defined outside DOMContentLoaded
async function loginUser(email, password) {
    const currentLoginMessage = document.querySelector('#loginForm .login-message'); // Re-select here
    const loginButton = document.querySelector('#loginForm button[type="submit"]'); // Re-select here
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Login Auth success. UID:", user.uid);
        // Check admin role immediately after login
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        let isAdmin = false;
        if (docSnap.exists()) { isAdmin = docSnap.data().isAdmin === true; }

        if (currentLoginMessage) { currentLoginMessage.textContent = "Login successful! Redirecting..."; currentLoginMessage.style.color = "green"; }
        // Redirect based on role
        setTimeout(() => {
            closeAllModals();
            window.location.href = isAdmin ? 'admin-dashboard.html' : 'dashboard.html';
        }, 1000);

    } catch (error) {
        console.error("Login Auth error:", error);
        let errorMessage = "Login failed.";
         if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
             errorMessage = "Invalid email or password.";
         } else if (error.code === 'auth/invalid-email') {
             errorMessage = "Invalid email format.";
         } else if (error.code === 'auth/too-many-requests') {
              errorMessage = "Access temporarily disabled (too many attempts). Try again later.";
         }
        if (currentLoginMessage) { currentLoginMessage.textContent = errorMessage; currentLoginMessage.style.color = "red"; }
    } finally {
         if (loginButton) loginButton.disabled = false; // Re-enable button on failure or success (before redirect)
    }
}


// --- Live Chat Functions ---
// Defined outside DOMContentLoaded

async function startNewChat() {
    if (!currentUserId || !db) { console.error("Chat Error: Missing user ID or DB."); return; }
    console.log("Starting new chat for user:", currentUserId);
     if(chatMessagesDiv) chatMessagesDiv.innerHTML = '<p>Connecting to chat...</p>'; // Initial message

    try {
        const chatsCollectionRef = collection(db, "chats");
        const newChatDocRef = await addDoc(chatsCollectionRef, {
            userId: currentUserId,
            createdAt: serverTimestamp(),
            status: "new",
             // Attempt to get user info if possible (may need adjustment based on when user data is available)
             userName: auth.currentUser?.displayName || auth.currentUser?.email || "User",
        });
        currentChatId = newChatDocRef.id;
        console.log("New chat started with ID:", currentChatId);
         if(chatMessagesDiv) chatMessagesDiv.innerHTML = ''; // Clear 'Connecting...'
        listenForMessages(currentChatId);
    } catch (error) {
        console.error("Error starting new chat:", error);
        if(chatMessagesDiv) chatMessagesDiv.innerHTML = '<p>Error starting chat. Please close and retry.</p>';
    }
}

function listenForMessages(chatId) {
    if (!db || !chatMessagesDiv) { console.error("Chat Error: Missing DB or messages container."); return; }
    console.log(`Listening for messages in chat: ${chatId}`);
    if(chatMessagesDiv) chatMessagesDiv.innerHTML = ''; // Clear previous

    const messagesCollectionRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesCollectionRef, orderBy("timestamp", "asc"));

    if (unsubscribeMessages) { unsubscribeMessages(); } // Unsubscribe previous listener

    unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
        console.log("Received message snapshot");
        if(!chatMessagesDiv) return; // Check if div still exists
        chatMessagesDiv.innerHTML = ''; // Clear display area
        if (querySnapshot.empty) {
            chatMessagesDiv.innerHTML = '<p>Chat started. Send a message!</p>';
        } else {
            querySnapshot.forEach((doc) => {
                displayMessage(doc.data());
            });
            chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; // Scroll to bottom
        }
    }, (error) => {
        console.error("Error listening to messages: ", error);
        if(chatMessagesDiv) chatMessagesDiv.innerHTML = '<p>Error loading messages.</p>';
        unsubscribeMessages = null;
    });
}

function displayMessage(messageData) {
    if (!chatMessagesDiv) return;
    const msgElement = document.createElement('div'); // Use div for better styling
    const senderSpan = document.createElement('span');
    const textSpan = document.createElement('span');

    senderSpan.classList.add('chat-sender');
    textSpan.classList.add('chat-text');

    const sender = messageData.senderType === 'admin' ? 'Support' : 'You';
    senderSpan.textContent = `${sender}: `;
    textSpan.textContent = messageData.text;

    msgElement.appendChild(senderSpan);
    msgElement.appendChild(textSpan);

    msgElement.classList.add('chat-message');
    msgElement.classList.add(messageData.senderType === 'admin' ? 'admin-message' : 'user-message');

    chatMessagesDiv.appendChild(msgElement);
}

async function sendMessage() {
    if (!chatInput || !currentChatId || !currentUserId || !db) { console.error("Chat Error: Cannot send message, missing context."); return; }
    const messageText = chatInput.value.trim();
    if (messageText === '') return;

    const messagesCollectionRef = collection(db, "chats", currentChatId, "messages");
    chatInput.disabled = true; // Disable input while sending
    chatSendButton.disabled = true;

    try {
        await addDoc(messagesCollectionRef, {
            text: messageText,
            senderId: currentUserId,
            senderType: "user",
            timestamp: serverTimestamp()
        });
        console.log("Message sent.");
        chatInput.value = ''; // Clear input
    } catch (error) {
        console.error("Error sending message:", error);
        alert("Message could not be sent. Please try again."); // Notify user
    } finally {
         chatInput.disabled = false; // Re-enable
         chatSendButton.disabled = false;
         chatInput.focus(); // Keep focus
    }
}

// --- Optional: Add Exports if needed ---
// export { auth, db, app };

i put the main.js code here in firebase-auth.js
