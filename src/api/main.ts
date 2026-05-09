//BASE MODULES
import { ODEnvHelper, ODProjectType, ODVersion, ODVersionManager } from "./modules/base.js"
import { ODConsoleManager, ODConsoleMessage, ODConsoleMessageParam, ODConsoleMessageTypes, ODDebugFileManager, ODDebugger, ODError, ODLiveStatusManager } from "./modules/console.js"
import { ODCheckerManager } from "./modules/checker.js"
import { ODEventManager } from "./modules/event.js"
import { ODPluginManager } from "./modules/plugin.js"
import { ODFlagManager } from "./modules/flag.js"
import { ODProgressBarManager } from "./modules/progressbar.js"
import { ODConfigManager } from "./modules/config.js"
import { ODDatabaseManager } from "./modules/database.js"
import { ODSessionManager } from "./modules/session.js"
import { ODLanguageManager } from "./modules/language.js"
import { ODBuilderManager } from "./modules/builder.js"
import { ODResponderManager } from "./modules/responder.js"
import { ODActionManager } from "./modules/action.js"
import { ODVerifyBarManager } from "./modules/verifybar.js"
import { ODPermissionManager } from "./modules/permission.js"
import { ODCooldownManager } from "./modules/cooldown.js"
import { ODHelpMenuManager } from "./modules/helpmenu.js"
import { ODStatisticManager } from "./modules/statistic.js"
import { ODCodeManager } from "./modules/code.js"
import { ODPostManager } from "./modules/post.js"
import { ODClientManager } from "./modules/client.js"
import { ODSharedFuseManager } from "./modules/fuse.js"
import { ODStartScreenManager } from "./modules/startscreen.js"
import { ODComponentManager } from "./modules/component.js"
import { ODStateManager } from "./modules/state.js"

/**## ODMainManagers `interface`
 * The global properties for the main class of the bot.
 */
export interface ODMainManagers {
    /**A collection of versions of the bot, systems, frameworks & services. */
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
    /**The manager responsible for displaying progress bars in the console. */
    progressbars: ODProgressBarManager
    /**A collection of all the config files of the bot and plugins. (like `config/general.json`) */
    configs: ODConfigManager
    /**A collection of all the databases of the bot and plugins. (like `database/global.json`) */
    databases: ODDatabaseManager
    /**A collection of all the sessions of the bot. (Sessions are temporary objects stored in memory) */
    sessions: ODSessionManager
    /**The global translation manager which manges all language files, translations & switches between them. (Does not manage translations for plugins) */
    languages: ODLanguageManager
    
    /**The manager responsible for checking the bot & plugin configs. (it checks for mistakes in your config) */
    checkers: ODCheckerManager
    /**A collection of button, dropdown, embed, ... templates which can be used to construct messages and modals.
     * ### (🚨 Better alternative: `opendiscord.components (ODComponentManager)`)
     */
    builders: ODBuilderManager
    /**A collection of building blocks and templates for messages & modals with native support for Discord Components v2. (e.g. buttons, dropdowns, checkboxes, radio groups, file uploads, ...)
     * ### (✅ New replacement for: `opendiscord.builders (ODBuilderManager)`)
     */
    components: ODComponentManager
    /**The manager that handles responses to all interactions of the bot. (e.g. slash/text commands, buttons, dropdowns, modals) */
    responders: ODResponderManager
    /**A collection of procedures. A procedure is a complex task which can be executed from multiple responders or events. (e.g. ticket-creation, ticket-deletion, ticket-claiming, ...) */
    actions: ODActionManager
    /**A collection of verify bars from the bot. (the ✅ ❌ buttons in messages) */
    verifybars: ODVerifyBarManager
    /**A manager which will help with calculating permissions for commands & actions. */
    permissions: ODPermissionManager
    /**The manager which will manage cooldowns in the bot. (e.g. ticket-create cooldowns) */
    cooldowns: ODCooldownManager
    /**The manager that collects & renders the Open Discord help menu contents. (not the final embed) */
    helpmenu: ODHelpMenuManager
    /**The manager that registers, saves & updates statistics in the database. */
    statistics: ODStatisticManager
    /**A place where you can put general-purpose code which will start on startup of the bot. (Perfect for background tasks) */
    code: ODCodeManager
    /**A collection of static Discord post channels. It allows the bot to find back log, transcript or configured channels based on a linked ID. */
    posts: ODPostManager
    /**A system for tracking messages or linking metadata, states or progress to Discord messages (ID-based). Features automatic garbage collection. */
    states: ODStateManager
    
    /**A wrapper around the `discord.Client` class. It handles client login, activity and registering text/slash commands. */
    client: ODClientManager
    /**Shared fuses between Open Discord bots. Turn off "default behaviours" from the bot which is useful for replacing default behaviour with a custom implementation.  */
    sharedFuses: ODSharedFuseManager
    /**A manager which collects variables from the Process ENV and `.env` file. */
    env: ODEnvHelper
    /**LiveStatus is a protocol which displays live updates from DJdj Development in the startscreen of the bot. (e.g. new version available) */
    livestatus: ODLiveStatusManager
    /**The manager responsible for rendering the startscreen of the bot. */
    startscreen: ODStartScreenManager
}

/**## ODMain `class`
 * This is the main Open Discord class.
 * It contains all managers from the entire bot & has shortcuts to the event & logging system.
 * 
 * This class can't be overwritten or extended & is available as the global variable `opendiscord`!
 */
export abstract class ODMain implements ODMainManagers {
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
    readonly components: ODComponentManager
    readonly responders: ODResponderManager
    readonly actions: ODActionManager
    readonly verifybars: ODVerifyBarManager
    readonly permissions: ODPermissionManager
    readonly cooldowns: ODCooldownManager
    readonly helpmenu: ODHelpMenuManager
    readonly statistics: ODStatisticManager
    readonly code: ODCodeManager
    readonly posts: ODPostManager
    readonly states: ODStateManager
    
    readonly client: ODClientManager
    readonly sharedFuses: ODSharedFuseManager
    readonly env: ODEnvHelper
    readonly livestatus: ODLiveStatusManager
    readonly startscreen: ODStartScreenManager

    constructor(managers:ODMainManagers,project:ODProjectType){
        this.project = project
        this.versions = managers.versions
        this.versions.add(ODVersion.fromString("opendiscord:api","v0.3.14"))
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
        this.components = managers.components
        this.client = managers.client
        this.responders = managers.responders
        this.actions = managers.actions
        this.verifybars = managers.verifybars
        this.permissions = managers.permissions
        this.cooldowns = managers.cooldowns
        this.helpmenu = managers.helpmenu
        this.statistics = managers.statistics
        this.code = managers.code
        this.posts = managers.posts
        this.states = managers.states
        
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