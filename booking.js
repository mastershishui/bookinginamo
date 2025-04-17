// booking.js - UPDATED to use custom booking confirmation modal

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
        } else { throw e; }
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
    console.log("Booking.js: DOM loaded."); // Added log

    // --- Get elements needed ---
    const bookingModal = document.getElementById('bookingModal');
    const loginModal = document.getElementById('loginModal');
    const bookingCloseButton = bookingModal ? bookingModal.querySelector('.booking-close-button') : null;
    const bookingForm = document.getElementById('bookingForm');
    const serviceButtons = document.querySelectorAll('.book-button');
    const modalServiceName = document.getElementById('modal-service-name');
    const modalServicePrice = document.getElementById('modal-service-price');
    const modalServiceId = document.getElementById('modal-service-id');
    const modalPriceValue = document.getElementById('modal-price-value');
    const bookingNotes = document.getElementById('booking-notes');
    const authModal = document.getElementById('authNotificationModal');
    const authModalCloseBtn = authModal ? authModal.querySelector('.auth-notification-close') : null;
    const authModalOkBtn = authModal ? authModal.querySelector('.auth-notification-ok-btn') : null;
    const bookingQuantityInput = document.getElementById('booking-quantity');

    // ** Get Booking Confirmation Modal elements **
    const bookingConfirmationModal = document.getElementById('bookingConfirmationModal');
    const confirmServiceName = document.getElementById('confirm-service-name');
    const confirmQuantity = document.getElementById('confirm-quantity');
    const confirmTotalPrice = document.getElementById('confirm-total-price');
    const bookingConfirmationCloseBtn = bookingConfirmationModal ? bookingConfirmationModal.querySelector('.booking-confirmation-close') : null;
    const bookingConfirmationOkBtn = bookingConfirmationModal ? bookingConfirmationModal.querySelector('.booking-confirmation-ok-btn') : null;

    // --- Log Element Selections (for debugging) ---
    console.log({
        bookingModal, loginModal, bookingCloseButton, bookingForm, serviceButtonsLength: serviceButtons.length,
        modalServiceName, modalServicePrice, modalServiceId, modalPriceValue, bookingNotes, authModal,
        authModalCloseBtn, authModalOkBtn, bookingQuantityInput, bookingConfirmationModal, confirmServiceName,
        confirmQuantity, confirmTotalPrice, bookingConfirmationCloseBtn, bookingConfirmationOkBtn
    });


    // --- Modal Handling ---
    function openBookingModal(serviceCard) {
        if (!bookingModal || !modalServiceId || !modalServiceName || !modalServicePrice || !bookingNotes || !bookingQuantityInput || !modalPriceValue) {
            console.error("Booking modal or its inner elements (incl. quantity/price value) not found!"); return;
        }
        const serviceId = serviceCard.dataset.serviceId;
        const serviceName = serviceCard.dataset.serviceName;
        let price = serviceCard.dataset.price; let displayPrice;
        if (!price || isNaN(Number(price))) {
             const priceElement = serviceCard.querySelector('.service-price');
             displayPrice = priceElement ? priceElement.textContent : 'Price unavailable'; price = 0;
        } else {
              try { displayPrice = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(price); } catch (e) { displayPrice = `₱${price}`; }
        }
        console.log("Opening booking modal for:", serviceName, displayPrice, serviceId);
        modalServiceId.value = serviceId;
        modalServiceName.textContent = serviceName;
        modalServicePrice.textContent = displayPrice;
        modalPriceValue.value = price;
        bookingNotes.value = '';
        bookingQuantityInput.value = '1';
        bookingModal.style.display = 'block';
    }

    function closeBookingModal() { if (bookingModal) bookingModal.style.display = 'none'; }
    function closeAuthNotification() { if (authModal) authModal.style.display = 'none'; }

    // ** NEW: Function to close the Booking Confirmation Modal **
    function closeBookingConfirmation() {
        if (bookingConfirmationModal) {
            bookingConfirmationModal.style.display = 'none';
        }
    }

    // --- Event Listeners for Modals ---
    // Auth Notification Listeners
    if (authModalCloseBtn) { authModalCloseBtn.addEventListener('click', closeAuthNotification); }
    if (authModalOkBtn) { authModalOkBtn.addEventListener('click', () => { closeAuthNotification(); if (loginModal) loginModal.style.display = 'block'; }); }
    if (authModal) { authModal.addEventListener('click', (event) => { if (event.target === authModal) closeAuthNotification(); }); }

    // Booking Modal Close Listeners
    if (bookingCloseButton) { bookingCloseButton.addEventListener('click', closeBookingModal); }
    window.addEventListener('click', (event) => { if (bookingModal && event.target === bookingModal) closeBookingModal(); }); // Close booking modal on overlay click

    // ** NEW: Add event listeners for Booking Confirmation Modal **
    if (bookingConfirmationCloseBtn) {
        bookingConfirmationCloseBtn.addEventListener('click', closeBookingConfirmation);
        console.log("Listener added for booking confirmation close button.");
    } else { console.warn("Booking confirmation close button not found."); }

    if (bookingConfirmationOkBtn) {
        bookingConfirmationOkBtn.addEventListener('click', closeBookingConfirmation);
         console.log("Listener added for booking confirmation OK button.");
    } else { console.warn("Booking confirmation OK button not found."); }

    if (bookingConfirmationModal) {
        bookingConfirmationModal.addEventListener('click', (event) => {
            if (event.target === bookingConfirmationModal) { // Click on overlay
                closeBookingConfirmation();
            }
        });
        console.log("Listener added for booking confirmation overlay click.");
    } else { console.warn("Booking confirmation modal element not found for overlay click listener."); }


    // --- Event Listeners for Book Now buttons ---
    if(serviceButtons.length > 0){
        serviceButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                 console.log("Book Now button clicked!"); // Debug log
                 const serviceCard = event.target.closest('.service-card');
                 if (!serviceCard) { console.error("Could not find parent service card."); return; }

                 if (auth && auth.currentUser) {
                     console.log("User logged in, opening booking modal.");
                     openBookingModal(serviceCard);
                 } else {
                     console.log("User not logged in, showing auth notification.");
                     if (authModal) {
                         authModal.style.display = 'block';
                     } else {
                         console.error("Auth notification modal not found!");
                         alert("Please log in or register to book a service.");
                     }
                 }
            });
        });
    } else {
        console.warn("No '.book-button' elements found on this page.");
    }


    // --- Booking Form Submission (Save to Firestore) ---
    // ***** UPDATED TO SHOW CUSTOM CONFIRMATION MODAL *****
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (event) => {
            event.preventDefault();
             console.log("Booking form submitted."); // Debug log
             const submitButton = bookingForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Booking...';

            if (!auth || !auth.currentUser) {
                 console.error("Booking submit failed: User not authenticated.");
                 alert("Authentication error. Please log in again.");
                 closeBookingModal();
                 if (authModal) authModal.style.display = 'block';
                 submitButton.disabled = false;
                 submitButton.textContent = 'Confirm Booking';
                 return;
             }
            const userId = auth.currentUser.uid;
            const userEmail = auth.currentUser.email;

            // Get User Details
            let customerName = userEmail; let customerContact = 'N/A';
            try {
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    customerName = `${userData.firstname || ''} ${userData.lastname || ''}`.trim() || userEmail;
                    customerContact = userData.contact || 'N/A';
                    console.log("Fetched user details:", customerName, customerContact);
                 } else { console.warn("User document not found in Firestore."); }
            } catch (error) { console.error("Error fetching user details:", error); }

            // Get Form Data
            const formData = new FormData(bookingForm);
            const selectedPayment = formData.get('payment');
            const notes = formData.get('notes');
            const serviceId = formData.get('serviceId');
            const serviceName = modalServiceName ? modalServiceName.textContent : 'Unknown Service';
            const servicePriceDisplay = modalServicePrice ? modalServicePrice.textContent : 'N/A';
            const pricePerUnit = parseFloat(modalPriceValue.value) || 0;
            const quantity = parseInt(bookingQuantityInput.value, 10) || 1;
            const totalPrice = pricePerUnit * quantity;
            const totalPriceDisplay = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalPrice);

            // Prepare Booking Data
            const newBookingData = {
                 userId, userEmail, customerName, customerContact, serviceId, serviceName,
                 servicePriceDisplay, quantity, totalPrice, totalPriceDisplay, notes: notes || "",
                 paymentMethod: selectedPayment, bookingRequestDate: serverTimestamp(),
                 bookingTime: "Pending Assignment", status: "Pending Confirmation"
             };

            console.log("Attempting to save booking to Firestore:", newBookingData);

            // Save to Firestore
            try {
                const bookingsCollectionRef = collection(db, "bookings");
                const docRef = await addDoc(bookingsCollectionRef, newBookingData);
                console.log("Booking saved successfully to Firestore with ID:", docRef.id);

                // ** NEW: Show Custom Confirmation Modal **
                closeBookingModal(); // Close the form modal first

                // Populate the confirmation modal (check elements exist first)
                if (confirmServiceName) confirmServiceName.textContent = serviceName; else console.warn("confirm-service-name element not found");
                if (confirmQuantity) confirmQuantity.textContent = `Qty: ${quantity}`; else console.warn("confirm-quantity element not found");
                if (confirmTotalPrice) confirmTotalPrice.textContent = totalPriceDisplay; else console.warn("confirm-total-price element not found");

                // Show the confirmation modal
                if (bookingConfirmationModal) {
                    console.log("Displaying booking confirmation modal.");
                    bookingConfirmationModal.style.display = 'block';
                } else {
                    // Fallback if modal HTML is missing
                    console.error("Booking confirmation modal not found! Using alert as fallback.");
                    alert(`"${serviceName}" (Qty: ${quantity}) booking request submitted successfully!\nTotal: ${totalPriceDisplay}\nWe will confirm your schedule soon.`);
                }
                // ** END NEW **

                // alert(`"${serviceName}" (Qty: ${quantity})...`); // <-- REMOVED old alert

            } catch (error) {
                console.error("Error saving booking to Firestore:", error);
                alert(`Failed to submit booking. Please try again.\nError: ${error.message}`);
            } finally {
                 submitButton.disabled = false;
                 submitButton.textContent = 'Confirm Booking';
            }
        });
    } else { console.warn("Booking form element not found."); }

    console.log("Booking.js: Event listeners setup complete.");

}); // End DOMContentLoaded
