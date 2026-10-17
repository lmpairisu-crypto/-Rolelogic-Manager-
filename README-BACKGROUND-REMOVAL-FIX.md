# Free local growth-character background removal fix

This update keeps the existing Discord bot features and OzVault backup/restore code, and adjusts `/growthcharacter set` to reduce inference memory use.

## Changes
- Keeps the free local `@imgly/background-removal-node` model; no paid API key is required.
- Resizes the image to a maximum 512 x 512 before AI inference to reduce memory use on small hosted instances.
- Logs the prepared input dimensions and size, in addition to model download/inference progress.
- Avoids calling `deferReply()` again if the growth-character interaction was already acknowledged.
- Keeps the existing saved character until processing and writing the replacement succeed.

## Deployment
1. Replace the repository files with the contents of this ZIP, or at minimum replace `index.js` and `package.json` and remove the old `package-lock.json`.
2. Set the Render build command to `npm install` (not `npm ci`, because this ZIP intentionally omits the old stale lockfile that did not include the IMG.LY dependency).
3. Keep the existing environment variables unchanged.
4. Deploy, then test `/growthcharacter set` with a small image first.
5. In Render logs, look for `[GrowthCharacter][IMG.LY] Input prepared`, model progress, and a completion/error message.

The 512px resize is a memory-reduction measure, not a guarantee. If the host still terminates inference with `Killed`, the service may need more available memory or a different inference approach. Keep your existing OzVault backup/restore settings; this patch does not change them.
