---
name: Brand kit and brand context
description: The two brand sources — structured rules in the brand kit, narrative knowledge in the brand context — which to read for a given question, and the JSON each returns.
when_to_use: Any question about brand — tone of voice, messaging, audiences, positioning, visual rules, glossary, proof points, or whether some copy is on-brand.
---

# Brand kit and brand context

Sitecore holds brand information in two separate places. Picking the wrong one is the most
common mistake here.

| | **Brand kit** | **Brand context** |
|---|---|---|
| Holds | Structured rules an editor fills in | Brand knowledge as markdown documents |
| Shape | sections → fields | folders → documents |
| Typical content | Tone of Voice, Visual Guidelines, Image Style, Glossary, Dos and Don'ts, Grammar Guidelines | Audiences, Messaging, Product, Content Guidelines, Customer Evidence |
| Attached to | a **site** | the **organization** |
| Tool | `readBrandKit` | `readBrandContext` |

The brand kit is the **rulebook** — prescriptive, per site. The brand context is the
**briefing** — long-form narrative about the business, per organization.

## Read access is currently denied

Verified against this tenant: `readBrandKit` and `readBrandContext` return **401**. The app
registration has the brand **review** scope, which is a separate grant from brand **read**, and
read is not currently available to request.

So for any question about what the guidelines *say*, go straight to `generateBrandReview` over
real copy — do not call the readers first and do not retry them. The tools remain in place for
when the read scope is granted, and they report the denial plainly if called.

## Which one answers the question

- Tone of voice, visual rules, allowed wording, glossary → **brand kit**
- Audiences, personas, positioning, value propositions, proof points, competitors → **brand context**
- "Is this copy on-brand?" → `generateBrandReview`, which scores it against the kit
- "Tell me about the brand" → list both, then read only what the question needs

## Brand kit

1. `readBrandKit` with `brandKitId` returns the kit summary and its section names.
2. `readBrandKit` again with `section` returns that section's fields.

Get the id from `xmc.agent.sitesGetSiteDetails`, whose `brand_information` field holds **only
the id** — never the guidance. Do not present that id as brand content. Omit `brandKitId` to
list every kit in the organization.

A section's fields come back as:

```json
{ "section": "Tone of Voice",
  "fields": [ { "name": "Tone of voice", "type": "text", "value": "…", "intent": "…" },
              { "name": "Tone scenarios", "type": "…", "value": [ … ] } ] }
```

`value` holds the content. It is a string for `text` fields but can be an **array of objects**
for structured fields such as tone scenarios or colour palettes — read it rather than assuming
a string, and summarise the entries instead of dumping raw JSON.

## Brand context

1. `readBrandContext` with `brandContextId` returns every document as a `Folder / Document`
   path, e.g. `Messaging / Messaging Framework`.
2. `readBrandContext` again with `document` returns that document's markdown.

Omit `brandContextId` to list the organization's contexts. `runStatus` should be `completed`;
anything else means it is still being built and may be incomplete.

## If a read is denied

These endpoints are part of the Agent API but absent from the published SDK, so they are
registered by a local module in this app. A 401 or 403 means the Marketplace app registration
lacks the brand read scope — the app has the brand **review** scope, which is separate.

When that happens: say the guidelines cannot be read, then offer `generateBrandReview` over
real copy instead. Its findings name the rules they come from and usually answer the
underlying question. Do not retry, and do not search for another operation — there isn't one.

## Rules

- **Never infer brand guidance.** Not from the brand name, the industry, or the page copy.
- Read the documents the question needs. The tree can hold 18 or more, and they are long.
