/* ============================================================
   LibControl - Student Self Attendance Register
   ------------------------------------------------------------
   Purpose:
   - Admin-only QR self attendance register
   - Date filter
   - Shift filter
   - Student search
   - Actual student name from student record
   - Real-time attendance updates
   - Reads only student QR attendance
   - Does NOT modify existing manual attendance system
   ============================================================ */

(function () {
    "use strict";

    let initialized = false;

    let attendanceUnsubscribe = null;

    let currentLibraryId = null;
    let currentDate = null;
    let currentShift = "all";
    let currentSearch = "";

    let attendanceRecords = [];
    let studentRecords = {};

    function getAdminSession() {

        if (
            typeof window.getCurrentSession !==
            "function"
        ) {
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

    function getAttendanceCollection(
        libraryId
    ) {

        if (
            window.LibManageDB &&
            typeof window.LibManageDB.attendance ===
                "function"
        ) {
            return window.LibManageDB.attendance(
                libraryId
            );
        }

        if (
            window.LibManageDB &&
            typeof window.LibManageDB.library ===
                "function"
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
                .collection(
                    "libcontrol_libraries"
                )
                .doc(libraryId)
                .collection("attendance");
        }

        return null;
    }

    function getStudentsCollection(
        libraryId
    ) {

        if (
            window.LibManageDB &&
            typeof window.LibManageDB.students ===
                "function"
        ) {
            return window.LibManageDB.students(
                libraryId
            );
        }

        if (
            window.LibManageDB &&
            typeof window.LibManageDB.library ===
                "function"
        ) {
            return window.LibManageDB
                .library(libraryId)
                .collection("students");
        }

        if (
            typeof firebase !== "undefined" &&
            firebase.firestore
        ) {
            return firebase
                .firestore()
                .collection(
                    "libcontrol_libraries"
                )
                .doc(libraryId)
                .collection("students");
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
            typeof timestamp.toDate ===
                "function"
        ) {
            date = timestamp.toDate();
        }

        else if (
            timestamp instanceof Date
        ) {
            date = timestamp;
        }

        else if (
            typeof timestamp === "number"
        ) {
            date = new Date(timestamp);
        }

        if (
            !date ||
            isNaN(date.getTime())
        ) {
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

    function getTimestampMillis(
        timestamp
    ) {

        if (
            timestamp &&
            typeof timestamp.toMillis ===
                "function"
        ) {
            return timestamp.toMillis();
        }

        if (
            timestamp &&
            typeof timestamp.toDate ===
                "function"
        ) {
            return timestamp
                .toDate()
                .getTime();
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

    function escapeHTML(value) {

        return String(value)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
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
            message ||
            "Something went wrong.";

        errorBox.style.display =
            "block";
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

        errorBox.style.display =
            "none";
    }

    function setLoading(
        isLoading
    ) {

        const loading =
            getElement(
                "self-attendance-register-loading"
            );

        if (!loading) {
            return;
        }

        loading.style.display =
            isLoading
                ? "block"
                : "none";
    }

    /* ============================================================
       LOAD STUDENTS
       ------------------------------------------------------------
       Gets actual student names from the current library.
       ============================================================ */

    async function loadStudents() {

        const collection =
            getStudentsCollection(
                currentLibraryId
            );

        if (!collection) {

            console.error(
                "Student Self Attendance Register: Student collection unavailable."
            );

            return;
        }

        try {

            const snapshot =
                await collection.get();

            studentRecords = {};

            snapshot.forEach(
                function (doc) {

                    const data =
                        doc.data() || {};

                    const code =
                        String(
                            data.studentCode ||
                            doc.id ||
                            ""
                        ).trim();

                    if (!code) {
                        return;
                    }

                    studentRecords[
                        code
                    ] = data;
                }
            );

        } catch (error) {

            console.error(
                "Student Self Attendance Register: Unable to load students.",
                error
            );
        }
    }

    function getActualStudentName(
        record
    ) {

        const code =
            String(
                record.studentCode ||
                ""
            ).trim();

        const student =
            studentRecords[code];

        if (student) {

            return (
                student.name ||
                student.studentName ||
                record.studentName ||
                "—"
            );
        }

        return (
            record.studentName ||
            "—"
        );
    }

    function getActualSeatNumber(
        record
    ) {

        const code =
            String(
                record.studentCode ||
                ""
            ).trim();

        const student =
            studentRecords[code];

        if (student) {

            return (
                student.seatNumber ||
                record.seatNumber ||
                "—"
            );
        }

        return (
            record.seatNumber ||
            "—"
        );
    }

    function getActualShift(
        record
    ) {

        const code =
            String(
                record.studentCode ||
                ""
            ).trim();

        const student =
            studentRecords[code];

        if (student) {

            return (
                student.shift ||
                record.shift ||
                "—"
            );
        }

        return (
            record.shift ||
            "—"
        );
    }

    /* ============================================================
       RENDER
       ============================================================ */

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

        const searchText =
            currentSearch
                .trim()
                .toLowerCase();

        const filteredRecords =
            attendanceRecords.filter(
                function (record) {

                    const name =
                        getActualStudentName(
                            record
                        );

                    const code =
                        String(
                            record.studentCode ||
                            ""
                        );

                    const shift =
                        getActualShift(
                            record
                        );

                    /* Shift filter */
                    if (
                        currentShift !==
                            "all" &&
                        String(
                            shift || ""
                        )
                            .trim()
                            .toLowerCase() !==
                            currentShift.toLowerCase()
                    ) {
                        return false;
                    }

                    /* Search filter */
                    if (searchText) {

                        const searchableText =
                            (
                                name +
                                " " +
                                code +
                                " " +
                                shift
                            )
                                .toLowerCase();

                        if (
                            !searchableText.includes(
                                searchText
                            )
                        ) {
                            return false;
                        }
                    }

                    return true;
                }
            );

        tableBody.innerHTML = "";

        if (
            filteredRecords.length ===
            0
        ) {

            tableWrap.style.display =
                "none";

            emptyBox.style.display =
                "block";

            if (status) {

                status.textContent =
                    "0 self attendance records";
            }

            return;
        }

        tableWrap.style.display =
            "block";

        emptyBox.style.display =
            "none";

        filteredRecords.forEach(
            function (record) {

                const row =
                    document.createElement(
                        "tr"
                    );

                const studentCode =
                    record.studentCode ||
                    "—";

                const studentName =
                    getActualStudentName(
                        record
                    );

                const seatNumber =
                    getActualSeatNumber(
                        record
                    );

                const shift =
                    getActualShift(
                        record
                    );

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
                        ${escapeHTML(
                            studentCode
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            studentName
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            String(
                                seatNumber
                            )
                        )}
                    </td>

                    <td>
                        <span class="self-attendance-shift-badge">
                            ${escapeHTML(
                                String(
                                    shift
                                )
                            )}
                        </span>
                    </td>

                    <td class="self-attendance-time">
                        ${escapeHTML(
                            checkIn
                        )}
                    </td>

                    <td class="self-attendance-time">
                        ${escapeHTML(
                            checkOut
                        )}
                    </td>
                `;

                tableBody.appendChild(
                    row
                );
            }
        );

        if (status) {

            status.textContent =
                `${filteredRecords.length} self attendance record${
                    filteredRecords.length ===
                    1
                        ? ""
                        : "s"
                }`;
        }
    }

    /* ============================================================
       LOAD ATTENDANCE
       ============================================================ */

    async function loadAttendance() {

        hideError();

        setLoading(true);

        /*
         * Refresh student data first so actual names,
         * seats and shifts are available.
         */

        await loadStudents();

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

            attendanceUnsubscribe =
                null;
        }

        attendanceRecords = [];

        /*
         * Only date is queried from Firestore.
         *
         * Existing manual attendance records can also
         * exist for the same date, so they are filtered
         * below using attendanceSource.
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

                        attendanceRecords =
                            [];

                        snapshot.forEach(
                            function (doc) {

                                const data =
                                    doc.data() ||
                                    {};

                                /*
                                 * IMPORTANT:
                                 * Only student QR records.
                                 *
                                 * Manual/admin attendance
                                 * remains completely separate.
                                 */

                                if (
                                    data.attendanceSource !==
                                    "student_qr"
                                ) {
                                    return;
                                }

                                attendanceRecords.push(
                                    {
                                        id:
                                            doc.id,
                                        ...data
                                    }
                                );
                            }
                        );

                        attendanceRecords.sort(
                            function (
                                a,
                                b
                            ) {

                                const aTime =
                                    getTimestampMillis(
                                        a.checkInAt
                                    );

                                const bTime =
                                    getTimestampMillis(
                                        b.checkInAt
                                    );

                                return (
                                    bTime -
                                    aTime
                                );
                            }
                        );

                        setLoading(
                            false
                        );

                        renderRecords();
                    },
                    function (error) {

                        console.error(
                            "Student Self Attendance Register Firestore error:",
                            error
                        );

                        setLoading(
                            false
                        );

                        showError(
                            "Unable to load self attendance records."
                        );
                    }
                );
    }

    /* ============================================================
       DATE
       ============================================================ */

    function handleDateChange(
        event
    ) {

        const selectedDate =
            String(
                event.target.value ||
                ""
            ).trim();

        if (!selectedDate) {
            return;
        }

        currentDate =
            selectedDate;

        loadAttendance();
    }

    /* ============================================================
       SHIFT
       ============================================================ */

    function handleShiftChange(
        event
    ) {

        currentShift =
            String(
                event.target.value ||
                "all"
            ).trim();

        renderRecords();
    }

    /* ============================================================
       SEARCH
       ============================================================ */

    function handleSearchInput(
        event
    ) {

        currentSearch =
            String(
                event.target.value ||
                ""
            );

        renderRecords();
    }

    /* ============================================================
       DEFAULT DATE
       ============================================================ */

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

    /* ============================================================
       EVENTS
       ============================================================ */

    function attachEvents() {

        const dateInput =
            getElement(
                "self-attendance-date"
            );

        const shiftInput =
            getElement(
                "self-attendance-shift"
            );

        const searchInput =
            getElement(
                "self-attendance-search"
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

        if (searchInput) {

            searchInput.addEventListener(
                "input",
                handleSearchInput
            );
        }
    }

    /* ============================================================
       INIT
       ============================================================ */

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

    /* ============================================================
       PUBLIC API
       ============================================================ */

    window
        .LibControlStudentSelfAttendanceRegister = {
            init: init,
            reload: loadAttendance
        };

    /* ============================================================
       START
       ============================================================ */

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
