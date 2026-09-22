require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} = require("discord.js");

// ======================================================
// CONFIG
// ======================================================

const PORT = Number(process.env.PORT) || 10000;

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

const BASE_URL =
  process.env.BASE_URL || "https://rolelogic-manager.onrender.com";

const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

const GUILD_ID = process.env.GUILD_ID;

const TIKTOK_ROLE_ID = process.env.TIKTOK_ROLE_ID;
const LAMPOON_ROLE_ID = process.env.LAMPOON_ROLE_ID;
const CONTENT_CREATOR_ROLE_ID = process.env.CONTENT_CREATOR_ROLE_ID;
const FOLLOWERS_ROLE_ID = process.env.FOLLOWERS_ROLE_ID;

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

const LMP_TAG_CHANNEL_ID =
  process.env.LMP_TAG_CHANNEL_ID || "1539643480714903602";

// TikTok eligibility
const MIN_FOLLOWERS = 300;
const MIN_FOLLOWING = 50;
const MIN_LIKES = 1000;
const MIN_VIDEOS = 15;
// ============================================================
// TIKTOK URL VERIFICATION
// ============================================================

const PUBLIC_DIR = path.join(__dirname, "public");
const TERMS_DIR = path.join(PUBLIC_DIR, "terms");

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(TERMS_DIR, { recursive: true });

// -----------------------------
// TERMS URL VERIFICATION
// -----------------------------

const TERMS_FILE =
  "tiktok9IiFeykTYArFq6Memo5EBMkFcKR7zZjQ.txt";

const TERMS_SIGNATURE =
  "tiktok-developers-site-verification=9IiFeykTYArFq6Memo5EBMkFcKR7zZjQ";

fs.writeFileSync(
  path.join(TERMS_DIR, TERMS_FILE),
  TERMS_SIGNATURE,
  "utf8"
);

// -----------------------------
// WEB / DESKTOP URL VERIFICATION
// -----------------------------

const WEB_FILE =
  "tiktokd2DgssM9DaqXnfoxgQ5SPpq2oyzLs2ED.txt";

const WEB_SIGNATURE =
  "tiktok-developers-site-verification=d2DgssM9DaqXnfoxgQ5SPpq2oyzLs2ED";

// IMPORTANT:
// This file is directly inside /public/
// Therefore it is served from:
//
// https://rolelogic-manager.onrender.com/tiktokd2DgssM9DaqXnfoxgQ5SPpq2oyzLs2ED.txt

fs.writeFileSync(
  path.join(PUBLIC_DIR, WEB_FILE),
  WEB_SIGNATURE,
  "utf8"
);

// Serve public files
app.use(express.static(PUBLIC_DIR));

// ======================================================
// EXPRESS
// ======================================================

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================================
// CREATE REAL STATIC TIKTOK VERIFICATION FILES
// ======================================================

const PUBLIC_DIR = path.join(__dirname, "public");

const TERMS_DIR = path.join(PUBLIC_DIR, "terms");

fs.mkdirSync(TERMS_DIR, { recursive: true });

fs.writeFileSync(
  path.join(TERMS_DIR, TERMS_TIKTOK_FILE),
  TERMS_TIKTOK_SIGNATURE,
  "utf8"
);

fs.writeFileSync(
  path.join(PUBLIC_DIR, WEB_TIKTOK_FILE),
  WEB_TIKTOK_SIGNATURE,
  "utf8"
);

// Serve static files
app.use(express.static(PUBLIC_DIR));

// ======================================================
// BASIC WEB PAGES
// ======================================================

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>LAMPOON Role Manager</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #111;
      color: #fff;
      margin: 0;
      padding: 40px 20px;
      text-align: center;
    }

    .box {
      max-width: 700px;
      margin: auto;
      background: #1b1b1b;
      padding: 35px;
      border-radius: 18px;
      box-shadow: 0 0 30px rgba(255, 200, 0, .12);
    }

    h1 {
      color: #d9a52e;
    }

    a {
      color: #f8d85c;
      margin: 0 10px;
    }

    .status {
      margin: 25px 0;
      padding: 15px;
      background: #202020;
      border-radius: 10px;
    }
  </style>
</head>

<body>
  <div class="box">
    <h1>🏠 LAMPOON Role Manager</h1>

    <p>
      Discord community integration for LAMPOON.
    </p>

    <div class="status">
      🟢 Role Manager is online.
    </div>

    <p>
      This service provides Discord role management and
      TikTok account verification for eligible LAMPOON members.
    </p>

    <p>
      <a href="/terms/">Terms of Service</a>
      <a href="/privacy/">Privacy Policy</a>
    </p>
  </div>
</body>
</html>
  `);
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ======================================================
// TERMS
// ======================================================

app.get("/terms", (req, res) => {
  res.redirect("/terms/");
});

app.get("/terms/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Terms of Service - LAMPOON Role Manager</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>

<body style="font-family:Arial;max-width:800px;margin:40px auto;padding:20px;line-height:1.6">
  <h1>Terms of Service</h1>

  <p>
    LAMPOON Role Manager is a Discord community integration
    used to manage community roles and verify creator eligibility.
  </p>

  <h2>TikTok Integration</h2>

  <p>
    Users may voluntarily connect their TikTok account through
    TikTok Login Kit. The integration uses authorized TikTok
    information to determine eligibility for LAMPOON community roles.
  </p>

  <h2>Eligibility</h2>

  <p>
    TikTok information may be checked against the community's
    published creator eligibility requirements.
  </p>

  <h2>Account Connection</h2>

  <p>
    Users authorize the TikTok connection themselves.
    The integration does not post content to TikTok or modify
    the user's TikTok account.
  </p>

  <h2>Discord</h2>

  <p>
    Discord roles are assigned or removed based on the configured
    LAMPOON community rules.
  </p>

  <h2>Contact</h2>

  <p>
    For questions regarding this service, contact the
    LAMPOON server administrators.
  </p>

  <p>
    <a href="/">Home</a> |
    <a href="/privacy/">Privacy Policy</a>
  </p>
</body>
</html>
  `);
});

// ======================================================
// PRIVACY
// ======================================================

app.get("/privacy", (req, res) => {
  res.redirect("/privacy/");
});

app.get("/privacy/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Privacy Policy - LAMPOON Role Manager</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>

<body style="font-family:Arial;max-width:800px;margin:40px auto;padding:20px;line-height:1.6">
  <h1>Privacy Policy</h1>

  <p>
    LAMPOON Role Manager is a Discord community integration
    that may connect to TikTok through TikTok Login Kit.
  </p>

  <h2>Information Used</h2>

  <p>
    When authorized by a user, the integration may retrieve
    TikTok profile information and approved statistics needed
    for creator eligibility verification.
  </p>

  <h2>Purpose</h2>

  <p>
    Information is used for Discord community verification
    and role-management purposes.
  </p>

  <h2>TikTok Account</h2>

  <p>
    The integration does not post videos, modify profiles,
    send messages, or otherwise change the user's TikTok account.
  </p>

  <h2>Discord</h2>

  <p>
    Eligibility results may be used to assign or remove
    Discord roles according to LAMPOON community rules.
  </p>

  <h2>Data Security</h2>

  <p>
    Access credentials and application secrets should be kept
    confidential and protected by the application operator.
  </p>

  <h2>Contact</h2>

  <p>
    For privacy questions, contact the LAMPOON server administrators.
  </p>

  <p>
    <a href="/">Home</a> |
    <a href="/terms/">Terms of Service</a>
  </p>
</body>
</html>
  `);
});

// ======================================================
// DATA STORAGE
// ======================================================

const DATA_DIR = path.join(__dirname, "data");
const CONNECTIONS_FILE = path.join(
  DATA_DIR,
  "tiktok-connections.json"
);

fs.mkdirSync(DATA_DIR, { recursive: true });

function loadConnections() {
  try {
    if (!fs.existsSync(CONNECTIONS_FILE)) {
      return {};
    }

    return JSON.parse(
      fs.readFileSync(CONNECTIONS_FILE, "utf8")
    );
  } catch (error) {
    console.error("Failed to load TikTok connections:", error);
    return {};
  }
}

function saveConnections(data) {
  fs.writeFileSync(
    CONNECTIONS_FILE,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

const connections = loadConnections();

// ======================================================
// HELPERS
// ======================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function containsLMP(value) {
  return normalize(value).includes("lmp");
}

function validBio(value) {
  const bio = normalize(value);

  return (
    bio.includes("lmp members") ||
    bio.includes("lampoon creator")
  );
}

function numberValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function checkTikTokRequirements(user) {
  const username = user.username || "";
  const displayName = user.display_name || "";
  const bio = user.bio_description || "";

  const followers = numberValue(user.follower_count);
  const following = numberValue(user.following_count);
  const likes = numberValue(user.likes_count);
  const videos = numberValue(user.video_count);

  return {
    usernameOrDisplayName:
      containsLMP(username) ||
      containsLMP(displayName),

    bio:
      validBio(bio),

    followers:
      followers >= MIN_FOLLOWERS,

    following:
      following >= MIN_FOLLOWING,

    likes:
      likes >= MIN_LIKES,

    videos:
      videos >= MIN_VIDEOS,

    followersCount: followers,
    followingCount: following,
    likesCount: likes,
    videosCount: videos,
  };
}

function isEligible(result) {
  return (
    result.usernameOrDisplayName &&
    result.bio &&
    result.followers &&
    result.following &&
    result.likes &&
    result.videos
  );
}

// ======================================================
// OAUTH STATE
// ======================================================

function createOAuthState(userId) {
  const payload = {
    userId,
    createdAt: Date.now(),
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const encoded = Buffer.from(
    JSON.stringify(payload)
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

function verifyOAuthState(state) {
  try {
    const parts = String(state).split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [encoded, signature] = parts;

    const expected = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(encoded)
      .digest("base64url");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      )
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    );

    // 10-minute expiry
    if (Date.now() - payload.createdAt > 10 * 60 * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ======================================================
// DISCORD CLIENT
// ======================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// ======================================================
// DISCORD HELPERS
// ======================================================

async function getGuild() {
  return client.guilds.fetch(GUILD_ID);
}

async function getMember(userId) {
  const guild = await getGuild();

  try {
    return await guild.members.fetch(userId);
  } catch {
    return null;
  }
}

async function getRole(guild, roleId) {
  try {
    return await guild.roles.fetch(roleId);
  } catch {
    return null;
  }
}

function canManageRole(guild, role) {
  if (!role) return false;

  const me = guild.members.me;

  if (!me) return false;

  return role.editable;
}

// ======================================================
// APPLY LAMPOON ROLES
// ======================================================

async function applyEligibilityRoles(member, tiktokUser) {
  const guild = member.guild;

  const addedRoles = [];
  const removedRoles = [];

  const lampoonRole = await getRole(
    guild,
    LAMPOON_ROLE_ID
  );

  const creatorRole = await getRole(
    guild,
    CONTENT_CREATOR_ROLE_ID
  );

  const followersRole = await getRole(
    guild,
    FOLLOWERS_ROLE_ID
  );

  // Add LAMPOON
  if (
    lampoonRole &&
    !member.roles.cache.has(lampoonRole.id) &&
    canManageRole(guild, lampoonRole)
  ) {
    await member.roles.add(
      lampoonRole,
      "TikTok eligibility verification"
    );

    addedRoles.push(lampoonRole);
  }

  // Add Content Creator
  if (
    creatorRole &&
    !member.roles.cache.has(creatorRole.id) &&
    canManageRole(guild, creatorRole)
  ) {
    await member.roles.add(
      creatorRole,
      "TikTok eligibility verification"
    );

    addedRoles.push(creatorRole);
  }

  // Remove Followers
  if (
    followersRole &&
    member.roles.cache.has(followersRole.id) &&
    canManageRole(guild, followersRole)
  ) {
    await member.roles.remove(
      followersRole,
      "TikTok eligibility verification"
    );

    removedRoles.push(followersRole);
  }

  return {
    addedRoles,
    removedRoles,
    tiktokUser,
  };
}

// ======================================================
// BANNER SVG
// ======================================================

function createBannerSVG(tiktokUser, member) {
  const username =
    tiktokUser.username ||
    tiktokUser.display_name ||
    "TikTok User";

  const followers =
    formatNumber(tiktokUser.follower_count);

  const avatar =
    tiktokUser.avatar_url ||
    member.user.displayAvatarURL({
      extension: "png",
      size: 256,
    });

  return `
<svg xmlns="http://www.w3.org/2000/svg"
     width="1200"
     height="420"
     viewBox="0 0 1200 420">

  <defs>
    <linearGradient id="bg"
      x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#080808"/>
      <stop offset="50%" stop-color="#1d1d1d"/>
      <stop offset="100%" stop-color="#050505"/>
    </linearGradient>

    <linearGradient id="gold"
      x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5F3203"/>
      <stop offset="35%" stop-color="#C48D21"/>
      <stop offset="60%" stop-color="#F8D85C"/>
      <stop offset="100%" stop-color="#5F3203"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="420"
        rx="30"
        fill="url(#bg)"/>

  <rect x="12" y="12"
        width="1176"
        height="396"
        rx="24"
        fill="none"
        stroke="url(#gold)"
        stroke-width="5"/>

  <circle cx="170" cy="210" r="105"
          fill="#111"
          stroke="#D9A52E"
          stroke-width="6"/>

  <image
    href="${escapeHtml(avatar)}"
    x="75"
    y="115"
    width="190"
    height="190"
    preserveAspectRatio="xMidYMid slice"
    clip-path="circle(95px at 95px 95px)"/>

  <text x="330" y="105"
        fill="#F8D85C"
        font-size="58"
        font-family="Arial"
        font-weight="bold">
    LAMPOON
  </text>

  <text x="330" y="165"
        fill="#ffffff"
        font-size="38"
        font-family="Arial"
        font-weight="bold">
    LAMPOON MEMBERS
  </text>

  <text x="330" y="235"
        fill="#dddddd"
        font-size="30"
        font-family="Arial">
    TikTok: @${escapeHtml(username)}
  </text>

  <text x="330" y="290"
        fill="#F8D85C"
        font-size="32"
        font-family="Arial"
        font-weight="bold">
    ${followers} Followers
  </text>

  <text x="330" y="350"
        fill="#aaaaaa"
        font-size="24"
        font-family="Arial">
    Verified through LAMPOON Role Manager
  </text>
</svg>
`;
}

// ======================================================
// SEND ROLE LOG
// ======================================================

async function sendEligibilityLog(
  member,
  tiktokUser,
  addedRoles,
  removedRoles
) {
  if (!LOG_CHANNEL_ID) return;

  try {
    const channel = await client.channels.fetch(
      LOG_CHANNEL_ID
    );

    if (!channel || !channel.isTextBased()) {
      return;
    }

    if (!addedRoles.length) {
      return;
    }

    const svg = createBannerSVG(
      tiktokUser,
      member
    );

    const fileName =
      `lampoon-${member.id}-${Date.now()}.svg`;

    const filePath =
      path.join(DATA_DIR, fileName);

    fs.writeFileSync(filePath, svg, "utf8");

    const addedMentions = addedRoles
      .map(role => role.toString())
      .join(" ");

    const removedNames =
      removedRoles.length
        ? removedRoles.map(role => role.name).join(", ")
        : "None";

    const embed = new EmbedBuilder()
      .setColor("#C48D21")
      .setDescription(
        `<a:Avisala:1542443480714903660> Avisala, ${member}!\n\n` +
        `${member.nickname || member.user.username} is now officially recognized as a 𝗟𝗔𝗠𝗣𝗢𝗢𝗡 member on ${member.guild.name}.`
      )
      .addFields(
        {
          name: "🏷️ Member Role",
          value: addedMentions || "None",
          inline: false,
        },
        {
          name: "🔄 Previous Role",
          value: removedNames,
          inline: false,
        },
        {
          name: "📌 LMP Tag",
          value:
            `Check out <#${LMP_TAG_CHANNEL_ID}> to request your nickname with the LMP tag.`,
          inline: false,
        },
        {
          name: "TikTok",
          value:
            `${tiktokUser.username || tiktokUser.display_name || "Unknown"} • ` +
            `${formatNumber(tiktokUser.follower_count)} followers`,
          inline: false,
        },
        {
          name: "📅 Joined/Updated",
          value:
            `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true,
        },
        {
          name: "⏰",
          value:
            `<t:${Math.floor(Date.now() / 1000)}:T>`,
          inline: true,
        }
      )
      .setImage(`attachment://${fileName}`)
      .setFooter({
        text:
          "🎭 𝗟𝗔𝗠𝗣𝗢𝗢N HOK Satire Creator Clan | Est. 2026",
      });

    await channel.send({
      content: addedMentions,
      embeds: [embed],
      files: [
        {
          attachment: filePath,
          name: fileName,
        },
      ],
    });

    // Clean temporary banner
    setTimeout(() => {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }, 60_000);

  } catch (error) {
    console.error(
      "Failed to send eligibility log:",
      error
    );
  }
}

// ======================================================
// TIKTOK CONNECT PAGE
// ======================================================

app.get("/tiktok/connect", async (req, res) => {
  try {
    const userId = String(req.query.user_id || "");

    if (!userId) {
      return res.status(400).send("Missing Discord user ID.");
    }

    const member = await getMember(userId);

    if (!member) {
      return res.status(403).send(
        "You are not a member of the LAMPOON server."
      );
    }

    if (
      TIKTOK_ROLE_ID &&
      !member.roles.cache.has(TIKTOK_ROLE_ID)
    ) {
      return res.status(403).send(
        "You need the TikTok role before connecting your account."
      );
    }

    const state = createOAuthState(userId);

    const params = new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      response_type: "code",
      scope:
        "user.info.basic,user.info.profile,user.info.stats",
      redirect_uri:
        `${BASE_URL}/tiktok/callback`,
      state,
    });

    const authUrl =
      `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

    return res.redirect(authUrl);

  } catch (error) {
    console.error(
      "TikTok connect error:",
      error
    );

    return res.status(500).send(
      "Unable to start TikTok connection."
    );
  }
});

// ======================================================
// TIKTOK CALLBACK
// ======================================================

app.get("/tiktok/callback", async (req, res) => {
  try {
    const {
      code,
      state,
      error,
      error_description,
    } = req.query;

    if (error) {
      return res.status(400).send(`
        <h1>TikTok Login Error</h1>
        <p>${escapeHtml(error)}</p>
        <p>${escapeHtml(error_description || "")}</p>
      `);
    }

    if (!code || !state) {
      return res.status(400).send(
        "Missing TikTok authorization code or state."
      );
    }

    const stateData = verifyOAuthState(state);

    if (!stateData) {
      return res.status(400).send(
        "Invalid or expired authorization state."
      );
    }

    const userId = stateData.userId;

    // ==================================================
    // EXCHANGE CODE FOR ACCESS TOKEN
    // ==================================================

    const tokenResponse = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_key: TIKTOK_CLIENT_KEY,
          client_secret: TIKTOK_CLIENT_SECRET,
          code: String(code),
          grant_type: "authorization_code",
          redirect_uri:
            `${BASE_URL}/tiktok/callback`,
        }),
      }
    );

    const tokenData =
      await tokenResponse.json();

    if (
      !tokenResponse.ok ||
      tokenData.error ||
      !tokenData.access_token
    ) {
      console.error(
        "TikTok token response:",
        tokenData
      );

      return res.status(400).send(`
        <h1>TikTok authorization failed</h1>
        <p>${escapeHtml(
          tokenData.error_description ||
          tokenData.error ||
          "Unable to obtain TikTok access token."
        )}</p>
      `);
    }

    // ==================================================
    // GET TIKTOK USER INFO
    // ==================================================

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

    const userInfoResponse = await fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`,
      {
        headers: {
          Authorization:
            `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const userInfoData =
      await userInfoResponse.json();

    if (
      !userInfoResponse.ok ||
      userInfoData.error?.code !== "ok" &&
      !userInfoData.data?.user
    ) {
      console.error(
        "TikTok user info response:",
        userInfoData
      );

      return res.status(400).send(`
        <h1>Unable to read TikTok profile</h1>
        <p>Please make sure the required TikTok permissions are approved.</p>
      `);
    }

    const tiktokUser =
      userInfoData.data.user;

    // ==================================================
    // SAVE CONNECTION
    // ==================================================

    connections[userId] = {
      openId: tiktokUser.open_id,
      unionId: tiktokUser.union_id || null,

      username:
        tiktokUser.username || null,

      displayName:
        tiktokUser.display_name || null,

      avatarUrl:
        tiktokUser.avatar_url || null,

      bio:
        tiktokUser.bio_description || null,

      followerCount:
        numberValue(tiktokUser.follower_count),

      followingCount:
        numberValue(tiktokUser.following_count),

      likesCount:
        numberValue(tiktokUser.likes_count),

      videoCount:
        numberValue(tiktokUser.video_count),

      accessToken:
        tokenData.access_token,

      refreshToken:
        tokenData.refresh_token || null,

      expiresIn:
        tokenData.expires_in || null,

      connectedAt:
        new Date().toISOString(),
    };

    saveConnections(connections);

    // ==================================================
    // CHECK ELIGIBILITY
    // ==================================================

    const requirements =
      checkTikTokRequirements(tiktokUser);

    const eligible =
      isEligible(requirements);

    const member =
      await getMember(userId);

    if (!member) {
      return res.status(403).send(
        "Discord member could not be found."
      );
    }

    let addedRoles = [];
    let removedRoles = [];

    if (eligible) {
      const result =
        await applyEligibilityRoles(
          member,
          tiktokUser
        );

      addedRoles =
        result.addedRoles;

      removedRoles =
        result.removedRoles;

      if (addedRoles.length) {
        await sendEligibilityLog(
          member,
          tiktokUser,
          addedRoles,
          removedRoles
        );
      }
    }

    // ==================================================
    // RESULT PAGE
    // ==================================================

    if (eligible) {
      return res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LAMPOON TikTok Verification</title>
</head>

<body style="
  background:#111;
  color:white;
  font-family:Arial;
  text-align:center;
  padding:50px 20px;
">
  <h1 style="color:#F8D85C">
    ✅ TikTok Verified
  </h1>

  <p>
    Your TikTok account meets the LAMPOON creator requirements.
  </p>

  <p>
    <strong>@${escapeHtml(
      tiktokUser.username ||
      tiktokUser.display_name ||
      "TikTok User"
    )}</strong>
  </p>

  <p>
    ${formatNumber(tiktokUser.follower_count)}
    followers
  </p>

  <p>
    Your eligible LAMPOON roles have been processed.
  </p>
</body>
</html>
      `);
    }

    return res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LAMPOON TikTok Verification</title>
</head>

<body style="
  background:#111;
  color:white;
  font-family:Arial;
  text-align:center;
  padding:50px 20px;
">
  <h1 style="color:#F8D85C">
    TikTok Connected
  </h1>

  <p>
    Your TikTok account was successfully connected.
  </p>

  <h2>Eligibility requirements</h2>

  <p>
    LMP in username/display name:
    ${requirements.usernameOrDisplayName ? "✅" : "❌"}
  </p>

  <p>
    Required bio:
    ${requirements.bio ? "✅" : "❌"}
  </p>

  <p>
    Followers:
    ${requirements.followers ? "✅" : "❌"}
    (${formatNumber(requirements.followersCount)})
  </p>

  <p>
    Following:
    ${requirements.following ? "✅" : "❌"}
    (${formatNumber(requirements.followingCount)})
  </p>

  <p>
    Likes:
    ${requirements.likes ? "✅" : "❌"}
    (${formatNumber(requirements.likesCount)})
  </p>

  <p>
    Videos:
    ${requirements.videos ? "✅" : "❌"}
    (${formatNumber(requirements.videosCount)})
  </p>

  <p>
    Your account does not currently meet all requirements.
  </p>
</body>
</html>
    `);

  } catch (error) {
    console.error(
      "TikTok callback error:",
      error
    );

    return res.status(500).send(`
      <h1>Something went wrong</h1>
      <p>Please try connecting TikTok again.</p>
    `);
  }
});

// ======================================================
// DISCORD SLASH COMMANDS
// ======================================================

const commands = [
  new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription(
      "Connect your TikTok account for LAMPOON verification."
    ),

  new SlashCommandBuilder()
    .setName("tiktokstatus")
    .setDescription(
      "Check your connected TikTok account and eligibility."
    ),
].map(command => command.toJSON());

// ======================================================
// DISCORD INTERACTIONS
// ======================================================

client.on("interactionCreate", async interaction => {
  try {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    // ==================================================
    // /tiktok
    // ==================================================

    if (interaction.commandName === "tiktok") {
      const member =
        await getMember(interaction.user.id);

      if (!member) {
        return interaction.reply({
          content:
            "❌ You are not a member of the LAMPOON server.",
          ephemeral: true,
        });
      }

      if (
        TIKTOK_ROLE_ID &&
        !member.roles.cache.has(TIKTOK_ROLE_ID)
      ) {
        return interaction.reply({
          content:
            "❌ You need the TikTok role before you can use TikTok verification.",
          ephemeral: true,
        });
      }

      const button = new ButtonBuilder()
        .setLabel("Connect TikTok")
        .setStyle(ButtonStyle.Link)
        .setURL(
          `${BASE_URL}/tiktok/connect?user_id=${encodeURIComponent(
            interaction.user.id
          )}`
        );

      const row =
        new ActionRowBuilder()
          .addComponents(button);

      const embed = new EmbedBuilder()
        .setColor("#C48D21")
        .setTitle("🎵 TikTok Verification")
        .setDescription(
          "Connect your TikTok account to check whether you meet the LAMPOON creator eligibility requirements."
        )
        .addFields(
          {
            name: "Requirements",
            value:
              "• LMP in username/display name\n" +
              "• LMP Members or Lampoon Creator in bio\n" +
              "• 300+ followers\n" +
              "• 50+ following\n" +
              "• 1,000+ likes\n" +
              "• 15+ videos",
          }
        )
        .setFooter({
          text: "LAMPOON Role Manager",
        });

      return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
    }

    // ==================================================
    // /tiktokstatus
    // ==================================================

    if (
      interaction.commandName ===
      "tiktokstatus"
    ) {
      const connection =
        connections[interaction.user.id];

      if (!connection) {
        return interaction.reply({
          content:
            "❌ You do not have a TikTok account connected yet. Use `/tiktok` first.",
          ephemeral: true,
        });
      }

      const requirements =
        checkTikTokRequirements({
          username: connection.username,
          display_name:
            connection.displayName,
          bio_description:
            connection.bio,

          follower_count:
            connection.followerCount,

          following_count:
            connection.followingCount,

          likes_count:
            connection.likesCount,

          video_count:
            connection.videoCount,
        });

      const eligible =
        isEligible(requirements);

      const embed = new EmbedBuilder()
        .setColor(
          eligible
            ? "#57F287"
            : "#FEE75C"
        )
        .setTitle(
          "🎵 TikTok Verification Status"
        )
        .setDescription(
          `TikTok: **@${connection.username || connection.displayName || "Unknown"}**`
        )
        .addFields(
          {
            name: "LMP Name",
            value:
              requirements.usernameOrDisplayName
                ? "✅"
                : "❌",
            inline: true,
          },
          {
            name: "Bio",
            value:
              requirements.bio
                ? "✅"
                : "❌",
            inline: true,
          },
          {
            name: "Followers",
            value:
              `${requirements.followers ? "✅" : "❌"} ${formatNumber(requirements.followersCount)}`,
            inline: true,
          },
          {
            name: "Following",
            value:
              `${requirements.following ? "✅" : "❌"} ${formatNumber(requirements.followingCount)}`,
            inline: true,
          },
          {
            name: "Likes",
            value:
              `${requirements.likes ? "✅" : "❌"} ${formatNumber(requirements.likesCount)}`,
            inline: true,
          },
          {
            name: "Videos",
            value:
              `${requirements.videos ? "✅" : "❌"} ${formatNumber(requirements.videosCount)}`,
            inline: true,
          },
          {
            name: "Result",
            value:
              eligible
                ? "✅ Eligible"
                : "❌ Not eligible",
          }
        )
        .setFooter({
          text: "LAMPOON Role Manager",
        });

      return interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    }

  } catch (error) {
    console.error(
      "Discord interaction error:",
      error
    );

    if (!interaction.replied) {
      await interaction.reply({
        content:
          "❌ An unexpected error occurred.",
        ephemeral: true,
      });
    }
  }
});

// ======================================================
// READY
// ======================================================

client.once("clientReady", async readyClient => {
  console.log(
    `🤖 Discord bot online as ${readyClient.user.tag}`
  );

  try {
    const guild =
      await readyClient.guilds.fetch(GUILD_ID);

    console.log(
      `🏠 Connected to guild: ${guild.name} (${guild.id})`
    );

    // Register slash commands to the LAMPOON guild
    await guild.commands.set(commands);

    console.log(
      "✅ Slash commands registered."
    );

    // Role hierarchy diagnostics
    const me =
      await guild.members.fetchMe();

    const roleIds = [
      TIKTOK_ROLE_ID,
      LAMPOON_ROLE_ID,
      CONTENT_CREATOR_ROLE_ID,
      FOLLOWERS_ROLE_ID,
    ].filter(Boolean);

    for (const roleId of roleIds) {
      const role =
        await guild.roles.fetch(roleId);

      if (!role) {
        console.log(
          `⚠️ Role not found: ${roleId}`
        );
        continue;
      }

      console.log(
        `🔎 Role: ${role.name} (${role.id}) | ` +
        `Position: ${role.position} | ` +
        `Bot can manage: ${role.editable}`
      );
    }

    console.log(
      `🤖 Bot highest role: ${me.roles.highest.name}`
    );

  } catch (error) {
    console.error(
      "Discord startup error:",
      error
    );
  }
});

// ======================================================
// START WEB SERVER
// ======================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🌐 Web server running on port ${PORT}`
  );

  console.log(
    `🌐 Base URL: ${BASE_URL}`
  );

  console.log(
    `📜 Terms verification: /terms/${TERMS_TIKTOK_FILE}`
  );

  console.log(
    `🌐 Web verification: /${WEB_TIKTOK_FILE}`
  );
});

// ======================================================
// CONFIG CHECK
// ======================================================

function checkConfig() {
  const required = {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    TIKTOK_CLIENT_KEY,
    TIKTOK_CLIENT_SECRET,
    GUILD_ID,
    TIKTOK_ROLE_ID,
    LAMPOON_ROLE_ID,
    CONTENT_CREATOR_ROLE_ID,
    FOLLOWERS_ROLE_ID,
    LOG_CHANNEL_ID,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    console.error(
      "❌ Missing environment variables:",
      missing.join(", ")
    );
  } else {
    console.log(
      "✅ Required environment variables detected."
    );
  }
}

checkConfig();

// ======================================================
// LOGIN
// ======================================================

client.login(DISCORD_TOKEN);
