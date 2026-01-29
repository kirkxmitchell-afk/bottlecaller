import { installEngineBridge } from "./engineBridge";

installEngineBridge();

// Optional: dev log
console.log("EngineBridge installed", (window as any).EngineBridge);
