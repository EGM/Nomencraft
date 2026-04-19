# Service Architecture Overview

The `services/` directory defines the high‑level operational units of the system. Services encapsulate business logic, coordinate workflows, and expose stable entry points for the rest of the application. Although multiple services exist, they do not share equal responsibility. One service acts as the orchestrator, while the others function as supporting API‑style helpers.

---

## ControllerService — The Pipeline Orchestrator

`ControllerService` is the central coordination service responsible for executing the full processing pipeline. It is the only service that interacts directly with pipeline components.

### Responsibilities

- Construct the blackboard (shared state map)
- Assemble the pipeline using `createPipeline`
- Attach observers to pipeline components
- Execute all components in deterministic order
- Normalize results into the standard `Result<T>` type
- Provide centralized logging for component lifecycle events

### Role in the System

`ControllerService` is the top‑level execution engine. It defines the overall workflow, manages component interactions, and interprets the final output. All other services exist to support or extend its capabilities.

> **ControllerService is the pipeline service — the conductor of the entire system.**

---

## Supporting Services (PatternService, FileService, etc.)

Other services in this directory follow an API‑style design. They encapsulate reusable logic and expose high‑level operations, but they do **not** orchestrate components or run pipelines.

### Characteristics of Supporting Services

- Stateless or minimally stateful
- Focused on a single domain (patterns, files, configuration, etc.)
- Provide helper methods or domain‑specific utilities
- Do not manage component lifecycles
- Do not attach observers
- Do not interpret pipeline results

These services exist to keep `ControllerService` focused and maintainable. They provide the building blocks that the orchestrator uses to perform its work.

---

## Why This Separation Matters

This architectural split ensures:

### Clear Ownership

Only one service controls pipeline execution, making the system easier to reason about.

### Predictable Component Behavior

Components emit events, and only `ControllerService` listens to them. No other service interferes with component lifecycles.

### Simplified Testing

Supporting services can be tested in isolation.\
`ControllerService` can be tested as a workflow.

### Extensibility

New services can be added without affecting pipeline orchestration.\
New components can be added without modifying supporting services.

### Maintainability

Responsibilities are cleanly divided:

- **ControllerService** = workflow + orchestration
- **Supporting services** = domain logic + utilities

---

## Summary

- `ControllerService` is the **pipeline orchestrator**.
- All other services are **API‑style helpers**.
- Only `ControllerService` interacts with components.
- Supporting services provide logic, not orchestration.
- This separation keeps the system modular, testable, and easy to extend.
