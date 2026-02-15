package dev.twlite.ecmacraft;

import org.graalvm.polyglot.*;
import org.graalvm.polyglot.proxy.ProxyArray;
import org.bukkit.event.Event;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.plugin.EventExecutor;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.PluginCommand;

public class PluginContext {
    private final JavaPlugin plugin;
    private final Context context;

    public PluginContext(JavaPlugin plugin, Context context) {
        this.plugin = plugin;
        this.context = context;
    }

    public void registerHandlers(Value... handlerInstances) {
        Value eventMeta = context.getBindings("js").getMember("EventHandlers");
        Value cmdMeta = context.getBindings("js").getMember("CommandHandlers");

        for (Value handler : handlerInstances) {
            String className = handler.getMember("constructor").getMember("name").asString();

            if (eventMeta != null && eventMeta.hasMember(className)) {
                Value classMap = eventMeta.getMember(className);
                for (String methodName : classMap.getMemberKeys()) {
                    Value method = handler.getMember(methodName);
                    if (method == null || !method.canExecute() || !classMap.hasMember(methodName))
                        continue;

                    String eventName = classMap.getMember(methodName).asString();
                    Class<? extends Event> eventClass = resolveEventClass(eventName);
                    if (eventClass == null) {
                        plugin.getLogger().warning("Could not resolve event class for: " + eventName + " (handler: "
                                + className + "." + methodName + ")");
                        continue;
                    }

                    plugin.getLogger().info("Register event: " + eventName + " -> " + methodName);

                    Listener listener = new Listener() {
                    };

                    EventExecutor executor = (registeredListener, event) -> {
                        if (!eventClass.isInstance(event)) {
                            return;
                        }
                        try {
                            method.execute(context.asValue(event));
                        } catch (Exception ex) {
                            plugin.getLogger().severe("Error executing JS event handler: " + ex.getMessage());
                        }
                    };

                    plugin.getServer().getPluginManager().registerEvent(
                            eventClass,
                            listener,
                            EventPriority.NORMAL,
                            executor,
                            plugin,
                            false);
                }
            }

            if (cmdMeta != null && cmdMeta.hasMember(className)) {
                Value classMap = cmdMeta.getMember(className);
                for (String methodName : classMap.getMemberKeys()) {
                    Value method = handler.getMember(methodName);
                    if (method == null || !method.canExecute() || !classMap.hasMember(methodName))
                        continue;

                    String cmdName = classMap.getMember(methodName).asString();
                    plugin.getLogger().info("Register command: /" + cmdName + " -> " + methodName);

                    PluginCommand command = plugin.getCommand(cmdName);
                    if (command == null) {
                        plugin.getLogger().warning("Command not found in plugin.yml: /" + cmdName);
                        continue;
                    }

                    command.setExecutor(new CommandExecutor() {
                        @Override
                        public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
                            try {
                                Value jsSender = context.asValue(sender);
                                Value jsArgs = context.asValue(ProxyArray.fromArray((Object[]) args));
                                method.execute(jsSender, jsArgs);
                            } catch (Exception ex) {
                                plugin.getLogger().warning("Error executing JS command: " + ex.getMessage());
                            }
                            return true;
                        }
                    });
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private Class<? extends Event> resolveEventClass(String eventName) {
        String[] packagePrefixes = new String[] {
                "org.bukkit.event.",
                "org.bukkit.event.block.",
                "org.bukkit.event.enchantment.",
                "org.bukkit.event.entity.",
                "org.bukkit.event.hanging.",
                "org.bukkit.event.inventory.",
                "org.bukkit.event.player.",
                "org.bukkit.event.raid.",
                "org.bukkit.event.server.",
                "org.bukkit.event.vehicle.",
                "org.bukkit.event.weather.",
                "org.bukkit.event.world."
        };

        for (String prefix : packagePrefixes) {
            try {
                Class<?> clazz = Class.forName(prefix + eventName);
                if (Event.class.isAssignableFrom(clazz)) {
                    return (Class<? extends Event>) clazz;
                }
            } catch (ClassNotFoundException ignored) {
            }
        }

        return null;
    }
}
