# Pet Enrichment Roomba

A self-contained final project app for exploring an autonomous robot that entertains pets while owners are away. It combines a 2D simulation, behaviour flowchart, storyboard, ethics prompts, physical prototype guide, and a local AI Lab powered by LM Studio.

## Run

```bash
python3 server.py
```

Then open `http://127.0.0.1:8017`.

## What is included

- Modern 2D simulator with light/dark mode, pet types, game modes, scenario presets, safety dashboard, privacy mode, adaptive learning toggle, owner override, battery, risk scoring, and event log.
- Behaviour flowchart with normal states, failure states, escalation, docking, and reward/puzzle pauses.
- Eight-panel storyboard showing check-in, invitation, play, retreat, escalation, reporting, owner bonding, and design reflection.
- Ethics prompts covering reliability, animal expertise, owner relationships, malicious use, corporate incentives, labour, government policy, and possible AI futures.
- Cardboard/paper prototype blueprint and build checklist.
- Final report generator for summarizing the session and project argument.
- Local AI Lab using `google/gemma-4-e4b` through `http://127.0.0.1:1234/v1`.

## Local LLM

The report page includes a local AI Lab. It sends live simulator state to the local Python server, which forwards it to LM Studio's OpenAI-compatible endpoint:

```text
http://127.0.0.1:1234/v1/chat/completions
```

The AI Lab can generate design dilemmas, stakeholder roleplay, robot policy rules, surprising failure modes, custom prompts, and simulator setting patches that can be applied back into the app.

Make sure LM Studio's local server is enabled and `google/gemma-4-e4b` is loaded.
