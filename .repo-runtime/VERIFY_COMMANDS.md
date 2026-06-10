# VERIFY_COMMANDS.md — Barrel Beat

## Purpose

Verify that Barrel Beat installs, typechecks, and builds on the current machine.

## Required system tools

- Node.js
- npm
- TypeScript through npm dependencies

## Verification commands

npm install
npm run typecheck
npm run build
test -f public/build/main.js

## Expected result

- npm install completes successfully.
- npm run typecheck passes.
- npm run build creates public/build/main.js.
- public/build/ is generated output and should not be committed unless explicitly approved.
