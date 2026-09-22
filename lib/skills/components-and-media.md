---
name: Components and media
description: Placing components on pages, wiring datasources, and working with media assets.
when_to_use: The user asks to add or change a component on a page, work with datasources, or search/upload media.
---

# Components and media

## Components

| Goal | Operation |
|---|---|
| Components available to a site | `xmc.agent.componentsListComponents` |
| One component's config and datasource template | `xmc.agent.componentsGetComponent` |
| What is on a page now | `xmc.agent.pagesGetComponentsOnPage` |
| What is allowed in a placeholder | `xmc.agent.pagesGetAllowedComponentsByPlaceholder` |
| Add a component to a placeholder | `xmc.agent.pagesAddComponentOnPage` (mutation) |
| Point a component at a datasource | `xmc.agent.pagesSetComponentDatasource` (mutation) |

### Adding a component — the order matters

1. `pagesGetPage` or `pagesGetComponentsOnPage` to see the placeholders that exist.
2. `pagesGetAllowedComponentsByPlaceholder` for the target placeholder. Do not skip this —
   adding a disallowed component either fails or produces a page that will not render.
3. `pagesAddComponentOnPage`.
4. Give it content: either reuse an existing datasource
   (`xmc.agent.componentsSearchComponentDatasources`) or create one
   (`xmc.agent.componentsCreateComponentDatasource`), then `pagesSetComponentDatasource`.
5. `pages.reloadCanvas` if the user is in the Pages editor.

Prefer reusing a datasource over creating a near-duplicate — orphaned datasources are a
common source of content clutter.

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
