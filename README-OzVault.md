# RoleLogic Manager — OzVault encrypted storage update

This update keeps the existing `index.js` features and adds encrypted backup/restore through the official OzVault CLI.

## Render environment variables

Keep these as Render secrets; do not commit them:

- `OZVAULT_API_KEY` — scoped API key with `objects:read` and `objects:write` permissions for this bucket.
- `OZVAULT_BUCKET_ID` — existing OzVault bucket ID.
- `OZVAULT_RECOVERY_KEY` — the OzVault vault/recovery key used to encrypt/decrypt objects. The code also accepts `OZVAULT_VAULT_KEY` as a fallback.
- `OZVAULT_API_ORIGIN` — optional; defaults to `https://api.ozvault.lol`.
- `OZVAULT_BACKUP_KEEP` — optional, default 7 (allowed range 2–30).
- `OZVAULT_BACKUP_INTERVAL_MS` — optional, default 600000 (10 minutes; minimum 60000).

The `postinstall` script downloads OzVault CLI v0.1.0 from the official OzVault host and checks its published SHA-256 before saving it as `ozvault.mjs`. It does not fail the overall install if OzVault is temporarily unreachable, so the bot can still run locally; the storage health endpoint will expose backup status.

## What is backed up

- `data/tiktok-connections.json`
- `data/tiktok-snapshots.json`
- `data/growth-milestones.json`
- `data/growth-characters/` (packed into an encrypted archive for backup)

Backups run at startup, after JSON changes (debounced by 30 seconds), on a schedule, and on graceful shutdown. The CLI's `backup` command retains a rotating set of versions. On startup, a missing JSON file is restored from its newest backup before the app creates empty defaults. Character images are restored only when the character directory is empty. Existing local files are not overwritten during startup recovery.

## Verification

After deployment, check `https://YOUR-RENDER-URL/health/ozvault`. `storage: connected` means API-key bucket access worked; `encryptedBackup: success` and `lastBackupAt` indicate a successful CLI backup. Confirm the objects are visible in the existing OzVault bucket dashboard. First upload is not claimed until the CLI command succeeds.

The backup CLI uses OzVault's documented encryption format; do not replace it with custom AES code. Keep the recovery key in a secure password manager/offline backup. If it is lost, encrypted backups may be unrecoverable.
