// admin-dashboard.js - UPDATED with Admin Chat Interface Logic

console.log("--- admin-dashboard.js script started ---"); // Debug Log

// Import necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js"; // Ensure version matches
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
    getFirestore, collection, doc, getDoc, query,
    orderBy, updateDoc, onSnapshot,
    where,            // <-- ADDED for chat query
    addDoc,           // <-- ADDED for sending chat messages
    serverTimestamp   // <-- ADDED for sending chat messages
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"; // Ensure version matches

console.log("Firebase modules imported."); // Debug Log

// Paste your Firebase config object here
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

console.log("Firebase config object defined."); // Debug Log

// Initialize Firebase
let app, auth, db;
try {
    // Using the updated initialization logic you provided
    console.log("Attempting Firebase initialization (using default instance)...");
    try {
        app = initializeApp(firebaseConfig);
        console.log("Firebase default instance initialized.");
    } catch (e) {
        if (e.code === 'duplicate-app') {
             console.log("Firebase default instance already exists, getting it.");
             // If initializeApp throws duplicate, getting the existing app might require
             // slightly different handling depending on Firebase version or setup context.
             // Often, just proceeding after the catch might be sufficient if the instance exists.
             // Re-initializing might still be needed in some module contexts. Let's assume this works for now.
             app = initializeApp(firebaseConfig); // Attempt to get/re-init
        } else {
            throw e; // Re-throw other initialization errors
        }
    }
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase Initialized for Admin Dashboard (using default instance).");
} catch (e) {
    console.error("Error initializing Firebase for Admin Dashboard:", e);
    alert("Critical Error: Could not initialize Firebase connection for Admin.");
    // Consider preventing further script execution if Firebase fails
}
// --- End Firebase Initialization ---

// --- Global variables ---
const logoutButton = document.getElementById('logout-button');
const bookingsTableBody = document.getElementById('bookings-table-body');
let bookingsListener = null; // To hold the unsubscribe function for the listener

// *** ADDED FOR ADMIN CHAT: Global Variables ***
let chatListUl = null;
let adminChatMessagesDiv = null;
let adminChatInput = null;
let adminChatSendButton = null;
let loadingChatsLi = null; // Reference to the loading chats indicator li
let conversationColumnDiv = null;

let currentAdminId = null; // Store Admin UID
let selectedChatId = null; // Store ID of chat being viewed
let unsubscribeChatList = null; // Listener for chat list
let unsubscribeMessages = null; // Listener for messages in selected chat
// *** END ADMIN CHAT Global Variables ***

// --- Helper: Format Date ---
// (Keep your existing formatBookingDate function)
function formatBookingDate(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        let date;
        if (timestamp && typeof timestamp.toDate === 'function') {
            date = timestamp.toDate();
        } else {
            // Attempt to parse if it's a string or number, might need adjustment
            date = new Date(timestamp);
        }
        if (isNaN(date.getTime())) {
             console.warn("Invalid date value received:", timestamp);
             return 'Invalid Date';
        }
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
        // Use 'en-US' as a fallback locale if navigator.language isn't reliable
        return date.toLocaleDateString(navigator.language || 'en-US', options);
    } catch (e) {
        console.error("Error formatting date:", timestamp, e);
        return String(timestamp); // Fallback to string representation
    }
}

// --- Function to Update Booking Status ---
// (Keep your existing updateBookingStatus function)
async function updateBookingStatus(bookingId, newStatus) {
    if (!bookingId || !newStatus) {
        console.error("Missing booking ID or new status");
        return false;
    }
    console.log(`Admin: Updating booking ${bookingId} to status: ${newStatus}`);
    const bookingRef = doc(db, "bookings", bookingId);
    try {
        await updateDoc(bookingRef, {
            status: newStatus,
            // Consider using serverTimestamp() for updates if precise time matters
            lastAdminUpdateTimestamp: serverTimestamp() // Firestore server time
        });
        console.log("Booking status updated successfully in Firestore.");
        return true;
    } catch (error) {
        console.error("Error updating booking status:", error);
        alert(`Failed to update booking: ${error.message}`);
        return false;
    }
}


// --- Function to Load Bookings (Using onSnapshot for Real-time) ---
// (Keep your existing loadBookings function)
function loadBookings() {
    if (!bookingsTableBody || !db) { // Add db check
        console.error("Bookings table body or DB not found/ready!");
        return;
    }
    bookingsTableBody.innerHTML = `<tr class="loading-message"><td colspan="9">Loading bookings...</td></tr>`;

    if (bookingsListener) {
        console.log("Detaching previous bookings listener.");
        bookingsListener(); // Call the unsubscribe function
        bookingsListener = null;
    }

    try {
        const bookingsCol = collection(db, "bookings");
        // Order by bookingRequestDate (server timestamp) descending
        const q = query(bookingsCol, orderBy("bookingRequestDate", "desc"));
        console.log("Setting up real-time bookings listener...");

        bookingsListener = onSnapshot(q, (querySnapshot) => {
            console.log(`Bookings snapshot received: ${querySnapshot.size} documents.`);
            if (!bookingsTableBody) return; // Check if element still exists
            bookingsTableBody.innerHTML = ''; // Clear existing rows

            if (querySnapshot.empty) {
                bookingsTableBody.innerHTML = `<tr><td colspan="9">No bookings found.</td></tr>`;
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const booking = docSnap.data();
                const bookingId = docSnap.id;
                const row = bookingsTableBody.insertRow();
                row.dataset.id = bookingId; // Store ID on the row

                // Populate cells carefully, checking for field existence
                row.insertCell().textContent = bookingId.substring(0, 8) + '...';
                row.insertCell().textContent = booking.customerName || booking.userEmail || 'N/A'; // Provide fallbacks
                row.insertCell().textContent = booking.customerContact || 'N/A';
                row.insertCell().textContent = booking.userEmail || 'N/A';
                row.insertCell().textContent = formatBookingDate(booking.bookingRequestDate); // Use helper
                row.insertCell().textContent = booking.bookingTime || 'N/A';
                row.insertCell().textContent = booking.serviceName || 'N/A';

                const statusCell = row.insertCell();
                const currentStatus = booking.status || 'Pending'; // Default status if missing
                statusCell.textContent = currentStatus;
                // Simple class based on status text
                statusCell.className = `status-${currentStatus.toLowerCase().replace(/\s+/g, '-')}`;

                const actionsCell = row.insertCell();
                actionsCell.classList.add('actions'); // Add class for styling/targeting
                actionsCell.innerHTML = ''; // Clear previous buttons

                // Add buttons based on status
                if (currentStatus === 'Pending Confirmation' || currentStatus === 'Pending') {
                    actionsCell.innerHTML = `
                        <button class="confirm-btn" title="Confirm Booking">✔️ Confirm</button>
                        <button class="reject-btn" title="Reject Booking">❌ Reject</button>
                    `;
                } else if (currentStatus === 'Confirmed') {
                    actionsCell.innerHTML = `<button class="cancel-booking-btn" title="Cancel Confirmed Booking">❌ Cancel</button>`;
                } else {
                    actionsCell.innerHTML = '-'; // No actions for other statuses?
                }
            });

        }, (error) => {
            // Error handler for the listener
            console.error("Error in bookings listener: ", error);
            if (bookingsTableBody) { // Check if table body still exists
                 bookingsTableBody.innerHTML = `<tr><td colspan="9">Error loading real-time bookings: ${error.message}</td></tr>`;
            }
            alert("Error receiving real-time booking updates. Please refresh or check console.");
            if (bookingsListener) bookingsListener(); // Attempt to unsubscribe on error
            bookingsListener = null;
        });

    } catch (error) {
        // Error setting up the query/listener itself
        console.error("Error setting up bookings listener query: ", error);
        if (bookingsTableBody) {
             bookingsTableBody.innerHTML = `<tr><td colspan="9">Error initializing booking listener: ${error.message}</td></tr>`;
        }
        alert("Failed to initialize booking listener.");
        if (bookingsListener) bookingsListener(); // Clean up if partially setup
        bookingsListener = null;
    }
}



// --- Setup Event Listeners for Action Buttons (using Event Delegation) ---
// (Keep your existing setupActionListeners function)
function setupActionListeners() {
    if (!bookingsTableBody) {
        console.error("Cannot setup listeners: Bookings table body not found!");
        return;
    }
    // Remove previous listener before adding a new one (safer if called multiple times)
    // bookingsTableBody.removeEventListener('click', handleBookingActionClick); // Need a named function
    // bookingsTableBody.addEventListener('click', handleBookingActionClick);

    // Or, less ideal but simpler for now if only called once:
     bookingsTableBody.addEventListener('click', async (event) => {
        const button = event.target.closest('button'); // Get the button element
        if (!button) return; // Exit if click wasn't on or inside a button

        const row = button.closest('tr'); // Get the table row
        const bookingId = row?.dataset?.id; // Get booking ID from data attribute

        if (!bookingId) {
            console.error("Could not determine booking ID for clicked action button.");
            return;
        }

        let newStatus = null;
        let confirmMessage = '';

        // Determine action based on button class
        if (button.classList.contains('confirm-btn')) {
            newStatus = 'Confirmed';
            confirmMessage = `Are you sure you want to CONFIRM booking ${bookingId.substring(0, 8)}...?`;
        } else if (button.classList.contains('reject-btn')) {
            newStatus = 'Rejected by Admin';
            confirmMessage = `Are you sure you want to REJECT booking ${bookingId.substring(0, 8)}...?`;
        } else if (button.classList.contains('cancel-booking-btn')) {
            newStatus = 'Cancelled by Admin';
            confirmMessage = `Are you sure you want to CANCEL the confirmed booking ${bookingId.substring(0, 8)}...?`;
        }

        // If a valid action was identified and user confirms
        if (newStatus && confirm(confirmMessage)) {
            button.disabled = true; // Prevent double clicks
            button.textContent = 'Updating...';
            const success = await updateBookingStatus(bookingId, newStatus); // Call update function

            // If update failed, re-enable button and reset text
            if (!success) {
                button.disabled = false;
                // Reset button text based on its class
                if (button.classList.contains('confirm-btn')) button.textContent = '✔️ Confirm';
                else if (button.classList.contains('reject-btn')) button.textContent = '❌ Reject';
                else if (button.classList.contains('cancel-booking-btn')) button.textContent = '❌ Cancel';
                else button.textContent = 'Action Failed'; // Fallback
            }
            // Note: If update succeeds, the real-time listener (onSnapshot)
            // in loadBookings() should automatically update the row in the UI.
        }
    });
    console.log("Action listeners set up on table body.");
}

// --- Wait for DOM to Load ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin Dashboard: DOM Loaded.");

    // Select Booking elements (Keep this)
    // const logoutButton = document.getElementById('logout-button'); // Already global
    // const bookingsTableBody = document.getElementById('bookings-table-body'); // Already global

    // *** ADDED FOR ADMIN CHAT: Select chat elements ***
    chatListUl = document.getElementById('chat-list');
    adminChatMessagesDiv = document.getElementById('admin-chat-messages');
    adminChatInput = document.getElementById('admin-chat-input');
    adminChatSendButton = document.getElementById('admin-chat-send-button');
    loadingChatsLi = document.getElementById('loading-chats'); // Get loading indicator
    conversationColumnDiv = document.getElementById('conversation-column'); // Get container
    // *** END ADMIN CHAT element selection ***


    // Add listener for sending chat messages (Keep this section)
    if (adminChatSendButton && adminChatInput) {
        adminChatSendButton.addEventListener('click', sendAdminMessage); // Defined below
        adminChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendAdminMessage(); // Defined below
        });
        // Initially disable send until a chat is selected
        adminChatInput.disabled = true;
        adminChatSendButton.disabled = true;
    } else {
        console.warn("Admin Chat send elements not found.");
    }

     // *** ADDED FOR ADMIN CHAT: Listener for chat list clicks ***
     if (chatListUl) {
        chatListUl.addEventListener('click', (event) => {
            const listItem = event.target.closest('li'); // Find the clicked list item
            // Ensure it's a valid list item with a chat ID and not the loading item
            if (listItem && listItem.dataset.chatId && !listItem.id?.includes('loading')) {
                 selectChat(listItem.dataset.chatId, listItem); // Defined below
            }
        });
        console.log("Chat list click listener attached.");
     } else {
          console.warn("Chat list UL element not found.");
     }
     // *** END ADMIN CHAT chat list listener ***


    // Add listener for logout button (Keep this section)
    // NOTE: Moved logout listener setup to end of script for clarity
    // if (logoutButton) { ... }

    // --- Authentication Check & Admin Verification ---
    // NOTE: Moved the onAuthStateChanged call outside DOMContentLoaded
    // to ensure it runs even if DOM is slow, but the inner logic
    // accessing DOM elements needs protection. Moved it back inside.

    console.log("Setting up onAuthStateChanged listener inside DOMContentLoaded...");
    if (auth) { // Check if auth initialized
        onAuthStateChanged(auth, async (user) => {
            console.log("onAuthStateChanged triggered inside DOMContentLoaded.");

            // Detach listeners on auth change
            if (bookingsListener) {
                console.log("Auth state changed: Detaching bookings listener.");
                bookingsListener(); bookingsListener = null;
            }
            if (unsubscribeChatList) {
                 console.log("Auth state changed: Detaching chat list listener.");
                unsubscribeChatList(); unsubscribeChatList = null;
            }
            if (unsubscribeMessages) {
                console.log("Auth state changed: Detaching messages listener.");
                unsubscribeMessages(); unsubscribeMessages = null;
            }
            selectedChatId = null;
            currentAdminId = null;
             // Reset chat UI on logout/auth change
             if(adminChatInput) adminChatInput.disabled = true;
             if(adminChatSendButton) adminChatSendButton.disabled = true;
             if(adminChatMessagesDiv) adminChatMessagesDiv.innerHTML = '<p>Please select a chat.</p>';
             if(chatListUl) chatListUl.innerHTML = '<li>Login required</li>';


            if (user) {
                console.log("Admin Page: User signed in:", user.uid);
                currentAdminId = user.uid; // Store admin ID
                const userDocRef = doc(db, "users", user.uid);
                console.log("Checking user document:", userDocRef.path);
                try {
                    const docSnap = await getDoc(userDocRef);
                    console.log("User document snapshot exists:", docSnap.exists());
                    if (docSnap.exists()) {
                         console.log("User document data:", docSnap.data());
                         console.log("isAdmin field value:", docSnap.data().isAdmin);
                         console.log("isAdmin field type:", typeof docSnap.data().isAdmin);
                    }

                    if (docSnap.exists() && docSnap.data().isAdmin === true) {
                        console.log("Admin verified.");
                        // Ensure DOM elements for bookings are ready before loading
                        if (bookingsTableBody) {
                            loadBookings();
                            setupActionListeners(); // Setup listeners after table body confirmed
                        } else {
                            console.error("Bookings table body not ready when admin verified.");
                        }
                        // Ensure DOM elements for chat are ready before loading
                        if (chatListUl) {
                             loadChatList(); // Defined below
                        } else {
                             console.error("Chat list UL not ready when admin verified.");
                        }

                    } else {
                        // Handle non-admin or missing doc
                        console.log("User is not an admin OR isAdmin check failed. Redirecting...");
                        if (!docSnap.exists()) console.log("Reason: Document does not exist.");
                        else if (docSnap.data().isAdmin !== true) console.log(`Reason: isAdmin value is '${docSnap.data().isAdmin}', not true.`);
                        alert("Access denied. Administrator privileges required.");
                        window.location.href = 'index.html';
                    }
                } catch (error) {
                    console.error("Error fetching user admin status:", error);
                    alert("Error verifying admin status. Redirecting.");
                    window.location.href = 'index.html';
                }
            } else {
                console.log("Admin Page: No user signed in. Redirecting...");
                window.location.href = 'index.html';
            }
        }); // End onAuthStateChanged
        console.log("onAuthStateChanged listener attached.");
    } else {
        console.error("Auth service not available when attaching listener.");
        // Maybe display an error message on the page
    }


    // --- Logout Functionality --- (Moved listener setup here)
    if (logoutButton && auth) { // Also check if auth is available
        logoutButton.addEventListener('click', () => {
            // Detach Firestore listeners before signing out
            if (bookingsListener) {
                console.log("Logging out, detaching bookings listener.");
                bookingsListener(); bookingsListener = null;
            }
            if (unsubscribeChatList) {
                 console.log("Logging out, detaching chat list listener.");
                unsubscribeChatList(); unsubscribeChatList = null;
            }
             if (unsubscribeMessages) {
                 console.log("Logging out, detaching messages listener.");
                unsubscribeMessages(); unsubscribeMessages = null;
            }

            signOut(auth).then(() => {
                console.log("Admin signed out successfully.");
                window.location.href = "index.html"; // Redirect after sign out
            }).catch((error) => {
                console.error("Sign out error:", error);
                alert("Error signing out.");
            });
        });
        console.log("Logout listener attached.");
    } else if (!logoutButton) {
        console.error("Logout button not found!");
    } else if (!auth) {
         console.error("Auth service not available for logout button.");
    }


}); // --- End of DOMContentLoaded listener ---


// --- Registration Function --- (Keep if needed, or remove if only admins use this page)
// async function registerUser(...) { ... }

// --- Login Function --- (Keep if needed, or remove if only admins use this page)
// async function loginUser(...) { ... }


// *** ADDED FOR ADMIN CHAT: Chat Functions ***

// --- Load List of Chats ---
function loadChatList() {
    if (!db || !chatListUl) {
        console.error("Cannot load chat list: Missing db or chatListUl");
        return;
    }
    console.log("Loading chat list...");
    // Ensure loading indicator exists and display it
    if (loadingChatsLi) {
         loadingChatsLi.style.display = 'list-item'; // Make sure it's visible
         chatListUl.innerHTML = ''; // Clear previous items except loading maybe
         chatListUl.appendChild(loadingChatsLi); // Add loading indicator
    } else {
         chatListUl.innerHTML = '<li>Loading chats...</li>'; // Fallback text
    }


    const chatsQuery = query(collection(db, "chats"),
                           where("status", "in", ["new", "active"]),
                           orderBy("createdAt", "desc"));

    if (unsubscribeChatList) unsubscribeChatList(); // Unsubscribe previous listener

    unsubscribeChatList = onSnapshot(chatsQuery, (querySnapshot) => {
        console.log("Received chat list snapshot.");
        if (!chatListUl) return; // Check again inside async callback
        chatListUl.innerHTML = ''; // Clear previous list (including loading)

        if (querySnapshot.empty) {
            chatListUl.innerHTML = '<li>No active chats.</li>';
        } else {
            querySnapshot.forEach((doc) => {
                renderChatListItem(doc.id, doc.data()); // Defined below
            });
        }
    }, (error) => {
        console.error("Error loading chat list:", error);
        if (chatListUl) chatListUl.innerHTML = '<li>Error loading chats.</li>';
        unsubscribeChatList = null;
    });
}

// --- Render a Single Chat in the List ---
function renderChatListItem(chatId, chatData) {
    if (!chatListUl) return;

    const listItem = document.createElement('li');
    listItem.dataset.chatId = chatId;

    const userDisplay = chatData.userId.substring(0, 8) + '...';
    const status = chatData.status || 'unknown';
    let timestamp = 'No time';
    if (chatData.createdAt?.toDate) {
         try {
            timestamp = chatData.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
         } catch (e) { console.error("Error formatting chat timestamp:", e); }
    }

    listItem.innerHTML = `
        <span>${userDisplay} (${status})</span>
        <small>${timestamp}</small>
    `;

     // Highlight if it's the currently selected chat
     if (chatId === selectedChatId) {
        listItem.classList.add('selected-chat');
    }

    // Note: Click listener is handled by delegation on chatListUl

    chatListUl.appendChild(listItem);
}

// --- Handle Selecting a Chat ---
async function selectChat(chatId, clickedListItem) {
    if (!db || !currentAdminId || !chatId) {
         console.error("Cannot select chat: Missing required info.");
         return;
    }
    if (chatId === selectedChatId && unsubscribeMessages) {
        console.log("Chat already selected.");
        return; // Avoid re-selecting and re-attaching listener
    }
    console.log("Selecting chat:", chatId);

     // Update UI for selected item
     const currentlySelected = chatListUl?.querySelector('.selected-chat');
     if (currentlySelected) currentlySelected.classList.remove('selected-chat');
     if (clickedListItem) clickedListItem.classList.add('selected-chat');


    selectedChatId = chatId; // Set the global selected ID

    // Update message area and enable input
    if (adminChatMessagesDiv) adminChatMessagesDiv.innerHTML = '<p>Loading messages...</p>';
    if (adminChatInput) adminChatInput.disabled = false;
    if (adminChatSendButton) adminChatSendButton.disabled = false;

    // Update chat status in Firestore if it was 'new'
    try {
        const chatDocRef = doc(db, "chats", chatId);
        const chatSnap = await getDoc(chatDocRef);

        if (chatSnap.exists() && chatSnap.data().status === 'new') {
             console.log(`Updating chat ${chatId} status to active, admin: ${currentAdminId}`);
             await updateDoc(chatDocRef, {
                status: "active",
                adminId: currentAdminId // Assign current admin
             });
             // The list listener will update the UI status text automatically
        }
        // Regardless of status update, start listening for messages
        listenForAdminMessages(chatId); // Defined below

    } catch (error) {
         console.error(`Error updating chat ${chatId} status or getting doc:`, error);
         if (adminChatMessagesDiv) adminChatMessagesDiv.innerHTML = '<p>Error selecting chat.</p>';
         if (adminChatInput) adminChatInput.disabled = true; // Disable input on error
         if (adminChatSendButton) adminChatSendButton.disabled = true;
         selectedChatId = null; // Reset selection on error
    }
}

// --- Listen for Messages (Admin Side) ---
function listenForAdminMessages(chatId) {
    if (!db || !adminChatMessagesDiv || !chatId) {
        console.error("Cannot listen for messages: Missing db, div, or chatId.");
        return;
    }
    console.log(`Admin listening for messages in chat: ${chatId}`);

    const messagesCollectionRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesCollectionRef, orderBy("timestamp", "asc"));

    // Detach previous message listener
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }

    unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
        console.log("Admin received message snapshot for chat:", chatId);
        // Check if this is still the selected chat and the element exists
        if (!adminChatMessagesDiv || selectedChatId !== chatId) {
             console.log("Message snapshot is for a no-longer-selected chat or div is missing. Unsubscribing.");
             if (unsubscribeMessages) unsubscribeMessages();
             unsubscribeMessages = null;
             return;
        }
        adminChatMessagesDiv.innerHTML = ''; // Clear display

        if (querySnapshot.empty) {
            adminChatMessagesDiv.innerHTML = '<p>No messages in this chat yet.</p>';
        } else {
            querySnapshot.forEach((doc) => {
                displayAdminChatMessage(doc.data()); // Defined below
            });
            // Scroll to bottom
            adminChatMessagesDiv.scrollTop = adminChatMessagesDiv.scrollHeight;
        }
    }, (error) => {
        console.error(`Admin error listening to messages for chat ${chatId}:`, error);
        // Only update UI if this is still the selected chat
        if (adminChatMessagesDiv && selectedChatId === chatId) {
             adminChatMessagesDiv.innerHTML = '<p>Error loading messages.</p>';
        }
        unsubscribeMessages = null; // Clear listener on error
    });
}

// --- Display Message (Admin Side) ---
function displayAdminChatMessage(messageData) {
    if (!adminChatMessagesDiv) return;

    const msgElement = document.createElement('p');
    const senderPrefix = messageData.senderType === 'admin'
        ? `You (${currentAdminId?.substring(0,5)}...)` // Use currentAdminId
        : `User (${messageData.senderId?.substring(0,5)}...)`; // Use ID from message

    msgElement.innerHTML = `<strong>${senderPrefix}:</strong> `;
    msgElement.appendChild(document.createTextNode(messageData.text)); // Append text safely

    msgElement.classList.add('chat-message');
    msgElement.classList.add(messageData.senderType === 'admin' ? 'admin-message' : 'user-message');

    adminChatMessagesDiv.appendChild(msgElement);
}

// --- Send Admin Reply ---
async function sendAdminMessage() {
    if (!adminChatInput || !selectedChatId || !currentAdminId || !db) {
        console.error("Cannot send reply: Missing dependencies.");
        return;
    }
    const messageText = adminChatInput.value.trim();
    if (messageText === '') return;

    const messagesCollectionRef = collection(db, "chats", selectedChatId, "messages");

    // Disable input temporarily
    adminChatInput.disabled = true;
    adminChatSendButton.disabled = true;

    try {
        await addDoc(messagesCollectionRef, {
            text: messageText,
            senderId: currentAdminId, // Admin's UID
            senderType: "admin",      // Mark as admin message
            timestamp: serverTimestamp()
        });
        console.log("Admin reply sent for chat:", selectedChatId);
        adminChatInput.value = ''; // Clear input

    } catch (error) {
        console.error("Error sending admin reply:", error);
        alert("Error sending reply. Please try again.");
    } finally {
        // Re-enable input only if a chat is still selected
        if (selectedChatId) {
            adminChatInput.disabled = false;
            adminChatSendButton.disabled = false;
            adminChatInput.focus(); // Set focus back
        } else {
            adminChatInput.disabled = true;
            adminChatSendButton.disabled = true;
        }
    }
}

// *** END ADMIN CHAT Functions ***


console.log("--- admin-dashboard.js script finished ---"); // Debug Log
