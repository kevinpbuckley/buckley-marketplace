---
name: Brand compliance review
description: Review a page's content against the site's brand kit and report compliance scores with fixes.
when_to_use: The user asks whether a page is on-brand, or wants a brand/tone/style review.
---

# Brand compliance review

`ai.skills.generateBrandReview` scores content against a brand kit and returns explanations
and fix suggestions. It needs a brand kit ID, which comes from the host, not from the user.

## Steps

1. **Get the brand kit ID.** Call `getSiteContext`. The `brandKitId` field is the input for
   the review. If it is missing, the site has no brand kit associated — say so and stop,
   rather than guessing an ID.

2. **Get the content to review.** Either:
   - `getPageHtml` for the rendered page, or
   - `getPageDetails` plus `getContentItem` when the user cares about specific fields.

3. **Run the review.** `generateBrandReview` with the `brandKitId` from step 1 and the content
   as named fields in `input`, e.g. `{ headline: "...", body: "..." }`. Pass `sections` only if
   the user wants the review narrowed to part of the brand kit.

4. **Report.** Lead with the compliance score, then the specific violations, each with the
   suggested fix. Quote the offending copy so the user can find it.

## Notes

- There is no brand kit CRUD in the SDK — you can run a review, but you cannot list, read or
  edit brand kits. If the user asks for that, tell them it is not available through the
  Marketplace SDK.
- Do not apply fixes automatically. Report them and let the user decide.
