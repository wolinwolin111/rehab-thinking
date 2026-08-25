// 批次 1.5 渲染合同专用：用内联最小配置的 vite ssrLoadModule 加载真实 TSX 组件。
// 不使用仓库 vite.config.ts（其绑定 vinext 插件），避免干扰；依赖外部化给 Node 原生 ESM。
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

let serverPromise = null;

function getServer() {
  if (!serverPromise) {
    serverPromise = createServer({
      configFile: false,
      root: rootDir,
      logLevel: "error",
      server: { middlewareMode: true, hmr: false },
      optimizeDeps: { disabled: true },
      resolve: {
        alias: [{ find: /^@\//, replacement: `${rootDir}/` }],
      },
    }).then((server) => {
      const originalClose = server.close.bind(server);
      server.close = async () => {
        serverPromise = null;
        return originalClose();
      };
      return server;
    });
  }
  return serverPromise;
}

/** entry 以 "/src/..." 形式给出（相对仓库根，带扩展名）。 */
export async function loadTsxModule(entry) {
  const server = await getServer();
  return server.ssrLoadModule(entry);
}

export async function closeTsxLoader() {
  if (serverPromise) await (await getServer()).close();
}
