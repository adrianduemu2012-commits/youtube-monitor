const fs = require('node:fs/promises');
const path = require('node:path');
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require('discord.js');

const required = [
  'DISCORD_TOKEN',
  'CLIENT_ID',
  'GUILD_ID',
  'YOUTUBE_API_KEY',
  'YOUTUBE_CHANNEL_ID',
  'DISCORD_WEBHOOK_URL',
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Faltan variables de entorno: ${missing.join(', ')}`);
  process.exit(1);
}

const POLL_INTERVAL_MS = 15 * 60 * 1000;
const STATE_FILE = process.env.STATE_FILE || path.join(process.cwd(), 'state.json');
const MAX_SEEN = 100;
let seenIds = new Set();
let initialized = false;
let checking = false;

const command = new SlashCommandBuilder()
  .setName('prueba')
  .setDescription('Envía una notificación de prueba al canal configurado');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function loadState() {
  try {
    const state = JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
    seenIds = new Set(Array.isArray(state.seenIds) ? state.seenIds.slice(-MAX_SEEN) : []);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('No se pudo leer state.json:', error.message);
  }
}

async function saveState() {
  const values = [...seenIds].slice(-MAX_SEEN);
  await fs.writeFile(STATE_FILE, JSON.stringify({ seenIds: values }, null, 2));
}

async function registerCommand() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: [command.toJSON()] },
  );
  console.log('Comando /prueba registrado en el servidor.');
}

function canModerate(interaction) {
  const permissions = interaction.memberPermissions;
  return permissions && (
    permissions.has(PermissionFlagsBits.Administrator) ||
    permissions.has(PermissionFlagsBits.ModerateMembers) ||
    permissions.has(PermissionFlagsBits.ManageMessages)
  );
}

async function sendWebhook(content, username = '📢 @mnt_manuti') {
  const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, content }),
  });
  if (!response.ok) {
    throw new Error(`Discord respondió ${response.status}: ${await response.text()}`);
  }
}

async function fetchLatestItems() {
  const params = new URLSearchParams({
    part: 'snippet',
    channelId: process.env.YOUTUBE_CHANNEL_ID,
    order: 'date',
    maxResults: '10',
    type: 'video',
    key: process.env.YOUTUBE_API_KEY,
  });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!response.ok) {
    throw new Error(`YouTube respondió ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  return (data.items || []).filter((item) => item.id?.videoId);
}

function formatNotification(item) {
  const id = item.id.videoId;
  const title = item.snippet?.title || 'Sin título';
  const description = item.snippet?.description || '';
  const liveStatus = item.snippet?.liveBroadcastContent;
  const prefix = liveStatus === 'live' ? '🔴 DIRECTO' : liveStatus === 'upcoming' ? '⏰ DIRECTO PROGRAMADO' : '🎬 VÍDEO NUEVO';
  return `${prefix}\n**${title}**\n${description}\n🔗 https://youtube.com/watch?v=${id}`;
}

async function checkYouTube() {
  if (checking) return;
  checking = true;
  try {
    const items = await fetchLatestItems();
    if (!items.length) {
      console.log('YouTube no devolvió vídeos.');
      return;
    }

    // La primera consulta crea la línea base y no manda avisos antiguos.
    if (!initialized && seenIds.size === 0) {
      for (const item of items) seenIds.add(item.id.videoId);
      initialized = true;
      await saveState();
      console.log(`Línea base creada con ${items.length} vídeos; no se enviaron avisos antiguos.`);
      return;
    }

    initialized = true;
    const newItems = items
      .filter((item) => !seenIds.has(item.id.videoId))
      .reverse();

    for (const item of newItems) {
      await sendWebhook(formatNotification(item));
      seenIds.add(item.id.videoId);
      console.log(`Notificación enviada: ${item.id.videoId}`);
    }

    if (newItems.length === 0) console.log('Sin vídeos o directos nuevos.');
    await saveState();
  } finally {
    checking = false;
  }
}

client.once('ready', async () => {
  console.log(`Bot conectado como ${client.user.tag}`);
  console.log('Monitor iniciado: comprobación cada 900 segundos.');
  await loadState();
  try {
    await checkYouTube();
  } catch (error) {
    console.error('Error en la consulta inicial:', error.message);
  }
  setInterval(() => checkYouTube().catch((error) => {
    console.error('Error consultando YouTube:', error.message);
  }), POLL_INTERVAL_MS);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'prueba') return;
  if (!canModerate(interaction)) {
    await interaction.reply({ content: 'No tienes permiso de moderación para usar este comando.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });
  try {
    await sendWebhook(`✅ **Prueba correcta** | Ejecutada por **${interaction.user.tag}** | ${new Date().toISOString()}`, 'Prueba YouTube');
    await interaction.editReply('Prueba enviada correctamente al canal configurado.');
  } catch (error) {
    console.error('Error enviando la prueba:', error.message);
    await interaction.editReply('No se pudo enviar la prueba. Revisa el webhook.');
  }
});

(async () => {
  try {
    await registerCommand();
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('Error al iniciar el bot:', error);
    process.exit(1);
  }
})();
