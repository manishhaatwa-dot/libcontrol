
/* ==========================================================
   LIBMANAGE STUDENT RENDER MODULE
   Part 1
========================================================== */

let studentsTableBody = null;

/* ----------------------------------------------------------
   Initialize Render Module
---------------------------------------------------------- */

function initializeStudentRenderer() {

    studentsTableBody = document.getElementById("students-table-rows");

}

/* ----------------------------------------------------------
   Render Student Table
---------------------------------------------------------- */

function renderStudentsTable(studentList) {

    if (!studentsTableBody) {
        initializeStudentRenderer();
    }

    if (!studentsTableBody) {
        return;
    }

    studentsTableBody.innerHTML = "";

    if (!studentList || studentList.length === 0) {

        renderEmptyStudentsTable();

        return;
    }

    studentList.forEach((student) => {

        studentsTableBody.appendChild(

            createStudentRow(student)

        );

    });

}

/* ----------------------------------------------------------
   Create Student Row
---------------------------------------------------------- */

function createStudentRow(student) {

    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${student.studentCode}</td>
        <td>${student.seatNumber}</td>
        <td>${student.name}</td>
        <td>${student.fatherName}</td>
        <td>${student.studentClass}</td>
        <td>${student.joiningDate}</td>
        <td>${student.expiryDate}</td>
        <td>${createStatusBadge(student.status)}</td>
        <td class="student-actions"></td>
    `;

    return row;

}
/* ==========================================================
   Status Badge
========================================================== */

function createStatusBadge(status) {

    const statusText = status || "Active";

    let badgeClass = "status-active";

    if (statusText.toLowerCase() === "expired") {
        badgeClass = "status-expired";
    }

    return `
        <span class="${badgeClass}">
            ${statusText}
        </span>
    `;

}

/* ==========================================================
   Empty Table
========================================================== */

function renderEmptyStudentsTable() {

    studentsTableBody.innerHTML = `
        <tr>

            <td colspan="9" class="table-empty">

                No students found

            </td>

        </tr>
    `;

}

/* ==========================================================
   Refresh Table
========================================================== */

function refreshStudentsTable(studentArray) {

    renderStudentsTable(studentArray);

}
/* ==========================================================
   Create Student Row
========================================================== */

function createStudentRow(student) {

    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${student.studentCode}</td>

        <td>${student.seatNumber}</td>

        <td>${student.name}</td>

        <td>${student.fatherName}</td>

        <td>${student.studentClass}</td>

        <td>${student.joiningDate}</td>

        <td>${student.expiryDate}</td>

        <td>
            ${createStatusBadge(student.status)}
        </td>

        <td class="student-actions">

            <button
                class="btn-edit-student"
                onclick="editStudent('${student.studentCode}')">

                Edit

            </button>

            <button
                class="btn-delete-student"
                onclick="deleteStudent('${student.studentCode}')">

                Delete

            </button>

        </td>
    `;

    return row;

}
/* ==========================================================
   Get Student By Code
========================================================== */

function getStudentByCode(studentCode, studentList) {

    if (!studentList) return null;

    return studentList.find(student => {

        return student.studentCode === studentCode;

    });

}

/* ==========================================================
   Clear Students Table
========================================================== */

function clearStudentsTable() {

    if (!studentsTableBody) {

        initializeStudentRenderer();

    }

    if (studentsTableBody) {

        studentsTableBody.innerHTML = "";

    }

}

/* ==========================================================
   Update Student Table
========================================================== */

function updateStudentsTable(studentList) {

    clearStudentsTable();

    renderStudentsTable(studentList);

}

/* ==========================================================
   Render Complete
========================================================== */

console.log("Student Render Module Loaded Successfully");
