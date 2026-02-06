# 🎯 CRITICAL DISCOVERY: Sitecore Pages API

**Date:** February 5, 2026  
**Discovered By:** Agent analysis of https://api-docs.sitecore.com/sai/pages-api/pages

---

## Executive Summary

**The solution to our workflow and publishing automation needs ALREADY EXISTS** - Sitecore provides a comprehensive **Pages API** that is **NOT currently integrated** into the Marketplace SDK!

### Key Finding

- **Pages API Endpoint**: `https://xmapps-api.sitecorecloud.io/api/v1/pages`
- **Documentation**: https://api-docs.sitecore.com/sai/pages-api/pages
- **Authentication**: Same JWT-based auth as XM Apps API
- **Status**: Publicly documented, production-ready REST API
- **Overlap**: Uses the **SAME base URL** as XM Apps API but different resource paths

### Current vs. Available

| Feature | Marketplace SDK (XM Apps API) | Pages API | Status |
|---------|-------------------------------|-----------|--------|
| **Get Content** | ✅ `xmc.agent.contentGetContent` | ✅ `GET /api/v1/pages/{pageId}` | Overlapping |
| **Update Fields** | ✅ `xmc.agent.contentUpdateContent` | ✅ `PATCH /api/v1/pages/{pageId}` | Overlapping |
| **Delete Page** | ❌ Not available | ✅ `DELETE /api/v1/pages/{pageId}` | **Missing** |
| **Workflow Commands** | ❌ Read-only | ✅ `workflow.commands` array | **CRITICAL** |
| **Publishing Status** | ❌ Not available | ✅ `publishing` object | **CRITICAL** |
| **Create Version** | ❌ Not available | ✅ `POST /api/v1/pages/{pageId}/versions` | **Missing** |
| **List Versions** | ❌ Not available | ✅ `GET /api/v1/pages/{pageId}/versions` | **Missing** |
| **Page Search** | ❌ Not available | ✅ `GET /api/v1/pages/search` | **Missing** |
| **Insert Options** | ❌ Not available | ✅ `GET /api/v1/pages/{pageId}/insertoptions` | **Missing** |
| **Create Page** | ✅ `xmc.agent.pagesCreatePage` | ✅ `POST /api/v1/pages` | Overlapping |
| **Create from Blueprint** | ❌ Not available | ✅ `POST /api/v1/pages/blueprint` | **Missing** |
| **Check Edge Publication** | ❌ Not available | ✅ `GET /api/v1/pages/{pageId}/live` | **Missing** |
| **Update Layouts** | ❌ Not available | ✅ Layout fields in response | **Missing** |

---

## 🔍 Detailed Analysis

### 1. Workflow Capabilities

#### What We Learned
The `GET /api/v1/pages/{pageId}` response includes:

```json
{
  "workflow": {
    "id": "77ac7ce9-803a-42e3-bb05-f79fca73cbce",
    "displayName": "Page Workflow",
    "finalState": true,
    "canEdit": true,
    "warnings": [...],
    "icon": "Applications/32x32/document_heart.png",
    "commands": [...]  // <--- THIS IS THE KEY!
  }
}
```

**The `commands` array contains EXECUTABLE workflow commands!**

This means the Pages API provides:
- ✅ List of available workflow commands for current state
- ✅ Likely has an endpoint to execute those commands (need to explore further)
- ✅ Workflow warnings and validation

**Action Needed**: Investigate the workflow command execution endpoint (likely `POST /api/v1/pages/{pageId}/workflow/command` or similar)

---

### 2. Publishing Capabilities

The Pages API returns rich publishing information:

```json
{
  "publishing": {
    "isPublishable": true,
    "hasPublishableVersion": true,
    "isAvailableToPublish": true,
    "validFromDate": "2023-10-01T00:00:00Z",
    "validToDate": "2023-12-31T23:59:59Z"
  }
}
```

Plus a dedicated endpoint:
- `GET /api/v1/pages/{pageId}/live` - Check if page is published to Edge

**This completely solves our publishing visibility needs!**

---

### 3. Version Management

The Pages API provides:

- `GET /api/v1/pages/{pageId}/versions` - List all versions of a page
- `POST /api/v1/pages/{pageId}/versions` - Create a new version

**Response includes:**
```json
{
  "versionName": "Black Friday content update",
  "revision": "f7d29433-001e-4a35-a744-876759dba468",
  "version": 1,
  "isLatestPublishableVersion": true
}
```

---

### 4. Page Search

```
GET /api/v1/pages/search
```

**This addresses the "Advanced Search" feature request** - allows querying pages across the system.

---

### 5. Additional Operations

From the documentation, there are **11+ more operations** including:

- `GET /api/v1/pages/{pageId}/state` - Get detailed page state
- `GET /api/v1/pages/{pageId}/insertoptions` - Get available templates for child pages
- `POST /api/v1/pages/blueprint` - Create page from blueprint/template
- Layout management (shared/final layouts returned in page responses)
- Permissions and locking information

---

## 🚀 Recommendation: Integrate Pages API into Marketplace SDK

### Option 1: Extend XMC Module (Recommended)

Add Pages API operations to the existing `@sitecore-marketplace-sdk/xmc` package:

```typescript
// Existing pattern
client.query("xmc.agent.contentGetContent", ...)
client.query("xmc.xmapp.sitesGetSitesList", ...)

// New Pages API operations
client.query("xmc.pages.getPage", { params: { path: { pageId }, query: { site, language } }})
client.query("xmc.pages.search", { params: { query: { searchTerm, site } }})
client.query("xmc.pages.getVersions", { params: { path: { pageId } }})
client.query("xmc.pages.checkEdgePublication", { params: { path: { pageId }, query: { language } }})

client.mutate("xmc.pages.updateFields", { params: { path: { pageId }, body: { fields } }})
client.mutate("xmc.pages.createVersion", { params: { path: { pageId }, body: { versionName } }})
client.mutate("xmc.pages.executeWorkflowCommand", { params: { path: { pageId }, body: { commandId } }})
client.mutate("xmc.pages.deletePage", { params: { path: { pageId }, body: { permanently } }})
```

**Benefits:**
- Consistent API surface
- Type-safe operations
- Auto-generated from OpenAPI spec
- JWT auth already configured

---

### Option 2: Separate Package

Create `@sitecore-marketplace-sdk/pages` as a standalone module.

**Benefits:**
- Clear separation of concerns
- Can version independently
- Smaller bundle size for apps that don't need Pages API

**Drawbacks:**
- Duplication of auth logic
- More packages to maintain

---

## 📋 Implementation Checklist

### Phase 1: Discovery & Schema
- [ ] Download the Pages API OpenAPI schema (https://api-docs.sitecore.com/_spec/sai/pages-api/index.yaml)
- [ ] Analyze all available endpoints (currently only seeing subset)
- [ ] Identify workflow command execution endpoint
- [ ] Map overlapping operations between Agent API and Pages API

### Phase 2: SDK Integration
- [ ] Generate TypeScript types from OpenAPI schema
- [ ] Create `xmc.pages.*` namespace in SDK
- [ ] Implement authentication (reuse existing JWT logic)
- [ ] Write unit tests for each operation

### Phase 3: Agent Tools
- [ ] Create tools for workflow command execution
- [ ] Create tools for publishing status checks
- [ ] Create tools for version management
- [ ] Create tools for page search
- [ ] Update TOOL_DESIGN_DOCUMENT.md with new tools

### Phase 4: Testing & Documentation
- [ ] Test against live XM Cloud environment
- [ ] Document migration path from direct Agent API usage
- [ ] Update agent system prompts with new capabilities
- [ ] Create example workflows (approve content, publish page, etc.)

---

## 🎯 Immediate Next Steps

1. **Download the full Pages API OpenAPI spec** to see ALL available operations
2. **Test the workflow commands** - call `GET /api/v1/pages/{pageId}` and examine the `commands` array structure
3. **Find the workflow execution endpoint** - likely a POST operation we haven't seen yet
4. **Prototype a direct HTTP call** to test workflow/publishing operations before SDK integration
5. **Update FEATURE_REQUESTS.md** to reference this Pages API integration as the solution

---

## 💡 Questions for Sitecore Team

1. Is there a reason the Pages API is not integrated into the Marketplace SDK?
2. Are there any differences in authentication/permissions between XM Apps API and Pages API?
3. Is there additional documentation beyond the public API docs?
4. What's the recommended approach for apps using both Agent API and Pages API?
5. Are there rate limits or usage considerations for the Pages API?

---

## 📚 References

- **Pages API Docs**: https://api-docs.sitecore.com/sai/pages-api/pages
- **OpenAPI Spec**: https://api-docs.sitecore.com/_spec/sai/pages-api/index.yaml
- **XM Cloud Developer Docs**: https://doc.sitecore.com/xmc/en/developers/xm-cloud/getting-started-with-xm-cloud.html
- **Current SDK Docs**: https://doc.sitecore.com/mp/en/developers/sdk/0/sitecore-marketplace-sdk/developer-guides.html

---

## Conclusion

**This changes everything.** The capabilities we've been requesting in FEATURE_REQUESTS.md **already exist** in the Pages API. 

The solution is not to request new features from Sitecore - **it's to integrate the existing Pages API into the Marketplace SDK.**

This should be **Priority 0** - integrating this API unlocks all the workflow, publishing, and advanced content management capabilities we need for authoring automation.
