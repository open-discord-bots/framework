export { loadDumpCommand } from "./startup/dump.js"
export { loadAllPlugins } from "./startup/pluginLauncher.js"
export { frameworkStartup } from "./startup/compilation.js"
export { loadErrorHandling } from "./startup/errorHandling.js"
import { checkFrameworkAllowed } from "./startup/compilation.js"

//check directory structure
checkFrameworkAllowed()