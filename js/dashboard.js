/**
 * ==========================================================================
 * LIBMANAGE - SHARED CORE ENGINE
 * ==========================================================================
 *
 * This file is shared by:
 *
 * index.html
 * manager-login.html
 * manager-dashboard.html
 * admin-dashboard.html
 * students.html
 * attendance.html
 * seats.html
 * student-dashboard.html
 *
 * IMPORTANT:
 * This NEW application uses its own Firestore namespace.
 *
 * OLD:
 *     saas_libraries
 *
 * NEW:
 *     libmanage_secure_v2
 *
 * This file NEVER reads/writes/deletes the old saas_libraries collection.
 *
 * ==========================================================================
 */


/* ==========================================================================
   1. FIREBASE CONFIG
   ========================================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyCUe84QnEA5DY31DXtzM-7M4Xu5bSa8xO8",
    authDomain: "appointment-app-cb979.firebaseapp.com",
    projectId: "appointment-app-cb979",
    storageBucket: "appointment-app-cb979.firebasestorage.app",
    messagingSenderId: "596931961212",
    appId: "1:596931961212:web:adc604e0a47f63fd9104f9"
};


/* ==========================================================================
   2. NEW APP DATABASE NAMESPACE
   ========================================================================== */

const LIBMANAGE_ROOT =
    "libmanage_secure_v2";

const LIBMANAGE_SCHEMA_VERSION =
    "1.0";


/* ==========================================================================
   3. FIREBASE INITIALIZATION
   ========================================================================== */

(function initializeFirebase() {

    if (typeof firebase === "undefined") {

        console.error(
            "[LibManage] Firebase SDK not loaded."
        );

        return;
    }

    try {

        if (!firebase.apps.length) {

            firebase.initializeApp(
                firebaseConfig
            );

        }

        window.db =
            firebase.firestore();

        window.firebaseConfig =
            firebaseConfig;

        window.LIBMANAGE_ROOT =
            LIBMANAGE_ROOT;

        console.log(
            "[LibManage] Firebase initialized."
        );

        console.log(
            "[LibManage] New database namespace:",
            LIBMANAGE_ROOT
        );

    } catch (error) {

        console.error(
            "[LibManage] Firebase initialization error:",
            error
        );

    }

})();


/* ==========================================================================
   4. NORMALIZATION
   ========================================================================== */

function normalizeLibraryId(value) {

    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");

}


function normalizeStudentCode(value) {

    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");

}


/* ==========================================================================
   5. FIRESTORE STRUCTURE
   ==========================================================================
   
   libmanage_secure_v2
       └── libraries
           └── records
               └── LIBRARY_ID
                   ├── students
                   ├── attendance
                   ├── notices
                   └── configuration
                       ├── seats
                       └── general

   ========================================================================== */


/* --------------------------------------------------------------------------
   Libraries
-------------------------------------------------------------------------- */

function librariesRef() {

    if (!window.db) {
        throw new Error(
            "Firestore is not initialized."
        );
    }

    return window.db
        .collection(LIBMANAGE_ROOT)
        .doc("libraries")
        .collection("records");

}


/* --------------------------------------------------------------------------
   Single Library
-------------------------------------------------------------------------- */

function libraryRef(libraryId) {

    const id =
        normalizeLibraryId(
            libraryId
        );

    if (!id) {
        throw new Error(
            "Invalid Library ID."
        );
    }

    return librariesRef().doc(id);

}


/* --------------------------------------------------------------------------
   Students
-------------------------------------------------------------------------- */

function studentsRef(libraryId) {

    return libraryRef(
        libraryId
    ).collection("students");

}


function studentRef(
    libraryId,
    studentCode
) {

    const code =
        normalizeStudentCode(
            studentCode
        );

    if (!code) {
        throw new Error(
            "Invalid Student Code."
        );
    }

    return studentsRef(
        libraryId
    ).doc(code);

}


/* --------------------------------------------------------------------------
   Attendance
-------------------------------------------------------------------------- */

function attendanceRef(libraryId) {

    return libraryRef(
        libraryId
    ).collection("attendance");

}


/* --------------------------------------------------------------------------
   Notices
-------------------------------------------------------------------------- */

function noticesRef(libraryId) {

    return libraryRef(
        libraryId
    ).collection("notices");

}


/* --------------------------------------------------------------------------
   Seat Configuration
-------------------------------------------------------------------------- */

function seatConfigRef(libraryId) {

    return libraryRef(
        libraryId
    )
    .collection("configuration")
    .doc("seats");

}


/* --------------------------------------------------------------------------
   General Configuration
-------------------------------------------------------------------------- */

function generalConfigRef(libraryId) {

    return libraryRef(
        libraryId
    )
    .collection("configuration")
    .doc("general");

}


/* ==========================================================================
   6. GLOBAL DATABASE HELPERS
   ========================================================================== */

window.LibManageDB = {

    root:
        LIBMANAGE_ROOT,

    libraries:
        librariesRef,

    library:
        libraryRef,

    students:
        studentsRef,

    student:
        studentRef,

    attendance:
        attendanceRef,

    notices:
        noticesRef,

    seatConfig:
        seatConfigRef,

    generalConfig:
        generalConfigRef

};


/* ==========================================================================
   7. SESSION KEYS
   ========================================================================== */

const SESSION_KEYS = {

    role:
        "session_role",

    libraryId:
        "session_library_id",

    libraryName:
        "session_library_name",

    studentCode:
        "session_student_code",

    studentSeat:
        "session_student_seat"

};


/* ==========================================================================
   8. SESSION FUNCTIONS
   ========================================================================== */

function getCurrentSession() {

    return {

        role:
            localStorage.getItem(
                SESSION_KEYS.role
            ),

        libraryId:
            localStorage.getItem(
                SESSION_KEYS.libraryId
            ),

        libraryName:
            localStorage.getItem(
                SESSION_KEYS.libraryName
            ),

        studentCode:
            localStorage.getItem(
                SESSION_KEYS.studentCode
            ),

        studentSeat:
            localStorage.getItem(
                SESSION_KEYS.studentSeat
            )

    };

}


window.getCurrentSession =
    getCurrentSession;


function clearLibManageSession() {

    Object.keys(
        SESSION_KEYS
    ).forEach(
        (key) => {

            localStorage.removeItem(
                SESSION_KEYS[key]
            );

        }
    );

}


/* ==========================================================================
   9. PATH HELPERS
   ========================================================================== */

function getRootIndexPath() {

    if (
        window.location.pathname.includes(
            "/pages/"
        )
    ) {

        return "../index.html";

    }

    return "index.html";

}


function getPagePath(fileName) {

    if (
        window.location.pathname.includes(
            "/pages/"
        )
    ) {

        return fileName;

    }

    return "pages/" + fileName;

}


/* ==========================================================================
   10. LIBRARY ACCESS VALIDATION
   ========================================================================== */

async function validateLibrary(
    libraryId
) {

    const id =
        normalizeLibraryId(
            libraryId
        );

    if (!id) {

        return {

            valid: false,

            reason:
                "INVALID_LIBRARY"

        };

    }

    try {

        const snapshot =
            await libraryRef(
                id
            ).get();


        if (!snapshot.exists) {

            return {

                valid: false,

                reason:
                    "NOT_FOUND"

            };

        }


        const data =
            snapshot.data() || {};


        if (
            String(
                data.status || ""
            ).toLowerCase() !==
            "approved"
        ) {

            return {

                valid: false,

                reason:
                    "NOT_APPROVED",

                data:
                    data

            };

        }


        if (
            data.enabled === false
        ) {

            return {

                valid: false,

                reason:
                    "DISABLED",

                data:
                    data

            };

        }


        return {

            valid: true,

            data:
                data

        };


    } catch (error) {

        console.error(
            "[LibManage] Library validation error:",
            error
        );

        return {

            valid: false,

            reason:
                "DATABASE_ERROR",

            error:
                error

        };

    }

}


window.validateLibrary =
    validateLibrary;


/* ==========================================================================
   11. STUDENT LOGIN
   ========================================================================== */

async function studentLogin(
    libraryId,
    studentCode
) {

    const id =
        normalizeLibraryId(
            libraryId
        );

    const code =
        normalizeStudentCode(
            studentCode
        );


    if (!id || !code) {

        return {

            success: false,

            message:
                "Please enter Library ID and Student Code."

        };

    }


    if (!window.db) {

        return {

            success: false,

            message:
                "Database Engine Offline."

        };

    }


    try {

        const libraryResult =
            await validateLibrary(
                id
            );


        if (!libraryResult.valid) {

            if (
                libraryResult.reason ===
                "NOT_FOUND"
            ) {

                return {

                    success: false,

                    message:
                        "Library not found."

                };

            }


            if (
                libraryResult.reason ===
                "NOT_APPROVED"
            ) {

                return {

                    success: false,

                    message:
                        "Access Blocked: This library is awaiting approval."

                };

            }


            if (
                libraryResult.reason ===
                "DISABLED"
            ) {

                return {

                    success: false,

                    message:
                        "Access Suspended: This library is currently disabled."

                };

            }


            return {

                success: false,

                message:
                    "Unable to verify library."

            };

        }


        const studentSnapshot =
            await studentRef(
                id,
                code
            ).get();


        if (!studentSnapshot.exists) {

            return {

                success: false,

                message:
                    "Login Failed: Invalid Library ID or Student Code."

            };

        }


        const studentData =
            studentSnapshot.data() || {};


        if (
            String(
                studentData.status || ""
            ).toLowerCase() ===
            "expired"
        ) {

            return {

                success: false,

                message:
                    "Access Denied: Your membership has expired."

            };

        }


        /*
         * Start NEW student session.
         */

        clearLibManageSession();


        localStorage.setItem(
            SESSION_KEYS.role,
            "student"
        );


        localStorage.setItem(
            SESSION_KEYS.libraryId,
            id
        );


        localStorage.setItem(
            SESSION_KEYS.libraryName,
            libraryResult.data.name ||
            "Library"
        );


        localStorage.setItem(
            SESSION_KEYS.studentCode,
            studentData.studentCode ||
            code
        );


        localStorage.setItem(
            SESSION_KEYS.studentSeat,
            studentData.seatNumber ||
            ""
        );


        return {

            success: true,

            student:
                studentData,

            library:
                libraryResult.data

        };


    } catch (error) {

        console.error(
            "[LibManage] Student login error:",
            error
        );

        return {

            success: false,

            message:
                "Cloud synchronization failed."

        };

    }

}


window.studentLogin =
    studentLogin;


/* ==========================================================================
   12. ADMIN LOGIN
   ========================================================================== */

/*
 * NOTE:
 *
 * This compatibility login keeps the same current UI behaviour.
 *
 * Later, when manager/admin Firebase Authentication is connected,
 * this function will be changed to Firebase Auth.
 *
 * No old database is touched.
 */

async function adminLogin(
    libraryId,
    password
) {

    const id =
        normalizeLibraryId(
            libraryId
        );

    const pass =
        String(password || "");


    if (!id || !pass) {

        return {

            success: false,

            message:
                "Please enter Library ID and Password."

        };

    }


    if (!window.db) {

        return {

            success: false,

            message:
                "Database Engine Offline."

        };

    }


    try {

        const libraryResult =
            await validateLibrary(
                id
            );


        if (!libraryResult.valid) {

            if (
                libraryResult.reason ===
                "NOT_FOUND"
            ) {

                return {

                    success: false,

                    message:
                        "Login Failed: Invalid Library ID or Password."

                };

            }


            if (
                libraryResult.reason ===
                "NOT_APPROVED"
            ) {

                return {

                    success: false,

                    message:
                        "Access Restricted: Library awaiting approval."

                };

            }


            if (
                libraryResult.reason ===
                "DISABLED"
            ) {

                return {

                    success: false,

                    message:
                        "Access Suspended: Library disabled."

                };

            }


            return {

                success: false,

                message:
                    "Unable to verify library."

            };

        }


        const libraryData =
            libraryResult.data || {};


        /*
         * Current compatibility check.
         *
         * This will later be replaced by Firebase Authentication.
         */

        if (
            String(
                libraryData.adminPass || ""
            ) !==
            pass
        ) {

            return {

                success: false,

                message:
                    "Login Failed: Invalid Library ID or Password."

            };

        }


        clearLibManageSession();


        localStorage.setItem(
            SESSION_KEYS.role,
            "admin"
        );


        localStorage.setItem(
            SESSION_KEYS.libraryId,
            libraryData.libraryId ||
            id
        );


        localStorage.setItem(
            SESSION_KEYS.libraryName,
            libraryData.name ||
            "Library"
        );


        return {

            success: true,

            library:
                libraryData

        };


    } catch (error) {

        console.error(
            "[LibManage] Admin login error:",
            error
        );

        return {

            success: false,

            message:
                "Cloud synchronization failed."

        };

    }

}


window.adminLogin =
    adminLogin;


/* ==========================================================================
   13. GATEWAY LOGIN FORMS
   ========================================================================== */

function bindGatewayAuthPipelines() {

    const studentForm =
        document.getElementById(
            "student-login-form"
        );


    const adminForm =
        document.getElementById(
            "admin-login-form"
        );


    /* ----------------------------------------------------------------------
       STUDENT
    ---------------------------------------------------------------------- */

    if (studentForm) {

        studentForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                const libraryInput =
                    document.getElementById(
                        "student-library-id"
                    );


                const codeInput =
                    document.getElementById(
                        "student-uid"
                    );


                if (
                    !libraryInput ||
                    !codeInput
                ) {

                    alert(
                        "Student login fields not found."
                    );

                    return;

                }


                const result =
                    await studentLogin(
                        libraryInput.value,
                        codeInput.value
                    );


                if (!result.success) {

                    alert(
                        result.message
                    );

                    return;

                }


                window.location.href =
                    getPagePath(
                        "student-dashboard.html"
                    );

            }
        );

    }


    /* ----------------------------------------------------------------------
       ADMIN
    ---------------------------------------------------------------------- */

    if (adminForm) {

        adminForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                const libraryInput =
                    document.getElementById(
                        "admin-library-id"
                    );


                const passwordInput =
                    document.getElementById(
                        "admin-password"
                    );


                if (
                    !libraryInput ||
                    !passwordInput
                ) {

                    alert(
                        "Admin login fields not found."
                    );

                    return;

                }


                const result =
                    await adminLogin(
                        libraryInput.value,
                        passwordInput.value
                    );


                if (!result.success) {

                    alert(
                        result.message
                    );

                    return;

                }


                window.location.href =
                    getPagePath(
                        "admin-dashboard.html"
                    );

            }
        );

    }

}


/* ==========================================================================
   14. COMPONENT LOADER
   ========================================================================== */

async function loadSaaSLayoutComponent(
    containerId,
    componentUrl,
    callback = null
) {

    const container =
        document.getElementById(
            containerId
        );


    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                componentUrl,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "HTTP " +
                response.status
            );

        }


        const html =
            await response.text();


        container.innerHTML =
            html;


        if (
            typeof callback ===
            "function"
        ) {

            callback();

        }


    } catch (error) {

        console.error(
            "[LibManage Component Loader Error]",
            error
        );

    }

}


window.loadSaaSLayoutComponent =
    loadSaaSLayoutComponent;


/* ==========================================================================
   15. PAGE SESSION PROTECTION
   ========================================================================== */

function requireAdminSession() {

    const session =
        getCurrentSession();


    if (
        session.role !== "admin" ||
        !session.libraryId
    ) {

        clearLibManageSession();

        window.location.href =
            getRootIndexPath();

        return false;

    }


    return true;

}


window.requireAdminSession =
    requireAdminSession;


function requireStudentSession() {

    const session =
        getCurrentSession();


    if (
        session.role !== "student" ||
        !session.libraryId ||
        !session.studentCode
    ) {

        clearLibManageSession();

        window.location.href =
            getRootIndexPath();

        return false;

    }


    return true;

}


window.requireStudentSession =
    requireStudentSession;


function requireManagerSession() {

    const session =
        getCurrentSession();


    if (
        session.role !== "manager"
    ) {

        clearLibManageSession();

        window.location.href =
            getRootIndexPath();

        return false;

    }


    return true;

}


window.requireManagerSession =
    requireManagerSession;


/* ==========================================================================
   16. NAVBAR LIBRARY NAME
   ========================================================================== */

function initializeLibraryNavigation() {

    const element =
        document.getElementById(
            "nav-library-name"
        );


    if (!element) {
        return;
    }


    const session =
        getCurrentSession();


    element.textContent =
        session.libraryName ||
        "Library";

}


/* ==========================================================================
   17. LOGOUT
   ========================================================================== */

document.addEventListener(
    "click",
    (event) => {

        const logoutButton =
            event.target.closest(
                "#admin-logout-btn, #student-exit-btn, #manager-logout-btn"
            );


        if (!logoutButton) {
            return;
        }


        clearLibManageSession();


        /*
         * Do NOT use localStorage.clear().
         *
         * That could destroy data belonging to another app
         * running on the same origin.
         */


        sessionStorage.removeItem(
            "libmanage_session"
        );


        window.location.href =
            getRootIndexPath();

    }
);


/* ==========================================================================
   18. ADMIN NOTICE MODULE
   ========================================================================== */

let adminNoticeRealtimeUnsubscribe =
    null;


function initAdminNoticeModule() {

    const addButton =
        document.getElementById(
            "btn-add-notice"
        );


    const modal =
        document.getElementById(
            "notice-modal-overlay"
        );


    const closeButton =
        document.getElementById(
            "notice-modal-close"
        );


    const cancelButton =
        document.getElementById(
            "notice-cancel-btn"
        );


    const saveButton =
        document.getElementById(
            "notice-save-btn"
        );


    const titleInput =
        document.getElementById(
            "notice-title-input"
        );


    const messageInput =
        document.getElementById(
            "notice-message-input"
        );


    const errorBox =
        document.getElementById(
            "notice-form-error"
        );


    const successBox =
        document.getElementById(
            "notice-form-success"
        );


    const noticeContainer =
        document.getElementById(
            "recent-notices-container"
        );


    if (
        !addButton ||
        !modal ||
        !closeButton ||
        !cancelButton ||
        !saveButton ||
        !titleInput ||
        !messageInput ||
        !errorBox ||
        !successBox ||
        !noticeContainer
    ) {

        return;

    }


    const session =
        getCurrentSession();


    if (
        session.role !== "admin" ||
        !session.libraryId ||
        !window.db
    ) {

        return;

    }


    const noticeCollection =
        noticesRef(
            session.libraryId
        );


    let editingNoticeId =
        null;


    let saving =
        false;


    let noticeMap =
        {};


    function clearMessages() {

        errorBox.textContent =
            "";

        successBox.textContent =
            "";

        errorBox.classList.remove(
            "active"
        );

        successBox.classList.remove(
            "active"
        );

    }


    function resetForm() {

        titleInput.value =
            "";

        messageInput.value =
            "";

    }


    function openModal(
        mode = "add",
        noticeId = null
    ) {

        clearMessages();


        if (
            mode === "edit" &&
            noticeId &&
            noticeMap[noticeId]
        ) {

            editingNoticeId =
                noticeId;


            titleInput.value =
                noticeMap[
                    noticeId
                ].title || "";


            messageInput.value =
                noticeMap[
                    noticeId
                ].message || "";

        } else {

            editingNoticeId =
                null;

            resetForm();

        }


        modal.classList.add(
            "active"
        );


        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        setTimeout(
            () => {

                titleInput.focus();

            },
            40
        );

    }


    function closeModal() {

        modal.classList.remove(
            "active"
        );


        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        editingNoticeId =
            null;

        saving =
            false;


        resetForm();

        clearMessages();

    }


    function showError(
        message
    ) {

        errorBox.textContent =
            message;

        errorBox.classList.add(
            "active"
        );

        successBox.textContent =
            "";

        successBox.classList.remove(
            "active"
        );

    }


    function showSuccess(
        message
    ) {

        successBox.textContent =
            message;

        successBox.classList.add(
            "active"
        );

        errorBox.textContent =
            "";

        errorBox.classList.remove(
            "active"
        );

    }


    function escapeHtml(
        value
    ) {

        return String(
            value || ""
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


    function timestampToMillis(
        value
    ) {

        if (!value) {
            return null;
        }


        if (
            typeof value.toMillis ===
            "function"
        ) {

            return value.toMillis();

        }


        if (
            typeof value.toDate ===
            "function"
        ) {

            return value.toDate()
                .getTime();

        }


        if (
            typeof value.seconds ===
            "number"
        ) {

            return value.seconds *
                1000;

        }


        return null;

    }


    function formatDate(
        value
    ) {

        if (!value) {
            return "Just now";
        }


        let date =
            null;


        if (
            typeof value.toDate ===
            "function"
        ) {

            date =
                value.toDate();

        } else if (
            typeof value.seconds ===
            "number"
        ) {

            date =
                new Date(
                    value.seconds *
                    1000
                );

        }


        if (
            !date ||
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "Just now";

        }


        return date.toLocaleString(
            "en-IN",
            {
                day:
                    "2-digit",

                month:
                    "short",

                year:
                    "numeric",

                hour:
                    "2-digit",

                minute:
                    "2-digit"
            }
        );

    }


    async function saveNotice() {

        if (saving) {
            return;
        }


        const title =
            titleInput.value.trim();


        const message =
            messageInput.value.trim();


        clearMessages();


        if (!title) {

            showError(
                "Please enter a notice title."
            );

            titleInput.focus();

            return;

        }


        if (!message) {

            showError(
                "Please enter a notice message."
            );

            messageInput.focus();

            return;

        }


        saving =
            true;


        saveButton.disabled =
            true;


        try {

            if (editingNoticeId) {

                await noticeCollection
                    .doc(
                        editingNoticeId
                    )
                    .update({

                        title:
                            title,

                        message:
                            message,

                        updatedAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()

                    });


                showSuccess(
                    "Notice updated successfully."
                );

            } else {

                await noticeCollection
                    .add({

                        title:
                            title,

                        message:
                            message,

                        createdAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp(),

                        updatedAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp(),

                        createdBy:
                            session.libraryId

                    });


                showSuccess(
                    "Notice saved successfully."
                );

            }


            setTimeout(
                closeModal,
                450
            );


        } catch (error) {

            console.error(
                "[LibManage Notice Save Error]",
                error
            );


            showError(
                "Unable to save notice. Please try again."
            );


            saving =
                false;


            saveButton.disabled =
                false;

        }

    }


    async function deleteNotice(
        noticeId
    ) {

        if (!noticeId) {
            return;
        }


        if (
            !window.confirm(
                "Are you sure you want to delete this notice?"
            )
        ) {

            return;

        }


        try {

            await noticeCollection
                .doc(
                    noticeId
                )
                .delete();

        } catch (error) {

            console.error(
                "[LibManage Notice Delete Error]",
                error
            );


            alert(
                "Unable to delete notice."
            );

        }

    }


    function renderNotices(
        documents
    ) {

        noticeMap =
            {};


        if (
            !documents.length
        ) {

            noticeContainer.innerHTML = `
                <div class="notice-empty-state">
                    No notices available right now.
                </div>
            `;

            return;

        }


        let html =
            "";


        documents.forEach(
            (doc) => {

                const data =
                    doc.data();


                noticeMap[
                    doc.id
                ] =
                    data;


                html += `
                    <div
                        class="notice-card"
                        data-notice-id="${escapeHtml(doc.id)}"
                    >

                        <div class="notice-card-header">

                            <h3 class="notice-card-title">
                                ${escapeHtml(
                                    data.title ||
                                    "Untitled Notice"
                                )}
                            </h3>

                        </div>


                        <p class="notice-card-message">
                            ${escapeHtml(
                                data.message ||
                                ""
                            )}
                        </p>


                        <div class="notice-card-footer">

                            <span class="notice-card-date">
                                ${escapeHtml(
                                    formatDate(
                                        data.createdAt ||
                                        data.updatedAt
                                    )
                                )}
                            </span>


                            <div class="notice-card-actions">

                                <button
                                    type="button"
                                    class="notice-edit-btn"
                                    data-notice-edit="${escapeHtml(doc.id)}"
                                >
                                    Edit
                                </button>


                                <button
                                    type="button"
                                    class="notice-delete-btn"
                                    data-notice-delete="${escapeHtml(doc.id)}"
                                >
                                    Delete
                                </button>

                            </div>

                        </div>

                    </div>
                `;

            }
        );


        noticeContainer.innerHTML =
            html;

    }


    addButton.addEventListener(
        "click",
        () => {

            openModal(
                "add"
            );

        }
    );


    closeButton.addEventListener(
        "click",
        closeModal
    );


    cancelButton.addEventListener(
        "click",
        closeModal
    );


    modal.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                modal
            ) {

                closeModal();

            }

        }
    );


    saveButton.addEventListener(
        "click",
        saveNotice
    );


    titleInput.addEventListener(
        "input",
        clearMessages
    );


    messageInput.addEventListener(
        "input",
        clearMessages
    );


    noticeContainer.addEventListener(
        "click",
        (event) => {

            const edit =
                event.target.closest(
                    "[data-notice-edit]"
                );


            if (edit) {

                openModal(
                    "edit",
                    edit.getAttribute(
                        "data-notice-edit"
                    )
                );

                return;

            }


            const remove =
                event.target.closest(
                    "[data-notice-delete]"
                );


            if (remove) {

                deleteNotice(
                    remove.getAttribute(
                        "data-notice-delete"
                    )
                );

            }

        }
    );


    if (
        typeof adminNoticeRealtimeUnsubscribe ===
        "function"
    ) {

        adminNoticeRealtimeUnsubscribe();

    }


    adminNoticeRealtimeUnsubscribe =
        noticeCollection.onSnapshot(

            (snapshot) => {

                const docs =
                    snapshot.docs.slice();


                docs.sort(
                    (a, b) => {

                        const aData =
                            a.data();


                        const bData =
                            b.data();


                        const aTime =
                            timestampToMillis(
                                aData.createdAt ||
                                aData.updatedAt
                            );


                        const bTime =
                            timestampToMillis(
                                bData.createdAt ||
                                bData.updatedAt
                            );


                        if (
                            aTime === null &&
                            bTime === null
                        ) {
                            return 0;
                        }


                        if (
                            aTime === null
                        ) {
                            return 1;
                        }


                        if (
                            bTime === null
                        ) {
                            return -1;
                        }


                        return bTime -
                            aTime;

                    }
                );


                renderNotices(
                    docs
                );

            },


            (error) => {

                console.error(
                    "[LibManage Notice Listener Error]",
                    error
                );


                noticeContainer.innerHTML = `
                    <div class="notice-empty-state">
                        Unable to load notices right now.
                    </div>
                `;

            }

        );

}


/* ==========================================================================
   19. DOM READY
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        bindGatewayAuthPipelines();

        initializeLibraryNavigation();

        initAdminNoticeModule();

    }
);


/* ==========================================================================
   20. GLOBAL CORE OBJECT
   ========================================================================== */

window.LibManageCore = {

    version:
        LIBMANAGE_SCHEMA_VERSION,

    namespace:
        LIBMANAGE_ROOT,

    session:
        getCurrentSession,

    clearSession:
        clearLibManageSession,

    library:
        libraryRef,

    students:
        studentsRef,

    student:
        studentRef,

    attendance:
        attendanceRef,

    notices:
        noticesRef,

    seats:
        seatConfigRef,

    generalConfig:
        generalConfigRef,

    validateLibrary:
        validateLibrary,

    studentLogin:
        studentLogin,

    adminLogin:
        adminLogin,

    requireAdmin:
        requireAdminSession,

    requireStudent:
        requireStudentSession,

    requireManager:
        requireManagerSession

};


console.log(
    "[LibManage] Shared dashboard.js loaded successfully."
);
