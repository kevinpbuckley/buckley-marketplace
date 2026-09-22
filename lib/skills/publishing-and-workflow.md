---
name: Publishing and workflow
description: Checking whether a page is live, reading workflow state, and undoing changes.
when_to_use: The user asks whether something is published, why a change is not visible, about workflow states, or wants to undo a change.
---

# Publishing and workflow

## Is it live?

`xmc.pages.getLivePageState` says whether a page is published to Edge.

"My change is not showing" is usually one of:

1. **Not published.** `getLivePageState` says inactive.
2. **Published, but an older version.** Compare `xmc.pages.retrievePageVersions` against what
   is live — the latest version is not necessarily the published one.
3. **Not in a final workflow state.** Publishing silently skips items that have not reached a
   publishable state. Check `xmc.agent.pagesGetPage`, which returns workflow state.
4. **Looking at the wrong place.** `xmc.preview.graphql` reads unpublished content and
   `xmc.live.graphql` reads what is actually published. Querying both is the fastest way to
   prove where the difference is.

Work through those in order rather than guessing.

## Workflow

`xmc.agent.pagesGetPage` returns a page's current workflow state and the commands available
to the author. `xmc.sites.retrieveWorkflowStatistics` gives counts per state for a whole site.

**You cannot execute a workflow transition.** No SDK operation performs one — the Agent API
exposes workflow as read-only. Say so plainly and point the user at the Workbox; do not
attempt a mutation for it.

## Undoing a change

Agent API writes are recorded as jobs:

1. `xmc.sites.listJobs` or `xmc.agent.jobsGetJob` to find the job.
2. `xmc.agent.jobsListOperations` to see exactly what it did.
3. `xmc.agent.jobsRevertJob` to roll it back.

Show the user the operation list before reverting, so they can confirm it is the right job.
This only covers Agent API writes — direct `xmc.sites.*` and `xmc.pages.*` mutations are not
job-tracked and cannot be reverted this way.
