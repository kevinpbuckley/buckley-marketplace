# Marketplace SDK Feature Requests

This document tracks missing capabilities in the Sitecore Marketplace SDK that would significantly enhance authoring automation and content management workflows.

**Last Updated:** February 5, 2026  
**SDK Version:** Client SDK + Agent API (current)

---

## Priority 1: Content Workflow Operations

### Current State
- ✅ **Can READ** workflow state via `ContentItemResponse.workflow.workflowState`
- ✅ Returns `displayName` and `final` boolean
- ❌ **CANNOT EXECUTE** any workflow commands

### Missing Capabilities

#### 1.1 Execute Workflow Command
**API:** `xmc.agent.workflowExecuteCommand` (proposed)

**Use Case:** Move items through approval workflows programmatically

**Proposed Request:**
```typescript
{
  itemId: string;
  workflowCommandId: string;  // e.g., Submit, Approve, Reject
  language?: string;
  comments?: string;
}
```

**Proposed Response:**
```typescript
{
  success: boolean;
  newWorkflowState: {
    displayName: string;
    stateId: string;
    final: boolean;
  };
  message?: string;
}
```

**Benefits:**
- Automate content approval processes
- Bulk workflow operations
- Integration with external approval systems
- Scheduled content releases

---

#### 1.2 List Available Workflow Commands
**API:** `xmc.agent.workflowListAvailableCommands` (proposed)

**Use Case:** Discover what workflow actions are available for an item in its current state

**Proposed Request:**
```typescript
{
  itemId: string;
  language?: string;
}
```

**Proposed Response:**
```typescript
{
  currentState: {
    displayName: string;
    stateId: string;
    final: boolean;
  };
  availableCommands: [{
    commandId: string;
    displayName: string;
    nextStateId: string;
    nextStateDisplayName: string;
  }];
}
```

---

#### 1.3 Get Workflow History
**API:** `xmc.agent.workflowGetHistory` (proposed)

**Use Case:** Audit trail of workflow changes

**Proposed Response:**
```typescript
{
  history: [{
    timestamp: string;
    user: string;
    fromState: string;
    toState: string;
    command: string;
    comments?: string;
  }];
}
```

---

## Priority 2: Publishing Operations

### Current State
- ✅ Can check if page is live: `xmc.xmapp.getLivePageState`
- ❌ **CANNOT PUBLISH** or unpublish items

### Missing Capabilities

#### 2.1 Publish Item
**API:** `xmc.agent.publishItem` (proposed)

**Use Case:** Publish content to delivery endpoints

**Proposed Request:**
```typescript
{
  itemId: string;
  language?: string | string[];  // Specific languages or all
  publishChildren?: boolean;
  publishRelatedItems?: boolean;
  targets?: string[];  // Publishing targets (web, preview, etc.)
}
```

**Proposed Response:**
```typescript
{
  success: boolean;
  jobId: string;  // For long-running publishes
  publishedItems: number;
  targets: string[];
}
```

---

#### 2.2 Unpublish Item
**API:** `xmc.agent.unpublishItem` (proposed)

**Use Case:** Remove content from live site

**Proposed Request:**
```typescript
{
  itemId: string;
  language?: string | string[];
  targets?: string[];
}
```

---

#### 2.3 Schedule Publishing
**API:** `xmc.agent.schedulePublish` (proposed)

**Use Case:** Schedule content go-live dates

**Proposed Request:**
```typescript
{
  itemId: string;
  publishDateTime: string;  // ISO format
  unpublishDateTime?: string;
  language?: string;
}
```

---

## Priority 3: Language Translation & Version Management

### Current State
- ✅ Can create empty language version: `xmc.agent.pagesAddLanguageToPage`
- ❌ **CANNOT COPY** field values between languages
- ❌ **NO TRANSLATION** workflow integration

### Missing Capabilities

#### 3.1 Copy Language Version
**API:** `xmc.agent.languageCopyVersion` (proposed)

**Use Case:** Create translations by copying existing language content

**Proposed Request:**
```typescript
{
  itemId: string;
  sourceLanguage: string;
  targetLanguage: string;
  fieldsToExclude?: string[];  // Don't copy certain fields
}
```

**Proposed Response:**
```typescript
{
  success: boolean;
  targetLanguage: string;
  copiedFields: string[];
  version: number;
}
```

**Benefits:**
- Faster translation workflows
- Ensure consistency across languages
- Pre-populate translation-ready content

---

#### 3.2 Get Translation Status
**API:** `xmc.agent.languageGetTranslationStatus` (proposed)

**Use Case:** Track which content is translated, outdated, or missing

**Proposed Response:**
```typescript
{
  sourceLanguage: string;
  languages: [{
    language: string;
    status: 'missing' | 'outdated' | 'current';
    lastModified?: string;
    sourceLastModified?: string;
  }];
}
```

---

## Priority 4: Link & Reference Field Helpers

### Current State
- ✅ Can read link fields as raw values (GUIDs)
- ❌ **NO HELPERS** for resolving or validating links

### Missing Capabilities

#### 4.1 Resolve Link Fields
**API:** `xmc.agent.linksResolveReferences` (proposed)

**Use Case:** Expand link/reference fields in a single call instead of manual resolution

**Proposed Request:**
```typescript
{
  itemId: string;
  fields?: string[];  // Specific fields or all link fields
  language?: string;
  depth?: number;  // How many levels to expand
}
```

**Proposed Response:**
```typescript
{
  itemId: string;
  resolvedLinks: {
    [fieldName: string]: {
      type: 'internal' | 'external' | 'media' | 'multilist';
      rawValue: string;
      resolvedItems?: [{
        itemId: string;
        name: string;
        path: string;
        url?: string;
        exists: boolean;
      }];
    };
  };
}
```

**Benefits:**
- Single API call instead of N+1 queries
- Validate links before publishing
- Rich preview data for editors

---

#### 4.2 Find Broken Links
**API:** `xmc.agent.linksFindBroken` (proposed)

**Use Case:** Audit content health

**Proposed Request:**
```typescript
{
  rootItemId?: string;  // Check specific tree or entire site
  siteId?: string;
  includeExternal?: boolean;
}
```

**Proposed Response:**
```typescript
{
  brokenLinks: [{
    itemId: string;
    itemPath: string;
    fieldName: string;
    targetId: string;
    linkType: 'internal' | 'external' | 'media';
    reason: 'deleted' | 'no-access' | 'http-error' | 'invalid-format';
  }];
  totalChecked: number;
  totalBroken: number;
}
```

---

#### 4.3 Get Referrers (Backlinks)
**API:** `xmc.agent.linksGetReferrers` (proposed)

**Use Case:** Find all items that link TO a given item

**Proposed Request:**
```typescript
{
  itemId: string;
  language?: string;
}
```

**Proposed Response:**
```typescript
{
  referrers: [{
    itemId: string;
    itemPath: string;
    fieldName: string;
    templateName: string;
  }];
  totalCount: number;
}
```

**Benefits:**
- Impact analysis before deleting items
- Content reuse insights
- Compliance tracking

---

## Priority 5: Batch Operations

### Current State
- ❌ All operations are single-item focused

### Missing Capabilities

#### 5.1 Batch Update
**API:** `xmc.agent.contentBatchUpdate` (proposed)

**Use Case:** Update multiple items efficiently

**Proposed Request:**
```typescript
{
  items: [{
    itemId: string;
    language?: string;
    fields: { [key: string]: unknown };
  }];
}
```

---

#### 5.2 Batch Workflow Execute
**API:** `xmc.agent.workflowBatchExecute` (proposed)

**Use Case:** Approve/submit multiple items at once

**Proposed Request:**
```typescript
{
  items: [{
    itemId: string;
    workflowCommandId: string;
    language?: string;
  }];
}
```

---

## Priority 6: Advanced Search & Filtering

### Current State
- ✅ Basic page search: `xmc.agent.pagesSearchSite`
- ✅ Component datasource search: `xmc.agent.componentsSearchComponentDatasources`
- ❌ Limited filtering options

### Missing Capabilities

#### 6.1 Advanced Content Query
**API:** `xmc.agent.contentAdvancedQuery` (proposed)

**Use Case:** Complex content queries with multiple filters

**Proposed Request:**
```typescript
{
  templateId?: string;
  parentPath?: string;
  workflowStateId?: string;
  language?: string;
  fields?: {
    [fieldName: string]: {
      operator: 'equals' | 'contains' | 'startsWith' | 'isEmpty';
      value: unknown;
    };
  };
  modifiedAfter?: string;
  modifiedBefore?: string;
  limit?: number;
  offset?: number;
}
```

---

## Priority 7: Version Control Operations

### Current State
- ✅ Can see version number in `ContentItemResponse.version`
- ❌ **CANNOT** manage versions

### Missing Capabilities

#### 7.1 List Item Versions
**API:** `xmc.agent.versionsListVersions` (proposed)

**Use Case:** See version history

**Proposed Response:**
```typescript
{
  versions: [{
    version: number;
    language: string;
    createdBy: string;
    createdDate: string;
    workflowState?: string;
  }];
}
```

---

#### 7.2 Remove Old Versions
**API:** `xmc.agent.versionsRemoveOldVersions` (proposed)

**Use Case:** Database cleanup, performance optimization

**Proposed Request:**
```typescript
{
  itemId: string;
  language: string;
  keepLatestN?: number;  // Keep last N versions
  olderThan?: string;    // Remove versions older than date
}
```

---

## Implementation Notes

### Authentication & Permissions
All new APIs should:
- Respect Sitecore security model
- Return appropriate 401/403 errors
- Include user context in audit logs

### Job-Based Operations
Long-running operations (publishing, batch updates) should:
- Return immediately with job ID
- Allow progress tracking via existing `xmc.xmapp.retrieveJob`
- Support cancellation via `xmc.agent.jobsCancel` (new)

### Backwards Compatibility
- All new APIs are additions, no breaking changes
- Existing read operations remain unchanged
- Field formats (especially rich text as HTML) should remain consistent

---

## Summary

**Total Missing Feature Areas:** 7  
**Highest Priority:** Workflow execution and publishing  
**Quick Wins:** Link resolution, copy language version  
**Complex Features:** Advanced search, batch operations

These features would transform the SDK from a **read-mostly** tool into a **full authoring automation** platform, enabling:
- CI/CD content pipelines
- Automated quality assurance
- Bulk content management
- Integration with external systems
- Content governance enforcement
