package dev.twlite.ecmacraft;

import org.bukkit.plugin.java.JavaPlugin;

public class EcmaCraft extends JavaPlugin {

    @Override
    public void onEnable() {
        getLogger().info("EcmaCraft has been enabled!");
    }

    @Override
    public void onDisable() {
        getLogger().info("EcmaCraft has been disabled!");
    }
}
