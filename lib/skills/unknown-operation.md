---
name: Calling SDK operations
description: How to find, inspect and safely run any of the 189 Sitecore SDK operations.
when_to_use: Any task needing Sitecore data or changes. Read this before your first invokeOperation call.
---

# Calling SDK operations

You have a handful of tools and the whole SDK behind them. Nearly every task is the same loop,
and the fewer steps it takes the faster and cheaper the answer.

## The loop

0. **Check the skills first.** A loaded skill gives exact request shapes for the common
   operations; invoke those directly and skip steps 1–2.

1. **`searchOperations`** with plain keywords for the goal — "rename site", "page versions",
   "upload asset". Narrow with `namespace` when you already know the area:

   | namespace | what lives there |
   |---|---|
   | `xmc.agent` | pages, content items, components, assets, personalization, jobs |
   | `xmc.pages` | one page: versions, layout, fields, rename, duplicate, translate |
   | `xmc.sites` | sites, collections, hosts, languages, sitemap, bulk aggregates |
   | `xmc.contentTransfer` | moving content between environments |
   | `xmc.preview` / `xmc.live` | read-only GraphQL against unpublished / published content |
   | `xmc.authoring` | Authoring GraphQL, for anything with no dedicated operation |
   | `ai.skills` | brand review |
   | `buckley.pages` | Buckley's own composites: add a component with content, move a component. Params go directly. |
   | `host`, `site`, `pages`, `application` | context from the Marketplace host |

   The top three hits include their `params` (request types under `types`). If the one you
   need is among them, go straight to step 3.

2. **`describeOperation`** for anything else — and for response shapes. Pass every key you
   are about to use in one call: `keys: ["a", "b", "c"]`. Never guess params: wrong names
   fail, and the failure often looks like a permissions error rather than a bad request.

3. **`invokeOperation`** with `key`, `kind` (`query` reads, `mutation` writes) and `params`
   shaped exactly as described. For several independent reads, use **`invokeQueries`** once
   instead of one `invokeOperation` per read.

## Reading what comes back

`describeOperation` reports `returns` and `responseShape` for each operation, with shared
types listed once under `types`. Read it before you call, and you will know what you are
getting instead of guessing at it afterwards.

Things that regularly catch people out:

- **`invokeOperation` returns `{ key, kind, result }`.** The payload is under `result`.
  `invokeQueries` returns `{ results: [{ key, success, result | error }] }` in request order.
- **A field named for a thing is often just its id.** `brand_information` on site details is
  the brand kit's GUID, not the guidance. If a value is a 36-character GUID, treat it as a
  reference and go fetch the thing it points at.
- **Collections vary in wrapping.** Some operations return a bare array, others `{ data: [...] }`
  or `{ items: [...] }`, and batch endpoints return `{ requested, succeeded, failed, data: [...] }`
  where individual entries can fail while the call returns 200 — check per-entry status.
- **A typed field is not a populated one.** Required in the schema does not mean non-empty.
  Say a value is empty rather than presenting the empty value as the answer.
- **`responseNote` means the SDK does not type it.** Inspect the actual payload and describe
  what you found; do not invent a structure.

Report what the response actually contains. If a field you expected is missing, say so — do
not fill the gap from general knowledge.

## Params

Pass the sections `describeOperation` shows, usually some of:

```
{ path: { pageId: "..." }, query: { site: "...", language: "en" }, body: { ... } }
```

- `sitecoreContextId` is added automatically. Do not pass it.
- Host-bridge keys (`host.user`, `site.context`, `pages.reloadCanvas`) take **no params** —
  call them with the key and kind alone. The exception is `mutation pages.context`, which
  opens a page in the Pages editor and takes `{ itemId, language }` directly (no path/query/body).
- If a call fails, re-read `describeOperation` before retrying. Do not guess a second shape.

## Safety

- **Confirm before any destructive mutation.** Deleting sites, collections, hosts, languages
  or versions cannot be undone from here. Say exactly what will be deleted and wait.
- Agent API writes are recorded as jobs. If one goes wrong, `xmc.agent.jobsListOperations`
  then `xmc.agent.jobsRevertJob` can roll it back — offer that.
- Deprecated keys report `useInstead`. Follow it. The whole `xmc.xmapp.*` namespace is
  superseded by `xmc.sites.*` and `xmc.pages.*`.
- Reading is free; writing is not. Prefer a query to confirm state before mutating.

## Finding the ids you need

Most operations want a `siteId`, `pageId` or `site` name that the user will not give you:

- Current page and site, when running inside the Pages editor: `getCurrentPageContext` and
  `getCurrentSiteContext`.
- All sites: `xmc.sites.listSites`.
- A page by name or text: `xmc.agent.pagesSearchSite` (needs the site) or `xmc.pages.search`.
- A page from a public URL: `xmc.agent.pagesGetPagePathByLiveUrl`.
