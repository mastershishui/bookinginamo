// booking.js - UPDATED to be a module, check auth directly, and save to Firestore

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
    storageBucket: "gjsbooking-faba9.appspot.com", // Corrected domain if needed
    messagingSenderId: "708149149410",
    appId: "1:708149149410:web:dde6a5b99b4900dd8c28bb",
    measurementId: "G-5QB9413PJH" // Optional
};

// --- Initialize Firebase (use default instance) ---
let app, auth, db;
try {
    // Use try-catch for initialization similar to admin-dashboard.js
     try {
        app = initializeApp(firebaseConfig); // Initialize default instance
        console.log("Booking.js: Firebase default instance initialized.");
    } catch (e) {
        if (e.code === 'duplicate-app') {
             console.log("Booking.js: Firebase default instance already exists, getting it.");
             app = initializeApp(firebaseConfig); // Get the existing default instance
        } else {
            throw e; // Re-throw other initialization errors
        }
    }
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Booking.js: Firebase initialized (default instance).");
} catch (e) {
    console.error("Booking.js: Error initializing Firebase:", e);
    alert("Critical Error: Could not initialize Firebase connection for booking.");
    // Optional: disable booking buttons if Firebase fails
    document.querySelectorAll('.book-button').forEach(btn => btn.disabled = true);
}


// --- Wait for the DOM ---
document.addEventListener('DOMContentLoaded', () => {
    // Get elements needed within booking.js
    const bookingModal = document.getElementById('bookingModal');
    const loginModal = document.getElementById('loginModal'); // Get login modal
    const bookingCloseButton = bookingModal ? bookingModal.querySelector('.booking-close-button') : null;
    const bookingForm = document.getElementById('bookingForm');
    const serviceButtons = document.querySelectorAll('.book-button');
    const modalServiceName = document.getElementById('modal-service-name');
    const modalServicePrice = document.getElementById('modal-service-price');
    const modalServiceId = document.getElementById('modal-service-id');
    const bookingNotes = document.getElementById('booking-notes');
    // ** Remove localStorage related variables if no longer needed **
    // const LOCAL_STORAGE_KEY = 'gjsUserBookings';
    // const myBookCounter = document.getElementById('mybook-counter'); // Counter update logic may need rework if based on Firestore


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
        bookingNotes.value = ''; // Clear previous notes
        bookingModal.style.display = 'block';
    }

    function closeBookingModal() {
        if (bookingModal) bookingModal.style.display = 'none';
    }

    // --- Event Listeners ---
    serviceButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const serviceCard = event.target.closest('.service-card');
            if (!serviceCard) {
                 console.error("Could not find parent service-card for button:", event.target);
                 return;
            }

            // --- ** NEW LOGIN CHECK ** ---
            // Directly check the currentUser from the initialized auth object
            if (auth && auth.currentUser) {
                // User is logged in
                console.log("User logged in, opening booking modal.");
                openBookingModal(serviceCard);
            } else {
                // User is not logged in
                console.log("User not logged in.");
                alert("Please log in or register to book a service.");
                if (loginModal) {
                     // Close booking modal if somehow open
                     closeBookingModal();
                    loginModal.style.display = 'block'; // Open login modal
                } else {
                     console.warn("Login modal element not found.");
                }
            }
            // --- ** END NEW LOGIN CHECK ** ---
        });
    });

    // Close modal listeners (remain the same)
    if (bookingCloseButton) {
        bookingCloseButton.addEventListener('click', closeBookingModal);
    }
    window.addEventListener('click', (event) => {
        if (bookingModal && event.target === bookingModal) closeBookingModal();
    });


    // --- ** NEW Booking Form Submission (Save to Firestore) ** ---
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (event) => { // Make async
            event.preventDefault();
            const submitButton = bookingForm.querySelector('button[type="submit"]');
            submitButton.disabled = true; // Disable button during submission
            submitButton.textContent = 'Booking...';

            // 1. Check Authentication again (important!)
            if (!auth || !auth.currentUser) {
                alert("You seem to be logged out. Please log in again to book.");
                closeBookingModal();
                if (loginModal) loginModal.style.display = 'block';
                 submitButton.disabled = false;
                 submitButton.textContent = 'Confirm Booking';
                return;
            }
            const userId = auth.currentUser.uid;
            const userEmail = auth.currentUser.email; // Get email

            // 2. Get User Details (Name, Contact) from Firestore 'users' collection
            let customerName = userEmail; // Fallback to email
            let customerContact = 'N/A';
            try {
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    // Combine first and last name if they exist
                    customerName = `${userData.firstname || ''} ${userData.lastname || ''}`.trim() || userEmail;
                    customerContact = userData.contact || 'N/A';
                    console.log("Fetched user details:", customerName, customerContact);
                } else {
                    console.warn("User document not found in Firestore, using default info.");
                }
            } catch (error) {
                console.error("Error fetching user details:", error);
                // Proceed with default info, but log the error
            }


            // 3. Get Form Data
            const formData = new FormData(bookingForm);
            const selectedPayment = formData.get('payment');
            const notes = formData.get('notes');
            const serviceId = formData.get('serviceId');
            const serviceName = modalServiceName ? modalServiceName.textContent : 'Unknown Service';
            const servicePrice = modalServicePrice ? modalServicePrice.textContent : 'N/A';

            // 4. Prepare Booking Data for Firestore
            const newBookingData = {
                userId: userId,
                userEmail: userEmail, // Store email used for booking
                customerName: customerName, // Store fetched name
                customerContact: customerContact, // Store fetched contact
                serviceId: serviceId,
                serviceName: serviceName,
                servicePriceDisplay: servicePrice, // Store the displayed price string
                notes: notes || "", // Store empty string if no notes
                paymentMethod: selectedPayment,
                bookingRequestDate: serverTimestamp(), // Use Firestore server time for request date
                bookingTime: "Pending Assignment", // Admin will likely set the actual time
                status: "Pending Confirmation" // Initial status
            };

            console.log("Attempting to save booking to Firestore:", newBookingData);

            // 5. Save to Firestore
            try {
                const bookingsCollectionRef = collection(db, "bookings");
                const docRef = await addDoc(bookingsCollectionRef, newBookingData);
                console.log("Booking saved successfully to Firestore with ID:", docRef.id);

                alert(`"${serviceName}" booking request submitted successfully!\nWe will confirm your schedule soon.`);
                closeBookingModal();
                // Optionally update a counter or redirect
                 // updateBookingCounter(); // You'll need a Firestore-based counter now

            } catch (error) {
                console.error("Error saving booking to Firestore:", error);
                alert(`Failed to submit booking. Please try again.\nError: ${error.message}`);
            } finally {
                 submitButton.disabled = false; // Re-enable button
                 submitButton.textContent = 'Confirm Booking';
            }
        });
    } else {
        console.warn("Booking form element not found.");
    }

    // --- Remove or Adapt Counter Logic ---
    // The old localStorage counter logic needs to be replaced
    // if you want a real-time counter based on Firestore bookings for the logged-in user.
    // This requires a separate Firestore listener. For now, let's disable the old one.
    // if (myBookCounter) myBookCounter.style.display = 'none'; // Hide counter initially
    console.log("Booking.js: Old localStorage counter logic needs replacement for Firestore.");

}); // End DOMContentLoaded
