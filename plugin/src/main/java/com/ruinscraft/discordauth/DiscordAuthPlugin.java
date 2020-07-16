package com.ruinscraft.discordauth;

import net.luckperms.api.LuckPerms;
import net.luckperms.api.LuckPermsProvider;
import net.luckperms.api.event.EventBus;
import net.luckperms.api.event.node.NodeAddEvent;
import net.luckperms.api.event.node.NodeRemoveEvent;
import net.luckperms.api.model.user.User;
import net.luckperms.api.node.NodeType;
import net.luckperms.api.node.types.InheritanceNode;
import org.bukkit.plugin.java.JavaPlugin;

public class DiscordAuthPlugin extends JavaPlugin {

    private Storage storage;

    public Storage getStorage() {
        return storage;
    }

    @Override
    public void onEnable() {
        saveDefaultConfig();
        setupStorage();
        subscribeToLuckPermsEvents();

        getCommand("discord").setExecutor(new DiscordCommand(this));
    }

    private void setupStorage() {
        String host = getConfig().getString("storage.mysql.host");
        int port = getConfig().getInt("storage.mysql.port");
        String database = getConfig().getString("storage.mysql.database");
        String username = getConfig().getString("storage.mysql.username");
        String password = getConfig().getString("storage.mysql.password");

        storage = new MySQLStorage(host, port, database, username, password);
    }

    private void subscribeToLuckPermsEvents() {
        LuckPerms api = LuckPermsProvider.get();
        EventBus eventBus = api.getEventBus();

        eventBus.subscribe(NodeAddEvent.class, this::onNodeAdd);
        eventBus.subscribe(NodeRemoveEvent.class, this::onNodeRemove);
    }

    private void onNodeAdd(NodeAddEvent event) {
        if (!event.isUser()) {
            return;
        }

        if (event.getNode().getType() != NodeType.INHERITANCE) {
            return;
        }

        User user = (User) event.getTarget();
        InheritanceNode node = (InheritanceNode) event.getNode();
        String group = node.getGroupName();

        storage.insertGroupAdd(user, group);
    }

    private void onNodeRemove(NodeRemoveEvent event) {
        if (!event.isUser()) {
            return;
        }

        if (event.getNode().getType() != NodeType.INHERITANCE) {
            return;
        }

        User user = (User) event.getTarget();
        InheritanceNode node = (InheritanceNode) event.getNode();
        String group = node.getGroupName();

        storage.insertGroupRemove(user, group);
    }

}
