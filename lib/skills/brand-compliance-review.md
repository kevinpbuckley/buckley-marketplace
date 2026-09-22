---
name: Brand compliance review
description: Review page content against the site's brand kit and report compliance scores with fixes.
when_to_use: The user asks whether a page is on-brand, or wants a brand, tone or style review.
---

# Brand compliance review

`ai.skills.generateBrandReview` scores content against a brand kit and returns explanations
and fix suggestions. It needs a brand kit id, which comes from the host, not from the user.

## Steps

1. **Get the brand kit id.** Call `invokeOperation` with key `site.context`, kind `query`,
   and no params. The `brandKitId` field on the result is what you need.

   If it is missing or null, the site has no brand kit associated. Say so and stop — do not
   invent an id.

2. **Get the content to review.** `xmc.agent.pagesGetPageHtml` for the rendered page, or
   `xmc.agent.contentGetContentItemById` when the user cares about specific fields.

3. **Run the review.** `invokeOperation` with:
   - key `ai.skills.generateBrandReview`
   - kind `mutation`
   - params `{ body: { brandkitId, input: { headline: "...", body: "..." } } }`

   Two things to get right:
   - The body spells it **`brandkitId`**, lowercase `k`, while the host context field is
     `brandKitId`. Same value, different casing.
   - `input` is a flat map of named fields whose values are strings, numbers or booleans.
   - `sections` is optional and takes `{ sectionId, fieldIds? }` objects, not plain strings.
     Omit it to review against the whole brand kit.

4. **Report.** Lead with the score, then each violation with the offending copy quoted and
   the suggested fix beside it.

## If the user wants the guidelines themselves

The brand kit's sections cannot be read through the Marketplace SDK — no operation exposes
them. `xmc.agent.sitesGetSiteDetails` returns a `brand_information` field, but its value is
only the brand kit id, so never present it as guidance.

Say the content is unavailable and offer a review of specific copy instead, which returns the
reasoning behind each finding. See the brand kit and brand context skill.

## Notes

- Never infer or invent brand guidance. Either read it or say you cannot.
- Report fixes; do not apply them to the page without being asked.
