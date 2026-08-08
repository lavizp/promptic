import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./App.js";

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  screenMode: "main-screen",
});

const root = createRoot(renderer);
root.render(<App />);

process.on('SIGINT', () => {
  renderer.destroy();
  process.exit(0);
});
