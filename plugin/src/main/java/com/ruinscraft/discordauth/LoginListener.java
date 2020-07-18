package com.ruinscraft.discordauth;

import net.luckperms.api.LuckPerms;
import net.luckperms.api.LuckPermsProvider;
import net.luckperms.api.model.user.User;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerLoginEvent;

public class LoginListener implements Listener {

    private DiscordAuthPlugin plugin;
    private LuckPerms luckPerms;

    public LoginListener(DiscordAuthPlugin plugin) {
        this.plugin = plugin;
        luckPerms = LuckPermsProvider.get();
    }

    @EventHandler
    public void onLogin(PlayerLoginEvent event) {
        Player player = event.getPlayer();
        User lpUser = luckPerms.getUserManager().getUser(player.getUniqueId());

        plugin.getStorage().queryUsername(lpUser).thenAccept(result -> {
            // check if old username in DB is not the same as current username
            if (!player.getName().equals(result)) {
                plugin.getStorage().insertUsernameChange(lpUser).thenRun(() -> {
                    plugin.getLogger().info("Updated username in Discord for " + lpUser.getUsername());
                });
            }
        });
    }

}
