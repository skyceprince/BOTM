require("dotenv").config();

const express = require("express");

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

const app = express();

app.get("/", (req, res) => {
  res.send("Martinez Zafiro Sparkle Bot activo");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor web activo");
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const servicios = new Map();
const mensajesTrabajando = new Map();

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
        `🕒 Hora: <t:${Math.floor(entrada / 1000)}:F>`
      )
      .setColor(0xff7a00);

    await logChannel.send({
      embeds: [logEmbed]
    });

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

    const horas = Math.floor(total / 3600000);

    const minutos = Math.floor((total % 3600000) / 60000);

    servicios.delete(userId);

    const logEmbed = new EmbedBuilder()
      .setTitle("🔴 Salida de servicio")
      .setDescription(
        `👤 Usuario: ${interaction.user}\n` +
        `🕒 Entrada: <t:${Math.floor(entrada / 1000)}:t>\n` +
        `🕒 Salida: <t:${Math.floor(salida / 1000)}:t>\n\n` +
        `⏱️ Tiempo trabajado: ${horas}h ${minutos}m`
      )
      .setColor(0xff7a00);

    await logChannel.send({
      embeds: [logEmbed]
    });

    const workingChannel = await client.channels.fetch(WORKING_CHANNEL_ID);

    const workingMessageId = mensajesTrabajando.get(userId);

    if (workingMessageId) {

      try {

        const msg = await workingChannel.messages.fetch(workingMessageId);

        await msg.delete();

      } catch (error) {

        console.log("No se pudo borrar mensaje:", error.message);

      }

      mensajesTrabajando.delete(userId);

    }

    return interaction.reply({
      content:
        `✅ Saliste de servicio.\n` +
        `⏱️ Tiempo trabajado: ${horas}h ${minutos}m`,
      ephemeral: true
    });

  }

});

client.login(TOKEN);
