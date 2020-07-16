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
            notifyMemberNotValidToken(message.member);
            return;
        }

        storage.queryToken(token, result => {
            if (result.length == 0) {
                // token did not exist in storage
                notifyMemberNotValidToken(message.member);
                return;
            }

            for (let row in result) {
                if (!row['token_used']) {
                    // token exists and was unused
                    storage.updateToken(token, message.member, () => {
                        // add to linked role after marking token as used
                        module.exports.addLinkedRoleToMember(message.member);
                    });

                    // insert discord user ID into table
                } else {
                    // token was already used
                    notifyMemberNotValidToken(message.member);
                }
            }
        });
    }
});

discordjsClient.login(process.env.DISCORD_TOKEN);

/*
 *  Helper functions
 */
function notifyMemberNotValidToken(member) {
    let channel = module.exports.getGuild().channels.cache.get(process.env.DISCORD_LINK_CHANNEL_ID);

    if (channel) {
        channel.send("<@" + member.id + ">, the token you provided was either invalid or already used.");
    }
}

/*
 *  Exported helper functions
 */
module.exports.getGuild = function () {
    return discordjsClient.guilds.cache.get(process.env.DISCORD_GUILD_ID);
}

module.exports.getMember = function(userId) {
    return module.exports.getGuild().members.cache.get(userId);
}

module.exports.addLinkedRoleToMember = function (member) {
    let role = module.exports.getGuild().roles.cache.get(process.env.DISCORD_LINKED_ROLE_ID);

    if (role) {
        member.roles.add(role);
    }
}

module.exports.addRoleToMember = function (member, roleName) {
    let role = module.exports.getGuild().roles.cache.find(role => role.name.toLowerCase() === roleName.toLowerCase());

    if (role) {
        member.roles.add(role);
    }
}

module.exports.removeRoleFromMember = function (member, roleName) {
    let role = module.exports.getGuild().roles.cache.find(role => role.name.toLowerCase() === roleName.toLowerCase());

    if (role) {
        member.roles.remove(role);
    }
}
