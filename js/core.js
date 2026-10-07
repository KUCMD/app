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
import { t, getLang, L } from "./i18n.js";

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

export function setTop(title, { home = true, settings = false } = {}) {
  const bar = $("#topbar");
  bar.hidden = false;
  $("#top-title").textContent = title || "";
  $("#btn-home").style.visibility = home ? "visible" : "hidden";
  $("#btn-settings").hidden = !settings;
}
export const hideTop = () => { $("#topbar").hidden = true; };

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
        <button type="button" class="pill soft" data-att="cam">📷 ${esc(t("camera"))}</button>
        <button type="button" class="pill soft" data-att="img">🖼️ ${esc(t("upload_photo"))}</button>
        ${mode === "all" ? `<button type="button" class="pill soft" data-att="doc">📄 ${esc(t("upload_doc"))}</button>` : ""}
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
