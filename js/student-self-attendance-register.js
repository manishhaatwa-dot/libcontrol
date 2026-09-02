/* ============================================================
   LibControl - Student Self Attendance Register
   ------------------------------------------------------------
   Purpose:
   - Admin-only QR self attendance register
   - Date filter
   - Shift filter
   - Real-time attendance updates
   - Reads only attendance records marked through student QR
   - Does NOT modify existing manual attendance system
   ============================================================ */

(function () {
    "use strict";

    let initialized = false;
    let attendanceUnsubscribe = null;

    let currentLibraryId = null;
    let currentDate = null;
    let currentShift = "all";

    let attendanceRecords = [];

    function getAdminSession() {
        if (typeof window.getCurrentSession !== "function") {
            console.error(
                "Student Self Attendance Register: getCurrentSession() not found."
            );

            return null;
        }

        const session =
            window.getCurrentSession();

        if (!session) {
            console.error(
                "Student Self Attendance Register: No active session."
            );

            return null;
        }

        if (session.role !== "admin") {
            console.error(
                "Student Self Attendance Register: Admin access required."
            );

            return null;
        }

        if (!session.libraryId) {
            console.error(
                "Student Self Attendance Register: Library ID missing."
            );

            return null;
        }

        return session;
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    function getTodayIndia() {
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

    function getAttendanceCollection(libraryId) {
        if (
            window.LibManageDB &&
            typeof window.LibManageDB.attendance === "function"
        ) {
            return window.LibManageDB.attendance(
                libraryId
            );
        }

        if (
            window.LibManageDB &&
            typeof window.LibManageDB.library === "function"
        ) {
            return window.LibManageDB
                .library(libraryId)
                .collection("attendance");
        }

        if (
            typeof firebase !== "undefined" &&
            firebase.firestore
        ) {
            return firebase
                .firestore()
                .collection("libcontrol_libraries")
                .doc(libraryId)
                .collection("attendance");
        }

        return null;
    }

    function formatTimestamp(timestamp) {
        if (!timestamp) {
            return "—";
        }

        let date = null;

        if (
            timestamp &&
            typeof timestamp.toDate === "function"
        ) {
            date = timestamp.toDate();
        } else if (
            timestamp instanceof Date
        ) {
            date = timestamp;
        } else if (
            typeof timestamp === "number"
        ) {
            date = new Date(timestamp);
        }

        if (!date || isNaN(date.getTime())) {
            return "—";
        }

        return new Intl.DateTimeFormat(
            "en-IN",
            {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            }
        ).format(date);
    }

    function showError(message) {
        const errorBox =
            getElement(
                "self-attendance-register-error"
            );

        if (!errorBox) {
            return;
        }

        errorBox.textContent =
            message || "Something went wrong.";

        errorBox.style.display = "block";
    }

    function hideError() {
        const errorBox =
            getElement(
                "self-attendance-register-error"
            );

        if (!errorBox) {
            return;
        }

        errorBox.textContent = "";
        errorBox.style.display = "none";
    }

    function setLoading(isLoading) {
        const loading =
            getElement(
                "self-attendance-register-loading"
            );

        if (!loading) {
            return;
        }

        loading.style.display =
            isLoading ? "block" : "none";
    }

    function renderRecords() {
        const tableWrap =
            getElement(
                "self-attendance-register-table-wrap"
            );

        const emptyBox =
            getElement(
                "self-attendance-register-empty"
            );

        const tableBody =
            getElement(
                "self-attendance-register-body"
            );

        const status =
            getElement(
                "self-attendance-register-status"
            );

        if (
            !tableWrap ||
            !emptyBox ||
            !tableBody
        ) {
            return;
        }

        const filteredRecords =
            attendanceRecords.filter(
                function (record) {

                    if (
                        currentShift !== "all" &&
                        String(
                            record.shift || ""
                        ).trim().toLowerCase() !==
                        currentShift.toLowerCase()
                    ) {
                        return false;
                    }

                    return true;
                }
            );

        tableBody.innerHTML = "";

        if (
            filteredRecords.length === 0
        ) {
            tableWrap.style.display = "none";
            emptyBox.style.display = "block";

            if (status) {
                status.textContent =
                    "0 self attendance records";
            }

            return;
        }

        tableWrap.style.display = "block";
        emptyBox.style.display = "none";

        filteredRecords.forEach(
            function (record) {

                const row =
                    document.createElement("tr");

                const studentCode =
                    record.studentCode || "—";

                const studentName =
                    record.studentName || "—";

                const seatNumber =
                    record.seatNumber || "—";

                const shift =
                    record.shift || "—";

                const checkIn =
                    formatTimestamp(
                        record.checkInAt
                    );

                const checkOut =
                    formatTimestamp(
                        record.checkOutAt
                    );

                row.innerHTML = `
                    <td>
                        ${escapeHTML(studentCode)}
                    </td>

                    <td>
                        ${escapeHTML(studentName)}
                    </td>

                    <td>
                        ${escapeHTML(String(seatNumber))}
                    </td>

                    <td>
                        <span class="self-attendance-shift-badge">
                            ${escapeHTML(String(shift))}
                        </span>
                    </td>

                    <td class="self-attendance-time">
                        ${escapeHTML(checkIn)}
                    </td>

                    <td class="self-attendance-time">
                        ${escapeHTML(checkOut)}
                    </td>
                `;

                tableBody.appendChild(row);
            }
        );

        if (status) {
            status.textContent =
                `${filteredRecords.length} self attendance record${
                    filteredRecords.length === 1
                        ? ""
                        : "s"
                }`;
        }
    }

    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function loadAttendance() {
        hideError();
        setLoading(true);

        const collection =
            getAttendanceCollection(
                currentLibraryId
            );

        if (!collection) {
            setLoading(false);

            showError(
                "Attendance database connection is not available."
            );

            return;
        }

        if (
            attendanceUnsubscribe
        ) {
            attendanceUnsubscribe();
            attendanceUnsubscribe = null;
        }

        attendanceRecords = [];

        /*
         * We intentionally query by date only.
         *
         * Existing manual attendance records may not have
         * attendanceSource, so we filter student_qr records
         * in JavaScript after reading the date's records.
         *
         * This avoids changing the existing attendance system
         * and avoids requiring a new Firestore composite index.
         */

        attendanceUnsubscribe =
            collection
                .where(
                    "date",
                    "==",
                    currentDate
                )
                .onSnapshot(
                    function (snapshot) {

                        attendanceRecords = [];

                        snapshot.forEach(
                            function (doc) {

                                const data =
                                    doc.data() || {};

                                /*
                                 * Only QR self attendance.
                                 *
                                 * Manual/admin attendance
                                 * is completely ignored.
                                 */
                                if (
                                    data.attendanceSource !==
                                    "student_qr"
                                ) {
                                    return;
                                }

                                attendanceRecords.push({
                                    id: doc.id,
                                    ...data
                                });
                            }
                        );

                        attendanceRecords.sort(
                            function (a, b) {

                                const aTime =
                                    getTimestampMillis(
                                        a.checkInAt
                                    );

                                const bTime =
                                    getTimestampMillis(
                                        b.checkInAt
                                    );

                                return bTime - aTime;
                            }
                        );

                        setLoading(false);

                        renderRecords();
                    },
                    function (error) {

                        console.error(
                            "Student Self Attendance Register Firestore error:",
                            error
                        );

                        setLoading(false);

                        showError(
                            "Unable to load self attendance records."
                        );
                    }
                );
    }

    function getTimestampMillis(timestamp) {
        if (
            timestamp &&
            typeof timestamp.toMillis === "function"
        ) {
            return timestamp.toMillis();
        }

        if (
            timestamp &&
            typeof timestamp.toDate === "function"
        ) {
            return timestamp.toDate().getTime();
        }

        if (
            timestamp instanceof Date
        ) {
            return timestamp.getTime();
        }

        if (
            typeof timestamp === "number"
        ) {
            return timestamp;
        }

        return 0;
    }

    function handleDateChange(event) {
        const selectedDate =
            String(
                event.target.value || ""
            ).trim();

        if (!selectedDate) {
            return;
        }

        currentDate =
            selectedDate;

        loadAttendance();
    }

    function handleShiftChange(event) {
        currentShift =
            String(
                event.target.value || "all"
            ).trim();

        renderRecords();
    }

    function setDefaultDate() {
        const dateInput =
            getElement(
                "self-attendance-date"
            );

        if (!dateInput) {
            return;
        }

        currentDate =
            getTodayIndia();

        dateInput.value =
            currentDate;
    }

    function attachEvents() {
        const dateInput =
            getElement(
                "self-attendance-date"
            );

        const shiftInput =
            getElement(
                "self-attendance-shift"
            );

        if (dateInput) {
            dateInput.addEventListener(
                "change",
                handleDateChange
            );
        }

        if (shiftInput) {
            shiftInput.addEventListener(
                "change",
                handleShiftChange
            );
        }
    }

    function init() {
        if (initialized) {
            return;
        }

        const tableBody =
            getElement(
                "self-attendance-register-body"
            );

        if (!tableBody) {
            return;
        }

        const session =
            getAdminSession();

        if (!session) {
            showError(
                "Admin session required."
            );

            return;
        }

        currentLibraryId =
            String(
                session.libraryId
            ).trim();

        if (!currentLibraryId) {
            showError(
                "Library ID is missing."
            );

            return;
        }

        initialized = true;

        setDefaultDate();

        attachEvents();

        loadAttendance();
    }

    window.LibControlStudentSelfAttendanceRegister = {
        init: init,
        reload: loadAttendance
    };

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
