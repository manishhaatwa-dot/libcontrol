/* ============================================================
   LibControl - Student Self Attendance QR
   ------------------------------------------------------------
   Purpose:
   - Generate one QR code for the current library
   - QR contains only the library ID
   - Does NOT contain student UID, email or password
   - Does NOT modify existing attendance/login functionality
   ============================================================ */

(function () {
    "use strict";

    let initialized = false;
    let currentLibraryId = null;

    // ----------------------------------------------------------
    // Get current admin session
    // ----------------------------------------------------------
    function getAdminSession() {
        if (typeof window.getCurrentSession !== "function") {
            console.error(
                "Student Self Attendance QR: getCurrentSession() not found."
            );
            return null;
        }

        const session = window.getCurrentSession();

        if (!session) {
            console.error(
                "Student Self Attendance QR: No active session."
            );
            return null;
        }

        if (session.role !== "admin") {
            console.error(
                "Student Self Attendance QR: Admin access required."
            );
            return null;
        }

        if (!session.libraryId) {
            console.error(
                "Student Self Attendance QR: Library ID missing."
            );
            return null;
        }

        return session;
    }

    // ----------------------------------------------------------
    // Get QR container
    // ----------------------------------------------------------
    function getQRContainer() {
        return document.getElementById(
            "student-self-attendance-qr-code"
        );
    }

    // ----------------------------------------------------------
    // Build student attendance URL
    // ----------------------------------------------------------
    function buildAttendanceURL(libraryId) {
        const attendancePageURL = new URL(
            "student-self-attendance.html",
            window.location.href
        );

        attendancePageURL.searchParams.set(
            "libraryId",
            libraryId
        );

        return attendancePageURL.toString();
    }

    // ----------------------------------------------------------
    // Generate QR
    // ----------------------------------------------------------
    function generateQR() {
        const container = getQRContainer();

        if (!container || !currentLibraryId) {
            return;
        }

        const attendanceURL =
            buildAttendanceURL(currentLibraryId);

        // Clear previous QR
        container.innerHTML = "";

        // QR library must be loaded before this function runs.
        if (typeof QRCode === "undefined") {
            console.error(
                "Student Self Attendance QR: QRCode library not loaded."
            );

            container.textContent =
                "QR code library is not loaded.";

            return;
        }

        new QRCode(container, {
            text: attendanceURL,
            width: 220,
            height: 220,
            correctLevel: QRCode.CorrectLevel.M
        });
    }

    // ----------------------------------------------------------
    // Initialize
    // ----------------------------------------------------------
    function init() {
        if (initialized) {
            return;
        }

        const container = getQRContainer();

        // If QR container is not present, do nothing.
        // This keeps other pages completely unaffected.
        if (!container) {
            return;
        }

        const session = getAdminSession();

        if (!session) {
            return;
        }

        currentLibraryId =
            String(session.libraryId).trim();

        if (!currentLibraryId) {
            return;
        }

        initialized = true;

        generateQR();
    }

    // ----------------------------------------------------------
    // Public API
    // ----------------------------------------------------------
    window.LibControlStudentSelfAttendanceQR = {
        init: init,
        generate: generateQR
    };

    // ----------------------------------------------------------
    // Start after DOM is ready
    // ----------------------------------------------------------
    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            init
        );
    } else {
        init();
    }
})();
