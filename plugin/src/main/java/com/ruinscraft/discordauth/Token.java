package com.ruinscraft.discordauth;

public class Token {

    private final String token;
    private final boolean used;

    public Token(String token, boolean used) {
        this.token = token;
        this.used = used;
    }

    public String getToken() {
        return token;
    }

    public boolean isUsed() {
        return used;
    }

}
