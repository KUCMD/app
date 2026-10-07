// Public (no sign-in) pages: language, home, about pages, rating/suggestion/complaint,
// and the User / University staff / Companies categories.
import { route, go, view, esc, setTop, hideTop, toast, busy, attachmentPicker, uploadFiles, fb, db, state, firebaseError, uid } from "./core.js";
import { t, L, setLang, getLang } from "./i18n.js";
import { HOTLINE, WHATSAPP, INSTAGRAM } from "./config.js";
import { UNITS, RATING_FORMS, RATING_QUESTIONS, SERVICE_CATALOG } from "./data.js";

const homeIcon = `<svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>`;

// ---- language ----
route("/lang", () => {
  hideTop();
  view().innerHTML = `
    <div class="splash">
      <div class="logo">${homeIcon}</div>
      <p class="uni">جامعة الكويت<br><span class="muted">الأمانة العامة</span></p>
      <p class="dept">إدارة الإنشاءات والصيانة</p>
      <p class="en">Kuwait University · General Secretary Office<br>Department of Construction &amp; Maintenance</p>
      <p style="margin-top:18px"><b>مرحبا بك · Welcome</b><br><span class="muted">اختر اللغة · Choose language</span></p>
      <div class="lang-row">
        <button class="pill sky fill" data-lang="en">English</button>
        <button class="pill fill" data-lang="ar">العربية</button>
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
  setTop(t("app_name"), { home: false, settings: !!state.profile });
  view().innerHTML = `
    <div class="grid2">
      <a class="pill sky" href="#/about">${esc(t("about"))}</a>
      <a class="pill sky" href="#/vision">${esc(t("vision"))}</a>
      <a class="pill sky" href="#/mission">${esc(t("mission"))}</a>
      <a class="pill sky" href="#/goals">${esc(t("goals"))}</a>
      <a class="pill sky" href="#/structure">${esc(t("structure"))}</a>
      <a class="pill sky" href="#/contact">${esc(t("contact"))}</a>
    </div>

    <h2 class="section center">${esc(t("rate_dept"))}</h2>
    <div class="grid3">
      <a class="pill sun sm" href="#/rate">${esc(t("rating_forms"))}</a>
      <a class="pill sun sm" href="#/suggest">${esc(t("suggest"))}</a>
      <a class="pill sun sm" href="#/complain">${esc(t("complain"))}</a>
    </div>

    <h2 class="section center">${esc(t("services_pick"))}</h2>
    <div class="stack">
      <a class="pill sun" href="#/employee">${esc(t("cat_employee"))}</a>
      <a class="pill" href="#/cat/user">${esc(t("cat_user"))}</a>
      <a class="pill" href="#/cat/staff">${esc(t("cat_staff"))}</a>
      <a class="pill sky" href="#/cat/company">${esc(t("cat_company"))}</a>
    </div>

    <div class="hotline">
      <div>${esc(t("hotline_title"))}</div>
      <div class="num">${HOTLINE}</div>
    </div>
    <div class="hotline-actions">
      <a class="pill wa" href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">WhatsApp · ${esc(t("send"))}</a>
      <a class="pill call" href="tel:${HOTLINE}">☎ ${esc(t("call"))}</a>
    </div>
    <p class="bottom-note">KU-CMD · <a href="#/lang">${getLang() === "ar" ? "English" : "العربية"}</a></p>`;
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
    ${line("contact_sec_manager", "24984459")}
    ${line("contact_sec_contracts", "24984598")}
    ${line("contact_sec_design", "24984598")}
    ${line("contact_sec_maint", "24984446")}
    <div class="contact-line"><span>${esc(t("hotline_title"))}</span><a href="tel:${HOTLINE}">${HOTLINE}</a></div>
    <h2 class="section center">${esc(t("social"))}</h2>
    <p class="center"><a class="pill sky" href="https://instagram.com/${INSTAGRAM}" target="_blank" rel="noopener">Instagram · ${INSTAGRAM}</a></p>`)();
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
    view().innerHTML = `<div class="result"><div class="mark ok">✓</div><h2>${esc(t("sent_ok"))}</h2><p class="muted">${esc(t("thanks_feedback"))}</p><a class="pill fill" href="#/">${esc(t("close"))}</a></div>`;
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
      <button class="pill fill" type="submit">${esc(t("send"))}</button>
    </form>`;
  att.bind(view());
  $("#f").onsubmit = (e) => { e.preventDefault(); submitFeedback(e.target, kind, extra, att.files); };
}
route("/suggest", () => textForm("suggestion", "suggest", "write_suggestion"));
route("/complain", () => textForm("complain", "complain", "write_complaint"));
route("/rate", () => {
  setTop(t("app_name"));
  view().innerHTML = `<h1 class="page-title">${esc(t("rating_forms"))}</h1><p class="center muted">${esc(t("satisfaction_survey"))}</p>
    <div class="stack">${Object.entries(RATING_FORMS).map(([k, v]) => `<a class="pill" href="#/rate/${k}">${esc(L(v))}</a>`).join("")}</div>`;
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
      <button class="pill fill" type="submit">${esc(t("send"))}</button>
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
    <h1 class="page-title">${esc(title)}</h1>
    <p class="center muted">${esc(t("user_home_hint"))}</p>
    <div class="stack">
      <a class="pill" href="#/services/${cat}">${esc(t("dept_services"))}</a>
      <a class="pill" href="#/faq">${esc(t("faq"))}</a>
      <a class="pill" href="#/inquiry/${cat}">${esc(t("submit_inquiry"))}</a>
      <a class="pill" href="#/contact">${esc(t("contact"))}</a>
      ${cat === "user" ? `<a class="pill" href="#/complain">${esc(t("complain"))}</a><a class="pill" href="#/suggest">${esc(t("suggest"))}</a>` : ""}
      ${cat === "company" ? `<a class="pill sky" href="#/contracts">${esc(t("contracts"))}</a>` : ""}
    </div>`;
});
route("/faq", () => simplePage(t("faq"), `<p class="lead" style="white-space:pre-wrap">${esc(t("faq_body"))}</p>`)());
route("/contracts", () => simplePage(t("contracts"), `<p class="lead">${esc(t("contracts_body"))}</p><a class="pill fill" href="#/inquiry/company">${esc(t("submit_inquiry"))}</a>`)());
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
      <button class="pill fill" type="submit">${esc(t("send"))}</button>
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
      <button class="pill fill" type="submit">${esc(t("request_service"))}</button>
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
