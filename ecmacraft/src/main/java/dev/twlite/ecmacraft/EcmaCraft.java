package dev.twlite.ecmacraft;

import java.io.File;
import org.graalvm.polyglot.Value;
import org.bukkit.plugin.java.JavaPlugin;

public class EcmaCraft extends JavaPlugin {
    private EcmaCraftLoader loader;

    @Override
    public void onEnable() {
        getLogger().info("EcmaCraft has been enabled!");

        if (loader != null) {
            loader.getContext().close();
        }

        File pluginsDir = getDataFolder().getParentFile();
        loader = new EcmaCraftLoader(pluginsDir);

        try {
            Value moduleExports = loader.loadModule("main.js");
            Value defaultExport = moduleExports.getMember("default");

            if (defaultExport != null && defaultExport.canExecute()) {
                PluginContext pluginContext = new PluginContext(this, loader.getContext());
                defaultExport.execute(pluginContext);
            } else {
                getLogger().warning("main.js does not export an executable default function.");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onDisable() {
        getLogger().info("EcmaCraft has been disabled!");
        loader.getContext().close();
        loader = null;
    }
}
