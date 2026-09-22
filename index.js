require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  AttachmentBuilder
} = require("discord.js");

/* =========================================================
   CONFIGURATION
========================================================= */

const PORT = Number(process.env.PORT) || 10000;

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

const BASE_URL =
  (process.env.BASE_URL || "https://rolelogic-manager.onrender.com")
    .replace(/\/+$/, "");

const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

const GUILD_ID =
  process.env.GUILD_ID || "1512880537734480022";

const TIKTOK_ROLE_ID =
  process.env.TIKTOK_ROLE_ID || "";

const LAMPOON_ROLE_ID =
  process.env.LAMPOON_ROLE_ID || "";

const CONTENT_CREATOR_ROLE_ID =
  process.env.CONTENT_CREATOR_ROLE_ID || "";

const FOLLOWERS_ROLE_ID =
  process.env.FOLLOWERS_ROLE_ID || "";

const LOG_CHANNEL_ID =
  process.env.LOG_CHANNEL_ID || "";

const LMP_TAG_CHANNEL_ID =
  process.env.LMP_TAG_CHANNEL_ID ||
  "1539643480714903602";

/* =========================================================
   TIKTOK REQUIREMENTS
========================================================= */

const MIN_FOLLOWERS = 300;
const MIN_FOLLOWING = 50;
const MIN_LIKES = 1000;
const MIN_VIDEOS = 15;

/* =========================================================
   EXPRESS
========================================================= */

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* =========================================================
   PUBLIC / TIKTOK VERIFICATION FILES
========================================================= */

const PUBLIC_DIR = path.join(__dirname, "public");
const TERMS_DIR = path.join(PUBLIC_DIR, "terms");

fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(TERMS_DIR, { recursive: true });

const TERMS_FILE =
  "tiktok9IiFeykTYArFq6Memo5EBMkFcKR7zZjQ.txt";

const TERMS_SIGNATURE =
  "tiktok-developers-site-verification=9IiFeykTYArFq6Memo5EBMkFcKR7zZjQ";

fs.writeFileSync(
  path.join(TERMS_DIR, TERMS_FILE),
  TERMS_SIGNATURE,
  "utf8"
);

const WEB_FILE =
  "tiktokd2DgssM9DaqXnfoxgQ5SPpq2oyzLs2ED.txt";

const WEB_SIGNATURE =
  "tiktok-developers-site-verification=d2DgssM9DaqXnfoxgQ5SPpq2oyzLs2ED";

fs.writeFileSync(
  path.join(PUBLIC_DIR, WEB_FILE),
  WEB_SIGNATURE,
  "utf8"
);

app.use(express.static(PUBLIC_DIR));

/* =========================================================
   DATA STORAGE
========================================================= */

const DATA_DIR = path.join(__dirname, "data");
const CONNECTIONS_FILE =
  path.join(DATA_DIR, "tiktok-connections.json");

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

/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function containsLMP(value) {
  return normalize(value).includes("lmp");
}

function validBio(bio) {
  const text = normalize(bio);

  return (
    text.includes("lmp members") ||
    text.includes("lampoon creator")
  );
}

function numberValue(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return numberValue(value).toLocaleString("en-US");
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });
}

/* =========================================================
   TIKTOK ELIGIBILITY
========================================================= */

function checkTikTokRequirements(user) {
  const username =
    user.username ||
    user.display_name ||
    "";

  const displayName =
    user.display_name ||
    "";

  const bio =
    user.bio_description ||
    "";

  const followers =
    numberValue(user.follower_count);

  const following =
    numberValue(user.following_count);

  const likes =
    numberValue(user.likes_count);

  const videos =
    numberValue(user.video_count);

  return {
    username:
      containsLMP(username) ||
      containsLMP(displayName),

    bio: validBio(bio),

    followers:
      followers >= MIN_FOLLOWERS,

    following:
      following >= MIN_FOLLOWING,

    likes:
      likes >= MIN_LIKES,

    videos:
      videos >= MIN_VIDEOS,

    values: {
      username,
      displayName,
      bio,
      followers,
      following,
      likes,
      videos
    }
  };
}

function isEligible(user) {
  const requirements =
    checkTikTokRequirements(user);

  return (
    requirements.username &&
    requirements.bio &&
    requirements.followers &&
    requirements.following &&
    requirements.likes &&
    requirements.videos
  );
}

/* =========================================================
   OAUTH STATE
========================================================= */

function createOAuthState(userId) {
  const timestamp = Date.now();

  const payload = `${userId}:${timestamp}`;

  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");

  return Buffer.from(
    `${payload}:${signature}`
  ).toString("base64url");
}

function verifyOAuthState(state) {
  try {
    const decoded =
      Buffer.from(state, "base64url")
        .toString("utf8");

    const parts = decoded.split(":");

    if (parts.length !== 3) {
      return null;
    }

    const userId = parts[0];
    const timestamp = Number(parts[1]);
    const receivedSignature = parts[2];

    if (!userId || !timestamp || !receivedSignature) {
      return null;
    }

    const age = Date.now() - timestamp;

    if (age < 0 || age > 10 * 60 * 1000) {
      return null;
    }

    const payload =
      `${userId}:${timestamp}`;

    const expectedSignature =
      crypto
        .createHmac("sha256", SESSION_SECRET)
        .update(payload)
        .digest("hex");

    const receivedBuffer =
      Buffer.from(receivedSignature);

    const expectedBuffer =
      Buffer.from(expectedSignature);

    if (
      receivedBuffer.length !==
      expectedBuffer.length
    ) {
      return null;
    }

    if (
      !crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      return null;
    }

    return userId;
  } catch (error) {
    console.error("OAuth state verification error:", error);
    return null;
  }
}

/* =========================================================
   DISCORD CLIENT
========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

/* =========================================================
   DISCORD HELPERS
========================================================= */

async function getGuild() {
  try {
    return await client.guilds.fetch(GUILD_ID);
  } catch (error) {
    console.error("Unable to fetch guild:", error);
    return null;
  }
}

async function getMember(userId) {
  try {
    const guild = await getGuild();

    if (!guild) {
      return null;
    }

    return await guild.members.fetch(userId);
  } catch (error) {
    console.error(
      `Unable to fetch member ${userId}:`,
      error
    );

    return null;
  }
}

async function getRole(roleId) {
  try {
    if (!roleId) {
      return null;
    }

    const guild = await getGuild();

    if (!guild) {
      return null;
    }

    return await guild.roles.fetch(roleId);
  } catch (error) {
    console.error(
      `Unable to fetch role ${roleId}:`,
      error
    );

    return null;
  }
}

function canManageRole(role) {
  if (!role) {
    return false;
  }

  return role.editable;
}

/* =========================================================
   APPLY ELIGIBILITY ROLES
========================================================= */

async function applyEligibilityRoles(userId) {
  const member = await getMember(userId);

  if (!member) {
    return {
      success: false,
      reason: "Discord member not found.",
      addedRoles: [],
      removedRoles: []
    };
  }

  const addedRoles = [];
  const removedRoles = [];

  /* ---------------------------------------------
     LAMPOON ROLE
  --------------------------------------------- */

  if (
    LAMPOON_ROLE_ID &&
    !member.roles.cache.has(LAMPOON_ROLE_ID)
  ) {
    const role = await getRole(LAMPOON_ROLE_ID);

    if (role && canManageRole(role)) {
      try {
        await member.roles.add(
          role,
          "TikTok eligibility verification"
        );

        addedRoles.push(role);
      } catch (error) {
        console.error(
          "Failed to add Lampoon role:",
          error
        );
      }
    } else {
      console.error(
        "Lampoon role cannot be managed. Check bot role hierarchy."
      );
    }
  }

  /* ---------------------------------------------
     CONTENT CREATOR ROLE
  --------------------------------------------- */

  if (
    CONTENT_CREATOR_ROLE_ID &&
    !member.roles.cache.has(CONTENT_CREATOR_ROLE_ID)
  ) {
    const role =
      await getRole(CONTENT_CREATOR_ROLE_ID);

    if (role && canManageRole(role)) {
      try {
        await member.roles.add(
          role,
          "TikTok eligibility verification"
        );

        addedRoles.push(role);
      } catch (error) {
        console.error(
          "Failed to add Content Creator role:",
          error
        );
      }
    } else {
      console.error(
        "Content Creator role cannot be managed."
      );
    }
  }

  /* ---------------------------------------------
     REMOVE FOLLOWERS ROLE
  --------------------------------------------- */

  if (
    FOLLOWERS_ROLE_ID &&
    member.roles.cache.has(FOLLOWERS_ROLE_ID)
  ) {
    const role =
      await getRole(FOLLOWERS_ROLE_ID);

    if (role && canManageRole(role)) {
      try {
        await member.roles.remove(
          role,
          "TikTok eligibility verification"
        );

        removedRoles.push(role);
      } catch (error) {
        console.error(
          "Failed to remove Followers role:",
          error
        );
      }
    } else {
      console.error(
        "Followers role cannot be managed."
      );
    }
  }

  return {
    success: true,
    member,
    addedRoles,
    removedRoles
  };
}

/* =========================================================
   SVG BANNER
========================================================= */

function createBannerSVG({
  username,
  followers,
  avatarUrl,
  displayName
}) {
  const safeUsername =
    escapeHtml(username || "TikTok User");

  const safeDisplayName =
    escapeHtml(displayName || username || "LAMPOON");

  const safeFollowers =
    escapeHtml(formatNumber(followers));

  const safeAvatar =
    escapeHtml(
      avatarUrl ||
      "https://cdn.discordapp.com/embed/avatars/0.png"
    );

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
      <stop offset="50%" stop-color="#262626"/>
      <stop offset="100%" stop-color="#090909"/>

    </linearGradient>

    <linearGradient
      id="gold"
      x1="0"
      y1="0"
      x2="1"
      y2="1">

      <stop offset="0%" stop-color="#5F3203"/>
      <stop offset="25%" stop-color="#C48D21"/>
      <stop offset="50%" stop-color="#F8D85C"/>
      <stop offset="70%" stop-color="#D9A52E"/>
      <stop offset="100%" stop-color="#5F3203"/>

    </linearGradient>

    <clipPath id="avatarClip">
      <circle cx="175" cy="210" r="110"/>
    </clipPath>
  </defs>

  <rect
    width="1200"
    height="420"
    rx="28"
    fill="url(#bg)"
  />

  <rect
    x="8"
    y="8"
    width="1184"
    height="404"
    rx="22"
    fill="none"
    stroke="url(#gold)"
    stroke-width="8"
  />

  <circle
    cx="175"
    cy="210"
    r="118"
    fill="#000000"
    stroke="url(#gold)"
    stroke-width="8"
  />

  <image
    href="${safeAvatar}"
    x="65"
    y="100"
    width="220"
    height="220"
    preserveAspectRatio="xMidYMid slice"
    clip-path="url(#avatarClip)"
  />

  <text
    x="330"
    y="105"
    font-family="Arial, Helvetica, sans-serif"
    font-size="38"
    font-weight="700"
    fill="#F8D85C">
    LAMPOON
  </text>

  <text
    x="330"
    y="155"
    font-family="Arial, Helvetica, sans-serif"
    font-size="28"
    font-weight="700"
    fill="#FFFFFF">
    LAMPOON MEMBERS
  </text>

  <text
    x="330"
    y="215"
    font-family="Arial, Helvetica, sans-serif"
    font-size="34"
    font-weight="700"
    fill="#FFFFFF">
    @${safeUsername}
  </text>

  <text
    x="330"
    y="265"
    font-family="Arial, Helvetica, sans-serif"
    font-size="25"
    fill="#D9D9D9">
    ${safeDisplayName}
  </text>

  <text
    x="330"
    y="330"
    font-family="Arial, Helvetica, sans-serif"
    font-size="31"
    font-weight="700"
    fill="#F8D85C">
    ${safeFollowers} Followers
  </text>

  <text
    x="330"
    y="370"
    font-family="Arial, Helvetica, sans-serif"
    font-size="21"
    fill="#AAAAAA">
    TikTok Creator Verification
  </text>

</svg>
`;
}

/* =========================================================
   SEND ELIGIBILITY LOG
========================================================= */

async function sendEligibilityLog({
  userId,
  member,
  tiktokUser,
  addedRoles,
  removedRoles
}) {
  if (!LOG_CHANNEL_ID) {
    console.log(
      "LOG_CHANNEL_ID is not configured."
    );

    return;
  }

  if (
    !addedRoles ||
    addedRoles.length === 0
  ) {
    return;
  }

  try {
    const channel =
      await client.channels.fetch(LOG_CHANNEL_ID);

    if (!channel || !channel.isTextBased()) {
      console.error(
        "Eligibility log channel is not a text channel."
      );

      return;
    }

    const nickname =
      member.nickname ||
      member.user.globalName ||
      member.user.username;

    const serverName =
      member.guild.name;

    const addedMentions =
      addedRoles
        .map(role => `<@&${role.id}>`)
        .join(" ");

    const removedNames =
      removedRoles.length
        ? removedRoles
            .map(role => role.name)
            .join(", ")
        : "None";

    const joinedDate =
      formatDate();

    const joinedTime =
      formatTime();

    const tiktokUsername =
      tiktokUser.username ||
      tiktokUser.display_name ||
      "Unknown";

    const followers =
      numberValue(
        tiktokUser.follower_count
      );

    const avatarUrl =
      tiktokUser.avatar_url ||
      member.user.displayAvatarURL({
        extension: "png",
        size: 512
      });

    const embed =
      new EmbedBuilder()
        .setColor("#C48D21")
        .setDescription(
`<a:Avisala:1542448826265243660> **Avisala, ${member}!**

**${escapeHtml(nickname)}** is now officially recognized as a **𝗟𝗔𝗠𝗣𝗢𝗢𝗡** member on **${escapeHtml(serverName)}**.

🏷️ **Member Role**
${addedMentions}

🔄 **Previous Role**
${escapeHtml(removedNames)}

📌 **LMP Tag**
Check out <#${LMP_TAG_CHANNEL_ID}> to request your nickname with the LMP tag.

**TikTok:** [@${escapeHtml(tiktokUsername)}](https://www.tiktok.com/@${encodeURIComponent(tiktokUsername)})

**Followers:** ${formatNumber(followers)}

📅 **Joined/Updated:** ${joinedDate}
⏰ ${joinedTime}

━━━━━━━━━━━━━━━━━━`
        )
        .setFooter({
          text:
            "🎭 𝗟𝗔𝗠𝗣𝗢𝗢N HOK Satire Creator Clan | Est. 2026"
        })
        .setThumbnail(
          member.user.displayAvatarURL({
            extension: "png",
            size: 512
          })
        );

    const banner =
      createBannerSVG({
        username: tiktokUsername,
        followers,
        avatarUrl:
          member.user.displayAvatarURL({
            extension: "png",
            size: 512
          }),
        displayName:
          nickname
      });

    const bannerPath =
      path.join(
        DATA_DIR,
        `lampoon-${userId}-${Date.now()}.svg`
      );

    fs.writeFileSync(
      bannerPath,
      banner,
      "utf8"
    );

    const attachment =
      new AttachmentBuilder(
        bannerPath,
        {
          name: "lampoon-members.svg"
        }
      );

    await channel.send({
      embeds: [embed],
      files: [attachment]
    });

    setTimeout(() => {
      try {
        if (fs.existsSync(bannerPath)) {
          fs.unlinkSync(bannerPath);
        }
      } catch (error) {
        console.error(
          "Failed to delete temporary banner:",
          error
        );
      }
    }, 60 * 1000);

  } catch (error) {
    console.error(
      "Failed to send eligibility log:",
      error
    );
  }
}

/* =========================================================
   WEBSITE
========================================================= */

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>LAMPOON TikTok Integration</title>

  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background:
        linear-gradient(
          135deg,
          #080808,
          #202020
        );
      color: white;
      font-family: Arial, sans-serif;
    }

    .box {
      max-width: 700px;
      margin: 30px;
      padding: 40px;
      border-radius: 20px;
      background: #151515;
      border: 2px solid #C48D21;
      box-shadow:
        0 0 40px rgba(196,141,33,.2);
      text-align: center;
    }

    h1 {
      color: #F8D85C;
    }

    a {
      color: #F8D85C;
      text-decoration: none;
    }

    .links {
      margin-top: 30px;
      display: flex;
      gap: 20px;
      justify-content: center;
    }
  </style>
</head>

<body>

  <div class="box">

    <h1>🎭 LAMPOON TikTok Integration</h1>

    <p>
      This service connects TikTok accounts
      with the LAMPOON Discord creator verification
      system.
    </p>

    <p>
      TikTok verification is available through
      the Discord <strong>/tiktok</strong> command.
    </p>

    <div class="links">
      <a href="/terms/">Terms of Service</a>
      <a href="/privacy/">Privacy Policy</a>
    </div>

  </div>

</body>
</html>
  `);
});

/* =========================================================
   HEALTH
========================================================= */

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/* =========================================================
   TERMS
========================================================= */

app.get("/terms", (req, res) => {
  res.redirect("/terms/");
});

app.get("/terms/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Terms of Service - LAMPOON</title>

  <style>
    body {
      background: #111;
      color: #eee;
      font-family: Arial, sans-serif;
      line-height: 1.7;
      padding: 40px;
    }

    main {
      max-width: 900px;
      margin: auto;
    }

    h1, h2 {
      color: #F8D85C;
    }

    a {
      color: #F8D85C;
    }
  </style>
</head>

<body>

<main>

<h1>LAMPOON TikTok Integration — Terms of Service</h1>

<p>
Last updated: September 2026
</p>

<h2>1. Service</h2>

<p>
LAMPOON TikTok Integration is a Discord community
verification service that allows eligible Discord
members to connect a TikTok account for creator
verification.
</p>

<h2>2. Eligibility</h2>

<p>
The Discord member must already have the configured
TikTok role before using the verification system.
</p>

<p>
The system checks publicly available or
TikTok-authorized information against the
LAMPOON community requirements.
</p>

<h2>3. Verification Requirements</h2>

<ul>
  <li>TikTok username or display name contains LMP.</li>
  <li>Bio contains LMP Members or Lampoon Creator.</li>
  <li>At least 300 followers.</li>
  <li>At least 50 following.</li>
  <li>At least 1,000 likes.</li>
  <li>At least 15 videos.</li>
</ul>

<h2>4. Discord Roles</h2>

<p>
If the requirements are satisfied, the Discord bot
may assign the configured LAMPOON and Content Creator
roles and remove the configured Followers role.
</p>

<h2>5. TikTok Account</h2>

<p>
This integration does not post videos, modify videos,
send messages, or modify the user's TikTok account.
</p>

<h2>6. Changes</h2>

<p>
The LAMPOON community may update its verification
requirements or role configuration.
</p>

<h2>7. Contact</h2>

<p>
For questions about this service, contact the
LAMPOON server administration.
</p>

</main>

</body>
</html>
  `);
});

/* =========================================================
   PRIVACY
========================================================= */

app.get("/privacy", (req, res) => {
  res.redirect("/privacy/");
});

app.get("/privacy/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Privacy Policy - LAMPOON</title>

  <style>
    body {
      background: #111;
      color: #eee;
      font-family: Arial, sans-serif;
      line-height: 1.7;
      padding: 40px;
    }

    main {
      max-width: 900px;
      margin: auto;
    }

    h1, h2 {
      color: #F8D85C;
    }
  </style>
</head>

<body>

<main>

<h1>LAMPOON TikTok Integration — Privacy Policy</h1>

<p>
Last updated: September 2026
</p>

<h2>1. Information Collected</h2>

<p>
When a user authorizes TikTok, the application may
receive approved TikTok profile and statistics
information including:
</p>

<ul>
  <li>TikTok username</li>
  <li>Display name</li>
  <li>Biography</li>
  <li>Profile avatar</li>
  <li>Follower count</li>
  <li>Following count</li>
  <li>Likes count</li>
  <li>Video count</li>
</ul>

<h2>2. Purpose</h2>

<p>
The information is used to determine whether the
connected TikTok account meets LAMPOON's Discord
creator eligibility requirements.
</p>

<h2>3. Discord Role Management</h2>

<p>
When the requirements are satisfied, the application
may assign configured Discord roles and remove the
configured Followers role.
</p>

<h2>4. TikTok Account</h2>

<p>
The application does not post to TikTok or modify the
user's TikTok account.
</p>

<h2>5. Data Storage</h2>

<p>
The service stores the TikTok connection information
needed for the Discord verification workflow.
</p>

<h2>6. Security</h2>

<p>
Reasonable technical measures are used to protect
application data. Users should not share their TikTok
credentials directly with this application.
</p>

<h2>7. Contact</h2>

<p>
For privacy questions, contact the LAMPOON server
administration.
</p>

</main>

</body>
</html>
  `);
});

/* =========================================================
   TIKTOK CONNECT
========================================================= */

app.get("/tiktok/connect", async (req, res) => {
  try {
    const userId =
      String(req.query.user_id || "");

    if (!userId) {
      return res.status(400).send(
        "Missing Discord user ID."
      );
    }

    if (
      !TIKTOK_CLIENT_KEY ||
      !TIKTOK_CLIENT_SECRET
    ) {
      return res.status(500).send(
        "TikTok integration is not configured."
      );
    }

    const member =
      await getMember(userId);

    if (!member) {
      return res.status(404).send(
        "Discord member not found."
      );
    }

    if (
      TIKTOK_ROLE_ID &&
      !member.roles.cache.has(TIKTOK_ROLE_ID)
    ) {
      return res.status(403).send(`
        <h1>Not eligible to start</h1>
        <p>
          You must have the TikTok role in the
          LAMPOON Discord server before connecting
          your account.
        </p>
      `);
    }

    const state =
      createOAuthState(userId);

    const redirectUri =
      `${BASE_URL}/tiktok/callback`;

    const scopes =
      "user.info.basic,user.info.profile,user.info.stats";

    const authorizeUrl =
      "https://www.tiktok.com/v2/auth/authorize/?" +
      new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        response_type: "code",
        scope: scopes,
        redirect_uri: redirectUri,
        state
      }).toString();

    return res.redirect(authorizeUrl);

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

/* =========================================================
   TIKTOK CALLBACK
========================================================= */

app.get("/tiktok/callback", async (req, res) => {
  try {
    const {
      code,
      state,
      error,
      error_description
    } = req.query;

    if (error) {
      return res.status(400).send(`
        <h1>TikTok Authorization Cancelled</h1>
        <p>${escapeHtml(
          error_description || error
        )}</p>
      `);
    }

    if (!code || !state) {
      return res.status(400).send(
        "Missing TikTok authorization data."
      );
    }

    const userId =
      verifyOAuthState(String(state));

    if (!userId) {
      return res.status(400).send(`
        <h1>Invalid or expired session</h1>
        <p>
          Please return to Discord and start
          the TikTok verification again.
        </p>
      `);
    }

    /* ---------------------------------------------
       EXCHANGE CODE FOR USER TOKEN
    --------------------------------------------- */

    const tokenResponse =
      await fetch(
        "https://open.tiktokapis.com/v2/oauth/token/",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          },
          body:
            new URLSearchParams({
              client_key:
                TIKTOK_CLIENT_KEY,

              client_secret:
                TIKTOK_CLIENT_SECRET,

              code:
                String(code),

              grant_type:
                "authorization_code",

              redirect_uri:
                `${BASE_URL}/tiktok/callback`
            }).toString()
        }
      );

    const tokenText =
      await tokenResponse.text();

    let tokenData;

    try {
      tokenData =
        JSON.parse(tokenText);
    } catch {
      console.error(
        "Invalid TikTok token response:",
        tokenText
      );

      return res.status(502).send(
        "TikTok returned an invalid token response."
      );
    }

    if (
      !tokenResponse.ok ||
      !tokenData.access_token
    ) {
      console.error(
        "TikTok token exchange failed:",
        tokenData
      );

      return res.status(400).send(`
        <h1>TikTok connection failed</h1>
        <p>
          TikTok could not authorize the account.
          Please try again.
        </p>
      `);
    }

    const accessToken =
      tokenData.access_token;

    /* ---------------------------------------------
       GET TIKTOK USER INFO
    --------------------------------------------- */

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

    const userInfoResponse =
      await fetch(
        `https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(fields)}`,
        {
          method: "GET",
          headers: {
            Authorization:
              `Bearer ${accessToken}`
          }
        }
      );

    const userInfoText =
      await userInfoResponse.text();

    let userInfoData;

    try {
      userInfoData =
        JSON.parse(userInfoText);
    } catch {
      console.error(
        "Invalid TikTok user response:",
        userInfoText
      );

      return res.status(502).send(
        "TikTok returned invalid profile data."
      );
    }

    if (
      !userInfoResponse.ok ||
      !userInfoData.data ||
      !userInfoData.data.user
    ) {
      console.error(
        "TikTok user info failed:",
        userInfoData
      );

      return res.status(400).send(`
        <h1>Unable to retrieve TikTok profile</h1>
        <p>
          TikTok did not return the required
          profile information.
        </p>
      `);
    }

    const tiktokUser =
      userInfoData.data.user;

    /* ---------------------------------------------
       CHECK REQUIREMENTS
    --------------------------------------------- */

    const requirements =
      checkTikTokRequirements(
        tiktokUser
      );

    const eligible =
      isEligible(tiktokUser);

    /* ---------------------------------------------
       SAVE CONNECTION
    --------------------------------------------- */

    connections[userId] = {
      open_id:
        tiktokUser.open_id || null,

      union_id:
        tiktokUser.union_id || null,

      username:
        tiktokUser.username || "",

      display_name:
        tiktokUser.display_name || "",

      bio_description:
        tiktokUser.bio_description || "",

      avatar_url:
        tiktokUser.avatar_url || "",

      follower_count:
        numberValue(
          tiktokUser.follower_count
        ),

      following_count:
        numberValue(
          tiktokUser.following_count
        ),

      likes_count:
        numberValue(
          tiktokUser.likes_count
        ),

      video_count:
        numberValue(
          tiktokUser.video_count
        ),

      access_token:
        accessToken,

      refresh_token:
        tokenData.refresh_token || null,

      expires_in:
        tokenData.expires_in || null,

      connected_at:
        new Date().toISOString(),

      eligible
    };

    saveConnections(connections);

    /* ---------------------------------------------
       APPLY DISCORD ROLES
    --------------------------------------------- */

    let roleResult = {
      success: false,
      addedRoles: [],
      removedRoles: []
    };

    if (eligible) {
      roleResult =
        await applyEligibilityRoles(
          userId
        );

      if (
        roleResult.success &&
        roleResult.addedRoles.length > 0
      ) {
        await sendEligibilityLog({
          userId,
          member:
            roleResult.member,
          tiktokUser,
          addedRoles:
            roleResult.addedRoles,
          removedRoles:
            roleResult.removedRoles
        });
      }
    }

    /* ---------------------------------------------
       SUCCESS PAGE
    --------------------------------------------- */

    const requirementRows = `
      <tr>
        <td>TikTok username/display name contains LMP</td>
        <td>${requirements.username ? "✅" : "❌"}</td>
      </tr>

      <tr>
        <td>Bio contains LMP Members or Lampoon Creator</td>
        <td>${requirements.bio ? "✅" : "❌"}</td>
      </tr>

      <tr>
        <td>Followers ≥ ${MIN_FOLLOWERS}</td>
        <td>${requirements.followers ? "✅" : "❌"}
          (${formatNumber(requirements.values.followers)})
        </td>
      </tr>

      <tr>
        <td>Following ≥ ${MIN_FOLLOWING}</td>
        <td>${requirements.following ? "✅" : "❌"}
          (${formatNumber(requirements.values.following)})
        </td>
      </tr>

      <tr>
        <td>Likes ≥ ${formatNumber(MIN_LIKES)}</td>
        <td>${requirements.likes ? "✅" : "❌"}
          (${formatNumber(requirements.values.likes)})
        </td>
      </tr>

      <tr>
        <td>Videos ≥ ${MIN_VIDEOS}</td>
        <td>${requirements.videos ? "✅" : "❌"}
          (${formatNumber(requirements.values.videos)})
        </td>
      </tr>
    `;

    const roleMessage =
      eligible
        ? (
          roleResult.addedRoles.length > 0
            ? "Your Discord roles have been updated."
            : "You are eligible. Your required Discord roles are already assigned."
        )
        : "You do not currently meet all LAMPOON requirements.";

    return res.send(`
<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8">

<title>
LAMPOON TikTok Verification
</title>

<style>

body {
  margin: 0;
  min-height: 100vh;
  background:
    linear-gradient(
      135deg,
      #070707,
      #202020
    );

  color: white;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  display: flex;
  justify-content: center;
  align-items: center;
}

.box {
  width: min(850px, calc(100% - 40px));

  margin: 30px;

  padding: 35px;

  background: #151515;

  border:
    2px solid
    #C48D21;

  border-radius: 22px;

  box-shadow:
    0 0 50px
    rgba(196,141,33,.25);
}

h1 {
  color: #F8D85C;
}

.success {
  color: #7CFF8B;
  font-size: 20px;
  font-weight: bold;
}

.failed {
  color: #FF7777;
  font-size: 20px;
  font-weight: bold;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 25px;
}

td {
  border-bottom:
    1px solid #333;

  padding: 13px;
}

button {
  margin-top: 25px;
  padding: 13px 25px;

  background: #C48D21;
  color: #111;

  border: none;
  border-radius: 10px;

  font-weight: bold;
}

</style>

</head>

<body>

<div class="box">

<h1>
🎭 LAMPOON TikTok Verification
</h1>

<p>
Connected TikTok:
<strong>
@${escapeHtml(
  tiktokUser.username ||
  tiktokUser.display_name ||
  "Unknown"
)}
</strong>
</p>

<p>
${eligible
  ? '<span class="success">✅ ELIGIBLE</span>'
  : '<span class="failed">❌ NOT ELIGIBLE</span>'
}
</p>

<p>
${roleMessage}
</p>

<table>
${requirementRows}
</table>

<p>
You may now return to Discord.
</p>

</div>

</body>
</html>
    `);

  } catch (error) {
    console.error(
      "TikTok callback error:",
      error
    );

    return res.status(500).send(`
      <h1>TikTok verification error</h1>

      <p>
        An unexpected error occurred while
        processing your TikTok verification.
      </p>

      <p>
        Please return to Discord and try again.
      </p>
    `);
  }
});

/* =========================================================
   SLASH COMMANDS
========================================================= */

const tiktokCommand =
  new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription(
      "Connect your TikTok account for LAMPOON verification."
    );

const tiktokStatusCommand =
  new SlashCommandBuilder()
    .setName("tiktokstatus")
    .setDescription(
      "View your TikTok verification status."
    );

/* =========================================================
   DISCORD READY
========================================================= */

client.once("ready", async () => {
  console.log(
    `Discord bot online as ${client.user.tag}`
  );

  console.log(
    `Guild ID: ${GUILD_ID}`
  );

  try {
    const guild =
      await client.guilds.fetch(GUILD_ID);

    const commands = [
      tiktokCommand.toJSON(),
      tiktokStatusCommand.toJSON()
    ];

    await guild.commands.set(commands);

    console.log(
      `Registered ${commands.length} slash commands in ${guild.name}.`
    );
  } catch (error) {
    console.error(
      "Failed to register slash commands:",
      error
    );
  }

  /* ---------------------------------------------
     ROLE HIERARCHY CHECK
  --------------------------------------------- */

  try {
    const roles = [
      {
        name: "TikTok",
        id: TIKTOK_ROLE_ID
      },
      {
        name: "LAMPOON",
        id: LAMPOON_ROLE_ID
      },
      {
        name: "Content Creator",
        id: CONTENT_CREATOR_ROLE_ID
      },
      {
        name: "Followers",
        id: FOLLOWERS_ROLE_ID
      }
    ];

    for (const item of roles) {
      if (!item.id) {
        console.log(
          `${item.name}: NOT CONFIGURED`
        );

        continue;
      }

      const role =
        await guild.roles.fetch(item.id);

      if (!role) {
        console.log(
          `${item.name}: ROLE NOT FOUND`
        );

        continue;
      }

      console.log(
        `${item.name}: ${role.name} (${role.id}) editable=${role.editable}`
      );
    }
  } catch (error) {
    console.error(
      "Role hierarchy check failed:",
      error
    );
  }
});

/* =========================================================
   SLASH COMMAND INTERACTIONS
========================================================= */

client.on(
  "interactionCreate",
  async interaction => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    /* ---------------------------------------------
       /tiktok
    --------------------------------------------- */

    if (
      interaction.commandName === "tiktok"
    ) {
      try {
        const member =
          await getMember(
            interaction.user.id
          );

        if (!member) {
          return interaction.reply({
            content:
              "❌ I could not find you in the LAMPOON server.",
            ephemeral: true
          });
        }

        if (
          TIKTOK_ROLE_ID &&
          !member.roles.cache.has(
            TIKTOK_ROLE_ID
          )
        ) {
          return interaction.reply({
            content:
              "❌ You need the **TikTok** role before you can connect your TikTok account.",
            ephemeral: true
          });
        }

        const connectUrl =
          `${BASE_URL}/tiktok/connect?user_id=${encodeURIComponent(
            interaction.user.id
          )}`;

        const embed =
          new EmbedBuilder()
            .setColor("#C48D21")
            .setTitle(
              "🎭 LAMPOON TikTok Verification"
            )
            .setDescription(
`Connect your TikTok account to check your eligibility for the **LAMPOON** creator system.

**Requirements**

> • TikTok username/display name contains **LMP**
> • Bio contains **LMP Members** or **Lampoon Creator**
> • **300+** followers
> • **50+** following
> • **1,000+** likes
> • **15+** videos

No maximum limits are used.

Click the button below to connect your TikTok account.`
            )
            .setFooter({
              text:
                "LAMPOON HOK Satire Creator Clan | Est. 2026"
            });

        const row =
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setLabel(
                  "Connect TikTok"
                )
                .setStyle(
                  ButtonStyle.Link
                )
                .setURL(connectUrl)
            );

        return interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true
        });

      } catch (error) {
        console.error(
          "/tiktok command error:",
          error
        );

        if (!interaction.replied) {
          return interaction.reply({
            content:
              "❌ An error occurred while creating the TikTok connection.",
            ephemeral: true
          });
        }
      }
    }

    /* ---------------------------------------------
       /tiktokstatus
    --------------------------------------------- */

    if (
      interaction.commandName ===
      "tiktokstatus"
    ) {
      try {
        const saved =
          connections[
            interaction.user.id
          ];

        if (!saved) {
          return interaction.reply({
            content:
              "❌ You do not have a connected TikTok account yet. Use `/tiktok` first.",
            ephemeral: true
          });
        }

        const requirements =
          checkTikTokRequirements({
            username:
              saved.username,

            display_name:
              saved.display_name,

            bio_description:
              saved.bio_description,

            follower_count:
              saved.follower_count,

            following_count:
              saved.following_count,

            likes_count:
              saved.likes_count,

            video_count:
              saved.video_count
          });

        const eligible =
          isEligible({
            username:
              saved.username,

            display_name:
              saved.display_name,

            bio_description:
              saved.bio_description,

            follower_count:
              saved.follower_count,

            following_count:
              saved.following_count,

            likes_count:
              saved.likes_count,

            video_count:
              saved.video_count
          });

        const status =
          eligible
            ? "✅ ELIGIBLE"
            : "❌ NOT ELIGIBLE";

        const embed =
          new EmbedBuilder()
            .setColor(
              eligible
                ? "#57F287"
                : "#ED4245"
            )
            .setTitle(
              "🎭 TikTok Verification Status"
            )
            .setDescription(
`**TikTok:** @${escapeHtml(
  saved.username ||
  saved.display_name ||
  "Unknown"
)}

**Status:** ${status}`
            )
            .addFields(
              {
                name:
                  "LMP Username / Display Name",
                value:
                  requirements.username
                    ? "✅ Passed"
                    : "❌ Failed",
                inline: true
              },
              {
                name:
                  "Bio",
                value:
                  requirements.bio
                    ? "✅ Passed"
                    : "❌ Failed",
                inline: true
              },
              {
                name:
                  "Followers",
                value:
                  `${requirements.followers ? "✅" : "❌"} ${formatNumber(saved.follower_count)} / ${formatNumber(MIN_FOLLOWERS)}`,
                inline: true
              },
              {
                name:
                  "Following",
                value:
                  `${requirements.following ? "✅" : "❌"} ${formatNumber(saved.following_count)} / ${formatNumber(MIN_FOLLOWING)}`,
                inline: true
              },
              {
                name:
                  "Likes",
                value:
                  `${requirements.likes ? "✅" : "❌"} ${formatNumber(saved.likes_count)} / ${formatNumber(MIN_LIKES)}`,
                inline: true
              },
              {
                name:
                  "Videos",
                value:
                  `${requirements.videos ? "✅" : "❌"} ${formatNumber(saved.video_count)} / ${formatNumber(MIN_VIDEOS)}`,
                inline: true
              }
            )
            .setFooter({
              text:
                "LAMPOON TikTok Integration"
            });

        return interaction.reply({
          embeds: [embed],
          ephemeral: true
        });

      } catch (error) {
        console.error(
          "/tiktokstatus command error:",
          error
        );

        if (!interaction.replied) {
          return interaction.reply({
            content:
              "❌ Unable to retrieve your TikTok status.",
            ephemeral: true
          });
        }
      }
    }
  }
);

/* =========================================================
   WEB SERVER
========================================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `🌐 Web server running on port ${PORT}`
    );

    console.log(
      `🌐 Base URL: ${BASE_URL}`
    );

    console.log(
      `❤️ Health: ${BASE_URL}/health`
    );

    console.log(
      `📄 Terms: ${BASE_URL}/terms/`
    );

    console.log(
      `🔐 Privacy: ${BASE_URL}/privacy/`
    );

    console.log(
      `🎵 TikTok callback: ${BASE_URL}/tiktok/callback`
    );
  }
);

/* =========================================================
   DISCORD LOGIN
========================================================= */

if (!DISCORD_TOKEN) {
  console.error(
    "❌ DISCORD_TOKEN is missing."
  );
} else {
  client.login(DISCORD_TOKEN)
    .then(() => {
      console.log(
        "Discord login requested successfully."
      );
    })
    .catch(error => {
      console.error(
        "❌ Discord login failed:",
        error
      );
    });
                                                   }
