import { readdirSync } from "node:fs";
import {
  ActivityType,
  Client,
  Collection,
  type CommandInteraction,
  IntentsBitField,
  type Interaction,
} from "discord.js";

// handlers
import interactionCreate from "./handlers/interactionCreate.js";

// types
import type { SlashCommandBuilder } from "@discordjs/builders";

export declare interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
}

export declare interface Command {
  data: SlashCommandBuilder;
  name: string;
  description: string;
  usage: string;
  execute: (data: CommandPayload) => Promise<unknown>;
}

declare interface CommandPayload {
  client: ExtendedClient;
  interaction: CommandInteraction;
}

// bot client
const client = <ExtendedClient>new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildModeration,
  ],
});

// add commands to bot
client.commands = new Collection();
const commandAssets = readdirSync("./build/commands").filter((cmd) =>
  cmd.endsWith(".js"),
);
for (const fileName of commandAssets) {
  const { default: cmd } = await import(`./commands/${fileName}`);
  client.commands.set(cmd.name, cmd);
}

// .env config file
import * as dotenv from "dotenv";
dotenv.config();
const config = { token: process.env.BOT_TOKEN || null };

// when bot has logged in
client.once("ready", () => {
  if (!client.user) return;
  const { user, guilds } = client;
  console.log(
    "[bot]",
    `Logged in as: ${user?.tag}`,
    `in ${guilds.cache.size} servers`,
  );

  // set bot presence
  client.user.setPresence({
    activities: [{ name: "knee cracks", type: ActivityType.Listening }],
    status: "dnd",
  });

  // listen to user commands
  client.on("interactionCreate", (interaction: Interaction) => {
    if (!interaction.isCommand()) return;
    interactionCreate(client, interaction);
  });
});

if (config.token) client.login(config.token).catch(console.error);
else throw new Error("No bot token, can't login! exiting.");
