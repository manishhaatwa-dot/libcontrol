/**
 * ==========================================================================
 * LIBCONTROL - FEE RECEIPT MODULE
 * ==========================================================================
 *
 * Handles:
 * - Pay Fee button
 * - Fee payment modal
 * - Receipt number generation
 * - Fee receipt Firestore storage
 * - Student fee status update
 * - Receipt button under Fee Status
 * - Print / Save as PDF
 *
 * IMPORTANT:
 * - Existing students.js logic is NOT modified by this file.
 * - Receipt stores a snapshot of student information.
 * - Old receipts remain محفوظ even after a student leaves.
 * ==========================================================================
 */


/* ==========================================================================
   1. MODULE STATE
   ========================================================================== */

let feeReceiptStudentRecords = [];

let feeReceiptObserver = null;


/* ==========================================================================
   2. HELPERS
   ========================================================================== */

function feeReceiptEscape(value) {

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


function feeReceiptGetSession() {

    if (
        typeof getCurrentSession !==
        "function"
    ) {

        return null;

    }


    const session =
        getCurrentSession();


    if (
        !session ||
        session.role !== "admin" ||
        !session.libraryId
    ) {

        return null;

    }


    return session;

}


function feeReceiptGetStudent(
    studentCode
) {

    return feeReceiptStudentRecords.find(
        (student) => {

            return String(
                student.studentCode ||
                ""
            ).toUpperCase() ===
            String(
                studentCode ||
                ""
            ).toUpperCase();

        }
    );

}


function feeReceiptFormatDate(
    value
) {

    if (!value) {
        return "-";
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

        return (
            String(
                value.getDate()
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            String(
                value.getMonth() + 1
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            value.getFullYear()
        );

    }


    return String(
        value
    );

}


function feeReceiptToday() {

    const now =
        new Date();


    return (
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
        now.getFullYear()
    );

}


/* ==========================================================================
   3. RECEIPT NUMBER
   ========================================================================== */

function generateFeeReceiptNumber() {

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


    const random =
        Math.floor(
            100000 +
            Math.random() * 900000
        );


    return (
        "RCP-" +
        year +
        month +
        day +
        "-" +
        random
    );

}


/* ==========================================================================
   4. DYNAMIC PAYMENT MODAL
   ========================================================================== */

function createFeePaymentModal() {

    if (
        document.getElementById(
            "fee-payment-modal"
        )
    ) {

        return;

    }


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "fee-payment-modal";


    modal.innerHTML = `

        <div
            style="
                position:fixed;
                inset:0;
                background:rgba(0,0,0,0.55);
                display:flex;
                align-items:center;
                justify-content:center;
                padding:20px;
                z-index:99999;
            "
            data-fee-modal-overlay
        >

            <div
                style="
                    width:100%;
                    max-width:520px;
                    max-height:90vh;
                    overflow-y:auto;
                    background:#ffffff;
                    border-radius:14px;
                    padding:24px;
                    box-shadow:0 20px 60px rgba(0,0,0,0.25);
                "
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        gap:12px;
                        margin-bottom:20px;
                    "
                >

                    <h2
                        style="
                            margin:0;
                            font-size:21px;
                            color:#111827;
                        "
                    >
                        Fee Payment
                    </h2>


                    <button
                        type="button"
                        id="fee-payment-close"
                        style="
                            border:0;
                            background:transparent;
                            font-size:28px;
                            cursor:pointer;
                            color:#555;
                        "
                    >
                        ×
                    </button>

                </div>


                <div
                    id="fee-payment-student-info"
                    style="
                        background:#f5f7fa;
                        border-radius:10px;
                        padding:14px;
                        margin-bottom:18px;
                        line-height:1.7;
                        color:#111827;
                        font-size:14px;
                    "
                ></div>


                <form
                    id="fee-payment-form"
                >

                    <div
                        style="
                            margin-bottom:14px;
                        "
                    >

                        <label
                            for="fee-payment-amount"
                            style="
                                display:block;
                                margin-bottom:6px;
                                font-weight:600;
                                color:#111827;
                            "
                        >
                            Amount
                        </label>

                        <input
                            type="number"
                            id="fee-payment-amount"
                            min="0.01"
                            step="0.01"
                            placeholder="Enter amount"
                            required
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:11px 12px;
                                border:1px solid #d1d5db;
                                border-radius:8px;
                                font-size:15px;
                            "
                        >

                    </div>


                    <div
                        style="
                            margin-bottom:14px;
                        "
                    >

                        <label
                            for="fee-payment-date"
                            style="
                                display:block;
                                margin-bottom:6px;
                                font-weight:600;
                                color:#111827;
                            "
                        >
                            Payment Date
                        </label>

                        <input
                            type="text"
                            id="fee-payment-date"
                            placeholder="DD/MM/YYYY"
                            required
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:11px 12px;
                                border:1px solid #d1d5db;
                                border-radius:8px;
                                font-size:15px;
                            "
                        >

                    </div>


                    <div
                        style="
                            margin-bottom:14px;
                        "
                    >

                        <label
                            for="fee-payment-method"
                            style="
                                display:block;
                                margin-bottom:6px;
                                font-weight:600;
                                color:#111827;
                            "
                        >
                            Payment Method
                        </label>

                        <select
                            id="fee-payment-method"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:11px 12px;
                                border:1px solid #d1d5db;
                                border-radius:8px;
                                font-size:15px;
                            "
                        >

                            <option value="Cash">
                                Cash
                            </option>

                            <option value="UPI">
                                UPI
                            </option>

                            <option value="Card">
                                Card
                            </option>

                            <option value="Other">
                                Other
                            </option>

                        </select>

                    </div>


                    <div
                        style="
                            margin-bottom:14px;
                        "
                    >

                        <label
                            for="fee-payment-next-due"
                            style="
                                display:block;
                                margin-bottom:6px;
                                font-weight:600;
                                color:#111827;
                            "
                        >
                            Next Fee Due Date
                        </label>

                        <input
                            type="text"
                            id="fee-payment-next-due"
                            placeholder="DD/MM/YYYY"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:11px 12px;
                                border:1px solid #d1d5db;
                                border-radius:8px;
                                font-size:15px;
                            "
                        >

                    </div>


                    <div
                        style="
                            margin-bottom:18px;
                        "
                    >

                        <label
                            for="fee-payment-note"
                            style="
                                display:block;
                                margin-bottom:6px;
                                font-weight:600;
                                color:#111827;
                            "
                        >
                            Note
                        </label>

                        <input
                            type="text"
                            id="fee-payment-note"
                            placeholder="Optional"
                            style="
                                width:100%;
                                box-sizing:border-box;
                                padding:11px 12px;
                                border:1px solid #d1d5db;
                                border-radius:8px;
                                font-size:15px;
                            "
                        >

                    </div>


                    <div
                        style="
                            display:flex;
                            justify-content:flex-end;
                            gap:10px;
                        "
                    >

                        <button
                            type="button"
                            id="fee-payment-cancel"
                            style="
                                padding:11px 18px;
                                border:1px solid #d1d5db;
                                background:#ffffff;
                                border-radius:8px;
                                cursor:pointer;
                                font-weight:600;
                            "
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            id="fee-payment-save"
                            style="
                                padding:11px 18px;
                                border:0;
                                background:#e85d04;
                                color:#ffffff;
                                border-radius:8px;
                                cursor:pointer;
                                font-weight:600;
                            "
                        >
                            Mark Paid & Create Receipt
                        </button>

                    </div>

                </form>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const closeModal =
        () => {

            modal.remove();

        };


    document
        .getElementById(
            "fee-payment-close"
        )
        .addEventListener(
            "click",
            closeModal
        );


    document
        .getElementById(
            "fee-payment-cancel"
        )
        .addEventListener(
            "click",
            closeModal
        );


    const overlay =
        modal.querySelector(
            "[data-fee-modal-overlay]"
        );


    overlay.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                overlay
            ) {

                closeModal();

            }

        }
    );

}


/* ==========================================================================
   5. OPEN PAYMENT
   ========================================================================== */

function openFeePaymentModal(
    studentCode
) {

    const session =
        feeReceiptGetSession();


    if (!session) {

        alert(
            "Session expired. Please login again."
        );

        return;

    }


    const student =
        feeReceiptGetStudent(
            studentCode
        );


    if (!student) {

        alert(
            "Student record not found."
        );

        return;

    }


    createFeePaymentModal();


    const modal =
        document.getElementById(
            "fee-payment-modal"
        );


    const info =
        document.getElementById(
            "fee-payment-student-info"
        );


    info.innerHTML = `

        <strong>
            ${feeReceiptEscape(
                student.studentName ||
                "-"
            )}
        </strong>

        <br>

        Student ID:
        ${feeReceiptEscape(
            student.studentCode ||
            "-"
        )}

        <br>

        Seat:
        ${feeReceiptEscape(
            student.seatNumber ||
            "-"
        )}

        <br>

        Shift:
        ${feeReceiptEscape(
            student.shift ||
            "-"
        )}

        <br>

        Current Fee Status:
        <strong>
            ${feeReceiptEscape(
                student.feeStatus ||
                "Paid"
            )}
        </strong>

    `;


    document
        .getElementById(
            "fee-payment-date"
        )
        .value =
        feeReceiptToday();


    document
        .getElementById(
            "fee-payment-next-due"
        )
        .value =
        feeReceiptFormatDate(
            student.feeDueDate
        ) === "-"
            ? ""
            : feeReceiptFormatDate(
                student.feeDueDate
            );


    const form =
        document.getElementById(
            "fee-payment-form"
        );


    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            await saveFeePayment(
                studentCode
            );

        }
    );


    modal.style.display =
        "block";

}


/* ==========================================================================
   6. SAVE PAYMENT + RECEIPT
   ========================================================================== */

async function saveFeePayment(
    studentCode
) {

    const session =
        feeReceiptGetSession();


    if (!session) {

        alert(
            "Session expired. Please login again."
        );

        return;

    }


    const student =
        feeReceiptGetStudent(
            studentCode
        );


    if (!student) {

        alert(
            "Student record not found."
        );

        return;

    }


    const amountInput =
        document.getElementById(
            "fee-payment-amount"
        );


    const paymentDateInput =
        document.getElementById(
            "fee-payment-date"
        );


    const paymentMethodInput =
        document.getElementById(
            "fee-payment-method"
        );


    const nextDueInput =
        document.getElementById(
            "fee-payment-next-due"
        );


    const noteInput =
        document.getElementById(
            "fee-payment-note"
        );


    const amount =
        parseFloat(
            amountInput.value
        );


    const paymentDate =
        paymentDateInput.value.trim();


    const paymentMethod =
        paymentMethodInput.value;


    const nextDueDate =
        nextDueInput.value.trim();


    const note =
        noteInput.value.trim();


    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            "Please enter a valid payment amount."
        );

        return;

    }


    if (
        !/^\d{2}\/\d{2}\/\d{4}$/.test(
            paymentDate
        )
    ) {

        alert(
            "Payment Date must be in DD/MM/YYYY format."
        );

        return;

    }


    if (
        nextDueDate &&
        !/^\d{2}\/\d{2}\/\d{4}$/.test(
            nextDueDate
        )
    ) {

        alert(
            "Next Fee Due Date must be in DD/MM/YYYY format."
        );

        return;

    }


    const saveButton =
        document.getElementById(
            "fee-payment-save"
        );


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";

    }


    try {

        if (
            !window.db ||
            !window.LibManageDB
        ) {

            throw new Error(
                "Database is not available."
            );

        }


        const receiptNumber =
            generateFeeReceiptNumber();


        const receiptCollection =
            window.db
                .collection(
                    "libcontrol_libraries"
                )
                .doc(
                    session.libraryId
                )
                .collection(
                    "fee_receipts"
                );


        const studentReference =
            window.LibManageDB.student(
                session.libraryId,
                studentCode
            );


        const receiptReference =
            receiptCollection.doc();


        /*
         * Snapshot is intentionally stored.
         *
         * If this student leaves later and the same
         * seat is assigned to another student, this
         * receipt will still contain the old student's
         * information.
         */

        const receiptData = {

            receiptNumber:
                receiptNumber,

            studentCode:
                student.studentCode ||
                studentCode,

            studentName:
                student.studentName ||
                "",

            fatherName:
                student.fatherName ||
                "",

            className:
                student.className ||
                "",

            mobileNumber:
                student.mobileNumber ||
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

            amount:
                amount,

            paymentDate:
                paymentDate,

            paymentMethod:
                paymentMethod,

            previousFeeStatus:
                student.feeStatus ||
                "Paid",

            nextFeeDueDate:
                nextDueDate,

            note:
                note,

            feeStatus:
                "Paid",

            libraryId:
                session.libraryId,

            studentFirestoreId:
                student.firestoreId ||
                "",

            createdByUID:
                session.adminUID ||
                "",

            createdByEmail:
                session.adminEmail ||
                "",

            createdAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        };


        /*
         * Batch:
         * 1. Save permanent receipt.
         * 2. Mark current student Paid.
         * 3. Save latest receipt reference.
         */

        const batch =
            window.db.batch();


        batch.set(
            receiptReference,
            receiptData
        );


        const studentUpdate = {

            feeStatus:
                "Paid",

            lastFeeReceiptId:
                receiptReference.id,

            lastFeeReceiptNumber:
                receiptNumber,

            lastFeePaymentDate:
                paymentDate,

            lastFeePaymentAmount:
                amount,

            lastFeePaymentMethod:
                paymentMethod,

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
            studentReference,
            studentUpdate
        );


        await batch.commit();


        /*
         * Close payment modal.
         */

        const modal =
            document.getElementById(
                "fee-payment-modal"
            );


        if (modal) {

            modal.remove();

        }


        alert(
            "Fee paid successfully.\n\n" +
            "Receipt No: " +
            receiptNumber
        );


        /*
         * Existing students.js realtime listener
         * will refresh the student row automatically.
         */

        setTimeout(
            () => {

                printFeeReceipt(
                    receiptReference.id,
                    session.libraryId
                );

            },
            300
        );

    }
    catch (error) {

        console.error(
            "[Fee Receipt] Save error:",
            error
        );


        alert(
            error?.message ||
            "Unable to save fee payment."
        );

    }
    finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Mark Paid & Create Receipt";

        }

    }

}


/* ==========================================================================
   7. PRINT RECEIPT
   ========================================================================== */

async function printFeeReceipt(
    receiptId,
    libraryId
) {

    try {

        const receiptReference =
            window.db
                .collection(
                    "libcontrol_libraries"
                )
                .doc(
                    libraryId
                )
                .collection(
                    "fee_receipts"
                )
                .doc(
                    receiptId
                );


        const snapshot =
            await receiptReference.get();


        if (!snapshot.exists) {

            alert(
                "Fee receipt not found."
            );

            return;

        }


        const receipt =
            snapshot.data();


        const printWindow =
            window.open(
                "",
                "_blank",
                "width=800,height=900"
            );


        if (!printWindow) {

            alert(
                "Please allow pop-ups to print the receipt."
            );

            return;

        }


        const libraryName =
            await getFeeReceiptLibraryName(
                libraryId
            );


        printWindow.document.open();


        printWindow.document.write(`

            <!DOCTYPE html>

            <html>

            <head>

                <meta charset="UTF-8">

                <title>
                    Fee Receipt -
                    ${feeReceiptEscape(
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
                        font-family: Arial, sans-serif;
                        color: #111827;
                        background: #ffffff;
                    }

                    .receipt {
                        max-width: 700px;
                        margin: 0 auto;
                        border: 1px solid #d1d5db;
                        padding: 28px;
                    }

                    .receipt-header {
                        text-align: center;
                        border-bottom: 2px solid #111827;
                        padding-bottom: 18px;
                        margin-bottom: 22px;
                    }

                    .receipt-header h1 {
                        margin: 0 0 8px;
                        font-size: 26px;
                    }

                    .receipt-header p {
                        margin: 3px 0;
                        font-size: 14px;
                    }

                    .receipt-title {
                        text-align: center;
                        font-size: 20px;
                        font-weight: 700;
                        margin: 18px 0;
                    }

                    .info-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }

                    .info-table td {
                        border: 1px solid #d1d5db;
                        padding: 10px;
                        font-size: 14px;
                    }

                    .info-table td:first-child {
                        width: 35%;
                        font-weight: 700;
                        background: #f3f4f6;
                    }

                    .amount-box {
                        border: 2px solid #111827;
                        padding: 14px;
                        text-align: right;
                        font-size: 21px;
                        font-weight: 700;
                        margin-top: 20px;
                    }

                    .footer {
                        margin-top: 35px;
                        display: flex;
                        justify-content: space-between;
                        font-size: 13px;
                    }

                    .print-button {
                        display: block;
                        margin: 25px auto 0;
                        padding: 10px 20px;
                        border: 0;
                        background: #111827;
                        color: #ffffff;
                        border-radius: 6px;
                        cursor: pointer;
                    }

                    @media print {

                        body {
                            padding: 0;
                        }

                        .receipt {
                            border: 0;
                        }

                        .print-button {
                            display: none;
                        }

                    }

                </style>

            </head>

            <body>

                <div class="receipt">

                    <div class="receipt-header">

                        <h1>
                            ${feeReceiptEscape(
                                libraryName
                            )}
                        </h1>

                        <p>
                            Fee Payment Receipt
                        </p>

                        <p>
                            Receipt No:
                            <strong>
                                ${feeReceiptEscape(
                                    receipt.receiptNumber
                                )}
                            </strong>
                        </p>

                    </div>


                    <div class="receipt-title">
                        Student Details
                    </div>


                    <table class="info-table">

                        <tr>
                            <td>Student ID</td>
                            <td>
                                ${feeReceiptEscape(
                                    receipt.studentCode ||
                                    "-"
                                )}
                            </td>
                        </tr>

                        <tr>
                            <td>Student Name</td>
                            <td>
                                ${feeReceiptEscape(
                                    receipt.studentName ||
                                    "-"
                                )}
                            </td>
                        </tr>

                        <tr>
                            <td>Father's Name</td>
                            <td>
                                ${feeReceiptEscape(
                                    receipt.fatherName ||
                                    "-"
                                )}
                            </td>
                        </tr>

                        <tr>
                            <td>Class</td>
                            <td>
                                ${feeReceiptEscape(
                                    receipt.className ||
                                    "-"
                                )}
                            </td>
                        </tr>

                        <tr>
                            <td>Mobile Number</td>
                            <td>
                                ${feeReceiptEscape(
                                    receipt.mobileNumber ||
                                    "-"
                                )}
                            </td>
                        </tr>

                        <tr>
                            <td>Seat Number</td>
                            <td>
                                ${feeReceiptEscape(
                                    receipt.seatNumber ||
                                    "-"
                                )}
                            </td>
                        </tr>

                        <tr>
                            <td>Shift</td>
                            <td>
                                ${feeReceiptEscape(
                                    receipt.shift ||
                                    "-"
                                )}
                            </td>
                        </tr>

                        <tr>
                            <td>Payment Date</td>
                            <td>
                                ${feeReceiptEscape(
                                    receipt.paymentDate ||
                                    "-"
                                )}
                            </td>
                        </tr>

                        <tr>
                            <td>Payment Method</td>
                            <td>
                                ${feeReceiptEscape(
                                    receipt.paymentMethod ||
                                    "-"
                                )}
                            </td>
                        </tr>

                    </table>


                    <div class="amount-box">

                        Paid Amount:
                        ₹${Number(
                            receipt.amount ||
                            0
                        ).toFixed(2)}

                    </div>


                    ${
                        receipt.nextFeeDueDate
                            ? `
                                <p
                                    style="
                                        margin-top:18px;
                                        font-size:14px;
                                    "
                                >
                                    Next Fee Due Date:
                                    <strong>
                                        ${feeReceiptEscape(
                                            receipt.nextFeeDueDate
                                        )}
                                    </strong>
                                </p>
                            `
                            : ""
                    }


                    ${
                        receipt.note
                            ? `
                                <p
                                    style="
                                        margin-top:12px;
                                        font-size:14px;
                                    "
                                >
                                    Note:
                                    ${feeReceiptEscape(
                                        receipt.note
                                    )}
                                </p>
                            `
                            : ""
                    }


                    <div class="footer">

                        <div>
                            Status:
                            <strong>
                                PAID
                            </strong>
                        </div>

                        <div>
                            Authorized by Admin
                        </div>

                    </div>


                    <button
                        class="print-button"
                        onclick="window.print()"
                    >
                        Print / Save as PDF
                    </button>

                </div>

            </body>

            </html>

        `);


        printWindow.document.close();


        printWindow.focus();


    }
    catch (error) {

        console.error(
            "[Fee Receipt] Print error:",
            error
        );


        alert(
            "Unable to open fee receipt."
        );

    }

}


/* ==========================================================================
   8. LIBRARY NAME
   ========================================================================== */

async function getFeeReceiptLibraryName(
    libraryId
) {

    try {

        if (
            window.LibManageDB &&
            typeof window.LibManageDB.library ===
            "function"
        ) {

            const reference =
                window.LibManageDB.library(
                    libraryId
                );


            const snapshot =
                await reference.get();


            if (snapshot.exists) {

                const data =
                    snapshot.data();


                return (
                    data.libraryName ||
                    data.name ||
                    "LibControl Library"
                );

            }

        }

    }
    catch (error) {

        console.warn(
            "[Fee Receipt] Library name unavailable:",
            error
        );

    }


    return "LibControl Library";

}


/* ==========================================================================
   9. ADD BUTTONS TO EXISTING STUDENT TABLE
   ========================================================================== */

function enhanceStudentFeeCells() {

    const tableBody =
        document.getElementById(
            "students-table-rows"
        );


    if (!tableBody) {
        return;
    }


    const rows =
        tableBody.querySelectorAll(
            "tr"
        );


    rows.forEach(
        (row) => {

            const cells =
                row.querySelectorAll(
                    "td"
                );


            /*
             * Existing table has 11 columns:
             *
             * 0 Login Code
             * 1 Seat
             * 2 Student
             * 3 Father
             * 4 Class
             * 5 Joining
             * 6 Expiry
             * 7 Fee Due
             * 8 Fee Status
             * 9 Status
             * 10 Actions
             */

            if (
                cells.length !== 11
            ) {

                return;

            }


            const studentCode =
                cells[0]
                    .textContent
                    .trim();


            if (!studentCode) {
                return;
            }


            const student =
                feeReceiptGetStudent(
                    studentCode
                );


            if (!student) {
                return;
            }


            /*
             * ----------------------------------------------------------
             * FEE STATUS CELL
             * ----------------------------------------------------------
             */

            const feeCell =
                cells[8];


            if (
                feeCell &&
                !feeCell.querySelector(
                    "[data-fee-receipt]"
                )
            ) {

                if (
                    student.lastFeeReceiptId ||
                    student.lastFeeReceiptNumber
                ) {

                    const receiptButton =
                        document.createElement(
                            "button"
                        );


                    receiptButton.type =
                        "button";


                    receiptButton.textContent =
                        "Receipt";


                    receiptButton.setAttribute(
                        "data-fee-receipt",
                        student.studentCode
                    );


                    receiptButton.title =
                        "Print Fee Receipt";


                    receiptButton.style.cssText = `
                        display:block;
                        margin-top:6px;
                        padding:5px 9px;
                        border:1px solid #e85d04;
                        background:#ffffff;
                        color:#e85d04;
                        border-radius:5px;
                        font-size:12px;
                        font-weight:600;
                        cursor:pointer;
                    `;


                    receiptButton.addEventListener(
                        "click",
                        () => {

                            printFeeReceipt(
                                student.lastFeeReceiptId,
                                getFeeReceiptSession().libraryId
                            );

                        }
                    );


                    feeCell.appendChild(
                        receiptButton
                    );

                }

            }


            /*
             * ----------------------------------------------------------
             * ACTIONS CELL
             * ----------------------------------------------------------
             */

            const actionsCell =
                cells[10];


            if (
                actionsCell &&
                !actionsCell.querySelector(
                    "[data-fee-pay]"
                )
            ) {

                const wrapper =
                    actionsCell.querySelector(
                        ".actions-cell-wrapper"
                    );


                if (wrapper) {

                 if (wrapper) {

    wrapper.querySelectorAll(
        ".action-icon-btn"
    ).forEach(
        (button) => {

            button.style.whiteSpace =
                "nowrap";

            button.style.overflow =
                "hidden";

            button.style.textOverflow =
                "ellipsis";

            button.style.boxSizing =
                "border-box";

        }
    );


    const payButton =
        document.createElement(
            "button"
        );


                    payButton.type =
                        "button";


                    payButton.textContent =
                        "Pay Fee";


                    payButton.setAttribute(
                        "data-fee-pay",
                        student.studentCode
                    );


                    payButton.title =
                        "Pay Student Fee";


                    payButton.className =
                        "action-icon-btn";
                   payButton.style.cssText = `
    width:auto;
    min-width:78px;
    height:36px;
    padding:6px 10px;
    box-sizing:border-box;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    color:#2563eb;
    background:#ffffff;
    border:1px solid #d1d5db;
    border-radius:6px;
    font-size:13px;
    font-weight:600;
    line-height:1.2;
    cursor:pointer;
`;


                    payButton.addEventListener(
                        "click",
                        () => {

                            openFeePaymentModal(
                                student.studentCode
                            );

                        }
                    );


                    wrapper.insertBefore(
                        payButton,
                        wrapper.firstChild
                    );

                }

            }

        }
    );

}


/* ==========================================================================
   10. LOAD STUDENT RECORDS
   ========================================================================== */

function loadFeeReceiptStudents() {

    const session =
        feeReceiptGetSession();


    if (!session) {
        return;
    }


    if (
        !window.LibManageDB
    ) {
        return;
    }


    const studentsCollection =
        window.LibManageDB.students(
            session.libraryId
        );


    studentsCollection.onSnapshot(
        (snapshot) => {

            feeReceiptStudentRecords =
                snapshot.docs.map(
                    (doc) => {

                        return {

                            firestoreId:
                                doc.id,

                            ...doc.data()

                        };

                    }
                );


            enhanceStudentFeeCells();

        },
        (error) => {

            console.error(
                "[Fee Receipt] Student listener error:",
                error
            );

        }
    );

}


/* ==========================================================================
   11. TABLE OBSERVER
   ========================================================================== */

function startFeeReceiptObserver() {

    const tableBody =
        document.getElementById(
            "students-table-rows"
        );


    if (!tableBody) {
        return;
    }


    if (feeReceiptObserver) {

        feeReceiptObserver.disconnect();

    }


    feeReceiptObserver =
        new MutationObserver(
            () => {

                enhanceStudentFeeCells();

            }
        );


    feeReceiptObserver.observe(
        tableBody,
        {
            childList: true,
            subtree: true
        }
    );


    enhanceStudentFeeCells();

}


/* ==========================================================================
   12. INITIALIZE
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (
            !document.getElementById(
                "students-table-rows"
            )
        ) {

            return;

        }


        createFeePaymentModal =
            createFeePaymentModal;


        loadFeeReceiptStudents();

        startFeeReceiptObserver();

    }
);


/* ==========================================================================
   13. GLOBAL API
   ========================================================================== */

window.LibControlFeeReceipt = {

    openPayment:
        openFeePaymentModal,

    printLatestReceipt:
        async function (
            studentCode
        ) {

            const session =
                feeReceiptGetSession();


            if (!session) {

                alert(
                    "Session expired. Please login again."
                );

                return;

            }


            const student =
                feeReceiptGetStudent(
                    studentCode
                );


            if (
                !student ||
                !student.lastFeeReceiptId
            ) {

                alert(
                    "No fee receipt found for this student."
                );

                return;

            }


            await printFeeReceipt(
                student.lastFeeReceiptId,
                session.libraryId
            );

        }

};


console.log(
    "[LibControl] Fee Receipt module loaded successfully."
);
