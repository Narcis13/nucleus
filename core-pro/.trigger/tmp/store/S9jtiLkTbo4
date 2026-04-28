import {
  defineConfig
} from "../../../chunk-O6KEYEYL.mjs";
import "../../../chunk-SZ6GL6S4.mjs";
import {
  init_esm
} from "../../../chunk-3VTTNDYQ.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_corepro_placeholder",
  dirs: ["./trigger/jobs"],
  runtime: "node",
  logLevel: "log",
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1e3,
      maxTimeoutInMs: 1e4,
      factor: 2,
      randomize: true
    }
  },
  build: {}
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
