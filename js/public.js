// Public (no sign-in) pages: language, home, about pages, rating/suggestion/complaint,
// and the User / University staff / Companies categories.
import { route, go, view, esc, setTop, hideTop, toast, busy, attachmentPicker, uploadFiles, fb, db, state, firebaseError, uid, brandHero, todayLabel } from "./core.js";
import { I } from "./icons.js";
import { t, L, setLang, getLang } from "./i18n.js";
import { HOTLINE, WHATSAPP, INSTAGRAM } from "./config.js";
import { UNITS, RATING_FORMS, RATING_QUESTIONS, SERVICE_CATALOG } from "./data.js";

export const tile = (href, icon, label, cls = "", sub = "") => `<a class="tile ${cls}" href="#${href}"><span class="ic">${icon}</span><span>${esc(label)}${sub ? `<br><span class="sub">${esc(sub)}</span>` : ""}</span></a>`;
export const emergencyCard = () => `
    <div class="emg">
      <div class="t">${esc(t("emergency"))} · EMERGENCY</div>
      <div class="sub">${esc(t("maintenance_section"))} · ${esc(t("hotline_title"))}</div>
      <div class="num">${HOTLINE}</div>
      <div class="acts">
        <a class="btn call" href="tel:${HOTLINE}">${I.phone} ${esc(t("call"))}</a>
        <a class="btn wa" href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">${I.whatsapp} WhatsApp</a>
      </div>
    </div>`;


// ---- language ----
route("/lang", () => {
  hideTop();
  view().innerHTML = `
    <div class="splash">
      <div class="shield"><img src="icons/ku-shield.png" alt="Kuwait University"></div>
      <p class="uni">جامعة الكويت · Kuwait University</p>
      <p class="dept">إدارة الإنشاءات والصيانة</p>
      <p class="en">Department of Construction &amp; Maintenance</p>
      <p style="margin-top:22px;opacity:.9"><b>مرحبا بك · Welcome</b><br><span style="opacity:.8;font-size:13px">اختر اللغة · Choose language</span></p>
      <div class="lang-row">
        <button class="btn sky" data-lang="en">English</button>
        <button class="btn" data-lang="ar">العربية</button>
      </div>
    </div>`;
  view().querySelectorAll("[data-lang]").forEach(b => b.onclick = () => { setLang(b.dataset.lang); go("/"); });
});

// ---- home ----
route("/", () => {
  if (!getLang()) return go("/lang");
  // signed-in employee with a favourite page lands there
  const fav = state.profile?.favPage;
  if (state.profile?.status === "approved" && fav && fav !== "home" && !sessionStorage.getItem("kucmd_fav_done")) {
    sessionStorage.setItem("kucmd_fav_done", "1");
    const map = { dashboard: "/dashboard", emergency: "/emergency", inbox: "/inbox", complaints: "/feedback/complaint", requests: "/feedback/request", suggestions: "/feedback/suggestion" };
    if (map[fav]) return go(map[fav]);
  }
  setTop("", { hero: brandHero(`<div class="date" style="justify-content:center;margin-top:8px">${esc(todayLabel())}</div>`), back: false });
  view().innerHTML = `
    <h2 class="section">${esc(t("services_pick"))}</h2>
    <div class="tiles">
      ${tile("/employee", I.badge, t("cat_employee"), "sun")}
      ${tile("/cat/user", I.user, t("cat_user"))}
      ${tile("/cat/staff", I.building, t("cat_staff"), "navy")}
      ${tile("/cat/company", I.briefcase, t("cat_company"), "green")}
    </div>

    <h2 class="section">${esc(t("rate_dept"))}</h2>
    <div class="tiles cols3">
      ${tile("/rate", I.star, t("rating_forms"), "sun")}
      ${tile("/suggest", I.bulb, t("suggest"))}
      ${tile("/complain", I.alert, t("complain"), "red")}
    </div>

    <h2 class="section">${esc(t("about_dept"))}</h2>
    <div class="rows">
      ${[["/about", I.info, t("about")], ["/vision", I.eye, t("vision")], ["/mission", I.flag, t("mission")], ["/goals", I.target, t("goals")], ["/structure", I.tree, t("structure")], ["/contact", I.phone, t("contact")]]
        .map(([h, i, l]) => `<a class="row-item" href="#${h}"><span class="ic">${i}</span><span class="grow">${esc(l)}</span><span class="chev">${I.chevron}</span></a>`).join("")}
    </div>

    ${emergencyCard()}
    <p class="bottom-note">KU-CMD · ${esc(t("university"))}</p>`;
});

// ---- about pages ----
const simplePage = (title, bodyHtml) => () => {
  setTop(t("app_name"));
  view().innerHTML = `<h1 class="page-title">${esc(title)}</h1>${bodyHtml}`;
};
route("/about", () => simplePage(t("about_title"), `<p class="lead">${esc(t("about_p1"))}</p><p class="lead">${esc(t("about_p2"))}</p>`)());
route("/vision", () => simplePage(t("vision"), `<p class="lead" style="font-size:22px;text-align:center;color:var(--green-deep)">${esc(t("vision_text"))}</p>`)());
route("/mission", () => simplePage(t("mission"), `<p class="lead">${esc(t("mission_text"))}</p>`)());
route("/goals", () => simplePage(t("goals_title"), `<ul class="lead" style="padding-inline-start:22px">${["goal1", "goal2", "goal3", "goal4"].map(k => `<li>${esc(t(k))}</li>`).join("")}</ul>`)());
route("/structure", () => {
  const children = (pid) => UNITS.filter(u => u.parent === pid && u.id !== "secretariat");
  const node = (u, lvl) => `<li><span class="node lvl${lvl}">${esc(L(u))}</span>${children(u.id).length ? `<ul>${children(u.id).map(c => node(c, lvl + 1)).join("")}</ul>` : ""}</li>`;
  simplePage(t("structure"), `<div class="tree"><ul><li><span class="node root">${esc(t("app_name"))}</span><ul>${children("manager").map(c => node(c, 1)).join("")}</ul></li></ul></div>`)();
});
route("/contact", () => {
  const line = (k, n) => `<div class="contact-line"><span>${esc(t(k))}</span><a href="tel:${n}">${n}</a></div>`;
  simplePage(t("contact"), `
    <div class="rows">
    ${line("contact_sec_manager", "24984459")}
    ${line("contact_sec_contracts", "24984598")}
    ${line("contact_sec_design", "24984598")}
    ${line("contact_sec_maint", "24984446")}
    <div class="contact-line"><span>${esc(t("security_dept"))}</span><a href="tel:24983333">24983333</a></div>
    </div>
    ${emergencyCard()}
    <h2 class="section">${esc(t("social"))}</h2>
    <a class="btn sky" href="https://instagram.com/${INSTAGRAM}" target="_blank" rel="noopener">Instagram · ${INSTAGRAM}</a>`)();
});

// ---- feedback forms (rating / suggestion / complaint) ----
function contactFields(extra = "") {
  return `
    <div class="field"><label>${esc(t("name"))}</label><input name="name" required></div>
    <div class="field"><label>${esc(t("title"))}</label><input name="title"></div>
    <div class="field"><label>${esc(t("phone"))}</label><input name="phone" type="tel" inputmode="tel" required></div>
    <div class="field"><label>${esc(t("email"))}</label><input name="email" type="email"></div>
    ${extra}`;
}
async function submitFeedback(form, kind, extra = {}, files = []) {
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  if (!data.name || !data.phone) { toast(t("required"), true); return false; }
  busy(true);
  try {
    const attachments = files.length ? await uploadFiles(files, `feedback/${kind}`) : [];
    await fb.addDoc(fb.collection(db, "feedback"), {
      kind, ...data, ...extra, attachments, status: "new", byUid: uid(), lang: getLang(), createdAt: fb.serverTimestamp()
    });
    view().innerHTML = `<div class="result"><div class="mark ok">✓</div><h2>${esc(t("sent_ok"))}</h2><p class="muted">${esc(t("thanks_feedback"))}</p><div class="stack"><a class="btn" href="#/">${esc(t("close"))}</a></div></div>`;
    return true;
  } catch (e) { toast(firebaseError(e), true); return false; }
  finally { busy(false); }
}
function textForm(kind, titleKey, placeholderKey, extra = {}) {
  setTop(t("app_name"));
  const att = attachmentPicker();
  view().innerHTML = `
    <h1 class="page-title">${esc(t(titleKey))}</h1>
    <form class="form" id="f">
      <div class="field"><label>${esc(t(placeholderKey))}</label><textarea name="text" required></textarea></div>
      ${contactFields()}
      ${att.html}
      <button class="btn" type="submit">${esc(t("send"))}</button>
    </form>`;
  att.bind(view());
  $("#f").onsubmit = (e) => { e.preventDefault(); submitFeedback(e.target, kind, extra, att.files); };
}
route("/suggest", () => textForm("suggestion", "suggest", "write_suggestion"));
route("/complain", () => textForm("complain", "complain", "write_complaint"));
route("/rate", () => {
  setTop(t("app_name"));
  view().innerHTML = `<h1 class="page-title">${esc(t("rating_forms"))}</h1><p class="center muted">${esc(t("satisfaction_survey"))}</p>
    <div class="tiles">${Object.entries(RATING_FORMS).map(([k, v], i) => tile("/rate/" + k, [I.wrench, I.wave, I.hardhat][i], L(v), ["sky", "green", "sun"][i])).join("")}</div>`;
});
route("/rate/:form", ({ form }) => {
  setTop(t("app_name"));
  const f = RATING_FORMS[form]; if (!f) return go("/rate");
  const scores = {};
  view().innerHTML = `
    <h1 class="page-title">${esc(L(f))}</h1>
    <p class="center muted">${esc(t("rate_hint"))}</p>
    <form class="form" id="f">
      ${RATING_QUESTIONS.map(q => `<div class="rate-q"><p>${esc(L(q))}</p><div class="stars" data-q="${q.id}">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}">★</button>`).join("")}</div></div>`).join("")}
      <div class="field"><label>${esc(t("comments"))}</label><textarea name="text"></textarea></div>
      ${contactFields()}
      <button class="btn" type="submit">${esc(t("send"))}</button>
    </form>`;
  view().querySelectorAll(".stars").forEach(s => s.querySelectorAll("button").forEach(b => b.onclick = () => {
    scores[s.dataset.q] = +b.dataset.n;
    s.querySelectorAll("button").forEach(x => x.classList.toggle("on", +x.dataset.n <= +b.dataset.n));
  }));
  $("#f").onsubmit = (e) => {
    e.preventDefault();
    if (Object.keys(scores).length < RATING_QUESTIONS.length) { toast(t("rate_hint"), true); return; }
    submitFeedback(e.target, "rating", { form, scores });
  };
});

// ---- categories: user / university staff / companies ----
route("/cat/:cat", ({ cat }) => {
  setTop(t("app_name"));
  const title = { user: t("cat_user"), staff: t("cat_staff"), company: t("cat_company") }[cat] || t("cat_user");
  view().innerHTML = `
    <div class="seg">${[["user", t("cat_user")], ["staff", t("cat_staff")], ["company", t("cat_company")]].map(([k, l]) => `<button class="${k === cat ? "on" : ""}" data-c="${k}">${esc(l)}</button>`).join("")}</div>
    <h1 class="page-title">${esc(title)}</h1>
    <div class="tiles">
      ${tile("/services/" + cat, I.wrench, t("dept_services"), "sky")}
      ${tile("/inquiry/" + cat, I.mail, t("submit_inquiry"), "navy")}
      ${tile("/faq", I.question, t("faq"))}
      ${tile("/contact", I.phone, t("contact"), "green")}
      ${cat === "user" ? tile("/complain", I.alert, t("complain"), "red") + tile("/suggest", I.bulb, t("suggest"), "sun") : ""}
      ${cat === "company" ? tile("/contracts", I.file, t("contracts"), "sun") : ""}
    </div>
    ${emergencyCard()}`;
  view().querySelectorAll("[data-c]").forEach(b => b.onclick = () => go("/cat/" + b.dataset.c));
});
route("/faq", () => simplePage(t("faq"), `<p class="lead" style="white-space:pre-wrap">${esc(t("faq_body"))}</p>`)());
route("/contracts", () => simplePage(t("contracts"), `<p class="lead">${esc(t("contracts_body"))}</p><a class="btn" style="margin-top:12px" href="#/inquiry/company">${esc(t("submit_inquiry"))}</a>`)());
route("/inquiry/:cat", ({ cat }) => {
  setTop(t("app_name"));
  const att = attachmentPicker();
  view().innerHTML = `
    <h1 class="page-title">${esc(t("submit_inquiry"))}</h1>
    <form class="form" id="f">
      <div class="field"><label>${esc(t("choose_entity"))}</label><select name="unit" required><option value="">${esc(t("choose"))}</option>${UNITS.filter(u => u.kind !== "office").map(u => `<option value="${u.id}">${esc(L(u))}</option>`).join("")}</select></div>
      <div class="field"><label>${esc(t("subject"))}</label><input name="subject" required></div>
      <div class="field"><label>${esc(t("details"))}</label><textarea name="text" required></textarea></div>
      ${contactFields(cat === "company" ? `<div class="field"><label>${esc(t("org_name"))}</label><input name="org" required></div>` : "")}
      ${att.html}
      <button class="btn" type="submit">${esc(t("send"))}</button>
    </form>`;
  att.bind(view());
  $("#f").onsubmit = (e) => { e.preventDefault(); submitFeedback(e.target, "inquiry", { category: cat }, att.files); };
});
route("/services/:cat", ({ cat }) => {
  setTop(t("app_name"));
  const att = attachmentPicker();
  const unitOpts = [...new Set(SERVICE_CATALOG.map(s => s.unit))].map(id => UNITS.find(u => u.id === id));
  view().innerHTML = `
    <h1 class="page-title">${esc(t("dept_services"))}</h1>
    <form class="form" id="f">
      <div class="field"><label>${esc(t("choose_entity"))}</label><select name="unit" id="unit" required><option value="">${esc(t("choose"))}</option>${unitOpts.map(u => `<option value="${u.id}">${esc(L(u))}</option>`).join("")}</select></div>
      <div class="field"><label>${esc(t("choose_service"))}</label><select name="service" id="service" required><option value="">${esc(t("choose"))}</option></select></div>
      <div class="field"><label>${esc(t("location"))}</label><input name="location" required></div>
      <div class="field"><label>${esc(t("details"))}</label><textarea name="text"></textarea></div>
      ${contactFields(cat === "company" ? `<div class="field"><label>${esc(t("org_name"))}</label><input name="org" required></div>` : "")}
      ${att.html}
      <button class="btn" type="submit">${esc(t("request_service"))}</button>
    </form>`;
  att.bind(view());
  const unitSel = $("#unit"), svcSel = $("#service");
  const fill = () => { svcSel.innerHTML = `<option value="">${esc(t("choose"))}</option>` + SERVICE_CATALOG.filter(s => s.unit === unitSel.value).map(s => `<option>${esc(L(s))}</option>`).join(""); };
  unitSel.onchange = fill;
  $("#f").onsubmit = (e) => { e.preventDefault(); submitFeedback(e.target, "request", { category: cat }, att.files); };
});

// ---- generic helper for other modules ----
export { simplePage };
function $(sel) { return view().querySelector(sel); }
