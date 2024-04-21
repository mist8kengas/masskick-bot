import {
  ButtonBuilder,
  type MessageActionRowComponentBuilder,
  SlashCommandBuilder,
} from "@discordjs/builders";
import {
  ActionRowBuilder,
  ButtonStyle,
  EmbedBuilder,
  type GuildMember,
  PermissionFlagsBits,
} from "discord.js";
import type { Command } from "..";

/**
 * Returns Map object as an array with key/value pairs
 * @abstract
 */
function mapToArray<K, V>(map: Map<K, V>) {
  const array = new Array<[K, V]>();
  map.forEach((value, key) => array.push([key, value]));
  return array;
}

const validSnowflake = new RegExp(/^<@(?<id>\d{18,})>$/);

enum KickStatus {
  NotKicked = 0,
  Kicked = 1,
  Error = 2,
}
/**
 * Parse kick status as human-readable emojis
 */
function toKsEmoji(kickStatus: KickStatus) {
  switch (kickStatus) {
    case KickStatus.NotKicked:
      return ":black_large_square:";

    case KickStatus.Kicked:
      return ":green_square:";

    case KickStatus.Error:
      return ":red_square:";
  }
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription(
      "Kick a single user or multiple users delimited with a space",
    )
    .addStringOption((option) =>
      option
        .setName("user")
        .setDescription("Target users to kick delimited with a space")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Kick reason message"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  name: "kick",
  description: "Kick a single user or multiple",
  usage: "kick <users>",
  execute: async ({ interaction }) => {
    if (!interaction.inGuild()) return;

    // get member arguments
    const rawUsersInput = interaction.options.get("user", true).value;
    if (typeof rawUsersInput !== "string")
      throw new Error("Input is not of type string");

    // get kick reason argument
    const kickReason = interaction.options.get("reason")?.value;

    // parse member arguments: part 1
    const usersInput = rawUsersInput.toString().split(" ");

    // parse member arguments: part 2
    const users = new Array<GuildMember>();
    await Promise.all(
      usersInput.map(async (dirtyUser) => {
        const userId = validSnowflake.exec(dirtyUser)?.groups?.id;
        if (!validSnowflake.test(dirtyUser) || userId === undefined) return;

        // check if user is in the guild
        const guildMember = await interaction.guild?.members.fetch(userId);
        if (!guildMember) return;

        users.push(guildMember);
      }),
    );

    if (users.length === 0)
      throw new Error(
        "No valid users mentioned! Make sure to add a space between each user and try again.",
      );

    // confirmation dialogue
    const replyEmbed = new EmbedBuilder()
      .setTitle("Kick members?")
      .setDescription(
        [...users.map((user) => `- ${user.toString()}`)].join("\n"),
      )
      .setFooter({
        text: "If there are any missing members, make sure that the input is correct and try again",
      });

    // confirmation buttons
    const confirmButton = new ButtonBuilder({
      custom_id: "confirm",
      label: "Kick",
      style: ButtonStyle.Danger,
    });
    const cancelButton = new ButtonBuilder({
      custom_id: "cancel",
      label: "Cancel",
      style: ButtonStyle.Secondary,
    });

    const actionRow =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        confirmButton,
        cancelButton,
      );
    const replyMessage = await interaction.reply({
      embeds: [replyEmbed],
      components: [actionRow],
    });

    // wait for user confirmation
    const confirmation = await replyMessage.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60_000,
    });

    switch (confirmation.customId) {
      case "confirm": {
        replyEmbed.setTitle("Kicking members").setFooter(null);

        const kickQueue = new Map<GuildMember["id"], [GuildMember, KickStatus]>(
          users.map((user) => [user.id, [user, KickStatus.NotKicked]]),
        );

        replyEmbed.setDescription(
          mapToArray(kickQueue)
            .map(
              ([, [user, status]]) => `${toKsEmoji(status)} ${user.toString()}`,
            )
            .join("\n"),
        );
        await interaction.editReply({
          embeds: [replyEmbed],
          components: [],
        });

        // handle user kicks
        for (const user of users) {
          const kick = await user
            .kick(kickReason?.toString())
            .catch((error) => {
              console.warn("[user:kick]", error);
              kickQueue.set(user.id, [user, KickStatus.Error]);
              return null;
            });
          if (kick) kickQueue.set(user.id, [user, KickStatus.Kicked]);

          // update message per kick action
          replyEmbed.setDescription(
            mapToArray(kickQueue)
              .map(
                ([, [user, status]]) =>
                  `${toKsEmoji(status)} ${user.toString()}`,
              )
              .join("\n"),
          );
          await interaction.editReply({
            embeds: [replyEmbed],
            components: [],
          });
        }

        // finish
        replyEmbed
          .setTitle("Kicked members")
          .setDescription(
            `:white_check_mark: Successfully kicked ${
              mapToArray(kickQueue).filter(([, [, kicked]]) => !!kicked).length
            } members`,
          )
          .setFooter(null);
        interaction.editReply({ embeds: [replyEmbed], components: [] });

        break;
      }

      default: {
        replyEmbed
          .setTitle(null)
          .setDescription(":white_check_mark: Cancelled kick command")
          .setFooter(null);
        interaction.editReply({ embeds: [replyEmbed], components: [] });

        break;
      }
    }
  },
};
export default command;
