# Authentication and Tenant Flow Sequence Diagrams

This document contains sequence diagrams illustrating the primary workflows of the **MindSpire** authentication and multi-tenant foundation layer.

---

## 1. Email Signup Flow
Students register themselves using their official college email. The domain is verified against the institution's allowed domains list.

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Client as React 19 Client
    participant Action as Server Action (signUpWithEmail)
    participant DB as Supabase PostgreSQL
    participant Auth as Supabase Auth

    Student->>Client: Enters Email, Password, Institution Code
    Client->>Action: Form Submission (validated with Zod)
    Action->>DB: Fetch Tenant by code (check allowed_domains)
    DB-->>Action: Returns Tenant Info (allowed_domains)
    
    alt Email Domain Invalid
        Action-->>Client: Error: "Email domain not allowed for this institution"
        Client-->>Student: Displays validation error
    else Email Domain Valid
        Action->>Auth: supabase.auth.signUp(email, password, metadata: {tenant_id})
        Auth-->>Action: Returns Auth Session (pending verification)
        Action->>DB: Pre-create User Profile (status: pending_onboarding)
        DB-->>Action: Profile Saved
        Action-->>Client: Success: Verification email sent
        Client-->>Student: Displays "Check your email inbox"
    end
```

---

## 2. Google OAuth Signup Flow
OAuth preserves the tenant context. Upon return, the system links the user to their institution database record.

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Client as React 19 Client
    participant Auth as Supabase Auth (OAuth Endpoint)
    participant Provider as Google Identity Platform
    participant Middleware as Next.js Middleware (Callback)
    participant DB as Supabase PostgreSQL

    Student->>Client: Clicks "Sign in with Google"
    Client->>Auth: supabase.auth.signInWithOAuth(provider: 'google', redirectTo: '/[tenant]/callback')
    Auth-->>Student: Redirects to Google Login Consent
    Student->>Provider: Authenticates & Grants Access
    Provider-->>Auth: Redirects back with OAuth Auth Code
    Auth->>Middleware: Exchange Auth Code for Session Token
    Middleware->>DB: Fetch user profile in matching tenant domain
    
    alt User profile does not exist
        Middleware->>DB: Create Profile (domain matched, status: pending_onboarding)
        DB-->>Middleware: Profile Saved
        Middleware-->>Client: Redirect to /[tenant]/onboarding
    else User profile exists
        Middleware-->>Client: Redirect to /[tenant]/dashboard
    end
```

---

## 3. Tenant Resolution Flow (Path-Based)
Explains how the Next.js middleware inspects path segments to resolve the tenant context and handles fallback redirection.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Middleware as Next.js Middleware
    participant Cache as Tenant Cache (Memory/Redis)
    participant DB as Supabase PostgreSQL
    participant App as Next.js App Router

    User->>Middleware: GET Request to /iitb/login
    Middleware->>Middleware: Extract dynamic path segment: "iitb"
    
    alt Tenant in Cache
        Cache-->>Middleware: Returns Tenant Metadata
    else Tenant Not in Cache
        Middleware->>DB: Query institution by subdomain/path key
        DB-->>Middleware: Returns Tenant config or NULL
        Middleware->>Cache: Save mapping (tenant key -> Metadata)
    end

    alt Tenant Found
        Middleware->>App: Forward request with header "x-tenant-id"
        App-->>User: Renders IITB customized themed login screen
    else Tenant Not Found
        Middleware-->>User: Redirect to / (Global Institution Discovery Hub)
    end
```

---

## 4. Onboarding Flow
First-time login setup: profiles are initialized, anonymous handles created, and notifications configured.

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant Client as React 19 Client (Wizard)
    participant Action as Server Action (submitOnboardingFlow)
    participant DB as Supabase PostgreSQL

    Student->>Client: Submits Real Name, Anon Pseudonym, Notification & Consent Settings
    Client->>Action: Invokes action with onboarding payload (Zod validation)
    
    Action->>DB: Check if Anonymous Pseudonym is unique
    DB-->>Action: Returns validation result (Unique/Duplicate)
    
    alt Pseudonym taken
        Action-->>Client: Error: "Pseudonym already in use"
        Client-->>Student: Prompts to select different nickname
    else Pseudonym unique
        begin transaction
            Action->>DB: Update User Profile (real_first_name, status: active)
            Action->>DB: Insert into anonymous_profiles (pseudonym, avatar_config)
            Action->>DB: Insert into notification_preferences (email, push, in_app)
            Action->>DB: If checked: Insert into consent_grants (counselor_id)
        commit transaction
        DB-->>Action: Operations Succeeded
        Action-->>Client: Success: Onboarding complete
        Client->>Client: Route redirect to /[tenant]/dashboard
    end
```

---

## 5. Role Authorization Guards
Determines access policies based on user roles and route guards.

```mermaid
sequenceDiagram
    autonumber
    actor Counselor
    participant Middleware as Next.js Middleware
    participant Auth as Supabase Auth
    participant DB as Supabase PostgreSQL
    participant Route as App Router Route Handler

    Counselor->>Middleware: Access /columbia/counselor/dashboard
    Middleware->>Auth: Validate JWT session cookie
    
    alt Session Invalid
        Auth-->>Middleware: Session NULL
        Middleware-->>Counselor: Redirect to /columbia/login
    else Session Valid
        Middleware->>DB: Query user record (id = auth.uid())
        DB-->>Middleware: Returns User Profile (role: "counselor")
        Middleware->>Middleware: Match route guard rule (/counselor/* requires role="counselor")
        
        alt Role Authorized
            Middleware->>Route: Proceed with request
            Route-->>Counselor: Renders Counselor Clinical Panel
        else Role Unauthorized (e.g. Student tries to access /counselor/*)
            Middleware-->>Counselor: Redirect to /columbia/unauthorized
        end
    end
```
