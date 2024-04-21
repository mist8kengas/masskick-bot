import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { SlashCommandBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import * as dotenv from "dotenv";

// import .env config file
dotenv.config();
const config = {
  token: process.env.BOT_TOKEN || "",
  clientId: process.env.BOT_ID || "",
};

// read command modules
const commands: SlashCommandBuilder[] = new Array();
const commandsPath = join("./build", "commands");

const commandFiles = readdirSync(commandsPath).filter((fileName) =>
  fileName.endsWith(".js"),
);
for (const file of commandFiles) {
  const { default: command } = await import(`../commands/${file}`);
  commands.push(command.data.toJSON());
}

// register global commands
const rest = new REST().setToken(config.token);
rest
  .put(Routes.applicationCommands(config.clientId), { body: commands })
  .then(() => console.log("[rest:put]", `Added ${commands.length} commands`))
  .catch((error: Error) => console.error("[rest:put:error]", error));
