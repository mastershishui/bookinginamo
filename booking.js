// booking.js

// --- Import Firebase services needed ---
import { auth, db } from './firebase-auth.js'; // Adjust path if needed
import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log("Booking script running."); // Good to keep for checks

    // Get Modal Elements (Ensure they exist when DOM loads)
    const bookingModal = document.getElementById('bookingModal');
    const loginModal = document.getElementById('loginModal');
    const bookingCloseButton = bookingModal ? bookingModal.querySelector('.booking-close-button') : null;
    const bookingForm = document.getElementById('bookingForm');

    // Get Modal Content Elements (Check existence)
    const modalServiceName = document.getElementById('modal-service-name');
    const modalServicePrice = document.getElementById('modal-service-price');
    const modalServiceId = document.getElementById('modal-service-id');
    const bookingNotes = document.getElementById('booking-notes');

    // --- MODIFICATION: Use Event Delegation ---
    // Get the container that holds all your service cards
    // **** IMPORTANT: Replace '#services-container' with the ACTUAL ID or selector ****
    // **** of the parent element holding your service cards.           ****
    // **** If no specific container, you could use document.body       ****
    const servicesContainer = document.querySelector('#services-container'); // <-- CHANGE THIS SELECTOR if needed

    if (!servicesContainer) {
        console.error("CRITICAL: Services container ('#services-container') not found. Event delegation for booking buttons will not work. Please update the selector in booking.js.");
    } else {
        console.log("Attaching booking click listener to:", servicesContainer);
        servicesContainer.addEventListener('click', (event) => {
            // Check if the clicked element (or its ancestor) is a '.book-button'
            const bookButton = event.target.closest('.book-button');

            // If the click wasn't on a book button (or inside it), do nothing
            if (!bookButton) {
                return;
            }

            console.log("Book button clicked (delegated):", bookButton); // Log indicates the listener fired correctly

            const serviceCard = bookButton.closest('.service-card');
            if (serviceCard) {
                // --- Login Status Check (Crucial Part) ---
                if (auth.currentUser) {
                    // User IS logged in according to Firebase Auth
                    console.log("User is logged in. Opening booking modal.");
                    openBookingModal(serviceCard); // Call your existing function
                } else {
                    // User is NOT logged in
                    console.log("User is not logged in. Prompting to login.");
                    alert("Please log in or register to book a service.");
                    closeBookingModal(); // Close booking modal if somehow open

                    // Attempt to open the login modal
                    if (loginModal) {
                         // Close other modals first
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
                console.error("Could not find parent .service-card for button:", bookButton);
            }
        });
    }
    // --- END MODIFICATION ---

    // --- Modal Handling Functions (Keep these as they are) ---
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

        // Reset payment option to default
        const defaultPayment = document.getElementById('payment-gcash');
        if (defaultPayment) defaultPayment.checked = true;

        bookingModal.style.display = 'block';
    }

    function closeBookingModal() {
        if (bookingModal) {
            bookingModal.style.display = 'none';
        }
    }

    // --- Event Listeners for Modal Closing (Keep these) ---
    if (bookingCloseButton) {
        bookingCloseButton.addEventListener('click', closeBookingModal);
    } else if (bookingModal) {
        console.warn("Booking modal close button not found.");
    }

    window.addEventListener('click', (event) => {
        if (bookingModal && event.target === bookingModal) {
            closeBookingModal();
        }
    });

    // --- Handle booking form submission (Keep this as is) ---
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Re-check login before submitting
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

            const formData = new FormData(bookingForm);
            const selectedPayment = formData.get('payment');
            const notes = formData.get('notes');
            const serviceId = formData.get('serviceId');
            const serviceName = modalServiceName ? modalServiceName.textContent : 'Unknown Service';
            const servicePriceDisplay = modalServicePrice ? modalServicePrice.textContent : 'N/A';

            const userId = auth.currentUser.uid;
            const userEmail = auth.currentUser.email;

            let customerName = userEmail;
            let customerContact = 'N/A';
            try {
                const userDocRef = doc(db, "users", userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    customerName = `${userData.firstname || ''} ${userData.lastname || ''}`.trim();
                    if (!customerName) customerName = userData.username || userEmail;
                    customerContact = userData.contact || 'N/A';
                } else {
                    console.warn(`User document not found for UID: ${userId}. Using default info.`);
                }
            } catch (err) {
                console.error("Error fetching user details for booking:", err);
            }

            const submitButton = bookingForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';

            const bookingData = {
                userId: userId,
                userEmail: userEmail,
                customerName: customerName,
                customerContact: customerContact,
                serviceId: serviceId,
                serviceName: serviceName,
                servicePriceDisplay: servicePriceDisplay,
                notes: notes || "",
                paymentMethod: selectedPayment,
                status: "Pending Confirmation",
                bookingRequestDate: serverTimestamp()
            };

            console.log("Submitting Booking Data to Firestore:", bookingData);

            try {
                const bookingsColRef = collection(db, "bookings");
                const docRef = await addDoc(bookingsColRef, bookingData);
                console.log("Booking saved to Firestore with ID:", docRef.id);
                closeBookingModal();
                alert(`"${serviceName}" booked successfully!\nPayment: ${selectedPayment}\nWe will confirm your booking soon.`);
                 // Optional redirect:
                 // window.location.href = 'mybook.html';
            } catch (error) {
                console.error("Error saving booking to Firestore:", error);
                alert(`Booking failed: ${error.message}\nPlease try again.`);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Confirm Booking';
            }
        });
    } else {
        console.warn("Booking form element not found.");
    }

}); // End DOMContentLoaded
