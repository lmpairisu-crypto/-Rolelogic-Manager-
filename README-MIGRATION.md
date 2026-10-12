# RoleLogic Manager — targeted cleanup

## Changes in this update
- Removed the second set of duplicated Discord diagnostic event listeners.
- Kept one Discord login call and the existing Ready listener.
- Updated TikTok OAuth callback role assignment to process roles in order: TikTok, Lampoon, Content Creator.
- Followers is removed only after Content Creator is confirmed present.
- Role logs are emitted only after a role change succeeds; failures include the Discord error or permission/hierarchy explanation.
- `BASE_URL` remains environment-configurable for the future OzVault public URL. It intentionally keeps the existing Render fallback until an actual OzVault app URL exists.

## Before deploying
Set `BASE_URL` to the real public HTTPS URL once OzVault hosting is configured. Update the TikTok Developer Portal redirect URI to:
`YOUR_PUBLIC_BASE_URL/tiktok/callback`

Keep all secrets in environment variables. Do not commit `.env`, Discord tokens, TikTok client secrets, or refresh/access tokens.

## Required role environment variables
- `TIKTOK_ROLE_ID`
- `LAMPOON_ROLE_ID`
- `CONTENT_CREATOR_ROLE_ID`
- `FOLLOWERS_ROLE_ID`
- Optional `LOG_CHANNEL_ID` for role-change logs

The bot needs Manage Roles, and its highest role must be above every role it manages.
