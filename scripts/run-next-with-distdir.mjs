import { spawn } from "node:child_process";
import path from "node:path";

const command = process.argv[2];
const extraArgs = process.argv.slice(3);

if (!command) {
  console.error("Usage: node scripts/run-next-with-distdir.mjs <dev|build> [...args]");
  process.exit(2);
}

const env = { ...process.env };
delete env.NEXT_DIST_DIR;
// Always isolate dev/build outputs so they can run simultaneously.
// (If you ever need a custom folder, edit this script or the npm script.)
if (command === "dev") {
  env.NEXT_DIST_DIR = ".next-dev";
}

const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, command, ...extraArgs], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
