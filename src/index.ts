export { loadDumpCommand } from "./startup/dump"
export { loadAllPlugins } from "./startup/pluginLauncher"
export { frameworkStartup } from "./startup/compilation"
import { checkFrameworkAllowed } from "./startup/compilation"

//check directory structure
checkFrameworkAllowed()