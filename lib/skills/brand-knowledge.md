---
name: Brand
description: How to answer brand questions — brand review works, reading the brand kit or brand context does not.
when_to_use: Any question about brand — tone of voice, messaging, visual rules, glossary, or whether some copy is on-brand.
---

# Brand

Sitecore holds brand information in two places, and you can read neither of them. You can
review copy against the brand kit, which is a genuinely useful substitute for most questions.

| | **Brand kit** | **Brand context** |
|---|---|---|
| Holds | Structured rules: Tone of Voice, Visual Guidelines, Glossary, Dos and Don'ts | Markdown documents: audiences, messaging, product, customer evidence |
| Attached to | a **site** | the **organization** |
| Can you read it? | **No** | **No** |

No operation in the Marketplace SDK exposes either one's contents. `searchOperations` will
not find one. Do not go looking, and do not retry with different wording.

## What works: brand review

`generateBrandReview` sends copy to the brand kit and returns compliance scores, the specific
violations, and suggested fixes. The findings name the sections and rules they come from, so
the review often reveals the guideline the user was really asking about.

1. **Get the brand kit id.** `invokeOperation` with key `xmc.agent.sitesGetSiteDetails`,
   kind `query`, params `{ path: { siteId } }`. The response's `brand_information` field holds
   the brand kit id — and only the id, never the guidance. Get `siteId` from
   `getCurrentSiteContext` when in the Pages editor.
2. **Get the copy.** `xmc.agent.pagesGetPageHtml` for a rendered page, or
   `xmc.agent.contentGetContentItemById` for specific fields. If the user supplied the copy in
   the conversation, just use that.
3. **Review it.** `generateBrandReview` with the `brandKitId` and `input` as named fields,
   e.g. `{ headline: "...", body: "..." }`.
4. **Report.** Lead with the score, then each violation with the offending copy quoted and the
   fix beside it. Report the fixes; do not apply them to the page unless asked.

## Answering "what is our tone of voice?"

You cannot read the Tone of Voice section. Say so, then offer the route that does work: run a
review over some representative copy and report what the findings reveal about the rules. Name
the page or ask which copy to use.

If there is no copy to review, say the guidelines are visible to them directly in Sitecore's
brand management UI and leave it there.

## Rules

- **Never infer brand guidance.** Not from the brand name, the industry, or the page copy. An
  invented answer that sounds plausible is worse than admitting the gap, because the user
  cannot tell which one they got.
- A 401 from the review means the app registration lacks the brand review scope. Report that
  plainly rather than retrying.
