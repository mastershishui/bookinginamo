// booking.js

// --- Import Firebase services needed ---
// Import auth and db from your main firebase setup file
import { auth, db } from './firebase-auth.js'; // Adjust path if needed

// Import Firestore functions for saving data
import {
    collection,
    addDoc,
    serverTimestamp, // For reliable timestamps
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";


document.addEventListener('DOMContentLoaded', () => {
    // Get Modal Elements
    const bookingModal = document.getElementById('bookingModal');
    const loginModal = document.getElementById('loginModal'); // Needed to open if user is not logged in
    const bookingCloseButton = bookingModal ? bookingModal.querySelector('.booking-close-button') : null;
    const bookingForm = document.getElementById('bookingForm');

    // Get Service Buttons
    const serviceButtons = document.querySelectorAll('.book-button');

    // Get Modal Content Elements (Check existence)
    const modalServiceName = document.getElementById('modal-service-name');
    const modalServicePrice = document.getElementById('modal-service-price');
    const modalServiceId = document.getElementById('modal-service-id');
    const bookingNotes = document.getElementById('booking-notes');

    // --- Removed localStorage and Counter Logic ---
    // The admin dashboard reads directly from Firestore.
    // If customers need a count, the 'mybook.html' page should query Firestore.


    // --- Modal Handling ---

    function openBookingModal(serviceCard) {
        // Ensure bookingModal and its inner elements exist
        if (!bookingModal || !modalServiceId || !modalServiceName || !modalServicePrice || !bookingNotes) {
            console.error("Booking modal or its inner elements not found!");
            return;
        }

        const serviceId = serviceCard.dataset.serviceId;
        const serviceName = serviceCard.dataset.serviceName;
        let price = serviceCard.dataset.price;
        let displayPrice;

        // Handle different price formats
        if (!price || price === 'VARIES' || price === 'PACKAGE') {
            const priceElement = serviceCard.querySelector('.service-price');
            displayPrice = priceElement ? priceElement.textContent : 'Price unavailable';
        } else {
            try {
                displayPrice = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(price);
            } catch (e) {
                displayPrice = `₱${price}`; // Fallback
            }
        }

        console.log("Opening booking modal for:", serviceName, displayPrice, serviceId);

        // Populate Modal
        modalServiceId.value = serviceId;
        modalServiceName.textContent = serviceName;
        modalServicePrice.textContent = displayPrice;
        bookingNotes.value = ''; // Clear previous notes

        // Reset payment option to default (e.g., GCash)
        const defaultPayment = document.getElementById('payment-gcash');
        if (defaultPayment) defaultPayment.checked = true;

        bookingModal.style.display = 'block';
    }

    function closeBookingModal() {
        if (bookingModal) {
            bookingModal.style.display = 'none';
        }
    }

    // --- Event Listeners ---

    // Add listeners to all "Book Now" buttons
    serviceButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const serviceCard = event.target.closest('.service-card');
            if (serviceCard) {

                // --- !!! CORRECTED LOGIN STATUS CHECK !!! ---
                if (auth.currentUser) {
                    // User IS logged in according to Firebase Auth
                    console.log("User is logged in. Opening booking modal.");
                    openBookingModal(serviceCard);
                } else {
                    // User is NOT logged in
                    console.log("User is not logged in. Prompting to login.");
                    alert("Please log in or register to book a service.");
                    closeBookingModal(); // Close booking modal if open
                    // Attempt to open the login modal
                    if (loginModal) {
                         // Close other modals first (assuming firebase-auth.js makes closeAllModals global or accessible)
                         if (typeof window.closeAllModals === 'function') {
                             window.closeAllModals();
                         }
                        loginModal.style.display = 'block';
                    } else {
                        console.warn("Login modal element not found to open automatically.");
                        // Fallback: maybe trigger the login link click if modal isn't found?
                         const loginLink = document.getElementById('loginLink');
                         if(loginLink) loginLink.click();
                    }
                }
                // --- End Login Status Check ---

            } else {
                console.error("Could not find parent service-card for button:", event.target);
            }
        });
    });

    // Close modal when clicking the close button (X)
    if (bookingCloseButton) {
        bookingCloseButton.addEventListener('click', closeBookingModal);
    } else if (bookingModal) {
        console.warn("Booking modal close button not found.");
    }

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (bookingModal && event.target === bookingModal) {
            closeBookingModal();
        }
    });

    // Handle booking form submission
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (event) => { // Made async
            event.preventDefault();

            // --- !!! CHECK LOGIN AGAIN BEFORE SUBMITTING !!! ---
            // Crucial security step - ensure user didn't get logged out
            // between opening the modal and submitting.
            if (!auth.currentUser) {
                alert("Your session may have expired. Please log in again to confirm booking.");
                closeBookingModal();
                 if (loginModal) {
                     if (typeof window.closeAllModals === 'function') window.closeAllModals();
                     loginModal.style.display = 'block';
                 } else {
                      const loginLink = document.getElementById('loginLink');
                      if(loginLink) loginLink.click();
                 }
                return; // Stop submission
            }
            // --- End Re-check ---

            const formData = new FormData(bookingForm);
            const selectedPayment = formData.get('payment');
            const notes = formData.get('notes');
            const serviceId = formData.get('serviceId');
            const serviceName = modalServiceName ? modalServiceName.textContent : 'Unknown Service';
            const servicePriceDisplay = modalServicePrice ? modalServicePrice.textContent : 'N/A'; // Price as displayed

            // Get current user details
            const userId = auth.currentUser.uid;
            const userEmail = auth.currentUser.email;

            // --- Fetch user's name and contact from Firestore 'users' collection ---
            let customerName = userEmail; // Default to email
            let customerContact = 'N/A'; // Default contact
            try {
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    // Use firstname/lastname if available, otherwise username, fallback email
                    customerName = `${userData.firstname || ''} ${userData.lastname || ''}`.trim();
                    if (!customerName) customerName = userData.username || userEmail; // Use username if name is blank
                    customerContact = userData.contact || 'N/A'; // Get contact number
                } else {
                    console.warn(`User document not found for UID: ${userId}. Using default info.`);
                }
            } catch (err) {
                console.error("Error fetching user details for booking:", err);
                // Continue with default info if fetching fails
            }
             // --- End fetching user details ---


            // Disable button
            const submitButton = bookingForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';

            // Prepare data object for Firestore
            const bookingData = {
                userId: userId,
                userEmail: userEmail,
                customerName: customerName, // Include fetched name
                customerContact: customerContact, // Include fetched contact
                serviceId: serviceId,
                serviceName: serviceName,
                servicePriceDisplay: servicePriceDisplay, // Store the display price string
                notes: notes || "", // Store empty string if no notes
                paymentMethod: selectedPayment,
                status: "Pending Confirmation", // Initial status
                bookingRequestDate: serverTimestamp() // Use Firestore server timestamp
            };

            console.log("Submitting Booking Data to Firestore:", bookingData);

            try {
                // --- SAVE TO FIRESTORE 'bookings' collection ---
                const bookingsColRef = collection(db, "bookings");
                const docRef = await addDoc(bookingsColRef, bookingData);
                console.log("Booking saved to Firestore with ID:", docRef.id);

                // Success feedback
                closeBookingModal();
                alert(`"${serviceName}" booked successfully!\nPayment: ${selectedPayment}\nWe will confirm your booking soon.`);
                // Optionally: Redirect to a 'My Bookings' page or update UI
                // window.location.href = 'mybook.html';

            } catch (error) {
                console.error("Error saving booking to Firestore:", error);
                alert(`Booking failed: ${error.message}\nPlease try again.`);
            } finally {
                // Re-enable button
                submitButton.disabled = false;
                submitButton.textContent = 'Confirm Booking';
            }
        });
    } else {
        console.warn("Booking form element not found.");
    }

    // --- Initial Setup ---
    // No initial counter update needed here anymore as it's removed.

}); // End DOMContentLoaded
