// auth-handler.js
import { auth, db } from './firebase-config.js'; // Import from your config file
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js"; // Import Firestore functions if needed

document.addEventListener('DOMContentLoaded', () => {
    // --- Get Navigation Elements ---
    // Use more specific IDs if possible, or adjust selectors
    const loginNavItem = document.getElementById('loginNavItem'); // You'll add this ID in HTML
    const registerNavItem = document.getElementById('registerNavItem'); // You'll add this ID in HTML
    const userNav = document.getElementById('userNav'); // You'll add this element in HTML
    const logoutButton = document.getElementById('logoutButton'); // This will be inside userNav
    const usernameDisplay = document.getElementById('usernameDisplay'); // Optional: inside userNav

    // --- The Core Logic: Auth State Observer ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // --- User is signed in ---
            console.log('Auth state: User is signed in.', user.uid);
            if (loginNavItem) loginNavItem.style.display = 'none';
            if (registerNavItem) registerNavItem.style.display = 'none';
            if (userNav) userNav.style.display = 'block'; // Show user-specific nav

            // Optional: Fetch and display username from Firestore
            if (usernameDisplay) {
               try {
                    const userDocRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(userDocRef);
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        // Display username, fallback to firstname, or generic 'User'
                        usernameDisplay.textContent = `Welcome, ${userData.username || userData.firstname || 'User'}`;
                    } else {
                       usernameDisplay.textContent = 'Welcome, User';
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    usernameDisplay.textContent = 'Welcome'; // Fallback on error
                }
            }

            // Attach logout listener *only* when the button exists and user is logged in
            if (logoutButton) {
                // Remove previous listener to prevent duplicates if this code runs multiple times
                logoutButton.removeEventListener('click', handleLogout);
                logoutButton.addEventListener('click', handleLogout);
            }

            // --- Protected Route Check (Add this section ONLY to dashboard.html's script or similar) ---
            // Example: If this script is running on dashboard.html
            // if (window.location.pathname.includes('/dashboard.html')) {
            //    console.log("User is logged in, allowing access to dashboard.");
            //    // You might load dashboard-specific data here
            // }
            // --- End Protected Route Check ---


        } else {
            // --- User is signed out ---
            console.log('Auth state: User is signed out.');
            if (loginNavItem) loginNavItem.style.display = 'block'; // Show Login link
            if (registerNavItem) registerNavItem.style.display = 'block'; // Show Register link
            if (userNav) userNav.style.display = 'none'; // Hide user-specific nav


            // --- Protected Route Check (Add this section ONLY to dashboard.html's script or similar) ---
            // Example: If this script is running on dashboard.html and user is NOT logged in
             // if (window.location.pathname.includes('/dashboard.html') || window.location.pathname.includes('/admin-dashboard.html')) {
             //    console.log("User not logged in. Redirecting from protected route.");
             //    window.location.href = '/index.html'; // Redirect to home/login page
             // }
            // --- End Protected Route Check ---
        }
    });

    // --- Logout Function ---
    async function handleLogout() {
        try {
            await signOut(auth);
            console.log('User signed out successfully.');
            // Optional: Redirect to homepage after logout
            window.location.href = '/index.html'; // Adjust path if needed
        } catch (error) {
            console.error('Sign out error:', error);
            alert('Failed to log out. Please try again.');
        }
    }

}); // End DOMContentLoaded
