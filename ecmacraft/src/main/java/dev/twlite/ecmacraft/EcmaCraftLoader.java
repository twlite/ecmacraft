package dev.twlite.ecmacraft;

import org.graalvm.polyglot.*;
import org.graalvm.polyglot.io.FileSystem;
import org.graalvm.polyglot.io.IOAccess;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.Files;

public class EcmaCraftLoader {
    private final Context context;
    private final JavaPlugin plugin;
    private static final String EMBEDDED_MAIN_JS = "assets/ecmacraft/main.js";

    public EcmaCraftLoader(JavaPlugin plugin, File pluginsDir) {
        this.plugin = plugin;
        Path ecmacraftDir = pluginsDir.toPath().toAbsolutePath().normalize().resolve("ecmacraft");

        System.out.println("EcmaCraft directory: " + ecmacraftDir);

        FileSystem fs = FileSystem
                .newDefaultFileSystem();
        IOAccess ioAccess = IOAccess.newBuilder().fileSystem(fs).build();

        Context.Builder builder = Context.newBuilder("js")
                .allowAllAccess(true)
                .currentWorkingDirectory(ecmacraftDir)
                .option("js.ecmascript-version", "2023")
                .option("js.esm-eval-returns-exports", "true")
                .allowIO(ioAccess);

        this.context = builder.build();

        this.context.getBindings("js").putMember("ECMACRAFT_DIR", ecmacraftDir.toString());
    }

    public Value loadModule(String moduleName) throws IOException {
        Path modulePath = Paths.get(context.getBindings("js").getMember("ECMACRAFT_DIR").asString(), moduleName);

        if (Files.exists(modulePath)) {
            return context.eval(
                    Source.newBuilder("js", modulePath.toFile()).mimeType("application/javascript+module").build());
        }

        InputStream embeddedSource = plugin.getResource(EMBEDDED_MAIN_JS);
        if (embeddedSource == null) {
            throw new IOException(
                    "Could not find runtime module '" + moduleName + "' in plugin directory or embedded path "
                            + EMBEDDED_MAIN_JS);
        }

        return context.eval(
                Source.newBuilder("js", new InputStreamReader(embeddedSource, StandardCharsets.UTF_8), EMBEDDED_MAIN_JS)
                        .mimeType("application/javascript+module")
                        .build());
    }

    public Context getContext() {
        return context;
    }
}
