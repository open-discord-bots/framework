///////////////////////////////////////
//PERMISSION MODULE
///////////////////////////////////////
import { ODId, ODValidId, ODManager, ODSystemError, ODManagerData, ODNoGeneric } from "./base.js"
import * as discord from "discord.js"
import { ODDebugger } from "./console.js"
import { ODClientManager, ODClientPermissions } from "./client.js"

/**## ODPermissionScopeMode `enum`
 * Different modes for scope priority in the permission system.
 */
export enum ODPermissionScopeMode {
    /**More specific scopes take priority. (Global -> Category -> Channel) */
    HierarchicalScopes="HierarchicalScopes",
    /****(BEST OPTION)** At Least one scope must allow to grant permission. */
    AnyScope="AnyScope",
    /**All scopes must allow to grant permission. */
    AllScopes="AllScopes"
}

/**## ODPermissionSettings `interface`
 * The scopes of this permission, each with their own settings.
 */
export interface ODPermissionSettings {
    /**The global scope, applies everywhere. */
    globalScope?:ODPermissionScope
    /**The channel scope, applies in a certain channel. */
    channelScopes?:(ODPermissionScope & {
        /**The channel this scope applies to. */
        channelId:string
    })[],
    /**The category scope, applies in a certain category. */
    categoryScopes?:(ODPermissionScope & {
        /**The category this scope applies to. */
        categoryId:string
    })[],
    /**The scope mode changes the way scopes take priority over eachother. */
    scopeMode:ODPermissionScopeMode
}

/**## ODPermissionScope `interface`
 * The configuration for a permission scope.
 * - `ALLOW` -> Must match at least one of these rules.
 * - `REQUIRE` -> Must match all required rules.
 */
export interface ODPermissionScope {
    /**(WARNING!) This explicitly denies this permission eventhough other rules match. It should not be used by default. */
    denyAll?:boolean

    /**Custom `ALLOW` function when other rules already return `false`. Does not interfer with `REQUIRE` rules. */
    allowCustom?:(ctx:ODPermissionCalculationContext) => Promise<boolean>
    /**Allow everyone. */
    allowEveryone?:boolean
    /**Allow the developer of the bot. */
    allowBotDeveloper?:boolean
    /**Allow the server owner. */
    allowServerOwner?:boolean
    /**Allow any user in this list. */
    allowedUserIds?:string[]
    /**Allow users with any of these roles. */
    allowedRoleIds?:string[]
    /**Allow users with any of these discord permissions. */
    allowedDiscordPerms?:ODClientPermissions[]

    /**Custom `REQUIRE` function when other rules already return `true`. Does not interfer with `ALLOW` rules. */
    requireCustom?:(ctx:ODPermissionCalculationContext) => Promise<boolean>
    /**Require the user to be the developer of the bot. */
    requireBotDeveloper?:boolean
    /**Require the user to be the owner of the server. */
    requireServerOwner?:boolean
    /**Require the user to have all these roles. */
    requiredRoleIds?:string[]
    /**Require the user to have all these discord permissions. */
    requiredDiscordPerms?:ODClientPermissions[]
}

/**## ODPermissionCalculationContext `interface`
 * The context for making permission calculations.
 */
export interface ODPermissionCalculationContext {
    user:discord.User,
    member:discord.GuildMember|null
    roles:discord.Role[],
    channel:discord.Channel|null,
    guild:discord.Guild,
    serverOwner:discord.User,
    botDevelopers:discord.User[]
}

/**## ODPermission `class`
 * This is an Open Discord permission.
 * 
 * It defines permissions for a specific command or action.
 * Each permission is able to have multiple scopes and settings to customise how permissions should behave.
 * 
 * Register this class in `opendiscord.permissions` (`ODPermissionManager`) to use it.
 */
export class ODPermission extends ODManagerData {
    /**The scope mode changes the way scopes take priority over eachother. */
    scopeMode:ODPermissionScopeMode
    /**The global scope, applies everywhere. */
    protected globalScope: ODPermissionScope|null
    /**The channel scope, applies in a certain channel. */
    protected channelScopes: (ODPermissionScope & {
        /**The channel this scope applies to. */
        channelId:string
    })[]
    /**The category scope, applies in a certain category. */
    protected categoryScopes: (ODPermissionScope & {
        /**The category this scope applies to. */
        categoryId:string
    })[]
    protected client: ODClientManager
    
    constructor(id:ODValidId,settings:ODPermissionSettings,clientManager:ODClientManager){
        super(id)
        this.client = clientManager
        this.scopeMode = settings.scopeMode
        this.globalScope = settings.globalScope ?? null
        this.channelScopes = settings.channelScopes ?? []
        this.categoryScopes = settings.categoryScopes ?? []
    }

    /**Modify the scope mode of this permission. */
    setScopeMode(mode:ODPermissionScopeMode){
        this.scopeMode = mode
    }
    /**Set the global scope settings of this permission. */
    setGlobalScope(scope:ODPermissionScope|null){
        this.globalScope = scope
    }
    /**Get the global scope settings of this permission. */
    getGlobalScope(){
        return structuredClone(this.globalScope)
    }
    /**Add or update a channel with scope settings to this permission. */
    setChannelScope(channelId:string,scope:ODPermissionScope){
        const index = this.channelScopes.findIndex((scope) => scope.channelId === channelId)
        if (index < 0) this.channelScopes.push({channelId,...scope})
        else this.channelScopes[index] = {channelId,...scope}
    }
    /**Remove a channel with scope settings from this permission. */
    removeChannelScope(channelId:string){
        const index = this.channelScopes.findIndex((scope) => scope.channelId === channelId)
        if (index > -1){
            this.channelScopes.splice(index,1)
            return true
        }else return false
    }
    /**Get a channel with scope settings from this permission. */
    getChannelScope(channelId:string){
        const index = this.channelScopes.findIndex((scope) => scope.channelId === channelId)
        if (index > -1) return structuredClone(this.channelScopes[index])
        else return null
    }
    /**Get all channel scope settings from this permission. */
    getAllChannelScopes(){
        return structuredClone(this.channelScopes)
    }
    /**Add or update a category with scope settings to this permission. */
    setCategoryScope(categoryId:string,scope:ODPermissionScope){
        const index = this.categoryScopes.findIndex((scope) => scope.categoryId === categoryId)
        if (index < 0) this.categoryScopes.push({categoryId,...scope})
        else this.categoryScopes[index] = {categoryId,...scope}
    }
    /**Remove a category with scope settings from this permission. */
    removeCategoryScope(categoryId:string){
        const index = this.categoryScopes.findIndex((scope) => scope.categoryId === categoryId)
        if (index > -1){
            this.categoryScopes.splice(index,1)
            return true
        }else return false
    }
    /**Get a category with scope settings from this permission. */
    getCategoryScope(categoryId:string){
        const index = this.categoryScopes.findIndex((scope) => scope.categoryId === categoryId)
        if (index > -1) return structuredClone(this.categoryScopes[index])
        else return null
    }
    /**Get all category scope settings from this permission. */
    getAllCategoryScopes(){
        return structuredClone(this.categoryScopes)
    }
    /**Check if this permission is granted to a certain user in a certain channel. */
    async hasPermissions(user:discord.User,channel?:discord.Channel|null): Promise<boolean> {
        if (!this.client.mainServer) throw new ODSystemError("ODPermission.hasPermissions() => ODClientManager.mainServer is not defined. Couldn't find the main server of the bot.")
        const guild = (channel && !channel.isDMBased()) ? channel.guild : this.client.mainServer
        const member = await this.client.fetchGuildMember(guild,user.id)
        const roles = member?.roles.cache.toJSON() ?? []

        const ctx: ODPermissionCalculationContext = {
            user,
            channel:channel ?? null,
            guild,
            member,
            roles,
            serverOwner:await this.client.fetchMainServerOwner(),
            botDevelopers:await this.client.fetchBotDevelopers()
        }

        return this.calculatePermission(ctx)
    }
    /**Calculate the permission for a user based on the provided context. */
    protected async calculatePermission(ctx:ODPermissionCalculationContext): Promise<boolean> {
        //COLLECT APPLIED SCOPES
        const appliedScopes: ODPermissionScope[] = []

        //global
        if (this.globalScope) appliedScopes.push(this.globalScope)

        //category
        if (ctx.channel && !ctx.channel.isDMBased()){
            const categoryId = ctx.channel.parentId
            if (categoryId){
                const categoryScope = this.categoryScopes.find((scope) => scope.categoryId === categoryId)
                if (categoryScope) appliedScopes.push(categoryScope)
            }
        }

        //channel
        if (ctx.channel){
            const channelId = ctx.channel.id
            const channelScope = this.channelScopes.find((scope) => scope.channelId === channelId)
            if (channelScope) appliedScopes.push(channelScope)
        }


        if (appliedScopes.length === 0) return false
        else if (this.scopeMode === ODPermissionScopeMode.HierarchicalScopes) {
            //the last scope should be the most specific one
            const scope = appliedScopes[appliedScopes.length - 1]
            return await this.calculateScope(scope,ctx)

        }else if (this.scopeMode === ODPermissionScopeMode.AnyScope) {
            //at least one of the scopes must return true
            const result = await Promise.all(appliedScopes.map((scope) => this.calculateScope(scope,ctx)))
            return result.some(result => result === true)

        }else if (this.scopeMode === ODPermissionScopeMode.AllScopes) {
            //all scopes must return true
            const result = await Promise.all(appliedScopes.map((scope) => this.calculateScope(scope,ctx)))
            return result.every(result => result === true)

        }else return false
    }
    /**Calculate the scope for a user based on the provided context. */
    protected async calculateScope(scope:ODPermissionScope,ctx:ODPermissionCalculationContext): Promise<boolean> {
        if (scope.denyAll) return false

        //ALLOW RULES: At least one of these rules must be true
        //an empty ruleset does NOT grant access
        const allowRules:boolean[] = []

        allowRules.push(scope.allowEveryone ?? false)
        if (scope.allowBotDeveloper) allowRules.push(ctx.botDevelopers.some((u) => u.id === ctx.user.id))
        if (scope.allowServerOwner) allowRules.push(ctx.serverOwner.id === ctx.user.id)
        if (scope.allowedUserIds) allowRules.push(scope.allowedUserIds.includes(ctx.user.id))
        if (scope.allowedRoleIds) allowRules.push(scope.allowedRoleIds.some((allowedRoleId) => ctx.roles.some((r) => r.id === allowedRoleId)))
        if (scope.allowedDiscordPerms) allowRules.push(scope.allowedDiscordPerms.some((p) => ctx.member?.permissions.has(p) ?? false))
        if (scope.allowCustom) allowRules.push(await scope.allowCustom(ctx))

        //REQUIRE RULES: All enabled rules must be true
        //an empty ruleset MIGHT grant access
        const requireRules:boolean[] = []

        if (scope.requireBotDeveloper) requireRules.push(ctx.botDevelopers.some((u) => u.id === ctx.user.id))
        if (scope.allowServerOwner) requireRules.push(ctx.serverOwner.id === ctx.user.id)
        if (scope.requiredRoleIds) requireRules.push(scope.requiredRoleIds.every((requiredRoleId) => ctx.roles.some((r) => r.id === requiredRoleId)))
        if (scope.requiredDiscordPerms) requireRules.push(scope.requiredDiscordPerms.every((p) => ctx.member?.permissions.has(p) ?? false))
        if (scope.requireCustom) requireRules.push(await scope.requireCustom(ctx))
        
        //FINAL SCOPE RESULT
        const allowanceMet = allowRules.some(result => result === true)
        const requirementsMet = requireRules.every(result => result === true)

        return allowanceMet && requirementsMet
    }
}

/**## ODPermissionManagerIdConstraint `type`
 * The constraint/layout for id mappings/interfaces of the `ODPermissionManager` class.
 */
export type ODPermissionManagerIdConstraint = Record<string,ODPermission>

/**## ODPermissionManager `class`
 * This is the Open Discord permission manager.
 * 
 * Register new `ODPermissions` using .add() and configure them individually.
 */
export class ODPermissionManager<IdList extends ODPermissionManagerIdConstraint = ODPermissionManagerIdConstraint> extends ODManager<ODPermission> {
    /**An alias to the Open Discord client manager. */
    protected client: ODClientManager
    
    constructor(debug:ODDebugger,client:ODClientManager){
        super(debug,"permission")
        this.client = client
    }

    /**Is this user the developer of this bot? */
    async isBotDeveloper(user:discord.User|string): Promise<boolean> {
        const userId = user instanceof discord.User ? user.id : user
        return (await this.client.fetchBotDevelopers()).some((u) => u.id === userId)
    }
    /**Is this user the owner of the main server? */
    async isMainServerOwner(user:discord.User|string): Promise<boolean> {
        const userId = user instanceof discord.User ? user.id : user
        return ((await this.client.fetchMainServerOwner()).id === userId)
    }

    get<PermissionId extends keyof ODNoGeneric<IdList>>(id:PermissionId): IdList[PermissionId]
    get(id:ODValidId): ODPermission|null
    
    get(id:ODValidId): ODPermission|null {
        return super.get(id)
    }

    remove<PermissionId extends keyof ODNoGeneric<IdList>>(id:PermissionId): IdList[PermissionId]
    remove(id:ODValidId): ODPermission|null
    
    remove(id:ODValidId): ODPermission|null {
        return super.remove(id)
    }

    exists(id:keyof ODNoGeneric<IdList>): boolean
    exists(id:ODValidId): boolean
    
    exists(id:ODValidId): boolean {
        return super.exists(id)
    }
}