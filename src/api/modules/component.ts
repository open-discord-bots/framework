///////////////////////////////////////
//COMPONENT MODULE
///////////////////////////////////////
import { ODId, ODValidId, ODSystemError, ODManagerData, ODNoGeneric, ODManager } from "./base"
import * as discord from "discord.js"
import { ODWorkerManager, ODWorkerCallback, ODWorker } from "./worker"
import { ODDebugger } from "./console"

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
    async build(origin:Origin, params:Params): Promise<ODComponentFactoryInstance<Component>> {
        const instance = new ODComponentFactoryInstance<Component>()
        await this.workers.executeWorkers(instance,origin,params)
        return instance
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
export class ODMessageComponentManager<IdList extends ODComponentManagerIdConstraint = ODComponentManagerIdConstraint> extends ODBaseComponentManager<IdList,TODO> {
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

///////////////////////////////////////////
//   INTERACTIVE COMPONENT DEFINITIONS   //
///////////////////////////////////////////

