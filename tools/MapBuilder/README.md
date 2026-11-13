# CSSBC Remote Map Builder

The workflow is at `.github/workflows/map-builder.yml`.

## Dispatch
1. Open **Actions → CSSBC Map Builder → Run workflow**.
2. Select `sdk-foundation`, enter `CSSBC_ModernDistrict`, and run.
3. Open the workflow run and inspect its log / artifact.

## Important limitation (current)
GitHub-hosted Windows runners do **not** include Valve Source SDK VBSP/VVIS/VRAD by default. This workflow deliberately fails rather than fabricate a BSP if VBSP is absent. The SDK toolchain must be provisioned on the runner before a real compile can succeed. The artifact is only uploaded if a BSP was actually generated.

## Local fallback
`Build-CSSBC-Map.ps1` uses a locally installed CS:S/Source SDK toolchain.
