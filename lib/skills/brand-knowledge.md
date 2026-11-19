---
name: Brand kit and brand context
description: The two brand sources — structured rules in the brand kit, narrative knowledge in the brand context — what each holds, and why the guidelines can only be reached through a brand review.
when_to_use: Any question about brand — tone of voice, messaging, audiences, positioning, visual rules, glossary, proof points, or whether some copy is on-brand.
---

# Brand kit and brand context

Sitecore holds brand information in two separate places.

| | **Brand kit** | **Brand context** |
|---|---|---|
| Holds | Structured rules an editor fills in | Brand knowledge as markdown documents |
| Shape | sections → fields | folders → documents |
| Typical content | Tone of Voice, Visual Guidelines, Image Style, Glossary, Dos and Don'ts, Grammar Guidelines | Audiences, Messaging, Product, Content Guidelines, Customer Evidence |
| Attached to | a **site** | the **organization** |

The brand kit is the **rulebook** — prescriptive, per site. The brand context is the
**briefing** — long-form narrative about the business, per organization.

## You cannot read either one directly

The Agent API has brand kit and brand context read endpoints, but they are not in the
Marketplace SDK (xmc 0.5.0), so they are not in the operation catalog. They also need a brand
**read** scope this app does not have; it has the brand **review** scope only. Do not search
the catalog for them — there is nothing to find.

## What to do instead

- "Is this copy on-brand?", "Review this page's tone" → `generateBrandReview` over the real
  copy. Follow the Brand compliance review skill.
- "What do our guidelines say about X?" → say the guidelines cannot be read here, then offer a
  brand review of real copy that touches X. Its findings name the rules they come from and
  usually answer the underlying question.
- The brand kit **id** is available: `query site.context` returns `brandKitId`, and
  `xmc.agent.sitesGetSiteDetails` has it in `brand_information`. That field holds **only the
  id** — never the guidance. Do not present the id as brand content.

## Rules

- **Never infer brand guidance.** Not from the brand name, the industry, or the page copy.
- Do not retry a brand review that was denied (401/403); report it and stop.
