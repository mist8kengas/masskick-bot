import {
  type CommandInteraction,
  EmbedBuilder,
  type Message,
  type PartialMessage,
} from "discord.js";
import type { ExtendedClient } from "..";

export interface Externals {
  deletedMessages: Map<string, [Message | PartialMessage, boolean]>;
  github: URL;
}

async function handleError(
  interaction: CommandInteraction,
  error: Error | undefined,
) {
  console.error("[interaction:error]", error);

  const errorMessage = new EmbedBuilder().setDescription(
    ":warning: An error occured while trying to run this command.",
  );

  if (error) {
    errorMessage.setDescription(
      [
        ":warning: An error occured while trying to run this command:",
        error && `\`\`\`${error.message}\`\`\``,
      ].join("\n"),
    );
  }

  await interaction
    .reply({
      embeds: [errorMessage],
      ephemeral: true,
    })
    .catch((error) => console.error("[interaction:error:fatal]", error));
}

export default async function interactionCreate(
  client: ExtendedClient,
  interaction: CommandInteraction,
) {
  // return if interaction is not a command
  if (!interaction.isCommand()) return;

  // get command
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // execute command
  await command
    .execute({ client, interaction })
    .catch((e) => handleError(interaction, e));
}
