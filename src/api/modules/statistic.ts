///////////////////////////////////////
//STATISTIC MODULE
///////////////////////////////////////
import { ODId, ODManager, ODManagerData, ODSystemError, ODValidId } from "./base"
import { ODDebugger } from "./console"
import { ODDatabase, ODDatabaseIdConstraint, ODJsonDatabaseStructure } from "./database"
import * as discord from "discord.js"

/**## ODValidStatisticValue `type`
 * These are the only allowed types for a statistic value to improve compatibility with different database systems.
 */
export type ODValidStatisticValue = string|number|boolean

/**## ODStatisticManagerInitCallback `type`
 * This callback can be used to execute something when the statistics have been initiated.
 * 
 * By default this is used to clear statistics from users that left the server or tickets which don't exist anymore.
 */
export type ODStatisticManagerInitCallback = (database:ODJsonDatabaseStructure, deletables:ODJsonDatabaseStructure) => void|Promise<void>

/**## ODStatisticScopeSetMode `type`
 * This type contains all valid methods for changing the value of a statistic.
 */
export type ODStatisticScopeSetMode = "set"|"increase"|"decrease"

/**## ODStatisticManagerIdConstraint `type`
 * The constraint/layout for id mappings/interfaces of the `ODStatisticManager` class.
 */
export type ODStatisticManagerIdConstraint = Record<string,ODStatisticScope>

/**## ODStatisticManager `class`
 * This is an Open Discord statistics manager.
 * 
 * This class is responsible for managing all statistics of the bot.
 * Statistic are categorized in "scopes" which can be accessed in this manager.
 * 
 * Statistic can be accessed in the individual scopes.
 */
export class ODStatisticManager<IdList extends ODStatisticManagerIdConstraint = ODStatisticManagerIdConstraint> extends ODManager<ODStatisticScope> {
    /**Alias to Open Discord debugger. */
    #debug: ODDebugger
    /**Alias to Open Discord statistics database. */
    database: ODDatabase<ODDatabaseIdConstraint>|null = null
    /**All the listeners for the init event. */
    #initListeners: ODStatisticManagerInitCallback[] = []

    constructor(debug:ODDebugger){
        super(debug,"statistic scope")
        this.#debug = debug
    }

    /**Select the database to use to read/write all statistics from/to. */
    useDatabase(database:ODDatabase<ODDatabaseIdConstraint>){
        this.database = database
    }
    add(data:ODStatisticScope, overwrite?:boolean): boolean {
        data.useDebug(this.#debug,"stat")
        if (this.database) data.useDatabase(this.database)
        return super.add(data,overwrite)
    }
    /**Init all statistics and run `onInit()` listeners. */
    async init(){
        if (!this.database) throw new ODSystemError("Unable to initialize statistics scopes due to missing database!")

        //get all valid categories
        const validCategories: string[] = []
        for (const scope of this.getAll()){
            validCategories.push(...scope.init())
        }

        //filter out the deletable statistics
        const deletableStats: ODJsonDatabaseStructure = []
        const data = await this.database.getAll()
        data.forEach((data) => {
            if (!validCategories.includes(data.category)) deletableStats.push(data)
        })

        //do additional deletion
        for (const cb of this.#initListeners){
            await cb(data,deletableStats)
        }
        
        //delete all deletable statistics
        for (const data of deletableStats){
            if (!this.database) return
            await this.database.delete(data.category,data.key)
        }
    }
    /**Reset all statistics. (clears the entire database) */
    async reset(){
        if (!this.database) return
        const data = await this.database.getAll()
        for (const d of data){
            if (!this.database) return
            await this.database.delete(d.category,d.key)
        }
    }
    /**Run a function when the statistics are initialized. This can be used to clear statistics from users that left the server or tickets which don't exist anymore. */
    onInit(callback:ODStatisticManagerInitCallback){
        this.#initListeners.push(callback)
    }

    get<ScopeId extends keyof IdList>(id:ScopeId): IdList[ScopeId]
    get(id:ODValidId): ODStatisticScope|null
    
    get(id:ODValidId): ODStatisticScope|null {
        return super.get(id)
    }

    remove<ScopeId extends keyof IdList>(id:ScopeId): IdList[ScopeId]
    remove(id:ODValidId): ODStatisticScope|null
    
    remove(id:ODValidId): ODStatisticScope|null {
        return super.remove(id)
    }

    exists(id:keyof IdList): boolean
    exists(id:ODValidId): boolean
    
    exists(id:ODValidId): boolean {
        return super.exists(id)
    }
}
/**## ODStatisticScopeIdConstraint `type`
 * The constraint/layout for id mappings/interfaces of the `ODStatisticScope` class.
 */
export type ODStatisticScopeIdConstraint = Record<string,ODStatistic>

/**## ODStatisticScope `class`
 * This is an Open Discord statistic scope.
 * 
 * A scope can contain multiple statistics. Every scope is seperated from other scopes.
 * Here, you can read & write the values of all statistics.
 * 
 * The built-in Open Discord scopes are: `global`, `user`, `ticket`
 */
export class ODStatisticScope<IdList extends ODStatisticScopeIdConstraint = ODStatisticScopeIdConstraint> extends ODManager<ODStatistic> {
    /**The id of this statistics scope. */
    id: ODId
    /**Is this scope already initialized? */
    ready: boolean = false
    /**Alias to Open Discord statistics database. */
    database: ODDatabase<ODDatabaseIdConstraint>|null = null
    /**The name of this scope (used in embed title) */
    name:string

    constructor(id:ODValidId, name:string){
        super()
        this.id = new ODId(id)
        this.name = name
    }

    /**Select the database to use to read/write all statistics from/to. (Automatically assigned when used in `ODStatisticManager`) */
    useDatabase(database:ODDatabase<ODDatabaseIdConstraint>){
        this.database = database
    }
    /**Get the value of a statistic. The `scopeId` is the unique id of the user, channel, role, etc that the statistics are related to. */
    getStat<StatisticId extends keyof IdList>(id:StatisticId, scopeId:string): Promise<ODValidStatisticValue|null>
    getStat(id:ODValidId, scopeId:string): Promise<ODValidStatisticValue|null>
    async getStat(id:ODValidId, scopeId:string): Promise<ODValidStatisticValue|null> {
        if (!this.database) return null
        const newId = new ODId(id)
        const data = await this.database.get(this.id.value+"_"+newId.value,scopeId)

        if (typeof data == "undefined"){
            //set statistics to default value & return
            return this.resetStat(id,scopeId)
        }else if (typeof data == "string" || typeof data == "boolean" || typeof data == "number"){
            //return value received from database
            return data
        }
        //return null on error
        return null
    }
    /**Get the value of a statistic for all `scopeId`'s. The `scopeId` is the unique id of the user, channel, role, etc that the statistics are related to. */
    getAllStats<StatisticId extends keyof IdList>(id:StatisticId): Promise<{id:string,value:ODValidStatisticValue}[]>
    getAllStats(id:ODValidId): Promise<{id:string,value:ODValidStatisticValue}[]>
    async getAllStats(id:ODValidId): Promise<{id:string,value:ODValidStatisticValue}[]> {
        if (!this.database) return []
        const newId = new ODId(id)
        const data = await this.database.getCategory(this.id.value+"_"+newId.value) ?? []
        const output: {id:string,value:ODValidStatisticValue}[] = []

        for (const stat of data){
            if (typeof stat.value == "string" || typeof stat.value == "boolean" || typeof stat.value == "number"){
                //return value received from database
                output.push({id:stat.key,value:stat.value})
            }
        }
        
        //return null on error
        return output
    }
    /**Set, increase or decrease the value of a statistic. The `scopeId` is the unique id of the user, channel, role, etc that the statistics are related to. */
    setStat<StatisticId extends keyof IdList>(id:StatisticId, scopeId:string, value:ODValidStatisticValue, mode:ODStatisticScopeSetMode): Promise<boolean>
    setStat(id:ODValidId, scopeId:string, value:ODValidStatisticValue, mode:ODStatisticScopeSetMode): Promise<boolean>
    async setStat(id:ODValidId, scopeId:string, value:ODValidStatisticValue, mode:ODStatisticScopeSetMode): Promise<boolean> {
        if (!this.database) return false
        const stat = this.get(id)
        if (!stat) return false
        if (mode == "set" || typeof value != "number"){
            await this.database.set(this.id.value+"_"+stat.id.value,scopeId,value)
        }else if (mode == "increase"){
            const currentValue = await this.getStat(id,scopeId)
            if (typeof currentValue != "number") await this.database.set(this.id.value+"_"+stat.id.value,scopeId,0+value)
            else await this.database.set(this.id.value+"_"+stat.id.value,scopeId,currentValue+value)
        }else if (mode == "decrease"){
            const currentValue = await this.getStat(id,scopeId)
            if (typeof currentValue != "number") await this.database.set(this.id.value+"_"+stat.id.value,scopeId,0-value)
            else await this.database.set(this.id.value+"_"+stat.id.value,scopeId,currentValue-value)
        }
        return true
    }
    /**Reset the value of a statistic to the initial value. The `scopeId` is the unique id of the user, channel, role, etc that the statistics are related to. */
    resetStat<StatisticId extends keyof IdList>(id:ODValidId, scopeId:string): Promise<ODValidStatisticValue|null>
    resetStat(id:ODValidId, scopeId:string): Promise<ODValidStatisticValue|null>
    async resetStat(id:ODValidId, scopeId:string): Promise<ODValidStatisticValue|null> {
        if (!this.database) return null
        const stat = this.get(id)
        if (!stat) return null
        if (stat.value != null) await this.database.set(this.id.value+"_"+stat.id.value,scopeId,stat.value)
        return stat.value
    }
    /**Initialize this statistic scope & return a list of all statistic ids in the following format: `<scopeid>_<statid>`  */
    init(): string[] {
        //get all valid statistics categories
        this.ready = true
        return this.getAll().map((stat) => this.id.value+"_"+stat.id.value)
    }
    /**Render all statistics in this scope for usage in a discord message/embed. */
    async render(scopeId:string, guild:discord.Guild, channel:discord.TextBasedChannel, user:discord.User): Promise<string> {
        //sort from high priority to low
        const derefArray = [...this.getAll()]
        derefArray.sort((a,b) => {
            return b.priority-a.priority
        })
        const result: string[] = []

        for (const stat of derefArray){
            try {
                if (stat instanceof ODDynamicStatistic){
                    //dynamic render (without value)
                    result.push(await stat.render("",scopeId,guild,channel,user))
                }else{
                    //normal render (with value)
                    const value = await this.getStat(stat.id,scopeId)
                    if (value != null) result.push(await stat.render(value,scopeId,guild,channel,user))
                }
                
            }catch(err){
                process.emit("uncaughtException",err)
            }
        }

        return result.filter((stat) => stat !== "").join("\n")
    }

    get<StatisticId extends keyof IdList>(id:StatisticId): IdList[StatisticId]
    get(id:ODValidId): ODStatistic|null
    
    get(id:ODValidId): ODStatistic|null {
        return super.get(id)
    }

    remove<StatisticId extends keyof IdList>(id:StatisticId): IdList[StatisticId]
    remove(id:ODValidId): ODStatistic|null
    
    remove(id:ODValidId): ODStatistic|null {
        return super.remove(id)
    }

    exists(id:keyof IdList): boolean
    exists(id:ODValidId): boolean
    
    exists(id:ODValidId): boolean {
        return super.exists(id)
    }
}

/**## ODStatisticGlobalScope `class`
 * This is an Open Discord statistic global scope.
 * 
 * A scope can contain multiple statistics. Every scope is seperated from other scopes.
 * Here, you can read & write the values of all statistics.
 * 
 * This scope is made specifically for the global statistics of Open Discord.
 */
export class ODStatisticGlobalScope<IdList extends ODStatisticScopeIdConstraint = ODStatisticScopeIdConstraint> extends ODStatisticScope<IdList> {
    getStat<StatisticId extends keyof IdList>(id:StatisticId): Promise<ODValidStatisticValue|null>
    getStat(id:ODValidId): Promise<ODValidStatisticValue|null>
    getStat(id:ODValidId): Promise<ODValidStatisticValue|null> {
        return super.getStat(id,"GLOBAL")
    }

    getAllStats<StatisticId extends keyof IdList>(id:StatisticId): Promise<{id:string,value:ODValidStatisticValue}[]>
    getAllStats(id:ODValidId): Promise<{id:string,value:ODValidStatisticValue}[]>
    getAllStats(id:ODValidId): Promise<{id:string,value:ODValidStatisticValue}[]> {
        return super.getAllStats(id)
    }

    setStat<StatisticId extends keyof IdList>(id:StatisticId, value:ODValidStatisticValue, mode:ODStatisticScopeSetMode): Promise<boolean>
    setStat(id:ODValidId, value:ODValidStatisticValue, mode:ODStatisticScopeSetMode): Promise<boolean>
    setStat(id:ODValidId, value:ODValidStatisticValue, mode:ODStatisticScopeSetMode): Promise<boolean> {
        return super.setStat(id,"GLOBAL",value,mode)
    }

    resetStat<StatisticId extends keyof IdList>(id:ODValidId): Promise<ODValidStatisticValue|null>
    resetStat(id:ODValidId): Promise<ODValidStatisticValue|null>
    resetStat(id:ODValidId): Promise<ODValidStatisticValue|null> {
        return super.resetStat(id,"GLOBAL")
    }

    render(scopeId:"GLOBAL", guild:discord.Guild, channel:discord.TextBasedChannel, user: discord.User): Promise<string> {
        return super.render("GLOBAL",guild,channel,user)
    }
}

/**## ODStatisticRenderer `type`
 * This callback will render a single statistic for a discord embed/message.
 */
export type ODStatisticRenderer = (value:ODValidStatisticValue, scopeId:string, guild:discord.Guild, channel:discord.TextBasedChannel, user:discord.User) => string|Promise<string>

/**## ODStatistic `class`
 * This is an Open Discord statistic.
 * 
 * This single statistic doesn't do anything except defining the rules of this statistic.
 * Use it in a statistics scope to register a new statistic. A statistic can also include a priority to choose the render priority.
 * 
 * It's recommended to use the `ODBaseStatistic` & `ODDynamicStatistic` classes instead of this one!
 */
export class ODStatistic extends ODManagerData {
    /**The priority of this statistic. */
    priority: number
    /**The render function of this statistic. */
    render: ODStatisticRenderer
    /**The value of this statistic. */
    value: ODValidStatisticValue|null

    constructor(id:ODValidId, priority:number, render:ODStatisticRenderer, value?:ODValidStatisticValue){
        super(id)
        this.priority = priority
        this.render = render
        this.value = value ?? null
    }
}

/**## ODBaseStatistic `class`
 * This is an Open Discord basic statistic.
 * 
 * This single statistic will store a number, boolean or string in the database.
 * Use it to create a simple statistic for any statistics scope.
 */
export class ODBaseStatistic extends ODStatistic {
    /**The name of this statistic. Rendered in discord embeds/messages. */
    name: string

    constructor(id:ODValidId, priority:number, name:string, value:ODValidStatisticValue){
        super(id,priority,(value) => {
            return ""+name+": `"+value.toString()+"`"
        },value)
        this.name = name
    }
}

/**## ODDynamicStatisticRenderer `type`
 * This callback will render a single dynamic statistic for a discord embed/message.
 */
export type ODDynamicStatisticRenderer = (scopeId:string, guild:discord.Guild, channel:discord.TextBasedChannel, user:discord.User) => string|Promise<string>

/**## ODDynamicStatistic `class`
 * This is an Open Discord dynamic statistic.
 * 
 * A dynamic statistic does not store anything in the database! Instead, it will execute a function to return a custom result.
 * This can be used to show statistics which are not stored in the database.
 * 
 * This is used in Open Discord for the live ticket status, participants & system status.
 */
export class ODDynamicStatistic extends ODStatistic {
    constructor(id:ODValidId, priority:number, render:ODDynamicStatisticRenderer){
        super(id,priority,(value,scopeId,guild,channel,user) => {
            return render(scopeId,guild,channel,user)
        })
    }
}