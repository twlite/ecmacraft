package dev.twlite.ecmacraft;

import org.graalvm.polyglot.*;
import org.graalvm.polyglot.proxy.ProxyArray;
import org.graalvm.polyglot.proxy.ProxyExecutable;
import org.bukkit.event.Event;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.scheduler.BukkitTask;
import org.bukkit.plugin.EventExecutor;
import org.bukkit.command.CommandMap;
import org.bukkit.command.CommandSender;
import org.bukkit.command.PluginIdentifiableCommand;
import org.bukkit.command.SimpleCommandMap;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.command.Command;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class PluginContext {
    private final JavaPlugin plugin;
    private final Context context;
    private final AtomicInteger animationFrameIdCounter = new AtomicInteger(1);
    private final ConcurrentHashMap<Integer, BukkitTask> animationFrameTasks = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Command> dynamicCommands = new ConcurrentHashMap<>();
    private final long animationFrameEpochMillis = System.currentTimeMillis();
    private final CommandMap commandMap;
    private final Map<String, Command> knownCommands;

    public PluginContext(JavaPlugin plugin, Context context) {
        this.plugin = plugin;
        this.context = context;
        this.commandMap = resolveCommandMap();
        this.knownCommands = resolveKnownCommands(commandMap);
        installRequestAnimationFrame();
    }

    private void installRequestAnimationFrame() {
        context.getBindings("js").putMember("requestAnimationFrame", (ProxyExecutable) args -> {
            if (args.length == 0 || args[0] == null || !args[0].canExecute()) {
                throw new IllegalArgumentException("requestAnimationFrame(callback) requires an executable callback");
            }

            Value callback = args[0];
            int frameId = animationFrameIdCounter.getAndIncrement();

            BukkitTask task = plugin.getServer().getScheduler().runTask(plugin, () -> {
                animationFrameTasks.remove(frameId);
                try {
                    double timestamp = System.currentTimeMillis() - animationFrameEpochMillis;
                    callback.execute(timestamp);
                } catch (Exception ex) {
                    plugin.getLogger().warning("Error executing requestAnimationFrame callback: " + ex.getMessage());
                }
            });

            animationFrameTasks.put(frameId, task);
            return frameId;
        });

        context.getBindings("js").putMember("cancelAnimationFrame", (ProxyExecutable) args -> {
            if (args.length == 0 || args[0] == null || !args[0].fitsInInt()) {
                return null;
            }

            int frameId = args[0].asInt();
            BukkitTask task = animationFrameTasks.remove(frameId);
            if (task != null) {
                task.cancel();
            }
            return null;
        });
    }

    public void shutdown() {
        for (BukkitTask task : animationFrameTasks.values()) {
            task.cancel();
        }
        animationFrameTasks.clear();
        unregisterDynamicCommands();
    }

    public void registerHandlers(Value... handlerInstances) {
        Value eventMeta = context.getBindings("js").getMember("__ecmacraft_internal_state_store_$EventHandlers");
        Value cmdMeta = context.getBindings("js").getMember("__ecmacraft_internal_state_store_$CommandHandlers");

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

                    String cmdName = normalizeCommandName(classMap.getMember(methodName).asString());
                    if (cmdName == null) {
                        plugin.getLogger().warning("Invalid command name declared in handler: " + className + "."
                                + methodName);
                        continue;
                    }

                    Value tabCompleteMethod = handler.getMember(methodName + "TabComplete");
                    if (tabCompleteMethod != null && !tabCompleteMethod.canExecute()) {
                        tabCompleteMethod = null;
                    }

                    plugin.getLogger().info("Register command: /" + cmdName + " -> " + methodName
                            + (tabCompleteMethod != null ? " (+ tab complete)" : ""));
                    registerDynamicCommand(cmdName, method, tabCompleteMethod);
                }
            }
        }
    }

    public JavaPlugin getPlugin() {
        return plugin;
    }

    private String normalizeCommandName(String commandName) {
        if (commandName == null) {
            return null;
        }

        String normalized = commandName.trim();
        if (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }

        if (normalized.isEmpty() || normalized.contains(" ")) {
            return null;
        }

        return normalized.toLowerCase(Locale.ROOT);
    }

    private void registerDynamicCommand(String commandName, Value method, Value tabCompleteMethod) {
        if (commandMap == null) {
            plugin.getLogger().warning("CommandMap unavailable; cannot register dynamic command /" + commandName);
            return;
        }

        Command existing = dynamicCommands.remove(commandName);
        if (existing != null) {
            unregisterCommand(existing);
        }

        if (knownCommands != null) {
            Command occupied = knownCommands.get(commandName);
            if (occupied != null && occupied != existing) {
                plugin.getLogger().warning("Cannot register /" + commandName
                        + " because another command already exists with that label.");
                return;
            }
        }

        Command dynamicCommand = new DynamicJsCommand(commandName, method, tabCompleteMethod);
        commandMap.register(plugin.getName().toLowerCase(Locale.ROOT), dynamicCommand);
        dynamicCommands.put(commandName, dynamicCommand);
    }

    private void unregisterDynamicCommands() {
        for (Command command : dynamicCommands.values()) {
            unregisterCommand(command);
        }
        dynamicCommands.clear();
    }

    private void unregisterCommand(Command command) {
        if (commandMap == null || command == null) {
            return;
        }

        command.unregister(commandMap);

        if (knownCommands != null) {
            knownCommands.entrySet().removeIf(entry -> entry.getValue() == command);
        }
    }

    private CommandMap resolveCommandMap() {
        try {
            Method getCommandMap = plugin.getServer().getClass().getMethod("getCommandMap");
            Object resolved = getCommandMap.invoke(plugin.getServer());
            if (resolved instanceof CommandMap) {
                return (CommandMap) resolved;
            }
        } catch (Exception ex) {
            plugin.getLogger().warning("Unable to resolve Bukkit CommandMap: " + ex.getMessage());
        }

        return null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Command> resolveKnownCommands(CommandMap map) {
        if (!(map instanceof SimpleCommandMap)) {
            return null;
        }

        try {
            Field knownCommandsField = SimpleCommandMap.class.getDeclaredField("knownCommands");
            knownCommandsField.setAccessible(true);
            Object resolved = knownCommandsField.get(map);
            if (resolved instanceof Map) {
                return (Map<String, Command>) resolved;
            }
        } catch (Exception ex) {
            plugin.getLogger().warning("Unable to inspect known commands map: " + ex.getMessage());
        }

        return null;
    }

    private List<String> toStringList(Value value) {
        if (value == null || value.isNull()) {
            return Collections.emptyList();
        }

        if (value.hasArrayElements()) {
            List<String> result = new ArrayList<>();
            long length = value.getArraySize();
            for (long index = 0; index < length; index++) {
                Value item = value.getArrayElement(index);
                if (item != null && !item.isNull()) {
                    result.add(item.isString() ? item.asString() : String.valueOf(item));
                }
            }
            return result;
        }

        if (value.isString()) {
            return Collections.singletonList(value.asString());
        }

        if (value.isHostObject()) {
            Object host = value.asHostObject();
            if (host instanceof Iterable<?>) {
                List<String> result = new ArrayList<>();
                for (Object item : (Iterable<?>) host) {
                    if (item != null) {
                        result.add(String.valueOf(item));
                    }
                }
                return result;
            }
        }

        return Collections.emptyList();
    }

    private final class DynamicJsCommand extends Command implements PluginIdentifiableCommand {
        private final Value executeMethod;
        private final Value tabCompleteMethod;

        private DynamicJsCommand(String name, Value executeMethod, Value tabCompleteMethod) {
            super(name);
            this.executeMethod = executeMethod;
            this.tabCompleteMethod = tabCompleteMethod;
        }

        @Override
        public boolean execute(CommandSender sender, String label, String[] args) {
            try {
                Value jsSender = context.asValue(sender);
                Value jsArgs = context.asValue(ProxyArray.fromArray((Object[]) args));
                Value result = executeMethod.execute(jsSender, jsArgs, label);
                if (result != null && result.isBoolean()) {
                    return result.asBoolean();
                }
            } catch (Exception ex) {
                plugin.getLogger().warning("Error executing JS command '/" + getName() + "': " + ex.getMessage());
            }
            return true;
        }

        @Override
        public List<String> tabComplete(CommandSender sender, String alias, String[] args)
                throws IllegalArgumentException {
            if (tabCompleteMethod == null) {
                return Collections.emptyList();
            }

            try {
                Value jsSender = context.asValue(sender);
                Value jsArgs = context.asValue(ProxyArray.fromArray((Object[]) args));
                Value result = tabCompleteMethod.execute(jsSender, jsArgs, alias);
                return toStringList(result);
            } catch (Exception ex) {
                plugin.getLogger()
                        .warning("Error executing JS tab completion '/" + getName() + "': " + ex.getMessage());
                return Collections.emptyList();
            }
        }

        @Override
        public JavaPlugin getPlugin() {
            return plugin;
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
