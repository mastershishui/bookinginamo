// mybook.js - UPDATED to use Firebase Auth and Firestore

// --- Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
    getFirestore, collection, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// --- Firebase Config (should match other files) ---
const firebaseConfig = {
    apiKey: "AIzaSyAp19_1RwloTbJLZ_K723-m8C2zka8Oh10", // --- USE YOUR ACTUAL KEY ---
    authDomain: "gjsbooking-faba9.firebaseapp.com",
    projectId: "gjsbooking-faba9",
    storageBucket: "gjsbooking-faba9.appspot.com",
    messagingSenderId: "708149149410",
    appId: "1:708149149410:web:dde6a5b99b4900dd8c28bb",
    measurementId: "G-5QB9413PJH" // Optional
};

// --- Initialize Firebase (use default instance) ---
let app, auth, db;
let bookingsListener = null; // To unsubscribe from Firestore listener
try {
    // Use try-catch for initialization
     try {
        app = initializeApp(firebaseConfig);
        console.log("Mybook.js: Firebase default instance initialized.");
    } catch (e) {
        if (e.code === 'duplicate-app') {
             console.log("Mybook.js: Firebase default instance already exists, getting it.");
             app = initializeApp(firebaseConfig);
        } else { throw e; }
    }
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Mybook.js: Firebase initialized.");
} catch (e) {
    console.error("Mybook.js: Error initializing Firebase:", e);
    // Display error to user if Firebase fails
    const bookingsListDiv = document.getElementById('bookings-list');
    if (bookingsListDiv) {
         bookingsListDiv.innerHTML = '<p style="color:red;">Error loading Firebase. Cannot fetch bookings.</p>';
    }
}

// --- DOM Elements ---
const bookingsListDiv = document.getElementById('bookings-list');
const noBookingsMessage = document.getElementById('no-bookings-message');
const loadingMessage = document.getElementById('loading-bookings-message');

// --- Helper: Format Date (from Firestore Timestamp) ---
function formatFirestoreTimestamp(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'N/A';
    try {
        const date = timestamp.toDate(); // Convert Firestore Timestamp to JS Date
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
        return date.toLocaleDateString('en-US', options);
    } catch (e) {
        console.error("Error formatting timestamp:", e);
        return 'Invalid Date';
    }
}

// --- Display Bookings Function (Renders fetched data) ---
function displayBookings(bookingDocs) {
    if (!bookingsListDiv || !loadingMessage || !noBookingsMessage) {
        console.error("Required display elements not found.");
        return;
    }
    loadingMessage.style.display = 'none'; // Hide loading message
    bookingsListDiv.innerHTML = ''; // Clear previous content (like loading message)

    if (!bookingDocs || bookingDocs.length === 0) {
        noBookingsMessage.style.display = 'block'; // Show 'no bookings' message
        bookingsListDiv.appendChild(noBookingsMessage); // Re-append if cleared
    } else {
        noBookingsMessage.style.display = 'none'; // Hide 'no bookings' message

        bookingDocs.forEach(docSnap => {
            const booking = docSnap.data();
            const bookingId = docSnap.id; // Get Firestore document ID

            const card = document.createElement('div');
            card.classList.add('booking-card'); // Use the same class as before or a new one
            card.dataset.bookingId = bookingId; // Store Firestore ID

            // Determine display date - prefer bookingRequestDate from Firestore
            const displayDate = formatFirestoreTimestamp(booking.bookingRequestDate);
            const displayTime = booking.bookingTime || ''; // Use bookingTime if available

            card.innerHTML = `
                <div class="booking-card-header">
                    <h4>${booking.serviceName || 'Service Name Missing'}</h4>
                    <span class="booking-status status-${(booking.status || 'pending').toLowerCase().replace(/\s+/g, '-')}">
                        ${booking.status || 'Pending'}
                    </span>
                </div>
                <div class="booking-card-body">
                     <p><strong>Service Date/Time:</strong> ${displayDate} (${displayTime})</p>
                    <p><strong>Status Updated:</strong> ${booking.lastAdminUpdateTimestamp ? formatBookingDate(booking.lastAdminUpdateTimestamp) : 'N/A'}</p> <p><strong>Payment Method:</strong> ${booking.paymentMethod || 'N/A'}</p>
                    ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
                    <p><small>Booking ID: ${bookingId}</small></p> </div>
                `;
            bookingsListDiv.appendChild(card);
        });
    }
}

// --- Fetch Bookings from Firestore ---
function fetchUserBookings(userId) {
    if (!db) {
        console.error("Firestore database instance not available.");
        return;
    }
    if (bookingsListener) { // Unsubscribe from previous listener if fetching for a new user
        console.log("Detaching previous bookings listener.");
        bookingsListener();
        bookingsListener = null;
    }

    console.log(`Workspaceing bookings for user ID: ${userId}`);
    try {
        const bookingsRef = collection(db, "bookings");
        // Query for bookings matching the userId, order by request date
        const q = query(bookingsRef,
                        where("userId", "==", userId),
                        orderBy("bookingRequestDate", "desc")
                       );

        // Use onSnapshot for real-time updates
        bookingsListener = onSnapshot(q, (querySnapshot) => {
            console.log(`Received ${querySnapshot.size} booking documents for user.`);
            const bookingDocs = querySnapshot.docs; // Get the array of document snapshots
            displayBookings(bookingDocs); // Pass the array to the display function

        }, (error) => {
            console.error("Error fetching user bookings:", error);
            if (bookingsListDiv) {
                 bookingsListDiv.innerHTML = '<p style="color:red;">Error loading your bookings. Please try again later.</p>';
                 if(loadingMessage) loadingMessage.style.display = 'none';
                 if(noBookingsMessage) noBookingsMessage.style.display = 'none';
            }
            // Optionally unsubscribe on error?
            // if (bookingsListener) bookingsListener();
            // bookingsListener = null;
        });

    } catch (error) {
        console.error("Error setting up booking query:", error);
         if (bookingsListDiv) {
             bookingsListDiv.innerHTML = '<p style="color:red;">Could not set up query to load bookings.</p>';
              if(loadingMessage) loadingMessage.style.display = 'none';
              if(noBookingsMessage) noBookingsMessage.style.display = 'none';
         }
    }
}

// --- Authentication State ---
console.log("Setting up onAuthStateChanged for mybook.js");
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        console.log("MyBook Page: User is signed in:", user.uid);
        if (loadingMessage) loadingMessage.style.display = 'block'; // Show loading message
        if (noBookingsMessage) noBookingsMessage.style.display = 'none'; // Hide no bookings message
        fetchUserBookings(user.uid); // Fetch bookings for this user
    } else {
        // User is signed out
        console.log("MyBook Page: User is signed out.");
        if (bookingsListener) { // Unsubscribe if user logs out
             bookingsListener();
             bookingsListener = null;
        }
         if (bookingsListDiv) {
            bookingsListDiv.innerHTML = '<p>Please log in to see your bookings.</p>'; // Show login message
             if(loadingMessage) loadingMessage.style.display = 'none';
             if(noBookingsMessage) noBookingsMessage.style.display = 'none';
         }
         // Note: Redirection away from page should be handled by protectRoute in firebase-auth.js if needed
    }
});
console.log("onAuthStateChanged listener set up for mybook.js");
