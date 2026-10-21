# inbox/ — messages into and out of this directory

One file per message, `<date>-<slug>.md`. This directory belongs to the node that owns
`agentic-animation/`. A message arriving here outranks whatever you were about to start:
read it, land it, delete the file, commit — then go back.

## Shape

Four header lines, a blank line, the body, then an `## Effort` section at the end:

```
kind:    contract | report | direction | cost | resource
from:    <agent name> (<role, package>)
spend:   <one price unit: idle-compute, tokens, machine_time, ...>
id:      <the message this answers, or the run id, or `none — answered in the run final message`>
```

- **kind** sets the route: `contract` → the parent that wrote it, `direction` → the person,
  `cost` → whoever owns the commitment, `resource` → whoever holds the budget, `report` →
  the layer whose roadmap it changes. (`to:` is not a header line: the directory you write
  into is the route, and this one is read by root.)
- **body** is the question or the order, conclusion first. A report carries what is now
  true, what it cost, and the decision needed (which may be `none`).
- **`## Effort`** says what answering costs, in the same units as `spend`. A `cost` report
  without it is bounced back; a `direction` report is sent on with it marked unfinished.

This directory was named `mail/` before 2026-10-21; the messages that lived there were
landed in their owning documents and deleted, and their verbatim text is in git history.

## Rules

- Only a message's author edits it.
- A message that has landed is deleted in the same commit that lands it. Its text stays in
  git history; this directory holds only what has not landed yet.
- Files filed here by root for the record are root's to remove.
