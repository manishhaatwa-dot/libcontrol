const db = firebase.firestore();

let currentActiveBranchId = "";
let attendanceStudents = [];
let filteredAttendanceStudents = [];

document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("session_role") !== "admin") {
        window.location.href = "../index.html";
        return;
    }

    currentActiveBranchId = localStorage.getItem("session_library_id");

    const today = new Date().toISOString().split("T")[0];
    document.getElementById("attendance-date").value = today;

    bindAttendanceEvents();
    loadStudents();
});

function bindAttendanceEvents() {
    const shiftField = document.getElementById("attendance-shift");
    const dateField = document.getElementById("attendance-date");
    const searchField = document.getElementById("attendance-search-input");
    const saveButton = document.getElementById("save-attendance-btn");
    const tableBody = document.getElementById("attendance-table-body");
    const closeHistoryButton = document.getElementById("close-attendance-history-modal");
    const historyModal = document.getElementById("attendance-history-modal");

    if (shiftField) {
        shiftField.addEventListener("change", loadStudents);
    }

    if (dateField) {
        dateField.addEventListener("change", renderAttendanceTable);
    }

    if (searchField) {
        searchField.addEventListener("input", applyAttendanceSearch);
    }

    if (saveButton) {
        saveButton.addEventListener("click", saveAttendance);
    }

    if (tableBody) {
        tableBody.addEventListener("click", handleStudentRowClick);
    }

    if (closeHistoryButton) {
        closeHistoryButton.addEventListener("click", closeAttendanceHistoryModal);
    }

    if (historyModal) {
        historyModal.addEventListener("click", (event) => {
            if (event.target === historyModal) {
                closeAttendanceHistoryModal();
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeAttendanceHistoryModal();
        }
    });
}

async function loadStudents() {
    try {
        const selectedShift =
            document.getElementById("attendance-shift")?.value || "";

        const snapshot = await db
            .collection("saas_libraries")
            .doc(currentActiveBranchId)
            .collection("students")
            .orderBy("studentCode")
            .get();

        attendanceStudents = [];

        snapshot.forEach((doc) => {
            const student = doc.data();

            if (!student.shift || student.shift === selectedShift) {
                attendanceStudents.push(student);
            }
        });

        applyAttendanceSearch();

    } catch (error) {
        console.error("Load Students Error :", error);
        alert("Unable to load student list.");
    }
}

function applyAttendanceSearch() {
    const searchValue = document
        .getElementById("attendance-search-input")
        ?.value
        ?.trim()
        .toLowerCase() || "";

    if (!searchValue) {
        filteredAttendanceStudents = [...attendanceStudents];
        renderAttendanceTable();
        return;
    }

    filteredAttendanceStudents = attendanceStudents.filter((student) => {
        const studentName = String(student.name || "").toLowerCase();
        const studentCode = String(student.studentCode || "").toLowerCase();
        const seatNumber = String(student.seatNumber || "").toLowerCase();

        return (
            studentName.includes(searchValue) ||
            studentCode.includes(searchValue) ||
            seatNumber.includes(searchValue)
        );
    });

    renderAttendanceTable();
}

async function renderAttendanceTable() {
    const tableBody = document.getElementById("attendance-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    const attendanceDate =
        document.getElementById("attendance-date").value;

    const attendanceShift =
        document.getElementById("attendance-shift").value;

    let savedAttendance = {};

    try {
        const snapshot = await db
            .collection("saas_libraries")
            .doc(currentActiveBranchId)
            .collection("attendance")
            .doc(attendanceDate)
            .collection("records")
            .get();

        snapshot.forEach((doc) => {
            const data = doc.data();

            if (data.shift === attendanceShift) {
                savedAttendance[doc.id] = data.status;
            }
        });

    } catch (error) {
        console.error("Load Saved Attendance Error :", error);
    }

    const studentsToRender = filteredAttendanceStudents;

    if (!studentsToRender.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="attendance-empty-state">
                    No students found for the selected shift or search.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = studentsToRender.map((student) => {
        const savedStatus =
            savedAttendance[student.studentCode] || "Present";

        return `
            <tr class="attendance-student-row" data-student-code="${escapeHtml(student.studentCode)}">
                <td class="cell-strong">
                    <button
                        type="button"
                        class="student-row-link"
                        data-student-code="${escapeHtml(student.studentCode)}">
                        ${escapeHtml(student.studentCode)}
                    </button>
                </td>

                <td class="cell-strong">
                    ${escapeHtml(student.seatNumber || "-")}
                </td>

                <td class="cell-name">
                    <button
                        type="button"
                        class="student-row-link student-name-link"
                        data-student-code="${escapeHtml(student.studentCode)}">
                        ${escapeHtml(student.name || "-")}
                    </button>
                </td>

                <td>
                    <label class="attendance-option present-option">
                        <input
                            type="radio"
                            name="${escapeAttribute(student.studentCode)}"
                            value="Present"
                            ${savedStatus === "Present" ? "checked" : ""}>
                        <span>Present</span>
                    </label>
                </td>

                <td>
                    <label class="attendance-option absent-option">
                        <input
                            type="radio"
                            name="${escapeAttribute(student.studentCode)}"
                            value="Absent"
                            ${savedStatus === "Absent" ? "checked" : ""}>
                        <span>Absent</span>
                    </label>
                </td>
            </tr>
        `;
    }).join("");
}

function handleStudentRowClick(event) {
    const targetButton = event.target.closest(".student-row-link");
    if (!targetButton) return;

    const studentCode = targetButton.getAttribute("data-student-code");
    if (!studentCode) return;

    const selectedStudent = attendanceStudents.find((student) =>
        String(student.studentCode) === String(studentCode)
    );

    if (selectedStudent) {
        openAttendanceHistory(selectedStudent);
    }
}

async function openAttendanceHistory(student) {
    const modal = document.getElementById("attendance-history-modal");
    const summaryBox = document.getElementById("attendance-history-summary");
    const historyBody = document.getElementById("attendance-history-body");

    if (!modal || !summaryBox || !historyBody) return;

    summaryBox.innerHTML = `
        <div class="attendance-stat-card">
            <p>Student Name</p>
            <h4>${escapeHtml(student.name || "-")}</h4>
        </div>
        <div class="attendance-stat-card">
            <p>Student Code</p>
            <h4>${escapeHtml(student.studentCode || "-")}</h4>
        </div>
        <div class="attendance-stat-card">
            <p>Seat Number</p>
            <h4>${escapeHtml(student.seatNumber || "-")}</h4>
        </div>
        <div class="attendance-stat-card">
            <p>Total Present</p>
            <h4 id="attendance-total-present">0</h4>
        </div>
        <div class="attendance-stat-card">
            <p>Total Absent</p>
            <h4 id="attendance-total-absent">0</h4>
        </div>
    `;

    historyBody.innerHTML = `
        <tr>
            <td colspan="3" class="attendance-empty-state">
                Loading attendance history...
            </td>
        </tr>
    `;

    modal.classList.add("active");

    try {
        const attendanceDatesSnapshot = await db
            .collection("saas_libraries")
            .doc(currentActiveBranchId)
            .collection("attendance")
            .get();

        const historyItems = [];

        for (const attendanceDoc of attendanceDatesSnapshot.docs) {
            const dateId = attendanceDoc.id;

            const recordDoc = await db
                .collection("saas_libraries")
                .doc(currentActiveBranchId)
                .collection("attendance")
                .doc(dateId)
                .collection("records")
                .doc(student.studentCode)
                .get();

            if (recordDoc.exists) {
                const recordData = recordDoc.data() || {};

                historyItems.push({
                    date: recordData.date || dateId,
                    shift: recordData.shift || "-",
                    status: recordData.status || "-"
                });
            }
        }

        historyItems.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        let totalPresent = 0;
        let totalAbsent = 0;

        historyItems.forEach((item) => {
            if (item.status === "Present") totalPresent++;
            if (item.status === "Absent") totalAbsent++;
        });

        document.getElementById("attendance-total-present").textContent = totalPresent;
        document.getElementById("attendance-total-absent").textContent = totalAbsent;

        if (!historyItems.length) {
            historyBody.innerHTML = `
                <tr>
                    <td colspan="3" class="attendance-empty-state">
                        No attendance history found for this student.
                    </td>
                </tr>
            `;
            return;
        }

        historyBody.innerHTML = historyItems.map((item) => `
            <tr>
                <td>${escapeHtml(item.date)}</td>
                <td>${escapeHtml(item.shift)}</td>
                <td>
                    <span class="history-status-pill ${item.status === "Present" ? "present" : "absent"}">
                        ${escapeHtml(item.status)}
                    </span>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Attendance History Error :", error);
        historyBody.innerHTML = `
            <tr>
                <td colspan="3" class="attendance-empty-state">
                    Unable to load attendance history.
                </td>
            </tr>
        `;
    }
}

function closeAttendanceHistoryModal() {
    const modal = document.getElementById("attendance-history-modal");
    if (modal) {
        modal.classList.remove("active");
    }
}

async function saveAttendance() {
    try {
        const attendanceDate =
            document.getElementById("attendance-date").value;

        const attendanceShift =
            document.getElementById("attendance-shift").value;

        if (!attendanceDate) {
            alert("Please select attendance date.");
            return;
        }

        if (!attendanceShift) {
            alert("Please select shift.");
            return;
        }

        const batch = db.batch();

        attendanceStudents.forEach((student) => {
            const selectedStatus = document.querySelector(
                `input[name="${student.studentCode}"]:checked`
            );

            const attendanceRef = db
                .collection("saas_libraries")
                .doc(currentActiveBranchId)
                .collection("attendance")
                .doc(attendanceDate)
                .collection("records")
                .doc(student.studentCode);

            batch.set(attendanceRef, {
                studentCode: student.studentCode,
                name: student.name,
                seatNumber: student.seatNumber,
                shift: attendanceShift,
                status: selectedStatus
                    ? selectedStatus.value
                    : "Absent",
                date: attendanceDate,
                updatedAt:
                    firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        });

        await batch.commit();

        alert("Attendance saved successfully.");

    } catch (error) {
        console.error("Attendance Save Error :", error);
        alert("Failed to save attendance: " + error.message);
    }
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
    return String(value || "").replace(/"/g, "&quot;");
}
