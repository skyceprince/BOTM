const express = require("express");
const fs = require("fs");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const TOKEN = process.env.TOKEN;

const PANEL_CHANNEL_ID = "1508935042431455493";
const LOG_CHANNEL_ID = "1508988018290065539";
const WORKING_CHANNEL_ID = "1508935220211089599";

const HORAS_FILE = "./horas.json";

const app = express();

app.get("/", (req, res) => {
  res.send("Martinez Zafiro Sparkle Bot activo");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor web activo");
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const servicios = new Map();
const mensajesTrabajando = new Map();

function cargarHoras() {
  if (!fs.existsSync(HORAS_FILE)) {
    fs.writeFileSync(HORAS_FILE, JSON.stringify({}, null, 2));
  }

  return JSON.parse(fs.readFileSync(HORAS_FILE, "utf8"));
}

function guardarHoras(data) {
  fs.writeFileSync(HORAS_FILE, JSON.stringify(data, null, 2));
}

function formatearTiempo(ms) {
  const horas = Math.floor(ms / 3600000);
  const minutos = Math.floor((ms % 3600000) / 60000);
  return `${horas}h ${minutos}m`;
}

client.once("ready", async () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  const canal = await client.channels.fetch(PANEL_CHANNEL_ID);

  const mensajes = await canal.messages.fetch({ limit: 10 });

  const existePanel = mensajes.find(
    msg =>
      msg.author.id === client.user.id &&
      msg.embeds.length > 0 &&
      msg.embeds[0].title?.includes("MARTINEZ ZAFIRO SPARKLE")
  );

  if (!existePanel) {
    const embed = new EmbedBuilder()
      .setTitle("🔧 MARTINEZ ZAFIRO SPARKLE")
      .setDescription(
        "Sistema oficial de servicio del taller.\n\n" +
        "Usa los botones para entrar o salir de servicio.\n\n" +
        "📒 Toda actividad quedará registrada automáticamente."
      )
      .setColor(0xff7a00);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("entrar_servicio")
        .setLabel("Entrar en servicio")
        .setEmoji("🟢")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("salir_servicio")
        .setLabel("Salir de servicio")
        .setEmoji("🔴")
        .setStyle(ButtonStyle.Danger)
    );

    await canal.send({
      embeds: [embed],
      components: [row]
    });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;
  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

  if (interaction.customId === "entrar_servicio") {
    if (servicios.has(userId)) {
      return interaction.reply({
        content: "⚠️ Ya estás en servicio.",
        ephemeral: true
      });
    }

    const entrada = Date.now();
    servicios.set(userId, entrada);

    const logEmbed = new EmbedBuilder()
      .setTitle("🟢 Entrada en servicio")
      .setDescription(
        `👤 Usuario: ${interaction.user}\n` +
        `🆔 ID: ${userId}\n` +
        `🕒 Hora: <t:${Math.floor(entrada / 1000)}:F>`
      )
      .setColor(0xff7a00);

    await logChannel.send({ embeds: [logEmbed] });

    const workingChannel = await client.channels.fetch(WORKING_CHANNEL_ID);

    const workingEmbed = new EmbedBuilder()
      .setTitle("🟢 Trabajador en servicio")
      .setDescription(
        `👤 ${interaction.user} está trabajando actualmente.\n\n` +
        `🔧 Taller: Martinez Zafiro Sparkle\n` +
        `🕒 Entrada: <t:${Math.floor(entrada / 1000)}:t>`
      )
      .setColor(0xff7a00);

    const workingMessage = await workingChannel.send({
      embeds: [workingEmbed]
    });

    mensajesTrabajando.set(userId, workingMessage.id);

    return interaction.reply({
      content: "✅ Entraste en servicio.",
      ephemeral: true
    });
  }

  if (interaction.customId === "salir_servicio") {
    if (!servicios.has(userId)) {
      return interaction.reply({
        content: "⚠️ No estás en servicio.",
        ephemeral: true
      });
    }

    const entrada = servicios.get(userId);
    const salida = Date.now();
    const total = salida - entrada;

    servicios.delete(userId);

    const data = cargarHoras();

    if (!data[userId]) {
      data[userId] = [];
    }

    data[userId].push({
      usuario: interaction.user.tag,
      entrada,
      salida,
      total
    });

    guardarHoras(data);

    const logEmbed = new EmbedBuilder()
      .setTitle("🔴 Salida de servicio")
      .setDescription(
        `👤 Usuario: ${interaction.user}\n` +
        `🆔 ID: ${userId}\n` +
        `🕒 Entrada: <t:${Math.floor(entrada / 1000)}:t>\n` +
        `🕒 Salida: <t:${Math.floor(salida / 1000)}:t>\n\n` +
        `⏱️ Tiempo trabajado: ${formatearTiempo(total)}`
      )
      .setColor(0xff7a00);

    await logChannel.send({ embeds: [logEmbed] });

    const workingChannel = await client.channels.fetch(WORKING_CHANNEL_ID);
    const workingMessageId = mensajesTrabajando.get(userId);

    if (workingMessageId) {
      try {
        const msg = await workingChannel.messages.fetch(workingMessageId);
        await msg.delete();
      } catch (error) {
        console.log("No se pudo borrar el mensaje de trabajando:", error.message);
      }

      mensajesTrabajando.delete(userId);
    }

    return interaction.reply({
      content: `✅ Saliste de servicio.\n⏱️ Tiempo trabajado: ${formatearTiempo(total)}`,
      ephemeral: true
    });
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (!message.content.startsWith("!horas")) return;

  const args = message.content.split(" ");
  const userId = args[1];

  if (!userId) {
    return message.reply("⚠️ Usa el comando así: `!horas ID_DE_DISCORD`");
  }

  const data = cargarHoras();

  if (!data[userId] || data[userId].length === 0) {
    return message.reply("⚠️ No hay horas registradas para ese ID.");
  }

  const registros = data[userId];

  let totalGeneral = 0;

  let descripcion = "";

  registros.slice(-10).forEach((r, index) => {
    totalGeneral += r.total;

    descripcion +=
      `**${index + 1}. Fecha:** <t:${Math.floor(r.entrada / 1000)}:D>\n` +
      `🟢 Entrada: <t:${Math.floor(r.entrada / 1000)}:t>\n` +
      `🔴 Salida: <t:${Math.floor(r.salida / 1000)}:t>\n` +
      `⏱️ Tiempo: ${formatearTiempo(r.total)}\n\n`;
  });

  const totalTodas = registros.reduce((acc, r) => acc + r.total, 0);

  const embed = new EmbedBuilder()
    .setTitle("📒 Horas trabajadas")
    .setDescription(
      `👤 Usuario ID: \`${userId}\`\n` +
      `📌 Registros mostrados: últimos 10\n` +
      `⏱️ Total acumulado: **${formatearTiempo(totalTodas)}**\n\n` +
      descripcion
    )
    .setColor(0xff7a00);

  return message.reply({ embeds: [embed] });
});

client.login(TOKEN);
