# UBC Course Scheduler

A medium-fidelity web prototype for an AI-assisted UBC Vancouver degree planner.

## What it does

- Collects a student's UBC major, pathway, interests, workload constraints, and scheduling circumstances.
- Generates a multi-year course schedule for UBC B.Sc. Computer Science, Option in Artificial Intelligence.
- Compares balanced, fastest-path, lighter-load, and exploration-heavy scenarios.
- Validates prerequisites, term availability, credit load, requirement coverage, and high-demand course risk.
- Separates official catalog-style evidence from review-style signals.
- Exports an advisor review packet with unresolved items and safety notes.
- Builds a privacy-minimized LLM prompt for use through a local API proxy.
- Supports light and dark mode with saved preference.

## Run

```sh
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173`.

## Scope

The core program requirements are based on official UBC sources:

- UBC Vancouver Academic Calendar: B.Sc. Computer Science, including the Option in Artificial Intelligence.
- UBC Science degree requirements summary.

Course review, demand, and term-availability signals are still simulated for prototype purposes.

## Safety posture

This is not an official UBC degree audit. Uncertain prerequisites, transfer credits, accessibility logistics, co-op sequencing, Workday section availability, waitlists, and changing UBC calendar rules are routed to advisor review rather than finalized by the model.
