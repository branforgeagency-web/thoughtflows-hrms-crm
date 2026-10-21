# Requirements Document

## Introduction

The Admin Management Dashboard's "Create User Account" modal has two gaps. First, the Role field sits mid-form regardless of the selected role, which means the trainer-specific section only appears after other fields are already filled. Second, when the Trainer role is selected, the three fields that directly feed the Demo Booking eligibility engine — Language(s), Experience Type, and Location/Branch — are either buried, optional, or absent. Creating a trainer account without those values leaves the trainer invisible to demo booking and unallocatable by the training team.

This feature reorders the Role field to the top of the form for all account types and makes Language, Experience Type, and Location mandatory when the Trainer role is selected.

**Assumption:** "Experience Type" maps to the `demoTrainer` / `isExperienced` / `experienceLevel` family of Trainer schema fields. The form currently only exposes a single `demoTrainer` checkbox ("Eligible to receive demo booking notifications"). This feature replaces that checkbox with an explicit "Experience Type" select covering three values: `Demo Trainer` (previously `demoTrainer: true`), `Regular Trainer` (previously `demoTrainer: false, isExperienced: true`), and `Fresher Trainer` (previously `demoTrainer: false, isExperienced: false`).

**Assumption:** "Location" refers to the campus branch the trainer is attached to (`branchName` on the Trainer document), identical to the existing "Campus Branch" field on the generic user form. For trainer accounts this field is promoted to mandatory because the demo-matching rule uses `branchName` to filter same-location notifications.

---

## Requirements

### Requirement 1: Role Field Appears First in Account Modals

**User Story:** As an admin, I want the Role selector to be the first field in both the Create and Edit User Account modals, so that the correct role-specific fields are revealed before I fill in any other details.

#### Acceptance Criteria

1. WHEN the Create Account modal opens THEN the Role dropdown SHALL be the topmost form field, with Full Name, Email, Mobile Number, Temporary Password, and Campus Branch following in that order.
2. WHEN the Edit Account modal opens for any existing user THEN the Role dropdown SHALL be the topmost form field.
3. WHEN "Trainer" is selected from the Role dropdown at position 1 THEN the trainer-specific section SHALL appear immediately without requiring any other field to be filled first.

---

### Requirement 2: Language is Mandatory for Trainer Accounts

**User Story:** As an admin, I want the Languages Taught field to be required when creating a Trainer account, so that the trainer is always visible to the demo-booking eligibility engine.

#### Acceptance Criteria

1. WHEN a user attempts to submit the Create Account form with the Trainer role selected AND zero languages toggled on THEN the form SHALL NOT submit AND a toast or inline error message SHALL state that at least one language must be selected.
2. WHEN the Create Account modal is opened fresh or reset after a previous submission THEN the Language toggle-buttons SHALL show no pre-selected languages.

---

### Requirement 3: Experience Type is Mandatory for Trainer Accounts

**User Story:** As an admin, I want an explicit Experience Type dropdown when creating a Trainer account, so that the trainer's demo-booking eligibility and experience level are unambiguously recorded.

#### Acceptance Criteria

1. WHEN the Trainer role is selected THEN the "Eligible to receive demo booking notifications" checkbox SHALL be absent AND a labeled "Experience Type" dropdown SHALL appear in its place with a `* REQUIRED` indicator and the options: Demo Trainer, Regular Trainer, Fresher Trainer.
2. WHEN a user attempts to create a Trainer account without selecting an Experience Type THEN the form SHALL be blocked AND a descriptive error message SHALL be displayed.
3. WHEN a Trainer account is created with "Demo Trainer" selected THEN the resulting Trainer document SHALL have `demoTrainer: true`, `isExperienced: true`, and `experienceLevel: 'demo'`.
4. WHEN a Trainer account is created with "Regular Trainer" selected THEN the resulting Trainer document SHALL have `demoTrainer: false`, `isExperienced: true`, and `experienceLevel: 'regular'`.
5. WHEN a Trainer account is created with "Fresher Trainer" selected THEN the resulting Trainer document SHALL have `demoTrainer: false`, `isExperienced: false`, and `experienceLevel: 'fresher'`.

---

### Requirement 4: Location (Campus Branch) is Mandatory for Trainer Accounts

**User Story:** As an admin, I want Campus Branch to be required when creating a Trainer account, so that the demo-booking engine can match the trainer to same-location demo requests.

#### Acceptance Criteria

1. WHEN a user attempts to create a Trainer account with no Campus Branch selected THEN the form SHALL be blocked AND an error message SHALL be displayed.
2. WHEN a user selects any Campus Branch and all other required fields are valid THEN the form SHALL be allowed to proceed.
3. WHEN a user creates an HR, Branch Manager, or any non-Trainer account with an empty branch field THEN the form SHALL succeed (branch remains optional for non-Trainer roles).

---

### Requirement 5: Client-Side Validation Runs Before the API Call

**User Story:** As an admin, I want all mandatory-field validation to happen immediately on submit, so that no partial or invalid API requests are sent.

#### Acceptance Criteria

1. WHEN mandatory-field validation fails for Language, Experience Type, or Location THEN no `axios.post` call SHALL be made.
2. WHEN validation fails THEN the feedback SHALL use the existing toast pattern (`showToast('⚠️ …')`) consistent with current error handling.

---

### Requirement 6: Form State and Reset Are Consistent with the New Fields

**User Story:** As an admin, I want the Create Account form to reset completely after a successful submission or modal close, so that I cannot accidentally carry over data from a previous entry.

#### Acceptance Criteria

1. WHEN the `newUserForm` initial state is defined THEN it SHALL include `experienceType: ''` (replacing the former `demoTrainer` field), `trainerLanguages: []`, and `branch: ''`.
2. WHEN a Trainer account is successfully created OR the modal is closed THEN the form SHALL reset to Role = `'HR'`, no languages selected, Experience Type unset, and branch empty.
3. WHEN `handleCreateUser` sends the payload to `/api/trainer/settings/:id` THEN `demoTrainer`, `isExperienced`, and `experienceLevel` SHALL be derived from `experienceType` using the mapping in Requirement 3.

---

### Requirement 7: Edit Modal Preserves Role-First Layout

**User Story:** As an admin, I want the Edit User Account modal to also show Role first, so that the layout is consistent with the Create modal.

#### Acceptance Criteria

1. WHEN the Edit Account modal opens for any existing user THEN the Role dropdown SHALL be the first input field rendered.
2. IF the user edits a Trainer account THEN no additional trainer-specific mandatory fields SHALL be enforced beyond what is already saved (mandatory validation applies to creation only).

---

## Non-Functional Requirements

- **NFR-1 No new dependencies:** All changes are confined to `AdminManagementDashboard.jsx`. No new npm packages, no new API endpoints, and no Trainer schema changes are introduced.
- **NFR-2 Consistent visual language:** The Experience Type dropdown SHALL use the same Tailwind styling pattern as the existing Expert Course dropdown in the same form section (custom `<select>` with `ChevronDown` icon, same border/focus/font classes).
- **NFR-3 Accessible labelling:** All new required fields SHALL carry a visible `* REQUIRED` label suffix consistent with the pattern used on the Email and Mobile Number fields today.

---

## Out of Scope

- Adding trainer-specific mandatory fields to the Edit User Account modal (only the field order change is in scope for the edit modal).
- Server-side validation of the new mandatory fields — the API endpoint `PUT /api/trainer/settings/:id` already accepts `demoTrainer`, `isExperienced`, and `experienceLevel`; no backend changes are required.
- Changes to the `Trainer` Mongoose model — `experienceLevel` already exists on the schema as a `String` field with a default of `''`.
- The `TrainerScheduleEditor` component, the `BookNewDemoModal`, or any other form that references trainer data.
- Enforcing uniqueness or format rules on the Trainer ID field.
- Adding Language or Experience Type to the search/filter capabilities on the User Accounts table.

---

## Glossary

| Term | Definition |
|---|---|
| Demo Trainer | A trainer eligible to receive demo booking notifications; maps to `demoTrainer: true`, `isExperienced: true`, `experienceLevel: 'demo'`. |
| Regular Trainer | An experienced trainer not receiving demo notifications; maps to `demoTrainer: false`, `isExperienced: true`, `experienceLevel: 'regular'`. |
| Fresher Trainer | A new trainer with no demo or regular experience; maps to `demoTrainer: false`, `isExperienced: false`, `experienceLevel: 'fresher'`. |
| Experience Type | The UI-facing select field that replaces the former `demoTrainer` checkbox and captures the three trainer experience tiers. |
| Campus Branch | The physical branch location a trainer is attached to; stored as `branchName` on the Trainer document and used by the demo-matching engine for location-based filtering. |
