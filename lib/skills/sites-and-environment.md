---
name: Sites and environment
description: Sites, collections, hosts, languages, jobs and sitemap configuration.
when_to_use: The user asks about site setup, hosts, languages, collections, background jobs, or wants to create/rename/delete a site.
---

# Sites and environment

Almost everything here is `xmc.sites.*`. The old `xmc.xmapp.*` equivalents are deprecated —
if a search surfaces one, use the `useInstead` key.

## Reading

| Goal | Operation |
|---|---|
| All sites | `xmc.sites.listSites` |
| One site's configuration | `xmc.agent.sitesGetSiteDetails` |
| Which site an item belongs to | `xmc.agent.sitesGetSiteIdFromItem` |
| Collections | `xmc.sites.listCollections`, `retrieveCollection`, `listCollectionSites` |
| Hosts | `xmc.sites.listHosts`, `retrieveHost`, `getRenderingHosts`, `getEditingHosts` |
| Languages in the environment | `xmc.sites.listLanguages` |
| Languages XM Cloud supports | `xmc.sites.listSupportedLanguages` |
| Pages per locale | `xmc.sites.retrieveLocalizationStatistics` |
| Pages per workflow state | `xmc.sites.retrieveWorkflowStatistics` |
| Sitemap configuration | `xmc.sites.retrieveSitemapConfiguration` |
| Background jobs | `xmc.sites.listJobs`, `retrieveJob` |
| Site templates | `xmc.sites.listSiteTemplates` |

## Writing — treat all of these as destructive

Site, collection, host and language management are all `xmc.sites.*` mutations:
`createSite`, `updateSite`, `renameSite`, `copySite`, `deleteSite`, `sortSites`,
`uploadSiteThumbnail`, and the matching `*Collection`, `*Host` and `*Language` operations.

**Confirm with the user before every one of them.** Deleting a site removes its pages,
media, data sources, presentation and page designs for everyone in the environment, and
nothing here can undo it.

Before creating or renaming, check the name is acceptable with
`xmc.sites.validateSiteName` or `validateCollectionName` — it is cheaper than a failed
mutation and reports exactly which rule the name breaks.

## Bulk reads

When you need data about many pages at once, `xmc.sites.aggregatePageData` takes an array of
`{ id, language }` and returns page and component data in one call. Use it instead of looping
over individual page reads. `xmc.sites.aggregateLivePageVariants` does the same for active
personalization variants.
