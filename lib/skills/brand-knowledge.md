---
name: Brand kit and brand context
description: What the two brand sources are, what the SDK can and cannot reach, and what to tell the user when guidance is unavailable.
when_to_use: Any question about brand — tone of voice, messaging, audiences, positioning, visual rules, glossary, or whether something is on-brand.
---

# Brand kit and brand context

Sitecore holds brand information in two separate places.

| | **Brand kit** | **Brand context** |
|---|---|---|
| Holds | Structured rules an editor fills in | Brand knowledge as markdown documents |
| Shape | sections → fields | folders → documents |
| Typical content | Tone of Voice, Visual Guidelines, Image Style, Glossary, Dos and Don'ts | Audiences, Messaging, Product, Content Guidelines, Customer Evidence |
| Attached to | a **site** | the **organization** |

The brand kit is the **rulebook** — prescriptive, per site. The brand context is the
**briefing** — long-form narrative, per organization.

## What you can actually do

**You cannot read either one's content.** The Marketplace SDK exposes no operation for brand
kit sections or brand context documents. Do not go looking: `searchOperations` will not find
them, and no amount of rephrasing changes that.

What is available:

- **Confirm a brand kit is attached.** `xmc.agent.sitesGetSiteDetails` returns
  `brand_information`, which holds the brand kit's **id and nothing else**. Never present that
  GUID as if it were brand guidance.
- **Score content against the brand kit.** `ai.skills.generateBrandReview` takes the brand kit
  id plus the content and returns compliance scores, explanations and fix suggestions. This is
  the one brand capability the SDK has. See the brand compliance review skill.

## Answering brand questions

When asked about tone of voice, audiences, positioning or any other guideline:

1. Say plainly that the brand kit and brand context contents are not available through the
   Marketplace SDK.
2. Offer what you can do instead — a brand review, which scores specific copy against the kit
   and returns the reasoning behind each finding. That often gets at the underlying question.
3. Point out that the guidelines are visible to them directly in Sitecore's brand management UI.

**Never infer brand guidance.** Do not describe a brand's likely tone from its name, its
industry, or the copy on its pages. An invented answer that sounds plausible is worse than
saying the content is unavailable, because the user cannot tell the difference.
