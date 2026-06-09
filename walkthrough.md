# Project Architecture Walkthrough (Phase 1, 2, 3, 4, 5 & 6)

This document provides a comprehensive walkthrough of the database architecture, authentication system, multi-tenant path routing, permission-based guards, student wellness core dashboard, community portal, and the clinical counselor dashboard implemented for the **MindSpire** digital mental wellness platform.

---

## 1. File Inventory and Architecture Paths

The following files are generated in your workspace to construct the multi-tenant auth, data, student wellness, community, and clinical counselor dashboard layers:

### 1.1 Database Architecture (Phase 2 & Revisions)
* **Core SQL Migration Script:** [20260607000000_init_schema.sql](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/supabase/migrations/20260607000000_init_schema.sql)
  * Defines structural tables, indexes, constraints, helper functions, and base RLS rules.
* **Migration Patch Script:** [20260607000100_patch_revisions.sql](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/supabase/migrations/20260607000100_patch_revisions.sql)
  * Applies Phase 2 patch revisions: decoupled anonymous profiles, risk log, global/tenant feature toggles, languages lookup list.
* **Phase 3 Schema Alignments:** [20260607000200_phase3_db_adjustments.sql](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/supabase/migrations/20260607000200_phase3_db_adjustments.sql)
  * Adds allowed domain verification tables, access code discovery lookups, and a bootstrap script helper for Super Admins.
* **Phase 4 Schema Revisions:** [20260607000300_phase4_revisions.sql](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/supabase/migrations/20260607000300_phase4_revisions.sql)
  * Adds GIN index and text arrays for GIN index blind keyword searches, gratitude logs, qualitative descriptors, and bookmarks tables.
* **Phase 5 Schema Revisions:** [20260607000400_phase5_community.sql](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/supabase/migrations/20260607000400_phase5_community.sql)
  * Alters reactions constraints, adds community category tags, maps internal reputation metrics, logs recommendation history, and creates moderation appeals workflow.
* **Phase 6 Schema Revisions:** [20260607000500_phase6_counselor.sql](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/supabase/migrations/20260607000500_phase6_counselor.sql)
  * Alters `counselor_notes` for encrypted DEKs, creates `counselor_availability` scheduling table with indices, triggers, and RLS.
* **Database Seed Script:** [seed.sql](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/supabase/seed.sql)
  * Pre-populates baseline testing data with translation locales.

### 1.2 Authentication & Multi-Tenant Foundation (Phase 3)
* **Centralized RBAC Engine:**
  * [permissions.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/permissions/permissions.ts)
  * [roles.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/permissions/roles.ts)
  * [rbac.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/permissions/rbac.ts)
* **Supabase SSR Clients:**
  * [client.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/supabase/client.ts)
  * [server.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/supabase/server.ts)
  * [middleware.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/supabase/middleware.ts)
* **Protected Routes Middleware:**
  * [middleware.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/middleware.ts)

### 1.3 Student Wellness Dashboard Core (Phase 4 & Revisions)
* **Data Access & Services Layer:**
  * [mood.repository.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/repositories/mood.repository.ts)
  * [journal.repository.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/repositories/journal.repository.ts)
  * [assessment.repository.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/repositories/assessment.repository.ts)
  * [cms.repository.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/repositories/cms.repository.ts)
  * [wellness.service.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/services/wellness.service.ts)

### 1.4 Community Feed & Portal (Phase 5)
* **Repositories & Services:**
  * [community.repository.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/repositories/community.repository.ts)
  * [notification.repository.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/repositories/notification.repository.ts)
  * [crisis-detector.service.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/services/crisis-detector.service.ts)
  * [recommendation.service.ts](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/src/lib/services/recommendation.service.ts)

### 1.5 Clinical Counselor Dashboard (Phase 6)
* **Backend Layer (Java & Spring Boot 3):**
  * [MindSpireApplication.java](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/MindSpireApplication.java): Spring Boot application main entry point.
  * [SecurityConfig.java](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/config/SecurityConfig.java): Spring Security configurations for CORS and authorization.
  * [CounselorController.java](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/controller/CounselorController.java): REST API endpoints for rosters, availabilities, risk resolutions, profiles, and encrypted notes.
  * [CounselorService.java](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/service/CounselorService.java): Business logic gating rosters, consent gates, scheduling, and alert updates.
  * [KmsEncryptionUtil.java](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/util/KmsEncryptionUtil.java): Envelope encryption utility for securing clinical session notes.
* **Frontend Layer (HTML5, CSS3, ES6 JavaScript):**
  * [counselor.html](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/counselor.html): Main counselor dashboard template displaying assigned students grid, schedulers, and risk queues.
  * [student-detail.html](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/student-detail.html): Profile page graphing mood history (Chart.js), listing assessment history, consent-gating journals, and writing session notes.
  * [pending-approval.html](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/pending-approval.html): Status landing page for counselors under review or rejected.
  * [style.css](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/style.css): Global styling variables defining calving light-theme branding.

---

## 2. Walkthrough of Phase 4 Wellness Mechanics

* **Revised Compound Wellness Score Algorithm:** Rolling Mood (40%), PHQ-9 (20%), GAD-7 (20%), and Engagement Consistency (20%).
* **Blind Index Hashing:** Filters stopwords, hashes using HMAC-SHA-256 and searches arrays.

---

## 3. Walkthrough of Phase 5 Community & Engagement Portal

* **Proactive PII & Crisis Scanning Safety:** Warning triggers for emails, phone numbers, and roll-numbers. Risk Alert trigger on crisis keywords.
* **Discussion Tree & Custom Reactions:** Threaded comments, support/helpful/relatable/encouraging reactions, and anonymous profile reputation stats.

---

## 4. Walkthrough of Phase 6 Counselor Dashboard (Clinical Layer)

### 4.1 Roster Resolution & Assigned Students
* verified counselors gain roster access solely to assigned students (either defined via scheduled bookings or active student permission records in `public.consent_grants`).

### 4.2 Consent Gates (Journals & AI Chats)
* Counselor has read access to basic charts and clinical tests. However, student journal pages and AI assistant logs are gated by `StudentConsentCheck`. Decryption occurs server-side via envelope decryption ONLY if the active consent grant is verified.

### 4.3 KMS Envelope Encrypted Session Notes
* Counselor can select any past booking and write session log notes. On commit, notes are envelope-encrypted (AES-256-GCM using generated DEKs, with DEKs wrapped in master KEKs using Scrypt key derivation) and written to `counselor_notes`.

### 4.4 Availability Calendars & Risk Queue Resolvers
* Counselors add open booking blocks which are stored in `counselor_availability` and immediately queryable by students. Risk Alerts in the institution display in the queue, letting counselors inspect incident summaries and log resolution steps.

---

## 5. Walkthrough of Phase 8 MindSpire AI Companion (Cognitive Layer)

### 5.1 AI Chat Interface & Banners
* The chat UI page ([chat.html](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/chat.html)) provides a responsive interface equipped with a permanent safety disclaimer: *"MindSpire AI is a supportive wellness assistant and is not a medical professional."*

### 5.2 Dynamic Memory Preferences
* Students configure conversation context settings:
  * **No Memory:** No past messages are appended to requests.
  * **Session Memory:** Sends history from the current active conversation session.
  * **Persistent Memory:** Aggregates messages across recent past sessions as history context.

### 5.3 Safety Guardrails, Crisis Detection & Escalation
* Prompt engineering strictly prevents the system from diagnosing conditions or suggesting medical treatments.
* In-app queries are scanned for high-risk self-harm terminology. When flagged:
  * A database incident row is logged in `public.risk_alerts` with `severity = 'critical'`.
  * The response triggers counselor suggestion workflows and displays emergency helpline information (Tele-MANAS: 14416).

### 5.4 Secure Message Storage & Export
* AI messages are stored securely inside `ai_chat_messages` using envelope encryption (AES-256-GCM DEKs wrapped in master KEKs).
* Transcripts can be exported instantly to the student's local device as `.txt` files.

---

## 6. Walkthrough of Sprint 2 Student Dashboard, Assessments, and Journals

The following files are added to implement **Sprint 2: Student Dashboard + Assessments + Journals**:
* **Backend Controllers & DTOs:**
  * [JournalController.java](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/controller/JournalController.java): REST endpoints for encrypted journal CRUD and hashed keyword queries.
  * [AssessmentController.java](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/controller/AssessmentController.java): REST endpoints for questionnaire lists, loading questions, and score submissions.
  * [WellnessController.java](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/controller/WellnessController.java): REST endpoints for compound wellness score and Chart.js mood trend datasets.
  * [AssessmentSubmissionRequest.java](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/dto/AssessmentSubmissionRequest.java): DTO payload for questionnaire submissions.
* **Frontend Web Pages:**
  * [dashboard.html](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/dashboard.html): Main Overview dashboard with progress indices and interactive logger.
  * [journal.html](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/journal.html): Logging interface and encrypted timeline feed.
  * [assessments.html](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/assessments.html): Active wizard layout for PHQ-9 & GAD-7 clinical questionnaires.
* **Client JS Modules:**
  * [dashboard.js](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/js/dashboard.js): Connects mood log events and renders Chart.js trend datasets.
  * [journal.js](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/js/journal.js): Renders decrypted reflections and handles blind search lookups.
  * [assessments.js](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/js/assessments.js): Drives the screen wizard stepper and handles suicidal ideation triggers.

### 6.1 Daily Mood Check-In & Chart.js Trends
* Students check in by selecting one of 8 mood descriptors (mapping to scores 1-5).
* Context notes can be entered, which are posted directly to the backend database.
* The 30-day mood trends line chart fetches logging history and displays coordinates using smooth cubic interpolation line charts in vanilla JS.

### 6.2 Rolling Wellness Score & Consistency Streaks
* The compound score dynamically computes a rolling percentage on the backend: Mood (40%), PHQ-9 (20%), GAD-7 (20%), and Logging Consistency (20%).
* A local calendar helper evaluates sequential check-ins and increments the student's active logging streak.

### 6.3 Hashed Search & Decrypted Journal Feed
* Journals are envelope-encrypted (AES-256-GCM) at the database layer.
* When querying logs, the text is tokenized, stopwords are discarded, and keywords are HMAC-SHA-256 hashed on the client request.
* The backend matches these hashes against the `search_indices` text array using native Postgres overlap operators (`&&`) and returns decrypted entries securely.

### 6.4 Active GAD-7 & PHQ-9 Screening Stepper
* The interactive Screening Stepper allows step-by-step navigation of questions.
* If a student answers >0 on PHQ-9 Question 9 (Suicidal Ideation), the interface triggers a supportive warning, showing the Tele-MANAS helpline (14416) and counselor links.
* Historical scores are displayed in a responsive logs table, styled with HSL color-coded severity badges.

---

## 7. Walkthrough of Sprint 3 Community, Notifications, and Resources

The following files are added to implement **Sprint 3: Community + Notifications + Resources**:
* **Backend Entities & Repositories:**
  * [`CommunityPost.java` / `CommunityPostRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/CommunityPost.java): Maps community posts.
  * [`CommunityComment.java` / `CommunityCommentRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/CommunityComment.java): Maps threaded comments.
  * [`CommunityReaction.java` / `CommunityReactionRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/CommunityReaction.java): Maps custom support reactions.
  * [`Notification.java` / `NotificationRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/Notification.java): Maps in-app and push notifications.
  * [`NotificationPreference.java` / `NotificationPreferenceRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/NotificationPreference.java): Maps user channel preference configurations.
  * [`Resource.java` / `ResourceRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/Resource.java): Maps self-help content guidelines.
  * [`ResourceBookmark.java` / `ResourceBookmarkRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/ResourceBookmark.java): Maps student bookmarks.
  * [`ResourceRecommendationHistory.java` / `ResourceRecommendationHistoryRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/ResourceRecommendationHistory.java): Tracks history logs for recommendation audits.
  * [`ModerationReport.java` / `ModerationReportRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/ModerationReport.java): Maps reported content flags.
  * [`ModerationAction.java` / `ModerationActionRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/ModerationAction.java): Maps moderator queue action logs.
  * [`ModerationAppeal.java` / `ModerationAppealRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/ModerationAppeal.java): Maps student appeals.
* **REST Controllers & Services:**
  * [`CommunityController.java` / `CommunityService.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/controller/CommunityController.java): REST endpoints for category-based filtering, reactions, and reports resolving.
  * [`NotificationController.java` / `NotificationService.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/controller/NotificationController.java): REST endpoints for alerts lists, read flags, and preferences.
  * [`ResourceController.java` / `ResourceService.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/controller/ResourceController.java): REST endpoints for guides, recommendations, and bookmarks.
  * [`PiiDetectionService.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/service/PiiDetectionService.java): Regex scanning service blocking emails, phones, and roll IDs.
  * [`CrisisDetectionService.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/service/CrisisDetectionService.java): Distress keywords scanning service logging database RiskAlert entities.
* **Frontend Web Pages:**
  * [`community.html` / `community.js`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/community.html): Interactive discussion boards.
  * [`notifications.html` / `notifications.js`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/notifications.html): Inbox alerts logs and preferences switches.
  * [`resources.html` / `resources.js`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/resources.html): Curator widgets displaying mood recommendations.

### 7.1 Anonymous Discussion board & Threaded Comments
* Community posts and comments are strictly mapped using student `AnonymousProfile` pseudonyms. Real identities are never exposed in the UI.
* Threaded replies support a 1-level nested grid hierarchy linked by `parentId`.

### 7.2 PII Blocking Filter & Crisis Scanner
* Text submissions are evaluated before saving. If regex detects email, phone, or roll ID patterns, the submission is rejected with a validation warning.
* If distress keywords are detected, the post is saved as `status = 'hidden'` to prevent public exposure, a pending critical `RiskAlert` is created, and the student is prompted with Tele-MANAS (14416) counseling helpline links.

### 7.3 Real-Time Notification preferences
* The alerts inbox aggregates in-app reminders.
* Switches enable or disable pushing notifications to In-App, Email, and Web-Push channels.
* Risk Alert subscriptions are restricted solely to Counselor and Admin roles.

### 7.4 Personalized Resource Recommendations
* The self-help dashboard dynamically pulls mood histories and check-in descriptors.
* Low mood check-ins (e.g. <= 2.5) or anxiety/stress tags match categories like "Anxiety & Stress Management" or "Motivation", automatically listing relevant articles in the widgets.

---

## 8. Walkthrough of Sprint 5: Institution Admin Dashboard

The following files are added to implement **Sprint 5: Institution Admin Dashboard**:
* **Backend Entities & Repositories:**
  * [`Announcement.java` / `AnnouncementRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/Announcement.java): Maps institutional announcements.
  * [`AuditLog.java` / `AuditLogRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/AuditLog.java): Maps immutable security audit logs.
  * [`FeatureFlag.java` / `FeatureFlagRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/FeatureFlag.java): Maps global feature flag catalog.
  * [`InstitutionFeatureFlag.java` / `InstitutionFeatureFlagRepository.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/entity/InstitutionFeatureFlag.java): Maps tenant feature overrides.
* **REST Controllers & Services:**
  * [`AdminController.java` / `AdminService.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/controller/AdminController.java): Restricts access to administrator roles, exposing stats, anonymized heatmaps, approvals, branding, and read-only audit logs.
  * [`AnnouncementController.java` / `AnnouncementService.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/controller/AnnouncementController.java): Exposes active targeted alerts feed and notice board controls.
* **Frontend Web Pages:**
  * [`admin.html` / `admin.js`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/admin.html): Institution Admin Dashboard providing visual charts and system configurations.
  * [`js/branding-injector.js`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/js/branding-injector.js): Client script that dynamically injects active tenant logo, theme colors, support emails, and emergency helplines.

### 8.1 KPI Overview Highlights & Verification Queue
* Admins monitor key institution statistics: Active Students, Verified Counselors, Total Check-Ins, and unresolved Risk Alerts.
* The Counselor Approvals panel displays pending clinical profiles, allowing admins to verify credentials and toggle their login status.

### 8.2 Anonymized Wellness Risk Heatmap
* Wellness scores are aggregated by cohort variables: Department, Academic Year, and Program.
* **Privacy Suppression Gate:** If any cohort contains **fewer than 5 students**, it is suppressed and excluded from the graphs, ensuring individual scores cannot be profiled.
* Administrators are strictly barred from accessing student journals, AI chat transcripts, counselor notes, or raw assessment answers.

### 8.3 Dynamic Multi-Tenant Branding Config
* Institution logos, primary theme colors, secondary colors, support emails, and emergency contacts are managed dynamically.
* Settings are stored inside `branding_config` JSONB column on the `institutions` table.
* The `branding-injector.js` client module runs in the head of each view, fetching config details and overriding CSS custom variables (`--primary-color` and `--accent-color`) dynamically.

### 8.4 Immutable Append-Only Audit Logging
* All administrator actions (approving counselors, modifying branding configurations) are recorded.
* The `lock_audit_logs` database trigger prevents update or delete actions at the SQL level, ensuring a tamper-proof security timeline.
* The `AdminController` only exposes read-only GET endpoints to audit events.

---

## 9. Walkthrough of Sprint 6: MindSpire AI Companion

The following files are modified to implement **Sprint 6: MindSpire AI Companion**:
* **Backend REST Layer:**
  * [`AiChatController.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/controller/AiChatController.java) — Gated all API endpoints using secure Spring Security session context lookup. Completely removed legacy headers `X-User-Id` / `X-Institution-Id`. Integrated concurrent rate limiting of 20 requests/minute.
  * [`AiChatService.java`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/backend/src/main/java/com/mindspire/service/AiChatService.java) — Added IDOR checks to verify session ownership, AES-256-GCM envelope encryption for model dispatches, crisis alerts audit logging, and audit logs tracking.
* **Frontend UI Layer:**
  * [`chat.html`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/chat.html) — Refactored to externalize scripting blocks and load `js/chat.js` and `js/branding-injector.js` dynamically.
  * [`js/chat.js`](file:///c:/Users/Admin/OneDrive/Desktop/MindSpire/frontend/js/chat.js) — ES6 module managing credentials routing, session listings, dynamic language settings (Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati), memory preference controllers, feedback button dispatches, and export downloading.

### 9.1 Session Ownership Gating & Rate Limiting
* IDOR/BOLA protections verify that `session.userId == authenticatedUser.id` for all transcripts retrieval or session operations.
* A concurrent queue-based limiter checks request thresholds on `/api/ai/chat`, returning `429 Too Many Requests` if queries exceed 20/minute.

### 9.2 Pre-Request Crisis Analysis & Safety Guardrails
* User messages are scanned for distress patterns *before* any request is made to the Google Gemini API.
* Triggering crisis indicators logs a critical `RiskAlert` in the queue, logs the crisis audit trace, intercepts response generation, and outputs localized Tele-MANAS (14416) helpline links. No text is sent to the Gemini API URL during a crisis.

### 9.3 Envelope-Encrypted Storage & Memory Preferences
* Prompt queries and assistant completion messages are saved fully encrypted using AES-256-GCM with wrapped Data Encryption Keys (DEKs) in the database. No plain text is persisted.
* Users select between three memory preferences: **No Memory**, **Session Memory** (current chat transcript context), and **Persistent Memory** (combines history of recent 5 conversations).




