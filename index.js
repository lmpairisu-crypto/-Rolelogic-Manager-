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
  SlashCommandBuilder
} = require("discord.js");

// ============================================================
// CONFIG
// ============================================================

const PORT = Number(process.env.PORT || 10000);

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

const BASE_URL = String(process.env.BASE_URL || "").replace(/\/+$/, "");

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.randomBytes(32).toString("hex");

const GUILD_ID = process.env.GUILD_ID;

const TIKTOK_ROLE_ID = process.env.TIKTOK_ROLE_ID;
const LAMPOON_ROLE_ID = process.env.LAMPOON_ROLE_ID;
const CONTENT_CREATOR_ROLE_ID = process.env.CONTENT_CREATOR_ROLE_ID;
const FOLLOWERS_ROLE_ID = process.env.FOLLOWERS_ROLE_ID;

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

const LMP_TAG_CHANNEL_ID =
  process.env.LMP_TAG_CHANNEL_ID ||
  "1539643480714903602";

// ============================================================
// TIKTOK REQUIREMENTS
// ============================================================

const MIN_FOLLOWERS = 300;
const MIN_FOLLOWING = 50;
const MIN_LIKES = 1000;
const MIN_VIDEOS = 15;

// ============================================================
// STORAGE
// ============================================================

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "tiktok-connections.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadConnections() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return {};
    }

    const raw = fs.readFileSync(DATA_FILE, "utf8");

    if (!raw.trim()) {
      return {};
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error("❌ Failed to load connection data:", error);
    return {};
  }
}

function saveConnections(data) {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(data, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("❌ Failed to save connection data:", error);
  }
}

const connections = loadConnections();

// ============================================================
// EXPRESS
// ============================================================

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send(
    "LAMPOON Role Manager is online!"
  );
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ===============================
// TikTok URL Verification Files
// ===============================

// TERMS verification
const TERMS_TIKTOK_FILE =
  "tiktokOs88Y6sSiiBXxoK1cKgbxynXxc29xU2P.txt";

const TERMS_TIKTOK_SIGNATURE =
  "tiktok-developers-site-verification=Os88Y6SiiBXxoK1cKgbxynXxc29xU2P";

app.get(`/terms/${TERMS_TIKTOK_FILE}`, (req, res) => {
  res.type("text/plain").send(TERMS_TIKTOK_SIGNATURE);
});


// WEB/DESKTOP verification
const WEB_TIKTOK_FILE =
  "tiktokh7EKT36y8LsbQvlOpD4KvUIlqwg6EE5E.txt";

const WEB_TIKTOK_SIGNATURE =
  "tiktok-developers-site-verification=tiktokh7EKT36y8LsbQvlOpD4KvUIlqwg6EE5E";

app.get(`/${WEB_TIKTOK_FILE}`, (req, res) => {
  res.type("text/plain").send(WEB_TIKTOK_SIGNATURE);
});

// ============================================================
// TIKTOK URL VERIFICATION
// ============================================================

// TikTok verification files
// These are public verification tokens, not secrets.

const TIKTOK_VERIFICATION_FILES = {
  "tiktokbj3ABlE0bo4EngihO6xbS5kmh1AFP9q0.txt":
    "tiktok-developers-site-verification=bj3ABlE0bo4EngihO6xbS5kmh1AFP9q0",

  "tiktoksm2JttwMhNwKjG543zxZAcuRNmofVPh8.txt":
    "tiktok-developers-site-verification=sm2JttwMhNwKjG543zxZAcuRNmofVPh8",

  "tiktokxB7T5U5R4XXJEFPBRTRhKL9EiozH3gm5.txt":
    "tiktok-developers-site-verification=xB7T5U5R4XXJEFPBRTRhKL9EiozH3gm5"
};

// Serve every verification file at the root,
// /privacy/, and /terms/ URL prefixes.
//
// This allows TikTok to verify whichever file it
// assigned to each URL property.

for (const [filename, verificationText] of Object.entries(
  TIKTOK_VERIFICATION_FILES
)) {
  const locations = [
    `/${filename}`,
    `/privacy/${filename}`,
    `/terms/${filename}`
  ];

  for (const route of locations) {
    app.get(route, (req, res) => {
      res
        .status(200)
        .type("text/plain")
        .send(verificationText);
    });
  }
}

// ============================================================
// TERMS / PRIVACY
// ============================================================

const termsPage = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LAMPOON Role Manager - Terms</title>
</head>
<body>
<h1>LAMPOON Role Manager - Terms of Service</h1>

<p>
LAMPOON Role Manager is a Discord server utility that allows
members to connect a TikTok account for eligibility verification.
</p>

<p>
The service uses information provided through TikTok's authorized
OAuth connection only for the purpose of checking the configured
LAMPOON membership requirements.
</p>

<p>
By using the service, you agree to use it only for its intended
Discord server verification purpose.
</p>

<p>
LAMPOON Role Manager may change or discontinue the service at any time.
</p>

</body>
</html>
`;

const privacyPage = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LAMPOON Role Manager - Privacy Policy</title>
</head>
<body>
<h1>LAMPOON Role Manager - Privacy Policy</h1>

<p>
LAMPOON Role Manager receives TikTok profile and statistics information
after a member authorizes the TikTok connection.
</p>

<p>
Information may include TikTok username, display name, biography,
follower count, following count, likes count, video count, and TikTok
account identifiers.
</p>

<p>
This information is used only to determine eligibility for the
configured LAMPOON Discord roles and to provide verification logs.
</p>

<p>
The service does not sell TikTok information.
</p>

<p>
Members may disconnect their TikTok account by removing the stored
connection through the server administrator.
</p>

</body>
</html>
`;

// Support BOTH versions with and without trailing slash.
app.get("/terms", (req, res) => {
  res.status(200).type("html").send(termsPage);
});

app.get("/terms/", (req, res) => {
  res.status(200).type("html").send(termsPage);
});

app.get("/privacy", (req, res) => {
  res.status(200).type("html").send(privacyPage);
});

app.get("/privacy/", (req, res) => {
  res.status(200).type("html").send(privacyPage);
});

// ============================================================
// CONFIG CHECK
// ============================================================

function checkConfig() {
  const required = {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    TIKTOK_CLIENT_KEY,
    TIKTOK_CLIENT_SECRET,
    BASE_URL,
    GUILD_ID,
    TIKTOK_ROLE_ID,
    LAMPOON_ROLE_ID,
    CONTENT_CREATOR_ROLE_ID,
    FOLLOWERS_ROLE_ID,
    LOG_CHANNEL_ID
  };

  let missing = false;

  console.log("");
  console.log("==============================================");
  console.log("        LAMPOON ROLE MANAGER");
  console.log("==============================================");

  for (const [name, value] of Object.entries(required)) {
    const ok = Boolean(value);

    console.log(
      `${name}: ${ok ? "✅ SET" : "❌ MISSING"}`
    );

    if (!ok) {
      missing = true;
    }
  }

  console.log(
    `LMP_TAG_CHANNEL_ID: ${
      LMP_TAG_CHANNEL_ID ? "✅ SET" : "❌ MISSING"
    }`
  );

  console.log("==============================================");

  if (missing) {
    console.error(
      "❌ One or more required environment variables are missing."
    );

    process.exit(1);
  }

  console.log("✅ Configuration looks good.");
  console.log("");
}

checkConfig();

// ============================================================
// DISCORD CLIENT
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

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

function normalize(value) {
  return String(value || "").trim().toLowerCase();
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
  return numberValue(value).toLocaleString("en-US");
}

function checkTikTokRequirements(profile) {
  const displayName = profile.display_name || "";
  const username = profile.username || "";
  const bio = profile.bio_description || "";

  const followers = numberValue(profile.follower_count);
  const following = numberValue(profile.following_count);
  const likes = numberValue(profile.likes_count);
  const videos = numberValue(profile.video_count);

  const nameOK =
    containsLMP(displayName) ||
    containsLMP(username);

  const bioOK = validBio(bio);

  const followersOK = followers >= MIN_FOLLOWERS;
  const followingOK = following >= MIN_FOLLOWING;
  const likesOK = likes >= MIN_LIKES;
  const videosOK = videos >= MIN_VIDEOS;

  return {
    eligible:
      nameOK &&
      bioOK &&
      followersOK &&
      followingOK &&
      likesOK &&
      videosOK,

    checks: {
      nameOK,
      bioOK,
      followersOK,
      followingOK,
      likesOK,
      videosOK
    }
  };
}

// ============================================================
// OAUTH STATE
// ============================================================

function createState(userId, guildId) {
  const payload = {
    userId,
    guildId,
    createdAt: Date.now()
  };

  const encoded = Buffer
    .from(JSON.stringify(payload))
    .toString("base64url");

  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

function verifyState(state) {
  try {
    if (!state || !state.includes(".")) {
      return null;
    }

    const [encoded, signature] = state.split(".");

    const expected = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(encoded)
      .digest("base64url");

    const valid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );

    if (!valid) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    );

    // State expires after 10 minutes
    if (
      !payload.createdAt ||
      Date.now() - payload.createdAt > 10 * 60 * 1000
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ============================================================
// TIKTOK OAUTH
// ============================================================

function getTikTokAuthorizationURL(userId, guildId) {
  const state = createState(userId, guildId);

  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    response_type: "code",
    scope: "user.info.basic,user.info.profile,user.info.stats",
    redirect_uri: `${BASE_URL}/tiktok/callback`,
    state
  });

  return (
    "https://www.tiktok.com/v2/auth/authorize/?" +
    params.toString()
  );
}

async function exchangeTikTokCode(code) {
  const body = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    client_secret: TIKTOK_CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: `${BASE_URL}/tiktok/callback`
  });

  const response = await fetch(
    "https://open.tiktokapis.com/v2/oauth/token/",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body
    }
  );

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `TikTok token response was not JSON: ${text}`
    );
  }

  if (!response.ok || data.error) {
    throw new Error(
      data.error_description ||
      data.error ||
      "TikTok token exchange failed."
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
    "video_count"
  ].join(",");

  const response = await fetch(
    `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `TikTok user info response was not JSON: ${text}`
    );
  }

  if (!response.ok || data.error?.code !== "ok") {
    throw new Error(
      data.error?.message ||
      "Unable to retrieve TikTok profile."
    );
  }

  if (!data.data?.user) {
    throw new Error(
      "TikTok did not return user information."
    );
  }

  return data.data.user;
}

// ============================================================
// DISCORD HELPERS
// ============================================================

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

function botCanManageRole(guild, role) {
  const botMember = guild.members.me;

  if (!botMember) {
    return false;
  }

  if (
    !botMember.permissions.has(
      PermissionsBitField.Flags.ManageRoles
    )
  ) {
    return false;
  }

  return botMember.roles.highest.position > role.position;
}

async function ensureRolePermissions(guild) {
  const roleIds = [
    TIKTOK_ROLE_ID,
    LAMPOON_ROLE_ID,
    CONTENT_CREATOR_ROLE_ID,
    FOLLOWERS_ROLE_ID
  ];

  const roles = [];

  for (const id of roleIds) {
    const role = await guild.roles.fetch(id);

    if (!role) {
      throw new Error(
        `Role ${id} could not be found.`
      );
    }

    roles.push(role);
  }

  const botMember = guild.members.me;

  if (!botMember) {
    throw new Error(
      "Bot member could not be found."
    );
  }

  if (
    !botMember.permissions.has(
      PermissionsBitField.Flags.ManageRoles
    )
  ) {
    throw new Error(
      "Bot does not have Manage Roles permission."
    );
  }

  for (const role of roles) {
    if (!botCanManageRole(guild, role)) {
      throw new Error(
        `Bot role must be above "${role.name}".`
      );
    }
  }

  return roles;
}

// ============================================================
// BANNER
// ============================================================

function createBannerSVG({
  displayName,
  username,
  followers,
  avatar
}) {
  const safeDisplayName = escapeHtml(displayName);
  const safeUsername = escapeHtml(username);

  const avatarUrl = avatar
    ? escapeHtml(avatar)
    : "";

  return `
<svg xmlns="http://www.w3.org/2000/svg"
     width="1200"
     height="420"
     viewBox="0 0 1200 420">

  <defs>
    <linearGradient
      id="bg"
      x1="0"
      y1="0"
      x2="1"
      y2="1">

      <stop offset="0%" stop-color="#111111"/>
      <stop offset="100%" stop-color="#242424"/>

    </linearGradient>
  </defs>

  <rect
    width="1200"
    height="420"
    fill="url(#bg)"
    rx="28"/>

  <text
    x="70"
    y="95"
    fill="#ffffff"
    font-size="68"
    font-family="Arial"
    font-weight="900">

    LAMPOON

  </text>

  <text
    x="74"
    y="140"
    fill="#cccccc"
    font-size="28"
    font-family="Arial"
    font-weight="700">

    LAMPOON MEMBERS

  </text>

  ${
    avatarUrl
      ? `
      <image
        href="${avatarUrl}"
        x="70"
        y="190"
        width="120"
        height="120"
        preserveAspectRatio="xMidYMid slice"/>
      `
      : ""
  }

  <text
    x="225"
    y="235"
    fill="#ffffff"
    font-size="34"
    font-family="Arial"
    font-weight="700">

    ${safeDisplayName}

  </text>

  <text
    x="225"
    y="280"
    fill="#aaaaaa"
    font-size="25"
    font-family="Arial">

    @${safeUsername}

  </text>

  <text
    x="225"
    y="325"
    fill="#ffffff"
    font-size="26"
    font-family="Arial"
    font-weight="700">

    ${formatNumber(followers)} Followers

  </text>

</svg>
`;
}

function svgDataURL(svg) {
  return (
    "data:image/svg+xml;base64," +
    Buffer.from(svg).toString("base64")
  );
}

// ============================================================
// LOG EMBED
// ============================================================

async function sendIntegrationLog({
  member,
  profile,
  addedRoles,
  removedRoles
}) {
  if (!LOG_CHANNEL_ID) {
    return;
  }

  const channel =
    await client.channels.fetch(LOG_CHANNEL_ID);

  if (!channel || !channel.isTextBased()) {
    console.error(
      "❌ Log channel is not a text channel."
    );
    return;
  }

  const addedMentions = addedRoles.length
    ? addedRoles.map(role => role.toString()).join(" ")
    : "None";

  const removedNames = removedRoles.length
    ? removedRoles.map(role => role.name).join(", ")
    : "None";

  const displayName =
    member.displayName ||
    member.user.username;

  const username =
    profile.username ||
    "Unknown";

  const followers =
    numberValue(profile.follower_count);

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setAuthor({
      name: "LAMPOON Role Manager"
    })
    .setTitle("🔗 TikTok Integration")
    .setDescription(
      `<a:Avisala:1542448826265243660> Avisala, ${member}!\n\n` +
      `${displayName} is now officially recognized as a 𝗟𝗔𝗠𝗣𝗢𝗢𝗡 member on ${member.guild.name}.`
    )
    .addFields(
      {
        name: "🏷️ Member Role",
        value: addedMentions
      },
      {
        name: "🔄 Previous Role",
        value: removedNames
      },
      {
        name: "📌 LMP Tag",
        value:
          `Check out <#${LMP_TAG_CHANNEL_ID}> to request your nickname with the LMP tag.`
      },
      {
        name: "TikTok",
        value:
          `@${username} • ${formatNumber(followers)} followers`
      },
      {
        name: "📅 Joined/Updated",
        value: `<t:${Math.floor(Date.now() / 1000)}:F>`
      },
      {
        name: "⏰",
        value: `<t:${Math.floor(Date.now() / 1000)}:R>`
      }
    )
    .setFooter({
      text:
        "🎭 𝗟𝗔𝗠𝗣𝗢𝗢N HOK Satire Creator Clan | Est. 2026"
    })
    .setTimestamp();

  const svg = createBannerSVG({
    displayName,
    username,
    followers,
    avatar: member.displayAvatarURL({
      extension: "png",
      size: 256
    })
  });

  // Discord embeds don't support data:image URLs reliably.
  // Send the embed first and then the banner as an SVG attachment.
  const buffer = Buffer.from(svg);

  await channel.send({
    content: addedRoles
      .map(role => role.toString())
      .join(" "),
    embeds: [embed],
    files: [
      {
        attachment: buffer,
        name: "lampoon-member.svg"
      }
    ]
  });
}

// ============================================================
// APPLY ROLES
// ============================================================

async function applyLampoonRoles(member, profile) {
  const guild = member.guild;

  await ensureRolePermissions(guild);

  const lampoonRole =
    await guild.roles.fetch(LAMPOON_ROLE_ID);

  const creatorRole =
    await guild.roles.fetch(CONTENT_CREATOR_ROLE_ID);

  const followersRole =
    await guild.roles.fetch(FOLLOWERS_ROLE_ID);

  const addedRoles = [];
  const removedRoles = [];

  if (!member.roles.cache.has(LAMPOON_ROLE_ID)) {
    await member.roles.add(
      lampoonRole,
      "TikTok eligibility verified"
    );

    addedRoles.push(lampoonRole);
  }

  if (
    !member.roles.cache.has(
      CONTENT_CREATOR_ROLE_ID
    )
  ) {
    await member.roles.add(
      creatorRole,
      "TikTok eligibility verified"
    );

    addedRoles.push(creatorRole);
  }

  if (member.roles.cache.has(FOLLOWERS_ROLE_ID)) {
    await member.roles.remove(
      followersRole,
      "TikTok eligibility verified as LAMPOON member"
    );

    removedRoles.push(followersRole);
  }

  // IMPORTANT:
  // Only send the integration log when a role was ADDED.
  if (addedRoles.length > 0) {
    await sendIntegrationLog({
      member,
      profile,
      addedRoles,
      removedRoles
    });
  }

  return {
    addedRoles,
    removedRoles
  };
}

// ============================================================
// SUCCESS / FAILURE HTML
// ============================================================

function page(title, body) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<title>${escapeHtml(title)}</title>

<style>

body {
  margin: 0;
  padding: 40px 20px;
  background: #111;
  color: white;
  font-family: Arial, sans-serif;
  text-align: center;
}

.card {
  max-width: 650px;
  margin: auto;
  background: #1e1e1e;
  border-radius: 18px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
}

h1 {
  margin-top: 0;
}

p {
  color: #ccc;
  line-height: 1.6;
}

.success {
  color: #57f287;
}

.error {
  color: #ed4245;
}

.stat {
  text-align: left;
  background: #111;
  border-radius: 12px;
  padding: 15px;
  margin-top: 15px;
}

</style>
</head>

<body>

<div class="card">

${body}

</div>

</body>
</html>
`;
}

// ============================================================
// TIKTOK CONNECT
// ============================================================

app.get("/tiktok/connect", async (req, res) => {
  try {
    const userId = String(req.query.user || "");
    const guildId = String(req.query.guild || GUILD_ID);

    if (!userId) {
      return res
        .status(400)
        .send(
          page(
            "Invalid Request",
            `<h1 class="error">Missing Discord user ID.</h1>`
          )
        );
    }

    if (guildId !== GUILD_ID) {
      return res
        .status(400)
        .send(
          page(
            "Invalid Server",
            `<h1 class="error">Invalid Discord server.</h1>`
          )
        );
    }

    const member = await getMember(userId);

    if (!member) {
      return res
        .status(403)
        .send(
          page(
            "Not a Member",
            `<h1 class="error">You are not a member of the LAMPOON server.</h1>`
          )
        );
    }

    if (!member.roles.cache.has(TIKTOK_ROLE_ID)) {
      return res
        .status(403)
        .send(
          page(
            "TikTok Role Required",
            `
            <h1 class="error">TikTok Role Required</h1>
            <p>
            You must have the TikTok role before connecting
            your TikTok account.
            </p>
            `
          )
        );
    }

    const url =
      getTikTokAuthorizationURL(
        userId,
        guildId
      );

    return res.redirect(url);

  } catch (error) {
    console.error(
      "❌ /tiktok/connect error:",
      error
    );

    return res
      .status(500)
      .send(
        page(
          "Error",
          `
          <h1 class="error">Something went wrong.</h1>
          <p>${escapeHtml(error.message)}</p>
          `
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
      error_description
    } = req.query;

    if (error) {
      return res
        .status(400)
        .send(
          page(
            "TikTok Authorization Failed",
            `
            <h1 class="error">
              TikTok Authorization Failed
            </h1>

            <p>
            ${escapeHtml(
              error_description ||
              error ||
              "Authorization was cancelled."
            )}
            </p>
            `
          )
        );
    }

    if (!code || !state) {
      return res
        .status(400)
        .send(
          page(
            "Invalid Callback",
            `
            <h1 class="error">
              Invalid TikTok callback.
            </h1>
            `
          )
        );
    }

    const stateData = verifyState(state);

    if (!stateData) {
      return res
        .status(400)
        .send(
          page(
            "Invalid State",
            `
            <h1 class="error">
              The authorization session expired or is invalid.
            </h1>
            `
          )
        );
    }

    const member =
      await getMember(stateData.userId);

    if (!member) {
      return res
        .status(403)
        .send(
          page(
            "Member Not Found",
            `
            <h1 class="error">
              Discord member not found.
            </h1>
            `
          )
        );
    }

    if (!member.roles.cache.has(TIKTOK_ROLE_ID)) {
      return res
        .status(403)
        .send(
          page(
            "TikTok Role Required",
            `
            <h1 class="error">
              TikTok Role Required
            </h1>
            `
          )
        );
    }

    console.log(
      `🔗 TikTok OAuth callback for ${member.user.tag}`
    );

    // --------------------------------------------------------
    // EXCHANGE CODE
    // --------------------------------------------------------

    const tokenData =
      await exchangeTikTokCode(code);

    // --------------------------------------------------------
    // GET USER
    // --------------------------------------------------------

    const profile =
      await getTikTokUserInfo(
        tokenData.access_token
      );

    console.log(
      "TikTok profile:",
      {
        username: profile.username,
        display_name: profile.display_name,
        followers: profile.follower_count,
        following: profile.following_count,
        likes: profile.likes_count,
        videos: profile.video_count
      }
    );

    // --------------------------------------------------------
    // SAVE CONNECTION
    // --------------------------------------------------------

    connections[stateData.userId] = {
      discordUserId: stateData.userId,
      guildId: stateData.guildId,

      openId: profile.open_id || null,
      unionId: profile.union_id || null,

      username: profile.username || "",
      displayName: profile.display_name || "",
      bio: profile.bio_description || "",

      followers: numberValue(
        profile.follower_count
      ),

      following: numberValue(
        profile.following_count
      ),

      likes: numberValue(
        profile.likes_count
      ),

      videos: numberValue(
        profile.video_count
      ),

      avatarUrl: profile.avatar_url || "",

      accessToken:
        tokenData.access_token || "",

      refreshToken:
        tokenData.refresh_token || "",

      expiresIn:
        tokenData.expires_in || null,

      refreshExpiresIn:
        tokenData.refresh_expires_in || null,

      connectedAt:
        new Date().toISOString()
    };

    saveConnections(connections);

    // --------------------------------------------------------
    // CHECK REQUIREMENTS
    // --------------------------------------------------------

    const result =
      checkTikTokRequirements(profile);

    if (!result.eligible) {
      const failed = [];

      if (!result.checks.nameOK) {
        failed.push(
          "TikTok username/display name must contain LMP."
        );
      }

      if (!result.checks.bioOK) {
        failed.push(
          "Bio must contain LMP Members or Lampoon Creator."
        );
      }

      if (!result.checks.followersOK) {
        failed.push(
          `Followers must be at least ${MIN_FOLLOWERS}.`
        );
      }

      if (!result.checks.followingOK) {
        failed.push(
          `Following must be at least ${MIN_FOLLOWING}.`
        );
      }

      if (!result.checks.likesOK) {
        failed.push(
          `Likes must be at least ${formatNumber(MIN_LIKES)}.`
        );
      }

      if (!result.checks.videosOK) {
        failed.push(
          `Videos must be at least ${MIN_VIDEOS}.`
        );
      }

      return res
        .status(403)
        .send(
          page(
            "Not Eligible",
            `
            <h1 class="error">
              ❌ Not Eligible
            </h1>

            <p>
            Your TikTok account is connected, but it does not
            currently meet the LAMPOON requirements.
            </p>

            <div class="stat">
              <strong>TikTok:</strong>
              @${escapeHtml(profile.username || "Unknown")}
              <br><br>

              <strong>Followers:</strong>
              ${formatNumber(profile.follower_count)}
              <br>

              <strong>Following:</strong>
              ${formatNumber(profile.following_count)}
              <br>

              <strong>Likes:</strong>
              ${formatNumber(profile.likes_count)}
              <br>

              <strong>Videos:</strong>
              ${formatNumber(profile.video_count)}
            </div>

            <div class="stat">
              <strong>Requirements not met:</strong>
              <ul>
                ${failed.map(
                  item => `<li>${escapeHtml(item)}</li>`
                ).join("")}
              </ul>
            </div>
            `
          )
        );
    }

    // --------------------------------------------------------
    // APPLY ROLES
    // --------------------------------------------------------

    const roleResult =
      await applyLampoonRoles(
        member,
        profile
      );

    return res
      .status(200)
      .send(
        page(
          "LAMPOON Verified",
          `
          <h1 class="success">
            ✅ LAMPOON Verified
          </h1>

          <p>
          Your TikTok account has passed the LAMPOON
          requirements.
          </p>

          <div class="stat">
            <strong>TikTok:</strong>
            @${escapeHtml(profile.username || "Unknown")}
            <br><br>

            <strong>Followers:</strong>
            ${formatNumber(profile.follower_count)}
            <br>

            <strong>Following:</strong>
            ${formatNumber(profile.following_count)}
            <br>

            <strong>Likes:</strong>
            ${formatNumber(profile.likes_count)}
            <br>

            <strong>Videos:</strong>
            ${formatNumber(profile.video_count)}
          </div>

          <div class="stat">
            <strong>Roles Added:</strong>
            ${
              roleResult.addedRoles.length
                ? roleResult.addedRoles
                    .map(role =>
                      escapeHtml(role.name)
                    )
                    .join(", ")
                : "No new roles"
            }
          </div>

          <p>
          You may now return to Discord.
          </p>
          `
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
        page(
          "Verification Error",
          `
          <h1 class="error">
            ❌ Verification Error
          </h1>

          <p>
          ${escapeHtml(error.message)}
          </p>

          <p>
          Please try connecting your TikTok account again.
          </p>
          `
        )
      );
  }
});

// ============================================================
// DISCORD COMMANDS
// ============================================================

const tiktokCommand =
  new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription(
      "Connect your TikTok account for LAMPOON verification."
    );

const statusCommand =
  new SlashCommandBuilder()
    .setName("tiktokstatus")
    .setDescription(
      "Check your connected TikTok account."
    );

// ============================================================
// DISCORD READY
// ============================================================

client.once("clientReady", async () => {
  console.log("");
  console.log("==============================================");
  console.log("🤖 LAMPOON ROLE MANAGER ONLINE");
  console.log(`Bot: ${client.user.tag}`);
  console.log(`Guild: ${GUILD_ID}`);
  console.log("==============================================");
  console.log("");

  try {
    const guild = await getGuild();

    await guild.commands.set([
      tiktokCommand.toJSON(),
      statusCommand.toJSON()
    ]);

    console.log("✅ Slash commands registered.");

    await ensureRolePermissions(guild);

    console.log(
      "✅ Discord role permissions/hierarchy checked."
    );

  } catch (error) {
    console.error(
      "❌ Startup Discord check failed:",
      error
    );
  }
});

// ============================================================
// SLASH COMMAND INTERACTIONS
// ============================================================

client.on("interactionCreate", async interaction => {
  try {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    // --------------------------------------------------------
    // /tiktok
    // --------------------------------------------------------

    if (interaction.commandName === "tiktok") {
      const member =
        await getMember(interaction.user.id);

      if (!member) {
        return interaction.reply({
          content:
            "❌ You are not a member of the LAMPOON server.",
          ephemeral: true
        });
      }

      if (!member.roles.cache.has(TIKTOK_ROLE_ID)) {
        return interaction.reply({
          content:
            "❌ You need the TikTok role before connecting your TikTok account.",
          ephemeral: true
        });
      }

      const connectURL =
        getTikTokAuthorizationURL(
          interaction.user.id,
          GUILD_ID
        );

      const button =
        new ButtonBuilder()
          .setLabel("Connect TikTok")
          .setStyle(ButtonStyle.Link)
          .setURL(connectURL)
          .setEmoji("🎵");

      const row =
        new ActionRowBuilder()
          .addComponents(button);

      const embed =
        new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle("🎵 LAMPOON TikTok Verification")
          .setDescription(
            "Connect your TikTok account to check your LAMPOON eligibility.\n\n" +
            "**Requirements:**\n" +
            "• TikTok username/display name contains `LMP`\n" +
            "• Bio contains `LMP Members` or `Lampoon Creator`\n" +
            "• 300+ followers\n" +
            "• 50+ following\n" +
            "• 1,000+ likes\n" +
            "• 15+ videos"
          )
          .setFooter({
            text:
              "LAMPOON HOK Satire Creator Clan | Est. 2026"
          });

      return interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
      });
    }

    // --------------------------------------------------------
    // /tiktokstatus
    // --------------------------------------------------------

    if (
      interaction.commandName ===
      "tiktokstatus"
    ) {
      const connection =
        connections[interaction.user.id];

      if (!connection) {
        return interaction.reply({
          content:
            "❌ You do not have a TikTok account connected.",
          ephemeral: true
        });
      }

      const embed =
        new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle("🎵 TikTok Connection")
          .addFields(
            {
              name: "Username",
              value:
                connection.username
                  ? `@${connection.username}`
                  : "Unknown",
              inline: true
            },
            {
              name: "Followers",
              value:
                formatNumber(
                  connection.followers
                ),
              inline: true
            },
            {
              name: "Following",
              value:
                formatNumber(
                  connection.following
                ),
              inline: true
            },
            {
              name: "Likes",
              value:
                formatNumber(
                  connection.likes
                ),
              inline: true
            },
            {
              name: "Videos",
              value:
                formatNumber(
                  connection.videos
                ),
              inline: true
            },
            {
              name: "Connected",
              value:
                connection.connectedAt
                  ? `<t:${Math.floor(
                      new Date(
                        connection.connectedAt
                      ).getTime() / 1000
                    )}:F>`
                  : "Unknown"
            }
          )
          .setFooter({
            text:
              "LAMPOON Role Manager"
          })
          .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

  } catch (error) {
    console.error(
      "❌ Interaction error:",
      error
    );

    if (!interaction.replied) {
      await interaction.reply({
        content:
          "❌ An unexpected error occurred.",
        ephemeral: true
      });
    }
  }
});

// ============================================================
// DISCORD ERROR HANDLERS
// ============================================================

client.on("error", error => {
  console.error(
    "❌ Discord client error:",
    error
  );
});

process.on("unhandledRejection", error => {
  console.error(
    "❌ Unhandled promise rejection:",
    error
  );
});

process.on("uncaughtException", error => {
  console.error(
    "❌ Uncaught exception:",
    error
  );
});

// ============================================================
// START
// ============================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🌐 Web server running on port ${PORT}`
  );

  console.log(
    `🔗 Base URL: ${BASE_URL}`
  );

  console.log(
    `❤️ Health: ${BASE_URL}/health`
  );
});

client.login(DISCORD_TOKEN);
