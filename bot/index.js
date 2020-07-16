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
        }

        storage.queryToken(token, result => {
            if (result) {
                // token exists
                storage.updateToken(token, result => {
                    // add to linked role after marking token as used
                    linkUser(message.author.id);
                });
            } else {
                // token did not exist
                notifyUserNotValidToken(message.author.id);
            }
        });
    }
});

discordjsClient.login(process.env.DISCORD_TOKEN);

/*
 *  Helper functions below
*/
function getGuild() {
    return discordjsClient.guilds.cache.find(guild => guild.id === process.env.DISCORD_GUILD_ID);
}

function notifyUserNotValidToken(userId) {
    let channel = getGuild().channels.get(process.env.DISCORD_LINK_CHANNEL_ID);

    if (channel) {
        channel.send("<@" + userId + ">, the token you provided was either invalid or already used.");
    } else {
        console.log(`Could not find channel with id ${process.env.DISCORD_LINK_CHANNEL_ID}`);
    }
}

function linkUser(userId) {
    let role = getGuild
    let role = getGuild().roles.get(process.env.DISCORD_LINKED_ROLE_ID);
    let member = getGuild().members.get(userId);

    if (role && member) {
        member.roles.add(role);
    }
}

module.exports.addRoleToUser = function (userId, roleName) {
    let role = getGuild().roles.find(role => role.roleName === roleName);
    let member = getGuild().members.get(userId);

    if (role && member) {
        member.roles.add(role);
    }
}

module.exports.removeRoleFromUser = function (userId, roleName) {
    let role = getGuild().roles.find(role => role.roleName === roleName);
    let member = getGuild().members.get(userId);

    if (role && member) {
        member.roles.remove(role);    
    }
}
