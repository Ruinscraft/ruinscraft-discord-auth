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

        if (args.length > 0) {
            if (args[0].equalsIgnoreCase("relink")) {
                plugin.getStorage().updateTokenSetUsed(lpUser, false).thenRun(() -> {
                    onCommand(sender, command, label, new String[0]);
                });
                return true;
            }
        }

        plugin.getStorage().queryToken(lpUser).thenAccept(result -> {
            if (player.isOnline()) {
                player.sendMessage(ChatColor.GOLD + "Discord Invite Link:" + ChatColor.LIGHT_PURPLE + " https://ruinscraft.com/discord");
            }

            if (result != null) {
                if (result.isUsed()) {
                    if (player.isOnline()) {
                        player.sendMessage(ChatColor.GOLD + "Your account has been previously linked with our Discord.");
                        player.sendMessage(ChatColor.GOLD + "If you need to re-link your account, run " + ChatColor.LIGHT_PURPLE + "/discord relink");
                    }
                } else {
                    if (player.isOnline()) {
                        sendLinkCommand(player, result.getToken());
                    }
                }
            } else {
                String newToken = generateToken();

                plugin.getStorage().insertToken(lpUser, newToken).thenRun(() -> {
                    if (player.isOnline()) {
                        sendLinkCommand(player, newToken);
                    }
                });
            }
        });

        return true;
    }

    private static void sendLinkCommand(Player player, String token) {
        player.sendMessage(ChatColor.GOLD + "Type" + ChatColor.LIGHT_PURPLE + " !link " + token + ChatColor.GOLD + " in the #link-your-account channel in our Discord.");
    }

    private static String generateToken() {
        return UUID.randomUUID().toString().split("-")[0];
    }

}
