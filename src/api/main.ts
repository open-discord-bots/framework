//BASE MODULES
import { ODEnvHelper, ODProjectType, ODVersion, ODVersionManager } from "./modules/base"
import { ODConsoleManager, ODConsoleMessage, ODConsoleMessageParam, ODConsoleMessageTypes, ODDebugFileManager, ODDebugger, ODError, ODLiveStatusManager } from "./modules/console"
import { ODCheckerManager } from "./modules/checker"
import { ODEventManager } from "./modules/event"
import { ODPluginManager } from "./modules/plugin"
import { ODFlagManager } from "./modules/flag"
import { ODProgressBarManager } from "./modules/progressbar"
import { ODConfigManager } from "./modules/config"
import { ODDatabaseManager } from "./modules/database"
import { ODSessionManager } from "./modules/session"
import { ODLanguageManager } from "./modules/language"
import { ODBuilderManager } from "./modules/builder"
import { ODResponderManager } from "./modules/responder"
import { ODActionManager } from "./modules/action"
import { ODVerifyBarManager } from "./modules/verifybar"
import { ODPermissionManager } from "./modules/permission"
import { ODCooldownManager } from "./modules/cooldown"
import { ODHelpMenuManager } from "./modules/helpmenu"
import { ODStatsManager } from "./modules/stat"
import { ODCodeManager } from "./modules/code"
import { ODPostManager } from "./modules/post"
import { ODClientManager } from "./modules/client"
import { ODSharedFuseManager } from "./modules/fuse"
import { ODStartScreenManager } from "./modules/startscreen"

/**## ODMainManagers `interface`
 * The global properties for the main class of the bot.
 */
export interface ODMainManagers {
    /**The manager that handles all versions in the bot. */
    versions: ODVersionManager

    /**The timestamp that the (node.js) process of the bot started. */
    processStartupDate: Date
    /**The timestamp that the bot finished loading and is ready for usage. */
    readyStartupDate: Date|null

    /**The manager responsible for the debug file. (`...debug.txt`) */
    debugfile: ODDebugFileManager
    /**The manager responsible for the console system. (logs, errors, etc) */
    console: ODConsoleManager
    /**The manager responsible for sending debug logs to the debug file. (`...debug.txt`) */
    debug: ODDebugger
    /**The manager containing all Open Discord events. */
    events: ODEventManager

    /**The manager that handles & executes all plugins in the bot. */
    plugins: ODPluginManager
    /**The manager that manages & checks all the console flags of the bot. (like `--debug`) */
    flags: ODFlagManager
    /**The manager responsible for progress bars in the console. */
    progressbars: ODProgressBarManager
    /**The manager that manages & contains all the config files of the bot. (like `config/general.json`) */
    configs: ODConfigManager
    /**The manager that manages & contains all the databases of the bot. (like `database/global.json`) */
    databases: ODDatabaseManager
    /**The manager that manages all the data sessions of the bot. (it's a temporary database) */
    sessions: ODSessionManager
    /**The manager that manages all languages & translations of the bot. (but not for plugins) */
    languages: ODLanguageManager
    
    /**The manager that handles & executes all config checkers in the bot. (the code that checks if you have something wrong in your config) */
    checkers: ODCheckerManager
    /**The manager that manages all builders in the bot. (e.g. buttons, dropdowns, messages, modals, etc) */
    builders: ODBuilderManager
    /**The manager that manages all responders in the bot. (e.g. commands, buttons, dropdowns, modals) */
    responders: ODResponderManager
    /**The manager that manages all actions or procedures in the bot. (e.g. ticket-creation, ticket-deletion, ticket-claiming, etc) */
    actions: ODActionManager
    /**The manager that manages all verify bars in the bot. (the ✅ ❌ buttons) */
    verifybars: ODVerifyBarManager
    /**The manager that contains all permissions for commands & actions in the bot. (use it to check if someone has admin perms or not) */
    permissions: ODPermissionManager
    /**The manager that contains all cooldowns of the bot. (e.g. ticket-cooldowns) */
    cooldowns: ODCooldownManager
    /**The manager that manages & renders the Open Discord help menu. (not the embed, but the text) */
    helpmenu: ODHelpMenuManager
    /**The manager that manages, saves & renders the Open Discord statistics. (not the embed, but the text & database) */
    stats: ODStatsManager
    /**This manager is a place where you can put code that executes when the bot almost finishes the setup. (can be used for less important stuff that doesn't require an exact time-order) */
    code: ODCodeManager
    /**The manager that manages all posts (static discord channels) in the bot. (e.g. transcripts, logs, etc) */
    posts: ODPostManager
    
    /**The manager responsible for everything related to the client. (e.g. status, login, slash & text commands, etc) */
    client: ODClientManager
    /**Shared fuses between Open Discord bots. With these fuses/switches, you can turn off "default behaviours" from the bot. Useful for replacing default behaviour with a custom implementation.  */
    sharedFuses: ODSharedFuseManager
    /**This manager manages all the variables in the ENV. It reads from both the `.env` file & the `process.env`. (these 2 will be combined)  */
    env: ODEnvHelper
    /**The manager responsible for the livestatus system. (remote console logs) */
    livestatus: ODLiveStatusManager
    /**The manager responsible for the livestatus system. (remote console logs) */
    startscreen: ODStartScreenManager
}

/**## ODMain `class`
 * This is the main Open Discord class.
 * It contains all managers from the entire bot & has shortcuts to the event & logging system.
 * 
 * This class can't be overwritten or extended & is available as the global variable `opendiscord`!
 */
export class ODMain implements ODMainManagers {
    readonly project: ODProjectType

    readonly versions: ODVersionManager
    readonly processStartupDate: Date = new Date()
    readyStartupDate: Date|null = null

    readonly debugfile: ODDebugFileManager
    readonly console: ODConsoleManager
    readonly debug: ODDebugger
    readonly events: ODEventManager

    readonly plugins: ODPluginManager
    readonly flags: ODFlagManager
    readonly progressbars: ODProgressBarManager
    readonly configs: ODConfigManager
    readonly databases: ODDatabaseManager
    readonly sessions: ODSessionManager
    readonly languages: ODLanguageManager
    
    readonly checkers: ODCheckerManager
    readonly builders: ODBuilderManager
    readonly responders: ODResponderManager
    readonly actions: ODActionManager
    readonly verifybars: ODVerifyBarManager
    readonly permissions: ODPermissionManager
    readonly cooldowns: ODCooldownManager
    readonly helpmenu: ODHelpMenuManager
    readonly stats: ODStatsManager
    readonly code: ODCodeManager
    readonly posts: ODPostManager
    
    readonly client: ODClientManager
    readonly sharedFuses: ODSharedFuseManager
    readonly env: ODEnvHelper
    readonly livestatus: ODLiveStatusManager
    readonly startscreen: ODStartScreenManager

    constructor(managers:ODMainManagers,project:ODProjectType){
        this.project = project
        this.versions = managers.versions
        this.versions.add(ODVersion.fromString("opendiscord:api","v1.0.0"))
        this.versions.add(ODVersion.fromString("opendiscord:livestatus","v2.0.0"))

        this.debugfile = managers.debugfile
        this.console = managers.console
        this.debug = managers.debug
        this.events  = managers.events
        
        this.plugins = managers.plugins
        this.flags = managers.flags
        this.progressbars = managers.progressbars
        this.configs = managers.configs
        this.databases = managers.databases
        this.sessions = managers.sessions
        this.languages = managers.languages
        
        this.checkers = managers.checkers
        this.builders = managers.builders
        this.client = managers.client
        this.responders = managers.responders
        this.actions = managers.actions
        this.verifybars = managers.verifybars
        this.permissions = managers.permissions
        this.cooldowns = managers.cooldowns
        this.helpmenu = managers.helpmenu
        this.stats = managers.stats
        this.code = managers.code
        this.posts = managers.posts
        
        this.sharedFuses = managers.sharedFuses
        this.env = managers.env
        this.livestatus = managers.livestatus
        this.startscreen = managers.startscreen
    }
    
    /**Log a message to the console. But in the Open Discord style :) */
    log(message:ODConsoleMessage): void
    log(message:ODError): void
    log(message:string, type?:ODConsoleMessageTypes, params?:ODConsoleMessageParam[]): void
    log(message:ODConsoleMessage|ODError|string, type?:ODConsoleMessageTypes, params?:ODConsoleMessageParam[]){
        if (message instanceof ODConsoleMessage) this.console.log(message)
        else if (message instanceof ODError) this.console.log(message)
        else if (["string","number","boolean","object"].includes(typeof message)) this.console.log(message,type,params)
    }
}