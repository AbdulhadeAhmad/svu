// ===== Subject catalog =====
// Each subject has:
//   id       – course code
//   name     – English name
//   nameAr   – Arabic name
//   cat      – category: "general" | "basic" | "SE" | "AI" | "SCN"
//   spec     – array of specializations it belongs to (empty = all)
//   prereq   – array of prerequisite course ids
//   concurrent (optional) – must be taken in the same semester
//   extra     (optional) – additional non-course requirement
const subjectsData = [
  // General
  { id: "GCS301", name: "Computer Skills - ICDL", nameAr: "مهارات الحاسوب", cat: "general", spec: [], prereq: [] },
  { id: "GOE301", name: "Introduction to On-Line Education", nameAr: "مدخل إلى التعلم الإلكتروني", cat: "general", spec: [], prereq: [] },
  { id: "GTW301", name: "Communications Skills and Technical Writing", nameAr: "مهارات التواصل والكتابة العلمية", cat: "general", spec: [], prereq: ["GCS301"] },
  { id: "GEN301", name: "English Language I", nameAr: "اللغة الإنكليزية (1)", cat: "general", spec: [], prereq: [] },
  { id: "GEN401", name: "English Language II", nameAr: "اللغة الإنكليزية (2)", cat: "general", spec: [], prereq: ["GEN301"] },
  { id: "GMN401", name: "Fundamentals of Management", nameAr: "أساسيات الإدارة", cat: "general", spec: [], prereq: ["BNA401"] },
  { id: "GEN501", name: "English Language III", nameAr: "اللغة الإنكليزية (3)", cat: "general", spec: [], prereq: ["GEN401"] },
  { id: "GEN502", name: "English Language IV", nameAr: "اللغة الإنكليزية (4)", cat: "general", spec: [], prereq: ["GEN501"] },
  { id: "GAC501", name: "Accounting", nameAr: "المحاسبة", cat: "general", spec: [], prereq: ["GMN401"] },
  { id: "GPM601", name: "IT Project Management", nameAr: "إدارة المشاريع المعلوماتية", cat: "general", spec: [], prereq: ["BSE501"] },
  { id: "GEN601", name: "English Language V", nameAr: "اللغة الإنكليزية (5)", cat: "general", spec: [], prereq: ["GEN502"] },
  { id: "GET601", name: "Ethics of Profession & Society", nameAr: "أخلاقيات المهنة والمجتمع", cat: "general", spec: [], prereq: ["GPM601"] },
  { id: "GEP601", name: "Epistemology & Computer Science", nameAr: "نظرية المعرفة وعلوم الحاسوب", cat: "general", spec: [], prereq: ["GET601"] },

  // Basic
  { id: "BPH401", name: "Physics", nameAr: "الفيزياء", cat: "basic", spec: [], prereq: [] },
  { id: "BMA401", name: "Mathematical Analysis I", nameAr: "التحليل الرياضي (1)", cat: "basic", spec: [], prereq: [] },
  { id: "BAS401", name: "Algebraic Structures", nameAr: "بُنى جبرية", cat: "basic", spec: [], prereq: [] },
  { id: "BMA402", name: "Mathematical Analysis II", nameAr: "التحليل الرياضي (2)", cat: "basic", spec: [], prereq: ["BMA401"] },
  { id: "BLA401", name: "Linear Algebra", nameAr: "الجبر الخطي", cat: "basic", spec: [], prereq: ["BMA401"] },
  { id: "BNA401", name: "Numerical Analysis", nameAr: "تحليل عددي", cat: "basic", spec: [], prereq: ["BLA401", "BMA402"] },
  { id: "BEC401", name: "Electronic Circuits", nameAr: "الدارات الإلكترونية", cat: "basic", spec: [], prereq: ["BPH401"] },
  { id: "BLC401", name: "Logical Circuits", nameAr: "الدارات المنطقية", cat: "basic", spec: [], prereq: ["BAS401"] },
  { id: "BPG401", name: "Programming I", nameAr: "برمجة (1)", cat: "basic", spec: [], prereq: [] },
  { id: "BPG402", name: "Programming II", nameAr: "برمجة (2)", cat: "basic", spec: [], prereq: ["BPG401"] },
  { id: "BWP401", name: "Web Programming I", nameAr: "برمجة الويب (1)", cat: "basic", spec: [], prereq: ["BPG402"] },
  { id: "BSP501", name: "Signal Processing", nameAr: "معالجة إشارة", cat: "basic", spec: [], prereq: ["BMA402"] },
  { id: "BDM501", name: "Discrete Mathematics", nameAr: "الرياضيات المتقطعة", cat: "basic", spec: [], prereq: ["BLC401"] },
  { id: "BDA501", name: "Data Structures & Algorithms I", nameAr: "بني المعطيات والخوارزميات (1)", cat: "basic", spec: [], prereq: ["BPG402"] },
  { id: "BDB501", name: "Database Systems I", nameAr: "نظم قواعد البيانات (1)", cat: "basic", spec: [], prereq: ["BDA501"] },
  { id: "BDBL501", name: "Database Systems Lab I", nameAr: "مخبر نظم قواعد البيانات (1)", cat: "basic", spec: [], prereq: ["BDB501"], concurrent: "BDB501" },
  { id: "BCA501", name: "Computer Architecture I", nameAr: "بنيان الحاسوب (1)", cat: "basic", spec: [], prereq: ["BLC401"] },
  { id: "BOS501", name: "Operating Systems I", nameAr: "نظم التشغيل (1)", cat: "basic", spec: [], prereq: ["BCA501", "BPG402"] },
  { id: "BOSL501", name: "Operating Systems Lab I", nameAr: "مخبر نظم التشغيل (1)", cat: "basic", spec: [], prereq: ["BOS501"], concurrent: "BOS501" },
  { id: "BTS501", name: "Telecommunication Systems", nameAr: "نظم الاتصالات", cat: "basic", spec: [], prereq: ["BLC401", "BMA402"] },
  { id: "BWP501", name: "Web Programming II", nameAr: "برمجة الويب (2)", cat: "basic", spec: [], prereq: ["BWP401"] },
  { id: "BAU501", name: "Automata & Formal Languages", nameAr: "أوتوماتات ولغات صورية", cat: "basic", spec: [], prereq: ["BDM501", "BDA501"] },
  { id: "BNT501", name: "Computer Networks I", nameAr: "الشبكات الحاسوبية (1)", cat: "basic", spec: [], prereq: ["BTS501"] },
  { id: "BAI501", name: "Artificial Intelligence", nameAr: "الذكاء الصنعي", cat: "basic", spec: [], prereq: ["BDA501"] },
  { id: "BPG601", name: "Programming III", nameAr: "برمجة (3)", cat: "basic", spec: [], prereq: ["BPG402"] },
  { id: "BCM601", name: "Compilers", nameAr: "المترجمات", cat: "basic", spec: [], prereq: ["BAU501"] },
  { id: "BPS601", name: "Probability & Statistics", nameAr: "الاحتمالات والإحصاء", cat: "basic", spec: [], prereq: ["BDM501", "BMA402"] },
  { id: "BPR601", name: "Project I", nameAr: "مشروع (1)", cat: "basic", spec: [], prereq: ["BIS601"], extra: "≥ 180 credits" },
  { id: "BSE601", name: "Software Engineering I", nameAr: "هندسة البرمجيات (1)", cat: "basic", spec: [], prereq: ["BPG601"] },
  { id: "BID601", name: "Information Systems Analysis and Design", nameAr: "تحليل وتصميم نظم المعلومات", cat: "basic", spec: [], prereq: ["BDB501"] },
  { id: "BIS601", name: "Information System Security", nameAr: "أمن نظم المعلومات", cat: "basic", spec: [], prereq: ["BOS501", "BDB501", "BNT501", "GET601"] },
  { id: "BCG601", name: "Computer Graphics", nameAr: "البيانيات", cat: "basic", spec: [], prereq: ["BSP501", "BDA501"] },
  { id: "BMM601", name: "Multimedia Systems", nameAr: "نظم الوسائط المتعددة", cat: "basic", spec: [], prereq: ["BCG601", "BNT501"] },
  { id: "BMP601", name: "Mobile Applications Programming", nameAr: "برمجة تطبيقات النقال", cat: "basic", spec: [], prereq: ["BWP501"] },
  { id: "BIA601", name: "Intelligent Algorithms", nameAr: "الخوارزميات الذكية", cat: "basic", spec: [], prereq: ["BAI501"] },
  { id: "BPR602", name: "Project II", nameAr: "مشروع (2)", cat: "basic", spec: [], prereq: ["BPR601"], extra: "≥ 240 credits" },
  { id: "BSM601", name: "Simulation, Modelling and Verification", nameAr: "النمذجة والمحاكاة والتحقق", cat: "basic", spec: [], prereq: ["BPG601", "BPS601", "BPR601"] },

  // Software Engineering (SE)
  { id: "SSE602", name: "Software Engineering II (in English)", nameAr: "هندسة البرمجيات (2) (باللغة الإنكليزية)", cat: "SE", spec: ["SE"], prereq: ["GPM601", "GEN601"] },
  { id: "SDA601", name: "Data Structures & Algorithms II", nameAr: "بني المعطيات والخوارزميات (2)", cat: "SE", spec: ["SE"], prereq: ["BDA501", "BIA601"] },
  { id: "SAD601", name: "Algorithm Analysis & Design", nameAr: "تحليل وتصميم الخوارزميات", cat: "SE", spec: ["SE"], prereq: ["SDA601"] },
  { id: "SDB601", name: "Database Systems II", nameAr: "نظم قواعد البيانات (2)", cat: "SE", spec: ["SE"], prereq: ["BDB501", "BIA601"] },
  { id: "SDBL601", name: "Database Systems Lab II", nameAr: "مخبر نظم قواعد البيانات (2)", cat: "SE", spec: ["SE"], prereq: ["SDB601"], concurrent: "SDB601" },
  { id: "SDE601", name: "Data Mining", nameAr: "التنقيب في البيانات", cat: "SE", spec: ["SE"], prereq: ["BPS601", "BID601", "SSE602"] },
  { id: "SCP601", name: "Compiler Project", nameAr: "مشروع مترجمات", cat: "SE", spec: ["SE"], prereq: ["BCM601", "SSE602"] },
  { id: "SIR601", name: "Information Retrieval", nameAr: "استرجاع المعلومات", cat: "SE", spec: ["SE", "AI"], prereq: ["BDA501", "BDM501", "SSE602"] },
  { id: "SSW601", name: "Semantic Web", nameAr: "الويب الدلالي", cat: "SE", spec: ["SE", "AI"], prereq: ["BWP501", "SDE601"] },
  { id: "SSQ601", name: "Software Quality (in English)", nameAr: "جودة البرمجيات (باللغة الإنكليزية)", cat: "SE", spec: ["SE"], prereq: ["SSE602"] },

  // Artificial Intelligence (AI)
  { id: "ANN601", name: "Neural Networks & Fuzzy Logic", nameAr: "الشبكات العصبونية والمنطق العام", cat: "AI", spec: ["AI"], prereq: ["BAI501", "BIA601"] },
  { id: "AVR601", name: "Virtual Reality", nameAr: "الواقع الافتراضي", cat: "AI", spec: ["AI"], prereq: ["BMM601", "ACV601"] },
  { id: "AML601", name: "Machine Learning", nameAr: "تعلم الآلة", cat: "AI", spec: ["AI"], prereq: ["BPS601", "BAI501", "SIR601"] },
  { id: "ANL601", name: "Natural Language Processing", nameAr: "معالجة اللغات الطبيعية", cat: "AI", spec: ["AI"], prereq: ["BAI501", "AIP601"] },
  { id: "AES601", name: "Expert Systems", nameAr: "الأنظمة الخبيرة", cat: "AI", spec: ["AI"], prereq: ["BAI501", "GPM601"] },
  { id: "AIP601", name: "Digital Image Processing (in English)", nameAr: "معالجة الصورة الرقمية (باللغة الإنكليزية)", cat: "AI", spec: ["AI"], prereq: ["BCG601", "GEN601", "BIA601"] },
  { id: "ACV601", name: "Computer Vision (in English)", nameAr: "الرؤية الحاسوبية (باللغة الإنكليزية)", cat: "AI", spec: ["AI"], prereq: ["AIP601"] },

  // Systems and Computer Networks (SCN)
  { id: "NCA601", name: "Computer Architecture II", nameAr: "بنيان الحاسوب (2)", cat: "SCN", spec: ["SCN"], prereq: ["BCA501", "BIA601"] },
  { id: "NNP601", name: "Network Application Programming", nameAr: "برمجة التطبيقات الشبكية", cat: "SCN", spec: ["SCN"], prereq: ["BPG402", "BNT501", "BIA601"] },
  { id: "NNS601", name: "Network Services", nameAr: "خدمات شبكة", cat: "SCN", spec: ["SCN"], prereq: ["BNT501", "NOS601"] },
  { id: "NNT601", name: "Computer Networks II", nameAr: "الشبكات الحاسوبية (2)", cat: "SCN", spec: ["SCN"], prereq: ["BNT501", "NOS601"] },
  { id: "NOS601", name: "Operating Systems II (in English)", nameAr: "نظم التشغيل (2) (باللغة الإنكليزية)", cat: "SCN", spec: ["SCN"], prereq: ["BOS501", "GEN601", "GPM601"] },
  { id: "NOSL601", name: "Operating Systems Lab II", nameAr: "مخبر نظم التشغيل (2)", cat: "SCN", spec: ["SCN"], prereq: ["NOS601"], concurrent: "NOS601" },
  { id: "NNM601", name: "Network Management", nameAr: "إدارة الشبكات", cat: "SCN", spec: ["SCN"], prereq: ["NNT601"] },
  { id: "NSS601", name: "Computer Networks Security", nameAr: "أمن الشبكات الحاسوبية", cat: "SCN", spec: ["SCN"], prereq: ["BIS601"] },
  { id: "NDS601", name: "Distributed & Cloud Systems (in English)", nameAr: "النظم الموزعة والسحابية (باللغة الإنكليزية)", cat: "SCN", spec: ["SCN"], prereq: ["NOS601"] },
  { id: "NRT601", name: "Real Time Systems", nameAr: "نظم الزمن الحقيقي", cat: "SCN", spec: ["SCN"], prereq: ["NOS601", "NNS601"] }
];

// Credits per course
const creditsMap = {
  GCS301: 4, GOE301: 4, GTW301: 5, GEN301: 3, GEN401: 3, GMN401: 4,
  GEN501: 3, GEN502: 3, GAC501: 5, GPM601: 6, GEN601: 3, GET601: 6, GEP601: 4,
  BPH401: 5, BMA401: 5, BAS401: 5, BMA402: 5, BLA401: 5, BNA401: 5,
  BEC401: 5, BLC401: 5, BPG401: 5, BPG402: 5, BWP401: 5, BSP501: 5,
  BDM501: 5, BDA501: 6, BDB501: 4, BDBL501: 4, BCA501: 6, BOS501: 4,
  BOSL501: 4, BTS501: 5, BWP501: 5, BAU501: 5, BNT501: 6, BAI501: 6,
  BPG601: 5, BCM601: 6, BPS601: 6, BPR601: 6, BSE601: 6, BID601: 6,
  BIS601: 6, BCG601: 6, BMM601: 6, BMP601: 6, BIA601: 5, BPR602: 10, BSM601: 5,
  SSE602: 5, SDA601: 5, SAD601: 6, SDB601: 4, SDBL601: 4, SDE601: 6,
  SCP601: 6, SIR601: 6, SSW601: 6, SSQ601: 5,
  ANN601: 6, AVR601: 6, AML601: 6, ANL601: 6, AES601: 6, AIP601: 6, ACV601: 6,
  NCA601: 6, NNP601: 5, NNS601: 6, NNT601: 6, NOS601: 4, NOSL601: 4,
  NNM601: 6, NSS601: 6, NDS601: 6, NRT601: 6
};

// Academic level (3, 4, 5, or 6) per course
const levelMap = {
  GCS301: 3, GOE301: 3, GTW301: 3, GEN301: 3,
  BPH401: 4, BMA401: 4, BAS401: 4, BPG401: 4,
  GEN401: 4, GMN401: 4, BMA402: 4, BLA401: 4, BEC401: 4, BLC401: 4, BPG402: 4, BWP401: 4,
  BNA401: 4,
  GEN501: 5, BCA501: 5, BSP501: 5, BDA501: 5, BDM501: 5, BDB501: 5, BDBL501: 5,
  BOS501: 5, BOSL501: 5, BTS501: 5, BWP501: 5, BAU501: 5, BNT501: 5, BAI501: 5,
  GEN502: 5, GAC501: 5,
  BPG601: 6, BCM601: 6, BPS601: 6, BSE601: 6, BID601: 6, BIS601: 6, BCG601: 6,
  BMM601: 6, BMP601: 6, BIA601: 6, BPR601: 6, BPR602: 6, BSM601: 6,
  GEN601: 6, GPM601: 6, GET601: 6, GEP601: 6,
  SSE602: 6, SDA601: 6, SAD601: 6, SDB601: 6, SDBL601: 6, SDE601: 6,
  SCP601: 6, SIR601: 6, SSW601: 6, SSQ601: 6,
  ANN601: 6, AVR601: 6, AML601: 6, ANL601: 6, AES601: 6, AIP601: 6, ACV601: 6,
  NCA601: 6, NNP601: 6, NNS601: 6, NNT601: 6, NOS601: 6, NOSL601: 6,
  NNM601: 6, NSS601: 6, NDS601: 6, NRT601: 6
};

// ===== Display configuration =====
const COLORS = {
  general: { fill: "#4299e1", stroke: "#2b6cb0" },
  basic:   { fill: "#48bb78", stroke: "#2f855a" },
  SE:      { fill: "#ed8936", stroke: "#c05621" },
  AI:      { fill: "#9f7aea", stroke: "#6b46c1" },
  SCN:     { fill: "#e53e3e", stroke: "#9b2c2c" }
};

const CATEGORY_LABELS = {
  general: { en: "General", ar: "عام" },
  basic: { en: "Basic", ar: "أساسي" },
  SE: { en: "Software Eng.", ar: "هندسة برمجيات" },
  AI: { en: "Artificial Intelligence", ar: "ذكاء اصطناعي" },
  SCN: { en: "Systems & Networks", ar: "أنظمة وشبكات" }
};

// =====================================================================
// Self-contained faculty data
// =====================================================================
//
// All subjects + grading rules for a faculty live in one place. To add
// a new faculty, add another key with the same shape; the app will
// auto-pick it up and offer it in the faculty selector.
//
// The split from the existing data above is kept for backward compat
// (the data shape for the legacy exports is the same), but app.js now
// reads everything from FACULTY_DATA / currentFaculty.

const FACULTY_DATA = {
  ITE: {
    code: "ITE",
    name: "Information Technology Engineering",
    description: "Bachelor in Information Technology Engineering",
    categories: Object.fromEntries(
      Object.keys(CATEGORY_LABELS).map(k => [k, {
        label: CATEGORY_LABELS[k],
        color: COLORS[k].fill,
        stroke: COLORS[k].stroke
      }])
    ),
    subjects: subjectsData.map(s => ({
      id: s.id,
      name: s.name,
      nameAr: s.nameAr,
      category: s.cat,
      specialization: s.spec || [],
      credits: creditsMap[s.id] || 0,
      level: levelMap[s.id] || 3,
      prerequisites: s.prereq || [],
      concurrent: s.concurrent || null,
      extra: s.extra || null
    })),
    passRules: {
      // Standard course: assignment * w1 + final * w2 >= threshold
      default: {
        assignmentWeight: 0.3,
        finalWeight: 0.7,
        passThreshold: 60
      },
      // English placement test: a single grade lets you skip a number
      // of English levels depending on how high the score is.
      englishPlacement: {
        enabled: true,
        // The pasted text uses ENG_Lx codes, but the catalog uses
        // GENxxx codes. Map them here.
        levelMap: {
          "ENG_L1": "GEN301",
          "ENG_L2": "GEN401",
          "ENG_L3": "GEN501",
          "ENG_L4": "GEN502",
          "ENG_L5": "GEN601"
        },
        // Order matters: list the levels in ascending order so we can
        // pick "the first N levels" the student earned.
        orderedLevels: ["GEN301", "GEN401", "GEN501", "GEN502", "GEN601"],
        // Thresholds: the highest matching "minGrade" wins, and the
        // student gets that many levels of credit.
        thresholds: [
          { minGrade: 94, levelsPassed: 5 },
          { minGrade: 85, levelsPassed: 4 },
          { minGrade: 75, levelsPassed: 3 },
          { minGrade: 65, levelsPassed: 2 },
          { minGrade: 60, levelsPassed: 1 }
        ]
      }
    }
  }
};

// Active faculty
let currentFaculty = FACULTY_DATA.ITE;
function setFaculty(code) {
  if (FACULTY_DATA[code]) {
    currentFaculty = FACULTY_DATA[code];
    return true;
  }
  return false;
}
function listFaculties() {
  return Object.values(FACULTY_DATA);
}
