document.addEventListener('DOMContentLoaded', () => {
    const bookingModal = document.getElementById('bookingModal');
    const bookingCloseButton = bookingModal.querySelector('.booking-close-button');
    const bookingForm = document.getElementById('bookingForm');
    const serviceButtons = document.querySelectorAll('.book-button');
    const myBookLinkLi = document.getElementById('nav-mybook-link-li'); // Li element for visibility
    const myBookCounter = document.getElementById('mybook-counter');

    const modalServiceName = document.getElementById('modal-service-name');
    const modalServicePrice = document.getElementById('modal-service-price');
    const modalServiceId = document.getElementById('modal-service-id');
    const bookingNotes = document.getElementById('booking-notes');

    const LOCAL_STORAGE_KEY = 'gjsUserBookings'; // Key for storing bookings in localStorage

    // --- Booking Counter Logic ---

    function getBookings() {
        // In a real app, fetch from Firebase based on logged-in user
        // Using localStorage for demonstration
        const bookingsJson = localStorage.getItem(LOCAL_STORAGE_KEY);
        return bookingsJson ? JSON.parse(bookingsJson) : [];
    }

    function saveBookings(bookings) {
        // In a real app, save to Firebase
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bookings));
        updateBookingCounter(); // Update counter whenever bookings are saved
    }

    function updateBookingCounter() {
        const bookings = getBookings();
        const count = bookings.length;

        if (count > 0) {
            myBookCounter.textContent = count;
            myBookCounter.style.display = 'inline-block'; // Show counter
            if (myBookLinkLi) myBookLinkLi.style.display = 'list-item'; // Ensure "My Book" link is visible if user is logged in and has bookings
        } else {
            myBookCounter.textContent = '0';
            myBookCounter.style.display = 'none'; // Hide counter if zero
            // Optional: Hide "My Book" link if no bookings AND user logged in? Depends on your logic in firebase-auth.js
            // Check if user is logged in (you'll need a way to check this from firebase-auth.js, maybe a global variable or function)
            // const isLoggedIn = checkLoginStatus(); // Assume this function exists
            // if (!isLoggedIn && myBookLinkLi) {
            //     myBookLinkLi.style.display = 'none';
            // } else if (isLoggedIn && count === 0 && myBookLinkLi) {
                 // Keep it visible but counter hidden, or hide it? Your choice.
                 // myBookLinkLi.style.display = 'list-item'; // Example: Keep visible if logged in
            // }
        }
        // Note: The visibility of the 'My Book' link itself is primarily controlled
        // by your firebase-auth.js based on login status. This function mainly handles the counter display.
        // Ensure firebase-auth.js calls updateBookingCounter() after login/logout.
    }

    // --- Modal Handling ---

    function openBookingModal(serviceCard) {
        const serviceId = serviceCard.dataset.serviceId;
        const serviceName = serviceCard.dataset.serviceName;
        let price = serviceCard.dataset.price;
        let displayPrice;

        // Format price for display
        if (!price || price === 'VARIES' || price === 'PACKAGE') {
            displayPrice = serviceCard.querySelector('.service-price').textContent; // Get text like "15% OFF" or "Buy 5..."
        } else {
            displayPrice = `₱${price}`; // Add currency symbol
        }

        console.log("Booking:", serviceName, displayPrice, serviceId); // Debugging

        // Populate Modal
        modalServiceId.value = serviceId;
        modalServiceName.textContent = serviceName;
        modalServicePrice.textContent = displayPrice; // Use the formatted price string
        bookingNotes.value = ''; // Clear previous notes
        bookingModal.style.display = 'block';
    }

    function closeBookingModal() {
        bookingModal.style.display = 'none';
    }

    // --- Event Listeners ---

    // Add listeners to all "Book Now" buttons
    serviceButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            // Find the parent service-card element
            const serviceCard = event.target.closest('.service-card');
            if (serviceCard) {
                // **TODO: Check if user is logged in before opening modal**
                // You'll need a way to check login status from firebase-auth.js
                // Example: if (isUserLoggedIn()) { openBookingModal(serviceCard); } else { alert("Please log in to book."); // Or open login modal }
                openBookingModal(serviceCard); // Open directly for now
            } else {
                console.error("Could not find parent service-card for button:", event.target);
            }
        });
    });

    // Close modal when clicking the close button (X)
    if (bookingCloseButton) {
        bookingCloseButton.addEventListener('click', closeBookingModal);
    }

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === bookingModal) {
            closeBookingModal();
        }
    });

    // Handle booking form submission
    if (bookingForm) {
        bookingForm.addEventListener('submit', (event) => {
            event.preventDefault(); // Prevent default form submission

            const formData = new FormData(bookingForm);
            const selectedPayment = formData.get('payment');
            const notes = formData.get('notes');
            const serviceId = formData.get('serviceId');
            const serviceName = modalServiceName.textContent; // Get name from modal display
            const servicePrice = modalServicePrice.textContent; // Get price string from modal display

            // **TODO: Get Logged-in User ID from Firebase Auth**
            // const userId = getCurrentUserId(); // Assume this function exists from firebase-auth.js

            const newBooking = {
                // userId: userId, // Add when integrated with Firebase Auth
                bookingId: `booking_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // Simple unique ID
                serviceId: serviceId,
                serviceName: serviceName,
                servicePriceDisplay: servicePrice, // Store the displayed price string
                notes: notes || "No notes", // Add default if empty
                paymentMethod: selectedPayment,
                bookingDate: new Date().toISOString(), // Record when the booking was made
                status: "Pending Confirmation" // Example status
            };

            console.log("New Booking Data:", newBooking); // Debugging

            // Add booking to storage
            const currentBookings = getBookings();
            currentBookings.push(newBooking);
            saveBookings(currentBookings);

            // Close modal and give feedback
            closeBookingModal();
            alert(`"${serviceName}" booked successfully!\nPayment: ${selectedPayment}\nCheck "My Book" for details.`); // Simple confirmation
        });
    }

    // --- Initial Setup ---
    updateBookingCounter(); // Initial counter update on page load

    // Expose function to be callable from firebase-auth.js (if needed)
    window.updateBookingCounterGlobal = updateBookingCounter;

}); // End DOMContentLoaded
