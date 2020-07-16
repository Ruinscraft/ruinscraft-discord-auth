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

        // if there was SOME result from the table it'll return true to the callback
        callback(result.length > 0);
    });

    connection.end();
}

module.exports.updateToken = function(token, callback) {
    let connection = createConnection();
    let sql = "UPDATE discord_auth SET token_used = 1 WHERE token = ?;";

    connection.query(sql, [token], function(error, result) {
        if (error) {
            throw error;
        }

        callback(result.length > 0);
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

        callback(result['mojang_uuid']);
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
        for (let row in result) {
            let id = row['id'];
            let mojang_uuid = row['mojang_uuid'];
            let requested_role = row['requested_role'];
            let value = row['value'];

            module.exports.queryDiscordIdFromMojangUuid(mojang_uuid, result => {
                if (value) {
                    module.exports.deleteRoleChange(id, () => {
                        index.addRoleToUser(result, requested_role);
                    });
                } else {
                    module.exports.deleteRoleChange(id, () => {
                        index.removeRoleFromUser(result, requested_role);
                    });
                }
            });
        }

        console.log(`Finished executing role changes. Total of ${result.length} roles changed.`);
    });
}

setInterval(executeRoleChanges, 1 * 1000); // execute role changes every 10 seconds
