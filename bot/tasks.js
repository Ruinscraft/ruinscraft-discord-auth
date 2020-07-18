const index = require('./index');
const storage = require('./storage');

module.exports.executeRoleChanges = function() {
    console.log("Executing role changes...");

    storage.queryRoleChanges(result => {
        for (let row of result) {
            let id = row['id'];
            let mojang_uuid = row['mojang_uuid'];
            let requested_role = row['requested_role'];
            let value = row['value'];

            storage.queryDiscordIdFromMojangUuid(mojang_uuid, result => {
                storage.deleteRoleChange(id, () => {
                    let member = index.getMember(result);

                    if (!member) {
                        return;
                    }

                    if (value) {
                        index.addRoleToMember(member, requested_role);
                    } else {
                        index.removeRoleFromMember(member, requested_role);
                    }
                });
            });
        }
    });
}

module.exports.executeUsernameChanges = function() {
    console.log("Executing username changes...");

    storage.queryUsernameChanges(result => {
        for (let row of result) {
            let id = row['id'];
            let mojang_uuid = row['mojang_uuid'];
            let minecraft_username = row['minecraft_username'];

            storage.queryDiscordIdFromMojangUuid(mojang_uuid, result => {
                storage.deleteUsernameChange(id, () => {
                    let member = index.getMember(result);

                    if (!member) {
                        return;
                    }

                    member.setNickname(minecraft_username);
                });
            });
        }
    });
}
