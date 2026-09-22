---
name: Pages and content
description: Read and edit pages, content items and their fields — the operations to use and the order to call them in.
when_to_use: The user asks to look at, create, update or delete a page, content item or field value.
---

# Pages and content

## Reading

| Goal | Operation |
|---|---|
| Page layout, placeholders, workflow state | `xmc.agent.pagesGetPage` |
| All routes in a site | `xmc.agent.sitesGetAllPagesBySite` |
| Search pages in a site | `xmc.agent.pagesSearchSite` |
| Search pages or folders across roots | `xmc.pages.search` |
| Rendered HTML | `xmc.agent.pagesGetPageHtml` |
| Screenshot of the live page | `xmc.agent.pagesGetPageScreenshot` |
| Preview URL | `xmc.agent.pagesGetPagePreviewUrl` |
| Content item by id / path | `xmc.agent.contentGetContentItemById` / `...ByPath` |
| Page template and its fields | `xmc.agent.pagesGetPageTemplateById` |
| Children / ancestors / hierarchy | `xmc.sites.listPageChildren`, `listPageAncestors`, `retrievePageHierarchy` |

To read one field value, fetch the item and pick the field out — there is no single-field
operation.

## Writing

| Goal | Operation | Kind |
|---|---|---|
| Create a page | `xmc.agent.pagesCreatePage` | mutation |
| Create a content item | `xmc.agent.contentCreateContentItem` | mutation |
| Update field values | `xmc.agent.contentUpdateContent` | mutation |
| Delete | `xmc.agent.contentDeleteContent` | mutation |
| Add a language version | `xmc.agent.pagesAddLanguageToPage` | mutation |
| New page version | `xmc.pages.addPageVersion` | mutation |
| Rename / duplicate | `xmc.pages.renamePage` / `duplicatePage` | mutation |
| Save layout or fields | `xmc.pages.saveLayout` / `saveFields` | mutation |
| Translate a page / whole site | `xmc.pages.translatePage` / `xmc.sites.translateSite` | mutation |

## Order of work

1. Establish *which* page. In the Pages editor use `getCurrentPageContext`; otherwise search.
2. Read the current state before changing it, so you can describe what you are about to do.
3. For a risky edit, create a version first (`xmc.pages.addPageVersion`) so there is a way back.
4. Make the change, then confirm it by reading the item again rather than assuming success.
5. If the user is in the Pages editor, call `pages.reloadCanvas` so they see the change.

## Gotchas

- `xmc.pages.*` operations generally need a `site` name in the query, not just a page id.
- `xmc.pages.addPageVersion` names the version `versionName`, not `name`.
- Deleting a page goes through `contentDeleteContent`; it defaults to the recycle bin, and
  permanent deletion is a separate flag. Confirm with the user either way.
