---
name: Components and media
description: Placing, reordering and filling components on pages, wiring datasources, and working with media assets.
when_to_use: The user asks to add, move or change a component on a page, work with datasources, or search/upload media.
---

# Components and media

## Components

| Goal | How |
|---|---|
| Components available to a site | `xmc.agent.componentsListComponents` — `{ query: { site_name } }` |
| One component's config and datasource fields | `xmc.agent.componentsGetComponent` — `{ path: { componentId } }` |
| What is on a page now | `xmc.agent.pagesGetComponentsOnPage` — `{ path: { pageId }, query: { language } }` |
| What is allowed in a placeholder | `xmc.agent.pagesGetAllowedComponentsByPlaceholder` — `{ path: { pageId, placeholderName }, query: { language } }` |
| **Add a component with its content** | **`addComponentWithContent` tool** |
| **Reorder, or move to another placeholder** | **`moveComponent` tool** |
| Point a component at an existing datasource | `xmc.agent.pagesSetComponentDatasource` — `{ path: { pageId, componentId }, body: { datasourceId, language } }` |
| Find reusable datasources | `xmc.agent.componentsSearchComponentDatasources` — `{ path: { componentId }, query: { term } }` |

These shapes are exact; invoke them without describing first. Batch the reads with
`invokeQueries`.

### Adding a component

1. `pagesGetAllowedComponentsByPlaceholder` for the target placeholder, and
   `componentsGetComponent` for the datasource field names — together, in one `invokeQueries`.
   Do not skip the placeholder check: a disallowed component fails or will not render.
2. `addComponentWithContent` with the field values. In one call it:
   - picks a datasource name that is not taken (no "name already used" retries),
   - creates the datasource inline and checks every field you set was stored,
   - places it with `position` (`first`, or `before`/`after` + `relativeTo`); omit to append,
   - warns about existing components on the page whose datasource is empty,
   - reloads the canvas if that page is open.
3. Act on its `warnings`. Report an empty existing component to the user rather than
   leaving it.

Do **not** create datasources with `xmc.agent.componentsCreateComponentDatasource` for a
page component: it often fails with "could not resolve parent location" because the location
depends on the page. Inline creation through `addComponentWithContent` avoids that.

To reuse an existing datasource instead, add the component with `xmc.agent.pagesAddComponentOnPage`
— `{ path: { pageId }, body: { componentRenderingId, placeholderPath, componentItemName, language } }`
— then `pagesSetComponentDatasource` with the `componentId` it returns. Prefer reuse over a
near-duplicate — orphaned datasources clutter content.

### Reordering and removing

- `moveComponent` moves a component by its `id` from `pagesGetComponentsOnPage`. Do not call
  `xmc.pages.saveLayout` by hand — the layout must be sent as a JSON string with the page
  revision, and getting that wrong takes several attempts.
- There is no remove-component operation in the SDK. To clear a block, ask the user whether
  to empty its datasource or remove it in the Pages editor.

## Media

| Goal | Operation |
|---|---|
| Search the media library | `xmc.agent.assetsSearchAssets` |
| Asset metadata and usage | `xmc.agent.assetsGetAssetInformation` |
| Upload | `xmc.agent.assetsUploadAsset` (mutation) |
| Update metadata, e.g. alt text | `xmc.agent.assetsUpdateAsset` (mutation) |

Search before uploading — re-uploading an image that already exists creates duplicates that
editors then have to choose between. When uploading, set meaningful alt text; if the user
has not provided any, ask rather than inventing a description of an image you cannot see.
