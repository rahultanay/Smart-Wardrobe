import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { access } from "node:fs/promises";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backend = resolve(root, "backend");
const isWindows = process.platform === "win32";
function run(command, args, cwd = root) {
  return new Promise((yes, no) => {
    const p = spawn(command, args, { cwd, stdio: "inherit", shell: isWindows, env: {...process.env, MAVEN_USER_HOME: resolve(backend, ".cache/maven")} });
    p.on("error", no);
    p.on("exit", (code) =>
      code === 0 ? yes() : no(new Error(`${command} exited with code ${code}`)),
    );
  });
}
try {
  await run("java", ["-version"]);
  await access(resolve(root, "node_modules"));
  console.log("\nBuilding your wardrobe…\n");
  await run(isWindows ? "npm.cmd" : "npm", ["run", "build"]);
  await run(
    isWindows ? "mvnw.cmd" : "./mvnw",
    ["-B", "-ntp", "-Dmaven.repo.local=.cache/repository", "-DskipTests", "package"],
    backend,
  );
  console.log("\nOpen http://127.0.0.1:8080 — press Ctrl+C here to stop.\n");
  const app = spawn(
    "java",
    [
      "-jar",
      "target/smart-wardrobe-1.0.0.jar",
      "--spring.web.resources.static-locations=file:../dist/",
    ],
    { cwd: backend, stdio: "inherit" },
  );
  app.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      app.kill(signal);
    });
  app.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
} catch (error) {
  console.error(
    `\nCould not start: ${error.message}\nInstall Node.js and a Java JDK (21 recommended), then run npm install and npm start.\n`,
  );
  process.exitCode = 1;
}
