// Department employee: sign-in / registration / approval chain, dashboard, correspondence
// (inbox / outbox / compose), emergencies, site works, admin lists and settings.
import {
  route, go, view, esc, setTop, toast, busy, attachmentPicker, uploadFiles, attachmentsHtml, fb, db, auth,
  state, firebaseError, uid, fmtDate, requireEmployee, isManager, myUnit, myRole
} from "./core.js";
import { t, L, setLang, getLang } from "./i18n.js";
import { UNIVERSITY_EMAIL_DOMAIN } from "./config.js";
import {
  UNITS, unit, supervisorOf, JOBS, job, EMERGENCY_TARGETS, DANGERS, TRADES, MSG_TYPES, MSG_STATUS,
  MEETING_TYPES, SECTORS, FAV_PAGES
} from "./data.js";

const $ = (sel) => view().querySelector(sel);
const $$ = (sel) => Array.from(view().querySelectorAll(sel));
const opt = (list, sel) => list.map(x => `<option value="${x.id}" ${x.id === sel ? "selected" : ""}>${esc(L(x))}</option>`).join("");
const tag = (cls, text) => `<span class="tag ${cls}">${esc(text)}</span>`;
const statusLabel = (s) => L(MSG_STATUS.find(x => x.id === s)) || s;

// ---------- approval chain ----------
// Which role must act next on a registration, given the applicant's job.
function firstStage(j) {
  if (j.role === "manager") return "manager";
  if (j.role === "supervisor") return "manager";
  if (j.role === "head") return supervisorOf(j.unit) ? "supervisor" : "manager";
  const unitHasHead = JOBS.some(x => x.unit === j.unit && x.role === "head");
  if (unitHasHead) return "head";
  return supervisorOf(j.unit) ? "supervisor" : "manager";
}
const nextStage = (stage, unitId) => stage === "head" ? (supervisorOf(unitId) ? "supervisor" : "manager") : "manager";

// ---------- sign in / register ----------
route("/employee", () => {
  setTop(t("emp_title"));
  if (state.user && state.profile) return go(state.profile.status === "approved" ? "/dashboard" : "/employee/status");
  if (state.user && !state.profile) return go("/employee/register");
  view().innerHTML = `
    <h1 class="page-title">${esc(t("emp_title"))}</h1>
    <form class="form" id="f">
      <div class="field"><label>${esc(t("uni_email"))}</label><input name="email" type="email" required autocomplete="username"></div>
      <div class="field"><label>${esc(t("password"))}</label><input name="password" type="password" required autocomplete="current-password"></div>
      <button class="pill fill" type="submit">${esc(t("login"))}</button>
      <button class="pill" type="button" id="reg">${esc(t("register"))}</button>
      <button class="pill sm soft" type="button" id="forgot">${esc(t("forgot"))}</button>
    </form>`;
  $("#reg").onclick = () => go("/employee/register");
  $("#forgot").onclick = async () => {
    const email = $("[name=email]").value.trim();
    if (!email) { toast(t("required"), true); return; }
    try { await fb.sendPasswordResetEmail(auth, email); toast(t("reset_sent")); } catch (e) { toast(firebaseError(e), true); }
  };
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target); busy(true);
    try { await fb.signInWithEmailAndPassword(auth, fd.get("email").trim(), fd.get("password")); }
    catch (err) { toast(firebaseError(err), true); }
    finally { busy(false); }
  };
});

route("/employee/terms", () => {
  setTop(t("emp_title"));
  view().innerHTML = `<h1 class="page-title">${esc(t("terms_link"))}</h1><div class="banner green" style="white-space:pre-wrap;line-height:2">${esc(t("terms_body"))}</div><button class="pill fill" onclick="history.back()">${esc(t("back"))}</button>`;
});

route("/employee/register", () => {
  setTop(t("emp_title"));
  const existing = state.user; // already authenticated (e.g. rejected re-apply or missing profile)
  view().innerHTML = `
    <h1 class="page-title">${esc(t("reg_title"))}</h1>
    <form class="form" id="f">
      <div class="field"><label>${esc(t("dept"))}</label><select name="unit" id="unit" required><option value="">${esc(t("choose"))}</option>${opt(UNITS)}</select></div>
      <div class="field"><label>${esc(t("job"))}</label><select name="job" id="job" required><option value="">${esc(t("choose"))}</option></select></div>
      <div class="field"><label>${esc(t("name"))}</label><input name="name" required value="${esc(state.profile?.name || "")}"></div>
      <div class="field"><label>${esc(t("emp_id"))}</label><input name="empId" inputmode="numeric" required value="${esc(state.profile?.empId || "")}"></div>
      <div class="field"><label>${esc(t("uni_email"))}</label><input name="email" type="email" required value="${esc(existing?.email || "")}" ${existing ? "readonly" : ""}></div>
      <div class="field"><label>${esc(t("uni_mobile"))}</label><input name="mobile" type="tel" inputmode="tel" required value="${esc(state.profile?.mobile || "")}"></div>
      ${existing ? "" : `
      <div class="field"><label>${esc(t("password"))}</label><input name="password" type="password" required autocomplete="new-password"></div>
      <div class="field"><label>${esc(t("password2"))}</label><input name="password2" type="password" required autocomplete="new-password"></div>`}
      <label class="check"><input type="checkbox" name="terms" required><span>${esc(t("terms_ok"))} <a href="#/employee/terms">${esc(t("terms_link"))}</a></span></label>
      <button class="pill fill" type="submit">${esc(t("send"))}</button>
      <p class="hint">${esc(t("code_note"))}</p>
    </form>`;
  const unitSel = $("#unit"), jobSel = $("#job");
  unitSel.onchange = () => { jobSel.innerHTML = `<option value="">${esc(t("choose"))}</option>` + opt(JOBS.filter(j => j.unit === unitSel.value)); };
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    const j = job(d.job); if (!j) { toast(t("required"), true); return; }
    if (!d.email.toLowerCase().endsWith("@" + UNIVERSITY_EMAIL_DOMAIN) && !existing) { toast(t("bad_uni_email"), true); return; }
    if (!existing) {
      if (d.password.length < 6) { toast(t("pw_short"), true); return; }
      if (d.password !== d.password2) { toast(t("pw_mismatch"), true); return; }
    }
    busy(true);
    try {
      let user = existing;
      if (!user) {
        const cred = await fb.createUserWithEmailAndPassword(auth, d.email.trim(), d.password);
        user = cred.user;
        try { await fb.sendEmailVerification(user); } catch { }
      }
      const profile = {
        name: d.name.trim(), empId: d.empId.trim(), email: user.email, mobile: d.mobile.trim(),
        unit: j.unit, job: j.id, role: j.role, status: "pending", stage: firstStage(j), endorsements: [],
        lang: getLang(), favPage: "home", createdAt: fb.serverTimestamp()
      };
      await fb.setDoc(fb.doc(db, "users", user.uid), profile, { merge: true });
      state.profile = { ...(state.profile || {}), ...profile };
      go("/employee/status");
    } catch (err) { toast(firebaseError(err), true); }
    finally { busy(false); }
  };
});

// status after registration: verify e-mail → pending → approved / rejected / suspended
route("/employee/status", async () => {
  setTop(t("emp_title"));
  if (!state.user) return go("/employee");
  const p = state.profile;
  const out = `<button class="pill sm soft" id="out">${esc(t("logout"))}</button>`;
  if (!p) return go("/employee/register");
  if (!state.user.emailVerified) {
    view().innerHTML = `<div class="result"><div class="mark ok">✉</div><h2>${esc(t("verify_title"))}</h2><p class="muted">${esc(t("verify_text"))}</p>
      <div class="stack"><button class="pill fill" id="chk">${esc(t("i_verified"))}</button><button class="pill" id="re">${esc(t("resend"))}</button>${out}</div></div>`;
    $("#chk").onclick = async () => { await state.user.reload(); if (state.user.emailVerified) go("/employee/status"); else toast(t("not_verified_yet"), true); };
    $("#re").onclick = async () => { try { await fb.sendEmailVerification(state.user); toast(t("sent_ok")); } catch (e) { toast(firebaseError(e), true); } };
  } else if (p.status === "pending") {
    view().innerHTML = `<div class="result"><div class="mark ok">⏳</div><h2>${esc(t("pending_title"))}</h2>
      <div class="banner green" style="text-align:start"><ul><li>${esc(t("pending_1"))}</li><li>${esc(t("pending_2"))}</li><li>${esc(t("pending_3"))}</li></ul></div>${out}</div>`;
  } else if (p.status === "rejected") {
    view().innerHTML = `<div class="result"><div class="mark no">✕</div><h2>${esc(t("rejected_title"))}</h2><p class="muted">${esc(t("rejected_text"))}</p>
      <div class="stack"><button class="pill fill" id="re">${esc(t("reapply"))}</button>${out}</div></div>`;
    $("#re").onclick = () => go("/employee/register");
  } else if (p.status === "suspended") {
    view().innerHTML = `<div class="result"><div class="mark no">⏸</div><p class="muted">${esc(t("suspended_text"))}</p>${out}</div>`;
  } else if (!state.settings.active && !isManager()) {
    view().innerHTML = `<div class="result"><div class="mark no">⏸</div><p class="muted">${esc(t("app_suspended"))}</p>${out}</div>`;
  } else return go("/dashboard");
  const o = $("#out"); if (o) o.onclick = () => fb.signOut(auth).then(() => go("/"));
});

// ---------- dashboard ----------
function dashHeader() {
  const p = state.profile;
  return `<div class="me"><div class="avatar">${esc((p.name || "?")[0])}</div><div><div class="name">${esc(p.name)}</div><div class="role">${esc(L(job(p.job)))} · ${esc(L(unit(p.unit)))}${isManager() && p.role !== "manager" ? " · " + esc(t("delegate")) : ""}</div></div></div>`;
}
route("/dashboard", async () => {
  if (!requireEmployee()) return;
  setTop(t("dashboard"), { settings: true });
  const role = myRole();
  const counts = await unreadCounts();
  const other = UNITS.filter(u => u.id !== myUnit());
  view().innerHTML = `
    ${dashHeader()}
    <div class="grid2">
      <a class="pill fill" href="#/inbox">${esc(t("inbox"))} ${counts.total ? `<span class="badge">${counts.total}</span>` : ""}</a>
      <a class="pill" href="#/outbox">${esc(t("outbox"))}</a>
    </div>
    <h2 class="section">${esc(t("compose"))}</h2>
    <div class="grid2">
      <a class="pill sky" href="#/compose/letter">${esc(t("prepare_letter"))}</a>
      <a class="pill sky" href="#/compose/task">${esc(t("assign_task"))}</a>
      <a class="pill sky" href="#/compose/memo">${esc(t("prepare_memo"))}</a>
      <a class="pill sky" href="#/compose/report">${esc(t("prepare_report"))}</a>
      <a class="pill sky" href="#/compose/minutes">${esc(t("prepare_minutes"))}</a>
      <a class="pill sky" href="#/compose/meeting">${esc(t("set_meeting"))}</a>
    </div>
    <div class="grid3" style="margin-top:10px">
      <a class="pill sm" href="#/tasks/ongoing">${esc(t("tasks_ongoing"))}</a>
      <a class="pill sm" href="#/tasks/postponed">${esc(t("tasks_postponed"))}</a>
      <a class="pill sm" href="#/tasks/done">${esc(t("tasks_done"))}</a>
    </div>
    <div class="grid2" style="margin-top:10px">
      <a class="pill sm" href="#/meetings">${esc(t("meetings"))}</a>
      <a class="pill sm" href="#/tasks/archive">${esc(t("archive"))}</a>
    </div>

    <h2 class="section">${esc(t("correspondence"))}</h2>
    <div class="matrix">
      ${other.map(u => `<div class="mrow"><span class="name">${esc(L(u))}</span>
        <a class="pill sm" href="#/inbox?unit=${u.id}">${esc(t("inbox"))} ${counts.byUnit[u.id] ? `<span class="badge">${counts.byUnit[u.id]}</span>` : ""}</a>
        <a class="pill sm" href="#/outbox?unit=${u.id}">${esc(t("outbox"))}</a></div>`).join("")}
    </div>

    <h2 class="section">${esc(t("emergency"))} · ${esc(t("site_works"))}</h2>
    <div class="grid2">
      <a class="pill red" href="#/emergency">${esc(t("emergency"))}</a>
      <a class="pill" href="#/siteworks">${esc(t("site_works"))}</a>
    </div>
    <div class="grid2" style="margin-top:10px">
      <a class="pill sm" href="#/emergency/log">${esc(t("emergency_log"))}</a>
      <a class="pill sm" href="#/feedback/inquiry">${esc(t("inquiries_in"))}</a>
    </div>

    ${["manager", "supervisor", "head"].includes(role) ? `
    <h2 class="section">${esc(t("join_requests"))}</h2>
    <a class="pill sun" href="#/requests">${esc(t("join_requests"))}</a>` : ""}

    ${["manager", "supervisor", "head"].includes(role) || ["secretariat", "support", "technical"].includes(myUnit()) ? `
    <h2 class="section">${esc(t("cat_user"))}</h2>
    <div class="grid2">
      <a class="pill sm" href="#/feedback/complaint">${esc(t("user_complaints"))}</a>
      <a class="pill sm" href="#/feedback/suggestion">${esc(t("user_suggestions"))}</a>
      <a class="pill sm" href="#/feedback/request">${esc(t("user_requests"))}</a>
      <a class="pill sm" href="#/feedback/rating">${esc(t("user_ratings"))}</a>
    </div>` : ""}`;
});

async function unreadCounts() {
  const me = uid();
  const q = fb.query(fb.collection(db, "messages"), fb.where("toUnit", "==", myUnit()));
  const snap = await fb.getDocs(q);
  const byUnit = {}; let total = 0;
  snap.forEach(d => {
    const m = d.data();
    if (m.toUid && m.toUid !== me) return;
    if ((m.readBy || []).includes(me)) return;
    total++; byUnit[m.fromUnit] = (byUnit[m.fromUnit] || 0) + 1;
  });
  return { total, byUnit };
}

// ---------- messages ----------
function msgItem(d, m) {
  const unread = !(m.readBy || []).includes(uid()) && m.toUnit === myUnit();
  const typ = L(MSG_TYPES.find(x => x.id === m.type));
  return `<div class="item tap ${unread ? "unread" : ""}" data-id="${d.id}">
    <div class="row"><span class="title">${esc(m.subject || typ)}</span>${tag(m.status, statusLabel(m.status))}</div>
    <div class="meta">${esc(typ)} · ${esc(t("from_unit"))}: ${esc(m.fromName)} (${esc(L(unit(m.fromUnit)))}) → ${esc(L(unit(m.toUnit)))}${m.toName ? " / " + esc(m.toName) : ""}</div>
    <div class="meta">${esc(fmtDate(m.createdAt))}${m.meetingAt ? " · 📅 " + esc(fmtDate(m.meetingAt)) : ""}</div>
  </div>`;
}
function bindItems() { $$(".item[data-id]").forEach(el => el.onclick = () => go("/msg/" + el.dataset.id)); }
const sortDesc = (docs) => docs.sort((a, b) => (b.data().createdAt?.toMillis?.() || 0) - (a.data().createdAt?.toMillis?.() || 0));

async function listMessages(title, filterFn, qCons) {
  if (!requireEmployee()) return;
  setTop(title, { settings: true });
  view().innerHTML = `<h1 class="page-title">${esc(title)}</h1><div class="list" id="list"><p class="muted center">${esc(t("loading"))}</p></div>`;
  const q = fb.query(fb.collection(db, "messages"), ...qCons);
  const un = fb.onSnapshot(q, (snap) => {
    const docs = sortDesc(snap.docs.filter(d => filterFn(d.data())));
    $("#list").innerHTML = docs.length ? docs.map(d => msgItem(d, d.data())).join("") : `<p class="empty">${esc(t("nothing_here"))}</p>`;
    bindItems();
  }, (e) => { $("#list").innerHTML = `<div class="banner red">${esc(firebaseError(e))}</div>`; });
  state.unsub.push(un);
}
route("/inbox", ({ unit: fromUnit }) => {
  const title = t("inbox") + (fromUnit ? " · " + L(unit(fromUnit)) : "");
  listMessages(title, (m) => (!m.toUid || m.toUid === uid()) && (!fromUnit || m.fromUnit === fromUnit), [fb.where("toUnit", "==", myUnit())]);
});
route("/outbox", ({ unit: toUnit }) => {
  const title = t("outbox") + (toUnit ? " · " + L(unit(toUnit)) : "");
  // heads/supervisors/manager see their whole unit's outbox; staff see their own
  const wide = ["manager", "supervisor", "head"].includes(myRole());
  listMessages(title, (m) => (wide || m.fromUid === uid()) && (!toUnit || m.toUnit === toUnit), [fb.where("fromUnit", "==", myUnit())]);
});
route("/tasks/:st", ({ st }) => {
  const title = { ongoing: t("tasks_ongoing"), postponed: t("tasks_postponed"), done: t("tasks_done"), archive: t("archive") }[st] || st;
  const mine = (m) => m.fromUid === uid() || (m.toUnit === myUnit() && (!m.toUid || m.toUid === uid()));
  const st2 = st === "archive" ? "done" : st;
  listMessages(title, (m) => mine(m) && m.status === st2 && (st === "archive" ? m.type !== "task" : m.type === "task"),
    [fb.where("status", "==", st2)]);
});
route("/meetings", () => {
  const mine = (m) => m.fromUid === uid() || (m.toUnit === myUnit() && (!m.toUid || m.toUid === uid()));
  listMessages(t("meetings"), mine, [fb.where("type", "==", "meeting")]);
});

route("/compose/:type", async ({ type, to, reply }) => {
  if (!requireEmployee()) return;
  const typ = MSG_TYPES.find(x => x.id === type) || MSG_TYPES[0];
  setTop(L(typ), { settings: true });
  const att = attachmentPicker();
  const isMeeting = type === "meeting";
  view().innerHTML = `
    <h1 class="page-title">${esc(L(typ))}</h1>
    <form class="form" id="f">
      <div class="field"><label>${esc(t("to_unit"))}</label><select name="toUnit" id="toUnit" required><option value="">${esc(t("choose"))}</option>${opt(UNITS, to)}</select></div>
      <div class="field"><label>${esc(t("to_person"))} <span class="muted">(${esc(t("optional"))})</span></label><select name="toUid" id="toUid"><option value="">${esc(t("whole_unit"))}</option></select></div>
      ${isMeeting ? `
      <div class="field"><label>${esc(t("sector"))}</label><select name="sector">${opt(SECTORS)}</select></div>
      <div class="field"><label>${esc(t("meeting_type"))}</label><select name="mtype">${opt(MEETING_TYPES)}</select></div>
      <div class="field"><label>${esc(t("attendees"))}</label><input name="attendees"></div>
      <div class="field"><label>${esc(t("when"))}</label><input name="meetingAt" type="datetime-local" required></div>` : ""}
      <div class="field"><label>${esc(t("subject"))}</label><input name="subject" required value="${esc(reply ? "Re: " + reply : "")}"></div>
      <div class="field"><label>${esc(t("details"))}</label><textarea name="body" required></textarea></div>
      ${att.html}
      <button class="pill fill" type="submit">${esc(t("send"))}</button>
    </form>`;
  att.bind(view());
  const toUnitSel = $("#toUnit"), toUidSel = $("#toUid");
  const loadPeople = async () => {
    toUidSel.innerHTML = `<option value="">${esc(t("whole_unit"))}</option>`;
    if (!toUnitSel.value) return;
    const snap = await fb.getDocs(fb.query(fb.collection(db, "users"), fb.where("unit", "==", toUnitSel.value), fb.where("status", "==", "approved")));
    snap.forEach(d => { const u = d.data(); toUidSel.innerHTML += `<option value="${d.id}" data-name="${esc(u.name)}">${esc(u.name)} · ${esc(L(job(u.job)))}</option>`; });
  };
  toUnitSel.onchange = loadPeople; if (to) loadPeople();
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    busy(true);
    try {
      const attachments = att.files.length ? await uploadFiles(att.files, `messages/${uid()}`) : [];
      const toName = toUidSel.selectedOptions[0]?.dataset.name || null;
      await fb.addDoc(fb.collection(db, "messages"), {
        type, subject: d.subject.trim(), body: d.body.trim(),
        fromUid: uid(), fromName: state.profile.name, fromUnit: myUnit(), fromJob: state.profile.job,
        toUnit: d.toUnit, toUid: d.toUid || null, toName,
        sector: d.sector || null, mtype: d.mtype || null, attendees: d.attendees || null,
        meetingAt: d.meetingAt ? new Date(d.meetingAt) : null,
        status: "new", readBy: [uid()], attachments, replies: [], createdAt: fb.serverTimestamp()
      });
      toast(t("sent_ok")); go("/outbox");
    } catch (err) { toast(firebaseError(err), true); }
    finally { busy(false); }
  };
});

route("/msg/:id", async ({ id }) => {
  if (!requireEmployee()) return;
  setTop(t("correspondence"), { settings: true });
  const refDoc = fb.doc(db, "messages", id);
  const snap = await fb.getDoc(refDoc);
  if (!snap.exists()) return go("/inbox");
  const m = snap.data();
  const me = uid();
  if (!(m.readBy || []).includes(me)) { try { await fb.updateDoc(refDoc, { readBy: fb.arrayUnion(me) }); } catch { } }
  const canAct = m.toUnit === myUnit() || m.fromUid === me || isManager();
  const draw = (m) => {
    view().innerHTML = `
      <div class="item">
        <div class="row"><span class="title">${esc(m.subject)}</span>${tag(m.status, statusLabel(m.status))}</div>
        <div class="meta">${esc(L(MSG_TYPES.find(x => x.id === m.type)))} · ${esc(fmtDate(m.createdAt))}</div>
        <div class="meta">${esc(t("from_unit"))}: ${esc(m.fromName)} · ${esc(L(job(m.fromJob)))} · ${esc(L(unit(m.fromUnit)))}</div>
        <div class="meta">${esc(t("to_unit"))}: ${esc(L(unit(m.toUnit)))}${m.toName ? " / " + esc(m.toName) : ""}</div>
        ${m.meetingAt ? `<div class="meta">📅 ${esc(fmtDate(m.meetingAt))} · ${esc(L(MEETING_TYPES.find(x => x.id === m.mtype)))} · ${esc(L(SECTORS.find(x => x.id === m.sector)))}${m.attendees ? " · " + esc(m.attendees) : ""}</div>` : ""}
        <div class="body">${esc(m.body)}</div>
        ${attachmentsHtml(m.attachments)}
      </div>
      ${(m.replies || []).map(r => `<div class="item" style="margin-top:8px;background:var(--green-soft)"><div class="meta">${esc(r.name)} · ${esc(fmtDate(r.at))}</div><div class="body">${esc(r.text)}</div></div>`).join("")}
      ${canAct ? `
      <div class="actions">
        <button class="pill sm" data-st="ongoing">${esc(t("mark_ongoing"))}</button>
        <button class="pill sm" data-st="postponed">${esc(t("mark_postponed"))}</button>
        <button class="pill sm fill" data-st="done">${esc(t("mark_done"))}</button>
      </div>
      <form class="form" id="rf" style="margin-top:12px">
        <div class="field"><label>${esc(t("reply"))}</label><textarea name="text" required></textarea></div>
        <button class="pill" type="submit">${esc(t("reply"))}</button>
      </form>` : ""}`;
    $$("[data-st]").forEach(b => b.onclick = async () => {
      try { await fb.updateDoc(refDoc, { status: b.dataset.st, updatedAt: fb.serverTimestamp() }); toast(t("saved_ok")); draw({ ...m, status: b.dataset.st }); }
      catch (e) { toast(firebaseError(e), true); }
    });
    const rf = $("#rf");
    if (rf) rf.onsubmit = async (e) => {
      e.preventDefault();
      const text = new FormData(e.target).get("text").trim();
      const r = { uid: me, name: state.profile.name, text, at: new Date() };
      try { await fb.updateDoc(refDoc, { replies: fb.arrayUnion(r), readBy: [me] }); toast(t("sent_ok")); draw({ ...m, replies: [...(m.replies || []), r] }); }
      catch (err) { toast(firebaseError(err), true); }
    };
  };
  draw(m);
});

// ---------- join requests (approval chain) ----------
route("/requests", async () => {
  if (!requireEmployee()) return;
  const role = myRole();
  if (!["manager", "supervisor", "head"].includes(role)) return go("/dashboard");
  setTop(t("join_requests"), { settings: true });
  view().innerHTML = `<h1 class="page-title">${esc(t("join_requests"))}</h1><div class="list" id="list"><p class="muted center">${esc(t("loading"))}</p></div>`;
  const q = fb.query(fb.collection(db, "users"), fb.where("status", "==", "pending"));
  const inScope = (u) => {
    if (role === "manager") return true;
    if (role === "supervisor") return u.stage === "supervisor" && supervisorOf(u.unit) === myUnit();
    return u.stage === "head" && u.unit === myUnit();
  };
  const un = fb.onSnapshot(q, (snap) => {
    const docs = snap.docs.filter(d => inScope(d.data()) && d.id !== uid());
    $("#list").innerHTML = docs.length ? docs.map(d => { const u = d.data(); return `
      <div class="item">
        <div class="row"><span class="title">${esc(u.name)}</span>${tag(u.stage, { head: t("endorse"), supervisor: t("endorse"), manager: t("approve") }[u.stage] || u.stage)}</div>
        <div class="meta">${esc(t("job"))}: ${esc(L(job(u.job)))} · ${esc(L(unit(u.unit)))}</div>
        <div class="meta">${esc(t("emp_id"))}: ${esc(u.empId)} · ${esc(t("uni_email"))}: ${esc(u.email)} · ${esc(t("uni_mobile"))}: ${esc(u.mobile)}</div>
        ${(u.endorsements || []).length ? `<div class="meta">${esc(t("endorsed_by"))}: ${u.endorsements.map(e => esc(e.name)).join(", ")}</div>` : ""}
        <div class="actions">
          <button class="pill sm fill" data-ok="${d.id}">${esc(role === "manager" || u.stage === "manager" ? t("approve") : t("endorse"))}</button>
          <button class="pill sm red" data-no="${d.id}">${esc(t("reject"))}</button>
        </div>
      </div>`; }).join("") : `<p class="empty">${esc(t("nothing_here"))}</p>`;
    $$("[data-ok]").forEach(b => b.onclick = async () => {
      const d = snap.docs.find(x => x.id === b.dataset.ok); const u = d.data();
      const endorsement = { uid: uid(), name: state.profile.name, job: state.profile.job, at: new Date() };
      try {
        if (role === "manager") await fb.updateDoc(d.ref, { status: "approved", approvedBy: endorsement, approvedAt: fb.serverTimestamp() });
        else await fb.updateDoc(d.ref, { stage: nextStage(u.stage, u.unit), endorsements: fb.arrayUnion(endorsement) });
        toast(t("saved_ok"));
      } catch (e) { toast(firebaseError(e), true); }
    });
    $$("[data-no]").forEach(b => b.onclick = async () => {
      if (!confirm(t("reject") + "?")) return;
      try { await fb.updateDoc(fb.doc(db, "users", b.dataset.no), { status: "rejected", rejectedBy: { uid: uid(), name: state.profile.name }, rejectedAt: fb.serverTimestamp() }); toast(t("saved_ok")); }
      catch (e) { toast(firebaseError(e), true); }
    });
  }, (e) => { $("#list").innerHTML = `<div class="banner red">${esc(firebaseError(e))}</div>`; });
  state.unsub.push(un);
});

// ---------- emergencies ----------
route("/emergency", () => {
  if (!requireEmployee()) return;
  setTop(t("emergency"), { settings: true });
  const att = attachmentPicker("all");
  let danger = null;
  view().innerHTML = `
    <h1 class="page-title" style="color:var(--red)">${esc(t("emergency"))}</h1>
    <form class="form" id="f">
      <div class="field"><label>${esc(t("danger_type"))}</label>
        <div class="danger-grid">${DANGERS.map(d => `<button type="button" class="pill" data-d="${d.id}">${esc(L(d))}</button>`).join("")}</div></div>
      <div class="field"><label>${esc(t("location"))}</label><input name="location" required></div>
      <div class="field"><label>${esc(t("message_text"))}</label><textarea name="text"></textarea></div>
      ${att.html}
      <div class="field"><label>${esc(t("report_btn"))} →</label>
        <div class="stack">${EMERGENCY_TARGETS.map(z => `<button type="button" class="pill red" data-z="${z.id}">${esc(t("report_btn"))} · ${esc(L(z))}</button>`).join("")}</div></div>
    </form>`;
  att.bind(view());
  $$("[data-d]").forEach(b => b.onclick = () => { danger = b.dataset.d; $$("[data-d]").forEach(x => x.classList.toggle("on", x === b)); });
  $$("[data-z]").forEach(b => b.onclick = async () => {
    const d = Object.fromEntries(new FormData($("#f")).entries());
    if (!danger || !d.location) { toast(t("required"), true); return; }
    busy(true);
    try {
      const attachments = att.files.length ? await uploadFiles(att.files, `emergencies/${uid()}`) : [];
      await fb.addDoc(fb.collection(db, "emergencies"), {
        target: b.dataset.z, danger, location: d.location.trim(), text: (d.text || "").trim(), attachments,
        byUid: uid(), byName: state.profile.name, byUnit: myUnit(), byMobile: state.profile.mobile,
        status: "new", createdAt: fb.serverTimestamp()
      });
      toast(t("sent_ok")); go("/emergency/log");
    } catch (e) { toast(firebaseError(e), true); }
    finally { busy(false); }
  });
});
route("/emergency/log", () => {
  if (!requireEmployee()) return;
  setTop(t("emergency_log"), { settings: true });
  view().innerHTML = `<h1 class="page-title">${esc(t("emergency_log"))}</h1><div class="list" id="list"></div>`;
  const un = fb.onSnapshot(fb.collection(db, "emergencies"), (snap) => {
    const docs = sortDesc([...snap.docs]).slice(0, 100);
    $("#list").innerHTML = docs.length ? docs.map(d => { const e = d.data(); return `
      <div class="item"><div class="row"><span class="title">⚠ ${esc(L(DANGERS.find(x => x.id === e.danger)))} · ${esc(e.location)}</span>${tag(e.status, statusLabel(e.status))}</div>
      <div class="meta">${esc(L(EMERGENCY_TARGETS.find(x => x.id === e.target)))} · ${esc(e.byName)} (${esc(L(unit(e.byUnit)))}) · <a href="tel:${esc(e.byMobile)}">${esc(e.byMobile)}</a> · ${esc(fmtDate(e.createdAt))}</div>
      ${e.text ? `<div class="body">${esc(e.text)}</div>` : ""}${attachmentsHtml(e.attachments)}
      ${e.status !== "done" ? `<div class="actions"><button class="pill sm" data-st="ongoing" data-id="${d.id}">${esc(t("mark_ongoing"))}</button><button class="pill sm fill" data-st="done" data-id="${d.id}">${esc(t("mark_done"))}</button></div>` : ""}</div>`; }).join("")
      : `<p class="empty">${esc(t("nothing_here"))}</p>`;
    $$("[data-st]").forEach(b => b.onclick = () => fb.updateDoc(fb.doc(db, "emergencies", b.dataset.id), { status: b.dataset.st }).catch(e => toast(firebaseError(e), true)));
  }, (e) => { $("#list").innerHTML = `<div class="banner red">${esc(firebaseError(e))}</div>`; });
  state.unsub.push(un);
});

// ---------- site works ----------
route("/siteworks", () => {
  if (!requireEmployee()) return;
  setTop(t("site_works"), { settings: true });
  view().innerHTML = `<h1 class="page-title">${esc(t("site_works"))}</h1>
    <div class="grid2">${TRADES.map(x => `<a class="pill" href="#/siteworks/${x.id}">${esc(L(x))}</a>`).join("")}</div>`;
});
route("/siteworks/:trade", ({ trade }) => {
  if (!requireEmployee()) return;
  const tr = TRADES.find(x => x.id === trade); if (!tr) return go("/siteworks");
  setTop(L(tr), { settings: true });
  const att = attachmentPicker();
  view().innerHTML = `
    <h1 class="page-title">${esc(L(tr))}</h1>
    <form class="form" id="f">
      <div class="field"><label>${esc(t("location"))}</label><input name="location" required></div>
      <div class="field"><label>${esc(t("details"))}</label><textarea name="text" required></textarea></div>
      <div class="field"><label>${esc(t("status"))}</label><select name="status">${opt(MSG_STATUS.filter(s => s.id !== "new"), "ongoing")}</select></div>
      ${att.html}
      <button class="pill fill" type="submit">${esc(t("site_work_new"))}</button>
    </form>
    <h2 class="section">${esc(t("archive"))}</h2><div class="list" id="list"></div>`;
  att.bind(view());
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries()); busy(true);
    try {
      const attachments = att.files.length ? await uploadFiles(att.files, `siteworks/${uid()}`) : [];
      await fb.addDoc(fb.collection(db, "site_works"), { trade, ...d, attachments, byUid: uid(), byName: state.profile.name, byUnit: myUnit(), createdAt: fb.serverTimestamp() });
      toast(t("saved_ok")); e.target.reset(); att.files.length = 0; att.bind(view());
    } catch (err) { toast(firebaseError(err), true); } finally { busy(false); }
  };
  const un = fb.onSnapshot(fb.query(fb.collection(db, "site_works"), fb.where("trade", "==", trade)), (snap) => {
    const docs = sortDesc([...snap.docs]).slice(0, 50);
    $("#list").innerHTML = docs.length ? docs.map(d => { const w = d.data(); return `<div class="item"><div class="row"><span class="title">${esc(w.location)}</span>${tag(w.status, statusLabel(w.status))}</div>
      <div class="meta">${esc(w.byName)} · ${esc(L(unit(w.byUnit)))} · ${esc(fmtDate(w.createdAt))}</div><div class="body">${esc(w.text)}</div>${attachmentsHtml(w.attachments)}</div>`; }).join("") : `<p class="empty">${esc(t("nothing_here"))}</p>`;
  });
  state.unsub.push(un);
});

// ---------- feedback admin lists (complaints / suggestions / requests / ratings / inquiries) ----------
route("/feedback/:kind", ({ kind }) => {
  if (!requireEmployee()) return;
  const title = { complaint: t("user_complaints"), suggestion: t("user_suggestions"), request: t("user_requests"), rating: t("user_ratings"), inquiry: t("inquiries_in") }[kind] || kind;
  setTop(title, { settings: true });
  view().innerHTML = `<h1 class="page-title">${esc(title)}</h1><div class="list" id="list"></div>`;
  const un = fb.onSnapshot(fb.query(fb.collection(db, "feedback"), fb.where("kind", "==", kind)), (snap) => {
    const docs = sortDesc([...snap.docs]).slice(0, 100);
    $("#list").innerHTML = docs.length ? docs.map(d => { const f = d.data(); return `
      <div class="item"><div class="row"><span class="title">${esc(f.subject || f.service || f.form || title)}</span>${tag(f.status, statusLabel(f.status))}</div>
      <div class="meta">${esc(f.name)}${f.title ? " · " + esc(f.title) : ""}${f.org ? " · " + esc(f.org) : ""} · <a href="tel:${esc(f.phone)}">${esc(f.phone)}</a>${f.email ? " · " + esc(f.email) : ""}</div>
      <div class="meta">${f.unit ? esc(L(unit(f.unit))) + " · " : ""}${f.location ? esc(f.location) + " · " : ""}${esc(fmtDate(f.createdAt))}</div>
      ${f.scores ? `<div class="meta">${Object.entries(f.scores).map(([k, v]) => `${"★".repeat(v)}`).join(" · ")} (${(Object.values(f.scores).reduce((a, b) => a + b, 0) / Object.keys(f.scores).length).toFixed(1)}/5)</div>` : ""}
      ${f.text ? `<div class="body">${esc(f.text)}</div>` : ""}${attachmentsHtml(f.attachments)}
      ${f.status !== "done" ? `<div class="actions"><button class="pill sm" data-st="ongoing" data-id="${d.id}">${esc(t("mark_ongoing"))}</button><button class="pill sm fill" data-st="done" data-id="${d.id}">${esc(t("mark_done"))}</button></div>` : ""}</div>`; }).join("")
      : `<p class="empty">${esc(t("nothing_here"))}</p>`;
    $$("[data-st]").forEach(b => b.onclick = () => fb.updateDoc(fb.doc(db, "feedback", b.dataset.id), { status: b.dataset.st, handledBy: uid() }).catch(e => toast(firebaseError(e), true)));
  }, (e) => { $("#list").innerHTML = `<div class="banner red">${esc(firebaseError(e))}</div>`; });
  state.unsub.push(un);
});

// ---------- settings ----------
route("/settings", () => {
  if (!state.user) return go("/employee");
  setTop(t("settings"));
  const mgr = isManager();
  view().innerHTML = `
    <h1 class="page-title">${esc(t("settings"))}</h1>
    ${state.profile ? dashHeader() : ""}
    <div class="stack">
      <a class="pill" href="#/settings/lang">${esc(t("change_lang"))}</a>
      <a class="pill" href="#/settings/password">${esc(t("change_pw"))}</a>
      <a class="pill" href="#/settings/fav">${esc(t("fav_page"))}</a>
      ${mgr ? `
      <a class="pill sky" href="#/settings/app">${esc(t("toggle_app"))}</a>
      <a class="pill sky" href="#/settings/users">${esc(t("toggle_users"))}</a>
      <a class="pill sky" href="#/settings/delegate">${esc(t("delegate"))}</a>` : ""}
      <button class="pill red" id="out">${esc(t("logout"))}</button>
    </div>`;
  $("#out").onclick = () => fb.signOut(auth).then(() => { sessionStorage.removeItem("kucmd_fav_done"); go("/"); });
});
route("/settings/lang", () => {
  setTop(t("change_lang"));
  view().innerHTML = `<h1 class="page-title">${esc(t("change_lang"))}</h1><div class="stack">
    <button class="pill ${getLang() === "ar" ? "fill" : ""}" data-l="ar">العربية</button>
    <button class="pill sky ${getLang() === "en" ? "fill" : ""}" data-l="en">English</button></div>`;
  $$("[data-l]").forEach(b => b.onclick = async () => {
    setLang(b.dataset.l);
    if (state.profile) { try { await fb.updateDoc(fb.doc(db, "users", uid()), { lang: b.dataset.l }); } catch { } }
    toast(t("saved_ok")); go("/settings");
  });
});
route("/settings/password", () => {
  if (!state.user) return go("/employee");
  setTop(t("change_pw"));
  view().innerHTML = `<h1 class="page-title">${esc(t("change_pw"))}</h1>
    <form class="form" id="f">
      <div class="field"><label>${esc(t("current_pw"))}</label><input name="cur" type="password" required autocomplete="current-password"></div>
      <div class="field"><label>${esc(t("new_pw"))}</label><input name="p1" type="password" required autocomplete="new-password"></div>
      <div class="field"><label>${esc(t("password2"))}</label><input name="p2" type="password" required autocomplete="new-password"></div>
      <button class="pill fill" type="submit">${esc(t("save"))}</button></form>`;
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    if (d.p1.length < 6) return toast(t("pw_short"), true);
    if (d.p1 !== d.p2) return toast(t("pw_mismatch"), true);
    busy(true);
    try {
      await fb.reauthenticateWithCredential(state.user, fb.EmailAuthProvider.credential(state.user.email, d.cur));
      await fb.updatePassword(state.user, d.p1);
      toast(t("pw_changed")); go("/settings");
    } catch (err) { toast(firebaseError(err), true); } finally { busy(false); }
  };
});
route("/settings/fav", () => {
  if (!state.profile) return go("/employee");
  setTop(t("fav_page"));
  view().innerHTML = `<h1 class="page-title">${esc(t("fav_page"))}</h1><div class="stack">${FAV_PAGES.map(p => `<button class="pill ${state.profile.favPage === p.id ? "fill" : ""}" data-p="${p.id}">${esc(L(p))}</button>`).join("")}</div>`;
  $$("[data-p]").forEach(b => b.onclick = async () => {
    try { await fb.updateDoc(fb.doc(db, "users", uid()), { favPage: b.dataset.p }); state.profile.favPage = b.dataset.p; toast(t("saved_ok")); go("/settings"); }
    catch (e) { toast(firebaseError(e), true); }
  });
});
route("/settings/app", () => {
  if (!isManager()) return go("/settings");
  setTop(t("toggle_app"));
  const draw = () => {
    const on = state.settings.active !== false;
    view().innerHTML = `<h1 class="page-title">${esc(t("toggle_app"))}</h1>
      <div class="banner ${on ? "green" : "red"} center"><b>${esc(on ? t("app_is_active") : t("app_is_off"))}</b></div>
      <div class="stack"><button class="pill fill" id="on" ${on ? "disabled" : ""}>${esc(t("activate"))}</button><button class="pill red" id="off" ${on ? "" : "disabled"}>${esc(t("suspend"))}</button></div>`;
    const set = (v) => async () => { if (!confirm("?")) return; try { await fb.setDoc(fb.doc(db, "settings", "app"), { active: v, updatedBy: uid(), updatedAt: fb.serverTimestamp() }, { merge: true }); state.settings.active = v; toast(t("saved_ok")); draw(); } catch (e) { toast(firebaseError(e), true); } };
    $("#on").onclick = set(true); $("#off").onclick = set(false);
  };
  draw();
});
route("/settings/users", () => {
  if (!isManager() && !["supervisor", "head"].includes(myRole())) return go("/settings");
  setTop(t("toggle_users"));
  view().innerHTML = `<h1 class="page-title">${esc(t("toggle_users"))}</h1><div id="list" class="list"></div>`;
  const role = myRole();
  const inScope = (u) => role === "manager" ? true : role === "supervisor" ? (supervisorOf(u.unit) === myUnit() || u.unit === myUnit()) : u.unit === myUnit();
  const un = fb.onSnapshot(fb.collection(db, "users"), (snap) => {
    const docs = snap.docs.filter(d => inScope(d.data()) && ["approved", "suspended"].includes(d.data().status) && d.id !== uid());
    const groups = {};
    docs.forEach(d => { const u = d.data(); (groups[u.unit] ||= []).push({ id: d.id, ...u }); });
    $("#list").innerHTML = Object.keys(groups).length ? UNITS.filter(u => groups[u.id]).map(u => `
      <h2 class="section">${esc(L(u))}</h2>${groups[u.id].map(x => `
      <div class="item"><div class="row"><span class="title">${esc(x.name)}</span>${tag(x.status, x.status === "approved" ? t("activate") : t("suspend"))}</div>
      <div class="meta">${esc(L(job(x.job)))} · ${esc(x.empId)} · ${esc(x.email)}</div>
      <div class="actions"><button class="pill sm ${x.status === "approved" ? "red" : "fill"}" data-id="${x.id}" data-to="${x.status === "approved" ? "suspended" : "approved"}">${esc(x.status === "approved" ? t("suspend") : t("activate"))}</button></div></div>`).join("")}`).join("")
      : `<p class="empty">${esc(t("nothing_here"))}</p>`;
    $$("[data-to]").forEach(b => b.onclick = () => fb.updateDoc(fb.doc(db, "users", b.dataset.id), { status: b.dataset.to, statusBy: uid(), statusAt: fb.serverTimestamp() }).then(() => toast(t("saved_ok"))).catch(e => toast(firebaseError(e), true)));
  }, (e) => { $("#list").innerHTML = `<div class="banner red">${esc(firebaseError(e))}</div>`; });
  state.unsub.push(un);
});
route("/settings/delegate", () => {
  if (!isManager()) return go("/settings");
  setTop(t("delegate"));
  const sups = JOBS.filter(j => j.role === "supervisor");
  const draw = () => {
    const d = state.settings.delegates || {};
    view().innerHTML = `<h1 class="page-title">${esc(t("delegate"))}</h1><p class="muted center">${esc(t("delegated_note"))}</p>
      <div class="stack">${sups.map(j => `<label class="check pill" style="justify-content:flex-start"><input type="checkbox" data-j="${j.id}" ${d[j.id] ? "checked" : ""}> ${esc(L(j))}</label>`).join("")}
      <button class="pill fill" id="save">${esc(t("save"))}</button></div>`;
    $("#save").onclick = async () => {
      const delegates = {}; $$("[data-j]").forEach(c => delegates[c.dataset.j] = c.checked);
      try { await fb.setDoc(fb.doc(db, "settings", "app"), { delegates, updatedBy: uid(), updatedAt: fb.serverTimestamp() }, { merge: true }); state.settings.delegates = delegates; toast(t("saved_ok")); go("/settings"); }
      catch (e) { toast(firebaseError(e), true); }
    };
  };
  draw();
});
