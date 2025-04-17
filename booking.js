// booking.js - UPDATED to open login modal on auth notification OK click

// --- Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
    getFirestore, collection, doc, getDoc, addDoc, serverTimestamp
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
try {
    try {
        app = initializeApp(firebaseConfig);
        console.log("Booking.js: Firebase default instance initialized.");
    } catch (e) {
        if (e.code === 'duplicate-app') {
            console.log("Booking.js: Firebase default instance already exists, getting it.");
            app = initializeApp(firebaseConfig); // Get existing instance
        } else {
            throw e;
        }
    }
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Booking.js: Firebase initialized (default instance).");
} catch (e) {
    console.error("Booking.js: Error initializing Firebase:", e);
    alert("Critical Error: Could not initialize Firebase connection for booking.");
    document.querySelectorAll('.book-button').forEach(btn => btn.disabled = true);
}

// --- Wait for the DOM ---
document.addEventListener('DOMContentLoaded', () => {
    // Get elements needed
    const bookingModal = document.getElementById('bookingModal');
    const loginModal = document.getElementById('loginModal'); // Needed
    const bookingCloseButton = bookingModal ? bookingModal.querySelector('.booking-close-button') : null;
    const bookingForm = document.getElementById('bookingForm');
    const serviceButtons = document.querySelectorAll('.book-button');
    const modalServiceName = document.getElementById('modal-service-name');
    const modalServicePrice = document.getElementById('modal-service-price');
    const modalServiceId = document.getElementById('modal-service-id');
    const bookingNotes = document.getElementById('booking-notes');

    // Get Authentication Notification Modal elements
    const authModal = document.getElementById('authNotificationModal');
    const authModalCloseBtn = authModal ? authModal.querySelector('.auth-notification-close') : null;
    const authModalOkBtn = authModal ? authModal.querySelector('.auth-notification-ok-btn') : null;


    // --- Modal Handling ---
    function openBookingModal(serviceCard) {
        // (Keep existing openBookingModal function as is)
        if (!bookingModal || !modalServiceId || !modalServiceName || !modalServicePrice || !bookingNotes) {
            console.error("Booking modal or its inner elements not found!");
            return;
        }
        const serviceId = serviceCard.dataset.serviceId;
        const serviceName = serviceCard.dataset.serviceName;
        let price = serviceCard.dataset.price;
        let displayPrice;
        if (!price || price === 'VARIES' || price === 'PACKAGE') {
             const priceElement = serviceCard.querySelector('.service-price');
             displayPrice = priceElement ? priceElement.textContent : 'Price unavailable';
        } else {
              try {
                  displayPrice = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(price);
              } catch (e) { displayPrice = `₱${price}`; }
        }
        console.log("Opening booking modal for:", serviceName, displayPrice, serviceId);
        modalServiceId.value = serviceId;
        modalServiceName.textContent = serviceName;
        modalServicePrice.textContent = displayPrice;
        bookingNotes.value = '';
        bookingModal.style.display = 'block';
    }

    function closeBookingModal() {
        if (bookingModal) bookingModal.style.display = 'none';
    }

    // Function to close the Authentication Notification Modal
    function closeAuthNotification() {
        if (authModal) {
            authModal.style.display = 'none';
        }
    }

    // --- Event Listeners for Modals ---

    // Add event listener for Auth Notification 'X' button
    if (authModalCloseBtn) {
        authModalCloseBtn.addEventListener('click', closeAuthNotification);
    }

    // ** MODIFIED: Event listener for Auth Notification OK Button **
    if (authModalOkBtn) {
        authModalOkBtn.addEventListener('click', () => {
            closeAuthNotification(); // 1. Close the notification modal
            if (loginModal) {
                loginModal.style.display = 'block'; // 2. Open the login modal
            } else {
                // Fallback if login modal isn't found
                console.error("Login modal element not found when trying to open from auth notification.");
                alert("Please use the main 'Log In / Sign Up' link."); // Give user guidance
            }
        });
    }
    // ** END OF MODIFICATION **

    // Add event listener for Auth Notification overlay click
    if (authModal) {
        authModal.addEventListener('click', (event) => {
            if (event.target === authModal) {
                closeAuthNotification();
            }
        });
    }

    // Add event listener for Booking Modal Close button
    if (bookingCloseButton) {
        bookingCloseButton.addEventListener('click', closeBookingModal);
    }

    // Add event listener for clicking outside Booking modal
    window.addEventListener('click', (event) => {
        if (bookingModal && event.target === bookingModal) {
            closeBookingModal();
        }
        // Note: Auth modal closing is handled separately above
    });

    // --- Event Listeners for Book Now buttons ---
    serviceButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const serviceCard = event.target.closest('.service-card');
            if (!serviceCard) return;

            // Check Authentication
            if (auth && auth.currentUser) {
                // User logged in: Open the booking modal
                console.log("User logged in, opening booking modal.");
                openBookingModal(serviceCard);
            } else {
                // User not logged in: Show custom auth notification modal
                console.log("User not logged in, showing auth notification.");
                if (authModal) {
                    authModal.style.display = 'block';
                } else {
                    // Fallback if custom modal missing
                    console.error("Auth notification modal not found!");
                    alert("Please log in or register to book a service.");
                    // Optionally show login modal directly as fallback
                    // if (loginModal) loginModal.style.display = 'block';
                }
            }
        });
    });


    // --- Booking Form Submission (Save to Firestore) ---
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = bookingForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Booking...';

            // Re-check Authentication
            if (!auth || !auth.currentUser) {
                alert("Authentication error. Please log in again."); // Keep alert here for critical failure
                closeBookingModal();
                 if (authModal) authModal.style.display = 'block'; // Show notification on failure
                submitButton.disabled = false;
                submitButton.textContent = 'Confirm Booking';
                return;
            }
            const userId = auth.currentUser.uid;
            const userEmail = auth.currentUser.email;

            // Get User Details from Firestore
            let customerName = userEmail;
            let customerContact = 'N/A';
            try {
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    customerName = `${userData.firstname || ''} ${userData.lastname || ''}`.trim() || userEmail;
                    customerContact = userData.contact || 'N/A';
                }
            } catch (error) {
                console.error("Error fetching user details:", error);
            }

            // Get Form Data
            const formData = new FormData(bookingForm);
            const selectedPayment = formData.get('payment');
            const notes = formData.get('notes');
            const serviceId = formData.get('serviceId');
            const serviceName = modalServiceName ? modalServiceName.textContent : 'Unknown Service';
            const servicePrice = modalServicePrice ? modalServicePrice.textContent : 'N/A';

            // Prepare Booking Data
            const newBookingData = {
                userId, userEmail, customerName, customerContact, serviceId, serviceName,
                servicePriceDisplay: servicePrice, notes: notes || "", paymentMethod: selectedPayment,
                bookingRequestDate: serverTimestamp(), bookingTime: "Pending Assignment", status: "Pending Confirmation"
            };

            // Save to Firestore
            try {
                const bookingsCollectionRef = collection(db, "bookings");
                const docRef = await addDoc(bookingsCollectionRef, newBookingData);
                console.log("Booking saved successfully to Firestore with ID:", docRef.id);
                alert(`"${serviceName}" booking request submitted successfully!\nWe will confirm your schedule soon.`);
                closeBookingModal();
            } catch (error) {
                console.error("Error saving booking to Firestore:", error);
                alert(`Failed to submit booking. Please try again.\nError: ${error.message}`);
            } finally {
                 submitButton.disabled = false;
                 submitButton.textContent = 'Confirm Booking';
            }
        });
    } else {
        console.warn("Booking form element not found.");
    }

    console.log("Booking.js: Event listeners added.");

}); // End DOMContentLoaded
