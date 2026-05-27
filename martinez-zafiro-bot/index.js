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

const app = express();
app.get("/", (req, res) => res.send("Martinez Zafiro Bot activo"));
app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor web activo");
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const servicios = new Map();

client.once("ready", async () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  const canal = await client.channels.fetch(PANEL_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle("🔧 MARTINEZ ZAFIRO SPARKLE")
    .setDescription(
      "Sistema oficial de servicio del taller.\n\n" +
      "Presiona un botón para entrar o salir de servicio."
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

  await canal.send({ embeds: [embed], components: [row] });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;
  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

  if (interaction.customId === "entrar_servicio") {
    if (servicios.has(userId)) {
      return interaction.reply({ content: "⚠️ Ya estás en servicio.", ephemeral: true });
    }

    const entrada = Date.now();
    servicios.set(userId, entrada);

    const embed = new EmbedBuilder()
      .setTitle("🟢 Entrada en servicio")
      .setDescription(`👤 Usuario: ${interaction.user}\n🕒 Hora: <t:${Math.floor(entrada / 1000)}:F>`)
      .setColor(0xff7a00);

    await logChannel.send({ embeds: [embed] });
    return interaction.reply({ content: "✅ Entraste en servicio.", ephemeral: true });
  }

  if (interaction.customId === "salir_servicio") {
    if (!servicios.has(userId)) {
      return interaction.reply({ content: "⚠️ No estás en servicio.", ephemeral: true });
    }

    const entrada = servicios.get(userId);
    const salida = Date.now();
    const total = salida - entrada;

    const horas = Math.floor(total / 3600000);
    const minutos = Math.floor((total % 3600000) / 60000);

    servicios.delete(userId);

    const embed = new EmbedBuilder()
      .setTitle("🔴 Salida de servicio")
      .setDescription(
        `👤 Usuario: ${interaction.user}\n` +
        `🕒 Entrada: <t:${Math.floor(entrada / 1000)}:t>\n` +
        `🕒 Salida: <t:${Math.floor(salida / 1000)}:t>\n\n` +
        `⏱️ Tiempo trabajado: ${horas}h ${minutos}m`
      )
      .setColor(0xff7a00);

    await logChannel.send({ embeds: [embed] });
    return interaction.reply({
      content: `✅ Saliste de servicio.\n⏱️ Tiempo trabajado: ${horas}h ${minutos}m`,
      ephemeral: true
    });
  }
});

client.login(TOKEN);