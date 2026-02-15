package dev.twlite.ecmacraft;

import org.graalvm.polyglot.*;
import org.graalvm.polyglot.io.FileSystem;
import org.graalvm.polyglot.io.IOAccess;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;

public class EcmaCraftLoader {
    private final Context context;

    public EcmaCraftLoader(File pluginsDir) {
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

        return context.eval(
                Source.newBuilder("js", modulePath.toFile()).mimeType("application/javascript+module").build());
    }

    public Context getContext() {
        return context;
    }
}
