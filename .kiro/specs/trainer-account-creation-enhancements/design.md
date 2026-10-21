# Technical Design: Trainer Account Creation Enhancements

## Overview

All changes are confined to a single file: `client/src/components/AdminManagementDashboard.jsx`. There are no new API endpoints, no schema migrations, no new npm packages, and no changes to any other component. The work falls into four coordinated areas: (1) reordering the Role field to position 1 in both the Create and Edit modal forms, (2) replacing the `demoTrainer: boolean` state field with `experienceType: string` and adding the corresponding `<select>` widget, (3) changing `trainerLanguages` default from `['Tamil', 'English']` to `[]`, and (4) inserting three Trainer-conditional validation guards inside `handleCreateUser` before the first `axios.post` call. The existing toast mechanism, Tailwind class patterns, and handler architecture are all preserved; nothing new is introduced architecturally.

---

## Architecture

### Component structure

`AdminManagementDashboard` is a single large component. It owns all state and renders both modals inline at the bottom of its JSX. There are no sub-components to create or modify; all changes are local edits within the component function.

The two modals are:
- **Create modal** — controlled by `showAddUserModal`, form state in `newUserForm`, submission handled by `handleCreateUser`.
- **Edit modal** — controlled by `showEditUserModal`, form state in `editUserForm`, submission handled by `handleSaveEditUser`.

### Data flow

```
User selects Role (position 1 in form)
    │
    ▼
newUserForm.role === 'Trainer'
    │  yes                           │  no
    ▼                                ▼
Trainer Details section renders    Trainer section hidden
(Language toggles, Experience       Role-specific notes
 Type select, Branch select         (HR note) still conditional
 shown — all mandatory)             on role as today
    │
    ▼
handleCreateUser()
  1. Base validation (name, email, phone)
  2. Trainer-only validation (language, experienceType, branch)
  3. axios.post /api/admin/users  ← only reached if all guards pass
  4. axios.put /api/trainer/settings/:id  ← payload uses derived fields
  5. State reset
```

### Invariant ownership

Client-side validation is the sole enforcement layer for the three new mandatory trainer fields (language, experienceType, branch). Server-side validation of these fields is out of scope per NFR-1; the existing API already accepts all three Trainer document fields. The component owns the invariant and enforces it entirely in `handleCreateUser` before any network call is made.

---

## Components and Interfaces

### Validation logic (section 2)

The new validation guards are inserted **immediately after** the existing base-field guard (line ~443) and **before** the `newUser` object construction. No other logic in `handleCreateUser` moves.

**Pseudocode:**

```
// Existing guard (unchanged):
if (!name || !email || !phone) → showToast warning; return

// NEW: Trainer-only guards (inserted here, before newUser construction):
if role === 'Trainer':
  if trainerLanguages.length === 0:
    showToast('⚠️ Please select at least one language taught.')
    return                    // no axios call made
  if experienceType === '':
    showToast('⚠️ Please select an Experience Type for this trainer.')
    return                    // no axios call made
  if branch === '':
    showToast('⚠️ Campus Branch is required for Trainer accounts.')
    return                    // no axios call made

// Existing newUser construction + axios.post continues unchanged
```

Each guard uses the existing `showToast` function, consistent with NFR-2 and Requirement 5. Guards execute in the order: Language → Experience Type → Branch, matching the visual top-to-bottom order of those fields in the Trainer Details section.

---

### `experienceType` → Trainer document payload mapping (section 3)

Inside the `axios.put('/api/trainer/settings/:id', {...})` call (line ~481), the three derived fields replace the current hardcoded values:

| `experienceType` value | `demoTrainer` | `isExperienced` | `experienceLevel` |
|------------------------|---------------|-----------------|-------------------|
| `'demo'`               | `true`        | `true`          | `'demo'`          |
| `'regular'`            | `false`       | `true`          | `'regular'`       |
| `'fresher'`            | `false`       | `false`         | `'fresher'`       |

Implementation as a lookup in the handler (replaces the current `demoTrainer: newUserForm.demoTrainer` and hardcoded `isExperienced: true` lines):

```js
const EXPERIENCE_MAP = {
  demo:    { demoTrainer: true,  isExperienced: true,  experienceLevel: 'demo'    },
  regular: { demoTrainer: false, isExperienced: true,  experienceLevel: 'regular' },
  fresher: { demoTrainer: false, isExperienced: false, experienceLevel: 'fresher' },
};
const expFields = EXPERIENCE_MAP[newUserForm.experienceType] || EXPERIENCE_MAP['fresher'];
```

The `expFields` object is then spread into the `axios.put` payload:
```js
await axios.put(`/api/trainer/settings/${encodeURIComponent(newUserForm.trainerId)}`, {
  trainerName: newUserForm.name,
  email: ...,
  zoomEmail: ...,
  courseKey: newUserForm.expertCourse,
  expertCourse: courseLabel,
  specialization: courseLabel,
  languages: newUserForm.trainerLanguages,
  branchName: newUserForm.branch,
  ...expFields,                  // ← replaces demoTrainer + isExperienced lines
  active: true,
  shift: ...,
  shiftStartMin: ...,
  shiftEndMin: ...
});
```

`EXPERIENCE_MAP` is defined as a `const` at the top of `handleCreateUser` (not module scope), since it is only used here and keeps the handler self-contained.

---

### JSX changes — Create modal field order (section 4)

#### Current field rendering order (lines ~2340–2510):
1. FULL NAME
2. EMAIL (`* REQUIRED`)
3. MOBILE NUMBER (`* MANDATORY`)
4. ROLE (custom dropdown)
5. TEMPORARY PASSWORD
6. CAMPUS BRANCH
7. HR Click-to-Call note (conditional on HR/HR TL/Dept Head · HR)
8. Trainer Details section (conditional on role === 'Trainer')

#### Target field rendering order:
1. **ROLE** (moved from position 4 — the entire `<div className="relative">` block including the dropdown portal)
2. FULL NAME
3. EMAIL (`* REQUIRED`)
4. MOBILE NUMBER (`* MANDATORY`)
5. TEMPORARY PASSWORD
6. CAMPUS BRANCH (label updated to add `* REQUIRED` indicator when role === 'Trainer')
7. HR Click-to-Call note (unchanged, same condition)
8. Trainer Details section (unchanged, same condition — Trainer ID, Zoom Email, Expert Course, Languages Taught, Shift times)
   - `demoTrainer` checkbox **removed** from bottom of Trainer Details section
   - **Experience Type** `<select>` inserted after Languages Taught and before Shift times

The Role `<div className="relative">` block is a self-contained JSX fragment (~40 lines). Moving it means cutting it from its current position and pasting it as the first child of the `<form>` element. No internal changes to the Role block itself are needed for the Create modal move.

#### Campus Branch label update for Trainer role

The CAMPUS BRANCH `<label>` currently has no required indicator. When `newUserForm.role === 'Trainer'`, the label must display `* REQUIRED` inline, matching the pattern used on the EMAIL field:

```jsx
<label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase mb-1.5 block flex items-center justify-between">
  <span>CAMPUS BRANCH</span>
  {newUserForm.role === 'Trainer' && (
    <span className="text-rose-500 font-bold text-[10px]">* REQUIRED</span>
  )}
</label>
```

No other change to the Campus Branch field is needed; the `<select>` and `<ChevronDown>` wrapper are unchanged.

---

### Experience Type `<select>` widget (section 5)

This widget is inserted inside the blue Trainer Details `<div>` (the `role === 'Trainer'` section), **after** the Languages Taught toggle buttons block and **before** the Shift Start / Shift End `<div className="grid grid-cols-2 gap-3">`.

The widget uses the identical Tailwind class pattern as the Expert Course dropdown immediately above it (lines ~2539–2555), per NFR-2:

```jsx
<div>
  <label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase mb-1.5 block flex items-center justify-between">
    <span>EXPERIENCE TYPE</span>
    <span className="text-rose-500 font-bold text-[10px]">* REQUIRED</span>
  </label>
  <div className="relative">
    <select
      value={newUserForm.experienceType}
      onChange={(e) => setNewUserForm({ ...newUserForm, experienceType: e.target.value })}
      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 bg-white text-slate-800 focus:outline-none text-sm shadow-2xs font-medium appearance-none cursor-pointer transition-all"
    >
      <option value="">Select experience type</option>
      <option value="demo">Demo Trainer</option>
      <option value="regular">Regular Trainer</option>
      <option value="fresher">Fresher Trainer</option>
    </select>
    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
  </div>
</div>
```

The `<option value="">Select experience type</option>` placeholder is intentional: it ensures `experienceType` starts as `''` and the validation guard catches a missing selection.

#### `demoTrainer` checkbox removal

The `<label>` block containing the `demoTrainer` checkbox (lines ~2615–2621) is deleted entirely. It is replaced by the Experience Type select above. No other JSX references `newUserForm.demoTrainer` in the Create modal.

---

### Languages Taught label update (section 6)

The LANGUAGES TAUGHT label currently has no required indicator. Update to match the `* REQUIRED` pattern:

```jsx
<label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase mb-1.5 block flex items-center justify-between">
  <span>LANGUAGES TAUGHT</span>
  <span className="text-rose-500 font-bold text-[10px]">* REQUIRED</span>
</label>
```

---

### JSX changes — Edit modal field order (section 7)

#### Current field rendering order in the Edit modal form (lines ~2736–2890):
1. FULL NAME
2. EMAIL ADDRESS + MOBILE NUMBER (two-column grid)
3. ROLE DESIGNATION (custom dropdown)
4. DEPARTMENT + BRANCH ASSIGNMENT (two-column grid)
5. LOGIN PASSWORD + ACCOUNT STATUS (two-column grid)

#### Target field rendering order:
1. **ROLE DESIGNATION** (moved from position 3)
2. FULL NAME
3. EMAIL ADDRESS + MOBILE NUMBER (two-column grid, unchanged)
4. DEPARTMENT + BRANCH ASSIGNMENT (two-column grid, unchanged)
5. LOGIN PASSWORD + ACCOUNT STATUS (two-column grid, unchanged)

The Edit modal ROLE block (the `<div className="relative">` with `isEditRoleDropdownOpen`) is cut from position 3 and pasted as the first child of the Edit modal `<form>`. No internal changes to the Edit modal Role block.

No new mandatory fields, no trainer-specific sections, and no state changes are introduced to the Edit modal (Requirement 7, AC2).

---

### Affected code locations — summary table (section 10)

| Location | Line (approx.) | Change |
|---|---|---|
| `newUserForm` useState initialisation | 284 | `demoTrainer: false` → `experienceType: ''`; `trainerLanguages` default → `[]` |
| `handleCreateUser` — validation block | 443 | Insert three new Trainer-conditional guards after existing guard |
| `handleCreateUser` — `axios.put` payload | 490 | Replace `demoTrainer` + hardcoded `isExperienced: true` with `...expFields` spread |
| `handleCreateUser` — reset block | 516 | Same state shape change as initialisation |
| Create modal `<form>` child order | 2340 | Move Role `<div className="relative">` to position 1 |
| Create modal CAMPUS BRANCH label | 2474 | Add conditional `* REQUIRED` indicator |
| Create modal LANGUAGES TAUGHT label | 2558 | Add `* REQUIRED` indicator |
| Create modal Trainer Details section | 2613 | Delete `demoTrainer` checkbox; insert Experience Type select before Shift grid |
| Edit modal `<form>` child order | 2736 | Move Role `<div className="relative">` to position 1 |

---

## Data Models

### State shape changes (section 1)

#### `newUserForm` — initial state (line ~284) and reset block (line ~516)

**Before:**
```js
const [newUserForm, setNewUserForm] = useState({
  name: '',
  email: '',
  phone: '',
  role: 'HR',
  department: 'Admissions & Counseling',
  branch: '',
  password: '',
  trainerId: '',
  zoomEmail: '',
  expertCourse: 'CPC',
  trainerLanguages: ['Tamil', 'English'],
  shiftStart: '06:00',
  shiftEnd: '14:00',
  demoTrainer: false
});
```

**After:**
```js
const [newUserForm, setNewUserForm] = useState({
  name: '',
  email: '',
  phone: '',
  role: 'HR',
  department: 'Admissions & Counseling',
  branch: '',
  password: '',
  trainerId: '',
  zoomEmail: '',
  expertCourse: 'CPC',
  trainerLanguages: [],          // changed: was ['Tamil', 'English']
  shiftStart: '06:00',
  shiftEnd: '14:00',
  experienceType: ''             // replaces demoTrainer: false
});
```

The same object literal must be applied to the **reset block** inside `handleCreateUser` (line ~516) — it is a separate copy and both must change identically.

#### `editUserForm` — no change

The Edit modal does not collect trainer-specific fields (out of scope per Requirement 7). `editUserForm` state shape is unchanged.

---

### Form reset — canonical state after submission or close (section 9)

Both the post-submission reset inside `handleCreateUser` and the `onClick` close handler (X button and backdrop click) must use the same target object. The modal close handlers currently call `setNewUserForm` only implicitly through the form submission path; the close-without-submit path does **not** reset the form state today. This feature does not change that behaviour — reset on close is not required by the spec and is out of scope.

The post-submission reset object:

```js
setNewUserForm({
  name: '',
  email: '',
  phone: '',
  role: 'HR',
  department: 'Admissions & Counseling',
  branch: '',
  password: '',
  trainerId: '',
  zoomEmail: '',
  expertCourse: 'CPC',
  trainerLanguages: [],          // changed from ['Tamil', 'English']
  shiftStart: '06:00',
  shiftEnd: '14:00',
  experienceType: ''             // replaces demoTrainer: false
});
```

---

## Error Handling

| Failing condition | `axios` call made? | Toast message | Recoverable? |
|---|---|---|---|
| Missing name / email / phone (existing) | No | `⚠️ Please enter name, email, and mobile number (mandatory for all roles).` | Yes — user corrects field |
| Trainer: no language selected | No | `⚠️ Please select at least one language taught.` | Yes |
| Trainer: no experience type selected | No | `⚠️ Please select an Experience Type for this trainer.` | Yes |
| Trainer: no branch selected | No | `⚠️ Campus Branch is required for Trainer accounts.` | Yes |
| `axios.post /api/admin/users` network/server error | N/A (already called) | `` ⚠ ${err?.response?.data?.error \|\| 'Could not create the user'} `` | Yes — user retries |
| `axios.put /api/trainer/settings/:id` network/server error | N/A (already called) | `console.warn` only (existing behaviour, unchanged) | Yes — non-fatal |

All client-side validation errors are logged nowhere; only the toast is shown. This matches the existing pattern for the base-field guard. The Trainer roster PUT failure remains a soft warn (not a toast) matching current behaviour, since the User account was already created successfully at that point.

---

## Testing Strategy

### Unit-testable in isolation

- The `EXPERIENCE_MAP` lookup: given each of the three `experienceType` values, assert the three derived fields match the mapping table.
- The validation guard logic: given a `newUserForm` object with `role === 'Trainer'` and each missing field in turn, assert that the matching toast message is produced and the axios mock is not called.
- The reset object: assert that after a successful create, `newUserForm.trainerLanguages` is `[]`, `newUserForm.experienceType` is `''`, and `newUserForm.role` is `'HR'`.

### Integration / render tests

- Render the component, open the Create modal, confirm the first rendered form field is the Role dropdown (not FULL NAME).
- Select `Trainer` from Role, confirm the Trainer Details section is visible, the `demoTrainer` checkbox is absent, and the Experience Type select is present.
- Submit the form with Trainer role and zero languages toggled; confirm no POST is fired and the toast reads the expected language error text.
- Render the Edit modal for any user; confirm the first rendered form field is ROLE DESIGNATION.

### What cannot be covered without a running server

The `axios.put` payload shape reaching the actual Trainer document — this requires an integration test against a live MongoDB instance or an MSW mock for `/api/trainer/settings/:id`.

---

## Edge Cases

- **Role dropdown auto-assigns `trainerId`**: when Role changes to `Trainer`, the existing `onClick` handler auto-generates a `trainerId` if one is not already set. This behaviour is unchanged. The validation guard for `trainerId` already exists implicitly through the `if (newUserForm.role === 'Trainer' && newUserForm.trainerId)` condition on line 477 — the Trainer roster PUT is simply skipped if `trainerId` is blank. Since the auto-generation runs on role selection, `trainerId` will always be populated by the time the admin submits, but this is not enforced by the new validation guards (it was not enforced before and is not a requirement).

- **`EXPERIENCE_MAP` fallback**: the `|| EXPERIENCE_MAP['fresher']` fallback in the handler guards against a hypothetical future `experienceType` value that is not in the map. In practice, with the three `<option>` values defined, `experienceType` will always be one of `'demo'`, `'regular'`, `'fresher'`, or `''`. The validation guard blocks `''` before the payload is ever constructed, so the fallback is a belt-and-suspenders safety only.

- **Non-Trainer role with branch empty**: the Campus Branch field remains optional for all non-Trainer roles. The new Trainer-conditional branch guard is scoped inside `if (newUserForm.role === 'Trainer')`, so it does not affect HR, Branch Manager, or any other role. Requirement 4, AC3 is satisfied by the guard's conditional structure.

- **`trainerLanguages` default `[]` and the language toggle buttons**: the toggle buttons use `newUserForm.trainerLanguages.includes(lang)` to determine the selected state. Changing the default from `['Tamil', 'English']` to `[]` means no language is highlighted when the form first opens. When the form is reset after a successful submission, all toggles return to unselected state. This is the behaviour required by Requirement 2, AC2.

- **Edit modal and existing trainers**: the Edit modal does not load `experienceType` or `trainerLanguages` from the existing user record (those fields live on the Trainer document, not the User document). The Edit modal only edits the User login record. No mandatory trainer fields are added to the Edit modal. This is explicitly out of scope per Requirement 7, AC2.
