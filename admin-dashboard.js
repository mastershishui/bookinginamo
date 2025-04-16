// admin-dashboard.js - UPDATED Initialization

console.log("--- admin-dashboard.js script started ---"); // Debug Log

// Import necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
    getFirestore, collection, doc, getDoc, query,
    orderBy, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

console.log("Firebase modules imported."); // Debug Log

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

console.log("Firebase config object defined."); // Debug Log

// Initialize Firebase ----- ** CHANGE IS HERE ** -----
let app, auth, db;
try {
    console.log("Attempting Firebase initialization (using default instance)..."); // Debug Log
    // ** Use the default app instance **
    // This attempts to get the default app if it's already initialized (e.g., by firebase-auth.js if it ran first somehow, though unlikely here)
    // or initializes it if it hasn't been.
    // Avoids potential conflicts with named instances for auth state consistency immediately after login.
    try {
        app = initializeApp(firebaseConfig); // Initialize default instance
        console.log("Firebase default instance initialized.");
    } catch (e) {
        if (e.code === 'duplicate-app') {
             console.log("Firebase default instance already exists, getting it.");
             app = initializeApp(firebaseConfig); // Get the existing default instance
        } else {
            throw e; // Re-throw other initialization errors
        }
    }

    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase Initialized for Admin Dashboard (using default instance)."); // Updated Log
} catch (e) {
    console.error("Error initializing Firebase for Admin Dashboard:", e);
    alert("Critical Error: Could not initialize Firebase connection for Admin.");
    throw new Error("Firebase initialization failed for Admin Dashboard.");
}
// --- End Firebase Initialization ---

// --- Global variables ---
const logoutButton = document.getElementById('logout-button');
const bookingsTableBody = document.getElementById('bookings-table-body');
let bookingsListener = null; // To hold the unsubscribe function for the listener

// --- Helper: Format Date ---
function formatBookingDate(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        let date;
        if (timestamp && typeof timestamp.toDate === 'function') {
            date = timestamp.toDate();
        } else {
            date = new Date(timestamp);
        }
        if (isNaN(date.getTime())) {
             console.warn("Invalid date value received:", timestamp);
             return 'Invalid Date';
        }
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
        return date.toLocaleDateString(navigator.language || 'en-US', options);
    } catch (e) {
        console.error("Error formatting date:", timestamp, e);
        return String(timestamp);
    }
}

// --- Function to Update Booking Status ---
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
            lastAdminUpdateTimestamp: new Date().toISOString()
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
    bookingsTableBody.innerHTML = `<tr class="loading-message"><td colspan="9">Loading bookings...</td></tr>`;

    if (bookingsListener) {
        console.log("Detaching previous bookings listener.");
        bookingsListener();
        bookingsListener = null;
    }

    try {
        const bookingsCol = collection(db, "bookings");
        const q = query(bookingsCol, orderBy("bookingRequestDate", "desc"));
        console.log("Setting up real-time bookings listener...");

        bookingsListener = onSnapshot(q, (querySnapshot) => {
            console.log(`Bookings snapshot received: ${querySnapshot.size} documents.`);
            bookingsTableBody.innerHTML = '';

            if (querySnapshot.empty) {
                bookingsTableBody.innerHTML = `<tr><td colspan="9">No bookings found.</td></tr>`;
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const booking = docSnap.data();
                const bookingId = docSnap.id;
                const row = bookingsTableBody.insertRow();
                row.dataset.id = bookingId;

                row.insertCell().textContent = bookingId.substring(0, 8) + '...';
                row.insertCell().textContent = booking.customerName || booking.userEmail || 'N/A';
                row.insertCell().textContent = booking.customerContact || 'N/A';
                row.insertCell().textContent = booking.userEmail || 'N/A';
                row.insertCell().textContent = formatBookingDate(booking.bookingRequestDate);
                row.insertCell().textContent = booking.bookingTime || 'N/A';
                row.insertCell().textContent = booking.serviceName || 'N/A';

                const statusCell = row.insertCell();
                const currentStatus = booking.status || 'Pending';
                statusCell.textContent = currentStatus;
                statusCell.className = `status-${currentStatus.toLowerCase().replace(/\s+/g, '-')}`;

                const actionsCell = row.insertCell();
                actionsCell.classList.add('actions');
                actionsCell.innerHTML = '';

                if (currentStatus === 'Pending Confirmation' || currentStatus === 'Pending') {
                    actionsCell.innerHTML = `
                        <button class="confirm-btn" title="Confirm Booking">✔️ Confirm</button>
                        <button class="reject-btn" title="Reject Booking">❌ Reject</button>
                    `;
                } else if (currentStatus === 'Confirmed') {
                    actionsCell.innerHTML = `<button class="cancel-booking-btn" title="Cancel Confirmed Booking">❌ Cancel</button>`;
                } else {
                    actionsCell.innerHTML = '-';
                }
            });

        }, (error) => {
            console.error("Error in bookings listener: ", error);
            bookingsTableBody.innerHTML = `<tr><td colspan="9">Error loading real-time bookings: ${error.message}</td></tr>`;
            alert("Error receiving real-time booking updates. Please refresh or check console.");
            if (bookingsListener) bookingsListener();
            bookingsListener = null;
        });

    } catch (error) {
        console.error("Error setting up bookings listener query: ", error);
        bookingsTableBody.innerHTML = `<tr><td colspan="9">Error initializing booking listener: ${error.message}</td></tr>`;
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
    bookingsTableBody.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        const row = button.closest('tr');
        const bookingId = row?.dataset?.id;

        if (!bookingId) {
            console.error("Could not determine booking ID for clicked action button.");
            return;
        }

        let newStatus = null;
        let confirmMessage = '';

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

        if (newStatus && confirm(confirmMessage)) {
            button.disabled = true;
            button.textContent = 'Updating...';
            const success = await updateBookingStatus(bookingId, newStatus);

            if (!success) {
                button.disabled = false;
                if (button.classList.contains('confirm-btn')) button.textContent = '✔️ Confirm';
                else if (button.classList.contains('reject-btn')) button.textContent = '❌ Reject';
                else if (button.classList.contains('cancel-booking-btn')) button.textContent = '❌ Cancel';
                else button.textContent = 'Action Failed';
            }
            // Real-time listener updates the row on success
        }
    });
    console.log("Action listeners set up on table body.");
}

// --- Authentication Check & Admin Verification ---
console.log("Setting up onAuthStateChanged listener..."); // Debug Log
onAuthStateChanged(auth, async (user) => {
    console.log("onAuthStateChanged triggered."); // Debug Log

    if (bookingsListener) {
        console.log("Auth state changed, detaching listener.");
        bookingsListener();
        bookingsListener = null;
    }

    if (user) {
        console.log("Admin Page: User signed in:", user.uid); // Existing Log A
        const userDocRef = doc(db, "users", user.uid);
        console.log("Checking user document:", userDocRef.path); // Debug Log
        try {
            const docSnap = await getDoc(userDocRef);
            console.log("User document snapshot exists:", docSnap.exists()); // Debug Log
            if (docSnap.exists()) {
                 console.log("User document data:", docSnap.data()); // Debug Log: See the actual data
                 console.log("isAdmin field value:", docSnap.data().isAdmin); // Debug Log: See the isAdmin value
                 console.log("isAdmin field type:", typeof docSnap.data().isAdmin); // Debug Log: See the type
            }

            // The Check:
            if (docSnap.exists() && docSnap.data().isAdmin === true) {
                console.log("Admin verified."); // Existing Log B
                loadBookings();
                setupActionListeners();
            } else {
                console.log("User is not an admin OR isAdmin check failed. Redirecting..."); // Updated Log C
                if (!docSnap.exists()) {
                     console.log("Reason: Document does not exist.");
                } else if (docSnap.data().isAdmin !== true) {
                     console.log(`Reason: isAdmin value is '${docSnap.data().isAdmin}' (type: ${typeof docSnap.data().isAdmin}), not boolean true.`);
                }
                alert("Access denied. Administrator privileges required.");
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error("Error fetching user admin status:", error); // Existing Log D
            alert("Error verifying admin status. Redirecting.");
            window.location.href = 'index.html';
        }
    } else {
        console.log("Admin Page: No user signed in. Redirecting..."); // Existing Log E
        window.location.href = 'index.html';
    }
});
console.log("onAuthStateChanged listener set up."); // Debug Log

// --- Logout Functionality ---
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        if (bookingsListener) {
            console.log("Logging out, detaching listener.");
            bookingsListener();
            bookingsListener = null;
        }
        signOut(auth).then(() => {
            console.log("Admin signed out successfully.");
            window.location.href = "index.html";
        }).catch((error) => {
            console.error("Sign out error:", error);
            alert("Error signing out.");
        });
    });
} else {
    console.error("Logout button not found!");
}

console.log("--- admin-dashboard.js script finished ---"); // Debug Log
