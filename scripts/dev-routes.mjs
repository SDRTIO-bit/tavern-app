#!/usr/bin/env node
/**
 * 开发服务器启动脚本
 * 在 next dev 准备好后自动显示所有可访问的路由
 */
import { spawn } from "child_process";
import { readdirSync, statSync } from "fs";
import { join } from "path";

const APP_DIR = join(process.cwd(), "src", "app");

function findRoutes(dir, basePath = "") {
  let routes = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return routes; }
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry.startsWith("_") || entry.startsWith("(") || entry.startsWith(".")) continue;
      routes = routes.concat(findRoutes(fullPath, `${basePath}/${entry}`));
    } else if (/^page\.(tsx?|jsx?)$/.test(entry) || /^route\.(tsx?|jsx?)$/.test(entry)) {
      const routePath = basePath || "/";
      if (!routes.includes(routePath)) routes.push(routePath);
    }
  }
  return routes;
}

const args = process.argv.slice(2);

// Windows 上用 cmd /c 来运行 npx（确保 PATH 正确继承）
const nextProcess = spawn(
  process.platform === "win32" ? "cmd.exe" : "npx",
  process.platform === "win32" ? ["/c", "npx", "next", "dev", ...args] : ["next", "dev", ...args],
  { stdio: ["inherit", "pipe", "inherit"], shell: false }
);

let shown = false;
let port = "3000";

nextProcess.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);

  // 检测端口
  const pm = text.match(/- Local:\s+http:\/\/localhost:(\d+)/);
  if (pm) port = pm[1];

  // Ready 后显示路由
  if (!shown && text.includes("Ready in")) {
    shown = true;
    setTimeout(() => {
      try {
        const routes = findRoutes(APP_DIR);
        if (routes.length > 0) {
          console.log("\n\x1b[36m📋 可访问的路由:\x1b[0m");
          console.log("\x1b[90m" + "═".repeat(50) + "\x1b[0m");
          routes.sort().forEach((r) => {
            const label = r === "/" ? "首页" : r.slice(1);
            const icon = r.startsWith("/api/") ? "🔌" : r === "/" ? "🏠" : "📄";
            console.log(`  ${icon} \x1b[32mhttp://localhost:${port}${r}\x1b[0m  \x1b[90m(${label})\x1b[0m`);
          });
          console.log("\x1b[90m" + "═".repeat(50) + "\x1b[0m\n");
        }
      } catch (_) {}
    }, 1200);
  }
});

nextProcess.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => { nextProcess.kill(); process.exit(); });
