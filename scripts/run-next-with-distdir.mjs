import { spawn } from "node:child_process";
import path from "node:path";

const command = process.argv[2];
const extraArgs = process.argv.slice(3);

if (!command) {
  console.error("Usage: node scripts/run-next-with-distdir.mjs <dev|build> [...args]");
  process.exit(2);
}

const env = { ...process.env };
// Use isolated dist dirs for dev/build to avoid cross-run conflicts.
// Allow explicit override via env for advanced usage.
if (!env.NEXT_DIST_DIR) {
  if (command === "dev") {
    env.NEXT_DIST_DIR = ".next-dev";
  } else if (command === "build") {
    env.NEXT_DIST_DIR = ".next-build";
  }
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