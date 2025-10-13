# Product Specification: Teacher Self-Service Portal

## Executive Summary

Transform AgendaRecuperiDocente from an admin-only system into a self-service platform where teachers autonomously manage their recovery activities through Google Workspace authentication. Teachers (@piaggia.it domain) access a simplified dashboard to plan, modify, and track their recovery modules—reducing administrative overhead by 70% while empowering teachers with real-time budget visibility and calendar control.

---

## 1. Problem Statement

### Current Pain Points

**For Teachers:**
- **Zero visibility**: Teachers have no insight into their annual budget status (modules used/remaining)
- **Dependency bottleneck**: Must request admins to create/modify/delete every recovery activity
- **Delayed planning**: Cannot proactively plan recovery sessions around their teaching schedule
- **No accountability**: Cannot self-track progress toward completing required recovery modules
- **Communication overhead**: Constant back-and-forth with administration for simple scheduling changes

**For Administrators:**
- **Data entry burden**: Manually enter every teacher activity request (20-30 min/day)
- **Schedule coordination**: Act as intermediary for teacher availability and class conflicts
- **Error-prone process**: Manual entry leads to scheduling conflicts, budget overruns
- **Scalability ceiling**: Current workflow cannot handle growing teacher count
- **Audit trail gaps**: Difficult to track who requested what when it was entered by admin

**Business Impact:**
- Administrative time waste: ~10 hours/week on data entry and coordination
- Teacher frustration: Delays in activity approval and planning
- Budget overruns: Lack of real-time visibility leads to overspending discovery at year-end
- Compliance risk: Manual processes lack proper audit trails for educational regulations

---

## 2. Solution Overview

### Vision Statement
Enable teachers to self-manage recovery activities through secure Google Workspace authentication, providing a dedicated dashboard with budget transparency and one-click activity management—transforming the system from admin-centric to teacher-empowered.

### Core Components

1. **Google Workspace SSO Integration**
   - Single sign-on via @piaggia.it domain
   - Automatic email-based teacher profile matching
   - Role-based access control (admin vs teacher)

2. **Teacher Self-Service Dashboard**
   - Personal budget overview (visual progress indicators)
   - Activity list with CRUD operations (create/read/update/delete)
   - Calendar view for planning and conflict detection
   - Real-time budget deduction feedback

3. **Access Control & Gating**
   - Budget-based access: Entry only after admin uploads annual budget CSV
   - Domain restriction: @piaggia.it only
   - Data isolation: Teachers see ONLY their own activities
   - School year context: All operations scoped to active academic year

4. **Simplified UX**
   - Mobile-responsive design for on-the-go planning
   - Italian language throughout
   - One-click actions (no multi-step wizards)
   - Clear visual feedback for budget status

---

## 3. User Personas

### Persona 1: Administrator (Existing Role)
**Name:** Maria Rossi
**Age:** 42
**Role:** School Administrative Officer
**Tech Savvy:** Medium

**Current Workflow:**
- Uploads annual teacher budgets via CSV import
- Manually creates recovery activities based on teacher email/phone requests
- Generates reports for school board
- Troubleshoots scheduling conflicts

**Goals:**
- Reduce data entry workload from 10 hours/week to <2 hours/week
- Maintain system oversight and audit capabilities
- Ensure budget compliance across all teachers
- Focus time on strategic planning vs. data entry

**Pain Points:**
- Constant interruptions for activity scheduling requests
- Manual conflict detection is time-consuming
- Difficult to explain budget status to teachers verbally
- End-of-year reconciliation is painful

**Needs:**
- Teacher self-service to reduce request volume
- Dashboard to monitor teacher activity usage
- Alerts for budget overruns or anomalies
- Ability to override/audit teacher actions

---

### Persona 2: Teacher (New Role)
**Name:** Giovanni Bianchi
**Age:** 38
**Role:** Mathematics Teacher
**Tech Savvy:** Medium

**Current Workflow (Manual):**
- Emails admin requesting recovery activity creation
- Waits 1-3 days for confirmation
- No visibility into remaining budget modules
- Calls admin to reschedule if conflicts arise
- Manually tracks activities in personal spreadsheet

**Goals:**
- Autonomously plan recovery activities around teaching schedule
- Real-time visibility into budget status (modules used/available)
- Quick rescheduling for unexpected conflicts (sick leave, meetings)
- Self-track progress toward annual recovery requirements
- Access system from mobile device during breaks

**Pain Points:**
- Blind to budget status until admin informs them
- Scheduling delays impact student recovery planning
- Cannot plan multiple activities at once
- No way to see personal activity history
- Fear of accidentally exceeding budget

**Needs:**
- Simple login via existing Google Workspace account (@piaggia.it)
- Dashboard showing "traffic light" budget status (green/yellow/red)
- One-click activity creation with immediate conflict detection
- Ability to edit/cancel planned (not completed) activities
- Mobile-friendly interface for classroom/staff room access

---

## 4. User Stories

### Priority 0 (Must Have - MVP)

#### US-001: Google Workspace Authentication
**As a** teacher with a @piaggia.it email
**I want to** log in using my Google Workspace account
**So that I can** access the system without creating a new password

**Acceptance Criteria:**
- Given I visit the login page
  When I click "Sign in with Google"
  Then I am redirected to Google OAuth consent screen
- Given my email is teacher@piaggia.it
  When I authenticate successfully
  Then the system matches my email to my teacher profile
- Given my email is NOT @piaggia.it
  When I attempt to authenticate
  Then I see error: "Access restricted to @piaggia.it domain"
- Given I have no budget for the active school year
  When I log in successfully
  Then I see message: "Access denied: Budget not yet loaded for this school year. Contact administration."
- Given my email matches a teacher profile with budget
  When authentication succeeds
  Then my users.role is automatically set to 'teacher'

**Technical Notes:**
- Configure Supabase Auth Google provider with hd=piaggia.it
- Create user record in public.users if first login
- Link users.id to teachers.user_id via email matching

---

#### US-002: View Personal Budget Status
**As a** teacher
**I want to** see my annual budget overview
**So that I can** understand how many modules I have left to plan

**Acceptance Criteria:**
- Given I am logged in as a teacher
  When I view my dashboard
  Then I see a prominent budget card displaying:
    - Modules Annual (e.g., "20 moduli annuali")
    - Modules Used (e.g., "12 moduli utilizzati")
    - Modules Available (e.g., "8 moduli disponibili")
    - Percentage Used (e.g., "60%")
    - Visual progress bar (green <70%, yellow 70-90%, red >90%)
- Given my budget is 100% used
  When I view my dashboard
  Then the "Crea Attività" button is disabled
  And I see warning: "Budget esaurito: contatta l'amministrazione"
- Given I have no budget for active school year
  When I access the dashboard
  Then I see error page: "Budget non disponibile per l'anno scolastico attivo"

**Business Rules:**
- 1 modulo = 50 minutes
- Budget deductions happen in real-time when activity is created
- Budget restorations happen immediately when activity is deleted
- Only active school year budget is displayed

---

#### US-003: View Personal Activity List
**As a** teacher
**I want to** see all my recovery activities
**So that I can** track what I have planned and completed

**Acceptance Criteria:**
- Given I am logged in as a teacher
  When I view my dashboard
  Then I see a table of MY activities only (filtered by teacher_id)
  And each row shows: Date, Module #, Type (with color), Class, Title, Duration, Modules, Status, Actions
- Given another teacher's activity exists
  When I view my activity list
  Then I do NOT see their activities (data isolation enforced)
- Given I have 0 activities
  When I view my dashboard
  Then I see message: "Nessuna attività creata. Clicca 'Crea Attività' per iniziare."
- Given I have activities from multiple school years
  When I view my dashboard
  Then I see ONLY activities for the active school year

**Data Isolation Rule:**
- API queries MUST filter: .eq('teacher_id', currentUserTeacherId)
- Server-side enforcement in all activity endpoints

---

#### US-004: Create Recovery Activity
**As a** teacher
**I want to** create a new recovery activity
**So that I can** schedule a session without admin intervention

**Acceptance Criteria:**
- Given I have available budget modules
  When I click "Crea Attività"
  Then I see a dialog with fields: Date, Module #, Class, Recovery Type
- Given I fill all required fields
  When I submit the form
  Then the activity is created with status='planned'
  And my budget modules_used increments by 1
  And my budget minutes_used increments by 50
  And I see success toast: "Attività creata con successo"
- Given I select a date/module already occupied by me
  When I submit the form
  Then I see error: "Sovrapposizione: hai già un'attività in questo modulo"
  And the activity is NOT created
- Given I select a date/module/class occupied by another teacher
  When I submit the form
  Then I see warning: "Attenzione: la classe 3A ha già un'attività in questo modulo con altro docente"
  And the activity IS created (warning only, not blocking)
- Given my budget has 0 modules available
  When I try to create an activity
  Then the form is disabled
  And I see error: "Budget esaurito: non puoi creare nuove attività"

**Business Rules:**
- Duration is fixed at 50 minutes (1 module) for MVP
- created_by field populated with teacher's user_id
- Activity automatically assigned to active school year

---

#### US-005: Edit Own Activity
**As a** teacher
**I want to** modify a planned activity
**So that I can** reschedule due to conflicts or changes

**Acceptance Criteria:**
- Given I have a 'planned' activity
  When I click the edit icon
  Then I see a pre-filled dialog with current values: Date, Module #, Class, Type
- Given I change the date/module
  When I submit
  Then the activity is updated
  And overlap validation runs again
- Given the activity status is 'completed'
  When I view the activity row
  Then the edit icon is disabled
  And tooltip says: "Impossibile modificare attività completata"
- Given I edit to a conflicting date/module for myself
  When I submit
  Then I see error: "Sovrapposizione: hai già un'attività in questo modulo"
  And changes are NOT saved
- Given I successfully edit
  When the update completes
  Then I see success toast: "Attività modificata"
  And the activity list refreshes

**Technical Note:**
- No budget adjustment needed (module count unchanged)
- Only date, module_number, class_name, recovery_type_id are editable

---

#### US-006: Delete Own Activity
**As a** teacher
**I want to** delete a planned activity
**So that I can** remove activities I no longer need

**Acceptance Criteria:**
- Given I have a 'planned' activity
  When I click the delete icon
  Then I see confirmation dialog: "Sei sicuro di voler eliminare questa attività?"
- Given I confirm deletion
  When the deletion completes
  Then the activity is removed from the database
  And my budget modules_used decrements by 1
  And my budget minutes_used decrements by 50
  And I see success toast: "Attività eliminata"
- Given the activity status is 'completed'
  When I view the activity row
  Then the delete icon is disabled
  And tooltip says: "Impossibile eliminare attività completata"
- Given I cancel the deletion dialog
  When I click "Annulla"
  Then no changes occur

**Business Rule:**
- Budget restoration is automatic and immediate
- Deletion is permanent (no "soft delete" for MVP)

---

#### US-007: Mark Activity as Completed
**As a** teacher
**I want to** mark an activity as completed
**So that I can** track my progress and lock the activity from edits

**Acceptance Criteria:**
- Given I have a 'planned' activity
  When I click the completion toggle/button
  Then the activity status changes to 'completed'
  And the status badge changes from "Pianificato" (gray) to "Recuperato" (green)
- Given I mark an activity as completed
  When the status changes
  Then the edit and delete buttons are disabled
  And I see success toast: "Attività marcata come recuperata"
- Given an activity is 'completed'
  When I try to toggle it back to 'planned'
  Then the action is prevented (one-way operation for MVP)

**Business Rule:**
- Completed activities are immutable (cannot edit/delete)
- Budget is NOT restored when completing (budget deducted at creation)
- Completion is a teacher self-declaration (no admin approval for MVP)

---

### Priority 1 (Should Have - Post-MVP)

#### US-008: Calendar View of Activities
**As a** teacher
**I want to** see my activities in a calendar view
**So that I can** visualize my schedule and identify gaps

**Acceptance Criteria:**
- Given I click "Vista Calendario"
  When the calendar loads
  Then I see my activities displayed on their scheduled dates
  And each activity shows: Class, Module #, Type color indicator
- Given I click on an activity in the calendar
  When I select it
  Then the edit dialog opens
- Given I view a week in the calendar
  When I see my schedule
  Then empty module slots are clearly visible for planning

**Technical Note:**
- Use existing calendar component from /dashboard/teachers/[id]/calendar
- Adapt for teacher self-view (no multi-teacher selection)

---

#### US-009: Budget Usage History
**As a** teacher
**I want to** see a trend of my budget usage over time
**So that I can** understand if I'm on track to complete my annual requirement

**Acceptance Criteria:**
- Given I view my dashboard
  When I scroll to the history section
  Then I see a chart showing modules used per month
- Given I'm in October with 5 modules used
  When I view the trend
  Then I see an indicator if I'm ahead/behind expected pace
- Given I click on a month in the chart
  When I select it
  Then I see activities for that month

**Business Rule:**
- Expected pace = modules_annual / weeks_count * current_week
- Visual indicators: green (ahead), yellow (on-track), red (behind)

---

### Priority 2 (Nice to Have - Future)

#### US-010: Activity Reminders
**As a** teacher
**I want to** receive email reminders for upcoming activities
**So that I can** avoid forgetting scheduled recovery sessions

**Acceptance Criteria:**
- Given I have an activity scheduled for tomorrow
  When the system runs daily at 8:00 AM
  Then I receive an email: "Promemoria: Recupero domani [Date] Modulo [#] Classe [Name]"
- Given I have an activity today
  When the system runs at 8:00 AM
  Then I receive email: "Oggi: Recupero Modulo [#] Classe [Name]"

**Technical Note:**
- Requires Supabase Edge Function with cron trigger
- Email via SendGrid or Supabase built-in email

---

#### US-011: Activity Status Notifications
**As a** teacher
**I want to** receive notifications when activities require my attention
**So that I can** stay informed about changes

**Acceptance Criteria:**
- Given admin deletes my activity
  When deletion occurs
  Then I receive email: "Attività eliminata dall'amministrazione: [details]"
- Given I'm 90% through my budget
  When I create an activity that pushes me to 90%
  Then I see warning: "Attenzione: hai utilizzato il 90% del tuo budget"

**Business Rule:**
- Notifications are opt-in (user preference in settings)

---

## 5. Onboarding Flow

### Happy Path: Successful Teacher Access

```
Step 1: CSV Budget Upload (Admin)
└─> Admin uploads CSV with teacher budgets
    └─> System creates/updates teacher_budgets for active school year
        └─> teacher.email MUST be populated in CSV

Step 2: Teacher First Login
└─> Teacher visits /login
    └─> Clicks "Sign in with Google"
        └─> Google OAuth redirects to consent screen (hd=piaggia.it)
            └─> Teacher authorizes app

Step 3: Email Matching & Account Creation
└─> System receives Google profile (email: giovanni.bianchi@piaggia.it)
    └─> Checks if users.email exists
        ├─> NO: Creates new user (role='teacher', email=giovanni.bianchi@piaggia.it)
        └─> YES: Retrieves existing user
    └─> Looks up teacher by email in teachers table
        └─> Matches: teacher_id = abc-123
            └─> Links users.user_id to teachers.user_id

Step 4: Budget Access Check
└─> System queries teacher_budgets
    └─> WHERE teacher_id = abc-123 AND school_year_id = [active_year]
        ├─> FOUND: Grants access to dashboard
        └─> NOT FOUND: Shows error page (see Denial Scenario 1)

Step 5: Dashboard Display
└─> Teacher sees:
    ├─> Budget card (modules annual/used/available)
    ├─> Activity list (empty or with existing activities)
    ├─> "Crea Attività" button (enabled if budget available)
    └─> Navigation menu (Dashboard, Profilo, Logout)

Step 6: First Activity Creation
└─> Teacher clicks "Crea Attività"
    └─> Fills form: Date, Module, Class, Type
        └─> Submits
            └─> Validation passes
                └─> Activity created (status='planned')
                    └─> Budget decrements (modules_used += 1)
                        └─> Success toast + activity appears in list
```

### Denial Scenarios

#### Scenario 1: No Budget Loaded
**Trigger:** Teacher email exists in teachers table but NO budget for active school year
**Screen:** Access Denied Page
**Message:**
```
🚫 Accesso Non Disponibile

Il tuo budget per l'anno scolastico [2024/2025] non è ancora stato caricato.

Per favore contatta l'amministrazione scolastica.

[Logout]
```
**Action:** Teacher must wait for admin to upload budget CSV

---

#### Scenario 2: Wrong Domain
**Trigger:** User authenticates with email NOT ending in @piaggia.it
**Screen:** Login Error Toast
**Message:**
```
❌ Accesso Negato

Solo gli utenti con email @piaggia.it possono accedere.
Email ricevuta: [user@gmail.com]

[Riprova]
```
**Technical:** Supabase Auth provider configured with hd=piaggia.it rejects automatically

---

#### Scenario 3: Email Not in Teachers Table
**Trigger:** Google auth succeeds but email has no match in teachers table
**Screen:** Access Denied Page
**Message:**
```
🚫 Profilo Docente Non Trovato

Il tuo account Google ([email]) non è associato a un profilo docente.

Se sei un nuovo docente, contatta l'amministrazione per essere aggiunto al sistema.

[Logout]
```
**Action:** Admin must manually create teacher record with matching email

---

#### Scenario 4: Inactive School Year
**Trigger:** No school year has is_active=true
**Screen:** System Maintenance Page
**Message:**
```
⚠️ Sistema Non Disponibile

Nessun anno scolastico è attualmente attivo.

Contatta l'amministrazione.

[Logout]
```
**Action:** Admin must activate a school year in admin dashboard

---

#### Scenario 5: Budget Exhausted
**Trigger:** Teacher logs in but modules_used >= modules_annual
**Screen:** Dashboard with disabled "Crea Attività" button
**Message:**
```
⚠️ Budget Esaurito

Hai utilizzato tutti i [20] moduli annuali disponibili.

Contatta l'amministrazione per richiedere moduli aggiuntivi.
```
**Action:** Teacher can view/edit/complete existing activities but cannot create new ones

---

## 6. Teacher Dashboard UX Requirements

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER                                                     │
│  [Logo] Tracking Recuperi      [👤 Giovanni Bianchi] [🌙]  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  BUDGET OVERVIEW CARD (Prominent, Top)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  📊 Il Tuo Budget Anno 2024/2025                     │  │
│  │                                                       │  │
│  │  [████████████░░░░░░] 60%                            │  │
│  │                                                       │  │
│  │  12 / 20 moduli utilizzati                           │  │
│  │  8 moduli disponibili                                │  │
│  │  600 / 1000 minuti utilizzati                        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  ACTIONS BAR                                                │
│  [+ Crea Attività] [📅 Vista Calendario]                   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  ACTIVITIES TABLE                                           │
│  Le Tue Attività di Recupero (12 totali)                   │
│                                                             │
│  Data       | Mod | Tipo | Classe | Durata | Stato |Azioni│
│  15 Ott 24 |  3° | Rec  |  3A    | 50min  | 📌    |[✏️][🗑️]│
│  12 Ott 24 |  5° | Pom  |  3A    | 50min  | ✅    | -     │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

### Visual Design Principles

1. **Simplicity First**
   - Maximum 2 clicks to complete any action
   - No nested menus or multi-step wizards
   - Large, touch-friendly buttons for mobile

2. **Budget Clarity**
   - Progress bar with color coding:
     - Green: 0-70% (safe)
     - Yellow: 70-90% (caution)
     - Red: 90-100% (critical)
   - Numeric display: "X / Y moduli" (clear remaining count)
   - Visual weight: Budget card is largest element

3. **Italian Language Labels**
   - "Crea Attività" (not "Create Activity")
   - "Recuperato" (not "Completed")
   - "Pianificato" (not "Planned")
   - Date format: "15 Ott 2024" (Italian locale)

4. **Status Badges**
   - 📌 Pianificato (gray badge)
   - ✅ Recuperato (green badge)
   - ❌ Annullato (red badge) [future]

5. **Responsive Breakpoints**
   - Desktop (>1024px): 3-column layout (sidebar, content, details)
   - Tablet (768-1024px): 2-column layout (content, collapsed sidebar)
   - Mobile (<768px): Single column, sticky budget card, collapsible table

6. **Interactive Feedback**
   - Toast notifications: 3-second duration, bottom-right position
   - Loading states: Spinner on buttons during API calls
   - Disabled states: Gray out with tooltip explanation
   - Error inline: Red text below form fields

### Component Specifications

#### Budget Overview Card
```typescript
// Visual Elements
- Progress bar: Tailwind bg-primary, rounded-full, h-4
- Percentage text: text-3xl font-bold
- Module count: text-xl, modules used in bold
- Background: White card with subtle shadow
- Border: 2px solid (green/yellow/red based on usage)

// Behavior
- Refreshes after every activity create/delete
- Shows skeleton loader during fetch
- Animates progress bar on update (smooth transition)
```

#### Activity Table
```typescript
// Columns (Mobile: collapsible to cards)
1. Data: format(date, 'dd MMM yyyy', { locale: it })
2. Modulo: module_number + "°"
3. Tipo: recovery_type.name + color dot
4. Classe: class_name
5. Durata: duration_minutes + " min"
6. Stato: Badge component with status
7. Azioni: Edit + Delete icons (IconButton)

// Interactions
- Row hover: Slight gray background
- Click row: Expand to show description (mobile)
- Edit icon: Opens pre-filled dialog
- Delete icon: Confirmation dialog
- Status toggle: Checkbox or switch for completion

// Empty State
- Illustration: Calendar icon
- Text: "Nessuna attività creata"
- CTA: Large "Crea la Tua Prima Attività" button
```

#### Create/Edit Activity Dialog
```typescript
// Form Fields (vertical stack)
1. Data (required): DatePicker, default=today
2. Modulo (required): Dropdown 1-8 (typical school modules)
3. Classe (required): Text input, placeholder="Es: 3A"
4. Tipo di Recupero (required): Dropdown from recovery_types

// Validation
- All fields required: Show red border + message
- Real-time overlap check: Yellow warning below submit
- Budget check: Disable submit if exhausted

// Actions
- [Annulla] (ghost button, left)
- [Crea Attività] or [Salva Modifiche] (primary button, right)

// Behavior
- Opens from: "Crea Attività" button OR edit icon
- Pre-fills for edit mode
- Closes on success with toast
- Stays open on error with inline message
```

### Mobile-Specific Considerations

1. **Touch Targets**
   - Minimum 44x44px for all buttons
   - Increased spacing between table rows (16px padding)

2. **Navigation**
   - Sticky budget card at top (always visible)
   - Bottom navigation bar: [Dashboard] [Calendario] [Profilo]

3. **Table → Cards**
   - Desktop: Full table layout
   - Mobile: Cards with expandable details
   ```
   ┌─────────────────────────────┐
   │ 15 Ott 2024 • Modulo 3°     │
   │ Classe 3A • Recupero        │
   │ [✏️] [🗑️]            📌 Pianificato │
   └─────────────────────────────┘
   ```

4. **Form Optimization**
   - Date picker: Native mobile calendar
   - Dropdowns: Native select menus (better UX than custom)
   - Keyboard: Numeric for module input, text for class

---

## 7. Acceptance Criteria (Detailed)

### Feature: Google Workspace Authentication

#### AC-1.1: Domain Restriction
```gherkin
Given I am not part of the piaggia.it domain
When I attempt to sign in with Google using external@gmail.com
Then I see error: "Accesso limitato al dominio @piaggia.it"
And I am redirected back to the login page
```

#### AC-1.2: Automatic Role Assignment
```gherkin
Given I authenticate with giovanni.bianchi@piaggia.it
And my email exists in teachers table
When the system creates/retrieves my user record
Then my users.role is set to 'teacher'
And I am NOT granted admin dashboard access
```

#### AC-1.3: Email-to-Teacher Matching
```gherkin
Given the teachers table has:
  | id   | email                       |
  | t1   | giovanni.bianchi@piaggia.it |
When I authenticate with giovanni.bianchi@piaggia.it
Then the system links my users.user_id to teachers(t1).user_id
And I can access data for teacher t1 only
```

#### AC-1.4: Unmatched Email Rejection
```gherkin
Given the teachers table does NOT contain newteacher@piaggia.it
When I authenticate with newteacher@piaggia.it
Then I see error: "Profilo docente non trovato. Contatta l'amministrazione."
And I cannot access the dashboard
```

---

### Feature: Budget-Based Access Control

#### AC-2.1: Active Budget Required
```gherkin
Given the active school year is "2024/2025" (id=sy1)
And teacher t1 has budget ONLY for school year "2023/2024" (id=sy0)
When teacher t1 logs in
Then they see error: "Budget non disponibile per l'anno scolastico attivo"
And dashboard access is denied
```

#### AC-2.2: Budget Display Accuracy
```gherkin
Given teacher t1 has budget:
  | modules_annual | modules_used | minutes_used |
  | 20             | 12           | 600          |
When teacher t1 views dashboard
Then they see:
  - "12 / 20 moduli utilizzati"
  - "8 moduli disponibili"
  - "600 / 1000 minuti utilizzati"
  - Progress bar at 60% (yellow zone)
```

#### AC-2.3: Exhausted Budget Blocking
```gherkin
Given teacher t1 has budget:
  | modules_annual | modules_used |
  | 20             | 20           |
When teacher t1 views dashboard
Then the "Crea Attività" button is disabled
And they see warning: "Budget esaurito: non puoi creare nuove attività"
```

---

### Feature: Activity Creation with Validation

#### AC-3.1: Successful Creation
```gherkin
Given teacher t1 has 5 modules available
When they create an activity:
  | date       | module_number | class_name | recovery_type |
  | 2024-10-15 | 3             | 3A         | Recupero      |
Then the activity is saved with status='planned'
And their budget modules_used increases from 12 to 13
And their budget minutes_used increases by 50
And they see toast: "Attività creata con successo"
```

#### AC-3.2: Teacher Self-Overlap Prevention
```gherkin
Given teacher t1 already has an activity:
  | date       | module_number |
  | 2024-10-15 | 3             |
When teacher t1 tries to create another activity:
  | date       | module_number | class_name |
  | 2024-10-15 | 3             | 3B         |
Then they see error: "Sovrapposizione docente: il modulo è già occupato per questo docente"
And the activity is NOT created
And their budget is NOT decreased
```

#### AC-3.3: Class Overlap Warning (Non-Blocking)
```gherkin
Given teacher t2 has an activity:
  | date       | module_number | class_name |
  | 2024-10-15 | 3             | 3A         |
When teacher t1 creates an activity:
  | date       | module_number | class_name |
  | 2024-10-15 | 3             | 3A         |
Then they see warning: "Attenzione: la classe 3A ha già un'attività in questo modulo"
And the activity IS created (warning only)
```

#### AC-3.4: Budget Exhaustion Block
```gherkin
Given teacher t1 has budget:
  | modules_annual | modules_used |
  | 20             | 20           |
When teacher t1 attempts to create an activity
Then the form submit button is disabled
And they see error: "Budget esaurito: non ci sono moduli disponibili"
```

---

### Feature: Activity Editing

#### AC-4.1: Edit Planned Activity
```gherkin
Given teacher t1 has a 'planned' activity (id=act1):
  | date       | module_number | class_name |
  | 2024-10-15 | 3             | 3A         |
When teacher t1 edits act1 to:
  | date       | module_number | class_name |
  | 2024-10-16 | 4             | 3B         |
Then the activity is updated
And no overlap validation errors occur
And they see toast: "Attività modificata"
```

#### AC-4.2: Block Edit of Completed Activity
```gherkin
Given teacher t1 has a 'completed' activity (id=act1)
When teacher t1 views act1 in the table
Then the edit icon is grayed out (disabled)
And tooltip shows: "Impossibile modificare attività completata"
And clicking does nothing
```

#### AC-4.3: Edit with Overlap Detection
```gherkin
Given teacher t1 has activities:
  | id   | date       | module_number | status   |
  | act1 | 2024-10-15 | 3             | planned  |
  | act2 | 2024-10-15 | 4             | planned  |
When teacher t1 edits act2 to module_number=3 (same as act1)
Then they see error: "Sovrapposizione: hai già un'attività in questo modulo"
And changes are NOT saved
```

---

### Feature: Activity Deletion

#### AC-5.1: Delete Planned Activity with Budget Restore
```gherkin
Given teacher t1 has budget:
  | modules_used | minutes_used |
  | 13           | 650          |
And teacher t1 has a 'planned' activity (id=act1)
When teacher t1 deletes act1
Then the activity is removed from database
And their budget updates to:
  | modules_used | minutes_used |
  | 12           | 600          |
And they see toast: "Attività eliminata"
```

#### AC-5.2: Block Delete of Completed Activity
```gherkin
Given teacher t1 has a 'completed' activity (id=act1)
When teacher t1 views act1 in the table
Then the delete icon is grayed out (disabled)
And tooltip shows: "Impossibile eliminare attività completata"
And clicking does nothing
```

#### AC-5.3: Deletion Confirmation
```gherkin
Given teacher t1 clicks delete on activity act1
When the confirmation dialog appears
And they click "Annulla"
Then the dialog closes
And no deletion occurs
And budget remains unchanged
```

---

### Feature: Activity Completion

#### AC-6.1: Mark Activity as Completed
```gherkin
Given teacher t1 has a 'planned' activity (id=act1)
When teacher t1 clicks the completion toggle
Then the activity status changes to 'completed'
And the status badge changes from "Pianificato" (gray) to "Recuperato" (green)
And edit/delete buttons become disabled
And they see toast: "Attività marcata come recuperata"
```

#### AC-6.2: Completion is Irreversible (MVP)
```gherkin
Given teacher t1 has a 'completed' activity (id=act1)
When teacher t1 views act1
Then there is NO option to revert to 'planned'
And the completion action is permanent
```

#### AC-6.3: Budget Not Restored on Completion
```gherkin
Given teacher t1 has budget:
  | modules_used |
  | 13           |
When teacher t1 marks activity act1 as completed
Then their modules_used remains 13 (unchanged)
# Rationale: Budget was deducted at creation, not completion
```

---

### Feature: Data Isolation & Security

#### AC-7.1: Teachers See Only Own Activities
```gherkin
Given teacher t1 has activities: [act1, act2]
And teacher t2 has activities: [act3, act4]
When teacher t1 views their dashboard activity list
Then they see ONLY [act1, act2]
And they do NOT see [act3, act4]
```

#### AC-7.2: Teachers Cannot Edit Other's Activities
```gherkin
Given teacher t2 has activity act3
When teacher t1 attempts API call: PUT /api/activities/act3
Then they receive 403 Forbidden
And the activity is NOT modified
# Server-side validation enforces teacher_id matching
```

#### AC-7.3: Teachers Cannot Access Admin Routes
```gherkin
Given teacher t1 is logged in
When they navigate to /dashboard/teachers (admin view)
Then they receive 403 Forbidden or redirect to their teacher dashboard
```

---

## 8. Business Rules

### Authentication & Access

1. **Domain Restriction**
   - ONLY emails ending in @piaggia.it can authenticate
   - Supabase Auth Google provider configured with `hd=piaggia.it`
   - External domains (gmail.com, etc.) are rejected at OAuth level

2. **Email Matching**
   - User's Google email MUST match a record in teachers.email
   - Matching is case-insensitive: Giovanni.Bianchi@piaggia.it = giovanni.bianchi@piaggia.it
   - If no match, user sees error and cannot proceed

3. **Role Assignment**
   - New users (first login) get users.role = 'teacher' by default
   - Admins are manually set in database (role='admin')
   - Role check happens in middleware and API routes

4. **Budget Access Gate**
   - Teachers can ONLY access dashboard if teacher_budgets record exists for:
     - Their teacher_id
     - AND active school year (school_years.is_active=true)
   - Missing budget = access denied with clear message

---

### Budget Management

5. **Module Conversion**
   - 1 modulo = 50 minutes (hardcoded constant)
   - All activities are fixed at 1 module for MVP
   - Formula: modules_equivalent = duration_minutes / 50

6. **Budget Deduction Timing**
   - Budget is deducted IMMEDIATELY when activity is created (status='planned')
   - NOT when activity is marked 'completed'
   - Rationale: Teachers plan with budget constraints, not after-the-fact

7. **Budget Restoration**
   - Budget is restored IMMEDIATELY when activity is deleted
   - Formula: modules_used -= activity.modules_equivalent
   - Formula: minutes_used -= activity.duration_minutes

8. **Negative Budget Prevention**
   - Teachers CANNOT create an activity if:
     - (modules_annual - modules_used) < 1
   - UI disables "Crea Attività" button
   - API returns 400 error if attempted

9. **Budget Overrun Handling**
   - If admin manually adjusts budget down after activities created:
     - System allows negative balance (display in red)
     - Teacher cannot create new activities until positive balance
     - Warning: "Budget in negativo: contatta l'amministrazione"

---

### Activity Constraints

10. **School Year Context**
    - All activities are tied to school_year_id
    - Teachers ONLY see/manage activities for ACTIVE school year
    - Historical activities (previous years) are not visible in teacher view
    - Admin dashboard retains multi-year view

11. **Overlap Validation**
    - **Teacher Self-Overlap (BLOCKING):**
      - Same teacher + same date + same module_number = ERROR
      - Prevents double-booking of teacher's time
    - **Class Overlap (WARNING ONLY):**
      - Same class_name + same date + same module_number = WARNING
      - Does NOT block creation (teachers may plan differently)
      - Warning: "Attenzione: la classe 3A ha già un'attività..."

12. **Activity Mutability**
    - **Planned Activities:**
      - CAN be edited (date, module, class, type)
      - CAN be deleted (with budget restoration)
      - CAN be marked as completed
    - **Completed Activities:**
      - CANNOT be edited
      - CANNOT be deleted
      - CANNOT revert to planned (one-way transition)
    - Rationale: Completed = historical record, must preserve for auditing

13. **Activity Ownership**
    - created_by field stores the user_id who created the activity
    - For teacher-created activities: created_by = teacher's user_id
    - For admin-created activities: created_by = admin's user_id
    - Teachers can only edit/delete activities WHERE teacher_id = their_teacher_id (regardless of created_by)

---

### Data Integrity

14. **User-Teacher Linking**
    - users.email links to teachers.email (not foreign key, logical link)
    - teachers.user_id stores the linked user UUID (nullable, added for auth)
    - If teacher record exists without email → cannot authenticate
    - If teacher has email but no user_id → first login creates link

15. **Active School Year**
    - ONLY ONE school year can have is_active=true at a time
    - System operations default to active school year
    - If no active school year → all dashboards show error state

16. **Recovery Types**
    - Teachers can select from recovery_types WHERE is_active=true
    - Inactive types hidden from teacher view
    - Admin can create/edit recovery types

---

### Permissions Matrix

| Action                          | Admin | Teacher (Own) | Teacher (Other) |
|--------------------------------|-------|---------------|----------------|
| View own budget                | ✅     | ✅             | ❌              |
| View all budgets               | ✅     | ❌             | ❌              |
| Create own activity            | ✅     | ✅             | ❌              |
| Create activity for any teacher| ✅     | ❌             | ❌              |
| Edit own planned activity      | ✅     | ✅             | ❌              |
| Edit any planned activity      | ✅     | ❌             | ❌              |
| Delete own planned activity    | ✅     | ✅             | ❌              |
| Delete any planned activity    | ✅     | ❌             | ❌              |
| Edit/delete completed activity | ❌     | ❌             | ❌              |
| Mark activity as completed     | ✅     | ✅             | ❌              |
| Upload budget CSV              | ✅     | ❌             | ❌              |
| Manage recovery types          | ✅     | ❌             | ❌              |
| View activity logs             | ✅     | ❌             | ❌              |
| Activate school year           | ✅     | ❌             | ❌              |

---

## 9. Technical Constraints

### Supabase Authentication

1. **Google OAuth Provider Setup**
   ```typescript
   // Supabase Dashboard Config Required:
   {
     provider: 'google',
     enabled: true,
     client_id: process.env.GOOGLE_CLIENT_ID,
     client_secret: process.env.GOOGLE_CLIENT_SECRET,
     redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
     additional_parameters: {
       hd: 'piaggia.it' // Hosted domain restriction
     }
   }
   ```

2. **Session Management**
   - Middleware refreshes session on every request (existing pattern)
   - Token stored in httpOnly cookie (Supabase SSR default)
   - Session expires after 1 hour (refreshed automatically)
   - Logout clears both Supabase session AND cookies

3. **Email Claim Verification**
   - Google returns verified email in JWT claims
   - System MUST validate email domain on server-side (middleware)
   - Client-side domain restriction is NOT sufficient (security)

---

### Database Schema Changes

4. **Required Migrations**
   - **teachers table:** Add `user_id UUID` column (nullable, unique)
     - Foreign key to users(id)
     - Allows linking teacher profile to auth user
   - **users table:** Add `linked_teacher_id UUID` for reverse lookup
     - Or use existing relationship via teachers.user_id

5. **Indexing for Performance**
   - Add index on `teachers.email` (frequent lookups during auth)
   - Add index on `recovery_activities.teacher_id` (filtered queries)
   - Add composite index on `(teacher_id, school_year_id, date)` for overlap checks

6. **RLS (Row Level Security) Policies**
   - Enable RLS on `recovery_activities` table
   - Policy: Teachers can SELECT/INSERT/UPDATE/DELETE only WHERE teacher_id = their_teacher_id
   - Policy: Admins have full access (role='admin')
   - Policy: Cannot UPDATE/DELETE activities with status='completed'

---

### API Route Adaptations

7. **Existing CRUD APIs Must Be Scoped**
   - `GET /api/activities`: Add teacher_id filter from authenticated user
   - `POST /api/activities`: Set created_by = current user, validate teacher_id matches
   - `PUT /api/activities/[id]`: Verify activity.teacher_id matches current user
   - `DELETE /api/activities/[id]`: Verify activity.teacher_id matches current user

8. **New API Endpoints Needed**
   - `GET /api/teachers/me`: Returns current teacher's profile + budget
   - `GET /api/teachers/me/activities`: Returns activities for current teacher (scoped)
   - `POST /api/auth/link-teacher`: Links authenticated user to teacher profile by email

9. **Middleware Changes**
   - Current: Redirects to /dashboard for all authenticated users
   - New: Check user role:
     - If role='admin' → /dashboard (existing admin dashboard)
     - If role='teacher' → /dashboard/me (new teacher dashboard)
   - Extract teacher_id from linked profile and attach to request context

---

### Frontend Routing

10. **New Teacher Routes**
    ```
    /dashboard/me                  # Teacher personal dashboard
    /dashboard/me/activities       # Activity list view (default)
    /dashboard/me/calendar         # Calendar view (P1)
    /dashboard/me/profile          # Teacher profile settings (future)
    ```

11. **Route Guards**
    - Teacher routes: Check role='teacher' in middleware
    - Admin routes: Check role='admin' in middleware
    - No cross-role access (teachers cannot access /dashboard/teachers)

---

### Component Reuse

12. **Existing Components to Adapt**
    - `TeacherDetailCard`: Reuse for budget display (modify for single teacher)
    - `ActivityDialog`: Reuse for create/edit (modify to hide admin fields)
    - `ActivityTable`: Reuse for activity list (add teacher-specific actions)
    - Calendar components: Reuse from /dashboard/teachers/[id]/calendar

13. **New Components Needed**
    - `TeacherBudgetCard`: Simplified budget card for teacher view
    - `TeacherActivityList`: Activity table with teacher-scoped actions
    - `GoogleSignInButton`: Google OAuth trigger button

---

### Performance Considerations

14. **Caching Strategy**
    - Teacher budget: Cache in React state, refresh on activity changes
    - Recovery types: Fetch once, cache in state (rarely changes)
    - Activity list: No caching (real-time updates important)

15. **Optimistic Updates**
    - Activity creation: Optimistically add to list, rollback on error
    - Budget deduction: Optimistically update card, rollback on error
    - Mark complete: Optimistically change status, rollback on error

---

### Mobile Responsiveness

16. **Breakpoint Strategy**
    - Desktop: >1024px (full table, sidebar)
    - Tablet: 768-1024px (responsive table, collapsed sidebar)
    - Mobile: <768px (card view, bottom nav, sticky budget)

17. **Touch Optimization**
    - Minimum 44x44px tap targets
    - Swipe-to-delete on mobile activity cards (future)
    - Pull-to-refresh on activity list

---

### Security Constraints

18. **Data Isolation Enforcement**
    - Server-side: ALL queries MUST filter by teacher_id = current_user_teacher_id
    - Client-side: UI components MUST NOT display other teacher data
    - API: Return 403 Forbidden for unauthorized access attempts

19. **Input Validation**
    - Date: Must be within current school year range
    - Module number: Must be 1-8 (typical school day modules)
    - Class name: Alphanumeric only, max 20 chars
    - Recovery type: Must exist in recovery_types AND be active

20. **Audit Trail**
    - All activity create/update/delete actions logged to activity_logs
    - Include: user_id, action, timestamp, old_values, new_values
    - Teacher actions distinguishable from admin actions via created_by field

---

## 10. Success Metrics

### Primary KPIs (6 Months Post-Launch)

1. **Teacher Adoption Rate**
   - **Target:** 85% of teachers with budgets log in at least once
   - **Current:** 0% (admin-only system)
   - **Measurement:** COUNT(DISTINCT teacher_id) from user login logs / COUNT(teacher_budgets)

2. **Self-Service Activity Creation**
   - **Target:** 80% of activities created by teachers (not admins)
   - **Current:** 0% (all admin-created)
   - **Measurement:** COUNT(activities WHERE created_by IN teachers) / COUNT(all activities)

3. **Admin Time Savings**
   - **Target:** Reduce admin data entry time by 70% (from 10 hrs/week to 3 hrs/week)
   - **Current:** ~10 hours/week
   - **Measurement:** Weekly time-tracking survey + activity creation logs

4. **Budget Visibility Impact**
   - **Target:** 95% of teachers report "always aware" of budget status (post-launch survey)
   - **Current:** ~30% (based on admin anecdotal feedback)
   - **Measurement:** Post-launch user survey (5-point Likert scale)

---

### Secondary KPIs

5. **Activity Planning Lead Time**
   - **Target:** Average 7 days advance planning (activities created 7+ days before date)
   - **Current:** ~2 days (admin reactive data entry)
   - **Measurement:** AVG(date - created_at) for all activities

6. **Budget Compliance**
   - **Target:** <5% of teachers exceed annual budget
   - **Current:** ~15% (discovered at year-end reconciliation)
   - **Measurement:** COUNT(teachers WHERE modules_used > modules_annual) / COUNT(teachers)

7. **Support Ticket Reduction**
   - **Target:** 60% reduction in activity-related support requests
   - **Current:** ~50 tickets/month (scheduling, budget questions)
   - **Measurement:** Tagged support tickets in helpdesk system

8. **Mobile Usage**
   - **Target:** 40% of logins from mobile devices
   - **Measurement:** User-agent analysis in activity_logs

---

### User Experience Metrics

9. **Teacher Satisfaction Score**
   - **Target:** Net Promoter Score (NPS) > 50
   - **Measurement:** Quarterly survey: "How likely are you to recommend this system?" (0-10)

10. **Task Completion Rate**
    - **Target:** 95% of teachers successfully create their first activity without support
    - **Measurement:** Funnel analysis (login → view dashboard → create activity)

11. **Error Rate**
    - **Target:** <2% of activity creation attempts result in errors
    - **Measurement:** COUNT(error logs) / COUNT(API POST /api/activities)

12. **Session Duration**
    - **Target:** Average 5-7 minutes per session (indicates efficient task completion)
    - **Measurement:** AVG(logout_time - login_time) from session logs

---

### Operational Metrics

13. **System Uptime**
    - **Target:** 99.5% uptime during school hours (8 AM - 6 PM local time)
    - **Measurement:** Uptime monitoring (Vercel analytics)

14. **API Response Time**
    - **Target:** P95 < 500ms for all teacher-facing endpoints
    - **Measurement:** Vercel/Supabase performance monitoring

15. **Data Accuracy**
    - **Target:** 100% budget reconciliation accuracy (modules_used matches sum of activities)
    - **Measurement:** Weekly automated audit query

---

### Long-Term Success Indicators (12 Months)

16. **Year-End Budget Completion**
    - **Target:** 90% of teachers complete 90-110% of annual budget (not under/over)
    - **Measurement:** Distribution analysis at school year end

17. **Repeat Usage**
    - **Target:** 70% of teachers log in at least weekly during term time
    - **Measurement:** Weekly active users (WAU) / Total teachers with budgets

18. **Feature Adoption**
    - **Target:** 50% of teachers use calendar view at least once (P1 feature)
    - **Measurement:** COUNT(DISTINCT user_id) from calendar page views

---

### Measurement Dashboard

**Admin View (New Section):**
```
┌─────────────────────────────────────────────────────────┐
│  Teacher Self-Service Adoption (Current Month)          │
│                                                          │
│  📊 Adoption Rate: 92% (46/50 teachers logged in)       │
│  ✅ Self-Created Activities: 87% (234/269 activities)   │
│  ⏱️ Admin Time Saved: 8.2 hrs/week (82% reduction)      │
│  💰 Budget Overruns: 2 teachers (4%)                    │
│                                                          │
│  [View Detailed Analytics]                              │
└─────────────────────────────────────────────────────────┘
```

---

## 11. Implementation Phases

### Phase 0: Foundation (Pre-Development)
**Duration:** 1 week
**Dependencies:** Product spec approval

- [ ] Stakeholder review of product spec
- [ ] Design mockups for teacher dashboard (Figma)
- [ ] Google Workspace OAuth client credentials (IT department)
- [ ] Supabase Auth provider configuration
- [ ] Database migration scripts (user_id in teachers table)

---

### Phase 1: Authentication & Access Control (MVP Foundation)
**Duration:** 2 weeks
**Priority:** P0

**Backend Tasks:**
- [ ] Configure Supabase Auth Google provider (hd=piaggia.it)
- [ ] Create database migration: Add `teachers.user_id` column
- [ ] Create database migration: Add RLS policies on recovery_activities
- [ ] Create API endpoint: `POST /api/auth/link-teacher` (email matching)
- [ ] Update middleware: Role-based routing (admin → /dashboard, teacher → /dashboard/me)
- [ ] Create API endpoint: `GET /api/teachers/me` (current teacher profile + budget)

**Frontend Tasks:**
- [ ] Add Google Sign-In button to login page
- [ ] Create `/auth/callback` route for OAuth redirect
- [ ] Create access denied page (budget not loaded scenario)
- [ ] Create access denied page (email not in teachers table scenario)

**Testing:**
- [ ] Test OAuth flow with valid @piaggia.it email
- [ ] Test rejection of external domain (e.g., @gmail.com)
- [ ] Test email matching to teacher profile
- [ ] Test access denial for missing budget

**Acceptance Criteria:** US-001 (Google Workspace Authentication)

---

### Phase 2: Teacher Dashboard - Read-Only Views
**Duration:** 1 week
**Priority:** P0

**Backend Tasks:**
- [ ] Create API endpoint: `GET /api/teachers/me/activities` (filtered by teacher_id)
- [ ] Update `GET /api/activities` to scope by teacher_id for teacher role

**Frontend Tasks:**
- [ ] Create `/dashboard/me/page.tsx` (teacher dashboard layout)
- [ ] Create `TeacherBudgetCard` component (budget overview)
- [ ] Create `TeacherActivityList` component (activity table)
- [ ] Add empty state for 0 activities
- [ ] Add mobile-responsive card view for activity table

**Testing:**
- [ ] Verify teacher sees only own activities
- [ ] Verify budget card displays correct calculations
- [ ] Verify data isolation (teacher A cannot see teacher B data)
- [ ] Test mobile responsiveness on iPhone/Android

**Acceptance Criteria:** US-002 (View Budget Status), US-003 (View Activity List)

---

### Phase 3: Activity Creation & Validation
**Duration:** 1.5 weeks
**Priority:** P0

**Backend Tasks:**
- [ ] Update `POST /api/activities` to accept teacher-role requests
- [ ] Add validation: teacher_id matches authenticated user
- [ ] Add validation: budget availability check
- [ ] Add validation: teacher self-overlap check
- [ ] Add validation: class overlap warning (non-blocking)
- [ ] Update budget on activity creation (modules_used, minutes_used)

**Frontend Tasks:**
- [ ] Update `ActivityDialog` component for teacher use
- [ ] Add budget validation UI (disable submit if exhausted)
- [ ] Add overlap error display (inline form error)
- [ ] Add success toast on creation
- [ ] Refresh budget card and activity list on success

**Testing:**
- [ ] Test activity creation with available budget
- [ ] Test budget exhaustion blocking
- [ ] Test teacher self-overlap blocking
- [ ] Test class overlap warning (non-blocking)
- [ ] Test budget deduction accuracy

**Acceptance Criteria:** US-004 (Create Recovery Activity)

---

### Phase 4: Activity Edit & Delete
**Duration:** 1 week
**Priority:** P0

**Backend Tasks:**
- [ ] Update `PUT /api/activities/[id]` to validate teacher_id ownership
- [ ] Update `DELETE /api/activities/[id]` to validate teacher_id ownership
- [ ] Add validation: prevent edit/delete of completed activities
- [ ] Add budget restoration on deletion

**Frontend Tasks:**
- [ ] Add edit icon to activity table rows
- [ ] Pre-fill `ActivityDialog` for edit mode
- [ ] Add delete icon with confirmation dialog
- [ ] Disable edit/delete for completed activities (gray out + tooltip)
- [ ] Update budget card on deletion (restore modules)

**Testing:**
- [ ] Test edit of planned activity
- [ ] Test edit with new overlap detection
- [ ] Test delete with budget restoration
- [ ] Test block edit/delete of completed activity
- [ ] Test unauthorized edit attempt (403 error)

**Acceptance Criteria:** US-005 (Edit Own Activity), US-006 (Delete Own Activity)

---

### Phase 5: Activity Completion Toggle
**Duration:** 3 days
**Priority:** P0

**Backend Tasks:**
- [ ] Update `PATCH /api/activities/[id]` for status toggle
- [ ] Validate teacher_id ownership
- [ ] No budget change on completion

**Frontend Tasks:**
- [ ] Add completion checkbox/toggle to activity rows
- [ ] Change status badge on toggle (gray → green)
- [ ] Disable edit/delete buttons after completion
- [ ] Add success toast on completion

**Testing:**
- [ ] Test marking planned → completed
- [ ] Test that edit/delete become disabled after completion
- [ ] Test that budget does NOT restore on completion
- [ ] Test irreversibility (cannot revert to planned)

**Acceptance Criteria:** US-007 (Mark Activity as Completed)

---

### Phase 6: Polish, Testing & Documentation
**Duration:** 1 week
**Priority:** P0

**QA Tasks:**
- [ ] End-to-end testing (full user journey)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile device testing (iOS, Android)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance testing (load time < 2s)

**Documentation Tasks:**
- [ ] User guide for teachers (PDF)
- [ ] Admin guide for budget upload process
- [ ] Update API documentation
- [ ] Create troubleshooting FAQ

**Bug Fixing:**
- [ ] Triage and fix all P0/P1 bugs from QA
- [ ] Performance optimizations

**Acceptance Criteria:** All P0 user stories pass QA

---

### Phase 7: Production Deployment & Onboarding
**Duration:** 1 week
**Priority:** P0

**Deployment Tasks:**
- [ ] Deploy to production (Vercel + Supabase)
- [ ] Run database migrations on production
- [ ] Configure production Google OAuth credentials
- [ ] Smoke test production environment

**Onboarding Tasks:**
- [ ] Admin training session (1 hour)
- [ ] Teacher training session (30 min group demo)
- [ ] Send welcome email with user guide
- [ ] Set up support channel (email/Slack)

**Monitoring:**
- [ ] Enable Vercel analytics
- [ ] Set up Sentry error tracking
- [ ] Create monitoring dashboard for success metrics
- [ ] Schedule weekly check-ins for first month

**Acceptance Criteria:** Teachers can log in and create activities in production

---

### Phase 8: Post-MVP Enhancements (Optional)
**Duration:** 2-3 weeks
**Priority:** P1/P2

**P1 Features:**
- [ ] US-008: Calendar view of activities (integrate existing calendar)
- [ ] US-009: Budget usage history/trends chart

**P2 Features:**
- [ ] US-010: Email reminders for upcoming activities
- [ ] US-011: Activity status notifications

**Nice-to-Haves:**
- [ ] Export personal activity list to PDF
- [ ] Dark mode improvements
- [ ] Multi-language support (English for international teachers)

---

## 12. Risks & Dependencies

### Top 3 Technical Risks

#### Risk 1: Google OAuth Domain Restriction Bypass
**Severity:** High
**Likelihood:** Low

**Description:**
Google's hd (hosted domain) parameter is a hint, not enforcement. A sophisticated user could potentially authenticate with a non-@piaggia.it email and manipulate the flow.

**Mitigation:**
- Server-side validation: Verify email domain in middleware AFTER OAuth callback
- Reject any email not ending in @piaggia.it at API level
- Do NOT rely solely on Google's hd parameter
- Code: `if (!user.email.endsWith('@piaggia.it')) { return 403 }`

**Contingency:**
- If bypass discovered: Immediately patch middleware validation
- Audit logs to identify unauthorized access attempts
- Revoke sessions for non-@piaggia.it emails

---

#### Risk 2: Email Matching Ambiguity (Multiple Teachers, Same Email)
**Severity:** Medium
**Likelihood:** Low

**Description:**
If two teacher records accidentally have the same email (data entry error), authentication will fail or link to wrong profile.

**Mitigation:**
- Add unique constraint on teachers.email in database
- Pre-deployment audit: Check for duplicate emails in teachers table
- User-friendly error: "Multiple profiles found for your email. Contact admin."

**Contingency:**
- Admin dashboard: Add "duplicate email detection" tool
- Provide merge/cleanup process for admins

---

#### Risk 3: Budget Synchronization Race Conditions
**Severity:** Medium
**Likelihood:** Medium

**Description:**
If a teacher rapidly creates/deletes activities in succession, budget updates may race, leading to incorrect modules_used count.

**Mitigation:**
- Use database transactions for activity creation + budget update (atomic operations)
- Supabase RPC: Create stored procedure for create_activity_with_budget_update
- Optimistic locking: Check budget hasn't changed between read and write

**Contingency:**
- Weekly automated audit: Verify modules_used = SUM(activities.modules_equivalent)
- Admin dashboard: "Budget reconciliation tool" to fix discrepancies

---

### Key Dependencies

#### Dependency 1: Google Workspace OAuth Client Credentials
**Owner:** School IT Department
**Required By:** Phase 1 start

**Status:** Pending
**Action Items:**
- Request OAuth client ID/secret from IT
- Provide redirect URI: `https://[production-url]/auth/callback`
- Specify required scopes: email, profile

**Risk:** Delays in IT approval could block Phase 1.
**Mitigation:** Start request 2 weeks before Phase 1 kickoff.

---

#### Dependency 2: Active School Year with Budget Data
**Owner:** School Administration
**Required By:** Phase 2 testing

**Status:** Partial (budget upload process exists)
**Action Items:**
- Ensure all teachers have email addresses in CSV
- Ensure active school year is set (is_active=true)
- Upload test budget data to staging environment

**Risk:** Missing emails prevent teacher access.
**Mitigation:** Pre-launch audit of teacher emails in database.

---

#### Dependency 3: Supabase RLS Policy Testing
**Owner:** Development Team
**Required By:** Phase 1 completion

**Status:** Not started
**Action Items:**
- Test RLS policies with multiple test users
- Verify teachers cannot access other teachers' data
- Ensure admins retain full access

**Risk:** RLS misconfiguration could expose sensitive data.
**Mitigation:** Comprehensive security testing in Phase 1.

---

## 13. Open Questions & Decisions

### Design Decisions Needed

1. **Password Reset for Teachers?**
   - Google OAuth users don't have passwords in Supabase
   - If Google account is locked/lost, teacher loses access
   - **Decision:** Accept risk for MVP (Google Workspace admins can reset). Add fallback email/password option in Phase 8 if requested.

2. **Admin Override of Completed Activities?**
   - Admins may need to fix errors in completed activities
   - **Decision:** MVP blocks all edits to completed. Add admin-only override in Phase 8 if needed.

3. **Budget Approval Workflow?**
   - Should activities require admin approval before budget deduction?
   - **Decision:** No approval for MVP (self-service trust model). Add approval workflow in Phase 8 if abuse detected.

4. **Multi-Language Support?**
   - System is Italian-only, but school may hire international teachers
   - **Decision:** Italian-only for MVP. Internationalization (i18n) in Phase 8 if >10% non-Italian teachers.

---

### Clarifications Needed from Stakeholders

1. **What happens if a teacher leaves mid-year?**
   - Should their account be deactivated?
   - Should activities remain visible to admins?
   - **Action:** Confirm deactivation process with school admin.

2. **Can teachers create activities for PAST dates?**
   - For backfilling historical data
   - **Action:** Confirm if historical entry is needed or should be blocked.

3. **Budget adjustment requests: In-app or via email?**
   - If teacher exceeds budget, can they request more?
   - **Action:** Define process (MVP: email to admin, future: in-app request form).

---

## 14. Appendix

### Glossary

- **Modulo:** 50-minute teaching period (equivalent to 1 class module)
- **Tesoretto:** Annual budget of recovery hours allocated to teacher
- **Recupero:** Recovery session for students who missed instruction
- **Anno Scolastico:** Academic/school year (e.g., 2024/2025)
- **Pianificato:** Planned activity status
- **Recuperato:** Completed activity status
- **Classe:** Student class/group (e.g., 3A = year 3, section A)

---

### Related Documents

- `/Users/holgs/CODE/AgendaRecuperiDocente/CLAUDE.md` - Technical codebase overview
- `/Users/holgs/CODE/AgendaRecuperiDocente/API_DOCUMENTATION.md` - API endpoints
- `/Users/holgs/CODE/AgendaRecuperiDocente/prisma/schema.prisma` - Database schema
- Supabase Authentication Docs: https://supabase.com/docs/guides/auth/social-login/auth-google

---

### Revision History

| Version | Date       | Author              | Changes                     |
|---------|------------|---------------------|------------------------------|
| 1.0     | 2025-10-13 | Product Manager AI  | Initial specification draft  |

---

**Document Status:** Draft - Awaiting Stakeholder Review
**Next Review Date:** 2025-10-20
**Approval Required From:** School Administration, IT Department, Lead Developer
