
export * as api from "./api/api"
export * as utilities from "./api/utils"
export * as cli from "./cli/cli"
export { loadDumpCommand } from "./startup/dump"
export { loadAllPlugins } from "./startup/pluginLauncher"
export { frameworkStartup } from "./startup/compilation"
import { checkFrameworkAllowed } from "./startup/compilation"

//check directory structure
checkFrameworkAllowed()