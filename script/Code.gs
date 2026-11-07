/** @OnlyCurrentDoc */
/**
 * Weekly Gym Plan – your log, stored in this Google Sheet.
 *
 * What this does:
 *   - The app on your phone sends each set you tick here, and reads your log back from here.
 *   - Everything is kept in the "Data" tab (one row per day/check-in). Leave that tab as it is.
 *   - After every change it rewrites two readable tabs, "Sets" and "Check-ins", for you to look at.
 *   - The first time the app connects, your log so far (from the Claude version) is copied in.
 *
 * You don't need to change anything in this file.
 */

const DATA_TAB = "Data";
const EX = {"bench": {"n": "Barbell bench press", "u": "reps", "h": false}, "ohp": {"n": "Seated dumbbell shoulder press", "u": "reps", "h": true}, "incdb": {"n": "Incline dumbbell press", "u": "reps", "h": true}, "lat": {"n": "Dumbbell lateral raise", "u": "reps", "h": true}, "push": {"n": "Cable triceps pushdown", "u": "reps", "h": false}, "plank": {"n": "Front plank", "u": "sec", "h": false}, "squat": {"n": "Barbell back squat", "u": "reps", "h": false}, "lp": {"n": "Leg press", "u": "reps", "h": false}, "lunge": {"n": "Dumbbell reverse lunge", "u": "reps", "h": true}, "lext": {"n": "Leg extension", "u": "reps", "h": false}, "calf": {"n": "Standing calf raise", "u": "reps", "h": false}, "deadbug": {"n": "Dead bug", "u": "reps", "h": false}, "pd": {"n": "Lat pulldown", "u": "reps", "h": false}, "row": {"n": "One-arm dumbbell row", "u": "reps", "h": true}, "crow": {"n": "Seated cable row", "u": "reps", "h": false}, "face": {"n": "Cable face pull", "u": "reps", "h": false}, "curl": {"n": "Dumbbell curl", "u": "reps", "h": true}, "hkr": {"n": "Hanging knee raise", "u": "reps", "h": false}, "rdl": {"n": "Romanian deadlift", "u": "reps", "h": false}, "ht": {"n": "Barbell hip thrust", "u": "reps", "h": false}, "lcurl": {"n": "Lying leg curl", "u": "reps", "h": false}, "goblet": {"n": "Goblet squat", "u": "reps", "h": false}, "hammer": {"n": "Hammer curl", "u": "reps", "h": true}, "ohe": {"n": "Seated overhead triceps extension", "u": "reps", "h": false}, "carry": {"n": "Farmer's carry", "u": "m", "h": true}};
const WORKOUT = {"mon": "Push", "tue": "Squat", "thu": "Pull", "fri": "Hinge"};
const SEED = {};

function doGet() {
  return json_({ ok: true, app: "weekly-gym-plan" });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    if (body.action === "list") {
      return json_({ docs: readAll_(), sheet: SpreadsheetApp.getActive().getUrl() });
    }
    if (body.action === "set") {
      if (!body.id || typeof body.data !== "object") throw new Error("Missing id or data");
      write_(String(body.id), body.data);
      rebuild_();
      return json_({ ok: true });
    }
    if (body.action === "delete") {
      remove_(String(body.id));
      rebuild_();
      return json_({ ok: true });
    }
    throw new Error("Unknown action");
  } catch (err) {
    return json_({ error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- storage ---------- */
function dataTab_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(DATA_TAB);
  if (!sh) {
    sh = ss.insertSheet(DATA_TAB);
    sh.getRange(1, 1, 1, 3).setValues([["id", "json", "saved at"]]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}
function rows_() {
  const sh = dataTab_(), n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, 2).getValues();
}
function readAll_() {
  let rows = rows_();
  if (!rows.length && SEED && Object.keys(SEED).length) {
    Object.keys(SEED).forEach(function (id) { write_(id, SEED[id]); });
    rebuild_();
    rows = rows_();
  }
  const out = {};
  rows.forEach(function (r) { if (r[0]) { try { out[r[0]] = JSON.parse(r[1]); } catch (e) {} } });
  return out;
}
function write_(id, data) {
  const sh = dataTab_(), n = sh.getLastRow();
  const ids = n < 2 ? [] : sh.getRange(2, 1, n - 1, 1).getValues().map(function (r) { return r[0]; });
  const row = [id, JSON.stringify(data), new Date()];
  const i = ids.indexOf(id);
  if (i >= 0) sh.getRange(i + 2, 1, 1, 3).setValues([row]); else sh.appendRow(row);
}
function remove_(id) {
  const sh = dataTab_(), n = sh.getLastRow();
  if (n < 2) return;
  const ids = sh.getRange(2, 1, n - 1, 1).getValues().map(function (r) { return r[0]; });
  const i = ids.indexOf(id);
  if (i >= 0) sh.deleteRow(i + 2);
}

/* ---------- readable tabs ---------- */
function weekday_(d) {
  const p = d.split("-").map(Number);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(p[0], p[1] - 1, p[2]).getDay()];
}
function rebuild_() {
  const docs = {};
  rows_().forEach(function (r) { if (r[0]) { try { docs[r[0]] = JSON.parse(r[1]); } catch (e) {} } });
  const sets = [["Date", "Day", "Workout", "Exercise", "Set", "Weight (kg)", "Reps / sec", "Unit", "Volume (kg)", "Note"]];
  Object.keys(docs).filter(function (k) { return docs[k] && docs[k].type === "session"; })
    .sort(function (a, b) { return docs[a].date < docs[b].date ? -1 : docs[a].date > docs[b].date ? 1 : 0; })
    .forEach(function (k) {
      const s = docs[k];
      Object.keys(s.sets || {}).forEach(function (id) {
        const ex = EX[id]; if (!ex) return;
        let n = 0;
        (s.sets[id] || []).forEach(function (x) {
          if (!x || !x.done) return; n++;
          const vol = x.kg && x.reps ? Math.round(x.kg * x.reps * (ex.h ? 2 : 1) * 10) / 10 : "";
          sets.push([s.date, weekday_(s.date), WORKOUT[s.day] || "", ex.n, n, x.kg == null ? "" : x.kg, x.reps == null ? "" : x.reps, ex.u, vol, ex.h ? "kg per hand" : ""]);
        });
      });
      if (s.extra && s.extra.walk) sets.push([s.date, weekday_(s.date), WORKOUT[s.day] || "", "Incline walk (finisher)", 1, "", "", "", "", "done"]);
    });
  const ci = [["Date", "Weight (kg)", "Body fat (%)", "Waist (cm)"]];
  ((docs.checkins && docs.checkins.entries) || []).slice()
    .sort(function (a, b) { return a.date < b.date ? -1 : 1; })
    .forEach(function (e) { ci.push([e.date, e.weight == null ? "" : e.weight, e.bf == null ? "" : e.bf, e.waist == null ? "" : e.waist]); });
  writeTab_("Sets", sets);
  writeTab_("Check-ins", ci);
}
function writeTab_(name, values) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clearContents();
  sh.getRange(1, 1, values.length, values[0].length).setValues(values);
  sh.getRange(1, 1, 1, values[0].length).setFontWeight("bold");
  sh.setFrozenRows(1);
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
