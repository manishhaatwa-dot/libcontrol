/**
 * ==========================================================================
 * LIBMANAGE - SECURE MULTI-TENANT CORE ENGINE
 * ==========================================================================
 *
 * IMPORTANT:
 * This is the NEW LibManage application core.
 *
 * This project uses its own isolated Firestore namespace:
 *
 *     libmanage_secure_v2
 *
 * Existing/old LibManage collections such as:
 *
 *     saas_libraries
 *
 * are NOT read, modified, deleted or migrated by this file.
 *
 * ==========================================================================
 */


/* ==========================================================================
   1. FIREBASE CONFIGURATION
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
   2. APPLICATION NAMESPACE
   ========================================================================== */

/*
 * DO NOT change this casually.
 *
 * Every new LibManage collection will live below this namespace.
 *
 * Old:
 *     saas_libraries
 *
 * New:
 *     libmanage_secure_v2/libraries/...
 */

const LIBMANAGE_ROOT_COLLECTION =
    "libmanage_secure_v2";


/*
 * Version marker.
 *
 * Useful later if database architecture is upgraded.
 */

const LIBMANAGE_SCHEMA_VERSION =
    "2.0";


/* ==========================================================================
   3. FIREBASE INITIALIZATION
   ========================================================================== */

(function initializeLibManageFirebase() {

    if (typeof firebase === "undefined") {

        console.error(
            "[LibManage Firebase] Firebase SDK is not loaded."
        );

        return;
    }


    try {

        /*
         * Reuse only the Firebase app belonging to THIS page.
         *
         * We never initialize another project and never touch
         * existing Firebase app instances unnecessarily.
         */

        if (!firebase.apps.length) {

            firebase.initializeApp(
                firebaseConfig
            );
        }


        /*
         * Firestore instance.
         */

        window.db =
            firebase.firestore();


        /*
         * Expose configuration safely for pages that need
         * to initialize the Firebase SDK before dashboard.js.
         */

        window.firebaseConfig =
            firebaseConfig;


        /*
         * Application information.
         */

        window.LIBMANAGE_APP =
            Object.freeze({

                rootCollection:
                    LIBMANAGE_ROOT_COLLECTION,

                schemaVersion:
                    LIBMANAGE_SCHEMA_VERSION

            });


        console.log(
            "[LibManage Firebase] Secure core initialized."
        );

        console.log(
            "[LibManage Firebase] Database namespace:",
            LIBMANAGE_ROOT_COLLECTION
        );

    } catch (error) {

        console.error(
            "[LibManage Firebase] Initialization failed:",
            error
        );

    }

})();


/* ==========================================================================
   4. DATABASE REFERENCE HELPERS
   ========================================================================== */

/*
 * These helper functions make sure every future module uses
 * the NEW LibManage namespace.
 *
 * Example:
 *
 * getLibrariesCollection()
 *
 * returns:
 *
 * libmanage_secure_v2/libraries
 *
 */


function getLibrariesCollection() {

    if (!window.db) {
        throw new Error(
            "Firestore database is not initialized."
        );
    }

    return window.db
        .collection(
            LIBMANAGE_ROOT_COLLECTION
        )
        .doc("libraries")
        .collection("records");
}


/*
 * Individual library document.
 */

function getLibraryDocument(
    libraryId
) {

    const safeLibraryId =
        normalizeLibraryId(
            libraryId
        );

    if (!safeLibraryId) {
        throw new Error(
            "Invalid Library ID."
        );
    }

    return getLibrariesCollection()
        .doc(safeLibraryId);
}


/*
 * Students.
 */

function getStudentsCollection(
    libraryId
) {

    return getLibraryDocument(
        libraryId
    )
    .collection("students");
}


/*
 * Individual student.
 */

function getStudentDocument(
    libraryId,
    studentCode
) {

    const safeStudentCode =
        normalizeStudentCode(
            studentCode
        );

    if (!safeStudentCode) {
        throw new Error(
            "Invalid Student Code."
        );
    }

    return getStudentsCollection(
        libraryId
    )
    .doc(safeStudentCode);
}


/*
 * Attendance.
 */

function getAttendanceCollection(
    libraryId
) {

    return getLibraryDocument(
        libraryId
    )
    .collection("attendance");
}


/*
 * Notices.
 */

function getNoticesCollection(
    libraryId
) {

    return getLibraryDocument(
        libraryId
    )
    .collection("notices");
}


/*
 * Seat configuration.
 */

function getSeatConfigurationDocument(
    libraryId
) {

    return getLibraryDocument(
        libraryId
    )
    .collection("configuration")
    .doc("seats");
}


/*
 * Library configuration.
 */

function getLibraryConfigurationDocument(
    libraryId
) {

    return getLibraryDocument(
        libraryId
    )
    .collection("configuration")
    .doc("general");
}


/*
 * Expose helpers globally.
 *
 * Other JS files will use these instead of manually writing
 * Firestore collection names.
 */

window.LibManageDB = Object.freeze({

    root:
        LIBMANAGE_ROOT_COLLECTION,

    libraries:
        getLibrariesCollection,

    library:
        getLibraryDocument,

    students:
        getStudentsCollection,

    student:
        getStudentDocument,

    attendance:
        getAttendanceCollection,

    notices:
        getNoticesCollection,

    seatConfiguration:
        getSeatConfigurationDocument,

    libraryConfiguration:
        getLibraryConfigurationDocument

});


/* ==========================================================================
   5. NORMALIZATION HELPERS
   ========================================================================== */

function normalizeLibraryId(
    value
) {

    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
}


function normalizeStudentCode(
    value
) {

    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
}


/* ==========================================================================
   6. SESSION MANAGEMENT
   ========================================================================== */

const SESSION_KEYS = Object.freeze({

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

});


/*
 * Get current session.
 */

function getLibManageSession() {

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


window.getLibManageSession =
    getLibManageSession;


/*
 * Clear only LibManage session values.
 *
 * We intentionally do NOT blindly remove unrelated localStorage
 * keys belonging to another application.
 */

function clearLibManageSession() {

    Object.values(
        SESSION_KEYS
    ).forEach((key) => {

        localStorage.removeItem(key);

    });

}


/* ==========================================================================
   7. PATH HELPERS
   ========================================================================== */

function getPagesPrefix() {

    return window.location.pathname.includes(
        "/pages/"
    )
        ? ""
        : "pages/";

}


function getRootIndexPath() {

    return window.location.pathname.includes(
        "/pages/"
    )
        ? "../index.html"
        : "index.html";

}


/* ==========================================================================
   8. PAGE ACCESS PROTECTION
   ========================================================================== */

/*
 * These functions will be used by individual pages.
 *
 * Example:
 *
 * requireAdminSession();
 *
 * requireStudentSession();
 *
 * requireManagerSession();
 *
 */


function redirectToGateway() {

    window.location.href =
        getRootIndexPath();

}


/*
 * Admin page protection.
 */

function requireAdminSession() {

    const session =
        getLibManageSession();

    if (
        session.role !== "admin" ||
        !session.libraryId
    ) {

        clearLibManageSession();

        redirectToGateway();

        return false;
    }

    return true;
}


/*
 * Student page protection.
 */

function requireStudentSession() {

    const session =
        getLibManageSession();

    if (
        session.role !== "student" ||
        !session.libraryId ||
        !session.studentCode
    ) {

        clearLibManageSession();

        redirectToGateway();

        return false;
    }

    return true;
}


/*
 * Manager page protection.
 */

function requireManagerSession() {

    const session =
        getLibManageSession();

    if (
        session.role !== "manager"
    ) {

        clearLibManageSession();

        redirectToGateway();

        return false;
    }

    return true;
}


/* ==========================================================================
   9. LIBRARY STATUS VALIDATION
   ========================================================================== */

async function validateLibraryAccess(
    libraryId
) {

    const safeLibraryId =
        normalizeLibraryId(
            libraryId
        );

    if (!safeLibraryId) {

        return {

            valid: false,

            reason:
                "INVALID_LIBRARY_ID"

        };

    }


    try {

        const librarySnapshot =
            await getLibraryDocument(
                safeLibraryId
            )
            .get();


        if (!librarySnapshot.exists) {

            return {

                valid: false,

                reason:
                    "LIBRARY_NOT_FOUND"

            };

        }


        const libraryData =
            librarySnapshot.data() || {};


        if (
            libraryData.status !==
            "approved"
        ) {

            return {

                valid: false,

                reason:
                    "LIBRARY_NOT_APPROVED",

                data:
                    libraryData

            };

        }


        if (
            libraryData.enabled === false
        ) {

            return {

                valid: false,

                reason:
                    "LIBRARY_DISABLED",

                data:
                    libraryData

            };

        }


        return {

            valid: true,

            data:
                libraryData

        };


    } catch (error) {

        console.error(
            "[Library Validation Error]",
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


/* ==========================================================================
   10. STUDENT LOGIN
   ========================================================================== */

async function processStudentLogin(
    libraryId,
    studentCode
) {

    const safeLibraryId =
        normalizeLibraryId(
            libraryId
        );

    const safeStudentCode =
        normalizeStudentCode(
            studentCode
        );


    if (
        !safeLibraryId ||
        !safeStudentCode
    ) {

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

        /*
         * First validate library.
         */

        const libraryResult =
            await validateLibraryAccess(
                safeLibraryId
            );


        if (!libraryResult.valid) {

            if (
                libraryResult.reason ===
                "LIBRARY_NOT_FOUND"
            ) {

                return {

                    success: false,

                    message:
                        "Library not found."

                };

            }


            if (
                libraryResult.reason ===
                "LIBRARY_NOT_APPROVED"
            ) {

                return {

                    success: false,

                    message:
                        "Access Blocked: This library is awaiting approval."

                };

            }


            if (
                libraryResult.reason ===
                "LIBRARY_DISABLED"
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
                    "Unable to verify library access."

            };

        }


        /*
         * Find student.
         */

        const studentSnapshot =
            await getStudentDocument(
                safeLibraryId,
                safeStudentCode
            )
            .get();


        if (!studentSnapshot.exists) {

            return {

                success: false,

                message:
                    "Login Failed: Invalid Library ID or Student Code."

            };

        }


        const studentData =
            studentSnapshot.data() || {};

        const libraryData =
            libraryResult.data || {};


        /*
         * Expired students are not allowed to login.
         */

        if (
            String(
                studentData.status || ""
            ).toLowerCase() ===
            "expired"
        ) {

            return {

                success: false,

                message:
                    "Access Denied: Your library membership has expired."

            };

        }


        /*
         * Save student session.
         */

        clearLibManageSession();


        localStorage.setItem(
            SESSION_KEYS.role,
            "student"
        );

        localStorage.setItem(
            SESSION_KEYS.studentCode,
            studentData.studentCode ||
            safeStudentCode
        );

        localStorage.setItem(
            SESSION_KEYS.studentSeat,
            studentData.seatNumber ||
            ""
        );

        localStorage.setItem(
            SESSION_KEYS.libraryId,
            safeLibraryId
        );

        localStorage.setItem(
            SESSION_KEYS.libraryName,
            libraryData.name ||
            "Library"
        );


        return {

            success: true,

            student:
                studentData,

            library:
                libraryData

        };


    } catch (error) {

        console.error(
            "[Student Login Error]",
            error
        );

        return {

            success: false,

            message:
                "Unable to connect to the secure cloud database."

        };

    }

}


/* ==========================================================================
   11. ADMIN LOGIN
   ========================================================================== */

/*
 * IMPORTANT SECURITY ARCHITECTURE NOTE
 *
 * The old version compared:
 *
 *     libraryData.adminPass
 *
 * directly inside browser JavaScript.
 *
 * That is NOT a strong security model.
 *
 * For the new version we keep the login pipeline isolated, but the
 * final production authentication should use Firebase Authentication.
 *
 * This function currently supports the existing UI pipeline while
 * keeping the new database completely separated.
 *
 * The manager JS will later create/maintain proper Firebase Auth
 * accounts for library administrators.
 */


async function processAdminLogin(
    libraryId,
    password
) {

    const safeLibraryId =
        normalizeLibraryId(
            libraryId
        );

    const passInput =
        String(password || "");


    if (
        !safeLibraryId ||
        !passInput
    ) {

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
            await validateLibraryAccess(
                safeLibraryId
            );


        if (!libraryResult.valid) {

            if (
                libraryResult.reason ===
                "LIBRARY_NOT_FOUND"
            ) {

                return {

                    success: false,

                    message:
                        "Login Failed: Invalid Library ID or Password."

                };

            }


            if (
                libraryResult.reason ===
                "LIBRARY_NOT_APPROVED"
            ) {

                return {

                    success: false,

                    message:
                        "Access Restricted: Your library is awaiting approval."

                };

            }


            if (
                libraryResult.reason ===
                "LIBRARY_DISABLED"
            ) {

                return {

                    success: false,

                    message:
                        "Access Suspended: This library is disabled."

                };

            }


            return {

                success: false,

                message:
                    "Unable to verify library access."

            };

        }


        const libraryData =
            libraryResult.data || {};


        /*
         * TEMPORARY COMPATIBILITY CHECK
         *
         * This is intentionally marked for replacement with Firebase Auth.
         *
         * New manager/admin creation code should eventually stop storing
         * passwords in Firestore.
         */

        const storedPassword =
            String(
                libraryData.adminPass || ""
            );


        if (
            !storedPassword ||
            storedPassword !== passInput
        ) {

            return {

                success: false,

                message:
                    "Login Failed: Invalid Library ID or Password."

            };

        }


        /*
         * Create admin session.
         */

        clearLibManageSession();


        localStorage.setItem(
            SESSION_KEYS.role,
            "admin"
        );

        localStorage.setItem(
            SESSION_KEYS.libraryId,
            libraryData.libraryId ||
            safeLibraryId
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
            "[Admin Login Error]",
            error
        );

        return {

            success: false,

            message:
                "Unable to connect to the secure cloud database."

        };

    }

}


/* ==========================================================================
   12. GATEWAY AUTH PIPELINES
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
       STUDENT LOGIN
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

                const studentCodeInput =
                    document.getElementById(
                        "student-uid"
                    );


                if (
                    !libraryInput ||
                    !studentCodeInput
                ) {

                    alert(
                        "Login fields are unavailable."
                    );

                    return;

                }


                const result =
                    await processStudentLogin(
                        libraryInput.value,
                        studentCodeInput.value
                    );


                if (!result.success) {

                    alert(
                        result.message
                    );

                    return;

                }


                window.location.href =
                    "pages/student-dashboard.html";

            }
        );

    }


    /* ----------------------------------------------------------------------
       ADMIN LOGIN
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
                        "Login fields are unavailable."
                    );

                    return;

                }


                const result =
                    await processAdminLogin(
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
                    "pages/admin-dashboard.html";

            }
        );

    }

}


/* ==========================================================================
   13. COMPONENT LOADER
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
            {
                containerId:
                    containerId,

                componentUrl:
                    componentUrl,

                error:
                    error

            }
        );

    }

}


/*
 * Global access for other modules.
 */

window.loadSaaSLayoutComponent =
    loadSaaSLayoutComponent;


/* ==========================================================================
   14. NAVBAR / COMPONENT SESSION DATA
   ========================================================================== */

function initializeLibraryNavigation() {

    const libraryNameElement =
        document.getElementById(
            "nav-library-name"
        );


    if (!libraryNameElement) {
        return;
    }


    const session =
        getLibManageSession();


    libraryNameElement.textContent =
        session.libraryName ||
        "Library";


}


/* ==========================================================================
   15. LOGOUT
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
         * Clear only known LibManage sessionStorage keys if present.
         * Do not wipe unrelated applications' storage.
         */

        sessionStorage.removeItem(
            "libmanage_session"
        );


        window.location.href =
            getRootIndexPath();

    }
);


/* ==========================================================================
   16. NOTICE MODULE
   ========================================================================== */

/*
 * Realtime unsubscribe reference.
 */

let adminNoticeRealtimeUnsubscribe =
    null;


/*
 * Admin notice system.
 *
 * Uses ONLY:
 *
 * libmanage_secure_v2
 *   -> libraries
 *      -> records
 *         -> LIBRARY_ID
 *            -> notices
 *
 */

function initAdminNoticeModule() {

    const addNoticeButton =
        document.getElementById(
            "btn-add-notice"
        );

    const modalOverlay =
        document.getElementById(
            "notice-modal-overlay"
        );

    const closeModalButton =
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

    const modalTitle =
        document.getElementById(
            "notice-modal-title"
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


    const session =
        getLibManageSession();


    if (
        !addNoticeButton ||
        !modalOverlay ||
        !closeModalButton ||
        !cancelButton ||
        !saveButton ||
        !modalTitle ||
        !titleInput ||
        !messageInput ||
        !errorBox ||
        !successBox ||
        !noticeContainer
    ) {

        return;

    }


    if (
        session.role !== "admin" ||
        !session.libraryId ||
        !window.db
    ) {

        console.warn(
            "[Notice Module] Admin session/database unavailable."
        );

        return;

    }


    const noticesRef =
        getNoticesCollection(
            session.libraryId
        );


    let currentNoticeEditId =
        null;

    let isNoticeSaving =
        false;

    let noticeDataMap =
        {};


    function resetNoticeForm() {

        titleInput.value =
            "";

        messageInput.value =
            "";

    }


    function clearNoticeMessages() {

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


    function showNoticeError(
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


    function showNoticeSuccess(
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


    function updateSaveButtonState() {

        saveButton.disabled =
            isNoticeSaving;


        if (currentNoticeEditId) {

            saveButton.textContent =
                isNoticeSaving
                    ? "Updating..."
                    : "Update Notice";

            modalTitle.textContent =
                "Edit Notice";

        } else {

            saveButton.textContent =
                isNoticeSaving
                    ? "Saving..."
                    : "Save Notice";

            modalTitle.textContent =
                "Add Notice";

        }

    }


    function openModal(
        mode = "add",
        noticeId = null
    ) {

        clearNoticeMessages();


        if (
            mode === "edit" &&
            noticeId &&
            noticeDataMap[noticeId]
        ) {

            currentNoticeEditId =
                noticeId;


            titleInput.value =
                noticeDataMap[
                    noticeId
                ].title || "";


            messageInput.value =
                noticeDataMap[
                    noticeId
                ].message || "";

        } else {

            currentNoticeEditId =
                null;

            resetNoticeForm();

        }


        isNoticeSaving =
            false;


        updateSaveButtonState();


        modalOverlay.classList.add(
            "active"
        );


        modalOverlay.setAttribute(
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

        modalOverlay.classList.remove(
            "active"
        );


        modalOverlay.setAttribute(
            "aria-hidden",
            "true"
        );


        currentNoticeEditId =
            null;

        isNoticeSaving =
            false;


        resetNoticeForm();

        clearNoticeMessages();

        updateSaveButtonState();

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


    function getTimestampMillis(
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

            const date =
                value.toDate();


            return date instanceof Date &&
                !Number.isNaN(
                    date.getTime()
                )
                ? date.getTime()
                : null;

        }


        if (
            typeof value.seconds ===
            "number"
        ) {

            return (
                value.seconds * 1000
            ) +
            Math.floor(
                (
                    value.nanoseconds ||
                    0
                ) / 1000000
            );

        }


        return null;

    }


    function getNoticeSortTime(
        notice
    ) {

        return (
            getTimestampMillis(
                notice.createdAt
            ) ??
            getTimestampMillis(
                notice.updatedAt
            ) ??
            null
        );

    }


    function formatNoticeDate(
        timestampValue,
        updatedAtValue
    ) {

        const source =
            timestampValue ||
            updatedAtValue;


        if (!source) {
            return "Just now";
        }


        let date =
            null;


        if (
            typeof source.toDate ===
            "function"
        ) {

            date =
                source.toDate();

        } else if (
            typeof source.seconds ===
            "number"
        ) {

            date =
                new Date(
                    source.seconds * 1000
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

        const title =
            titleInput.value.trim();

        const message =
            messageInput.value.trim();


        clearNoticeMessages();


        if (!title) {

            showNoticeError(
                "Please enter a notice title."
            );

            titleInput.focus();

            return;

        }


        if (!message) {

            showNoticeError(
                "Please enter a notice message."
            );

            messageInput.focus();

            return;

        }


        if (isNoticeSaving) {
            return;
        }


        isNoticeSaving =
            true;


        updateSaveButtonState();


        try {

            if (currentNoticeEditId) {

                await noticesRef
                    .doc(
                        currentNoticeEditId
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


                showNoticeSuccess(
                    "Notice updated successfully."
                );

            } else {

                await noticesRef.add({

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


                showNoticeSuccess(
                    "Notice saved successfully."
                );

            }


            setTimeout(
                () => {

                    closeModal();

                },
                450
            );


        } catch (error) {

            console.error(
                "[Notice Save Error]",
                error
            );


            showNoticeError(
                currentNoticeEditId
                    ? "Failed to update notice. Please try again."
                    : "Failed to save notice. Please try again."
            );


            isNoticeSaving =
                false;


            updateSaveButtonState();

        }

    }


    async function deleteNotice(
        noticeId
    ) {

        if (!noticeId) {
            return;
        }


        const confirmed =
            window.confirm(
                "Are you sure you want to delete this notice?"
            );


        if (!confirmed) {
            return;
        }


        try {

            await noticesRef
                .doc(
                    noticeId
                )
                .delete();


        } catch (error) {

            console.error(
                "[Notice Delete Error]",
                error
            );


            alert(
                "Failed to delete notice. Please try again."
            );

        }

    }


    function renderNotices(
        noticeDocs
    ) {

        if (
            !noticeDocs ||
            !noticeDocs.length
        ) {

            noticeDataMap =
                {};

            noticeContainer.innerHTML = `
                <div class="notice-empty-state">
                    No notices available right now.
                </div>
            `;

            return;

        }


        noticeDataMap =
            {};


        let html =
            "";


        noticeDocs.forEach(
            (doc) => {

                const notice =
                    doc.data || {};


                noticeDataMap[
                    doc.id
                ] =
                    notice;


                const safeTitle =
                    escapeHtml(
                        notice.title ||
                        "Untitled Notice"
                    );


                const safeMessage =
                    escapeHtml(
                        notice.message ||
                        ""
                    );


                const safeDate =
                    escapeHtml(
                        formatNoticeDate(
                            notice.createdAt,
                            notice.updatedAt
                        )
                    );


                html += `
                    <div
                        class="notice-card"
                        data-notice-id="${escapeHtml(doc.id)}"
                    >

                        <div class="notice-card-header">

                            <h3 class="notice-card-title">
                                ${safeTitle}
                            </h3>

                        </div>

                        <p class="notice-card-message">
                            ${safeMessage}
                        </p>

                        <div class="notice-card-footer">

                            <span class="notice-card-date">
                                ${safeDate}
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


    addNoticeButton.addEventListener(
        "click",
        () => {

            openModal(
                "add"
            );

        }
    );


    closeModalButton.addEventListener(
        "click",
        closeModal
    );


    cancelButton.addEventListener(
        "click",
        closeModal
    );


    modalOverlay.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                modalOverlay
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
        clearNoticeMessages
    );


    messageInput.addEventListener(
        "input",
        clearNoticeMessages
    );


    noticeContainer.addEventListener(
        "click",
        (event) => {

            const editButton =
                event.target.closest(
                    "[data-notice-edit]"
                );


            if (editButton) {

                openModal(
                    "edit",
                    editButton.getAttribute(
                        "data-notice-edit"
                    )
                );

                return;

            }


            const deleteButton =
                event.target.closest(
                    "[data-notice-delete]"
                );


            if (deleteButton) {

                deleteNotice(
                    deleteButton.getAttribute(
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
        noticesRef.onSnapshot(

            (snapshot) => {

                const noticeDocs =
                    snapshot.docs.map(
                        (doc) => ({

                            id:
                                doc.id,

                            data:
                                doc.data()

                        })
                    );


                noticeDocs.sort(
                    (a, b) => {

                        const aTime =
                            getNoticeSortTime(
                                a.data
                            );

                        const bTime =
                            getNoticeSortTime(
                                b.data
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
                    noticeDocs
                );

            },


            (error) => {

                console.error(
                    "[Notice Realtime Listener Error]",
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
   17. DOM INITIALIZATION
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
         * Gateway login forms.
         */

        bindGatewayAuthPipelines();


        /*
         * Navbar library name.
         */

        initializeLibraryNavigation();


        /*
         * Do NOT automatically force page redirects here.
         *
         * Individual page JS files will call:
         *
         *     requireAdminSession()
         *     requireStudentSession()
         *     requireManagerSession()
         *
         * This prevents one common core file from breaking another page.
         */


        /*
         * Notice module only initializes when its required
         * elements exist.
         */

        initAdminNoticeModule();

    }
);


/* ==========================================================================
   18. GLOBAL DEBUG / VERSION INFORMATION
   ========================================================================== */

window.LibManageCore =
    Object.freeze({

        version:
            LIBMANAGE_SCHEMA_VERSION,

        namespace:
            LIBMANAGE_ROOT_COLLECTION,

        session:
            getLibManageSession,

        clearSession:
            clearLibManageSession,

        requireAdmin:
            requireAdminSession,

        requireStudent:
            requireStudentSession,

        requireManager:
            requireManagerSession,

        validateLibrary:
            validateLibraryAccess,

        studentLogin:
            processStudentLogin,

        adminLogin:
            processAdminLogin

    });


console.log(
    "[LibManage Core] Version " +
    LIBMANAGE_SCHEMA_VERSION +
    " loaded."
);
