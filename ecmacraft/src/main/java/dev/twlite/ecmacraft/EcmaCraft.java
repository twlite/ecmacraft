package dev.twlite.ecmacraft;

import java.io.File;
import org.graalvm.polyglot.Value;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.plugin.java.JavaPlugin;

public class EcmaCraft extends JavaPlugin {
    private EcmaCraftLoader loader;
    private PluginContext pluginContext;

    private void unloadRuntime() {
        if (pluginContext != null) {
            pluginContext.shutdown();
            pluginContext = null;
        }

        if (loader != null) {
            loader.getContext().close();
            loader = null;
        }
    }

    private void loadRuntime() {
        File pluginsDir = getDataFolder().getParentFile();
        loader = new EcmaCraftLoader(this, pluginsDir);

        try {
            Value moduleExports = loader.loadModule("main.js");
            Value defaultExport = moduleExports.getMember("default");

            if (defaultExport != null && defaultExport.canExecute()) {
                pluginContext = new PluginContext(this, loader.getContext());
                defaultExport.execute(pluginContext);
            } else {
                getLogger().warning("main.js does not export an executable default function.");
            }
        } catch (Exception e) {
            getLogger().severe("Failed to load EcmaCraft runtime: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void reloadRuntime() {
        unloadRuntime();
        loadRuntime();
    }

    @Override
    public void onEnable() {
        getLogger().info("EcmaCraft has been enabled!");

        reloadRuntime();
    }

    @Override
    public void onDisable() {
        getLogger().info("EcmaCraft has been disabled!");

        unloadRuntime();
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (command.getName().equalsIgnoreCase("ecmacraft-reload")) {
            reloadRuntime();
            sender.sendMessage(ChatColor.GREEN + "EcmaCraft runtime reloaded.");
            return true;
        }

        return false;
    }
}
