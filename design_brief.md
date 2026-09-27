# Design Brief: PressPlus Application Refactor

## 1. Objective

Refactor the existing mobile-first application into a professional, desktop-first SaaS layout. Implement a new guided onboarding flow to replace the current placeholder.

## 2. Target Audience

Pressing (dry cleaning business) managers in Côte d'Ivoire. They value efficiency, clarity, and a professional-looking tool to manage their business.

## 3. Aesthetic Direction: "Calm & Competent"

- **Layout:** Clean, structured, with generous use of whitespace.
- **Typography:** A modern, highly-readable sans-serif font pairing.
- **Color Palette:** A professional and soothing palette based on slate gray, with a single, vibrant accent color (orange) for primary actions.
- **UI Elements:** Use the existing Shadcn/UI components but arrange them in a more spacious, desktop-friendly manner.

## 4. Core Deliverables

The implementation should modify the existing Next.js application.

### Deliverable 1: New Application Layout (`/app/(app)/layout.tsx`)

- Create a new layout component that includes a permanent sidebar navigation.
- The sidebar should contain links to: Dashboard, Commandes, Clients, Catalogue, Caisse, Rapports, Réglages.
- The main content area should be to the right of the sidebar.
- This new layout will replace the current mobile-centric `Screen` component.

### Deliverable 2: New Onboarding Flow

- Create a new full-screen, multi-step onboarding experience.
- This flow will live under a new route group, e.g., `/app/(onboarding)/layout.tsx` and `/app/(onboarding)/...`.
- The user should be redirected to `/onboarding/step-1` if they have no `pressing` configured.
- **Step 1: Pressing Identity.** Form to input Pressing Name, Address, and upload a Logo.
- **Step 2: Services & Tarifs.** A simple interface to define basic services and their prices.
- **Step 3: Subscription Plan.** A page to select a subscription plan.

## 5. Technical & Styling Guidelines

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Component Library:** Shadcn/UI. Reuse existing components where possible.
- **File Structure:** Follow the existing project structure. Place new pages and components in their logical directories.
- **Responsiveness:** While the primary focus is desktop, the new layout must be reasonably responsive on tablet and mobile screens.

## 6. Output Path

The output should be the modified files within the existing project structure at `/Users/melvyn/projetSass/PressPlus`.

- `/Users/melvyn/projetSass/PressPlus/app/(app)/layout.tsx` (and associated components)
- `/Users/melvyn/projetSass/PressPlus/app/(onboarding)/...` (new route group for the onboarding flow)
