/**
 * ==========================================================================
 * LIBMANAGE - STUDENT DIRECTORY MODULE
 * ==========================================================================
 *
 * Handles:
 * - Student listing
 * - Search
 * - Add student
 * - Edit student
 * - Delete student
 * - Automatic unique student login code
 * - Library-wise Firestore isolation
 * - Joining date
 * - Fee status
 * - Fee due date
 * - Fee Receipt button integration
 *
 * IMPORTANT:
 * This module NEVER accesses the old "saas_libraries" structure.
 * It uses dashboard.js -> LibManageDB -> libmanage_secure_v2
 * ==========================================================================
 */


/* ==========================================================================
   1. MODULE STATE
   ========================================================================== */

let studentsRealtimeUnsubscribe = null;

let studentRecords = [];

let studentEditMode = false;

let currentEditingStudentCode = null;


/* ==========================================================================
   2. DOM HELPERS
   ========================================================================== */

function studentElement(id) {

    return document.getElementById(id);

}


/* ==========================================================================
   3. SESSION / DATABASE CHECK
   ========================================================================== */

function getStudentLibraryContext() {

    const session =
        typeof getCurrentSession === "function"
            ? getCurrentSession()
            : null;


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
   4. STUDENT CODE GENERATOR
   ========================================================================== */

function generateStudentCode() {

    const prefix =
        "STU";


    let highestNumber =
        0;


    studentRecords.forEach(
        (student) => {

            const code =
                String(
                    student.studentCode || ""
                ).toUpperCase();


            const match =
                code.match(
                    /^STU(\d+)$/
                );


            if (match) {

                const number =
                    parseInt(
                        match[1],
                        10
                    );


                if (
                    !Number.isNaN(number) &&
                    number > highestNumber
                ) {

                    highestNumber =
                        number;

                }

            }

        }
    );


    return (
        prefix +
        String(
            highestNumber + 1
        ).padStart(
            4,
            "0"
        )
    );

}


/* ==========================================================================
   5. DATE VALIDATION
   ========================================================================== */

function isValidDateFormat(
    value
) {

    const date =
        String(
            value || ""
        ).trim();


    if (
        !/^\d{2}\/\d{2}\/\d{4}$/.test(
            date
        )
    ) {

        return false;

    }


    const parts =
        date.split(
            "/"
        );


    const day =
        parseInt(
            parts[0],
            10
        );


    const month =
        parseInt(
            parts[1],
            10
        );


    const year =
        parseInt(
            parts[2],
            10
        );


    if (
        month < 1 ||
        month > 12 ||
        day < 1
    ) {

        return false;

    }


    const testDate =
        new Date(
            year,
            month - 1,
            day
        );


    return (
        testDate.getFullYear() === year &&
        testDate.getMonth() === month - 1 &&
        testDate.getDate() === day
    );

}


/* ==========================================================================
   6. DATE CONVERSION
   ========================================================================== */

function parseIndianDate(
    value
) {

    if (
        !isValidDateFormat(
            value
        )
    ) {

        return null;

    }


    const parts =
        value.split(
            "/"
        );


    const day =
        parseInt(
            parts[0],
            10
        );


    const month =
        parseInt(
            parts[1],
            10
        );


    const year =
        parseInt(
            parts[2],
            10
        );


    return new Date(
        year,
        month - 1,
        day
    );

}


/* ==========================================================================
   7. DATE FORMATTER
   ========================================================================== */

function formatDateValue(
    value
) {

    if (!value) {
        return "";
    }


    if (
        typeof value.toDate ===
        "function"
    ) {

        value =
            value.toDate();

    }


    if (
        value instanceof Date &&
        !Number.isNaN(
            value.getTime()
        )
    ) {

        const day =
            String(
                value.getDate()
            ).padStart(
                2,
                "0"
            );


        const month =
            String(
                value.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const year =
            value.getFullYear();


        return (
            day +
            "/" +
            month +
            "/" +
            year
        );

    }


    return String(
        value
    );

}


/* ==========================================================================
   8. ESCAPE HTML
   ========================================================================== */

function escapeStudentHtml(
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
   9. LOAD STUDENTS
   ========================================================================== */

function initializeStudentsModule() {

    const tableBody =
        studentElement(
            "students-table-rows"
        );


    if (!tableBody) {

        return;

    }


    const session =
        getStudentLibraryContext();


    if (!session) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="table-empty"
                    style="text-align:center;padding:2rem;"
                >
                    Session expired. Please login again.
                </td>
            </tr>
        `;

        return;

    }


    if (
        !window.LibManageDB ||
        !window.db
    ) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="table-empty"
                    style="text-align:center;padding:2rem;"
                >
                    Database is not available.
                </td>
            </tr>
        `;

        return;

    }


    const studentsCollection =
        window.LibManageDB.students(
            session.libraryId
        );


    if (
        typeof studentsRealtimeUnsubscribe ===
        "function"
    ) {

        studentsRealtimeUnsubscribe();

    }


    studentsRealtimeUnsubscribe =
        studentsCollection.onSnapshot(

            (snapshot) => {

                studentRecords =
                    snapshot.docs.map(
                        (doc) => {

                            return {

                                firestoreId:
                                    doc.id,

                                ...doc.data()

                            };

                        }
                    );


                studentRecords.sort(
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


                renderStudentTable();

            },


            (error) => {

                console.error(
                    "[Students] Realtime listener error:",
                    error
                );


                tableBody.innerHTML = `
                    <tr>
                        <td
                            colspan="10"
                            class="table-empty"
                            style="text-align:center;padding:2rem;"
                        >
                            Unable to load student records.
                        </td>
                    </tr>
                `;

            }

        );

}


/* ==========================================================================
   10. RENDER TABLE
   ========================================================================== */

function renderStudentTable() {

    const tableBody =
        studentElement(
            "students-table-rows"
        );


    if (!tableBody) {
        return;
    }


    const searchInput =
        studentElement(
            "student-search-input"
        );


    const searchValue =
        String(
            searchInput?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const filteredStudents =
        studentRecords.filter(
            (student) => {

                if (!searchValue) {
                    return true;
                }


                const searchableText = [

                    student.studentCode,

                    student.seatNumber,

                    student.studentName,

                    student.fatherName,

                    student.className,

                    student.mobileNumber,

                    student.shift,

                    student.status,

                    student.joiningDate,

                    student.feeStatus,

                    student.feeDueDate

                ]
                .join(" ")
                .toLowerCase();


                return searchableText.includes(
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
                    colspan="10"
                    class="table-empty"
                    style="text-align:center;padding:2rem;"
                >
                    ${
                        searchValue
                            ? "No matching student records found."
                            : "No student records available."
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

            const status =
                student.status ||
                "Active";


            const statusClass =
                String(
                    status
                ).toLowerCase() ===
                "expired"
                    ? "expired"
                    : "active";


            const feeStatus =
                String(
                    student.feeStatus ||
                    "Paid"
                );


            const feeStatusClass =
                feeStatus.toLowerCase() ===
                "due"
                    ? "expired"
                    : "active";


            /*
             * --------------------------------------------------------------
             * FEE RECEIPT STATUS
             *
             * Receipt button will appear only after the
             * fee-receipt module has saved a receipt reference.
             *
             * Existing students without a receipt remain unchanged.
             * --------------------------------------------------------------
             */

            const hasFeeReceipt =
                Boolean(
                    student.lastFeeReceiptId ||
                    student.lastFeeReceiptNumber
                );


            let feeReceiptButtons =
                `
                    <button
                        type="button"
                        class="action-icon-btn"
                        title="Pay Fee"
                        data-fee-pay="${escapeStudentHtml(
                            student.studentCode ||
                            ""
                        )}"
                    >
                        Pay Fee
                    </button>
                `;


            if (hasFeeReceipt) {

                feeReceiptButtons += `
                    <button
                        type="button"
                        class="action-icon-btn"
                        title="Print Fee Receipt"
                        data-fee-receipt="${escapeStudentHtml(
                            student.studentCode ||
                            ""
                        )}"
                    >
                        Receipt
                    </button>
                `;

            }


            html += `
                <tr>

                    <td class="cell-strong">
                        ${escapeStudentHtml(
                            student.studentCode ||
                            "-"
                        )}
                    </td>


                    <td class="cell-strong">
                        ${escapeStudentHtml(
                            student.seatNumber ||
                            "-"
                        )}
                    </td>


                    <td class="cell-name">

                        <button
                            type="button"
                            class="student-row-link"
                            data-student-view="${escapeStudentHtml(
                                student.studentCode ||
                                ""
                            )}"
                        >
                            ${escapeStudentHtml(
                                student.studentName ||
                                "-"
                            )}
                        </button>

                    </td>


                    <td>
                        ${escapeStudentHtml(
                            student.fatherName ||
                            "-"
                        )}
                    </td>


                    <td>
                        ${escapeStudentHtml(
                            student.className ||
                            "-"
                        )}
                    </td>


                    <td>
                        ${escapeStudentHtml(
                            formatDateValue(
                                student.joiningDate
                            ) ||
                            "-"
                        )}
                    </td>


                    <td>
                        ${escapeStudentHtml(
                            formatDateValue(
                                student.feeDueDate
                            ) ||
                            "-"
                        )}
                    </td>


                    <td>

                        <span
                            class="status-tag ${feeStatusClass}"
                        >
                            ${escapeStudentHtml(
                                feeStatus
                            )}
                        </span>

                    </td>


                    <td>

                        <span
                            class="status-tag ${statusClass}"
                        >
                            ${escapeStudentHtml(
                                status
                            )}
                        </span>

                    </td>


                    <td>

                        <div class="actions-cell-wrapper">

                            ${feeReceiptButtons}


                            <button
                                type="button"
                                class="action-icon-btn edit-btn"
                                title="Edit Student"
                                data-student-edit="${escapeStudentHtml(
                                    student.studentCode ||
                                    ""
                                )}"
                            >
                                Edit
                            </button>


                            <button
                                type="button"
                                class="action-icon-btn delete-btn"
                                title="Delete Student"
                                data-student-delete="${escapeStudentHtml(
                                    student.studentCode ||
                                    ""
                                )}"
                            >
                                Delete
                            </button>

                        </div>

                    </td>

                </tr>
            `;

        }
    );


    tableBody.innerHTML =
        html;

}


/* ==========================================================================
   11. RESET FORM
   ========================================================================== */

function resetStudentForm() {

    const form =
        studentElement(
            "student-form"
        );


    if (form) {
        form.reset();
    }


    const editIndex =
        studentElement(
            "form-edit-index"
        );


    const studentCode =
        studentElement(
            "form-student-code"
        );


    if (editIndex) {
        editIndex.value = "";
    }


    if (studentCode) {
        studentCode.value = "";
    }


    const emailInput =
        studentElement(
            "std-email"
        );


    const passwordInput =
        studentElement(
            "std-password"
        );


    if (emailInput) {

        emailInput.value =
            "";

        emailInput.disabled =
            false;

        emailInput.required =
            true;

    }


    if (passwordInput) {

        passwordInput.value =
            "";

        passwordInput.disabled =
            false;

        passwordInput.required =
            true;

        passwordInput.placeholder =
            "Enter temporary password";

    }


    const codeBlock =
        studentElement(
            "modal-code-display-block"
        );


    const codePreview =
        studentElement(
            "modal-student-code-preview"
        );


    if (codeBlock) {

        codeBlock.classList.add(
            "hide-element"
        );

    }


    if (codePreview) {

        codePreview.textContent =
            "";

    }


    studentEditMode =
        false;


    currentEditingStudentCode =
        null;

}


/* ==========================================================================
   12. OPEN ADD MODAL
   ========================================================================== */

function openAddStudentModal() {

    const modal =
        studentElement(
            "student-modal"
        );


    if (!modal) {
        return;
    }


    resetStudentForm();


    const emailInput =
        studentElement(
            "std-email"
        );


    const passwordInput =
        studentElement(
            "std-password"
        );


    if (emailInput) {

        emailInput.disabled =
            false;

        emailInput.required =
            true;

    }


    if (passwordInput) {

        passwordInput.disabled =
            false;

        passwordInput.required =
            true;

        passwordInput.placeholder =
            "Enter temporary password";

    }


    const title =
        studentElement(
            "modal-title-context"
        );


    if (title) {

        title.textContent =
            "Register New Library Member";

    }


    const code =
        generateStudentCode();


    const codeHidden =
        studentElement(
            "form-student-code"
        );


    const codePreview =
        studentElement(
            "modal-student-code-preview"
        );


    const codeBlock =
        studentElement(
            "modal-code-display-block"
        );


    if (codeHidden) {

        codeHidden.value =
            code;

    }


    if (codePreview) {

        codePreview.textContent =
            code;

    }


    if (codeBlock) {

        codeBlock.classList.remove(
            "hide-element"
        );

    }


    const joiningInput =
        studentElement(
            "std-joining"
        );


    const feeStatusInput =
        studentElement(
            "std-fee-status"
        );


    const feeDueDateInput =
        studentElement(
            "std-fee-due-date"
        );


    if (feeStatusInput) {

        feeStatusInput.value =
            "Paid";

    }


    if (feeDueDateInput) {

        feeDueDateInput.value =
            "";

    }


    if (joiningInput) {

        const now =
            new Date();


        joiningInput.value =
            String(
                now.getDate()
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            String(
                now.getMonth() + 1
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            now.getFullYear();

    }


    modal.classList.add(
        "active"
    );

}


/* ==========================================================================
   13. OPEN EDIT MODAL
   ========================================================================== */

function openEditStudentModal(
    studentCode
) {

    const student =
        studentRecords.find(
            (item) =>
                String(
                    item.studentCode
                ).toUpperCase() ===
                String(
                    studentCode
                ).toUpperCase()
        );


    if (!student) {

        alert(
            "Student record not found."
        );

        return;

    }


    const modal =
        studentElement(
            "student-modal"
        );


    if (!modal) {
        return;
    }


    resetStudentForm();


    studentEditMode =
        true;


    currentEditingStudentCode =
        student.studentCode;


    const title =
        studentElement(
            "modal-title-context"
        );


    if (title) {

        title.textContent =
            "Edit Library Member";

    }


    studentElement(
        "form-student-code"
    ).value =
        student.studentCode || "";


    const emailInput =
        studentElement(
            "std-email"
        );


    const passwordInput =
        studentElement(
            "std-password"
        );


    if (emailInput) {

        emailInput.value =
            student.email || "";

        emailInput.disabled =
            true;

    }


    if (passwordInput) {

        passwordInput.value =
            "";

        passwordInput.disabled =
            true;

        passwordInput.placeholder =
            "Password cannot be changed here";

    }


    studentElement(
        "std-name"
    ).value =
        student.studentName || "";


    studentElement(
        "std-father"
    ).value =
        student.fatherName || "";


    studentElement(
        "std-class"
    ).value =
        student.className || "";


    studentElement(
        "std-seat"
    ).value =
        student.seatNumber || "";


    studentElement(
        "std-mobile"
    ).value =
        student.mobileNumber || "";


    studentElement(
        "std-shift"
    ).value =
        student.shift || "";


    studentElement(
        "std-status"
    ).value =
        student.status ||
        "Active";


    studentElement(
        "std-joining"
    ).value =
        formatDateValue(
            student.joiningDate
        );


    /*
     * --------------------------------------------------------------
     * FEE STATUS
     * --------------------------------------------------------------
     */

    const feeStatusInput =
        studentElement(
            "std-fee-status"
        );


    if (feeStatusInput) {

        feeStatusInput.value =
            student.feeStatus ||
            "Paid";

    }


    /*
     * --------------------------------------------------------------
     * FEE DUE DATE
     * --------------------------------------------------------------
     */

    const feeDueDateInput =
        studentElement(
            "std-fee-due-date"
        );


    if (feeDueDateInput) {

        feeDueDateInput.value =
            formatDateValue(
                student.feeDueDate
            );

    }


    const codePreview =
        studentElement(
            "modal-student-code-preview"
        );


    const codeBlock =
        studentElement(
            "modal-code-display-block"
        );


    if (codePreview) {

        codePreview.textContent =
            student.studentCode || "";

    }


    if (codeBlock) {

        codeBlock.classList.remove(
            "hide-element"
        );

    }


    modal.classList.add(
        "active"
    );

}


/* ==========================================================================
   14. CLOSE MODAL
   ========================================================================== */

function closeStudentModal() {

    const modal =
        studentElement(
            "student-modal"
        );


    if (modal) {

        modal.classList.remove(
            "active"
        );

    }


    resetStudentForm();

}


/* ==========================================================================
   15. VALIDATE FORM
   ========================================================================== */

function validateStudentForm() {

    const name =
        studentElement(
            "std-name"
        ).value.trim();


    const email =
        studentElement(
            "std-email"
        ).value.trim().toLowerCase();


    const password =
        studentElement(
            "std-password"
        ).value;


    const father =
        studentElement(
            "std-father"
        )?.value.trim() || "";


    const className =
        studentElement(
            "std-class"
        ).value.trim();


    const seat =
        studentElement(
            "std-seat"
        ).value.trim();


    const mobile =
        studentElement(
            "std-mobile"
        ).value.trim();


    const shift =
        studentElement(
            "std-shift"
        ).value || "";


    const status =
        studentElement(
            "std-status"
        ).value || "";


    const joining =
        studentElement(
            "std-joining"
        ).value.trim();


    const feeDueDate =
        studentElement(
            "std-fee-due-date"
        )?.value.trim() || "";


    const feeStatus =
        studentElement(
            "std-fee-status"
        )?.value || "Paid";


    /*
     * Only Email is mandatory here.
     *
     * Password is checked separately below for
     * new student account creation.
     *
     * All other student fields are optional.
     */

    if (!email) {

        return {

            valid: false,

            message:
                "Please enter student email address."

        };

    }


    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email
        )
    ) {

        return {

            valid: false,

            message:
                "Please enter a valid student email address."

        };

    }


    /*
     * Temporary password is required ONLY
     * while creating a new student account.
     */

    if (
        !studentEditMode &&
        password.length < 8
    ) {

        return {

            valid: false,

            message:
                "Temporary Password must contain at least 8 characters."

        };

    }


    /*
     * Mobile number is optional.
     *
     * If entered, it must contain exactly
     * 10 digits.
     */

    if (
        mobile &&
        !/^\d{10}$/.test(
            mobile
        )
    ) {

        return {

            valid: false,

            message:
                "Please enter a valid 10-digit mobile number."

        };

    }


    /*
     * Joining Date is optional.
     *
     * If entered, it must use DD/MM/YYYY.
     */

    if (
        joining &&
        !isValidDateFormat(
            joining
        )
    ) {

        return {

            valid: false,

            message:
                "Joining Date must be in DD/MM/YYYY format."

        };

    }


    /*
     * Fee Due Date is optional.
     *
     * If entered, it must use DD/MM/YYYY.
     */

    if (
        feeDueDate &&
        !isValidDateFormat(
            feeDueDate
        )
    ) {

        return {

            valid: false,

            message:
                "Fee Due Date must be in DD/MM/YYYY format."

        };

    }


    return {

        valid: true,

        data: {

            studentName:
                name,

            email:
                email,

            fatherName:
                father,

            className:
                className,

            seatNumber:
                seat,

            mobileNumber:
                mobile,

            shift:
                shift,

            status:
                status || "Active",

            joiningDate:
                joining,

            feeDueDate:
                feeDueDate,

            feeStatus:
                feeStatus

        },

        temporaryPassword:
            password

    };

}


/* ==========================================================================
   16. SAVE STUDENT
   ========================================================================== */

async function saveStudent(
    event
) {

    event.preventDefault();


    const validation =
        validateStudentForm();


    if (!validation.valid) {

        alert(
            validation.message
        );

        return;

    }


    const session =
        getStudentLibraryContext();


    if (!session) {

        alert(
            "Session expired. Please login again."
        );

        return;

    }


    const code =
        studentElement(
            "form-student-code"
        ).value
            .trim()
            .toUpperCase();


    if (!code) {

        alert(
            "Student Login Code is missing."
        );

        return;

    }


    const saveButton =
        document.querySelector(
            '#student-form button[type="submit"]'
        );


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            studentEditMode
                ? "Updating..."
                : "Creating Account...";

    }


    try {

        const reference =
            window.LibManageDB.student(
                session.libraryId,
                code
            );


        const data =
            validation.data;


        /*
         * --------------------------------------------------------------
         * STEP 1
         * Seat duplicate protection
         * --------------------------------------------------------------
         */

        const duplicateSeat =
            studentRecords.some(
                (student) => {

                    const sameSeat =
                        String(
                            student.seatNumber ||
                            ""
                        )
                            .trim()
                            .toLowerCase() ===
                        String(
                            data.seatNumber
                        )
                            .trim()
                            .toLowerCase();


                    const differentStudent =
                        String(
                            student.studentCode ||
                            ""
                        ).toUpperCase() !==
                        String(
                            code
                        ).toUpperCase();


                    return (
                        sameSeat &&
                        differentStudent
                    );

                }
            );


        if (duplicateSeat) {

            throw new Error(
                "This seat number is already assigned to another student."
            );

        }


        /*
         * --------------------------------------------------------------
         * STEP 2
         * EDIT EXISTING STUDENT
         * --------------------------------------------------------------
         */

        if (studentEditMode) {

            await reference.update({

                ...data,

                updatedAt:
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp()

            });


            alert(
                "Student updated successfully."
            );


            closeStudentModal();

            return;

        }


        /*
         * --------------------------------------------------------------
         * STEP 3
         * NEW STUDENT
         * --------------------------------------------------------------
         */

        const existing =
            await reference.get();


        if (existing.exists) {

            throw new Error(
                "Generated Student Code already exists. Please try again."
            );

        }


        /*
         * Password is NEVER stored in Firestore.
         */

        await reference.set({

            studentCode:
                code,

            ...data,

            role:
                "student",

            libraryId:
                session.libraryId,

            authEnabled:
                false,

            mustChangePassword:
                true,

            createdAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp(),

            updatedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp(),

            createdBy:
                session.adminUID ||
                ""

        });


        /*
         * --------------------------------------------------------------
         * STEP 4
         * SECURE CLOUD FUNCTION
         * --------------------------------------------------------------
         */

        if (
            typeof firebase.functions !==
            "function"
        ) {

            await reference.delete();


            throw new Error(
                "Secure Student Authentication service is unavailable."
            );

        }


        const createStudentAccount =
            firebase
                .functions()
                .httpsCallable(
                    "createLibraryStudent"
                );


        let result;


        try {

            result =
                await createStudentAccount({

                    libraryId:
                        session.libraryId,

                    studentCode:
                        code,

                    email:
                        data.email,

                    temporaryPassword:
                        validation.temporaryPassword

                });

        }
        catch (functionError) {

            try {

                await reference.delete();

            }
            catch (rollbackError) {

                console.error(
                    "[Students] Firestore rollback failed:",
                    rollbackError
                );

            }


            throw functionError;

        }


        /*
         * --------------------------------------------------------------
         * STEP 5
         * VERIFY FUNCTION RESPONSE
         * --------------------------------------------------------------
         */

        if (
            !result ||
            !result.data ||
            result.data.success !==
            true
        ) {

            try {

                await reference.delete();

            }
            catch (rollbackError) {

                console.error(
                    "[Students] Firestore rollback failed:",
                    rollbackError
                );

            }


            throw new Error(
                "Unable to create Student Authentication account."
            );

        }


        /*
         * --------------------------------------------------------------
         * STEP 6
         * SUCCESS
         * --------------------------------------------------------------
         */

        alert(
            "Student registered successfully.\n\n" +
            "Student Login Code: " +
            code
        );


        closeStudentModal();

    }
    catch (error) {

        console.error(
            "[Students] Save error:",
            error
        );


        let message =
            "Unable to save student.";


        if (
            error &&
            error.message
        ) {

            message =
                error.message;

        }


        alert(
            message
        );

    }
    finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save Student";

        }

    }

}


/* ==========================================================================
   17. DELETE STUDENT
   ========================================================================== */

async function deleteStudent(
    studentCode
) {

    const session =
        getStudentLibraryContext();


    if (!session) {

        alert(
            "Session expired. Please login again."
        );

        return;

    }


    const student =
        studentRecords.find(
            (item) =>
                String(
                    item.studentCode
                ).toUpperCase() ===
                String(
                    studentCode
                ).toUpperCase()
        );


    if (!student) {

        alert(
            "Student record not found."
        );

        return;

    }


    const confirmed =
        window.confirm(
            `Delete student "${student.studentName || studentCode}"?\n\nThis action cannot be undone.`
        );


    if (!confirmed) {
        return;
    }


    try {

        const historyResult =
            await window.LibControlStudentHistory.archive(
                session.libraryId,
                studentCode
            );


        if (
            !historyResult ||
            !historyResult.success
        ) {

            throw new Error(
                "Student history archive failed."
            );

        }


        /*
         * Delete Firebase Authentication account
         * and then remove the active Firestore student.
         */

        const deleteStudentAccount =
            firebase
                .functions()
                .httpsCallable(
                    "deleteLibraryStudent"
                );


        const deleteResult =
            await deleteStudentAccount({

                libraryId:
                    session.libraryId,

                studentCode:
                    studentCode

            });


        if (
            !deleteResult ||
            !deleteResult.data ||
            !deleteResult.data.success
        ) {

            throw new Error(
                "Unable to delete student account."
            );

        }


        alert(
            "Student moved to history and login account deleted successfully."
        );

    }
    catch (error) {

        console.error(
            "[Students] Delete error:",
            error
        );


        alert(
            "Unable to delete student."
        );

    }

}


/* ==========================================================================
   18. STUDENT VIEW
   ========================================================================== */

function viewStudent(
    studentCode
) {

    const student =
        studentRecords.find(
            (item) =>
                String(
                    item.studentCode
                ).toUpperCase() ===
                String(
                    studentCode
                ).toUpperCase()
        );


    if (!student) {
        return;
    }


    alert(
        "Student: " +
        (
            student.studentName ||
            "-"
        ) +
        "\nLogin Code: " +
        (
            student.studentCode ||
            "-"
        ) +
        "\nSeat: " +
        (
            student.seatNumber ||
            "-"
        ) +
        "\nFee Status: " +
        (
            student.feeStatus ||
            "Paid"
        ) +
        "\nFee Due Date: " +
        (
            formatDateValue(
                student.feeDueDate
            ) ||
            "-"
        ) +
        "\nReceipt: " +
        (
            student.lastFeeReceiptNumber ||
            "No receipt"
        )
    );

}


/* ==========================================================================
   19. FEE RECEIPT ACTIONS
   ========================================================================== */

function openFeePayment(
    studentCode
) {

    if (
        window.LibControlFeeReceipt &&
        typeof window.LibControlFeeReceipt.openPayment ===
        "function"
    ) {

        window.LibControlFeeReceipt.openPayment(
            studentCode
        );

        return;

    }


    alert(
        "Fee Receipt module is not available yet."
    );

}


function openFeeReceipt(
    studentCode
) {

    if (
        window.LibControlFeeReceipt &&
        typeof window.LibControlFeeReceipt.printLatestReceipt ===
        "function"
    ) {

        window.LibControlFeeReceipt.printLatestReceipt(
            studentCode
        );

        return;

    }


    alert(
        "Fee Receipt module is not available yet."
    );

}


/* ==========================================================================
   20. EVENT DELEGATION
   ========================================================================== */

function bindStudentTableActions() {

    const tableBody =
        studentElement(
            "students-table-rows"
        );


    if (!tableBody) {
        return;
    }


    tableBody.addEventListener(
        "click",
        (event) => {

            const editButton =
                event.target.closest(
                    "[data-student-edit]"
                );


            if (editButton) {

                openEditStudentModal(
                    editButton.getAttribute(
                        "data-student-edit"
                    )
                );

                return;

            }


            const deleteButton =
                event.target.closest(
                    "[data-student-delete]"
                );


            if (deleteButton) {

                deleteStudent(
                    deleteButton.getAttribute(
                        "data-student-delete"
                    )
                );

                return;

            }


            const viewButton =
                event.target.closest(
                    "[data-student-view]"
                );


            if (viewButton) {

                viewStudent(
                    viewButton.getAttribute(
                        "data-student-view"
                    )
                );

                return;

            }


            /*
             * ----------------------------------------------------------
             * FEE PAYMENT BUTTON
             * ----------------------------------------------------------
             */

            const feePayButton =
                event.target.closest(
                    "[data-fee-pay]"
                );


            if (feePayButton) {

                openFeePayment(
                    feePayButton.getAttribute(
                        "data-fee-pay"
                    )
                );

                return;

            }


            /*
             * ----------------------------------------------------------
             * FEE RECEIPT BUTTON
             * ----------------------------------------------------------
             */

            const feeReceiptButton =
                event.target.closest(
                    "[data-fee-receipt]"
                );


            if (feeReceiptButton) {

                openFeeReceipt(
                    feeReceiptButton.getAttribute(
                        "data-fee-receipt"
                    )
                );

            }

        }
    );

}


/* ==========================================================================
   21. MODAL EVENTS
   ========================================================================== */

function bindStudentModalEvents() {

    const openButton =
        studentElement(
            "open-add-modal-btn"
        );


    const closeButton =
        studentElement(
            "close-modal-btn"
        );


    const cancelButton =
        studentElement(
            "cancel-form-btn"
        );


    const form =
        studentElement(
            "student-form"
        );


    const modal =
        studentElement(
            "student-modal"
        );


    if (openButton) {

        openButton.addEventListener(
            "click",
            openAddStudentModal
        );

    }


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeStudentModal
        );

    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeStudentModal
        );

    }


    if (form) {

        form.addEventListener(
            "submit",
            saveStudent
        );

    }


    if (modal) {

        modal.addEventListener(
            "click",
            (event) => {

                if (
                    event.target ===
                    modal
                ) {

                    closeStudentModal();

                }

            }
        );

    }


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                modal &&
                modal.classList.contains(
                    "active"
                )
            ) {

                closeStudentModal();

            }

        }
    );

}


/* ==========================================================================
   22. SEARCH
   ========================================================================== */

function bindStudentSearch() {

    const input =
        studentElement(
            "student-search-input"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        () => {

            renderStudentTable();

        }
    );

}


/* ==========================================================================
   23. INITIALIZE
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        if (
            !studentElement(
                "students-table-rows"
            )
        ) {

            return;

        }


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


        initializeStudentsModule();

        bindStudentTableActions();

        bindStudentModalEvents();

        bindStudentSearch();

    }
);


/* ==========================================================================
   24. GLOBAL MODULE API
   ========================================================================== */

window.LibManageStudents = {

    reload:
        initializeStudentsModule,

    render:
        renderStudentTable,

    openAdd:
        openAddStudentModal,

    openEdit:
        openEditStudentModal,

    closeModal:
        closeStudentModal

};


console.log(
    "[LibManage] Students module loaded successfully."
);
