const mysql = require('mysql');

function createConnection() {
    return mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD
    });
}

module.exports.queryToken = function(token, callback) {
    let connection = createConnection();
    let sql = "SELECT * FROM discord_auth WHERE token = ?;";

    connection.query(query, function(error, result) {
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

    connection.query(sql, function(error, result) {
        if (error) {
            throw error;
        }

        callback(result.length > 0);
    });

    connection.end();
}
