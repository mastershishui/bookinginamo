document.addEventListener('DOMContentLoaded', () => {
    // Ensure modal elements are potentially findable, even if initially hidden
    const bookingModal = document.getElementById('bookingModal');
    const loginModal = document.getElementById('loginModal'); // Get login modal too

    // Check if bookingModal exists before querying inside it
    const bookingCloseButton = bookingModal ? bookingModal.querySelector('.booking-close-button') : null;
    const bookingForm = document.getElementById('bookingForm'); // Assuming ID exists directly

    const serviceButtons = document.querySelectorAll('.book-button');
    // We don't need myBookLinkLi here anymore for visibility control
    const myBookCounter = document.getElementById('mybook-counter');

    // Check if modal content elements exist before assigning
    const modalServiceName = document.getElementById('modal-service-name');
    const modalServicePrice = document.getElementById('modal-service-price');
    const modalServiceId = document.getElementById('modal-service-id');
    const bookingNotes = document.getElementById('booking-notes');

    const LOCAL_STORAGE_KEY = 'gjsUserBookings'; // Key for storing bookings in localStorage

    // --- Booking Counter Logic ---

    function getBookings() {
        // Using localStorage for demonstration
        const bookingsJson = localStorage.getItem(LOCAL_STORAGE_KEY);
        // Add error handling for parsing
        try {
            return bookingsJson ? JSON.parse(bookingsJson) : [];
        } catch (e) {
            console.error("Error parsing bookings from localStorage:", e);
            localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
            return [];
        }
    }

    function saveBookings(bookings) {
        // In a real app, save to Firebase associated with user ID
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bookings));
        updateBookingCounterGlobal(); // Update counter whenever bookings are saved (use global ref)
    }

    // --- MODIFIED updateBookingCounter ---
    function updateBookingCounter() {
        const bookings = getBookings();
        const count = bookings.length;

        if (!myBookCounter) {
            // Counter element might not exist on all pages, that's okay.
            // console.warn("My Book counter element not found.");
            return count; // Return count regardless of element presence
        }

        // Update the counter SPAN's text and visibility
        if (count > 0) {
            myBookCounter.textContent = count;
            myBookCounter.style.display = 'inline-block'; // Show counter span
        } else {
            myBookCounter.textContent = '0';
            myBookCounter.style.display = 'none'; // Hide counter span if zero
        }

        // --- REMOVED --- control of the parent LI visibility
        // if (myBookLinkLi) myBookLinkLi.style.display = 'list-item'; // REMOVED

        // --- ADDED ---
        return count; // Return the count for firebase-auth.js
    }
    // Expose function to be callable from firebase-auth.js
    window.updateBookingCounterGlobal = updateBookingCounter;
    // --- End MODIFIED updateBookingCounter ---


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

        if (!price || price === 'VARIES' || price === 'PACKAGE') {
            const priceElement = serviceCard.querySelector('.service-price');
            displayPrice = priceElement ? priceElement.textContent : 'Price unavailable';
        } else {
            // Format currency consistently - e.g., using Intl.NumberFormat
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
                // --- Check Login Status using function from firebase-auth.js ---
                if (typeof window.checkUserLoginStatus === 'function' && window.checkUserLoginStatus()) {
                    // User is logged in, proceed to open modal
                    openBookingModal(serviceCard);
                } else {
                    // User is not logged in
                    alert("Please log in or register to book a service.");
                    // Attempt to open the login modal
                    if (loginModal) {
                         // Optional: close other modals first if a global close function is available
                         // if(typeof window.closeAllModals === 'function') window.closeAllModals();
                         loginModal.style.display = 'block';
                    } else {
                        console.warn("Login modal element not found to open automatically.");
                        // Fallback: maybe trigger the login link click if modal isn't found?
                        // const loginLink = document.getElementById('loginLink');
                        // if(loginLink) loginLink.click();
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
        // Ensure bookingModal exists before checking if it's the target
        if (bookingModal && event.target === bookingModal) {
            closeBookingModal();
        }
    });

    // Handle booking form submission
    if (bookingForm) {
        bookingForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const formData = new FormData(bookingForm);
            const selectedPayment = formData.get('payment');
            const notes = formData.get('notes');
            const serviceId = formData.get('serviceId');
            // Ensure these elements exist before accessing textContent
            const serviceName = modalServiceName ? modalServiceName.textContent : 'Unknown Service';
            const servicePrice = modalServicePrice ? modalServicePrice.textContent : 'N/A';

             // **TODO: Get Logged-in User ID from Firebase Auth**
             // This is crucial for switching from localStorage to Firestore
             let userId = null;
             if (typeof window.getCurrentUserId === 'function') { // Assume firebase-auth exposes this
                userId = window.getCurrentUserId();
             }
             // If not using Firestore yet, userId can remain null or be omitted

            const newBooking = {
                // userId: userId, // Include when saving to Firestore
                bookingId: `booking_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                serviceId: serviceId,
                serviceName: serviceName,
                servicePriceDisplay: servicePrice,
                notes: notes || "No notes",
                paymentMethod: selectedPayment,
                bookingDate: new Date().toISOString(),
                status: "Pending Confirmation" // Default status
            };

            console.log("New Booking Data:", newBooking);

            // Add booking to storage
            const currentBookings = getBookings();
            currentBookings.push(newBooking);
            saveBookings(currentBookings); // saveBookings calls updateBookingCounter

            // Close modal and give feedback
            closeBookingModal();
            alert(`"${serviceName}" booked successfully!\nPayment: ${selectedPayment}\nCheck "My Book" for details.`);
        });
    } else {
        console.warn("Booking form element not found.");
    }

    // --- Initial Setup ---
    // Initial counter update on page load (might be called again by firebase-auth)
    updateBookingCounterGlobal(); // Use global reference

}); // End DOMContentLoaded
