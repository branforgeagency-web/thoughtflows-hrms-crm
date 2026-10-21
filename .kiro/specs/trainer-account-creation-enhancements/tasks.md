# Implementation Plan: Trainer Account Creation Enhancements

## Overview

All changes are confined to a single file:
`client/src/components/AdminManagementDashboard.jsx`

The work enhances the Create Account and Edit Account modals in the Admin Management Dashboard. Key changes include: reordering the Role dropdown to appear first in both modals, replacing the `demoTrainer` boolean checkbox with a three-way `experienceType` select, adding required-field indicators and validation guards for Trainer accounts, and updating the `axios.put` trainer-profile payload to derive `demoTrainer`, `isExperienced`, and `experienceLevel` from an `EXPERIENCE_MAP` lookup.

---

## Task Dependency Graph

```
Task 1 (state shape: experienceType, trainerLanguages)
  └─ Task 5  (remove demoTrainer checkbox — state ref gone after Task 1)
  └─ Task 6  (insert experienceType <select> — binds to newUserForm.experienceType)
  └─ Task 7  (validation guards — reads experienceType and trainerLanguages)
  └─ Task 8  (EXPERIENCE_MAP payload — reads experienceType)

Tasks 2, 3, 4, 9 are independent of all other tasks and of each other
  (they touch only JSX layout / labels with no state dependencies)
```

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1"],
      "description": "State shape foundation — must complete before any tasks that reference experienceType, trainerLanguages, or demoTrainer"
    },
    {
      "wave": 2,
      "tasks": ["2", "3", "4", "9"],
      "description": "Independent JSX layout and label changes — no state dependencies, can run in parallel"
    },
    {
      "wave": 3,
      "tasks": ["5", "6", "7", "8"],
      "description": "State-dependent changes — require Task 1 to complete first; safe to run in parallel within this wave"
    }
  ]
}
```

**Recommended execution order:** 1 → 2, 3, 4, 9 (any order) → 5, 6, 7, 8 (any order)

---

## Tasks

- [ ] 1. Update `newUserForm` state shape — replace `demoTrainer` with `experienceType` and change `trainerLanguages` default to `[]`

  Replace `demoTrainer: false` with `experienceType: ''` and change `trainerLanguages` from `['Tamil', 'English']` to `[]` in **two places**: the `useState` initialisation (~line 284) and the reset block at the end of `handleCreateUser` (~line 516). Both copies must use the identical object literal.

  File: `client/src/components/AdminManagementDashboard.jsx`

  Acceptance criteria:
  - `newUserForm` initial state has `experienceType: ''` and `trainerLanguages: []`; `demoTrainer` is absent.
  - The reset block inside `handleCreateUser` (called after a successful `axios.post`) uses the same shape.
  - No other state references `demoTrainer` on `newUserForm` anywhere in the component.
  - Satisfies Requirement 6 AC1 and AC2.

---

- [ ] 2. Move the Role dropdown to position 1 in the Create Account modal form

  Cut the entire `<div className="relative">` block that renders the ROLE custom dropdown (currently the fourth `<div>` inside the Create modal `<form>`, starting with the `<label>ROLE</label>`) and paste it as the **first child** of that `<form>` element, before the FULL NAME field. No changes to the internal markup of the Role block itself.

  File: `client/src/components/AdminManagementDashboard.jsx`

  Acceptance criteria:
  - The Create modal form renders: ROLE → FULL NAME → EMAIL → MOBILE NUMBER → TEMPORARY PASSWORD → CAMPUS BRANCH → (conditional sections).
  - The Role dropdown's `onClick`, `isRoleDropdownOpen` toggle, role list, and auto-`trainerId` generation all continue to work unchanged.
  - Satisfies Requirement 1 AC1 and AC3.

---

- [ ] 3. Add conditional `* REQUIRED` indicator to the CAMPUS BRANCH label in the Create modal

  Update the CAMPUS BRANCH `<label>` in the Create modal from a plain text label to a flex row that shows a `* REQUIRED` badge on the right **only when** `newUserForm.role === 'Trainer'`. Match the pattern used on the EMAIL label (`flex items-center justify-between` with a `<span className="text-rose-500 font-bold text-[10px]">* REQUIRED</span>`).

  File: `client/src/components/AdminManagementDashboard.jsx`

  Acceptance criteria:
  - For non-Trainer roles the CAMPUS BRANCH label renders identically to today (no badge).
  - When Role is set to `Trainer` the label shows `* REQUIRED` in rose-500.
  - Satisfies NFR-3 and Requirement 4 AC1.

---

- [ ] 4. Add `* REQUIRED` indicator to the LANGUAGES TAUGHT label in the Trainer Details section

  Replace the plain LANGUAGES TAUGHT `<label>` inside the blue Trainer Details `<div>` with the same `flex items-center justify-between` pattern used on EMAIL, adding a permanent `<span className="text-rose-500 font-bold text-[10px]">* REQUIRED</span>` on the right (this label only renders when `role === 'Trainer'`, so the badge is always appropriate).

  File: `client/src/components/AdminManagementDashboard.jsx`

  Acceptance criteria:
  - The LANGUAGES TAUGHT label always shows `* REQUIRED` when the Trainer Details section is visible.
  - No other change to the language toggle buttons or their logic.
  - Satisfies NFR-3 and Requirement 2.

---

- [ ] 5. Remove the `demoTrainer` checkbox from the Trainer Details section

  Delete the `<label>` block containing the `demoTrainer` checkbox at the bottom of the Trainer Details section (~lines 2615–2621). This is the block:
  ```jsx
  <label className="flex items-center gap-2.5 cursor-pointer select-none">
    <input type="checkbox" checked={newUserForm.demoTrainer} … />
    <span …>Eligible to receive demo booking notifications</span>
  </label>
  ```
  No other JSX in the Create modal references `newUserForm.demoTrainer`, so deleting this block is the complete removal.

  File: `client/src/components/AdminManagementDashboard.jsx`

  Acceptance criteria:
  - The checkbox no longer renders in the Trainer Details section.
  - No runtime errors from references to `newUserForm.demoTrainer` (confirmed absent after task 1).
  - Satisfies Requirement 3 AC1.

---

- [ ] 6. Insert the Experience Type `<select>` widget in the Trainer Details section

  Insert a new `<div>` block for the Experience Type dropdown **after** the LANGUAGES TAUGHT toggle-buttons block and **before** the `<div className="grid grid-cols-2 gap-3">` Shift Start / Shift End grid. The widget uses the same Tailwind class pattern as the Expert Course dropdown directly above it: a `<select>` with `appearance-none` styling and a `<ChevronDown>` icon overlay.

  Full JSX to insert:
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

  The `<option value="">` placeholder ensures `experienceType` stays `''` until the admin makes a selection, which is what the validation guard in task 7 checks.

  File: `client/src/components/AdminManagementDashboard.jsx`

  Acceptance criteria:
  - The Experience Type select renders inside the Trainer Details section, below Languages Taught and above Shift Start/End.
  - It has a `* REQUIRED` label badge.
  - Selecting an option updates `newUserForm.experienceType`.
  - The three `<option>` values are `demo`, `regular`, `fresher` (matching the `EXPERIENCE_MAP` keys from task 8).
  - Satisfies Requirement 3 AC1 and NFR-2.

---

- [ ] 7. Insert the three Trainer-only validation guards in `handleCreateUser`

  Insert the following block **immediately after** the existing base-field guard (`if (!newUserForm.name || !newUserForm.email || !newUserForm.phone …) { showToast(…); return; }`) and **before** the `const newUser = { … }` object construction:

  ```js
  if (newUserForm.role === 'Trainer') {
    if (newUserForm.trainerLanguages.length === 0) {
      showToast('⚠️ Please select at least one language taught.');
      return;
    }
    if (newUserForm.experienceType === '') {
      showToast('⚠️ Please select an Experience Type for this trainer.');
      return;
    }
    if (!newUserForm.branch) {
      showToast('⚠️ Campus Branch is required for Trainer accounts.');
      return;
    }
  }
  ```

  Guards execute in order: Language → Experience Type → Branch. No `axios.post` call is made if any guard fires.

  File: `client/src/components/AdminManagementDashboard.jsx`

  Acceptance criteria:
  - Submitting with Trainer role and zero languages shows the language toast and makes no POST request.
  - Submitting with Trainer role + a language but no experience type shows the experience-type toast and makes no POST request.
  - Submitting with Trainer role + language + experience type but no branch shows the branch toast and makes no POST request.
  - All three guards are entirely skipped for non-Trainer roles; an HR account with empty branch still submits successfully.
  - Satisfies Requirement 2 AC1, Requirement 3 AC2, Requirement 4 AC1, Requirement 4 AC3, and Requirement 5 AC1 and AC2.

---

- [ ] 8. Update the `axios.put` payload in `handleCreateUser` to use the `EXPERIENCE_MAP` lookup

  Inside `handleCreateUser`, in the `if (newUserForm.role === 'Trainer' && newUserForm.trainerId)` block, replace the two hardcoded lines:
  ```js
  demoTrainer: newUserForm.demoTrainer,
  isExperienced: true,
  ```
  with the `EXPERIENCE_MAP` lookup and spread. Define the map as a `const` at the **top** of `handleCreateUser` (before the base-field guard), then spread `expFields` into the `axios.put` payload:

  ```js
  const EXPERIENCE_MAP = {
    demo:    { demoTrainer: true,  isExperienced: true,  experienceLevel: 'demo'    },
    regular: { demoTrainer: false, isExperienced: true,  experienceLevel: 'regular' },
    fresher: { demoTrainer: false, isExperienced: false, experienceLevel: 'fresher' },
  };
  ```

  In the `axios.put` call body, replace the two old lines with:
  ```js
  ...( EXPERIENCE_MAP[newUserForm.experienceType] || EXPERIENCE_MAP['fresher'] ),
  ```

  All other fields in the `axios.put` payload (`trainerName`, `email`, `zoomEmail`, `courseKey`, `expertCourse`, `specialization`, `languages`, `branchName`, `active`, `shift`, `shiftStartMin`, `shiftEndMin`) remain unchanged.

  File: `client/src/components/AdminManagementDashboard.jsx`

  Acceptance criteria:
  - When `experienceType === 'demo'` the PUT body contains `demoTrainer: true`, `isExperienced: true`, `experienceLevel: 'demo'`.
  - When `experienceType === 'regular'` the PUT body contains `demoTrainer: false`, `isExperienced: true`, `experienceLevel: 'regular'`.
  - When `experienceType === 'fresher'` the PUT body contains `demoTrainer: false`, `isExperienced: false`, `experienceLevel: 'fresher'`.
  - The fallback `|| EXPERIENCE_MAP['fresher']` is present as belt-and-suspenders (validation in task 7 already blocks empty `experienceType`).
  - Satisfies Requirement 3 AC3, AC4, AC5 and Requirement 6 AC3.

---

- [ ] 9. Move the Role dropdown to position 1 in the Edit Account modal form

  In the Edit modal `<form>`, cut the `<div className="relative">` block that renders the ROLE DESIGNATION custom dropdown (currently the third field block, between the EMAIL/MOBILE grid and the DEPARTMENT/BRANCH grid) and paste it as the **first child** of that `<form>` element, before the FULL NAME field. No changes to the internal markup of the Edit modal Role block itself (`isEditRoleDropdownOpen`, the role list, the auto-department assignment).

  File: `client/src/components/AdminManagementDashboard.jsx`

  Acceptance criteria:
  - The Edit modal form renders: ROLE DESIGNATION → FULL NAME → EMAIL ADDRESS & MOBILE NUMBER → DEPARTMENT & BRANCH ASSIGNMENT → LOGIN PASSWORD & ACCOUNT STATUS.
  - Clicking the Role dropdown in the Edit modal still opens/closes correctly and updates `editUserForm.role` and `editUserForm.department`.
  - No trainer-specific mandatory fields are added to the Edit modal (out of scope per Requirement 7 AC2).
  - Satisfies Requirement 1 AC2 and Requirement 7 AC1.

---

## Notes

- All 9 tasks modify only `client/src/components/AdminManagementDashboard.jsx` — no backend changes, no new files, no routing changes.
- Tasks 2, 3, 4, 9 are pure JSX/label changes with no logic dependencies; they can be done in any order relative to each other.
- Tasks 5, 6, 7, 8 all depend on Task 1 completing first (the state shape change). Within that group, 5 and 6 are JSX-only and can be done before 7 and 8, but all four are safe to batch in a single editing pass once Task 1 is done.
- The `EXPERIENCE_MAP` const defined in Task 8 lives inside `handleCreateUser` (function-scoped), so it does not pollute module scope.
