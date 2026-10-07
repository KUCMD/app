// Core: Firebase, app state, DOM helpers and the hash router.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut, updatePassword,
  reauthenticateWithCredential, EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where,
  getDocs, onSnapshot, serverTimestamp, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
import { firebaseConfig } from "./config.js";
import { t, getLang, L, setLang } from "./i18n.js";
import { I } from "./icons.js";
import { HOTLINE } from "./config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const fb = {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification,
  sendPasswordResetEmail, signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, getDocs, onSnapshot, serverTimestamp, arrayUnion,
  ref, uploadBytes, getDownloadURL
};

// ---------- state ----------
export const state = {
  user: null,        // firebase auth user
  profile: null,     // users/{uid} document
  settings: { active: true, delegates: {} },
  ready: false,
  unsub: []          // live listeners to tear down on route change
};

// ---------- DOM helpers ----------
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const view = () => $("#view");

export function toast(msg, isErr = false) {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = "toast"), 2600);
}
export const busy = (on) => { $("#loading").hidden = !on; };

// ---------- page chrome: top bar / hero / tab bar / drawer ----------
// setTop(title, { hero: html|null, tabs: bool, back: bool })
export function setTop(title, { hero = null, tabs = true, back = true } = {}) {
  const bar = $("#topbar"), h = $("#hero"), v = view();
  bar.hidden = false;
  bar.classList.toggle("on-hero", !!hero);
  $("#top-title").textContent = hero ? "" : (title || "");
  $("#btn-back").hidden = !back;
  if (hero) { h.innerHTML = hero; h.hidden = false; } else { h.hidden = true; h.innerHTML = ""; }
  v.classList.toggle("no-tabs", !tabs);
  drawTabs(tabs);
  // re-trigger page animation
  v.style.animation = "none"; void v.offsetWidth; v.style.animation = "";
}
export const hideTop = () => { $("#topbar").hidden = true; $("#hero").hidden = true; drawTabs(false); view().classList.add("no-tabs"); };

export function todayLabel() {
  return new Date().toLocaleDateString(getLang() === "ar" ? "ar-KW" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
export function brandHero(sub = "") {
  return `<div class="brand"><div class="shield"><img src="icons/ku-shield.png" alt="Kuwait University"></div>
    <p class="uni">${esc(t("university"))} · ${esc(t("gso"))}</p><p class="dept">${esc(t("app_name"))}</p>${sub}
    <div class="sun-bar"></div></div>`;
}

const tabState = { badge: 0 };
export function setTabBadge(n) { tabState.badge = n; const b = $("#tab-badge"); if (b) { b.textContent = n; b.hidden = !n; } }
function drawTabs(show) {
  const bar = $("#tabbar");
  bar.hidden = !show;
  if (!show) return;
  const emp = state.profile?.status === "approved";
  const tabs = emp ? [
    { h: "/dashboard", i: I.home, l: t("dashboard"), m: ["/dashboard"] },
    { h: "/inbox", i: I.inbox, l: t("inbox"), m: ["/inbox", "/msg"], badge: true },
    { h: "/emergency", i: I.alert, l: t("emergency"), m: ["/emergency"], cls: "red" },
    { h: "/", i: I.grid, l: t("services"), m: ["/", "/cat", "/rate"] },
    { h: "/settings", i: I.settings, l: t("settings"), m: ["/settings"] }
  ] : [
    { h: "/", i: I.home, l: t("home"), m: ["/"] },
    { h: "/cat/user", i: I.grid, l: t("services"), m: ["/cat", "/services", "/inquiry", "/faq", "/contracts"] },
    { h: "/complain", i: I.alert, l: t("complain"), m: ["/complain", "/suggest", "/rate"] },
    { h: "/contact", i: I.phone, l: t("contact_short"), m: ["/contact"] },
    { h: "/employee", i: I.user, l: t("cat_employee"), m: ["/employee"] }
  ];
  const path = current().path;
  bar.innerHTML = tabs.map(x => {
    const on = x.m.some(m => m === "/" ? path === "/" : path.startsWith(m));
    return `<a class="tab ${on ? "on" : ""} ${x.cls || ""}" href="#${x.h}">${x.i}<span>${esc(x.l)}</span>${x.badge ? `<span class="badge" id="tab-badge" ${tabState.badge ? "" : "hidden"}>${tabState.badge}</span>` : ""}</a>`;
  }).join("");
}

export function openDrawer() {
  const d = $("#drawer"), bd = $("#drawer-backdrop");
  const p = state.profile, emp = p?.status === "approved";
  const item = (href, icon, label) => `<a class="d-item" href="#${href}">${icon}<span class="grow">${esc(label)}</span></a>`;
  const group = (icon, label, links) => `<button class="d-item" data-group>${icon}<span class="grow">${esc(label)}</span><span class="arrow">${I.down}</span></button><div class="d-sub">${links.map(([h, l]) => `<a href="#${h}">${esc(l)}</a>`).join("")}</div>`;
  d.querySelector("#drawer-body").innerHTML = `
    <div class="who"><div class="avatar">${p ? esc((p.name || "?")[0]) : `<img src="icons/ku-shield.png" alt="">`}</div>
      <div><div class="name">${esc(p ? p.name : t("app_name"))}</div><div class="job">${esc(p ? L(jobLabel(p.job)) : t("university"))}</div></div></div>
    ${emp ? item("/dashboard", I.home, t("dashboard")) : item("/", I.home, t("home"))}
    ${emp ? group(I.send, t("correspondence"), [["/inbox", t("inbox")], ["/outbox", t("outbox")], ["/compose/letter", t("prepare_letter")], ["/compose/task", t("assign_task")], ["/meetings", t("meetings")], ["/tasks/ongoing", t("tasks_ongoing")]]) : ""}
    ${emp ? group(I.wrench, t("field"), [["/emergency", t("emergency")], ["/emergency/log", t("emergency_log")], ["/siteworks", t("site_works")]]) : ""}
    ${group(I.info, t("about_dept"), [["/about", t("about")], ["/vision", t("vision")], ["/mission", t("mission")], ["/goals", t("goals")], ["/structure", t("structure")], ["/contact", t("contact")]])}
    ${group(I.grid, t("services"), [["/cat/user", t("cat_user")], ["/cat/staff", t("cat_staff")], ["/cat/company", t("cat_company")], ["/rate", t("rating_forms")], ["/suggest", t("suggest")], ["/complain", t("complain")]])}
    ${state.user ? item("/settings", I.settings, t("settings")) : item("/employee", I.user, t("cat_employee"))}
    ${state.user ? `<button class="d-item" id="d-out">${I.logout}<span class="grow">${esc(t("logout"))}</span></button>` : ""}
    <div class="lang"><button data-l="ar" class="${getLang() === "ar" ? "on" : ""}">العربية</button><button data-l="en" class="${getLang() === "en" ? "on" : ""}">English</button></div>`;
  d.querySelectorAll("[data-group]").forEach(b => b.onclick = () => { b.classList.toggle("open"); b.nextElementSibling.classList.toggle("open"); });
  d.querySelectorAll("a").forEach(a => a.addEventListener("click", closeDrawer));
  d.querySelectorAll("[data-l]").forEach(b => b.onclick = () => { setLang(b.dataset.l); closeDrawer(); render(); });
  const out = d.querySelector("#d-out"); if (out) out.onclick = async () => { closeDrawer(); await signOut(auth); sessionStorage.removeItem("kucmd_fav_done"); go("/"); };
  bd.hidden = false; d.classList.add("open"); d.setAttribute("aria-hidden", "false");
}
export function closeDrawer() { $("#drawer").classList.remove("open"); $("#drawer").setAttribute("aria-hidden", "true"); $("#drawer-backdrop").hidden = true; }
let jobLabel = () => ({ ar: "", en: "" });
export const setJobLabel = (fn) => { jobLabel = fn; };

export function fmtDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString(getLang() === "ar" ? "ar-KW" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
}
export const uid = () => state.user?.uid || null;
export const firebaseError = (e) => {
  const map = {
    "auth/invalid-credential": { ar: "البريد أو الرقم السري غير صحيح.", en: "Wrong e-mail or password." },
    "auth/user-not-found": { ar: "لا يوجد حساب بهذا البريد.", en: "No account with this e-mail." },
    "auth/wrong-password": { ar: "الرقم السري غير صحيح.", en: "Wrong password." },
    "auth/email-already-in-use": { ar: "هذا البريد مسجل مسبقاً. سجّل الدخول.", en: "This e-mail is already registered. Sign in." },
    "auth/weak-password": { ar: "الرقم السري ضعيف.", en: "Weak password." },
    "auth/too-many-requests": { ar: "محاولات كثيرة. انتظر قليلاً.", en: "Too many attempts. Wait a bit." },
    "permission-denied": { ar: "لا تملك صلاحية لهذا الإجراء.", en: "You don't have permission for this action." }
  };
  const m = map[e?.code] || map[(e?.code || "").split("/")[1]];
  return m ? L(m) : (e?.message || t("error_generic"));
};

// ---------- attachments ----------
// Builds the mockup's "camera / upload photo / upload document" row and returns a getter for picked files.
export function attachmentPicker(mode = "all") {
  const id = "att" + Math.random().toString(36).slice(2, 8);
  const files = [];
  const html = `
    <div class="field">
      <label>${esc(t("attachments"))} <span class="muted">(${esc(t("optional"))})</span></label>
      <div class="attach-row">
        <button type="button" class="btn soft" data-att="cam">${I.camera} ${esc(t("camera"))}</button>
        <button type="button" class="btn soft" data-att="img">${I.image} ${esc(t("upload_photo"))}</button>
        ${mode === "all" ? `<button type="button" class="btn soft" data-att="doc">${I.doc} ${esc(t("upload_doc"))}</button>` : ""}
      </div>
      <input type="file" id="${id}-cam" accept="image/*" capture="environment" hidden>
      <input type="file" id="${id}-img" accept="image/*" multiple hidden>
      <input type="file" id="${id}-doc" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" multiple hidden>
      <ul class="attach-list" id="${id}-list"></ul>
    </div>`;
  const bind = (root) => {
    const list = $(`#${id}-list`, root);
    const draw = () => {
      list.innerHTML = files.map((f, i) => `<li><span>${esc(f.name)} (${Math.round(f.size / 1024)} KB)</span><button type="button" data-rm="${i}">✕</button></li>`).join("");
      $$("[data-rm]", list).forEach(b => b.onclick = () => { files.splice(+b.dataset.rm, 1); draw(); });
    };
    $$("[data-att]", root).forEach(b => {
      b.onclick = () => $(`#${id}-${b.dataset.att}`, root).click();
    });
    ["cam", "img", "doc"].forEach(k => {
      const inp = $(`#${id}-${k}`, root);
      if (inp) inp.onchange = () => { files.push(...inp.files); inp.value = ""; draw(); };
    });
  };
  return { html, bind, files };
}
export async function uploadFiles(files, folder) {
  const out = [];
  for (const f of files) {
    if (f.size > 15 * 1024 * 1024) throw new Error("File too large (max 15 MB): " + f.name);
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${f.name.replace(/[^\w.\-\u0600-\u06FF]+/g, "_")}`;
    const r = ref(storage, path);
    await uploadBytes(r, f);
    out.push({ name: f.name, url: await getDownloadURL(r), path, type: f.type, size: f.size });
  }
  return out;
}
export const emptyHtml = (icon = "📭") => `<div class="empty"><div class="big">${icon}</div>${esc(t("nothing_here"))}</div>`;
export const attachmentsHtml = (list) => (list && list.length)
  ? `<div class="attach-list"><ul>${list.map(a => `<li><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)}</a></li>`).join("")}</ul></div>` : "";

// ---------- router ----------
const routes = {};
export function route(path, handler) { routes[path] = handler; }
export function go(path) { location.hash = "#" + path; }
export function current() {
  const h = location.hash.replace(/^#/, "") || "/";
  const [path, qs] = h.split("?");
  const params = Object.fromEntries(new URLSearchParams(qs || ""));
  return { path, params };
}
export async function render() {
  state.unsub.forEach(u => { try { u(); } catch { } });
  state.unsub = [];
  const { path, params } = current();
  // match /a/b/:id patterns
  let handler = routes[path], args = {};
  if (!handler) {
    for (const p of Object.keys(routes)) {
      const pp = p.split("/"), cc = path.split("/");
      if (pp.length !== cc.length) continue;
      const a = {}; let ok = true;
      pp.forEach((seg, i) => { if (seg.startsWith(":")) a[seg.slice(1)] = decodeURIComponent(cc[i]); else if (seg !== cc[i]) ok = false; });
      if (ok) { handler = routes[p]; args = a; break; }
    }
  }
  if (!handler) handler = routes["/"];
  window.scrollTo(0, 0);
  closeDrawer();
  try { await handler({ ...params, ...args }); }
  catch (e) { console.error(e); view().innerHTML = `<div class="banner red">${esc(firebaseError(e))}</div>`; }
}

// Guard: require an approved, active employee session. Returns false and redirects when not allowed.
export function requireEmployee() {
  if (!state.user) { go("/employee"); return false; }
  const p = state.profile;
  if (!p) { go("/employee/register"); return false; }
  if (p.status !== "approved") { go("/employee/status"); return false; }
  if (!state.settings.active && !isManager()) { go("/employee/status"); return false; }
  return true;
}
export function isManager() {
  const p = state.profile; if (!p) return false;
  if (p.role === "manager") return true;
  return !!(state.settings.delegates && state.settings.delegates[p.job]);
}
export const myUnit = () => state.profile?.unit;
export const myRole = () => (isManager() ? "manager" : state.profile?.role);
