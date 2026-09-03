(function () {
    "use strict";

    /*
     * ============================================================
     * LibControl - Fee Receipt Module
     * ============================================================
     *
     * Firestore:
     *
     * libraries/{libraryId}/fee_receipts/{receiptId}
     *
     * Each receipt stores a snapshot of the student information.
     * This keeps old student payment records independent from
     * future students using the same seat.
     * ============================================================
     */

    let currentFeeStudent = null;
    let feeHistoryUnsubscribe = null;


    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------

    function getCurrentAdminSession() {
        if (
            typeof window.getCurrentSession === "function"
        ) {
            return window.getCurrentSession();
        }

        return null;
    }


    function getLibraryId() {
        const session = getCurrentAdminSession();

        if (
            session &&
            session.libraryId
        ) {
            return session.libraryId;
        }

        return "";
    }


    function getLibraryCollection() {
        const libraryId = getLibraryId();

        if (!libraryId) {
            throw new Error("Library session not found.");
        }

        if (
            window.LibManageDB &&
            typeof window.LibManageDB.library === "function"
        ) {
            return window.LibManageDB.library(libraryId);
        }

        if (
            typeof window.db !== "undefined" &&
            window.db
        ) {
            return window.db
                .collection("libcontrol_libraries")
                .doc(libraryId);
        }

        throw new Error("Firestore is not initialized.");
    }


    function getFeeReceiptsCollection() {
        return getLibraryCollection()
            .collection("fee_receipts");
    }


    function escapeHTML(value) {
        return String(
            value === undefined ||
            value === null
                ? ""
                : value
        )
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function formatMoney(amount) {
        const number = Number(amount || 0);

        return "₹" + number.toFixed(2);
    }


    function formatFirestoreDate(value) {
        if (!value) {
            return "-";
        }

        try {
            if (
                value.toDate &&
                typeof value.toDate === "function"
            ) {
                return value
                    .toDate()
                    .toLocaleDateString("en-IN");
            }

            if (
                value instanceof Date
            ) {
                return value.toLocaleDateString("en-IN");
            }

            return String(value);
        } catch (error) {
            return "-";
        }
    }


    function getTodayInputDate() {
        const now = new Date();

        const year = now.getFullYear();

        const month = String(
            now.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            now.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    function formatDateForReceipt(dateValue) {
        if (!dateValue) {
            return "-";
        }

        const parts = String(dateValue).split("-");

        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }

        return dateValue;
    }


    function generateReceiptNumber() {
        const now = new Date();

        const year = now.getFullYear();

        const month = String(
            now.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            now.getDate()
        ).padStart(2, "0");

        const randomPart = Math.floor(
            100000 +
            Math.random() * 900000
        );

        return `RCP-${year}${month}${day}-${randomPart}`;
    }


    // ------------------------------------------------------------
    // Student data
    // ------------------------------------------------------------

    function normalizeStudent(student) {
        if (!student) {
            return null;
        }

        return {
            firestoreId:
                student.firestoreId ||
                student.id ||
                student.studentCode ||
                "",

            studentCode:
                student.studentCode ||
                student.uniqueLoginCode ||
                student.loginCode ||
                "",

            studentName:
                student.studentName ||
                student.name ||
                "",

            fatherName:
                student.fatherName ||
                "",

            email:
                student.email ||
                "",

            mobileNumber:
                student.mobileNumber ||
                student.mobile ||
                student.phone ||
                "",

            className:
                student.className ||
                student.class ||
                "",

            seatNumber:
                student.seatNumber ||
                "",

            shift:
                student.shift ||
                "",

            joiningDate:
                student.joiningDate ||
                "",

            feeDueDate:
                student.feeDueDate ||
                "",

            feeStatus:
                student.feeStatus ||
                "Due",

            uid:
                student.uid ||
                "",

            libraryId:
                student.libraryId ||
                getLibraryId()
        };
    }


    // ------------------------------------------------------------
    // Open payment modal
    // ------------------------------------------------------------

    function openPaymentModal(student) {
        const normalizedStudent =
            normalizeStudent(student);

        if (!normalizedStudent) {
            alert("Student information not found.");
            return;
        }

        currentFeeStudent =
            normalizedStudent;

        const overlay =
            document.getElementById(
                "fee-receipt-modal-overlay"
            );

        if (!overlay) {
            alert(
                "Fee Receipt modal not found. Please check students.html."
            );
            return;
        }


        const nameElement =
            document.getElementById(
                "fee-receipt-student-name"
            );

        const codeElement =
            document.getElementById(
                "fee-receipt-student-code"
            );

        const seatElement =
            document.getElementById(
                "fee-receipt-student-seat"
            );

        const shiftElement =
            document.getElementById(
                "fee-receipt-student-shift"
            );

        const hiddenStudentId =
            document.getElementById(
                "fee-receipt-student-id"
            );

        const hiddenStudentUid =
            document.getElementById(
                "fee-receipt-student-uid"
            );

        const paymentDate =
            document.getElementById(
                "fee-receipt-payment-date"
            );

        const nextDueDate =
            document.getElementById(
                "fee-receipt-next-due-date"
            );

        const message =
            document.getElementById(
                "fee-receipt-message"
            );


        if (nameElement) {
            nameElement.textContent =
                normalizedStudent.studentName ||
                "-";
        }

        if (codeElement) {
            codeElement.textContent =
                normalizedStudent.studentCode ||
                "-";
        }

        if (seatElement) {
            seatElement.textContent =
                normalizedStudent.seatNumber ||
                "-";
        }

        if (shiftElement) {
            shiftElement.textContent =
                normalizedStudent.shift ||
                "-";
        }

        if (hiddenStudentId) {
            hiddenStudentId.value =
                normalizedStudent.firestoreId;
        }

        if (hiddenStudentUid) {
            hiddenStudentUid.value =
                normalizedStudent.uid;
        }

        if (paymentDate) {
            paymentDate.value =
                getTodayInputDate();
        }

        if (nextDueDate) {
            nextDueDate.value =
                normalizedStudent.feeDueDate ||
                "";
        }

        if (message) {
            message.style.display = "none";
            message.textContent = "";
        }

        const amount =
            document.getElementById(
                "fee-receipt-amount"
            );

        if (amount) {
            amount.value = "";
            amount.focus();
        }

        const paymentMethod =
            document.getElementById(
                "fee-receipt-payment-method"
            );

        if (paymentMethod) {
            paymentMethod.value = "";
        }

        const notes =
            document.getElementById(
                "fee-receipt-notes"
            );

        if (notes) {
            notes.value = "";
        }

        overlay.classList.add("show");
    }


    function closePaymentModal() {
        const overlay =
            document.getElementById(
                "fee-receipt-modal-overlay"
            );

        if (overlay) {
            overlay.classList.remove("show");
        }

        currentFeeStudent = null;
    }


    // ------------------------------------------------------------
    // Message
    // ------------------------------------------------------------

    function showFeeMessage(
        message,
        isError
    ) {
        const element =
            document.getElementById(
                "fee-receipt-message"
            );

        if (!element) {
            return;
        }

        element.style.display = "block";

        element.textContent = message;

        if (isError) {
            element.style.background =
                "#ffe5e5";

            element.style.color =
                "#b00020";
        } else {
            element.style.background =
                "#e7f7ed";

            element.style.color =
                "#176b35";
        }
    }


    // ------------------------------------------------------------
    // Save fee payment
    // ------------------------------------------------------------

    async function saveFeePayment(event) {
        event.preventDefault();

        if (!currentFeeStudent) {
            showFeeMessage(
                "Student information is missing.",
                true
            );

            return;
        }

        const amountElement =
            document.getElementById(
                "fee-receipt-amount"
            );

        const paymentDateElement =
            document.getElementById(
                "fee-receipt-payment-date"
            );

        const paymentMethodElement =
            document.getElementById(
                "fee-receipt-payment-method"
            );

        const nextDueDateElement =
            document.getElementById(
                "fee-receipt-next-due-date"
            );

        const notesElement =
            document.getElementById(
                "fee-receipt-notes"
            );

        const saveButton =
            document.getElementById(
                "fee-receipt-save-btn"
            );


        const amount =
            Number(
                amountElement
                    ? amountElement.value
                    : 0
            );

        const paymentDate =
            paymentDateElement
                ? paymentDateElement.value
                : "";

        const paymentMethod =
            paymentMethodElement
                ? paymentMethodElement.value
                : "";

        const nextDueDate =
            nextDueDateElement
                ? nextDueDateElement.value.trim()
                : "";

        const notes =
            notesElement
                ? notesElement.value.trim()
                : "";


        if (
            !amount ||
            amount <= 0
        ) {
            showFeeMessage(
                "Please enter a valid fee amount.",
                true
            );

            return;
        }

        if (!paymentDate) {
            showFeeMessage(
                "Please select payment date.",
                true
            );

            return;
        }

        if (!paymentMethod) {
            showFeeMessage(
                "Please select payment method.",
                true
            );

            return;
        }


        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent =
                "Saving...";
        }


        try {
            const session =
                getCurrentAdminSession();

            const libraryId =
                getLibraryId();

            if (!libraryId) {
                throw new Error(
                    "Library session not found."
                );
            }


            const receiptNumber =
                generateReceiptNumber();

            const receiptRef =
                getFeeReceiptsCollection()
                    .doc();


            /*
             * IMPORTANT:
             * Student information is copied into the receipt.
             *
             * Therefore even if the student later leaves
             * and the same seat is assigned to another student,
             * this receipt remains linked to the old student.
             */

            const receiptData = {
                receiptNumber:
                    receiptNumber,

                studentCode:
                    currentFeeStudent.studentCode,

                studentUid:
                    currentFeeStudent.uid || "",

                studentFirestoreId:
                    currentFeeStudent.firestoreId || "",

                studentName:
                    currentFeeStudent.studentName,

                fatherName:
                    currentFeeStudent.fatherName,

                email:
                    currentFeeStudent.email,

                mobileNumber:
                    currentFeeStudent.mobileNumber,

                className:
                    currentFeeStudent.className,

                seatNumber:
                    currentFeeStudent.seatNumber,

                shift:
                    currentFeeStudent.shift,

                joiningDate:
                    currentFeeStudent.joiningDate,

                previousFeeDueDate:
                    currentFeeStudent.feeDueDate,

                amount:
                    amount,

                paymentDate:
                    paymentDate,

                paymentMethod:
                    paymentMethod,

                nextDueDate:
                    nextDueDate,

                notes:
                    notes,

                feeStatus:
                    "Paid",

                libraryId:
                    libraryId,

                createdByUID:
                    session &&
                    session.adminUID
                        ? session.adminUID
                        : "",

                createdByEmail:
                    session &&
                    session.adminEmail
                        ? session.adminEmail
                        : "",

                createdAt:
                    firebase.firestore.FieldValue
                        .serverTimestamp()
            };


            /*
             * Save receipt and update student together.
             *
             * This keeps the payment record and student
             * fee status synchronized.
             */

            const batch =
                window.db.batch();


            batch.set(
                receiptRef,
                receiptData
            );


            const studentCode =
                currentFeeStudent.studentCode;

            if (!studentCode) {
                throw new Error(
                    "Student ID not found."
                );
            }


            let studentRef = null;


            if (
                window.LibManageDB &&
                typeof window.LibManageDB.students ===
                    "function"
            ) {
                studentRef =
                    window.LibManageDB
                        .students(libraryId)
                        .doc(studentCode);
            } else {
                studentRef =
                    window.db
                        .collection(
                            "libcontrol_libraries"
                        )
                        .doc(libraryId)
                        .collection("students")
                        .doc(studentCode);
            }


            const studentUpdate = {
                feeStatus:
                    "Paid",

                updatedAt:
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp()
            };


            if (nextDueDate) {
                studentUpdate.feeDueDate =
                    nextDueDate;
            }


            batch.update(
                studentRef,
                studentUpdate
            );


            await batch.commit();


            showFeeMessage(
                "Payment saved successfully.",
                false
            );


            /*
             * Small delay so user can see success message.
             * Then open printable receipt.
             */

            setTimeout(function () {
                closePaymentModal();

                openPrintableReceipt(
                    receiptData
                );
            }, 500);


        } catch (error) {

            console.error(
                "Fee payment error:",
                error
            );

            showFeeMessage(
                error &&
                error.message
                    ? error.message
                    : "Unable to save payment.",
                true
            );

        } finally {

            if (saveButton) {
                saveButton.disabled = false;

                saveButton.textContent =
                    "Save Payment";
            }
        }
    }


    // ------------------------------------------------------------
    // Get library name
    // ------------------------------------------------------------

    async function getLibraryName() {
        try {
            const libraryRef =
                getLibraryCollection();

            const snapshot =
                await libraryRef.get();

            if (
                snapshot.exists
            ) {
                const data =
                    snapshot.data() || {};

                return (
                    data.libraryName ||
                    data.name ||
                    "LibControl Library"
                );
            }

        } catch (error) {
            console.warn(
                "Could not load library name:",
                error
            );
        }

        return "LibControl Library";
    }


    // ------------------------------------------------------------
    // Printable receipt
    // ------------------------------------------------------------

    async function openPrintableReceipt(
        receipt
    ) {
        if (!receipt) {
            return;
        }

        const libraryName =
            await getLibraryName();


        const receiptWindow =
            window.open(
                "",
                "_blank",
                "width=800,height=900"
            );


        if (!receiptWindow) {
            alert(
                "Please allow pop-ups to print the receipt."
            );

            return;
        }


        const receiptHTML = `
<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">

<title>
Fee Receipt - ${escapeHTML(
            receipt.receiptNumber
        )}
</title>

<style>

    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        padding: 30px;
        background: #f2f2f2;
        font-family:
            Arial,
            Helvetica,
            sans-serif;
        color: #111111;
    }

    .receipt {
        width: 100%;
        max-width: 700px;
        margin: 0 auto;
        background: #ffffff;
        padding: 35px;
        border: 1px solid #dddddd;
    }

    .receipt-header {
        text-align: center;
        border-bottom: 2px solid #222222;
        padding-bottom: 18px;
        margin-bottom: 20px;
    }

    .receipt-header h1 {
        margin: 0 0 7px;
        font-size: 25px;
    }

    .receipt-header h2 {
        margin: 0;
        font-size: 19px;
    }

    .receipt-number {
        margin-top: 10px;
        font-size: 13px;
    }

    .receipt-section {
        margin-top: 20px;
    }

    .receipt-section-title {
        font-size: 15px;
        font-weight: 700;
        border-bottom: 1px solid #cccccc;
        padding-bottom: 7px;
        margin-bottom: 10px;
    }

    .row {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        padding: 6px 0;
        font-size: 14px;
    }

    .row span:first-child {
        color: #555555;
    }

    .row strong {
        text-align: right;
    }

    .amount-box {
        margin-top: 22px;
        border: 2px solid #222222;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
    }

    .amount-box span {
        font-size: 15px;
        font-weight: 600;
    }

    .amount-box strong {
        font-size: 22px;
    }

    .paid-stamp {
        margin: 22px auto 10px;
        width: max-content;
        border: 2px solid #198754;
        color: #198754;
        padding: 7px 18px;
        font-weight: 800;
        font-size: 16px;
        letter-spacing: 1px;
        transform: rotate(-3deg);
    }

    .footer {
        margin-top: 35px;
        padding-top: 15px;
        border-top: 1px solid #cccccc;
        text-align: center;
        font-size: 12px;
        color: #666666;
    }

    .print-button {
        display: block;
        margin: 20px auto;
        border: none;
        padding: 11px 20px;
        background: #e85d04;
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        border-radius: 6px;
        cursor: pointer;
    }

    @media print {

        body {
            padding: 0;
            background: #ffffff;
        }

        .receipt {
            max-width: none;
            border: none;
            padding: 20px;
        }

        .print-button {
            display: none;
        }

        @page {
            size: A4;
            margin: 12mm;
        }
    }

</style>

</head>

<body>

<button
    class="print-button"
    onclick="window.print()"
>
    Print / Save as PDF
</button>

<div class="receipt">

    <div class="receipt-header">

        <h1>
            ${escapeHTML(
                libraryName
            )}
        </h1>

        <h2>
            FEE PAYMENT RECEIPT
        </h2>

        <div class="receipt-number">
            Receipt No:
            <strong>
                ${escapeHTML(
                    receipt.receiptNumber
                )}
            </strong>
        </div>

    </div>


    <div class="receipt-section">

        <div class="receipt-section-title">
            Student Details
        </div>

        <div class="row">
            <span>Student Name</span>
            <strong>
                ${escapeHTML(
                    receipt.studentName ||
                    "-"
                )}
            </strong>
        </div>

        <div class="row">
            <span>Student ID</span>
            <strong>
                ${escapeHTML(
                    receipt.studentCode ||
                    "-"
                )}
            </strong>
        </div>

        <div class="row">
            <span>Father's Name</span>
            <strong>
                ${escapeHTML(
                    receipt.fatherName ||
                    "-"
                )}
            </strong>
        </div>

        <div class="row">
            <span>Mobile Number</span>
            <strong>
                ${escapeHTML(
                    receipt.mobileNumber ||
                    "-"
                )}
            </strong>
        </div>

        <div class="row">
            <span>Class</span>
            <strong>
                ${escapeHTML(
                    receipt.className ||
                    "-"
                )}
            </strong>
        </div>

        <div class="row">
            <span>Seat Number</span>
            <strong>
                ${escapeHTML(
                    receipt.seatNumber ||
                    "-"
                )}
            </strong>
        </div>

        <div class="row">
            <span>Shift</span>
            <strong>
                ${escapeHTML(
                    receipt.shift ||
                    "-"
                )}
            </strong>
        </div>

    </div>


    <div class="receipt-section">

        <div class="receipt-section-title">
            Payment Details
        </div>

        <div class="row">
            <span>Payment Date</span>
            <strong>
                ${escapeHTML(
                    formatDateForReceipt(
                        receipt.paymentDate
                    )
                )}
            </strong>
        </div>

        <div class="row">
            <span>Payment Method</span>
            <strong>
                ${escapeHTML(
                    receipt.paymentMethod ||
                    "-"
                )}
            </strong>
        </div>

        <div class="row">
            <span>Next Due Date</span>
            <strong>
                ${escapeHTML(
                    receipt.nextDueDate ||
                    "-"
                )}
            </strong>
        </div>

    </div>


    <div class="amount-box">

        <span>
            Amount Paid
        </span>

        <strong>
            ${escapeHTML(
                formatMoney(
                    receipt.amount
                )
            )}
        </strong>

    </div>


    <div class="paid-stamp">
        PAID
    </div>


    ${
        receipt.notes
            ? `
        <div class="receipt-section">

            <div class="receipt-section-title">
                Notes
            </div>

            <div
                style="
                    font-size: 14px;
                    line-height: 1.5;
                "
            >
                ${escapeHTML(
                    receipt.notes
                )}
            </div>

        </div>
        `
            : ""
    }


    <div class="footer">

        <div>
            This is a computer-generated fee receipt.
        </div>

        <div style="margin-top: 5px;">
            Powered by LibControl
        </div>

    </div>

</div>

<script>
    window.onload = function () {
        setTimeout(function () {
            window.print();
        }, 300);
    };
</script>

</body>
</html>
        `;


        receiptWindow.document.open();

        receiptWindow.document.write(
            receiptHTML
        );

        receiptWindow.document.close();
    }


    // ------------------------------------------------------------
    // Fee History
    // ------------------------------------------------------------

    function openFeeHistory(student) {
        const normalizedStudent =
            normalizeStudent(student);

        if (!normalizedStudent) {
            alert("Student information not found.");
            return;
        }


        const overlay =
            document.getElementById(
                "fee-history-modal-overlay"
            );

        const nameElement =
            document.getElementById(
                "fee-history-student-name"
            );

        const contentElement =
            document.getElementById(
                "fee-history-content"
            );


        if (!overlay || !contentElement) {
            alert(
                "Fee History modal not found."
            );

            return;
        }


        if (nameElement) {
            nameElement.textContent =
                `${normalizedStudent.studentName || "-"} (${normalizedStudent.studentCode || "-"})`;
        }


        overlay.classList.add("show");


        if (feeHistoryUnsubscribe) {
            feeHistoryUnsubscribe();

            feeHistoryUnsubscribe = null;
        }


        contentElement.innerHTML =
            "Loading fee history...";


        let query =
            getFeeReceiptsCollection();


        if (
            normalizedStudent.studentCode
        ) {
            query = query.where(
                "studentCode",
                "==",
                normalizedStudent.studentCode
            );
        } else {
            contentElement.innerHTML =
                "<p>No student ID found.</p>";

            return;
        }


        feeHistoryUnsubscribe =
            query.onSnapshot(
                function (snapshot) {

                    const receipts =
                        [];

                    snapshot.forEach(
                        function (doc) {
                            receipts.push({
                                id: doc.id,
                                ...doc.data()
                            });
                        }
                    );


                    receipts.sort(
                        function (a, b) {

                            const dateA =
                                a.createdAt &&
                                a.createdAt.toDate
                                    ? a.createdAt.toDate()
                                    : new Date(0);

                            const dateB =
                                b.createdAt &&
                                b.createdAt.toDate
                                    ? b.createdAt.toDate()
                                    : new Date(0);

                            return (
                                dateB - dateA
                            );
                        }
                    );


                    renderFeeHistory(
                        receipts
                    );

                },
                function (error) {

                    console.error(
                        "Fee history error:",
                        error
                    );

                    contentElement.innerHTML =
                        `
                        <div
                            style="
                                padding: 15px;
                                color: #b00020;
                                background: #ffe5e5;
                                border-radius: 7px;
                            "
                        >
                            Unable to load fee history.
                        </div>
                        `;
                }
            );
    }


    function renderFeeHistory(
        receipts
    ) {
        const contentElement =
            document.getElementById(
                "fee-history-content"
            );

        if (!contentElement) {
            return;
        }


        if (!receipts.length) {

            contentElement.innerHTML =
                `
                <div
                    style="
                        padding: 25px;
                        text-align: center;
                        color: #777777;
                    "
                >
                    No fee payment history found.
                </div>
                `;

            return;
        }


        let totalAmount = 0;


        let rows = "";


        receipts.forEach(
            function (receipt) {

                totalAmount +=
                    Number(
                        receipt.amount || 0
                    );


                rows += `
                    <tr>

                        <td>
                            ${escapeHTML(
                                receipt.receiptNumber ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                formatDateForReceipt(
                                    receipt.paymentDate
                                )
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                formatMoney(
                                    receipt.amount
                                )
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                receipt.paymentMethod ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                receipt.nextDueDate ||
                                "-"
                            )}
                        </td>

                        <td>

                            <button
                                type="button"
                                class="fee-history-print-btn"
                                data-receipt-id="${escapeHTML(
                                    receipt.id
                                )}"
                                style="
                                    border: none;
                                    background: #e85d04;
                                    color: #ffffff;
                                    border-radius: 5px;
                                    padding: 6px 9px;
                                    cursor: pointer;
                                    font-size: 12px;
                                    font-weight: 600;
                                "
                            >
                                Print
                            </button>

                        </td>

                    </tr>
                `;
            }
        );


        contentElement.innerHTML =
            `
            <table
                style="
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                "
            >

                <thead>

                    <tr>

                        <th
                            style="
                                text-align: left;
                                padding: 9px;
                                border-bottom: 1px solid #dddddd;
                            "
                        >
                            Receipt No
                        </th>

                        <th
                            style="
                                text-align: left;
                                padding: 9px;
                                border-bottom: 1px solid #dddddd;
                            "
                        >
                            Date
                        </th>

                        <th
                            style="
                                text-align: left;
                                padding: 9px;
                                border-bottom: 1px solid #dddddd;
                            "
                        >
                            Amount
                        </th>

                        <th
                            style="
                                text-align: left;
                                padding: 9px;
                                border-bottom: 1px solid #dddddd;
                            "
                        >
                            Method
                        </th>

                        <th
                            style="
                                text-align: left;
                                padding: 9px;
                                border-bottom: 1px solid #dddddd;
                            "
                        >
                            Next Due
                        </th>

                        <th
                            style="
                                text-align: left;
                                padding: 9px;
                                border-bottom: 1px solid #dddddd;
                            "
                        >
                            Action
                        </th>

                    </tr>

                </thead>

                <tbody>
                    ${rows}
                </tbody>

                <tfoot>

                    <tr>

                        <td
                            colspan="2"
                            style="
                                padding: 10px;
                                font-weight: 700;
                                border-top: 2px solid #222222;
                            "
                        >
                            Total Paid
                        </td>

                        <td
                            style="
                                padding: 10px;
                                font-weight: 700;
                                border-top: 2px solid #222222;
                            "
                        >
                            ${escapeHTML(
                                formatMoney(
                                    totalAmount
                                )
                            )}
                        </td>

                        <td
                            colspan="3"
                            style="
                                border-top: 2px solid #222222;
                            "
                        ></td>

                    </tr>

                </tfoot>

            </table>
            `;


        const printButtons =
            contentElement.querySelectorAll(
                ".fee-history-print-btn"
            );


        printButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const receiptId =
                            button.getAttribute(
                                "data-receipt-id"
                            );

                        printReceiptById(
                            receiptId
                        );
                    }
                );
            }
        );
    }


    // ------------------------------------------------------------
    // Print existing receipt
    // ------------------------------------------------------------

    async function printReceiptById(
        receiptId
    ) {
        if (!receiptId) {
            return;
        }


        try {

            const snapshot =
                await getFeeReceiptsCollection()
                    .doc(receiptId)
                    .get();


            if (!snapshot.exists) {
                alert(
                    "Receipt not found."
                );

                return;
            }


            const receipt =
                snapshot.data();


            openPrintableReceipt(
                receipt
            );

        } catch (error) {

            console.error(
                "Receipt loading error:",
                error
            );

            alert(
                "Unable to open receipt."
            );
        }
    }


    function closeFeeHistory() {

        if (feeHistoryUnsubscribe) {
            feeHistoryUnsubscribe();

            feeHistoryUnsubscribe = null;
        }


        const overlay =
            document.getElementById(
                "fee-history-modal-overlay"
            );

        if (overlay) {
            overlay.classList.remove(
                "show"
            );
        }
    }


    // ------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------

    window.LibControlFeeReceipt = {

        openPaymentModal:
            openPaymentModal,

        closePaymentModal:
            closePaymentModal,

        openFeeHistory:
            openFeeHistory,

        closeFeeHistory:
            closeFeeHistory,

        printReceiptById:
            printReceiptById
    };


    // ------------------------------------------------------------
    // Event listeners
    // ------------------------------------------------------------

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            const paymentForm =
                document.getElementById(
                    "fee-receipt-payment-form"
                );

            if (paymentForm) {
                paymentForm.addEventListener(
                    "submit",
                    saveFeePayment
                );
            }


            const closePayment =
                document.getElementById(
                    "fee-receipt-close-btn"
                );

            if (closePayment) {
                closePayment.addEventListener(
                    "click",
                    closePaymentModal
                );
            }


            const cancelPayment =
                document.getElementById(
                    "fee-receipt-cancel-btn"
                );

            if (cancelPayment) {
                cancelPayment.addEventListener(
                    "click",
                    closePaymentModal
                );
            }


            const closeHistory =
                document.getElementById(
                    "fee-history-close-btn"
                );

            if (closeHistory) {
                closeHistory.addEventListener(
                    "click",
                    closeFeeHistory
                );
            }


            const paymentOverlay =
                document.getElementById(
                    "fee-receipt-modal-overlay"
                );

            if (paymentOverlay) {

                paymentOverlay.addEventListener(
                    "click",
                    function (event) {

                        if (
                            event.target ===
                            paymentOverlay
                        ) {
                            closePaymentModal();
                        }
                    }
                );
            }


            const historyOverlay =
                document.getElementById(
                    "fee-history-modal-overlay"
                );

            if (historyOverlay) {

                historyOverlay.addEventListener(
                    "click",
                    function (event) {

                        if (
                            event.target ===
                            historyOverlay
                        ) {
                            closeFeeHistory();
                        }
                    }
                );
            }

        }
    );

})();
