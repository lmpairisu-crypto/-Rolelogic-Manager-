require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");

// ============================================================
// CONFIG
// ============================================================

const PORT = Number(process.env.PORT || 10000);

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

const BASE_URL = String(
  process.env.BASE_URL || ""
).replace(/\/+$/, "");

const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

const GUILD_ID = process.env.GUILD_ID;

const TIKTOK_ROLE_ID = process.env.TIKTOK_ROLE_ID;
const LAMPOON_ROLE_ID = process.env.LAMPOON_ROLE_ID;
const CONTENT_CREATOR_ROLE_ID =
  process.env.CONTENT_CREATOR_ROLE_ID;
const FOLLOWERS_ROLE_ID = process.env.FOLLOWERS_ROLE_ID;

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

const LMP_TAG_CHANNEL_ID =
  process.env.LMP_TAG_CHANNEL_ID || "1539643480714903602";

// ============================================================
// ELIGIBILITY REQUIREMENTS
// ============================================================

const MIN_FOLLOWERS = 300;
const MIN_FOLLOWING = 50;
const MIN_LIKES = 1000;
const MIN_VIDEOS = 15;

// There are NO maximum limits.

// ============================================================
// EXPRESS SERVER
// ============================================================

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>LAMPOON Role Manager</title>
  <style>
    body {
      background:#090909;
      color:#f5d76e;
      font-family:Arial,sans-serif;
      text-align:center;
      padding:60px 20px;
    }

    .box {
      max-width:700px;
      margin:auto;
      padding:35px;
      border:1px solid #d4af37;
      border-radius:18px;
      background:#111;
      box-shadow:0 0 25px rgba(212,175,55,.15);
    }

    h1 {
      letter-spacing:5px;
      margin-bottom:8px;
    }

    p {
      color:#ddd;
      line-height:1.6;
    }

    .gold {
      color:#d4af37;
      font-weight:bold;
    }
  </style>
</head>
<body>
  <div class="box">
    <h1>LAMPOON</h1>
    <div class="gold">ROLE MANAGER</div>

    <p>
      LAMPOON Discord × TikTok verification system.
    </p>

    <p>
      Use Discord to start the TikTok verification process.
    </p>

    <p>
      <span class="gold">Status:</span> Online
    </p>
  </div>
</body>
</html>
  `);
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ============================================================
// DATABASE
// ============================================================

const db = new Database("lampoon.sqlite");

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS tiktok_connections (
    discord_user_id TEXT PRIMARY KEY,
    guild_id TEXT,
    tiktok_open_id TEXT,
    tiktok_username TEXT,
    display_name TEXT,
    bio TEXT,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at INTEGER,
    updated_at INTEGER
  )
`);

// ============================================================
// DISCORD CLIENT
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// ============================================================
// BASIC VALIDATION
// ============================================================

console.log("==============================================");
console.log("        LAMPOON ROLE MANAGER");
console.log("==============================================");

function checkConfig() {
  const required = {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    TIKTOK_CLIENT_KEY,
    TIKTOK_CLIENT_SECRET,
    BASE_URL,
    GUILD_ID,
    TIKTOK_ROLE_ID,
    LAMPOON_ROLE_ID,
    CONTENT_CREATOR_ROLE_ID,
    FOLLOWERS_ROLE_ID,
    LOG_CHANNEL_ID,
  };

  let valid = true;

  for (const [name, value] of Object.entries(required)) {
    if (value) {
      console.log(`${name}: ✅ SET`);
    } else {
      console.log(`${name}: ❌ MISSING`);
      valid = false;
    }
  }

  console.log(`LMP_TAG_CHANNEL_ID: ${LMP_TAG_CHANNEL_ID ? "✅ SET" : "❌ MISSING"}`);
  console.log("==============================================");

  if (!valid) {
    console.error(
      "❌ One or more required environment variables are missing."
    );
    process.exit(1);
  }
}

checkConfig();

// ============================================================
// HELPERS
// ============================================================

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function containsLMP(value) {
  return normalizeText(value).includes("lmp");
}

function validBio(bio) {
  const text = normalizeText(bio);

  return (
    text.includes("lmp members") ||
    text.includes("lampoon creator")
  );
}

function meetsRequirements(stats) {
  return (
    Number(stats.followers) >= MIN_FOLLOWERS &&
    Number(stats.following) >= MIN_FOLLOWING &&
    Number(stats.likes) >= MIN_LIKES &&
    Number(stats.videos) >= MIN_VIDEOS
  );
}

function formatNumber(number) {
  return Number(number || 0).toLocaleString("en-US");
}

function createState(userId, guildId) {
  const payload = `${userId}:${guildId}:${Date.now()}`;

  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");

  return Buffer.from(
    JSON.stringify({
      userId,
      guildId,
      timestamp: Date.now(),
      signature,
    })
  ).toString("base64url");
}

function verifyState(state) {
  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    );

    if (
      !decoded.userId ||
      !decoded.guildId ||
      !decoded.timestamp ||
      !decoded.signature
    ) {
      return null;
    }

    const payload =
      `${decoded.userId}:${decoded.guildId}:${decoded.timestamp}`;

    const expected = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(decoded.signature),
        Buffer.from(expected)
      )
    ) {
      return null;
    }

    // State expires after 15 minutes.
    if (Date.now() - Number(decoded.timestamp) > 15 * 60 * 1000) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

// ============================================================
// TIKTOK OAUTH
// ============================================================

function getTikTokAuthorizationUrl(userId, guildId) {
  const state = createState(userId, guildId);

  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    response_type: "code",
    scope: "user.info.basic,user.info.profile,user.info.stats",
    redirect_uri: `${BASE_URL}/tiktok/callback`,
    state,
  });

  return (
    "https://www.tiktok.com/v2/auth/authorize/?" +
    params.toString()
  );
}

// ============================================================
// TIKTOK TOKEN
// ============================================================

async function exchangeCodeForToken(code) {
  const body = new URLSearchParams();

  body.append("client_key", TIKTOK_CLIENT_KEY);
  body.append("client_secret", TIKTOK_CLIENT_SECRET);
  body.append("code", code);
  body.append("grant_type", "authorization_code");
  body.append(
    "redirect_uri",
    `${BASE_URL}/tiktok/callback`
  );

  const response = await fetch(
    "https://open.tiktokapis.com/v2/oauth/token/",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("TikTok token error:", data);
    throw new Error(
      data.error_description ||
        data.error ||
        "TikTok token request failed."
    );
  }

  return data;
}

// ============================================================
// TIKTOK USER INFO
// ============================================================

async function getTikTokUserInfo(accessToken) {
  const fields = [
    "open_id",
    "union_id",
    "avatar_url",
    "display_name",
    "username",
    "bio_description",
    "follower_count",
    "following_count",
    "likes_count",
    "video_count",
  ].join(",");

  const url =
    "https://open.tiktokapis.com/v2/user/info/?" +
    new URLSearchParams({
      fields,
    }).toString();

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("TikTok user info error:", data);
    throw new Error(
      data.error?.message ||
        "Unable to retrieve TikTok profile."
    );
  }

  if (!data.data || !data.data.user) {
    throw new Error(
      "TikTok did not return user information."
    );
  }

  return data.data.user;
}

// ============================================================
// DISCORD ROLE HELPERS
// ============================================================

async function getGuild() {
  const guild =
    client.guilds.cache.get(GUILD_ID) ||
    await client.guilds.fetch(GUILD_ID);

  return guild;
}

async function getMember(userId) {
  const guild = await getGuild();

  try {
    return await guild.members.fetch(userId);
  } catch {
    return null;
  }
}

function getRole(guild, roleId) {
  return guild.roles.cache.get(roleId) || null;
}

async function checkRolePermissions(guild) {
  const me =
    guild.members.me ||
    await guild.members.fetchMe();

  if (!me.permissions.has("ManageRoles")) {
    throw new Error(
      "The bot needs the Manage Roles permission."
    );
  }

  const roles = [
    ["TikTok", TIKTOK_ROLE_ID],
    ["Lampoon", LAMPOON_ROLE_ID],
    ["Content Creator", CONTENT_CREATOR_ROLE_ID],
    ["Followers", FOLLOWERS_ROLE_ID],
  ];

  for (const [name, id] of roles) {
    const role = getRole(guild, id);

    if (!role) {
      throw new Error(
        `Discord role "${name}" was not found.`
      );
    }

    if (role.position >= me.roles.highest.position) {
      throw new Error(
        `The bot cannot manage "${name}". Move the bot role above it.`
      );
    }
  }

  return me;
}

// ============================================================
// LAMPOON MEMBER BANNER
// ============================================================

function createLampoonBanner({
  displayName,
  username,
  followers,
  avatarUrl,
}) {
  const safeDisplay = escapeXml(
    String(displayName || "LAMPOON MEMBER").slice(0, 35)
  );

  const safeUsername = escapeXml(
    String(username || "unknown").slice(0, 30)
  );

  const followerText = escapeXml(
    `${formatNumber(followers)} Followers`
  );

  const avatar = avatarUrl
    ? escapeXml(avatarUrl)
    : "";

  const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="1200"
  height="420"
  viewBox="0 0 1200 420"
>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#080808"/>
      <stop offset="55%" stop-color="#17130a"/>
      <stop offset="100%" stop-color="#050505"/>
    </linearGradient>

    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8f6b18"/>
      <stop offset="35%" stop-color="#d4af37"/>
      <stop offset="65%" stop-color="#f1d77b"/>
      <stop offset="100%" stop-color="#a77c20"/>
    </linearGradient>
  </defs>

  <rect
    width="1200"
    height="420"
    rx="28"
    fill="url(#bg)"
  />

  <rect
    x="5"
    y="5"
    width="1190"
    height="410"
    rx="24"
    fill="none"
    stroke="url(#gold)"
    stroke-width="5"
  />

  <line
    x1="70"
    y1="130"
    x2="1130"
    y2="130"
    stroke="#d4af37"
    stroke-opacity=".55"
    stroke-width="2"
  />

  <text
    x="600"
    y="82"
    text-anchor="middle"
    fill="url(#gold)"
    font-family="Arial, Helvetica, sans-serif"
    font-size="58"
    font-weight="900"
    letter-spacing="12"
  >
    LAMPOON
  </text>

  <text
    x="600"
    y="112"
    text-anchor="middle"
    fill="#ddd"
    font-family="Arial, Helvetica, sans-serif"
    font-size="17"
    letter-spacing="5"
  >
    LAMPOON MEMBERS
  </text>

  ${
    avatar
      ? `
  <clipPath id="avatarClip">
    <circle cx="170" cy="260" r="82"/>
  </clipPath>

  <circle
    cx="170"
    cy="260"
    r="89"
    fill="#0c0c0c"
    stroke="#d4af37"
    stroke-width="5"
  />

  <image
    href="${avatar}"
    x="88"
    y="178"
    width="164"
    height="164"
    preserveAspectRatio="xMidYMid slice"
    clip-path="url(#avatarClip)"
  />
  `
      : `
  <circle
    cx="170"
    cy="260"
    r="82"
    fill="#151515"
    stroke="#d4af37"
    stroke-width="5"
  />
  `
  }

  <text
    x="310"
    y="222"
    fill="#f3f3f3"
    font-family="Arial, Helvetica, sans-serif"
    font-size="34"
    font-weight="700"
  >
    ${safeDisplay}
  </text>

  <text
    x="310"
    y="267"
    fill="#d4af37"
    font-family="Arial, Helvetica, sans-serif"
    font-size="25"
  >
    TikTok: @${safeUsername}
  </text>

  <text
    x="310"
    y="310"
    fill="#ffffff"
    font-family="Arial, Helvetica, sans-serif"
    font-size="25"
  >
    ${followerText}
  </text>

  <text
    x="310"
    y="365"
    fill="#888"
    font-family="Arial, Helvetica, sans-serif"
    font-size="16"
    letter-spacing="2"
  >
    VERIFIED LAMPOON CREATOR
  </text>
</svg>
`;

  return Buffer.from(svg);
}

// ============================================================
// LOG EMBED
// ============================================================

async function sendIntegrationLog({
  member,
  tiktok,
  addedRoles,
  removedRoles,
}) {
  try {
    const guild = member.guild;

    const logChannel =
      guild.channels.cache.get(LOG_CHANNEL_ID) ||
      await guild.channels.fetch(LOG_CHANNEL_ID);

    if (!logChannel || !logChannel.isTextBased()) {
      console.error("❌ Integration log channel not found.");
      return;
    }

    const addedMentions =
      addedRoles.length > 0
        ? addedRoles.map((role) => role.toString()).join(" ")
        : "None";

    const removedNames =
      removedRoles.length > 0
        ? removedRoles.map((role) => role.name).join(", ")
        : "None";

    const banner = createLampoonBanner({
      displayName:
        member.displayName ||
        member.user.username,
      username:
        tiktok.username ||
        tiktok.display_name ||
        "unknown",
      followers: tiktok.follower_count,
      avatarUrl:
        member.displayAvatarURL({
          extension: "png",
          size: 256,
        }),
    });

    const attachment = new AttachmentBuilder(
      banner,
      {
        name: "lampoon-member.png",
      }
    );

    const embed = new EmbedBuilder()
      .setColor("#D4AF37")
      .setAuthor({
        name: "lmp • lampoon",
      })
      .setTitle("🔗 LAMPOON PROFILE")
      .setDescription(
        [
          `<a:Avisala:1542448826265243660> Avisala, ${member}!`,
          "",
          `${member.displayName} is now officially recognized as a **𝗟𝗔𝗠𝗣𝗢𝗢𝗡** member on ${guild.name}.`,
          "",
          "🏷️ **Member Role**",
          addedMentions,
          "",
          "🔄 **Previous Role**",
          removedNames,
          "",
          "📌 **LMP Tag**",
          `Check out <#${LMP_TAG_CHANNEL_ID}> to request your nickname with the LMP tag.`,
          "",
          "🎵 **TikTok Profile**",
          `Username: **@${tiktok.username || "Unknown"}**`,
          `Display Name: **${tiktok.display_name || "Unknown"}**`,
          `Followers: **${formatNumber(tiktok.follower_count)}**`,
          `Following: **${formatNumber(tiktok.following_count)}**`,
          `Likes: **${formatNumber(tiktok.likes_count)}**`,
          `Videos: **${formatNumber(tiktok.video_count)}**`,
          "",
          `📅 **Updated:** <t:${Math.floor(Date.now() / 1000)}:D>`,
          `⏰ **Time:** <t:${Math.floor(Date.now() / 1000)}:T>`,
        ].join("\n")
      )
      .setImage("attachment://lampoon-member.png")
      .setFooter({
        text:
          "🎭 𝗟𝗔𝗠𝗣𝗢𝗢𝗡 HOK Satire Creator Clan | Est. 2026",
      })
      .setTimestamp();

    await logChannel.send({
      content:
        addedRoles.length > 0
          ? addedRoles.map((role) => role.toString()).join(" ")
          : undefined,
      embeds: [embed],
      files: [attachment],
      allowedMentions: {
        roles: addedRoles.map((role) => role.id),
        users: [member.id],
      },
    });

    console.log(
      `📋 Integration log sent for ${member.user.tag}`
    );
  } catch (error) {
    console.error(
      "❌ Failed to send integration log:",
      error
    );
  }
}

// ============================================================
// APPLY LAMPOON ROLES
// ============================================================

async function applyLampoonRoles(member, tiktok) {
  const guild = member.guild;

  await checkRolePermissions(guild);

  const lampoonRole = getRole(
    guild,
    LAMPOON_ROLE_ID
  );

  const creatorRole = getRole(
    guild,
    CONTENT_CREATOR_ROLE_ID
  );

  const followersRole = getRole(
    guild,
    FOLLOWERS_ROLE_ID
  );

  const addedRoles = [];
  const removedRoles = [];

  // ----------------------------------------------------------
  // ADD LAMPOON
  // ----------------------------------------------------------

  if (!member.roles.cache.has(lampoonRole.id)) {
    await member.roles.add(
      lampoonRole,
      "LAMPOON TikTok eligibility verification"
    );

    addedRoles.push(lampoonRole);

    console.log(
      `➕ Added Lampoon to ${member.user.tag}`
    );
  }

  // ----------------------------------------------------------
  // ADD CONTENT CREATOR
  // ----------------------------------------------------------

  if (!member.roles.cache.has(creatorRole.id)) {
    await member.roles.add(
      creatorRole,
      "LAMPOON TikTok eligibility verification"
    );

    addedRoles.push(creatorRole);

    console.log(
      `➕ Added Content Creator to ${member.user.tag}`
    );
  }

  // ----------------------------------------------------------
  // REMOVE FOLLOWERS
  // ----------------------------------------------------------

  if (member.roles.cache.has(followersRole.id)) {
    await member.roles.remove(
      followersRole,
      "LAMPOON TikTok eligibility verification"
    );

    removedRoles.push(followersRole);

    console.log(
      `➖ Removed Followers from ${member.user.tag}`
    );
  }

  // ----------------------------------------------------------
  // LOG ONLY WHEN SOMETHING WAS ADDED
  // ----------------------------------------------------------

  if (addedRoles.length > 0) {
    await sendIntegrationLog({
      member,
      tiktok,
      addedRoles,
      removedRoles,
    });
  }

  return {
    addedRoles,
    removedRoles,
  };
}

// ============================================================
// SAVE TIKTOK CONNECTION
// ============================================================

function saveTikTokConnection({
  discordUserId,
  guildId,
  tokenData,
  tiktok,
}) {
  const expiresAt =
    Math.floor(Date.now() / 1000) +
    Number(tokenData.expires_in || 0);

  const statement = db.prepare(`
    INSERT INTO tiktok_connections (
      discord_user_id,
      guild_id,
      tiktok_open_id,
      tiktok_username,
      display_name,
      bio,
      follower_count,
      following_count,
      likes_count,
      video_count,
      access_token,
      refresh_token,
      token_expires_at,
      updated_at
    )
    VALUES (
      @discordUserId,
      @guildId,
      @openId,
      @username,
      @displayName,
      @bio,
      @followers,
      @following,
      @likes,
      @videos,
      @accessToken,
      @refreshToken,
      @expiresAt,
      @updatedAt
    )
    ON CONFLICT(discord_user_id)
    DO UPDATE SET
      guild_id = excluded.guild_id,
      tiktok_open_id = excluded.tiktok_open_id,
      tiktok_username = excluded.tiktok_username,
      display_name = excluded.display_name,
      bio = excluded.bio,
      follower_count = excluded.follower_count,
      following_count = excluded.following_count,
      likes_count = excluded.likes_count,
      video_count = excluded.video_count,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      token_expires_at = excluded.token_expires_at,
      updated_at = excluded.updated_at
  `);

  statement.run({
    discordUserId,
    guildId,
    openId: tiktok.open_id || "",
    username: tiktok.username || "",
    displayName: tiktok.display_name || "",
    bio: tiktok.bio_description || "",
    followers: Number(tiktok.follower_count || 0),
    following: Number(tiktok.following_count || 0),
    likes: Number(tiktok.likes_count || 0),
    videos: Number(tiktok.video_count || 0),
    accessToken: tokenData.access_token || "",
    refreshToken: tokenData.refresh_token || "",
    expiresAt,
    updatedAt: Date.now(),
  });
}

// ============================================================
// SUCCESS PAGE
// ============================================================

function successPage(tiktok, result) {
  const added =
    result.addedRoles.length > 0
      ? result.addedRoles
          .map((role) => escapeHtml(role.name))
          .join(", ")
      : "No new roles";

  const removed =
    result.removedRoles.length > 0
      ? result.removedRoles
          .map((role) => escapeHtml(role.name))
          .join(", ")
      : "None";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>LAMPOON Verified</title>
  <style>
    body {
      margin:0;
      background:#080808;
      color:#fff;
      font-family:Arial,sans-serif;
      text-align:center;
      padding:40px 20px;
    }

    .box {
      max-width:650px;
      margin:auto;
      background:#121212;
      border:2px solid #d4af37;
      border-radius:20px;
      padding:35px;
    }

    h1 {
      color:#d4af37;
      letter-spacing:5px;
    }

    .ok {
      font-size:50px;
    }

    .info {
      margin-top:25px;
      background:#1c1c1c;
      border-radius:12px;
      padding:20px;
      text-align:left;
      line-height:1.8;
    }

    .gold {
      color:#d4af37;
      font-weight:bold;
    }
  </style>
</head>

<body>
  <div class="box">
    <div class="ok">✅</div>

    <h1>LAMPOON</h1>

    <h2>TikTok Verification Complete</h2>

    <p>
      Your TikTok profile has been successfully checked.
    </p>

    <div class="info">
      <div>
        <span class="gold">TikTok:</span>
        @${escapeHtml(tiktok.username || "Unknown")}
      </div>

      <div>
        <span class="gold">Display Name:</span>
        ${escapeHtml(tiktok.display_name || "Unknown")}
      </div>

      <div>
        <span class="gold">Followers:</span>
        ${formatNumber(tiktok.follower_count)}
      </div>

      <div>
        <span class="gold">Following:</span>
        ${formatNumber(tiktok.following_count)}
      </div>

      <div>
        <span class="gold">Likes:</span>
        ${formatNumber(tiktok.likes_count)}
      </div>

      <div>
        <span class="gold">Videos:</span>
        ${formatNumber(tiktok.video_count)}
      </div>

      <hr>

      <div>
        <span class="gold">Added:</span>
        ${added}
      </div>

      <div>
        <span class="gold">Removed:</span>
        ${removed}
      </div>
    </div>

    <p style="margin-top:30px;color:#aaa">
      You can now return to Discord.
    </p>
  </div>
</body>
</html>
  `;
}

// ============================================================
// FAILURE PAGE
// ============================================================

function failurePage(title, message) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>LAMPOON Verification</title>
  <style>
    body {
      margin:0;
      background:#080808;
      color:white;
      font-family:Arial,sans-serif;
      text-align:center;
      padding:50px 20px;
    }

    .box {
      max-width:650px;
      margin:auto;
      background:#121212;
      border:2px solid #8f6b18;
      border-radius:20px;
      padding:35px;
    }

    h1 {
      color:#d4af37;
      letter-spacing:5px;
    }

    .error {
      font-size:50px;
    }

    .message {
      margin-top:25px;
      background:#1b1b1b;
      border-radius:12px;
      padding:20px;
      color:#ddd;
      line-height:1.7;
    }
  </style>
</head>

<body>
  <div class="box">
    <div class="error">❌</div>
    <h1>LAMPOON</h1>
    <h2>${escapeHtml(title)}</h2>

    <div class="message">
      ${escapeHtml(message)}
    </div>

    <p style="color:#888;margin-top:25px">
      Return to Discord and try again.
    </p>
  </div>
</body>
</html>
  `;
}

// ============================================================
// TIKTOK CONNECT ROUTE
// ============================================================

app.get("/tiktok/connect", async (req, res) => {
  try {
    const userId = String(req.query.user || "");
    const guildId = String(req.query.guild || "");

    if (!userId || !guildId) {
      return res
        .status(400)
        .send(
          failurePage(
            "Missing Discord Information",
            "The Discord user or server information is missing."
          )
        );
    }

    if (guildId !== GUILD_ID) {
      return res
        .status(403)
        .send(
          failurePage(
            "Invalid Server",
            "This verification link is not configured for this Discord server."
          )
        );
    }

    const member = await getMember(userId);

    if (!member) {
      return res
        .status(403)
        .send(
          failurePage(
            "Not a Server Member",
            "You must be a member of the LAMPOON Discord server before connecting TikTok."
          )
        );
    }

    if (!member.roles.cache.has(TIKTOK_ROLE_ID)) {
      return res
        .status(403)
        .send(
          failurePage(
            "TikTok Role Required",
            "You must have the TikTok role before starting this verification."
          )
        );
    }

    const url = getTikTokAuthorizationUrl(
      userId,
      guildId
    );

    return res.redirect(url);
  } catch (error) {
    console.error(
      "❌ TikTok connect error:",
      error
    );

    return res
      .status(500)
      .send(
        failurePage(
          "Connection Error",
          "Something went wrong while starting TikTok verification."
        )
      );
  }
});

// ============================================================
// TIKTOK CALLBACK
// ============================================================

app.get("/tiktok/callback", async (req, res) => {
  try {
    const {
      code,
      state,
      error,
      error_description,
    } = req.query;

    if (error) {
      return res
        .status(400)
        .send(
          failurePage(
            "TikTok Authorization Cancelled",
            error_description ||
              "TikTok authorization was cancelled."
          )
        );
    }

    if (!code || !state) {
      return res
        .status(400)
        .send(
          failurePage(
            "Invalid TikTok Response",
            "TikTok did not provide the required authorization information."
          )
        );
    }

    const stateData = verifyState(state);

    if (!stateData) {
      return res
        .status(400)
        .send(
          failurePage(
            "Expired Verification",
            "Your verification link has expired. Please start again from Discord."
          )
        );
    }

    const member = await getMember(
      stateData.userId
    );

    if (!member) {
      return res
        .status(403)
        .send(
          failurePage(
            "Not a Server Member",
            "You are no longer a member of the Discord server."
          )
        );
    }

    if (!member.roles.cache.has(TIKTOK_ROLE_ID)) {
      return res
        .status(403)
        .send(
          failurePage(
            "TikTok Role Required",
            "You must have the TikTok role before verification."
          )
        );
    }

    // --------------------------------------------------------
    // TOKEN
    // --------------------------------------------------------

    const tokenData =
      await exchangeCodeForToken(code);

    // --------------------------------------------------------
    // USER PROFILE
    // --------------------------------------------------------

    const tiktok =
      await getTikTokUserInfo(
        tokenData.access_token
      );

    console.log(
      `🎵 TikTok connected: @${tiktok.username || "unknown"}`
    );

    console.log(
      `📊 Followers: ${tiktok.follower_count || 0}`
    );

    // --------------------------------------------------------
    // SAVE CONNECTION
    // --------------------------------------------------------

    saveTikTokConnection({
      discordUserId: stateData.userId,
      guildId: stateData.guildId,
      tokenData,
      tiktok,
    });

    // --------------------------------------------------------
    // PROFILE NAME REQUIREMENT
    // --------------------------------------------------------

    const profileName =
      tiktok.display_name ||
      tiktok.username ||
      "";

    if (!containsLMP(profileName)) {
      return res
        .status(403)
        .send(
          failurePage(
            "LMP Requirement Not Met",
            "Your TikTok profile name must contain LMP."
          )
        );
    }

    // --------------------------------------------------------
    // BIO REQUIREMENT
    // --------------------------------------------------------

    if (!validBio(tiktok.bio_description)) {
      return res
        .status(403)
        .send(
          failurePage(
            "Bio Requirement Not Met",
            "Your TikTok bio must contain either \"LMP Members\" or \"Lampoon Creator\"."
          )
        );
    }

    // --------------------------------------------------------
    // STATS REQUIREMENT
    // --------------------------------------------------------

    const stats = {
      followers: Number(
        tiktok.follower_count || 0
      ),
      following: Number(
        tiktok.following_count || 0
      ),
      likes: Number(
        tiktok.likes_count || 0
      ),
      videos: Number(
        tiktok.video_count || 0
      ),
    };

    if (!meetsRequirements(stats)) {
      const missing = [];

      if (stats.followers < MIN_FOLLOWERS) {
        missing.push(
          `Followers: ${formatNumber(stats.followers)} / ${formatNumber(MIN_FOLLOWERS)}`
        );
      }

      if (stats.following < MIN_FOLLOWING) {
        missing.push(
          `Following: ${formatNumber(stats.following)} / ${formatNumber(MIN_FOLLOWING)}`
        );
      }

      if (stats.likes < MIN_LIKES) {
        missing.push(
          `Likes: ${formatNumber(stats.likes)} / ${formatNumber(MIN_LIKES)}`
        );
      }

      if (stats.videos < MIN_VIDEOS) {
        missing.push(
          `Videos: ${formatNumber(stats.videos)} / ${formatNumber(MIN_VIDEOS)}`
        );
      }

      return res
        .status(403)
        .send(
          failurePage(
            "Requirements Not Met",
            `You do not currently meet all LAMPOON TikTok requirements.\n\n${missing.join(
              " | "
            )}`
          )
        );
    }

    // --------------------------------------------------------
    // APPLY DISCORD ROLES
    // --------------------------------------------------------

    const result =
      await applyLampoonRoles(
        member,
        tiktok
      );

    console.log(
      `✅ ${member.user.tag} passed LAMPOON verification.`
    );

    return res
      .status(200)
      .send(
        successPage(
          tiktok,
          result
        )
      );
  } catch (error) {
    console.error(
      "❌ TikTok callback error:",
      error
    );

    return res
      .status(500)
      .send(
        failurePage(
          "Verification Error",
          error.message ||
            "An unexpected error occurred."
        )
      );
  }
});

// ============================================================
// DISCORD SLASH COMMANDS
// ============================================================

const commands = [
  new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription(
      "Connect your TikTok and check LAMPOON eligibility."
    ),

  new SlashCommandBuilder()
    .setName("tiktokstatus")
    .setDescription(
      "Check your saved TikTok verification information."
    ),
].map((command) => command.toJSON());

// ============================================================
// REGISTER COMMANDS
// ============================================================

async function registerCommands() {
  try {
    const rest = new REST({
      version: "10",
    }).setToken(DISCORD_TOKEN);

    console.log(
      "🔄 Registering Discord slash commands..."
    );

    await rest.put(
      Routes.applicationGuildCommands(
        DISCORD_CLIENT_ID,
        GUILD_ID
      ),
      {
        body: commands,
      }
    );

    console.log(
      "✅ Discord slash commands registered."
    );
  } catch (error) {
    console.error(
      "❌ Failed to register slash commands:",
      error
    );
  }
}

// ============================================================
// DISCORD INTERACTIONS
// ============================================================

client.on(
  "interactionCreate",
  async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    // ========================================================
    // /tiktok
    // ========================================================

    if (interaction.commandName === "tiktok") {
      try {
        const guild = interaction.guild;

        if (!guild) {
          return interaction.reply({
            content:
              "❌ This command can only be used inside the LAMPOON server.",
            ephemeral: true,
          });
        }

        if (guild.id !== GUILD_ID) {
          return interaction.reply({
            content:
              "❌ This command is not configured for this server.",
            ephemeral: true,
          });
        }

        const member =
          interaction.member;

        if (
          !member.roles.cache.has(
            TIKTOK_ROLE_ID
          )
        ) {
          return interaction.reply({
            content:
              "❌ You need the **TikTok** role before you can use this verification.",
            ephemeral: true,
          });
        }

        const url =
          `${BASE_URL}/tiktok/connect?` +
          new URLSearchParams({
            user: interaction.user.id,
            guild: guild.id,
          }).toString();

        const embed = new EmbedBuilder()
          .setColor("#D4AF37")
          .setTitle("🎵 LAMPOON • TikTok Verification")
          .setDescription(
            [
              "Connect your TikTok account to check whether you meet the LAMPOON Creator requirements.",
              "",
              "### 📋 Requirements",
              "• TikTok profile name contains **LMP**",
              "• Bio contains **LMP Members** OR **Lampoon Creator**",
              `• **${formatNumber(MIN_FOLLOWERS)}+** followers`,
              `• **${formatNumber(MIN_FOLLOWING)}+** following`,
              `• **${formatNumber(MIN_LIKES)}+** likes`,
              `• **${formatNumber(MIN_VIDEOS)}+** videos`,
              "",
              "There are **no maximum limits**.",
              "",
              "### 🏷️ If approved",
              "• Add **Lampoon**",
              "• Add **Content Creator**",
              "• Remove **Followers**",
              "",
              "Click the link below to connect TikTok.",
            ].join("\n")
          )
          .setFooter({
            text:
              "LAMPOON HOK Satire Creator Clan • Est. 2026",
          })
          .setTimestamp();

        return interaction.reply({
          embeds: [embed],
          content:
            `🔗 **Connect TikTok:** ${url}`,
          ephemeral: true,
        });
      } catch (error) {
        console.error(
          "❌ /tiktok error:",
          error
        );

        if (!interaction.replied) {
          await interaction.reply({
            content:
              "❌ Something went wrong.",
            ephemeral: true,
          });
        }
      }
    }

    // ========================================================
    // /tiktokstatus
    // ========================================================

    if (
      interaction.commandName ===
      "tiktokstatus"
    ) {
      try {
        const row = db
          .prepare(
            `
            SELECT *
            FROM tiktok_connections
            WHERE discord_user_id = ?
            `
          )
          .get(interaction.user.id);

        if (!row) {
          return interaction.reply({
            content:
              "❌ You have not connected a TikTok account yet. Use `/tiktok`.",
            ephemeral: true,
          });
        }

        const embed = new EmbedBuilder()
          .setColor("#D4AF37")
          .setTitle(
            "🎵 Your LAMPOON TikTok Status"
          )
          .addFields(
            {
              name: "TikTok",
              value:
                `@${row.tiktok_username || "Unknown"}`,
              inline: true,
            },
            {
              name: "Display Name",
              value:
                row.display_name ||
                "Unknown",
              inline: true,
            },
            {
              name: "Followers",
              value:
                formatNumber(
                  row.follower_count
                ),
              inline: true,
            },
            {
              name: "Following",
              value:
                formatNumber(
                  row.following_count
                ),
              inline: true,
            },
            {
              name: "Likes",
              value:
                formatNumber(
                  row.likes_count
                ),
              inline: true,
            },
            {
              name: "Videos",
              value:
                formatNumber(
                  row.video_count
                ),
              inline: true,
            }
          )
          .setFooter({
            text:
              "LAMPOON TikTok Integration",
          })
          .setTimestamp(
            row.updated_at
          );

        return interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      } catch (error) {
        console.error(
          "❌ /tiktokstatus error:",
          error
        );

        if (!interaction.replied) {
          await interaction.reply({
            content:
              "❌ Unable to retrieve your TikTok status.",
            ephemeral: true,
          });
        }
      }
    }
  }
);

// ============================================================
// DISCORD READY
// ============================================================

client.once(
  "ready",
  async () => {
    console.log("==============================================");
    console.log("🤖 LAMPOON ROLE MANAGER ONLINE");
    console.log("==============================================");
    console.log(
      `🤖 Logged in as: ${client.user.tag}`
    );
    console.log(
      `🆔 Bot ID: ${client.user.id}`
    );
    console.log(
      `🏠 Server count: ${client.guilds.cache.size}`
    );
    console.log(
      `🌐 Web server: ${BASE_URL}`
    );
    console.log(
      `🔗 TikTok callback: ${BASE_URL}/tiktok/callback`
    );
    console.log("==============================================");

    await registerCommands();
  }
);

// ============================================================
// ERROR HANDLING
// ============================================================

client.on(
  "error",
  (error) => {
    console.error(
      "❌ Discord client error:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  (error) => {
    console.error(
      "❌ Unhandled promise rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "❌ Uncaught exception:",
      error
    );
  }
);

// ============================================================
// START EXPRESS
// ============================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `🌐 Web server running on port ${PORT}`
    );
  }
);

// ============================================================
// START DISCORD
// ============================================================

console.log("🔌 Connecting to Discord...");

client
  .login(DISCORD_TOKEN)
  .then(() => {
    console.log("✅ Discord login successful.");
  })
  .catch((error) => {
    console.error(
      "❌ Discord login failed:",
      error
    );

    process.exit(1);
  });
