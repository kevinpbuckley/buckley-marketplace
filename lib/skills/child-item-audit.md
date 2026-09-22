---
name: Content structure audit
description: Find content tree nodes with too many children, which slow the editor for authors.
when_to_use: The user reports a slow content tree or editor, or asks for a content structure health check.
---

# Content structure audit

Sitecore guidance is to keep any node under roughly 100 children. Past that, the content tree
and editor get slow for authors.

## Steps

1. **Scope it.** Ask which site if the user has not said; `xmc.sites.listSites` for the list.

2. **Walk the tree.** Start at the site root and use `xmc.sites.listPageChildren` to count
   children per node, descending into nodes that look large.

   For a wide scan, `xmc.sites.aggregatePageData` takes an array of `{ id, language }` and
   returns data for many pages in one call — far cheaper than one request per node. Get the
   candidate ids from `xmc.agent.sitesGetAllPagesBySite` first.

3. **Report offenders.** Path, child count, and how far over the limit. Worst first.

4. **Recommend a fix.** Usually bucketing, or folder items grouped by a meaningful axis —
   date, category, region. Look at a sample of the children before advising, because the right
   axis depends on what they actually are.

## Judgement

- A node slightly over 100 is not an emergency. Report severity honestly rather than alarming
  someone about 104 children.
- The media library has the same constraint. If the user cares about media, check there too.
- Do not restructure anything yourself. Moving content is disruptive and this audit is advice.
