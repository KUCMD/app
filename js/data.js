// Static reference data for KU-CMD. Every label has ar / en.

// Organisational units (also used as correspondence targets)
export const UNITS = [
  { id: "manager",      ar: "مكتب مدير الإدارة",            en: "Director's Office",                 parent: null,       kind: "office" },
  { id: "secretariat",  ar: "سكرتارية مدير الإدارة",        en: "Director's Secretariat",            parent: "manager",  kind: "office" },
  { id: "technical",    ar: "المكتب الفني",                 en: "Technical Office",                  parent: "manager",  kind: "dept" },
  { id: "support",      ar: "قسم الخدمات المساندة",         en: "Support Services Dept.",            parent: "manager",  kind: "dept" },
  { id: "sup_contracts",ar: "مكتب مراقب العقود والمتابعة",   en: "Contracts & Follow-up Supervisor",  parent: "manager",  kind: "supervisor" },
  { id: "contracts",    ar: "قسم العقود",                   en: "Contracts Dept.",                   parent: "sup_contracts", kind: "dept" },
  { id: "followup",     ar: "قسم المتابعة",                 en: "Follow-up Dept.",                   parent: "sup_contracts", kind: "dept" },
  { id: "sup_design",   ar: "مكتب مراقب التصميم والإشراف",   en: "Design & Supervision Supervisor",   parent: "manager",  kind: "supervisor" },
  { id: "design",       ar: "قسم التصميم",                  en: "Design Dept.",                      parent: "sup_design", kind: "dept" },
  { id: "supervision",  ar: "قسم الإشراف",                  en: "Supervision Dept.",                 parent: "sup_design", kind: "dept" },
  { id: "sup_maint",    ar: "مكتب مراقب الصيانة",           en: "Maintenance Supervisor",            parent: "manager",  kind: "supervisor" },
  { id: "zone1",        ar: "قسم صيانة المنطقة الأولى",     en: "Zone 1 Maintenance Dept.",          parent: "sup_maint", kind: "dept" },
  { id: "zone2",        ar: "قسم صيانة المنطقة الثانية",    en: "Zone 2 Maintenance Dept.",          parent: "sup_maint", kind: "dept" },
  { id: "zone3",        ar: "قسم صيانة المنطقة الثالثة",    en: "Zone 3 Maintenance Dept.",          parent: "sup_maint", kind: "dept" },
  { id: "zone4",        ar: "قسم صيانة المنطقة الرابعة",    en: "Zone 4 Maintenance Dept.",          parent: "sup_maint", kind: "dept" },
  { id: "agri",         ar: "قسم صيانة الزراعة",            en: "Agriculture Maintenance Dept.",     parent: "sup_maint", kind: "dept" }
];
export const unit = (id) => UNITS.find(u => u.id === id);
export const supervisorOf = (unitId) => {
  const u = unit(unitId); if (!u) return null;
  if (u.kind === "supervisor") return u.id;
  const p = unit(u.parent);
  return p && p.kind === "supervisor" ? p.id : null;
};

// Jobs per unit. role: manager | supervisor | head | staff
export const JOBS = [
  { id: "manager",                unit: "manager",      role: "manager",    ar: "مدير الإدارة",                     en: "Director" },
  { id: "manager_sec",            unit: "secretariat",  role: "staff",      ar: "سكرتارية مكتب مدير الإدارة",       en: "Director's Office Secretary" },
  { id: "tech_head",              unit: "technical",    role: "head",       ar: "رئيس المكتب الفني",                en: "Head of Technical Office" },
  { id: "tech_sec",               unit: "technical",    role: "staff",      ar: "سكرتير المكتب الفني",              en: "Technical Office Secretary" },
  { id: "tech_eng",               unit: "technical",    role: "staff",      ar: "مهندس المكتب الفني",               en: "Technical Office Engineer" },
  { id: "tech_staff",             unit: "technical",    role: "staff",      ar: "موظف المكتب الفني",                en: "Technical Office Staff" },
  { id: "support_head",           unit: "support",      role: "head",       ar: "رئيس قسم الخدمات المساندة",        en: "Head of Support Services" },
  { id: "support_sec",            unit: "support",      role: "staff",      ar: "سكرتير قسم الخدمات المساندة",      en: "Support Services Secretary" },
  { id: "support_staff",          unit: "support",      role: "staff",      ar: "موظف قسم الخدمات المساندة",        en: "Support Services Staff" },
  { id: "sup_contracts",          unit: "sup_contracts",role: "supervisor", ar: "مراقب العقود والمتابعة",           en: "Contracts & Follow-up Supervisor" },
  { id: "sup_contracts_sec",      unit: "sup_contracts",role: "staff",      ar: "سكرتير مراقب العقود والمتابعة",    en: "Contracts Supervisor Secretary" },
  { id: "contracts_head",         unit: "contracts",    role: "head",       ar: "رئيس قسم العقود",                  en: "Head of Contracts" },
  { id: "contracts_sec",          unit: "contracts",    role: "staff",      ar: "سكرتير قسم العقود",                en: "Contracts Secretary" },
  { id: "contracts_eng",          unit: "contracts",    role: "staff",      ar: "مهندس قسم العقود",                 en: "Contracts Engineer" },
  { id: "contracts_staff",        unit: "contracts",    role: "staff",      ar: "موظف قسم العقود",                  en: "Contracts Staff" },
  { id: "followup_head",          unit: "followup",     role: "head",       ar: "رئيس قسم المتابعة",                en: "Head of Follow-up" },
  { id: "followup_sec",           unit: "followup",     role: "staff",      ar: "سكرتير قسم المتابعة",              en: "Follow-up Secretary" },
  { id: "followup_eng",           unit: "followup",     role: "staff",      ar: "مهندس قسم المتابعة",               en: "Follow-up Engineer" },
  { id: "followup_staff",         unit: "followup",     role: "staff",      ar: "موظف قسم المتابعة",                en: "Follow-up Staff" },
  { id: "sup_design",             unit: "sup_design",   role: "supervisor", ar: "مراقب التصميم والإشراف",           en: "Design & Supervision Supervisor" },
  { id: "sup_design_sec",         unit: "sup_design",   role: "staff",      ar: "سكرتير مراقب التصميم والإشراف",    en: "Design Supervisor Secretary" },
  { id: "design_head",            unit: "design",       role: "head",       ar: "رئيس قسم التصميم",                 en: "Head of Design" },
  { id: "design_sec",             unit: "design",       role: "staff",      ar: "سكرتير قسم التصميم",               en: "Design Secretary" },
  { id: "design_eng",             unit: "design",       role: "staff",      ar: "مهندس قسم التصميم",                en: "Design Engineer" },
  { id: "design_draft",           unit: "design",       role: "staff",      ar: "رسام قسم التصميم",                 en: "Design Draftsman" },
  { id: "supervision_head",       unit: "supervision",  role: "head",       ar: "رئيس قسم الإشراف",                 en: "Head of Supervision" },
  { id: "supervision_sec",        unit: "supervision",  role: "staff",      ar: "سكرتير قسم الإشراف",               en: "Supervision Secretary" },
  { id: "supervision_eng",        unit: "supervision",  role: "staff",      ar: "مهندس قسم الإشراف",                en: "Supervision Engineer" },
  { id: "supervision_asst",       unit: "supervision",  role: "staff",      ar: "مساعد مهندس قسم الإشراف",          en: "Supervision Assistant Engineer" },
  { id: "supervision_draft",      unit: "supervision",  role: "staff",      ar: "رسام قسم الإشراف",                 en: "Supervision Draftsman" },
  { id: "supervision_qs",         unit: "supervision",  role: "staff",      ar: "حاسب كميات قسم الإشراف",           en: "Supervision Quantity Surveyor" },
  { id: "sup_maint",              unit: "sup_maint",    role: "supervisor", ar: "مراقب الصيانة",                    en: "Maintenance Supervisor" },
  { id: "sup_maint_sec",          unit: "sup_maint",    role: "staff",      ar: "سكرتير مراقب الصيانة",             en: "Maintenance Supervisor Secretary" },
  ...["zone1","zone2","zone3","zone4"].flatMap((z, i) => {
    const arZ = ["الأولى","الثانية","الثالثة","الرابعة"][i]; const enZ = `Zone ${i+1}`;
    return [
      { id: `${z}_head`, unit: z, role: "head",  ar: `رئيس قسم صيانة المنطقة ${arZ}`,    en: `Head of ${enZ} Maintenance` },
      { id: `${z}_sec`,  unit: z, role: "staff", ar: `سكرتير المنطقة ${arZ}`,            en: `${enZ} Secretary` },
      { id: `${z}_eng`,  unit: z, role: "staff", ar: `مهندس المنطقة ${arZ}`,             en: `${enZ} Engineer` },
      { id: `${z}_asst`, unit: z, role: "staff", ar: `مساعد مهندس المنطقة ${arZ}`,       en: `${enZ} Assistant Engineer` }
    ];
  }),
  { id: "agri_head",              unit: "agri",         role: "head",       ar: "رئيس قسم صيانة الزراعة",          en: "Head of Agriculture Maintenance" },
  { id: "agri_sec",               unit: "agri",         role: "staff",      ar: "سكرتير صيانة الزراعة",             en: "Agriculture Secretary" },
  { id: "agri_eng",               unit: "agri",         role: "staff",      ar: "مهندس صيانة الزراعة",              en: "Agriculture Engineer" },
  { id: "agri_asst",              unit: "agri",         role: "staff",      ar: "مساعد مهندس صيانة الزراعة",        en: "Agriculture Assistant Engineer" },
  { id: "agri_tech",              unit: "agri",         role: "staff",      ar: "فني صيانة الزراعة",                en: "Agriculture Technician" },
  { id: "agri_staff",             unit: "agri",         role: "staff",      ar: "موظف صيانة الزراعة",               en: "Agriculture Staff" }
];
export const job = (id) => JOBS.find(j => j.id === id);

// Emergency reporting targets
export const EMERGENCY_TARGETS = [
  { id: "supervision", ar: "طوارئ قسم الإشراف",             en: "Supervision Dept. Emergency" },
  { id: "zone1",       ar: "قسم المنطقة الأولى (Zone-1)",    en: "Zone-1" },
  { id: "zone2",       ar: "قسم المنطقة الثانية (Zone-2)",   en: "Zone-2" },
  { id: "zone3",       ar: "قسم المنطقة الثالثة (Zone-3)",   en: "Zone-3" },
  { id: "zone4",       ar: "قسم المنطقة الرابعة (Zone-4)",   en: "Zone-4" },
  { id: "all",         ar: "الطوارئ المشتركة (All Zones)",   en: "Shared Emergency (All Zones)" },
  { id: "jabriya",     ar: "الجابرية",                        en: "Jabriya" },
  { id: "agri",        ar: "الزراعة",                         en: "Agriculture" }
];
export const DANGERS = [
  { id: "fire",      ar: "حريق",        en: "Fire" },
  { id: "smoke",     ar: "دخان",        en: "Smoke" },
  { id: "gas",       ar: "تسرب غاز",    en: "Gas leak" },
  { id: "water",     ar: "تسرب مياه",   en: "Water leak" },
  { id: "collapse",  ar: "انهيار أرضي", en: "Ground collapse" },
  { id: "ceiling",   ar: "سقوط سقف",    en: "Ceiling fall" },
  { id: "wind",      ar: "رياح عاتية",  en: "Strong wind" },
  { id: "rain",      ar: "مطر غزير",    en: "Heavy rain" },
  { id: "dust",      ar: "غبار كثيف",   en: "Dense dust" },
  { id: "hail",      ar: "سقوط برد",    en: "Hail" }
];
export const TRADES = [
  { id: "electrical", ar: "كهرباء", en: "Electrical" },
  { id: "hvac",       ar: "تكييف",  en: "HVAC" },
  { id: "mechanical", ar: "ميكانيك", en: "Mechanical" },
  { id: "plumbing",   ar: "صحي",    en: "Plumbing" },
  { id: "civil",      ar: "مدني",   en: "Civil" }
];

// Correspondence / work item types
export const MSG_TYPES = [
  { id: "letter",  ar: "كتاب",         en: "Letter" },
  { id: "memo",    ar: "مذكرة",        en: "Memo" },
  { id: "report",  ar: "تقرير",        en: "Report" },
  { id: "task",    ar: "تكليف مهمة",   en: "Task assignment" },
  { id: "minutes", ar: "محضر اجتماع",  en: "Meeting minutes" },
  { id: "meeting", ar: "موعد اجتماع",  en: "Meeting appointment" },
  { id: "notice",  ar: "إشعار",        en: "Notice" }
];
export const MSG_STATUS = [
  { id: "new",       ar: "جديد",  en: "New" },
  { id: "ongoing",   ar: "جارية", en: "Ongoing" },
  { id: "postponed", ar: "مؤجلة", en: "Postponed" },
  { id: "done",      ar: "منجزة", en: "Done" }
];
export const MEETING_TYPES = [
  { id: "internal",  ar: "اجتماع داخلي",  en: "Internal meeting" },
  { id: "bids_open", ar: "فتح مظاريف",    en: "Bid opening" },
  { id: "bids_study",ar: "دراسة عطاءات",  en: "Bid evaluation" },
  { id: "other",     ar: "آخر",           en: "Other" }
];
export const SECTORS = [
  { id: "manager",       ar: "مدير الإدارة",           en: "Director" },
  { id: "sup_contracts", ar: "مراقبة العقود والمتابعة", en: "Contracts & Follow-up" },
  { id: "sup_design",    ar: "مراقبة التصميم والإشراف", en: "Design & Supervision" },
  { id: "sup_maint",     ar: "مراقبة الصيانة",          en: "Maintenance" }
];

// Settings: favourite start page
export const FAV_PAGES = [
  { id: "home",        ar: "الصفحة الرئيسية",           en: "Home page" },
  { id: "dashboard",   ar: "صفحة الإدارة",              en: "Department page" },
  { id: "emergency",   ar: "صفحة طوارئ الصيانة",        en: "Maintenance emergency page" },
  { id: "inbox",       ar: "الوارد",                    en: "Inbox" },
  { id: "complaints",  ar: "شكاوى المستخدم",            en: "User complaints" },
  { id: "requests",    ar: "طلبات المستخدم",            en: "User requests" },
  { id: "suggestions", ar: "مقترحات المستخدم",          en: "User suggestions" }
];

// Services catalogue for university staff / companies
export const SERVICE_CATALOG = [
  { unit: "zone1", ar: "طلب صيانة (كهرباء / تكييف / صحي / مدني)", en: "Maintenance request (electrical / HVAC / plumbing / civil)" },
  { unit: "agri",  ar: "طلب أعمال زراعية",                            en: "Landscaping / agriculture request" },
  { unit: "design",ar: "طلب تصميم أو تعديل مرفق",                    en: "Design or facility modification request" },
  { unit: "supervision", ar: "استفسار عن مشروع قائم",                en: "Inquiry about an ongoing project" },
  { unit: "contracts",   ar: "استفسار عن عقد أو مناقصة",             en: "Inquiry about a contract or tender" },
  { unit: "technical",   ar: "طلب بيانات فنية / مخططات",             en: "Technical data / drawings request" },
  { unit: "support",     ar: "خدمات مساندة",                          en: "Support services" }
];

export const RATING_FORMS = {
  maintenance:  { ar: "أعمال الصيانة",   en: "Maintenance works" },
  agriculture:  { ar: "أعمال الزراعة",   en: "Agriculture works" },
  construction: { ar: "أعمال الإنشاءات", en: "Construction works" }
};
export const RATING_QUESTIONS = [
  { id: "speed",   ar: "سرعة الاستجابة للطلب",       en: "Speed of response" },
  { id: "quality", ar: "جودة العمل المنفذ",          en: "Quality of the work" },
  { id: "staff",   ar: "تعامل الفريق الفني",         en: "Conduct of the technical team" },
  { id: "clean",   ar: "نظافة الموقع بعد الانتهاء",  en: "Site cleanliness afterwards" },
  { id: "overall", ar: "الرضا العام عن الخدمة",      en: "Overall satisfaction" }
];
