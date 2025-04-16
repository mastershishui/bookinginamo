// admin-dashboard.js

// Import necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
// ** ADD onSnapshot to the import below **
import {
    getFirestore, collection, doc, getDoc, query,
    orderBy, updateDoc, onSnapshot // <-- Added onSnapshot here
    // Removed getDocs and where as they are not used in this version
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Paste your Firebase config object here
const firebaseConfig = {
    apiKey: "AIzaSyAp19_1RwloTbJLZ_K723-m8C2zka8Oh10", // --- USE YOUR ACTUAL KEY ---
    authDomain: "gjsbooking-faba9.firebaseapp.com",
    projectId: "gjsbooking-faba9",
    storageBucket: "gjsbooking-faba9.appspot.com",
    messagingSenderId: "708149149410",
    appId: "1:708149149410:web:dde6a5b99b4900dd8c28bb",
    measurementId: "G-5QB9413PJH" // Optional
};

// Initialize Firebase
let app, auth, db;
try {
    // Use a named instance to avoid potential conflicts if initialized elsewhere
    app = initializeApp(firebaseConfig, 'adminApp'); // Give it a unique name
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase Initialized for Admin Dashboard (adminApp).");
} catch (e) {
    // Handle potential initialization errors (e.g., if name 'adminApp' was already used)
    console.error("Error initializing Firebase for Admin Dashboard:", e);
    alert("Critical Error: Could not initialize Firebase connection for Admin.");
    // You might want to prevent further execution if Firebase fails
    throw new Error("Firebase initialization failed for Admin Dashboard.");
}
// --- End Firebase Initialization ---

// --- Global variables ---
const logoutButton = document.getElementById('logout-button');
const bookingsTableBody = document.getElementById('bookings-table-body');
let bookingsListener = null; // To hold the unsubscribe function for the listener

// --- Helper: Format Date ---
function formatBookingDate(timestamp) { // Changed input name for clarity
    if (!timestamp) return 'N/A';
    try {
        let date;
        // Check if it's a Firestore Timestamp object
        if (timestamp && typeof timestamp.toDate === 'function') {
            date = timestamp.toDate(); // Convert Firestore Timestamp to JS Date
        } else {
            // Try parsing as if it might be an ISO string or other format
            date = new Date(timestamp);
        }

        // Check if the resulting date is valid
        if (isNaN(date.getTime())) {
             console.warn("Invalid date value received:", timestamp);
             return 'Invalid Date';
         }

        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
        // Use locale 'en-PH' for Philippines or 'en-US' as fallback
        return date.toLocaleDateString(navigator.language || 'en-US', options);
    } catch (e) {
        console.error("Error formatting date:", timestamp, e);
        return String(timestamp); // Return original value as string on error
    }
}

// --- Function to Update Booking Status ---
// (This function remains largely the same)
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
            // Use server timestamp for reliable update time if needed, or client-side ISO string
            lastAdminUpdateTimestamp: new Date().toISOString() // Track admin action time
            // lastAdminUpdateTimestamp: serverTimestamp() // Alternative: Firestore server time
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
function loadBookings() {
    if (!bookingsTableBody) {
        console.error("Bookings table body not found!");
        return;
    }
    bookingsTableBody.innerHTML = `<tr class="loading-message"><td colspan="9">Loading bookings...</td></tr>`; // ** Use colspan="9" **

    // Unsubscribe from the previous listener if it exists
    if (bookingsListener) {
        console.log("Detaching previous bookings listener.");
        bookingsListener(); // Execute the unsubscribe function
        bookingsListener = null;
    }

    try {
        const bookingsCol = collection(db, "bookings");
        // Order by request date, newest first. Ensure 'bookingRequestDate' is a Timestamp or comparable value.
        const q = query(bookingsCol, orderBy("bookingRequestDate", "desc"));

        console.log("Setting up real-time bookings listener...");

        // Attach the real-time listener
        bookingsListener = onSnapshot(q, (querySnapshot) => {
            console.log(`Bookings snapshot received: ${querySnapshot.size} documents.`);
            bookingsTableBody.innerHTML = ''; // Clear previous table content

            if (querySnapshot.empty) {
                bookingsTableBody.innerHTML = `<tr><td colspan="9">No bookings found.</td></tr>`; // ** Use colspan="9" **
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const booking = docSnap.data();
                const bookingId = docSnap.id;

                const row = bookingsTableBody.insertRow();
                row.dataset.id = bookingId; // Store ID on the row

                // Populate cells - ** Adjust field names based on what you save during booking **
                row.insertCell().textContent = bookingId.substring(0, 8) + '...';
                // Assume these fields exist in your booking document:
                row.insertCell().textContent = booking.customerName || booking.userEmail || 'N/A'; // Show name, fallback email
                row.insertCell().textContent = booking.customerContact || 'N/A';
                row.insertCell().textContent = booking.userEmail || 'N/A';
                row.insertCell().textContent = formatBookingDate(booking.bookingRequestDate); // Use the helper
                row.insertCell().textContent = booking.bookingTime || 'N/A'; // e.g., "9:00 AM"
                row.insertCell().textContent = booking.serviceName || 'N/A';

                // Status Cell
                const statusCell = row.insertCell();
                const currentStatus = booking.status || 'Pending'; // Default status
                statusCell.textContent = currentStatus;
                statusCell.className = `status-${currentStatus.toLowerCase().replace(/\s+/g, '-')}`;

                // Actions Cell - Dynamically create buttons
                const actionsCell = row.insertCell();
                actionsCell.classList.add('actions');
                actionsCell.innerHTML = ''; // Clear any previous buttons

                if (currentStatus === 'Pending Confirmation' || currentStatus === 'Pending') {
                    actionsCell.innerHTML = `
                        <button class="confirm-btn" title="Confirm Booking">✔️ Confirm</button>
                        <button class="reject-btn" title="Reject Booking">❌ Reject</button>
                    `;
                } else if (currentStatus === 'Confirmed') {
                    actionsCell.innerHTML = `<button class="cancel-booking-btn" title="Cancel Confirmed Booking">❌ Cancel</button>`;
                    // You could add a "Mark Completed" button here
                } else {
                    actionsCell.innerHTML = '-'; // No actions for completed, cancelled, rejected
                }
            });

        }, (error) => { // --- Error handler for the listener ---
            console.error("Error in bookings listener: ", error);
            bookingsTableBody.innerHTML = `<tr><td colspan="9">Error loading real-time bookings: ${error.message}</td></tr>`; // ** Use colspan="9" **
            alert("Error receiving real-time booking updates. Please refresh or check console.");
            if (bookingsListener) bookingsListener(); // Detach listener on error
            bookingsListener = null;
        });

    } catch (error) { // Catch synchronous errors setting up the query/listener
        console.error("Error setting up bookings listener query: ", error);
        bookingsTableBody.innerHTML = `<tr><td colspan="9">Error initializing booking listener: ${error.message}</td></tr>`; // ** Use colspan="9" **
        alert("Failed to initialize booking listener.");
        if (bookingsListener) bookingsListener();
        bookingsListener = null;
    }
}


// --- Setup Event Listeners for Action Buttons (using Event Delegation) ---
function setupActionListeners() {
    if (!bookingsTableBody) {
        console.error("Cannot setup listeners: Bookings table body not found!");
        return;
    }

    // Add the listener to the TABLE BODY - it will catch clicks on buttons inside
    bookingsTableBody.addEventListener('click', async (event) => {
        const button = event.target.closest('button'); // Find the button that was clicked
        if (!button) return; // Ignore clicks that weren't on a button

        const row = button.closest('tr'); // Find the table row the button belongs to
        const bookingId = row?.dataset?.id; // Get the booking ID stored on the row

        if (!bookingId) {
            console.error("Could not determine booking ID for clicked action button.");
            return; // Exit if we can't find the ID
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
        // Add more 'else if' blocks here for other actions (e.g., 'complete-btn')

        // If an action was identified and confirmed by the user
        if (newStatus && confirm(confirmMessage)) {
            button.disabled = true; // Disable button immediately
            button.textContent = 'Updating...';
            const success = await updateBookingStatus(bookingId, newStatus);

            // If the update failed, re-enable the button and restore text
            if (!success) {
                button.disabled = false;
                if (button.classList.contains('confirm-btn')) button.textContent = '✔️ Confirm';
                else if (button.classList.contains('reject-btn')) button.textContent = '❌ Reject';
                else if (button.classList.contains('cancel-booking-btn')) button.textContent = '❌ Cancel';
                else button.textContent = 'Action Failed'; // Fallback
            }
            // NOTE: If successful, the onSnapshot listener will automatically update the row.
            // No need to manually call loadBookings() here anymore.
        }
    });
    console.log("Action listeners set up on table body.");
}

// --- Authentication Check & Admin Verification ---
onAuthStateChanged(auth, async (user) => {
    // Detach any existing listener first when auth state changes
    if (bookingsListener) {
        console.log("Auth state changed, detaching listener.");
        bookingsListener();
        bookingsListener = null;
    }

    if (user) {
        console.log("Admin Page: User signed in:", user.uid);
        const userDocRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data().isAdmin === true) {
                console.log("Admin verified.");
                // **Load bookings using the real-time function**
                loadBookings();
                // **Set up button listeners**
                setupActionListeners();
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
        // No need to explicitly detach listener here, it was detached at the start of onAuthStateChanged
        window.location.href = 'index.html'; // Redirect to home or login page
    }
});

// --- Logout Functionality ---
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        // Detach listener before signing out
        if (bookingsListener) {
             console.log("Logging out, detaching listener.");
             bookingsListener(); // Call the unsubscribe function
             bookingsListener = null;
        }
        signOut(auth).then(() => {
            console.log("Admin signed out successfully.");
            window.location.href = "index.html"; // Redirect after sign out
        }).catch((error) => {
            console.error("Sign out error:", error);
            alert("Error signing out.");
            // Consider if listener should be re-attached or page reloaded on error
        });
    });
} else {
    console.error("Logout button not found!");
}

// Initial load and listener setup are triggered by the onAuthStateChanged check firing when the page loads.
