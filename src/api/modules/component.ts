///////////////////////////////////////
//COMPONENTS MODULE
///////////////////////////////////////
import { ODId, ODValidId, ODSystemError, ODManagerData, ODNoGeneric, ODManager, ODValidButtonColor, ODInterfaceWithPartialProperty } from "./base.js"
import * as discord from "discord.js"
import { ODWorkerManager, ODWorkerCallback, ODWorker } from "./worker.js"
import { ODDebugger } from "./console.js"
import { ODMessage, ODMessageInstance } from "./builder.js"

/**## ODComponentFactoryInstance `class`
 * An Open Discord component factory instance.
 * 
 * It will contain the final root component which is returned by an `ODComponentFactory`.  
 * This component can be used in another `ODComponentFactory` or rendered to a message/modal.
 */
export class ODComponentFactoryInstance<Component extends ODComponent<object,any>> {
    /**The root component of this factory. */
    private rootComponent: Component|null = null
    
    /**The root component of this factory. */
    getComponent(){
        return this.rootComponent
    }
    /**Set the root component of this factory. */
    setComponent(c:Component|null){
        this.rootComponent = c
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
    /**Duplicate this component factory. Warning: If workers access external variables (outside parameters), the clone will still use those variables. This might result in unexpected behaviour! */
    duplicate(newId?:ODValidId): ODComponentFactory<Component,Origin,Params,WorkerIds> {
        const newMessage = new ODComponentFactory<Component,Origin,Params,WorkerIds>(newId ?? this.id.value)
        for (const worker of this.workers.getAll()){
            newMessage.workers.add(worker.duplicate())
        }
        return newMessage
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


/**## ODComponentModifierManagerIdConstraint `type`
 * The constraint/layout for id mappings/interfaces of the `ODComponentModifierManager` class.
 */
export type ODComponentModifierManagerIdConstraint = Record<string,ODMessageComponentModifier<string,{},string>>

/**## ODComponentModifierManager `class`
 * An Open Discord component modifier manager.
 * 
 * It contains a collection of all `ODMessageComponentModifier`'s. You can:
 * - Patch, modify, expand or update existing messages
 * - It Does not affect the original message (cloned)
 */
export class ODComponentModifierManager<IdList extends ODComponentModifierManagerIdConstraint = ODComponentModifierManagerIdConstraint> extends ODManager<ODMessageComponentModifier<string,{},string>> {
    constructor(debug:ODDebugger){
        super(debug,"component modifier")
    }
    
    get<ModifierId extends keyof ODNoGeneric<IdList>>(id:ModifierId): IdList[ModifierId]
    get(id:ODValidId): ODMessageComponentModifier<string,{},string>|null
    
    get(id:ODValidId): ODMessageComponentModifier<string,{},string>|null {
        return super.get(id)
    }

    remove<ModifierId extends keyof ODNoGeneric<IdList>>(id:ModifierId): IdList[ModifierId]
    remove(id:ODValidId): ODMessageComponentModifier<string,{},string>|null
    
    remove(id:ODValidId): ODMessageComponentModifier<string,{},string>|null {
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
export class ODMessageComponentManager<IdList extends ODComponentManagerIdConstraint = ODComponentManagerIdConstraint> extends ODBaseComponentManager<IdList,ODMessageComponent|ODSimpleMessageComponent> {
    constructor(debug:ODDebugger){
        super(debug,"message component")
    }
}

/**## ODModalComponentManager `class
 * A special class with types for `ODModalComponent`'s.  
 * Create modal templates to use as forms and make use of shared components.
 */
export class ODModalComponentManager<IdList extends ODComponentManagerIdConstraint = ODComponentManagerIdConstraint> extends ODBaseComponentManager<IdList,ODModalComponent> {
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
    ModalIdList extends ODComponentManagerIdConstraint = ODComponentManagerIdConstraint,
    ModifierIdList extends ODComponentModifierManagerIdConstraint = ODComponentModifierManagerIdConstraint
> {
    /**The manager for all shared components. */
    shared: ODSharedComponentManager<SharedIdList>
    /**The manager for all messages components. */
    messages: ODMessageComponentManager<MessageIdList>
    /**The manager for all modals components. */
    modals: ODModalComponentManager<ModalIdList>
    /**The collection of all component modifiers. */
    modifiers: ODComponentModifierManager<ModifierIdList>

    constructor(debug:ODDebugger){
        this.shared = new ODSharedComponentManager(debug)
        this.messages = new ODMessageComponentManager(debug)
        this.modals = new ODModalComponentManager(debug)
        this.modifiers = new ODComponentModifierManager(debug)
    }
}

///////////////////////////////////////
//   GENERIC COMPONENT DEFINITIONS   //
///////////////////////////////////////

/**## ODComponentInferBuildResult `type`
 * Infer the build result of a certain component.
 */
export type ODComponentInferBuildResult<Component> = Component extends ODComponent<object,infer BuildResult> ? BuildResult : never

/**## ODComponentType `type`
 * The type of an `ODComponent`.
 */
export type ODComponentType = "message"|"simple-message"|"modal"|"action-row"|"container"|"section"|"label"|"separator"|"text"|"file"|"gallery"|"thumbnail"|"simple-content"|"simple-embed"|"simple-poll"|"button"|"short-input"|"paragraph-input"|"dropdown"|"radio-group"|"checkbox-group"|"checkbox"|"file-upload"

/**## ODComponentType `type`
 * Get the `ODComponent` class for a specific `ODComponentType`.
 */
export interface ODComponentForType {
    "message":ODMessageComponent,
    "simple-message":ODSimpleMessageComponent,
    "modal":ODModalComponent,
    "action-row":ODActionRowComponent,
    "container":ODContainerComponent,
    "section":ODSectionComponent,
    "label":ODLabelComponent,
    "separator":ODSeparatorComponent,
    "text":ODTextComponent,
    "file":ODFileComponent,
    "gallery":ODGalleryComponent,
    "thumbnail":ODThumbnailComponent,
    "simple-content":ODContentComponent,
    "simple-embed":ODEmbedComponent,
    "simple-poll":ODPollComponent,
    "button":ODButtonComponent,
    "short-input":ODShortInputComponent,
    "paragraph-input":ODParagraphInputComponent,
    "dropdown":ODDropdownComponent,
    "radio-group":ODRadioGroupComponent,
    "checkbox-group":ODCheckboxGroupComponent,
    "checkbox":ODCheckboxComponent,
    "file-upload":ODFileUploadComponent,
}

/**## ODComponent `class`
 * An Open Discord message/modal component.
 * 
 * This class itself doesn't do anything, but is a blueprint for other   
 * `ODComponent` classes which represent the new Discord message/modal components.
 */
export abstract class ODComponent<Data extends object,BuildResult,Type extends ODComponentType = ODComponentType> {
    /**The id of this message/modal component. */
    id: ODId
    /**The data or configuration of this message/modal component. */
    readonly data: Data
    /**The type of this component. */
    readonly type: Type

    constructor(id:ODValidId,type:Type,data:Data){
        this.id = new ODId(id)
        this.data = data
        this.type = type
    }

    /**Build this component. Returns `null` when invalid. */
    abstract build(): Promise<BuildResult|null>|BuildResult|null
}

/**## ODGroupComponent `class`
 * An Open Discord message/modal component with children.
 * 
 * This class itself doesn't do anything, but is a blueprint for other   
 * `ODGroupComponent` classes which represent the new Discord message/modal components.
 */
export abstract class ODGroupComponent<Data extends object,ChildComponent extends ODComponent<object,any>,BuildResult> extends ODComponent<Data,BuildResult> {
    /**The collection of child components. */
    children: ChildComponent[] = []

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
    /**Get a component with a certain ID in this group. Returns `null` if non-existent. Also able to search for components recursively. */
    getComponent(id:ODValidId): ChildComponent|null
    getComponent(id:ODValidId,recursive:true,recursiveLimit?:number): ODComponent<any,any,ODComponentType>|null
    getComponent(id:ODValidId,recursive?:boolean,recursiveLimit:number=15){
        const component = this.children.find((c) => c.id.value === new ODId(id).value)
        if (component) return component
        else if (recursive && (recursiveLimit > 0)){
            for (const child of this.children){
                if (child instanceof ODGroupComponent){
                    const finalComponent = child.getComponent(id,recursive,recursiveLimit-1) as ODComponent<any,any,ODComponentType>
                    if (finalComponent) return finalComponent
                }else if (child instanceof ODParentComponent){
                    const finalComponent = child.child as ODComponent<any,any,ODComponentType>
                    if (finalComponent.id.value === new ODId(id).value) return finalComponent
                }
            }
            return null
        }else return null
    }
    /**Get all components of a certain type in this group. Also able to search for components recursively. */
    getComponentsOfType<Type extends ODComponentType>(type:Type): ODComponentForType[Type][]
    getComponentsOfType<Type extends ODComponentType>(type:Type,recursive:true,recursiveLimit?:number): ODComponentForType[Type][]
    getComponentsOfType(type:ODComponentType,recursive?:boolean,recursiveLimit:number=15){
        if (recursive && (recursiveLimit > 0)){
            const finalComponents: ODComponent<any,any,ODComponentType>[] = [...this.children.filter((c) => c.type === type)]

            for (const child of this.children){
                if (child instanceof ODGroupComponent){
                    finalComponents.push(...(child.getComponentsOfType(type,recursive,recursiveLimit-1) as ODComponent<any,any,ODComponentType>[]))
                    
                }else if (child instanceof ODParentComponent){
                    const finalComponent = child.child as ODComponent<any,any,ODComponentType>
                    if (finalComponent.type === type) finalComponents.push(finalComponent)
                }
            }
            return finalComponents
        }else{
            const finalComponents: ChildComponent[] = [...this.children.filter((c) => c.type === type)]
            return finalComponents
        }
    }
    /**Get the position of a component with a certain ID in this group. Returns `-1` if non-existent. */
    getComponentPosition(id:ODValidId){
        return this.children.findIndex((c) => c.id.value === new ODId(id).value)
    }
    /**List all child components of this group. */
    listComponent(){
        return this.children
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
    /**Remove all child components from this group. Returns the removed components. */
    clearComponents(){
        const removedChildren = this.children
        this.children = []
        return removedChildren
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
export abstract class ODParentComponent<Data extends object,ChildComponent extends ODComponent<object,any>,BuildResult> extends ODComponent<Data,BuildResult> {
    /**The child component of this parent. */
    private rawChild: ChildComponent|null = null
    
    /**The child component of this parent. */
    get child(){
        return this.rawChild
    }
    /**Set the child component of this parent. */
    setComponent(c:ChildComponent|null){
        this.rawChild = c
    }
}

/////////////////////////////
//   COMPONENT MODIFIERS   //
/////////////////////////////

/**## ODMessageComponentModifier `class`
 * This is an Open Discord message component modifier.
 * 
 * It contains a worker which is can be added to a message.
 * 
 * The original message is preserved and a duplicate of `ODMessage` or `ODComponentFactory` is returned.
 * 
 * Warning: If workers access external variables (outside parameters), the clone will still use those variables. This might result in unexpected behaviour!
 */
export class ODMessageComponentModifier<Origin extends string,Params,WorkerIds extends string> extends ODManagerData {
    /**The workers which will modify the message. */
    workers: ODWorkerManager<ODMessageInstance|ODComponentFactoryInstance<ODMessageComponent>,Origin,Params,WorkerIds>

    constructor(id:ODValidId,callback?:ODWorkerCallback<ODMessageInstance|ODComponentFactoryInstance<ODMessageComponent>,Origin,Params>, priority?:number, callbackId?:ODValidId){
        super(id)
        this.workers = new ODWorkerManager("ascending")
        if (callback) this.workers.add(new ODWorker(callbackId ? callbackId : id,priority ?? 0,callback))
    }

    /**Modify an `ODMessage` or `ODComponentFactory` with these workers. A copy will be returned and the original is preserved. */
    modify<Message extends ODMessage<any,any,any>|ODComponentFactory<ODMessageComponent,any,any,any>>(message:Message,origin:Origin,params:Params): Message {
        const newMsg = message.duplicate(message.id.value+"-VERIFYBAR") as Message
        newMsg.workers.add(new ODWorker<any,any,any>("opendiscord:VERIFYBAR",1000,async (msgInstance,msgParams,msgOrigin,msgCancel) => {
            await this.workers.executeWorkers(msgInstance,origin,params)
        }))
        return newMsg
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
    additionalOptions?:Omit<discord.MessageCreateOptions,"poll"|"content"|"embeds"|"components"|"files"|"flags"|"stickers">,
    /**Add additional files which can be used in components as `attachment://...`  */
    additionalAttachments?:discord.AttachmentBuilder[]
}

/**## ODValidMessageComponents `type`
 * A collection of all valid top-level components that can be sent in a message.
 */
export type ODValidMessageComponents = ODTextComponent|ODFileComponent|ODGalleryComponent|ODActionRowComponent|ODContainerComponent|ODSectionComponent|ODSeparatorComponent

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
    supressNotifications:boolean,
    /**The id of the `ODMessageComponent` this message was built with. */
    id:ODId
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
        super(id,"message",initData)
    }

    async build(){
        if (this.children.length < 1) throw new ODSystemError("ODMessageComponent:build('"+this.id.value+"') => Requires at least one child component.")
        
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
            }else if (component instanceof ODContainerComponent){
                //ODContainerComponent (special)
                const res = await component.build()
                if (res) components.push(res.container)
                if (res?.attachments) attachments.push(...res.attachments)
            }else{
                //general ODComponent's
                const res = await component.build()
                if (res) components.push(res)
            }
        }
        
        return {
            id:new ODId(this.id),
            msg:{
                components,
                files:attachments,
                ...this.data.additionalOptions
            },
            componentsV2:true,
            ephemeral:this.data.ephemeral ?? false,
            supressEmbeds:this.data.supressEmbeds ?? false,
            supressNotifications:this.data.supressNotifications ?? false
        }
    
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


/**## ODSimpleMessageComponentData `type`
 * The configurable settings/options for the `ODSimpleMessageComponent`.
 */
export interface ODSimpleMessageComponentData {
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

/**## ODValidSimpleMessageComponents `type`
 * A collection of all valid top-level components that can be sent in a simple message (components v1).
 */
export type ODValidSimpleMessageComponents = ODContentComponent|ODEmbedComponent|ODFileComponent|ODPollComponent

/**## ODSimpleMessageComponent `class`
 * A message builder with **components v1** support.
 * Add items to this message using `addComponent()`.
 * 
 * Use `ODMessageComponent` for components v2, components, containers, etc
 */
export class ODSimpleMessageComponent extends ODGroupComponent<ODSimpleMessageComponentData,ODValidSimpleMessageComponents,ODMessageComponentBuildResult> {
    constructor(id:ODValidId,data?:Partial<ODMessageComponentData>){
        const initData: ODMessageComponentData = {...data}
        super(id,"simple-message",initData)
    }

    async build(){
        if (this.children.length < 1) throw new ODSystemError("ODMessageComponent:build('"+this.id.value+"') => Requires at least one child component.")
        
        const attachments: discord.AttachmentBuilder[] = [...(this.data.additionalAttachments ?? [])]
        const embeds: discord.EmbedBuilder[] = []
        let content: string|undefined = undefined
        let poll: discord.PollData|undefined = undefined

        for (const component of this.children){
            if (component instanceof ODFileComponent){
                //ODFileComponent (special)
                const res = await component.build()
                if (res?.attachment) attachments.push(res.attachment)

            }else if (component instanceof ODContentComponent){
                //ODContentComponent (special)
                const res = await component.build()
                if (res) content = res.content
                
            }else if (component instanceof ODEmbedComponent){
                //ODEmbedComponent (special)
                const res = await component.build()
                if (res) embeds.push(res)
                
            }else{
                //ODPollComponent (special)
                const res = await component.build()
                if (res) poll = res
            }
        }
        
        return {
            id:new ODId(this.id),
            msg:{
                content,
                embeds,
                poll,
                files:attachments,
                ...this.data.additionalOptions
            },
            componentsV2:false,
            ephemeral:this.data.ephemeral ?? false,
            supressEmbeds:this.data.supressEmbeds ?? false,
            supressNotifications:this.data.supressNotifications ?? false
        }
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


/**## ODModalComponentData `type`
 * The configurable settings/options for the `ODModalComponent`.
 */
export interface ODModalComponentData {
    /**The title of the modal (max 45 characters). */
    title:string,
    /**The custom id of this modal. */
    customId?:string
}

/**## ODValidModalComponents `type`
 * A collection of all valid top-level components that can be sent in a message.
 */
export type ODValidModalComponents = ODLabelComponent|ODTextComponent

/**## ODModalComponent `class`
 * A modal builder with **components v2** support.
 * Add questions, select menu's & labels to this modal using `addComponent()`.
 */
export class ODModalComponent extends ODGroupComponent<ODModalComponentData,ODValidModalComponents,discord.ModalBuilder> {
    constructor(id:ODValidId,data?:Partial<ODModalComponentData>){
        const initData: ODModalComponentData = {title:"<empty>",...data}
        super(id,"modal",initData)
    }

    async build(){
        if (this.children.length < 1) throw new ODSystemError("ODModalComponent:build('"+this.id.value+"') => Requires at least one child component.")
        if (this.children.length > 5) throw new ODSystemError("ODModalComponent:build('"+this.id.value+"') => A modal doesn't support more than 5 components.")
        
        const components: (discord.APITextDisplayComponent|discord.APILabelComponent)[] = []

        for (const component of this.children){
            if (component instanceof ODLabelComponent){
                //ODLabelComponent (special)
                const res = await component.build()
                if (res) components.push(res.toJSON())

            }else{
                //ODTextComponent (special)
                const res = await component.build()
                if (res) components.push(res.toJSON())
            }
        }
        
        return new discord.ModalBuilder({
            components,
            title:this.data.title,
            customId:this.data.customId
        })
    }

    /**Set the title of the modal. */
    setTitle(title:string){
        this.data.title = title
    }
    /**Set the custom id of this modal. */
    setCustomId(id:string|null){
        this.data.customId = id ?? undefined
        return this
    }
}


//////////////////////////////////////
//   LAYOUT COMPONENT DEFINITIONS   //
//////////////////////////////////////

/**## ODActionRowComponentData `type`
 * The configurable settings/options for the `ODActionRowComponent`.
 */
export interface ODActionRowComponentData {
    //no additional top-level data
}

/**## ODValidActionRowComponents `type`
 * A collection of all valid action row components.
 */
export type ODValidActionRowComponents = ODButtonComponent|ODDropdownComponent

/**## ODActionRowComponent `class`
 * An actionrow component which is a container for buttons, a select menu or inputs in a message or modal.
 */
export class ODActionRowComponent extends ODGroupComponent<ODActionRowComponentData,ODValidActionRowComponents,discord.ActionRowBuilder<discord.MessageActionRowComponentBuilder>> {
    constructor(id:ODValidId,data?:Partial<ODActionRowComponentData>){
        const initData: ODActionRowComponentData = {...data}
        super(id,"action-row",initData)
    }

    async build(){
        if (this.children.length < 1) throw new ODSystemError("ODActionRowComponent:build('"+this.id.value+"') => Requires at least one child component.")
        if (this.children.length > 5) throw new ODSystemError("ODActionRowComponent:build('"+this.id.value+"') => An action row doesn't support more than 5 components.")
        
        const components: discord.JSONEncodable<discord.APIComponentInMessageActionRow>[] = []

        for (const component of this.children){
            //actionrow ODComponent's
            const res = await component.build()
            if (res) components.push(res)
        }
        
        return new discord.ActionRowBuilder<discord.MessageActionRowComponentBuilder>({components})
    }
}

/**## ODContainerComponentData `type`
 * The configurable settings/options for the `ODContainerComponent`.
 */
export interface ODContainerComponentData {
    /**The color of this container. */
    color?:discord.ColorResolvable,
    /**Mark the contents of this container as spoiler. */
    spoiler:boolean
}

/**## ODValidContainerComponents `type`
 * A collection of all valid container components.
 */
export type ODValidContainerComponents = ODActionRowComponent|ODTextComponent|ODSectionComponent|ODGalleryComponent|ODSeparatorComponent|ODFileComponent

/**## ODContainerComponent `class`
 * An embed-like container for text, titles, buttons, sections, separators and other components.
 */
export class ODContainerComponent extends ODGroupComponent<ODContainerComponentData,ODValidContainerComponents,{container:discord.ContainerBuilder,attachments:discord.AttachmentBuilder[]}> {
    constructor(id:ODValidId,data?:Partial<ODContainerComponentData>){
        const initData: ODContainerComponentData = {spoiler:false,...data}
        super(id,"container",initData)
    }

    async build(){
        if (this.children.length < 1) throw new ODSystemError("ODContainerComponent:build('"+this.id.value+"') => Requires at least one child component.")
        
        const components: discord.APIComponentInContainer[] = []
        const attachments: discord.AttachmentBuilder[] = []

        for (const component of this.children){
            if (component instanceof ODFileComponent){
                //ODFileComponent (special)
                const res = await component.build()
                if (res) components.push(res.file.toJSON())
                if (res?.attachment) attachments.push(res.attachment)

            }else if (component instanceof ODGalleryComponent){
                //ODGalleryComponent (special)
                const res = await component.build()
                if (res) components.push(res.gallery.toJSON())
                if (res?.attachments) attachments.push(...res.attachments)
            }else{
                //general ODComponent's
                const res = await component.build()
                if (res) components.push(res.toJSON())
            }
        }
        
        return {
            container:new discord.ContainerBuilder({
                components,
                accent_color:this.data.color ? discord.resolveColor(this.data.color) : undefined,
                spoiler:this.data.spoiler
            }),
            attachments
        }
    }

    /**Set the accent color of this embed-like container. */
    setColor(color:discord.ColorResolvable|null){
        this.data.color = color ?? undefined
    }
    /**Mark the contents of this container as spoiler. */
    setSpoiler(spoiler:boolean){
        this.data.spoiler = spoiler
    }
}


/**## ODSectionComponentData `type`
 * The configurable settings/options for the `ODSectionComponent`.
 */
export interface ODSectionComponentData {
    /**The accessory component shown on the right side of the section. */
    accessory?:ODButtonComponent|ODThumbnailComponent
}

/**## ODSectionComponent `class`
 * A layout component that allows you to contextually associate content with an accessory component.
 * - Components: Left
 * - Accessory: Right
 */
export class ODSectionComponent extends ODGroupComponent<ODSectionComponentData,ODTextComponent,discord.SectionBuilder> {
    constructor(id:ODValidId,data?:Partial<ODSectionComponentData>){
        const initData: ODSectionComponentData = {...data}
        super(id,"section",initData)
    }

    async build(){
        if (this.children.length < 1) throw new ODSystemError("ODSectionComponent:build('"+this.id.value+"') => Requires at least one child component.")
        if (this.children.length > 3) throw new ODSystemError("ODSectionComponent:build('"+this.id.value+"') => A maximum of 3 child components are allowed in a section.")
        
        const components: discord.APITextDisplayComponent[] = []

        for (const component of this.children){
            //section ODComponent's
            const res = await component.build()
            if (res) components.push(res.toJSON())
            
        }

        let accessory: discord.APISectionAccessoryComponent|undefined = undefined
        if (this.data.accessory){
            const accessoryRes = await this.data.accessory.build()
            if (accessoryRes) accessory = accessoryRes.toJSON()
        }
        
        return new discord.SectionBuilder({components,accessory})
    }

    /**Set the accessory component shown on the right side of the section. */
    setAccessory(accessory:ODButtonComponent|ODThumbnailComponent|null){
        this.data.accessory = accessory ?? undefined
    }
}

/**## ODLabelComponentData `type`
 * The configurable settings/options for the `ODLabelComponent`.
 */
export interface ODLabelComponentData {
    /**The title for the child component in the modal. */
    title:string,
    /**An option description for the child component in the modal. */
    description?:string
}

/**## ODValidLabelComponents `type`
 * A collection of all valid label components.
 */
export type ODValidLabelComponents = ODShortInputComponent|ODParagraphInputComponent|ODDropdownComponent|ODRadioGroupComponent|ODCheckboxGroupComponent|ODCheckboxComponent|ODFileUploadComponent

/**## ODLabelComponent `class`
 * A visual separator between components. The visibility and padding of this separator can be changed.
 */
export class ODLabelComponent extends ODParentComponent<ODLabelComponentData,ODValidLabelComponents,discord.LabelBuilder> {
    constructor(id:ODValidId,data:Partial<ODLabelComponentData>){
        const initData: ODLabelComponentData = {title:"<empty>",...data}
        super(id,"label",initData)
    }
    
    async build(){
        let component: discord.APIComponentInLabel|undefined = undefined
        if (this.child){
            const accessoryRes = await this.child.build()
            if (accessoryRes) component = accessoryRes.toJSON()
        }

        return new discord.LabelBuilder({
            label:this.data.title,
            description:this.data.description,
            component
        })
    }

    /**Set the title of the child component in the modal. */
    setTitle(title:string){
        this.data.title = title
    }
    /**Set the description of the child component in the modal. */
    setDescription(description:string|null){
        this.data.description = description ?? undefined
    }
}


/**## ODSeparatorComponentData `type`
 * The configurable settings/options for the `ODSeparatorComponent`.
 */
export interface ODSeparatorComponentData {
    /**Whether a visual divider should be displayed in the component. (Default: `true`) */
    divider:boolean,
    /**Size of separator padding (Default: `small`) */
    spacing:"small"|"large"
}

/**## ODSeparatorComponent `class`
 * A visual separator between components. The visibility and padding of this separator can be changed.
 */
export class ODSeparatorComponent extends ODComponent<ODSeparatorComponentData,discord.SeparatorBuilder> {
    constructor(id:ODValidId,data:Partial<ODSeparatorComponentData>){
        const initData: ODSeparatorComponentData = {divider:true,spacing:"small",...data}
        super(id,"separator",initData)
    }
    
    async build(){
        return new discord.SeparatorBuilder({
            divider:this.data.divider,
            spacing:(this.data.spacing == "small") ? discord.SeparatorSpacingSize.Small : discord.SeparatorSpacingSize.Large
        })
    }

    /**Set whether a visual divider should be displayed in the component. (Default: `true`). */
    setDivider(divider:boolean){
        this.data.divider = divider
    }
    /**Set the size of separator padding (Default `small`). */
    setSpacing(spacing:"small"|"large"){
        this.data.spacing = spacing
    }
}

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
        super(id,"text",initData)
    }
    
    async build(){
        if (this.data.content.length < 1) throw new ODSystemError("ODTextComponent:build('"+this.id.value+"') => Unable to display text component without contents.")
        return new discord.TextDisplayBuilder({
            content:this.data.content
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
 * A file component which adds a file in a message.
 */
export class ODFileComponent extends ODComponent<ODFileComponentData,{file:discord.FileBuilder,attachment:discord.AttachmentBuilder|null}> {
    constructor(id:ODValidId,data:Partial<ODFileComponentData>){
        const initData: ODFileComponentData = {name:"file.txt",...data}
        super(id,"file",initData)
    }
    
    async build(){
        if (!this.data.content && !this.data.externalUrl) throw new ODSystemError("ODFileComponent:build('"+this.id.value+"') => Unable to display file component without binary or url.")

        const attachment = (this.data.content) ? new discord.AttachmentBuilder(this.data.content,{
            name:this.data.name,
            description:this.data.description
        }) : null

        return {
            attachment,
            file:new discord.FileBuilder({
                file:{
                    url:(this.data.externalUrl ?? "attachment://"+this.data.name)
                },
                spoiler:this.data.spoiler
            })
        }
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
        super(id,"gallery",initData)
    }
    
    async build(){
        if (this.children.length < 1) throw new ODSystemError("ODGalleryComponent:build('"+this.id.value+"') => Requires at least one child component.")

        const gallery = new discord.MediaGalleryBuilder()
        const attachments: discord.AttachmentBuilder[] = []
        
        for (const file of this.children){
            if (!file.data.content && !file.data.externalUrl) continue
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
        const initData: ODThumbnailComponentData = {url:"",...data}
        super(id,"thumbnail",initData)
    }
    
    async build(){
        if (this.data.url.length < 1) throw new ODSystemError("ODThumbnailComponent:build('"+this.id.value+"') => Thumbnail component requires an image URL.")

        return new discord.ThumbnailBuilder({
            media:{ url:this.data.url },
            description:this.data.description,
            spoiler:this.data.spoiler
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

/**## ODContentComponentData `type`
 * The configurable settings/options for the `ODContentComponent`.
 */
export interface ODContentComponentData {
    /**The text to display. */
    content:string
}

/**## ODContentComponent `class`
 * A text component which renders markdown text in a message without `Components V2` enabled. (Old behaviour)
 */
export class ODContentComponent extends ODComponent<ODContentComponentData,{content:string}> {
    constructor(id:ODValidId,data:Partial<ODContentComponentData>){
        const initData: ODContentComponentData = {content:"",...data}
        super(id,"simple-content",initData)
    }
    
    async build(){
        if (this.data.content.length < 1) throw new ODSystemError("ODContentComponent:build('"+this.id.value+"') => Unable to display content component without contents.")
        return {
            content:this.data.content
        }
    }

    /**Set the text to display. */
    setContent(value:string){
        this.data.content = value
    }
}


/**## ODEmbedComponentData `type`
 * The configurable settings/options for the `ODEmbedComponent`.
 */
export interface ODEmbedComponentData {
    /**The title of the embed. */
    title?:string,
    /**The color of the embed. */
    color?:discord.ColorResolvable,
    /**The url of the embed. */
    url?:string,
    /**The description of the embed. */
    description?:string,
    /**The author text of the embed. */
    authorText?:string,
    /**The author image of the embed. */
    authorImage?:string,
    /**The author url of the embed. */
    authorUrl?:string,
    /**The footer text of the embed. */
    footerText?:string,
    /**The footer image of the embed. */
    footerImage?:string,
    /**The image of the embed. */
    image?:string,
    /**The thumbnail of the embed. */
    thumbnail?:string,
    /**The fields of the embed. */
    fields?:ODInterfaceWithPartialProperty<discord.EmbedField,"inline">[],
    /**The timestamp of the embed. */
    timestamp?:number|Date
}

/**## ODEmbedComponent `class`
 * An embed component which renders an embed in a message without `Components V2` enabled. (Old behaviour)
 */
export class ODEmbedComponent extends ODComponent<ODEmbedComponentData,discord.EmbedBuilder> {
    constructor(id:ODValidId,data:Partial<ODEmbedComponentData>){
        const initData: ODEmbedComponentData = {...data}
        super(id,"simple-embed",initData)
    }
    
    async build(){
        if (this.data.title && this.data.title.length > 256) throw new ODSystemError("ODEmbedComponent:build('"+this.id.value+"') => An embed title can't exceed 256 characters.")
        if (this.data.description && this.data.description.length > 4096) throw new ODSystemError("ODEmbedComponent:build('"+this.id.value+"') => An embed description can't exceed 4096 characters.")
        if (this.data.fields && this.data.fields.length > 25) throw new ODSystemError("ODEmbedComponent:build('"+this.id.value+"') => An embed can't contain more than 25 fields.")
        if (this.data.footerText && this.data.footerText.length > 2048) throw new ODSystemError("ODEmbedComponent:build('"+this.id.value+"') => An embed footer can't exceed 2048 characters.")
        if (this.data.authorText && this.data.authorText.length > 256) throw new ODSystemError("ODEmbedComponent:build('"+this.id.value+"') => An embed author can't exceed 256 characters.")
        
        return new discord.EmbedBuilder({
            title:this.data.title,
            color:(this.data.color) ? discord.resolveColor(this.data.color) : undefined,
            url:this.data.url,
            description:this.data.description,
            author:(this.data.authorText) ? {
                name:this.data.authorText,
                icon_url:this.data.authorImage,
                url:this.data.authorUrl
            } : undefined,
            footer:(this.data.footerText) ? {
                text:this.data.footerText,
                icon_url:this.data.footerImage
            } : undefined,
            image:(this.data.image) ? {
                url:this.data.image
            } : undefined,
            thumbnail:(this.data.thumbnail) ? {
                url:this.data.thumbnail
            } : undefined,
            fields:this.data.fields,
            timestamp:(this.data.timestamp) ? new Date(this.data.timestamp).toISOString() : undefined
        })
    }

    /**Set the title of this embed */
    setTitle(title:string|null){
        this.data.title = title ?? undefined
        return this
    }
    /**Set the color of this embed */
    setColor(color:discord.ColorResolvable|null){
        this.data.color = color ?? undefined
        return this
    }
    /**Set the url of this embed */
    setUrl(url:string|null){
        this.data.url = url ?? undefined
        return this
    }
    /**Set the description of this embed */
    setDescription(description:string|null){
        this.data.description = description ?? undefined
        return this
    }
    /**Set the author of this embed */
    setAuthor(text:string|null, image?:string|null, url?:string|null){
        this.data.authorText = text ?? undefined
        this.data.authorImage = image ?? undefined
        this.data.authorUrl = url ?? undefined
        return this
    }
    /**Set the footer of this embed */
    setFooter(text:string|null, image?:string|null){
        this.data.footerText = text ?? undefined
        this.data.footerImage = image ?? undefined
        return this
    }
    /**Set the image of this embed */
    setImage(image:string|null){
        this.data.image = image ?? undefined
        return this
    }
    /**Set the thumbnail of this embed */
    setThumbnail(thumbnail:string|null){
        this.data.thumbnail = thumbnail ?? undefined
        return this
    }
    /**Set the fields of this embed */
    setFields(fields:ODInterfaceWithPartialProperty<discord.EmbedField,"inline">[]){
        //Check field properties
        for (const [index,field] of fields.entries()){
            if (field.value.length >= 1024) throw new ODSystemError("ODEmbedComponent:build('"+this.id.value+"') => field "+index+" reached 1024 character limit!")
            if (field.name.length >= 256) throw new ODSystemError("ODEmbedComponent:build('"+this.id.value+"') => field "+index+" reached 256 name character limit!")
        }
        this.data.fields = fields
        return this
    }
    /**Add fields to this embed */
    addFields(...fields:ODInterfaceWithPartialProperty<discord.EmbedField,"inline">[]){
        //Check field properties
        for (const [index,field] of fields.entries()){
            if (field.value.length >= 1024) throw new ODSystemError("ODEmbedComponent:build('"+this.id.value+"') => field "+index+" reached 1024 character limit!")
            if (field.name.length >= 256) throw new ODSystemError("ODEmbedComponent:build('"+this.id.value+"') => field "+index+" reached 256 name character limit!")
        }

        if (!this.data.fields) this.data.fields = []
        this.data.fields.push(...fields)
        return this
    }
    /**Clear all fields from this embed */
    clearFields(){
        this.data.fields = []
        return this
    }
    /**Set the timestamp of this embed. When set to `true`, the current timestamp is used. */
    setTimestamp(timestamp:number|Date|true|null){
        if (timestamp === true) this.data.timestamp = new Date()
        else this.data.timestamp = timestamp ?? undefined
        return this
    }
}

/**## ODPollComponentData `type`
 * The configurable settings/options for the `ODPollComponent`.
 */
export interface ODPollComponentData {
    /**The poll question. */
    question:string,
    /**The duration of the poll in hours. */
    durationHours:number,
    /**Available poll answers. */
    answers:discord.PollAnswerData[],
    /**Allow selecting multiple answers. */
    allowMultiSelect:boolean
}

/**## ODPollComponent `class`
 * A poll component which adds a poll to a message without `Components V2` enabled. (Old behaviour)
 */
export class ODPollComponent extends ODComponent<ODPollComponentData,discord.PollData> {
    constructor(id:ODValidId,data:Partial<ODPollComponentData>){
        const initData: ODPollComponentData = {question:"<empty>",durationHours:1,allowMultiSelect:false,answers:[],...data}
        super(id,"simple-poll",initData)
    }
    
    async build(){
        if (this.data.question.length < 1) throw new ODSystemError("ODPollComponent:build('"+this.id.value+"') => Please provide a valid poll question.")
        if (this.data.answers.length < 1) throw new ODSystemError("ODPollComponent:build('"+this.id.value+"') => Please provide at least one answer to the poll.")
        return {
            layoutType:discord.PollLayoutType.Default,
            allowMultiselect:this.data.allowMultiSelect,
            duration:this.data.durationHours,
            question:{text:this.data.question},
            answers:this.data.answers
        }
    }

    /**Set the poll question. */
    setQuestion(question:string){
        this.data.question = question
    }
    /**Set the poll duration in hours. */
    setDurationHours(duration:number){
        this.data.durationHours = duration
    }
    /**Allow selecting multiple answers. */
    setMultiSelect(multi:boolean){
        this.data.allowMultiSelect = multi
    }
    /**Set the poll answers. */
    setAnswers(answers:discord.PollAnswerData[]){
        this.data.answers = answers
    }
    /**Add additional poll answers. */
    addAnswers(...answers:discord.PollAnswerData[]){
        this.data.answers.push(...answers)
    }
}

///////////////////////////////////////////
//   INTERACTIVE COMPONENT DEFINITIONS   //
///////////////////////////////////////////


/**## ODButtonComponentData `type`
 * The configurable settings/options for the `ODButtonComponent`.
 */
export interface ODButtonComponentData {
    /**The custom id of this button. Ignored when `url` is specified. */
    customId?:string,
    /**The url of this button. Disables interactions & customId */
    url?:string,
    /**The button color. Ignored when `url` is specified. */
    color:ODValidButtonColor,
    /**The button label */
    label?:string,
    /**The button emoji */
    emoji?:string,
    /**Is the button disabled? */
    disabled:boolean
}

/**## ODButtonComponent `class`
 * A button component which renders an interactive button inside the message.
 * A reply can be sent using Open Discord responders.
 */
export class ODButtonComponent extends ODComponent<ODButtonComponentData,discord.ButtonBuilder> {
    constructor(id:ODValidId,data:Partial<ODButtonComponentData>){
        const initData: ODButtonComponentData = {color:"gray",disabled:false,...data}
        super(id,"button",initData)
    }
    
    async build(){
        if (!this.data.emoji && !this.data.label) throw new ODSystemError("ODButtonComponent:build('"+this.id.value+"') => A button must include at least one label or emoji.")
        if (this.data.customId && this.data.customId.length > 100) throw new ODSystemError("ODButtonComponent:build('"+this.id.value+"') => A custom ID '"+this.data.customId+"' must be shorter than 100 characters.")

        return new discord.ButtonBuilder({
            customId:(!this.data.url) ? this.data.customId : undefined,
            label:this.data.label,
            emoji:this.data.emoji ? discord.resolvePartialEmoji(this.data.emoji) : undefined,
            disabled:this.data.disabled,
            url:(this.data.url) ? this.data.url : undefined,
            style:this.getButtonStyle(),
        })
    }

    /**Get the `discord.ButtonStyle` for the specified `ODValidButtonColor` */
    protected getButtonStyle(): discord.ButtonStyle {
        if (this.data.url) return discord.ButtonStyle.Link
        else if (this.data.color == "blue") return discord.ButtonStyle.Primary
        else if (this.data.color == "green") return discord.ButtonStyle.Success
        else if (this.data.color == "red") return discord.ButtonStyle.Danger
        else return discord.ButtonStyle.Secondary
    }

    /**Set the custom id of this button. Ignored when `setUrl()` is used. */
    setCustomId(id:string|null){
        this.data.customId = id ?? undefined
        return this
    }
    /**Set the url of this button. */
    setUrl(url:string|null){
        this.data.url = url ?? undefined
        return this
    }
    /**Set the color of this button. Ignored when `setUrl()` is used. */
    setColor(color:ODValidButtonColor){
        this.data.color = color
        return this
    }
    /**Set the label of this button. */
    setLabel(label:string|null){
        this.data.label = label ?? undefined
        return this
    }
    /**Set the emoji of this button. */
    setEmoji(emoji:string|null){
        this.data.emoji = emoji ?? undefined
        return this
    }
    /**Disable this button. */
    setDisabled(disabled:boolean){
        this.data.disabled = disabled
        return this
    }
}


/**## ODShortInputComponentData `type`
 * The configurable settings/options for the `ODShortInputComponent`.
 */
export interface ODShortInputComponentData {
    /**The custom id of this modal text input. */
    customId?:string
    /**The min length of this modal text input. */
    minLength?:number,
    /**The max length of this modal text input. */
    maxLength?:number,
    /**Is this modal text input required? */
    required:boolean,
    /**The placeholder of this modal text input. */
    placeholder?:string,
    /**The initial value of this modal text input. */
    initialValue?:string
}

/**## ODShortInputComponent `class`
 * A short text input component for modals.
 * It must be placed inside an `ODLabelComponent`.
 */
export class ODShortInputComponent extends ODComponent<ODShortInputComponentData,discord.TextInputBuilder> {
    constructor(id:ODValidId,data:Partial<ODShortInputComponentData>){
        const initData: ODShortInputComponentData = {required:false,...data}
        super(id,"short-input",initData)
    }
    
    async build(){
        return new discord.TextInputBuilder({
            style:discord.TextInputStyle.Short,
            customId:this.data.customId,
            minLength:this.data.minLength,
            maxLength:this.data.maxLength,
            required:this.data.required,
            placeholder:this.data.placeholder,
            value:this.data.initialValue
        })
    }

    /**Set the custom id of this modal text input. */
    setCustomId(id:string|null){
        this.data.customId = id ?? undefined
        return this
    }
    /**Set the minimum amount of characters of this modal text input. */
    setMinLength(length:number|null){
        this.data.minLength = length ?? undefined
        return this
    }
    /**Set the maximum amount of characters of this modal text input. */
    setMaxLength(length:number|null){
        this.data.maxLength = length ?? undefined
        return this
    }
    /**Set the placeholder of this modal text input. */
    setPlaceholder(placeholder:string|null){
        this.data.placeholder = placeholder ?? undefined
        return this
    }
    /**Set the initial value of this modal text input. */
    setInitialValue(initialValue:string|null){
        this.data.initialValue = initialValue ?? undefined
        return this
    }
    /**Mark this modal text input as required. */
    setRequired(required:boolean){
        this.data.required = required
        return this
    }
}

/**## ODParagraphInputComponentData `type`
 * The configurable settings/options for the `ODParagraphInputComponent`.
 */
export interface ODParagraphInputComponentData {
    /**The custom id of this modal text input. */
    customId?:string
    /**The min length of this modal text input. */
    minLength?:number,
    /**The max length of this modal text input. */
    maxLength?:number,
    /**Is this modal text input required? */
    required:boolean,
    /**The placeholder of this modal text input. */
    placeholder?:string,
    /**The initial value of this modal text input. */
    initialValue?:string
}

/**## ODParagraphInputComponent `class`
 * A paragraph text input component for modals.
 * It must be placed inside an `ODLabelComponent`.
 */
export class ODParagraphInputComponent extends ODComponent<ODParagraphInputComponentData,discord.TextInputBuilder> {
    constructor(id:ODValidId,data:Partial<ODParagraphInputComponentData>){
        const initData: ODParagraphInputComponentData = {required:false,...data}
        super(id,"paragraph-input",initData)
    }
    
    async build(){
        return new discord.TextInputBuilder({
            style:discord.TextInputStyle.Paragraph,
            customId:this.data.customId,
            minLength:this.data.minLength,
            maxLength:this.data.maxLength,
            required:this.data.required,
            placeholder:this.data.placeholder,
            value:this.data.initialValue
        })
    }

    /**Set the custom id of this modal text input. */
    setCustomId(id:string|null){
        this.data.customId = id ?? undefined
        return this
    }
    /**Set the minimum amount of characters of this modal text input. */
    setMinLength(length:number|null){
        this.data.minLength = length ?? undefined
        return this
    }
    /**Set the maximum amount of characters of this modal text input. */
    setMaxLength(length:number|null){
        this.data.maxLength = length ?? undefined
        return this
    }
    /**Set the placeholder of this modal text input. */
    setPlaceholder(placeholder:string|null){
        this.data.placeholder = placeholder ?? undefined
        return this
    }
    /**Set the initial value of this modal text input. */
    setInitialValue(initialValue:string|null){
        this.data.initialValue = initialValue ?? undefined
        return this
    }
    /**Mark this modal text input as required. */
    setRequired(required:boolean){
        this.data.required = required
        return this
    }
}


/**## ODDropdownComponentData `type`
 * The configurable settings/options for the `ODDropdownComponent`.
 */
export interface ODDropdownComponentData {
    /**The type of this dropdown. */
    type:"string"|"role"|"channel"|"user"|"mentionable",
    /**The custom id of this dropdown. */
    customId?:string,
    /**The placeholder of this dropdown. */
    placeholder?:string,
    /**The minimum amount of items to be selected in this dropdown. */
    minValues?:number,
    /**The maximum amount of items to be selected in this dropdown. */
    maxValues?:number,
    /**Is this dropdown disabled? */
    disabled?:boolean,

    /**Allowed channel types when the type is "channel" */
    channelTypes?:discord.ChannelType[]
    /**The options when the type is "string" */
    options?:discord.SelectMenuComponentOptionData[],
    /**The options when the type is "user" */
    users?:discord.User[],
    /**The options when the type is "role" */
    roles?:discord.Role[],
    /**The options when the type is "channel" */
    channels?:discord.Channel[],
    /**The options when the type is "mentionable" */
    mentionables?:(discord.User|discord.Role)[],
}

/**## ODDropdownComponent `class`
 * A dropdown component which renders an interactive dropdown inside the message/modal.
 * A reply can be sent using Open Discord responders.
 */
export class ODDropdownComponent extends ODComponent<ODDropdownComponentData,discord.BaseSelectMenuBuilder<discord.APISelectMenuComponent>> {
    constructor(id:ODValidId,data:Partial<ODDropdownComponentData>){
        const initData: ODDropdownComponentData = {type:"string",...data}
        super(id,"dropdown",initData)
    }
    
    async build(){
        const genericOpts = {
            customId:this.data.customId,
            disabled:this.data.disabled,
            placeholder:this.data.placeholder,
            minValues:this.data.minValues,
            maxValues:this.data.maxValues,
        }

        if (this.data.type == "string"){
            if (!this.data.options || this.data.options.length < 1) throw new ODSystemError("ODDropdownComponent:build('"+this.id.value+"') => Please provide at least one string option using setOptions().")
            return new discord.StringSelectMenuBuilder({
                ...genericOpts,
                options:this.data.options
            })
        }else if (this.data.type == "user"){
            if (!this.data.users || this.data.users.length < 1) throw new ODSystemError("ODDropdownComponent:build('"+this.id.value+"') => Please provide at least one user option using setUsers().")
            return new discord.UserSelectMenuBuilder({
                ...genericOpts,
                defaultValues:this.data.users.map((u) => ({id:u.id,type:discord.SelectMenuDefaultValueType.User}))
            })
        }else if (this.data.type == "role"){
            if (!this.data.roles || this.data.roles.length < 1) throw new ODSystemError("ODDropdownComponent:build('"+this.id.value+"') => Please provide at least one role option using setRoles().")
            return new discord.RoleSelectMenuBuilder({
                ...genericOpts,
                defaultValues:this.data.roles.map((r) => ({id:r.id,type:discord.SelectMenuDefaultValueType.Role}))
            })
        }else if (this.data.type == "channel"){
            if (!this.data.channels || this.data.channels.length < 1) throw new ODSystemError("ODDropdownComponent:build('"+this.id.value+"') => Please provide at least one channel option using setChannels().")
            return new discord.ChannelSelectMenuBuilder({
                ...genericOpts,
                channelTypes:this.data.channelTypes,
                defaultValues:this.data.channels.map((c) => ({id:c.id,type:discord.SelectMenuDefaultValueType.Channel}))
            })
        }else if (this.data.type == "mentionable"){
            if (!this.data.mentionables || this.data.mentionables.length < 1) throw new ODSystemError("ODDropdownComponent:build('"+this.id.value+"') => Please provide at least one role/user option using setMentionables().")
            return new discord.MentionableSelectMenuBuilder({
                ...genericOpts,
                defaultValues:this.data.mentionables.map((m) => (m instanceof discord.User ? {id:m.id,type:discord.SelectMenuDefaultValueType.User} : {id:m.id,type:discord.SelectMenuDefaultValueType.Role}))
            })
        }else throw new ODSystemError("ODDropdownComponent:build('"+this.id.value+"') => Please set the dropdown type to one of the following: string, user, role, channel, mentionable.") 
    }

    /**Set the custom id of this dropdown. */
    setCustomId(id:string|null){
        this.data.customId = id ?? undefined
        return this
    }
    /**Set the type of this dropdown. */
    setType(type:"string"|"role"|"channel"|"user"|"mentionable"){
        this.data.type = type
        return this
    }
    /**Set the minimum selection amount of this dropdown. */
    setMinValues(amount:number|null){
        this.data.minValues = amount ?? undefined
        return this
    }
    /**Set the maximum selection amount of this dropdown. */
    setMaxValues(amount:number|null){
        this.data.maxValues = amount ?? undefined
        return this
    }
    /**Set the placeholder of this dropdown. */
    setPlaceholder(placeholder:string|null){
        this.data.placeholder = placeholder ?? undefined
        return this
    }
    /**Disable this dropdown. */
    setDisabled(disabled:boolean){
        this.data.disabled = disabled
        return this
    }
    /**Set the available channel types of this dropdown. */
    setChannelTypes(channelTypes:discord.ChannelType[]){
        this.data.channelTypes = channelTypes
        return this
    }
    /**Set the options of this dropdown (when `type == "string"`) */
    setOptions(options:discord.SelectMenuComponentOptionData[]){
        this.data.options = options
        return this
    }
    /**Set the users of this dropdown (when `type == "user"`) */
    setUsers(users:discord.User[]){
        this.data.users = users
        return this
    }
    /**Set the roles of this dropdown (when `type == "role"`) */
    setRoles(roles:discord.Role[]){
        this.data.roles = roles
        return this
    }
    /**Set the channels of this dropdown (when `type == "channel"`) */
    setChannels(channels:discord.Channel[]){
        this.data.channels = channels
        return this
    }
    /**Set the mentionables of this dropdown (when `type == "mentionable"`) */
    setMentionables(mentionables:(discord.User|discord.Role)[]){
        this.data.mentionables = mentionables
        return this
    }
}


/**## ODRadioGroupComponentData `type`
 * The configurable settings/options for the `ODRadioGroupComponent`.
 */
export interface ODRadioGroupComponentData {
    /**The custom id of this radio group. */
    customId?:string,
    /**Is this radio group required? (At least one option must be selected) */
    required:boolean,
    /**The available radio options. (min 2, max 10) */
    options:discord.APIRadioGroupOption[]
}

/**## ODRadioGroupComponent `class`
 * A radio group component which renders an interactive radio group input inside a modal.
 */
export class ODRadioGroupComponent extends ODComponent<ODRadioGroupComponentData,discord.RadioGroupBuilder> {
    constructor(id:ODValidId,data:Partial<ODRadioGroupComponentData>){
        const initData: ODRadioGroupComponentData = {required:false,options:[],...data}
        super(id,"radio-group",initData)
    }
    
    async build(){
        if (!this.data.options || this.data.options.length < 2) throw new ODSystemError("ODRadioGroupComponent:build('"+this.id.value+"') => Please provide at least 2 radio options using setOptions().")
        
        return new discord.RadioGroupBuilder({
            custom_id:this.data.customId,
            required:this.data.required,
            options:this.data.options
        })
    }

    /**Set the custom id of this radio group. */
    setCustomId(id:string|null){
        this.data.customId = id ?? undefined
        return this
    }
    /**Mark this radio group as required (At least one option must be selected). */
    setRequired(required:boolean){
        this.data.required = required
        return this
    }
    /**Set the available radio options (min 2, max 10) */
    setOptions(options:discord.APIRadioGroupOption[]){
        this.data.options = options
        return this
    }
}


/**## ODCheckboxGroupComponentData `type`
 * The configurable settings/options for the `ODCheckboxGroupComponent`.
 */
export interface ODCheckboxGroupComponentData {
    /**The custom id of this checkbox group. */
    customId?:string,
    /**Is this checkbox group required? (At least one option must be selected) */
    required:boolean,
    /**The available checkbox options. (min 1, max 10) */
    options:discord.APICheckboxGroupOption[],
    /**The minimum amount of checkboxes to be selected. */
    minValues?:number,
    /**The maximum amount of checkboxes to be selected. */
    maxValues?:number
}

/**## ODCheckboxGroupComponent `class`
 * A checkbox group component which renders an interactive checkbox group input inside a modal.
 */
export class ODCheckboxGroupComponent extends ODComponent<ODCheckboxGroupComponentData,discord.CheckboxGroupBuilder> {
    constructor(id:ODValidId,data:Partial<ODCheckboxGroupComponentData>){
        const initData: ODCheckboxGroupComponentData = {required:false,options:[],...data}
        super(id,"checkbox-group",initData)
    }
    
    async build(){
        if (!this.data.options || this.data.options.length < 2) throw new ODSystemError("ODCheckboxGroupComponent:build('"+this.id.value+"') => Please provide at least 2 radio options using setOptions().")
        
        return new discord.CheckboxGroupBuilder({
            custom_id:this.data.customId,
            required:this.data.required,
            options:this.data.options,
            min_values:this.data.minValues,
            max_values:this.data.maxValues
        })
    }

    /**Set the custom id of this checkbox group. */
    setCustomId(id:string|null){
        this.data.customId = id ?? undefined
        return this
    }
    /**Mark this checkbox group as required (At least one option must be selected). */
    setRequired(required:boolean){
        this.data.required = required
        return this
    }
    /**Set the available checkbox options (min 2, max 10) */
    setOptions(options:discord.APICheckboxGroupOption[]){
        this.data.options = options
        return this
    }
    /**Set the minimum amount of selected checkboxes. */
    setMinValues(amount:number|null){
        this.data.minValues = amount ?? undefined
        return this
    }
    /**Set the maximum amount of selected checkboxes. */
    setMaxValues(amount:number|null){
        this.data.maxValues = amount ?? undefined
        return this
    }
}


/**## ODCheckboxComponentData `type`
 * The configurable settings/options for the `ODCheckboxComponent`.
 */
export interface ODCheckboxComponentData {
    /**The custom id of this checkbox. */
    customId?:string,
    /**Is this checkbox enabled by default? */
    default:boolean,
}

/**## ODCheckboxComponent `class`
 * A checkbox component which renders an interactive checkbox input inside a modal.
 * The label & description should be set via an `ODLabelComponent`
 */
export class ODCheckboxComponent extends ODComponent<ODCheckboxComponentData,discord.CheckboxBuilder> {
    constructor(id:ODValidId,data:Partial<ODCheckboxComponentData>){
        const initData: ODCheckboxComponentData = {default:false,...data}
        super(id,"checkbox",initData)
    }
    
    async build(){
        return new discord.CheckboxBuilder({
            custom_id:this.data.customId,
            default:this.data.default
        })
    }

    /**Set the custom id of this checkbox. */
    setCustomId(id:string|null){
        this.data.customId = id ?? undefined
        return this
    }
    /**Mark this checkbox as enabled by default. */
    setDefault(enabledByDefault:boolean){
        this.data.default = enabledByDefault
        return this
    }
}


/**## ODFileUploadComponentData `type`
 * The configurable settings/options for the `ODFileUploadComponent`.
 */
export interface ODFileUploadComponentData {
    /**The custom id of this file upload. */
    customId?:string,
    /**Is this file upload required? */
    required:boolean,
    /**The minimum amount of files to upload (0-10). */
    minAmount?:number,
    /**The maximum amount of files to upload (1-10). */
    maxAmount?:number
}

/**## ODFileUploadComponent `class`
 * A file upload component which allows users to upload one or multiple files inside a modal.
 * The label & description should be set via an `ODLabelComponent`
 */
export class ODFileUploadComponent extends ODComponent<ODFileUploadComponentData,discord.FileUploadBuilder> {
    constructor(id:ODValidId,data:Partial<ODFileUploadComponentData>){
        const initData: ODFileUploadComponentData = {required:false,...data}
        super(id,"file-upload",initData)
    }
    
    async build(){
        if (typeof this.data.minAmount == "number" && !(this.data.minAmount >= 0 && this.data.minAmount <= 10)) throw new ODSystemError("ODFileUploadComponent:build('"+this.id.value+"') => Minimum upload amount must be a value from 0 to 10.")
        if (typeof this.data.maxAmount == "number" && !(this.data.maxAmount >= 1 && this.data.maxAmount <= 10)) throw new ODSystemError("ODFileUploadComponent:build('"+this.id.value+"') => Maximum upload amount must be a value from 1 to 10.")

        return new discord.FileUploadBuilder({
            custom_id:this.data.customId,
            required:this.data.required,
            min_values:this.data.minAmount,
            max_values:this.data.maxAmount
        })
    }

    /**Set the custom id of this dropdown. */
    setCustomId(id:string|null){
        this.data.customId = id ?? undefined
        return this
    }
    /**Mark this file upload as required. */
    setRequired(required:boolean){
        this.data.required = required
        return this
    }
    /**Set the minimum amount of files to upload (0-10). */
    setMinAmount(amount:number|null){
        this.data.minAmount = amount ?? undefined
        return this
    }
    /**Set the maximum amount of files to upload (1-10). */
    setMaxAmount(amount:number|null){
        this.data.maxAmount = amount ?? undefined
        return this
    }
}