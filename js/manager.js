/**
 * ==========================================================================
 * LIBMANAGE SAAS SECURITY CONTROL - MASTER OWNER CONTROL REALTIME CRUD
 * ==========================================================================
 */

// Firestore Reference
const db = window.db;

if (!db) {
    alert("Firestore not initialized.");
    throw new Error("Firestore not initialized.");
}

document.addEventListener("DOMContentLoaded", () => {

    // Session Check
    if (localStorage.getItem("session_role") !== "manager") {
        window.location.href = "../index.html";
        return;
    }

    initializeManagerDashboardEngine();

});

function initializeManagerDashboardEngine() {

    const logoutBtn = document.getElementById("mgr-logout-btn");
    const creationForm = document.getElementById("create-library-form");

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {

            localStorage.clear();
            window.location.href = "../index.html";

        });
    }

    // Create Library
    if (creationForm) {
        creationForm.addEventListener(
            "submit",
            commitNewLibraryDeploymentAction
        );
    }

    const libraryModalSave =
    document.getElementById("library-modal-save");

if (libraryModalSave) {

    libraryModalSave.addEventListener(
        "click",
        saveLibraryChanges
    );

}

    // Live Libraries Listener
    db.collection("saas_libraries")
        .orderBy("createdAt", "desc")
        .onSnapshot(
            (snapshot) => {

                const libraries = [];

                snapshot.forEach((doc) => {

                    libraries.push(doc.data());

                });

                calculateAndPaintMetrics(libraries);
                managerLibrariesCache = libraries;
                renderLibrariesTableRegistryGrid(libraries);

            },
            (error) => {

                console.error(
                    "[Firestore Listener Error]",
                    error
                );

            }
        );
}

/**
 * Dashboard Cards
 */
function calculateAndPaintMetrics(libraries) {

    const total = libraries.length;

    const active = libraries.filter(
        lib => lib.status === "approved" && lib.enabled
    ).length;

    const disabled = libraries.filter(
        lib => !lib.enabled
    ).length;

    document.getElementById("total-branches-count").innerText = total;

    document.getElementById("active-branches-count").innerText = active;

    document.getElementById("disabled-branches-count").innerText = disabled;

}
/**
 * Libraries Table
 */
function renderLibrariesTableRegistryGrid(libraries) {

    const tableBody = document.getElementById("network-libraries-rows");

    if (!tableBody) return;

    if (libraries.length === 0) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:20px;">
                    No Libraries Found
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = libraries.map(lib => {

        const statusBadge = lib.status === "approved"
            ? `<span class="mgr-badge status-approved">Approved</span>`
            : `<span class="mgr-badge status-pending">Pending</span>`;

        const accessBadge = lib.enabled
            ? `<span class="mgr-badge status-active">Active</span>`
            : `<span class="mgr-badge status-disabled">Disabled</span>`;

        let actionButton = "";

        if (lib.status === "pending") {

            actionButton =
            `<button class="btn-ops-toggle btn-approve"
            onclick="executeRegistryStatusMutator('${lib.libraryId}','approve')">
            Approve
            </button>`;

        } else if (lib.enabled) {

            actionButton =
            `<button class="btn-ops-toggle btn-disable"
            onclick="executeRegistryStatusMutator('${lib.libraryId}','disable')">
            Disable
            </button>`;

        } else {

            actionButton =
            `<button class="btn-ops-toggle btn-enable"
            onclick="executeRegistryStatusMutator('${lib.libraryId}','enable')">
            Enable
            </button>`;
        }

        return `
        <tr>

          <td>
    <strong
        class="mgr-library-name-link"
        onclick="openLibraryDetailsModal('${lib.libraryId}')"
    >
        ${lib.name}
    </strong>
    <br>
    <small>${lib.libraryId}</small>
</td> 

            <td>${lib.adminEmail}</td>

            <td>${lib.totalSeats}</td>

            <td>
                ${statusBadge}
                ${accessBadge}
            </td>

            <td>

                ${actionButton}
               
                <button
    class="btn-ops-toggle btn-edit"
    onclick="openLibraryEditModal('${lib.libraryId}')">
    Edit
</button>

                <button
                    class="btn-ops-toggle btn-delete"
                    onclick="executeRegistryStatusMutator('${lib.libraryId}','delete')">
                    Delete
                </button>

            </td>

        </tr>
        `;

    }).join("");

}
/**
 * Library Registry Search
 */
let managerLibrariesCache = [];

function filterManagerLibraries() {

    const searchInput =
        document.getElementById("library-search-input");

    if (!searchInput) return;

    const searchTerm =
        searchInput.value
            .trim()
            .toLowerCase();

    if (!searchTerm) {

        renderLibrariesTableRegistryGrid(
            managerLibrariesCache
        );

        return;
    }

    const filteredLibraries =
        managerLibrariesCache.filter((lib) => {

            return (
                String(lib.name || "")
                    .toLowerCase()
                    .includes(searchTerm) ||

                String(lib.libraryId || "")
                    .toLowerCase()
                    .includes(searchTerm) ||

                String(lib.adminEmail || "")
                    .toLowerCase()
                    .includes(searchTerm)
            );

        });

    renderLibrariesTableRegistryGrid(
        filteredLibraries
    );
}

document.addEventListener(
    "input",
    (event) => {

        if (
            event.target &&
            event.target.id ===
                "library-search-input"
        ) {
            filterManagerLibraries();
        }

    }
);

/**
 * Library Details / Edit Modal Engine
 */

function formatManagerDate(dateValue) {

    if (!dateValue) {
        return "";
    }

    const parts =
        String(dateValue).split("-");

    if (parts.length !== 3) {
        return dateValue;
    }

    return (
        parts[2] +
        "/" +
        parts[1] +
        "/" +
        parts[0]
    );

}
function getManagerLibraryById(libraryId) {

    return managerLibrariesCache.find(
        lib => String(lib.libraryId) === String(libraryId)
    );

}


function openLibraryDetailsModal(libraryId) {

    const library =
        getManagerLibraryById(libraryId);

    if (!library) {
        alert("Library details not found.");
        return;
    }

    document.getElementById("library-modal-title").innerText =
        "Library Details";

    document.getElementById("library-modal-subtitle").innerText =
        "View library information.";

    document.getElementById("edit-library-id").value =
        library.libraryId || "";

    document.getElementById("edit-library-name").value =
        library.name || "";

    document.getElementById("edit-library-email").value =
        library.adminEmail || "";

    document.getElementById("edit-library-mobile").value =
        library.mobile || "";

    document.getElementById("edit-library-seats").value =
        library.totalSeats || "";

    document.getElementById("edit-library-joining").value =
        library.joiningDate || "";

    document.getElementById("edit-library-expiry").value =
        library.expiryDate || "";

    document.getElementById("edit-library-password").value =
        "";

    setLibraryModalReadOnly(true);

    document.getElementById("library-modal-overlay")
        .classList.add("active");

    document.getElementById("library-modal-overlay")
        .setAttribute("aria-hidden", "false");

}


function openLibraryEditModal(libraryId) {

    const library =
        getManagerLibraryById(libraryId);

    if (!library) {
        alert("Library details not found.");
        return;
    }

    document.getElementById("library-modal-title").innerText =
        "Edit Library";

    document.getElementById("library-modal-subtitle").innerText =
        "Update library details or reset the admin password.";

    document.getElementById("edit-library-id").value =
        library.libraryId || "";

    document.getElementById("edit-library-name").value =
        library.name || "";

    document.getElementById("edit-library-email").value =
        library.adminEmail || "";

    document.getElementById("edit-library-mobile").value =
        library.mobile || "";

    document.getElementById("edit-library-seats").value =
        library.totalSeats || "";

    document.getElementById("edit-library-joining").value =
        library.joiningDate || "";

    document.getElementById("edit-library-expiry").value =
        library.expiryDate || "";

    document.getElementById("edit-library-password").value =
        "";

    setLibraryModalReadOnly(false);

    document.getElementById("library-modal-overlay")
        .classList.add("active");

    document.getElementById("library-modal-overlay")
        .setAttribute("aria-hidden", "false");

}


function setLibraryModalReadOnly(isReadOnly) {

    const fields = [
        "edit-library-name",
        "edit-library-email",
        "edit-library-mobile",
        "edit-library-seats",
        "edit-library-joining",
        "edit-library-expiry",
        "edit-library-password"
    ];

    fields.forEach((fieldId) => {

        const field =
            document.getElementById(fieldId);

        if (field) {
            field.disabled = isReadOnly;
        }

    });

    const saveButton =
        document.getElementById("library-modal-save");

    if (saveButton) {
        saveButton.style.display =
            isReadOnly ? "none" : "block";
    }

}


function closeLibraryModal() {

    const overlay =
        document.getElementById("library-modal-overlay");

    if (!overlay) return;

    overlay.classList.remove("active");

    overlay.setAttribute(
        "aria-hidden",
        "true"
    );

}


document.addEventListener(
    "click",
    (event) => {

        if (
            event.target.id ===
            "library-modal-close"
        ) {
            closeLibraryModal();
        }

        if (
            event.target.id ===
            "library-modal-cancel"
        ) {
            closeLibraryModal();
        }

        if (
            event.target.id ===
            "library-modal-overlay"
        ) {
            closeLibraryModal();
        }

    }
);
/**
 * Update Library Status
 */
async function executeRegistryStatusMutator(libraryId, commandType) {

    const docRef = db.collection("saas_libraries").doc(libraryId);

    try {

        if (commandType === "approve") {

            await docRef.update({
                status: "approved",
                enabled: true
            });

        }

        else if (commandType === "disable") {

            if (confirm("Disable this Library?")) {

                await docRef.update({
                    enabled: false
                });

            }

        }

        else if (commandType === "enable") {

            await docRef.update({
                enabled: true
            });

        }

        else if (commandType === "delete") {

            if (confirm("Delete this Library permanently?")) {

                await docRef.delete();

            }

        }

    }
    catch (error) {

        console.error(error);

        alert(error.message);

    }

}
/**
 * Save Library Changes
 */
async function saveLibraryChanges() {

    const libraryId =
        document.getElementById("edit-library-id").value.trim();

    const name =
        document.getElementById("edit-library-name").value.trim();

    const email =
        document.getElementById("edit-library-email").value.trim().toLowerCase();

    const mobile =
        document.getElementById("edit-library-mobile").value.trim();

    const totalSeats =
        parseInt(
            document.getElementById("edit-library-seats").value
        );

    const joiningDate =
        document.getElementById("edit-library-joining").value;

    const expiryDate =
        document.getElementById("edit-library-expiry").value;

    const newPassword =
        document.getElementById("edit-library-password").value.trim();

    if (!libraryId || !name || !email || !totalSeats) {

        alert(
            "Please complete the required library details."
        );

        return;
    }

    if (
        joiningDate &&
        expiryDate &&
        expiryDate < joiningDate
    ) {

        alert(
            "Expiry Date cannot be earlier than Joining Date."
        );

        return;
    }

    try {

        const docRef =
            db
                .collection("saas_libraries")
                .doc(libraryId);

        const updateData = {

            name: name,

            adminEmail: email,

            mobile: mobile,

            totalSeats: totalSeats,

            joiningDate: joiningDate,

            expiryDate: expiryDate

        };

        if (newPassword) {

            updateData.adminPass =
                newPassword;

        }

        await docRef.update(
            updateData
        );

        alert(
            "Library details updated successfully."
        );

        closeLibraryModal();

    }
    catch (error) {

        console.error(
            "[Library Update Error]",
            error
        );

        alert(
            "Failed to update library: " +
            error.message
        );

    }

}
/**
 * Create Library
 */
async function commitNewLibraryDeploymentAction(event) {

    event.preventDefault();

    const name =
        document.getElementById("lib-name").value.trim();

    const email =
        document.getElementById("lib-email").value.trim().toLowerCase();

    const password =
        document.getElementById("lib-pass").value.trim();

    const totalSeats =
        parseInt(document.getElementById("lib-seats").value);
    const mobile =
    document.getElementById("lib-mobile").value.trim();

const joiningDate =
    document.getElementById("lib-joining-date").value;

const expiryDate =
    document.getElementById("lib-expiry-date").value;

    try {

        const check = await db
            .collection("saas_libraries")
            .where("adminEmail","==",email)
            .get();

        if (!check.empty) {

            alert("Email already exists.");

            return;

        }

        const libraryId =
            "LIB-" +
            Math.random().toString(36).substr(2,4).toUpperCase() +
            Math.floor(10 + Math.random()*90);

        const libraryData = {

            libraryId,

            name,

            adminEmail: email,

            adminPass: password,

            totalSeats,

            mobile,
            joiningDate,
            expiryDate,

            status: "approved",

            enabled: true,

            createdAt: firebase.firestore.FieldValue.serverTimestamp()

        };

        const docRef =
            db.collection("saas_libraries")
            .doc(libraryId);

        await docRef.set(libraryData);

        const anchor = {

            initMetadata: true,

            createdAt: new Date().toISOString()

        };

        await docRef.collection("students").doc("anchor").set(anchor);

        await docRef.collection("attendance").doc("anchor").set(anchor);

        await docRef.collection("timetable").doc("anchor").set(anchor);

        await docRef.collection("holidays").doc("anchor").set(anchor);

        await docRef.collection("notices").doc("anchor").set(anchor);

        alert("Library Created Successfully.");

        document
            .getElementById("create-library-form")
            .reset();

        document
            .getElementById("lib-pass")
            .value = "password123";

    }
    catch (error) {

        console.error(error);

        alert(error.message);

    }

}
