# CWF Compliance Portal - Deployment Toolkit v2.2

## Centralized HQ-Admin Model

This toolkit automates the full SharePoint and Azure AD provisioning for the CWF (DoD 8140 Cyber Workforce) Compliance Portal hybrid architecture. All scripts are driven by a single configuration file that defines your MSC, installations, directorates, and group structure.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│  TIER 3: HQ Admin (Canvas App + Dataverse)           │
│  TACOM G-6 HQ — 9 Premium Licenses                  │
│  Makes ALL compliance decisions                       │
├──────────────────────────────────────────────────────┤
│  TIER 2: Installation G-6 (SharePoint Elevated)      │
│  RRAD G-6, ANAD G-6, WVA G-6, etc. — G3/G5         │
│  Full visibility, flags issues, coordinates locally   │
├──────────────────────────────────────────────────────┤
│  TIER 1: Directorate Consumers (SharePoint Standard) │
│  G-2, G-3, Maint Div, etc. — G3/G5                  │
│  Submit certs, training, SAAR; view own status        │
└──────────────────────────────────────────────────────┘
```

## Prerequisites

### Required PowerShell Modules

```powershell
# PnP PowerShell (SharePoint provisioning)
Install-Module PnP.PowerShell -Scope CurrentUser

# Azure AD (group creation) — pick ONE:
Install-Module AzureAD -Scope CurrentUser
# OR
Install-Module Microsoft.Graph -Scope CurrentUser

# Dataverse (URL writeback) — optional, for Step 5
Install-Module Microsoft.Xrm.Data.Powershell -Scope CurrentUser
```

### Required Permissions

| Script | Role Required |
|--------|--------------|
| 01 - Azure AD Groups | Azure AD Groups Administrator (or Global Admin) |
| 02 - SharePoint Sites | SharePoint Administrator |
| 03 - List Schemas | SharePoint Admin (or Site Collection Admin on each site) |
| 04 - Permissions | SharePoint Admin + Site Collection Admin |
| 05 - Dataverse URLs | Dataverse System Administrator |

### Environment

- Microsoft 365 GCC or GCC High tenant
- SharePoint Online enabled
- Azure AD with security group creation enabled
- Dataverse environment provisioned (for Step 5)

---

## Quick Start

### 1. Configure

Edit `config/deployment-config.json` with your MSC-specific values:

- Update `MSC.TenantDomain` with your DoD tenant domain
- Update `MSC.AdminSiteUrl` with your SP admin URL
- Update `MSC.HubSiteUrl` with your desired Hub site URL
- Update installation and directorate entries to match your org
- Update UICs from your authoritative source (FMS/G-1)

### 2. Preview (Dry Run)

```powershell
cd scripts
.\Deploy-All.ps1 -ConfigPath ..\config\deployment-config.json -WhatIf
```

This shows everything the toolkit would create without making any changes.

### 3. Execute

```powershell
# Full deployment
.\Deploy-All.ps1 -ConfigPath ..\config\deployment-config.json

# Or run individual steps
.\Deploy-All.ps1 -ConfigPath ..\config\deployment-config.json -Step 1  # AD groups only
.\Deploy-All.ps1 -ConfigPath ..\config\deployment-config.json -Step 2  # Sites only
.\Deploy-All.ps1 -ConfigPath ..\config\deployment-config.json -Step 3  # Lists only
.\Deploy-All.ps1 -ConfigPath ..\config\deployment-config.json -Step 4  # Permissions only
.\Deploy-All.ps1 -ConfigPath ..\config\deployment-config.json -Step 5  # DV URLs only

# Resume from a specific step (if a step failed)
.\Deploy-All.ps1 -ConfigPath ..\config\deployment-config.json -StartStep 3
```

---

## File Structure

```
cwf-toolkit/
├── README.md                              # This file
├── config/
│   ├── deployment-config.json             # MSC configuration (edit this)
│   └── hierarchy-template.csv             # Org hierarchy for Dataverse import
├── scripts/
│   ├── Deploy-All.ps1                     # Master orchestrator
│   ├── 01-Create-AzureADGroups.ps1        # Azure AD security groups + nesting
│   ├── 02-Create-SharePointSites.ps1      # Site creation + Hub association
│   ├── 03-Deploy-ListSchemas.ps1          # List columns, views, indexing
│   ├── 04-Configure-Permissions.ps1       # Break inheritance + assign groups
│   └── 05-Write-SiteURLs-ToDataverse.ps1  # Update DV org records with SP URLs
└── templates/
    └── (reserved for PnP XML templates)
```

---

## What Gets Created

### Azure AD Security Groups

| Category | Groups | Example |
|----------|--------|---------|
| HQ Admin (Premium) | 6 | SG-TACOM-CWF-ADMIN, SG-TACOM-CWF-ISSM, SG-TACOM-CWF-HQALL |
| Installation G-6 | 7 | SG-TACOM-CWF-RRAD-G6, SG-TACOM-CWF-ALLINSTG6 |
| Directorate Consumer | ~3 per dir | SG-TACOM-CWF-RRAD-MAINT-Personnel |
| SAAR Approver | 1 per non-G6 dir | SG-TACOM-CWF-RRAD-MAINT-SAARAprv |

### SharePoint Sites

| Level | Count | Example |
|-------|-------|---------|
| MSC Hub | 1 | TACOM-CWF-HUB |
| Installation Hubs | 6 | TACOM-CWF-RRAD, TACOM-CWF-ANAD |
| Directorate Sites | ~20 | TACOM-CWF-RRAD-MAINT, TACOM-CWF-DTA-G2 |

### SharePoint Lists (per site type)

| List | MSC Hub | Install Hub | Dir Site |
|------|---------|-------------|----------|
| CWF_Personnel | — | — | ✓ |
| CWF_MyCertifications | — | — | ✓ |
| CWF_TrainingRecords | — | — | ✓ |
| CWF_SAARRequests | — | — | ✓ |
| CWF_MyWorkRoles | — | — | ✓ |
| CWF_ComplianceStatus | ✓ rollup | ✓ rollup | ✓ local |
| CWF_ComplianceFlags | ✓ view | ✓ submit | — |
| CWF_WaiverRequests | ✓ view | ✓ submit | — |
| CWF_EnforcementActions | ✓ master | ✓ read-only | — |
| CWF_ComplianceWaivers | ✓ master | ✓ read-only | — |
| CWF_WorkRoles (ref) | ✓ master | — | — |
| CWF_Certifications (ref) | ✓ master | — | — |
| CWF_Organizations (ref) | ✓ master | — | — |
| SyncErrorLog | ✓ only | — | — |
| CWF_Documents | — | — | ✓ |

### Permission Model

| Role | MSC Hub | Install Hub | Own Dir Site | Other Dir Sites |
|------|---------|-------------|--------------|-----------------|
| HQ Admin | Full Control | Full Control | Full Control | Full Control |
| HQ ISSM | Edit | Full Control | Full Control | Full Control |
| Install G-6 | Read | Full Control | Full Control | Full Control |
| Dir Coordinator | — | Read | Edit | — |
| Dir Personnel | — | — | Contribute | — |

---

## Adapting for Another MSC

To deploy for CECOM, AMCOM, or any other AMC MSC:

1. Copy `deployment-config.json`
2. Replace all TACOM-specific values with the new MSC
3. Update installations and directorates
4. Update UICs
5. Run `Deploy-All.ps1` with the new config

The scripts are fully parameterized — no code changes needed.

---

## Post-Deployment Steps

After running the toolkit, complete these manual steps:

1. **Import CWF Dataverse Managed Solution** into the target environment
2. **Load hierarchy CSV** (`hierarchy-template.csv`) into `cwf_Organization` table
3. **Assign Dataverse security roles** to the 9 HQ premium-licensed users
4. **Configure Power Automate flows** — import from managed solution, update connections
5. **Create Canvas App Hub page** — add Power Apps web part, audience target to SG-TACOM-CWF-HQALL
6. **Populate Azure AD groups** with actual personnel
7. **Run UAT checklist** from Build Guide v2.2 Section 9

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| PnP module not found | `Install-Module PnP.PowerShell -Scope CurrentUser` |
| Access denied on site creation | Ensure you have SharePoint Admin role |
| Azure AD group creation fails | Ensure Groups Administrator role |
| Site already exists | Script skips existing sites — safe to re-run |
| List already exists | Script skips existing lists — safe to re-run |
| GCC High connectivity | Use `-Environment USGovernmentHigh` parameter on Connect-PnPOnline |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.2 | 2026-03-18 | Centralized HQ-Admin model; 5-script deployment pipeline; config-driven; full list schemas with views and indexing |
