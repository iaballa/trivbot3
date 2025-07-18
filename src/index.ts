import {
  Client,
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  ModalActionRowComponentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  CacheType,
  MessageFlags,
  CommandInteraction,
} from "discord.js";

import { config } from "./config";

import { commands } from "./commands";
import { deployCommands, normalize } from "./deploy-commands";
import { entry_map } from "./commands/trivia";

const client = new Client({
  intents: ["Guilds", "GuildMembers", "DirectMessages"],
});

// Save interactions for each user
export const user_interactions = new Map<
  string,
  CommandInteraction<CacheType>
>();

client.login(config.DISCORD_TOKEN).catch((err) => {
  console.error("Failed to login:", err);
});

client.once("ready", () => {
  console.log("valorant trivia bot is live :3");
});

client.on("guildCreate", async (guild) => {
  await deployCommands({ guildId: guild.id });
});

// upon user interactions (with button or modal)
client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    const { commandName } = interaction;

    if (commands[commandName as keyof typeof commands]) {
      // console.log("executing " + commandName);
      commands[commandName as keyof typeof commands].execute(interaction);
    }
  }

  if (interaction.isButton() && interaction.customId === "triv_button") {
    const entry = entry_map.get(interaction.user.id);

    const modal = new ModalBuilder()
      .setCustomId("triv_modal")
      .setTitle("Submit Your Guess!");

    const guess_textbox = new TextInputBuilder()
      .setCustomId("guess_input")
      .setLabel((entry?.question as string).slice(0, 45))
      .setStyle(TextInputStyle.Short);

    // Add guess_textbox to Modal
    const guess =
      new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
        guess_textbox
      );
    modal.addComponents(guess);

    await interaction.showModal(modal);
  }

  // Handling Modal Submission
  if (interaction.isModalSubmit() && interaction.customId === "triv_modal") {
    const input_guess = interaction.fields.getTextInputValue("guess_input");
    const entry = entry_map.get(interaction.user.id);
    const original_message = user_interactions.get(interaction.user.id);

    // Close Modal Immediately after Submission
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // console.log("anwswer: " + entry?.answer);
    // console.log("guess: " + input_guess);

    if (normalize(input_guess) === normalize(entry?.answer as string)) {
      // console.log("answered correctly");

      await original_message?.editReply({
        content:
          ":white_check_mark: Correct! :white_check_mark: \n Question: " +
          entry?.question +
          " \n You answered: **" +
          input_guess +
          "\n \n ** Use /trivia again to answer another question!",
        components: [],
      });

      interaction.deleteReply();
    } else {
      // console.log("incorrect answer: ", input_guess);
      const retry_button = new ButtonBuilder()
        .setCustomId("triv_button")
        .setLabel("Click here to Guess Again!")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        retry_button
      );
      await original_message?.editReply({
        content:
          ":x: Incorrect! :x: \n Your previous answer was: **" +
          input_guess +
          "\n \n ** Try again: " +
          entry?.question,
        components: [row],
      });

      await interaction.deleteReply();
    }
  }
});
