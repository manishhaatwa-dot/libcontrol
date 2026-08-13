/**
 * ==========================================================================
 * LIBCONTROL - MASTER MANAGER ENGINE
 * ==========================================================================
 *
 * NEW APP ONLY
 *
 * This file NEVER uses the old LibManage collection:
 *
 *     saas_libraries
 *
 * LibControl uses its own namespace:
 *
 *     master_managers
 *     libcontrol_apps
 *     libcontrol_libraries
 *
 * Firestore Security Rules are NOT created from this file.
 * ==========================================================================

"use strict";


/* ==========================================================================
   FIREBASE INITIALIZATION
   ========================================================================== */

let managerDB = null;

if (
    typeof firebase !== "undefined" &&
    firebase.apps &&
    firebase.apps.length > 0
) {
    managerDB = firebase.firestore();
}

window.managerDB = managerDB;


/* ==========================================================================
   LIBCONTROL COLLECTION NAMES
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
   SESSION HELPERS
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
   TEXT SECURITY HELPERS
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

    let id = "LIB-";

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
   FIND ELEMENT HELPER
   ========================================================================== */

function findFirstElement(selectors) {

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
   MASTER MANAGER AUTHORIZATION
   ========================================================================== */

async function verifyMasterManager() {

    if (!managerDB) {

        throw new Error(
            "Firebase Firestore is not initialized."
        );

    }


    const currentUser =
        firebase.auth().currentUser;


    const sessionUID =
        getManagerUID();


    if (
        !currentUser ||
        !sessionUID ||
        currentUser.uid !== sessionUID
    ) {

        localStorage.clear();
        sessionStorage.clear();

        window.location.href =
            "manager-login.html";

        return false;

    }


    /*
     * IMPORTANT:
     *
     * The authorization document must already exist.
     *
     * Manager login creates NOTHING here.
     */

    const managerSnapshot =
        await managerDB
            .collection(
                LIBCONTROL.MASTER_MANAGERS
            )
            .doc(currentUser.uid)
            .get();


    if (!managerSnapshot.exists) {

        await firebase
            .auth()
            .signOut();

        localStorage.clear();
        sessionStorage.clear();

        alert(
            "Access Denied: Master Manager authorization record not found."
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

        localStorage.clear();
        sessionStorage.clear();

        alert(
            "Access Denied: Invalid Master Manager role."
        );

        window.location.href =
            "manager-login.html";

        return false;

    }


    if (
        managerData.enabled === false
    ) {

        await firebase
            .auth()
            .signOut();

        localStorage.clear();
        sessionStorage.clear();

        alert(
            "Access Denied: Master Manager account is disabled."
        );

        window.location.href =
            "manager-login.html";

        return false;

    }


    return true;

}


/* ==========================================================================
   AUTOMATIC LIBCONTROL APP REGISTRY
   ========================================================================== */

async function ensureLibControlApp() {

    if (!managerDB) {

        throw new Error(
            "Firebase database is unavailable."
        );

    }


    const managerUID =
        getManagerUID();


    if (!managerUID) {

        throw new Error(
            "Manager session UID is missing."
        );

    }


    /*
     * Permanent application document.
     *
     * This automatically creates:
     *
     * libcontrol_apps
     *     └── libcontrol
     */

    const appRef =
        managerDB
            .collection(
                LIBCONTROL.APPS
            )
            .doc("libcontrol");


    const appSnapshot =
        await appRef.get();


    if (!appSnapshot.exists) {

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
   CREATE LIBRARY
   ========================================================================== */

async function createLibraryRecord(
    libraryData
) {

    if (!managerDB) {

        throw new Error(
            "Firebase database is unavailable."
        );

    }


    const managerUID =
        getManagerUID();


    if (!managerUID) {

        throw new Error(
            "Manager session has expired."
        );

    }


    /*
     * Make sure LibControl app registry exists.
     */

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
                LIBCONTROL.LIBRARIES
            )
            .doc(libraryId);


    const existingSnapshot =
        await libraryRef.get();


    if (existingSnapshot.exists) {

        throw new Error(
            "Library ID already exists. Please use another Library ID."
        );

    }


    const libraryName =
        safeText(
            libraryData.name
        ).trim();


    if (!libraryName) {

        throw new Error(
            "Library name is required."
        );

    }


    /*
     * CREATE LIBRARY ROOT
     *
     * libcontrol_libraries
     *     └── LIB-XXXXXX
     */

    await libraryRef.set({

        libraryId:
            libraryId,

        appId:
            appId,

        name:
            libraryName,

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
     * AUTOMATIC SETTINGS STRUCTURE
     */

    await libraryRef
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


    await libraryRef
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
     * AUTOMATIC METADATA
     */

    await libraryRef
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
   LOAD MANAGER LIBRARIES
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
                LIBCONTROL.LIBRARIES
            )
            .where(
                "ownerManagerUID",
                "==",
                managerUID
            )
            .get();


    return snapshot.docs.map(
        doc => ({

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
        findFirstElement([

            "#manager-library-table-body",

            "#library-table-body",

            "#libraries-table-body",

            "#mgr-library-table-body"

        ]);


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
                    No libraries available.
                </td>

            </tr>

        `;

        return;

    }


    tableBody.innerHTML =
        libraries
            .map(
                library => {

                    const libraryID =
                        library.libraryId ||
                        library.id;

                    const libraryName =
                        library.name ||
                        "Unnamed Library";

                    const status =
                        library.status ||
                        "pending";

                    const enabled =
                        library.enabled !== false;


                    return `

                        <tr
                            data-library-id="${escapeHTML(
                                libraryID
                            )}"
                        >

                            <td>

                                <div class="lib-meta-cell">

                                    <strong>
                                        ${escapeHTML(
                                            libraryName
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHTML(
                                            libraryID
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
                                        data-library-edit="${escapeHTML(
                                            libraryID
                                        )}"
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
                                        data-library-toggle="${escapeHTML(
                                            libraryID
                                        )}"
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
                                        data-library-delete="${escapeHTML(
                                            libraryID
                                        )}"
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
   REFRESH LIBRARIES
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
            "[LibControl Manager Libraries Error]",
            error
        );


        return [];

    }

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

        console.warn(
            "[LibControl] Library creation form not found."
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
        async event => {

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


            const libraryName =
                nameInput
                    ? nameInput.value.trim()
                    : "";


            const requestedID =
                idInput
                    ? idInput.value.trim()
                    : "";


            if (!libraryName) {

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
                            libraryName,

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
   UPDATE LIBRARY
   ========================================================================== */

async function updateLibraryRecord(
    libraryId,
    updates
) {

    if (!managerDB) {

        throw new Error(
            "Firebase database is unavailable."
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
                LIBCONTROL.LIBRARIES
            )
            .doc(normalizedID);


    const snapshot =
        await libraryRef.get();


    if (!snapshot.exists) {

        throw new Error(
            "Library not found."
        );

    }


    const libraryData =
        snapshot.data() || {};


    if (
        libraryData.ownerManagerUID !==
        getManagerUID()
    ) {

        throw new Error(
            "You are not authorized to modify this library."
        );

    }


    const updateData = {};


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
            "enabled"
        )
    ) {

        updateData.enabled =
            Boolean(
                updates.enabled
            );

    }


    if (
        Object.prototype.hasOwnProperty.call(
            updates,
            "status"
        )
    ) {

        updateData.status =
            safeText(
                updates.status
            );

    }


    updateData.updatedAt =
        firebase.firestore
            .FieldValue
            .serverTimestamp();


    await libraryRef.update(
        updateData
    );

}


/* ==========================================================================
   DELETE LIBRARY ROOT
   ========================================================================== */

async function deleteLibraryRecord(
    libraryId
) {

    if (!managerDB) {

        throw new Error(
            "Firebase database is unavailable."
        );

    }


    const normalizedID =
        normalizeLibraryID(
            libraryId
        );


    const libraryRef =
        managerDB
            .collection(
                LIBCONTROL.LIBRARIES
            )
            .doc(normalizedID);


    const snapshot =
        await libraryRef.get();


    if (!snapshot.exists) {

        throw new Error(
            "Library not found."
        );

    }


    const libraryData =
        snapshot.data() || {};


    if (
        libraryData.ownerManagerUID !==
        getManagerUID()
    ) {

        throw new Error(
            "You are not authorized to delete this library."
        );

    }


    /*
     * Only root document is deleted.
     *
     * Browser-side recursive deletion is intentionally
     * avoided to prevent accidental mass deletion.
     */

    await libraryRef.delete();

}


/* ==========================================================================
   LIBRARY TABLE ACTIONS
   ========================================================================== */

function initializeLibraryActions() {

    const tableBody =
        findFirstElement([

            "#manager-library-table-body",

            "#library-table-body",

            "#libraries-table-body",

            "#mgr-library-table-body"

        ]);


    if (!tableBody) {

        return;

    }


    if (
        tableBody.dataset.managerActionsBound ===
        "true"
    ) {

        return;

    }


    tableBody.dataset.managerActionsBound =
        "true";


    tableBody.addEventListener(
        "click",
        async event => {

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

                    console.error(
                        "[LibControl Edit Error]",
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

                    const libraryRef =
                        managerDB
                            .collection(
                                LIBCONTROL.LIBRARIES
                            )
                            .doc(libraryId);


                    const snapshot =
                        await libraryRef.get();


                    if (!snapshot.exists) {

                        throw new Error(
                            "Library not found."
                        );

                    }


                    const libraryData =
                        snapshot.data() || {};


                    if (
                        libraryData.ownerManagerUID !==
                        getManagerUID()
                    ) {

                        throw new Error(
                            "Unauthorized operation."
                        );

                    }


                    await libraryRef.update({

                        enabled:
                            libraryData.enabled === false,

                        updatedAt:
                            firebase.firestore
                                .FieldValue
                                .serverTimestamp()

                    });


                    await refreshManagerLibraries();

                }
                catch (error) {

                    console.error(
                        "[LibControl Toggle Error]",
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
                        "Are you sure you want to delete this library record?"
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

                    console.error(
                        "[LibControl Delete Error]",
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
   LIBRARY SEARCH
   ========================================================================== */

function initializeLibrarySearch() {

    const searchInput =
        findFirstElement([

            "#mgr-library-search",

            "#library-search",

            ".mgr-library-search-input"

        ]);


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


            const filtered =
                !query
                    ? libraries
                    : libraries.filter(
                        library => {

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


                            return (
                                name.includes(query) ||
                                id.includes(query)
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
   MANAGER LOGOUT
   ========================================================================== */

async function logoutMasterManager() {

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
            "[LibControl Logout Error]",
            error
        );

    }


    localStorage.clear();

    sessionStorage.clear();


    window.location.href =
        "manager-login.html";

}


document.addEventListener(
    "click",
    event => {

        const logoutButton =
            event.target.closest(
                "#manager-logout-btn, #mgr-logout-btn, #admin-logout-btn"
            );


        if (!logoutButton) {

            return;

        }


        logoutMasterManager();

    }
);


/* ==========================================================================
   INITIALIZE MANAGER PAGE
   ========================================================================== */

async function initializeManagerModule() {

    if (!managerDB) {

        console.error(
            "[LibControl Manager] Firebase SDK/Firestore not available."
        );

        return;

    }


    try {

        /*
         * First verify Master Manager.
         */

        const authorized =
            await verifyMasterManager();


        if (!authorized) {

            return;

        }


        /*
         * Automatically create:
         *
         * libcontrol_apps
         *     └── libcontrol
         */

        await ensureLibControlApp();


        /*
         * Load libraries.
         */

        await refreshManagerLibraries();


        /*
         * Bind dashboard controls.
         */

        initializeLibraryCreationForm();

        initializeLibraryActions();

        initializeLibrarySearch();


        console.log(
            "[LibControl Manager] Initialization successful."
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
                "Firestore permission denied. Security Rules need to authorize the Master Manager."
            );

        }

    }

}


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
