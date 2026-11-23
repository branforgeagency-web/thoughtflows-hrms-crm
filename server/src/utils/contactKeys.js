import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Indexed contact keys for Student and StudentLead
//
// Phone numbers are stored as typed ("+91 98765-43210", "098765 43210", …), so
// matching one used to need a regex like /3\D*2\D*1\D*0\D*$/ that MongoDB can't
// serve from an index — every duplicate check / bulk-upload row read the whole
// collection. Each record now also carries:
//   phoneKeys — last 10 digits of phone, WhatsApp, alternate and additional numbers
//   emailKey  — trimmed, lower-cased email
// both indexed, kept in step by the model hooks below (save, insertMany and
// update queries), and filled in for old records by a one-time background
// backfill at startup. Until that backfill finishes, lookups fall back to the
// old regex queries, so results never change — only the speed.
// ---------------------------------------------------------------------------
export const CONTACT_FIELDS = ['phone', 'whatsappNumber', 'alternatePhone', 'additionalNumber', 'email'];
const PHONE_FIELDS = CONTACT_FIELDS.filter((f) => f !== 'email');

export const phoneKey = (v) => {
  const d = String(v ?? '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : '';
};
export const emailKeyOf = (v) => String(v ?? '').trim().toLowerCase();
export const contactKeysOf = (doc = {}) => ({
  phoneKeys: [...new Set(PHONE_FIELDS.map((f) => phoneKey(doc[f])).filter(Boolean))],
  emailKey: emailKeyOf(doc.email)
});

const touchesContact = (update = {}) => {
  const parts = [update, update.$set, update.$unset, update.$setOnInsert].filter(Boolean);
  return parts.some((p) => CONTACT_FIELDS.some((f) => Object.prototype.hasOwnProperty.call(p, f)));
};

// Recompute keys for these _ids straight on the collection (no hooks, no recursion)
async function refreshKeysFor(Model, ids) {
  if (!ids?.length) return;
  const docs = await Model.collection.find({ _id: { $in: ids } }, { projection: Object.fromEntries(CONTACT_FIELDS.map((f) => [f, 1])) }).toArray();
  if (!docs.length) return;
  await Model.collection.bulkWrite(docs.map((d) => ({ updateOne: { filter: { _id: d._id }, update: { $set: contactKeysOf(d) } } })), { ordered: false });
}

export function addContactKeys(schema) {
  schema.add({
    phoneKeys: { type: [String], default: undefined },
    emailKey: { type: String, default: undefined }
  });
  schema.index({ phoneKeys: 1 });
  schema.index({ emailKey: 1 });

  schema.pre('save', function contactKeysOnSave(next) {
    if (this.isNew || this.phoneKeys === undefined || CONTACT_FIELDS.some((f) => this.isModified(f))) {
      const k = contactKeysOf(this);
      this.phoneKeys = k.phoneKeys;
      this.emailKey = k.emailKey;
    }
    next();
  });

  schema.pre('insertMany', function contactKeysOnInsertMany(next, docs) {
    (Array.isArray(docs) ? docs : [docs]).forEach((d) => { if (d) Object.assign(d, contactKeysOf(d)); });
    next();
  });

  // Update queries: note which records are about to change (the filter may stop
  // matching once a phone is rewritten), then recompute their keys afterwards.
  for (const op of ['updateOne', 'updateMany', 'findOneAndUpdate']) {
    schema.pre(op, async function contactKeysBeforeUpdate() {
      if (!touchesContact(this.getUpdate() || {})) return;
      this._contactKeyIds = await this.model.find(this.getFilter()).select('_id').limit(op === 'updateMany' ? 5000 : 1).lean().then((r) => r.map((x) => x._id));
    });
    schema.post(op, async function contactKeysAfterUpdate(res) {
      const ids = this._contactKeyIds;
      if (!ids) return;
      const extra = op === 'findOneAndUpdate' && res?._id ? [res._id] : [];
      try { await refreshKeysFor(this.model, [...ids, ...extra]); } catch (e) { console.warn('[contactKeys] refresh failed:', e.message); }
    });
  }
}

// ---- One-time backfill for records saved before the keys existed ----
const ready = new Map(); // modelName → true once every record has keys
export const contactKeysReady = (Model) => ready.get(Model.modelName) === true;

async function backfill(Model) {
  const missing = { phoneKeys: { $exists: false } };
  const total = await Model.collection.countDocuments(missing);
  if (total) console.log(`[contactKeys] ${Model.modelName}: filling lookup keys for ${total} records…`);
  const cursor = Model.collection.find(missing, { projection: Object.fromEntries(CONTACT_FIELDS.map((f) => [f, 1])) }).batchSize(1000);
  let batch = [];
  let done = 0;
  for await (const d of cursor) {
    batch.push({ updateOne: { filter: { _id: d._id }, update: { $set: contactKeysOf(d) } } });
    if (batch.length >= 1000) { await Model.collection.bulkWrite(batch, { ordered: false }); done += batch.length; batch = []; }
  }
  if (batch.length) { await Model.collection.bulkWrite(batch, { ordered: false }); done += batch.length; }
  // Indexes are built by Mongoose on startup; make sure they exist before relying on them
  await Model.createIndexes();
  ready.set(Model.modelName, true);
  if (total) console.log(`[contactKeys] ${Model.modelName}: done (${done} records).`);
}

export function startContactKeyBackfill(models) {
  const run = () => {
    models.forEach((M) => {
      if (ready.get(M.modelName)) return;
      backfill(M).catch((e) => console.warn(`[contactKeys] ${M.modelName} backfill failed (will retry on reconnect):`, e.message));
    });
  };
  if (mongoose.connection.readyState === 1) run();
  mongoose.connection.on('connected', run);
}

// Mongo filter for "records with any of these phones or this email".
// Nothing to look up → a filter that matches nothing (never "everything").
const MATCH_NOTHING = { _id: { $exists: false } };
export function contactFilter(Model, { phones = [], email = '' } = {}) {
  const keys = [...new Set(phones.map(phoneKey).filter(Boolean))];
  const mail = emailKeyOf(email);
  if (!keys.length && !mail) return MATCH_NOTHING;
  if (contactKeysReady(Model)) {
    const or = [];
    if (keys.length) or.push({ phoneKeys: { $in: keys } });
    if (mail) or.push({ emailKey: mail });
    return or.length === 1 ? or[0] : { $or: or };
  }
  // Backfill still running — the old (slow, unindexed) regex match
  const or = [];
  keys.forEach((k) => {
    const rx = new RegExp(`${k.slice(-4).split('').join('\\D*')}\\D*$`);
    or.push({ phone: rx }, { whatsappNumber: rx });
  });
  if (mail) or.push({ email: new RegExp(`^\\s*${mail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') });
  return { $or: or };
}
