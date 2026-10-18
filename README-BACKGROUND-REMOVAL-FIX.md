# Transparent PNG bypass for growth-character uploads

This update preserves the free local IMG.LY background-removal fallback while allowing an already-transparent PNG (for example, one prepared manually in ChatGPT) to skip local AI inference.

## Changes
- Checks that an image has actual transparent pixels; an alpha channel alone is not enough.
- If real transparency is present, skips IMG.LY inference and validates transparency before saving.
- If the image is not already transparent, the existing IMG.LY local-removal path remains in place. That path may still be terminated by memory limits on the current Render instance.
- Preserves the existing temporary-file/atomic replacement flow and OzVault backup scheduling.
- Preserves the OzVault child-process `OZVAULT_API_URL` mapping to the configured API origin.
- No secrets or new environment variables are required.

## Deployment notes
1. Back up the currently deployed source before replacing files.
2. Review the included `index.js` against the current GitHub source before deployment; do not overwrite newer unrelated project changes without merging them.
3. Run `node --check index.js` and test with a PNG that has actual transparent pixels.
4. Confirm the progress message changes to `Transparent PNG detected` and the character saves successfully.
5. Confirm Discord readiness and OzVault backups in Render logs.

A PNG with a white background or an alpha channel whose pixels are all opaque will not bypass the model. The image must contain real transparent pixels.
