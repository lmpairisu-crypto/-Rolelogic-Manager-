require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  AttachmentBuilder,
} = require("discord.js");

// ======================================================
// CONFIG
// ======================================================

const app = express();

const PORT = Number(process.env.PORT) || 10000;

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;

const BASE_URL =
  process.env.BASE_URL ||
  "https://rolelogic-manager.onrender.com";

const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

const GUILD_ID =
  process.env.GUILD_ID ||
  "1512880537734480022";

const TIKTOK_ROLE_ID =
  process.env.TIKTOK_ROLE_ID || "";

const LAMPOON_ROLE_ID =
  process.env.LAMPOON_ROLE_ID ||
  "1537896539618545795";

const CONTENT_CREATOR_ROLE_ID =
  process.env.CONTENT_CREATOR_ROLE_ID ||
  "";

const FOLLOWERS_ROLE_ID =
  process.env.FOLLOWERS_ROLE_ID ||
  "";

const LOG_CHANNEL_ID =
  process.env.LOG_CHANNEL_ID ||
  "";

const TIKTOK_LEADERBOARD_CHANNEL_ID =
  process.env.TIKTOK_LEADERBOARD_CHANNEL_ID ||
  LOG_CHANNEL_ID;

const LMP_TAG_CHANNEL_ID =
  process.env.LMP_TAG_CHANNEL_ID ||
  "1539643480714903602";

// ======================================================
// TIKTOK EMOJI
// ======================================================

const TIKTOK_EMOJI = "<:Tiktok:1542438653094268969>";

// ======================================================
// TIKTOK REQUIREMENTS
// ======================================================

const REQUIREMENTS = {
  minFollowers: 300,
  minFollowing: 50,
  minLikes: 1000,
  minVideos: 15,
};

// ======================================================
// DIRECTORIES
// ======================================================

const DATA_DIR = path.join(__dirname, "data");

const CHARACTER_DIR = path.join(
  DATA_DIR,
  "growth-characters"
);

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(CHARACTER_DIR, { recursive: true });

// ======================================================
// DATA FILES
// ======================================================

const CONNECTIONS_FILE = path.join(
  DATA_DIR,
  "tiktok-connections.json"
);

const SNAPSHOTS_FILE = path.join(
  DATA_DIR,
  "tiktok-snapshots.json"
);

const MILESTONES_FILE = path.join(
  DATA_DIR,
  "growth-milestones.json"
);

// ======================================================
// JSON HELPERS
// ======================================================

function loadJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(
        file,
        JSON.stringify(fallback, null, 2)
      );

      return fallback;
    }

    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch (error) {
    console.error(
      `Failed loading ${file}:`,
      error
    );

    return fallback;
  }
}

function saveJSON(file, data) {
  try {
    fs.writeFileSync(
      file,
      JSON.stringify(data, null, 2)
    );
  } catch (error) {
    console.error(
      `Failed saving ${file}:`,
      error
    );
  }
}

let connections = loadJSON(
  CONNECTIONS_FILE,
  {}
);

let snapshots = loadJSON(
  SNAPSHOTS_FILE,
  []
);

let milestones = loadJSON(
  MILESTONES_FILE,
  {}
);

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
// VERIFICATION SESSION STORAGE
// ======================================================

const oauthStates = new Map();

// ======================================================
// UTILITY FUNCTIONS
// ======================================================

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function getTikTokURL(username) {
  if (!username) return null;

  return `https://www.tiktok.com/@${encodeURIComponent(
    username.replace(/^@/, "")
  )}`;
}

function getNextMilestone(followers) {
  const count = Number(followers || 0);

  if (count < 1000) {
    return 1000;
  }

  if (count < 10000) {
    return Math.ceil(count / 1000) * 1000;
  }

  return Math.ceil(count / 10000) * 10000;
}

function getCurrentMilestone(followers) {
  const count = Number(followers || 0);

  if (count < 1000) {
    return 0;
  }

  if (count < 10000) {
    return Math.floor(count / 1000) * 1000;
  }

  return Math.floor(count / 10000) * 10000;
}

function getWeekKey(date = new Date()) {
  const d = new Date(date);

  const year = d.getUTCFullYear();

  const firstDay = new Date(
    Date.UTC(year, 0, 1)
  );

  const dayOfYear =
    Math.floor(
      (d - firstDay) / 86400000
    ) + 1;

  const week =
    Math.ceil(dayOfYear / 7);

  return `${year}-W${String(week).padStart(
    2,
    "0"
  )}`;
}

function randomItem(array) {
  return array[
    Math.floor(Math.random() * array.length)
  ];
}

// ======================================================
// MANIFESTATION / GROWTH QUOTES
// ======================================================

const GROWTH_QUOTES = [
  "What you consistently build will eventually become what you're known for.",
  "Your growth is proof that your consistency is working.",
  "Keep showing up. The next milestone is already waiting for you.",
  "Small progress becomes big results when you refuse to stop.",
  "What you manifest, you must also move toward.",
  "Every follower represents someone who chose to follow your journey.",
  "Your next level begins with the consistency you show today.",
  "Keep creating. Keep growing. Keep becoming.",
  "The audience grows when the vision stays consistent.",
  "One milestone at a time, you're building something bigger.",
];

// ======================================================
// TIKTOK ELIGIBILITY
// ======================================================

function checkEligibility(profile) {
  const username =
    profile.username || "";

  const displayName =
    profile.display_name || "";

  const bio =
    profile.bio_description || "";

  const combined =
    `${username} ${displayName}`.toLowerCase();

  const bioLower =
    bio.toLowerCase();

  const checks = {
    name:
      combined.includes("lmp"),

    bio:
      bioLower.includes("lmp members") ||
      bioLower.includes("lampoon creator"),

    followers:
      Number(profile.follower_count || 0) >=
      REQUIREMENTS.minFollowers,

    following:
      Number(profile.following_count || 0) >=
      REQUIREMENTS.minFollowing,

    likes:
      Number(profile.likes_count || 0) >=
      REQUIREMENTS.minLikes,

    videos:
      Number(profile.video_count || 0) >=
      REQUIREMENTS.minVideos,
  };

  const eligible =
    Object.values(checks).every(Boolean);

  return {
    eligible,
    checks,
  };
}

// ======================================================
// FIND CONNECTION
// ======================================================

function getConnection(userId) {
  return connections[userId] || null;
}

// ======================================================
// SAVE CONNECTION
// ======================================================

function saveConnection(userId, data) {
  connections[userId] = {
    ...(connections[userId] || {}),
    ...data,
  };

  saveJSON(
    CONNECTIONS_FILE,
    connections
  );
}

// ======================================================
// TOKEN REFRESH
// ======================================================

async function refreshTikTokToken(connection) {
  if (!connection?.refresh_token) {
    return connection;
  }

  try {
    const body =
      new URLSearchParams();

    body.append(
      "client_key",
      TIKTOK_CLIENT_KEY
    );

    body.append(
      "client_secret",
      TIKTOK_CLIENT_SECRET
    );

    body.append(
      "grant_type",
      "refresh_token"
    );

    body.append(
      "refresh_token",
      connection.refresh_token
    );

    const response =
      await fetch(
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

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "TikTok token refresh failed:",
        data
      );

      return connection;
    }

    connection.access_token =
      data.access_token ||
      connection.access_token;

    connection.refresh_token =
      data.refresh_token ||
      connection.refresh_token;

    connection.expires_in =
      data.expires_in ||
      connection.expires_in;

    connection.token_updated_at =
      new Date().toISOString();

    return connection;
  } catch (error) {
    console.error(
      "TikTok token refresh error:",
      error
    );

    return connection;
  }
}

// ======================================================
// GET TIKTOK PROFILE
// ======================================================

async function getTikTokProfile(connection) {
  if (!connection?.access_token) {
    return null;
  }

  try {
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

    const response =
      await fetch(
        `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`,
        {
          headers: {
            Authorization:
              `Bearer ${connection.access_token}`,
          },
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "TikTok profile request failed:",
        data
      );

      return null;
    }

    return data.data?.user || null;
  } catch (error) {
    console.error(
      "TikTok profile error:",
      error
    );

    return null;
  }
}

// ======================================================
// UPDATE CONNECTION STATS
// ======================================================

async function updateConnectionStats(userId) {
  let connection =
    getConnection(userId);

  if (!connection) {
    return null;
  }

  connection =
    await refreshTikTokToken(
      connection
    );

  const profile =
    await getTikTokProfile(
      connection
    );

  if (!profile) {
    return connection;
  }

  const profileUrl =
    getTikTokURL(
      profile.username
    );

  const eligibility =
    checkEligibility(profile);

  saveConnection(userId, {
    open_id:
      profile.open_id,

    union_id:
      profile.union_id,

    username:
      profile.username,

    display_name:
      profile.display_name,

    bio_description:
      profile.bio_description,

    avatar_url:
      profile.avatar_url,

    follower_count:
      Number(profile.follower_count || 0),

    following_count:
      Number(profile.following_count || 0),

    likes_count:
      Number(profile.likes_count || 0),

    video_count:
      Number(profile.video_count || 0),

    profile_url:
      profileUrl,

    eligible:
      eligibility.eligible,

    last_updated:
      new Date().toISOString(),
  });

  return connections[userId];
}

// ======================================================
// CREATE OAUTH STATE
// ======================================================

function createOAuthState(userId) {
  const state =
    crypto.randomBytes(32).toString("hex");

  oauthStates.set(state, {
    userId,
    createdAt: Date.now(),
  });

  return state;
}

// ======================================================
// VERIFY OAUTH STATE
// ======================================================

function verifyOAuthState(state) {
  const session =
    oauthStates.get(state);

  if (!session) {
    return null;
  }

  oauthStates.delete(state);

  if (
    Date.now() -
      session.createdAt >
    10 * 60 * 1000
  ) {
    return null;
  }

  return session;
      }

// ======================================================
// CHARACTER FILE
// ======================================================

function getCharacterFile(userId) {
  const files =
    fs.readdirSync(
      CHARACTER_DIR,
      {
        withFileTypes: true,
      }
    );

  const match =
    files.find(file => {
      if (!file.isFile()) {
        return false;
      }

      return file.name.startsWith(
        `${userId}.`
      );
    });

  if (!match) {
    return null;
  }

  return path.join(
    CHARACTER_DIR,
    match.name
  );
}

// ======================================================
// SAVE CHARACTER
// ======================================================

async function saveCharacter(
  userId,
  buffer
) {
  const oldFile =
    getCharacterFile(userId);

  if (oldFile) {
    fs.unlinkSync(oldFile);
  }

  const filePath =
    path.join(
      CHARACTER_DIR,
      `${userId}.png`
    );

  await sharp(buffer)
    .png()
    .resize({
      width: 900,
      height: 900,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toFile(filePath);

  return filePath;
}

// ======================================================
// RESET CHARACTER
// ======================================================

function resetCharacter(userId) {
  const file =
    getCharacterFile(userId);

  if (file && fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

// ======================================================
// MILESTONE PROCESSING
// ======================================================

async function processGrowthMilestone(
  userId,
  connection
) {
  const followers =
    Number(
      connection.follower_count || 0
    );

  const currentMilestone =
    getCurrentMilestone(
      followers
    );

  if (currentMilestone <= 0) {
    return;
  }

  const previous =
    Number(
      milestones[userId]
        ?.lastAnnouncedMilestone ||
        0
    );

  if (
    currentMilestone <= previous
  ) {
    return;
  }

  milestones[userId] = {
    lastAnnouncedMilestone:
      currentMilestone,

    updatedAt:
      new Date().toISOString(),
  };

  saveJSON(
    MILESTONES_FILE,
    milestones
  );

  console.log(
    `🎉 ${connection.username} reached ${currentMilestone} followers`
  );

  await sendGrowthAnnouncement(
    userId,
    connection,
    currentMilestone
  );
}

// ======================================================
// WEEKLY SNAPSHOT
// ======================================================

function saveWeeklySnapshot(
  userId,
  connection
) {
  const week =
    getWeekKey();

  const existing =
    snapshots.find(
      item =>
        item.userId === userId &&
        item.week === week
    );

  const snapshot = {
    userId,

    week,

    username:
      connection.username || "",

    display_name:
      connection.display_name || "",

    avatar_url:
      connection.avatar_url || "",

    profile_url:
      connection.profile_url ||
      getTikTokURL(
        connection.username
      ),

    followers:
      Number(
        connection.follower_count || 0
      ),

    following:
      Number(
        connection.following_count || 0
      ),

    likes:
      Number(
        connection.likes_count || 0
      ),

    videos:
      Number(
        connection.video_count || 0
      ),

    captured_at:
      new Date().toISOString(),
  };

  if (existing) {
    Object.assign(
      existing,
      snapshot
    );
  } else {
    snapshots.push(snapshot);
  }

  saveJSON(
    SNAPSHOTS_FILE,
    snapshots
  );
}

// ======================================================
// SNAPSHOT ALL CONNECTIONS
// ======================================================

async function snapshotAllConnections() {
  for (
    const userId of
    Object.keys(connections)
  ) {
    try {
      const connection =
        await updateConnectionStats(
          userId
        );

      if (connection) {
        saveWeeklySnapshot(
          userId,
          connection
        );
      }
    } catch (error) {
      console.error(
        `Snapshot failed for ${userId}:`,
        error
      );
    }
  }
      }

// ======================================================
// CREATE SOLO GROWTH SVG
// ======================================================

function createGrowthSVG(
  connection,
  discordMember,
  currentMilestone,
  nextMilestone,
  quote,
  avatarData,
  characterData
) {
  const username =
    escapeHTML(
      connection.username ||
      "TikTok Creator"
    );

  const displayName =
    escapeHTML(
      connection.display_name ||
      username
    );

  const discordName =
    escapeHTML(
      discordMember?.displayName ||
      discordMember?.user?.username ||
      "Discord Member"
    );

  const followers =
    formatNumber(
      connection.follower_count
    );

  const likes =
    formatNumber(
      connection.likes_count
    );

  const following =
    formatNumber(
      connection.following_count
    );

  const videos =
    formatNumber(
      connection.video_count
    );

  const avatar =
    avatarData
      ? `data:image/png;base64,${avatarData.toString("base64")}`
      : "";

  const character =
    characterData
      ? `data:image/png;base64,${characterData.toString("base64")}`
      : "";

  const safeQuote =
    escapeHTML(quote);

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="1600"
  height="900"
  viewBox="0 0 1600 900"
>
  <defs>

    <linearGradient
      id="background"
      x1="0"
      y1="0"
      x2="1"
      y2="1"
    >
      <stop
        offset="0%"
        stop-color="#090909"
      />

      <stop
        offset="50%"
        stop-color="#161616"
      />

      <stop
        offset="100%"
        stop-color="#2a1710"
      />
    </linearGradient>

    <linearGradient
      id="gold"
      x1="0"
      y1="0"
      x2="1"
      y2="1"
    >
      <stop
        offset="0%"
        stop-color="#C48D21"
      />

      <stop
        offset="50%"
        stop-color="#F8D85C"
      />

      <stop
        offset="100%"
        stop-color="#8A5A12"
      />
    </linearGradient>

    <filter
      id="shadow"
      x="-30%"
      y="-30%"
      width="160%"
      height="160%"
    >
      <feDropShadow
        dx="0"
        dy="12"
        stdDeviation="12"
        flood-opacity="0.55"
      />
    </filter>

    <clipPath id="avatarClip">
      <circle
        cx="170"
        cy="170"
        r="105"
      />
    </clipPath>

  </defs>

  <rect
    width="1600"
    height="900"
    fill="url(#background)"
  />

  <rect
    x="40"
    y="40"
    width="1520"
    height="820"
    rx="45"
    fill="none"
    stroke="url(#gold)"
    stroke-width="5"
  />

  <circle
    cx="170"
    cy="170"
    r="115"
    fill="#111"
    stroke="url(#gold)"
    stroke-width="8"
    filter="url(#shadow)"
  />

  ${
    avatar
      ? `
      <image
        href="${avatar}"
        x="65"
        y="65"
        width="210"
        height="210"
        preserveAspectRatio="xMidYMid slice"
        clip-path="url(#avatarClip)"
      />
      `
      : ""
  }

  <text
    x="330"
    y="125"
    fill="#F8D85C"
    font-family="Arial, sans-serif"
    font-size="32"
    font-weight="700"
  >
    TIKTOK SOLO GROWTH
  </text>

  <text
    x="330"
    y="180"
    fill="#ffffff"
    font-family="Arial, sans-serif"
    font-size="58"
    font-weight="800"
  >
    @${username}
  </text>

  <text
    x="330"
    y="225"
    fill="#cfcfcf"
    font-family="Arial, sans-serif"
    font-size="27"
  >
    ${displayName}
  </text>

  <text
    x="330"
    y="265"
    fill="#999999"
    font-family="Arial, sans-serif"
    font-size="23"
  >
    Discord: ${discordName}
  </text>

  <rect
    x="80"
    y="355"
    width="430"
    height="180"
    rx="30"
    fill="#111111"
    stroke="#C48D21"
    stroke-width="3"
  />

  <text
    x="110"
    y="405"
    fill="#999999"
    font-family="Arial, sans-serif"
    font-size="22"
  >
    FOLLOWERS
  </text>

  <text
    x="110"
    y="475"
    fill="#F8D85C"
    font-family="Arial, sans-serif"
    font-size="58"
    font-weight="800"
  >
    ${followers}
  </text>

  <text
    x="110"
    y="515"
    fill="#ffffff"
    font-family="Arial, sans-serif"
    font-size="22"
  >
    Current Milestone:
    ${formatNumber(currentMilestone)}
  </text>

  <rect
    x="560"
    y="355"
    width="430"
    height="180"
    rx="30"
    fill="#111111"
    stroke="#C48D21"
    stroke-width="3"
  />

  <text
    x="590"
    y="405"
    fill="#999999"
    font-family="Arial, sans-serif"
    font-size="22"
  >
    NEXT MILESTONE
  </text>

  <text
    x="590"
    y="475"
    fill="#F8D85C"
    font-family="Arial, sans-serif"
    font-size="58"
    font-weight="800"
  >
    ${formatNumber(nextMilestone)}
  </text>

  <text
    x="590"
    y="515"
    fill="#ffffff"
    font-family="Arial, sans-serif"
    font-size="22"
  >
    Keep growing.
  </text>

  <rect
    x="1040"
    y="100"
    width="430"
    height="435"
    rx="35"
    fill="#0e0e0e"
    stroke="#C48D21"
    stroke-width="3"
  />

  ${
    character
      ? `
      <image
        href="${character}"
        x="1080"
        y="125"
        width="350"
        height="350"
        preserveAspectRatio="xMidYMid meet"
      />
      `
      : `
      <text
        x="1255"
        y="300"
        text-anchor="middle"
        fill="#666666"
        font-family="Arial, sans-serif"
        font-size="28"
      >
        LAMPOON CREATOR
      </text>
      `
  }

  <rect
    x="80"
    y="590"
    width="1390"
    height="180"
    rx="35"
    fill="#0c0c0c"
    stroke="#5F3203"
    stroke-width="3"
  />

  <text
    x="120"
    y="640"
    fill="#F8D85C"
    font-family="Arial, sans-serif"
    font-size="24"
    font-weight="700"
  >
    GROWTH MANIFESTATION
  </text>

  <text
    x="120"
    y="695"
    fill="#ffffff"
    font-family="Arial, sans-serif"
    font-size="28"
  >
    ${safeQuote}
  </text>

  <text
    x="120"
    y="735"
    fill="#999999"
    font-family="Arial, sans-serif"
    font-size="21"
  >
    Likes: ${likes}
    • Following: ${following}
    • Videos: ${videos}
  </text>

</svg>
`;
    }

// ======================================================
// DOWNLOAD IMAGE
// ======================================================

async function downloadBuffer(url) {
  if (!url) return null;

  try {
    const response =
      await fetch(url);

    if (!response.ok) {
      return null;
    }

    return Buffer.from(
      await response.arrayBuffer()
    );
  } catch (error) {
    console.error(
      "Image download failed:",
      error
    );

    return null;
  }
}

// ======================================================
// CREATE SOLO GROWTH BANNER
// ======================================================

async function createGrowthBanner(
  userId,
  connection,
  guild
) {
  let member = null;

  try {
    member =
      await guild.members.fetch(
        userId
      );
  } catch {
    member = null;
  }

  const avatarData =
    await downloadBuffer(
      connection.avatar_url
    );

  const characterFile =
    getCharacterFile(userId);

  const characterData =
    characterFile
      ? fs.readFileSync(
          characterFile
        )
      : null;

  const currentMilestone =
    getCurrentMilestone(
      connection.follower_count
    );

  const nextMilestone =
    getNextMilestone(
      connection.follower_count
    );

  const quote =
    randomItem(
      GROWTH_QUOTES
    );

  const svg =
    createGrowthSVG(
      connection,
      member,
      currentMilestone,
      nextMilestone,
      quote,
      avatarData,
      characterData
    );

  return sharp(
    Buffer.from(svg)
  )
    .png()
    .toBuffer();
}

// ======================================================
// GROWTH EMBED
// ======================================================

function createGrowthEmbed(
  connection,
  currentMilestone,
  nextMilestone,
  attachmentName
) {
  const profileUrl =
    connection.profile_url ||
    getTikTokURL(
      connection.username
    );

  return new EmbedBuilder()
    .setColor("#C48D21")
    .setTitle(
      `${TIKTOK_EMOJI} TikTok Solo Growth`
    )
    .setDescription(
      [
        `**[@${connection.username}](${profileUrl})**`,
        "",
        `🎯 **Current Milestone:** ${formatNumber(
          currentMilestone
        )}`,
        `🚀 **Next Milestone:** ${formatNumber(
          nextMilestone
        )}`,
        "",
        `👥 **Followers:** ${formatNumber(
          connection.follower_count
        )}`,
        `❤️ **Likes:** ${formatNumber(
          connection.likes_count
        )}`,
        `➕ **Following:** ${formatNumber(
          connection.following_count
        )}`,
        `🎬 **Videos:** ${formatNumber(
          connection.video_count
        )}`,
      ].join("\n")
    )
    .setImage(
      `attachment://${attachmentName}`
    )
    .setFooter({
      text:
        "Lampoon • TikTok Solo Growth",
    })
    .setTimestamp();
}

// ======================================================
// LEADERBOARD ELIGIBILITY
// ======================================================

async function getLeaderboardMembers(
  guild
) {
  const result = [];

  for (
    const [userId, connection]
    of Object.entries(connections)
  ) {
    try {
      const member =
        await guild.members.fetch(
          userId
        );

      const hasTikTokRole =
        TIKTOK_ROLE_ID &&
        member.roles.cache.has(
          TIKTOK_ROLE_ID
        );

      const hasLampoonRole =
        LAMPOON_ROLE_ID &&
        member.roles.cache.has(
          LAMPOON_ROLE_ID
        );

      if (
        !hasTikTokRole &&
        !hasLampoonRole
      ) {
        continue;
      }

      if (
        !connection.username
      ) {
        continue;
      }

      result.push({
        userId,
        member,
        connection,
      });
    } catch {
      // Member may no longer exist.
    }
  }

  return result;
}

// ======================================================
// LEADERBOARD SVG
// ======================================================

async function createLeaderboardImage(
  entries
) {
  const width = 1600;
  const rowHeight = 105;
  const height =
    250 +
    entries.length *
      rowHeight;

  let rows = "";

  for (
    let i = 0;
    i < entries.length;
    i++
  ) {
    const entry =
      entries[i];

    const y =
      250 +
      i * rowHeight;

    const avatar =
      await downloadBuffer(
        entry.connection.avatar_url
      );

    const avatarData =
      avatar
        ? `data:image/png;base64,${avatar.toString(
            "base64"
          )}`
        : "";

    const rank =
      i === 0
        ? "🥇"
        : i === 1
        ? "🥈"
        : i === 2
        ? "🥉"
        : `#${i + 1}`;

    const username =
      escapeHTML(
        entry.connection.username ||
        "Unknown"
      );

    rows += `
      <rect
        x="70"
        y="${y}"
        width="1460"
        height="85"
        rx="22"
        fill="#111111"
        stroke="#5F3203"
        stroke-width="2"
      />

      ${
        avatarData
          ? `
          <circle
            cx="145"
            cy="${y + 42}"
            r="32"
            fill="#222"
          />

          <clipPath id="avatar${i}">
            <circle
              cx="145"
              cy="${y + 42}"
              r="32"
            />
          </clipPath>

          <image
            href="${avatarData}"
            x="113"
            y="${y + 10}"
            width="64"
            height="64"
            preserveAspectRatio="xMidYMid slice"
            clip-path="url(#avatar${i})"
          />
          `
          : ""
      }

      <text
        x="215"
        y="${y + 53}"
        fill="#F8D85C"
        font-family="Arial, sans-serif"
        font-size="32"
        font-weight="800"
      >
        ${rank}
      </text>

      <text
        x="330"
        y="${y + 48}"
        fill="#ffffff"
        font-family="Arial, sans-serif"
        font-size="30"
        font-weight="700"
      >
        @${username}
      </text>

      <text
        x="1000"
        y="${y + 48}"
        fill="#F8D85C"
        font-family="Arial, sans-serif"
        font-size="30"
        font-weight="700"
      >
        ${formatNumber(
          entry.connection.follower_count
        )}
      </text>

      <text
        x="1230"
        y="${y + 48}"
        fill="#aaaaaa"
        font-family="Arial, sans-serif"
        font-size="22"
      >
        followers
      </text>
    `;
  }

  const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
>
  <defs>
    <linearGradient
      id="bg"
      x1="0"
      y1="0"
      x2="1"
      y2="1"
    >
      <stop
        offset="0%"
        stop-color="#080808"
      />

      <stop
        offset="100%"
        stop-color="#21150b"
      />
    </linearGradient>

    <linearGradient
      id="gold"
      x1="0"
      y1="0"
      x2="1"
      y2="1"
    >
      <stop
        offset="0%"
        stop-color="#C48D21"
      />

      <stop
        offset="50%"
        stop-color="#F8D85C"
      />

      <stop
        offset="100%"
        stop-color="#7A4A0B"
      />
    </linearGradient>
  </defs>

  <rect
    width="${width}"
    height="${height}"
    fill="url(#bg)"
  />

  <rect
    x="35"
    y="35"
    width="${width - 70}"
    height="${height - 70}"
    rx="40"
    fill="none"
    stroke="url(#gold)"
    stroke-width="5"
  />

  <text
    x="800"
    y="100"
    text-anchor="middle"
    fill="#F8D85C"
    font-family="Arial, sans-serif"
    font-size="42"
    font-weight="800"
  >
    TIKTOK WEEKLY LEADERBOARD
  </text>

  <text
    x="800"
    y="150"
    text-anchor="middle"
    fill="#999999"
    font-family="Arial, sans-serif"
    font-size="22"
  >
    Top 10 Lampoon TikTok Creators
  </text>

  ${rows}

</svg>
`;

  return sharp(
    Buffer.from(svg)
  )
    .png()
    .toBuffer();
}

// ======================================================
// LEADERBOARD EMBED
// ======================================================

function createLeaderboardEmbed(
  entries,
  attachmentName
) {
  const lines = [];

  if (entries[0]) {
    lines.push(
      `🥇 <@${entries[0].userId}>`
    );
  }

  if (entries[1]) {
    lines.push(
      `🥈 <@${entries[1].userId}>`
    );
  }

  if (entries[2]) {
    lines.push(
      `🥉 <@${entries[2].userId}>`
    );
  }

  return new EmbedBuilder()
    .setColor("#C48D21")
    .setTitle(
      `${TIKTOK_EMOJI} Weekly TikTok Leaderboard`
    )
    .setDescription(
      [
        ...lines,
        "",
        "Leaderboard rankings are based on current TikTok follower count.",
        "",
        "Click the TikTok profile links below to view the creators.",
      ].join("\n")
    )
    .setImage(
      `attachment://${attachmentName}`
    )
    .setFooter({
      text:
        "Lampoon • Weekly TikTok Leaderboard",
    })
    .setTimestamp();
}

// ======================================================
// SLASH COMMANDS
// ======================================================

const commands = [

  new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription(
      "Connect your TikTok account to Lampoon."
    ),

  new SlashCommandBuilder()
    .setName("tiktokstatus")
    .setDescription(
      "View your TikTok connection status."
    ),

  new SlashCommandBuilder()
    .setName("tiktokgrowth")
    .setDescription(
      "View your TikTok Solo Growth."
    ),

  new SlashCommandBuilder()
    .setName("tiktokleaderboard")
    .setDescription(
      "Manage the weekly TikTok leaderboard."
    )
    .addSubcommand(sub =>
      sub
        .setName("update")
        .setDescription(
          "Update TikTok stats and weekly snapshots."
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("post")
        .setDescription(
          "Post the current TikTok leaderboard."
        )
    ),

  new SlashCommandBuilder()
    .setName("growthcharacter")
    .setDescription(
      "Manage a member's Solo Growth character."
    )
    .addSubcommand(sub =>
      sub
        .setName("set")
        .setDescription(
          "Set a custom character."
        )
        .addUserOption(option =>
          option
            .setName("member")
            .setDescription(
              "Discord member."
            )
            .setRequired(true)
        )
        .addAttachmentOption(option =>
          option
            .setName("image")
            .setDescription(
              "Character image."
            )
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("preview")
        .setDescription(
          "Preview a member's character."
        )
        .addUserOption(option =>
          option
            .setName("member")
            .setDescription(
              "Discord member."
            )
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("reset")
        .setDescription(
          "Reset a member's character."
        )
        .addUserOption(option =>
          option
            .setName("member")
            .setDescription(
              "Discord member."
            )
            .setRequired(true)
        )
    ),

];

// ======================================================
// DISCORD DEBUG
// ======================================================

client.on(
  "debug",
  message => {
    console.log(
      "🔎 Discord Debug:",
      message
    );
  }
);

client.on(
  "warn",
  message => {
    console.warn(
      "⚠️ Discord Warning:",
      message
    );
  }
);

client.on(
  "error",
  error => {
    console.error(
      "❌ Discord Client Error:",
      error
    );
  }
);

client.on(
  "shardError",
  error => {
    console.error(
      "❌ Discord Shard Error:",
      error
    );
  }
);

client.on(
  "shardReady",
  shardId => {
    console.log(
      `🟢 Discord Shard ${shardId} ready.`
    );
  }
);

client.on(
  "shardReconnecting",
  shardId => {
    console.log(
      `🔄 Discord Shard ${shardId} reconnecting.`
    );
  }
);

client.on(
  "shardDisconnect",
  (event, shardId) => {
    console.error(
      `🔌 Discord Shard ${shardId} disconnected:`,
      event
    );
  }
);

// ======================================================
// DISCORD READY
// ======================================================

client.once(
  "ready",
  async () => {
    console.log(
      `🟢 Discord bot online as ${client.user.tag}`
    );

    try {
      const guild =
        await client.guilds.fetch(
          GUILD_ID
        );

      await guild.commands.set(
        commands.map(command =>
          command.toJSON()
        )
      );

      console.log(
        `Registered ${commands.length} slash commands in ${guild.name}.`
      );
    } catch (error) {
      console.error(
        "Slash command registration failed:",
        error
      );
    }
  }
);

// ======================================================
// INTERACTIONS
// ======================================================

client.on(
  "interactionCreate",
  async interaction => {

    try {

      // ==================================================
      // SLASH COMMANDS
      // ==================================================

      if (
        interaction.isChatInputCommand()
      ) {

        // ----------------------------------------------
        // /tiktok
        // ----------------------------------------------

        if (
          interaction.commandName ===
          "tiktok"
        ) {

          const member =
            await interaction.guild.members.fetch(
              interaction.user.id
            );

          if (
            TIKTOK_ROLE_ID &&
            !member.roles.cache.has(
              TIKTOK_ROLE_ID
            )
          ) {
            return interaction.reply({
              content:
                "❌ You need the **TikTok** role before connecting your TikTok account.",
              ephemeral: true,
            });
          }

          const connectUrl =
            `${BASE_URL}/tiktok/connect?user_id=${encodeURIComponent(
              interaction.user.id
            )}`;

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
                  .setURL(
                    connectUrl
                  ),

                new ButtonBuilder()
                  .setLabel(
                    "Privacy Policy"
                  )
                  .setStyle(
                    ButtonStyle.Link
                  )
                  .setURL(
                    `${BASE_URL}/privacy/`
                  ),

                new ButtonBuilder()
                  .setLabel(
                    "Terms of Service"
                  )
                  .setStyle(
                    ButtonStyle.Link
                  )
                  .setURL(
                    `${BASE_URL}/terms/`
                  )
              );

          const embed =
            new EmbedBuilder()
              .setColor("#C48D21")
              .setTitle(
                `${TIKTOK_EMOJI} Lampoon TikTok Verification`
              )
              .setDescription(
                [
                  "Connect your TikTok account with Lampoon.",
                  "",
                  "**TikTok Requirements**",
                  `• Username/display name contains **LMP**`,
                  `• Bio contains **LMP Members** or **Lampoon Creator**`,
                  `• At least **${formatNumber(
                    REQUIREMENTS.minFollowers
                  )} followers**`,
                  `• At least **${formatNumber(
                    REQUIREMENTS.minFollowing
                  )} following**`,
                  `• At least **${formatNumber(
                    REQUIREMENTS.minLikes
                  )} likes**`,
                  `• At least **${REQUIREMENTS.minVideos} videos**`,
                  "",
                  "After connecting, your TikTok account can automatically power your **Solo Growth** and **Weekly Leaderboard** profile.",
                  "",
                  `Your TikTok profile will be linked automatically.`
                ].join("\n")
              )
              .setFooter({
                text:
                  "Lampoon Role Manager • TikTok Integration",
              });

          return interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true,
          });
        }

        // ----------------------------------------------
        // /tiktokstatus
        // ----------------------------------------------

        if (
          interaction.commandName ===
          "tiktokstatus"
        ) {

          let connection =
            getConnection(
              interaction.user.id
            );

          if (!connection) {
            return interaction.reply({
              content:
                "❌ You have not connected a TikTok account yet. Use `/tiktok` to connect.",
              ephemeral: true,
            });
          }

          connection =
            await updateConnectionStats(
              interaction.user.id
            );

          const profileUrl =
            connection.profile_url ||
            getTikTokURL(
              connection.username
            );

          const embed =
            new EmbedBuilder()
              .setColor(
                connection.eligible
                  ? "#57F287"
                  : "#ED4245"
              )
              .setTitle(
                `${TIKTOK_EMOJI} TikTok Status`
              )
              .setDescription(
                [
                  `**[@${connection.username}](${profileUrl})**`,
                  "",
                  `Eligibility: ${
                    connection.eligible
                      ? "✅ Eligible"
                      : "❌ Not Eligible"
                  }`,
                  "",
                  `👥 Followers: **${formatNumber(
                    connection.follower_count
                  )}**`,
                  `❤️ Likes: **${formatNumber(
                    connection.likes_count
                  )}**`,
                  `➕ Following: **${formatNumber(
                    connection.following_count
                  )}**`,
                  `🎬 Videos: **${formatNumber(
                    connection.video_count
                  )}**`,
                ].join("\n")
              )
              .setThumbnail(
                connection.avatar_url ||
                  null
              );

          return interaction.reply({
            embeds: [embed],
            ephemeral: true,
          });
        }

        // ----------------------------------------------
        // /tiktokgrowth
        // ----------------------------------------------

        if (
          interaction.commandName ===
          "tiktokgrowth"
        ) {

          let connection =
            getConnection(
              interaction.user.id
            );

          if (!connection) {
            return interaction.reply({
              content:
                "❌ Connect your TikTok first with `/tiktok`.",
              ephemeral: true,
            });
          }

          await interaction.deferReply({
            ephemeral: true,
          });

          connection =
            await updateConnectionStats(
              interaction.user.id
            );

          const guild =
            interaction.guild;

          const banner =
            await createGrowthBanner(
              interaction.user.id,
              connection,
              guild
            );

          const fileName =
            "solo-growth.png";

          const attachment =
            new AttachmentBuilder(
              banner,
              {
                name: fileName,
              }
            );

          const currentMilestone =
            getCurrentMilestone(
              connection.follower_count
            );

          const nextMilestone =
            getNextMilestone(
              connection.follower_count
            );

          const embed =
            createGrowthEmbed(
              connection,
              currentMilestone,
              nextMilestone,
              fileName
            );

          return interaction.editReply({
            embeds: [embed],
            files: [attachment],
          });
        }

        // ----------------------------------------------
        // /tiktokleaderboard update
        // ----------------------------------------------

        if (
          interaction.commandName ===
          "tiktokleaderboard"
        ) {

          const subcommand =
            interaction.options.getSubcommand();

          if (
            subcommand === "update"
          ) {

            await interaction.deferReply({
              ephemeral: true,
            });

            await snapshotAllConnections();

            return interaction.editReply(
              "✅ TikTok statistics and weekly snapshots have been updated."
            );
          }

          // --------------------------------------------
          // leaderboard post
          // --------------------------------------------

          if (
            subcommand === "post"
          ) {

            await interaction.deferReply({
              ephemeral: true,
            });

            const guild =
              interaction.guild;

            const members =
              await getLeaderboardMembers(
                guild
              );

            members.sort(
              (a, b) =>
                Number(
                  b.connection.follower_count ||
                  0
                ) -
                Number(
                  a.connection.follower_count ||
                  0
                )
            );

            const top10 =
              members.slice(0, 10);

            if (!top10.length) {
              return interaction.editReply(
                "❌ No eligible TikTok/Lampoon members were found."
              );
            }

            const image =
              await createLeaderboardImage(
                top10
              );

            const fileName =
              "tiktok-leaderboard.png";

            const attachment =
              new AttachmentBuilder(
                image,
                {
                  name: fileName,
                }
              );

            const embed =
              createLeaderboardEmbed(
                top10,
                fileName
              );

            const channel =
              await client.channels.fetch(
                TIKTOK_LEADERBOARD_CHANNEL_ID
              );

            if (
              !channel ||
              !channel.isTextBased()
            ) {
              return interaction.editReply(
                "❌ Leaderboard channel is not configured correctly."
              );
            }

            await channel.send({
              embeds: [embed],
              files: [attachment],
            });

            await interaction.editReply(
              "✅ TikTok leaderboard posted."
            );
          }
        }

        // ----------------------------------------------
        // /growthcharacter
        // ----------------------------------------------

        if (
          interaction.commandName ===
          "growthcharacter"
        ) {

          const subcommand =
            interaction.options.getSubcommand();

          // Admin/staff protection
          if (
            !interaction.memberPermissions?.has(
              "ManageGuild"
            )
          ) {
            return interaction.reply({
              content:
                "❌ You need **Manage Server** permission to manage growth characters.",
              ephemeral: true,
            });
          }

          const user =
            interaction.options.getUser(
              "member"
            );

          // --------------------------------------------
          // SET
          // --------------------------------------------

          if (
            subcommand === "set"
          ) {

            const attachment =
              interaction.options.getAttachment(
                "image"
              );

            if (!attachment) {
              return interaction.reply({
                content:
                  "❌ Please upload a character image.",
                ephemeral: true,
              });
            }

            const allowed =
              [
                "image/png",
                "image/jpeg",
                "image/webp",
              ];

            if (
              !allowed.includes(
                attachment.contentType
              )
            ) {
              return interaction.reply({
                content:
                  "❌ Please use PNG, JPG, or WEBP.",
                ephemeral: true,
              });
            }

            await interaction.deferReply({
              ephemeral: true,
            });

            const response =
              await fetch(
                attachment.url
              );

            if (!response.ok) {
              return interaction.editReply(
                "❌ Failed to download the character image."
              );
            }

            const buffer =
              Buffer.from(
                await response.arrayBuffer()
              );

            await saveCharacter(
              user.id,
              buffer
            );

            return interaction.editReply(
              `✅ Custom Solo Growth character saved for **${user.username}**.`
            );
          }

          // --------------------------------------------
          // PREVIEW
          // --------------------------------------------

          if (
            subcommand === "preview"
          ) {

            const file =
              getCharacterFile(
                user.id
              );

            if (!file) {
              return interaction.reply({
                content:
                  "❌ This member does not have a custom character.",
                ephemeral: true,
              });
            }

            return interaction.reply({
              content:
                `🎨 Custom character for **${user.username}**`,
              files: [file],
              ephemeral: true,
            });
          }

          // --------------------------------------------
          // RESET
          // --------------------------------------------

          if (
            subcommand === "reset"
          ) {

            const file =
              getCharacterFile(
                user.id
              );

            if (!file) {
              return interaction.reply({
                content:
                  "ℹ️ This member does not have a custom character.",
                ephemeral: true,
              });
            }

            resetCharacter(
              user.id
            );

            return interaction.reply({
              content:
                `✅ Custom Solo Growth character reset for **${user.username}**.`,
              ephemeral: true,
            });
          }
        }
      }

    } catch (error) {

      console.error(
        "Interaction error:",
        error
      );

      if (
        interaction.deferred
      ) {
        await interaction.editReply(
          "❌ An unexpected error occurred."
        ).catch(() => {});
      } else if (
        !interaction.replied
      ) {
        await interaction.reply({
          content:
            "❌ An unexpected error occurred.",
          ephemeral: true,
        }).catch(() => {});
      }
    }
  }
);

// ======================================================
// GROWTH ANNOUNCEMENT
// ======================================================

async function sendGrowthAnnouncement(
  userId,
  connection,
  milestone
) {
  if (!LOG_CHANNEL_ID) {
    return;
  }

  try {
    const guild =
      await client.guilds.fetch(
        GUILD_ID
      );

    const member =
      await guild.members.fetch(
        userId
      );

    const banner =
      await createGrowthBanner(
        userId,
        connection,
        guild
      );

    const fileName =
      "growth-milestone.png";

    const attachment =
      new AttachmentBuilder(
        banner,
        {
          name: fileName,
        }
      );

    const profileUrl =
      connection.profile_url ||
      getTikTokURL(
        connection.username
      );

    const embed =
      new EmbedBuilder()
        .setColor("#F8D85C")
        .setTitle(
          `🎉 ${TIKTOK_EMOJI} Growth Milestone Reached!`
        )
        .setDescription(
          [
            `<@${userId}> has reached **${formatNumber(
              milestone
            )} TikTok followers!**`,
            "",
            `**[@${connection.username}](${profileUrl})**`,
            "",
            "Keep creating. Keep growing.",
          ].join("\n")
        )
        .setImage(
          `attachment://${fileName}`
        )
        .setFooter({
          text:
            "Lampoon • Solo Growth",
        });

    const channel =
      await client.channels.fetch(
        LOG_CHANNEL_ID
      );

    if (
      channel?.isTextBased()
    ) {
      await channel.send({
        content:
          `<@${userId}>`,
        embeds: [embed],
        files: [attachment],
      });
    }
  } catch (error) {
    console.error(
      "Growth announcement failed:",
      error
    );
  }
}

// ======================================================
// OAUTH CONNECT
// ======================================================

app.get(
  "/tiktok/connect",
  (req, res) => {

    const userId =
      req.query.user_id;

    if (!userId) {
      return res
        .status(400)
        .send(
          "Missing Discord user ID."
        );
    }

    const state =
      createOAuthState(
        userId
      );

    const redirectUri =
      `${BASE_URL}/tiktok/callback`;

    const params =
      new URLSearchParams({
        client_key:
          TIKTOK_CLIENT_KEY,

        response_type:
          "code",

        scope:
          "user.info.basic,user.info.profile,user.info.stats",

        redirect_uri:
          redirectUri,

        state,
      });

    const url =
      `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

    return res.redirect(url);
  }
);

// ======================================================
// OAUTH CALLBACK
// ======================================================

app.get(
  "/tiktok/callback",
  async (req, res) => {

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
            `TikTok authorization failed: ${error_description || error}`
          );
      }

      const session =
        verifyOAuthState(
          state
        );

      if (!session) {
        return res
          .status(400)
          .send(
            "Invalid or expired OAuth session."
          );
      }

      if (!code) {
        return res
          .status(400)
          .send(
            "Missing TikTok authorization code."
          );
      }

      const body =
        new URLSearchParams();

      body.append(
        "client_key",
        TIKTOK_CLIENT_KEY
      );

      body.append(
        "client_secret",
        TIKTOK_CLIENT_SECRET
      );

      body.append(
        "code",
        code
      );

      body.append(
        "grant_type",
        "authorization_code"
      );

      body.append(
        "redirect_uri",
        `${BASE_URL}/tiktok/callback`
      );

      const tokenResponse =
        await fetch(
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

      const tokenData =
        await tokenResponse.json();

      if (
        !tokenResponse.ok ||
        !tokenData.access_token
      ) {
        console.error(
          "TikTok token response:",
          tokenData
        );

        return res
          .status(500)
          .send(
            "Failed to obtain TikTok access token."
          );
      }

      const connection = {
        access_token:
          tokenData.access_token,

        refresh_token:
          tokenData.refresh_token,

        expires_in:
          tokenData.expires_in,

        connected_at:
          new Date().toISOString(),
      };

      saveConnection(
        session.userId,
        connection
      );

      const updated =
        await updateConnectionStats(
          session.userId
        );

      if (!updated) {
        return res
          .status(500)
          .send(
            "TikTok connected, but profile information could not be retrieved."
          );
      }

      await processGrowthMilestone(
        session.userId,
        updated
      );

      saveWeeklySnapshot(
        session.userId,
        updated
      );

      // ----------------------------------------------
      // ROLE ASSIGNMENT
      // ----------------------------------------------

      try {

        const guild =
          await client.guilds.fetch(
            GUILD_ID
          );

        const member =
          await guild.members.fetch(
            session.userId
          );

        if (
          updated.eligible
        ) {

          if (
            LAMPOON_ROLE_ID &&
            !member.roles.cache.has(
              LAMPOON_ROLE_ID
            )
          ) {
            await member.roles.add(
              LAMPOON_ROLE_ID,
              "Eligible TikTok Lampoon integration"
            );
          }

          if (
            CONTENT_CREATOR_ROLE_ID &&
            !member.roles.cache.has(
              CONTENT_CREATOR_ROLE_ID
            )
          ) {
            await member.roles.add(
              CONTENT_CREATOR_ROLE_ID,
              "Eligible TikTok content creator"
            );
          }

          if (
            FOLLOWERS_ROLE_ID &&
            member.roles.cache.has(
              FOLLOWERS_ROLE_ID
            )
          ) {
            await member.roles.remove(
              FOLLOWERS_ROLE_ID,
              "TikTok eligibility verified"
            );
          }
        }

      } catch (roleError) {

        console.error(
          "Role assignment error:",
          roleError
        );
      }

      const profileUrl =
        updated.profile_url ||
        getTikTokURL(
          updated.username
        );

      return res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>TikTok Connected</title>
<style>
body {
  background:#090909;
  color:white;
  font-family:Arial,sans-serif;
  text-align:center;
  padding:60px 20px;
}
.box {
  max-width:650px;
  margin:auto;
  padding:40px;
  border:2px solid #C48D21;
  border-radius:25px;
  background:#151515;
}
h1 {
  color:#F8D85C;
}
a {
  color:#F8D85C;
}
</style>
</head>
<body>
<div class="box">
<h1>🎉 TikTok Connected!</h1>

<p>
Your TikTok account has been successfully connected to Lampoon.
</p>

<p>
<strong>@${escapeHTML(
  updated.username
)}</strong>
</p>

<p>
Followers:
<strong>${formatNumber(
  updated.follower_count
)}</strong>
</p>

<p>
Your TikTok connection is now available for
<strong>Solo Growth</strong> and the
<strong>Weekly Leaderboard</strong>.
</p>

<p>
<a href="${profileUrl}" target="_blank">
View TikTok Profile
</a>
</p>

<p>You may close this page.</p>
</div>
</body>
</html>
`);

    } catch (error) {

      console.error(
        "TikTok callback error:",
        error
      );

      return res
        .status(500)
        .send(
          "TikTok connection failed."
        );
    }
  }
);

// ======================================================
// PRIVACY POLICY
// ======================================================

app.get(
  "/privacy/",
  (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Privacy Policy</title>
</head>
<body>
<h1>Privacy Policy</h1>

<p>
Lampoon Role Manager uses TikTok OAuth to connect a user's TikTok account with their Discord account.
</p>

<p>
The integration may process TikTok profile information such as username, display name, profile picture, follower count, following count, likes and video count.
</p>

<p>
This information is used to provide TikTok verification, Solo Growth and leaderboard functionality.
</p>

<p>
Users may request removal of their connected TikTok information through the server administration.
</p>

</body>
</html>
`);
  }
);

// ======================================================
// TERMS
// ======================================================

app.get(
  "/terms/",
  (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Terms of Service</title>
</head>
<body>
<h1>Terms of Service</h1>

<p>
By using the Lampoon TikTok Integration, you agree to allow the application to connect your TikTok account for the features provided by the Discord server.
</p>

<p>
The integration is provided for TikTok verification, creator growth tracking and leaderboard functionality.
</p>

</body>
</html>
`);
  }
);

// ======================================================
// HEALTH
// ======================================================

app.get(
  "/health",
  (req, res) => {
    res.status(200).send("OK");
  }
);

// ======================================================
// HOME
// ======================================================

app.get(
  "/",
  (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Lampoon Role Manager</title>
</head>
<body>
<h1>Lampoon Role Manager</h1>

<p>TikTok integration is online.</p>

<p>
<a href="/privacy/">
Privacy Policy
</a>
</p>

<p>
<a href="/terms/">
Terms of Service
</a>
</p>

</body>
</html>
`);
  }
);

// ======================================================
// START WEB SERVER
// ======================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `🌐 Web server running on port ${PORT}`
    );
  }
);

// ======================================================
// DISCORD LOGIN
// ======================================================

console.log(
  "Starting Discord login..."
);

console.log(
  "DISCORD_TOKEN configured:",
  Boolean(DISCORD_TOKEN)
);

console.log(
  "DISCORD_CLIENT_ID:",
  DISCORD_CLIENT_ID
);

console.log(
  "GUILD_ID:",
  GUILD_ID
);

if (!DISCORD_TOKEN) {
  console.error(
    "❌ DISCORD_TOKEN is missing."
  );

  process.exit(1);
}

client
  .login(DISCORD_TOKEN)
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

setTimeout(() => {

  if (!client.isReady()) {

    console.error(
      "❌ Discord login has not completed after 30 seconds."
    );

    console.error(
      "The bot is not reaching the Discord READY event."
    );
  }

}, 30000);
