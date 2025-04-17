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
    // Get elements needed
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

    // ** NEW: Get Booking Confirmation Modal elements **
    const bookingConfirmationModal = document.getElementById('bookingConfirmationModal');
    const confirmServiceName = document.getElementById('confirm-service-name');
    const confirmQuantity = document.getElementById('confirm-quantity');
    const confirmTotalPrice = document.getElementById('confirm-total-price');
    const bookingConfirmationCloseBtn = bookingConfirmationModal ? bookingConfirmationModal.querySelector('.booking-confirmation-close') : null;
    const bookingConfirmationOkBtn = bookingConfirmationModal ? bookingConfirmationModal.querySelector('.booking-confirmation-ok-btn') : null;


    // --- Modal Handling ---
    // (openBookingModal remains the same)
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
    // (Auth Notification listeners remain the same)
    if (authModalCloseBtn) { authModalCloseBtn.addEventListener('click', closeAuthNotification); }
    if (authModalOkBtn) { authModalOkBtn.addEventListener('click', () => { closeAuthNotification(); if (loginModal) loginModal.style.display = 'block'; }); }
    if (authModal) { authModal.addEventListener('click', (event) => { if (event.target === authModal) closeAuthNotification(); }); }

    // (Booking Modal close listeners remain the same)
    if (bookingCloseButton) { bookingCloseButton.addEventListener('click', closeBookingModal); }
    window.addEventListener('click', (event) => { if (bookingModal && event.target === bookingModal) closeBookingModal(); });

    // ** NEW: Add event listeners for Booking Confirmation Modal **
    if (bookingConfirmationCloseBtn) {
        bookingConfirmationCloseBtn.addEventListener('click', closeBookingConfirmation);
    }
    if (bookingConfirmationOkBtn) {
        bookingConfirmationOkBtn.addEventListener('click', closeBookingConfirmation);
    }
    if (bookingConfirmationModal) {
        bookingConfirmationModal.addEventListener('click', (event) => {
            if (event.target === bookingConfirmationModal) { // Click on overlay
                closeBookingConfirmation();
            }
        });
    }

    // --- Event Listeners for Book Now buttons --- (remain the same)
    serviceButtons.forEach(button => { /* ... */ });

    // --- Booking Form Submission (Save to Firestore) ---
    // ***** UPDATED TO SHOW CUSTOM CONFIRMATION MODAL *****
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = bookingForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Booking...';

            if (!auth || !auth.currentUser) { /* ... Auth check ... */ return; }
            const userId = auth.currentUser.uid;
            const userEmail = auth.currentUser.email;

            // Get User Details (remains the same)
            let customerName = userEmail; let customerContact = 'N/A';
            try { /* ... Fetch user details ... */ } catch (error) { /* ... */ }

            // Get Form Data (remains the same)
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

            // Prepare Booking Data (remains the same)
            const newBookingData = { /* ... booking data ... */ };

            console.log("Attempting to save booking to Firestore:", newBookingData);

            // Save to Firestore
            try {
                const bookingsCollectionRef = collection(db, "bookings");
                const docRef = await addDoc(bookingsCollectionRef, newBookingData);
                console.log("Booking saved successfully to Firestore with ID:", docRef.id);

                // ** NEW: Show Custom Confirmation Modal **
                closeBookingModal(); // Close the form modal first

                // Populate the confirmation modal (check elements exist first)
                if (confirmServiceName) confirmServiceName.textContent = serviceName;
                if (confirmQuantity) confirmQuantity.textContent = `Qty: ${quantity}`;
                if (confirmTotalPrice) confirmTotalPrice.textContent = totalPriceDisplay;

                // Show the confirmation modal
                if (bookingConfirmationModal) {
                    bookingConfirmationModal.style.display = 'block';
                } else {
                    // Fallback if modal HTML is missing
                    console.error("Booking confirmation modal not found!");
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

    console.log("Booking.js: Event listeners added.");
}); // End DOMContentLoaded
