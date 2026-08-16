/**
 * ==========================================================================
 * LIBCONTROL - SHARED CORE ENGINE
 * ==========================================================================
 *
 * Shared by:
 *
 * index.html
 * admin-dashboard.html
 * students.html
 * attendance.html
 * seats.html
 * student-dashboard.html
 *
 * Manager authentication is handled separately by:
 *
 * manager-login.html
 * manager.js
 *
 * IMPORTANT:
 * Admin authentication uses Firebase Authentication.
 *
 * NO ADMIN PASSWORD IS STORED IN FIRESTORE.
 *
 * Admin identity:
 *
 * Firebase Auth UID
 * +
 * libcontrol_libraries/{libraryId}/admins/{UID}
 *
 * ==========================================================================
 */

"use strict";


/* ==========================================================================
   1. FIREBASE CONFIG
   ========================================================================== */

const firebaseConfig = {

    apiKey:
        "AIzaSyCUe84QnEA5DY31DXtzM-7M4Xu5bSa8xO8",

    authDomain:
        "appointment-app-cb979.firebaseapp.com",

    projectId:
        "appointment-app-cb979",

    storageBucket:
        "appointment-app-cb979.firebasestorage.app",

    messagingSenderId:
        "596931961212",

    appId:
        "1:596931961212:web:adc604e0a47f63fd9104f"

};


/* ==========================================================================
   2. DATABASE NAMESPACE
   ========================================================================== */

const LIBMANAGE_ROOT =
    "libmanage_secure_v2";

const LIBMANAGE_SCHEMA_VERSION =
    "2.0";


/* ==========================================================================
   3. FIREBASE INITIALIZATION
   ========================================================================== */

(function initializeFirebase() {

    if (
        typeof firebase ===
        "undefined"
    ) {

        console.error(
            "[LibControl] Firebase SDK not loaded."
        );

        return;

    }


    try {

        if (
            !firebase.apps.length
        ) {

            firebase.initializeApp(
                firebaseConfig
            );

        }


        window.db =
            firebase.firestore();


        window.auth =
            firebase.auth();


        window.firebaseConfig =
            firebaseConfig;


        window.LIBMANAGE_ROOT =
            LIBMANAGE_ROOT;


        console.log(
            "[LibControl] Firebase initialized."
        );


    }
    catch (error) {

        console.error(
            "[LibControl] Firebase initialization error:",
            error
        );

    }

})();


/* ==========================================================================
   4. NORMALIZATION
   ========================================================================== */

function normalizeLibraryId(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toUpperCase()
        .replace(
            /\s+/g,
            ""
        );

}


function normalizeStudentCode(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toUpperCase()
        .replace(
            /\s+/g,
            ""
        );

}


/* ==========================================================================
   5. FIRESTORE STRUCTURE
   ==========================================================================

   libcontrol_libraries
       └── LIBRARY_ID
           ├── admins
           │   └── ADMIN_UID
           │
           ├── students
           ├── attendance
           ├── seats
           ├── fees
           ├── notices
           ├── notifications
           ├── subscriptions
           └── audit_logs

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
        .collection(
            "libcontrol_libraries"
        );

}


/* --------------------------------------------------------------------------
   Single Library
-------------------------------------------------------------------------- */

function libraryRef(
    libraryId
) {

    const id =
        normalizeLibraryId(
            libraryId
        );


    if (!id) {

        throw new Error(
            "Invalid Library ID."
        );

    }


    return librariesRef()
        .doc(id);

}


/* --------------------------------------------------------------------------
   Admins
-------------------------------------------------------------------------- */

function adminsRef(
    libraryId
) {

    return libraryRef(
        libraryId
    )
        .collection(
            "admins"
        );

}


function adminRef(
    libraryId,
    uid
) {

    if (!uid) {

        throw new Error(
            "Invalid Admin UID."
        );

    }


    return adminsRef(
        libraryId
    )
        .doc(uid);

}


/* --------------------------------------------------------------------------
   Students
-------------------------------------------------------------------------- */

function studentsRef(
    libraryId
) {

    return libraryRef(
        libraryId
    )
        .collection(
            "students"
        );

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
    )
        .doc(code);

}


/* --------------------------------------------------------------------------
   Attendance
-------------------------------------------------------------------------- */

function attendanceRef(
    libraryId
) {

    return libraryRef(
        libraryId
    )
        .collection(
            "attendance"
        );

}


/* --------------------------------------------------------------------------
   Notices
-------------------------------------------------------------------------- */

function noticesRef(
    libraryId
) {

    return libraryRef(
        libraryId
    )
        .collection(
            "notices"
        );

}


/* --------------------------------------------------------------------------
   Seat Configuration
-------------------------------------------------------------------------- */

function seatConfigRef(
    libraryId
) {

    return libraryRef(
        libraryId
    )
        .collection(
            "configuration"
        )
        .doc(
            "seats"
        );

}


/* --------------------------------------------------------------------------
   General Configuration
-------------------------------------------------------------------------- */

function generalConfigRef(
    libraryId
) {

    return libraryRef(
        libraryId
    )
        .collection(
            "configuration"
        )
        .doc(
            "general"
        );

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

    admins:
        adminsRef,

    admin:
        adminRef,

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
        "session_student_seat",

    adminUID:
        "session_admin_uid",

    adminEmail:
        "session_admin_email",

    adminEmailVerified:
        "session_admin_email_verified",

    adminMustChangePassword:
        "session_admin_must_change_password"

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
            ),

        adminUID:
            localStorage.getItem(
                SESSION_KEYS.adminUID
            ),

        adminEmail:
            localStorage.getItem(
                SESSION_KEYS.adminEmail
            ),

        adminEmailVerified:
            localStorage.getItem(
                SESSION_KEYS.adminEmailVerified
            ),

        adminMustChangePassword:
            localStorage.getItem(
                SESSION_KEYS.adminMustChangePassword
            )

    };

}


window.getCurrentSession =
    getCurrentSession;


/* ==========================================================================
   9. SESSION CLEARING
   ========================================================================== */

function clearLibManageSession() {

    Object.keys(
        SESSION_KEYS
    )
        .forEach(
            (key) => {

                localStorage.removeItem(
                    SESSION_KEYS[key]
                );

            }
        );

}


function clearAdminSession() {

    localStorage.removeItem(
        SESSION_KEYS.role
    );

    localStorage.removeItem(
        SESSION_KEYS.libraryId
    );

    localStorage.removeItem(
        SESSION_KEYS.libraryName
    );

    localStorage.removeItem(
        SESSION_KEYS.adminUID
    );

    localStorage.removeItem(
        SESSION_KEYS.adminEmail
    );

    localStorage.removeItem(
        SESSION_KEYS.adminEmailVerified
    );

    localStorage.removeItem(
        SESSION_KEYS.adminMustChangePassword
    );

}


window.clearAdminSession =
    clearAdminSession;


/* ==========================================================================
   10. PATH HELPERS
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


function getPagePath(
    fileName
) {

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
   11. FIREBASE AUTH SESSION WAIT
   ========================================================================== */

/*
 * Firebase Authentication can restore an existing session asynchronously.
 *
 * NEVER depend only on:
 *
 * firebase.auth().currentUser
 *
 * immediately after page load.
 */

function waitForFirebaseAuthUser(
    timeout = 10000
) {

    return new Promise(
        (resolve) => {

            if (
                typeof firebase ===
                "undefined" ||
                !firebase.auth
            ) {

                resolve(
                    null
                );

                return;

            }


            let finished =
                false;


            let unsubscribe =
                null;


            const timer =
                setTimeout(
                    () => {

                        if (finished) {
                            return;
                        }


                        finished =
                            true;


                        if (
                            typeof unsubscribe ===
                            "function"
                        ) {

                            unsubscribe();

                        }


                        resolve(
                            firebase
                                .auth()
                                .currentUser ||
                            null
                        );

                    },
                    timeout
                );


            unsubscribe =
                firebase
                    .auth()
                    .onAuthStateChanged(
                        (user) => {

                            if (finished) {
                                return;
                            }


                            finished =
                                true;


                            clearTimeout(
                                timer
                            );


                            if (
                                typeof unsubscribe ===
                                "function"
                            ) {

                                unsubscribe();

                            }


                            resolve(
                                user ||
                                null
                            );

                        }
                    );

        }
    );

}


window.waitForFirebaseAuthUser =
    waitForFirebaseAuthUser;
/* ==========================================================================
   12. LIBRARY ACCESS VALIDATION
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
            )
            .get();


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

    }
    catch (error) {

        console.error(
            "[LibControl] Library validation error:",
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
   13. STUDENT LOGIN
   ========================================================================== */

async function studentLogin(
    libraryId,
    studentEmail,
   studentPassword
) {

    const id =
        normalizeLibraryId(
            libraryId
        );

    const email =
    String(
        studentEmail || ""
    )
        .trim()
        .toLowerCase();


const password =
    String(
        studentPassword || ""
    );


if (
    !id ||
    !email ||
    !password
) {

    return {

        success: false,

        message:
            "Please enter Library ID, Student Email and Password."

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


        /* =========================================================
 * STUDENT FIREBASE AUTHENTICATION
 * ========================================================= */

let authenticatedUser = null;


try {

    const authResult =
        await firebase
            .auth()
            .signInWithEmailAndPassword(
                email,
                password
            );


    authenticatedUser =
        authResult.user;

}
catch (authError) {

    console.error(
        "[LibControl] Student Firebase Authentication error:",
        authError
    );


    return {

        success: false,

        message:
            "Login Failed: Invalid Student Email or Password."

    };

}


/* =========================================================
 * FIND STUDENT INSIDE THIS LIBRARY
 * ========================================================= */

const studentsSnapshot =
    await window.db
        .collection(
            "libcontrol_libraries"
        )
        .doc(
            id
        )
        .collection(
            "students"
        )
        .where(
            "uid",
            "==",
            authenticatedUser.uid
        )
        .limit(
            1
        )
        .get();


if (
    studentsSnapshot.empty
) {

    await firebase
        .auth()
        .signOut();


    return {

        success: false,

        message:
            "This student account is not registered in this library."

    };

}


const studentSnapshot =
    studentsSnapshot.docs[0];


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
         * Student login intentionally remains
         * independent from Firebase Admin Auth.
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
            studentSnapshot.id
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

    }
    catch (error) {

        console.error(
            "[LibControl] Student login error:",
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
   14. ADMIN AUTHORIZATION RECORD
   ========================================================================== */

/*
 * Firebase Authentication proves WHO the user is.
 *
 * Firestore admin document proves:
 *
 *     role
 *     libraryId
 *     enabled
 *     emailVerified
 *     mustChangePassword
 *
 * Password is NEVER read from Firestore.
 */

async function getAdminAuthorization(
    user,
    libraryId
) {

    if (!user) {

        return {

            authorized: false,

            reason:
                "NO_AUTH_USER"

        };

    }


    const id =
        normalizeLibraryId(
            libraryId
        );


    if (!id) {

        return {

            authorized: false,

            reason:
                "INVALID_LIBRARY"

        };

    }


    try {

        const libraryResult =
            await validateLibrary(
                id
            );


        if (!libraryResult.valid) {

            return {

                authorized: false,

                reason:
                    libraryResult.reason,

                library:
                    libraryResult.data ||
                    null

            };

        }


        const adminSnapshot =
            await adminRef(
                id,
                user.uid
            )
            .get();


        if (!adminSnapshot.exists) {

            return {

                authorized: false,

                reason:
                    "ADMIN_NOT_FOUND"

            };

        }


        const adminData =
            adminSnapshot.data() || {};


        if (
            adminData.uid &&
            adminData.uid !==
            user.uid
        ) {

            return {

                authorized: false,

                reason:
                    "UID_MISMATCH"

            };

        }


        if (
            adminData.role !==
            "admin"
        ) {

            return {

                authorized: false,

                reason:
                    "INVALID_ROLE"

            };

        }


        if (
            adminData.libraryId &&
            normalizeLibraryId(
                adminData.libraryId
            ) !==
            id
        ) {

            return {

                authorized: false,

                reason:
                    "LIBRARY_MISMATCH"

            };

        }


        if (
            adminData.enabled ===
            false
        ) {

            return {

                authorized: false,

                reason:
                    "ADMIN_DISABLED"

            };

        }


        return {

            authorized: true,

            admin:
                adminData,

            library:
                libraryResult.data

        };

    }
    catch (error) {

        console.error(
            "[LibControl] Admin authorization error:",
            error
        );


        return {

            authorized: false,

            reason:
                "DATABASE_ERROR",

            error:
                error

        };

    }

}


window.getAdminAuthorization =
    getAdminAuthorization;


/* ==========================================================================
   15. ADMIN SESSION CREATION
   ========================================================================== */

function createAdminSession(
    user,
    libraryId,
    libraryData,
    adminData
) {

    clearLibManageSession();


    const id =
        normalizeLibraryId(
            libraryId
        );


    localStorage.setItem(
        SESSION_KEYS.role,
        "admin"
    );


    localStorage.setItem(
        SESSION_KEYS.libraryId,
        id
    );


    localStorage.setItem(
        SESSION_KEYS.libraryName,
        libraryData &&
        libraryData.name
            ? libraryData.name
            : "Library"
    );


    localStorage.setItem(
        SESSION_KEYS.adminUID,
        user.uid
    );


    localStorage.setItem(
        SESSION_KEYS.adminEmail,
        user.email ||
        adminData.email ||
        ""
    );


    localStorage.setItem(
        SESSION_KEYS.adminEmailVerified,
        user.emailVerified
            ? "true"
            : "false"
    );


    localStorage.setItem(
        SESSION_KEYS.adminMustChangePassword,
        adminData.mustChangePassword ===
        true
            ? "true"
            : "false"
    );


    return getCurrentSession();

}


window.createAdminSession =
    createAdminSession;

/* ==========================================================================
   15A. FIRST LOGIN PASSWORD CHANGE UI
   ========================================================================== */

function showFirstLoginPasswordChange(
    libraryId
) {

    const existing =
        document.getElementById(
            "libcontrol-first-password-modal"
        );


    if (existing) {

        existing.remove();

    }


    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "libcontrol-first-password-modal";


    overlay.style.cssText = `
        position:fixed;
        inset:0;
        z-index:99999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
        background:rgba(0,0,0,0.65);
        backdrop-filter:blur(6px);
    `;


    overlay.innerHTML = `

        <div
            style="
                width:100%;
                max-width:430px;
                background:#ffffff;
                border-radius:16px;
                padding:28px;
                box-sizing:border-box;
                box-shadow:0 20px 60px rgba(0,0,0,0.25);
            "
        >

            <h2
                style="
                    margin:0 0 8px;
                    font-size:1.35rem;
                "
            >
                Create Your New Password
            </h2>


            <p
                style="
                    margin:0 0 20px;
                    color:#64748b;
                    line-height:1.5;
                    font-size:0.9rem;
                "
            >
                This is your first login. Please create
                a new password before entering the
                Admin Dashboard.
            </p>


            <div style="margin-bottom:14px;">

                <label
                    for="libcontrol-new-admin-password"
                    style="
                        display:block;
                        margin-bottom:6px;
                        font-weight:600;
                    "
                >
                    New Password
                </label>


                <input
                    type="password"
                    id="libcontrol-new-admin-password"
                    minlength="8"
                    autocomplete="new-password"
                    placeholder="Enter new password"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:12px;
                        border:1px solid #cbd5e1;
                        border-radius:8px;
                    "
                >

            </div>


            <div style="margin-bottom:16px;">

                <label
                    for="libcontrol-confirm-admin-password"
                    style="
                        display:block;
                        margin-bottom:6px;
                        font-weight:600;
                    "
                >
                    Confirm Password
                </label>


                <input
                    type="password"
                    id="libcontrol-confirm-admin-password"
                    minlength="8"
                    autocomplete="new-password"
                    placeholder="Confirm new password"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:12px;
                        border:1px solid #cbd5e1;
                        border-radius:8px;
                    "
                >

            </div>


            <div
                id="libcontrol-first-password-message"
                style="
                    display:none;
                    margin-bottom:14px;
                    padding:10px;
                    border-radius:8px;
                    font-size:0.85rem;
                    font-weight:600;
                "
            ></div>


            <button
                type="button"
                id="libcontrol-save-first-password"
                style="
                    width:100%;
                    border:none;
                    border-radius:9px;
                    padding:13px;
                    cursor:pointer;
                    font-weight:700;
                    font-size:0.95rem;
                "
            >
                Save New Password
            </button>

        </div>

    `;


    document.body.appendChild(
        overlay
    );


    const newPasswordInput =
        document.getElementById(
            "libcontrol-new-admin-password"
        );


    const confirmPasswordInput =
        document.getElementById(
            "libcontrol-confirm-admin-password"
        );


    const messageBox =
        document.getElementById(
            "libcontrol-first-password-message"
        );


    const saveButton =
        document.getElementById(
            "libcontrol-save-first-password"
        );


    function showError(
        message
    ) {

        if (!messageBox) {

            return;

        }


        messageBox.textContent =
            message;


        messageBox.style.display =
            "block";


        messageBox.style.background =
            "#fee2e2";


        messageBox.style.color =
            "#991b1b";

    }


    if (saveButton) {

        saveButton.addEventListener(
            "click",
            async () => {

                const newPassword =
                    newPasswordInput
                        ? newPasswordInput.value
                        : "";


                const confirmPassword =
                    confirmPasswordInput
                        ? confirmPasswordInput.value
                        : "";


                if (
                    newPassword.length <
                    8
                ) {

                    showError(
                        "New password must contain at least 8 characters."
                    );

                    return;

                }


                if (
                    newPassword !==
                    confirmPassword
                ) {

                    showError(
                        "Passwords do not match."
                    );

                    return;

                }


                const currentUser =
                    await waitForFirebaseAuthUser();


                if (!currentUser) {

                    showError(
                        "Admin authentication session has expired. Please log in again."
                    );

                    return;

                }


                if (
                    !currentUser.emailVerified
                ) {

                    showError(
                        "Please verify your email before changing your password."
                    );

                    return;

                }


                if (
                    typeof firebase.functions !==
                    "function"
                ) {

                    showError(
                        "Secure password service is unavailable."
                    );

                    return;

                }


                saveButton.disabled =
                    true;


                saveButton.textContent =
                    "Updating Password...";


                try {

                    const completePasswordChange =
                        firebase
                            .functions()
                            .httpsCallable(
                                "completeAdminPasswordChange"
                            );


                    const result =
                        await completePasswordChange({

                            libraryId:
                                normalizeLibraryId(
                                    libraryId
                                ),

                            newPassword:
                                newPassword

                        });


                    if (
                        !result ||
                        !result.data ||
                        result.data.success !==
                        true
                    ) {

                        throw new Error(
                            "Unable to complete password change."
                        );

                    }


                    localStorage.setItem(
                        SESSION_KEYS.adminMustChangePassword,
                        "false"
                    );


                    alert(
                        "Password changed successfully. Welcome to LibControl."
                    );


                    window.location.href =
                        getPagePath(
                            "admin-dashboard.html"
                        );

                }
                catch (error) {

                    console.error(
                        "[LibControl] First-login password change error:",
                        error
                    );


                    showError(
                        error.message ||
                        "Unable to change password."
                    );


                    saveButton.disabled =
                        false;


                    saveButton.textContent =
                        "Save New Password";

                }

            }
        );

    }


    if (newPasswordInput) {

        newPasswordInput.focus();

    }

}


window.showFirstLoginPasswordChange =
    showFirstLoginPasswordChange;
/* ==========================================================================
   16. ADMIN LOGIN
   ========================================================================== */

/*
 * NEW PRODUCTION FLOW
 *
 * Library ID
 * +
 * Email
 * +
 * Password
 *       ↓
 * Firebase Authentication
 *       ↓
 * Firebase UID
 *       ↓
 * libcontrol_libraries/{libraryId}/admins/{UID}
 *
 * IMPORTANT:
 *
 * No password is checked against Firestore.
 * No password is stored in Firestore.
 */

async function adminLogin(
    libraryId,
    email,
    password
) {

    const id =
        normalizeLibraryId(
            libraryId
        );


    const normalizedEmail =
        String(
            email || ""
        )
            .trim()
            .toLowerCase();


    const pass =
        String(
            password || ""
        );


    if (
        !id ||
        !normalizedEmail ||
        !pass
    ) {

        return {

            success: false,

            message:
                "Please enter Library ID, Email and Password."

        };

    }


    if (
        typeof firebase ===
        "undefined" ||
        !firebase.auth
    ) {

        return {

            success: false,

            message:
                "Firebase Authentication is unavailable."

        };

    }


    try {

        /*
         * Check library before authentication.
         */

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
                        "Login Failed: Invalid Library or credentials."

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


        /*
         * Firebase Authentication.
         */

        const credential =
            await firebase
                .auth()
                .signInWithEmailAndPassword(
                    normalizedEmail,
                    pass
                );


        const user =
            credential.user;


        if (!user) {

            throw new Error(
                "Authentication failed."
            );

        }


        /*
         * Email verification is required
         * before normal Admin access.
         */

        if (
            !user.emailVerified
        ) {

            return {

                success: false,

                requiresEmailVerification:
                    true,

                user:
                    user,

                message:
                    "Please verify your email address before accessing the Admin Dashboard."

            };

        }


        /*
         * Verify the authenticated UID
         * against the selected library.
         */

        const authorization =
            await getAdminAuthorization(
                user,
                id
            );


        if (
            !authorization.authorized
        ) {

            await firebase
                .auth()
                .signOut();


            let message =
                "Access Denied: Admin authorization failed.";


            if (
                authorization.reason ===
                "ADMIN_NOT_FOUND"
            ) {

                message =
                    "Access Denied: This account is not registered as an Admin for this library.";

            }
            else if (
                authorization.reason ===
                "INVALID_ROLE"
            ) {

                message =
                    "Access Denied: Invalid Admin role.";

            }
            else if (
                authorization.reason ===
                "LIBRARY_MISMATCH"
            ) {

                message =
                    "Access Denied: This Admin is not authorized for this library.";

            }
            else if (
                authorization.reason ===
                "ADMIN_DISABLED"
            ) {

                message =
                    "Access Denied: This Admin account is disabled.";

            }


            return {

                success: false,

                message:
                    message

            };

        }


        /*
         * Create local convenience session.
         *
         * Firebase Auth remains the real authentication
         * session.
         */

        const session =
            createAdminSession(

                user,

                id,

                authorization.library,

                authorization.admin

            );


        return {

            success: true,

            user:
                user,

            admin:
                authorization.admin,

            library:
                authorization.library,

            session:
                session

        };

    }
    catch (error) {

        console.error(
            "[LibControl] Admin Firebase login error:",
            error
        );


        let message =
            "Login failed. Please try again.";


        if (
            error.code ===
            "auth/invalid-credential"
        ) {

            message =
                "Invalid email or password.";

        }
        else if (
            error.code ===
            "auth/user-not-found"
        ) {

            message =
                "Invalid email or password.";

        }
        else if (
            error.code ===
            "auth/wrong-password"
        ) {

            message =
                "Invalid email or password.";

        }
        else if (
            error.code ===
            "auth/too-many-requests"
        ) {

            message =
                "Too many login attempts. Please try again later.";

        }
        else if (
            error.code ===
            "auth/network-request-failed"
        ) {

            message =
                "Network error. Please check your internet connection.";

        }
        else if (
            error.code ===
            "auth/user-disabled"
        ) {

            message =
                "This Firebase account has been disabled.";

        }
        else if (
            error.code ===
            "auth/operation-not-allowed"
        ) {

            message =
                "Email/password authentication is not enabled in Firebase.";

        }


        return {

            success: false,

            message:
                message,

            error:
                error

        };

    }

}


window.adminLogin =
    adminLogin;


/* ==========================================================================
   17. ADMIN EMAIL VERIFICATION
   ========================================================================== */

async function resendAdminVerificationEmail() {

    const user =
        await waitForFirebaseAuthUser();


    if (!user) {

        return {

            success: false,

            message:
                "Admin authentication session not found."

        };

    }


    if (
        user.emailVerified
    ) {

        return {

            success: true,

            alreadyVerified:
                true,

            message:
                "Your email is already verified."

        };

    }


    try {

        await user
            .sendEmailVerification();


        return {

            success: true,

            message:
                "Verification email sent successfully."

        };

    }
    catch (error) {

        console.error(
            "[LibControl] Verification email error:",
            error
        );


        let message =
            "Unable to send verification email.";


        if (
            error.code ===
            "auth/too-many-requests"
        ) {

            message =
                "Too many requests. Please wait before requesting another verification email.";

        }


        return {

            success: false,

            message:
                message,

            error:
                error

        };

    }

}


window.resendAdminVerificationEmail =
    resendAdminVerificationEmail;


/* ==========================================================================
   18. FORGOT PASSWORD
   ========================================================================== */

async function sendAdminPasswordReset(
    email
) {

    const normalizedEmail =
        String(
            email || ""
        )
            .trim()
            .toLowerCase();


    if (!normalizedEmail) {

        return {

            success: false,

            message:
                "Please enter your Admin email address."

        };

    }


    if (
        typeof firebase ===
        "undefined" ||
        !firebase.auth
    ) {

        return {

            success: false,

            message:
                "Firebase Authentication is unavailable."

        };

    }


    try {

        await firebase
            .auth()
            .sendPasswordResetEmail(
                normalizedEmail
            );


        return {

            success: true,

            message:
                "Password reset email sent. Please check your email."

        };

    }
    catch (error) {

        console.error(
            "[LibControl] Password reset error:",
            error
        );


        let message =
            "Unable to send password reset email.";


        if (
            error.code ===
            "auth/user-not-found"
        ) {

            /*
             * Do not expose account existence
             * unnecessarily in production.
             */

            message =
                "If an account exists for this email, a password reset email has been sent.";

        }
        else if (
            error.code ===
            "auth/invalid-email"
        ) {

            message =
                "Please enter a valid email address.";

        }
        else if (
            error.code ===
            "auth/too-many-requests"
        ) {

            message =
                "Too many requests. Please try again later.";

        }


        return {

            success: false,

            message:
                message,

            error:
                error

        };

    }

}


window.sendAdminPasswordReset =
    sendAdminPasswordReset;
/* ==========================================================================
   STUDENT PASSWORD RESET
   ========================================================================== */

async function sendStudentPasswordReset(
    email
) {

    const normalizedEmail =
        String(
            email || ""
        )
            .trim()
            .toLowerCase();


    if (!normalizedEmail) {

        return {

            success: false,

            message:
                "Please enter your Student email address."

        };

    }


    if (
        typeof firebase ===
        "undefined" ||
        !firebase.auth
    ) {

        return {

            success: false,

            message:
                "Firebase Authentication is unavailable."

        };

    }


    try {

        await firebase
            .auth()
            .sendPasswordResetEmail(
                normalizedEmail
            );


        return {

            success: true,

            message:
                "Password reset email sent. Please check your email."

        };

    }
    catch (error) {

        console.error(
            "[LibControl] Student password reset error:",
            error
        );


        let message =
            "Unable to send password reset email.";


        if (
            error.code ===
            "auth/user-not-found"
        ) {

            message =
                "If an account exists for this email, a password reset email has been sent.";

        }
        else if (
            error.code ===
            "auth/invalid-email"
        ) {

            message =
                "Please enter a valid email address.";

        }
        else if (
            error.code ===
            "auth/too-many-requests"
        ) {

            message =
                "Too many requests. Please try again later.";

        }


        return {

            success: false,

            message:
                message,

            error:
                error

        };

    }

}


window.sendStudentPasswordReset =
    sendStudentPasswordReset;


/* ==========================================================================
   19. CHANGE ADMIN PASSWORD
   ========================================================================== */

async function changeAdminPassword(
    currentPassword,
    newPassword
) {

    const user =
        await waitForFirebaseAuthUser();


    if (!user) {

        return {

            success: false,

            message:
                "Admin authentication session has expired."

        };

    }


    const currentPass =
        String(
            currentPassword || ""
        );


    const newPass =
        String(
            newPassword || ""
        );


    if (
        !currentPass ||
        !newPass
    ) {

        return {

            success: false,

            message:
                "Please enter current and new password."

        };

    }


    if (
        newPass.length <
        8
    ) {

        return {

            success: false,

            message:
                "New password must contain at least 8 characters."

        };

    }


    if (
        currentPass ===
        newPass
    ) {

        return {

            success: false,

            message:
                "New password must be different from current password."

        };

    }


    try {

        const credential =
            firebase.auth
                .EmailAuthProvider
                .credential(
                    user.email,
                    currentPass
                );


        await user.reauthenticateWithCredential(
            credential
        );


        await user.updatePassword(
            newPass
        );


        return {

            success: true,

            message:
                "Password changed successfully."

        };

    }
    catch (error) {

        console.error(
            "[LibControl] Change password error:",
            error
        );


        let message =
            "Unable to change password.";


        if (
            error.code ===
            "auth/wrong-password" ||
            error.code ===
            "auth/invalid-credential"
        ) {

            message =
                "Current password is incorrect.";

        }
        else if (
            error.code ===
            "auth/weak-password"
        ) {

            message =
                "New password is too weak.";

        }
        else if (
            error.code ===
            "auth/requires-recent-login"
        ) {

            message =
                "Please log in again before changing your password.";

        }


        return {

            success: false,

            message:
                message,

            error:
                error

        };

    }

}


window.changeAdminPassword =
    changeAdminPassword;
/* ==========================================================================
   20. ADMIN AUTH SESSION RESTORE
   ========================================================================== */

/*
 * Used by Admin Dashboard and other Admin pages.
 *
 * Firebase Auth is the real session authority.
 * localStorage is only a convenience/session-routing layer.
 */

async function restoreAdminSession() {

    const user =
        await waitForFirebaseAuthUser();


    if (!user) {

        return {

            success: false,

            reason:
                "NO_AUTH_USER"

        };

    }


    if (
        !user.emailVerified
    ) {

        return {

            success: false,

            reason:
                "EMAIL_NOT_VERIFIED",

            user:
                user

        };

    }


    const session =
        getCurrentSession();


    const libraryId =
        normalizeLibraryId(
            session.libraryId
        );


    if (!libraryId) {

        return {

            success: false,

            reason:
                "NO_LIBRARY_SESSION",

            user:
                user

        };

    }


    const authorization =
        await getAdminAuthorization(
            user,
            libraryId
        );


    if (
        !authorization.authorized
    ) {

        return {

            success: false,

            reason:
                authorization.reason,

            user:
                user

        };

    }


    createAdminSession(

        user,

        libraryId,

        authorization.library,

        authorization.admin

    );


    return {

        success: true,

        user:
            user,

        admin:
            authorization.admin,

        library:
            authorization.library

    };

}


window.restoreAdminSession =
    restoreAdminSession;


/* ==========================================================================
   21. ADMIN SESSION PROTECTION
   ========================================================================== */

async function requireAdminSession() {

    const user =
        await waitForFirebaseAuthUser();


    if (!user) {

        clearAdminSession();

        window.location.href =
            getRootIndexPath();

        return false;

    }


    if (
        !user.emailVerified
    ) {

        clearAdminSession();

        window.location.href =
            getRootIndexPath();

        return false;

    }


    const session =
        getCurrentSession();


    if (
        session.role !==
        "admin" ||
        !session.libraryId
    ) {

        clearAdminSession();

        window.location.href =
            getRootIndexPath();

        return false;

    }


    const authorization =
        await getAdminAuthorization(
            user,
            session.libraryId
        );


    if (
        !authorization.authorized
    ) {

        console.warn(
            "[LibControl] Admin session rejected:",
            authorization.reason
        );


        try {

            await firebase
                .auth()
                .signOut();

        }
        catch (error) {

            console.error(
                "[LibControl] Admin sign-out error:",
                error
            );

        }


        clearAdminSession();

        window.location.href =
            getRootIndexPath();

        return false;

    }


    createAdminSession(

        user,

        session.libraryId,

        authorization.library,

        authorization.admin

    );


    return true;

}


window.requireAdminSession =
    requireAdminSession;


/* ==========================================================================
   22. STUDENT SESSION PROTECTION
   ========================================================================== */

function requireStudentSession() {

    const session =
        getCurrentSession();


    if (
        session.role !==
        "student" ||
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


/* ==========================================================================
   23. MANAGER SESSION COMPATIBILITY
   ========================================================================== */

/*
 * Manager authentication is handled by manager.js.
 *
 * Do not modify or interfere with Manager Firebase Auth here.
 */

function requireManagerSession() {

    const role =
        localStorage.getItem(
            "session_role"
        );


    if (
        role !==
        "master_manager"
    ) {

        window.location.href =
            "manager-login.html";

        return false;

    }


    return true;

}


window.requireManagerSession =
    requireManagerSession;


/* ==========================================================================
   24. GATEWAY AUTH PIPELINES
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

    if (
        studentForm &&
        !studentForm.dataset.authBound
    ) {

        studentForm.dataset.authBound =
            "true";


        studentForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                const libraryInput =
                    document.getElementById(
                        "student-library-id"
                    );


               const emailInput =
    document.getElementById(
        "student-email"
    );


const passwordInput =
    document.getElementById(
        "student-password"
    );


if (
    !libraryInput ||
    !emailInput ||
    !passwordInput
) {

    alert(
        "Student login fields not found."
    );

    return;

}


const result =
    await studentLogin(

        libraryInput.value,

        emailInput.value,

        passwordInput.value
    );


                if (
                    !result.success
                ) {

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
       ADMIN LOGIN
    ---------------------------------------------------------------------- */

    if (
        adminForm &&
        !adminForm.dataset.authBound
    ) {

        adminForm.dataset.authBound =
            "true";


        adminForm.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                const libraryInput =
                    document.getElementById(
                        "admin-library-id"
                    );


                const emailInput =
                    document.getElementById(
                        "admin-email"
                    );


                const passwordInput =
                    document.getElementById(
                        "admin-password"
                    );


                /*
                 * Current gateway HTML must eventually
                 * contain admin-email.
                 *
                 * We deliberately do not fall back to
                 * adminPass or Firestore password.
                 */

                if (
                    !libraryInput ||
                    !emailInput ||
                    !passwordInput
                ) {

                    alert(
                        "Admin login fields are incomplete. Admin Email field is required."
                    );

                    return;

                }


                const result =
                    await adminLogin(

                        libraryInput.value,

                        emailInput.value,

                        passwordInput.value

                    );


                if (
                    !result.success
                ) {

                    if (
                        result.requiresEmailVerification
                    ) {

                        const resend =
                            window.confirm(
                                result.message +
                                "\n\nWould you like us to send the verification email again?"
                            );


                        if (resend) {

                            const verificationResult =
                                await resendAdminVerificationEmail();


                            alert(
                                verificationResult.message
                            );

                        }

                    }
                    else {

                        alert(
                            result.message
                        );

                    }


                    return;

                }


                /*
                 * First-login password change.
                 *
                 * The actual screen will be handled by
                 * the Admin Login UI in the next Admin file step.
                 */

           if (
    result.admin &&
    result.admin.mustChangePassword ===
    true
) {

    showFirstLoginPasswordChange(
        normalizeLibraryId(
            libraryInput.value
        )
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


window.bindGatewayAuthPipelines =
    bindGatewayAuthPipelines;


/* ==========================================================================
   25. LIBRARY NAVIGATION
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
   26. LOGOUT
   ========================================================================== */

async function logoutAdmin() {

    try {

        if (
            typeof firebase !==
            "undefined" &&
            firebase.auth
        ) {

            await firebase
                .auth()
                .signOut();

        }

    }
    catch (error) {

        console.error(
            "[LibControl] Admin logout error:",
            error
        );

    }


    clearAdminSession();


    sessionStorage.removeItem(
        "libmanage_session"
    );


    window.location.href =
        getRootIndexPath();

}


window.logoutAdmin =
    logoutAdmin;


/* ==========================================================================
   27. GLOBAL LOGOUT HANDLER
   ========================================================================== */

document.addEventListener(
    "click",
    (event) => {

        const logoutButton =
            event.target.closest(
                "#admin-logout-btn"
            );


        if (
            logoutButton
        ) {

            logoutAdmin();

            return;

        }


        const studentLogoutButton =
            event.target.closest(
                "#student-exit-btn"
            );


        if (
            studentLogoutButton
        ) {

            clearLibManageSession();

            sessionStorage.removeItem(
                "libmanage_session"
            );

            window.location.href =
                getRootIndexPath();

        }

    }
);


/* ==========================================================================
   28. COMPONENT LOADER
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
                    method:
                        "GET",

                    cache:
                        "no-store"
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

    }
    catch (error) {

        console.error(
            "[LibControl Component Loader Error]",
            error
        );

    }

}


window.loadSaaSLayoutComponent =
    loadSaaSLayoutComponent;


/* ==========================================================================
   29. ADMIN NOTICE MODULE
   ========================================================================== */

let adminNoticeRealtimeUnsubscribe =
    null;


function initAdminNoticeModule() {

    const addButton =
        document.getElementById(
            "btn-add-notice"
        );


    const noticeContainer =
        document.getElementById(
            "dashboard-notification-list"
        );


    /*
     * Current dashboard HTML uses:
     *
     * #notice-modal
     * #notice-form
     * #notice-title
     * #notice-message
     *
     * This module is kept compatible with those IDs.
     */

    const modal =
        document.getElementById(
            "notice-modal"
        );


    const form =
        document.getElementById(
            "notice-form"
        );


    const closeButton =
        document.getElementById(
            "close-notice-modal"
        );


    const cancelButton =
        document.getElementById(
            "cancel-notice-btn"
        );


    const titleInput =
        document.getElementById(
            "notice-title"
        );


    const messageInput =
        document.getElementById(
            "notice-message"
        );


    if (
        !noticeContainer
    ) {

        return;

    }


    const session =
        getCurrentSession();


    if (
        session.role !==
        "admin" ||
        !session.libraryId ||
        !window.db
    ) {

        return;

    }


    const noticeCollection =
        noticesRef(
            session.libraryId
        );


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

        }
        else if (
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


    function openModal() {

        if (!modal) {

            return;

        }


        modal.classList.add(
            "active"
        );


        modal.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    function closeModal() {

        if (!modal) {

            return;

        }


        modal.classList.remove(
            "active"
        );


        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        if (form) {

            form.reset();

        }

    }


    async function saveNotice(
        event
    ) {

        event.preventDefault();


        if (
            !titleInput ||
            !messageInput
        ) {

            return;

        }


        const title =
            titleInput.value.trim();


        const message =
            messageInput.value.trim();


        if (!title) {

            alert(
                "Please enter a notice title."
            );

            return;

        }


        if (!message) {

            alert(
                "Please enter a notice message."
            );

            return;

        }


        try {

            const currentUser =
                await waitForFirebaseAuthUser();


            if (!currentUser) {

                throw new Error(
                    "Admin authentication session expired."
                );

            }


            if (
                !currentUser.emailVerified
            ) {

                throw new Error(
                    "Please verify your Admin email first."
                );

            }


            const authorization =
                await getAdminAuthorization(

                    currentUser,

                    session.libraryId

                );


            if (
                !authorization.authorized
            ) {

                throw new Error(
                    "Admin authorization failed."
                );

            }


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
                        currentUser.uid

                });


            closeModal();


        }
        catch (error) {

            console.error(
                "[LibControl Notice Save Error]",
                error
            );


            alert(
                error.message ||
                "Unable to save notice."
            );

        }

    }


    if (
        addButton &&
        !addButton.dataset.noticeBound
    ) {

        addButton.dataset.noticeBound =
            "true";


        addButton.addEventListener(
            "click",
            openModal
        );

    }


    if (
        closeButton &&
        !closeButton.dataset.noticeBound
    ) {

        closeButton.dataset.noticeBound =
            "true";


        closeButton.addEventListener(
            "click",
            closeModal
        );

    }


    if (
        cancelButton &&
        !cancelButton.dataset.noticeBound
    ) {

        cancelButton.dataset.noticeBound =
            "true";


        cancelButton.addEventListener(
            "click",
            closeModal
        );

    }


    if (
        form &&
        !form.dataset.noticeBound
    ) {

        form.dataset.noticeBound =
            "true";


        form.addEventListener(
            "submit",
            saveNotice
        );

    }


    if (
        modal &&
        !modal.dataset.noticeBound
    ) {

        modal.dataset.noticeBound =
            "true";


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

    }


    if (
        typeof adminNoticeRealtimeUnsubscribe ===
        "function"
    ) {

        adminNoticeRealtimeUnsubscribe();

    }


    adminNoticeRealtimeUnsubscribe =
        noticeCollection.onSnapshot(

            (snapshot) => {

                const documents =
                    snapshot.docs.slice();


                documents.sort(
                    (a, b) => {

                        const aData =
                            a.data();


                        const bData =
                            b.data();


                        const aTime =
                            aData.createdAt &&
                            typeof aData.createdAt.toMillis ===
                            "function"
                                ? aData.createdAt.toMillis()
                                : 0;


                        const bTime =
                            bData.createdAt &&
                            typeof bData.createdAt.toMillis ===
                            "function"
                                ? bData.createdAt.toMillis()
                                : 0;


                        return bTime -
                            aTime;

                    }
                );


                if (
                    !documents.length
                ) {

                    noticeContainer.innerHTML = `

                        <div class="empty-state-text">

                            No notices available right now.

                        </div>

                    `;

                    return;

                }


                noticeContainer.innerHTML =
                    documents
                        .map(
                            (doc) => {

                                const data =
                                    doc.data();


                                return `

                                    <div
                                        class="notification-item"
                                    >

                                        <div>

                                            <strong>
                                                ${escapeHtml(
                                                    data.title ||
                                                    "Untitled Notice"
                                                )}
                                            </strong>

                                            <p>
                                                ${escapeHtml(
                                                    data.message ||
                                                    ""
                                                )}
                                            </p>

                                        </div>

                                        <small>
                                            ${escapeHtml(
                                                formatDate(
                                                    data.createdAt
                                                )
                                            )}
                                        </small>

                                    </div>

                                `;

                            }
                        )
                        .join("");

            },

            (error) => {

                console.error(
                    "[LibControl Notice Listener Error]",
                    error
                );


                noticeContainer.innerHTML = `

                    <div class="empty-state-text">

                        Unable to load notices right now.

                    </div>

                `;

            }

        );

}


window.initAdminNoticeModule =
    initAdminNoticeModule;


/* ==========================================================================
   30. DOM READY
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
   31. GLOBAL CORE OBJECT
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

    clearAdminSession:
        clearAdminSession,

    library:
        libraryRef,

    admins:
        adminsRef,

    admin:
        adminRef,

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

    getAdminAuthorization:
        getAdminAuthorization,

    restoreAdminSession:
        restoreAdminSession,

    requireAdmin:
        requireAdminSession,

    requireStudent:
        requireStudentSession,

    requireManager:
        requireManagerSession,

    resendAdminVerificationEmail:
        resendAdminVerificationEmail,

    sendAdminPasswordReset:
        sendAdminPasswordReset,

    changeAdminPassword:
        changeAdminPassword

};


/* ==========================================================================
   32. FINAL STATUS
   ========================================================================== */

console.log(
    "[LibControl] Shared dashboard.js loaded successfully."
);

console.log(
    "[LibControl] Firebase Authentication Admin architecture enabled."
);

console.log(
    "[LibControl] Firestore admin passwords are NOT used."
);
