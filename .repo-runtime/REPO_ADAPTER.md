# REPO_ADAPTER.md – Repository Adapter

This file resides in the `.repo-runtime/` directory of a repository. It adapts the project to the DEV SUPER_COMPANY Founder Runtime. Fill in the details specific to this repository.

## Purpose

Describe the purpose of this repository in one or two sentences. For example: "This repository implements the DKey terminal keyboard on Android."

## Stack and Environment

Specify the languages, frameworks and tools used. Include version constraints if applicable. For example:

- Language: Java / Kotlin
- Framework: Android SDK 33
- Build tool: Gradle
- Dependencies: Jetpack Compose, ...

## Directory Structure

Provide a brief description of important directories. For example:

- `app/src/main/java/...` – Application source code.
- `app/src/main/res/layout` – XML layout files.
- `tests/` – Unit and integration tests.
- `docs/` – Additional documentation.

## Integration with the Runtime

- The `PROJECT_SOURCE_OF_TRUTH.md` file contains the project's vision and constraints.
- The `VERIFY_COMMANDS.md` file lists commands to build and test the project.
- The `CODEX_BOUNDARIES.md` file restricts what Codex can modify.

Make sure these files exist and are up‑to‑date.

## Special Considerations

Include any notes specific to the repository: CI pipelines, external services, legal constraints, etc.