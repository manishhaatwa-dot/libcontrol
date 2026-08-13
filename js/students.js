/**
 * ==========================================================================
 * LIBMANAGE SAAS ECOSYSTEM ENGINE - STUDENT CRUD & AUTOMATIC SUBCOLLECTION UID
 * MOBILE NUMBER SUPPORT ADDED
 * DATE DISPLAY/FORM FORMAT = DD/MM/YYYY
 * FIREBASE STORAGE FORMAT = YYYY-MM-DD
 * ==========================================================================
 */

let currentActiveBranchId = "";
let localBranchStudentsArray = [];
let studentsUnsubscribeRef = null;
let isStudentDirectoryInitialized = false;

document.addEventListener('DOMContentLoaded', async () => {
    if (isStudentDirectoryInitialized) return;
    isStudentDirectoryInitialized = true;

    if (localStorage.getItem('session_role') !== 'admin') {
        window.location.href = "../index.html";
        return;
    }

    try {
        await loadSaaSLayoutComponent(
            'sidebar-container',
            '../components/sidebar.html',
            () => {
                if (typeof handleSidebarActivation === 'function') {
                    handleSidebarActivation();
                }
            }
        );

        await loadSaaSLayoutComponent(
            'navbar-container',
            '../components/navbar.html',
            () => {
                if (typeof bindNavbarInteractions === 'function') {
                    bindNavbarInteractions();
                }
            }
        );

        await loadSaaSLayoutComponent(
            'footer-container',
            '../components/footer.html'
        );

    } catch (error) {
        console.error('[Layout Loader Error]:', error);
    }

    waitForFirebaseAndInitialize();
});


/**
 * ==========================================================================
 * FIREBASE READY WAIT ENGINE
 * ==========================================================================
 */

function waitForFirebaseAndInitialize() {

    let attempts = 0;
    const maxAttempts = 20;

    function checkFirebaseReady() {

        attempts++;

        const firebaseAvailable =
            typeof firebase !== "undefined";

        const firebaseInitialized =
            firebaseAvailable &&
            firebase.apps &&
            firebase.apps.length > 0;

        const firestoreReady =
            !!window.db;

        if (
            firebaseAvailable &&
            firebaseInitialized &&
            firestoreReady
        ) {
            console.log(
                '[Student Directory] Firebase + Firestore ready.'
            );

            initializeStudentDirectoryModule();
            return;
        }

        if (attempts >= maxAttempts) {

            console.error(
                '[Firebase Bootstrap Timeout]: Firebase/Firestore was not ready.',
                {
                    firebaseExists: firebaseAvailable,
                    firebaseApps:
                        firebaseAvailable && firebase.apps
                            ? firebase.apps.length
                            : 0,
                    dbExists: firestoreReady
                }
            );

            alert(
                'Database Engine Offline: Firebase could not be initialized. Please reload the page once.'
            );

            return;
        }

        setTimeout(
            checkFirebaseReady,
            250
        );
    }

    checkFirebaseReady();
}


/**
 * ==========================================================================
 * STUDENT DIRECTORY INITIALIZATION
 * ==========================================================================
 */

function initializeStudentDirectoryModule() {

    currentActiveBranchId =
        localStorage.getItem('session_library_id');

    const db = window.db;

    if (!currentActiveBranchId) {

        alert(
            'Session Error: Current library context is missing.'
        );

        return;
    }

    if (!db) {

        alert(
            'Database Engine Offline: Unified cloud storage reference mapping missing.'
        );

        return;
    }

    const searchInput =
        document.getElementById('student-search-input');

    const openModalBtn =
        document.getElementById('open-add-modal-btn');

    const closeModalBtn =
        document.getElementById('close-modal-btn');

    const cancelFormBtn =
        document.getElementById('cancel-form-btn');

    const registrationForm =
        document.getElementById('student-form');

    const modal =
        document.getElementById('student-modal');


    if (searchInput) {

        searchInput.removeEventListener(
            'input',
            executeStudentDirectorySearchFilter
        );

        searchInput.addEventListener(
            'input',
            executeStudentDirectorySearchFilter
        );
    }


    if (openModalBtn) {

        openModalBtn.removeEventListener(
            'click',
            handleOpenAddStudentModal
        );

        openModalBtn.addEventListener(
            'click',
            handleOpenAddStudentModal
        );
    }


    if (closeModalBtn) {

        closeModalBtn.removeEventListener(
            'click',
            triggerStudentFormModalClose
        );

        closeModalBtn.addEventListener(
            'click',
            triggerStudentFormModalClose
        );
    }


    if (cancelFormBtn) {

        cancelFormBtn.removeEventListener(
            'click',
            triggerStudentFormModalClose
        );

        cancelFormBtn.addEventListener(
            'click',
            triggerStudentFormModalClose
        );
    }


    if (registrationForm) {

        registrationForm.removeEventListener(
            'submit',
            commitStudentDirectoryMutationAction
        );

        registrationForm.addEventListener(
            'submit',
            commitStudentDirectoryMutationAction
        );
    }


    if (modal) {

        modal.removeEventListener(
            'click',
            handleModalBackdropDismiss
        );

        modal.addEventListener(
            'click',
            handleModalBackdropDismiss
        );
    }


    /*
     * DATE INPUT FORMATTER
     */
    bindDateFormatInputs();


    if (studentsUnsubscribeRef) {

        studentsUnsubscribeRef();
        studentsUnsubscribeRef = null;
    }


    /**
     * FIRESTORE REALTIME STUDENT LISTENER
     */

    studentsUnsubscribeRef = db
        .collection('saas_libraries')
        .doc(currentActiveBranchId)
        .collection('students')
        .onSnapshot(

            (snapshot) => {

                localBranchStudentsArray = [];

                snapshot.forEach((doc) => {

                    if (doc.id === 'anchor_node') {
                        return;
                    }

                    const data =
                        doc.data() || {};

                    localBranchStudentsArray.push({

                        studentCode:
                            data.studentCode || doc.id,

                        libraryId:
                            data.libraryId ||
                            currentActiveBranchId,

                        name:
                            data.name || '',

                        fatherName:
                            data.fatherName || '',

                        studentClass:
                            data.studentClass || '',

                        seatNumber:
                            data.seatNumber || '',

                        /*
                         * MOBILE NUMBER
                         */
                        mobile:
                            data.mobile || '',

                        joiningDate:
                            data.joiningDate || '',

                        expiryDate:
                            data.expiryDate || '',

                        status:
                            data.status || '',

                        shift:
                            data.shift || '',

                        updatedAt:
                            data.updatedAt || null
                    });
                });

                paintStudentDirectoryTableGrid(
                    localBranchStudentsArray
                );
            },

            (error) => {

                console.error(
                    '[Firestore Student Subcollection Snapshot Stream Fault Exception]:',
                    error
                );

                alert(
                    'Unable to load students in realtime. Please check Firestore permissions or connectivity.'
                );
            }
        );
}


/**
 * ==========================================================================
 * DATE FORMAT HELPERS
 * ==========================================================================
 */

/*
 * Firebase:
 * YYYY-MM-DD
 *
 * Website:
 * DD/MM/YYYY
 */

function formatDisplayDate(value) {

    const dateString =
        String(value == null ? '' : value).trim();

    if (!dateString) {
        return '';
    }

    const parts = dateString.split('-');

    if (parts.length === 3) {

        const year = parts[0];
        const month = parts[1];
        const day = parts[2];

        if (
            year.length === 4 &&
            month.length >= 1 &&
            day.length >= 1
        ) {
            return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
        }
    }

    return dateString;
}


/*
 * Firebase YYYY-MM-DD
 * -> Form DD/MM/YYYY
 */

function formatDateForForm(value) {

    return formatDisplayDate(value);
}


/*
 * Form DD/MM/YYYY
 * -> Firebase YYYY-MM-DD
 */

function convertFormDateToFirebase(value) {

    const dateString =
        String(value == null ? '' : value).trim();

    if (!dateString) {
        return '';
    }

    const parts = dateString.split('/');

    if (parts.length !== 3) {
        return '';
    }

    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];

    if (
        year.length !== 4 ||
        day.length !== 2 ||
        month.length !== 2
    ) {
        return '';
    }

    return `${year}-${month}-${day}`;
}


/*
 * Auto DD/MM/YYYY while typing
 */

function bindDateFormatInputs() {

    const joiningInput =
        document.getElementById('std-joining');

    const expiryInput =
        document.getElementById('std-expiry');


    function formatTyping(event) {

        let value =
            event.target.value.replace(/\D/g, '');

        if (value.length > 8) {
            value = value.substring(0, 8);
        }

        if (value.length > 4) {

            value =
                value.substring(0, 2) +
                '/' +
                value.substring(2, 4) +
                '/' +
                value.substring(4);

        } else if (value.length > 2) {

            value =
                value.substring(0, 2) +
                '/' +
                value.substring(2);

        }

        event.target.value = value;
    }


    if (joiningInput) {

        joiningInput.removeEventListener(
            'input',
            formatTyping
        );

        joiningInput.addEventListener(
            'input',
            formatTyping
        );
    }


    if (expiryInput) {

        expiryInput.removeEventListener(
            'input',
            formatTyping
        );

        expiryInput.addEventListener(
            'input',
            formatTyping
        );
    }
}


/**
 * ==========================================================================
 * OPEN STUDENT MODAL
 * ==========================================================================
 */

function handleOpenAddStudentModal() {

    triggerStudentFormModalOpen(false);
}


/**
 * ==========================================================================
 * MODAL BACKDROP
 * ==========================================================================
 */

function handleModalBackdropDismiss(event) {

    if (
        event.target &&
        event.target.id === 'student-modal'
    ) {

        triggerStudentFormModalClose();
    }
}


/**
 * ==========================================================================
 * HTML ESCAPE
 * ==========================================================================
 */

function escapeHtml(value) {

    return String(
        value == null ? '' : value
    )
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}


/**
 * ==========================================================================
 * SEARCH NORMALIZATION
 * ==========================================================================
 */

function normalizeSearchText(value) {

    return String(
        value == null ? '' : value
    )
        .trim()
        .toLowerCase();
}


/**
 * ==========================================================================
 * UPPERCASE NORMALIZATION
 * ==========================================================================
 */

function safeUpper(value) {

    return String(
        value == null ? '' : value
    )
        .trim()
        .toUpperCase();
}


/**
 * ==========================================================================
 * PAINT STUDENT TABLE
 * ==========================================================================
 */

function paintStudentDirectoryTableGrid(dataset) {

    const tableBody =
        document.getElementById(
            'students-table-rows'
        );

    if (!tableBody) return;


    if (
        !Array.isArray(dataset) ||
        dataset.length === 0
    ) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="table-empty"
                    style="
                        text-align:center;
                        padding:2rem;
                        font-style:italic;
                        color:var(--text-muted);
                    "
                >
                    No student records registered under this library branch.
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML =
        dataset.map((student) => {

            const studentCode =
                escapeHtml(
                    student.studentCode || ''
                );

            const seatNumber =
                escapeHtml(
                    safeUpper(
                        student.seatNumber || ''
                    )
                );

            const name =
                escapeHtml(
                    student.name || ''
                );

            const fatherName =
                escapeHtml(
                    student.fatherName || ''
                );

            const studentClass =
                escapeHtml(
                    student.studentClass || ''
                );

            /*
             * DATE DISPLAY ONLY
             */
            const joiningDate =
                escapeHtml(
                    formatDisplayDate(
                        student.joiningDate || ''
                    )
                );

            const expiryDate =
                escapeHtml(
                    formatDisplayDate(
                        student.expiryDate || ''
                    )
                );

            const status =
                escapeHtml(
                    student.status || ''
                );

            const safeStudentCodeAttr =
                encodeURIComponent(
                    student.studentCode || ''
                );

            const tagStatusHueClass =
                String(
                    student.status || ''
                ).toLowerCase() === 'active'
                    ? 'active'
                    : 'expired';


            return `
                <tr>

                    <td>
                        <code
                            style="
                                font-weight:700;
                                color:var(--primary-color);
                                font-size:0.9rem;
                            "
                        >
                            ${studentCode || 'N/A'}
                        </code>
                    </td>

                    <td>
                        <strong>
                            ${seatNumber || 'N/A'}
                        </strong>
                    </td>

                    <td>
                        <strong>
                            ${name || 'N/A'}
                        </strong>
                    </td>

                    <td>
                        ${fatherName || 'N/A'}
                    </td>

                    <td>
                        <span
                            style="
                                background:rgba(0,0,0,0.03);
                                padding:0.2rem 0.4rem;
                                border-radius:4px;
                                font-weight:500;
                            "
                        >
                            ${studentClass || 'N/A'}
                        </span>
                    </td>

                    <td>
                        ${joiningDate || 'N/A'}
                    </td>

                    <td>
                        ${expiryDate || 'N/A'}
                    </td>

                    <td>
                        <span
                            class="status-tag ${tagStatusHueClass}"
                        >
                            ${status || 'N/A'}
                        </span>
                    </td>

                    <td>

                        <div class="actions-cell-wrapper">

                            <button
                                class="action-icon-btn edit-btn"
                                data-student-code="${safeStudentCodeAttr}"
                                onclick="
                                    routeProfileToEditPipeline(
                                        decodeURIComponent(
                                            this.dataset.studentCode
                                        )
                                    )
                                "
                                title="Modify Profile Options"
                            >
                                ✏️
                            </button>


                            <button
                                class="action-icon-btn delete-btn"
                                data-student-code="${safeStudentCodeAttr}"
                                onclick="
                                    routeProfileToDeletePipeline(
                                        decodeURIComponent(
                                            this.dataset.studentCode
                                        )
                                    )
                                "
                                title="Purge Record completely"
                            >
                                🗑️
                            </button>

                        </div>

                    </td>

                </tr>
            `;

        }).join('');
}


/**
 * ==========================================================================
 * STUDENT MODAL OPEN
 * ==========================================================================
 */

function triggerStudentFormModalOpen(
    isEditMode = false
) {

    const modal =
        document.getElementById(
            'student-modal'
        );

    const titleNode =
        document.getElementById(
            'modal-title-context'
        );

    const displayCodeBlock =
        document.getElementById(
            'modal-code-display-block'
        );

    const previewCodeNode =
        document.getElementById(
            'modal-student-code-preview'
        );

    const form =
        document.getElementById(
            'student-form'
        );

    const editIndexNode =
        document.getElementById(
            'form-edit-index'
        );

    const studentCodeNode =
        document.getElementById(
            'form-student-code'
        );

    const shiftNode =
        document.getElementById(
            'std-shift'
        );


    if (!modal || !form) {
        return;
    }


    if (!isEditMode) {

        form.reset();

        if (editIndexNode) {
            editIndexNode.value = '';
        }

        if (studentCodeNode) {
            studentCodeNode.value = '';
        }

        if (shiftNode) {
            shiftNode.value = '';
        }

        if (titleNode) {
            titleNode.innerText =
                'Register New Library Member';
        }

        if (displayCodeBlock) {
            displayCodeBlock.classList.add(
                'hide-element'
            );
        }

        if (previewCodeNode) {
            previewCodeNode.innerText = '';
        }

    } else {

        if (titleNode) {
            titleNode.innerText =
                'Modify Member Registration Profile';
        }

        if (displayCodeBlock) {
            displayCodeBlock.classList.remove(
                'hide-element'
            );
        }
    }


    modal.classList.add('active');
}


/**
 * ==========================================================================
 * CLOSE MODAL
 * ==========================================================================
 */

function triggerStudentFormModalClose() {

    const modal =
        document.getElementById(
            'student-modal'
        );

    if (modal) {
        modal.classList.remove('active');
    }
}


/**
 * ==========================================================================
 * SAVE / UPDATE STUDENT
 * ==========================================================================
 */

async function commitStudentDirectoryMutationAction(
    event
) {

    event.preventDefault();


    const db =
        window.db;


    if (!db) {

        alert(
            'Database Engine Offline: Cloud transactions cannot process without active global mappings.'
        );

        return;
    }


    if (!currentActiveBranchId) {

        alert(
            'Session Error: Current library context is missing.'
        );

        return;
    }


    const editIndexRawValue =
        document.getElementById(
            'form-edit-index'
        )
            ? document.getElementById(
                'form-edit-index'
            ).value
            : '';


    const existingStudentCode =
        document.getElementById(
            'form-student-code'
        )
            ? document.getElementById(
                'form-student-code'
            ).value.trim()
            : '';


    const name =
        (
            document.getElementById(
                'std-name'
            )?.value || ''
        ).trim();


    const fatherName =
        (
            document.getElementById(
                'std-father'
            )?.value || ''
        ).trim();


    const studentClass =
        (
            document.getElementById(
                'std-class'
            )?.value || ''
        ).trim();


    const seatNumber =
        safeUpper(
            document.getElementById(
                'std-seat'
            )?.value || ''
        );


    /*
     * MOBILE NUMBER
     */
    const mobile =
        (
            document.getElementById(
                'std-mobile'
            )?.value || ''
        ).trim();


    /*
     * FORM DATE = DD/MM/YYYY
     * FIREBASE DATE = YYYY-MM-DD
     */
    const joiningDateForm =
        (
            document.getElementById(
                'std-joining'
            )?.value || ''
        ).trim();


    const expiryDateForm =
        (
            document.getElementById(
                'std-expiry'
            )?.value || ''
        ).trim();


    const joiningDate =
        convertFormDateToFirebase(
            joiningDateForm
        );


    const expiryDate =
        convertFormDateToFirebase(
            expiryDateForm
        );


    const status =
        (
            document.getElementById(
                'std-status'
            )?.value || ''
        ).trim();


    const shift =
        (
            document.getElementById(
                'std-shift'
            )?.value || ''
        ).trim();


    if (!shift) {

        alert(
            'Validation Error: Please select a shift.'
        );

        return;
    }


    if (
        !name ||
        !fatherName ||
        !studentClass ||
        !seatNumber ||
        !mobile ||
        !joiningDate ||
        !expiryDate ||
        !status
    ) {

        alert(
            'Validation Error: Please fill all required student fields.'
        );

        return;
    }


    const isSeatOccupiedConflict =
        localBranchStudentsArray.some(
            (std) => {

                if (!std) {
                    return false;
                }

                if (
                    existingStudentCode !== '' &&
                    std.studentCode === existingStudentCode
                ) {
                    return false;
                }

                return (
                    safeUpper(
                        std.seatNumber
                    ) === seatNumber
                );
            }
        );


    if (isSeatOccupiedConflict) {

        alert(
            `Validation Conflict: Seat "${seatNumber}" is currently assigned to another record within this library.`
        );

        return;
    }


    let finalStudentUniqueTokenCode =
        existingStudentCode;


    /**
     * NEW STUDENT CODE GENERATION
     */

    if (editIndexRawValue === '') {

        const shortLibraryKeySegment =
            String(
                currentActiveBranchId
            )
                .replace('LIB-', '')
                .substring(0, 4);


        let generatedCode = '';

        let collisionDetected = true;

        let safetyCounter = 0;


        while (
            collisionDetected &&
            safetyCounter < 25
        ) {

            const randomEntropyString =
                Math.floor(
                    100 +
                    Math.random() * 900
                );


            generatedCode =
                `${shortLibraryKeySegment}-${seatNumber}-${randomEntropyString}`
                    .toUpperCase();


            collisionDetected =
                localBranchStudentsArray.some(
                    (std) =>
                        std &&
                        std.studentCode === generatedCode
                );


            safetyCounter++;
        }


        if (collisionDetected) {

            alert(
                'Unique Code Generation Error: Unable to generate a unique student code right now. Please try again.'
            );

            return;
        }


        finalStudentUniqueTokenCode =
            generatedCode;
    }


    /**
     * FIRESTORE PAYLOAD
     */

    const payloadStudentModel = {

        studentCode:
            finalStudentUniqueTokenCode,

        libraryId:
            currentActiveBranchId,

        name:
            name,

        fatherName:
            fatherName,

        studentClass:
            studentClass,

        seatNumber:
            seatNumber,

        /*
         * MOBILE NUMBER SAVED IN FIRESTORE
         */
        mobile:
            mobile,

        /*
         * FIREBASE FORMAT
         * YYYY-MM-DD
         */
        joiningDate:
            joiningDate,

        expiryDate:
            expiryDate,

        status:
            status,

        shift:
            shift,

        updatedAt:
            firebase.firestore.FieldValue.serverTimestamp()
    };


    try {

        await db
            .collection(
                'saas_libraries'
            )
            .doc(
                currentActiveBranchId
            )
            .collection(
                'students'
            )
            .doc(
                finalStudentUniqueTokenCode
            )
            .set(
                payloadStudentModel
            );


        triggerStudentFormModalClose();


    } catch (error) {

        console.error(
            '[Firestore Student Document Mutation Write Fault Error Exception]:',
            error
        );


        alert(
            `Cloud write operations failure exception caught inside registry transaction channels: ${error.message}`
        );
    }
}


/**
 * ==========================================================================
 * SEARCH
 * ==========================================================================
 */

function executeStudentDirectorySearchFilter() {

    const searchInput =
        document.getElementById(
            'student-search-input'
        );


    const rawKeyword =
        searchInput
            ? searchInput.value
            : '';


    const keyword =
        normalizeSearchText(
            rawKeyword
        );


    if (!keyword) {

        paintStudentDirectoryTableGrid(
            localBranchStudentsArray
        );

        return;
    }


    const filteredArray =
        localBranchStudentsArray.filter(
            (student) => {

                const searchableString =
                    normalizeSearchText(

                        [
                            student.studentCode,
                            student.name,
                            student.fatherName,
                            student.studentClass,
                            student.seatNumber,

                            /*
                             * MOBILE SEARCH
                             */
                            student.mobile,

                            student.joiningDate,
                            student.expiryDate,
                            student.status,
                            student.shift

                        ].join(' ')
                    );


                return searchableString.includes(
                    keyword
                );
            }
        );


    paintStudentDirectoryTableGrid(
        filteredArray
    );
}


/**
 * ==========================================================================
 * EDIT STUDENT
 * ==========================================================================
 */

async function routeProfileToEditPipeline(
    studentCode
) {

    const existingStudent =
        localBranchStudentsArray.find(
            (item) =>
                item.studentCode === studentCode
        );


    if (!existingStudent) {

        alert(
            'Unable to locate the selected student profile.'
        );

        return;
    }


    const editIndexNode =
        document.getElementById(
            'form-edit-index'
        );


    const studentCodeNode =
        document.getElementById(
            'form-student-code'
        );


    const previewCodeNode =
        document.getElementById(
            'modal-student-code-preview'
        );


    if (editIndexNode) {

        editIndexNode.value =
            'EDIT_MODE_ACTIVE';
    }


    if (studentCodeNode) {

        studentCodeNode.value =
            existingStudent.studentCode || '';
    }


    if (previewCodeNode) {

        previewCodeNode.innerText =
            existingStudent.studentCode || '';
    }


    const nameNode =
        document.getElementById(
            'std-name'
        );


    const fatherNode =
        document.getElementById(
            'std-father'
        );


    const classNode =
        document.getElementById(
            'std-class'
        );


    const seatNode =
        document.getElementById(
            'std-seat'
        );


    const mobileNode =
        document.getElementById(
            'std-mobile'
        );


    const joiningNode =
        document.getElementById(
            'std-joining'
        );


    const expiryNode =
        document.getElementById(
            'std-expiry'
        );


    const statusNode =
        document.getElementById(
            'std-status'
        );


    const shiftNode =
        document.getElementById(
            'std-shift'
        );


    if (nameNode) {

        nameNode.value =
            existingStudent.name || '';
    }


    if (fatherNode) {

        fatherNode.value =
            existingStudent.fatherName || '';
    }


    if (classNode) {

        classNode.value =
            existingStudent.studentClass || '';
    }


    if (seatNode) {

        seatNode.value =
            existingStudent.seatNumber || '';
    }


    /*
     * MOBILE NUMBER RESTORED DURING EDIT
     */
    if (mobileNode) {

        mobileNode.value =
            existingStudent.mobile || '';
    }


    /*
     * DATE RESTORED IN DD/MM/YYYY FORMAT
     */
    if (joiningNode) {

        joiningNode.value =
            formatDateForForm(
                existingStudent.joiningDate || ''
            );
    }


    if (expiryNode) {

        expiryNode.value =
            formatDateForForm(
                existingStudent.expiryDate || ''
            );
    }


    if (statusNode) {

        statusNode.value =
            existingStudent.status || '';
    }


    if (shiftNode) {

        shiftNode.value =
            existingStudent.shift || '';
    }


    triggerStudentFormModalOpen(true);
}


/**
 * ==========================================================================
 * DELETE STUDENT
 * ==========================================================================
 */

async function routeProfileToDeletePipeline(
    studentCode
) {

    const db =
        window.db;


    if (!db) {

        alert(
            'Database Engine Offline: Cloud delete execution unavailable.'
        );

        return;
    }


    if (!currentActiveBranchId) {

        alert(
            'Session Error: Current library context is missing.'
        );

        return;
    }


    const confirmed =
        confirm(
            `Are you sure you want to delete student "${studentCode}" permanently?`
        );


    if (!confirmed) {
        return;
    }


    try {

        await db
            .collection(
                'saas_libraries'
            )
            .doc(
                currentActiveBranchId
            )
            .collection(
                'students'
            )
            .doc(
                studentCode
            )
            .delete();


    } catch (error) {

        console.error(
            '[Firestore Student Record Delete Fault Exception]:',
            error
        );


        alert(
            `Delete operation failed: ${error.message}`
        );
    }
}


/**
 * ==========================================================================
 * GLOBAL WINDOW BINDINGS
 * ==========================================================================
 */

window.routeProfileToEditPipeline =
    routeProfileToEditPipeline;

window.routeProfileToDeletePipeline =
    routeProfileToDeletePipeline;
