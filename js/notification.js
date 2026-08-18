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
   ==========================================================================
   
   This creates the basic notification configuration automatically.
   
   It does NOT delete or modify existing student/library data.
   
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
     *
     * We create only a lightweight initialization document.
     *
     * Existing data is never overwritten.
     *
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
   8. INITIALIZE
   ========================================================================== */

async function startLibControlNotificationEngine() {

    try {

        await initializeNotificationStructure();


        console.log(
            "[LibControl Notification] Engine ready."
        );

    }
    catch (error) {

        console.error(
            "[LibControl Notification] Initialization error:",
            error
        );

    }

}


/* ==========================================================================
   9. AUTOMATIC FEE REMINDER
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


        let dueDate = null;


        /*
         * DD/MM/YYYY format used by the student module.
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
                    parseInt(parts[2], 10),
                    parseInt(parts[1], 10) - 1,
                    parseInt(parts[0], 10)
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
                    ) * 1000
                );

        }


        if (
            !dueDate ||
            Number.isNaN(
                dueDate.getTime()
            )
        ) {

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
         * Reminder is created ONLY exactly 2 days
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
                getStudentSessionCode?.() ||
                ""
            )
            .trim()
            .toUpperCase();


        if (!studentCode) {

            return;

        }


        const dueDateText =
            String(
                feeDueDateValue
            );


        /*
         * Unique key prevents the same due-date reminder
         * from being created repeatedly.
         */

        const reminderKey =
            "fee_due_" +
            studentCode +
            "_" +
            dueDateText.replace(
                /[^0-9]/g,
                ""
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
   10. START FEE REMINDER CHECK
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
   11. NOTIFICATION ENGINE START
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        startStudentFeeReminderCheck();

    }
);
