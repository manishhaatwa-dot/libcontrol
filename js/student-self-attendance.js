/* ============================================================
   LibControl - Student Self Attendance
   ------------------------------------------------------------
   Purpose:
   - Student self-attendance page
   - Uses existing Firebase Auth session
   - Reads libraryId from QR URL
   - Uses studentCode from logged-in student session
   - Check-in / Check-out through secure Cloud Function
   - Does NOT modify student-dashboard.js
   - Does NOT modify attendance.js
   ============================================================ */

(function () {
    "use strict";

    let initialized = false;
    let currentSession = null;
    let currentLibraryId = null;
    let currentStudentCode = null;
    let attendanceRecord = null;
    let actionInProgress = false;

    // ----------------------------------------------------------
    // Get element
    // ----------------------------------------------------------
    function getElement(id) {
        return document.getElementById(id);
    }

    // ----------------------------------------------------------
    // Show loading
    // ----------------------------------------------------------
    function showLoading(show) {
        const loading = getElement(
            "self-attendance-loading"
        );

        if (loading) {
            loading.style.display =
                show ? "block" : "none";
        }
    }

    // ----------------------------------------------------------
    // Show main card
    // ----------------------------------------------------------
    function showMainCard() {
        const card = getElement(
            "self-attendance-card"
        );

        if (card) {
            card.style.display = "block";
        }
    }

    // ----------------------------------------------------------
    // Show error
    // ----------------------------------------------------------
    function showError(message) {
        showLoading(false);

        const card = getElement(
            "self-attendance-card"
        );

        if (card) {
            card.style.display = "none";
        }

        const errorBox = getElement(
            "self-attendance-error"
        );

        const errorMessage = getElement(
            "self-attendance-error-message"
        );

        if (errorMessage) {
            errorMessage.textContent = message;
        }

        if (errorBox) {
            errorBox.style.display = "block";
        }
    }

    // ----------------------------------------------------------
    // Get libraryId from QR URL
    // ----------------------------------------------------------
    function getLibraryIdFromURL() {
        const params =
            new URLSearchParams(
                window.location.search
            );

        const libraryId =
            params.get("libraryId");

        if (!libraryId) {
            return null;
        }

        return String(libraryId).trim();
    }

    // ----------------------------------------------------------
    // Get existing logged-in session
    // ----------------------------------------------------------
    function getStudentSession() {
        if (
            typeof window.getCurrentSession !==
            "function"
        ) {
            return null;
        }

        const session =
            window.getCurrentSession();

        if (!session) {
            return null;
        }

        if (session.role !== "student") {
            return null;
        }

        if (!session.libraryId) {
            return null;
        }

        return session;
    }

    // ----------------------------------------------------------
    // Get student code from session
    // ----------------------------------------------------------
    function getStudentCode(session) {
        const possibleValues = [
            session.studentCode,
            session.studentId,
            session.code
        ];

        for (
            let i = 0;
            i < possibleValues.length;
            i++
        ) {
            if (
                possibleValues[i] !==
                    undefined &&
                possibleValues[i] !== null &&
                String(
                    possibleValues[i]
                ).trim()
            ) {
                return String(
                    possibleValues[i]
                ).trim();
            }
        }

        return null;
    }

    // ----------------------------------------------------------
    // Get student Firestore reference
    // ----------------------------------------------------------
    function getStudentRef(
        libraryId,
        studentCode
    ) {
        if (
            window.LibManageDB &&
            typeof window.LibManageDB.students ===
                "function"
        ) {
            const studentsRef =
                window.LibManageDB.students(
                    libraryId
                );

            if (
                studentsRef &&
                typeof studentsRef.doc ===
                    "function"
            ) {
                return studentsRef.doc(
                    studentCode
                );
            }
        }

        if (
            typeof firebase ===
                "undefined" ||
            !firebase.firestore
        ) {
            throw new Error(
                "Firebase Firestore is not available."
            );
        }

        return firebase
            .firestore()
            .collection(
                "libcontrol_libraries"
            )
            .doc(libraryId)
            .collection("students")
            .doc(studentCode);
    }

    // ----------------------------------------------------------
    // Get today's date in India
    // ----------------------------------------------------------
    function getTodayDate() {
        return new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: "Asia/Kolkata",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        ).format(new Date());
    }

    // ----------------------------------------------------------
    // Get attendance reference
    // ----------------------------------------------------------
    function getAttendanceRef(
        libraryId,
        studentCode
    ) {
        if (
            window.LibManageDB &&
            typeof window.LibManageDB.attendance ===
                "function"
        ) {
            const attendanceRef =
                window.LibManageDB.attendance(
                    libraryId
                );

            if (
                attendanceRef &&
                typeof attendanceRef.doc ===
                    "function"
            ) {
                return attendanceRef.doc(
                    `${getTodayDate()}_${studentCode}`
                );
            }
        }

        if (
            typeof firebase ===
                "undefined" ||
            !firebase.firestore
        ) {
            throw new Error(
                "Firebase Firestore is not available."
            );
        }

        return firebase
            .firestore()
            .collection(
                "libcontrol_libraries"
            )
            .doc(libraryId)
            .collection("attendance")
            .doc(
                `${getTodayDate()}_${studentCode}`
            );
    }

    // ----------------------------------------------------------
    // Format timestamp
    // ----------------------------------------------------------
    function formatTime(value) {
        if (!value) {
            return "—";
        }

        let date = null;

        if (
            value &&
            typeof value.toDate ===
                "function"
        ) {
            date = value.toDate();
        } else if (
            value instanceof Date
        ) {
            date = value;
        }

        if (!date) {
            return "—";
        }

        return date.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            }
        );
    }

    // ----------------------------------------------------------
    // Set student information
    // ----------------------------------------------------------
    function renderStudentInfo(
        studentData
    ) {
        const name =
            studentData.name ||
            currentSession.name ||
            currentSession.studentName ||
            "Student";

        const studentCode =
            currentStudentCode;

        const seat =
            studentData.seatNumber ||
            studentData.seat ||
            "—";

        const shift =
            studentData.shift ||
            "—";

        const libraryName =
            currentSession.libraryName ||
            currentSession.library ||
            "LibControl";

        const nameElement =
            getElement(
                "self-attendance-student-name"
            );

        const codeElement =
            getElement(
                "self-attendance-student-code"
            );

        const seatElement =
            getElement(
                "self-attendance-seat"
            );

        const shiftElement =
            getElement(
                "self-attendance-shift"
            );

        const libraryElement =
            getElement(
                "self-attendance-library-name"
            );

        if (nameElement) {
            nameElement.textContent = name;
        }

        if (codeElement) {
            codeElement.textContent =
                studentCode;
        }

        if (seatElement) {
            seatElement.textContent = seat;
        }

        if (shiftElement) {
            shiftElement.textContent = shift;
        }

        if (libraryElement) {
            libraryElement.textContent =
                libraryName;
        }
    }

    // ----------------------------------------------------------
    // Show message
    // ----------------------------------------------------------
    function showMessage(
        message,
        isError
    ) {
        const element =
            getElement(
                "self-attendance-message"
            );

        if (!element) {
            return;
        }

        element.textContent = message;

        element.classList.add("show");

        if (isError) {
            element.classList.add(
                "error"
            );
        } else {
            element.classList.remove(
                "error"
            );
        }
    }

    // ----------------------------------------------------------
    // Update time display
    // ----------------------------------------------------------
    function renderAttendanceTimes() {
        const checkinElement =
            getElement(
                "self-attendance-checkin-time"
            );

        const checkoutElement =
            getElement(
                "self-attendance-checkout-time"
            );

        if (checkinElement) {
            checkinElement.textContent =
                formatTime(
                    attendanceRecord &&
                        attendanceRecord.checkInAt
                );
        }

        if (checkoutElement) {
            checkoutElement.textContent =
                formatTime(
                    attendanceRecord &&
                        attendanceRecord.checkOutAt
                );
        }
    }

    // ----------------------------------------------------------
    // Update action button
    // ----------------------------------------------------------
    function updateActionButton() {
        const button =
            getElement(
                "self-attendance-action-btn"
            );

        if (!button) {
            return;
        }

        button.disabled =
            actionInProgress;

        if (!attendanceRecord) {
            button.textContent =
                "Self Attendance";

            return;
        }

        if (
            attendanceRecord.checkInAt &&
            !attendanceRecord.checkOutAt
        ) {
            button.textContent =
                "Leave";

            return;
        }

        if (
            attendanceRecord.checkInAt &&
            attendanceRecord.checkOutAt
        ) {
            button.textContent =
                "Attendance Completed";

            button.disabled = true;

            return;
        }

        button.textContent =
            "Self Attendance";
    }

    // ----------------------------------------------------------
    // Load today's attendance
    // ----------------------------------------------------------
    async function loadTodayAttendance() {
        const attendanceRef =
            getAttendanceRef(
                currentLibraryId,
                currentStudentCode
            );

        const attendanceSnap =
            await attendanceRef.get();

        if (attendanceSnap.exists) {
            attendanceRecord =
                attendanceSnap.data() || {};
        } else {
            attendanceRecord = null;
        }

        renderAttendanceTimes();
        updateActionButton();
    }

    // ----------------------------------------------------------
    // Get Cloud Function
    // ----------------------------------------------------------
    function getAttendanceFunction() {
        if (
            typeof firebase ===
                "undefined" ||
            typeof firebase.functions !==
                "function"
        ) {
            throw new Error(
                "Firebase Functions is not available."
            );
        }

        return firebase
            .functions()
            .httpsCallable(
                "markStudentSelfAttendance"
            );
    }

    // ----------------------------------------------------------
    // Perform attendance action
    // ----------------------------------------------------------
    async function performAttendanceAction() {
        if (actionInProgress) {
            return;
        }

        let action = "checkin";

        if (
            attendanceRecord &&
            attendanceRecord.checkInAt &&
            !attendanceRecord.checkOutAt
        ) {
            action = "checkout";
        }

        if (
            attendanceRecord &&
            attendanceRecord.checkInAt &&
            attendanceRecord.checkOutAt
        ) {
            return;
        }

        actionInProgress = true;

        const button =
            getElement(
                "self-attendance-action-btn"
            );

        if (button) {
            button.disabled = true;

            button.textContent =
                action === "checkin"
                    ? "Checking in..."
                    : "Saving leave time...";
        }

        try {
            const callable =
                getAttendanceFunction();

            const response =
                await callable({
                    libraryId:
                        currentLibraryId,

                    studentCode:
                        currentStudentCode,

                    action: action
                });

            const result =
                response.data || {};

            if (
                result.success !== true
            ) {
                showMessage(
                    result.message ||
                        "Attendance could not be completed.",
                    true
                );

                await loadTodayAttendance();

                return;
            }

            showMessage(
                result.message ||
                    "Attendance updated successfully.",
                false
            );

            // Reload the same record so the
            // server timestamp is displayed.
            await loadTodayAttendance();

        } catch (error) {
            console.error(
                "Student self attendance error:",
                error
            );

            let message =
                "Unable to process attendance.";

            if (
                error &&
                error.message
            ) {
                message =
                    error.message;
            }

            if (
                error &&
                error.code ===
                    "functions/failed-precondition"
            ) {
                message =
                    "Student self attendance is currently disabled.";
            }

            if (
                error &&
                error.code ===
                    "functions/unauthenticated"
            ) {
                message =
                    "Please login again.";
            }

            if (
                error &&
                error.code ===
                    "functions/permission-denied"
            ) {
                message =
                    "This student account is not authorized for attendance.";
            }

            showMessage(
                message,
                true
            );

        } finally {
            actionInProgress = false;

            updateActionButton();
        }
    }

    // ----------------------------------------------------------
    // Load student information
    // ----------------------------------------------------------
    async function loadStudent() {
        currentSession =
            getStudentSession();

        if (!currentSession) {
            showError(
                "Please login with your student account first."
            );

            return false;
        }

        currentLibraryId =
            String(
                currentSession.libraryId
            ).trim();

        const qrLibraryId =
            getLibraryIdFromURL();

        if (!qrLibraryId) {
            showError(
                "Invalid attendance QR code."
            );

            return false;
        }

        // The library inside the QR must match
        // the student's logged-in library.
        if (
            currentLibraryId !==
            qrLibraryId
        ) {
            showError(
                "This QR code belongs to a different library."
            );

            return false;
        }

        currentLibraryId =
            qrLibraryId;

        currentStudentCode =
            getStudentCode(
                currentSession
            );

        if (!currentStudentCode) {
            showError(
                "Student ID could not be found in your account."
            );

            return false;
        }

        try {
            const studentRef =
                getStudentRef(
                    currentLibraryId,
                    currentStudentCode
                );

            const studentSnap =
                await studentRef.get();

            if (!studentSnap.exists) {
                showError(
                    "Your student record could not be found."
                );

                return false;
            }

            const studentData =
                studentSnap.data() || {};

            // Extra client-side identity check.
            // Backend performs the final security check.
            if (
                currentSession.uid &&
                studentData.uid &&
                studentData.uid !==
                    currentSession.uid
            ) {
                showError(
                    "Student account verification failed."
                );

                return false;
            }

            renderStudentInfo(
                studentData
            );

            await loadTodayAttendance();

            return true;

        } catch (error) {
            console.error(
                "Student information load error:",
                error
            );

            showError(
                "Unable to load your student information."
            );

            return false;
        }
    }

    // ----------------------------------------------------------
    // Initialize page
    // ----------------------------------------------------------
    async function init() {
        if (initialized) {
            return;
        }

        initialized = true;

        showLoading(true);

        const success =
            await loadStudent();

        if (!success) {
            return;
        }

        const button =
            getElement(
                "self-attendance-action-btn"
            );

        if (button) {
            button.addEventListener(
                "click",
                performAttendanceAction
            );
        }

        showLoading(false);
        showMainCard();
    }

    // ----------------------------------------------------------
    // Public API
    // ----------------------------------------------------------
    window.LibControlStudentSelfAttendance = {
        init: init,
        loadTodayAttendance:
            loadTodayAttendance
    };

    // ----------------------------------------------------------
    // Start
    // ----------------------------------------------------------
    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init
        );
    } else {
        init();
    }
})();
