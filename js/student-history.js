/**
 * ==========================================================================
 * LIBCONTROL - STUDENT HISTORY MODULE
 * ==========================================================================
 *
 * Handles:
 * - Archiving a student before removal
 * - Preserving complete student history
 * - Library-wise Firestore isolation
 *
 * IMPORTANT:
 * - Existing active student data is NOT modified here.
 * - This module only provides the archive operation.
 * - Authentication account is NOT deleted here.
 * - Existing LibControl database structure remains untouched.
 * ==========================================================================
 */

"use strict";


/* ==========================================================================
   1. ARCHIVE STUDENT
   ========================================================================== */

async function archiveStudentToHistory(
    libraryId,
    studentCode
) {

    const session =
        typeof getCurrentSession === "function"
            ? getCurrentSession()
            : null;


    /*
     * --------------------------------------------------------------
     * ADMIN SESSION CHECK
     * --------------------------------------------------------------
     */

    if (
        !session ||
        session.role !== "admin" ||
        !session.libraryId
    ) {

        throw new Error(
            "Admin session is required."
        );

    }


    /*
     * --------------------------------------------------------------
     * LIBRARY ID
     * --------------------------------------------------------------
     */

    const normalizedLibraryId =
        typeof normalizeLibraryId === "function"
            ? normalizeLibraryId(libraryId)
            : String(
                libraryId || ""
            )
                .trim()
                .toUpperCase()
                .replace(
                    /\s+/g,
                    ""
                );


    if (
        !normalizedLibraryId ||
        normalizedLibraryId !==
            String(
                session.libraryId
            )
                .trim()
                .toUpperCase()
                .replace(
                    /\s+/g,
                    ""
                )
    ) {

        throw new Error(
            "Invalid library access."
        );

    }


    /*
     * --------------------------------------------------------------
     * STUDENT CODE
     * --------------------------------------------------------------
     */

    const normalizedStudentCode =
        typeof normalizeStudentCode === "function"
            ? normalizeStudentCode(studentCode)
            : String(
                studentCode || ""
            )
                .trim()
                .toUpperCase()
                .replace(
                    /\s+/g,
                    ""
                );


    if (!normalizedStudentCode) {

        throw new Error(
            "Invalid Student Code."
        );

    }


    /*
     * --------------------------------------------------------------
     * DATABASE CHECK
     * --------------------------------------------------------------
     */

    if (
        !window.LibManageDB ||
        typeof window.LibManageDB.student !==
            "function"
    ) {

        throw new Error(
            "Student database service is unavailable."
        );

    }


    /*
     * --------------------------------------------------------------
     * ACTIVE STUDENT REFERENCE
     * --------------------------------------------------------------
     */

    const activeStudentRef =
        window.LibManageDB.student(
            normalizedLibraryId,
            normalizedStudentCode
        );


    /*
     * --------------------------------------------------------------
     * HISTORY COLLECTION
     *
     * libcontrol_libraries/{libraryId}
     *     └── students_history
     * --------------------------------------------------------------
     */

    const historyCollection =
        window.db
            .collection(
                "libcontrol_libraries"
            )
            .doc(
                normalizedLibraryId
            )
            .collection(
                "students_history"
            );


    /*
     * --------------------------------------------------------------
     * READ ACTIVE STUDENT
     * --------------------------------------------------------------
     */

    const activeStudentSnapshot =
        await activeStudentRef.get();


    if (
        !activeStudentSnapshot.exists
    ) {

        throw new Error(
            "Student record no longer exists."
        );

    }


    const studentData =
        activeStudentSnapshot.data() || {};


    /*
     * --------------------------------------------------------------
     * CREATE HISTORY DOCUMENT
     *
     * Auto-generated ID is intentionally used.
     *
     * This allows the same Student Code to appear
     * in history multiple times in the future if required.
     * --------------------------------------------------------------
     */

    const historyRef =
        historyCollection.doc();


    /*
     * --------------------------------------------------------------
     * HISTORY DATA
     * --------------------------------------------------------------
     */

    const historyData = {

        /*
         * Original student information.
         */

        ...studentData,


        /*
         * History identification.
         */

        originalStudentCode:
            normalizedStudentCode,

        historyRecordId:
            historyRef.id,


        /*
         * Current active document ID.
         */

        originalFirestoreId:
            activeStudentSnapshot.id,


        /*
         * History status.
         */

        historyStatus:
            "Left",


        /*
         * When student was archived.
         */

        leftAt:
            firebase.firestore
                .FieldValue
                .serverTimestamp(),


        archivedAt:
            firebase.firestore
                .FieldValue
                .serverTimestamp(),


        /*
         * Admin who performed the operation.
         */

        archivedBy:
            session.adminUID ||
            "",


        archivedByEmail:
            session.adminEmail ||
            "",


        /*
         * Library isolation.
         */

        libraryId:
            normalizedLibraryId

    };


    /*
     * --------------------------------------------------------------
     * ATOMIC FIRESTORE BATCH
     *
     * Both operations succeed together:
     *
     * 1. Save student into history
     * 2. Remove active student
     *
     * If the batch fails, the active student remains untouched.
     * --------------------------------------------------------------
     */
   
const batch =
    window.db.batch();


batch.set(
    historyRef,
    historyData
);


await batch.commit();

    /*
     * --------------------------------------------------------------
     * SUCCESS RESPONSE
     * --------------------------------------------------------------
     */

    return {

        success:
            true,

        historyId:
            historyRef.id,

        studentCode:
            normalizedStudentCode

    };

}


/* ==========================================================================
   2. GLOBAL API
   ========================================================================== */

window.LibControlStudentHistory = {

    archive:
        archiveStudentToHistory

};


/* ==========================================================================
   3. MODULE STATUS
   ========================================================================== */

console.log(
    "[LibControl] Student History module loaded successfully."
);
