---
name: Brand kit vs brand context
description: The two brand sources — structured rules in the brand kit, narrative knowledge in the brand context — which to read for a given question, and the JSON each returns.
when_to_use: Any question about brand — tone of voice, messaging, audiences, positioning, visual rules, glossary, competitors, proof points, or whether something is on-brand.
---

# Brand kit vs brand context

Both live on the **Agent API** and both are readable. They are different things.

| | **Brand kit** | **Brand context** |
|---|---|---|
| Holds | Structured rules an editor fills in | Brand knowledge as markdown documents |
| Shape | sections → fields | folders → documents |
| Typical content | Tone of Voice, Visual Guidelines, Image Style, Glossary and Localization, Dos and Don'ts, Grammar Guidelines, Checklist, Global Goals | Audiences, Messaging, Product, Content Guidelines, Customer Evidence |
| Attached to | a **site** | the **organization** |
| Tool | `readBrandKit` | `readBrandContext` |

The brand kit is the **rulebook** — short, prescriptive, per site. The brand context is the
**briefing** — long-form narrative about the business, per organization.

## Which one answers the question

- Tone of voice, visual rules, allowed wording, glossary → **brand kit**
- Audiences, personas, positioning, value propositions, proof points, competitors → **brand context**
- "Is this page on-brand?" → `generateBrandReview`, which scores content against the kit
- "Tell me about the brand" → list both, then read only what the question needs

## Brand kit

1. `readBrandKit` with `brandKitId` returns the kit summary and its section names.
2. `readBrandKit` again with `section` returns that section's fields.

Get the id from `getSiteContext` (`brandKitId`), or from `xmc.agent.sitesGetSiteDetails`,
whose `brand_information` field holds **only the id** — never the guidance. Do not present
that id as brand content. Omit `brandKitId` to list every kit in the organization.

A section's fields come back as:

```json
{ "section": "Tone of Voice",
  "fields": [ { "name": "Tone of voice", "type": "text", "value": "…", "intent": "…" },
              { "name": "Tone scenarios", "type": "…", "value": [ … ] } ] }
```

`value` is the content. It is a string for `text` fields, but can be an array of objects for
structured fields such as tone scenarios or colour palettes — read it rather than assuming a
string, and summarise the entries instead of dumping raw JSON at the user.

## Brand context

1. `readBrandContext` with `brandContextId` returns every document as a `Folder / Document`
   path, e.g. `Messaging / Messaging Framework`.
2. `readBrandContext` again with `document` returns that document's markdown in `content`.

Omit `brandContextId` to list the organization's contexts. `runStatus` should be
`completed`; anything else means the context is still being built and may be incomplete.

Document content is markdown with headings — quote or summarise it, do not paste it whole.

## Rules

- **Never infer brand guidance.** If a read fails, say so; do not fall back on what a brand
  like this usually says.
- Read the documents the question needs. The tree can hold 18 or more documents and they are
  long.
- If a call reports the host did not route it, that is a platform limitation. Say so and stop
  — do not hunt for an alternative through `searchOperations`, as these endpoints are newer
  than the SDK's generated operation list and will not appear there.
