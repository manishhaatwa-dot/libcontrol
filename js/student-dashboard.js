/**
 * ==========================================================================
 * LIBMANAGE - STUDENT DASHBOARD CORE MODULE
 * ==========================================================================
 *
 * NEW APP FIRESTORE STRUCTURE
 *
 * libmanage_secure_v2
 * └── libraries
 *     └── CURRENT_LIBRARY_ID
 *         ├── students
 *         │   └── STUDENT_CODE
 *         ├── notices
 *         │   └── NOTICE_ID
 *         ├── attendance
 *         │   └── ATTENDANCE_ID
 *         └── seats
 *             └── SEAT_ID
 *
 * IMPORTANT
 * --------------------------------------------------------------------------
 * 1. Old "saas_libraries" structure is NOT used.
 * 2. Student can only load the library stored in the current session.
 * 3. Student dashboard is READ-ONLY.
 * 4. No student data is created, edited or deleted from this module.
 * 5. Firestore Security Rules MUST enforce the real authorization.
 * ==========================================================================
 */


/* ==========================================================================
   1. MODULE STATE
   ========================================================================== */

let studentDashboardData = null;

let studentDashboardLibrary = null;

let studentDashboardNoticeUnsubscribe = null;

let studentDashboardNotificationUnsubscribe = null;

let studentDashboardAttendanceUnsubscribe = null;

let studentDashboardStudentUnsubscribe = null;

let studentAttendanceRecords = [];

let studentCalendarDate = new Date();

/* ==========================================================================
   2. DOM HELPER
   ========================================================================== */

function studentDashboardEl(id) {

    return document.getElementById(id);

}


/* ==========================================================================
   3. SESSION HELPERS
   ========================================================================== */

function getStudentSessionRole() {

    return (
        localStorage.getItem(
            "session_role"
        ) || ""
    ).trim().toLowerCase();

}


function getStudentSessionLibraryId() {

    return (
        localStorage.getItem(
            "session_library_id"
        ) || ""
    ).trim().toUpperCase();

}


function getStudentSessionCode() {

    return (
        localStorage.getItem(
            "session_student_code"
        ) || ""
    ).trim().toUpperCase();

}


function getStudentSessionSeat() {

    return (
        localStorage.getItem(
            "session_student_seat"
        ) || ""
    ).trim();

}


/* ==========================================================================
   4. SESSION VALIDATION
   ========================================================================== */

function validateStudentDashboardSession() {

    const role =
        getStudentSessionRole();

    const libraryId =
        getStudentSessionLibraryId();

    const studentCode =
        getStudentSessionCode();


    if (
        role !== "student" ||
        !libraryId ||
        !studentCode
    ) {

        redirectStudentToGateway();

        return false;

    }


    return true;

}


/* ==========================================================================
   5. SAFE REDIRECT
   ========================================================================== */

function redirectStudentToGateway() {

    const currentPath =
        window.location.pathname;


    if (
        currentPath.includes(
            "/pages/"
        )
    ) {

        window.location.href =
            "../index.html";

    } else {

        window.location.href =
            "index.html";

    }

}


/* ==========================================================================
   6. NEW APP LIBRARY REFERENCE
   ========================================================================== */

function getStudentLibraryRef() {

    const libraryId =
        getStudentSessionLibraryId();


    if (
        !libraryId
    ) {
        return null;
    }


    if (
        !window.LibManageDB ||
        typeof window.LibManageDB.library !==
        "function"
    ) {

        console.error(
            "[Student Dashboard] Shared database engine unavailable."
        );

        return null;

    }


    try {

        return window.LibManageDB.library(
            libraryId
        );

    }
    catch (error) {

        console.error(
            "[Student Dashboard] Library reference error:",
            error
        );

        return null;

    }

}


/* ==========================================================================
   7. CURRENT STUDENT REFERENCE
   ========================================================================== */

function getCurrentStudentRef() {

    const libraryRef =
        getStudentLibraryRef();


    const studentCode =
        getStudentSessionCode();


    if (
        !libraryRef ||
        !studentCode
    ) {
        return null;
    }


    return libraryRef
        .collection(
            "students"
        )
        .doc(
            studentCode
        );

}


/* ==========================================================================
   8. HTML ESCAPE
   ========================================================================== */

function escapeStudentDashboardHtml(
    value
) {

    return String(
        value ?? ""
    )
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
        "&#39;"
    );

}


/* ==========================================================================
   9. TEXT SETTER
   ========================================================================== */

function setStudentText(
    elementId,
    value,
    fallback = "-"
) {

    const element =
        studentDashboardEl(
            elementId
        );


    if (!element) {
        return;
    }


    const finalValue =
        value === undefined ||
        value === null ||
        String(value).trim() === ""
            ? fallback
            : value;


    element.textContent =
        finalValue;

}


/* ==========================================================================
   10. INITIAL LIBRARY UI
   ========================================================================== */

function initializeStudentLibraryHeader() {

    const libraryName =
        localStorage.getItem(
            "session_library_name"
        ) ||
        "Library";


    const libraryId =
        getStudentSessionLibraryId();


    const studentCode =
        getStudentSessionCode();


    /*
     * Existing IDs kept for compatibility.
     */

    setStudentText(
        "student-library-name",
        libraryName,
        "Library"
    );


    setStudentText(
        "nav-library-name",
        libraryName,
        "Library"
    );


    setStudentText(
        "student-library-title",
        libraryName,
        "Library"
    );


    /*
     * Current student-dashboard.html IDs.
     */

    setStudentText(
        "student-library-id-display",
        libraryId,
        "-"
    );


    setStudentText(
        "student-code-display",
        studentCode,
        "-"
    );

}


/* ==========================================================================
   11. LOAD LIBRARY
   ========================================================================== */

async function loadStudentLibrary() {

    const libraryRef =
        getStudentLibraryRef();


    if (!libraryRef) {
        return false;
    }


    try {

        const snapshot =
            await libraryRef.get();


        if (
            !snapshot.exists
        ) {

            alert(
                "Library account could not be found."
            );

            redirectStudentToGateway();

            return false;

        }


        studentDashboardLibrary =
            snapshot.data() || {};


        if (
            studentDashboardLibrary.enabled ===
            false
        ) {

            alert(
                "Student access has been disabled for this library."
            );

            logoutStudentDashboard();

            return false;

        }


        if (
            studentDashboardLibrary.status &&
            String(
                studentDashboardLibrary.status
            ).toLowerCase() !==
            "approved"
        ) {

            alert(
                "This library is currently not approved."
            );

            logoutStudentDashboard();

            return false;

        }


        const actualLibraryName =
            studentDashboardLibrary.name ||
            localStorage.getItem(
                "session_library_name"
            ) ||
            "Library";


        localStorage.setItem(
            "session_library_name",
            actualLibraryName
        );


        initializeStudentLibraryHeader();


        return true;

    }
    catch (error) {

        console.error(
            "[Student Dashboard] Library loading error:",
            error
        );


        alert(
            "Library data load error:\n\n" +
            (error.code || "NO_CODE") +
            "\n" +
            (error.message || "Unknown error")
        );


        showStudentDashboardError(
            "Unable to load library information."
        );


        return false;

    }

}


/* ==========================================================================
   12. LOAD CURRENT STUDENT
   ========================================================================== */

async function loadCurrentStudent() {

    const studentRef =
        getCurrentStudentRef();


    if (!studentRef) {

        showStudentDashboardError(
            "Student session information is missing."
        );

        return false;

    }


    try {

        const snapshot =
            await studentRef.get();


        if (
            !snapshot.exists
        ) {

            alert(
                "Student account could not be found."
            );

            logoutStudentDashboard();

            return false;

        }


        studentDashboardData =
            {
                id:
                    snapshot.id,

                ...snapshot.data()
            };


        renderStudentProfile(
            studentDashboardData
        );


        return true;

    }
    catch (error) {

        console.error(
            "[Student Dashboard] Student loading error:",
            error
        );


        alert(
            "Student data load error:\n\n" +
            (error.code || "NO_CODE") +
            "\n" +
            (error.message || "Unknown error")
        );


        showStudentDashboardError(
            "Unable to load student profile."
        );


        return false;

    }

}


/* ==========================================================================
   13. STUDENT PROFILE RENDER
   ========================================================================== */

function renderStudentProfile(
    student
) {

    const studentName =
        student.studentName ||
        student.name ||
        "";


    const fatherName =
        student.fatherName ||
        student.father ||
        "";


    /*
     * Support all existing class field names.
     */

    const studentClass =
        student.className ||
        student.class ||
        student.studentClass ||
        "";


    const seatNumber =
        student.seatNumber ||
        student.seat ||
        getStudentSessionSeat() ||
        "";


    const mobile =
        student.mobile ||
        student.mobileNumber ||
        "";


    const shift =
        student.shift ||
        "";


    const status =
        student.status ||
        "";


    const joiningDate =
        student.joiningDate ||
        student.joining ||
        "";


    const expiryDate =
        student.expiryDate ||
        student.expiry ||
        "";


    const studentCode =
        student.studentCode ||
        student.id ||
        getStudentSessionCode();


    /* ----------------------------------------------------------------------
       Name
    ---------------------------------------------------------------------- */

    setStudentText(
        "student-name",
        studentName,
        "Student"
    );


    setStudentText(
        "dashboard-student-name",
        studentName,
        "Student"
    );


    setStudentText(
        "welcome-student-name",
        studentName,
        "Student"
    );


    /* ----------------------------------------------------------------------
       Student Code
    ---------------------------------------------------------------------- */

    setStudentText(
        "student-code",
        studentCode
    );


    setStudentText(
        "dashboard-student-code",
        studentCode
    );


    setStudentText(
        "student-code-display",
        studentCode
    );


    /* ----------------------------------------------------------------------
       Father
    ---------------------------------------------------------------------- */

    setStudentText(
        "student-father",
        fatherName
    );


    setStudentText(
        "student-father-name",
        fatherName
    );


    /* ----------------------------------------------------------------------
       Class
    ---------------------------------------------------------------------- */

    setStudentText(
        "student-class",
        studentClass
    );


    /* ----------------------------------------------------------------------
       Seat
    ---------------------------------------------------------------------- */

    setStudentText(
        "student-seat",
        seatNumber
    );


    setStudentText(
        "student-seat-number",
        seatNumber
    );


    /* ----------------------------------------------------------------------
       Mobile
    ---------------------------------------------------------------------- */

    setStudentText(
        "student-mobile",
        mobile
    );


    /* ----------------------------------------------------------------------
       Shift
    ---------------------------------------------------------------------- */

    setStudentText(
        "student-shift",
        shift
    );


    /* ----------------------------------------------------------------------
       Joining Date
    ---------------------------------------------------------------------- */

    const formattedJoiningDate =
        formatStudentDate(
            joiningDate
        );


    setStudentText(
        "student-joining-date",
        formattedJoiningDate
    );


    setStudentText(
        "student-joining",
        formattedJoiningDate
    );


    /* ----------------------------------------------------------------------
       Expiry Date
    ---------------------------------------------------------------------- */

    const formattedExpiryDate =
        formatStudentDate(
            expiryDate
        );


    setStudentText(
        "student-expiry-date",
        formattedExpiryDate
    );


    setStudentText(
        "student-expiry",
        formattedExpiryDate
    );

/* ----------------------------------------------------------------------
       Status
    ---------------------------------------------------------------------- */

    setStudentStatus(
        status
    );


    /* ----------------------------------------------------------------------
       Fee Status
    ---------------------------------------------------------------------- */

    const feeStatus =
        String(
            student.feeStatus ||
            "Paid"
        )
        .trim();


    const feeStatusElement =
        studentDashboardEl(
            "student-fee-status"
        );


    if (feeStatusElement) {

        const normalizedFeeStatus =
            feeStatus.toLowerCase();


        feeStatusElement.textContent =
            feeStatus;


        feeStatusElement.classList.remove(
            "fee-paid",
            "fee-due"
        );


        if (
            normalizedFeeStatus ===
            "due"
        ) {

            feeStatusElement.classList.add(
                "fee-due"
            );

        }
        else {

            feeStatusElement.classList.add(
                "fee-paid"
            );

        }

    }

}

/* ==========================================================================
   14. STATUS RENDER
   ========================================================================== */

function setStudentStatus(
    status
) {

    const statusElements = [

        studentDashboardEl(
            "student-status"
        ),

        studentDashboardEl(
            "dashboard-student-status"
        )

    ];


    statusElements.forEach(
        (element) => {

            if (!element) {
                return;
            }


            const normalized =
                String(
                    status ||
                    ""
                ).toLowerCase();


            element.textContent =
                status ||
                "Unknown";


            element.classList.remove(
                "active",
                "expired",
                "pending",
                "inactive"
            );


            if (
                normalized ===
                "active"
            ) {

                element.classList.add(
                    "active"
                );

            }
            else if (
                normalized ===
                "expired"
            ) {

                element.classList.add(
                    "expired"
                );

            }
            else if (
                normalized ===
                "pending"
            ) {

                element.classList.add(
                    "pending"
                );

            }
            else {

                element.classList.add(
                    "inactive"
                );

            }

        }
    );

}


/* ==========================================================================
   15. DATE FORMATTER
   ========================================================================== */

function formatStudentDate(
    value
) {

    if (
        !value
    ) {
        return "-";
    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        const date =
            value.toDate();


        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    }


    if (
        value.seconds !== undefined
    ) {

        const date =
            new Date(
                value.seconds * 1000
            );


        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return date.toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );

        }

    }


    const stringValue =
        String(value).trim();


    if (
        /^\d{2}\/\d{2}\/\d{4}$/
            .test(
                stringValue
            )
    ) {

        return stringValue;

    }


    const parsed =
        new Date(
            stringValue
        );


    if (
        !Number.isNaN(
            parsed.getTime()
        )
    ) {

        return parsed.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    }


    return stringValue;

}


/* ==========================================================================
   16. LOAD NOTICES
   ========================================================================== */

function startStudentNoticeListener() {

    const libraryRef =
        getStudentLibraryRef();


    const container =
        studentDashboardEl(
            "student-notices-container"
        ) ||
        studentDashboardEl(
            "recent-notices-container"
        ) ||
        studentDashboardEl(
            "student-notice-list"
        );


    if (
        !libraryRef ||
        !container
    ) {
        return;
    }


    if (
        typeof studentDashboardNoticeUnsubscribe ===
        "function"
    ) {

        studentDashboardNoticeUnsubscribe();

    }


    studentDashboardNoticeUnsubscribe =
        libraryRef
            .collection(
                "notices"
            )
            .onSnapshot(

                (snapshot) => {

                    const notices =
                        snapshot.docs.map(
                            (doc) => ({

                                id:
                                    doc.id,

                                ...doc.data()

                            })
                        );


                    notices.sort(
                        (
                            a,
                            b
                        ) => {

                            return (
                                getTimestampMillis(
                                    b.createdAt
                                ) -
                                getTimestampMillis(
                                    a.createdAt
                                )
                            );

                        }
                    );


                    renderStudentNotices(
                        notices,
                        container
                    );

                },

                (error) => {

                    console.error(
                        "[Student Dashboard] Notice listener error:",
                        error
                    );


                    container.innerHTML = `
                        <div class="empty-message">
                            Unable to load notices right now.
                        </div>
                    `;

                }

            );

}

/* ==========================================================================
   16A. STUDENT NOTIFICATION LISTENER
   ========================================================================== */

function startStudentNotificationListener() {

    const container =
        studentDashboardEl(
            "student-notifications-container"
        ) ||
        studentDashboardEl(
            "notification-list"
        ) ||
        studentDashboardEl(
            "student-notification-list"
        );


    if (
        !container
    ) {
        return;
    }


    if (
        typeof studentDashboardNotificationUnsubscribe ===
        "function"
    ) {

        studentDashboardNotificationUnsubscribe();

    }


    const currentUser =
        typeof firebase !== "undefined" &&
        firebase.auth
            ? firebase.auth().currentUser
            : null;


    if (
        !currentUser
    ) {

        console.warn(
            "[Student Dashboard] Firebase student user is not available."
        );

        return;

    }


    studentDashboardNotificationUnsubscribe =
        firebase
            .firestore()
            .collection(
                "notifications"
            )
            .doc(
                currentUser.uid
            )
            .collection(
                "items"
            )
            .orderBy(
                "createdAt",
                "desc"
            )
            .limit(
                50
            )
            .onSnapshot(

                (snapshot) => {

                    const notifications =
                        snapshot.docs.map(
                            (doc) => ({

                                id:
                                    doc.id,

                                ...doc.data()

                            })
                        );


                    renderStudentNotifications(
                        notifications,
                        container
                    );

                },

                (error) => {

                    console.error(
                        "[Student Dashboard] Notification listener error:",
                        error
                    );


                    container.innerHTML = `
                        <div class="empty-message">
                            Unable to load notifications right now.
                        </div>
                    `;

                }

            );

}

/* ==========================================================================
   17. NOTICE RENDER
   ========================================================================== */

function renderStudentNotices(
    notices,
    container
) {

    if (
        !notices.length
    ) {

        container.innerHTML = `
            <div class="empty-message">
                No notices available right now.
            </div>
        `;

        return;

    }


    let html =
        "";


    notices.forEach(
        (notice) => {

            html += `
                <div class="notice-item">

                    <h3>
                        ${escapeStudentDashboardHtml(
                            notice.title ||
                            "Notice"
                        )}
                    </h3>

                    <p>
                        ${escapeStudentDashboardHtml(
                            notice.message ||
                            ""
                        )}
                    </p>

                    <span class="notice-date">
                        ${escapeStudentDashboardHtml(
                            formatStudentDateTime(
                                notice.createdAt
                            )
                        )}
                    </span>

                </div>
            `;

        }
    );


    container.innerHTML =
        html;

}


/* ==========================================================================
   18. TIMESTAMP MILLIS
   ========================================================================== */

function getTimestampMillis(
    value
) {

    if (
        !value
    ) {
        return 0;
    }


    if (
        typeof value.toMillis ===
        "function"
    ) {

        return value.toMillis();

    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        return value
            .toDate()
            .getTime();

    }


    if (
        value.seconds !== undefined
    ) {

        return (
            Number(
                value.seconds
            ) *
            1000
        );

    }


    /*
     * Also support normal date strings.
     */

    if (
        typeof value ===
        "string"
    ) {

        const parsed =
            new Date(value);


        if (
            !Number.isNaN(
                parsed.getTime()
            )
        ) {

            return parsed.getTime();

        }

    }


    return 0;

}


/* ==========================================================================
   19. DATE + TIME
   ========================================================================== */

function formatStudentDateTime(
    value
) {

    const millis =
        getTimestampMillis(
            value
        );


    if (
        !millis
    ) {
        return "Just now";
    }


    return new Date(
        millis
    ).toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* ==========================================================================
   20. ATTENDANCE LISTENER
   ========================================================================== */

function startStudentAttendanceListener() {

    const libraryRef =
        getStudentLibraryRef();


    if (
        !libraryRef
    ) {
        return;
    }


    if (
        typeof studentDashboardAttendanceUnsubscribe ===
        "function"
    ) {

        studentDashboardAttendanceUnsubscribe();

    }


    studentDashboardAttendanceUnsubscribe =
        libraryRef
            .collection(
                "attendance"
            )
            .onSnapshot(

                (snapshot) => {

                    const studentCode =
                        getStudentSessionCode();


                    const records =
                        snapshot.docs
                            .map(
                                (doc) => ({

                                    id:
                                        doc.id,

                                    ...doc.data()

                                })
                            )
                            .filter(
                                (record) => {

                                    const recordCode =
                                        String(
                                            record.studentCode ||
                                            record.studentId ||
                                            record.uid ||
                                            ""
                                        )
                                        .trim()
                                        .toUpperCase();


                                    return (
                                        recordCode ===
                                        studentCode
                                    );

                                }
                            );


                    studentAttendanceRecords =
                        records;


                    calculateAttendanceSummary(
                        records
                    );


                    renderStudentAttendance(
                        records
                    );

                },

                (error) => {

                    console.error(
                        "[Student Dashboard] Attendance listener error:",
                        error
                    );


                    const calendar =
                        studentDashboardEl(
                            "attendance-calendar"
                        );


                    if (calendar) {

                        calendar.innerHTML = `
                            <div class="loading-message">
                                Unable to load attendance right now.
                            </div>
                        `;

                    }

                }

            );

}


/* ==========================================================================
   21. ATTENDANCE RENDER
   ========================================================================== */

function renderStudentAttendance(
    records
) {

    const calendar =
        studentDashboardEl(
            "attendance-calendar"
        );


    if (
        !calendar
    ) {
        return;
    }


    /*
     * Keep records available for month navigation.
     */

    studentAttendanceRecords =
        records || [];


    renderAttendanceCalendar();

}


/* ==========================================================================
   22. ATTENDANCE DATE
   ========================================================================== */

function formatAttendanceDate(
    record
) {

    const value =
        record.date ||
        record.attendanceDate ||
        record.createdAt;


    if (
        typeof value ===
        "string"
    ) {

        /*
         * YYYY-MM-DD -> DD/MM/YYYY
         */

        if (
            /^\d{4}-\d{2}-\d{2}$/
                .test(value)
        ) {

            const parts =
                value.split("-");


            return (
                parts[2] +
                "/" +
                parts[1] +
                "/" +
                parts[0]
            );

        }


        return value;

    }


    return formatStudentDate(
        value
    );

}


/* ==========================================================================
   23. ATTENDANCE SUMMARY
   ========================================================================== */

function calculateAttendanceSummary(
    records
) {

    let present =
        0;

    let absent =
        0;


    records.forEach(
        (record) => {

            const status =
                String(
                    record.status ||
                    record.attendance ||
                    ""
                ).toLowerCase();


            if (
                status ===
                "present"
            ) {

                present++;

            }
            else if (
                status ===
                "absent"
            ) {

                absent++;

            }

        }
    );


    const total =
        present +
        absent;


    const percentage =
        total > 0
            ? Math.round(
                (
                    present /
                    total
                ) *
                100
            )
            : 0;


    /*
     * Existing IDs
     */

    setStudentText(
        "attendance-present",
        present,
        "0"
    );


    setStudentText(
        "attendance-absent",
        absent,
        "0"
    );


    setStudentText(
        "attendance-total",
        total,
        "0"
    );


    setStudentText(
        "attendance-percentage",
        percentage + "%",
        "0%"
    );


    /*
     * Current HTML IDs
     */

    setStudentText(
        "total-present",
        present,
        "0"
    );


    setStudentText(
        "total-absent",
        absent,
        "0"
    );

}


/* ==========================================================================
   24. CALENDAR HELPERS
   ========================================================================== */

function getAttendanceRecordDate(
    record
) {

    const value =
        record.date ||
        record.attendanceDate ||
        "";


    if (
        typeof value ===
        "string"
    ) {

        /*
         * Attendance is normally stored as YYYY-MM-DD.
         */

        if (
            /^\d{4}-\d{2}-\d{2}$/
                .test(value)
        ) {

            return value;

        }


        /*
         * Also support DD/MM/YYYY.
         */

        if (
            /^\d{2}\/\d{2}\/\d{4}$/
                .test(value)
        ) {

            const parts =
                value.split("/");


            return (
                parts[2] +
                "-" +
                parts[1] +
                "-" +
                parts[0]
            );

        }

    }


    if (value) {

        const millis =
            getTimestampMillis(
                value
            );


        if (millis) {

            const date =
                new Date(
                    millis
                );


            return (
                date.getFullYear() +
                "-" +
                String(
                    date.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                ) +
                "-" +
                String(
                    date.getDate()
                ).padStart(
                    2,
                    "0"
                )
            );

        }

    }


    return "";

}


function getTodayDateKey() {

    const now =
        new Date();


    return (
        now.getFullYear() +
        "-" +
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        ) +
        "-" +
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        )
    );

}


/* ==========================================================================
   25. RENDER ATTENDANCE CALENDAR
   ========================================================================== */

function renderAttendanceCalendar() {

    const calendar =
        studentDashboardEl(
            "attendance-calendar"
        );


    const monthTitle =
        studentDashboardEl(
            "calendar-month-title"
        );


    if (
        !calendar
    ) {
        return;
    }


    const year =
        studentCalendarDate.getFullYear();


    const month =
        studentCalendarDate.getMonth();


    if (monthTitle) {

        monthTitle.textContent =
            studentCalendarDate.toLocaleDateString(
                "en-IN",
                {
                    month: "long",
                    year: "numeric"
                }
            );

    }


    const firstDay =
        new Date(
            year,
            month,
            1
        )
        .getDay();


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    const attendanceMap =
        {};


    studentAttendanceRecords.forEach(
        (record) => {

            const dateKey =
                getAttendanceRecordDate(
                    record
                );


            if (!dateKey) {
                return;
            }


            attendanceMap[
                dateKey
            ] =
                String(
                    record.status ||
                    record.attendance ||
                    ""
                ).toLowerCase();

        }
    );


    let html =
        "";


    /*
     * Empty cells before month start.
     */

    for (
        let i = 0;
        i < firstDay;
        i++
    ) {

        html += `
            <div class="calendar-day empty"></div>
        `;

    }


    const todayKey =
        getTodayDateKey();


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const dateKey =
            year +
            "-" +
            String(
                month + 1
            ).padStart(
                2,
                "0"
            ) +
            "-" +
            String(
                day
            ).padStart(
                2,
                "0"
            );


        const status =
            attendanceMap[
                dateKey
            ] || "";


        const statusClass =
            status === "present"
                ? "present"
                : status === "absent"
                    ? "absent"
                    : "";


        const statusText =
            status === "present"
                ? "Present"
                : status === "absent"
                    ? "Absent"
                    : "";


        const todayClass =
            dateKey === todayKey
                ? "today"
                : "";


        html += `
            <div
                class="calendar-day ${todayClass}"
            >

                <div class="calendar-day-number">
                    ${day}
                </div>

                ${
                    statusText
                        ? `
                            <span
                                class="calendar-status ${statusClass}"
                            >
                                ${statusText}
                            </span>
                        `
                        : ""
                }

            </div>
        `;

    }


    calendar.innerHTML =
        html;

}


/* ==========================================================================
   26. CALENDAR NAVIGATION
   ========================================================================== */

function bindAttendanceCalendarNavigation() {

    const previousButton =
        studentDashboardEl(
            "previous-month-btn"
        );


    const nextButton =
        studentDashboardEl(
            "next-month-btn"
        );


    if (previousButton) {

        previousButton.addEventListener(
            "click",
            () => {

                studentCalendarDate =
                    new Date(
                        studentCalendarDate.getFullYear(),
                        studentCalendarDate.getMonth() - 1,
                        1
                    );


                renderAttendanceCalendar();

            }
        );

    }


    if (nextButton) {

        nextButton.addEventListener(
            "click",
            () => {

                studentCalendarDate =
                    new Date(
                        studentCalendarDate.getFullYear(),
                        studentCalendarDate.getMonth() + 1,
                        1
                    );


                renderAttendanceCalendar();

            }
        );

    }

}


/* ==========================================================================
   27. REALTIME STUDENT PROFILE
   ========================================================================== */

function startStudentProfileListener() {

    const studentRef =
        getCurrentStudentRef();


    if (!studentRef) {
        return;
    }


    if (
        typeof studentDashboardStudentUnsubscribe ===
        "function"
    ) {

        studentDashboardStudentUnsubscribe();

    }


    studentDashboardStudentUnsubscribe =
        studentRef.onSnapshot(

            (snapshot) => {

                if (
                    !snapshot.exists
                ) {

                    alert(
                        "Your student account is no longer available."
                    );

                    logoutStudentDashboard();

                    return;

                }


                studentDashboardData =
                    {
                        id:
                            snapshot.id,

                        ...snapshot.data()
                    };


                renderStudentProfile(
                    studentDashboardData
                );

            },

            (error) => {

                console.error(
                    "[Student Dashboard] Student realtime listener error:",
                    error
                );

            }

        );

}

/* ==========================================================================
   28. FIRST LOGIN PASSWORD CHANGE
   ========================================================================== */

function showStudentPasswordChangeModal() {

    if (
        document.getElementById(
            "student-password-change-modal"
        )
    ) {

        return;

    }


    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "student-password-change-modal";


    overlay.style.cssText = `
        position:fixed;
        inset:0;
        z-index:99999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
        background:rgba(15,23,42,0.65);
        backdrop-filter:blur(6px);
    `;


    overlay.innerHTML = `

        <div
            style="
                width:100%;
                max-width:430px;
                background:#ffffff;
                border-radius:18px;
                padding:26px;
                box-shadow:0 25px 60px rgba(15,23,42,0.25);
            "
        >

            <h2
                style="
                    margin:0 0 8px;
                    font-size:1.35rem;
                    color:#0f172a;
                "
            >
                Create Your New Password
            </h2>


            <p
                style="
                    margin:0 0 20px;
                    color:#64748b;
                    font-size:0.9rem;
                    line-height:1.5;
                "
            >
                This is your first login. Please create a
                new password before continuing to your
                Student Dashboard.
            </p>


            <div style="margin-bottom:14px;">

                <label
                    for="student-new-password"
                    style="
                        display:block;
                        margin-bottom:6px;
                        font-size:0.85rem;
                        font-weight:700;
                        color:#334155;
                    "
                >
                    New Password
                </label>


                <input
                    type="password"
                    id="student-new-password"
                    minlength="8"
                    autocomplete="new-password"
                    placeholder="Enter new password"
                    style="
                        width:100%;
                        padding:12px 13px;
                        border:1px solid #dbe2ea;
                        border-radius:9px;
                        font:inherit;
                        outline:none;
                    "
                >

            </div>


            <div style="margin-bottom:16px;">

                <label
                    for="student-confirm-password"
                    style="
                        display:block;
                        margin-bottom:6px;
                        font-size:0.85rem;
                        font-weight:700;
                        color:#334155;
                    "
                >
                    Confirm New Password
                </label>


                <input
                    type="password"
                    id="student-confirm-password"
                    minlength="8"
                    autocomplete="new-password"
                    placeholder="Confirm new password"
                    style="
                        width:100%;
                        padding:12px 13px;
                        border:1px solid #dbe2ea;
                        border-radius:9px;
                        font:inherit;
                        outline:none;
                    "
                >

            </div>


            <div
                id="student-password-change-message"
                style="
                    display:none;
                    margin-bottom:14px;
                    padding:10px 12px;
                    border-radius:8px;
                    font-size:0.82rem;
                    font-weight:600;
                "
            ></div>


            <button
                type="button"
                id="student-change-password-btn"
                style="
                    width:100%;
                    border:none;
                    padding:12px;
                    border-radius:9px;
                    background:#2563eb;
                    color:#ffffff;
                    font:inherit;
                    font-weight:700;
                    cursor:pointer;
                "
            >
                Change Password
            </button>

        </div>

    `;


    document.body.appendChild(
        overlay
    );


    const changeButton =
        document.getElementById(
            "student-change-password-btn"
        );


    const newPasswordInput =
        document.getElementById(
            "student-new-password"
        );


    const confirmPasswordInput =
        document.getElementById(
            "student-confirm-password"
        );


    const messageBox =
        document.getElementById(
            "student-password-change-message"
        );


    function showPasswordMessage(
        message,
        isError = true
    ) {

        if (!messageBox) {
            return;
        }


        messageBox.textContent =
            message;


        messageBox.style.display =
            "block";


        messageBox.style.background =
            isError
                ? "#fee2e2"
                : "#dcfce7";


        messageBox.style.color =
            isError
                ? "#991b1b"
                : "#166534";

    }


    if (changeButton) {

        changeButton.addEventListener(
            "click",
            async () => {

                const newPassword =
                    newPasswordInput
                        ? newPasswordInput.value
                        : "";


                const confirmPassword =
                    confirmPasswordInput
                        ? confirmPasswordInput.value
                        : "";


                if (
                    newPassword.length <
                    8
                ) {

                    showPasswordMessage(
                        "New password must contain at least 8 characters."
                    );

                    return;

                }


                if (
                    newPassword !==
                    confirmPassword
                ) {

                    showPasswordMessage(
                        "Passwords do not match."
                    );

                    return;

                }


                const currentUser =
                    firebase.auth()
                        .currentUser;


                if (!currentUser) {

                    showPasswordMessage(
                        "Your Firebase login session has expired. Please login again."
                    );

                    return;

                }


                changeButton.disabled =
                    true;


                changeButton.textContent =
                    "Changing Password...";


                try {

                    await currentUser
                        .updatePassword(
                            newPassword
                        );


                    const studentRef =
                        getCurrentStudentRef();


                    if (!studentRef) {

                        throw new Error(
                            "Student record reference is unavailable."
                        );

                    }


                    await studentRef.update({

                        mustChangePassword:
                            false,

                        updatedAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()

                    });


                    showPasswordMessage(
                        "Password changed successfully.",
                        false
                    );


                    setTimeout(
                        () => {

                            overlay.remove();

                        },
                        700
                    );


                }
                catch (error) {

                    console.error(
                        "[Student Dashboard] Password change error:",
                        error
                    );


                    let message =
                        "Unable to change password.";


                    if (
                        error.code ===
                        "auth/requires-recent-login"
                    ) {

                        message =
                            "Please login again with your current password and try again.";

                    }
                    else if (
                        error.code ===
                        "auth/weak-password"
                    ) {

                        message =
                            "Please choose a stronger password.";

                    }
                    else if (
                        error.message
                    ) {

                        message =
                            error.message;

                    }


                    showPasswordMessage(
                        message
                    );


                    changeButton.disabled =
                        false;


                    changeButton.textContent =
                        "Change Password";

                }

            }
        );

    }

}


/* ==========================================================================
   29. CHECK FIRST LOGIN PASSWORD STATE
   ========================================================================== */

function checkStudentFirstLoginPassword() {

    if (
        !studentDashboardData
    ) {

        return;

    }


    if (
        studentDashboardData
            .mustChangePassword ===
        true
    ) {

        showStudentPasswordChangeModal();

    }

}

/* ==========================================================================
   28. STUDENT LOGOUT
   ========================================================================== */

function logoutStudentDashboard() {

    if (
        typeof studentDashboardNoticeUnsubscribe ===
        "function"
    ) {

        studentDashboardNoticeUnsubscribe();

    }


if (
        typeof studentDashboardNotificationUnsubscribe ===
        "function"
    ) {

        studentDashboardNotificationUnsubscribe();

    }
   
   
    if (
        typeof studentDashboardAttendanceUnsubscribe ===
        "function"
    ) {

        studentDashboardAttendanceUnsubscribe();

    }


    if (
        typeof studentDashboardStudentUnsubscribe ===
        "function"
    ) {

        studentDashboardStudentUnsubscribe();

    }


    localStorage.removeItem(
        "session_role"
    );

    localStorage.removeItem(
        "session_student_code"
    );

    localStorage.removeItem(
        "session_student_seat"
    );

    localStorage.removeItem(
        "session_library_id"
    );

    localStorage.removeItem(
        "session_library_name"
    );


    sessionStorage.clear();


    redirectStudentToGateway();

}


/* ==========================================================================
   29. LOGOUT BUTTON
   ========================================================================== */

function bindStudentLogout() {

    document.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "#student-exit-btn, #student-logout-btn"
                );


            if (!button) {
                return;
            }


            logoutStudentDashboard();

        }
    );

}


/* ==========================================================================
   30. ERROR DISPLAY
   ========================================================================== */

function showStudentDashboardError(
    message
) {

    const containers = [

        studentDashboardEl(
            "student-dashboard-error"
        ),

        studentDashboardEl(
            "dashboard-error"
        )

    ];


    containers.forEach(
        (container) => {

            if (!container) {
                return;
            }


            container.textContent =
                message;


            container.classList.add(
                "active"
            );

        }
    );

}


/* ==========================================================================
   31. PREVENT UNAUTHORIZED FORM SUBMISSIONS
   ========================================================================== */

function protectStudentDashboardForms() {

    document.addEventListener(
        "submit",
        (event) => {

            const form =
                event.target;


            if (
                !form
            ) {
                return;
            }


            const allowed =
                form.id ===
                    "student-search-form" ||
                form.id ===
                    "search-form";


            if (
                !allowed
            ) {

                event.preventDefault();

            }

        }
    );

}


/* ==========================================================================
   32. LOAD ALL DASHBOARD DATA
   ========================================================================== */

async function initializeStudentDashboard() {

    if (
        !validateStudentDashboardSession()
    ) {
        return;
    }


    if (
        typeof firebase ===
        "undefined"
    ) {

        console.error(
            "[Student Dashboard] Firebase SDK not loaded."
        );


        showStudentDashboardError(
            "Firebase SDK is not loaded."
        );


        return;

    }


    if (
        !window.db
    ) {

        console.error(
            "[Student Dashboard] Firestore unavailable."
        );


        showStudentDashboardError(
            "Database connection unavailable."
        );


        return;

    }


    initializeStudentLibraryHeader();


    bindAttendanceCalendarNavigation();


    const libraryLoaded =
        await loadStudentLibrary();


    if (
        !libraryLoaded
    ) {
        return;
    }


    const studentLoaded =
        await loadCurrentStudent();


    if (
        !studentLoaded
    ) {
        return;
    }

checkStudentFirstLoginPassword();
   
    startStudentProfileListener();

    startStudentNoticeListener();

    startStudentNotificationListener();

    startStudentAttendanceListener();

    bindStudentLogout();

    protectStudentDashboardForms();


    console.log(
        "[LibManage] Student Dashboard loaded successfully."
    );

}


/* ==========================================================================
   33. START
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeStudentDashboard();

    }
);


/* ==========================================================================
   34. PUBLIC API
   ========================================================================== */

window.LibManageStudentDashboard = {

    reload:
        async function () {

            await loadStudentLibrary();

            await loadCurrentStudent();

        },


    logout:
        logoutStudentDashboard,


    getStudent:
        function () {

            return studentDashboardData
                ? {
                    ...studentDashboardData
                }
                : null;

        },


    getLibrary:
        function () {

            return studentDashboardLibrary
                ? {
                    ...studentDashboardLibrary
                }
                : null;

        }

};


console.log(
    "[LibManage] student-dashboard.js initialized."
);
