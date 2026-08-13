/**
 * ==========================================================================
 * LIBMANAGE SAAS ECOSYSTEM ENGINE - STUDENT DASHBOARD
 * STUDENT DASHBOARD
 *
 * FIRESTORE ATTENDANCE:
 * saas_libraries/{libraryId}/attendance/{YYYY-MM-DD}/records/{studentCode}
 *
 * STUDENT SIDE:
 * READ ONLY
 * ==========================================================================
 */

let currentStudentLibraryId = '';
let currentStudentCode = '';
let currentStudentProfile = null;

let studentAttendanceMap = {};

let attendanceMonthCursor = new Date();

let dashboardInitialized = false;

let unsubscribeStudentProfileRef = null;
let unsubscribeStudentNoticesRef = null;
let unsubscribeAttendanceDatesRef = null;

let attendanceRecordUnsubscribers = [];


/**
 * ==========================================================================
 * PAGE INITIALIZATION
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {

    if (dashboardInitialized) {
        return;
    }

    dashboardInitialized = true;


    /*
     * STUDENT SESSION CHECK
     *
     * Student login saves:
     * session_role = student
     *
     * IMPORTANT:
     * Admin session is NOT accepted on this page.
     */

    if (
        localStorage.getItem('session_role') !== 'student'
    ) {

        window.location.href =
            '../index.html';

        return;
    }


    /*
     * Student login session.
     *
     * KEEPING ORIGINAL SESSION STORAGE SYSTEM.
     */

    currentStudentLibraryId =
        localStorage.getItem('session_library_id') || '';

    currentStudentCode =
        localStorage.getItem('session_student_code') ||
        localStorage.getItem('session_login_id') ||
        '';


    /*
     * No valid student session.
     */

    if (
        !currentStudentLibraryId ||
        !currentStudentCode
    ) {

        alert(
            'Session Error: Student login session is missing.'
        );

        window.location.href =
            '../index.html';

        return;
    }


    try {

        if (
            typeof loadSaaSLayoutComponent ===
            'function'
        ) {

            await safeLoadLayoutComponents();

        }

    } catch (error) {

        console.error(
            '[Student Dashboard Layout Load Error]:',
            error
        );

    }


    bindAttendanceCalendarControls();

    bindOptionalDashboardControls();

    await initializeStudentDashboard();

});


/**
 * ==========================================================================
 * SAFE LAYOUT LOAD
 * ==========================================================================
 */

async function safeLoadLayoutComponents() {

    const jobs = [];


    const sidebar =
        document.getElementById(
            'sidebar-container'
        );


    const navbar =
        document.getElementById(
            'navbar-container'
        );


    const footer =
        document.getElementById(
            'footer-container'
        );


    if (sidebar) {

        jobs.push(
            loadSaaSLayoutComponent(
                'sidebar-container',
                '../components/sidebar.html',
                () => {

                    if (
                        typeof handleSidebarActivation ===
                        'function'
                    ) {

                        handleSidebarActivation();

                    }

                }
            )
        );

    }


    if (navbar) {

        jobs.push(
            loadSaaSLayoutComponent(
                'navbar-container',
                '../components/navbar.html',
                () => {

                    if (
                        typeof bindNavbarInteractions ===
                        'function'
                    ) {

                        bindNavbarInteractions();

                    }

                }
            )
        );

    }


    if (footer) {

        jobs.push(
            loadSaaSLayoutComponent(
                'footer-container',
                '../components/footer.html'
            )
        );

    }


    await Promise.all(jobs);

}


/**
 * ==========================================================================
 * INITIALIZE STUDENT DASHBOARD
 * ==========================================================================
 */

async function initializeStudentDashboard() {

    const db =
        window.db;


    if (!db) {

        alert(
            'Database Engine Offline: Firestore is not available.'
        );

        return;

    }


    renderAttendanceCalendarSkeleton();

    renderAttendanceSummary();

    setStudentIdentityPlaceholders();


    attachStudentProfileRealtimeListener(db);

    attachLibraryNoticesRealtimeListener(db);

    attachStudentAttendanceRealtimeListener(db);

}


/**
 * ==========================================================================
 * STUDENT IDENTITY
 * ==========================================================================
 */

function setStudentIdentityPlaceholders() {

    setTextIfExists(
        'student-login-id',
        currentStudentCode
    );

    setTextIfExists(
        'student-code-display',
        currentStudentCode
    );

    setTextIfExists(
        'student-code',
        currentStudentCode
    );


    setTextIfExists(
        'student-library-id',
        currentStudentLibraryId
    );

    setTextIfExists(
        'student-library-id-display',
        currentStudentLibraryId
    );

}


/**
 * ==========================================================================
 * ATTENDANCE CALENDAR CONTROLS
 * ==========================================================================
 */

function bindAttendanceCalendarControls() {

    const prevBtn =
        document.getElementById(
            'attendance-prev-month'
        ) ||
        document.getElementById(
            'calendar-prev-btn'
        ) ||
        document.getElementById(
            'prev-month-btn'
        ) ||
        document.getElementById(
            'previous-month-btn'
        );


    const nextBtn =
        document.getElementById(
            'attendance-next-month'
        ) ||
        document.getElementById(
            'calendar-next-btn'
        ) ||
        document.getElementById(
            'next-month-btn'
        ) ||
        document.getElementById(
            'next-month-btn'
        );


    if (prevBtn) {

        prevBtn.addEventListener(
            'click',
            () => {

                attendanceMonthCursor =
                    new Date(
                        attendanceMonthCursor.getFullYear(),
                        attendanceMonthCursor.getMonth() - 1,
                        1
                    );

                renderAttendanceCalendar();

            }
        );

    }


    if (nextBtn) {

        nextBtn.addEventListener(
            'click',
            () => {

                attendanceMonthCursor =
                    new Date(
                        attendanceMonthCursor.getFullYear(),
                        attendanceMonthCursor.getMonth() + 1,
                        1
                    );

                renderAttendanceCalendar();

            }
        );

    }

}


/**
 * ==========================================================================
 * OPTIONAL DASHBOARD CONTROLS
 * ==========================================================================
 */

function bindOptionalDashboardControls() {

    const refreshBtn =
        document.getElementById(
            'attendance-refresh-btn'
        );


    if (refreshBtn) {

        refreshBtn.addEventListener(
            'click',
            () => {

                renderAttendanceSummary();

                renderAttendanceCalendar();

            }
        );

    }

}


/**
 * ==========================================================================
 * STUDENT PROFILE REALTIME
 * ==========================================================================
 */

function attachStudentProfileRealtimeListener(db) {

    if (unsubscribeStudentProfileRef) {

        unsubscribeStudentProfileRef();

        unsubscribeStudentProfileRef =
            null;

    }


    unsubscribeStudentProfileRef =
        db
            .collection('saas_libraries')
            .doc(currentStudentLibraryId)
            .collection('students')
            .doc(currentStudentCode)
            .onSnapshot(
                (doc) => {

                    if (!doc.exists) {

                        console.warn(
                            '[Student Dashboard]: Student profile not found for code:',
                            currentStudentCode
                        );

                        currentStudentProfile =
                            null;

                        renderStudentProfileFallback();

                        return;

                    }


                    currentStudentProfile = {

                        studentCode:
                            doc.id,

                        ...(doc.data() || {})

                    };


                    renderStudentProfile(
                        currentStudentProfile
                    );

                },
                (error) => {

                    console.error(
                        '[Student Dashboard Student Profile Listener Error]:',
                        error
                    );

                }
            );

}


/**
 * ==========================================================================
 * LIBRARY NOTICES REALTIME
 * ==========================================================================
 */

function attachLibraryNoticesRealtimeListener(db) {

    const noticesContainer =
        document.getElementById(
            'student-notices-list'
        ) ||
        document.getElementById(
            'student-notice-list'
        ) ||
        document.getElementById(
            'library-notices-list'
        ) ||
        document.getElementById(
            'notice-list'
        );


    if (!noticesContainer) {
        return;
    }


    if (unsubscribeStudentNoticesRef) {

        unsubscribeStudentNoticesRef();

        unsubscribeStudentNoticesRef =
            null;

    }


    unsubscribeStudentNoticesRef =
        db
            .collection('saas_libraries')
            .doc(currentStudentLibraryId)
            .collection('notices')
            .orderBy(
                'updatedAt',
                'desc'
            )
            .onSnapshot(
                (snapshot) => {

                    const notices = [];


                    snapshot.forEach(
                        (doc) => {

                            if (
                                doc.id ===
                                'anchor_node'
                            ) {

                                return;

                            }


                            notices.push({

                                id:
                                    doc.id,

                                ...(doc.data() || {})

                            });

                        }
                    );


                    renderStudentNotices(
                        notices
                    );

                },
                (error) => {

                    console.error(
                        '[Student Dashboard Notices Listener Error]:',
                        error
                    );

                }
            );

}


/**
 * ==========================================================================
 * CLEAR ATTENDANCE RECORD LISTENERS
 * ==========================================================================
 */

function clearAttendanceRecordListeners() {

    attendanceRecordUnsubscribers.forEach(
        (unsubscribe) => {

            try {

                if (
                    typeof unsubscribe ===
                    'function'
                ) {

                    unsubscribe();

                }

            } catch (error) {

                console.warn(
                    '[Attendance Record Listener Cleanup Warning]:',
                    error
                );

            }

        }
    );


    attendanceRecordUnsubscribers = [];

}

/**
 * ==========================================================================
 * STUDENT ATTENDANCE REALTIME
 *
 * DIRECT DATE CHECK SYSTEM
 *
 * FIRESTORE:
 * saas_libraries/{libraryId}/attendance/{YYYY-MM-DD}/records/{studentCode}
 *
 * IMPORTANT:
 * Attendance collection listing is NOT used because only "anchor"
 * is returned by the collection read.
 *
 * We directly check each date and read the logged-in student's record.
 * ==========================================================================
 */

function attachStudentAttendanceRealtimeListener(db) {

    /*
     * Existing attendance date listener cleanup.
     */
    if (unsubscribeAttendanceDatesRef) {

        unsubscribeAttendanceDatesRef();

        unsubscribeAttendanceDatesRef = null;

    }


    /*
     * Existing individual record listeners cleanup.
     */
    clearAttendanceRecordListeners();


    /*
     * Start with empty attendance map.
     */
    studentAttendanceMap = {};

    renderAttendanceSummary();
    renderAttendanceCalendar();


    /*
     * --------------------------------------------------------------
     * LOAD CURRENT MONTH
     * --------------------------------------------------------------
     */

    async function loadAttendanceForCurrentMonth() {

        const year =
            attendanceMonthCursor.getFullYear();

        const monthIndex =
            attendanceMonthCursor.getMonth();


        /*
         * Number of days in current month.
         */
        const daysInMonth =
            new Date(
                year,
                monthIndex + 1,
                0
            ).getDate();


        /*
         * Fresh map for current month.
         */
        const monthAttendanceMap = {};


        /*
         * Check every date directly.
         *
         * Example:
         *
         * attendance/2026-08-08/records/4DNL-E25-628
         */

        const dateChecks = [];


        for (
            let day = 1;
            day <= daysInMonth;
            day++
        ) {

            const dateId =
                formatDateIdFromParts(
                    year,
                    monthIndex,
                    day
                );


            dateChecks.push(

                (async () => {

                    try {

                        const recordDoc =
                            await db
                                .collection(
                                    'saas_libraries'
                                )
                                .doc(
                                    currentStudentLibraryId
                                )
                                .collection(
                                    'attendance'
                                )
                                .doc(
                                    dateId
                                )
                                .collection(
                                    'records'
                                )
                                .doc(
                                    currentStudentCode
                                )
                                .get();


                        /*
                         * No record for this date.
                         */
                        if (!recordDoc.exists) {
                            return;
                        }


                        const data =
                            recordDoc.data() ||
                            {};


                        /*
                         * Safety check:
                         * Make sure record belongs to
                         * currently logged-in student.
                         */

                        const recordStudentCode =
                            String(
                                data.studentCode ||
                                currentStudentCode
                            );


                        if (
                            recordStudentCode !==
                            String(
                                currentStudentCode
                            )
                        ) {

                            return;

                        }


                        const normalizedStatus =
                            normalizeAttendanceStatus(
                                data.status || ''
                            );


                        /*
                         * Only Present / Absent records
                         * are stored in dashboard map.
                         */

                        if (!normalizedStatus) {
                            return;
                        }


                        monthAttendanceMap[
                            dateId
                        ] = {

                            dateId:
                                dateId,

                            studentCode:
                                recordStudentCode,

                            name:
                                data.name ||
                                '',

                            seatNumber:
                                data.seatNumber ||
                                '',

                            shift:
                                data.shift ||
                                '',

                            status:
                                normalizedStatus,

                            date:
                                data.date ||
                                dateId

                        };


                    } catch (error) {

                        console.error(
                            `[Student Attendance Direct Read Error - ${dateId}]:`,
                            error
                        );

                    }

                })()

            );

        }


        /*
         * Wait until all dates have been checked.
         */

        await Promise.all(
            dateChecks
        );


        /*
         * Put loaded attendance into global map.
         */

        studentAttendanceMap =
            monthAttendanceMap;


        console.log(
            '[Student Dashboard] Attendance Loaded:',
            studentAttendanceMap
        );


        /*
         * Update dashboard.
         */

        renderAttendanceSummary();

        renderAttendanceCalendar();

    }


    /*
     * --------------------------------------------------------------
     * INITIAL MONTH LOAD
     * --------------------------------------------------------------
     */

    loadAttendanceForCurrentMonth();


    /*
     * --------------------------------------------------------------
     * MONTH CHANGE SUPPORT
     *
     * We watch the calendar cursor.
     *
     * Existing calendar buttons change attendanceMonthCursor,
     * then this listener detects the new month when the calendar
     * is rendered.
     * --------------------------------------------------------------
     */

    let lastLoadedMonth =
        `${attendanceMonthCursor.getFullYear()}-${attendanceMonthCursor.getMonth()}`;


    const originalRenderAttendanceCalendar =
        window.renderAttendanceCalendar;


    /*
     * We don't replace the existing renderer.
     * Instead, observe month navigation periodically.
     */

    const monthWatcher =
        setInterval(
            () => {

                const currentMonth =
                    `${attendanceMonthCursor.getFullYear()}-${attendanceMonthCursor.getMonth()}`;


                if (
                    currentMonth ===
                    lastLoadedMonth
                ) {

                    return;

                }


                lastLoadedMonth =
                    currentMonth;


                loadAttendanceForCurrentMonth();

            },
            300
        );


    /*
     * Store cleanup function.
     */

    unsubscribeAttendanceDatesRef =
        () => {

            clearInterval(
                monthWatcher
            );

        };

}
/**
 * ==========================================================================
 * NORMALIZE ATTENDANCE STATUS
 * ==========================================================================
 */

function normalizeAttendanceStatus(status) {

    const normalized =
        String(
            status || ''
        )
            .trim()
            .toLowerCase();


    if (
        normalized ===
        'present'
    ) {

        return 'Present';

    }


    if (
        normalized ===
        'absent'
    ) {

        return 'Absent';

    }


    return '';

}


/**
 * ==========================================================================
 * VALIDATE FIRESTORE DATE DOCUMENT ID
 *
 * FIXED:
 * YYYY-MM-DD
 * ==========================================================================
 */

function isValidDateDocumentId(value) {

    return /^\d{4}-\d{2}-\d{2}$/.test(
        String(
            value || ''
        ).trim()
    );

}


/**
 * ==========================================================================
 * PARSE DATE DOCUMENT ID
 * ==========================================================================
 */

function parseDateIdToLocalDate(dateId) {

    if (
        !isValidDateDocumentId(
            dateId
        )
    ) {

        return null;

    }


    const [
        year,
        month,
        day
    ] =
        dateId
            .split('-')
            .map(Number);


    return new Date(
        year,
        month - 1,
        day
    );

}


/**
 * ==========================================================================
 * FORMAT FIRESTORE DATE DOCUMENT ID
 * ==========================================================================
 */

function formatDateIdFromParts(
    year,
    monthIndex,
    day
) {

    const yearPart =
        String(year);


    const monthPart =
        String(
            monthIndex + 1
        ).padStart(
            2,
            '0'
        );


    const dayPart =
        String(day).padStart(
            2,
            '0'
        );


    return (
        `${yearPart}-` +
        `${monthPart}-` +
        `${dayPart}`
    );

}


/**
 * ==========================================================================
 * RENDER STUDENT PROFILE
 * ==========================================================================
 */

function renderStudentProfile(profile) {

    setTextIfExists(
        'student-login-id',
        profile.studentCode ||
        currentStudentCode
    );


    setTextIfExists(
        'student-code-display',
        profile.studentCode ||
        currentStudentCode
    );


    setTextIfExists(
        'student-library-id',
        currentStudentLibraryId
    );


    setTextIfExists(
        'student-library-id-display',
        currentStudentLibraryId
    );


    setTextIfExists(
        'student-name',
        profile.name || ''
    );


    setTextIfExists(
        'student-shift',
        profile.shift || ''
    );


    setTextIfExists(
        'student-seat-number',
        profile.seatNumber || ''
    );


    setTextIfExists(
        'student-seat',
        profile.seatNumber || ''
    );


    setTextIfExists(
        'student-class',
        profile.studentClass || ''
    );


    setTextIfExists(
        'student-status',
        profile.status || ''
    );


    setTextIfExists(
        'student-father-name',
        profile.fatherName || ''
    );


    setTextIfExists(
        'student-father',
        profile.fatherName || ''
    );


    setTextIfExists(
        'student-code',
        profile.studentCode ||
        currentStudentCode
    );


    setTextIfExists(
        'student-mobile',
        profile.mobile || ''
    );


    setTextIfExists(
        'student-joining',
        formatStudentDate(
            profile.joiningDate
        )
    );


    setTextIfExists(
        'student-expiry',
        formatStudentDate(
            profile.expiryDate
        )
    );


    const profileNameInput =
        document.getElementById(
            'profile-student-name'
        );


    if (profileNameInput) {

        profileNameInput.value =
            profile.name || '';

    }

}


/**
 * ==========================================================================
 * PROFILE FALLBACK
 * ==========================================================================
 */

function renderStudentProfileFallback() {

    setTextIfExists(
        'student-login-id',
        currentStudentCode
    );


    setTextIfExists(
        'student-code-display',
        currentStudentCode
    );


    setTextIfExists(
        'student-library-id',
        currentStudentLibraryId
    );


    setTextIfExists(
        'student-library-id-display',
        currentStudentLibraryId
    );

}


/**
 * ==========================================================================
 * RENDER NOTICES
 * ==========================================================================
 */

function renderStudentNotices(notices) {

    const noticesContainer =
        document.getElementById(
            'student-notices-list'
        ) ||
        document.getElementById(
            'student-notice-list'
        ) ||
        document.getElementById(
            'library-notices-list'
        ) ||
        document.getElementById(
            'notice-list'
        );


    if (!noticesContainer) {
        return;
    }


    if (
        !Array.isArray(notices) ||
        notices.length === 0
    ) {

        noticesContainer.innerHTML =
            '<div class="notice-empty-state">No notices available.</div>';

        return;

    }


    noticesContainer.innerHTML =
        notices.map(
            (notice) => {

                const title =
                    escapeHtml(
                        notice.title ||
                        'Notice'
                    );


                const message =
                    escapeHtml(
                        notice.message ||
                        notice.description ||
                        ''
                    );


                const dateText =
                    escapeHtml(
                        notice.date ||
                        extractDisplayDateFromTimestamp(
                            notice.updatedAt
                        ) ||
                        ''
                    );


                return `
                    <div class="notice-item">

                        <div class="notice-item-header">

                            <strong>
                                ${title}
                            </strong>

                            <span>
                                ${dateText}
                            </span>

                        </div>

                        <div class="notice-item-body">
                            ${message}
                        </div>

                    </div>
                `;

            }
        ).join('');

}


/**
 * ==========================================================================
 * ATTENDANCE SUMMARY
 * ==========================================================================
 */

function renderAttendanceSummary() {

    const attendanceEntries =
        Object.values(
            studentAttendanceMap
        );


    let totalPresent = 0;

    let totalAbsent = 0;


    attendanceEntries.forEach(
        (entry) => {

            if (!entry) {
                return;
            }


            if (
                String(
                    entry.studentCode
                ) !==
                String(
                    currentStudentCode
                )
            ) {

                return;

            }


            if (
                entry.status ===
                'Present'
            ) {

                totalPresent += 1;

            }


            if (
                entry.status ===
                'Absent'
            ) {

                totalAbsent += 1;

            }

        }
    );


    setTextIfExists(
        'total-present',
        String(totalPresent)
    );


    setTextIfExists(
        'totalPresent',
        String(totalPresent)
    );


    setTextIfExists(
        'attendance-total-present',
        String(totalPresent)
    );


    setTextIfExists(
        'total-absent',
        String(totalAbsent)
    );


    setTextIfExists(
        'totalAbsent',
        String(totalAbsent)
    );


    setTextIfExists(
        'attendance-total-absent',
        String(totalAbsent)
    );

}


/**
 * ==========================================================================
 * CALENDAR SKELETON
 * ==========================================================================
 */

function renderAttendanceCalendarSkeleton() {

    const grid =
        document.getElementById(
            'attendance-calendar-grid'
        ) ||
        document.getElementById(
            'attendance-calendar'
        ) ||
        document.getElementById(
            'calendar-grid'
        );


    if (!grid) {
        return;
    }


    renderAttendanceCalendar();

}


/**
 * ==========================================================================
 * RENDER ATTENDANCE CALENDAR
 * ==========================================================================
 */

function renderAttendanceCalendar() {

    const monthLabelNode =
        document.getElementById(
            'attendance-month-label'
        ) ||
        document.getElementById(
            'calendar-month-label'
        ) ||
        document.getElementById(
            'attendance-current-month'
        ) ||
        document.getElementById(
            'calendar-month-title'
        );


    const grid =
        document.getElementById(
            'attendance-calendar-grid'
        ) ||
        document.getElementById(
            'attendance-calendar'
        ) ||
        document.getElementById(
            'calendar-grid'
        );


    if (!grid) {
        return;
    }


    const year =
        attendanceMonthCursor.getFullYear();


    const monthIndex =
        attendanceMonthCursor.getMonth();


    if (monthLabelNode) {

        monthLabelNode.textContent =
            attendanceMonthCursor.toLocaleString(
                'en-US',
                {
                    month: 'long',
                    year: 'numeric'
                }
            );

    }


    const firstDay =
        new Date(
            year,
            monthIndex,
            1
        );


    const startingWeekDay =
        firstDay.getDay();


    const daysInMonth =
        new Date(
            year,
            monthIndex + 1,
            0
        ).getDate();


    let html = '';


    const weekLabels = [
        'Sun',
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat'
    ];


    html +=
        weekLabels
            .map(
                (label) =>
                    `<div class="attendance-weekday">${label}</div>`
            )
            .join('');


    for (
        let i = 0;
        i < startingWeekDay;
        i++
    ) {

        html +=
            '<div class="attendance-day empty"></div>';

    }


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const dateId =
            formatDateIdFromParts(
                year,
                monthIndex,
                day
            );


        const attendance =
            studentAttendanceMap[
                dateId
            ];


        const status =
            attendance &&
            String(
                attendance.studentCode
            ) ===
            String(
                currentStudentCode
            )
                ? normalizeAttendanceStatus(
                    attendance.status
                )
                : '';


        let statusClass = '';

        let statusLabel = '';


        if (
            status ===
            'Present'
        ) {

            statusClass =
                'present';

            statusLabel =
                'Present';

        } else if (
            status ===
            'Absent'
        ) {

            statusClass =
                'absent';

            statusLabel =
                'Absent';

        }


        html += `
            <div class="attendance-day ${statusClass}">

                <div class="attendance-date-number">
                    ${day}
                </div>

                <div class="attendance-status-text">
                    ${statusLabel}
                </div>

            </div>
        `;

    }


    grid.innerHTML =
        html;

}


/**
 * ==========================================================================
 * TIMESTAMP DISPLAY
 * ==========================================================================
 */

function extractDisplayDateFromTimestamp(
    timestamp
) {

    try {

        if (!timestamp) {
            return '';
        }


        if (
            typeof timestamp.toDate ===
            'function'
        ) {

            const date =
                timestamp.toDate();


            return date.toLocaleDateString(
                'en-GB'
            );

        }


        return '';

    } catch (error) {

        return '';

    }

}


/**
 * ==========================================================================
 * STUDENT DATE FORMAT
 * ==========================================================================
 */

function formatStudentDate(value) {

    if (!value) {
        return '';
    }


    const dateString =
        String(value).trim();


    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            dateString
        )
    ) {

        const parts =
            dateString.split('-');


        return (
            `${parts[2]}/` +
            `${parts[1]}/` +
            `${parts[0]}`
        );

    }


    return dateString;

}


/**
 * ==========================================================================
 * SAFE TEXT
 * ==========================================================================
 */

function setTextIfExists(
    id,
    value
) {

    const node =
        document.getElementById(id);


    if (node) {

        node.textContent =
            value == null
                ? ''
                : String(value);

    }

}


/**
 * ==========================================================================
 * HTML ESCAPE
 * ==========================================================================
 */

function escapeHtml(value) {

    return String(
        value == null
            ? ''
            : value
    )
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#39;'
        );

}


/**
 * ==========================================================================
 * CLEANUP
 * ==========================================================================
 */

window.addEventListener(
    'beforeunload',
    () => {

        try {

            if (
                typeof unsubscribeStudentProfileRef ===
                'function'
            ) {

                unsubscribeStudentProfileRef();

            }


            if (
                typeof unsubscribeStudentNoticesRef ===
                'function'
            ) {

                unsubscribeStudentNoticesRef();

            }


            if (
                typeof unsubscribeAttendanceDatesRef ===
                'function'
            ) {

                unsubscribeAttendanceDatesRef();

            }


            clearAttendanceRecordListeners();

        } catch (error) {

            console.warn(
                '[Student Dashboard Cleanup Warning]:',
                error
            );

        }

    }
);
