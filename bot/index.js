require('dotenv').config()

const discordjs = require("discord.js");
const discordjsClient = new discordjs.Client();
const storage = require('./storage');

console.log("Starting...");

discordjsClient.on("ready", () => {
    console.log("Client ready.");
});

/*
 *  Listen for messages within the authentication channel
 *  so we can link users
 */
discordjsClient.on("message", async message => {
    if (message.channel.id !== process.env.DISCORD_LINK_CHANNEL_ID) {
        return; // not the authentication channel
    }
    
    // delete any message in the channel after 10s
    message.delete({ timeout: 10000 });

    if (message.author.bot) {
        return; // ignore bots (including this one)
    }

    // check if starts with command plus a space, eg. "!link "
    if (message.content.startsWith(process.env.LINK_COMMAND + " ")) {
        // example: "!link 123e4567"
        let token = message.content.split(" ")[1];

        // tokens are the first 4 bytes of a randomly generated RFC 4122 UUID
        // eg. 123e4567

        // check the length first before hitting the database
        if (token.length !== 8) {
            notifyUserNotValidToken(message.author.id);
            return;
        }

        storage.queryToken(token, result => {
            if (result.length == 0) {
                // token did not exist in storage
                notifyUserNotValidToken(message.author.id);
                return;
            }

            for (let row in result) {
                if (!row['token_used']) {
                    // token exists and was unused
                    storage.updateToken(token, message.author.id, () => {
                        // add to linked role after marking token as used
                        module.exports.addLinkedRoleToUser(message.author.id);
                    });

                    // insert discord user ID into table
                } else {
                    // token was already used
                    notifyUserNotValidToken(message.author.id);
                }
            }
        });
    }
});

discordjsClient.login(process.env.DISCORD_TOKEN);

/*
 *  Helper functions
 */
function getGuild() {
    return discordjsClient.guilds.cache.get(process.env.DISCORD_GUILD_ID);
}

function notifyUserNotValidToken(userId) {
    let channel = getGuild().channels.cache.get(process.env.DISCORD_LINK_CHANNEL_ID);

    if (channel) {
        channel.send("<@" + userId + ">, the token you provided was either invalid or already used.");
    }
}

/*
 *  Exported helper functions
 */
module.exports.addLinkedRoleToUser = function (userId) {
    let member = getGuild().members.cache.get(userId);
    let role = getGuild().roles.cache.get(process.env.DISCORD_LINKED_ROLE_ID);

    if (member && role) {
        member.roles.add(role);
    }
}

module.exports.addRoleToUser = function (userId, roleName) {
    let member = getGuild().members.cache.get(userId);
    let role = getGuild().roles.cache.find(role => role.name.toLowerCase() === roleName.toLowerCase());

    console.log(member);

    if (member && role) {
        member.roles.add(role);
    }
}

module.exports.removeRoleFromUser = function (userId, roleName) {
    let member = getGuild().members.cache.get(userId);
    let role = getGuild().roles.cache.find(role => role.name.toLowerCase() === roleName.toLowerCase());

    if (member && role) {
        member.roles.remove(role);
    }
}
