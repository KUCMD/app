// Entry point: wires auth + settings listeners, top bar, and the router.
import { auth, db, fb, state, render, go, $, view, esc } from "./core.js";
import { getLang, setLang, t } from "./i18n.js";
import "./public.js";
import "./employee.js";

if (getLang()) setLang(getLang());

// top bar buttons
$("#btn-home").onclick = () => go("/");
$("#btn-settings").onclick = () => go("/settings");

// live app settings (active flag, delegates)
fb.onSnapshot(fb.doc(db, "settings", "app"), (snap) => {
  state.settings = { active: true, delegates: {}, ...(snap.exists() ? snap.data() : {}) };
  if (state.ready) render();
}, () => { /* unauthenticated users can't read settings — defaults apply */ });

// auth + profile
let profileUnsub = null;
fb.onAuthStateChanged(auth, (user) => {
  state.user = user;
  if (profileUnsub) { profileUnsub(); profileUnsub = null; }
  if (!user) {
    state.profile = null;
    if (!state.ready) { state.ready = true; render(); }
    else if (location.hash.startsWith("#/dashboard") || location.hash.startsWith("#/settings")) go("/");
    else render();
    return;
  }
  profileUnsub = fb.onSnapshot(fb.doc(db, "users", user.uid), (snap) => {
    state.profile = snap.exists() ? snap.data() : null;
    if (state.profile?.lang && state.profile.lang !== getLang()) setLang(state.profile.lang);
    if (!state.ready) { state.ready = true; }
    render();
  }, (e) => { console.error(e); state.profile = null; state.ready = true; render(); });
});

window.addEventListener("hashchange", () => { if (state.ready) render(); });

// register the service worker for installability / basic offline shell
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => { }));
}
