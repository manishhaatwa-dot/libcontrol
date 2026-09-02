/* ============================================================
   LibControl - Student Self Attendance (Admin)
   ------------------------------------------------------------
   Purpose:
   - Admin ON/OFF control for Student Self Attendance
   - Saves setting inside library document
   - Does NOT modify existing attendance.js
   - Does NOT modify existing student/login system
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
                "Student Self Attendance Admin: getCurrentSession() not found."
            );
            return null;
        }

        const session = window.getCurrentSession();

        if (!session) {
            console.error(
                "Student Self Attendance Admin: No active session."
            );
            return null;
        }

        if (session.role !== "admin") {
            console.error(
                "Student Self Attendance Admin: Admin access required."
            );
            return null;
        }

        if (!session.libraryId) {
            console.error(
                "Student Self Attendance Admin: Library ID missing."
            );
            return null;
        }

        return session;
    }

    // ----------------------------------------------------------
    // Get library document
    // ----------------------------------------------------------
    function getLibraryRef(libraryId) {
        if (
            window.LibManageDB &&
            typeof window.LibManageDB.library === "function"
        ) {
            return window.LibManageDB.library(libraryId);
        }

        if (
            typeof firebase === "undefined" ||
            !firebase.firestore
        ) {
            throw new Error("Firebase Firestore is not available.");
        }

        return firebase
            .firestore()
            .collection("libcontrol_libraries")
            .doc(libraryId);
    }

    // ----------------------------------------------------------
    // Find ON/OFF control
    // ----------------------------------------------------------
    function getToggleElement() {
        return document.getElementById(
            "student-self-attendance-toggle"
        );
    }

    // ----------------------------------------------------------
    // Find status text
    // ----------------------------------------------------------
    function getStatusElement() {
        return document.getElementById(
            "student-self-attendance-status"
        );
    }

    // ----------------------------------------------------------
    // Show status
    // ----------------------------------------------------------
    function showStatus(message, isError) {
        const statusElement = getStatusElement();

        if (!statusElement) {
            return;
        }

        statusElement.textContent = message;

        if (isError) {
            statusElement.classList.add("error");
        } else {
            statusElement.classList.remove("error");
        }
    }

    // ----------------------------------------------------------
    // Update visible ON/OFF text
    // ----------------------------------------------------------
    function updateStatusText(enabled) {
        const statusElement = getStatusElement();

        if (!statusElement) {
            return;
        }

        statusElement.textContent = enabled
            ? "Student Self Attendance is ON"
            : "Student Self Attendance is OFF";

        statusElement.classList.remove("error");
    }

    // ----------------------------------------------------------
    // Load current setting
    // ----------------------------------------------------------
    async function loadSelfAttendanceSetting() {
        const toggle = getToggleElement();

        if (!toggle || !currentLibraryId) {
            return;
        }

        try {
            showStatus("Loading...", false);

            const libraryRef = getLibraryRef(currentLibraryId);
            const librarySnap = await libraryRef.get();

            if (!librarySnap.exists) {
                throw new Error("Library record not found.");
            }

            const libraryData = librarySnap.data() || {};

            const enabled =
                libraryData.studentSelfAttendanceEnabled === true;

            toggle.checked = enabled;

            updateStatusText(enabled);
        } catch (error) {
            console.error(
                "Student Self Attendance Admin load error:",
                error
            );

            toggle.checked = false;

            showStatus(
                "Unable to load attendance setting.",
                true
            );
        }
    }

    // ----------------------------------------------------------
    // Save ON/OFF setting
    // ----------------------------------------------------------
    async function saveSelfAttendanceSetting(enabled) {
        if (!currentLibraryId) {
            throw new Error("Library ID is missing.");
        }

        const libraryRef = getLibraryRef(currentLibraryId);

        await libraryRef.set(
            {
                studentSelfAttendanceEnabled: enabled
            },
            {
                merge: true
            }
        );
    }

    // ----------------------------------------------------------
    // Toggle handler
    // ----------------------------------------------------------
    async function handleToggleChange(event) {
        const toggle = event.target;

        if (!toggle) {
            return;
        }

        const newValue = toggle.checked;

        // Disable while saving so accidental double-click
        // cannot create multiple writes.
        toggle.disabled = true;

        try {
            showStatus("Saving...", false);

            await saveSelfAttendanceSetting(newValue);

            updateStatusText(newValue);
        } catch (error) {
            console.error(
                "Student Self Attendance Admin save error:",
                error
            );

            // Restore previous state if save fails.
            toggle.checked = !newValue;

            showStatus(
                "Unable to save attendance setting.",
                true
            );
        } finally {
            toggle.disabled = false;
        }
    }

    // ----------------------------------------------------------
    // Initialize Admin Self Attendance
    // ----------------------------------------------------------
    async function init() {
        if (initialized) {
            return;
        }

        const toggle = getToggleElement();

        // IMPORTANT:
        // If the control is not present on a page, do absolutely
        // nothing. This keeps the existing dashboard safe.
        if (!toggle) {
            return;
        }

        const session = getAdminSession();

        if (!session) {
            return;
        }

        currentLibraryId = String(session.libraryId).trim();

        if (!currentLibraryId) {
            return;
        }

        initialized = true;

        toggle.addEventListener(
            "change",
            handleToggleChange
        );

        await loadSelfAttendanceSetting();
    }

    // ----------------------------------------------------------
    // Public API
    // ----------------------------------------------------------
    window.LibControlStudentSelfAttendanceAdmin = {
        init: init,
        loadSetting: loadSelfAttendanceSetting
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
