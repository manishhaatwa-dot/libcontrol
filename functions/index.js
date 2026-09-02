/**
 * ==========================================================================
 * LIBCONTROL - SECURE ADMIN CLOUD FUNCTIONS
 * ==========================================================================
 *
 * Master Manager
 *      ↓
 * Secure Cloud Function
 *      ↓
 * Firebase Authentication
 *      ↓
 * Firebase UID
 *      ↓
 * libcontrol_libraries/{libraryId}/admins/{UID}
 *
 * IMPORTANT:
 *
 * Passwords are NEVER stored in Firestore.
 *
 * CORS is explicitly enabled for Firebase Callable Functions
 * because LibControl frontend is hosted on GitHub Pages.
 *
 * ==========================================================================
 */

"use strict";


/* ==========================================================================
   1. FIREBASE FUNCTIONS
   ========================================================================== */

const {
    onCall,
    HttpsError
} = require(
    "firebase-functions/v2/https"
);


/* ==========================================================================
   2. FIREBASE ADMIN SDK
   ========================================================================== */

const {
    initializeApp
} = require(
    "firebase-admin/app"
);


const {
    getAuth
} = require(
    "firebase-admin/auth"
);


const {
    getFirestore,
    FieldValue
} = require(
    "firebase-admin/firestore"
);


/* ==========================================================================
   3. INITIALIZE FIREBASE ADMIN
   ========================================================================== */

initializeApp();


const adminAuth =
    getAuth();


const adminDB =
    getFirestore();


/* ==========================================================================
   4. COLLECTION NAMES
   ========================================================================== */

const COLLECTIONS = {

    MASTER_MANAGERS:
        "master_managers",

    LIBRARIES:
        "libcontrol_libraries"

};


/* ==========================================================================
   5. NORMALIZATION HELPERS
   ========================================================================== */

function normalizeLibraryId(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toUpperCase()
        .replace(
            /\s+/g,
            ""
        );

}


function normalizeEmail(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase();

}


/* ==========================================================================
   6. LIBRARY ID VALIDATION
   ==========================================================================
 *
 * Format:
 *
 *     LIB-XXXXXX
 *
 * Exactly 6 alphanumeric characters after LIB-
 *
 * Examples:
 *
 *     LIB-4DNL12
 *     LIB-A82K7P
 *     LIB-X9M4Q2
 *
 * ========================================================================== */

function isValidLibraryId(
    libraryId
) {

    return /^LIB-[A-Z0-9]{6}$/.test(
        libraryId
    );

}


/* ==========================================================================
   7. EMAIL VALIDATION
   ========================================================================== */

function isValidEmail(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );

}


/* ==========================================================================
   8. MASTER MANAGER AUTHORIZATION
   ========================================================================== */

async function verifyMasterManager(
    request
) {

    if (
        !request.auth ||
        !request.auth.uid
    ) {

        throw new HttpsError(
            "unauthenticated",
            "Master Manager authentication is required."
        );

    }


    const managerUID =
        request.auth.uid;


    const managerReference =
        adminDB
            .collection(
                COLLECTIONS.MASTER_MANAGERS
            )
            .doc(
                managerUID
            );


    const managerSnapshot =
        await managerReference.get();


    if (
        !managerSnapshot.exists
    ) {

        throw new HttpsError(
            "permission-denied",
            "Access denied. Master Manager account is not registered."
        );

    }


    const managerData =
        managerSnapshot.data() || {};


    if (
        managerData.role !==
        "master_manager"
    ) {

        throw new HttpsError(
            "permission-denied",
            "Access denied. Invalid Master Manager role."
        );

    }


    if (
        managerData.enabled ===
        false
    ) {

        throw new HttpsError(
            "permission-denied",
            "Master Manager account is disabled."
        );

    }


    return {

        uid:
            managerUID,

        email:
            request.auth.token.email ||
            managerData.email ||
            ""

    };

}


/* ==========================================================================
   9. CREATE ADMIN ACCOUNT
   ========================================================================== */

exports.createLibraryAdmin =
    onCall(
        {
            cors: true
        },
        async (request) => {

            /*
             * --------------------------------------------------------------
             * STEP 1
             * Verify Master Manager
             * --------------------------------------------------------------
             */

            const manager =
                await verifyMasterManager(
                    request
                );


            /*
             * --------------------------------------------------------------
             * STEP 2
             * Read request data
             * --------------------------------------------------------------
             */

            const data =
                request.data || {};


            const libraryId =
                normalizeLibraryId(
                    data.libraryId
                );


            const email =
                normalizeEmail(
                    data.email
                );


            const temporaryPassword =
                String(
                    data.temporaryPassword ||
                    ""
                );


            /*
             * --------------------------------------------------------------
             * STEP 3
             * Validate Library ID
             * --------------------------------------------------------------
             */

            if (
                !isValidLibraryId(
                    libraryId
                )
            ) {

                throw new HttpsError(
                    "invalid-argument",
                    "Invalid Library ID. Expected format: LIB-XXXXXX."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 4
             * Validate Email
             * --------------------------------------------------------------
             */

            if (
                !isValidEmail(
                    email
                )
            ) {

                throw new HttpsError(
                    "invalid-argument",
                    "A valid Admin Email is required."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 5
             * Validate Temporary Password
             * --------------------------------------------------------------
             */

            if (
                temporaryPassword.length <
                8
            ) {

                throw new HttpsError(
                    "invalid-argument",
                    "Temporary Password must contain at least 8 characters."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 6
             * Verify Library
             * --------------------------------------------------------------
             */

            const libraryReference =
                adminDB
                    .collection(
                        COLLECTIONS.LIBRARIES
                    )
                    .doc(
                        libraryId
                    );


            const librarySnapshot =
                await libraryReference.get();


            if (
                !librarySnapshot.exists
            ) {

                throw new HttpsError(
                    "not-found",
                    "Library not found."
                );

            }


            const libraryData =
                librarySnapshot.data() || {};


            /*
             * --------------------------------------------------------------
             * STEP 7
             * Verify Manager owns Library
             * --------------------------------------------------------------
             */

            if (
                libraryData.ownerManagerUID !==
                manager.uid
            ) {

                throw new HttpsError(
                    "permission-denied",
                    "You are not authorized to create an Admin for this Library."
                );

            }


            if (
                libraryData.enabled ===
                false
            ) {

                throw new HttpsError(
                    "failed-precondition",
                    "This Library is disabled."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 8
             * Create Firebase Authentication User
             * --------------------------------------------------------------
             */

            let createdUser =
                null;


            try {

                createdUser =
                    await adminAuth
                        .createUser({

                            email:
                                email,

                            password:
                                temporaryPassword,

                            emailVerified:
                                false,

                            disabled:
                                false

                        });

            }
            catch (error) {

                console.error(
                    "[LibControl] Firebase Admin user creation error:",
                    error
                );


                if (
                    error.code ===
                    "auth/email-already-exists"
                ) {

                    throw new HttpsError(
                        "already-exists",
                        "An Admin account with this email already exists."
                    );

                }


                if (
                    error.code ===
                    "auth/invalid-password"
                ) {

                    throw new HttpsError(
                        "invalid-argument",
                        "The temporary password does not meet Firebase requirements."
                    );

                }


                throw new HttpsError(
                    "internal",
                    "Unable to create Firebase Authentication account."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 9
             * Create Firestore Admin Record
             * --------------------------------------------------------------
             */

            try {

                const adminReference =
                    libraryReference
                        .collection(
                            "admins"
                        )
                        .doc(
                            createdUser.uid
                        );


                await adminReference.set({

                    uid:
                        createdUser.uid,

                    email:
                        email,

                    role:
                        "admin",

                    libraryId:
                        libraryId,

                    enabled:
                        true,

                    emailVerified:
                        false,

                    mustChangePassword:
                        true,

                    createdAt:
                        FieldValue
                            .serverTimestamp(),

                    updatedAt:
                        FieldValue
                            .serverTimestamp(),

                    createdByManagerUID:
                        manager.uid,

                    createdByManagerEmail:
                        manager.email || ""

                });

            }
            catch (error) {

                console.error(
                    "[LibControl] Admin Firestore record creation error:",
                    error
                );


                try {

                    await adminAuth
                        .deleteUser(
                            createdUser.uid
                        );

                }
                catch (rollbackError) {

                    console.error(
                        "[LibControl] Admin Auth rollback failed:",
                        rollbackError
                    );

                }


                throw new HttpsError(
                    "internal",
                    "Unable to initialize Admin account."
                );

            }


            console.log(
                "[LibControl] Admin account created:",
                {
                    uid:
                        createdUser.uid,

                    email:
                        email,

                    libraryId:
                        libraryId,

                    createdBy:
                        manager.uid
                }
            );


            return {

                success:
                    true,

                uid:
                    createdUser.uid,

                email:
                    email,

                libraryId:
                    libraryId,

                message:
                    "Admin account created successfully."

            };

        }
    );


/* ==========================================================================
   10. COMPLETE ADMIN PASSWORD CHANGE
   ========================================================================== */

exports.completeAdminPasswordChange =
    onCall(
        {
            cors: true
        },
        async (request) => {

            /*
             * --------------------------------------------------------------
             * STEP 1
             * Verify Firebase Authentication session
             * --------------------------------------------------------------
             */

            if (
                !request.auth ||
                !request.auth.uid
            ) {

                throw new HttpsError(
                    "unauthenticated",
                    "Admin authentication is required."
                );

            }


            const adminUID =
                request.auth.uid;


            /*
             * --------------------------------------------------------------
             * STEP 2
             * Read request data
             * --------------------------------------------------------------
             */

            const data =
                request.data || {};


            const libraryId =
                normalizeLibraryId(
                    data.libraryId
                );


            const newPassword =
                String(
                    data.newPassword ||
                    ""
                );


            /*
             * --------------------------------------------------------------
             * STEP 3
             * Validate Library ID
             * --------------------------------------------------------------
             */

            if (
                !isValidLibraryId(
                    libraryId
                )
            ) {

                throw new HttpsError(
                    "invalid-argument",
                    "Invalid Library ID."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 4
             * Validate Password
             * --------------------------------------------------------------
             */

            if (
                newPassword.length <
                8
            ) {

                throw new HttpsError(
                    "invalid-argument",
                    "New password must contain at least 8 characters."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 5
             * Get Library
             * --------------------------------------------------------------
             */

            const libraryReference =
                adminDB
                    .collection(
                        COLLECTIONS.LIBRARIES
                    )
                    .doc(
                        libraryId
                    );


            const librarySnapshot =
                await libraryReference.get();


            if (
                !librarySnapshot.exists
            ) {

                throw new HttpsError(
                    "not-found",
                    "Library not found."
                );

            }


            const libraryData =
                librarySnapshot.data() || {};


            if (
                libraryData.enabled ===
                false
            ) {

                throw new HttpsError(
                    "failed-precondition",
                    "This Library is disabled."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 6
             * Verify Admin Authorization
             * --------------------------------------------------------------
             */

            const adminReference =
                libraryReference
                    .collection(
                        "admins"
                    )
                    .doc(
                        adminUID
                    );


            const adminSnapshot =
                await adminReference.get();


            if (
                !adminSnapshot.exists
            ) {

                throw new HttpsError(
                    "permission-denied",
                    "Admin authorization record not found."
                );

            }


            const adminData =
                adminSnapshot.data() || {};


            if (
                adminData.uid &&
                adminData.uid !==
                adminUID
            ) {

                throw new HttpsError(
                    "permission-denied",
                    "Admin UID verification failed."
                );

            }


            if (
                adminData.role !==
                "admin"
            ) {

                throw new HttpsError(
                    "permission-denied",
                    "Invalid Admin role."
                );

            }


            if (
                adminData.libraryId &&
                normalizeLibraryId(
                    adminData.libraryId
                ) !==
                libraryId
            ) {

                throw new HttpsError(
                    "permission-denied",
                    "Admin is not authorized for this library."
                );

            }


            if (
                adminData.enabled ===
                false
            ) {

                throw new HttpsError(
                    "permission-denied",
                    "Admin account is disabled."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 7
             * Update Firebase Authentication Password
             * --------------------------------------------------------------
             */

            try {

                await adminAuth
                    .updateUser(
                        adminUID,
                        {
                            password:
                                newPassword
                        }
                    );

            }
            catch (error) {

                console.error(
                    "[LibControl] Admin password update error:",
                    error
                );


                if (
                    error.code ===
                    "auth/invalid-password"
                ) {

                    throw new HttpsError(
                        "invalid-argument",
                        "The new password does not meet Firebase requirements."
                    );

                }


                throw new HttpsError(
                    "internal",
                    "Unable to update Admin password."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 8
             * Complete First Login State
             * --------------------------------------------------------------
             */

            await adminReference.update({

                mustChangePassword:
                    false,

                updatedAt:
                    FieldValue
                        .serverTimestamp()

            });


            console.log(
                "[LibControl] Admin password changed:",
                {
                    uid:
                        adminUID,

                    libraryId:
                        libraryId
                }
            );


            return {

                success:
                    true,

                message:
                    "Admin password changed successfully."

            };

        }
    );


/* ==========================================================================
   11. CREATE STUDENT AUTHENTICATION ACCOUNT
   ========================================================================== */

exports.createLibraryStudent =
    onCall(
        {
            cors: true
        },
        async (request) => {

            /*
             * --------------------------------------------------------------
             * STEP 1
             * Verify Firebase Authentication
             * --------------------------------------------------------------
             */

            if (
                !request.auth ||
                !request.auth.uid
            ) {

                throw new HttpsError(
                    "unauthenticated",
                    "Admin authentication is required."
                );

            }


            const adminUID =
                request.auth.uid;


            /*
             * --------------------------------------------------------------
             * STEP 2
             * Read request data
             * --------------------------------------------------------------
             */

            const data =
                request.data || {};


            const libraryId =
                normalizeLibraryId(
                    data.libraryId
                );


            const studentCode =
                String(
                    data.studentCode ||
                    ""
                )
                    .trim()
                    .toUpperCase();


            const email =
                normalizeEmail(
                    data.email
                );


            const temporaryPassword =
                String(
                    data.temporaryPassword ||
                    ""
                );

// ============================================================
// STUDENT SELF ATTENDANCE - QR
// ============================================================

// ============================================================
// STUDENT SELF ATTENDANCE - QR
// ============================================================

exports.markStudentSelfAttendance = onCall(
  { cors: true },
  async (request) => {
    try {
      // --------------------------------------------------------
      // 1. Student must be logged in
      // --------------------------------------------------------
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "Student login required."
        );
      }

      const uid = request.auth.uid;
      const data = request.data || {};

      // --------------------------------------------------------
      // 2. Read request data
      // --------------------------------------------------------
      const libraryId = normalizeLibraryId(data.libraryId);
      const studentCode = String(
        data.studentCode || ""
      ).trim();

      const action = String(
        data.action || ""
      ).trim().toLowerCase();

      if (!libraryId) {
        throw new HttpsError(
          "invalid-argument",
          "Library ID is required."
        );
      }

      if (!studentCode) {
        throw new HttpsError(
          "invalid-argument",
          "Student code is required."
        );
      }

      if (
        action !== "checkin" &&
        action !== "checkout"
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Invalid attendance action."
        );
      }

      // --------------------------------------------------------
      // 3. Verify library
      // --------------------------------------------------------
      const libraryRef = adminDB
        .collection(COLLECTIONS.LIBRARIES)
        .doc(libraryId);

      const librarySnap = await libraryRef.get();

      if (!librarySnap.exists) {
        throw new HttpsError(
          "not-found",
          "Library not found."
        );
      }

      const libraryData =
        librarySnap.data() || {};

      if (libraryData.enabled === false) {
        throw new HttpsError(
          "failed-precondition",
          "This library is currently disabled."
        );
      }

      // --------------------------------------------------------
      // 4. Library Self Attendance must be ON
      // --------------------------------------------------------
      if (
        libraryData.studentSelfAttendanceEnabled !== true
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Student self attendance is currently disabled."
        );
      }

      // --------------------------------------------------------
      // 5. Get student record
      // --------------------------------------------------------
      const studentRef = libraryRef
        .collection("students")
        .doc(studentCode);

      const studentSnap =
        await studentRef.get();

      if (!studentSnap.exists) {
        throw new HttpsError(
          "not-found",
          "Student record not found."
        );
      }

      const studentData =
        studentSnap.data() || {};

      // --------------------------------------------------------
      // 6. Verify Firebase Auth UID
      // --------------------------------------------------------
      if (
        !studentData.uid ||
        studentData.uid !== uid
      ) {
        throw new HttpsError(
          "permission-denied",
          "Student account does not match this student record."
        );
      }

      // --------------------------------------------------------
      // 7. Today's date - India
      // --------------------------------------------------------
      const today =
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());

      // --------------------------------------------------------
      // 8. Same attendance document as existing attendance
      // --------------------------------------------------------
      const attendanceRef = libraryRef
        .collection("attendance")
        .doc(`${today}_${studentCode}`);

      // --------------------------------------------------------
      // 9. Handle check-in / check-out atomically
      // --------------------------------------------------------
      const result =
        await adminDB.runTransaction(
          async (transaction) => {
            const attendanceSnap =
              await transaction.get(
                attendanceRef
              );

            const now =
              FieldValue.serverTimestamp();

            // ==================================================
            // CHECK-IN
            // ==================================================
            if (action === "checkin") {
              // Already has an attendance record today.
              if (attendanceSnap.exists) {
                const existingData =
                  attendanceSnap.data() || {};

                // Never overwrite manual admin attendance.
                if (
                  existingData.attendanceSource !==
                  "student_qr"
                ) {
                  return {
                    success: false,
                    result: "admin_marked",
                  };
                }

                // Already checked in through QR.
                if (
                  existingData.checkInAt
                ) {
                  return {
                    success: false,
                    result: "already_checked_in",
                  };
                }

                return {
                  success: false,
                  result: "already_checked_in",
                };
              }

              const attendanceData = {
                studentCode:
                  studentCode,

                studentName:
                  studentData.name || "",

                seatNumber:
                  studentData.seatNumber || "",

                shift:
                  studentData.shift || "",

                date: today,

                status: "Present",

                libraryId:
                  libraryId,

                // QR attendance identification
                attendanceSource:
                  "student_qr",

                markedByUID:
                  uid,

                // Check-in timestamp
                checkInAt:
                  now,

                // Leave time is empty initially
                checkOutAt:
                  null,

                updatedAt:
                  now,
              };

              transaction.set(
                attendanceRef,
                attendanceData
              );

              return {
                success: true,
                result: "checked_in",
              };
            }

            // ==================================================
            // CHECK-OUT / LEAVE
            // ==================================================
            if (action === "checkout") {
              // No attendance record means student
              // has not checked in.
              if (!attendanceSnap.exists) {
                return {
                  success: false,
                  result: "not_checked_in",
                };
              }

              const existingData =
                attendanceSnap.data() || {};

              // Never modify an admin/manual record.
              if (
                existingData.attendanceSource !==
                "student_qr"
              ) {
                return {
                  success: false,
                  result: "admin_marked",
                };
              }

              // Student already left.
              if (
                existingData.checkOutAt
              ) {
                return {
                  success: false,
                  result: "already_checked_out",
                };
              }

              transaction.update(
                attendanceRef,
                {
                  checkOutAt:
                    now,

                  updatedAt:
                    now,

                  lastAction:
                    "checkout",
                }
              );

              return {
                success: true,
                result: "checked_out",
              };
            }

            return {
              success: false,
              result: "invalid_action",
            };
          }
        );

      // --------------------------------------------------------
      // 10. Response messages
      // --------------------------------------------------------
      switch (result.result) {
        case "checked_in":
          return {
            success: true,
            action: "checkin",
            message:
              "Self attendance check-in successful.",
          };

        case "checked_out":
          return {
            success: true,
            action: "checkout",
            message:
              "Leave time saved successfully.",
          };

        case "already_checked_in":
          return {
            success: false,
            alreadyCheckedIn: true,
            message:
              "Attendance is already checked in for today.",
          };

        case "already_checked_out":
          return {
            success: false,
            alreadyCheckedOut: true,
            message:
              "Leave time is already saved for today.",
          };

        case "not_checked_in":
          return {
            success: false,
            notCheckedIn: true,
            message:
              "Please check in first.",
          };

        case "admin_marked":
          return {
            success: false,
            adminMarked: true,
            message:
              "Today's attendance was already marked by admin.",
          };

        default:
          return {
            success: false,
            message:
              "Attendance action could not be completed.",
          };
      }

    } catch (error) {
      console.error(
        "markStudentSelfAttendance error:",
        error
      );

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Unable to process attendance."
      );
    }
  }
);

           
            /*
             * --------------------------------------------------------------
             * STEP 3
             * Validate Library ID
             * --------------------------------------------------------------
             */

            if (
                !isValidLibraryId(
                    libraryId
                )
            ) {

                throw new HttpsError(
                    "invalid-argument",
                    "Invalid Library ID."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 4
             * Validate Student Code
             * --------------------------------------------------------------
             */

            if (
                !/^STU\d{4,}$/.test(
                    studentCode
                )
            ) {

                throw new HttpsError(
                    "invalid-argument",
                    "Invalid Student Login Code."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 5
             * Validate Email
             * --------------------------------------------------------------
             */

            if (
                !isValidEmail(
                    email
                )
            ) {

                throw new HttpsError(
                    "invalid-argument",
                    "A valid Student Email is required."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 6
             * Validate Temporary Password
             * --------------------------------------------------------------
             */

            if (
                temporaryPassword.length <
                8
            ) {

                throw new HttpsError(
                    "invalid-argument",
                    "Temporary Password must contain at least 8 characters."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 7
             * Get Library
             * --------------------------------------------------------------
             */

            const libraryReference =
                adminDB
                    .collection(
                        COLLECTIONS.LIBRARIES
                    )
                    .doc(
                        libraryId
                    );


            const librarySnapshot =
                await libraryReference.get();


            if (
                !librarySnapshot.exists
            ) {

                throw new HttpsError(
                    "not-found",
                    "Library not found."
                );

            }


            const libraryData =
                librarySnapshot.data() || {};


            if (
                libraryData.enabled ===
                false
            ) {

                throw new HttpsError(
                    "failed-precondition",
                    "This Library is disabled."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 8
             * Verify Admin Authorization
             * --------------------------------------------------------------
             */

            const adminReference =
                libraryReference
                    .collection(
                        "admins"
                    )
                    .doc(
                        adminUID
                    );


            const adminSnapshot =
                await adminReference.get();


            if (
                !adminSnapshot.exists
            ) {

                throw new HttpsError(
                    "permission-denied",
                    "Admin authorization record not found."
                );

            }


            const adminData =
                adminSnapshot.data() || {};


            if (
                adminData.uid &&
                adminData.uid !==
                adminUID
            ) {

                throw new HttpsError(
                    "permission-denied",
                    "Admin UID verification failed."
                );

            }


            if (
                adminData.role !==
                "admin"
            ) {

                throw new HttpsError(
                    "permission-denied",
                    "Invalid Admin role."
                );

            }


            if (
                adminData.libraryId &&
                normalizeLibraryId(
                    adminData.libraryId
                ) !==
                libraryId
            ) {

                throw new HttpsError(
                    "permission-denied",
                    "Admin is not authorized for this library."
                );

            }


            if (
                adminData.enabled ===
                false
            ) {

                throw new HttpsError(
                    "permission-denied",
                    "Admin account is disabled."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 9
             * Verify Student Record
             * --------------------------------------------------------------
             */

            const studentReference =
                libraryReference
                    .collection(
                        "students"
                    )
                    .doc(
                        studentCode
                    );


            const studentSnapshot =
                await studentReference.get();


            if (
                !studentSnapshot.exists
            ) {

                throw new HttpsError(
                    "not-found",
                    "Student record not found."
                );

            }


            const studentData =
                studentSnapshot.data() || {};


            /*
             * Prevent replacing an existing
             * Firebase student account.
             */

            if (
                studentData.uid
            ) {

                throw new HttpsError(
                    "already-exists",
                    "This student already has a login account."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 10
             * Create Firebase Authentication Account
             * --------------------------------------------------------------
             */

            let createdUser =
                null;


            try {

                createdUser =
                    await adminAuth
                        .createUser({

                            email:
                                email,

                            password:
                                temporaryPassword,

                            emailVerified:
                                false,

                            disabled:
                                false

                        });

            }
            catch (error) {

                console.error(
                    "[LibControl] Firebase Student user creation error:",
                    error
                );


                if (
                    error.code ===
                    "auth/email-already-exists"
                ) {

                    throw new HttpsError(
                        "already-exists",
                        "A Firebase account with this email already exists."
                    );

                }


                if (
                    error.code ===
                    "auth/invalid-password"
                ) {

                    throw new HttpsError(
                        "invalid-argument",
                        "The temporary password does not meet Firebase requirements."
                    );

                }


                throw new HttpsError(
                    "internal",
                    "Unable to create Student Authentication account."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 11
             * Attach Firebase UID to Student Record
             * --------------------------------------------------------------
             */

            try {

                await studentReference.update({

                    uid:
                        createdUser.uid,

                    email:
                        email,

                    role:
                        "student",

                    libraryId:
                        libraryId,

                    emailVerified:
                        false,

                    mustChangePassword:
                        true,

                    authEnabled:
                        true,

                    updatedAt:
                        FieldValue
                            .serverTimestamp()

                });

            }
            catch (error) {

                console.error(
                    "[LibControl] Student Firestore update error:",
                    error
                );


                /*
                 * ROLLBACK AUTH USER
                 */

                try {

                    await adminAuth
                        .deleteUser(
                            createdUser.uid
                        );

                }
                catch (rollbackError) {

                    console.error(
                        "[LibControl] Student Auth rollback failed:",
                        rollbackError
                    );

                }


                throw new HttpsError(
                    "internal",
                    "Unable to initialize Student account."
                );

            }


            /*
             * --------------------------------------------------------------
             * STEP 12
             * Safe Response
             * --------------------------------------------------------------
             */

            console.log(
                "[LibControl] Student account created:",
                {
                    uid:
                        createdUser.uid,

                    email:
                        email,

                    libraryId:
                        libraryId,

                    studentCode:
                        studentCode,

                    createdBy:
                        adminUID
                }
            );


            return {

                success:
                    true,

                uid:
                    createdUser.uid,

                email:
                    email,

                libraryId:
                    libraryId,

                studentCode:
                    studentCode,

                message:
                    "Student account created successfully."

            };

        }
    );
