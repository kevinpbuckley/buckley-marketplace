---
name: Working with operations that have no dedicated tool
description: How to find and safely run any SDK operation when no purpose-built tool exists.
when_to_use: A request needs something outside the dedicated tools, such as renaming a site, translating a page, or content transfer.
---

# Working with operations that have no dedicated tool

Only the most common operations have dedicated tools. The SDK exposes 189, all reachable
through `invokeOperation`.

## Steps

1. **Find it.** `searchOperations` with plain keywords describing the goal ("rename site",
   "translate page", "delete version"). Narrow with `namespace` if you already know the area:
   - `xmc.pages` — a single page: create, rename, duplicate, translate, versions, layout, fields
   - `xmc.sites` — sites, collections, hosts, languages, profiles, sitemap, bulk aggregates
   - `xmc.agent` — the Agent API: pages, content, components, assets, personalization, jobs
   - `xmc.contentTransfer` — moving content between environments
   - `ai.skills` — brand review
   - `host` / `site` / `pages` / `application` — context from the Marketplace host

2. **Read the signature.** `describeOperation` on the key. It returns the exact params type,
   including which fields are required and any referenced body models. Do not skip this —
   guessed parameter names fail.

3. **Run it.** `invokeOperation` with the key, the `kind` from step 2 (`query` reads,
   `mutation` writes), and params matching the shape.

## Safety

- **Confirm before any destructive mutation.** Deleting sites, collections, hosts, languages
  or versions is not reversible from here. State plainly what will be deleted and wait.
- Jobs from the Agent API can often be reverted — `listJobOperations` then `revertJob`. Mention
  that when a write goes wrong.
- If a key is reported `deprecated`, use the `useInstead` replacement. `xmc.xmapp.*` is
  deprecated as a whole in favour of `xmc.sites.*` and `xmc.pages.*`.
