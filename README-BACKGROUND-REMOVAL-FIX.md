Transparent PNG Upload for Growth Characters

This update allows members to upload manually prepared transparent PNG images for their Solo Growth characters.

Changes

- Checks that the uploaded image is a PNG.
- Verifies that the image contains actual transparent pixels; an alpha channel alone is not enough.
- Rejects images with white backgrounds or fully opaque pixels.
- Preserves the existing character if the uploaded image fails transparency validation or cannot be saved successfully.
- Resizes valid character images to fit within 900 × 900 pixels while preserving transparency.
- Uses temporary-file processing and atomic replacement to protect existing character files.
- Schedules OzVault backups after a successful character save.
- Preserves the public Discord success announcement, including the saved character PNG attachment.

Background Removal

Background removal must be completed manually before uploading. Use an image editor or another tool to remove the background and export the image as a transparent PNG.

The bot does not automatically remove image backgrounds. IMG.LY background-removal inference is not used by this version.

Deployment and Testing

1. Back up the currently deployed "index.js".
2. Compare the update with the current GitHub source to avoid overwriting unrelated changes.
3. Run "node --check index.js".
4. Test "/growthcharacter set" with a PNG containing actual transparent pixels.
5. Confirm that an image with an opaque background is rejected and the existing character remains unchanged.
6. Confirm that the public success message includes the saved PNG attachment.
7. Check Render logs for Discord readiness and successful OzVault backups.

No new environment variables or secrets are required.
