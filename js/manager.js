/**
 * ==========================================================================
 * LIBCONTROL - MASTER MANAGER ENGINE
 * ==========================================================================
 *
 * IMPORTANT:
 * This module belongs ONLY to the new LibControl application.
 *
 * It NEVER reads/writes the old LibManage collections.
 *
 * NEW FIREBASE NAMESPACE:
 *
 * libcontrol_apps
 * libcontrol_libraries
 *
 * Security Rules are intentionally NOT created here.
 * Firestore documents/collections are created automatically.
 * ==========================================================================
 */

"use strict";


/* ==========================================================================
   FIREBASE CORE
   ========================================================================== */

let managerDB = null;

if (
    typeof firebase !== "undefined" &&
    firebase.apps &&
    firebase.apps.length
) {
    managerDB = firebase.firestore();
}

window.managerDB = managerDB;


/* ==========================================================================
   LIBCONTROL FIREBASE STRUCTURE
   ========================================================================== */

const LIBCONTROL_COLLECTIONS = {

    APPS:
        "libcontrol_apps",

    LIBRARIES:
        "libcontrol_libraries"

};


/* ==========================================================================
   SESSION
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
   BASIC MANAGER SESSION VALIDATION
   ========================================================================== */

async function verifyMasterManager() {

    if (!managerDB) {

        throw new Error(
            "Firebase database is not initialized."
        );

    }

    const currentUser =
        firebase.auth().currentUser;

    const storedUID =
        getManagerUID();

    if (
        !currentUser ||
        !storedUID ||
        currentUser.uid !== storedUID
    ) {

        localStorage.clear();
        sessionStorage.clear();

        window.location.href =
            "manager-login.html";

        return false;
    }


    /*
     * IMPORTANT:
     * The manager document must already exist.
     *
     * Login page NEVER creates this document automatically.
     * Otherwise an unauthorized user could self-register
     * as Master Manager.
     */

    const managerDoc =
        await managerDB
            .collection("master_managers")
            .doc(currentUser.uid)
            .get();


    if (!managerDoc.exists) {

        await firebase.auth().signOut();

        localStorage.clear();
        sessionStorage.clear();

        alert(
            "Master Manager authorization record not found."
        );

        window.location.href =
            "manager-login.html";

        return false;
    }


    const managerData =
        managerDoc.data() || {};


    if (
        managerData.role !==
        "master_manager"
    ) {

        await firebase.auth().signOut();

        localStorage.clear();
        sessionStorage.clear();

        alert(
            "Access denied."
        );

        window.location.href =
            "manager-login.html";

        return false;
    }


    if (
        managerData.enabled === false
    ) {

        await firebase.auth().signOut();

        localStorage.clear();
        sessionStorage.clear();

        alert(
            "Master Manager access is disabled."
        );

        window.location.href =
            "manager-login.html";

        return false;
    }


    return true;
}


/* ==========================================================================
   UTILITY
   ========================================================================== */

function safeText(value) {

    return String(
        value ?? ""
    );

}


function escapeHTML(value) {

    return safeText(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function normalizeLibraryID(value) {

    return safeText(value)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, "");

}


function generateLibraryID() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let result =
        "LIB-";

    for (
        let i = 0;
        i < 6;
        i++
    ) {

        result +=
            characters[
                Math.floor(
                    Math.random() *
                    characters.length
                )
            ];

    }

    return result;
}


function generateAppID() {

    return (
        "LC-" +
        Date.now().toString(36).toUpperCase() +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 7)
            .toUpperCase()
    );

}


/* ==========================================================================
   AUTOMATIC APP REGISTRY
   ========================================================================== */

async function ensureLibControlApp() {

    if (!managerDB) {

        throw new Error(
            "Firebase database unavailable."
        );

    }


    const managerUID =
        getManagerUID();

    if (!managerUID) {

        throw new Error(
            "Manager session UID missing."
        );

    }


    /*
     * One permanent app identity for this website.
     */

    const appDocumentID =
        "libcontrol";


    const appRef =
        managerDB
            .collection(
                LIBCONTROL_COLLECTIONS.APPS
            )
            .doc(appDocumentID);


    const appSnapshot =
        await appRef.get();


    if (!appSnapshot.exists) {

        await appRef.set({

            appId:
                appDocumentID,

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


    return appDocumentID;
}


/* ==========================================================================
   AUTOMATIC LIBRARY CREATION
   ========================================================================== */

async function createLibraryRecord(libraryData) {

    if (!managerDB) {

        throw new Error(
            "Firebase database unavailable."
        );

    }


    const managerUID =
        getManagerUID();


    if (!managerUID) {

        throw new Error(
            "Manager session expired."
        );

    }


    const appId =
        await ensureLibControlApp();


    let libraryId =
        normalizeLibraryID(
            libraryData.libraryId
        );


    if (!libraryId) {

        libraryId =
            generateLibraryID();

    }


    const libraryRef =
        managerDB
            .collection(
                LIBCONTROL_COLLECTIONS.LIBRARIES
            )
            .doc(libraryId);


    const existingLibrary =
        await libraryRef.get();


    if (existingLibrary.exists) {

        throw new Error(
            "Library ID already exists. Please use another ID."
        );

    }


    /*
     * IMPORTANT:
     *
     * The entire library is stored under the
     * NEW LibControl namespace.
     *
     * Existing LibManage:
     * saas_libraries
     *
     * is NEVER touched.
     */

    await libraryRef.set({

        libraryId:
            libraryId,

        appId:
            appId,

        name:
            safeText(
                libraryData.name
            ).trim(),

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
     * Automatically create the library's
     * structural documents.
     *
     * No rules are created here.
     */

    const libraryBase =
        libraryRef;


    await libraryBase
        .collection("settings")
        .doc("general")
        .set({

            libraryId:
                libraryId,

            appId:
                appId,

            capacityConfigured:
                false,

            totalCapacity:
                0,

            createdAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp(),

            updatedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        });


    await libraryBase
        .collection("settings")
        .doc("shifts")
        .set({

            morningCapacity:
                0,

            afternoonCapacity:
                0,

            eveningCapacity:
                0,

            fullDayCapacity:
                0,

            updatedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        });


    /*
     * Create structural placeholder documents.
     * These make the required collections appear
     * immediately in Firestore.
     */

    await libraryBase
        .collection("metadata")
        .doc("system")
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


    return libraryId;
}


/* ==========================================================================
   LIBRARY UPDATE
   ========================================================================== */

async function updateLibraryRecord(
    libraryId,
    updates
) {

    if (!managerDB) {

        throw new Error(
            "Firebase database unavailable."
        );

    }


    const normalizedID =
        normalizeLibraryID(
            libraryId
        );


    if (!normalizedID) {

        throw new Error(
            "Invalid Library ID."
        );

    }


    const libraryRef =
        managerDB
            .collection(
                LIBCONTROL_COLLECTIONS.LIBRARIES
            )
            .doc(normalizedID);


    const snapshot =
        await libraryRef.get();


    if (!snapshot.exists) {

        throw new Error(
            "Library not found."
        );

    }


    const managerUID =
        getManagerUID();


    const existing =
        snapshot.data() || {};


    if (
        existing.ownerManagerUID !==
        managerUID
    ) {

        throw new Error(
            "You are not authorized to modify this library."
        );

    }


    const safeUpdates = {};


    if (
        Object.prototype.hasOwnProperty
            .call(updates, "name")
    ) {

        safeUpdates.name =
            safeText(
                updates.name
            ).trim();

    }


    if (
        Object.prototype.hasOwnProperty
            .call(updates, "enabled")
    ) {

        safeUpdates.enabled =
            Boolean(
                updates.enabled
            );

    }


    if (
        Object.prototype.hasOwnProperty
            .call(updates, "status")
    ) {

        safeUpdates.status =
            safeText(
                updates.status
            );

    }


    safeUpdates.updatedAt =
        firebase.firestore
            .FieldValue
            .serverTimestamp();


    await libraryRef.update(
        safeUpdates
    );

}


/* ==========================================================================
   LIBRARY DELETE
   ========================================================================== */

async function deleteLibraryRecord(
    libraryId
) {

    if (!managerDB) {

        throw new Error(
            "Firebase database unavailable."
        );

    }


    const normalizedID =
        normalizeLibraryID(
            libraryId
        );


    if (!normalizedID) {

        throw new Error(
            "Invalid Library ID."
        );

    }


    const libraryRef =
        managerDB
            .collection(
                LIBCONTROL_COLLECTIONS.LIBRARIES
            )
            .doc(normalizedID);


    const snapshot =
        await libraryRef.get();


    if (!snapshot.exists) {

        throw new Error(
            "Library not found."
        );

    }


    const data =
        snapshot.data() || {};


    if (
        data.ownerManagerUID !==
        getManagerUID()
    ) {

        throw new Error(
            "You are not authorized to delete this library."
        );

    }


    /*
     * Delete only the library root document.
     *
     * Child collections are intentionally NOT
     * recursively deleted from the browser.
     *
     * This prevents accidental mass deletion.
     */

    await libraryRef.delete();

}


/* ==========================================================================
   LOAD LIBRARIES
   ========================================================================== */

async function loadManagerLibraries() {

    if (!managerDB) {
        return [];
    }


    const managerUID =
        getManagerUID();


    if (!managerUID) {
        return [];
    }


    const snapshot =
        await managerDB
            .collection(
                LIBCONTROL_COLLECTIONS.LIBRARIES
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
   RENDER LIBRARY TABLE
   ========================================================================== */

function renderManagerLibraries(
    libraries
) {

    const tableBody =
        document.getElementById(
            "manager-library-table-body"
        ) ||
        document.getElementById(
            "library-table-body"
        ) ||
        document.getElementById(
            "libraries-table-body"
        );


    if (!tableBody) {
        return;
    }


    if (!libraries.length) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="table-empty"
                >
                    No LibControl libraries created yet.
                </td>
            </tr>
        `;

        return;
    }


    tableBody.innerHTML =
        libraries
            .map(
                (library) => {

                    const status =
                        library.status ||
                        "pending";


                    const enabled =
                        library.enabled !== false;


                    return `

                        <tr
                            data-library-id="${escapeHTML(
                                library.libraryId ||
                                library.id
                            )}"
                        >

                            <td>

                                <div class="lib-meta-cell">

                                    <strong>
                                        ${escapeHTML(
                                            library.name ||
                                            "Unnamed Library"
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHTML(
                                            library.libraryId ||
                                            library.id
                                        )}
                                    </span>

                                </div>

                            </td>


                            <td>

                                <span
                                    class="mgr-badge status-${escapeHTML(
                                        status
                                    )}"
                                >
                                    ${escapeHTML(
                                        status
                                    )}
                                </span>

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
                                        data-library-edit="${
                                            escapeHTML(
                                                library.libraryId ||
                                                library.id
                                            )
                                        }"
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
                                        data-library-toggle="${
                                            escapeHTML(
                                                library.libraryId ||
                                                library.id
                                            )
                                        }"
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
                                        data-library-delete="${
                                            escapeHTML(
                                                library.libraryId ||
                                                library.id
                                            )
                                        }"
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
   REFRESH LIBRARY TABLE
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
            "[LibControl Manager Load Error]",
            error
        );

        return [];

    }

}


/* ==========================================================================
   FORM FIELD HELPERS
   ========================================================================== */

function findFirstElement(
    selectors
) {

    for (
        const selector of selectors
    ) {

        const element =
            document.querySelector(
                selector
            );

        if (element) {
            return element;
        }

    }

    return null;
}


/* ==========================================================================
   CREATE LIBRARY FORM
   ========================================================================== */

function initializeLibraryCreationForm() {

    const form =
        findFirstElement([

            "#manager-library-form",

            "#library-creation-form",

            "#create-library-form",

            ".mgr-creation-form"

        ]);


    if (!form) {
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
                findFirstElement([

                    "#library-name",

                    "#library-name-input",

                    "#new-library-name",

                    "[name='libraryName']",

                    "[name='name']"

                ]);


            const idInput =
                findFirstElement([

                    "#library-id",

                    "#library-id-input",

                    "#new-library-id",

                    "[name='libraryId']"

                ]);


            const name =
                nameInput
                    ? nameInput.value.trim()
                    : "";


            const requestedID =
                idInput
                    ? idInput.value.trim()
                    : "";


            if (!name) {

                alert(
                    "Please enter Library Name."
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
                    "Creating...";

            }


            try {

                const libraryId =
                    await createLibraryRecord({

                        name:
                            name,

                        libraryId:
                            requestedID

                    });


                alert(
                    "Library created successfully.\n\nLibrary ID: " +
                    libraryId
                );


                form.reset();


                await refreshManagerLibraries();

            }
            catch (error) {

                console.error(
                    "[LibControl Library Creation Error]",
                    error
                );

                alert(
                    error.message ||
                    "Unable to create library."
                );

            }
            finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Create Library";

                }

            }

        }
    );

}


/* ==========================================================================
   LIBRARY TABLE ACTIONS
   ========================================================================== */

function initializeLibraryActions() {

    const table =
        findFirstElement([

            "#manager-library-table-body",

            "#library-table-body",

            "#libraries-table-body"

        ]);


    if (!table) {
        return;
    }


    if (
        table.dataset.managerActionsBound ===
        "true"
    ) {
        return;
    }


    table.dataset.managerActionsBound =
        "true";


    table.addEventListener(
        "click",
        async (event) => {

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
                    newName === null ||
                    !newName.trim()
                ) {

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

                    console.error(error);

                    alert(
                        error.message ||
                        "Unable to update library."
                    );

                }

                return;
            }


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

                    const libraryRef =
                        managerDB
                            .collection(
                                LIBCONTROL_COLLECTIONS
                                    .LIBRARIES
                            )
                            .doc(libraryId);


                    const snapshot =
                        await libraryRef.get();


                    if (!snapshot.exists) {

                        throw new Error(
                            "Library not found."
                        );

                    }


                    const data =
                        snapshot.data() || {};


                    if (
                        data.ownerManagerUID !==
                        getManagerUID()
                    ) {

                        throw new Error(
                            "Unauthorized operation."
                        );

                    }


                    await libraryRef.update({

                        enabled:
                            data.enabled === false,

                        updatedAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()

                    });


                    await refreshManagerLibraries();

                }
                catch (error) {

                    console.error(error);

                    alert(
                        error.message ||
                        "Unable to change library status."
                    );

                }

                return;
            }


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
                        "Delete this library record?"
                    );


                if (!confirmed) {
                    return;
                }


                try {

                    await deleteLibraryRecord(
                        libraryId
                    );


                    await refreshManagerLibraries();

                }
                catch (error) {

                    console.error(error);

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
   INITIALIZATION
   ========================================================================== */

async function initializeManagerModule() {

    if (!managerDB) {

        console.error(
            "[LibControl Manager] Firebase not available."
        );

        return;
    }


    try {

        const authorized =
            await verifyMasterManager();


        if (!authorized) {
            return;
        }


        /*
         * Automatically create the LibControl
         * application registry document.
         */

        await ensureLibControlApp();


        /*
         * Load existing libraries.
         */

        await refreshManagerLibraries();


        initializeLibraryCreationForm();

        initializeLibraryActions();


        console.log(
            "[LibControl Manager] Master Manager initialized successfully."
        );

    }
    catch (error) {

        console.error(
            "[LibControl Manager Initialization Error]",
            error
        );

    }

}


/* ==========================================================================
   LOGOUT
   ========================================================================== */

function logoutMasterManager() {

    if (
        typeof firebase !==
        "undefined"
    ) {

        firebase
            .auth()
            .signOut()
            .catch(
                (error) => {

                    console.error(
                        "[Manager Logout Error]",
                        error
                    );

                }
            );

    }


    localStorage.clear();
    sessionStorage.clear();


    window.location.href =
        "manager-login.html";

}


document.addEventListener(
    "click",
    (event) => {

        const logoutButton =
            event.target.closest(
                "#manager-logout-btn, #mgr-logout-btn"
            );


        if (!logoutButton) {
            return;
        }


        logoutMasterManager();

    }
);


/* ==========================================================================
   START
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
