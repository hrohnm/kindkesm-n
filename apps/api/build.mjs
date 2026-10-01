// Bündelt die API inkl. der Workspace-Pakete (TypeScript-Quellen) in dist/.
// Drittanbieter-Pakete bleiben extern und werden aus node_modules geladen.
import { build } from "esbuild";

const workspacePaketeBuendeln = {
  name: "externals",
  setup(b) {
    b.onResolve({ filter: /^[^./]/ }, (args) =>
      args.path.startsWith("@kindkesmoeoen/") ? undefined : { path: args.path, external: true },
    );
  },
};

await build({
  entryPoints: ["src/server.ts", "src/db/migrate.ts", "src/seed/seed.ts", "src/cli.ts"],
  outdir: "dist",
  outbase: "src",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  plugins: [workspacePaketeBuendeln],
});
console.log("API gebaut: dist/");
