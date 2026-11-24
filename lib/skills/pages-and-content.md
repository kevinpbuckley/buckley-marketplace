---
name: Pages and content
description: Read and edit pages, content items and their fields — the operations to use and the order to call them in.
when_to_use: The user asks to look at, create, update or delete a page, content item or field value.
---

# Pages and content

## Reading

| Goal | Operation | params |
|---|---|---|
| Page template id and insert options | `xmc.agent.pagesGetPage` | `{ path: { pageId }, query: { language } }` |
| All routes in a site | `xmc.agent.sitesGetAllPagesBySite` | `{ path: { siteName }, query: { language } }` |
| Search pages in a site | `xmc.agent.pagesSearchSite` | `{ query: { search_query, site_name, language } }` |
| Search pages or folders across roots | `xmc.pages.search` | describe first |
| Rendered HTML | `xmc.agent.pagesGetPageHtml` | `{ path: { pageId }, query: { language } }` |
| Screenshot of the live page | `xmc.agent.pagesGetPageScreenshot` | describe first |
| Content item by id | `xmc.agent.contentGetContentItemById` | `{ path: { itemId }, query: { language } }` |
| Content item by path | `xmc.agent.contentGetContentItemByPath` | describe first |
| Page template and its fields | `xmc.agent.pagesGetPageTemplateById` | `{ query: { templateId } }` |
| Children / ancestors / hierarchy | `xmc.sites.listPageChildren`, `listPageAncestors`, `retrievePageHierarchy` | describe first |

Shapes given here are exact — invoke them without describing. Put independent reads in one
`invokeQueries` call. To read one field value, fetch the item and pick the field out — there
is no single-field operation.

## Writing

| Goal | Operation | Kind |
|---|---|---|
| Create a page | `xmc.agent.pagesCreatePage` — `{ body: { templateId, name, parentId, language } }` | mutation |
| Create a content item | `xmc.agent.contentCreateContentItem` | mutation |
| Update field values | `xmc.agent.contentUpdateContent` — `{ path: { itemId }, body: { fields: { Name: value }, language } }` | mutation |
| Delete | `xmc.agent.contentDeleteContent` | mutation |
| Add a language version | `xmc.agent.pagesAddLanguageToPage` | mutation |
| New page version | `xmc.pages.addPageVersion` | mutation |
| Rename / duplicate | `xmc.pages.renamePage` / `duplicatePage` | mutation |
| Reorder or move components | `moveComponent` tool — not `xmc.pages.saveLayout` | — |
| Save fields | `xmc.pages.saveFields` | mutation |
| Translate a page / whole site | `xmc.pages.translatePage` / `xmc.sites.translateSite` | mutation |

## Opening a page

To show a page in the Pages editor, invoke `mutation pages.context` with
`{ itemId: pageId, language }` — the params go directly, not under path/query/body. Do not
paste the result of `xmc.agent.pagesGetPagePreviewUrl` into chat: the URL carries the editing
host's secret.

## Order of work

1. Establish *which* page. In the Pages editor use `getCurrentPageContext`; otherwise search.
2. Read the current state before changing it, so you can describe what you are about to do.
3. For a risky edit, create a version first (`xmc.pages.addPageVersion`) so there is a way back.
4. Make the change, then confirm it by reading the item again rather than assuming success.
5. If the user is in the Pages editor, call `pages.reloadCanvas` so they see the change
   (`moveComponent` and `addComponentWithContent` do this for you).

## Gotchas

- `xmc.pages.*` operations generally need a `site` name in the query, not just a page id.
- `xmc.pages.addPageVersion` names the version `versionName`, not `name`.
- Creating a page whose name already exists under the parent fails. Ask the user whether to
  update the existing page or pick another name — do not switch to editing it silently.
- Set page fields with `contentUpdateContent` after creating the page; the `fields` array on
  `pagesCreatePage` is untyped.
- Deleting a page goes through `contentDeleteContent`; it defaults to the recycle bin, and
  permanent deletion is a separate flag. Confirm with the user either way.
