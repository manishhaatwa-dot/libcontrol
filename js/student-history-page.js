/**
 * ==========================================================================
 * LIBCONTROL - STUDENT HISTORY PAGE
 * ==========================================================================
 *
 * Purpose:
 * - Load archived/left students from students_history
 * - Show them in Student History page
 * - Search student records
 * - Keep existing active students collection untouched
 * ==========================================================================
 */

"use strict";


/* ==========================================================================
   1. STATE
   ========================================================================== */

let studentHistoryRecords = [];

let studentHistoryUnsubscribe = null;


/* ==========================================================================
   2. GET HISTORY COLLECTION
   ========================================================================== */

function getStudentHistoryCollection(libraryId) {

    return window.db
        .collection("libcontrol_libraries")
        .doc(libraryId)
        .collection("students_history");

}


/* ==========================================================================
   3. DATE FORMATTER
   ========================================================================== */

function formatHistoryDate(value) {

    if (!value) {
        return "-";
    }

    try {

        let date;

        if (
            value &&
            typeof value.toDate === "function"
        ) {

            date = value.toDate();

        } else if (
            value instanceof Date
        ) {

            date = value;

        } else {

            date = new Date(value);

        }

        if (
            !date ||
            Number.isNaN(date.getTime())
        ) {

            return "-";

        }

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const year =
            date.getFullYear();

        return `${day}/${month}/${year}`;

    } catch (error) {

        console.warn(
            "[LibControl] History date formatting failed:",
            error
        );

        return "-";

    }

}


/* ==========================================================================
   4. GET LEAVING DATE
   ========================================================================== */

function getHistoryLeavingDate(student) {

    /*
     * Prefer the actual archive timestamp.
     */

    if (student.leftAt) {

        return formatHistoryDate(
            student.leftAt
        );

    }

    if (student.archivedAt) {

        return formatHistoryDate(
            student.archivedAt
        );

    }

    /*
     * Fallback for any older history record.
     */

    return "-";

}


/* ==========================================================================
   5. ESCAPE HTML
   ========================================================================== */

function escapeHistoryHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

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


/* ==========================================================================
   6. GET SEARCHED RECORDS
   ========================================================================== */

function getFilteredHistoryRecords() {

    const searchInput =
        document.getElementById(
            "student-history-search"
        );

    const searchText =
        searchInput
            ? String(
                searchInput.value || ""
            )
                .trim()
                .toLowerCase()
            : "";


    if (!searchText) {

        return [
            ...studentHistoryRecords
        ];

    }


    return studentHistoryRecords.filter(
        (student) => {

            const searchableText = [

                student.studentCode,

                student.originalStudentCode,

                student.studentName,

                student.name,

                student.fatherName,

                student.className,

                student.seatNumber,

                student.mobileNumber,

                student.mobile,

                student.phone,

                student.shift,

                student.email

            ]
                .filter(
                    (value) =>
                        value !== null &&
                        value !== undefined
                )
                .join(" ")
                .toLowerCase();


            return searchableText.includes(
                searchText
            );

        }
    );

}


/* ==========================================================================
   7. RENDER TABLE
   ========================================================================== */

function renderStudentHistoryTable() {

    const table =
        document.getElementById(
            "student-history-table"
        );

    const tableBody =
        document.getElementById(
            "student-history-table-body"
        );

    const emptyMessage =
        document.getElementById(
            "student-history-empty"
        );

    const loading =
        document.getElementById(
            "student-history-loading"
        );

    const status =
        document.getElementById(
            "student-history-status"
        );


    if (!tableBody) {
        return;
    }


    const records =
        getFilteredHistoryRecords();


    tableBody.innerHTML = "";


    if (loading) {

        loading.style.display =
            "none";

    }


    if (!records.length) {

        if (table) {

            table.style.display =
                "none";

        }

        if (emptyMessage) {

            emptyMessage.style.display =
                "block";

            emptyMessage.textContent =
                studentHistoryRecords.length
                    ? "No matching student found."
                    : "No student history found.";

        }

        if (status) {

            status.textContent =
                studentHistoryRecords.length
                    ? "0 matching records"
                    : "0 history records";

        }

        return;

    }


    if (emptyMessage) {

        emptyMessage.style.display =
            "none";

    }


    if (table) {

        table.style.display =
            "table";

    }


    records.forEach(
        (student) => {

            const row =
                document.createElement(
                    "tr"
                );


            const studentCode =
                student.studentCode ||
                student.originalStudentCode ||
                "-";


            const studentName =
                student.studentName ||
                student.name ||
                "-";


            const mobileNumber =
                student.mobileNumber ||
                student.mobile ||
                student.phone ||
                "-";


            const seatNumber =
                student.seatNumber ||
                "-";


            const shift =
                student.shift ||
                "-";


            const joiningDate =
                student.joiningDate ||
                "-";


            const leavingDate =
                getHistoryLeavingDate(
                    student
                );


            const feeStatus =
                student.feeStatus ||
                "-";


            row.innerHTML = `

                <td>
                    ${escapeHistoryHTML(
                        studentCode
                    )}
                </td>

                <td>
                    ${escapeHistoryHTML(
                        studentName
                    )}
                </td>

                <td>
                    ${escapeHistoryHTML(
                        mobileNumber
                    )}
                </td>

                <td>
                    ${escapeHistoryHTML(
                        seatNumber
                    )}
                </td>

                <td>
                    ${escapeHistoryHTML(
                        shift
                    )}
                </td>

                <td>
                    ${escapeHistoryHTML(
                        joiningDate
                    )}
                </td>

                <td>
                    ${escapeHistoryHTML(
                        leavingDate
                    )}
                </td>

                <td>
                    ${escapeHistoryHTML(
                        feeStatus
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
            `${records.length} history record${
                records.length === 1
                    ? ""
                    : "s"
            }`;

    }

}


/* ==========================================================================
   8. LOAD STUDENT HISTORY
   ========================================================================== */

function initializeStudentHistory() {

    const session =
        typeof getCurrentSession === "function"
            ? getCurrentSession()
            : null;


    if (
        !session ||
        session.role !== "admin" ||
        !session.libraryId
    ) {

        window.location.href =
            "index.html";

        return;

    }


    const libraryId =
        typeof normalizeLibraryId === "function"
            ? normalizeLibraryId(
                session.libraryId
            )
            : String(
                session.libraryId
            )
                .trim()
                .toUpperCase()
                .replace(
                    /\s+/g,
                    ""
                );


    if (studentHistoryUnsubscribe) {

        studentHistoryUnsubscribe();

        studentHistoryUnsubscribe =
            null;

    }


    const historyCollection =
        getStudentHistoryCollection(
            libraryId
        );


    studentHistoryUnsubscribe =
        historyCollection
            .onSnapshot(
                (snapshot) => {

                    studentHistoryRecords =
                        snapshot.docs.map(
                            (doc) => ({

                                historyId:
                                    doc.id,

                                ...doc.data()

                            })
                        );


                    /*
                     * Newest archived students first.
                     */

                    studentHistoryRecords.sort(
                        (a, b) => {

                            const aTime =
                                a.archivedAt &&
                                typeof a.archivedAt.toDate ===
                                    "function"
                                    ? a.archivedAt
                                        .toDate()
                                        .getTime()
                                    : 0;


                            const bTime =
                                b.archivedAt &&
                                typeof b.archivedAt.toDate ===
                                    "function"
                                    ? b.archivedAt
                                        .toDate()
                                        .getTime()
                                    : 0;


                            return bTime - aTime;

                        }
                    );


                    renderStudentHistoryTable();

                },
                (error) => {

                    console.error(
                        "[LibControl] Student history load failed:",
                        error
                    );


                    studentHistoryRecords =
                        [];


                    const loading =
                        document.getElementById(
                            "student-history-loading"
                        );

                    if (loading) {

                        loading.textContent =
                            "Unable to load student history.";

                        loading.style.display =
                            "block";

                    }


                    const status =
                        document.getElementById(
                            "student-history-status"
                        );

                    if (status) {

                        status.textContent =
                            "Unable to load history";

                    }

                }
            );

}


/* ==========================================================================
   9. SEARCH EVENT
   ========================================================================== */

function bindStudentHistorySearch() {

    const searchInput =
        document.getElementById(
            "student-history-search"
        );


    if (!searchInput) {
        return;
    }


    searchInput.addEventListener(
        "input",
        () => {

            renderStudentHistoryTable();

        }
    );

}


/* ==========================================================================
   10. CLEANUP
   ========================================================================== */

window.addEventListener(
    "beforeunload",
    () => {

        if (studentHistoryUnsubscribe) {

            studentHistoryUnsubscribe();

            studentHistoryUnsubscribe =
                null;

        }

    }
);


/* ==========================================================================
   11. START MODULE
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const session =
            typeof getCurrentSession === "function"
                ? getCurrentSession()
                : null;


        if (
            !session ||
            session.role !== "admin"
        ) {

            window.location.href =
                "index.html";

            return;

        }


        bindStudentHistorySearch();

        initializeStudentHistory();

    }
);


/* ==========================================================================
   12. GLOBAL API
   ========================================================================== */

window.LibControlStudentHistoryPage = {

    reload:
        initializeStudentHistory,

    render:
        renderStudentHistoryTable

};
