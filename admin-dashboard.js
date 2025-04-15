// admin-dashboard.js

// --- IMPORTANT: Firebase Initialization ---
// Option 1: If you setup firebase-auth.js to export db and auth (Recommended)
// import { auth, db } from './firebase-auth.js'; // Adjust path as needed

// Option 2: Initialize Firebase again here (as provided)
// Note: It's generally better to initialize Firebase only ONCE in your application.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, query, orderBy, updateDoc, where } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"; // Added updateDoc, query, orderBy, where

// Paste your Firebase config object here
const firebaseConfig = {
    apiKey: "AIzaSyAp19_1RwloTbJLZ_K723-m8C2zka8Oh10", // --- USE YOUR ACTUAL KEY ---
    authDomain: "gjsbooking-faba9.firebaseapp.com",
    projectId: "gjsbooking-faba9",
    // storageBucket: "gjsbooking-faba9.firebasestorage.app", // Check if this matches your project, often ends in .appspot.com
    storageBucket: "gjsbooking-faba9.appspot.com", // Corrected potential typo
    messagingSenderId: "708149149410",
    appId: "1:708149149410:web:dde6a5b99b4900dd8c28bb",
    measurementId: "G-5QB9413PJH" // Optional
};

// Initialize Firebase
let app, auth, db;
try {
    // Check if Firebase app named '[DEFAULT]' already exists
    // This is a simple check, more robust checks might be needed in complex scenarios
    const existingApp = initializeApp(firebaseConfig, '[DEFAULT]'); // Attempt to initialize
    app = existingApp;

    // Or if using getApps():
    // if (getApps().length === 0) {
    //     app = initializeApp(firebaseConfig);
    // } else {
    //     app = getApp(); // Get existing default app
    // }
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase Initialized for Admin Dashboard.");
} catch (e) {
    // Firebase throws an error if [DEFAULT] app already exists without providing name
    if (/already exists/.test(e.message)) {
        console.warn("Firebase app '[DEFAULT]' already exists. Getting existing instance.");
        // Potentially need getApp() from firebase/app if not using named apps
        // This part can be tricky without proper module sharing.
        // Assuming the instance created by firebase-auth.js might be accessible
        // If not, you MUST ensure only one initialization happens.
        // For now, proceed assuming db/auth might be available via other means if error occurs
        if (!auth) auth = getAuth(); // Try getting default auth instance
        if (!db) db = getFirestore(); // Try getting default firestore instance
    } else {
        console.error("Error initializing Firebase from admin-dashboard.js:", e);
        alert("Critical Error: Could not initialize Firebase connection.");
    }
}
// --- End Firebase Initialization ---


const logoutButton = document.getElementById('logout-button');
const bookingsTableBody = document.getElementById('bookings-table-body');

// --- Helper: Format Date ---
function formatBookingDate(isoDateString) {
    if (!isoDateString) return 'N/A';
    try {
        const date = new Date(isoDateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
        return date.toLocaleDateString('en-US', options);
    } catch (e) { return isoDateString; }
}

// --- Authentication Check & Admin Verification ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Admin Page: User signed in:", user.uid);
        const userDocRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data().isAdmin === true) {
                console.log("Admin verified.");
                loadBookings(); // Load bookings for verified admin
                setupActionListeners(); // Setup listeners for buttons
            } else {
                console.log("User is not an admin. Redirecting...");
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
        window.location.href = 'index.html'; // Redirect to home or login page
    }
});

// --- Logout Functionality ---
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("Admin signed out.");
            window.location.href = "index.html";
        }).catch((error) => {
            console.error("Sign out error:", error);
            alert("Error signing out.");
        });
    });
} else {
    console.error("Logout button not found!");
}

// --- Function to Load Bookings ---
async function loadBookings() {
    if (!bookingsTableBody) {
        console.error("Bookings table body not found!");
        return;
    }
    bookingsTableBody.innerHTML = '<tr class="loading-message"><td colspan="8">Loading bookings...</td></tr>';

    try {
        const bookingsCol = collection(db, "bookings");
        // Order by request date, newest first
        const q = query(bookingsCol, orderBy("bookingRequestDate", "desc"));
        const querySnapshot = await getDocs(q);

        bookingsTableBody.innerHTML = ''; // Clear loading message

        if (querySnapshot.empty) {
            bookingsTableBody.innerHTML = '<tr><td colspan="8">No bookings found.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const booking = docSnap.data();
            const bookingId = docSnap.id;

            const row = bookingsTableBody.insertRow();
            row.dataset.id = bookingId; // Add ID to row for context

            // Populate cells using data saved by booking.js
            row.insertCell().textContent = bookingId.substring(0, 8) + '...'; // Shorten ID display
            // --- Fetching Customer Name is complex here, using email as placeholder ---
            row.insertCell().textContent = booking.userEmail || 'N/A'; // Display email for now
            row.insertCell().textContent = 'N/A'; // Contact not saved
            row.insertCell().textContent = booking.userEmail || 'N/A';
            row.insertCell().textContent = formatBookingDate(booking.bookingRequestDate);
            row.insertCell().textContent = 'N/A'; // Specific Time not saved
            row.insertCell().textContent = booking.serviceName || 'N/A';

            // Status Cell
            const statusCell = row.insertCell();
            statusCell.textContent = booking.status || 'Pending';
            statusCell.classList.add(`status-${(booking.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`); // Add class for potential styling

            // Actions Cell
            const actionsCell = row.insertCell();
            actionsCell.classList.add('actions'); // Add class for styling/selection
            if (booking.status === 'Pending Confirmation') {
                actionsCell.innerHTML = `
                    <button class="confirm-btn" data-id="${bookingId}" title="Confirm Booking">✔️ Confirm</button>
                    <button class="reject-btn" data-id="${bookingId}" title="Reject Booking">❌ Reject</button>
                `;
            } else if (booking.status === 'Confirmed') {
                 actionsCell.innerHTML = `<button class="cancel-booking-btn" data-id="${bookingId}" title="Cancel Confirmed Booking">❌ Cancel</button>`;
                 // Add "Mark Complete" button maybe?
                 // actionsCell.innerHTML += `<button class="complete-btn" data-id="${bookingId}" title="Mark as Completed">👍 Complete</button>`;
            } else {
                 actionsCell.textContent = '-'; // No actions for cancelled/completed
            }
        });

    } catch (error) {
        console.error("Error loading bookings: ", error);
        bookingsTableBody.innerHTML = `<tr><td colspan="8">Error loading bookings: ${error.message}</td></tr>`;
        alert("Could not load bookings.");
    }
}

// --- Function to Update Booking Status ---
async function updateBookingStatus(bookingId, newStatus) {
    if (!bookingId || !newStatus) {
        console.error("Missing booking ID or new status");
        return false;
    }
    console.log(`Admin: Updating booking ${bookingId} to status: ${newStatus}`);
    try {
        const bookingRef = doc(db, "bookings", bookingId);
        await updateDoc(bookingRef, {
            status: newStatus,
            lastUpdatedByAdmin: auth.currentUser ? auth.currentUser.uid : 'unknown', // Track who did it
            lastUpdatedTimestamp: new Date().toISOString() // Track when
        });
        console.log("Booking status updated successfully in Firestore.");
        return true;
    } catch (error) {
        console.error("Error updating booking status:", error);
        alert(`Failed to update booking: ${error.message}`);
        return false;
    }
}


// --- Setup Event Listeners for Action Buttons (using Event Delegation) ---
function setupActionListeners() {
    if (!bookingsTableBody) return;

    bookingsTableBody.addEventListener('click', async (event) => {
        const button = event.target.closest('button'); // Find the clicked button
        if (!button) return; // Exit if click wasn't on a button

        const bookingId = button.dataset.id;
        if (!bookingId) return; // Exit if button has no data-id

        let newStatus = null;
        let confirmMessage = '';

        if (button.classList.contains('confirm-btn')) {
            newStatus = 'Confirmed';
            confirmMessage = `Are you sure you want to CONFIRM booking ${bookingId.substring(0, 8)}...?`;
        } else if (button.classList.contains('reject-btn')) {
            newStatus = 'Rejected by Admin'; // Or 'Cancelled'
            confirmMessage = `Are you sure you want to REJECT booking ${bookingId.substring(0, 8)}...?`;
        } else if (button.classList.contains('cancel-booking-btn')) {
            newStatus = 'Cancelled by Admin';
            confirmMessage = `Are you sure you want to CANCEL the confirmed booking ${bookingId.substring(0, 8)}...?`;
        }
        // Add handlers for other buttons like 'complete-btn' if needed

        if (newStatus && confirm(confirmMessage)) {
             button.disabled = true; // Prevent double-clicks
             button.textContent = 'Updating...';
             const success = await updateBookingStatus(bookingId, newStatus);
             if (success) {
                 loadBookings(); // Refresh the table on success
             } else {
                 button.disabled = false; // Re-enable button on failure
                 // Restore original text based on class, or just generic 'Action Failed'
                  if (button.classList.contains('confirm-btn')) button.textContent = '✔️ Confirm';
                  else if (button.classList.contains('reject-btn')) button.textContent = '❌ Reject';
                  else if (button.classList.contains('cancel-booking-btn')) button.textContent = '❌ Cancel';
             }
        }
    });
}

// Initial load is triggered by the onAuthStateChanged check
