# Issue tracker: Local Markdown

Issues and specs for this repository live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- Feature specification: `.scratch/<feature-slug>/spec.md`
- Implementation tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- Tickets are numbered from `01`
- Triage state appears as a `Status:` line near the top
- Comments are appended under a `## Comments` heading

## Publishing

When a skill says to publish to the issue tracker, create the appropriate file under `.scratch/<feature-slug>/`.

## Fetching tickets

Read the referenced file directly. Users will normally provide its path or issue number.

## Wayfinding

- Map: `.scratch/<effort>/map.md`
- Child ticket: `.scratch/<effort>/issues/<NN>-<slug>.md`
- Dependencies: `Blocked by: NN, NN`
- Claiming: change `Status:` to `claimed`
- Resolution: add an `## Answer`, change the status to `resolved`, and update the map
