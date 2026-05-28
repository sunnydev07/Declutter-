# Declutter Feature Creation Guide

## Project Shape

Declutter is a Windows-focused productivity app with three main surfaces:

- `src/`: React 19 + TypeScript + Vite frontend.
- `src-tauri/`: Tauri 2 desktop shell and Rust commands/plugins.
- `src-service/`: standalone Rust Windows service for lock enforcement, hooks, process blocking, overlays, and recovery.

The frontend currently stores app state in `localStorage` through `src/utils/db.ts`. The service has its own persistent lock recovery state under `ProgramData/Declutter`.

## Commands

- Install dependencies: `npm install`
- Run Vite UI only: `npm run dev`
- Build frontend: `npm run build`
- Run Tauri dev app: `npm run tauri -- dev`
- Build Tauri app: `npm run tauri -- build`
- Check all Rust crates: `cargo check --workspace`
- Build service only: `cargo build -p declutter-service`
- Build service release: `cargo build -p declutter-service --release`

There is no dedicated test runner configured yet. For feature work, at minimum run `npm run build` and `cargo check --workspace` when touching TypeScript or Rust respectively.

## Feature Workflow

Before editing, classify the feature by surface:

- Frontend-only workflow or UI: work in `src/components`, `src/hooks`, `src/types`, and `src/utils/db.ts`.
- Desktop integration: add Tauri commands/plugins in `src-tauri/src/lib.rs` and call them from the frontend.
- Lock enforcement or OS behavior: extend `src-service/src/session.rs`, `src-service/src/ipc`, `src-service/src/enforcer`, or `src-service/src/hooks`.
- Frontend-to-service behavior: update the IPC protocol in `src-service/src/ipc/protocol.rs` first, then keep frontend request shapes and service handlers aligned.

Keep feature state typed in `src/types/session.ts`, and keep persistence details inside `src/utils/db.ts` instead of scattering `localStorage` calls through components.

## Frontend Conventions

- Use function components and hooks.
- Put new reusable state logic in `src/hooks`.
- Co-locate component CSS next to the component, following existing folders such as `Timer`, `Settings`, `Dashboard`, and `AppBlocker`.
- Reuse global design tokens from `src/index.css`: colors, spacing, radii, transitions, text colors, and glass card styles.
- Preserve the existing dense app layout with `Sidebar` plus `main-content`; do not turn app screens into landing pages.
- Avoid broad UI rewrites when adding one feature. Extend the current screen structure unless the feature genuinely needs a new view.

## Service And Safety Rules

The service can disable Task Manager, command shells, input hooks, websites, and running processes. Treat every enforcement change as high risk.

- Always preserve a cleanup path through `end_session`.
- If a feature adds a restriction, add the matching release/undo behavior at the same time.
- Keep lock mode behavior explicit in `session.rs` so `Soft`, `App`, `View`, and `Full` remain easy to audit.
- Use short manual sessions when validating lock behavior.
- Do not run destructive or admin-level system changes unless the user explicitly approves them.
- Recovery behavior belongs in `check_and_recover_state`; keep crash recovery consistent with normal cleanup.

## Data And Stats

- Sessions use `FocusSession` from `src/types/session.ts`.
- Settings use `UserSettings` and are saved through `db.saveSettings`.
- App and website rules should go through the rule helpers in `src/utils/db.ts`.
- Completed or failed sessions update daily aggregates through `db.updateDailyStats`.
- If a feature changes session status semantics, update stats and garden behavior together.

## Verification Checklist

For each feature, use the smallest verification set that covers the changed surface:

- TypeScript/UI change: `npm run build`
- Tauri shell change: `npm run build` and `cargo check -p tauri-app`
- Service/protocol change: `cargo check -p declutter-service`
- Cross-surface feature: `npm run build` and `cargo check --workspace`
- Visual interaction change: run the app and inspect the affected view at desktop size.

When verification cannot be run, state exactly which command was skipped and why.

