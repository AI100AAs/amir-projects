const STORAGE_KEY = "ubc-course-scheduler-profile-v3";
const THEME_KEY = "course-scheduler-theme";

const courses = [
  { code: "SCIE 113", name: "First-Year Seminar in Science", credits: 3, type: "required", prereq: [], review: 76, demand: "medium", terms: ["fall", "spring"], topics: ["communication", "science"], note: "Listed in first year for UBC B.Sc. Computer Science." },
  { code: "COMM-REQ", name: "Additional Communication Requirement", credits: 3, type: "required", prereq: [], review: 74, demand: "medium", terms: ["fall", "spring"], topics: ["communication", "writing"], note: "Placeholder for an acceptable UBC communication course." },
  { code: "CPSC 110", name: "Computation, Programs, and Programming", credits: 4, type: "required", prereq: [], review: 82, demand: "medium", terms: ["fall", "spring"], topics: ["programming", "foundation"], note: "UBC Calendar recommends CPSC 110; CPSC 103 and 107 may be used instead." },
  { code: "CPSC 121", name: "Models of Computation", credits: 4, type: "required", prereq: ["CPSC 110"], review: 78, demand: "high", terms: ["fall", "spring"], topics: ["logic", "foundation"], note: "Required first-year CPSC course." },
  { code: "MATH 100", name: "Differential Calculus", credits: 3, type: "required", prereq: [], review: 70, demand: "low", terms: ["fall", "spring"], topics: ["math"], note: "One accepted first calculus option; Calendar also lists MATH 102/104/180/184/120/110." },
  { code: "MATH 101", name: "Integral Calculus", credits: 3, type: "required", prereq: ["MATH 100"], review: 70, demand: "low", terms: ["fall", "spring"], topics: ["math"], note: "One accepted second calculus option; Calendar also lists MATH 103/105/121." },
  { code: "CPSC 210", name: "Software Construction", credits: 4, type: "required", prereq: ["CPSC 110"], review: 84, demand: "medium", terms: ["fall", "spring"], topics: ["software", "product"], note: "Required in second year; co-op students are advised to consider taking it earlier." },
  { code: "CPSC 213", name: "Introduction to Computer Systems", credits: 4, type: "required", prereq: ["CPSC 210"], review: 72, demand: "high", terms: ["fall", "spring"], topics: ["systems"], note: "Required second-year CPSC course." },
  { code: "CPSC 221", name: "Basic Algorithms and Data Structures", credits: 4, type: "required", prereq: ["CPSC 121", "MATH 221"], review: 68, demand: "high", terms: ["fall", "spring"], topics: ["theory", "algorithms"], note: "Required second-year CPSC course." },
  { code: "MATH 221", name: "Matrix Algebra", credits: 3, type: "required", prereq: ["MATH 100"], review: 78, demand: "medium", terms: ["fall", "spring"], topics: ["math", "machine learning"], note: "Used here for the Calendar's MATH 111 or 221 requirement." },
  { code: "MATH 200", name: "Multivariable Calculus", credits: 3, type: "required", prereq: ["MATH 101"], review: 72, demand: "medium", terms: ["fall", "spring"], topics: ["math"], note: "Required second-year math course for the major." },
  { code: "STAT 251", name: "Elementary Statistics", credits: 3, type: "required", prereq: ["MATH 100"], review: 74, demand: "medium", terms: ["fall", "spring"], topics: ["statistics", "machine learning"], note: "Calendar lists STAT 251; STAT 200/201 may be used only with an additional MATH/STAT 302 condition." },
  { code: "CPSC 310", name: "Introduction to Software Engineering", credits: 4, type: "required", prereq: ["CPSC 210"], review: 80, demand: "high", terms: ["fall", "spring"], topics: ["software"], note: "Part of the required third/fourth-year CPSC 310, 313, 320 block." },
  { code: "CPSC 313", name: "Computer Hardware and Operating Systems", credits: 3, type: "required", prereq: ["CPSC 213"], review: 71, demand: "high", terms: ["fall", "spring"], topics: ["systems"], note: "Part of the required third/fourth-year CPSC 310, 313, 320 block." },
  { code: "CPSC 320", name: "Intermediate Algorithm Design and Analysis", credits: 3, type: "required", prereq: ["CPSC 221"], review: 69, demand: "high", terms: ["fall", "spring"], topics: ["algorithms"], note: "Part of the required third/fourth-year CPSC 310, 313, 320 block." },
  { code: "CPSC 340", name: "Machine Learning and Data Mining", credits: 4, type: "specialization", prereq: ["CPSC 221", "STAT 251", "MATH 221"], review: 86, demand: "high", terms: ["fall", "spring"], topics: ["machine learning", "ai"], note: "Chosen for the Calendar's AI 240 or CPSC 340 AI Option requirement." },
  { code: "CPSC 322", name: "Introduction to Artificial Intelligence", credits: 3, type: "specialization", prereq: ["CPSC 221"], review: 81, demand: "high", terms: ["fall", "spring"], topics: ["ai"], note: "Chosen for the Calendar's AI 322 or CPSC 322 AI Option requirement." },
  { code: "AI 360", name: "AI Option Core Requirement", credits: 3, type: "specialization", prereq: ["CPSC 322"], review: 78, demand: "medium", terms: ["fall", "spring"], topics: ["ai"], note: "Required by the UBC Calendar for the Computer Science AI Option; current course details should be verified." },
  { code: "CPSC 440", name: "Advanced Machine Learning", credits: 3, type: "specialization", prereq: ["CPSC 340"], review: 85, demand: "high", terms: ["spring"], topics: ["machine learning", "ai"], note: "Required by the UBC Calendar for the Computer Science AI Option." },
  { code: "CPSC 430", name: "Computers and Society", credits: 3, type: "specialization", prereq: ["CPSC 340"], review: 83, demand: "high", terms: ["spring"], topics: ["ai", "society"], note: "Chosen for the Calendar's CPSC 430 or DSCI 430 requirement." },
  { code: "STAT 302", name: "Introduction to Probability", credits: 3, type: "specialization", prereq: ["STAT 251"], review: 73, demand: "medium", terms: ["fall", "spring"], topics: ["statistics", "ai"], note: "Chosen for the Calendar's MATH 302 or STAT 302 requirement." },
  { code: "CPSC 304", name: "Introduction to Relational Databases", credits: 3, type: "specialization", prereq: ["CPSC 210"], review: 81, demand: "medium", terms: ["fall", "spring"], topics: ["data", "software"], note: "One approved AI Option elective from the Calendar list." },
  { code: "CPSC 344", name: "Human-Computer Interaction", credits: 3, type: "specialization", prereq: ["CPSC 210"], review: 89, demand: "medium", terms: ["fall", "spring"], topics: ["hci", "human centered", "ai"], note: "One approved AI Option elective from the Calendar list." },
  { code: "CPSC 420", name: "Advanced Algorithms Design and Analysis", credits: 3, type: "specialization", prereq: ["CPSC 320"], review: 78, demand: "medium", terms: ["fall", "spring"], topics: ["algorithms", "ai"], note: "One approved 400-level AI Option elective from the Calendar list." },
  { code: "OPEN 3xx", name: "Electives / Breadth / Arts / Science Requirements", credits: 3, type: "elective", prereq: [], review: 75, demand: "low", terms: ["fall", "spring"], topics: ["exploration"], note: "Elective placeholder; must satisfy UBC B.Sc. breadth, arts, science, upper-level, and total-credit rules." },
  { code: "CPEN 211", name: "Computing Systems I", credits: 5, type: "required", prereq: [], review: 72, demand: "high", terms: ["fall"], topics: ["hardware", "software"], note: "Listed in UBC ECE Electrical Engineering second year." },
  { code: "CPSC 259", name: "Data Structures for Engineers", credits: 4, type: "required", prereq: [], review: 74, demand: "medium", terms: ["fall"], topics: ["programming"], note: "Listed in UBC ECE Electrical Engineering second year." },
  { code: "ELEC 201", name: "Circuit Analysis I", credits: 4, type: "required", prereq: [], review: 70, demand: "high", terms: ["fall"], topics: ["circuits"], note: "Listed in UBC ECE Electrical Engineering second year." },
  { code: "MATH 253", name: "Multivariable Calculus", credits: 3, type: "required", prereq: [], review: 71, demand: "medium", terms: ["fall"], topics: ["math"], note: "Listed in UBC ECE Electrical Engineering second year." },
  { code: "MATH 255", name: "Ordinary Differential Equations", credits: 3, type: "required", prereq: [], review: 70, demand: "medium", terms: ["fall"], topics: ["math"], note: "Listed in UBC ECE Electrical Engineering second year." },
  { code: "ELEC 202", name: "Circuit Analysis II", credits: 4, type: "required", prereq: ["ELEC 201"], review: 69, demand: "high", terms: ["spring"], topics: ["circuits"], note: "Listed in UBC ECE Electrical Engineering second year." },
  { code: "ELEC 211", name: "Engineering Electromagnetics", credits: 2, type: "required", prereq: ["MATH 253"], review: 68, demand: "medium", terms: ["spring"], topics: ["electromagnetics"], note: "Listed in UBC ECE Electrical Engineering second year." },
  { code: "ELEC 221", name: "Signals and Systems", credits: 4, type: "required", prereq: ["MATH 255"], review: 67, demand: "high", terms: ["spring"], topics: ["signals"], note: "Listed in UBC ECE Electrical Engineering second year." },
  { code: "ELEC 281", name: "Technical Communication", credits: 3, type: "required", prereq: [], review: 78, demand: "medium", terms: ["spring"], topics: ["communication"], note: "Listed in UBC ECE Electrical Engineering second year." },
  { code: "ELEC 291", name: "Electrical Engineering Design Studio I", credits: 6, type: "required", prereq: ["ELEC 201"], review: 75, demand: "high", terms: ["spring"], topics: ["design"], note: "Listed in UBC ECE Electrical Engineering second year." },
  { code: "MATH 264", name: "Vector Calculus for Electrical Engineering", credits: 1, type: "required", prereq: ["MATH 253"], review: 70, demand: "medium", terms: ["spring"], topics: ["math"], note: "Listed in UBC ECE Electrical Engineering second year." },
  { code: "ELEC 301", name: "Electronic Circuits", credits: 4, type: "required", prereq: ["ELEC 202"], review: 66, demand: "high", terms: ["fall"], topics: ["electronics"], note: "Listed in UBC ECE Electrical Engineering third year." },
  { code: "ELEC 315", name: "Electronic Materials and Devices", credits: 4, type: "required", prereq: ["ELEC 202"], review: 68, demand: "high", terms: ["fall"], topics: ["devices"], note: "Listed in UBC ECE Electrical Engineering third year." },
  { code: "ELEC 342", name: "Electromagnetic Fields and Waves", credits: 4, type: "required", prereq: ["ELEC 211"], review: 66, demand: "high", terms: ["fall"], topics: ["electromagnetics"], note: "Listed in UBC ECE Electrical Engineering third year." },
  { code: "MATH 302", name: "Introduction to Probability", credits: 3, type: "required", prereq: ["MATH 253"], review: 72, demand: "medium", terms: ["fall", "spring"], topics: ["probability"], note: "One of MATH 302, STAT 302, or MATH 318 for UBC ELEC." },
  { code: "ELEC 311", name: "Digital Systems Design", credits: 4, type: "required", prereq: ["CPEN 211"], review: 70, demand: "high", terms: ["spring"], topics: ["digital systems"], note: "Listed in UBC ECE Electrical Engineering third year." },
  { code: "ELEC 341", name: "Systems and Control", credits: 4, type: "required", prereq: ["ELEC 221"], review: 68, demand: "high", terms: ["spring"], topics: ["controls"], note: "Listed in UBC ECE Electrical Engineering third year." },
  { code: "ELEC 391", name: "Electrical Engineering Design Studio II", credits: 6, type: "required", prereq: ["ELEC 291"], review: 74, demand: "high", terms: ["spring"], topics: ["design"], note: "Listed in UBC ECE Electrical Engineering third year." },
  { code: "ELEC 481", name: "Engineering Economics and Project Management", credits: 3, type: "required", prereq: [], review: 77, demand: "medium", terms: ["fall"], topics: ["professional"], note: "Listed in UBC ECE Electrical Engineering fourth year." },
  { code: "ELEC 491", name: "Electrical Engineering Capstone Design Project", credits: 10, type: "required", prereq: ["ELEC 391"], review: 82, demand: "high", terms: ["fall", "spring"], topics: ["capstone"], note: "Listed in UBC ECE Electrical Engineering fourth year." },
  { code: "APSC 450", name: "Professional Engineering Practice", credits: 2, type: "required", prereq: [], review: 76, demand: "medium", terms: ["fall", "spring"], topics: ["professional"], note: "Listed in UBC ECE Electrical Engineering fourth year." },
  { code: "ELEC-ADV", name: "Department-approved ELEC Advanced Elective", credits: 3, type: "elective", prereq: [], review: 76, demand: "medium", terms: ["fall", "spring"], topics: ["electrical engineering"], note: "Placeholder for approved UBC ELEC advanced electives." },
  { code: "ELEC-BREADTH", name: "Department-approved ELEC Breadth Elective", credits: 4, type: "elective", prereq: [], review: 76, demand: "medium", terms: ["fall", "spring"], topics: ["electrical engineering"], note: "Placeholder for approved UBC ELEC breadth electives." },
  { code: "ELEC-COMP", name: "Complementary Studies Elective", credits: 3, type: "elective", prereq: [], review: 78, demand: "low", terms: ["fall", "spring"], topics: ["complementary studies"], note: "Placeholder for UBC Engineering complementary studies electives." },
  { code: "ELEC-SCI", name: "Science Elective", credits: 3, type: "elective", prereq: [], review: 78, demand: "low", terms: ["fall", "spring"], topics: ["science"], note: "Placeholder for UBC ELEC science elective requirement." },
];

const csScenarioPlans = {
  balanced: [
    ["SCIE 113", "CPSC 110", "MATH 100", "OPEN 3xx"],
    ["COMM-REQ", "CPSC 121", "MATH 101", "OPEN 3xx"],
    ["CPSC 210", "MATH 221", "STAT 251", "OPEN 3xx"],
    ["CPSC 213", "CPSC 221", "MATH 200", "OPEN 3xx"],
    ["CPSC 310", "CPSC 320", "CPSC 340", "OPEN 3xx"],
    ["CPSC 313", "CPSC 322", "STAT 302", "OPEN 3xx"],
    ["AI 360", "CPSC 304", "CPSC 344", "OPEN 3xx"],
    ["CPSC 430", "CPSC 440", "CPSC 420", "OPEN 3xx"],
  ],
  fast: [
    ["SCIE 113", "CPSC 110", "MATH 100", "OPEN 3xx"],
    ["COMM-REQ", "CPSC 121", "MATH 101", "OPEN 3xx"],
    ["CPSC 210", "MATH 221", "STAT 251", "OPEN 3xx"],
    ["CPSC 213", "CPSC 221", "MATH 200", "OPEN 3xx"],
    ["CPSC 310", "CPSC 320", "CPSC 340", "CPSC 304"],
    ["CPSC 313", "CPSC 322", "STAT 302", "CPSC 344"],
    ["AI 360", "CPSC 430", "CPSC 440", "CPSC 420"],
  ],
  lighter: [
    ["SCIE 113", "CPSC 110", "MATH 100"],
    ["COMM-REQ", "CPSC 121", "MATH 101"],
    ["CPSC 210", "MATH 221", "STAT 251"],
    ["CPSC 213", "CPSC 221", "MATH 200"],
    ["CPSC 310", "CPSC 340", "OPEN 3xx"],
    ["CPSC 313", "CPSC 322", "OPEN 3xx"],
    ["CPSC 320", "STAT 302", "CPSC 344"],
    ["AI 360", "CPSC 304", "OPEN 3xx"],
    ["CPSC 430", "CPSC 440", "CPSC 420"],
  ],
  explore: [
    ["SCIE 113", "CPSC 110", "MATH 100", "OPEN 3xx"],
    ["COMM-REQ", "CPSC 121", "MATH 101", "OPEN 3xx"],
    ["CPSC 210", "MATH 221", "STAT 251", "OPEN 3xx"],
    ["CPSC 213", "CPSC 221", "MATH 200", "OPEN 3xx"],
    ["CPSC 310", "CPSC 340", "CPSC 344", "OPEN 3xx"],
    ["CPSC 313", "CPSC 320", "CPSC 322", "OPEN 3xx"],
    ["AI 360", "STAT 302", "CPSC 304", "OPEN 3xx"],
    ["CPSC 430", "CPSC 440", "CPSC 420", "OPEN 3xx"],
  ],
};

const eceScenarioPlans = {
  balanced: [
    ["CPEN 211", "CPSC 259", "ELEC 201", "MATH 253", "MATH 255"],
    ["ELEC 202", "ELEC 211", "ELEC 221", "ELEC 281", "ELEC 291", "MATH 264"],
    ["ELEC 301", "ELEC 315", "ELEC 342", "MATH 302", "ELEC-COMP"],
    ["ELEC 311", "ELEC 341", "ELEC 391", "ELEC-COMP"],
    ["ELEC 481", "ELEC 491", "ELEC-ADV"],
    ["APSC 450", "ELEC-ADV", "ELEC-ADV", "ELEC-BREADTH", "ELEC-SCI"],
  ],
  fast: [
    ["CPEN 211", "CPSC 259", "ELEC 201", "MATH 253", "MATH 255"],
    ["ELEC 202", "ELEC 211", "ELEC 221", "ELEC 281", "ELEC 291", "MATH 264"],
    ["ELEC 301", "ELEC 315", "ELEC 342", "MATH 302", "ELEC-BREADTH"],
    ["ELEC 311", "ELEC 341", "ELEC 391", "ELEC-COMP", "ELEC-COMP"],
    ["ELEC 481", "ELEC 491", "APSC 450", "ELEC-ADV"],
    ["ELEC-ADV", "ELEC-ADV", "ELEC-BREADTH", "ELEC-SCI"],
  ],
  lighter: [
    ["CPEN 211", "CPSC 259", "ELEC 201", "MATH 253"],
    ["ELEC 202", "ELEC 211", "ELEC 221", "MATH 255", "MATH 264"],
    ["ELEC 281", "ELEC 291", "MATH 302", "ELEC-COMP"],
    ["ELEC 301", "ELEC 315", "ELEC 342"],
    ["ELEC 311", "ELEC 341", "ELEC-COMP"],
    ["ELEC 391", "ELEC-ADV", "ELEC-BREADTH"],
    ["ELEC 481", "ELEC 491"],
    ["APSC 450", "ELEC-ADV", "ELEC-ADV", "ELEC-SCI"],
  ],
  explore: [
    ["CPEN 211", "CPSC 259", "ELEC 201", "MATH 253", "MATH 255"],
    ["ELEC 202", "ELEC 211", "ELEC 221", "ELEC 281", "ELEC 291", "MATH 264"],
    ["ELEC 301", "ELEC 315", "ELEC 342", "MATH 302", "ELEC-COMP"],
    ["ELEC 311", "ELEC 341", "ELEC 391", "ELEC-COMP"],
    ["ELEC 481", "ELEC 491", "ELEC-BREADTH"],
    ["APSC 450", "ELEC-ADV", "ELEC-ADV", "ELEC-ADV", "ELEC-SCI"],
  ],
};

const csRequirements = [
  { id: "firstYear", title: "First-year CS major requirements", codes: ["SCIE 113", "COMM-REQ", "CPSC 110", "CPSC 121", "MATH 100", "MATH 101"], required: 6 },
  { id: "secondYear", title: "Second-year CS major requirements", codes: ["CPSC 210", "CPSC 213", "CPSC 221", "MATH 221", "MATH 200", "STAT 251"], required: 6 },
  { id: "upperCore", title: "Required upper-year CPSC block", codes: ["CPSC 310", "CPSC 313", "CPSC 320"], required: 3 },
  { id: "aiCore", title: "AI Option core", codes: ["CPSC 340", "CPSC 322", "AI 360", "CPSC 440", "CPSC 430", "STAT 302"], required: 6 },
  { id: "aiElectives", title: "AI Option approved electives", codes: ["CPSC 304", "CPSC 344", "CPSC 420"], required: 3 },
  { id: "degreeWide", title: "B.Sc. electives and breadth review", codes: ["OPEN 3xx"], required: 1 },
];

const eceRequirements = [
  { id: "elecSecondYear", title: "ELEC second-year core", codes: ["CPEN 211", "CPSC 259", "ELEC 201", "MATH 253", "MATH 255", "ELEC 202", "ELEC 211", "ELEC 221", "ELEC 281", "ELEC 291", "MATH 264"], required: 11 },
  { id: "elecThirdYear", title: "ELEC third-year core", codes: ["ELEC 301", "ELEC 315", "ELEC 342", "MATH 302", "ELEC 311", "ELEC 341", "ELEC 391"], required: 7 },
  { id: "elecFourthYear", title: "ELEC fourth-year core", codes: ["ELEC 491", "ELEC 481", "APSC 450"], required: 3 },
  { id: "elecElectives", title: "ECE approved electives", codes: ["ELEC-ADV", "ELEC-BREADTH", "ELEC-SCI"], required: 3 },
  { id: "elecCompStudies", title: "Complementary studies", codes: ["ELEC-COMP"], required: 1 },
];

const evidence = [
  { title: "UBC Academic Calendar: Computer Science", body: "Uses the 2026/27 UBC Vancouver Calendar structure for B.Sc. Major in Computer Science and the Option in Artificial Intelligence.", score: 95, source: "official", url: "https://vancouver.calendar.ubc.ca/faculties-colleges-and-schools/faculty-science/bachelor-science/computer-science" },
  { title: "UBC Science degree requirements", body: "Uses faculty-wide constraints such as 120 total credits, upper-level credits, Science/Arts requirements, communication, and breadth as advisor-review checks.", score: 90, source: "official", url: "https://science.ubc.ca/students/topic/requirements" },
  { title: "Reddit review clusters", body: "Mock review clustering surfaces workload, waitlist, and usefulness signals without treating Reddit as authoritative policy.", score: 63, source: "reviews" },
  { title: "Student profile fit", body: "Interest text influences elective ranking and course timing, but it cannot override prerequisites or degree rules.", score: 78, source: "profile" },
  { title: "Availability model", body: "Term availability is still simulated in this prototype. Actual UBC Workday section availability must be checked before registration.", score: 58, source: "prototype" },
  { title: "Demand and waitlists", body: "High-demand courses are flagged and backup terms are recommended where possible.", score: 58, source: "reviews" },
  { title: "Prompt provenance", body: "The prompt labels UBC Calendar-derived requirements and asks the LLM to return uncertainty rather than fill gaps with invented rules.", score: 78, source: "llm" },
];

const eceEvidence = [
  { title: "UBC ECE: Electrical Engineering Program", body: "Uses the UBC ECE department's Electrical Engineering program summary for second-, third-, and fourth-year course structure.", score: 94, source: "official", url: "https://ece.ubc.ca/undergraduates/programs/electrical-engineering-program/" },
  { title: "UBC Academic Calendar: Electrical and Computer Engineering", body: "Uses the Calendar's Electrical and Computer Engineering page as the official program source for BASc ECE context.", score: 90, source: "official", url: "https://vancouver.calendar.ubc.ca/faculties-colleges-and-schools/faculty-applied-science/bachelor-applied-science/electrical-and-computer-engineering" },
  { title: "Availability model", body: "Term availability is still simulated in this prototype. Actual UBC Workday section availability must be checked before registration.", score: 58, source: "prototype" },
  { title: "Demand and workload signals", body: "Review and demand scores are prototype estimates based on common student concerns, not official ECE advising data.", score: 58, source: "reviews" },
  { title: "Student profile fit", body: "Interest text influences workload and elective framing, but it cannot override official ECE program requirements.", score: 76, source: "profile" },
  { title: "Prompt provenance", body: "The prompt labels official ECE requirements separately from simulated workload and review signals.", score: 78, source: "llm" },
];

const risks = [
  { title: "Reliability and autonomy", body: "The tool refuses finalization when prerequisites, degree rules, or source conflicts are unresolved.", level: "high", score: 88 },
  { title: "Direct student harms", body: "Bad recommendations can waste tuition, delay graduation, increase stress, or narrow educational ownership.", level: "high", score: 85 },
  { title: "Privacy", body: "Sensitive interests and circumstances should be minimized, redacted, and never reused for advertising.", level: "high", score: 83 },
  { title: "Malicious data", body: "Public reviews and scraped descriptions need provenance checks because poisoned data can steer students toward costly mistakes.", level: "medium", score: 67 },
  { title: "Economic pressure", body: "Optimized schedules can reduce elective exploration and weaken courses that rely on broad enrollment.", level: "medium", score: 62 },
  { title: "Institutional influence", body: "Employers or governments could pressure systems to privilege specific skills, courses, or student profiles.", level: "medium", score: 74 },
];

const safeguards = [
  { title: "Human review gate", body: "Faculty-wide breadth, Arts, Science, transfer credits, co-op timing, and section availability are exported for advisor review." },
  { title: "Priority order", body: "The planner prioritizes UBC Calendar requirements, then prerequisite safety, workload fit, student interests, and demand." },
  { title: "Privacy minimization", body: "The LLM prompt summarizes circumstances instead of sending unnecessary sensitive detail." },
  { title: "Source separation", body: "UBC Calendar rules, simulated reviews, and student preferences are shown separately so students can challenge the recommendation." },
  { title: "No false certainty", body: "Low-confidence or conflicting signals lower the confidence score and create explicit handoff items." },
  { title: "Calendar verification", body: "The app links the source but still frames the output as a prototype planning aid, not official UBC advising." },
];

const selectors = {
  scheduleBoard: document.querySelector("#scheduleBoard"),
  comparisonBoard: document.querySelector("#comparisonBoard"),
  reasonList: document.querySelector("#reasonList"),
  requirementList: document.querySelector("#requirementList"),
  uncertaintyList: document.querySelector("#uncertaintyList"),
  sourceGrid: document.querySelector("#sourceGrid"),
  riskGrid: document.querySelector("#riskGrid"),
  safeguardList: document.querySelector("#safeguardList"),
  courseGrid: document.querySelector("#courseGrid"),
  toast: document.querySelector("#toast"),
  exportDialog: document.querySelector("#exportDialog"),
  exportText: document.querySelector("#exportText"),
};

let activeScheduleView = "terms";

function courseByCode(code) {
  return courses.find((course) => course.code === code);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getPace() {
  return document.querySelector("input[name='pace']:checked").value;
}

function setPace(value) {
  const input = document.querySelector(`input[name='pace'][value='${value}']`);
  if (input) input.checked = true;
}

function selectedCircumstances() {
  return Array.from(document.querySelectorAll(".checks input:checked")).map((input) => input.value);
}

function currentProfile() {
  return {
    major: document.querySelector("#majorSelect").value,
    specialization: document.querySelector("#specializationSelect").value,
    interests: document.querySelector("#interestsInput").value.trim(),
    workHours: Number(document.querySelector("#workHoursInput").value || 0),
    maxCredits: Number(document.querySelector("#creditInput").value || 15),
    startTerm: document.querySelector("#startTermSelect").value,
    pace: getPace(),
    circumstances: selectedCircumstances(),
  };
}

function isEceProgram(profile = currentProfile()) {
  return profile.major === "ece-elec";
}

function programName(profile = currentProfile()) {
  return isEceProgram(profile)
    ? "UBC B.A.Sc. Electrical Engineering (ECE)"
    : "UBC B.Sc. Computer Science - Option in Artificial Intelligence";
}

function scenarioPlansFor(profile = currentProfile()) {
  return isEceProgram(profile) ? eceScenarioPlans : csScenarioPlans;
}

function requirementsFor(profile = currentProfile()) {
  return isEceProgram(profile) ? eceRequirements : csRequirements;
}

function evidenceFor(profile = currentProfile()) {
  return isEceProgram(profile) ? eceEvidence : evidence;
}

function relevantCodesFor(profile = currentProfile()) {
  const terms = buildTerms(profile);
  return uniqueCodes([...flattenTerms(terms), ...requirementsFor(profile).flatMap((requirement) => requirement.codes)]);
}

function applyProfile(profile) {
  if (!profile) return;
  const savedMajor = profile.major === "ece-elec" ? "ece-elec" : "cs-ai";
  document.querySelector("#majorSelect").value = savedMajor;
  updateProgramUi();
  document.querySelector("#interestsInput").value = profile.interests ?? "";
  document.querySelector("#workHoursInput").value = profile.workHours ?? 14;
  document.querySelector("#creditInput").value = profile.maxCredits ?? 15;
  document.querySelector("#startTermSelect").value = profile.startTerm ?? "fall";
  document.querySelector("#specializationSelect").value = profile.specialization ?? (savedMajor === "ece-elec" ? "elec" : "ai");
  setPace(profile.pace ?? "balanced");
  document.querySelectorAll(".checks input").forEach((input) => {
    input.checked = Array.isArray(profile.circumstances) && profile.circumstances.includes(input.value);
  });
}

function updateProgramUi() {
  const profile = currentProfile();
  const focusSelect = document.querySelector("#specializationSelect");
  const topLabel = document.querySelector(".eyebrow");
  const creditInput = document.querySelector("#creditInput");
  focusSelect.innerHTML = isEceProgram(profile)
    ? `<option value="elec">Electrical Engineering</option>`
    : `<option value="ai">Option in Artificial Intelligence</option>`;
  topLabel.textContent = isEceProgram(profile)
    ? "UBC Vancouver / B.A.Sc. Electrical Engineering / ECE"
    : "UBC Vancouver / B.Sc. Computer Science / Option in Artificial Intelligence";
  if (isEceProgram(profile) && Number(creditInput.value) < 19) creditInput.value = 21;
  if (!isEceProgram(profile) && Number(creditInput.value) > 18) creditInput.value = 15;
}

function termLabel(index, startTerm) {
  const startsFall = startTerm === "fall";
  const isFall = startsFall ? index % 2 === 0 : index % 2 === 1;
  const year = Math.floor(index / 2) + 1;
  return `Year ${year} / ${isFall ? "Fall" : "Spring"}`;
}

function termSeason(index, startTerm) {
  const startsFall = startTerm === "fall";
  const isFall = startsFall ? index % 2 === 0 : index % 2 === 1;
  return isFall ? "fall" : "spring";
}

function buildTerms(profile = currentProfile(), pace = profile.pace) {
  const plans = scenarioPlansFor(profile);
  let terms = plans[pace].map((term) => [...term]);

  if (profile.workHours >= 18 && pace === "balanced") {
    terms = plans.lighter.map((term) => [...term]);
  }

  if (profile.circumstances.includes("coop")) {
    terms.splice(5, 0, ["COOP 300"]);
  }

  return terms;
}

function normalizeTerm(term) {
  return term.map((code) => {
    if (code === "COOP 300") {
      return { code, name: "Co-op / Internship Term", credits: 0, type: "experience", prereq: [], review: 80, demand: "medium", terms: ["fall", "spring"], topics: ["career"], note: "No academic credits; schedule requires advisor confirmation." };
    }
    return courseByCode(code);
  }).filter(Boolean);
}

function flattenTerms(terms) {
  return terms.flat().filter((code) => code !== "COOP 300");
}

function uniqueCodes(codes) {
  return [...new Set(codes)];
}

function validatePlan(terms, profile) {
  const completed = new Set();
  const issues = [];
  let highDemand = 0;
  let totalCredits = 0;
  let overloads = 0;
  let availabilityIssues = 0;

  terms.forEach((term, index) => {
    const season = termSeason(index, profile.startTerm);
    const items = normalizeTerm(term);
    const credits = items.reduce((sum, course) => sum + course.credits, 0);
    totalCredits += credits;
    if (credits > profile.maxCredits) {
      overloads += 1;
      issues.push({ title: `${termLabel(index, profile.startTerm)} exceeds credit cap`, body: `${credits} credits are scheduled against a ${profile.maxCredits}-credit limit.` });
    }

    items.forEach((course) => {
      if (course.demand === "high") highDemand += 1;
      if (course.terms && !course.terms.includes(season)) {
        availabilityIssues += 1;
        issues.push({ title: `${course.code} term availability`, body: `${course.code} is usually offered in ${course.terms.join(" or ")}, but this term is ${season}.` });
      }
      course.prereq.forEach((prereq) => {
        if (!completed.has(prereq)) {
          issues.push({ title: `${course.code} prerequisite check`, body: `${prereq} should be completed before ${course.code}.` });
        }
      });
    });

    items.forEach((course) => completed.add(course.code));
  });

  const selected = uniqueCodes(flattenTerms(terms));
  const requirementResults = requirementsFor(profile).map((requirement) => {
    const matched = requirement.codes.filter((code) => selected.includes(code));
    return {
      ...requirement,
      matched,
      complete: matched.length >= requirement.required,
    };
  });

  const completeRequirements = requirementResults.filter((item) => item.complete).length;
  const coverage = Math.round((completeRequirements / requirementsFor(profile).length) * 100);
  const confidencePenalty = issues.length * 5 + overloads * 4 + availabilityIssues * 4 + (profile.circumstances.includes("transfer") ? 6 : 0);
  const confidence = Math.max(42, Math.min(94, 86 - confidencePenalty + Math.round((coverage - 80) / 4)));
  const avgCredits = totalCredits / terms.length;

  return { issues, requirementResults, coverage, confidence, avgCredits, highDemand, totalCredits, overloads };
}

function buildUnresolved(profile, validation) {
  const unresolved = [
    { title: "UBC Calendar verification", body: "Confirm the current UBC Academic Calendar and student-specific year of entry before treating the plan as official." },
    isEceProgram(profile)
      ? { title: "Engineering degree audit", body: "Engineering Academic Services should confirm complementary studies, electives, transfer credits, and year-standing rules." }
      : { title: "Faculty-wide B.Sc. audit", body: "Arts, Science, breadth, upper-level, lab science, and total-credit requirements need a full degree audit." },
    { title: "Workday section availability", body: "Actual section times, seats, waitlists, and term offerings must be checked in UBC registration systems." },
  ];

  if (profile.circumstances.includes("transfer")) {
    unresolved.unshift({ title: "Transfer credit review", body: "Prior credits need registrar or advisor confirmation before requirements can be marked complete." });
  }

  if (profile.circumstances.includes("accessibility")) {
    unresolved.unshift({ title: "Accessibility logistics", body: "Room locations, exam timing, and accommodation logistics require protected handling by staff." });
  }

  if (profile.circumstances.includes("coop")) {
    unresolved.push({ title: "Co-op sequencing", body: "Internship timing can affect prerequisite chains and course availability." });
  }

  validation.issues.slice(0, 3).forEach((issue) => unresolved.push(issue));
  return unresolved;
}

function specializationName(value) {
  return {
    ai: "Option in Artificial Intelligence",
    elec: "Electrical Engineering",
    hci: "Human-Computer Interaction",
    systems: "Systems",
  }[value] || "Option in Artificial Intelligence";
}

function paceName(value) {
  return {
    balanced: "Balanced",
    fast: "Fastest path",
    lighter: "Lighter load",
    explore: "More electives",
  }[value] || "Balanced";
}

function renderSchedule() {
  const profile = currentProfile();
  const terms = buildTerms(profile);
  const validation = validatePlan(terms, profile);
  const unresolved = buildUnresolved(profile, validation);

  selectors.scheduleBoard.innerHTML = terms.map((term, index) => renderTerm(term, index, profile)).join("");
  renderReasons(profile, validation);
  renderRequirements(validation.requirementResults);
  renderUncertainty(unresolved);
  renderMetrics(validation, unresolved);
  renderComparison(profile);

  document.querySelector("#priorityMode").textContent = paceName(profile.pace);
  document.querySelector("#scenarioSummary").textContent = scenarioSummary(profile, validation);
}

function renderTerm(term, index, profile) {
  const items = normalizeTerm(term);
  const season = termSeason(index, profile.startTerm);
  const credits = items.reduce((sum, course) => sum + course.credits, 0);
  const overloadClass = credits > profile.maxCredits ? "overload" : "";

  return `
    <article class="term-card ${overloadClass}">
      <div class="term-header">
        <div>
          <h3>${termLabel(index, profile.startTerm)}</h3>
          <span>${season} planning window</span>
        </div>
        <span>${credits} credits</span>
      </div>
      <div class="course-list">
        ${items.map((course) => renderCoursePill(course, season)).join("")}
      </div>
    </article>
  `;
}

function renderCoursePill(course, season) {
  const unavailable = course.terms && !course.terms.includes(season);
  const warn = course.demand === "high" || unavailable ? "warn" : "";
  const prereq = course.prereq.length ? `Prereq: ${course.prereq.join(", ")}` : "No prerequisites";

  return `
    <div class="course-pill ${course.type} ${warn}">
      <strong>${escapeHtml(course.code)} - ${escapeHtml(course.name)}</strong>
      <p class="course-note">${escapeHtml(course.note)}</p>
      <div class="course-meta">
        <span class="tag">${course.type}</span>
        <span class="tag">${course.credits} cr</span>
        <span class="tag">${course.review}% review fit</span>
        <span class="tag ${course.demand === "high" ? "warn" : "ok"}">${course.demand} demand</span>
        ${unavailable ? `<span class="tag warn">term mismatch</span>` : ""}
      </div>
      <p class="course-note">${escapeHtml(prereq)}</p>
    </div>
  `;
}

function scenarioSummary(profile, validation) {
  if (validation.issues.length > 0) {
    return `${paceName(profile.pace)} path with ${validation.issues.length} item${validation.issues.length === 1 ? "" : "s"} requiring review.`;
  }
  if (profile.pace === "fast") return "Compressed path with heavier terms and less elective slack.";
  if (profile.pace === "lighter") return "Lower-load path that protects work and personal commitments.";
  if (profile.pace === "explore") return "Exploration-heavy path with extra design and ethics options.";
  return "Balanced path with prerequisite-safe sequencing.";
}

function renderReasons(profile, validation) {
  const reasons = [
    {
      title: "Requirements before preference",
      body: "The plan checks prerequisites and degree categories before ranking courses by interest fit.",
    },
    {
      title: "Workload fit",
      body: profile.workHours >= 16
        ? "Reported work hours triggered a lower-load schedule and more advisor review for high-demand courses."
        : "Terms stay close to the selected credit cap while preserving steady graduation progress.",
    },
    {
      title: "Interest match",
      body: interestRationale(profile.interests),
    },
    {
      title: "Confidence behavior",
      body: validation.confidence < 70
        ? "Confidence is reduced because the plan has policy, availability, or workload conflicts."
        : "Confidence is moderate because catalog rules are stronger than review data, but several public signals remain uncertain.",
    },
  ];

  selectors.reasonList.innerHTML = reasons.map((reason) => `
    <div class="audit-item">
      <strong>${escapeHtml(reason.title)}</strong>
      <p>${escapeHtml(reason.body)}</p>
    </div>
  `).join("");
}

function interestRationale(interests) {
  const text = interests.toLowerCase();
  if (text.includes("language") || text.includes("llm")) return "NLP, Human-AI Interaction, and Applied Deep Learning are emphasized because the profile mentions language models.";
  if (text.includes("design") || text.includes("human")) return "Human-AI Interaction, Cognition and Design, and User Research Studio are emphasized because the profile is human-centered.";
  if (text.includes("systems")) return "Operating Systems, Distributed Systems, and Databases are emphasized because the profile leans toward infrastructure.";
  return "AI depth courses are selected while preserving open electives for student-led exploration.";
}

function renderRequirements(requirementResults) {
  selectors.requirementList.innerHTML = requirementResults.map((item) => `
    <div class="requirement-item">
      <span class="check-icon ${item.complete ? "" : "warn"}">${item.complete ? "OK" : "!"}</span>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${item.matched.length}/${item.required} matched: ${escapeHtml(item.matched.join(", ") || "none yet")}</p>
      </div>
    </div>
  `).join("");
}

function renderUncertainty(unresolved) {
  selectors.uncertaintyList.innerHTML = unresolved.map((item) => `
    <div class="uncertain-item">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.body)}</p>
    </div>
  `).join("");

  document.querySelector("#handoffCount").textContent = `${unresolved.length} unresolved item${unresolved.length === 1 ? "" : "s"}`;
  document.querySelector("#advisorStatus").textContent = unresolved.length ? "Advisor review required" : "Ready for advisor signoff";
}

function renderMetrics(validation, unresolved) {
  const waitlistPercent = Math.min(100, validation.highDemand * 14);
  const loadPercent = Math.min(100, (validation.avgCredits / 18) * 100);
  document.querySelector("#coverageMetric").textContent = `${validation.coverage}%`;
  document.querySelector("#confidenceMetric").textContent = `${validation.confidence}%`;
  document.querySelector("#loadMetric").textContent = validation.avgCredits.toFixed(1);
  document.querySelector("#waitlistMetric").textContent = String(validation.highDemand);
  document.querySelector("#coverageMeter").style.width = `${validation.coverage}%`;
  document.querySelector("#confidenceMeter").style.width = `${validation.confidence}%`;
  document.querySelector("#sideConfidenceMeter").style.width = `${validation.confidence}%`;
  document.querySelector("#loadMeter").style.width = `${loadPercent}%`;
  document.querySelector("#waitlistMeter").style.width = `${waitlistPercent}%`;

  const statusDot = document.querySelector(".status-dot");
  statusDot.style.background = unresolved.length > 2 ? "#f1bb52" : "#55c18a";
}

function renderComparison(profile) {
  const scenarios = ["balanced", "fast", "lighter", "explore"];
  selectors.comparisonBoard.innerHTML = scenarios.map((pace) => {
    const terms = buildTerms({ ...profile, pace }, pace);
    const validation = validatePlan(terms, { ...profile, pace });
    return `
      <article class="comparison-card ${profile.pace === pace ? "active" : ""}">
        <strong>${paceName(pace)}</strong>
        <p>${terms.length} terms / ${validation.avgCredits.toFixed(1)} avg credits / ${validation.confidence}% confidence</p>
        <div class="mini-meter"><span style="width:${validation.confidence}%"></span></div>
        <button class="secondary-action" type="button" data-choose-pace="${pace}">${profile.pace === pace ? "Selected" : "Use scenario"}</button>
      </article>
    `;
  }).join("");
}

function renderCourses() {
  const query = document.querySelector("#courseSearchInput").value.trim().toLowerCase();
  const filter = document.querySelector("#courseFilterSelect").value;
  const relevantCodes = relevantCodesFor(currentProfile());

  const filtered = courses.filter((course) => {
    const haystack = `${course.code} ${course.name} ${course.topics.join(" ")} ${course.note}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesFilter = filter === "all" || course.type === filter || course.demand === filter;
    return relevantCodes.includes(course.code) && matchesQuery && matchesFilter;
  });

  selectors.courseGrid.innerHTML = filtered.map((course) => `
    <article class="course-card">
      <span class="course-status">${course.type}</span>
      <h3>${escapeHtml(course.code)} - ${escapeHtml(course.name)}</h3>
      <p>${escapeHtml(course.note)}</p>
      <div class="tag-row">
        <span class="tag">${course.credits} credits</span>
        <span class="tag">${course.terms.join(" / ")}</span>
        <span class="tag ${course.demand === "high" ? "warn" : "ok"}">${course.demand} demand</span>
      </div>
      <p>Prerequisites: ${escapeHtml(course.prereq.join(", ") || "none")}</p>
      <div class="mini-meter" aria-label="${course.review}% review fit"><span style="width:${course.review}%"></span></div>
    </article>
  `).join("");
}

function renderEvidence() {
  selectors.sourceGrid.innerHTML = evidenceFor(currentProfile()).map((item) => `
    <article class="source-card">
      <span class="course-status">${escapeHtml(item.source)}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
      ${item.url ? `<a class="source-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Open official source</a>` : ""}
      <div class="mini-meter" aria-label="${item.score}% confidence"><span style="width:${item.score}%"></span></div>
    </article>
  `).join("");
}

function renderRisks() {
  selectors.riskGrid.innerHTML = risks.map((item) => `
    <article class="risk-card ${item.level}">
      <span class="course-status">${escapeHtml(item.level)} risk</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
      <div class="mini-meter" aria-label="${item.score}% risk"><span style="width:${item.score}%"></span></div>
    </article>
  `).join("");

  selectors.safeguardList.innerHTML = safeguards.map((item) => `
    <div class="safeguard">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.body)}</p>
    </div>
  `).join("");
}

function sanitizedCircumstances(profile) {
  const labels = {
    commuter: "commuting constraint",
    firstGen: "may benefit from advisor context",
    accessibility: "accessibility scheduling needs human review",
    athlete: "recurring time blocks",
    coop: "co-op sequencing",
    transfer: "transfer credit verification",
  };
  return profile.circumstances.map((item) => labels[item]).filter(Boolean);
}

function buildPrompt(profile = currentProfile()) {
  const relevantCodes = relevantCodesFor(profile);
  const publicCourseData = courses
    .filter((course) => course.code !== "OPEN 3xx" && relevantCodes.includes(course.code))
    .map((course) => `${course.code}: ${course.name}; credits=${course.credits}; type=${course.type}; prereq=${course.prereq.join(", ") || "none"}; offered=${course.terms.join("/")}; review_fit=${course.review}; demand=${course.demand}`)
    .join("\n");

  return `You are a UBC Vancouver course scheduling assistant for a prototype planning tool. Review a full-degree schedule for ${programName(profile)}.

Important scope note:
- The requirement structure below is derived from official UBC Calendar sources.
- Course review, demand, and term availability signals are prototype estimates.
- Do not present this as an official UBC degree audit.
- If a requirement needs current UBC calendar verification, return an advisor_review item.

Student context:
- Program: ${programName(profile)}
- Interests: ${profile.interests}
- Weekly work hours: ${profile.workHours}
- Preferred objective: ${paceName(profile.pace)}
- Max credits per term: ${profile.maxCredits}
- Start term: ${profile.startTerm}
- Minimized circumstances: ${sanitizedCircumstances(profile).join(", ") || "none"}

Course and review evidence:
${publicCourseData}

Decision policy:
1. Prioritize prerequisite correctness and official degree completion above student preference.
2. Treat catalog data as stronger than Reddit review data.
3. Never invent requirements, prerequisites, course availability, or transfer-credit rules.
4. If a requirement cannot be verified, return an advisor_review item instead of finalizing it.
5. Preserve elective exploration unless the student explicitly requests the fastest path.
6. List high-demand courses, waitlist risks, and backup recommendations.
7. Include privacy_notes explaining what sensitive details were excluded.

Return JSON with terms, rationale, confidence, unresolved_questions, waitlist_backups, requirement_checklist, ubc_calendar_verification_needed, and privacy_notes.`;
}

function buildExportPacket() {
  const profile = currentProfile();
  const terms = buildTerms(profile);
  const validation = validatePlan(terms, profile);
  const unresolved = buildUnresolved(profile, validation);

  const termText = terms.map((term, index) => {
    const items = normalizeTerm(term);
    return `${termLabel(index, profile.startTerm)} (${items.reduce((sum, course) => sum + course.credits, 0)} credits)\n${items.map((course) => `- ${course.code}: ${course.name}`).join("\n")}`;
  }).join("\n\n");

  return `UBC COURSE SCHEDULER REVIEW PACKET

Student profile
- Program: ${programName(profile)}
- Objective: ${paceName(profile.pace)}
- Weekly work hours: ${profile.workHours}
- Max credits per term: ${profile.maxCredits}
- Start term: ${profile.startTerm}
- Circumstance labels: ${sanitizedCircumstances(profile).join(", ") || "none"}
- Interests: ${profile.interests}

Summary
- Requirement coverage: ${validation.coverage}%
- Recommendation confidence: ${validation.confidence}%
- Average credits: ${validation.avgCredits.toFixed(1)}
- High-demand flags: ${validation.highDemand}
- Advisor-review items: ${unresolved.length}

Recommended schedule
${termText}

Requirement checklist
${validation.requirementResults.map((item) => `- ${item.complete ? "OK" : "REVIEW"} ${item.title}: ${item.matched.length}/${item.required} (${item.matched.join(", ") || "none"})`).join("\n")}

Advisor handoff
${unresolved.map((item) => `- ${item.title}: ${item.body}`).join("\n")}

AI safety notes
- This is a planning aid, not an official UBC degree audit.
- The requirement structure is based on official UBC Calendar sources, but simulated review/demand/availability signals are not official.
- The current UBC Academic Calendar, Workday registration data, and advisor policy should override generated recommendations.
- Sensitive student circumstances should be minimized before API calls.
- Unresolved items should be reviewed by a human advisor before registration.`;
}

function showToast(message) {
  selectors.toast.textContent = message;
  selectors.toast.classList.add("show");
  window.setTimeout(() => selectors.toast.classList.remove("show"), 2600);
}

function applyTheme(theme) {
  const resolvedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = resolvedTheme;
  const button = document.querySelector("#themeButton");
  if (button) {
    button.textContent = resolvedTheme === "dark" ? "Light mode" : "Dark mode";
    button.setAttribute("aria-label", `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`);
  }
}

function savedOrPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
  showToast(`${nextTheme === "dark" ? "Dark" : "Light"} mode enabled.`);
}

async function copyText(value, successMessage) {
  await navigator.clipboard.writeText(value);
  showToast(successMessage);
}

function saveProfile() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentProfile()));
  showToast("Profile saved in this browser.");
}

function resetProfile() {
  localStorage.removeItem(STORAGE_KEY);
  applyProfile({
    major: "cs-ai",
    specialization: "ai",
    interests: "I like applied machine learning, language models, human-centered products, and I want a manageable third year because I work part-time.",
    workHours: 14,
    maxCredits: 15,
    startTerm: "fall",
    pace: "balanced",
    circumstances: ["commuter"],
  });
  renderAll();
  showToast("Profile reset.");
}

async function sendToApi() {
  const apiState = document.querySelector("#apiState");
  const modelOutput = document.querySelector("#modelOutput p");

  apiState.textContent = "Asking Gemma";
  modelOutput.textContent = "Waiting for local model response...";

  try {
    const prompt = buildPrompt();
    const response = await fetch("/api/lmstudio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, profile: currentProfile() }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const content = extractModelContent(data);
    apiState.textContent = "Gemma connected";
    modelOutput.textContent = content || "Response received, but no message content was found.";
    showToast("Local model response received. The deterministic plan remains visible for audit.");
  } catch (error) {
    apiState.textContent = "LM Studio ready";
    modelOutput.textContent = "The deterministic planner is still available. Check that LM Studio is running on port 1234 with google/gemma-4-e4b loaded.";
    showToast(`Local Gemma call failed: ${error.message}`);
  }
}

function extractModelContent(data) {
  if (typeof data === "string") return data;
  if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content;
  if (data?.choices?.[0]?.message?.reasoning_content) {
    return "Gemma connected, but LM Studio returned reasoning-only output without a final response. The deterministic schedule remains available; try clicking again or disable reasoning traces for this model in LM Studio.";
  }
  if (data?.choices?.[0]?.text) return data.choices[0].text;
  if (data?.error) return data.error;
  if (data?.message?.content) return data.message.content;
  if (data?.content) return data.content;
  return "";
}

function setScheduleView(view) {
  activeScheduleView = view;
  document.querySelectorAll(".toggle-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.scheduleView === view);
  });
  selectors.scheduleBoard.classList.toggle("hidden", view !== "terms");
  selectors.comparisonBoard.classList.toggle("hidden", view !== "compare");
}

function renderAll() {
  renderSchedule();
  renderCourses();
  renderEvidence();
  renderRisks();
  setScheduleView(activeScheduleView);
}

function openExportDialog() {
  selectors.exportText.value = buildExportPacket();
  selectors.exportDialog.showModal();
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.view}View`).classList.add("active-view");
  });
});

document.querySelector("#studentForm").addEventListener("input", renderAll);
document.querySelector("#majorSelect").addEventListener("input", () => {
  updateProgramUi();
  renderAll();
});
document.querySelector("#generateButton").addEventListener("click", () => {
  renderAll();
  showToast("Plan regenerated with current constraints.");
});
document.querySelector("#saveButton").addEventListener("click", saveProfile);
document.querySelector("#resetButton").addEventListener("click", resetProfile);
document.querySelector("#exportButton").addEventListener("click", openExportDialog);
document.querySelector("#themeButton").addEventListener("click", toggleTheme);
document.querySelector("#copyPromptButton").addEventListener("click", () => copyText(buildPrompt(), "LLM prompt copied."));
document.querySelector("#copyExportButton").addEventListener("click", () => copyText(selectors.exportText.value, "Review packet copied."));
document.querySelector("#sendApiButton").addEventListener("click", sendToApi);
document.querySelector("#courseSearchInput").addEventListener("input", renderCourses);
document.querySelector("#courseFilterSelect").addEventListener("input", renderCourses);

document.querySelectorAll(".toggle-button").forEach((button) => {
  button.addEventListener("click", () => setScheduleView(button.dataset.scheduleView));
});

selectors.comparisonBoard.addEventListener("click", (event) => {
  const button = event.target.closest("[data-choose-pace]");
  if (!button) return;
  setPace(button.dataset.choosePace);
  renderAll();
  showToast(`${paceName(button.dataset.choosePace)} scenario selected.`);
});

const savedProfile = localStorage.getItem(STORAGE_KEY);
applyTheme(savedOrPreferredTheme());
if (savedProfile) {
  try {
    applyProfile(JSON.parse(savedProfile));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

renderAll();
