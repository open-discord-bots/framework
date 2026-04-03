///////////////////////////////////////
//POST MODULE
///////////////////////////////////////
import { ODId, ODManager, ODManagerData, ODNoGeneric, ODValidId } from "./base"
import { ODMessageBuildResult, ODMessageBuildSentResult } from "./builder"
import { ODDebugger } from "./console"
import * as discord from "discord.js"

/**## ODPostManagerIdConstraint `type`
 * The constraint/layout for id mappings/interfaces of the `ODPostManager` class.
 */
export type ODPostManagerIdConstraint = Record<string,ODPost<discord.GuildBasedChannel>|null>

/**## ODPostManager `class`
 * This is an Open Discord post manager.
 * 
 * It manages `ODPosts`'s for you.
 * 
 * You can use this to get the logs channel of the bot (or some other static channel/category).
 */
export class ODPostManager<IdList extends ODPostManagerIdConstraint = ODPostManagerIdConstraint> extends ODManager<ODPost<discord.GuildBasedChannel>> {
    /**A reference to the main server of the bot */
    #guild: discord.Guild|null = null

    constructor(debug:ODDebugger){
        super(debug,"post")
    }

    add(data:ODPost<discord.GuildBasedChannel>, overwrite?:boolean): boolean {
        if (this.#guild) data.useGuild(this.#guild)
        return super.add(data,overwrite)
    }
    /**Initialize the post manager & all posts. */
    async init(guild:discord.Guild){
        this.#guild = guild
        for (const post of this.getAll()){
            post.useGuild(guild)
            await post.init()
        }
    }

    get<PostId extends keyof ODNoGeneric<IdList>>(id:PostId): IdList[PostId]
    get(id:ODValidId): ODPost<discord.GuildBasedChannel>|null
    
    get(id:ODValidId): ODPost<discord.GuildBasedChannel>|null {
        return super.get(id)
    }

    remove<PostId extends keyof ODNoGeneric<IdList>>(id:PostId): IdList[PostId]
    remove(id:ODValidId): ODPost<discord.GuildBasedChannel>|null
    
    remove(id:ODValidId): ODPost<discord.GuildBasedChannel>|null {
        return super.remove(id)
    }

    exists(id:keyof ODNoGeneric<IdList>): boolean
    exists(id:ODValidId): boolean
    
    exists(id:ODValidId): boolean {
        return super.exists(id)
    }
}

/**## ODPost `class`
 * This is an Open Discord post class.
 * 
 * A post is just a shortcut to a static discord channel or category.
 * This can be used to get a specific channel over and over again!
 * 
 * This class also contains utilities for sending messages via the Open Discord builders.
 */
export class ODPost<ChannelType extends discord.GuildBasedChannel> extends ODManagerData {
    /**A reference to the main server of the bot */
    #guild: discord.Guild|null = null
    /**Is this post already initialized? */
    ready: boolean = false
    /**The discord.js channel */
    channel: ChannelType|null = null
    /**The discord channel id */
    channelId: string
    
    constructor(id:ODValidId, channelId:string){
        super(id)
        this.channelId = channelId
    }

    /**Use a specific guild in this class for fetching the channel*/
    useGuild(guild:discord.Guild|null){
        this.#guild = guild
    }
    /**Change the channel id to another channel! */
    setChannelId(id:string){
        this.channelId = id
    }
    /**Initialize the discord.js channel of this post. */
    async init(){
        if (this.ready) return
        if (!this.#guild) return this.channel = null
        try{
            this.channel = await this.#guild.channels.fetch(this.channelId) as ChannelType
        }catch{
            this.channel = null
        }
        this.ready = true
    }
    /**Send a message to this channel using the Open Discord builder system */
    async send(msg:ODMessageBuildResult): Promise<ODMessageBuildSentResult<true>> {
        if (!this.channel || !this.channel.isTextBased()) return {success:false,message:null}
        try{
            const sent = await this.channel.send(msg.message)
            return {success:true,message:sent}
        }catch{
            return {success:false,message:null}
        }
    }
}