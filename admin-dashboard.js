// admin-dashboard.js

// --- IMPORTANT: Firebase Initialization ---
// Option 1: If you created firebase-config.js (Recommended)
// import { auth, db } from './firebase-config.js';

// Option 2: If you put initialization directly in index.html (Copy config here too)
// You MUST have the config here if not importing from firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Paste your Firebase config object here if not using firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyAp19_1RwloTbJLZ_K723-m8C2zka8Oh10", // --- USE YOUR ACTUAL KEY ---
    authDomain: "gjsbooking-faba9.firebaseapp.com",
    projectId: "gjsbooking-faba9",
    storageBucket: "gjsbooking-faba9.firebasestorage.app",
    messagingSenderId: "708149149410",
    appId: "1:708149149410:web:dde6a5b99b4900dd8c28bb",
    measurementId: "G-5QB9413PJH" // Optional
};

// Initialize Firebase (ensure this only runs once if importing)
// If using firebase-config.js, you'd import auth/db directly instead of these lines
let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Error initializing Firebase from admin-dashboard.js:", e);
    // Handle error appropriately, maybe redirect or show message
}
// --- End Firebase Initialization ---


const logoutButton = document.getElementById('logout-button');
const bookingsTableBody = document.getElementById('bookings-table-body');

// --- Authentication Check ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in. Now verify if they are admin.
        console.log("User signed in:", user.uid);
        const userDocRef = doc(db, "users", user.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data().isAdmin === true) {
                // User is an admin! Load dashboard data.
                console.log("Admin verified.");
                loadBookings(); // Function to load data
            } else {
                // User is logged in but NOT an admin.
                console.log("User is not an admin. Redirecting...");
                alert("Access denied. You are not an administrator.");
                window.location.href = 'index.html'; // Redirect to home or login
            }
        } catch (error) {
            console.error("Error fetching user admin status:", error);
            alert("Error verifying admin status. Redirecting.");
            window.location.href = 'index.html'; // Redirect on error
        }
    } else {
        // No user is signed in. Redirect to login.
        console.log("No user signed in. Redirecting...");
        window.location.href = 'index.html'; // Redirect to home or login
    }
});

// --- Logout Functionality ---
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
            // Sign-out successful.
            console.log("User signed out.");
            window.location.href = "index.html"; // Redirect to home page
        }).catch((error) => {
            // An error happened.
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

    bookingsTableBody.innerHTML = '<tr class="loading-message"><td colspan="8">Loading bookings...</td></tr>'; // Show loading message

    try {
        // Assuming you have a 'bookings' collection
        // You might want to order them, e.g., by booking date
        const bookingsCol = collection(db, "bookings");
        // Example: Order by a 'bookingTimestamp' field, descending
        // const q = query(bookingsCol, orderBy("bookingTimestamp", "desc"));
        // Or just get all documents without specific order for now:
        const querySnapshot = await getDocs(bookingsCol);

        bookingsTableBody.innerHTML = ''; // Clear loading message/previous data

        if (querySnapshot.empty) {
            bookingsTableBody.innerHTML = '<tr><td colspan="8">No bookings found.</td></tr>'; // Adjust colspan
            return;
        }

        querySnapshot.forEach((doc) => {
            const booking = doc.data();
            const bookingId = doc.id; // Get the document ID

            const row = bookingsTableBody.insertRow();

            // Populate cells - Adjust fields based on your actual booking data structure
            row.insertCell().textContent = bookingId;
            row.insertCell().textContent = booking.customerName || 'N/A'; // Example field
            row.insertCell().textContent = booking.customerContact || 'N/A'; // Example field
            row.insertCell().textContent = booking.customerEmail || 'N/A'; // Example field
            row.insertCell().textContent = booking.bookingDate || 'N/A'; // Example field
            row.insertCell().textContent = booking.bookingTime || 'N/A'; // Example field
            row.insertCell().textContent = booking.serviceName || 'N/A'; // Example field
            row.insertCell().textContent = booking.status || 'Pending'; // Example status

            // You could add an "Actions" cell here with buttons (e.g., Confirm, Cancel)
            // const actionsCell = row.insertCell();
            // actionsCell.innerHTML = `<button onclick="confirmBooking('${bookingId}')">Confirm</button>`;
        });

    } catch (error) {
        console.error("Error loading bookings: ", error);
        bookingsTableBody.innerHTML = '<tr><td colspan="8">Error loading bookings.</td></tr>'; // Adjust colspan
        alert("Could not load bookings.");
    }
}

// Example placeholder functions for actions (implement later)
// function confirmBooking(id) { console.log("Confirm booking:", id); /* Add Firestore update logic */ }
// function cancelBooking(id) { console.log("Cancel booking:", id); /* Add Firestore update/delete logic */ }
