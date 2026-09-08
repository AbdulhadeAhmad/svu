export function createRulesPanel({ catalog, progress, i18n }) {
  const currentFaculty = catalog;
  const config = catalog.config;
  const grading = config.grading;
  const { localized } = i18n;
  const { hasProgress, earnedCredits } = progress;
  function renderAcademicRules() {
    const info = currentFaculty.additionalInfo;
    const ar = i18n.language === "ar";
    const list = document.getElementById("academicRulesList");
    list.replaceChildren();
    function row(label, value) {
      const li = document.createElement("li");
      li.textContent = `${label}: ${value}`;
      list.appendChild(li);
    }
    document.getElementById("academicRulesTitle").textContent = ar ? "القواعد" : "Rules";
    const registrationRule = info.prerequisite_registration_rules;
    const explanation = ar ? registrationRule.nameAr : `${registrationRule.default} ${registrationRule.english_levels}`;
    document.querySelector(".modal-hint").textContent = `${ar ? "الصق جدول الامتحانات والوظائف هنا." : "Paste your exam/assignments table here."} ${explanation}`;
    row(ar ? "الأسبقيات" : "Prerequisites", explanation);
    const limits = info.semester_registration_credits;
    row(ar ? "نقاط التسجيل في الفصل" : "Registration credits per term", `${limits.minimum}–${limits.maximum}`);
    row(ar ? "اللغة الإنجليزية" : "English credits", `${info.english_credit_accounting.registration_credits_per_level} ${ar ? "عند التسجيل" : "at registration"} / ${info.english_credit_accounting.earned_credits_per_passed_level} ${ar ? "بعد النجاح" : "earned after passing"}`);
    row(ar ? "نقاط الترفيع حسب السنة" : "Promotion credits by year", Object.entries(info.year_promotion_minimum_credits).map(([year, credits]) => `${year}: ${credits}`).join(" · "));
    if (info.specialization_selection.mandatory) row(ar ? "اختيار الاختصاص إلزامي عند" : "Specialization selection required at", info.specialization_selection.minimum_earned_credits);
    row(ar ? "العلامة الموزونة" : "Weighted grade", `${grading.assignmentWeight * 100}% ${ar ? "وظائف" : "assignment"} + ${grading.finalWeight * 100}% ${ar ? "امتحان نهائي" : "final"}`);
    row(ar ? "الحد الأدنى للنجاح" : "Pass threshold", grading.passThreshold);
    if (grading.minimumFinal != null) row(ar ? "الحد الأدنى للامتحان النهائي" : "Minimum final grade", grading.minimumFinal);
    if (grading.minimumAssignment != null) row(ar ? "الحد الأدنى للوظائف" : "Minimum assignment grade", grading.minimumAssignment);
    if (hasProgress()) {
      const earned = earnedCredits();
      row(ar ? "النقاط المكتسبة" : "Earned credits", `${earned} / ${currentFaculty.program.total_credits}`);
      const achieved = Object.entries(info.year_promotion_minimum_credits).filter(([, credits]) => earned >= credits);
      if (achieved.length) row(ar ? "سنة الترفيع" : "Eligible promotion year", achieved[achieved.length - 1][0]);
    }
    row(ar ? "ملاحظة المصدر" : "Source note", localized(config.rule_notes));
  }

  return { render: renderAcademicRules };
}
