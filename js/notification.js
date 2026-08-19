/**
 * ==========================================================================
 * LIBCONTROL - NOTIFICATION ENGINE
 * ==========================================================================
 *
 * NEW NOTIFICATION MODULE
 *
 * Existing working files are NOT modified here.
 *
 * Purpose:
 * - Notification structure
 * - Automatic Firestore notification document setup
 * - Notification creation helpers
 * - Student notification loading helpers
 * - Automatic fee reminder
 * - Student notification display
 *
 * ==========================================================================
 */

"use strict";


/* ==========================================================================
   1. FIREBASE
   ========================================================================== */

let notificationDB = null;

if (
    typeof firebase !== "undefined" &&
    firebase.apps &&
    firebase.apps.length > 0
) {

    notificationDB =
        firebase.firestore();

}


window.notificationDB =
    notificationDB;


/* ==========================================================================
   2. COLLECTION NAMES
   ========================================================================== */

const LIBCONTROL_NOTIFICATIONS = {

    NOTIFICATIONS:
        "notifications",

    SETTINGS:
        "settings",

    NOTIFICATION_CONFIG:
        "notification_config"

};


/* ==========================================================================
   3. BASIC HELPERS
   ========================================================================== */

function notificationSafeText(value) {

    return String(
        value ?? ""
    );

}


/* ==========================================================================
   4. CURRENT USER
   ========================================================================== */

function getNotificationUserUID() {

    if (
        typeof firebase === "undefined" ||
        !firebase.auth
    ) {

        return null;

    }


    const user =
        firebase
            .auth()
            .currentUser;


    return user
        ? user.uid
        : null;

}


/* ==========================================================================
   5. AUTOMATIC NOTIFICATION STRUCTURE
   ========================================================================== */

async function initializeNotificationStructure() {

    if (!notificationDB) {

        throw new Error(
            "Firebase Firestore is not initialized."
        );

    }


    const userUID =
        getNotificationUserUID();


    if (!userUID) {

        console.warn(
            "[LibControl Notification] User not logged in."
        );

        return false;

    }


    /*
     * --------------------------------------------------------------
     * GLOBAL NOTIFICATION CONFIGURATION
     * --------------------------------------------------------------
     */

    const configReference =
        notificationDB
            .collection(
                LIBCONTROL_NOTIFICATIONS.SETTINGS
            )
            .doc(
                LIBCONTROL_NOTIFICATIONS.NOTIFICATION_CONFIG
            );


    const configSnapshot =
        await configReference.get();


    if (!configSnapshot.exists) {

        await configReference.set({

            notificationsEnabled:
                true,

            feeReminderEnabled:
                true,

            membershipReminderEnabled:
                true,

            libraryNoticeEnabled:
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
            "[LibControl Notification] Notification configuration created."
        );

    }


    /*
     * --------------------------------------------------------------
     * USER NOTIFICATION ROOT
     * --------------------------------------------------------------
     */

    const userReference =
        notificationDB
            .collection(
                LIBCONTROL_NOTIFICATIONS.NOTIFICATIONS
            )
            .doc(
                userUID
            );


    const userSnapshot =
        await userReference.get();


    if (!userSnapshot.exists) {

        await userReference.set({

            userUID:
                userUID,

            initialized:
                true,

            unreadCount:
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


        console.log(
            "[LibControl Notification] User notification structure created."
        );

    }


    return true;

}


/* ==========================================================================
   6. CREATE NOTIFICATION
   ========================================================================== */

async function createLibControlNotification(
    data
) {

    if (!notificationDB) {

        throw new Error(
            "Firebase Firestore is not initialized."
        );

    }


    const userUID =
        notificationSafeText(
            data.userUID
        ).trim();


    if (!userUID) {

        throw new Error(
            "Notification user UID is required."
        );

    }


    const title =
        notificationSafeText(
            data.title
        ).trim();


    const message =
        notificationSafeText(
            data.message
        ).trim();


    if (!title) {

        throw new Error(
            "Notification title is required."
        );

    }


    if (!message) {

        throw new Error(
            "Notification message is required."
        );

    }


    const notificationReference =
        notificationDB
            .collection(
                LIBCONTROL_NOTIFICATIONS.NOTIFICATIONS
            )
            .doc(
                userUID
            )
            .collection(
                "items"
            )
            .doc();


    await notificationReference.set({

        notificationId:
            notificationReference.id,

        userUID:
            userUID,

        title:
            title,

        message:
            message,

        type:
            notificationSafeText(
                data.type
            ) || "general",

        read:
            false,

        createdAt:
            firebase.firestore
                .FieldValue
                .serverTimestamp()

    });


    /*
     * Update unread count.
     */

    await notificationDB
        .collection(
            LIBCONTROL_NOTIFICATIONS.NOTIFICATIONS
        )
        .doc(
            userUID
        )
        .set({

            unreadCount:
                firebase.firestore
                    .FieldValue
                    .increment(1),

            updatedAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        }, {

            merge:
                true

        });


    return notificationReference.id;

}


/* ==========================================================================
   7. LOAD USER NOTIFICATIONS
   ========================================================================== */

async function loadLibControlNotifications(
    userUID
) {

    if (!notificationDB) {

        throw new Error(
            "Firebase Firestore is not initialized."
        );

    }


    const uid =
        notificationSafeText(
            userUID
        ).trim();


    if (!uid) {

        return [];

    }


    const snapshot =
        await notificationDB
            .collection(
                LIBCONTROL_NOTIFICATIONS.NOTIFICATIONS
            )
            .doc(
                uid
            )
            .collection(
                "items"
            )
            .orderBy(
                "createdAt",
                "desc"
            )
            .limit(
                50
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
   7A. LOAD LATEST STUDENT NOTIFICATION
   ========================================================================== */

async function loadLatestStudentNotification() {

    if (!notificationDB) {
        return;
    }


    const userUID =
        getNotificationUserUID();


    if (!userUID) {
        return;
    }


    const notificationElement =
        document.getElementById(
            "student-notification"
        );


    if (!notificationElement) {
        return;
    }


    try {

        const snapshot =
            await notificationDB
                .collection(
                    LIBCONTROL_NOTIFICATIONS.NOTIFICATIONS
                )
                .doc(
                    userUID
                )
                .collection(
                    "items"
                )
                .orderBy(
                    "createdAt",
                    "desc"
                )
                .limit(
                    1
                )
                .get();


        if (
            snapshot.empty
        ) {

            notificationElement.textContent =
                "No new notification";

            return;

        }


        const latest =
            snapshot.docs[0].data();


        notificationElement.textContent =
            latest.message ||
            latest.title ||
            "No new notification";


    }
    catch (error) {

        console.error(
            "[LibControl Notification] Latest notification load error:",
            error
        );

    }

}

/* ==========================================================================
   8. NOTIFICATION HTML ESCAPE
   ========================================================================== */

function escapeNotificationHtml(
    value
) {

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
   9. NOTIFICATION TIMESTAMP
   ========================================================================== */

function getNotificationTimestampMillis(
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

        return value
            .toDate()
            .getTime();

    }


    if (
        value.seconds !== undefined
    ) {

        return (
            Number(
                value.seconds
            ) *
            1000
        );

    }


    if (
        typeof value ===
        "string"
    ) {

        const parsed =
            new Date(
                value
            );


        if (
            !Number.isNaN(
                parsed.getTime()
            )
        ) {

            return parsed.getTime();

        }

    }


    return 0;

}


/* ==========================================================================
   10. NOTIFICATION DATE FORMAT
   ========================================================================== */

function formatNotificationDate(
    value
) {

    const millis =
        getNotificationTimestampMillis(
            value
        );


    if (!millis) {

        return "Just now";

    }


    return new Date(
        millis
    ).toLocaleString(
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


/* ==========================================================================
   11. RENDER STUDENT NOTIFICATIONS
   ========================================================================== */

function renderStudentNotifications(
    notifications,
    container
) {

    if (!container) {

        return;

    }


    if (
        !notifications ||
        !notifications.length
    ) {

        container.innerHTML = `
            <div class="empty-message">
                No notifications available right now.
            </div>
        `;

        return;

    }


    let html =
        "";


    notifications.forEach(
        (notification) => {

            const notificationClass =
                notification.read
                    ? "notification-item read"
                    : "notification-item unread";


            html += `
                <div class="${notificationClass}">

                    <h3>
                        ${escapeNotificationHtml(
                            notification.title ||
                            "Notification"
                        )}
                    </h3>


                    <p>
                        ${escapeNotificationHtml(
                            notification.message ||
                            ""
                        )}
                    </p>


                    <span class="notice-date">
                        ${escapeNotificationHtml(
                            formatNotificationDate(
                                notification.createdAt
                            )
                        )}
                    </span>

                </div>
            `;

        }
    );


    container.innerHTML =
        html;

}


/* ==========================================================================
   12. STUDENT NOTIFICATION LISTENER
   ==========================================================================
   
   Loads notifications for the currently authenticated
   Firebase student account.

   ========================================================================== */

function startStudentNotificationListener() {

    const container =
        document.getElementById(
            "student-notifications-container"
        );


    if (!container) {

        console.warn(
            "[LibControl Notification] Notification container not found."
        );

        return;

    }


    const userUID =
        getNotificationUserUID();


    if (!userUID) {

        container.innerHTML = `
            <div class="empty-message">
                Please login again to view notifications.
            </div>
        `;

        return;

    }


    notificationDB
        .collection(
            LIBCONTROL_NOTIFICATIONS.NOTIFICATIONS
        )
        .doc(
            userUID
        )
        .collection(
            "items"
        )
        .orderBy(
            "createdAt",
            "desc"
        )
        .limit(
            50
        )
        .onSnapshot(

            (snapshot) => {

                const notifications =
                    snapshot.docs.map(
                        (doc) => ({

                            id:
                                doc.id,

                            ...doc.data()

                        })
                    );


                renderStudentNotifications(
                    notifications,
                    container
                );

            },

            (error) => {

                console.error(
                    "[LibControl Notification] Notification listener error:",
                    error
                );


                container.innerHTML = `
                    <div class="empty-message">
                        Unable to load notifications right now.
                    </div>
                `;

            }

        );

}


/* ==========================================================================
   13. AUTOMATIC FEE REMINDER
   ==========================================================================
   
   Creates an individual student notification exactly 2 days
   before the student's fee due date.

   IMPORTANT:
   - Only the current logged-in student is checked.
   - Paid students do not receive a reminder.
   - Each due date gets only one reminder.
   ========================================================================== */

async function checkStudentFeeReminder() {

    try {

        const userUID =
            getNotificationUserUID();


        if (!userUID) {

            return;

        }


        /*
         * Wait until student-dashboard.js has loaded
         * the current student's Firestore record.
         */

        if (
            typeof studentDashboardData ===
            "undefined" ||
            !studentDashboardData
        ) {

            return;

        }


        const feeStatus =
            String(
                studentDashboardData.feeStatus ||
                "Paid"
            )
            .trim()
            .toLowerCase();


        /*
         * Paid students should never receive
         * a fee-due reminder.
         */

        if (
            feeStatus !== "due"
        ) {

            return;

        }


        const feeDueDateValue =
            studentDashboardData.feeDueDate;


        if (!feeDueDateValue) {

            return;

        }


        let dueDate =
            null;


        /*
         * DD/MM/YYYY format.
         */

        if (
            typeof feeDueDateValue ===
            "string" &&
            /^\d{2}\/\d{2}\/\d{4}$/.test(
                feeDueDateValue.trim()
            )
        ) {

            const parts =
                feeDueDateValue
                    .trim()
                    .split("/");


            dueDate =
                new Date(
                    parseInt(
                        parts[2],
                        10
                    ),
                    parseInt(
                        parts[1],
                        10
                    ) - 1,
                    parseInt(
                        parts[0],
                        10
                    )
                );

        }
        else if (
            typeof feeDueDateValue.toDate ===
            "function"
        ) {

            dueDate =
                feeDueDateValue.toDate();

        }
        else if (
            feeDueDateValue.seconds !==
            undefined
        ) {

            dueDate =
                new Date(
                    Number(
                        feeDueDateValue.seconds
                    ) *
                    1000
                );

        }
        else if (
            typeof feeDueDateValue ===
            "string"
        ) {

            const parsedDate =
                new Date(
                    feeDueDateValue
                );


            if (
                !Number.isNaN(
                    parsedDate.getTime()
                )
            ) {

                dueDate =
                    parsedDate;

            }

        }


        if (
            !dueDate ||
            Number.isNaN(
                dueDate.getTime()
            )
        ) {

            console.warn(
                "[LibControl Notification] Invalid fee due date."
            );

            return;

        }


        /*
         * Normalize both dates to local midnight.
         */

        const today =
            new Date();


        today.setHours(
            0,
            0,
            0,
            0
        );


        dueDate.setHours(
            0,
            0,
            0,
            0
        );


        const difference =
            dueDate.getTime() -
            today.getTime();


        const daysUntilDue =
            Math.round(
                difference /
                (
                    1000 *
                    60 *
                    60 *
                    24
                )
            );


        /*
         * Reminder is created exactly 2 days
         * before the due date.
         */

        if (
            daysUntilDue !== 2
        ) {

            return;

        }


        const studentCode =
            String(
                studentDashboardData.studentCode ||
                (
                    typeof getStudentSessionCode ===
                    "function"
                        ? getStudentSessionCode()
                        : ""
                ) ||
                ""
            )
            .trim()
            .toUpperCase();


        if (!studentCode) {

            return;

        }


        let dueDateText =
            String(
                feeDueDateValue
            ).trim();


        /*
         * Keep the notification date readable.
         */

        if (
            dueDateText ===
            "[object Object]"
        ) {

            dueDateText =
                dueDate
                    .toLocaleDateString(
                        "en-IN",
                        {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric"
                        }
                    );

        }


        /*
         * Unique key prevents duplicate reminders
         * for the same student and same due date.
         */

        const reminderKey =
            "fee_due_" +
            studentCode +
            "_" +
            (
                dueDate.getFullYear()
            ) +
            String(
                dueDate.getMonth() + 1
            ).padStart(
                2,
                "0"
            ) +
            String(
                dueDate.getDate()
            ).padStart(
                2,
                "0"
            );


        const reminderReference =
            notificationDB
                .collection(
                    LIBCONTROL_NOTIFICATIONS.NOTIFICATIONS
                )
                .doc(
                    userUID
                )
                .collection(
                    "items"
                )
                .doc(
                    reminderKey
                );


        const existing =
            await reminderReference.get();


        if (
            existing.exists
        ) {

            console.log(
                "[LibControl Notification] Fee reminder already exists:",
                reminderKey
            );

            return;

        }


        await reminderReference.set({

            notificationId:
                reminderKey,

            userUID:
                userUID,

            studentCode:
                studentCode,

            title:
                "Fee Payment Reminder",

            message:
                "Your library fee is due on " +
                dueDateText +
                ". Please complete your fee payment to continue your membership.",

            type:
                "fee_reminder",

            read:
                false,

            createdAt:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()

        });


        /*
         * Update unread count.
         */

        await notificationDB
            .collection(
                LIBCONTROL_NOTIFICATIONS.NOTIFICATIONS
            )
            .doc(
                userUID
            )
            .set({

                userUID:
                    userUID,

                initialized:
                    true,

                unreadCount:
                    firebase.firestore
                        .FieldValue
                        .increment(1),

                updatedAt:
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp()

            }, {

                merge:
                    true

            });


        console.log(
            "[LibControl Notification] Fee reminder created:",
            reminderKey
        );

    }
    catch (error) {

        console.error(
            "[LibControl Notification] Fee reminder error:",
            error
        );

    }

}


/* ==========================================================================
   14. START FEE REMINDER CHECK
   ========================================================================== */

function startStudentFeeReminderCheck() {

    let attempts =
        0;


    const maxAttempts =
        20;


    const timer =
        setInterval(
            async () => {

                attempts++;


                if (
                    typeof studentDashboardData !==
                    "undefined" &&
                    studentDashboardData
                ) {

                    clearInterval(
                        timer
                    );


                    await checkStudentFeeReminder();

                    return;

                }


                if (
                    attempts >=
                    maxAttempts
                ) {

                    clearInterval(
                        timer
                    );

                }

            },
            500
        );

}


/* ==========================================================================
   15. NOTIFICATION ENGINE START
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
         * Start the notification listener after
         * the dashboard HTML is available.
         */

        startStudentNotificationListener();


        /*
         * Check the student's fee reminder after
         * student-dashboard.js has loaded the record.
         */

        startStudentFeeReminderCheck();

    }
);
