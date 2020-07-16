package com.ruinscraft.discordauth;

import net.luckperms.api.LuckPerms;
import net.luckperms.api.LuckPermsProvider;
import net.luckperms.api.model.user.User;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

import java.util.UUID;

public class DiscordCommand implements CommandExecutor {

    private DiscordAuthPlugin plugin;
    private LuckPerms luckPerms;

    public DiscordCommand(DiscordAuthPlugin plugin) {
        this.plugin = plugin;
        luckPerms = LuckPermsProvider.get();
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!(sender instanceof Player)) {
            return false;
        }

        Player player = (Player) sender;
        User lpUser = luckPerms.getUserManager().getUser(player.getUniqueId());

        plugin.getStorage().queryToken(lpUser).thenAccept(result -> {
            if (player.isOnline()) {
                player.sendMessage(ChatColor.DARK_PURPLE + "Discord Invite Link: https://discord.com/invite/srSSSgJ");
            }

            if (result != null) {
                if (result.isUsed()) {
                    if (player.isOnline()) {
                        player.sendMessage(ChatColor.DARK_PURPLE + "Your account has been previously linked with our Discord group.");
                        player.sendMessage(ChatColor.DARK_PURPLE + "If you need to re-link your account, run /discord relink");
                    }
                } else {
                    if (player.isOnline()) {
                        player.sendMessage(ChatColor.DARK_PURPLE + "Your token: " + ChatColor.LIGHT_PURPLE + result.getToken());
                        player.sendMessage(ChatColor.DARK_PURPLE + "Type !link <token> in the #link-your-account channel in our Discord group.");
                    }
                }
            } else {
                String token = generateToken();

                plugin.getStorage().insertToken(lpUser, token).thenRun(() -> {
                    if (player.isOnline()) {
                        player.sendMessage(ChatColor.DARK_PURPLE + "Your token: " + ChatColor.LIGHT_PURPLE + token);
                        player.sendMessage(ChatColor.DARK_PURPLE + "Type !link <token> in the #link-your-account channel in our Discord group.");
                    }
                });
            }
        });

        return true;
    }

    private static String generateToken() {
        return UUID.randomUUID().toString().split("-")[0];
    }

}
