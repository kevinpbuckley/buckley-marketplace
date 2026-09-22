---
name: Calling SDK operations
description: How to find, inspect and safely run any of the 189 Sitecore SDK operations.
when_to_use: Any task needing Sitecore data or changes. Read this before your first invokeOperation call.
---

# Calling SDK operations

You have four tools and the whole SDK behind them. Nearly every task is the same three steps.

## The loop

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
   | `host`, `site`, `pages`, `application` | context from the Marketplace host |

2. **`describeOperation`** on the key. This returns the exact params type — required versus
   optional, and the shape of any request body. **Never skip it.** Guessed parameter names
   fail, and the failure often looks like a permissions error rather than a bad request.

3. **`invokeOperation`** with `key`, `kind` (`query` reads, `mutation` writes) and `params`
   shaped exactly as step 2 described.

## Reading what comes back

`describeOperation` reports `returns` and `responseShape` alongside the params. Read it before
you call, and you will know what you are getting instead of guessing at it afterwards.

Things that regularly catch people out:

- **`invokeOperation` returns `{ key, kind, result }`.** The payload is under `result`.
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
  call them with the key and kind alone.
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
