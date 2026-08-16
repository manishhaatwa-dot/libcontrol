/**
 * ==========================================================================
 * LIBCONTROL - ATTENDANCE MANAGEMENT MODULE
 * ==========================================================================
 *
 * Responsibilities:
 * - Load current library students
 * - Load attendance for selected date
 * - Filter students by shift
 * - Search students
 * - Mark Present / Absent
 * - Save attendance
 * - Prevent cross-library data access
 * - Student-wise attendance history
 *
 * ==========================================================================
 */

"use strict";


/* ==========================================================================
   1. MODULE STATE
   ========================================================================== */

let attendanceStudents = [];

let attendanceRecords = {};

let attendanceSelectedDate = "";

let attendanceSaving = false;


/* ==========================================================================
   2. DOM HELPER
   ========================================================================== */

function attendanceEl(id) {

    return document.getElementById(id);

}


/* ==========================================================================
   3. CURRENT SESSION
   ========================================================================== */

function getAttendanceLibraryContext() {

    if (
        typeof getCurrentSession !==
        "function"
    ) {

        return null;

    }


    const session =
        getCurrentSession();


    if (!session) {

        return null;

    }


    if (
        session.role !== "admin" ||
        !session.libraryId
    ) {

        return null;

    }


    return session;

}


/* ==========================================================================
   4. DATE HELPERS
   ========================================================================== */

function getTodayAttendanceDate() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );

}


function convertIndianDateToISO(
    value
) {

    if (!value) {

        return "";

    }


    const parts =
        String(
            value
        ).split(
            "/"
        );


    if (
        parts.length !== 3
    ) {

        return "";

    }


    return (
        parts[2] +
        "-" +
        parts[1].padStart(
            2,
            "0"
        ) +
        "-" +
        parts[0].padStart(
            2,
            "0"
        )
    );

}


function formatAttendanceDate(
    isoDate
) {

    if (!isoDate) {

        return "";

    }


    const parts =
        String(
            isoDate
        ).split(
            "-"
        );


    if (
        parts.length !== 3
    ) {

        return isoDate;

    }


    return (
        parts[2] +
        "/" +
        parts[1] +
        "/" +
        parts[0]
    );

}


/* ==========================================================================
   5. DATE INPUT
   ========================================================================== */

function getAttendanceDateInput() {

    return (
        attendanceEl(
            "attendance-date"
        ) ||
        attendanceEl(
            "attendance-date-input"
        ) ||
        attendanceEl(
            "selected-attendance-date"
        ) ||
        attendanceEl(
            "date-input"
        )
    );

}


function setDefaultAttendanceDate() {

    const input =
        getAttendanceDateInput();


    if (!input) {

        return;

    }


    if (!input.value) {

        input.value =
            getTodayAttendanceDate();

    }


    attendanceSelectedDate =
        normalizeAttendanceDate(
            input.value
        );

}


function normalizeAttendanceDate(
    value
) {

    if (!value) {

        return getTodayAttendanceDate();

    }


    const stringValue =
        String(
            value
        ).trim();


    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            stringValue
        )
    ) {

        return stringValue;

    }


    if (
        /^\d{2}\/\d{2}\/\d{4}$/.test(
            stringValue
        )
    ) {

        return convertIndianDateToISO(
            stringValue
        );

    }


    return getTodayAttendanceDate();

}


/* ==========================================================================
   6. HTML SAFETY
   ========================================================================== */

function escapeAttendanceHtml(
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
   7. FIRESTORE COLLECTIONS
   ========================================================================== */

function getAttendanceCollection() {

    const session =
        getAttendanceLibraryContext();


    if (
        !session ||
        !window.LibManageDB
    ) {

        return null;

    }


    if (
        typeof window.LibManageDB.attendance ===
        "function"
    ) {

        return window.LibManageDB.attendance(
            session.libraryId
        );

    }


    if (
        typeof window.LibManageDB.library ===
        "function"
    ) {

        return window.LibManageDB
            .library(
                session.libraryId
            )
            .collection(
                "attendance"
            );

    }


    return null;

}


function getAttendanceStudentsCollection() {

    const session =
        getAttendanceLibraryContext();


    if (
        !session ||
        !window.LibManageDB
    ) {

        return null;

    }


    if (
        typeof window.LibManageDB.students ===
        "function"
    ) {

        return window.LibManageDB.students(
            session.libraryId
        );

    }


    return null;

}


/* ==========================================================================
   8. SEARCH
   ========================================================================== */

function getAttendanceSearchValue() {

    const input =
        attendanceEl(
            "attendance-search-input"
        );


    return String(
        input?.value ||
        ""
    )
        .trim()
        .toLowerCase();

}


/* ==========================================================================
   9. SHIFT FILTER
   ========================================================================== */

function getAttendanceShiftValue() {

    const input =
        attendanceEl(
            "attendance-shift"
        );


    return String(
        input?.value ||
        ""
    )
        .trim()
        .toLowerCase();

}


function normalizeStudentShift(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase();

}


/* ==========================================================================
   10. LOAD STUDENTS
   ========================================================================== */

async function loadAttendanceStudents() {

    const tableBody =
        attendanceEl(
            "attendance-table-body"
        );


    if (!tableBody) {

        return;

    }


    const session =
        getAttendanceLibraryContext();


    if (!session) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="attendance-empty-state"
                >
                    Session expired. Please login again.
                </td>

            </tr>

        `;

        return;

    }


    const studentsRef =
        getAttendanceStudentsCollection();


    if (!studentsRef) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="attendance-empty-state"
                >
                    Student database is unavailable.
                </td>

            </tr>

        `;

        return;

    }


    try {

        const snapshot =
            await studentsRef.get();


        attendanceStudents =
            snapshot.docs.map(
                (doc) => ({

                    firestoreId:
                        doc.id,

                    ...doc.data()

                })
            );


        /*
         * Sort alphabetically by student name.
         */

        attendanceStudents.sort(
            (a, b) => {

                const aName =
                    String(
                        a.studentName ||
                        a.name ||
                        ""
                    ).toLowerCase();


                const bName =
                    String(
                        b.studentName ||
                        b.name ||
                        ""
                    ).toLowerCase();


                return aName.localeCompare(
                    bName
                );

            }
        );


        await loadAttendanceForSelectedDate();


    }
    catch (error) {

        console.error(
            "[Attendance] Student loading error:",
            error
        );


        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="attendance-empty-state"
                >
                    Unable to load students.
                </td>

            </tr>

        `;

    }

}


/* ==========================================================================
   11. LOAD ATTENDANCE FOR SELECTED DATE
   ========================================================================== */

async function loadAttendanceForSelectedDate() {

    const dateInput =
        getAttendanceDateInput();


    attendanceSelectedDate =
        normalizeAttendanceDate(
            dateInput
                ? dateInput.value
                : attendanceSelectedDate
        );


    const attendanceRef =
        getAttendanceCollection();


    if (!attendanceRef) {

        return;

    }


    attendanceRecords =
        {};


    try {

        const snapshot =
            await attendanceRef
                .where(
                    "date",
                    "==",
                    attendanceSelectedDate
                )
                .get();


        snapshot.forEach(
            (doc) => {

                const data =
                    doc.data();


                if (
                    data.studentCode
                ) {

                    attendanceRecords[
                        String(
                            data.studentCode
                        ).toUpperCase()
                    ] = {

                        firestoreId:
                            doc.id,

                        ...data

                    };

                }

            }
        );


        renderAttendanceTable();

        updateAttendanceSummary();


    }
    catch (error) {

        console.error(
            "[Attendance] Attendance loading error:",
            error
        );


        renderAttendanceTable();

    }

}


/* ==========================================================================
   12. RENDER ATTENDANCE TABLE
   ========================================================================== */

function renderAttendanceTable() {

    const tableBody =
        attendanceEl(
            "attendance-table-body"
        );


    if (!tableBody) {

        return;

    }


    const searchValue =
        getAttendanceSearchValue();


    const selectedShift =
        getAttendanceShiftValue();


    const filteredStudents =
        attendanceStudents.filter(
            (student) => {

                /*
                 * ----------------------------------------------------------
                 * SHIFT FILTER
                 * ----------------------------------------------------------
                 */

                const studentShift =
                    normalizeStudentShift(
                        student.shift
                    );


                if (
                    selectedShift &&
                    studentShift !==
                    selectedShift
                ) {

                    return false;

                }


                /*
                 * ----------------------------------------------------------
                 * SEARCH FILTER
                 * ----------------------------------------------------------
                 */

                if (!searchValue) {

                    return true;

                }


                const searchable =
                    [

                        student.studentCode,

                        student.studentName,

                        student.name,

                        student.fatherName,

                        student.seatNumber,

                        student.seat,

                        student.className,

                        student.class,

                        student.shift

                    ]
                        .join(" ")
                        .toLowerCase();


                return searchable.includes(
                    searchValue
                );

            }
        );


    if (
        !filteredStudents.length
    ) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="attendance-empty-state"
                >
                    ${
                        searchValue
                            ? "No matching students found."
                            : "No students found for this shift."
                    }
                </td>

            </tr>

        `;

        return;

    }


    let html =
        "";


    filteredStudents.forEach(
        (student) => {

            const code =
                String(
                    student.studentCode ||
                    student.firestoreId ||
                    ""
                )
                    .trim()
                    .toUpperCase();


            const existing =
                attendanceRecords[
                    code
                ];


            const status =
                existing?.status ||
                "";


            const presentChecked =
                status === "Present"
                    ? "checked"
                    : "";


            const absentChecked =
                status === "Absent"
                    ? "checked"
                    : "";


            const studentName =
                student.studentName ||
                student.name ||
                "-";


            const seatNumber =
                student.seatNumber ||
                student.seat ||
                "-";


            html += `

                <tr>

                    <td>

                        ${escapeAttendanceHtml(
                            code ||
                            "-"
                        )}

                    </td>


                    <td>

                        ${escapeAttendanceHtml(
                            seatNumber
                        )}

                    </td>


                    <td>

                        <button
                            type="button"
                            class="student-row-link"
                            data-attendance-student="${escapeAttendanceHtml(
                                code
                            )}"
                        >
                            ${escapeAttendanceHtml(
                                studentName
                            )}
                        </button>

                    </td>


                    <td>

                        <label
                            class="attendance-option present-option"
                        >

                            <input
                                type="radio"
                                name="attendance-${escapeAttendanceHtml(
                                    code
                                )}"
                                value="Present"
                                data-attendance-code="${escapeAttendanceHtml(
                                    code
                                )}"
                                ${presentChecked}
                            >

                            <span>
                                Present
                            </span>

                        </label>

                    </td>


                    <td>

                        <label
                            class="attendance-option absent-option"
                        >

                            <input
                                type="radio"
                                name="attendance-${escapeAttendanceHtml(
                                    code
                                )}"
                                value="Absent"
                                data-attendance-code="${escapeAttendanceHtml(
                                    code
                                )}"
                                ${absentChecked}
                            >

                            <span>
                                Absent
                            </span>

                        </label>

                    </td>

                </tr>

            `;

        }
    );


    tableBody.innerHTML =
        html;

}


/* ==========================================================================
   13. ATTENDANCE SUMMARY
   ========================================================================== */

function updateAttendanceSummary() {

    const present =
        Object.values(
            attendanceRecords
        )
            .filter(
                (record) =>
                    record.status ===
                    "Present"
            )
            .length;


    const absent =
        Object.values(
            attendanceRecords
        )
            .filter(
                (record) =>
                    record.status ===
                    "Absent"
            )
            .length;


    const presentElement =
        attendanceEl(
            "today-present-count"
        ) ||
        attendanceEl(
            "present-count"
        ) ||
        attendanceEl(
            "total-present"
        );


    const absentElement =
        attendanceEl(
            "today-absent-count"
        ) ||
        attendanceEl(
            "absent-count"
        ) ||
        attendanceEl(
            "total-absent"
        );


    if (presentElement) {

        presentElement.textContent =
            present;

    }


    if (absentElement) {

        absentElement.textContent =
            absent;

    }

}


/* ==========================================================================
   14. COLLECT CURRENT ATTENDANCE
   ========================================================================== */

function collectAttendanceData() {

    const records =
        [];


    /*
     * Collect only students currently displayed
     * in the selected shift/search result.
     */

    const searchValue =
        getAttendanceSearchValue();


    const selectedShift =
        getAttendanceShiftValue();


    const visibleStudents =
        attendanceStudents.filter(
            (student) => {

                const studentShift =
                    normalizeStudentShift(
                        student.shift
                    );


                if (
                    selectedShift &&
                    studentShift !==
                    selectedShift
                ) {

                    return false;

                }


                if (!searchValue) {

                    return true;

                }


                const searchable =
                    [

                        student.studentCode,

                        student.studentName,

                        student.name,

                        student.fatherName,

                        student.seatNumber,

                        student.seat,

                        student.className,

                        student.class,

                        student.shift

                    ]
                        .join(" ")
                        .toLowerCase();


                return searchable.includes(
                    searchValue
                );

            }
        );


    visibleStudents.forEach(
        (student) => {

            const code =
                String(
                    student.studentCode ||
                    student.firestoreId ||
                    ""
                )
                    .trim()
                    .toUpperCase();


            if (!code) {

                return;

            }


            const selected =
                document.querySelector(
                    `input[data-attendance-code="${CSS.escape(code)}"]:checked`
                );


            if (!selected) {

                return;

            }


           records.push({

    studentCode:
        code,

    studentName:
        student.studentName ||
        student.name ||
        "",

    seatNumber:
        student.seatNumber ||
        student.seat ||
        "",

    shift:
        student.shift ||
        "",

    status:
        selected.value,

    date:
        attendanceSelectedDate

});

        }
    );


    return records;

}


/* ==========================================================================
   15. SAVE ATTENDANCE
   ========================================================================== */

async function saveAttendance() {

    if (attendanceSaving) {

        return;

    }


    const session =
        getAttendanceLibraryContext();


    if (!session) {

        alert(
            "Session expired. Please login again."
        );

        return;

    }


    const attendanceRef =
        getAttendanceCollection();


    if (!attendanceRef) {

        alert(
            "Attendance database is unavailable."
        );

        return;

    }


    const records =
        collectAttendanceData();


    if (!records.length) {

        alert(
            "Please mark at least one student as Present or Absent."
        );

        return;

    }


    const saveButton =
        attendanceEl(
            "save-attendance-btn"
        );


    attendanceSaving =
        true;


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";

    }


    try {

        const batch =
            firebase
                .firestore()
                .batch();


        records.forEach(
            (record) => {

                const documentId =
                    `${attendanceSelectedDate}_${record.studentCode}`;


                const documentRef =
                    attendanceRef.doc(
                        documentId
                    );


             batch.set(
    documentRef,
    {

        studentCode:
            record.studentCode,

        studentName:
            record.studentName,

        seatNumber:
            record.seatNumber,

        shift:
            record.shift,

        date:
            record.date,

        status:
            record.status,

        libraryId:
            session.libraryId,

        updatedAt:
            firebase.firestore
                .FieldValue
                .serverTimestamp()

    },
    {
        merge: true
    }
);   
            }
        );


        await batch.commit();


        alert(
            "Attendance saved successfully."
        );


        await loadAttendanceForSelectedDate();


    }
    catch (error) {

        console.error(
            "[Attendance] Save error:",
            error
        );


        alert(
            "Unable to save attendance. Please try again."
        );

    }
    finally {

        attendanceSaving =
            false;


        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save Attendance";

        }

    }

}


/* ==========================================================================
   16. SEARCH EVENT
   ========================================================================== */

function bindAttendanceSearch() {

    const input =
        attendanceEl(
            "attendance-search-input"
        );


    if (!input) {

        return;

    }


    input.addEventListener(
        "input",
        () => {

            renderAttendanceTable();

        }
    );

}


/* ==========================================================================
   17. SHIFT EVENT
   ========================================================================== */

function bindAttendanceShift() {

    const input =
        attendanceEl(
            "attendance-shift"
        );


    if (!input) {

        return;

    }


    input.addEventListener(
        "change",
        () => {

            renderAttendanceTable();

        }
    );

}


/* ==========================================================================
   18. DATE EVENT
   ========================================================================== */

function bindAttendanceDate() {

    const input =
        getAttendanceDateInput();


    if (!input) {

        return;

    }


    input.addEventListener(
        "change",
        async () => {

            attendanceSelectedDate =
                normalizeAttendanceDate(
                    input.value
                );


            await loadAttendanceForSelectedDate();

        }
    );

}


/* ==========================================================================
   19. SAVE BUTTON
   ========================================================================== */

function bindAttendanceSave() {

    const button =
        attendanceEl(
            "save-attendance-btn"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        saveAttendance
    );

}


/* ==========================================================================
   20. STUDENT HISTORY
   ========================================================================== */

function bindAttendanceStudentActions() {

    const tableBody =
        attendanceEl(
            "attendance-table-body"
        );


    if (!tableBody) {

        return;

    }


    tableBody.addEventListener(
        "click",
        (event) => {

            const studentButton =
                event.target.closest(
                    "[data-attendance-student]"
                );


            if (!studentButton) {

                return;

            }


            const code =
                studentButton.getAttribute(
                    "data-attendance-student"
                );


            openStudentAttendanceHistory(
                code
            );

        }
    );

}


async function openStudentAttendanceHistory(
    studentCode
) {

    const session =
        getAttendanceLibraryContext();


    if (!session) {

        return;

    }


    const student =
        attendanceStudents.find(
            (item) =>
                String(
                    item.studentCode ||
                    item.firestoreId ||
                    ""
                )
                    .toUpperCase() ===
                String(
                    studentCode
                )
                    .toUpperCase()
        );


    if (!student) {

        return;

    }


    const attendanceRef =
        getAttendanceCollection();


    if (!attendanceRef) {

        return;

    }


    try {

        const snapshot =
            await attendanceRef
                .where(
                    "studentCode",
                    "==",
                    String(
                        studentCode
                    )
                        .toUpperCase()
                )
                .get();


        const records =
            snapshot.docs.map(
                (doc) => ({

                    id:
                        doc.id,

                    ...doc.data()

                })
            );


        records.sort(
            (a, b) =>
                String(
                    b.date || ""
                )
                    .localeCompare(
                        String(
                            a.date || ""
                        )
                    )
        );


        const present =
            records.filter(
                (record) =>
                    record.status ===
                    "Present"
            )
                .length;


        const absent =
            records.filter(
                (record) =>
                    record.status ===
                    "Absent"
            )
                .length;


        const modal =
            attendanceEl(
                "attendance-history-modal"
            );


        if (!modal) {

            alert(
                `Present: ${present}\nAbsent: ${absent}`
            );

            return;

        }


        const summary =
            attendanceEl(
                "attendance-history-summary"
            );


        const tableBody =
            attendanceEl(
                "attendance-history-body"
            );


        if (summary) {

            summary.innerHTML = `

                <div class="attendance-stat-card">

                    <span>
                        Student
                    </span>

                    <strong>
                        ${escapeAttendanceHtml(
                            student.studentName ||
                            student.name ||
                            "-"
                        )}
                    </strong>

                </div>


                <div class="attendance-stat-card">

                    <span>
                        Present
                    </span>

                    <strong>
                        ${present}
                    </strong>

                </div>


                <div class="attendance-stat-card">

                    <span>
                        Absent
                    </span>

                    <strong>
                        ${absent}
                    </strong>

                </div>

            `;

        }


        if (tableBody) {

            if (!records.length) {

                tableBody.innerHTML = `

                    <tr>

                        <td
                            colspan="3"
                            class="attendance-empty-state"
                        >
                            No attendance history available.
                        </td>

                    </tr>

                `;

            }
            else {

                tableBody.innerHTML =
                    records.map(
                        (record) => {

                            const statusClass =
                                record.status ===
                                "Present"
                                    ? "present"
                                    : "absent";


                            return `

                                <tr>

                                    <td>
                                        ${escapeAttendanceHtml(
                                            formatAttendanceDate(
                                                record.date
                                            )
                                        )}
                                    </td>


                                    <td>
                                        ${escapeAttendanceHtml(
                                            record.shift ||
                                            "-"
                                        )}
                                    </td>


                                    <td>

                                        <span
                                            class="
                                                history-status-pill
                                                ${statusClass}
                                            "
                                        >
                                            ${escapeAttendanceHtml(
                                                record.status ||
                                                "-"
                                            )}
                                        </span>

                                    </td>

                                </tr>

                            `;

                        }
                    )
                        .join("");

            }

        }


        modal.classList.add(
            "active"
        );


        modal.setAttribute(
            "aria-hidden",
            "false"
        );


    }
    catch (error) {

        console.error(
            "[Attendance] Student history error:",
            error
        );


        alert(
            "Unable to load attendance history."
        );

    }

}


/* ==========================================================================
   21. HISTORY MODAL CLOSE
   ========================================================================== */

function bindHistoryModal() {

    const modal =
        attendanceEl(
            "attendance-history-modal"
        );


    if (!modal) {

        return;

    }


    const closeButton =
        attendanceEl(
            "close-attendance-history-modal"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {

                modal.classList.remove(
                    "active"
                );

                modal.setAttribute(
                    "aria-hidden",
                    "true"
                );

            }
        );

    }


    modal.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                modal
            ) {

                modal.classList.remove(
                    "active"
                );

                modal.setAttribute(
                    "aria-hidden",
                    "true"
                );

            }

        }
    );

}


/* ==========================================================================
   22. INITIALIZE
   ========================================================================== */

async function initializeAttendanceModule() {

    const tableBody =
        attendanceEl(
            "attendance-table-body"
        );


    if (!tableBody) {

        return;

    }


    /*
     * IMPORTANT:
     *
     * requireAdminSession() is asynchronous.
     * Wait for Firebase Auth before continuing.
     */

    if (
        typeof requireAdminSession ===
        "function"
    ) {

        const authenticated =
            await requireAdminSession();


        if (!authenticated) {

            return;

        }

    }


    setDefaultAttendanceDate();

    bindAttendanceSearch();

    bindAttendanceShift();

    bindAttendanceDate();

    bindAttendanceSave();

    bindAttendanceStudentActions();

    bindHistoryModal();


    await loadAttendanceStudents();

}


/* ==========================================================================
   23. START
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeAttendanceModule();

    }
);


/* ==========================================================================
   24. PUBLIC API
   ========================================================================== */

window.LibManageAttendance = {

    reload:
        loadAttendanceStudents,

    reloadDate:
        loadAttendanceForSelectedDate,

    save:
        saveAttendance,

    render:
        renderAttendanceTable

};


console.log(
    "[LibControl] Attendance module loaded successfully."
);
