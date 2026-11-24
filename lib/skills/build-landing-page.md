---
name: Build a landing page
description: Create (or reuse) a page and fill it with real content and components in as few calls as possible, with the exact request shapes inline.
when_to_use: The user asks to create a landing page, a page about a topic, or to add components and content to a new page.
---

# Build a landing page

The request shapes below are exact, so invoke them directly — no searchOperations or
describeOperation needed. `sitecoreContextId` is added for you.

## 1. Find the site and check for an existing page (one call)

`invokeQueries` with:

| Read | key | params |
|---|---|---|
| Pages in the site | `xmc.agent.sitesGetAllPagesBySite` | `{ path: { siteName }, query: { language } }` |
| Search by topic | `xmc.agent.pagesSearchSite` | `{ query: { search_query, site_name, language } }` |
| Components for the site | `xmc.agent.componentsListComponents` | `{ query: { site_name } }` |

Get the site name and language from `getCurrentSiteContext` / `getCurrentPageContext` first.

**If a page with that name already exists, stop and ask** whether to update it or create a
new one under a different name. Do not silently edit an existing page.

## 2. Pick the template and parent

The parent is usually Home; take its id from the `sitesGetAllPagesBySite` result. Read it with
`xmc.agent.pagesGetPage` — `{ path: { pageId: parentId }, query: { language } }` — whose
`insertOptions` lists the templates allowed under it; pick the landing page one (or reuse the
`templateId` of an existing landing page, also from `pagesGetPage`). Read the template's
fields with `xmc.agent.pagesGetPageTemplateById` — `{ query: { templateId } }` — so field names
are exact.

## 3. Create the page, then set its fields

```
mutation xmc.agent.pagesCreatePage
{ body: { templateId, name, parentId, language } }          -> { itemId, name }

mutation xmc.agent.contentUpdateContent
{ path: { itemId }, body: { fields: { Title: "...", Content: "<p>...</p>" }, language, siteName } }
```

Set fields with `contentUpdateContent` rather than `fields` on create — its shape is a plain
`{ FieldName: value }` object. Field names are case-sensitive; use the template's names.

## 4. Add visible content, not only the requested component

A landing page needs content a visitor can read. Unless the user said otherwise, add:

1. A heading or hero (if the page template's Title is not rendered by the layout).
2. A Rich Text component with an introduction and key points, as clean HTML.
3. The component the user asked for.

Before adding, check the placeholder allows each component — one call per placeholder:
`xmc.agent.pagesGetAllowedComponentsByPlaceholder` with
`{ path: { pageId, placeholderName: "headless-main" }, query: { language } }`.
Read a component's datasource field names with `xmc.agent.componentsGetComponent` —
`{ path: { componentId } }` → `datasourceFields`. Batch these reads with `invokeQueries`.

Then add each component with **`mutation buckley.pages.addComponentWithContent`** through
`invokeOperation` — one call per component, params passed directly:

```
{ pageId, language, componentRenderingId, placeholderPath: "headless-main",
  componentItemName: "Community Solar Intro", fields: { text: "<p>...</p>" },
  position?: "first" | "last" | "before" | "after", relativeTo?: instanceId, site?: siteName }
```

It names the datasource uniquely, stores the field values, checks they saved, and can place
the component (`position: "first"`, or `"before"`/`"after"` with `relativeTo`; `site` is
required then). Add them in reading order, or use `position` so the result reads top to bottom.

## 5. Quotes and other components that reference page content

A Quote must quote text **a visitor can see on the page** — for example a sentence from the
Rich Text you just added. Do not quote a hidden field such as a meta description or summary
that the layout does not render.

## 6. Check and show

- Read `warnings` from each `buckley.pages.addComponentWithContent` result. An existing
  component with empty content is reported there — ask the user whether to fill or remove it.
- The canvas reloads automatically when the page is open in the Pages editor, and creating the
  page opens it in the editor (the create result's `editor` field says so). To open a page
  yourself, invoke `mutation pages.context` with `{ itemId: pageId, language }`.
- Never paste a preview URL into chat: it contains the editing host's secret.
