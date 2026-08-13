/**
 * ==========================================================================
 * LIBMANAGE SAAS ECOSYSTEM CORE ENGINE - MULTI-TENANT CLOUD RECOVERY MODULE
 * ==========================================================================
 */

// 1. Unified Multi-Tenant Cloud Architecture Parameters Base Configurations
const unifiedFirebaseConfig = {
    apiKey: "AIzaSyCUe84QnEA5DY31DXtzM-7M4Xu5bSa8xO8",
    authDomain: "appointment-app-cb979.firebaseapp.com",
    projectId: "appointment-app-cb979",
    storageBucket: "appointment-app-cb979.firebasestorage.app",
    messagingSenderId: "596931961212",
    appId: "1:596931961212:web:6039e8f8ab4e759c9104f9"
};

// 2. Deterministic Singular Structural Global Bootstrapper Sequence Execution
if (typeof firebase !== "undefined" && firebase.apps) {
    if (!firebase.apps.length) {
        firebase.initializeApp(unifiedFirebaseConfig);
    }
    window.db = firebase.firestore();
} else {
    console.warn("[LibManage Core Engine Wait Warning]: Firebase SDK layers not detected on this context stack sequence. Ensure official script tags are loaded.");
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase === "undefined") {
        console.error("Firebase SDK not loaded.");
        return;
    }

    bindGatewayAuthPipelines();
});

/**
 * Handles Authentication Gateways Verification Routines Channels Loops
 */
function bindGatewayAuthPipelines() {
    const studentForm = document.getElementById('student-login-form');
    const adminForm = document.getElementById('admin-login-form');

    const db = window.db;

    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const libraryIdInput =
                document.getElementById('student-library-id');

            const studentCodeInput =
                document.getElementById('student-uid');

            const libraryId =
                libraryIdInput.value.trim().toUpperCase();

            const studentCode =
                studentCodeInput.value.trim().toUpperCase();

            if (!db) {
                alert("Database Engine Offline: Cloud storage hooks could not be fully initialized.");
                return;
            }

            if (!libraryId || !studentCode) {
                alert("Please enter Library ID and Student Code.");
                return;
            }

            try {

                const studentDoc = await db
                    .collection("saas_libraries")
                    .doc(libraryId)
                    .collection("students")
                    .doc(studentCode)
                    .get();

                if (!studentDoc.exists) {
                    alert("Login Failed: Invalid Library ID or Student Code.");
                    return;
                }

                const studentData = studentDoc.data();

                const libraryDoc = await db
                    .collection("saas_libraries")
                    .doc(libraryId)
                    .get();

                if (!libraryDoc.exists) {
                    alert("Library not found.");
                    return;
                }

                const libraryData = libraryDoc.data();

                if (libraryData.status !== "approved") {
                    alert("Access Blocked: This library is awaiting approval.");
                    return;
                }

                if (!libraryData.enabled) {
                    alert("Access Suspended: This library is currently disabled.");
                    return;
                }

                /*
                 * STUDENT SESSION
                 * Session remains active until explicit logout.
                 */

                localStorage.setItem(
                    "session_role",
                    "student"
                );

                localStorage.setItem(
                    "session_student_code",
                    studentData.studentCode || studentCode
                );

            localStorage.setItem(
                    "session_student_seat",
                    studentData.seatNumber || ""
                );

                localStorage.setItem(
                    "session_library_id",
                    libraryId
                );

                localStorage.setItem(
                    "session_library_name",
                    libraryData.name || "Library"
                );

                const pathPrefixModifier =
                    window.location.pathname.includes('/pages/')
                        ? ""
                        : "pages/";

                window.location.href =
                    `${pathPrefixModifier}student-dashboard.html`;

            } catch (error) {

                console.error(
                    "[Student Login Error]:",
                    error
                );

                alert(
                    "Cloud system synchronization failure: " +
                    error.message
                );
            }
        });
    }

  if (adminForm) {
    adminForm.addEventListener('submit', async (e) => {

        e.preventDefault();

        const libraryIdInput =
            document.getElementById('admin-library-id');

        const passwordInput =
            document.getElementById('admin-password');

        if (!libraryIdInput || !passwordInput) {
            console.error(
                "[Admin Login] Required login fields not found."
            );
            return;
        }

        const libraryId =
            libraryIdInput.value
                .trim()
                .toUpperCase();

        const passInput =
            passwordInput.value;

        if (!db) {
            alert(
                "Database Engine Offline: Cloud storage hooks could not be fully initialized."
            );
            return;
        }

        if (!libraryId || !passInput) {
            alert(
                "Please enter Library ID and Password."
            );
            return;
        }

        try {

            const libraryDoc =
                await db
                    .collection("saas_libraries")
                    .doc(libraryId)
                    .get();

            if (!libraryDoc.exists) {
                alert(
                    "Login Failed: Invalid Library ID or Password."
                );
                return;
            }

            const libraryData =
                libraryDoc.data();

            /*
             * Existing Manager-created password
             * is used for the current version.
             *
             * No Firestore structure is changed.
             */

            if (
                String(libraryData.adminPass || "") !==
                String(passInput)
            ) {
                alert(
                    "Login Failed: Invalid Library ID or Password."
                );
                return;
            }

            if (
                libraryData.status !==
                "approved"
            ) {
                alert(
                    "Access Restricted: Your library request terminal state is currently: PENDING APPROVAL."
                );
                return;
            }

            if (!libraryData.enabled) {
                alert(
                    "Access Suspended: Your branch terminal access has been disabled by the owner."
                );
                return;
            }

            /*
             * ADMIN SESSION
             */

            localStorage.setItem(
                "session_role",
                "admin"
            );

            localStorage.setItem(
                "session_library_id",
                libraryData.libraryId || libraryId
            );

            localStorage.setItem(
                "session_library_name",
                libraryData.name || "Library"
            );

            const pathPrefixModifier =
                window.location.pathname.includes('/pages/')
                    ? ""
                    : "pages/";

            window.location.href =
                `${pathPrefixModifier}admin-dashboard.html`;

        } catch (error) {

            console.error(
                "[Ecosystem Admin Login Error]:",
                error
            );

            alert(
                "Cloud system synchronization failure: " +
                error.message
            );
        }
    });
}
}
/**
 * Reusable Asynchronous UI Fragment Layout Engine Integration Layer
 */
async function loadSaaSLayoutComponent(
    containerId,
    componentUrl,
    callback = null
) {
    const container =
        document.getElementById(containerId);

    if (!container) return;

    try {
        const response =
            await fetch(componentUrl);

        if (!response.ok) {
            throw new Error(
                "HTTP network transaction status fault code: " +
                response.status
            );
        }

        const templateHtmlStringPayload =
            await response.text();

        container.innerHTML =
            templateHtmlStringPayload;

        if (callback) callback();

    } catch (err) {

        console.error(
            "[Ecosystem Layout Component Load Exception Error] Container Target [" +
            containerId +
            "] Asset [" +
            componentUrl +
            "]:",
            err
        );
    }
}
/**
 * ==========================================================================
 * ADMIN / STUDENT LOGOUT
 * ==========================================================================
 * Navbar dynamically load hota hai, isliye event delegation use ki gayi hai.
 */

document.addEventListener("click", (event) => {

    const logoutButton =
        event.target.closest(
            "#admin-logout-btn, #student-exit-btn"
        );

    if (!logoutButton) {
        return;
    }

    localStorage.clear();
    sessionStorage.clear();

    window.location.href = "../index.html";

});
/**
 * Admin Notice Module
 * Safe scope: only dashboard notice area affected
 */
let adminNoticeRealtimeUnsubscribe = null;

function initAdminNoticeModule() {

    const addNoticeButton =
        document.getElementById("btn-add-notice");

    const modalOverlay =
        document.getElementById("notice-modal-overlay");

    const closeModalButton =
        document.getElementById("notice-modal-close");

    const cancelButton =
        document.getElementById("notice-cancel-btn");

    const saveButton =
        document.getElementById("notice-save-btn");

    const modalTitle =
        document.getElementById("notice-modal-title");

    const titleInput =
        document.getElementById("notice-title-input");

    const messageInput =
        document.getElementById("notice-message-input");

    const errorBox =
        document.getElementById("notice-form-error");

    const successBox =
        document.getElementById("notice-form-success");

    const noticeContainer =
        document.getElementById("recent-notices-container");

    const db =
        window.db;

    const currentLibraryId =
        localStorage.getItem("session_library_id");

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

    if (!db || !currentLibraryId) {
        console.warn(
            "[Admin Notice Module] Missing database instance or session library context."
        );
        return;
    }

    const noticesRef =
        db
            .collection("saas_libraries")
            .doc(currentLibraryId)
            .collection("notices");

    let currentNoticeEditId = null;
    let isNoticeSaving = false;
    let noticeDataMap = {};

    function resetNoticeForm() {
        titleInput.value = "";
        messageInput.value = "";
    }

    function clearNoticeMessages() {
        errorBox.textContent = "";
        successBox.textContent = "";
        errorBox.classList.remove("active");
        successBox.classList.remove("active");
    }

    function showNoticeError(message) {
        errorBox.textContent = message;
        errorBox.classList.add("active");
        successBox.textContent = "";
        successBox.classList.remove("active");
    }

    function showNoticeSuccess(message) {
        successBox.textContent = message;
        successBox.classList.add("active");
        errorBox.textContent = "";
        errorBox.classList.remove("active");
    }

    function updateSaveButtonState() {
        saveButton.disabled = isNoticeSaving;

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
                noticeDataMap[noticeId].title || "";

            messageInput.value =
                noticeDataMap[noticeId].message || "";

        } else {

            currentNoticeEditId = null;

            resetNoticeForm();
        }

        isNoticeSaving = false;

        updateSaveButtonState();

        modalOverlay.classList.add("active");

        modalOverlay.setAttribute(
            "aria-hidden",
            "false"
        );

        setTimeout(() => {
            titleInput.focus();
        }, 40);
    }

    function closeModal() {

        modalOverlay.classList.remove("active");

        modalOverlay.setAttribute(
            "aria-hidden",
            "true"
        );

        currentNoticeEditId = null;

        isNoticeSaving = false;

        resetNoticeForm();

        clearNoticeMessages();

        updateSaveButtonState();
    }

    function escapeHtml(value) {

        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getTimestampMillis(
        timestampValue
    ) {

        if (!timestampValue) return null;

        if (
            typeof timestampValue.toMillis ===
            "function"
        ) {
            return timestampValue.toMillis();
        }

        if (
            typeof timestampValue.toDate ===
            "function"
        ) {

            const dateValue =
                timestampValue.toDate();

            return dateValue instanceof Date &&
                !Number.isNaN(
                    dateValue.getTime()
                )
                ? dateValue.getTime()
                : null;
        }

        if (timestampValue.seconds) {

            return (
                timestampValue.seconds * 1000
            ) +
            Math.floor(
                (timestampValue.nanoseconds || 0) /
                1000000
            );
        }

        return null;
    }

    function getNoticeSortTime(notice) {

        return getTimestampMillis(
            notice.createdAt
        ) ??
        getTimestampMillis(
            notice.updatedAt
        ) ??
        null;
    }

    function formatNoticeDate(
        timestampValue,
        updatedAtValue
    ) {

        let dateObject = null;

        const sourceValue =
            timestampValue ||
            updatedAtValue;

        if (!sourceValue) {
            return "Just now";
        }

        if (
            typeof sourceValue.toDate ===
            "function"
        ) {

            dateObject =
                sourceValue.toDate();

        } else if (
            sourceValue.seconds
        ) {

            dateObject =
                new Date(
                    sourceValue.seconds * 1000
                );
        }

        if (
            !dateObject ||
            Number.isNaN(
                dateObject.getTime()
            )
        ) {
            return "Just now";
        }

        return dateObject.toLocaleString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
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

        if (isNoticeSaving) return;

        isNoticeSaving = true;

        updateSaveButtonState();

        try {

            if (currentNoticeEditId) {

                await noticesRef
                    .doc(currentNoticeEditId)
                    .update({
                        title: title,
                        message: message,
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

                    title: title,

                    message: message,

                    createdAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp(),

                    updatedAt:
                        firebase.firestore
                            .FieldValue
                            .serverTimestamp(),

                    createdBy:
                        sessionStorage.getItem(
                            "session_library_name"
                        ) ||
                        "admin"
                });

                showNoticeSuccess(
                    "Notice saved successfully."
                );
            }

            setTimeout(() => {
                closeModal();
            }, 450);

        } catch (error) {

            console.error(
                "[Admin Notice Save Error]:",
                error
            );

            showNoticeError(
                currentNoticeEditId
                    ? "Failed to update notice. Please try again."
                    : "Failed to save notice. Please try again."
            );

            isNoticeSaving = false;

            updateSaveButtonState();
        }
    }

    async function deleteNotice(noticeId) {

        if (!noticeId) return;

        const shouldDelete =
            window.confirm(
                "Are you sure you want to delete this notice?"
            );

        if (!shouldDelete) return;

        try {

            await noticesRef
                .doc(noticeId)
                .delete();

        } catch (error) {

            console.error(
                "[Admin Notice Delete Error]:",
                error
            );

            alert(
                "Failed to delete notice. Please try again."
            );
        }
    }

    function renderNotices(noticeDocs) {

        if (
            !noticeDocs ||
            !noticeDocs.length
        ) {

            noticeDataMap = {};

            noticeContainer.innerHTML = `
                <div class="notice-empty-state">
                    No notices available right now. Click <strong>+ Add Notice</strong> to publish the first update.
                </div>
            `;

            return;
        }

        let html = "";

        noticeDataMap = {};

        noticeDocs.forEach((doc) => {

            const notice =
                doc.data || {};

            noticeDataMap[doc.id] =
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

            const formattedDate =
                escapeHtml(
                    formatNoticeDate(
                        notice.createdAt,
                        notice.updatedAt
                    )
                );

            html += `
                <div
                    class="notice-card"
                    data-notice-id="${doc.id}"
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
                            ${formattedDate}
                        </span>

                        <div class="notice-card-actions">

                            <button
                                type="button"
                                class="notice-edit-btn"
                                data-notice-edit="${doc.id}"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="notice-delete-btn"
                                data-notice-delete="${doc.id}"
                            >
                                Delete
                            </button>

                        </div>

                    </div>

                </div>
            `;
        });

        noticeContainer.innerHTML =
            html;
    }

    addNoticeButton.addEventListener(
        "click",
        () => {
            openModal("add");
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

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                modalOverlay.classList.contains(
                    "active"
                )
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

                const noticeId =
                    editButton.getAttribute(
                        "data-notice-edit"
                    );

                openModal(
                    "edit",
                    noticeId
                );

                return;
            }

            const deleteButton =
                event.target.closest(
                    "[data-notice-delete]"
                );

            if (deleteButton) {

                const noticeId =
                    deleteButton.getAttribute(
                        "data-notice-delete"
                    );

                deleteNotice(
                    noticeId
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
                            id: doc.id,
                            data: doc.data()
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

                        return bTime - aTime;
                    }
                );

                renderNotices(
                    noticeDocs
                );
            },

            (error) => {

                console.error(
                    "[Admin Notice Realtime Listener Error]:",
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
