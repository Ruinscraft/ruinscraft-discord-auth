package com.ruinscraft.discordauth;

import net.luckperms.api.model.user.User;

import java.util.concurrent.CompletableFuture;

public interface Storage {

    CompletableFuture<Void> insertToken(User lpUser, String token);

    CompletableFuture<Void> updateTokenSetUsed(User lpUser, boolean used);

    CompletableFuture<Token> queryToken(User lpUser);

    CompletableFuture<Void> insertGroupAdd(User lpUser, String group);

    CompletableFuture<Void> insertGroupRemove(User lpUser, String group);

    CompletableFuture<String> queryUsername(User lpUser);

    CompletableFuture<Void> insertUsernameChange(User lpUser);

}
