///////////////////////////////////////
//COMPONENTS MODULE
///////////////////////////////////////
import { ODId, ODValidId, ODSystemError, ODManagerData, ODNoGeneric, ODManager } from "./base.js"
import * as discord from "discord.js"
import { ODWorkerManager, ODWorkerCallback, ODWorker } from "./worker.js"
import { ODDebugger } from "./console.js"

/**## ODComponentFactoryInstance `class`
 * An Open Discord component factory instance.
 * 
 * It will contain the final root component which is returned by an `ODComponentFactory`.  
 * This component can be used in another `ODComponentFactory` or rendered to a message/modal.
 */
export class ODComponentFactoryInstance<Component extends ODComponent<object,any>> {
    /**The root component of this factory. */
    #rootComponent: Component|null = null
    
    /**The root component of this factory. */
    getComponent(){
        return this.#rootComponent
    }
    /**Set the root component of this factory. */
    setComponent(c:Component|null){
        this.#rootComponent = c
    }
}

/**## ODComponentFactory `class`
 * An Open Discord component factory.
 * 
 * It is a collection of functions/workers/hooks which will build a Discord message/modal component from scratch.  
 * Plugins can intercept and modify these workers to replace default behaviour or layout.
 */
export class ODComponentFactory<Component extends ODComponent<object,any>,Origin extends string,Params,WorkerIds extends string = string> extends ODManagerData {
    /**A collection of all workers for this component factory.  */
    workers: ODWorkerManager<ODComponentFactoryInstance<Component>,Origin,Params,WorkerIds>

    constructor(id:ODValidId, callback?:ODWorkerCallback<ODComponentFactoryInstance<Component>,Origin,Params>, priority?:number, callbackId?:ODValidId){
        super(id)
        this.workers = new ODWorkerManager("ascending")
        if (callback) this.workers.add(new ODWorker(callbackId ? callbackId : id,priority ?? 0,callback))
    }
    /**Run all workers and return the resulting component. */
    async build(origin:Origin, params:Params): Promise<ODComponentInferBuildResult<Component>> {
        const instance = new ODComponentFactoryInstance<Component>()
        await this.workers.executeWorkers(instance,origin,params)
        const rootComponent = instance.getComponent()
        if (!rootComponent) throw new ODSystemError("ODComponentFactory.build() --> Failed to build component! (id: "+this.id.value+")")
        return rootComponent.build()
    }
}

/**## ODComponentManagerIdConstraint `type`
 * The constraint/layout for id mappings/interfaces of the `ODComponentManager` class.
 */
export type ODComponentManagerIdConstraint = Record<string,{origin:string,params:object,workers:string}>

/**## ODBaseComponentManager `class`
 * A generic Open Discord component manager.
 * 
 * It contains a collection of all Open Discord component factories. You can:
 * - Add your own message/modal component factories
 * - Modify existing message/modal component factories
 * 
 * Messages created using this system are not compatible with `ODBuilder` messages!
 */
export class ODBaseComponentManager<IdList extends ODComponentManagerIdConstraint = ODComponentManagerIdConstraint,Component extends ODComponent<object,any> = ODComponent<object,any>> extends ODManager<ODComponentFactory<Component,string,{},string>> {
    get<FactoryId extends keyof ODNoGeneric<IdList>>(id:FactoryId): ODComponentFactory<Component,IdList[FactoryId]["origin"],IdList[FactoryId]["params"],IdList[FactoryId]["workers"]>
    get(id:ODValidId): ODComponentFactory<Component,string,{},string>|null
    
    get(id:ODValidId): ODComponentFactory<Component,string,{},string>|null {
        return super.get(id)
    }

    remove<FactoryId extends keyof ODNoGeneric<IdList>>(id:FactoryId): ODComponentFactory<Component,IdList[FactoryId]["origin"],IdList[FactoryId]["params"],IdList[FactoryId]["workers"]>
    remove(id:ODValidId): ODComponentFactory<Component,string,{},string>|null
    
    remove(id:ODValidId): ODComponentFactory<Component,string,{},string>|null {
        return super.remove(id)
    }

    exists(id:keyof ODNoGeneric<IdList>): boolean
    exists(id:ODValidId): boolean
    
    exists(id:ODValidId): boolean {
        return super.exists(id)
    }
}

/**## ODSharedComponentManager `class
 * A special class with types for shared message/modal `ODComponent`'s.  
 * Create button, dropdown or any other layout component template to use them in messages & modals.
 */
export class ODSharedComponentManager<IdList extends ODComponentManagerIdConstraint = ODComponentManagerIdConstraint> extends ODBaseComponentManager<IdList,ODComponent<object,any>> {
    constructor(debug:ODDebugger){
        super(debug,"shared component")
    }
}

/**## ODMessageComponentManager `class
 * A special class with types for `ODMessageComponent`'s.  
 * Create message templates to use as replies and make use of shared components.
 */
export class ODMessageComponentManager<IdList extends ODComponentManagerIdConstraint = ODComponentManagerIdConstraint> extends ODBaseComponentManager<IdList,ODMessageComponent> {
    constructor(debug:ODDebugger){
        super(debug,"message component")
    }
}

/**## ODModalComponentManager `class
 * A special class with types for `ODModalComponent`'s.  
 * Create modal templates to use as forms and make use of shared components.
 */
export class ODModalComponentManager<IdList extends ODComponentManagerIdConstraint = ODComponentManagerIdConstraint> extends ODBaseComponentManager<IdList,TODO> {
    constructor(debug:ODDebugger){
        super(debug,"modal component")
    }
}

/**## ODComponentManager `class`
 * An Open Discord component manager.
 * 
 * Create message & modal templates, re-use components and design all visual elements of the bot.
 * 
 * Using the Open Discord component system has many advantages compared to vanilla `discord.js`:
 * - Plugins can extend, edit & replace messages & components
 * - Includes automatic error handling
 * - Independent workers/hooks (with priority)
 * - Fail-safe design using try-catch
 * - Automatic switch between components v2 and legacy components depending on message requirements
 * - Get to know the origin of the request (e.g. button, dropdown, modal, ...)
 * - And so much more!
 */
export class ODComponentManager<
    SharedIdList extends ODComponentManagerIdConstraint = ODComponentManagerIdConstraint,
    MessageIdList extends ODComponentManagerIdConstraint = ODComponentManagerIdConstraint,
    ModalIdList extends ODComponentManagerIdConstraint = ODComponentManagerIdConstraint
> {
    /**The manager for all shared components. */
    shared: ODSharedComponentManager<SharedIdList>
    /**The manager for all messages components. */
    messages: ODMessageComponentManager<MessageIdList>
    /**The manager for all modals components. */
    modals: ODModalComponentManager<ModalIdList>

    constructor(debug:ODDebugger){
        this.shared = new ODSharedComponentManager(debug)
        this.messages = new ODMessageComponentManager(debug)
        this.modals = new ODModalComponentManager(debug)
    }
}

///////////////////////////////////////
//   GENERIC COMPONENT DEFINITIONS   //
///////////////////////////////////////

/**## ODComponentBuilderFunc `type`
 * The builder function of a component.
 */
export type ODComponentBuilderFunc<BuildResult> = () => Promise<BuildResult|null>|BuildResult|null

/**## ODComponentInferBuildResult `type`
 * Infer the build result of a certain component.
 */
export type ODComponentInferBuildResult<Component> = Component extends ODComponent<object,infer BuildResult> ? BuildResult : never

/**## ODComponent `class`
 * An Open Discord message/modal component.
 * 
 * This class itself doesn't do anything, but is a blueprint for other   
 * `ODComponent` classes which represent the new Discord message/modal components.
 */
export class ODComponent<Data extends object,BuildResult> {
    /**The id of this message/modal component. */
    id: ODId
    /** */
    /**The data or configuration of this message/modal component. */
    readonly data: Data
    /**Build this component. Returns `null` when invalid. */
    readonly build: ODComponentBuilderFunc<BuildResult>

    constructor(id:ODValidId,data:Data,build:ODComponentBuilderFunc<BuildResult>){
        this.id = new ODId(id)
        this.data = data
        this.build = build
    }
}

/**## ODGroupComponent `class`
 * An Open Discord message/modal component with children.
 * 
 * This class itself doesn't do anything, but is a blueprint for other   
 * `ODGroupComponent` classes which represent the new Discord message/modal components.
 */
export class ODGroupComponent<Data extends object,ChildComponent extends ODComponent<object,any>,BuildResult> extends ODComponent<Data,BuildResult> {
    /**The collection of child components. */
    readonly children: ChildComponent[] = []

    /**Add a new component to this group. There are multiple modes available:
     * - `start`: insert at the start of the list.
     * - `end`: insert at the end of the list.
     * - `before`: insert before an existing component `referenceId` (`start` if `referenceId` is invalid)
     * - `after`: insert after an existing component `referenceId` (`end` if `referenceId` is invalid)
     * - `index`: insert at a certain index `referenceIndex` (`end` if `referenceIndex` is invalid)
     */
    addComponent(c:ChildComponent,mode:"start"|"end"): void
    addComponent(c:ChildComponent,mode:"before"|"after",referenceId:ODValidId): void
    addComponent(c:ChildComponent,mode:"index",referenceIndex:number): void
    addComponent(c:ChildComponent,mode:"start"|"end"|"before"|"after"|"index" = "start",reference?:ODValidId|number){
        if (mode == "start") this.children.unshift(c)
        else if (mode == "end") this.children.push(c)
        else if (mode == "before"){
            if (!reference || !this.children.find((c) => c.id.value === new ODId(reference).value)) this.children.unshift(c)
            else{
                const referenceIndex = this.children.findIndex((c) => c.id.value === new ODId(reference).value)
                this.children.splice(referenceIndex,0,c) //insert at position 'referenceIndex' (before)
            }
        }else if (mode == "after"){
            if (!reference || !this.children.find((c) => c.id.value === new ODId(reference).value)) this.children.push(c)
            else{
                const referenceIndex = this.children.findIndex((c) => c.id.value === new ODId(reference).value)
                this.children.splice(referenceIndex+1,0,c) //insert at position 'referenceIndex+1' (after)
            }
        }else if (mode == "index"){
            if (!reference || typeof reference !== "number") this.children.push(c)
            else{
                this.children.splice(reference,0,c) //insert at position 'reference'
            }
        }
    }
    /**Get a component with a certain ID in this group. Returns `null` if non-existent. */
    getComponent(id:ODValidId){
        const component = this.children.find((c) => c.id.value === new ODId(id).value)
        return component ?? null
    }
    /**Get the position of a component with a certain ID in this group. Returns `-1` if non-existent. */
    getComponentPosition(id:ODValidId){
        return this.children.findIndex((c) => c.id.value === new ODId(id).value)
    }
    /**Returns if a component with a certain ID exists in this group. */
    existsComponent(id:ODValidId){
        const component = this.children.find((c) => c.id.value === new ODId(id).value)
        return component ? true : false
    }
    /**Remove a component with a certain ID from this group. Returns the removed component or `null if non-existent. */
    removeComponent(id:ODValidId){
        const index = this.children.findIndex((c) => c.id.value === new ODId(id).value)
        if (index < 0) return null
        else return this.children.splice(index,1)[0]
    }
    /**Moves an existing component to a new location in this group. There are multiple modes available:
     * - `start`: move to the start of the list.
     * - `end`: move to the end of the list.
     * - `before`: move before an existing component `referenceId` (`start` if `referenceId` is invalid)
     * - `after`: move after an existing component `referenceId` (`end` if `referenceId` is invalid)
     * - `index`: move to a certain index `referenceIndex` (`end` if `referenceIndex` is invalid)
     */
    moveComponent(id:ODValidId,mode:"start"|"end"): void
    moveComponent(id:ODValidId,mode:"before"|"after",referenceId:ODValidId): void
    moveComponent(id:ODValidId,mode:"index",referenceIndex:number): void
    moveComponent(id:ODValidId,mode:"start"|"end"|"before"|"after"|"index" = "start",reference?:ODValidId|number){
        const component = this.removeComponent(id)
        if (component){
            if (mode == "start" || mode == "end") this.addComponent(component,mode)
            if ((mode == "before" || mode == "after") && reference) this.addComponent(component,mode,reference)
            if (mode == "index" && typeof reference == "number") this.addComponent(component,mode,reference)
            return
        }
    }
}

/**## ODParentComponent `class`
 * An Open Discord message/modal component with a single child.
 * 
 * This class itself doesn't do anything, but is a blueprint for other   
 * `ODParentComponent` classes which represent the new Discord message/modal components.
 */
export class ODParentComponent<Data extends object,ChildComponent extends ODComponent<object,any>,BuildResult> extends ODComponent<Data,BuildResult> {
    /**The child component of this parent. */
    #child: ChildComponent|null = null
    
    /**The child component of this parent. */
    get child(){
        return this.#child
    }
    /**Set the child component of this parent. */
    setComponent(c:ChildComponent|null){
        this.#child = c
    }
}

//////////////////////////////////////
//   GLOBAL COMPONENT DEFINITIONS   //
//////////////////////////////////////

/**## ODMessageComponentData `type`
 * The configurable settings/options for the `ODMessageComponent`.
 */
export interface ODMessageComponentData {
    /**Should the message be sent as ephemeral? */
    ephemeral?:boolean,
    /**Suppress/hide embeds. */
    supressEmbeds?:boolean,
    /**Do not send notifications to mentioned users or roles. */
    supressNotifications?:boolean
    /**Additional options that aren't covered by the Open Discord api!*/
    additionalOptions?:Omit<discord.MessageCreateOptions,"poll"|"content"|"embeds"|"components"|"files"|"flags">,
    /**Add additional files which can be used in components as `attachment://...`  */
    additionalAttachments?:discord.AttachmentBuilder[]
}

/**## ODValidMessageComponents `type`
 * A collection of all valid top-level components that can be sent in a message.
 */
export type ODValidMessageComponents = ODTextComponent|ODFileComponent|ODGalleryComponent

/**## ODMessageComponentBuildResult `type`
 * The constructed message from an `ODMessageComponent`.
 */
export interface ODMessageComponentBuildResult {
    /**The message to send. */
    msg:discord.MessageCreateOptions,
    /**Is this message using Components V2? */
    componentsV2:boolean,
    /**Should the message be sent as ephemeral? */
    ephemeral:boolean,
    /**Suppress/hide embeds. */
    supressEmbeds:boolean,
    /**Do not send notifications to mentioned users or roles. */
    supressNotifications:boolean
}

/**## ODMessageComponent `class`
 * A message builder with **components v2** support.
 * Add items to this message using `addComponent()`.
 * 
 * Use `ODSimpleMessageComponent` for components v1, polls, embeds, etc
 */
export class ODMessageComponent extends ODGroupComponent<ODMessageComponentData,ODValidMessageComponents,ODMessageComponentBuildResult> {
    constructor(id:ODValidId,data?:Partial<ODMessageComponentData>){
        const initData: ODMessageComponentData = {...data}
        super(id,initData,async () => {
            if (this.children.length < 1) return null
            
            const attachments: discord.AttachmentBuilder[] = [...(this.data.additionalAttachments ?? [])]
            const components: discord.JSONEncodable<discord.APIMessageTopLevelComponent>[] = []

            for (const component of this.children){
                if (component instanceof ODFileComponent){
                    //ODFileComponent (special)
                    const res = await component.build()
                    if (res) components.push(res.file)
                    if (res?.attachment) attachments.push(res.attachment)

                }else if (component instanceof ODGalleryComponent){
                    //ODGalleryComponent (special)
                    const res = await component.build()
                    if (res) components.push(res.gallery)
                    if (res?.attachments) attachments.push(...res.attachments)
                }else{
                    //general ODComponent's
                    const res = await component.build()
                    if (res) components.push(res)
                }
            }
            
            return {
                msg:{
                    components,
                    ...this.data.additionalOptions
                },
                componentsV2:true,
                ephemeral:this.data.ephemeral ?? false,
                supressEmbeds:this.data.supressEmbeds ?? false,
                supressNotifications:this.data.supressNotifications ?? false
            }
        })
    }

    /**Enable/disable ephemeral mode. */
    setEphemeral(value:boolean){
        this.data.ephemeral = value
    }
    /**Enable supress (hide) embeds mode. */
    setSupressEmbeds(value:boolean){
        this.data.supressEmbeds = value
    }
    /**Enable supress (hide) notifications mode. */
    setSupressNotifications(value:boolean){
        this.data.supressNotifications = value
    }
    /**Add an additional attachment which can be used in components as `attachment://...` */
    addAdditionalAttachments(...attachments:discord.AttachmentBuilder[]){
        if (!this.data.additionalAttachments) this.data.additionalAttachments = []
        this.data.additionalAttachments.push(...attachments)
    }
}


//////////////////////////////////////
//   LAYOUT COMPONENT DEFINITIONS   //
//////////////////////////////////////



///////////////////////////////////////
//   CONTENT COMPONENT DEFINITIONS   //
///////////////////////////////////////

/**## ODTextComponentData `type`
 * The configurable settings/options for the `ODTextComponent`.
 */
export interface ODTextComponentData {
    /**The text to display. */
    content:string
}

/**## ODTextComponent `class`
 * A text component which renders markdown text in a message.
 */
export class ODTextComponent extends ODComponent<ODTextComponentData,discord.TextDisplayBuilder> {
    constructor(id:ODValidId,data:Partial<ODTextComponentData>){
        const initData: ODTextComponentData = {content:"",...data}
        super(id,initData,() => {
            if (this.data.content.length < 1) return null
            return new discord.TextDisplayBuilder({
                content:this.data.content
            })
        })
    }

    /**Set the text to display. */
    setContent(value:string){
        this.data.content = value
    }
}

/**## ODFileComponentData `type`
 * The configurable settings/options for the `ODFileComponent`.
 */
export interface ODFileComponentData {
    /**The name of this file. */
    name:string,
    /**The description of this file. */
    description?:string,
    /**Should this file be marked as a spoiler? */
    spoiler?:boolean,
    /**The binary/text contents of the file. Ignored when `externalUrl` is used. */
    content?:discord.BufferResolvable,
    /**A URL to an external file or image. When specified, the `content` (setContent) will be ignored. */
    externalUrl?:string
}

/**## ODFileComponent `class`
 * A text component which renders markdown text in a message.
 */
export class ODFileComponent extends ODComponent<ODFileComponentData,{file:discord.FileBuilder,attachment:discord.AttachmentBuilder|null}> {
    constructor(id:ODValidId,data:Partial<ODFileComponentData>){
        const initData: ODFileComponentData = {name:"file.txt",...data}
        super(id,initData,() => {
            if (!this.data.content && !this.data.externalUrl) return null

            const attachment = (this.data.content) ? new discord.AttachmentBuilder(this.data.content,{
                name:this.data.name,
                description:this.data.description
            }) : null

            return {
                attachment,
                file:new discord.FileBuilder({
                    file:{
                        url:(this.data.externalUrl ?? "attachment://"+this.data.name)
                    }
                })
            }
        })
    }

    /**Set the filename + extension. */
    setName(value:string){
        this.data.name = value
    }
    /**Set the file description. */
    setDescription(value:string|null){
        this.data.description = value ?? undefined
    }
    /**Set the text/binary contents of the file. */
    setContent(value:discord.BufferResolvable|null){
        this.data.content = value ?? undefined
    }
    /**Set a URL to an external file or image. When used, `setContent()` will be ignored! */
    setExternalUrl(value:string|null){
        this.data.externalUrl = value ?? undefined
    }
    /**Mark the file as spoiler. */
    setSpoiler(value:boolean){
        this.data.spoiler = value
    }
}

/**## ODGalleryComponentData `type`
 * The configurable settings/options for the `ODGalleryComponent`.
 */
export interface ODGalleryComponentData {
    //no additional top-level data
}

/**## ODGalleryComponent `class`
 * A gallery component which renders a grid of media items (images/videos) in a message.
 * Add items to this gallery using `addComponent()`.
 */
export class ODGalleryComponent extends ODGroupComponent<ODGalleryComponentData,ODFileComponent,{gallery:discord.MediaGalleryBuilder,attachments:discord.AttachmentBuilder[]}> {
    constructor(id:ODValidId,data?:Partial<ODGalleryComponentData>){
        const initData: ODGalleryComponentData = {...data}
        super(id,initData,() => {
            if (this.children.length < 1) return null

            const gallery = new discord.MediaGalleryBuilder()
            const attachments: discord.AttachmentBuilder[] = []
            
            for (const file of this.children){
                if (file.data.content) attachments.push(new discord.AttachmentBuilder(file.data.content,{
                    name:file.data.name,
                    description:file.data.description
                }))
                gallery.addItems(new discord.MediaGalleryItemBuilder({
                    description:file.data.description,
                    spoiler:file.data.spoiler,
                    media:{
                        url:(file.data.externalUrl ?? "attachment://"+file.data.name)
                    }
                }))
            }
            
            return {gallery,attachments}
        })
    }
}

/**## ODThumbnailComponentData `type`
 * The configurable settings/options for the `ODThumbnailComponent`.
 */
export interface ODThumbnailComponentData {
    /**The URL of the thumbnail image. Can be an external URL or `attachment://filename.ext`. */
    url:string,
    /**The alt text/description of the thumbnail image. */
    description?:string,
    /**Should this thumbnail be marked as a spoiler? */
    spoiler?:boolean
}

/**## ODThumbnailComponent `class`
 * A thumbnail component which renders a small image as an accessory inside an `ODSectionComponent`.
 * This component must be used via `ODSectionComponent.setComponent()`
 */
export class ODThumbnailComponent extends ODComponent<ODThumbnailComponentData,discord.ThumbnailBuilder> {
    constructor(id:ODValidId,data:Partial<ODThumbnailComponentData>){
        const initData:ODThumbnailComponentData = {url:"",...data}
        super(id,initData,() => {
            if (this.data.url.length < 1) return null

            return new discord.ThumbnailBuilder({
                media:{ url:this.data.url },
                description:this.data.description,
                spoiler:this.data.spoiler
            })
        })
    }

    /**Set the URL of the thumbnail image. */
    setUrl(value:string){
        this.data.url = value
    }
    /**Set the alt text/description of the thumbnail image. */
    setDescription(value:string|null){
        this.data.description = value ?? undefined
    }
    /**Mark the thumbnail as a spoiler. */
    setSpoiler(value:boolean){
        this.data.spoiler = value
    }
}
///////////////////////////////////////////
//   INTERACTIVE COMPONENT DEFINITIONS   //
///////////////////////////////////////////

