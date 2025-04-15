document.addEventListener('DOMContentLoaded', () => {
    const bookingsListDiv = document.getElementById('bookings-list');
    const noBookingsMessage = document.getElementById('no-bookings-message');
    const loadingMessage = document.getElementById('loading-bookings-message');
    const LOCAL_STORAGE_KEY = 'gjsUserBookings'; // Same key used in booking.js

    // Function to format date string (optional but recommended)
    function formatBookingDate(isoDateString) {
        if (!isoDateString) return 'N/A';
        try {
            const date = new Date(isoDateString);
            // Example format: "Apr 15, 2025, 10:00 AM" - adjust format as needed
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
            return date.toLocaleDateString('en-US', options);
        } catch (e) {
            console.error("Error formatting date:", e);
            return isoDateString; // Return original string if formatting fails
        }
    }

    function displayBookings(bookings) {
        bookingsListDiv.innerHTML = ''; // Clear current list

        if (!bookings || bookings.length === 0) {
            if (noBookingsMessage) {
                noBookingsMessage.style.display = 'block';
            }
            if (loadingMessage) {
                loadingMessage.style.display = 'none';
            }
            // Append the noBookingsMessage again if it was cleared by innerHTML = ''
            if (noBookingsMessage) {
                bookingsListDiv.appendChild(noBookingsMessage);
            }
        } else {
            if (noBookingsMessage) noBookingsMessage.style.display = 'none';
            if (loadingMessage) loadingMessage.style.display = 'none';

            // Sort bookings by date (most recent first) - optional
            bookings.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));

            bookings.forEach(booking => {
                const card = document.createElement('div');
                card.classList.add('booking-card');

                // Use booking.bookingId or another unique identifier if available
                card.dataset.bookingId = booking.bookingId || booking.serviceId + '_' + booking.bookingDate;

                card.innerHTML = `
                    <div class="booking-card-header">
                        <h4>${booking.serviceName || 'Service Name Missing'}</h4>
                        <span class="booking-status status-${(booking.status || 'pending').toLowerCase().replace(/\s+/g, '-')}">
                            ${booking.status || 'Pending'}
                        </span>
                    </div>
                    <div class="booking-card-body">
                        <p><strong>Booked On:</strong> ${formatBookingDate(booking.bookingDate)}</p>
                        <p><strong>Price Approx:</strong> ${booking.servicePriceDisplay || 'N/A'}</p>
                        <p><strong>Payment Method:</strong> ${booking.paymentMethod || 'N/A'}</p>
                        ${booking.notes && booking.notes !== 'No notes' ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
                    </div>
                    `;
                bookingsListDiv.appendChild(card);
            });

            // setupCancelButtons(); // Call function to handle cancel button clicks if uncommented
        }
    }

    function loadAndDisplayBookings() {
        // In a real app with user accounts, you would fetch from Firestore/Database here,
        // filtered by the currently logged-in user's ID.

        // Using localStorage for demonstration:
        const bookingsJson = localStorage.getItem(LOCAL_STORAGE_KEY);
        let bookings = [];
        if (bookingsJson) {
            try {
                bookings = JSON.parse(bookingsJson);
            } catch (e) {
                console.error("Error parsing bookings from localStorage:", e);
                // Optionally display an error message to the user
                bookingsListDiv.innerHTML = '<p style="color: red;">Error loading your bookings.</p>';
                if (loadingMessage) loadingMessage.style.display = 'none';
                return; // Stop execution if parsing fails
            }
        }
        displayBookings(bookings);
    }

    // --- Authentication Check ---
    // We rely on firebase-auth.js to redirect if the user is not logged in,
    // as mybook.html should be listed in the 'protectedPages' array there.
    // So, if the script runs, we assume the user is authenticated.

    // --- Initial Load ---
    loadAndDisplayBookings();


    // --- Optional: Cancel Button Logic ---
    /*
    function setupCancelButtons() {
        const cancelButtons = document.querySelectorAll('.cancel-booking-btn');
        cancelButtons.forEach(button => {
            button.addEventListener('click', handleCancelBooking);
        });
    }

    function handleCancelBooking(event) {
        const bookingIdToCancel = event.target.dataset.id;
        if (!bookingIdToCancel) return;

        if (confirm("Are you sure you want to cancel this booking?")) {
            console.log("Attempting to cancel booking:", bookingIdToCancel);

            // 1. Get current bookings from localStorage
             const bookingsJson = localStorage.getItem(LOCAL_STORAGE_KEY);
             let bookings = bookingsJson ? JSON.parse(bookingsJson) : [];

             // 2. Filter out the booking to cancel
             const updatedBookings = bookings.filter(booking => (booking.bookingId || booking.serviceId + '_' + booking.bookingDate) !== bookingIdToCancel);

             // 3. Save the updated array back to localStorage
             localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedBookings));

             // 4. Refresh the displayed list
             displayBookings(updatedBookings);

             // 5. Update the counter in the nav (call the global function)
             if (typeof window.updateBookingCounterGlobal === 'function') {
                 window.updateBookingCounterGlobal();
             }

            // In a real app: Update status in Firestore instead of filtering/deleting
            // e.g., updateDoc(doc(db, 'users', userId, 'bookings', bookingIdToCancel), { status: 'Cancelled' });
            // Then reload bookings from Firestore.
        }
    }
    */

}); // End DOMContentLoaded
