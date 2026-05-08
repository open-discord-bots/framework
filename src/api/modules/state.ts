///////////////////////////////////////
//STATE MODULE
///////////////////////////////////////
import { ODId, ODManager, ODValidId, ODSystemError, ODManagerData, ODNoGeneric, ODValidJsonType } from "./base.js"
import { ODClientManager } from "./client.js"
import { ODDebugger } from "./console.js"
import { ODDatabase, ODDatabaseIdConstraint } from "./database.js"
import * as discord from "discord.js"

/**## ODStateKey `type`
 * The key template for message states.
 */
export type ODStateKey<WithGuildKey extends boolean,WithUserKey extends boolean> = {
    /**A valid discord channel ID or instance. */
    channel:discord.Channel|string,
    /**A valid discord message ID or instance. */
    message:discord.Message|string,
}
& (WithGuildKey extends true ? {
    /**A valid discord server/guild ID or instance. */
    guild:discord.Guild|string,
} : {})
& (WithUserKey extends true ? {
    /**A valid discord user ID or instance. */
    user:discord.User|discord.GuildMember|string
} : {})

/**## ODStateData `type`
 * The raw data template for message states used for storing in the database.
 */
export interface ODStateData<StateData extends any> {
    /**The linked Guild ID of this message state. */
    guildId:string|null,
    /**The linked Channel ID of this message state. */
    channelId:string,
    /**The linked Message ID of this message state. */
    messageId:string,
    /**The linked User ID of this message state. */
    userId:string|null,
    /**The creation date of this state (UNIX TIMESTAMP). */
    createdDate:number,
    /**The modified date of this state (UNIX TIMESTAMP). */
    modifiedDate:number,
    /**Optional date after which this state should be regarded as expired (UNIX TIMESTAMP). */
    deleteAfterDate:number|null,
    /**The state data. */
    data:StateData
}

/**## ODStateSettings `type`
 * Configurable settings for an ODState.
 */
export interface ODStateSettings {
    /**(Default: `false`) Completely disable autodelete of message states. (unless manually activated using other settings) */
    disableAutodelete:boolean,
    /**(Default: `true`) Delete state on channel deletion. */
    autodeleteOnChannelDelete:boolean,
    /**(Default: `true`) Delete state on message deletion. */
    autodeleteOnMessageDelete:boolean,
    /**(Default: `true`) Delete state when the user leaves the guild/server. */
    autodeleteOnUserLeave:boolean,
    /**(Default: `false`) Delete state on bot restart. */
    autodeleteOnRestart:boolean,
    /**(Default: `true`) Delete state after 1 hour of an ephemeral message being sent. */
    autodeleteOnEphemeral:boolean,
    /**(Default: `null`) Delete state when unmodified/inactive for more than.... */
    autodeleteAfterTimeout:null|{time:number,unit:"seconds"|"minutes"|"hours"|"days"},
}

/**## ODState `class`
 * An Open Discord state is a system for storing additional chunks of metadata for Discord messages.
 * A system for tracking messages or linking metadata, states or progress to Discord messages (ID-based).
 * 
 * Features automatic garbage collection to clear expired states. 
 */
export class ODState<StateData extends any,WithGuildKey extends boolean,WithUserKey extends boolean> extends ODManagerData {
    /**Alias to Open Discord message states database. */
    protected database: ODDatabase<ODDatabaseIdConstraint>
    /**Alias to Open Discord client manager. */
    protected client: ODClientManager
    /**Alias to Open Discord debugger. */
    protected debug: ODDebugger|null = null
    /**The settings of this state. */
    settings: ODStateSettings
    
    constructor(id:ODValidId,client:ODClientManager,database:ODDatabase<ODDatabaseIdConstraint>,settings:Partial<ODStateSettings>){
        super(id)
        this.client = client
        this.database = database
        this.settings = {
            disableAutodelete:false,
            autodeleteOnChannelDelete:true,
            autodeleteOnMessageDelete:true,
            autodeleteOnUserLeave:true,
            autodeleteOnRestart:false,
            autodeleteOnEphemeral:true,
            autodeleteAfterTimeout:null,
            ...settings
        }
    }

    /**Use the Open Discord debugger in this manager for logs. */
    useDebug(debug?:ODDebugger|null){
        this.debug = debug ?? null
    }
    /**Init the state and start autodeleting. The client must already be logged-in for this to work. */
    async init(){
        if (!this.client.loggedIn) throw new ODSystemError("ODState('"+this.id.value+"').init() => The client must be logged in for states to initialize.")

        //autodelete on restart
        if (!this.settings.disableAutodelete && this.settings.autodeleteOnRestart) this.clearAllMsgStates()

        //autodelete on channelDelete
        this.client.client.on("channelDelete",async (deletedChannel) => {
            if (this.settings.disableAutodelete || !this.settings.autodeleteOnChannelDelete) return

            for (const {key,value} of await this.listMsgStates()){
                if (value.channelId === deletedChannel.id) await this.deleteMsgStateWithRawKey(key)
            }
        })
        //autodelete on messageDelete
        this.client.client.on("messageDelete",async (deletedMsg) => {
            if (this.settings.disableAutodelete || !this.settings.autodeleteOnMessageDelete) return

            for (const {key,value} of await this.listMsgStates()){
                if (value.messageId === deletedMsg.id) await this.deleteMsgStateWithRawKey(key)
            }
        })
        //autodelete on userLeave
        this.client.client.on("guildMemberRemove",async (member) => {
            if (this.settings.disableAutodelete || !this.settings.autodeleteOnUserLeave) return
            if (member.guild.id !== this.client.mainServer?.id) return

            for (const {key,value} of await this.listMsgStates()){
                if (value.userId === member.id) await this.deleteMsgStateWithRawKey(key)
            }
        })

        //autodelete when expired (ephemeral/timeout) every 30 seconds
        this.purgeExpiredStates()
        setInterval(() => {
            this.purgeExpiredStates()
        },30*1000)

        //create a list of all channels, messages & users that still exist (and are part of states)
        const existingChannelIds: string[] = []
        const existingMessageIds: string[] = []
        const existingUserIds: string[] = []
 
        for (const {key,value} of await this.listMsgStates()){
            if (!existingChannelIds.includes(value.channelId)){
                //check if channel still exists
                const channel = await this.client.fetchChannel(value.channelId)
                if (channel) existingChannelIds.push(channel.id)
            }
            if (!existingMessageIds.includes(value.messageId)){
                //check if message still exists
                const message = await this.client.fetchChannelMessage(value.channelId,value.messageId)
                if (message) existingMessageIds.push(message.id)
            }
            if (value.userId && this.client.mainServer && !existingUserIds.includes(value.userId)){
                //check if user still exists
                const user = await this.client.fetchGuildMember(this.client.mainServer.id,value.userId)
                if (user) existingUserIds.push(user.id)
            }
        }

        //delete all states where a channel, message or user is missing (when the bot was offline)
        for (const {key,value} of await this.listMsgStates()){
            if (value.channelId && !existingChannelIds.includes(value.channelId)) await this.deleteMsgStateWithRawKey(key)
            if (value.messageId && !existingMessageIds.includes(value.messageId)) await this.deleteMsgStateWithRawKey(key)
            if (value.userId && !existingUserIds.includes(value.userId)) await this.deleteMsgStateWithRawKey(key)
        }
    }
    /**Purge all expired message states that reached a timeout or ephemeral. */
    protected async purgeExpiredStates(){
        for (const {key,value} of await this.listMsgStates()){
            if (value.deleteAfterDate && value.deleteAfterDate < Date.now()) await this.deleteMsgStateWithRawKey(key)
        }
    }
    /**Transform the object-based message state key contents to a string. */
    protected transformKey(key:ODStateKey<WithGuildKey,WithUserKey>){
        const newGuild = (!("guild" in key) || !key.guild) ? "NULL" : (typeof key.guild === "string" ? key.guild : key.guild.id)
        const newChannel = (!key.channel) ? "NULL" : (typeof key.channel === "string" ? key.channel : key.channel.id)
        const newMessage = (!key.message) ? "NULL" : (typeof key.message === "string" ? key.message : key.message.id)
        const newUser = (!("user" in key) || !key.user) ? "NULL" : (typeof key.user === "string" ? key.user : key.user.id)

        return `G:${newGuild},C:${newChannel},M:${newMessage},U:${newUser}`
    }
    /**Transform the message state data contents for storage in the database. */
    protected transformData(key:ODStateKey<WithGuildKey,WithUserKey>,data:StateData,isEphemeral:boolean,keepCreatedDate?:number): ODStateData<StateData> {
        const guildId = (!("guild" in key) || !key.guild) ? null : (typeof key.guild === "string" ? key.guild : key.guild.id)
        const channelId = (typeof key.channel === "string" ? key.channel : key.channel.id)
        const messageId = (typeof key.message === "string" ? key.message : key.message.id)
        const userId = (!("user" in key) || !key.user) ? null : (typeof key.user === "string" ? key.user : key.user.id)
        const createdDate = keepCreatedDate ?? Date.now()
        const modifiedDate = Date.now()

        const unmodifiedTimeoutDate = this.timeoutToUnixTime()
        const ephemeralTimeoutDate = (isEphemeral) ? Date.now()+(3600*1000) : null //delete ephemeral state after 1 hour
        const deleteAfterDate = (unmodifiedTimeoutDate) ? unmodifiedTimeoutDate : ephemeralTimeoutDate

        return {guildId,channelId,messageId,userId,createdDate,modifiedDate,deleteAfterDate,data}
    }
    /**Calculate milliseconds from a time + unit. */
    protected timeoutToUnixTime(){
        const timeout = this.settings.autodeleteAfterTimeout
        if (!timeout) return null
        if (timeout.unit == "seconds") return Date.now() + (timeout.time * 1000)
        else if (timeout.unit == "minutes") return Date.now() + (timeout.time * 1000 * 60)
        else if (timeout.unit == "hours") return Date.now() + (timeout.time * 1000 * 3600)
        else if (timeout.unit == "days") return Date.now() + (timeout.time * 1000 * 3600 * 24)
        else return null
    }
    /**Set a message state using guild, channel & message id as key. Returns `true` when overwritten. */
    async setMsgState(key:ODStateKey<WithGuildKey,WithUserKey>,data:StateData,isEphemeral:boolean): Promise<boolean> {
        const rawKey = this.transformKey(key)
        
        const existingData = await this.getMsgState(key)
        const contents = this.transformData(key,data,isEphemeral,existingData?.createdDate)
        return await this.database.set(this.id.value,rawKey,contents)
    }
    /**Get a message state using guild, channel & message id as key. */
    async getMsgState(key:ODStateKey<WithGuildKey,WithUserKey>): Promise<ODStateData<StateData>|null> {
        const rawKey = this.transformKey(key)
        const rawData = await this.database.get(this.id.value,rawKey)
        if (typeof rawData !== "object") return null
        else return rawData as ODStateData<StateData>
    }
    /**Delete a message state using guild, channel & message id as key. Returns `true` when deleted. */
    async deleteMsgState(key:ODStateKey<WithGuildKey,WithUserKey>): Promise<boolean> {
        const rawKey = this.transformKey(key)
        return await this.database.delete(this.id.value,rawKey)
    }
    /**List all message states of this `ODState`. */
    async listMsgStates(): Promise<{key:string,value:ODStateData<StateData>}[]> {
        return ((await this.database.getCategory(this.id.value)) ?? []) as {key:string,value:ODStateData<StateData>}[]
    }
    /**Delete all message states from this ODState. */
    async clearAllMsgStates(): Promise<void> {
        for (const state of await this.database.getAll()){
            await this.database.delete(state.category,state.key)
        }
    }
    /**Delete a message state using the raw key. Returns `true` when deleted. */
    protected async deleteMsgStateWithRawKey(rawKey:string): Promise<boolean> {
        return await this.database.delete(this.id.value,rawKey)
    }
}

/**## ODStateManagerIdConstraint `type`
 * The constraint/layout for id mappings/interfaces of the `ODStateManager` class.
 */
export type ODStateManagerIdConstraint = Record<string,ODState<any,boolean,boolean>>

/**## ODStateManager `class`
 * The Open Discord state manager is a system for tracking messages or linking metadata, states or progress to Discord messages (ID-based).
 * 
 * Features automatic garbage collection to clear expired states. 
 */
export class ODStateManager<IdList extends ODStateManagerIdConstraint = ODStateManagerIdConstraint> extends ODManager<ODState<any,boolean,boolean>> {
    constructor(debug:ODDebugger){
        super(debug,"state")
    }

    /**Init all states. */
    async init(){
        for (const state of this.getAll()){
            await state.init()
        }
    }

    add(data:ODState<any,boolean,boolean>, overwrite?:boolean): boolean {
        data.useDebug(this.debug)
        return super.add(data,overwrite)
    }

    get<StateId extends keyof ODNoGeneric<IdList>>(id:StateId): IdList[StateId]
    get(id:ODValidId): ODState<any,boolean,boolean>|null
    
    get(id:ODValidId): ODState<any,boolean,boolean>|null {
        return super.get(id)
    }

    remove<StateId extends keyof ODNoGeneric<IdList>>(id:StateId): IdList[StateId]
    remove(id:ODValidId): ODState<any,boolean,boolean>|null
    
    remove(id:ODValidId): ODState<any,boolean,boolean>|null {
        return super.remove(id)
    }

    exists(id:keyof ODNoGeneric<IdList>): boolean
    exists(id:ODValidId): boolean
    
    exists(id:ODValidId): boolean {
        return super.exists(id)
    }
}