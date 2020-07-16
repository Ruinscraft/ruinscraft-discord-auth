const mysql = require('mysql');
const index = require('./index');

function createConnection() {
    return mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        database: process.env.MYSQL_DATABASE,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD
    });
}

module.exports.queryToken = function(token, callback) {
    let connection = createConnection();
    let sql = "SELECT * FROM discord_auth WHERE token = ?;";

    connection.query(sql, [token], function(error, result) {
        if (error) {
            throw error;
        }

        callback(result);
    });

    connection.end();
}

module.exports.updateToken = function(token, member, callback) {
    let connection = createConnection();
    let sql = "UPDATE discord_auth SET token_used = 1, discord_user_id = ? WHERE token = ?;";

    connection.query(sql, [member.id, token], function(error) {
        if (error) {
            throw error;
        }

        callback();
    });

    connection.end();
}

module.exports.queryDiscordIdFromMojangUuid = function (mojangUuid, callback) {
    let connection = createConnection();
    let sql = "SELECT discord_user_id FROM discord_auth WHERE mojang_uuid = ?;";

    connection.query(sql, [mojangUuid], function(error, result) {
        if (error) {
            throw error;
        }

        if (result.length === 0) {
            callback();
        } else {
            for (let row of result) {
                callback(row['discord_user_id']);
            }
        }
    });

    connection.end();
}

module.exports.queryRoleChanges = function(callback) {
    let connection = createConnection();
    let sql = "SELECT * FROM discord_role_queue;";

    connection.query(sql, function(error, result) {
        if (error) {
            throw error;
        }

        callback(result);
    });

    connection.end();
}

module.exports.deleteRoleChange = function(roleChangeId, callback) {
    let connection = createConnection();
    let sql = "DELETE FROM discord_role_queue WHERE id = ?;"

    connection.query(sql, [roleChangeId], function(error, result) {
        if (error) {
            throw error;
        }

        callback(result);
    });

    connection.end();
}

function executeRoleChanges() {
    console.log("Executing role changes...");

    module.exports.queryRoleChanges(result => {
        var changed = 0;

        for (let row of result) {
            let id = row['id'];
            let mojang_uuid = row['mojang_uuid'];
            let requested_role = row['requested_role'];
            let value = row['value'];

            module.exports.queryDiscordIdFromMojangUuid(mojang_uuid, result => {
                module.exports.deleteRoleChange(id, () => {
                    let member = index.getMember(result);

                    if (!member) {
                        return; // could not find discord member
                    }

                    if (value) {
                        index.addRoleToMember(member, requested_role);
                    } else {
                        index.removeRoleFromMember(member, requested_role);
                    }

                    changed++;
                });
            });
        }

        console.log(`Finished executing role changes. Total of ${changed} roles changed.`);
    });
}

setInterval(executeRoleChanges, 1000 * 1); // execute role changes on timer
