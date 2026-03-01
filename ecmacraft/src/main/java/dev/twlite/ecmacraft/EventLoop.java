package dev.twlite.ecmacraft;

import org.graalvm.polyglot.Context;
import org.graalvm.polyglot.Value;
import org.graalvm.polyglot.proxy.ProxyExecutable;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * A single-tick event loop driven by one repeating {@link BukkitTask}.
 * <p>
 * On every server tick the loop:
 * <ol>
 * <li>Collects all macrotasks whose target tick has been reached.</li>
 * <li>Executes each due macrotask in scheduling order (by ID).</li>
 * <li>Drains the microtask queue after every macrotask (including
 * microtasks enqueued by other microtasks).</li>
 * <li>If no macrotasks were due, still drains any pending microtasks.</li>
 * </ol>
 * This matches the browser / Node.js execution model:
 * <em>macrotask → all microtasks → next macrotask → all microtasks → …</em>
 * <p>
 * Installed JS globals: {@code setTimeout}, {@code clearTimeout},
 * {@code setInterval}, {@code clearInterval}, {@code setImmediate},
 * {@code clearImmediate}, {@code requestAnimationFrame},
 * {@code cancelAnimationFrame}, {@code queueMicrotask}.
 */
public class EventLoop {
    private final JavaPlugin plugin;
    private final Context context;
    private final AtomicInteger nextId = new AtomicInteger(1);
    private final ConcurrentHashMap<Integer, ScheduledTask> scheduledTasks = new ConcurrentHashMap<>();
    private final ConcurrentLinkedQueue<Value> microtaskQueue = new ConcurrentLinkedQueue<>();
    private final long epochMillis = System.currentTimeMillis();

    private long currentTick = 0;
    private BukkitTask loopTask;

    private static final long MS_PER_TICK = 50L;
    private static final int MAX_MICROTASKS_PER_DRAIN = 10_000;

    public EventLoop(JavaPlugin plugin, Context context) {
        this.plugin = plugin;
        this.context = context;
    }

    /**
     * Installs all timer globals onto the JS context and starts the loop.
     */
    public void installBindings() {
        Value bindings = context.getBindings("js");

        bindings.putMember("setTimeout", (ProxyExecutable) this::setTimeout);
        bindings.putMember("clearTimeout", (ProxyExecutable) this::clearTimer);
        bindings.putMember("setInterval", (ProxyExecutable) this::setInterval);
        bindings.putMember("clearInterval", (ProxyExecutable) this::clearTimer);
        bindings.putMember("setImmediate", (ProxyExecutable) this::setImmediate);
        bindings.putMember("clearImmediate", (ProxyExecutable) this::clearTimer);
        bindings.putMember("requestAnimationFrame", (ProxyExecutable) this::requestAnimationFrame);
        bindings.putMember("cancelAnimationFrame", (ProxyExecutable) this::clearTimer);
        bindings.putMember("queueMicrotask", (ProxyExecutable) this::queueMicrotask);

        loopTask = plugin.getServer().getScheduler().runTaskTimer(plugin, this::tick, 1L, 1L);
    }

    /**
     * Stops the loop and discards all pending tasks.
     */
    public void shutdown() {
        if (loopTask != null) {
            loopTask.cancel();
            loopTask = null;
        }
        scheduledTasks.clear();
        microtaskQueue.clear();
    }

    private void tick() {
        currentTick++;

        // Collect macrotasks whose target tick has been reached
        List<ScheduledTask> due = new ArrayList<>();
        for (ScheduledTask task : scheduledTasks.values()) {
            if (task.targetTick <= currentTick) {
                due.add(task);
            }
        }

        if (due.isEmpty()) {
            // No macrotasks due, but microtasks may have been queued externally
            // (e.g. from a Bukkit event handler that called queueMicrotask)
            drainMicrotasks();
            return;
        }

        // Deterministic execution order: earliest-scheduled first
        due.sort(Comparator.comparingInt(t -> t.id));

        for (ScheduledTask task : due) {
            if (task.intervalTicks > 0) {
                // Interval: check if still alive (could have been cancelled by a
                // prior callback in this same tick), then reschedule
                if (!scheduledTasks.containsKey(task.id)) {
                    continue;
                }
                task.targetTick = currentTick + task.intervalTicks;
            } else {
                // One-shot: atomically remove – skip if already cancelled
                if (scheduledTasks.remove(task.id) == null) {
                    continue;
                }
            }

            // Execute the macrotask callback
            if (task.animationFrame) {
                double timestamp = System.currentTimeMillis() - epochMillis;
                try {
                    task.callback.execute(timestamp);
                } catch (Exception ex) {
                    plugin.getLogger()
                            .warning("Error in requestAnimationFrame callback: " + ex.getMessage());
                }
            } else {
                try {
                    task.callback.execute((Object[]) task.args);
                } catch (Exception ex) {
                    plugin.getLogger().warning("Error in timer callback: " + ex.getMessage());
                }
            }

            // Drain microtask queue after each macrotask (browser/Node semantics)
            drainMicrotasks();
        }
    }

    private void drainMicrotasks() {
        int processed = 0;
        Value callback;
        while ((callback = microtaskQueue.poll()) != null) {
            if (++processed > MAX_MICROTASKS_PER_DRAIN) {
                plugin.getLogger().warning(
                        "Microtask queue exceeded safety limit (" + MAX_MICROTASKS_PER_DRAIN
                                + "); remaining microtasks dropped to prevent infinite loop.");
                microtaskQueue.clear();
                break;
            }
            try {
                callback.execute();
            } catch (Exception ex) {
                plugin.getLogger().warning("Error in queueMicrotask callback: " + ex.getMessage());
            }
        }
    }

    // setTimeout(callback, delay?, ...args)
    private Object setTimeout(Value... args) {
        if (args.length == 0 || args[0] == null || !args[0].canExecute()) {
            throw new IllegalArgumentException("setTimeout(callback, delay?, ...args) requires an executable callback");
        }

        Value callback = args[0];
        long delayMs = (args.length > 1 && args[1] != null && args[1].fitsInLong()) ? args[1].asLong() : 0;
        Value[] extra = extractExtraArgs(args, 2);
        long ticks = msToTicks(delayMs);

        return scheduleTask(callback, extra, currentTick + ticks, 0, false);
    }

    // setInterval(callback, interval?, ...args)
    private Object setInterval(Value... args) {
        if (args.length == 0 || args[0] == null || !args[0].canExecute()) {
            throw new IllegalArgumentException(
                    "setInterval(callback, interval?, ...args) requires an executable callback");
        }

        Value callback = args[0];
        long intervalMs = (args.length > 1 && args[1] != null && args[1].fitsInLong()) ? args[1].asLong() : 0;
        Value[] extra = extractExtraArgs(args, 2);
        long ticks = msToTicks(intervalMs);

        return scheduleTask(callback, extra, currentTick + ticks, ticks, false);
    }

    // setImmediate(callback, ...args)
    private Object setImmediate(Value... args) {
        if (args.length == 0 || args[0] == null || !args[0].canExecute()) {
            throw new IllegalArgumentException("setImmediate(callback, ...args) requires an executable callback");
        }

        Value callback = args[0];
        Value[] extra = extractExtraArgs(args, 1);

        return scheduleTask(callback, extra, currentTick + 1, 0, false);
    }

    // requestAnimationFrame(callback)
    private Object requestAnimationFrame(Value... args) {
        if (args.length == 0 || args[0] == null || !args[0].canExecute()) {
            throw new IllegalArgumentException("requestAnimationFrame(callback) requires an executable callback");
        }

        return scheduleTask(args[0], null, currentTick + 1, 0, true);
    }

    // queueMicrotask(callback)
    private Object queueMicrotask(Value... args) {
        if (args.length == 0 || args[0] == null || !args[0].canExecute()) {
            throw new IllegalArgumentException("queueMicrotask(callback) requires an executable callback");
        }
        microtaskQueue.add(args[0]);
        return null;
    }

    // clearTimeout / clearInterval / clearImmediate / cancelAnimationFrame
    private Object clearTimer(Value... args) {
        if (args.length == 0 || args[0] == null || !args[0].fitsInInt()) {
            return null;
        }
        scheduledTasks.remove(args[0].asInt());
        return null;
    }

    private int scheduleTask(Value callback, Value[] args, long targetTick, long intervalTicks,
            boolean animationFrame) {
        int id = nextId.getAndIncrement();
        scheduledTasks.put(id, new ScheduledTask(id, callback, args, targetTick, intervalTicks, animationFrame));
        return id;
    }

    private static long msToTicks(long ms) {
        return Math.max(1, Math.round((double) ms / MS_PER_TICK));
    }

    private static Value[] extractExtraArgs(Value[] args, int startIndex) {
        if (args.length <= startIndex) {
            return new Value[0];
        }
        Value[] extra = new Value[args.length - startIndex];
        System.arraycopy(args, startIndex, extra, 0, extra.length);
        return extra;
    }

    private static final class ScheduledTask {
        final int id;
        final Value callback;
        final Value[] args;
        long targetTick;
        final long intervalTicks; // 0 = one-shot
        final boolean animationFrame;

        ScheduledTask(int id, Value callback, Value[] args, long targetTick, long intervalTicks,
                boolean animationFrame) {
            this.id = id;
            this.callback = callback;
            this.args = args;
            this.targetTick = targetTick;
            this.intervalTicks = intervalTicks;
            this.animationFrame = animationFrame;
        }
    }
}
