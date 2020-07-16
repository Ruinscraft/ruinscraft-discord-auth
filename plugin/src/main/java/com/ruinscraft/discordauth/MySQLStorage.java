package com.ruinscraft.discordauth;

import net.luckperms.api.model.user.User;

import java.sql.*;
import java.util.concurrent.CompletableFuture;

public class MySQLStorage implements Storage {

    private String host;
    private int port;
    private String database;
    private String username;
    private String password;

    public MySQLStorage(String host, int port, String database, String username, String password) {
        this.host = host;
        this.port = port;
        this.database = database;
        this.username = username;
        this.password = password;

        // create tables
        CompletableFuture.runAsync(() -> {
            try (Connection connection = getConnection()) {
                try (Statement statement = connection.createStatement()) {
                    statement.execute("CREATE TABLE IF NOT EXISTS discord_auth (" +
                            "token VARCHAR(8) NOT NULL, " +
                            "token_used BOOL DEFAULT 0, " +
                            "discord_user_id VARCHAR(32) DEFAULT NULL, " +              // unique
                            "mojang_uuid VARCHAR(36) NOT NULL, " +              // unique
                            "minecraft_username VARCHAR(16) NOT NULL, " +
                            "UNIQUE (discord_user_id), " +
                            "UNIQUE (mojang_uuid)" +
                            ");");
                    statement.execute("CREATE TABLE IF NOT EXISTS discord_role_queue (" +
                            "id INT NOT NULL AUTO_INCREMENT, " +
                            "mojang_uuid VARCHAR(36) NOT NULL, " +
                            "requested_role VARCHAR(36) NOT NULL, " +
                            "value BOOL, " +                                     // if to remove or add the role
                            "PRIMARY KEY (id)" +
                            ");");
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
        });
    }

    @Override
    public CompletableFuture<Void> insertToken(User lpUser, String token) {
        return CompletableFuture.runAsync(() -> {
            try (Connection connection = getConnection()) {
                try (PreparedStatement insert = connection.prepareStatement("INSERT INTO discord_auth (token, mojang_uuid, minecraft_username) VALUES (?, ?, ?);")) {
                    insert.setString(1, token);
                    insert.setString(2, lpUser.getUniqueId().toString());
                    insert.setString(3, lpUser.getUsername());

                    insert.execute();
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
        });
    }

    @Override
    public CompletableFuture<Void> updateTokenSetUsed(User lpUser, boolean used) {
        return CompletableFuture.runAsync(() -> {
           try (Connection connection = getConnection()) {
               try (PreparedStatement update = connection.prepareStatement("UPDATE discord_auth SET token_used = ? WHERE mojang_uuid = ?;")) {
                   update.setBoolean(1, used);
                   update.setString(2, lpUser.getUniqueId().toString());
                   update.execute();
               }
           } catch (SQLException e) {
               e.printStackTrace();
           }
        });
    }

    @Override
    public CompletableFuture<Token> queryToken(User lpUser) {
        return CompletableFuture.supplyAsync(() -> {
            try (Connection connection = getConnection()) {
                try (PreparedStatement query = connection.prepareStatement("SELECT token, token_used FROM discord_auth WHERE mojang_uuid = ?;")) {
                    query.setString(1, lpUser.getUniqueId().toString());

                    try (ResultSet result = query.executeQuery()) {
                        while (result.next()) {
                            String token = result.getString("token");
                            boolean used = result.getBoolean("token_used");

                            return new Token(token, used);
                        }
                    }
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }

            return null;
        });
    }

    @Override
    public CompletableFuture<Void> insertGroupAdd(User lpUser, String group) {
        return CompletableFuture.runAsync(() -> {
            try (Connection connection = getConnection()) {
                try (PreparedStatement insert = connection.prepareStatement("INSERT INTO discord_role_queue (mojang_uuid, requested_role, value) VALUES (?, ?, ?);")) {
                    insert.setString(1, lpUser.getUniqueId().toString());
                    insert.setString(2, group);
                    insert.setBoolean(3, true);
                    insert.execute();
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
        });
    }

    @Override
    public CompletableFuture<Void> insertGroupRemove(User lpUser, String group) {
        return CompletableFuture.runAsync(() -> {
            try (Connection connection = getConnection()) {
                try (PreparedStatement insert = connection.prepareStatement("INSERT INTO discord_role_queue (mojang_uuid, requested_role, value) VALUES (?, ?, ?);")) {
                    insert.setString(1, lpUser.getUniqueId().toString());
                    insert.setString(2, group);
                    insert.setBoolean(3, false);
                    insert.execute();
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
        });
    }

    private Connection getConnection() {
        String jdbcUrl = "jdbc:mysql://" + host + ":" + port + "/" + database;

        try {
            return DriverManager.getConnection(jdbcUrl, username, password);
        } catch (SQLException e) {
            e.printStackTrace();
        }

        return null;
    }
}
