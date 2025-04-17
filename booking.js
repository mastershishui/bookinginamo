// booking.js - UPDATED to use custom notification modal

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
            app = initializeApp(firebaseConfig); // Get existing instance if needed (often just getApp() is used here)
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
    // Get elements needed within booking.js
    const bookingModal = document.getElementById('bookingModal');
    const loginModal = document.getElementById('loginModal'); // Still needed if linked elsewhere
    const bookingCloseButton = bookingModal ? bookingModal.querySelector('.booking-close-button') : null;
    const bookingForm = document.getElementById('bookingForm');
    const serviceButtons = document.querySelectorAll('.book-button');
    const modalServiceName = document.getElementById('modal-service-name');
    const modalServicePrice = document.getElementById('modal-service-price');
    const modalServiceId = document.getElementById('modal-service-id');
    const bookingNotes = document.getElementById('booking-notes');

    // ** NEW: Get Authentication Notification Modal elements **
    const authModal = document.getElementById('authNotificationModal');
    const authModalCloseBtn = authModal ? authModal.querySelector('.auth-notification-close') : null;
    const authModalOkBtn = authModal ? authModal.querySelector('.auth-notification-ok-btn') : null;


    // --- Modal Handling ---
    function openBookingModal(serviceCard) {
        if (!bookingModal || !modalServiceId || !modalServiceName || !modalServicePrice || !bookingNotes) {
            console.error("Booking modal or its inner elements not found!");
            return;
        }
        const serviceId = serviceCard.dataset.serviceId;
        const serviceName = serviceCard.dataset.serviceName;
        let price = serviceCard.dataset.price;
        let displayPrice;

        // Format price (existing logic)
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

    // ** NEW: Function to close the Authentication Notification Modal **
    function closeAuthNotification() {
        if (authModal) {
            authModal.style.display = 'none';
        }
    }

    // ** NEW: Add event listeners to close the Auth Notification modal **
    if (authModalCloseBtn) {
        authModalCloseBtn.addEventListener('click', closeAuthNotification);
    }
    if (authModalOkBtn) {
        authModalOkBtn.addEventListener('click', closeAuthNotification);
    }
    if (authModal) {
        authModal.addEventListener('click', (event) => {
            // Close if clicking on the semi-transparent background overlay
            if (event.target === authModal) {
                closeAuthNotification();
            }
        });
    }


    // --- Event Listeners for Book Now buttons ---
    serviceButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const serviceCard = event.target.closest('.service-card');
            if (!serviceCard) {
                 console.error("Could not find parent service-card for button:", event.target);
                 return;
            }

            // Check Authentication
            if (auth && auth.currentUser) {
                // User is logged in - Open the actual booking modal
                console.log("User logged in, opening booking modal.");
                openBookingModal(serviceCard);
            } else {
                // User is NOT logged in - Show the custom notification modal
                console.log("User not logged in, showing auth notification.");

                // alert("Please log in or register to book a service."); // <-- REMOVED DEFAULT ALERT

                // ** NEW: Show custom auth notification modal **
                if (authModal) {
                    authModal.style.display = 'block';
                } else {
                    // Fallback if the custom modal isn't found (shouldn't happen if HTML is correct)
                    console.error("Authentication notification modal not found!");
                    alert("Please log in or register to book a service."); // Fallback alert
                }

                // REMOVED automatic opening of login modal - notification tells user what to do.
                // if (loginModal) {
                //     closeBookingModal();
                //     loginModal.style.display = 'block';
                // } else {
                //     console.warn("Login modal element not found.");
                // }
            }
        });
    });

    // Close booking modal listener (remains the same)
    if (bookingCloseButton) {
        bookingCloseButton.addEventListener('click', closeBookingModal);
    }
    window.addEventListener('click', (event) => {
        // Close booking modal if clicking outside its content
        if (bookingModal && event.target === bookingModal) {
            closeBookingModal();
        }
        // Note: Auth modal closing is handled by its specific listeners added above
    });


    // --- Booking Form Submission (Save to Firestore) ---
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (event) => { // Make async
            event.preventDefault();
            const submitButton = bookingForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Booking...';

            // 1. Check Authentication again
            if (!auth || !auth.currentUser) {
                alert("You seem to be logged out. Please log in again to book.");
                closeBookingModal();
                 // ** NEW: Also show custom auth notification if check fails here **
                 if (authModal) {
                     authModal.style.display = 'block';
                 }
                 // Keep login modal display if needed for this specific failure point
                 // if (loginModal) loginModal.style.display = 'block';
                submitButton.disabled = false;
                submitButton.textContent = 'Confirm Booking';
                return;
            }
            const userId = auth.currentUser.uid;
            const userEmail = auth.currentUser.email;

            // 2. Get User Details from Firestore
            let customerName = userEmail;
            let customerContact = 'N/A';
            try {
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    customerName = `${userData.firstname || ''} ${userData.lastname || ''}`.trim() || userEmail;
                    customerContact = userData.contact || 'N/A';
                    console.log("Fetched user details:", customerName, customerContact);
                } else {
                    console.warn("User document not found in Firestore, using default info.");
                }
            } catch (error) {
                console.error("Error fetching user details:", error);
            }

            // 3. Get Form Data
            const formData = new FormData(bookingForm);
            const selectedPayment = formData.get('payment');
            const notes = formData.get('notes');
            const serviceId = formData.get('serviceId');
            const serviceName = modalServiceName ? modalServiceName.textContent : 'Unknown Service';
            const servicePrice = modalServicePrice ? modalServicePrice.textContent : 'N/A';

            // 4. Prepare Booking Data
            const newBookingData = {
                userId: userId,
                userEmail: userEmail,
                customerName: customerName,
                customerContact: customerContact,
                serviceId: serviceId,
                serviceName: serviceName,
                servicePriceDisplay: servicePrice,
                notes: notes || "",
                paymentMethod: selectedPayment,
                bookingRequestDate: serverTimestamp(),
                bookingTime: "Pending Assignment",
                status: "Pending Confirmation"
            };

            console.log("Attempting to save booking to Firestore:", newBookingData);

            // 5. Save to Firestore
            try {
                const bookingsCollectionRef = collection(db, "bookings");
                const docRef = await addDoc(bookingsCollectionRef, newBookingData);
                console.log("Booking saved successfully to Firestore with ID:", docRef.id);

                alert(`"${serviceName}" booking request submitted successfully!\nWe will confirm your schedule soon.`); // Keep standard alert for success
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
