/**
 * ==========================================================================
 * LIBCONTROL - NOTIFICATION ENGINE
 * ==========================================================================
 *
 * Handles:
 * - Notification structure
 * - Notification creation
 * - Latest student notification
 * - Automatic old notification cleanup
 * - Automatic fee reminder
 * - Fee reminder removal when fee becomes Paid
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

    }


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
   8. DELETE ALL FEE REMINDERS
   ========================================================================== */

async function deleteStudentFeeReminders() {

    if (!notificationDB) {

        return;

    }


    const userUID =
        getNotificationUserUID();


    if (!userUID) {

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
                .where(
                    "type",
                    "==",
                    "fee_reminder"
                )
                .get();


        if (
            snapshot.empty
        ) {

            return;

        }


        const batch =
            notificationDB.batch();


        snapshot.docs.forEach(
            (doc) => {

                batch.delete(
                    doc.ref
                );

            }
        );


        await batch.commit();


        /*
         * Reset unread count because fee reminders
         * have now been removed.
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
                    0,

                updatedAt:
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp()

            }, {

                merge:
                    true

            });


        console.log(
            "[LibControl Notification] Fee reminders removed because fee is Paid."
        );

    }
    catch (error) {

        console.error(
            "[LibControl Notification] Fee reminder deletion error:",
            error
        );

    }

}


/* ==========================================================================
   9. KEEP ONLY LATEST NOTIFICATION
   ========================================================================== */

async function keepOnlyLatestStudentNotification() {

    if (!notificationDB) {

        return;

    }


    const userUID =
        getNotificationUserUID();


    if (!userUID) {

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
                .get();


        if (
            snapshot.size <= 1
        ) {

            return;

        }


        const batch =
            notificationDB.batch();


        snapshot.docs
            .slice(1)
            .forEach(
                (doc) => {

                    batch.delete(
                        doc.ref
                    );

                }
            );


        await batch.commit();


        console.log(
            "[LibControl Notification] Old notifications removed."
        );

    }
    catch (error) {

        console.error(
            "[LibControl Notification] Old notification cleanup error:",
            error
        );

    }

}


/* ==========================================================================
   10. LOAD LATEST STUDENT NOTIFICATION
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

        /*
         * --------------------------------------------------------------
         * CHECK CURRENT FEE STATUS
         * --------------------------------------------------------------
         */

        if (
            typeof studentDashboardData !==
                "undefined" &&
            studentDashboardData
        ) {

            const feeStatus =
                String(
                    studentDashboardData.feeStatus ||
                    "Paid"
                )
                .trim()
                .toLowerCase();


            if (
                feeStatus ===
                "paid"
            ) {

                await deleteStudentFeeReminders();

            }

        }


        /*
         * --------------------------------------------------------------
         * KEEP ONLY LATEST
         * --------------------------------------------------------------
         */

        await keepOnlyLatestStudentNotification();


        /*
         * --------------------------------------------------------------
         * LOAD LATEST
         * --------------------------------------------------------------
         */

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
   11. AUTOMATIC FEE REMINDER
   ========================================================================== */

async function checkStudentFeeReminder() {

    try {

        const userUID =
            getNotificationUserUID();


        if (!userUID) {

            return;

        }


        if (
            typeof studentDashboardData ===
                "undefined" ||
            !studentDashboardData
        ) {

            return;

        }


        /*
         * --------------------------------------------------------------
         * FEE STATUS
         * --------------------------------------------------------------
         */

        const feeStatus =
            String(
                studentDashboardData.feeStatus ||
                "Paid"
            )
            .trim()
            .toLowerCase();


        /*
         * If Paid, remove any old fee reminder.
         */

        if (
            feeStatus !==
            "due"
        ) {

            await deleteStudentFeeReminders();

            await loadLatestStudentNotification();

            return;

        }


        /*
         * --------------------------------------------------------------
         * FEE DUE DATE
         * --------------------------------------------------------------
         */

        const feeDueDateValue =
            studentDashboardData.feeDueDate;


        if (!feeDueDateValue) {

            return;

        }


        let dueDate =
            null;


        /*
         * DD/MM/YYYY
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

            return;

        }


        /*
         * --------------------------------------------------------------
         * NORMALIZE DATES
         * --------------------------------------------------------------
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
         * --------------------------------------------------------------
         * REMINDER EXACTLY 2 DAYS BEFORE
         * --------------------------------------------------------------
         */

        if (
            daysUntilDue !==
            2
        ) {

            /*
             * If it is not the reminder day,
             * do not create a new notification.
             */

            await loadLatestStudentNotification();

            return;

        }


        /*
         * --------------------------------------------------------------
         * STUDENT CODE
         * --------------------------------------------------------------
         */

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


        /*
         * --------------------------------------------------------------
         * DUE DATE TEXT
         * --------------------------------------------------------------
         */

        let dueDateText =
            String(
                feeDueDateValue
            ).trim();


        if (
            dueDateText ===
            "[object Object]"
        ) {

            dueDateText =
                dueDate.toLocaleDateString(
                    "en-IN",
                    {
                        day:
                            "2-digit",

                        month:
                            "2-digit",

                        year:
                            "numeric"
                    }
                );

        }


        /*
         * --------------------------------------------------------------
         * UNIQUE REMINDER ID
         * --------------------------------------------------------------
         */

        const reminderKey =
            "fee_due_" +
            studentCode +
            "_" +
            dueDate
                .getFullYear() +
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


        /*
         * --------------------------------------------------------------
         * CREATE ONLY IF NOT ALREADY PRESENT
         * --------------------------------------------------------------
         */

        if (
            !existing.exists
        ) {

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

                    userUID:
                        userUID,

                    initialized:
                        true,

                    unreadCount:
                        1,

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


        /*
         * --------------------------------------------------------------
         * REMOVE ALL OLDER NOTIFICATIONS
         * --------------------------------------------------------------
         */

        await keepOnlyLatestStudentNotification();


        /*
         * --------------------------------------------------------------
         * DISPLAY LATEST
         * --------------------------------------------------------------
         */

        await loadLatestStudentNotification();

    }
    catch (error) {

        console.error(
            "[LibControl Notification] Fee reminder error:",
            error
        );

    }

}


/* ==========================================================================
   12. START FEE REMINDER CHECK
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
   13. REALTIME FEE STATUS WATCHER
   ==========================================================================
   
   Student dashboard already maintains studentDashboardData
   through Firestore realtime updates.

   This watcher checks the current data periodically so that
   Due -> Paid is reflected in the notification box without
   requiring a logout/login.

   ========================================================================== */

function startStudentNotificationStatusWatcher() {

    let lastFeeStatus =
        null;


    let lastFeeDueDate =
        null;


    setInterval(
        async () => {

            if (
                typeof studentDashboardData ===
                    "undefined" ||
                !studentDashboardData
            ) {

                return;

            }


            const currentFeeStatus =
                String(
                    studentDashboardData.feeStatus ||
                    "Paid"
                )
                .trim()
                .toLowerCase();


            const currentFeeDueDate =
                String(
                    studentDashboardData.feeDueDate ||
                    ""
                )
                .trim();


            /*
             * First run.
             */

            if (
                lastFeeStatus ===
                    null
            ) {

                lastFeeStatus =
                    currentFeeStatus;

                lastFeeDueDate =
                    currentFeeDueDate;


                await checkStudentFeeReminder();

                await loadLatestStudentNotification();

                return;

            }


            /*
             * Detect admin changes.
             */

            if (
                currentFeeStatus !==
                    lastFeeStatus ||
                currentFeeDueDate !==
                    lastFeeDueDate
            ) {

                lastFeeStatus =
                    currentFeeStatus;

                lastFeeDueDate =
                    currentFeeDueDate;


                await checkStudentFeeReminder();

                await loadLatestStudentNotification();

            }

        },
        3000
    );

}


/* ==========================================================================
   14. NOTIFICATION ENGINE START
   ========================================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        startLibControlNotificationEngine();

        startStudentFeeReminderCheck();

        startStudentNotificationStatusWatcher();

    }
);


/* ==========================================================================
   15. PUBLIC API
   ========================================================================== */

window.LibControlNotifications = {

    create:
        createLibControlNotification,

    load:
        loadLibControlNotifications,

    latest:
        loadLatestStudentNotification,

    cleanup:
        keepOnlyLatestStudentNotification,

    checkFeeReminder:
        checkStudentFeeReminder,

    deleteFeeReminders:
        deleteStudentFeeReminders

};


console.log(
    "[LibControl Notification] Notification engine loaded successfully."
);
