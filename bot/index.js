require('dotenv').config()

const storage = require('./storage');
const tasks = require('./tasks');

const discordjs = require("discord.js");
const discordjsClient = new discordjs.Client();

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
    message.delete({ timeout: 10000 }).catch(error => {
        console.log("Could not delete message: " + error);
    });

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
        if (token.length > 8) {
            notifyMemberNotValidToken(message.member);
            return;
        }

        storage.queryToken(token, result => {
            if (result.length == 0) {
                // token did not exist in storage
                notifyMemberNotValidToken(message.member);
                return;
            }

            for (let row of result) {
                let token_used = row['token_used'];
                let minecraft_username = row['minecraft_username'];

                // check if the token was already used
                if (token_used) {
                    notifyMemberNotValidToken(message.member);
                    return;
                }

                storage.updateToken(token, message.member, () => {
                    // add to linked role after marking token as used
                    module.exports.addLinkedRoleToMember(message.member);
                    // update their username

                    message.member.setNickname(minecraft_username).catch(error => {
                        console.log("Could not set nickname for: " + minecraft_username + ": " + error);
                    })
                    
                    notifyMemberValidToken(message.member);
                });
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
        channel.send("<@" + member.id + ">, the token you provided was either invalid or already used.").catch(error => {
            console.log("Could not send message to channel: " + error);
        });
    }
}

function notifyMemberValidToken(member) {
    let channel = module.exports.getGuild().channels.cache.get(process.env.DISCORD_LINK_CHANNEL_ID);

    if (channel) {
        channel.send("<@" + member.id + ">, your account has been successfully linked!").catch(error => {
            console.log("Could not send message to channel: " + error);
        });
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
        member.roles.add(role).catch(error => {
            console.log("Could not give role to: " + member.user.username + ": " + error);
        });

        console.log("Gave role " + role.name + " to " + member.user.username);
    }
}

module.exports.addRoleToMember = function (member, roleName) {
    let role = module.exports.getGuild().roles.cache.find(role => role.name.toLowerCase() === roleName.toLowerCase());

    if (role) {
        member.roles.add(role).catch(error => {
            console.log("Could not give role to: " + member.user.username + ": " + error);
        });

        console.log("Gave role " + role.name + " to " + member.user.username);
    }
}

module.exports.removeRoleFromMember = function (member, roleName) {
    let role = module.exports.getGuild().roles.cache.find(role => role.name.toLowerCase() === roleName.toLowerCase());

    if (role) {
        member.roles.remove(role).catch(error => {
            console.log("Could not remove role from: " + member.user.username + ": " + error);
        });

        console.log("Revoked role " + role.name + " from " + member.user.username);
    }
}

/*
 * Interval tasks
 */
setInterval(tasks.executeRoleChanges, 1000 * 1); // execute role changes on timer
setInterval(tasks.executeUsernameChanges, 1000 * 1); // execute username changes on timer
