///////////////////////////////////////
//FUSE MODULE
///////////////////////////////////////

/**## ODFuseBooleans `type`
 * This type is a list of boolean fuses available in the `ODFuseManager` class.
 * It's used to generate typescript declarations for this class.
 */
export type ODFuseBooleans<FuseList extends object> = {
    [Key in keyof FuseList]: FuseList[Key] extends boolean ? Key : never
}[keyof FuseList]

/**## ODFuseStrings `type`
 * This type is a list of string fuses available in the `ODFuseManager` class.
 * It's used to generate typescript declarations for this class.
 */
export type ODFuseStrings<FuseList extends object> = {
    [Key in keyof FuseList]: FuseList[Key] extends string ? Key : never
}[keyof FuseList]

/**## ODFuseNumbers `type`
 * This type is a list of number fuses available in the `ODFuseManager` class.
 * It's used to generate typescript declarations for this class.
 */
export type ODFuseNumbers<FuseList extends object> = {
    [Key in keyof FuseList]: FuseList[Key] extends number ? Key : never
}[keyof FuseList]

/**## ODFuseStringArray `type`
 * This type is a list of string[] fuses available in the `ODFuseManager` class.
 * It's used to generate typescript declarations for this class.
 */
export type ODFuseStringArray<FuseList extends object> = {
    [Key in keyof FuseList]: FuseList[Key] extends string[] ? Key : never
}[keyof FuseList]

/**## ODFuseManager `class`
 * This is an Open Discord fuse manager.
 * 
 * It manages all settings in Open Discord that are not meant to be in the config.
 * Here you can disable certain default features of the bot to replace them with your own implementation!
 * 
 * You can think of them like real fuses, they disable an entire branch of the bot!
 */
export class ODFuseManager<FuseList extends object> {
    /**A list of all the defaults */
    private fuses: FuseList

    constructor(fuses:FuseList){
        this.fuses = fuses
    }

    /**Set a fuse to a specific value. Remember! All plugins can edit these values, so your value could be overwritten! */
    setFuse<DefaultName extends keyof FuseList>(key:DefaultName, value:FuseList[DefaultName]): void {
        this.fuses[key] = value
    }

    /**Get a fuse. Remember! All plugins can edit these values, so this value could be overwritten! */
    getFuse<DefaultName extends keyof FuseList>(key:DefaultName): FuseList[DefaultName] {
        return this.fuses[key]
    }
}

/**## ODSharedFuseList `interface`
 * This type is a list of all fuses available in the `ODSharedFuseManager` class.
 * It's used to generate typescript declarations for this class.
 */
export interface ODSharedFuseList {
    /**Enable the default error handling system. */
    errorHandling:boolean,
    /**Crash when there is an unknown bot error. */
    crashOnError:boolean,
    /**Enable the system responsible for the `--debug` flag. */
    debugLoading:boolean,
    /**Enable the system responsible for the `--silent` flag. */
    silentLoading:boolean,
    /**When enabled, you're able to use the "!OPENTICKET:dump" command to send the OT debug file. This is only possible when you're the owner of the bot. */
    allowDumpCommand:boolean,
    /**Enable loading all Open Discord plugins, sadly enough is only useful for the system :) */
    pluginLoading:boolean,
    /**Don't crash the bot when a plugin crashes! */
    softPluginLoading:boolean,

    /**Load the default Open Discord plugin classes. */
    pluginClassLoading:boolean,

    /**Load the default Open Discord flags. */
    flagLoading:boolean,
    /**Enable the default initializer for Open Discord flags. */
    flagInitiating:boolean,
    /**Load the default Open Discord progress bar renderers. */
    progressBarRendererLoading:boolean,
    /**Load the default Open Discord progress bars. */
    progressBarLoading:boolean,
    /**Load the default Open Discord configs. */
    configLoading:boolean,
    /**Enable the default initializer for Open Discord config. */
    configInitiating:boolean,
    /**Load the default Open Discord databases. */
    databaseLoading:boolean,
    /**Enable the default initializer for Open Discord database. */
    databaseInitiating:boolean,
    /**Load the default Open Discord sessions. */
    sessionLoading:boolean,

    /**Load the default Open Discord languages. */
    languageLoading:boolean,
    /**Enable the default initializer for Open Discord languages. */
    languageInitiating:boolean,
    /**Enable selecting the current language from `config/general.json`. */
    languageSelection:boolean,
    /**Set the backup language when the primary language is missing a property. */
    backupLanguage:string,
    /****[NOT FOR PLUGIN TRANSLATIONS]** The full list of available languages (used in the default config checker). */
    languageList:string[],

    /**Load the default Open Discord config checker. */
    checkerLoading:boolean,
    /**Load the default Open Discord config checker functions. */
    checkerFunctionLoading:boolean,
    /**Enable the default execution of the config checkers. */
    checkerExecution:boolean,
    /**Load the default Open Discord config checker translations. */
    checkerTranslationLoading:boolean,
    /**Enable the default rendering of the config checkers. */
    checkerRendering:boolean,
    /**Enable the default quit action when there is an error in the config checker. */
    checkerQuit:boolean,
    /**Render the checker even when there are no errors & warnings. */
    checkerRenderEmpty:boolean,

    /**Load the default Open Discord client configuration. */
    clientLoading:boolean,
    /**Load the default Open Discord client initialization. */
    clientInitiating:boolean,
    /**Load the default Open Discord client ready actions (status, commands, permissions, ...). */
    clientReady:boolean,
    /**Create a warning when the bot is present in multiple guilds. */
    clientMultiGuildWarning:boolean,
    /**Load the default Open Discord client activity (from `config/general.json`). */
    clientActivityLoading:boolean,
    /**Load the default Open Discord client activity initialization (& status refresh). */
    clientActivityInitiating:boolean,

    /**Load the default Open Discord priority levels. */
    priorityLoading:boolean,

    /**Load the default Open Discord slash commands. */
    slashCommandLoading:boolean,
    /**Load the default Open Discord slash command registerer (register slash cmds in discord). */
    slashCommandRegistering:boolean,
    /**When enabled, the bot is forced to re-register all slash commands in the server. This can be used in case of a auto-update malfunction. */
    forceSlashCommandRegistration:boolean,
    /**When enabled, the bot is allowed to unregister all slash commands which aren't used in Open Discord. Disable this if you don't want to use the Open Discord `ODSlashCommand` classes. */
    allowSlashCommandRemoval:boolean,
    /**Load the default Open Discord context menus. */
    contextMenuLoading:boolean,
    /**Load the default Open Discord context menu registerer (register menus in discord). */
    contextMenuRegistering:boolean,
    /**When enabled, the bot is forced to re-register all context menus in the server. This can be used in case of a auto-update malfunction. */
    forceContextMenuRegistration:boolean,
    /**When enabled, the bot is allowed to unregister all context menus which aren't used in Open Discord. Disable this if you don't want to use the Open Discord `ODContextMenu` classes. */
    allowContextMenuRemoval:boolean,
    /**Load the default Open Discord text commands. */
    textCommandLoading:boolean,

    /**Load the default Open Discord button builders. */
    buttonBuildersLoading:boolean,
    /**Load the default Open Discord dropdown builders. */
    dropdownBuildersLoading:boolean,
    /**Load the default Open Discord file builders. */
    fileBuildersLoading:boolean,
    /**Load the default Open Discord embed builders. */
    embedBuildersLoading:boolean,
    /**Load the default Open Discord message builders. */
    messageBuildersLoading:boolean,
    /**Load the default Open Discord modal builders. */
    modalBuildersLoading:boolean,

    /**Load the default Open Discord command responders. */
    commandRespondersLoading:boolean,
    /**Load the default Open Discord button responders. */
    buttonRespondersLoading:boolean,
    /**Load the default Open Discord dropdown responders. */
    dropdownRespondersLoading:boolean,
    /**Load the default Open Discord modal responders. */
    modalRespondersLoading:boolean,
    /**Load the default Open Discord context menu responders. */
    contextMenuRespondersLoading:boolean,
    /**Load the default Open Discord autocomplete responders. */
    autocompleteRespondersLoading:boolean,
    /**Set the time (in ms) before Open Discord sends an error message when no reply is sent in a responder. */
    responderTimeoutMs:number,

    /**Load the default Open Discord actions. */
    actionsLoading:boolean,

    /**Load the default Open Discord verify bars. */
    verifyBarsLoading:boolean,
    /**Load the default Open Discord permissions. */
    permissionsLoading:boolean,
    /**Load the default Open Discord posts. */
    postsLoading:boolean,
    /**Initiate the default Open Discord posts. */
    postsInitiating:boolean,
    /**Load the default Open Discord cooldowns. */
    cooldownsLoading:boolean,
    /**Initiate the default Open Discord cooldowns. */
    cooldownsInitiating:boolean,
    /**Load the default Open Discord help menu categories. */
    helpMenuCategoryLoading:boolean,
    /**Load the default Open Discord help menu components. */
    helpMenuComponentLoading:boolean,

    /**Load the default Open Discord stat scopes. */
    statScopesLoading:boolean,
    /**Load the default Open Discord stats. */
    statLoading:boolean,
    /**Initiate the default Open Discord stats. */
    statInitiating:boolean,

    /**Load the default Open Discord code/functions. */
    codeLoading:boolean,
    /**Execute the default Open Discord code/functions. */
    codeExecution:boolean,

    /**Load the default Open Discord livestatus. */
    liveStatusLoading:boolean,
    /**Load the default Open Discord startscreen. */
    startScreenLoading:boolean,
    /**Render the default Open Discord startscreen. */
    startScreenRendering:boolean,

    /**Load the emoji style from the Open Discord general config. */
    emojiTitleStyleLoading:boolean,
    /**The emoji style to use in embed & message titles using `utilities.emoijTitle()` */
    emojiTitleStyle:"disabled"|"before"|"after"|"double",
    /**The emoji divider to use in embed & message titles using `utilities.emoijTitle()` */
    emojiTitleDivider:string
}

/**## ODFuseManager `class`
 * This is an Open Discord fuse manager.
 * 
 * It manages all settings in Open Discord that are not meant to be in the config.
 * Here you can disable certain default features of the bot to replace them with your own implementation!
 * 
 * You can think of them like real fuses, they disable an entire branch of the bot!
 */
export class ODSharedFuseManager extends ODFuseManager<ODSharedFuseList> {
    constructor(){
        super({
            errorHandling:true,
            crashOnError:false,
            debugLoading:true,
            silentLoading:true,
            allowDumpCommand:true,
            pluginLoading:true,
            softPluginLoading:false,

            pluginClassLoading:true,

            flagLoading:true,
            flagInitiating:true,
            progressBarRendererLoading:true,
            progressBarLoading:true,
            configLoading:true,
            configInitiating:true,
            databaseLoading:true,
            databaseInitiating:true,
            sessionLoading:true,

            languageLoading:true,
            languageInitiating:true,
            languageSelection:true,
            backupLanguage:"opendiscord:english",
            languageList:[],

            checkerLoading:true,
            checkerFunctionLoading:true,
            checkerExecution:true,
            checkerTranslationLoading:true,
            checkerRendering:true,
            checkerQuit:true,
            checkerRenderEmpty:false,

            clientLoading:true,
            clientInitiating:true,
            clientReady:true,
            clientMultiGuildWarning:true,
            clientActivityLoading:true,
            clientActivityInitiating:true,

            priorityLoading:true,
            
            slashCommandLoading:true,
            slashCommandRegistering:true,
            forceSlashCommandRegistration:false,
            allowSlashCommandRemoval:true,
            contextMenuLoading:true,
            contextMenuRegistering:true,
            forceContextMenuRegistration:false,
            allowContextMenuRemoval:true,
            textCommandLoading:true,

            buttonBuildersLoading:true,
            dropdownBuildersLoading:true,
            fileBuildersLoading:true,
            embedBuildersLoading:true,
            messageBuildersLoading:true,
            modalBuildersLoading:true,

            commandRespondersLoading:true,
            buttonRespondersLoading:true,
            dropdownRespondersLoading:true,
            modalRespondersLoading:true,
            contextMenuRespondersLoading:true,
            autocompleteRespondersLoading:true,
            responderTimeoutMs:2500,

            actionsLoading:true,

            verifyBarsLoading:true,
            permissionsLoading:true,
            postsLoading:true,
            postsInitiating:true,
            cooldownsLoading:true,
            cooldownsInitiating:true,
            helpMenuCategoryLoading:true,
            helpMenuComponentLoading:true,

            statScopesLoading:true,
            statLoading:true,
            statInitiating:true,

            codeLoading:true,
            codeExecution:true,

            liveStatusLoading:true,
            startScreenLoading:true,
            startScreenRendering:true,
            
            emojiTitleStyleLoading:true,
            emojiTitleStyle:"before",
            emojiTitleDivider:" "
        })
    }
}