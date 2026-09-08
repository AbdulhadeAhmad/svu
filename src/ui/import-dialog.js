export function createImportDialog({ state, i18n, parseExamHistory, passedAttempt, hasProgress, computeAvailableFor, onApply, onClear }) {
  const userProgress = state;
  const { t } = i18n;
  let lastParsed = null;
  const importModal = document.getElementById("importModal");
  const guideVideo = document.getElementById("importGuideVideo");
  const importBtn = document.getElementById("importBtn");
  const examTextarea = document.getElementById("examTextarea");
  const parseResult = document.getElementById("parseResult");
  const parseSummary = document.getElementById("parseSummary");
  const modalParseBtn = document.getElementById("modalParseBtn");
  const modalApplyBtn = document.getElementById("modalApplyBtn");
  const modalCancelBtn = document.getElementById("modalCancelBtn");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalClearBtn = document.getElementById("modalClearBtn");

  function openImportModal() {
    examTextarea.value = userProgress.rawText || "";
    parseResult.hidden = true;
    modalApplyBtn.hidden = true;
    modalClearBtn.hidden = !hasProgress();
    importModal.hidden = false;
    guideVideo.muted = true;
    guideVideo.currentTime = 0;
    // Start only when the dialog opens; native controls remain if playback is blocked.
    guideVideo.play().catch(() => {});
    setTimeout(() => examTextarea.focus({ preventScroll: true }), 50);
  }
  function closeImportModal() {
    guideVideo.pause();
    importModal.hidden = true;
  }

  function runParse() {
    const text = examTextarea.value.trim();
    if (!text) {
      parseSummary.innerHTML = `<div class="parse-message error">Please paste the table first.</div>`;
      parseResult.hidden = false;
      modalApplyBtn.hidden = true;
      return;
    }
    lastParsed = parseExamHistory(text);
    const { byCourse, matchedIds, unmatched, passed, failed, inProgress } = lastParsed;
    const total = matchedIds.length;

    if (total === 0) {
      parseSummary.innerHTML = `
        <div class="parse-message error">
          <strong>No course attempts found.</strong>
          ${i18n.language === "ar" ? "الصق جدول الامتحانات الكامل باستخدام رموز المقررات المعروفة." : "Paste the complete exam table using recognized course codes."}
        </div>
      `;
      modalApplyBtn.hidden = true;
    } else {
      const availableCount = computeAvailableFor(byCourse);
      // Average one completed attempt per course using the configured completion policy.
      let graded = 0, totalWeighted = 0;
      Object.values(byCourse).forEach(list => {
        const passed = passedAttempt(list);
        if (passed && passed.weighted !== null) {
          graded++;
          totalWeighted += passed.weighted;
        }
      });
      const avg = graded > 0 ? (totalWeighted / graded).toFixed(2) : "—";

      const unmatchedHtml = unmatched.length
        ? `<div class="unmatched-box">
             <strong>${unmatched.length}</strong> unrecognized code${unmatched.length > 1 ? "s" : ""}:
             <div class="unmatched-list">${unmatched.slice(0, 10).map(u => `<span class="unmatched-chip">${u}</span>`).join("")}${unmatched.length > 10 ? `<span class="unmatched-more">+${unmatched.length - 10} more</span>` : ""}</div>
           </div>`
        : "";

      parseSummary.innerHTML = `
        <div class="parse-summary-grid">
          <div class="stat-row total">
            <div class="stat-icon">📋</div>
            <span class="stat-label">Courses detected</span>
            <span class="stat-value">${total}</span>
          </div>
          <div class="stat-row passed">
            <div class="stat-icon">✓</div>
            <span class="stat-label">Passed</span>
            <span class="stat-value">${passed}</span>
          </div>
          <div class="stat-row failed">
            <div class="stat-icon">✗</div>
            <span class="stat-label">Failed</span>
            <span class="stat-value">${failed}</span>
          </div>
          <div class="stat-row progress">
            <div class="stat-icon">⏳</div>
            <span class="stat-label">In progress</span>
            <span class="stat-value">${inProgress}</span>
          </div>
          <div class="stat-row available">
            <div class="stat-icon">→</div>
            <span class="stat-label">Available next term</span>
            <span class="stat-value">${availableCount}</span>
          </div>
        </div>
        <div class="avg-grade">
          <span class="avg-label">Average weighted grade</span>
          <span class="avg-value">${avg}</span>
          <span class="avg-count">across ${graded} passed subject${graded === 1 ? "" : "s"}</span>
        </div>
        ${unmatchedHtml}
      `;
      modalApplyBtn.hidden = false;
    }
    parseResult.hidden = false;
  }

  function applyImport() {
    if (!lastParsed) return;
    onApply(lastParsed, examTextarea.value);
    closeImportModal();
  }

  function clearImportedData() {
    if (!confirm("Clear all imported data? This will remove your grades and progress.")) return;
    lastParsed = null;
    onClear();
    closeImportModal();
  }

  function refreshImportButton() {
    if (userProgress.parsed) {
      importBtn.classList.add("has-data");
      importBtn.innerHTML = `<span class="icon">↻</span> ${t("reimportBtn")}`;
    } else {
      importBtn.classList.remove("has-data");
      importBtn.innerHTML = `<span class="icon">↓</span> ${t("importBtn")}`;
    }
  }

  importBtn.addEventListener("click", openImportModal);
  document.getElementById("emptyImportBtn").addEventListener("click", openImportModal);
  modalCloseBtn.addEventListener("click", closeImportModal);
  modalCancelBtn.addEventListener("click", closeImportModal);
  modalParseBtn.addEventListener("click", runParse);
  modalApplyBtn.addEventListener("click", applyImport);
  modalClearBtn.addEventListener("click", clearImportedData);
  importModal.addEventListener("click", e => {
    if (e.target === importModal) closeImportModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !importModal.hidden) closeImportModal();
  });

  return { refresh: refreshImportButton };
}
