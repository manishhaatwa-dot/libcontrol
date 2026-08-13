(function () {
  "use strict";

  function showFatalError(message) {
    var alertBox = document.getElementById("seatAlert");
    if (alertBox) {
      alertBox.className = "seat-alert error show";
      alertBox.textContent = message;
    }
  }

  if (typeof window.firebase === "undefined" || !firebase.apps || !firebase.apps.length) {
    document.addEventListener("DOMContentLoaded", function () {
      showFatalError("Firebase SDK not loaded or initialized before seats.js.");
    });
    return;
  }

  var db = firebase.firestore();

  document.addEventListener("DOMContentLoaded", function () {
    var role = localStorage.getItem("session_role");
    var libraryId = localStorage.getItem("session_library_id");

    var elements = {
      seatAlert: document.getElementById("seatAlert"),

      btnConfigureCapacity: document.getElementById("btnConfigureCapacity"),

      totalCard: document.getElementById("totalCard"),
      totalSeatsLabel: document.getElementById("totalSeatsLabel"),
      totalSeatsValue: document.getElementById("totalSeatsValue"),
      totalSeatsSubtext: document.getElementById("totalSeatsSubtext"),
      capacityBadge: document.getElementById("capacityBadge"),

      availableCard: document.getElementById("availableCard"),
      availableToggleText: document.getElementById("availableToggleText"),
      availableSeatsValue: document.getElementById("availableSeatsValue"),
      availableSeatsSubtext: document.getElementById("availableSeatsSubtext"),
      availableCardContent: document.getElementById("availableCardContent"),
      availableDetailsWrap: document.getElementById("availableDetailsWrap"),

      occupiedCard: document.getElementById("occupiedCard"),
      occupiedToggleText: document.getElementById("occupiedToggleText"),
      occupiedSeatsValue: document.getElementById("occupiedSeatsValue"),
      occupiedSeatsSubtext: document.getElementById("occupiedSeatsSubtext"),
      occupiedCardContent: document.getElementById("occupiedCardContent"),
      occupiedDetailsWrap: document.getElementById("occupiedDetailsWrap"),

      seatSearchInput: document.getElementById("seatSearchInput"),

      capacityModal: document.getElementById("capacityModal"),
      closeCapacityModal: document.getElementById("closeCapacityModal"),
      cancelCapacityBtn: document.getElementById("cancelCapacityBtn"),
      capacityForm: document.getElementById("capacityForm"),
      totalCapacityInput: document.getElementById("totalCapacityInput"),
      morningCapacityInput: document.getElementById("morningCapacityInput"),
      afternoonCapacityInput: document.getElementById("afternoonCapacityInput"),
      eveningCapacityInput: document.getElementById("eveningCapacityInput"),
      saveCapacityBtn: document.getElementById("saveCapacityBtn"),

      studentModal: document.getElementById("studentModal"),
      closeStudentModal: document.getElementById("closeStudentModal"),
      closeStudentDetailsBtn: document.getElementById("closeStudentDetailsBtn"),
      modalSeatNumber: document.getElementById("modalSeatNumber"),
      modalStudentCode: document.getElementById("modalStudentCode"),
      modalStudentName: document.getElementById("modalStudentName"),
      modalFatherName: document.getElementById("modalFatherName"),
      modalStudentClass: document.getElementById("modalStudentClass"),
      modalStudentShift: document.getElementById("modalStudentShift"),
      modalStudentStatus: document.getElementById("modalStudentStatus"),
      modalJoiningDate: document.getElementById("modalJoiningDate"),
      modalExpiryDate: document.getElementById("modalExpiryDate")
    };

    if (!libraryId) {
      showAlert("Library session not found.", "error");
      disablePage();
      return;
    }

    if (role !== "admin") {
      showAlert("Only admin can access Seat Management.", "error");
      disablePage();
      hideAdminActions();
      return;
    }

    var state = {
      libraryId: libraryId,
      role: role,
      libraryCapacity: {
        totalCapacity: 0,
        morningCapacity: 0,
        afternoonCapacity: 0,
        eveningCapacity: 0
      },
      students: [],
      searchTerm: "",
      expandedCard: null,
      unsubscribers: []
    };

    var libraryRef = db.collection("saas_libraries").doc(libraryId);
    var studentsRef = libraryRef.collection("students");

    bindEvents();
    startRealtimeListeners();

    function bindEvents() {
      if (elements.availableCard) {
        elements.availableCard.addEventListener("click", function () {
          toggleCard("available");
        });
        elements.availableCard.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleCard("available");
          }
        });
      }

      if (elements.occupiedCard) {
        elements.occupiedCard.addEventListener("click", function () {
          toggleCard("occupied");
        });
        elements.occupiedCard.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleCard("occupied");
          }
        });
      }

      if (elements.seatSearchInput) {
        elements.seatSearchInput.addEventListener("input", function (event) {
          state.searchTerm = String(event.target.value || "").trim().toLowerCase();
          renderAll();
        });
      }

      if (elements.btnConfigureCapacity) {
        elements.btnConfigureCapacity.addEventListener("click", function () {
          openCapacityModal();
        });
      }

      if (elements.closeCapacityModal) {
        elements.closeCapacityModal.addEventListener("click", closeCapacityModal);
      }

      if (elements.cancelCapacityBtn) {
        elements.cancelCapacityBtn.addEventListener("click", closeCapacityModal);
      }

      if (elements.capacityModal) {
        elements.capacityModal.addEventListener("click", function (event) {
          if (event.target === elements.capacityModal) {
            closeCapacityModal();
          }
        });
      }

      if (elements.capacityForm) {
        elements.capacityForm.addEventListener("submit", saveCapacity);
      }

      if (elements.closeStudentModal) {
        elements.closeStudentModal.addEventListener("click", closeStudentModal);
      }

      if (elements.closeStudentDetailsBtn) {
        elements.closeStudentDetailsBtn.addEventListener("click", closeStudentModal);
      }

      if (elements.studentModal) {
        elements.studentModal.addEventListener("click", function (event) {
          if (event.target === elements.studentModal) {
            closeStudentModal();
          }
        });
      }

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          closeCapacityModal();
          closeStudentModal();
        }
      });
    }

    function startRealtimeListeners() {
      var unsubscribeLibrary = libraryRef.onSnapshot(function (docSnap) {
        var data = docSnap.exists ? (docSnap.data() || {}) : {};
        state.libraryCapacity = {
          totalCapacity: toNumber(data.totalCapacity),
          morningCapacity: toNumber(data.morningCapacity),
          afternoonCapacity: toNumber(data.afternoonCapacity),
          eveningCapacity: toNumber(data.eveningCapacity)
        };
        renderAll();
      }, function (error) {
        console.error("Library listener error:", error);
        showAlert("Failed to load capacity data.", "error");
      });

      var unsubscribeStudents = studentsRef.onSnapshot(function (snapshot) {
        var list = [];

        snapshot.forEach(function (doc) {
          var data = doc.data() || {};
          list.push({
            id: doc.id,
            studentCode: safeString(data.studentCode),
            seatNumber: safeString(data.seatNumber),
            name: safeString(data.name),
            fatherName: safeString(data.fatherName),
            studentClass: safeString(data.studentClass),
            shift: normalizeShift(data.shift),
            joiningDate: formatDateValue(data.joiningDate),
            expiryDate: formatDateValue(data.expiryDate),
            status: safeString(data.status)
          });
        });

        state.students = list;
        renderAll();
      }, function (error) {
        console.error("Students listener error:", error);
        showAlert("Failed to load students data.", "error");
      });

      state.unsubscribers.push(unsubscribeLibrary, unsubscribeStudents);

      window.addEventListener("beforeunload", function () {
        state.unsubscribers.forEach(function (unsubscribe) {
          if (typeof unsubscribe === "function") {
            unsubscribe();
          }
        });
      });
    }

    function renderAll() {
      var summary = buildSummary();
      renderTotalCard(summary);
      renderAvailableCard(summary);
      renderOccupiedCard(summary);
      updateCapacityButtonState();
    }

    function buildSummary() {
      var occupiedStudents = state.students.filter(isStudentOccupied);
      var filteredOccupiedStudents = occupiedStudents.filter(matchesSearch);

      var morningOccupied = occupiedStudents.filter(function (student) {
        return student.shift === "Morning";
      }).length;

      var afternoonOccupied = occupiedStudents.filter(function (student) {
        return student.shift === "Afternoon";
      }).length;

      var eveningOccupied = occupiedStudents.filter(function (student) {
        return student.shift === "Evening";
      }).length;

      var totalCapacity = toNumber(state.libraryCapacity.totalCapacity);
      var morningCapacity = toNumber(state.libraryCapacity.morningCapacity);
      var afternoonCapacity = toNumber(state.libraryCapacity.afternoonCapacity);
      var eveningCapacity = toNumber(state.libraryCapacity.eveningCapacity);

      return {
        capacities: {
          total: totalCapacity,
          morning: morningCapacity,
          afternoon: afternoonCapacity,
          evening: eveningCapacity
        },
        occupiedCount: occupiedStudents.length,
        availableCount: clampNumber(totalCapacity - occupiedStudents.length),
        morningOccupied: morningOccupied,
        afternoonOccupied: afternoonOccupied,
        eveningOccupied: eveningOccupied,
        morningAvailable: clampNumber(morningCapacity - morningOccupied),
        afternoonAvailable: clampNumber(afternoonCapacity - afternoonOccupied),
        eveningAvailable: clampNumber(eveningCapacity - eveningOccupied),
        occupiedStudents: occupiedStudents,
        filteredOccupiedStudents: filteredOccupiedStudents
      };
    }

    function renderTotalCard(summary) {
      if (elements.totalSeatsValue) {
        elements.totalSeatsValue.textContent = String(summary.capacities.total || 0);
      }

      var configured = hasAnyCapacityConfigured(summary.capacities);

      if (elements.capacityBadge) {
        elements.capacityBadge.classList.toggle("show", configured);
      }

      if (elements.totalSeatsSubtext) {
        if (configured) {
          elements.totalSeatsSubtext.textContent =
            "Morning " + summary.capacities.morning +
            " • Afternoon " + summary.capacities.afternoon +
            " • Evening " + summary.capacities.evening;
        } else {
          elements.totalSeatsSubtext.textContent = "Capacity not configured";
        }
      }
    }

    function renderAvailableCard(summary) {
      if (elements.availableSeatsValue) {
        elements.availableSeatsValue.textContent = String(summary.availableCount);
      }

      if (elements.availableSeatsSubtext) {
        elements.availableSeatsSubtext.textContent =
          "Morning " + summary.morningAvailable +
          " • Afternoon " + summary.afternoonAvailable +
          " • Evening " + summary.eveningAvailable;
      }

      if (elements.availableDetailsWrap) {
        elements.availableDetailsWrap.innerHTML =
          createShiftAvailabilityHtml("Morning", summary.capacities.morning, summary.morningOccupied, summary.morningAvailable) +
          createShiftAvailabilityHtml("Afternoon", summary.capacities.afternoon, summary.afternoonOccupied, summary.afternoonAvailable) +
          createShiftAvailabilityHtml("Evening", summary.capacities.evening, summary.eveningOccupied, summary.eveningAvailable);
      }
    }

    function renderOccupiedCard(summary) {
      if (elements.occupiedSeatsValue) {
        elements.occupiedSeatsValue.textContent = String(summary.occupiedCount);
      }

      if (elements.occupiedSeatsSubtext) {
        if (state.searchTerm) {
          elements.occupiedSeatsSubtext.textContent =
            summary.filteredOccupiedStudents.length + " matched occupied student(s)";
        } else {
          elements.occupiedSeatsSubtext.textContent = "Click to view occupied seat details";
        }
      }

      if (!elements.occupiedDetailsWrap) {
        return;
      }

      if (!summary.filteredOccupiedStudents.length) {
        elements.occupiedDetailsWrap.innerHTML = '<div class="seat-empty-state">' +
          (state.searchTerm ? "No occupied students matched your search." : "No occupied students found.") +
          "</div>";
        return;
      }

      elements.occupiedDetailsWrap.innerHTML = summary.filteredOccupiedStudents.map(function (student) {
        return [
          '<div class="student-item" data-student-id="', escapeHtml(student.id), '">',
            '<div class="student-item-row">',
              '<div>',
                '<div class="student-seat">Seat ', escapeHtml(student.seatNumber || "-"), '</div>',
                '<div class="student-meta">',
                  '<span><span class="seat-mini-label">Shift:</span><span class="seat-mini-value">', escapeHtml(student.shift || "-"), '</span></span>',
                  '<span><span class="seat-mini-label">Status:</span><span class="seat-mini-value">', escapeHtml(student.status || "-"), '</span></span>',
                '</div>',
              '</div>',
              '<div>',
                '<div class="student-name">', escapeHtml(student.name || "-"), '</div>',
                '<div class="student-code">', escapeHtml(student.studentCode || "-"), '</div>',
              '</div>',
            '</div>',
          '</div>'
        ].join("");
      }).join("");

      bindStudentItemClicks(summary.filteredOccupiedStudents);
    }

    function bindStudentItemClicks(studentList) {
      var items = elements.occupiedDetailsWrap.querySelectorAll(".student-item");
      Array.prototype.forEach.call(items, function (item) {
        item.addEventListener("click", function (event) {
          event.stopPropagation();
          var studentId = item.getAttribute("data-student-id");
          var student = findStudentById(studentList, studentId);
          if (student) {
            openStudentModal(student);
          }
        });
      });
    }

    function toggleCard(cardName) {
      var isAvailable = cardName === "available";
      var card = isAvailable ? elements.availableCard : elements.occupiedCard;
      var otherCard = isAvailable ? elements.occupiedCard : elements.availableCard;
      var toggleText = isAvailable ? elements.availableToggleText : elements.occupiedToggleText;
      var otherToggleText = isAvailable ? elements.occupiedToggleText : elements.availableToggleText;

      var isExpanded = card.classList.contains("expanded");

      if (otherCard) {
        otherCard.classList.remove("expanded");
        otherCard.setAttribute("aria-expanded", "false");
      }
      if (otherToggleText) {
        otherToggleText.textContent = "View Details";
      }

      if (isExpanded) {
        card.classList.remove("expanded");
        card.setAttribute("aria-expanded", "false");
        if (toggleText) {
          toggleText.textContent = "View Details";
        }
        state.expandedCard = null;
      } else {
        card.classList.add("expanded");
        card.setAttribute("aria-expanded", "true");
        if (toggleText) {
          toggleText.textContent = "Hide Details";
        }
        state.expandedCard = cardName;
      }
    }

    function openCapacityModal() {
      elements.totalCapacityInput.value = toNumber(state.libraryCapacity.totalCapacity) || "";
      elements.morningCapacityInput.value = toNumber(state.libraryCapacity.morningCapacity) || "";
      elements.afternoonCapacityInput.value = toNumber(state.libraryCapacity.afternoonCapacity) || "";
      elements.eveningCapacityInput.value = toNumber(state.libraryCapacity.eveningCapacity) || "";
      elements.capacityModal.classList.add("show");
      elements.capacityModal.setAttribute("aria-hidden", "false");
    }

    function closeCapacityModal() {
      elements.capacityModal.classList.remove("show");
      elements.capacityModal.setAttribute("aria-hidden", "true");
    }

    function openStudentModal(student) {
      elements.modalSeatNumber.textContent = student.seatNumber || "-";
      elements.modalStudentCode.textContent = student.studentCode || "-";
      elements.modalStudentName.textContent = student.name || "-";
      elements.modalFatherName.textContent = student.fatherName || "-";
      elements.modalStudentClass.textContent = student.studentClass || "-";
      elements.modalStudentShift.textContent = student.shift || "-";
      elements.modalStudentStatus.textContent = student.status || "-";
      elements.modalJoiningDate.textContent = student.joiningDate || "-";
      elements.modalExpiryDate.textContent = student.expiryDate || "-";
      elements.studentModal.classList.add("show");
      elements.studentModal.setAttribute("aria-hidden", "false");
    }

    function closeStudentModal() {
      elements.studentModal.classList.remove("show");
      elements.studentModal.setAttribute("aria-hidden", "true");
    }

    function saveCapacity(event) {
      event.preventDefault();

      var totalCapacity = toNumber(elements.totalCapacityInput.value);
      var morningCapacity = toNumber(elements.morningCapacityInput.value);
      var afternoonCapacity = toNumber(elements.afternoonCapacityInput.value);
      var eveningCapacity = toNumber(elements.eveningCapacityInput.value);

      if (totalCapacity < 0 || morningCapacity < 0 || afternoonCapacity < 0 || eveningCapacity < 0) {
        showAlert("Capacity values cannot be negative.", "error");
        return;
      }

      elements.saveCapacityBtn.disabled = true;
      elements.saveCapacityBtn.textContent = "Saving...";

      libraryRef.set({
        totalCapacity: totalCapacity,
        morningCapacity: morningCapacity,
        afternoonCapacity: afternoonCapacity,
        eveningCapacity: eveningCapacity,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).then(function () {
        showAlert("Capacity saved successfully.", "success");
        closeCapacityModal();
      }).catch(function (error) {
        console.error("Save capacity error:", error);
        showAlert("Failed to save capacity.", "error");
      }).finally(function () {
        elements.saveCapacityBtn.disabled = false;
        elements.saveCapacityBtn.textContent = "Save Capacity";
      });
    }

    function updateCapacityButtonState() {
      if (elements.btnConfigureCapacity) {
        elements.btnConfigureCapacity.disabled = state.role !== "admin";
      }
    }

    function disablePage() {
      if (elements.availableCard) {
        elements.availableCard.classList.remove("seat-card-clickable");
        elements.availableCard.setAttribute("tabindex", "-1");
      }
      if (elements.occupiedCard) {
        elements.occupiedCard.classList.remove("seat-card-clickable");
        elements.occupiedCard.setAttribute("tabindex", "-1");
      }
      if (elements.seatSearchInput) {
        elements.seatSearchInput.disabled = true;
      }
      if (elements.btnConfigureCapacity) {
        elements.btnConfigureCapacity.disabled = true;
      }
    }

    function hideAdminActions() {
      if (elements.btnConfigureCapacity) {
        elements.btnConfigureCapacity.classList.add("seat-hidden");
      }
    }

    function showAlert(message, type) {
      if (!elements.seatAlert) {
        return;
      }
      elements.seatAlert.className = "seat-alert show " + (type || "info");
      elements.seatAlert.textContent = message;
    }

    function isStudentOccupied(student) {
      return !!student.seatNumber;
    }

    function matchesSearch(student) {
      if (!state.searchTerm) {
        return true;
      }

      var haystack = [
        safeString(student.seatNumber),
        safeString(student.name),
        safeString(student.studentCode)
      ].join(" ").toLowerCase();

      return haystack.indexOf(state.searchTerm) !== -1;
    }

    function createShiftAvailabilityHtml(shiftName, capacity, occupied, available) {
      return [
        '<div class="shift-item">',
          '<div class="shift-item-row">',
            '<div>',
              '<div class="shift-name">', escapeHtml(shiftName), '</div>',
              '<div class="shift-meta">',
                '<span><span class="seat-mini-label">Capacity:</span><span class="seat-mini-value">', escapeHtml(String(capacity)), '</span></span>',
                '<span><span class="seat-mini-label">Occupied:</span><span class="seat-mini-value">', escapeHtml(String(occupied)), '</span></span>',
                '<span><span class="seat-mini-label">Available:</span><span class="seat-mini-value">', escapeHtml(String(available)), '</span></span>',
              '</div>',
            '</div>',
          '</div>',
        '</div>'
      ].join("");
    }

    function hasAnyCapacityConfigured(capacities) {
      return !!(capacities.total || capacities.morning || capacities.afternoon || capacities.evening);
    }

    function findStudentById(list, id) {
      for (var i = 0; i < list.length; i += 1) {
        if (list[i].id === id) {
          return list[i];
        }
      }
      return null;
    }

    function normalizeShift(value) {
      var text = safeString(value).toLowerCase();
      if (text === "morning") return "Morning";
      if (text === "afternoon") return "Afternoon";
      if (text === "evening") return "Evening";
      return safeString(value);
    }

    function formatDateValue(value) {
      if (!value) return "";
      if (typeof value === "string") return value;
      if (typeof value.toDate === "function") {
        var date = value.toDate();
        return formatDate(date);
      }
      if (value instanceof Date) {
        return formatDate(value);
      }
      return String(value);
    }

    function formatDate(date) {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "";
      }
      var day = String(date.getDate()).padStart(2, "0");
      var month = String(date.getMonth() + 1).padStart(2, "0");
      var year = date.getFullYear();
      return day + "-" + month + "-" + year;
    }

    function toNumber(value) {
      var num = Number(value);
      return isNaN(num) || num < 0 ? 0 : num;
    }

    function clampNumber(value) {
      value = Number(value) || 0;
      return value < 0 ? 0 : value;
    }

    function safeString(value) {
      return value === null || value === undefined ? "" : String(value);
    }

    function escapeHtml(value) {
      return safeString(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
  });
})();
