/**
 * ==========================================================================
 * LIBMANAGE - ATTENDANCE MANAGEMENT MODULE
 * ==========================================================================
 *
 * Responsibilities:
 * - Load current library students
 * - Load attendance for selected date
 * - Search students
 * - Mark Present / Absent
 * - Save attendance
 * - Prevent cross-library data access
 * - Attendance history
 * - Student-wise attendance history
 *
 * FIRESTORE STRUCTURE
 *
 * libmanage_secure_v2
 *   └── libraries
 *       └── LIBRARY_ID
 *           ├── students
 *           │    └── STUDENT_CODE
 *           │
 *           └── attendance
 *                └── YYYY-MM-DD_STUDENT_CODE
 *
 * IMPORTANT:
 * This file NEVER uses:
 * - saas_libraries
 * - old LibManage collections
 * - another application's collections
 * ==========================================================================
 */


/* ==========================================================================
   1. MODULE STATE
   ========================================================================== */

let attendanceStudents = [];

let attendanceRecords = {};

let attendanceSelectedDate = "";

let attendanceHistoryUnsubscribe = null;

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


/* --------------------------------------------------------------------------
   Convert DD/MM/YYYY -> YYYY-MM-DD
-------------------------------------------------------------------------- */

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


    const day =
        parts[0].padStart(
            2,
            "0"
        );


    const month =
        parts[1].padStart(
            2,
            "0"
        );


    const year =
        parts[2];


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );

}


/* --------------------------------------------------------------------------
   Convert YYYY-MM-DD -> DD/MM/YYYY
-------------------------------------------------------------------------- */

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
   5. FIND DATE INPUT
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


/* ==========================================================================
   6. SET DEFAULT DATE
   ========================================================================== */

function setDefaultAttendanceDate() {

    const input =
        getAttendanceDateInput();


    if (!input) {
        return;
    }


    if (
        !input.value
    ) {

        input.value =
            getTodayAttendanceDate();

    }


    attendanceSelectedDate =
        normalizeAttendanceDate(
            input.value
        );

}


/* ==========================================================================
   7. NORMALIZE DATE
   ========================================================================== */

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
   8. ESCAPE HTML
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
   9. GET ATTENDANCE COLLECTION
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


    /*
     * dashboard.js provides the isolated
     * library-specific attendance reference.
     */

    if (
        typeof window.LibManageDB.attendance ===
        "function"
    ) {

        return window.LibManageDB.attendance(
            session.libraryId
        );

    }


    /*
     * Safety fallback.
     * Still remains inside the NEW project namespace.
     */

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


/* ==========================================================================
   10. GET STUDENTS COLLECTION
   ========================================================================== */

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
   11. LOAD STUDENTS
   ========================================================================== */

async function loadAttendanceStudents() {

    const tableBody =
        attendanceEl(
            "attendance-table-rows"
        ) ||
        attendanceEl(
            "students-table-rows"
        ) ||
        attendanceEl(
            "attendance-student-rows"
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
                    colspan="8"
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
                    colspan="8"
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


        attendanceStudents.sort(
            (a, b) => {

                const aName =
                    String(
                        a.studentName ||
                        ""
                    ).toLowerCase();


                const bName =
                    String(
                        b.studentName ||
                        ""
                    ).toLowerCase();


                return aName.localeCompare(
                    bName
                );

            }
        );


        await loadAttendanceForSelectedDate();


    } catch (error) {

        console.error(
            "[Attendance] Student loading error:",
            error
        );


        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="attendance-empty-state"
                >
                    Unable to load students.
                </td>
            </tr>
        `;

    }

}


/* ==========================================================================
   12. LOAD ATTENDANCE FOR DATE
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

        /*
         * We intentionally use a date field query.
         * This keeps records isolated by library.
         */

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


    } catch (error) {

        console.error(
            "[Attendance] Attendance loading error:",
            error
        );


        renderAttendanceTable();

    }

}


/* ==========================================================================
   13. SEARCH
   ========================================================================== */

function getAttendanceSearchValue() {

    const input =
        attendanceEl(
            "attendance-search-input"
        ) ||
        attendanceEl(
            "student-search-input"
        ) ||
        attendanceEl(
            "search-attendance-input"
        );


    return String(
        input?.value ||
        ""
    )
    .trim()
    .toLowerCase();

}


/* ==========================================================================
   14. RENDER ATTENDANCE TABLE
   ========================================================================== */

function renderAttendanceTable() {

    const tableBody =
        attendanceEl(
            "attendance-table-rows"
        ) ||
        attendanceEl(
            "students-table-rows"
        ) ||
        attendanceEl(
            "attendance-student-rows"
        );


    if (!tableBody) {
        return;
    }


    const searchValue =
        getAttendanceSearchValue();


    const filteredStudents =
        attendanceStudents.filter(
            (student) => {

                if (!searchValue) {
                    return true;
                }


                const searchable =
                    [

                        student.studentCode,

                        student.studentName,

                        student.fatherName,

                        student.seatNumber,

                        student.className,

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
                    colspan="8"
                    class="attendance-empty-state"
                >
                    ${
                        searchValue
                            ? "No matching students found."
                            : "No students registered."
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
                ).toUpperCase();


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


            html += `
                <tr>

                    <td class="cell-strong">
                        ${escapeAttendanceHtml(
                            student.studentCode ||
                            "-"
                        )}
                    </td>


                    <td class="cell-strong">
                        ${escapeAttendanceHtml(
                            student.seatNumber ||
                            "-"
                        )}
                    </td>


                    <td class="cell-name">

                        <button
                            type="button"
                            class="student-row-link"
                            data-attendance-student="${escapeAttendanceHtml(
                                code
                            )}"
                        >
                            ${escapeAttendanceHtml(
                                student.studentName ||
                                "-"
                            )}
                        </button>

                    </td>


                    <td>
                        ${escapeAttendanceHtml(
                            student.fatherName ||
                            "-"
                        )}
                    </td>


                    <td>
                        ${escapeAttendanceHtml(
                            student.className ||
                            "-"
                        )}
                    </td>


                    <td>
                        ${escapeAttendanceHtml(
                            student.shift ||
                            "-"
                        )}
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
   15. UPDATE SUMMARY
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
   16. COLLECT CURRENT ATTENDANCE
   ========================================================================== */

function collectAttendanceData() {

    const records =
        [];


    attendanceStudents.forEach(
        (student) => {

            const code =
                String(
                    student.studentCode ||
                    student.firestoreId ||
                    ""
                ).toUpperCase();


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
                    "",

                seatNumber:
                    student.seatNumber ||
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
   17. SAVE ATTENDANCE
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


    } catch (error) {

        console.error(
            "[Attendance] Save error:",
            error
        );


        alert(
            "Unable to save attendance. Please try again."
        );


    } finally {

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
   18. SEARCH EVENT
   ========================================================================== */

function bindAttendanceSearch() {

    const input =
        attendanceEl(
            "attendance-search-input"
        ) ||
        attendanceEl(
            "student-search-input"
        ) ||
        attendanceEl(
            "search-attendance-input"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        renderAttendanceTable
    );

}


/* ==========================================================================
   19. DATE EVENT
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
   20. SAVE BUTTON
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
   21. STUDENT ROW CLICK
   ========================================================================== */

function bindAttendanceStudentActions() {

    const tableBody =
        attendanceEl(
            "attendance-table-rows"
        ) ||
        attendanceEl(
            "students-table-rows"
        ) ||
        attendanceEl(
            "attendance-student-rows"
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


/* ==========================================================================
   22. STUDENT ATTENDANCE HISTORY
   ========================================================================== */

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
                ).toUpperCase() ===
                String(
                    studentCode
                ).toUpperCase()
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
                    ).toUpperCase()
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
                ).localeCompare(
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
            ).length;


        const absent =
            records.filter(
                (record) =>
                    record.status ===
                    "Absent"
            ).length;


        const modal =
            attendanceEl(
                "attendance-history-modal"
            ) ||
            attendanceEl(
                "student-attendance-history-modal"
            );


        if (!modal) {

            alert(
                `Present: ${present}\nAbsent: ${absent}`
            );

            return;

        }


        const nameElement =
            attendanceEl(
                "history-student-name"
            );


        const presentElement =
            attendanceEl(
                "history-present-count"
            );


        const absentElement =
            attendanceEl(
                "history-absent-count"
            );


        const tableBody =
            attendanceEl(
                "attendance-history-rows"
            );


        if (nameElement) {

            nameElement.textContent =
                student.studentName ||
                "-";

        }


        if (presentElement) {

            presentElement.textContent =
                present;

        }


        if (absentElement) {

            absentElement.textContent =
                absent;

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

            } else {

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
                                            record.status ||
                                            "-"
                                        )}
                                    </td>

                                    <td>
                                        <span
                                            class="history-status-pill ${statusClass}"
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
                    ).join("");

            }

        }


        modal.classList.add(
            "active"
        );


    } catch (error) {

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
   23. HISTORY MODAL CLOSE
   ========================================================================== */

function bindHistoryModal() {

    const modal =
        attendanceEl(
            "attendance-history-modal"
        ) ||
        attendanceEl(
            "student-attendance-history-modal"
        );


    if (!modal) {
        return;
    }


    const closeButton =
        modal.querySelector(
            ".close-modal-btn"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {

                modal.classList.remove(
                    "active"
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

            }

        }
    );

}


/* ==========================================================================
   24. INITIALIZE
   ========================================================================== */

async function initializeAttendanceModule() {

    const tableBody =
        attendanceEl(
            "attendance-table-rows"
        ) ||
        attendanceEl(
            "students-table-rows"
        ) ||
        attendanceEl(
            "attendance-student-rows"
        );


    if (!tableBody) {
        return;
    }


    if (
        typeof requireAdminSession ===
        "function"
    ) {

        if (
            !requireAdminSession()
        ) {

            return;

        }

    }


    setDefaultAttendanceDate();

    bindAttendanceSearch();

    bindAttendanceDate();

    bindAttendanceSave();

    bindAttendanceStudentActions();

    bindHistoryModal();


    await loadAttendanceStudents();

}


/* ==========================================================================
   25. START MODULE
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeAttendanceModule();

    }
);


/* ==========================================================================
   26. PUBLIC API
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
    "[LibManage] Attendance module loaded successfully."
);
