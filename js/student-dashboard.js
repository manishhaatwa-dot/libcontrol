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

let studentDashboardAttendanceUnsubscribe = null;

let studentDashboardStudentUnsubscribe = null;


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

    if (
        !window.db
    ) {
        return null;
    }


    const libraryId =
        getStudentSessionLibraryId();


    if (!libraryId) {
        return null;
    }


    return window.db
        .collection(
            "libmanage_secure_v2"
        )
        .collection(
            "libraries"
        )
        .doc(
            libraryId
        );

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


        /*
         * IMPORTANT:
         *
         * Client-side checks are only an additional layer.
         * Firestore Security Rules must enforce the same restrictions.
         */


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

    } catch (error) {

        console.error(
            "[Student Dashboard] Library loading error:",
            error
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

    } catch (error) {

        console.error(
            "[Student Dashboard] Student loading error:",
            error
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


    const studentClass =
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

    setStudentText(
        "student-joining-date",
        formatStudentDate(
            joiningDate
        )
    );


    /* ----------------------------------------------------------------------
       Expiry Date
    ---------------------------------------------------------------------- */

    setStudentText(
        "student-expiry-date",
        formatStudentDate(
            expiryDate
        )
    );


    /* ----------------------------------------------------------------------
       Status
    ---------------------------------------------------------------------- */

    setStudentStatus(
        status
    );

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

            } else if (
                normalized ===
                "expired"
            ) {

                element.classList.add(
                    "expired"
                );

            } else if (
                normalized ===
                "pending"
            ) {

                element.classList.add(
                    "pending"
                );

            } else {

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


    /*
     * Keep DD/MM/YYYY as it is.
     */

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
                        <div class="empty-state-text">
                            Unable to load notices right now.
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
            <div class="empty-state-text">
                No notices available right now.
            </div>
        `;

        return;
    }


    let html = "";


    notices.forEach(
        (notice) => {

            html += `
                <div class="notice-card">

                    <div class="notice-title">
                        ${escapeStudentDashboardHtml(
                            notice.title ||
                            "Notice"
                        )}
                    </div>

                    <div class="notice-message">
                        ${escapeStudentDashboardHtml(
                            notice.message ||
                            ""
                        )}
                    </div>

                    <div class="notice-date">
                        ${escapeStudentDashboardHtml(
                            formatStudentDateTime(
                                notice.createdAt
                            )
                        )}
                    </div>

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
   ==========================================================================
 *
 * Supports common attendance structures:
 *
 * A) attendance/{attendanceId}
 * B) attendance/{date}
 *
 * Expected fields may include:
 * studentCode
 * status
 * date
 * attendanceDate
 * createdAt
 *
 * The module filters records to the CURRENT STUDENT.
 * ==========================================================================
 */

function startStudentAttendanceListener() {

    const libraryRef =
        getStudentLibraryRef();


    const container =
        studentDashboardEl(
            "student-attendance-container"
        ) ||
        studentDashboardEl(
            "attendance-history-container"
        );


    if (
        !libraryRef ||
        !container
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


                    renderStudentAttendance(
                        records,
                        container
                    );


                    calculateAttendanceSummary(
                        records
                    );

                },

                (error) => {

                    console.error(
                        "[Student Dashboard] Attendance listener error:",
                        error
                    );


                    container.innerHTML = `
                        <div class="empty-state-text">
                            Unable to load attendance right now.
                        </div>
                    `;

                }
            );

}


/* ==========================================================================
   21. ATTENDANCE RENDER
   ========================================================================== */

function renderStudentAttendance(
    records,
    container
) {

    records.sort(
        (a, b) => {

            const aTime =
                getTimestampMillis(
                    a.date ||
                    a.attendanceDate ||
                    a.createdAt
                );


            const bTime =
                getTimestampMillis(
                    b.date ||
                    b.attendanceDate ||
                    b.createdAt
                );


            return bTime - aTime;

        }
    );


    if (
        !records.length
    ) {

        container.innerHTML = `
            <div class="empty-state-text">
                No attendance records available.
            </div>
        `;

        return;
    }


    let html = "";


    records.forEach(
        (record) => {

            const status =
                String(
                    record.status ||
                    record.attendance ||
                    ""
                );


            const normalizedStatus =
                status.toLowerCase();


            const statusClass =
                normalizedStatus ===
                "present"
                    ? "present"
                    : "absent";


            html += `
                <div class="student-attendance-row">

                    <div class="attendance-date">
                        ${escapeStudentDashboardHtml(
                            formatAttendanceDate(
                                record
                            )
                        )}
                    </div>

                    <div>
                        <span class="history-status-pill ${statusClass}">
                            ${escapeStudentDashboardHtml(
                                status ||
                                "Unknown"
                            )}
                        </span>
                    </div>

                </div>
            `;

        }
    );


    container.innerHTML =
        html;

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

            } else if (
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

}


/* ==========================================================================
   24. REALTIME STUDENT PROFILE
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
   25. STUDENT LOGOUT
   ========================================================================== */

function logoutStudentDashboard() {

    if (
        typeof studentDashboardNoticeUnsubscribe ===
        "function"
    ) {

        studentDashboardNoticeUnsubscribe();

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
   26. LOGOUT BUTTON
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
   27. ERROR DISPLAY
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
   28. PREVENT UNAUTHORIZED FORM SUBMISSIONS
   ========================================================================== */

function protectStudentDashboardForms() {

    document.addEventListener(
        "submit",
        (event) => {

            /*
             * Student dashboard is intended to be read-only.
             *
             * Existing search/filter forms are allowed.
             * Any unknown form submission is stopped.
             */

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
   29. LOAD ALL DASHBOARD DATA
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


    startStudentProfileListener();

    startStudentNoticeListener();

    startStudentAttendanceListener();

    bindStudentLogout();

    protectStudentDashboardForms();


    console.log(
        "[LibManage] Student Dashboard loaded successfully."
    );

}


/* ==========================================================================
   30. START
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeStudentDashboard();

    }
);


/* ==========================================================================
   31. PUBLIC API
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
