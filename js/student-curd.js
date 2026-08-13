/* ==========================================================
   LIBMANAGE STUDENT CRUD MODULE
   Part 1
========================================================== */

let currentEditStudent = null;

/* ==========================================================
   Open Add Student Modal
========================================================== */

function openAddStudentModal() {

    currentEditStudent = null;

    document.getElementById("student-form").reset();

    document.getElementById("form-edit-index").value = "";

    document.getElementById("form-student-code").value = "";

    document.getElementById("modal-title-context").innerText =
        "Add Student";

    document
        .getElementById("modal-code-display-block")
        .classList.add("hide-element");

    document
        .getElementById("student-modal")
        .classList.add("active");

}

/* ==========================================================
   Close Student Modal
========================================================== */

function closeStudentModal() {

    document
        .getElementById("student-modal")
        .classList.remove("active");

}

/* ==========================================================
   Reset Student Form
========================================================== */

function resetStudentForm() {

    currentEditStudent = null;

    document.getElementById("student-form").reset();

    document.getElementById("form-edit-index").value = "";

    document.getElementById("form-student-code").value = "";

}

/* ==========================================================
   Check Edit Mode
========================================================== */

function isEditMode() {

    return document
        .getElementById("form-edit-index")
        .value !== "";

}
/* ==========================================================
   Edit Student
========================================================== */

function editStudent(studentCode) {

    const student = localBranchStudentsArray.find((item) => {
        return item.studentCode === studentCode;
    });

    if (!student) {
        alert("Student record not found.");
        return;
    }

    currentEditStudent = student;

    document.getElementById("form-edit-index").value = "EDIT";

    document.getElementById("form-student-code").value =
        student.studentCode;

    document.getElementById("std-name").value =
        student.name;

    document.getElementById("std-father").value =
        student.fatherName;

    document.getElementById("std-class").value =
        student.studentClass;

    document.getElementById("std-seat").value =
        student.seatNumber;

    document.getElementById("std-joining").value =
        student.joiningDate;

    document.getElementById("std-expiry").value =
        student.expiryDate;

    document.getElementById("std-status").value =
        student.status;

    document.getElementById("modal-title-context").innerText =
        "Edit Student";

    document
        .getElementById("modal-code-display-block")
        .classList.remove("hide-element");

    document.getElementById("lbl-display-unique-token").innerText =
        student.studentCode;

    document
        .getElementById("student-modal")
        .classList.add("active");

}
/* ==========================================================
   Delete Student
========================================================== */

async function deleteStudent(studentCode) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this student?"
    );

    if (!confirmDelete) {
        return;
    }

    try {

        await db
            .collection("saas_libraries")
            .doc(currentActiveBranchId)
            .collection("students")
            .doc(studentCode)
            .delete();

        alert("Student deleted successfully.");

    } catch (error) {

        console.error(error);

        alert("Unable to delete student.");

    }

}

/* ==========================================================
   Generate Student Code
========================================================== */

async function generateStudentCode() {

    const snapshot = await db
        .collection("saas_libraries")
        .doc(currentActiveBranchId)
        .collection("students")
        .get();

    const nextNumber = snapshot.size + 1;

    return "LIB" + String(nextNumber).padStart(3, "0");

}
