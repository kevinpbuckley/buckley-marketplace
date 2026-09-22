---
name: Child item count audit
description: Find content tree nodes with too many children, which slow the editor and content tree.
when_to_use: The user reports a slow content tree or editor, or asks for a content structure health check.
---

# Child item count audit

Sitecore guidance is to keep a node under roughly 100 children. Past that, the content tree
and editor get slow for authors.

## Steps

1. **Scope it.** Ask which site if the user has not said. `listSites` if you need the list.

2. **Scan.** Prefer `invokeOperation` with `xmc.sites.aggregatePageData` — it returns page and
   component data for many pages in one call, which is far cheaper than walking the tree.
   Call `describeOperation` on it first to get the params.

   `findNodesExceedingChildLimit` also exists and walks the tree with GraphQL. It works, but
   it is slow on large sites — prefer the aggregate operation.

3. **Report offenders.** For each node over the limit: path, child count, and how far over.
   Sort worst first.

4. **Suggest remediation.** The usual fix is bucketing or introducing folder items by a
   meaningful axis — date, category, region. Recommend based on what the children actually
   are; look at a sample with `listPageChildren` before advising.

## Notes

- A node slightly over 100 is not an emergency. Flag severity honestly rather than alarming.
- Media library folders have the same problem. If the user cares about media, check there too.
