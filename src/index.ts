export { loadDumpCommand } from "./startup/dump"
export { loadAllPlugins } from "./startup/pluginLauncher"
export { frameworkStartup } from "./startup/compilation"
export { loadErrorHandling } from "./startup/errorHandling"
import { checkFrameworkAllowed } from "./startup/compilation"

//check directory structure
checkFrameworkAllowed()