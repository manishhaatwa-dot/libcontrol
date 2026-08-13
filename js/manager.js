/**
 * ==========================================================================
 * LIBMANAGE - NEW SAAS OWNER / MANAGER MODULE
 * ==========================================================================
 *
 * NEW PROJECT NAMESPACE ONLY
 *
 * Firestore:
 *
 * libmanage_secure_v2
 *   └── system
 *       └── manager
 *
 *   └── libraries
 *       └── LIB-XXXXXX
 *           ├── students
 *           ├── attendance
 *           ├── notices
 *           └── seats
 *
 * IMPORTANT:
 * - Does NOT read old "saas_libraries"
 * - Does NOT modify old LibManage data
 * - Does NOT delete anything outside this application's namespace
 * ==========================================================================
 */


/* ==========================================================================
   1. MANAGER MODULE STATE
   ========================================================================== */

let managerLibraries = [];

let managerLibraryMap = {};

let managerEditingLibraryId = null;

let managerSaving = false;


/* ==========================================================================
   2. DOM HELPER
   ========================================================================== */

function managerEl(id) {
    return document.getElementById(id);
}


/* ==========================================================================
   3. NEW APP FIRESTORE ROOT
   ========================================================================== */

function getManagerRoot() {

    if (!window.db) {
        return null;
    }

    return window.db
        .collection("libmanage_secure_v2");
}


/* ==========================================================================
   4. LIBRARIES COLLECTION
   ========================================================================== */

function getManagerLibrariesRef() {

    const root =
        getManagerRoot();

    if (!root) {
        return null;
    }

    return root.collection("libraries");
}


/* ==========================================================================
   5. CURRENT MANAGER SESSION
   ========================================================================== */

function isManagerSessionValid() {

    const role =
        localStorage.getItem(
            "session_role"
        );

    return role === "manager";
}


/* ==========================================================================
   6. REQUIRE MANAGER SESSION
   ========================================================================== */

function requireManagerSession() {

    if (
        !isManagerSessionValid()
    ) {

        window.location.href =
            "../index.html";

        return false;
    }

    return true;
}


/* ==========================================================================
   7. ESCAPE HTML
   ========================================================================== */

function escapeManagerHtml(value) {

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
   8. GENERATE LIBRARY ID
   ========================================================================== */

function generateLibraryId() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let randomPart = "";

    for (
        let i = 0;
        i < 6;
        i++
    ) {

        randomPart +=
            characters[
                Math.floor(
                    Math.random() *
                    characters.length
                )
            ];

    }

    return (
        "LIB-" +
        randomPart
    );
}


/* ==========================================================================
   9. CHECK LIBRARY ID COLLISION
   ========================================================================== */

async function generateUniqueLibraryId() {

    const librariesRef =
        getManagerLibrariesRef();

    if (!librariesRef) {
        throw new Error(
            "Database unavailable."
        );
    }

    for (
        let attempt = 0;
        attempt < 10;
        attempt++
    ) {

        const id =
            generateLibraryId();

        const snapshot =
            await librariesRef
                .doc(id)
                .get();

        if (!snapshot.exists) {
            return id;
        }

    }

    throw new Error(
        "Unable to generate a unique Library ID."
    );
}


/* ==========================================================================
   10. FORM VALUE HELPERS
   ========================================================================== */

function getFirstExistingValue(
    ids
) {

    for (
        const id of ids
    ) {

        const element =
            managerEl(id);

        if (element) {
            return element.value.trim();
        }

    }

    return "";

}


/* ==========================================================================
   11. GET MANAGER FORM DATA
   ========================================================================== */

function getManagerFormData() {

    return {

        name:
            getFirstExistingValue([
                "library-name",
                "mgr-library-name",
                "libraryName",
                "new-library-name"
            ]),

        ownerName:
            getFirstExistingValue([
                "owner-name",
                "mgr-owner-name",
                "ownerName"
            ]),

        mobile:
            getFirstExistingValue([
                "owner-mobile",
                "mgr-owner-mobile",
                "ownerMobile"
            ]),

        email:
            getFirstExistingValue([
                "owner-email",
                "mgr-owner-email",
                "ownerEmail"
            ]),

        password:
            getFirstExistingValue([
                "library-password",
                "admin-password",
                "mgr-library-password",
                "new-library-password"
            ])

    };

}


/* ==========================================================================
   12. VALIDATE LIBRARY DATA
   ========================================================================== */

function validateManagerLibraryData(
    data
) {

    if (!data.name) {

        return "Please enter library name.";

    }


    if (
        data.mobile &&
        !/^\d{10}$/.test(
            data.mobile
        )
    ) {

        return "Please enter a valid 10 digit mobile number.";

    }


    if (
        data.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            data.email
        )
    ) {

        return "Please enter a valid email address.";

    }


    if (
        data.password &&
        data.password.length < 8
    ) {

        return "Library password must contain at least 8 characters.";

    }


    return null;

}


/* ==========================================================================
   13. CLEAR FORM
   ========================================================================== */

function clearManagerForm() {

    const ids = [

        "library-name",
        "mgr-library-name",
        "libraryName",
        "new-library-name",

        "owner-name",
        "mgr-owner-name",
        "ownerName",

        "owner-mobile",
        "mgr-owner-mobile",
        "ownerMobile",

        "owner-email",
        "mgr-owner-email",
        "ownerEmail",

        "library-password",
        "admin-password",
        "mgr-library-password",
        "new-library-password"

    ];


    const processed =
        new Set();


    ids.forEach(
        (id) => {

            if (
                processed.has(id)
            ) {
                return;
            }

            processed.add(id);

            const element =
                managerEl(id);

            if (element) {
                element.value = "";
            }

        }
    );


    managerEditingLibraryId =
        null;


    updateManagerFormMode();

}


/* ==========================================================================
   14. UPDATE FORM MODE
   ========================================================================== */

function updateManagerFormMode() {

    const title =
        managerEl(
            "manager-form-title"
        ) ||
        managerEl(
            "mgr-form-title"
        );


    const submitButton =
        managerEl(
            "manager-submit-btn"
        ) ||
        managerEl(
            "btn-mgr-submit"
        );


    if (
        managerEditingLibraryId
    ) {

        if (title) {
            title.textContent =
                "Edit Library";
        }

        if (submitButton) {
            submitButton.textContent =
                "Update Library";
        }

    } else {

        if (title) {
            title.textContent =
                "Create Library";
        }

        if (submitButton) {
            submitButton.textContent =
                "Create Library";
        }

    }

}


/* ==========================================================================
   15. LOAD LIBRARIES
   ========================================================================== */

async function loadManagerLibraries() {

    const tableBody =
        managerEl(
            "manager-library-table-body"
        ) ||
        managerEl(
            "mgr-library-table-body"
        ) ||
        managerEl(
            "library-table-body"
        ) ||
        managerEl(
            "libraries-table-body"
        );


    if (!tableBody) {
        return;
    }


    const librariesRef =
        getManagerLibrariesRef();


    if (!librariesRef) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="table-empty"
                >
                    Database unavailable.
                </td>
            </tr>
        `;

        return;
    }


    try {

        const snapshot =
            await librariesRef
                .orderBy(
                    "createdAt",
                    "desc"
                )
                .get();


        managerLibraries =
            snapshot.docs.map(
                (doc) => ({

                    firestoreId:
                        doc.id,

                    ...doc.data()

                })
            );


        managerLibraryMap =
            {};


        managerLibraries.forEach(
            (library) => {

                managerLibraryMap[
                    library.firestoreId
                ] =
                    library;

            }
        );


        renderManagerLibraries(
            managerLibraries
        );


        updateManagerMetrics(
            managerLibraries
        );


    } catch (error) {

        console.error(
            "[Manager] Library loading error:",
            error
        );


        /*
         * Fallback without orderBy.
         * This avoids requiring an index.
         */

        try {

            const fallbackSnapshot =
                await librariesRef.get();


            managerLibraries =
                fallbackSnapshot.docs.map(
                    (doc) => ({

                        firestoreId:
                            doc.id,

                        ...doc.data()

                    })
                );


            managerLibraries.sort(
                (a, b) => {

                    const aTime =
                        getManagerTimestamp(
                            a.createdAt
                        );

                    const bTime =
                        getManagerTimestamp(
                            b.createdAt
                        );

                    return (
                        bTime -
                        aTime
                    );

                }
            );


            managerLibraryMap =
                {};


            managerLibraries.forEach(
                (library) => {

                    managerLibraryMap[
                        library.firestoreId
                    ] =
                        library;

                }
            );


            renderManagerLibraries(
                managerLibraries
            );


            updateManagerMetrics(
                managerLibraries
            );


        } catch (
            fallbackError
        ) {

            console.error(
                "[Manager] Fallback library loading error:",
                fallbackError
            );


            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="10"
                        class="table-empty"
                    >
                        Unable to load library records.
                    </td>
                </tr>
            `;

        }

    }

}


/* ==========================================================================
   16. TIMESTAMP
   ========================================================================== */

function getManagerTimestamp(
    value
) {

    if (!value) {
        return 0;
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

        return value.toDate().getTime();

    }


    if (
        value.seconds
    ) {

        return (
            value.seconds *
            1000
        );

    }


    return 0;

}


/* ==========================================================================
   17. FORMAT DATE
   ========================================================================== */

function formatManagerDate(
    value
) {

    const timestamp =
        getManagerTimestamp(
            value
        );


    if (!timestamp) {
        return "-";
    }


    return new Date(
        timestamp
    ).toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* ==========================================================================
   18. RENDER LIBRARIES
   ========================================================================== */

function renderManagerLibraries(
    libraries
) {

    const tableBody =
        managerEl(
            "manager-library-table-body"
        ) ||
        managerEl(
            "mgr-library-table-body"
        ) ||
        managerEl(
            "library-table-body"
        ) ||
        managerEl(
            "libraries-table-body"
        );


    if (!tableBody) {
        return;
    }


    if (
        !libraries ||
        !libraries.length
    ) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="table-empty"
                >
                    No libraries registered yet.
                </td>
            </tr>
        `;

        return;

    }


    let html = "";


    libraries.forEach(
        (library) => {

            const libraryId =
                library.firestoreId;


            const status =
                String(
                    library.status ||
                    "pending"
                ).toLowerCase();


            const enabled =
                library.enabled !== false;


            const statusClass =
                status === "approved"
                    ? "status-approved"
                    : "status-pending";


            const enabledClass =
                enabled
                    ? "status-active"
                    : "status-disabled";


            html += `
                <tr
                    data-library-id="${escapeManagerHtml(
                        libraryId
                    )}"
                >

                    <td>

                        <div
                            class="lib-meta-cell"
                        >

                            <strong>
                                ${escapeManagerHtml(
                                    library.name ||
                                    "Unnamed Library"
                                )}
                            </strong>

                            <span>
                                ${escapeManagerHtml(
                                    libraryId
                                )}
                            </span>

                        </div>

                    </td>


                    <td>
                        ${escapeManagerHtml(
                            library.ownerName ||
                            "-"
                        )}
                    </td>


                    <td>
                        ${escapeManagerHtml(
                            library.mobile ||
                            "-"
                        )}
                    </td>


                    <td>
                        ${escapeManagerHtml(
                            library.email ||
                            "-"
                        )}
                    </td>


                    <td>
                        <span
                            class="mgr-badge ${statusClass}"
                        >
                            ${escapeManagerHtml(
                                status
                            )}
                        </span>
                    </td>


                    <td>
                        <span
                            class="mgr-badge ${enabledClass}"
                        >
                            ${
                                enabled
                                    ? "Active"
                                    : "Disabled"
                            }
                        </span>
                    </td>


                    <td>
                        ${formatManagerDate(
                            library.createdAt
                        )}
                    </td>


                    <td class="text-right">

                        <div
                            class="mgr-actions-row"
                        >

                            ${
                                status !==
                                "approved"
                                    ? `
                                        <button
                                            type="button"
                                            class="btn-ops-toggle btn-approve"
                                            data-manager-action="approve"
                                            data-library-id="${escapeManagerHtml(
                                                libraryId
                                            )}"
                                        >
                                            Approve
                                        </button>
                                    `
                                    : ""
                            }


                            <button
                                type="button"
                                class="btn-ops-toggle btn-edit"
                                data-manager-action="edit"
                                data-library-id="${escapeManagerHtml(
                                    libraryId
                                )}"
                            >
                                Edit
                            </button>


                            ${
                                enabled
                                    ? `
                                        <button
                                            type="button"
                                            class="btn-ops-toggle btn-disable"
                                            data-manager-action="disable"
                                            data-library-id="${escapeManagerHtml(
                                                libraryId
                                            )}"
                                        >
                                            Disable
                                        </button>
                                    `
                                    : `
                                        <button
                                            type="button"
                                            class="btn-ops-toggle btn-enable"
                                            data-manager-action="enable"
                                            data-library-id="${escapeManagerHtml(
                                                libraryId
                                            )}"
                                        >
                                            Enable
                                        </button>
                                    `
                            }


                            <button
                                type="button"
                                class="btn-ops-toggle btn-delete"
                                data-manager-action="delete"
                                data-library-id="${escapeManagerHtml(
                                    libraryId
                                )}"
                                title="Delete Library"
                            >
                                Delete
                            </button>

                        </div>

                    </td>

                </tr>
            `;

        }
    );


    tableBody.innerHTML =
        html;

}


/* ==========================================================================
   19. UPDATE METRICS
   ========================================================================== */

function updateManagerMetrics(
    libraries
) {

    const total =
        libraries.length;


    const approved =
        libraries.filter(
            (library) =>
                String(
                    library.status ||
                    ""
                ).toLowerCase() ===
                "approved"
        ).length;


    const pending =
        libraries.filter(
            (library) =>
                String(
                    library.status ||
                    ""
                ).toLowerCase() ===
                "pending"
        ).length;


    const active =
        libraries.filter(
            (library) =>
                library.enabled !== false
        ).length;


    const totalElement =
        managerEl(
            "total-libraries"
        ) ||
        managerEl(
            "mgr-total-libraries"
        );


    const approvedElement =
        managerEl(
            "approved-libraries"
        ) ||
        managerEl(
            "mgr-approved-libraries"
        );


    const pendingElement =
        managerEl(
            "pending-libraries"
        ) ||
        managerEl(
            "mgr-pending-libraries"
        );


    const activeElement =
        managerEl(
            "active-libraries"
        ) ||
        managerEl(
            "mgr-active-libraries"
        );


    if (totalElement) {
        totalElement.textContent =
            total;
    }


    if (approvedElement) {
        approvedElement.textContent =
            approved;
    }


    if (pendingElement) {
        pendingElement.textContent =
            pending;
    }


    if (activeElement) {
        activeElement.textContent =
            active;
    }

}


/* ==========================================================================
   20. CREATE LIBRARY
   ========================================================================== */

async function createManagerLibrary(
    data
) {

    const librariesRef =
        getManagerLibrariesRef();


    if (!librariesRef) {
        throw new Error(
            "Database unavailable."
        );
    }


    const libraryId =
        await generateUniqueLibraryId();


    /*
     * IMPORTANT:
     * Password is stored only for compatibility
     * with the current gateway.
     *
     * For production-grade security, Firebase Authentication
     * should replace browser/database password verification.
     */

    const libraryData = {

        libraryId:
            libraryId,

        name:
            data.name,

        ownerName:
            data.ownerName ||
            "",

        mobile:
            data.mobile ||
            "",

        email:
            data.email ||
            "",

        adminPass:
            data.password ||
            "",

        status:
            "pending",

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

    };


    await librariesRef
        .doc(libraryId)
        .set(
            libraryData
        );


    return libraryId;

}


/* ==========================================================================
   21. UPDATE LIBRARY
   ========================================================================== */

async function updateManagerLibrary(
    libraryId,
    data
) {

    const librariesRef =
        getManagerLibrariesRef();


    if (!librariesRef) {
        throw new Error(
            "Database unavailable."
        );
    }


    const updateData = {

        name:
            data.name,

        ownerName:
            data.ownerName ||
            "",

        mobile:
            data.mobile ||
            "",

        email:
            data.email ||
            "",

        updatedAt:
            firebase.firestore
                .FieldValue
                .serverTimestamp()

    };


    /*
     * Password only changes if user
     * entered a new one.
     */

    if (
        data.password
    ) {

        updateData.adminPass =
            data.password;

    }


    await librariesRef
        .doc(libraryId)
        .update(
            updateData
        );

}


/* ==========================================================================
   22. OPEN EDIT MODE
   ========================================================================== */

function openManagerEdit(
    libraryId
) {

    const library =
        managerLibraryMap[
            libraryId
        ];


    if (!library) {
        return;
    }


    managerEditingLibraryId =
        libraryId;


    const fieldMap = {

        name: [
            "library-name",
            "mgr-library-name",
            "libraryName",
            "new-library-name"
        ],

        ownerName: [
            "owner-name",
            "mgr-owner-name",
            "ownerName"
        ],

        mobile: [
            "owner-mobile",
            "mgr-owner-mobile",
            "ownerMobile"
        ],

        email: [
            "owner-email",
            "mgr-owner-email",
            "ownerEmail"
        ]

    };


    Object.keys(
        fieldMap
    ).forEach(
        (key) => {

            fieldMap[key].some(
                (id) => {

                    const element =
                        managerEl(id);

                    if (!element) {
                        return false;
                    }

                    element.value =
                        library[key] ||
                        "";

                    return true;

                }
            );

        }
    );


    updateManagerFormMode();


    const form =
        managerEl(
            "manager-creation-form"
        ) ||
        managerEl(
            "mgr-creation-form"
        );


    if (form) {

        form.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


/* ==========================================================================
   23. APPROVE LIBRARY
   ========================================================================== */

async function approveManagerLibrary(
    libraryId
) {

    const librariesRef =
        getManagerLibrariesRef();


    if (!librariesRef) {
        return;
    }


    await librariesRef
        .doc(libraryId)
        .update({

            status:
                "approved",

            enabled:
                true,

            approvedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp(),

            updatedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        });


    await loadManagerLibraries();

}


/* ==========================================================================
   24. ENABLE LIBRARY
   ========================================================================== */

async function enableManagerLibrary(
    libraryId
) {

    const librariesRef =
        getManagerLibrariesRef();


    if (!librariesRef) {
        return;
    }


    await librariesRef
        .doc(libraryId)
        .update({

            enabled:
                true,

            updatedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        });


    await loadManagerLibraries();

}


/* ==========================================================================
   25. DISABLE LIBRARY
   ========================================================================== */

async function disableManagerLibrary(
    libraryId
) {

    const librariesRef =
        getManagerLibrariesRef();


    if (!librariesRef) {
        return;
    }


    await librariesRef
        .doc(libraryId)
        .update({

            enabled:
                false,

            updatedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        });


    await loadManagerLibraries();

}


/* ==========================================================================
   26. DELETE LIBRARY
   ========================================================================== */

async function deleteManagerLibrary(
    libraryId
) {

    const library =
        managerLibraryMap[
            libraryId
        ];


    if (!library) {
        return;
    }


    const confirmation =
        window.confirm(
            "Delete this library?\n\nThis action will remove the library document from the NEW LibManage system."
        );


    if (!confirmation) {
        return;
    }


    const librariesRef =
        getManagerLibrariesRef();


    if (!librariesRef) {
        return;
    }


    /*
     * Safety:
     * Delete ONLY the exact document from:
     *
     * libmanage_secure_v2/libraries/LIB-ID
     *
     * No old collection is touched.
     */

    await librariesRef
        .doc(libraryId)
        .delete();


    delete managerLibraryMap[
        libraryId
    ];


    managerLibraries =
        managerLibraries.filter(
            (item) =>
                item.firestoreId !==
                libraryId
        );


    renderManagerLibraries(
        managerLibraries
    );


    updateManagerMetrics(
        managerLibraries
    );

}


/* ==========================================================================
   27. LIBRARY SEARCH
   ========================================================================== */

function bindManagerLibrarySearch() {

    const searchInput =
        managerEl(
            "mgr-library-search-input"
        ) ||
        managerEl(
            "library-search-input"
        ) ||
        managerEl(
            "manager-library-search"
        );


    if (!searchInput) {
        return;
    }


    searchInput.addEventListener(
        "input",
        () => {

            const query =
                searchInput.value
                    .trim()
                    .toLowerCase();


            if (!query) {

                renderManagerLibraries(
                    managerLibraries
                );

                return;

            }


            const filtered =
                managerLibraries.filter(
                    (library) => {

                        const searchable =
                            [

                                library.libraryId,

                                library.name,

                                library.ownerName,

                                library.mobile,

                                library.email,

                                library.status

                            ]
                            .join(" ")
                            .toLowerCase();


                        return searchable.includes(
                            query
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
   28. LIBRARY ACTIONS
   ========================================================================== */

function bindManagerLibraryActions() {

    const tableBody =
        managerEl(
            "manager-library-table-body"
        ) ||
        managerEl(
            "mgr-library-table-body"
        ) ||
        managerEl(
            "library-table-body"
        ) ||
        managerEl(
            "libraries-table-body"
        );


    if (!tableBody) {
        return;
    }


    tableBody.addEventListener(
        "click",
        async (event) => {

            const button =
                event.target.closest(
                    "[data-manager-action]"
                );


            if (!button) {
                return;
            }


            const action =
                button.getAttribute(
                    "data-manager-action"
                );


            const libraryId =
                button.getAttribute(
                    "data-library-id"
                );


            if (
                !action ||
                !libraryId
            ) {
                return;
            }


            try {

                if (
                    action ===
                    "approve"
                ) {

                    await approveManagerLibrary(
                        libraryId
                    );

                }


                else if (
                    action ===
                    "enable"
                ) {

                    await enableManagerLibrary(
                        libraryId
                    );

                }


                else if (
                    action ===
                    "disable"
                ) {

                    const confirmed =
                        window.confirm(
                            "Disable this library?"
                        );


                    if (!confirmed) {
                        return;
                    }


                    await disableManagerLibrary(
                        libraryId
                    );

                }


                else if (
                    action ===
                    "edit"
                ) {

                    openManagerEdit(
                        libraryId
                    );

                }


                else if (
                    action ===
                    "delete"
                ) {

                    await deleteManagerLibrary(
                        libraryId
                    );

                }

            } catch (error) {

                console.error(
                    "[Manager] Library action error:",
                    error
                );


                alert(
                    "Operation failed. Please try again."
                );

            }

        }
    );

}


/* ==========================================================================
   29. CREATE / UPDATE FORM
   ========================================================================== */

function bindManagerCreationForm() {

    const form =
        managerEl(
            "manager-creation-form"
        ) ||
        managerEl(
            "mgr-creation-form"
        ) ||
        managerEl(
            "library-creation-form"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            if (managerSaving) {
                return;
            }


            const data =
                getManagerFormData();


            const validationError =
                validateManagerLibraryData(
                    data
                );


            if (validationError) {

                alert(
                    validationError
                );

                return;

            }


            const submitButton =
                managerEl(
                    "manager-submit-btn"
                ) ||
                managerEl(
                    "btn-mgr-submit"
                );


            managerSaving =
                true;


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    managerEditingLibraryId
                        ? "Updating..."
                        : "Creating...";

            }


            try {

                if (
                    managerEditingLibraryId
                ) {

                    await updateManagerLibrary(
                        managerEditingLibraryId,
                        data
                    );


                    alert(
                        "Library updated successfully."
                    );

                } else {

                    const libraryId =
                        await createManagerLibrary(
                            data
                        );


                    alert(
                        "Library created successfully.\n\nLibrary ID: " +
                        libraryId
                    );

                }


                clearManagerForm();

                await loadManagerLibraries();


            } catch (error) {

                console.error(
                    "[Manager] Save library error:",
                    error
                );


                alert(
                    "Unable to save library. Please try again."
                );

            } finally {

                managerSaving =
                    false;


                if (submitButton) {

                    submitButton.disabled =
                        false;

                    updateManagerFormMode();

                }

            }

        }
    );

}


/* ==========================================================================
   30. CANCEL / RESET
   ========================================================================== */

function bindManagerCancel() {

    const cancelButton =
        managerEl(
            "manager-cancel-btn"
        ) ||
        managerEl(
            "mgr-cancel-btn"
        ) ||
        managerEl(
            "cancel-manager-form-btn"
        );


    if (!cancelButton) {
        return;
    }


    cancelButton.addEventListener(
        "click",
        () => {

            clearManagerForm();

        }
    );

}


/* ==========================================================================
   31. MANAGER LOGOUT
   ========================================================================== */

function bindManagerLogout() {

    document.addEventListener(
        "click",
        (event) => {

            const button =
                event.target.closest(
                    "#manager-logout-btn, #mgr-logout-btn"
                );


            if (!button) {
                return;
            }


            localStorage.clear();

            sessionStorage.clear();


            window.location.href =
                "../index.html";

        }
    );

}


/* ==========================================================================
   32. INITIALIZE MANAGER MODULE
   ========================================================================== */

async function initializeManagerModule() {

    if (
        typeof firebase ===
        "undefined"
    ) {

        console.error(
            "[Manager] Firebase SDK missing."
        );

        return;

    }


    if (
        !window.db
    ) {

        console.error(
            "[Manager] Firestore instance missing."
        );

        return;

    }


    if (
        !requireManagerSession()
    ) {

        return;

    }


    bindManagerCreationForm();

    bindManagerCancel();

    bindManagerLibrarySearch();

    bindManagerLibraryActions();

    bindManagerLogout();

    updateManagerFormMode();


    await loadManagerLibraries();

}


/* ==========================================================================
   33. START
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeManagerModule();

    }
);


/* ==========================================================================
   34. PUBLIC API
   ========================================================================== */

window.LibManageManager = {

    reload:
        loadManagerLibraries,

    create:
        createManagerLibrary,

    update:
        updateManagerLibrary,

    approve:
        approveManagerLibrary,

    enable:
        enableManagerLibrary,

    disable:
        disableManagerLibrary,

    delete:
        deleteManagerLibrary

};


console.log(
    "[LibManage] New Manager module loaded successfully."
);
