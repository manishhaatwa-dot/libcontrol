/**
 * ==========================================================================
 * LIBMANAGE - SEAT MANAGEMENT MODULE
 * ==========================================================================
 *
 * NEW APP FIRESTORE STRUCTURE:
 *
 * libmanage_secure_v2
 *   └── libraries
 *       └── LIB-XXXXXX
 *           ├── capacity
 *           │   └── config
 *           │
 *           ├── seats
 *           │   └── SEAT-ID
 *           │
 *           └── students
 *               └── STUDENT-CODE
 *
 * IMPORTANT:
 * - Does NOT use old "saas_libraries"
 * - Only works inside current library session
 * - No other library's data is loaded
 * ==========================================================================
 */


/* ==========================================================================
   1. MODULE STATE
   ========================================================================== */

let seatsCapacity = {
    total: 0,
    morning: 0,
    afternoon: 0,
    evening: 0
};

let seatsStudents = [];

let seatsStudentMap = {};

let seatsSearchQuery = "";


/* ==========================================================================
   2. DOM HELPER
   ========================================================================== */

function seatEl(id) {
    return document.getElementById(id);
}


/* ==========================================================================
   3. CURRENT LIBRARY
   ========================================================================== */

function getSeatLibraryId() {

    return (
        localStorage.getItem(
            "session_library_id"
        ) || ""
    )
    .trim()
    .toUpperCase();

}


/* ==========================================================================
   4. NEW APP FIRESTORE ROOT
   ========================================================================== */

function getSeatLibraryRef() {

    if (!window.db) {
        return null;
    }

    const libraryId =
        getSeatLibraryId();

    if (!libraryId) {
        return null;
    }

    return window.db
        .collection(
            "libmanage_secure_v2"
        )
        .collection(
            "libraries"
        )
        .doc(
            libraryId
        );

}


/* ==========================================================================
   5. SESSION CHECK
   ========================================================================== */

function validateSeatSession() {

    const role =
        localStorage.getItem(
            "session_role"
        );

    const libraryId =
        getSeatLibraryId();

    if (
        role !== "admin" ||
        !libraryId
    ) {

        window.location.href =
            "../index.html";

        return false;
    }

    return true;
}


/* ==========================================================================
   6. HTML ESCAPE
   ========================================================================== */

function escapeSeatHtml(value) {

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
   7. SHOW ALERT
   ========================================================================== */

function showSeatAlert(
    message,
    type = "info"
) {

    const alertBox =
        seatEl(
            "seatAlert"
        );

    if (!alertBox) {
        return;
    }

    alertBox.textContent =
        message;

    alertBox.className =
        "seat-alert show " +
        type;

    clearTimeout(
        showSeatAlert.timer
    );

    showSeatAlert.timer =
        setTimeout(
            () => {

                alertBox.classList.remove(
                    "show"
                );

            },
            3500
        );

}


/* ==========================================================================
   8. CAPACITY REFERENCE
   ========================================================================== */

function getCapacityRef() {

    const libraryRef =
        getSeatLibraryRef();

    if (!libraryRef) {
        return null;
    }

    return libraryRef
        .collection(
            "capacity"
        )
        .doc(
            "config"
        );

}


/* ==========================================================================
   9. SEATS REFERENCE
   ========================================================================== */

function getSeatsRef() {

    const libraryRef =
        getSeatLibraryRef();

    if (!libraryRef) {
        return null;
    }

    return libraryRef.collection(
        "seats"
    );

}


/* ==========================================================================
   10. LOAD CAPACITY
   ========================================================================== */

async function loadSeatCapacity() {

    const capacityRef =
        getCapacityRef();

    if (!capacityRef) {
        return;
    }

    try {

        const snapshot =
            await capacityRef.get();

        if (
            snapshot.exists
        ) {

            const data =
                snapshot.data() || {};

            seatsCapacity = {

                total:
                    Number(
                        data.total || 0
                    ),

                morning:
                    Number(
                        data.morning || 0
                    ),

                afternoon:
                    Number(
                        data.afternoon || 0
                    ),

                evening:
                    Number(
                        data.evening || 0
                    )

            };

        } else {

            seatsCapacity = {
                total: 0,
                morning: 0,
                afternoon: 0,
                evening: 0
            };

        }

        renderSeatSummary();

        populateCapacityForm();

    } catch (error) {

        console.error(
            "[Seats] Capacity loading error:",
            error
        );

        showSeatAlert(
            "Unable to load seat capacity.",
            "error"
        );

    }

}


/* ==========================================================================
   11. SAVE CAPACITY
   ========================================================================== */

async function saveSeatCapacity(
    event
) {

    if (event) {
        event.preventDefault();
    }

    const totalInput =
        seatEl(
            "totalCapacityInput"
        );

    const morningInput =
        seatEl(
            "morningCapacityInput"
        );

    const afternoonInput =
        seatEl(
            "afternoonCapacityInput"
        );

    const eveningInput =
        seatEl(
            "eveningCapacityInput"
        );


    if (
        !totalInput ||
        !morningInput ||
        !afternoonInput ||
        !eveningInput
    ) {
        return;
    }


    const total =
        Number(
            totalInput.value
        );

    const morning =
        Number(
            morningInput.value
        );

    const afternoon =
        Number(
            afternoonInput.value
        );

    const evening =
        Number(
            eveningInput.value
        );


    if (
        !Number.isInteger(total) ||
        total < 0
    ) {

        alert(
            "Please enter a valid total capacity."
        );

        return;
    }


    if (
        !Number.isInteger(morning) ||
        morning < 0
    ) {

        alert(
            "Please enter a valid morning capacity."
        );

        return;
    }


    if (
        !Number.isInteger(afternoon) ||
        afternoon < 0
    ) {

        alert(
            "Please enter a valid afternoon capacity."
        );

        return;
    }


    if (
        !Number.isInteger(evening) ||
        evening < 0
    ) {

        alert(
            "Please enter a valid evening capacity."
        );

        return;
    }


    const shiftTotal =
        morning +
        afternoon +
        evening;


    if (
        shiftTotal >
        total
    ) {

        alert(
            "Morning + Afternoon + Evening capacity cannot be greater than total library capacity."
        );

        return;
    }


    const capacityRef =
        getCapacityRef();


    if (!capacityRef) {

        showSeatAlert(
            "Database unavailable.",
            "error"
        );

        return;
    }


    const saveButton =
        seatEl(
            "saveCapacityBtn"
        );


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";

    }


    try {

        await capacityRef.set({

            total:
                total,

            morning:
                morning,

            afternoon:
                afternoon,

            evening:
                evening,

            updatedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        }, {
            merge: true
        });


        seatsCapacity = {

            total:
                total,

            morning:
                morning,

            afternoon:
                afternoon,

            evening:
                evening

        };


        /*
         * Automatically create missing seat records.
         * Existing occupied seats are never overwritten.
         */

        await ensureSeatDocuments(
            total
        );


        renderSeatSummary();

        closeCapacityModal();

        showSeatAlert(
            "Seat capacity saved successfully.",
            "success"
        );


        await loadSeatStudents();


    } catch (error) {

        console.error(
            "[Seats] Capacity save error:",
            error
        );

        showSeatAlert(
            "Failed to save seat capacity.",
            "error"
        );

    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save Capacity";

        }

    }

}


/* ==========================================================================
   12. ENSURE SEAT DOCUMENTS
   ========================================================================== */

async function ensureSeatDocuments(
    total
) {

    const seatsRef =
        getSeatsRef();

    if (!seatsRef) {
        return;
    }


    if (
        total <= 0
    ) {
        return;
    }


    const existingSnapshot =
        await seatsRef.get();


    const existingMap =
        {};


    existingSnapshot.forEach(
        (doc) => {

            existingMap[
                doc.id
            ] = true;

        }
    );


    let batch =
        firebase.firestore()
            .batch();

    let operationCount =
        0;


    for (
        let number = 1;
        number <= total;
        number++
    ) {

        const seatId =
            "SEAT-" +
            String(
                number
            ).padStart(
                3,
                "0"
            );


        if (
            existingMap[seatId]
        ) {
            continue;
        }


        const seatRef =
            seatsRef.doc(
                seatId
            );


        batch.set(
            seatRef,
            {

                seatNumber:
                    String(
                        number
                    ),

                seatId:
                    seatId,

                status:
                    "available",

                studentCode:
                    "",

                studentName:
                    "",

                shift:
                    "",

                createdAt:
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp(),

                updatedAt:
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp()

            }
        );


        operationCount++;


        /*
         * Firestore batch maximum is 500 writes.
         */

        if (
            operationCount >= 450
        ) {

            await batch.commit();

            batch =
                firebase.firestore()
                    .batch();

            operationCount =
                0;

        }

    }


    if (
        operationCount > 0
    ) {

        await batch.commit();

    }

}


/* ==========================================================================
   13. LOAD STUDENTS
   ========================================================================== */

async function loadSeatStudents() {

    const libraryRef =
        getSeatLibraryRef();

    if (!libraryRef) {
        return;
    }


    const studentsRef =
        libraryRef.collection(
            "students"
        );


    try {

        const snapshot =
            await studentsRef.get();


        seatsStudents =
            snapshot.docs.map(
                (doc) => ({

                    id:
                        doc.id,

                    ...doc.data()

                })
            );


        seatsStudentMap =
            {};


        seatsStudents.forEach(
            (student) => {

                seatsStudentMap[
                    student.studentCode ||
                    student.id
                ] =
                    student;

            }
        );


        renderSeatSummary();

        renderAvailableDetails();

        renderOccupiedDetails();


    } catch (error) {

        console.error(
            "[Seats] Student loading error:",
            error
        );

        showSeatAlert(
            "Unable to load student seat records.",
            "error"
        );

    }

}


/* ==========================================================================
   14. NORMALIZE STUDENT STATUS
   ========================================================================== */

function isStudentActive(
    student
) {

    const status =
        String(
            student.status ||
            ""
        ).toLowerCase();


    return (
        status === "active" ||
        status === "approved"
    );

}


/* ==========================================================================
   15. GET OCCUPIED STUDENTS
   ========================================================================== */

function getOccupiedStudents() {

    return seatsStudents.filter(
        (student) => {

            const seat =
                String(
                    student.seatNumber ||
                    student.seat ||
                    ""
                ).trim();


            return (
                seat &&
                isStudentActive(
                    student
                )
            );

        }
    );

}


/* ==========================================================================
   16. GET AVAILABLE TOTAL
   ========================================================================== */

function getOccupiedCount() {

    return getOccupiedStudents()
        .length;

}


function getAvailableCount() {

    return Math.max(
        0,
        seatsCapacity.total -
        getOccupiedCount()
    );

}


/* ==========================================================================
   17. RENDER SUMMARY
   ========================================================================== */

function renderSeatSummary() {

    const totalValue =
        seatEl(
            "totalSeatsValue"
        );

    const availableValue =
        seatEl(
            "availableSeatsValue"
        );

    const occupiedValue =
        seatEl(
            "occupiedSeatsValue"
        );


    const totalSubtext =
        seatEl(
            "totalSeatsSubtext"
        );

    const availableSubtext =
        seatEl(
            "availableSeatsSubtext"
        );

    const occupiedSubtext =
        seatEl(
            "occupiedSeatsSubtext"
        );


    const capacityBadge =
        seatEl(
            "capacityBadge"
        );


    const occupiedCount =
        getOccupiedCount();


    const availableCount =
        getAvailableCount();


    if (totalValue) {

        totalValue.textContent =
            seatsCapacity.total;

    }


    if (availableValue) {

        availableValue.textContent =
            availableCount;

    }


    if (occupiedValue) {

        occupiedValue.textContent =
            occupiedCount;

    }


    if (totalSubtext) {

        totalSubtext.textContent =
            seatsCapacity.total > 0
                ? "Configured library capacity"
                : "Capacity not configured";

    }


    if (availableSubtext) {

        availableSubtext.textContent =
            availableCount === 0
                ? "No seats currently available"
                : "Click to view shift-wise availability";

    }


    if (occupiedSubtext) {

        occupiedSubtext.textContent =
            occupiedCount === 0
                ? "No seats currently occupied"
                : "Click to view occupied seat details";

    }


    if (capacityBadge) {

        if (
            seatsCapacity.total > 0
        ) {

            capacityBadge.classList.add(
                "show"
            );

            capacityBadge.textContent =
                "Configured";

        } else {

            capacityBadge.classList.remove(
                "show"
            );

        }

    }

}


/* ==========================================================================
   18. SHIFT AVAILABILITY
   ========================================================================== */

function getShiftCapacity(
    shift
) {

    const normalized =
        String(
            shift ||
            ""
        ).toLowerCase();


    if (
        normalized ===
        "morning"
    ) {

        return seatsCapacity.morning;

    }


    if (
        normalized ===
        "afternoon"
    ) {

        return seatsCapacity.afternoon;

    }


    if (
        normalized ===
        "evening"
    ) {

        return seatsCapacity.evening;

    }


    return 0;

}


/* ==========================================================================
   19. RENDER AVAILABLE DETAILS
   ========================================================================== */

function renderAvailableDetails() {

    const container =
        seatEl(
            "availableDetailsWrap"
        );


    if (!container) {
        return;
    }


    const shifts = [
        "Morning",
        "Afternoon",
        "Evening"
    ];


    let html = "";


    shifts.forEach(
        (shift) => {

            const capacity =
                getShiftCapacity(
                    shift
                );


            const occupied =
                getOccupiedStudents()
                    .filter(
                        (student) => {

                            return String(
                                student.shift ||
                                ""
                            ).toLowerCase() ===
                            shift.toLowerCase();

                        }
                    )
                    .length;


            const available =
                Math.max(
                    0,
                    capacity -
                    occupied
                );


            html += `
                <div class="shift-item">

                    <div class="shift-item-row">

                        <div>

                            <div class="shift-name">
                                ${escapeSeatHtml(
                                    shift
                                )}
                            </div>

                            <div class="shift-meta">

                                <span>
                                    <span class="seat-mini-label">
                                        Capacity:
                                    </span>

                                    <span class="seat-mini-value">
                                        ${capacity}
                                    </span>
                                </span>


                                <span>
                                    <span class="seat-mini-label">
                                        Occupied:
                                    </span>

                                    <span class="seat-mini-value">
                                        ${occupied}
                                    </span>
                                </span>

                            </div>

                        </div>


                        <div>

                            <div class="shift-name">
                                ${available}
                            </div>

                            <div class="shift-meta">
                                Available
                            </div>

                        </div>

                    </div>

                </div>
            `;

        }
    );


    if (
        seatsCapacity.total <= 0
    ) {

        container.innerHTML = `
            <div class="seat-empty-state">
                Configure library capacity first.
            </div>
        `;

        return;

    }


    container.innerHTML =
        html;

}


/* ==========================================================================
   20. RENDER OCCUPIED DETAILS
   ========================================================================== */

function renderOccupiedDetails() {

    const container =
        seatEl(
            "occupiedDetailsWrap"
        );


    if (!container) {
        return;
    }


    let students =
        getOccupiedStudents();


    if (
        seatsSearchQuery
    ) {

        const query =
            seatsSearchQuery
                .toLowerCase();


        students =
            students.filter(
                (student) => {

                    const searchable =
                        [

                            student.seatNumber,

                            student.studentCode,

                            student.name,

                            student.studentName,

                            student.class,

                            student.shift

                        ]
                        .join(" ")
                        .toLowerCase();


                    return searchable.includes(
                        query
                    );

                }
            );

    }


    students.sort(
        (a, b) => {

            return String(
                a.seatNumber ||
                ""
            )
            .localeCompare(
                String(
                    b.seatNumber ||
                    ""
                ),
                undefined,
                {
                    numeric: true
                }
            );

        }
    );


    if (
        !students.length
    ) {

        container.innerHTML = `
            <div class="seat-empty-state">
                No occupied seats found.
            </div>
        `;

        return;

    }


    let html = "";


    students.forEach(
        (student) => {

            const studentCode =
                student.studentCode ||
                student.id ||
                "";


            const studentName =
                student.studentName ||
                student.name ||
                "Unknown Student";


            html += `
                <div
                    class="student-item"
                    data-student-code="${escapeSeatHtml(
                        studentCode
                    )}"
                >

                    <div class="student-item-row">

                        <div>

                            <div class="student-seat">
                                Seat ${escapeSeatHtml(
                                    student.seatNumber ||
                                    "-"
                                )}
                            </div>

                            <div class="student-meta">

                                <span>
                                    ${escapeSeatHtml(
                                        student.shift ||
                                        "-"
                                    )}
                                </span>

                                <span>
                                    ${escapeSeatHtml(
                                        student.class ||
                                        "-"
                                    )}
                                </span>

                            </div>

                        </div>


                        <div>

                            <div class="student-name">
                                ${escapeSeatHtml(
                                    studentName
                                )}
                            </div>

                            <div class="student-code">
                                ${escapeSeatHtml(
                                    studentCode
                                )}
                            </div>

                        </div>

                    </div>

                </div>
            `;

        }
    );


    container.innerHTML =
        html;

}


/* ==========================================================================
   21. SEARCH
   ========================================================================== */

function bindSeatSearch() {

    const searchInput =
        seatEl(
            "seatSearchInput"
        );


    if (!searchInput) {
        return;
    }


    searchInput.addEventListener(
        "input",
        () => {

            seatsSearchQuery =
                searchInput.value
                    .trim();


            renderOccupiedDetails();

        }
    );

}


/* ==========================================================================
   22. OPEN CAPACITY MODAL
   ========================================================================== */

function openCapacityModal() {

    const modal =
        seatEl(
            "capacityModal"
        );


    if (!modal) {
        return;
    }


    populateCapacityForm();


    modal.classList.add(
        "show"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );

}


/* ==========================================================================
   23. CLOSE CAPACITY MODAL
   ========================================================================== */

function closeCapacityModal() {

    const modal =
        seatEl(
            "capacityModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "show"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* ==========================================================================
   24. POPULATE CAPACITY FORM
   ========================================================================== */

function populateCapacityForm() {

    const total =
        seatEl(
            "totalCapacityInput"
        );

    const morning =
        seatEl(
            "morningCapacityInput"
        );

    const afternoon =
        seatEl(
            "afternoonCapacityInput"
        );

    const evening =
        seatEl(
            "eveningCapacityInput"
        );


    if (total) {
        total.value =
            seatsCapacity.total ||
            "";
    }


    if (morning) {
        morning.value =
            seatsCapacity.morning ||
            "";
    }


    if (afternoon) {
        afternoon.value =
            seatsCapacity.afternoon ||
            "";
    }


    if (evening) {
        evening.value =
            seatsCapacity.evening ||
            "";
    }

}


/* ==========================================================================
   25. STUDENT MODAL
   ========================================================================== */

function openStudentModal(
    student
) {

    const modal =
        seatEl(
            "studentModal"
        );


    if (!modal) {
        return;
    }


    const values = {

        modalSeatNumber:
            student.seatNumber ||
            "-",

        modalStudentCode:
            student.studentCode ||
            student.id ||
            "-",

        modalStudentName:
            student.studentName ||
            student.name ||
            "-",

        modalFatherName:
            student.fatherName ||
            student.father ||
            "-",

        modalStudentClass:
            student.class ||
            "-",

        modalStudentShift:
            student.shift ||
            "-",

        modalStudentStatus:
            student.status ||
            "-",

        modalJoiningDate:
            student.joiningDate ||
            student.joining ||
            "-",

        modalExpiryDate:
            student.expiryDate ||
            student.expiry ||
            "-"

    };


    Object.keys(
        values
    ).forEach(
        (id) => {

            const element =
                seatEl(id);

            if (element) {

                element.textContent =
                    values[id];

            }

        }
    );


    modal.classList.add(
        "show"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );

}


/* ==========================================================================
   26. CLOSE STUDENT MODAL
   ========================================================================== */

function closeStudentModal() {

    const modal =
        seatEl(
            "studentModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "show"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* ==========================================================================
   27. CLICKABLE CARDS
   ========================================================================== */

function bindSeatCards() {

    const availableCard =
        seatEl(
            "availableCard"
        );


    const occupiedCard =
        seatEl(
            "occupiedCard"
        );


    if (availableCard) {

        availableCard.addEventListener(
            "click",
            () => {

                const expanded =
                    availableCard.classList.toggle(
                        "expanded"
                    );


                availableCard.setAttribute(
                    "aria-expanded",
                    expanded
                );


                const text =
                    seatEl(
                        "availableToggleText"
                    );


                if (text) {

                    text.textContent =
                        expanded
                            ? "Hide Details"
                            : "View Details";

                }

            }
        );


        availableCard.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key ===
                    "Enter" ||
                    event.key ===
                    " "
                ) {

                    event.preventDefault();

                    availableCard.click();

                }

            }
        );

    }


    if (occupiedCard) {

        occupiedCard.addEventListener(
            "click",
            (event) => {

                if (
                    event.target.closest(
                        ".student-item"
                    )
                ) {
                    return;
                }


                const expanded =
                    occupiedCard.classList.toggle(
                        "expanded"
                    );


                occupiedCard.setAttribute(
                    "aria-expanded",
                    expanded
                );


                const text =
                    seatEl(
                        "occupiedToggleText"
                    );


                if (text) {

                    text.textContent =
                        expanded
                            ? "Hide Details"
                            : "View Details";

                }

            }
        );


        occupiedCard.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key ===
                    "Enter" ||
                    event.key ===
                    " "
                ) {

                    event.preventDefault();

                    occupiedCard.click();

                }

            }
        );

    }

}


/* ==========================================================================
   28. STUDENT CLICK
   ========================================================================== */

function bindOccupiedStudentClicks() {

    const container =
        seatEl(
            "occupiedDetailsWrap"
        );


    if (!container) {
        return;
    }


    container.addEventListener(
        "click",
        (event) => {

            const item =
                event.target.closest(
                    ".student-item"
                );


            if (!item) {
                return;
            }


            const code =
                item.getAttribute(
                    "data-student-code"
                );


            if (!code) {
                return;
            }


            const student =
                seatsStudentMap[
                    code
                ];


            if (student) {

                openStudentModal(
                    student
                );

            }

        }
    );

}


/* ==========================================================================
   29. MODAL BUTTONS
   ========================================================================== */

function bindSeatModals() {

    const configureButton =
        seatEl(
            "btnConfigureCapacity"
        );


    const closeCapacity =
        seatEl(
            "closeCapacityModal"
        );


    const cancelCapacity =
        seatEl(
            "cancelCapacityBtn"
        );


    const capacityForm =
        seatEl(
            "capacityForm"
        );


    const closeStudent =
        seatEl(
            "closeStudentModal"
        );


    const closeStudentDetails =
        seatEl(
            "closeStudentDetailsBtn"
        );


    if (configureButton) {

        configureButton.addEventListener(
            "click",
            openCapacityModal
        );

    }


    if (closeCapacity) {

        closeCapacity.addEventListener(
            "click",
            closeCapacityModal
        );

    }


    if (cancelCapacity) {

        cancelCapacity.addEventListener(
            "click",
            closeCapacityModal
        );

    }


    if (capacityForm) {

        capacityForm.addEventListener(
            "submit",
            saveSeatCapacity
        );

    }


    if (closeStudent) {

        closeStudent.addEventListener(
            "click",
            closeStudentModal
        );

    }


    if (closeStudentDetails) {

        closeStudentDetails.addEventListener(
            "click",
            closeStudentModal
        );

    }


    document.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                seatEl(
                    "capacityModal"
                )
            ) {

                closeCapacityModal();

            }


            if (
                event.target ===
                seatEl(
                    "studentModal"
                )
            ) {

                closeStudentModal();

            }

        }
    );


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            closeCapacityModal();

            closeStudentModal();

        }
    );

}


/* ==========================================================================
   30. REALTIME STUDENT LISTENER
   ========================================================================== */

let seatsStudentUnsubscribe =
    null;


function startSeatStudentListener() {

    const libraryRef =
        getSeatLibraryRef();


    if (!libraryRef) {
        return;
    }


    if (
        typeof seatsStudentUnsubscribe ===
        "function"
    ) {

        seatsStudentUnsubscribe();

    }


    seatsStudentUnsubscribe =
        libraryRef
            .collection(
                "students"
            )
            .onSnapshot(

                (snapshot) => {

                    seatsStudents =
                        snapshot.docs.map(
                            (doc) => ({

                                id:
                                    doc.id,

                                ...doc.data()

                            })
                        );


                    seatsStudentMap =
                        {};


                    seatsStudents.forEach(
                        (student) => {

                            seatsStudentMap[
                                student.studentCode ||
                                student.id
                            ] =
                                student;

                        }
                    );


                    renderSeatSummary();

                    renderAvailableDetails();

                    renderOccupiedDetails();

                },

                (error) => {

                    console.error(
                        "[Seats] Realtime student listener error:",
                        error
                    );

                }

            );

}


/* ==========================================================================
   31. REALTIME CAPACITY LISTENER
   ========================================================================== */

let seatsCapacityUnsubscribe =
    null;


function startSeatCapacityListener() {

    const capacityRef =
        getCapacityRef();


    if (!capacityRef) {
        return;
    }


    if (
        typeof seatsCapacityUnsubscribe ===
        "function"
    ) {

        seatsCapacityUnsubscribe();

    }


    seatsCapacityUnsubscribe =
        capacityRef.onSnapshot(

            (snapshot) => {

                if (
                    snapshot.exists
                ) {

                    const data =
                        snapshot.data() ||
                        {};


                    seatsCapacity = {

                        total:
                            Number(
                                data.total ||
                                0
                            ),

                        morning:
                            Number(
                                data.morning ||
                                0
                            ),

                        afternoon:
                            Number(
                                data.afternoon ||
                                0
                            ),

                        evening:
                            Number(
                                data.evening ||
                                0
                            )

                    };

                } else {

                    seatsCapacity = {
                        total: 0,
                        morning: 0,
                        afternoon: 0,
                        evening: 0
                    };

                }


                renderSeatSummary();

                renderAvailableDetails();

            },

            (error) => {

                console.error(
                    "[Seats] Capacity realtime listener error:",
                    error
                );

            }

        );

}


/* ==========================================================================
   32. INITIALIZE
   ========================================================================== */

async function initializeSeatsModule() {

    if (
        !validateSeatSession()
    ) {
        return;
    }


    if (
        typeof firebase ===
        "undefined"
    ) {

        console.error(
            "[Seats] Firebase SDK not loaded."
        );

        showSeatAlert(
            "Firebase SDK not loaded.",
            "error"
        );

        return;

    }


    if (
        !window.db
    ) {

        console.error(
            "[Seats] Firestore instance unavailable."
        );

        showSeatAlert(
            "Database unavailable.",
            "error"
        );

        return;

    }


    bindSeatSearch();

    bindSeatCards();

    bindOccupiedStudentClicks();

    bindSeatModals();


    await loadSeatCapacity();

    await loadSeatStudents();


    startSeatCapacityListener();

    startSeatStudentListener();


    console.log(
        "[LibManage] New Seat Management module loaded."
    );

}


/* ==========================================================================
   33. START MODULE
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeSeatsModule();

    }
);


/* ==========================================================================
   34. PUBLIC API
   ========================================================================== */

window.LibManageSeats = {

    reload:
        async function () {

            await loadSeatCapacity();

            await loadSeatStudents();

        },

    openCapacity:
        openCapacityModal,

    closeCapacity:
        closeCapacityModal,

    getCapacity:
        function () {

            return {
                ...seatsCapacity
            };

        },

    getOccupied:
        getOccupiedStudents

};


console.log(
    "[LibManage] seats.js initialized."
);
