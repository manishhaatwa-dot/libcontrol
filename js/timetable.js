/**
 * ==========================================================================
 * LIBMANAGE SAAS ECOSYSTEM ENGINE - OPERATIONS SUBCOLLECTION CLOUD MATRIX
 * ==========================================================================
 */

// Centralized Hook reference from shared instance models
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Session check validation gate
    if (sessionStorage.getItem('session_role') !== 'admin') {
        window.location.href = "../index.html";
        return;
    }

    // 2. Load async layout fragments components fetch channels templates styles
    await loadSaaSLayoutComponent('sidebar-container', '../components/sidebar.html', () => handleSidebarActivation());
    await loadSaaSLayoutComponent('navbar-container', '../components/navbar.html', () => bindNavbarInteractions());
    await loadSaaSLayoutComponent('footer-container', '../components/footer.html');

    initializeOperationsManagementModule();
});

let currentBranchTenantId = "";
let localizedTimetableMap = {};

function initializeOperationsManagementModule() {
    currentBranchTenantId = sessionStorage.getItem('session_library_id');

    // Bind layout elements form toggle buttons control event action listeners hooks
    bindOperationsFormToggleMechanics();

    // A. Realtime listener for unique branch shift batch timings subcollection doc on Firestore
    db.collection("saas_libraries")
      .doc(currentBranchTenantId)
      .collection("timetable")
      .doc("shift_config")
      .onSnapshot((docSnapshot) => {
          if (!docSnapshot.exists) {
              // Deploy default cloud fallback architecture if the config document does not exist yet
              const defaultHours = {
                  morning: "07:00 AM - 12:00 PM",
                  afternoon: "12:30 PM - 05:30 PM",
                  evening: "06:00 PM - 11:00 PM"
              };
              db.collection("saas_libraries")
                .doc(currentBranchTenantId)
                .collection("timetable")
                .doc("shift_config")
                .set(defaultHours);
              localizedTimetableMap = defaultHours;
          } else {
              localizedTimetableMap = docSnapshot.data();
          }
          renderTimetableSlotsDisplay();
      }, err => console.error("[Firestore Cloud Timetable Stream Fault]:", err));

    // B. Realtime listener for notices filtered strictly belonging to this library's subcollection
    db.collection("saas_libraries")
      .doc(currentBranchTenantId)
      .collection("notices")
      .orderBy("timestamp", "desc")
      .onSnapshot((snapshot) => {
          let noticesArray = [];
          snapshot.forEach(doc => {
              if (doc.id !== "anchor_node") {
                  let data = doc.data();
                  data.docId = doc.id; // Preserve firestore auto-generated reference key for deletions
                  noticesArray.push(data);
              }
          });
          renderNoticesDashboardBoard(noticesArray);
      }, err => console.error("[Firestore Cloud Notice Snapshot Stream Fault]:", err));

    // C. Realtime listener for holidays entries belonging directly to this library subcollection
    db.collection("saas_libraries")
      .doc(currentBranchTenantId)
      .collection("holidays")
      .onSnapshot((snapshot) => {
          let holidaysArray = [];
          snapshot.forEach(doc => {
              if (doc.id !== "anchor_node") {
                  let data = doc.data();
                  data.docId = doc.id;
                  holidaysArray.push(data);
              }
          });
          renderHolidaysDashboardBoard(holidaysArray);
      }, err => console.error("[Firestore Cloud Holidays Snapshot Stream Fault]:", err));
}

function bindOperationsFormToggleMechanics() {
    const btnEditTt = document.getElementById('edit-timetable-btn');
    const btnCancelTt = document.getElementById('cancel-timetable-btn');
    const formTt = document.getElementById('timetable-editor-form');

    const btnAddNotice = document.getElementById('add-notice-btn');
    const btnCancelNotice = document.getElementById('cancel-notice-btn');
    const formNotice = document.getElementById('notice-creator-form');

    const btnAddHoliday = document.getElementById('add-holiday-btn');
    const btnCancelHoliday = document.getElementById('cancel-holiday-btn');
    const formHoliday = document.getElementById('holiday-creator-form');

    if (btnEditTt && btnCancelTt && formTt) {
        btnEditTt.addEventListener('click', () => {
            document.getElementById('time-morning-slot').value = localizedTimetableMap.morning || "07:00 AM - 12:00 PM";
            document.getElementById('time-afternoon-slot').value = localizedTimetableMap.afternoon || "12:30 PM - 05:30 PM";
            document.getElementById('time-evening-slot').value = localizedTimetableMap.evening || "06:00 PM - 11:00 PM";
            document.getElementById('timetable-slots-view').classList.add('hide-element');
            formTt.classList.remove('hide-element');
        });
        btnCancelTt.addEventListener('click', () => {
            formTt.classList.add('hide-element');
            document.getElementById('timetable-slots-view').classList.remove('hide-element');
        });
        formTt.addEventListener('submit', commitTimetableSlotsUpdatesAction);
    }

    if (btnAddNotice && btnCancelNotice && formNotice) {
        btnAddNotice.addEventListener('click', () => {
            formNotice.reset();
            formNotice.classList.remove('hide-element');
            document.getElementById('notices-canvas-list').classList.add('hide-element');
        });
        btnCancelNotice.addEventListener('click', () => {
            formNotice.classList.add('hide-element');
            document.getElementById('notices-canvas-list').classList.remove('hide-element');
        });
        formNotice.addEventListener('submit', commitNoticePublishingAction);
    }

    if (btnAddHoliday && btnCancelHoliday && formHoliday) {
        btnAddHoliday.addEventListener('click', () => {
            formHoliday.reset();
            formHoliday.classList.remove('hide-element');
            document.getElementById('holidays-canvas-list').classList.add('hide-element');
        });
        btnCancelHoliday.addEventListener('click', () => {
            formHoliday.classList.add('hide-element');
            document.getElementById('holidays-canvas-list').classList.remove('hide-element');
        });
        formHoliday.addEventListener('submit', commitHolidayRegistrationAction);
    }
}

/**
 * ==========================================================================
 * RENDERING PLATFORMS RENDERING ENGINE DRAW PIPELINES
 * ==========================================================================
 */

function renderTimetableSlotsDisplay() {
    const wrapper = document.getElementById('timetable-slots-view');
    if (!wrapper) return;

    wrapper.innerHTML = `
        <div class="shift-schedule-block morning-hue">
            <span class="shift-meta-icon">??</span>
            <div class="shift-details-txt">
                <h4>Morning Batch Shift</h4>
                <p>${localizedTimetableMap.morning || "07:00 AM - 12:00 PM"}</p>
            </div>
        </div>
        <div class="shift-schedule-block afternoon-hue">
            <span class="shift-meta-icon">??</span>
            <div class="shift-details-txt">
                <h4>Afternoon Batch Shift</h4>
                <p>${localizedTimetableMap.afternoon || "12:30 PM - 05:30 PM"}</p>
            </div>
        </div>
        <div class="shift-schedule-block evening-hue">
            <span class="shift-meta-icon">??</span>
            <div class="shift-details-txt">
                <h4>Evening Batch Shift</h4>
                <p>${localizedTimetableMap.evening || "06:00 PM - 11:00 PM"}</p>
            </div>
        </div>
    `;
}

function renderNoticesDashboardBoard(noticesArray) {
    const canvas = document.getElementById('notices-canvas-list');
    if (!canvas) return;

    if (noticesArray.length === 0) {
        canvas.innerHTML = `<div class="empty-state-text">No active public bulletins logged under this library terminal.</div>`;
        return;
    }

    canvas.innerHTML = noticesArray.map((notice) => {
        let typeBadgeClass = "type-general";
        if (notice.type === "Holiday") typeBadgeClass = "type-holiday";
        if (notice.type === "Timing Changed") typeBadgeClass = "type-timing";
        if (notice.type === "Library Closed") typeBadgeClass = "type-closure";

        return `
            <div class="bulletin-card-unit">
                <span class="bulletin-badge-lbl ${typeBadgeClass}">${notice.type}</span>
                <p class="bulletin-desc-msg">${notice.message}</p>
                <div class="bulletin-footer-row">
                    <span class="bulletin-date-stamp">??? Posted: ${notice.dateStamp}</span>
                    <button class="btn-purge-ops" onclick="purgeNoticeRecordIndex('${notice.docId}')" title="Purge Announcement">???</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderHolidaysDashboardBoard(holidaysArray) {
    const canvas = document.getElementById('holidays-canvas-list');
    if (!canvas) return;

    if (holidaysArray.length === 0) {
        canvas.innerHTML = `<div class="empty-state-text">No upcoming calendar holidays registered onto your registry sheets.</div>`;
        return;
    }

    holidaysArray.sort((a, b) => new Date(a.calendarDate) - new Date(b.calendarDate));

    canvas.innerHTML = holidaysArray.map((holiday) => {
        return `
            <div class="bulletin-card-unit" style="border-left: 3px solid #ef4444;">
                <p class="bulletin-desc-msg" style="font-weight:700; color:var(--text-main);">${holiday.titleName}</p>
                <div class="bulletin-footer-row">