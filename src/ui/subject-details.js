import { escapeHtml } from "./dom.js";

export function createSubjectDetails({ catalog, curriculum, progress, state, i18n, onNavigate, onToggleManual }) {
  const currentFaculty = catalog;
  const userProgress = state;
  const grading = catalog.config.grading;
  const { subjectsById, getDownstream } = curriculum;
  const { t, termName } = i18n;
  const { getNodeStatus, getAttempts, isPassed, isFailed, isInProgress } = progress;
  let selectedSubject = null;
  function selectSubject(id) {
    const s = subjectsById[id];
    if (!s) return;
    selectedSubject = id;
    document.getElementById("infoEmpty").hidden = true;
    const cat = currentFaculty.categories[s.category];
    const color = { fill: cat.color, stroke: cat.stroke };
    const catLabel = (cat.label && (cat.label[i18n.language] || cat.label.en)) || cat.label || "";
    const specList = s.specialization.length ? s.specialization.map(code => {
      const spec = currentFaculty.program.specializations.find(item => item.code === code);
      return i18n.language === "ar" ? spec.nameAr : spec.name;
    }).join(", ") : t("allSpecializations");
    const trackNames = currentFaculty.tracks.filter(track => s.tracks.includes(track.key))
      .map(track => `${track.code}: ${i18n.language === "ar" ? track.nameAr : track.name}`).join(" · ");

    const downstream = Array.from(getDownstream(id)).filter(d => d !== id);

    const status = getNodeStatus(id);
    const attempts = getAttempts(id);

    // Personal status banner
    let personalStatus = "";
    if (attempts.length > 0) {
      const latest = attempts[attempts.length - 1];
      const statusLabel = isPassed(id) ? t("statusPassed") :
                         isFailed(id) ? t("statusFailed") :
                         isInProgress(id) ? t("statusInProgress") : t("statusAttempted");
      const statusColor = isPassed(id) ? "#38a169" :
                          isFailed(id) ? "#e53e3e" :
                          isInProgress(id) ? "#d69e2e" : "#a0aec0";
      const gradeText = latest.weighted !== null
        ? `<strong>${latest.weighted.toFixed(2)}</strong>`
        : (latest.assignment !== null ? `A: ${latest.assignment.toFixed(2)}` :
           latest.final !== null ? `F: ${latest.final.toFixed(2)}` : "—");
      personalStatus = `
        <div class="info-section" style="margin-top:0;">
          <h3>${t("yourStatus")}</h3>
          <div class="status-banner ${isPassed(id) ? "passed" : isFailed(id) ? "failed" : isInProgress(id) ? "progress" : ""}">
            <span class="status-icon">${isPassed(id) ? "✓" : isFailed(id) ? "✗" : isInProgress(id) ? "⏳" : "•"}</span>
            <div style="flex:1;">
              <div class="status-text">${statusLabel}</div>
              <div class="status-detail">${i18n.language === "ar" ? "آخر" : "Latest"}: ${termName(latest.term)} · ${gradeText}</div>
            </div>
          </div>
        </div>
      `;

      // All attempts list
      const attemptsHtml = attempts.slice().reverse().map(a => {
        const aClass = a.passed ? "passed" : a.inProgress ? "progress" : "failed";
        const aLabel = a.passed ? t("statusPassed") : a.inProgress ? t("statusInProgress") : t("statusFailed");
        const aColor = a.passed ? "#38a169" : a.inProgress ? "#d69e2e" : "#e53e3e";
        const sourceBadge = a.source === "placement"
          ? `<span class="source-badge placement">${i18n.language === "ar" ? "تحديد مستوى" : "Placement"}</span>`
          : `<span class="source-badge course">${i18n.language === "ar" ? "مقرر" : "Course"}</span>`;
        // Placement attempts only have a "final" grade; show it accordingly
        const showAssignment = a.source !== "placement";
        const showFinal = true;
        const aAssign = !showAssignment ? "—"
                      : (a.assignment !== null ? a.assignment.toFixed(2) : "—");
        const aFinal = !showFinal ? "—"
                      : (a.final !== null ? a.final.toFixed(2) : "—");
        const aWeighted = a.weighted !== null ? a.weighted.toFixed(2) : "—";
        return `
          <div class="attempt-card ${aClass}">
            <div class="attempt-header">
              <span class="attempt-term">${termName(a.term)}</span>
              <span class="attempt-status" style="color:${aColor};">${aLabel}</span>
            </div>
            <div class="source-row">${sourceBadge}</div>
            <div class="attempt-grades">
              <div class="grade-row"><span class="grade-label">Assignment <span style="opacity:0.6;">(${Math.round(grading.assignmentWeight * 100)}%)</span></span><span class="grade-value ${a.assignment === null ? "missing" : ""}">${aAssign}</span></div>
              <div class="grade-row"><span class="grade-label">Final <span style="opacity:0.6;">(${Math.round(grading.finalWeight * 100)}%)</span></span><span class="grade-value ${a.final === null ? "missing" : ""}">${aFinal}</span></div>
              <div class="grade-row total"><span class="grade-label">Weighted</span><span class="grade-value ${a.weighted === null ? "missing" : ""}">${aWeighted}</span></div>
            </div>
          </div>
        `;
      }).join("");

      personalStatus += `
        <div class="info-section">
          <h3>${t("allAttempts")} (${attempts.length})</h3>
          <div class="attempt-list">${attemptsHtml}</div>
        </div>
      `;
    } else if (status === "available-next") {
      personalStatus = `
        <div class="info-section" style="margin-top:0;">
          <h3>${t("yourStatus")}</h3>
          <div class="status-banner passed" style="background:#f0fff4; color:#22543d;">
            <span class="status-icon">→</span>
            <div style="flex:1;">
              <div class="status-text">${t("availableNext")}</div>
              <div class="status-detail">${t("availableHint")}</div>
            </div>
          </div>
        </div>
      `;
    }

    const prereqChips = s.prereq.length
      ? s.prereq.map(p => {
          const st = getNodeStatus(p);
          const tick = st === "passed" ? ' <span style="color:#38a169">✓</span>'
                     : st === "failed" ? ' <span style="color:#e53e3e">✗</span>'
                     : st === "in-progress" ? ' <span style="color:#d69e2e">⏳</span>'
                     : st === "available-next" ? ' <span style="color:#3182ce">→</span>' : "";
          return `<span class="chip" data-id="${p}">${p}${tick}</span>`;
        }).join("")
      : `<span class="chip empty">${t("noPrereq")}</span>`;

    const downChips = downstream.length
      ? downstream.map(d => {
          const st = getNodeStatus(d);
          const tick = st === "passed" ? ' <span style="color:#38a169">✓</span>'
                     : st === "failed" ? ' <span style="color:#e53e3e">✗</span>'
                     : st === "in-progress" ? ' <span style="color:#d69e2e">⏳</span>'
                     : st === "available-next" ? ' <span style="color:#3182ce">→</span>' : "";
          return `<span class="chip" data-id="${d}">${d}${tick}</span>`;
        }).join("")
      : `<span class="chip empty">${t("noDownstream")}</span>`;

    const concurrent = s.concurrent
      ? `<span class="chip" data-id="${s.concurrent}">${s.concurrent} (concurrent)</span>`
      : "";

    const requirementText = s.minimum_earned_credits == null ? s.extra :
      `${i18n.language === "ar" ? "الحد الأدنى للنقاط المكتسبة" : "Minimum earned credits"}: ${s.minimum_earned_credits}`;
    const extra = requirementText ? `<div class="info-section"><h3>${t("additionalReq")}</h3><div class="info-desc">${escapeHtml(requirementText)}</div></div>` : "";

    const isManual = !!userProgress.manualPass[id];
    const manualBlock = `
      <div class="info-section manual-section">
        <h3>${t("manualOverride")}</h3>
        <div class="manual-row">
          <div class="manual-info">
            ${isManual
              ? `<div class="manual-state on">✓ ${t("manuallyMarked")}</div>
                 <div class="manual-hint">${t("manualHintOn")}</div>`
              : `<div class="manual-state off">${t("notManuallyMarked")}</div>
                 <div class="manual-hint">${t("manualHintOff")}</div>`}
          </div>
          <button class="manual-btn ${isManual ? "remove" : "add"}" id="manualPassBtn">
            ${isManual ? `↺ ${t("manualRemove")}` : `✓ ${t("manualAdd")}`}
          </button>
        </div>
      </div>
    `;

    const html = `
      <div class="info-head">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span class="info-code" style="background:${color.stroke}">${s.id}</span>
          <span class="meta-pill" style="background:${cat.color};color:#fff;">${catLabel}</span>
          <span class="meta-pill">${s.credits} ${t("credits")}</span>
          <span class="meta-pill">${t("level")} ${s.lvl}</span>
        </div>
        <div class="info-title">${i18n.language === "ar" && s.nameAr ? s.nameAr : s.name}</div>
        <div class="info-subtitle">${i18n.language === "ar" && s.nameAr ? s.name : (s.nameAr || "")}</div>
        <div class="info-meta">
          <span class="meta-pill">📚 ${specList}</span>
          ${s.concurrent ? `<span class="meta-pill">${t("concurrent2")}</span>` : ''}
          ${requirementText ? `<span class="meta-pill">${t("specialRule")}</span>` : ''}
        </div>
      </div>

      ${trackNames ? `<div class="info-section"><h3>${i18n.language === "ar" ? "المسارات" : "Tracks"}</h3><div class="info-desc">${escapeHtml(trackNames)}</div></div>` : ""}
      ${s.description ? `<div class="info-section"><div class="info-desc">${escapeHtml(s.description)}</div></div>` : ""}
      ${personalStatus}

      ${manualBlock}

      ${extra}

      <div class="info-section">
        <h3>${t("prerequisites")} (${s.prereq.length})</h3>
        <div class="chip-list">${prereqChips}</div>
      </div>

      ${concurrent ? `<div class="info-section">
        <h3>${t("concurrent")}</h3>
        <div class="chip-list">${concurrent}</div>
      </div>` : ""}

      <div class="info-section">
        <h3>${t("unlocks")} (${downstream.length})</h3>
        <div class="chip-list">${downChips}</div>
      </div>
    `;

    const detailEl = document.getElementById("detailSection");
    detailEl.innerHTML = html;
    detailEl.hidden = false;

    detailEl.querySelectorAll(".chip[data-id]").forEach(chip => {
      chip.addEventListener("click", () => {
        const targetId = chip.getAttribute("data-id");
        onNavigate(targetId);
      });
    });

    const manualBtn = document.getElementById("manualPassBtn");
    if (manualBtn) {
      manualBtn.addEventListener("click", () => {
        onToggleManual(id);
      });
    }
  }

  function refresh() { if (selectedSubject) selectSubject(selectedSubject); }

  return { select: selectSubject, refresh, get selectedId() { return selectedSubject; } };
}
