/**
 * ==========================================================================
 * LIBCONTROL - MASTER MANAGER ENGINE
 * ==========================================================================
 *
 * NEW APP ONLY
 *
 * Collections used:
 *
 *     master_managers
 *     libcontrol_apps
 *     libcontrol_libraries
 *
 * This file NEVER uses the old:
 *
 *     saas_libraries
 *
 * ==========================================================================
 */

"use strict";


/* ==========================================================================
   1. FIREBASE
   ========================================================================== */

let managerDB = null;

if (
    typeof firebase !== "undefined" &&
    firebase.apps &&
    firebase.apps.length > 0
) {

    managerDB =
        firebase.firestore();

}

window.managerDB =
    managerDB;


/* ==========================================================================
   2. COLLECTION NAMES
   ========================================================================== */

const LIBCONTROL = {

    MASTER_MANAGERS:
        "master_managers",

    APPS:
        "libcontrol_apps",

    LIBRARIES:
        "libcontrol_libraries"

};


/* ==========================================================================
   3. SESSION HELPERS
   ========================================================================== */

function getManagerUID() {

    return localStorage.getItem(
        "session_manager_uid"
    );

}


function getManagerEmail() {

    return localStorage.getItem(
        "session_manager_email"
    );

}


/* ==========================================================================
   4. BASIC HELPERS
   ========================================================================== */

function safeText(value) {

    return String(
        value ?? ""
    );

}


function escapeHTML(value) {

    return safeText(value)
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
            "&#039;"
        );

}


function normalizeLibraryID(value) {

    return safeText(value)
        .trim()
        .toUpperCase()
        .replace(
            /[^A-Z0-9_-]/g,
            ""
        );

}


function generateLibraryID() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let id =
        "LIB-";


    for (
        let i = 0;
        i < 6;
        i++
    ) {

        id +=
            characters[
                Math.floor(
                    Math.random() *
                    characters.length
                )
            ];

    }


    return id;

}


/* ==========================================================================
   5. FIREBASE AUTH RESTORE WAIT
   ==========================================================================
   
   IMPORTANT:
   Firebase Auth may take a short moment to restore the logged-in user.
   We MUST NOT check firebase.auth().currentUser immediately.
   
   ========================================================================== */

function waitForFirebaseUser(
    timeout = 10000
) {

    return new Promise(
        (resolve) => {

            let finished =
                false;


            let timer =
                null;


            const unsubscribe =
                firebase
                    .auth()
                    .onAuthStateChanged(
                        (user) => {

                            if (finished) {
                                return;
                            }


                            finished =
                                true;


                            if (timer) {

                                clearTimeout(
                                    timer
                                );

                            }


                            unsubscribe();


                            resolve(
                                user || null
                            );

                        }
                    );


            timer =
                setTimeout(
                    () => {

                        if (finished) {
                            return;
                        }


                        finished =
                            true;


                        unsubscribe();


                        resolve(
                            firebase
                                .auth()
                                .currentUser ||
                            null
                        );

                    },
                    timeout
                );

        }
    );

}


/* ==========================================================================
   6. AUTHORIZATION
   ========================================================================== */

async function verifyMasterManager() {

    if (!managerDB) {

        throw new Error(
            "Firebase Firestore is not initialized."
        );

    }


    if (
        typeof firebase ===
        "undefined" ||
        !firebase.auth
    ) {

        throw new Error(
            "Firebase Authentication SDK is not loaded."
        );

    }


    /*
     * IMPORTANT:
     *
     * Wait for Firebase to restore the authenticated user.
     */

    const currentUser =
        await waitForFirebaseUser();


    if (!currentUser) {

        console.warn(
            "[LibControl] No Firebase user session found."
        );


        /*
         * Do NOT call localStorage.clear().
         * Only remove LibControl manager session.
         */

        localStorage.removeItem(
            "session_role"
        );

        localStorage.removeItem(
            "session_manager_uid"
        );

        localStorage.removeItem(
            "session_manager_email"
        );


        window.location.href =
            "manager-login.html";


        return false;

    }


    /*
     * Firebase UID is the trusted identity.
     */

    const managerUID =
        currentUser.uid;


    /*
     * Keep local session synchronized.
     */

    localStorage.setItem(
        "session_role",
        "master_manager"
    );

    localStorage.setItem(
        "session_manager_uid",
        managerUID
    );

    localStorage.setItem(
        "session_manager_email",
        currentUser.email || ""
    );


    /*
     * Check Master Manager authorization document.
     */

    const managerSnapshot =
        await managerDB
            .collection(
                LIBCONTROL.MASTER_MANAGERS
            )
            .doc(managerUID)
            .get();


    if (!managerSnapshot.exists) {

        console.error(
            "[LibControl] Master Manager document not found:",
            managerUID
        );


        await firebase
            .auth()
            .signOut();


        localStorage.removeItem(
            "session_role"
        );

        localStorage.removeItem(
            "session_manager_uid"
        );

        localStorage.removeItem(
            "session_manager_email"
        );


        alert(
            "Access Denied: This Firebase account is not registered as a Master Manager."
        );


        window.location.href =
            "manager-login.html";


        return false;

    }


    const managerData =
        managerSnapshot.data() || {};


    if (
        managerData.role !==
        "master_manager"
    ) {

        await firebase
            .auth()
            .signOut();


        localStorage.removeItem(
            "session_role"
        );

        localStorage.removeItem(
            "session_manager_uid"
        );

        localStorage.removeItem(
            "session_manager_email"
        );


        alert(
            "Access Denied: Invalid Master Manager role."
        );


        window.location.href =
            "manager-login.html";


        return false;

    }


    if (
        managerData.enabled ===
        false
    ) {

        await firebase
            .auth()
            .signOut();


        localStorage.removeItem(
            "session_role"
        );

        localStorage.removeItem(
            "session_manager_uid"
        );

        localStorage.removeItem(
            "session_manager_email"
        );


        alert(
            "Access Denied: Master Manager account is disabled."
        );


        window.location.href =
            "manager-login.html";


        return false;

    }


    console.log(
        "[LibControl] Master Manager verified:",
        currentUser.email
    );


    return true;

}


/* ==========================================================================
   7. CREATE / VERIFY LIBCONTROL APP
   ========================================================================== */

async function ensureLibControlApp() {

    const managerUID =
        getManagerUID();


    if (!managerUID) {

        throw new Error(
            "Manager session UID is missing."
        );

    }


    const appRef =
        managerDB
            .collection(
                LIBCONTROL.APPS
            )
            .doc(
                "libcontrol"
            );


    const snapshot =
        await appRef.get();


    if (!snapshot.exists) {

        await appRef.set({

            appId:
                "libcontrol",

            appName:
                "LibControl",

            appType:
                "library_management",

            ownerManagerUID:
                managerUID,

            ownerManagerEmail:
                getManagerEmail() || "",

            enabled:
                true,

            createdAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp(),

            updatedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        });


        console.log(
            "[LibControl] Application registry created."
        );

    }
    else {

        await appRef.set({

            updatedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        }, {

            merge:
                true

        });

    }


    return "libcontrol";

}


/* ==========================================================================
   8. CREATE LIBRARY + CREATE FIREBASE ADMIN
   ========================================================================== */

async function createLibraryRecord(
    data
) {

    const managerUID =
        getManagerUID();


    if (!managerUID) {

        throw new Error(
            "Manager session has expired."
        );

    }


    const appId =
        await ensureLibControlApp();


    let libraryId =
        normalizeLibraryID(
            data.libraryId
        );


    if (!libraryId) {

        libraryId =
            generateLibraryID();

    }


    const libraryName =
        safeText(
            data.name
        ).trim();


    const adminEmail =
        safeText(
            data.adminEmail
        )
        .trim()
        .toLowerCase();


    const adminPass =
        String(
            data.adminPass || ""
        );


    const totalSeats =
        Number(
            data.totalSeats || 0
        );


    const mobile =
        safeText(
            data.mobile
        ).trim();


    const joiningDate =
        safeText(
            data.joiningDate
        );


    const expiryDate =
        safeText(
            data.expiryDate
        );


    if (!libraryName) {

        throw new Error(
            "Library name is required."
        );

    }


    if (!adminEmail) {

        throw new Error(
            "Admin Email is required."
        );

    }


    if (!adminPass || adminPass.length < 8) {

        throw new Error(
            "Temporary Admin Password must contain at least 8 characters."
        );

    }


    if (
        !Number.isFinite(totalSeats) ||
        totalSeats < 5
    ) {

        throw new Error(
            "Seat capacity must be at least 5."
        );

    }


    const libraryRef =
        managerDB
            .collection(
                LIBCONTROL.LIBRARIES
            )
            .doc(
                libraryId
            );


    const existing =
        await libraryRef.get();


    if (existing.exists) {

        throw new Error(
            "Generated Library ID already exists. Please try again."
        );

    }


    /*
     * IMPORTANT:
     *
     * ADMIN PASSWORD IS NEVER WRITTEN TO FIRESTORE.
     *
     * Only Admin Email is kept in the library document
     * for Manager registry/display purposes.
     */

    await libraryRef.set({

        libraryId:
            libraryId,

        appId:
            appId,

        name:
            libraryName,

        adminEmail:
            adminEmail,

        mobile:
            mobile,

        totalSeats:
            totalSeats,

        joiningDate:
            joiningDate,

        expiryDate:
            expiryDate,

        ownerManagerUID:
            managerUID,

        ownerManagerEmail:
            getManagerEmail() || "",

        status:
            "approved",

        enabled:
            true,

        createdAt:
            firebase.firestore
                .FieldValue
                .serverTimestamp(),

        updatedAt:
            firebase.firestore
                .FieldValue
                .serverTimestamp()

    });


    /*
     * AUTOMATIC GENERAL CONFIGURATION
     */

    await libraryRef
        .collection(
            "settings"
        )
        .doc(
            "general"
        )
        .set({

            libraryId:
                libraryId,

            appId:
                appId,

            totalSeats:
                totalSeats,

            capacityConfigured:
                totalSeats > 0,

            createdAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp(),

            updatedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        });


    /*
     * AUTOMATIC SHIFT CONFIGURATION
     */

    await libraryRef
        .collection(
            "settings"
        )
        .doc(
            "shifts"
        )
        .set({

            morningCapacity:
                0,

            afternoonCapacity:
                0,

            eveningCapacity:
                0,

            fullDayCapacity:
                totalSeats,

            updatedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        });


    /*
     * AUTOMATIC METADATA
     */

    await libraryRef
        .collection(
            "metadata"
        )
        .doc(
            "system"
        )
        .set({

            libraryId:
                libraryId,

            appId:
                appId,

            initialized:
                true,

            version:
                "1.0",

            createdAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        });


    /*
     * ================================================================
     * CREATE ADMIN THROUGH SECURE CLOUD FUNCTION
     * ================================================================
     *
     * Password goes:
     *
     * Manager browser
     *       ↓
     * Firebase Callable Function
     *       ↓
     * Firebase Authentication
     *
     * It is NEVER stored in Firestore.
     */

    try {

        if (
            typeof firebase.functions !==
            "function"
        ) {

            throw new Error(
                "Firebase Functions SDK is not loaded."
            );

        }


        const createAdmin =
            firebase
                .functions()
                .httpsCallable(
                    "createLibraryAdmin"
                );


        const adminResult =
            await createAdmin({

                libraryId:
                    libraryId,

                email:
                    adminEmail,

                temporaryPassword:
                    adminPass

            });


        const resultData =
            adminResult.data || {};


        if (
            resultData.success !==
            true
        ) {

            throw new Error(
                resultData.message ||
                "Unable to create Admin account."
            );

        }


        console.log(
            "[LibControl] Firebase Admin account created:",
            {
                libraryId:
                    libraryId,

                uid:
                    resultData.uid,

                email:
                    resultData.email
            }
        );


    }
    catch (error) {

        console.error(
            "[LibControl] Admin account creation failed:",
            error
        );


        /*
         * ROLLBACK LIBRARY INITIALIZATION
         *
         * If Firebase Auth Admin creation fails,
         * do not leave an unusable library behind.
         */

        try {

            await libraryRef
                .collection(
                    "settings"
                )
                .doc(
                    "general"
                )
                .delete();


            await libraryRef
                .collection(
                    "settings"
                )
                .doc(
                    "shifts"
                )
                .delete();


            await libraryRef
                .collection(
                    "metadata"
                )
                .doc(
                    "system"
                )
                .delete();


            await libraryRef.delete();

        }
        catch (rollbackError) {

            console.error(
                "[LibControl] Library rollback failed:",
                rollbackError
            );

        }


        throw new Error(
            error.message ||
            "Unable to create Admin account. Library creation was cancelled."
        );

    }


    return {

        libraryId:
            libraryId

    };

}

/* ==========================================================================
   9. LOAD LIBRARIES
   ========================================================================== */

async function loadManagerLibraries() {

    const managerUID =
        getManagerUID();


    if (!managerUID) {

        return [];

    }


    const snapshot =
        await managerDB
            .collection(
                LIBCONTROL.LIBRARIES
            )
            .where(
                "ownerManagerUID",
                "==",
                managerUID
            )
            .get();


    return snapshot.docs.map(
        (doc) => ({

            id:
                doc.id,

            ...doc.data()

        })
    );

}


/* ==========================================================================
   10. DASHBOARD METRICS
   ========================================================================== */

function updateManagerMetrics(
    libraries
) {

    const totalElement =
        document.getElementById(
            "total-branches-count"
        );


    const activeElement =
        document.getElementById(
            "active-branches-count"
        );


    const disabledElement =
        document.getElementById(
            "disabled-branches-count"
        );


    const total =
        libraries.length;


    const active =
        libraries.filter(
            library =>
                library.enabled !== false
        ).length;


    const disabled =
        libraries.filter(
            library =>
                library.enabled === false
        ).length;


    if (totalElement) {

        totalElement.textContent =
            total;

    }


    if (activeElement) {

        activeElement.textContent =
            active;

    }


    if (disabledElement) {

        disabledElement.textContent =
            disabled;

    }

}


/* ==========================================================================
   11. RENDER LIBRARY REGISTRY
   ========================================================================== */

function renderManagerLibraries(
    libraries
) {

    const tableBody =
        document.getElementById(
            "network-libraries-rows"
        );


    if (!tableBody) {

        console.warn(
            "[LibControl] Registry table not found."
        );

        return;

    }


    updateManagerMetrics(
        libraries
    );


    if (!libraries.length) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="
                        text-align:center;
                        padding:2rem;
                    "
                >
                    No library branches registered yet.

                </td>

            </tr>

        `;

        return;

    }


    tableBody.innerHTML =
        libraries
            .map(
                (library) => {

                    const id =
                        library.libraryId ||
                        library.id ||
                        "";


                    const name =
                        library.name ||
                        "Unnamed Library";


                    const email =
                        library.adminEmail ||
                        "-";


                    const seats =
                        Number(
                            library.totalSeats || 0
                        );


                    const status =
                        library.status ||
                        "approved";


                    const enabled =
                        library.enabled !== false;


                    return `

                        <tr
                            data-library-id="${escapeHTML(id)}"
                        >

                            <td>

                                <div
                                    class="lib-meta-cell"
                                >

                                    <strong>
                                        ${escapeHTML(name)}
                                    </strong>

                                    <span>
                                        ${escapeHTML(id)}
                                    </span>

                                </div>

                            </td>


                            <td>
                                ${escapeHTML(email)}
                            </td>


                            <td>
                                ${seats}
                            </td>


                            <td>

                                <span
                                    class="mgr-badge ${
                                        enabled
                                            ? "status-active"
                                            : "status-disabled"
                                    }"
                                >

                                    ${
                                        enabled
                                            ? "Active"
                                            : "Disabled"
                                    }

                                </span>

                            </td>


                            <td
                                class="text-right"
                            >

                                <div
                                    class="mgr-actions-row"
                                >

                                    <button
                                        type="button"
                                        class="btn-ops-toggle btn-edit"
                                        data-library-edit="${escapeHTML(id)}"
                                    >
                                        Edit
                                    </button>


                                    <button
                                        type="button"
                                        class="btn-ops-toggle ${
                                            enabled
                                                ? "btn-disable"
                                                : "btn-enable"
                                        }"
                                        data-library-toggle="${escapeHTML(id)}"
                                    >

                                        ${
                                            enabled
                                                ? "Disable"
                                                : "Enable"
                                        }

                                    </button>


                                    <button
                                        type="button"
                                        class="btn-ops-toggle btn-delete"
                                        data-library-delete="${escapeHTML(id)}"
                                    >
                                        Delete
                                    </button>

                                </div>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* ==========================================================================
   12. REFRESH LIBRARIES
   ========================================================================== */

async function refreshManagerLibraries() {

    try {

        const libraries =
            await loadManagerLibraries();


        renderManagerLibraries(
            libraries
        );


        return libraries;

    }
    catch (error) {

        console.error(
            "[LibControl] Library registry error:",
            error
        );


        const tableBody =
            document.getElementById(
                "network-libraries-rows"
            );


        if (tableBody) {

            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="5"
                        style="
                            text-align:center;
                            padding:2rem;
                        "
                    >
                        Unable to load library registry.

                    </td>

                </tr>

            `;

        }


        return [];

    }

}


/* ==========================================================================
   13. CREATE LIBRARY FORM
   ========================================================================== */

function initializeLibraryCreationForm() {

    const form =
        document.getElementById(
            "create-library-form"
        );


    if (!form) {

        console.warn(
            "[LibControl] create-library-form not found."
        );

        return;

    }


    if (
        form.dataset.managerBound ===
        "true"
    ) {

        return;

    }


    form.dataset.managerBound =
        "true";


    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const nameInput =
                document.getElementById(
                    "lib-name"
                );


            const emailInput =
                document.getElementById(
                    "lib-email"
                );


            const passwordInput =
                document.getElementById(
                    "lib-pass"
                );


            const seatsInput =
                document.getElementById(
                    "lib-seats"
                );


            const mobileInput =
                document.getElementById(
                    "lib-mobile"
                );


            const joiningInput =
                document.getElementById(
                    "lib-joining-date"
                );


            const expiryInput =
                document.getElementById(
                    "lib-expiry-date"
                );


            const libraryName =
                nameInput
                    ? nameInput.value.trim()
                    : "";


            const adminEmail =
                emailInput
                    ? emailInput.value.trim()
                    : "";


            const adminPass =
                passwordInput
                    ? passwordInput.value
                    : "";


            const totalSeats =
                seatsInput
                    ? Number(
                        seatsInput.value
                    )
                    : 0;


            const mobile =
                mobileInput
                    ? mobileInput.value.trim()
                    : "";


            const joiningDate =
                joiningInput
                    ? joiningInput.value
                    : "";


            const expiryDate =
                expiryInput
                    ? expiryInput.value
                    : "";


            if (!libraryName) {

                alert(
                    "Please enter Library Name."
                );

                return;

            }


            if (!adminEmail) {

                alert(
                    "Please enter Admin Email."
                );

                return;

            }


            if (!adminPass) {

                alert(
                    "Please enter Admin Password."
                );

                return;

            }


            if (
                adminPass.length <
                8
            ) {

                alert(
                    "Admin Password must contain at least 8 characters."
                );

                return;

            }


            if (
                !Number.isFinite(
                    totalSeats
                ) ||
                totalSeats < 5
            ) {

                alert(
                    "Seat capacity must be at least 5."
                );

                return;

            }


            const submitButton =
                form.querySelector(
                    "button[type='submit']"
                );


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Initializing...";

            }


            try {

                const libraryId =
                    await createLibraryRecord({

                        name:
                            libraryName,

                        adminEmail:
                            adminEmail,

                        adminPass:
                            adminPass,

                        totalSeats:
                            totalSeats,

                        mobile:
                            mobile,

                        joiningDate:
                            joiningDate,

                        expiryDate:
                            expiryDate

                    });


                alert(
                    "Library created successfully.\n\nLibrary ID: " +
                    libraryId
                );


                form.reset();


                if (seatsInput) {

                    seatsInput.value =
                        "30";

                }


                await refreshManagerLibraries();

            }
            catch (error) {

                console.error(
                    "[LibControl] Library creation error:",
                    error
                );


                if (
                    error.code ===
                    "permission-denied"
                ) {

                    alert(
                        "Firestore permission denied. Check your Firestore Security Rules."
                    );

                }
                else {

                    alert(
                        error.message ||
                        "Unable to create library."
                    );

                }

            }
            finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Initialize Network Node";

                }

            }

        }
    );

}


/* ==========================================================================
   14. UPDATE LIBRARY
   ========================================================================== */

async function updateLibraryRecord(
    libraryId,
    updates
) {

    const normalizedID =
        normalizeLibraryID(
            libraryId
        );


    if (!normalizedID) {

        throw new Error(
            "Invalid Library ID."
        );

    }


    const reference =
        managerDB
            .collection(
                LIBCONTROL.LIBRARIES
            )
            .doc(
                normalizedID
            );


    const snapshot =
        await reference.get();


    if (!snapshot.exists) {

        throw new Error(
            "Library not found."
        );

    }


    const library =
        snapshot.data() || {};


    if (
        library.ownerManagerUID !==
        getManagerUID()
    ) {

        throw new Error(
            "You are not authorized to modify this library."
        );

    }


    const updateData =
        {};


    if (
        Object.prototype.hasOwnProperty.call(
            updates,
            "name"
        )
    ) {

        const name =
            safeText(
                updates.name
            ).trim();


        if (!name) {

            throw new Error(
                "Library name cannot be empty."
            );

        }


        updateData.name =
            name;

    }


    if (
        Object.prototype.hasOwnProperty.call(
            updates,
            "adminEmail"
        )
    ) {

        updateData.adminEmail =
            safeText(
                updates.adminEmail
            ).trim();

    }


    if (
        Object.prototype.hasOwnProperty.call(
            updates,
            "mobile"
        )
    ) {

        updateData.mobile =
            safeText(
                updates.mobile
            ).trim();

    }


    if (
        Object.prototype.hasOwnProperty.call(
            updates,
            "totalSeats"
        )
    ) {

        updateData.totalSeats =
            Number(
                updates.totalSeats
            );

    }


    if (
        Object.prototype.hasOwnProperty.call(
            updates,
            "joiningDate"
        )
    ) {

        updateData.joiningDate =
            safeText(
                updates.joiningDate
            );

    }


    if (
        Object.prototype.hasOwnProperty.call(
            updates,
            "expiryDate"
        )
    ) {

        updateData.expiryDate =
            safeText(
                updates.expiryDate
            );

    }


    if (
        Object.prototype.hasOwnProperty.call(
            updates,
            "enabled"
        )
    ) {

        updateData.enabled =
            Boolean(
                updates.enabled
            );

    }


    updateData.updatedAt =
        firebase.firestore
            .FieldValue
            .serverTimestamp();


    await reference.update(
        updateData
    );

}


/* ==========================================================================
   15. LIBRARY ACTIONS
   ========================================================================== */

function initializeLibraryActions() {

    const tableBody =
        document.getElementById(
            "network-libraries-rows"
        );


    if (!tableBody) {

        return;

    }


    if (
        tableBody.dataset.actionsBound ===
        "true"
    ) {

        return;

    }


    tableBody.dataset.actionsBound =
        "true";


    tableBody.addEventListener(
        "click",
        async (event) => {

            /* --------------------------------------------------------------
               EDIT
            -------------------------------------------------------------- */

            const editButton =
                event.target.closest(
                    "[data-library-edit]"
                );


            if (editButton) {

                const libraryId =
                    editButton.getAttribute(
                        "data-library-edit"
                    );


                const newName =
                    window.prompt(
                        "Enter new library name:"
                    );


                if (
                    newName ===
                    null
                ) {

                    return;

                }


                if (
                    !newName.trim()
                ) {

                    alert(
                        "Library name cannot be empty."
                    );

                    return;

                }


                try {

                    await updateLibraryRecord(

                        libraryId,

                        {
                            name:
                                newName.trim()
                        }

                    );


                    await refreshManagerLibraries();

                }
                catch (error) {

                    console.error(
                        "[LibControl] Edit error:",
                        error
                    );


                    alert(
                        error.message ||
                        "Unable to update library."
                    );

                }


                return;

            }


            /* --------------------------------------------------------------
               ENABLE / DISABLE
            -------------------------------------------------------------- */

            const toggleButton =
                event.target.closest(
                    "[data-library-toggle]"
                );


            if (toggleButton) {

                const libraryId =
                    toggleButton.getAttribute(
                        "data-library-toggle"
                    );


                try {

                    const reference =
                        managerDB
                            .collection(
                                LIBCONTROL.LIBRARIES
                            )
                            .doc(
                                libraryId
                            );


                    const snapshot =
                        await reference.get();


                    if (!snapshot.exists) {

                        throw new Error(
                            "Library not found."
                        );

                    }


                    const library =
                        snapshot.data() || {};


                    if (
                        library.ownerManagerUID !==
                        getManagerUID()
                    ) {

                        throw new Error(
                            "Unauthorized operation."
                        );

                    }


                    await reference.update({

                        enabled:
                            library.enabled ===
                            false,

                        updatedAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()

                    });


                    await refreshManagerLibraries();

                }
                catch (error) {

                    console.error(
                        "[LibControl] Toggle error:",
                        error
                    );


                    alert(
                        error.message ||
                        "Unable to change library status."
                    );

                }


                return;

            }


            /* --------------------------------------------------------------
               DELETE
            -------------------------------------------------------------- */

            const deleteButton =
                event.target.closest(
                    "[data-library-delete]"
                );


            if (deleteButton) {

                const libraryId =
                    deleteButton.getAttribute(
                        "data-library-delete"
                    );


                const confirmed =
                    window.confirm(
                        "Are you sure you want to delete this library?"
                    );


                if (!confirmed) {

                    return;

                }


                try {

                    const reference =
                        managerDB
                            .collection(
                                LIBCONTROL.LIBRARIES
                            )
                            .doc(
                                libraryId
                            );


                    const snapshot =
                        await reference.get();


                    if (!snapshot.exists) {

                        throw new Error(
                            "Library not found."
                        );

                    }


                    const library =
                        snapshot.data() || {};


                    if (
                        library.ownerManagerUID !==
                        getManagerUID()
                    ) {

                        throw new Error(
                            "Unauthorized operation."
                        );

                    }


                    await reference.delete();


                    await refreshManagerLibraries();

                }
                catch (error) {

                    console.error(
                        "[LibControl] Delete error:",
                        error
                    );


                    alert(
                        error.message ||
                        "Unable to delete library."
                    );

                }

            }

        }
    );

}


/* ==========================================================================
   16. SEARCH
   ========================================================================== */

function initializeLibrarySearch() {

    const searchInput =
        document.getElementById(
            "library-search-input"
        );


    if (!searchInput) {

        return;

    }


    if (
        searchInput.dataset.searchBound ===
        "true"
    ) {

        return;

    }


    searchInput.dataset.searchBound =
        "true";


    searchInput.addEventListener(
        "input",
        async () => {

            const query =
                searchInput.value
                    .trim()
                    .toLowerCase();


            const libraries =
                await loadManagerLibraries();


            if (!query) {

                renderManagerLibraries(
                    libraries
                );

                return;

            }


            const filtered =
                libraries.filter(
                    (library) => {

                        const name =
                            safeText(
                                library.name
                            )
                            .toLowerCase();


                        const id =
                            safeText(
                                library.libraryId ||
                                library.id
                            )
                            .toLowerCase();


                        const email =
                            safeText(
                                library.adminEmail
                            )
                            .toLowerCase();


                        return (
                            name.includes(query) ||
                            id.includes(query) ||
                            email.includes(query)
                        );

                    }
                );


            renderManagerLibraries(
                filtered
            );

        }
    );

}


/* ==========================================================================
   17. LOGOUT
   ========================================================================== */

async function logoutMasterManager() {

    try {

        await firebase
            .auth()
            .signOut();

    }
    catch (error) {

        console.error(
            "[LibControl] Logout error:",
            error
        );

    }


    localStorage.removeItem(
        "session_role"
    );

    localStorage.removeItem(
        "session_manager_uid"
    );

    localStorage.removeItem(
        "session_manager_email"
    );


    sessionStorage.removeItem(
        "libcontrol_session"
    );


    window.location.href =
        "manager-login.html";

}


/* ==========================================================================
   18. LOGOUT BUTTON
   ========================================================================== */

document.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                "#mgr-logout-btn"
            );


        if (!button) {

            return;

        }


        logoutMasterManager();

    }
);


/* ==========================================================================
   19. MANAGER INITIALIZATION
   ========================================================================== */

async function initializeManagerModule() {

    console.log(
        "[LibControl Manager] Starting..."
    );


    if (!managerDB) {

        console.error(
            "[LibControl Manager] Firestore unavailable."
        );

        return;

    }


    try {

        /*
         * WAIT FOR FIREBASE AUTH
         */

        const authorized =
            await verifyMasterManager();


        if (!authorized) {

            return;

        }


        console.log(
            "[LibControl Manager] Authorization successful."
        );


        /*
         * AUTOMATIC APP REGISTRY
         */

        await ensureLibControlApp();


        /*
         * LOAD LIBRARIES
         */

        await refreshManagerLibraries();


        /*
         * BIND UI
         */

        initializeLibraryCreationForm();

        initializeLibraryActions();

        initializeLibrarySearch();


        console.log(
            "[LibControl Manager] Dashboard ready."
        );

    }
    catch (error) {

        console.error(
            "[LibControl Manager Initialization Error]",
            error
        );


        if (
            error.code ===
            "permission-denied"
        ) {

            alert(
                "Firestore permission denied. Check Firestore Security Rules."
            );

            return;

        }


        alert(
            error.message ||
            "Unable to initialize Manager Dashboard."
        );

    }

}


/* ==========================================================================
   20. START AFTER DOM READY
   ========================================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeManagerModule
    );

}
else {

    initializeManagerModule();

}
