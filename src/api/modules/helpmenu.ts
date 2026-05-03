///////////////////////////////////////
//HELP MODULE
///////////////////////////////////////
import { ODId, ODManager, ODManagerData, ODNoGeneric, ODSystemError, ODValidId } from "./base.js"
import { ODDebugger } from "./console.js"

/**## ODHelpMenuComponent `class`
 * This is an Open Discord help menu component.
 * 
 * It can render something on the Open Discord help menu.
 */
export abstract class ODHelpMenuComponent extends ODManagerData {
    /**The priority of this component. The higher, the earlier it will appear in the help menu. */
    priority: number

    constructor(id:ODValidId, priority:number){
        super(id)
        this.priority = priority
    }

    /**The render function for this component. */
    abstract render(page:number, category:number, location:number, mode:"slash"|"text"): string|Promise<string>
}

/**## ODHelpMenuTextComponent `class`
 * This is an Open Discord help menu text component.
 * 
 * It can render a static piece of text on the Open Discord help menu.
 */
export class ODHelpMenuTextComponent extends ODHelpMenuComponent {
    /**The text of this help menu component. */
    text: string

    constructor(id:ODValidId, priority:number, text:string){
        super(id,priority)
        this.text = text
    }

    render(page:number,category:number,location:number,mode:"slash"|"text"){
        return this.text
    }
}

/**## ODHelpMenuCommandComponentOption `interface`
 * This interface contains a command option for the `ODHelpMenuCommandComponent`.
 */
export interface ODHelpMenuCommandComponentOption {
    /**The name of this option. */
    name:string,
    /**Is this option optional? */
    optional:boolean
}

/**## ODHelpMenuCommandComponentSettings `interface`
 * This interface contains the settings for the `ODHelpMenuCommandComponent`.
 */
export interface ODHelpMenuCommandComponentSettings {
    /**The name of this text command. */
    textName?:string,
    /**The name of this slash command. */
    slashName?:string,
    /**Options available in the text command. */
    textOptions?:ODHelpMenuCommandComponentOption[],
    /**Options available in the slash command. */
    slashOptions?:ODHelpMenuCommandComponentOption[],
    /**The description for the text command. */
    textDescription?:string,
    /**The description for the slash command. */
    slashDescription?:string
}

/**## ODHelpMenuCommandComponent `class`
 * This is an Open Discord help menu command component.
 * 
 * It contains a useful helper to render a command in the Open Discord help menu.
 */
export class ODHelpMenuCommandComponent extends ODHelpMenuComponent {
    /**The settings for this help menu component. */
    settings:ODHelpMenuCommandComponentSettings

    constructor(id:ODValidId, priority:number, settings:ODHelpMenuCommandComponentSettings){
        super(id,priority)
        this.settings = settings
    }

    render(page:number,category:number,location:number,mode:"slash"|"text"){
        if (mode == "slash" && this.settings.slashName){
            return `\`${this.settings.slashName}${(this.settings.slashOptions) ? this.renderOptions(this.settings.slashOptions) : ""}\` ➜ ${this.settings.slashDescription ?? ""}`
        
        }else if (mode == "text" && this.settings.textName){
            return `\`${this.settings.textName}${(this.settings.textOptions) ? this.renderOptions(this.settings.textOptions) : ""}\` ➜ ${this.settings.textDescription ?? ""}`
        
        }else return ""
    }
    
    /**Utility function to render all command options. */
    protected renderOptions(options:ODHelpMenuCommandComponentOption[]){
        return " "+options.map((opt) => (opt.optional) ? `[${opt.name}]` : `<${opt.name}>`).join(" ")
    }
}

/**## ODHelpMenuCategoryIdConstraint `type`
 * The constraint/layout for id mappings/interfaces of the `ODHelpMenuCategory` class.
 */
export type ODHelpMenuCategoryIdConstraint = Record<string,ODHelpMenuComponent|null>

/**## ODHelpMenuCategory `class`
 * This is an Open Discord help menu category.
 * 
 * Every category in the help menu is an embed field by default.
 * Try to limit the amount of components per category.
 */
export class ODHelpMenuCategory<IdList extends ODHelpMenuCategoryIdConstraint = ODHelpMenuCategoryIdConstraint> extends ODManager<ODHelpMenuComponent> {
    /**The id of this category. */
    id: ODId
    /**The priority of this category. The higher, the earlier it will appear in the menu. */
    priority: number
    /**The name of this category. (can include emoji's) */
    name: string
    /**When enabled, it automatically starts this category on a new page. */
    newPage: boolean

    constructor(id:ODValidId, priority:number, name:string, newPage?:boolean){
        super()
        this.id = new ODId(id)
        this.priority = priority
        this.name = name
        this.newPage = newPage ?? false
    }

    /**Render this category and it's components. */
    async render(page:number, category:number, mode:"slash"|"text"){
        //sort from high priority to low
        const derefArray = [...this.getAll()]
        derefArray.sort((a,b) => {
            return b.priority-a.priority
        })
        const result: string[] = []

        let i = 0
        for (const component of derefArray){
            try {
                result.push(await component.render(page,category,i,mode))
            }catch(err:any){
                process.emit("uncaughtException",new ODSystemError(err))
            }
            i++
        }

        //only return the non-empty components
        return result.filter((component) => component !== "").join("\n\n")
    }

    get<HelpMenuComponentId extends keyof ODNoGeneric<IdList>>(id:HelpMenuComponentId): IdList[HelpMenuComponentId]
    get(id:ODValidId): ODHelpMenuComponent|null
    
    get(id:ODValidId): ODHelpMenuComponent|null {
        return super.get(id)
    }

    remove<HelpMenuComponentId extends keyof ODNoGeneric<IdList>>(id:HelpMenuComponentId): IdList[HelpMenuComponentId]
    remove(id:ODValidId): ODHelpMenuComponent|null
    
    remove(id:ODValidId): ODHelpMenuComponent|null {
        return super.remove(id)
    }

    exists(id:keyof ODNoGeneric<IdList>): boolean
    exists(id:ODValidId): boolean
    
    exists(id:ODValidId): boolean {
        return super.exists(id)
    }
}

/**## ODHelpMenuRenderResult `type`
 * This is the array returned when the help menu has been rendered successfully.
 * 
 * It contains a list of pages, which contain categories by name & value (content).
 */
export type ODHelpMenuRenderResult = {name:string, value:string}[][]


/**## ODHelpMenuManagerIdConstraint `type`
 * The constraint/layout for id mappings/interfaces of the `ODHelpMenuManager` class.
 */
export type ODHelpMenuManagerIdConstraint = Record<string,ODHelpMenuCategory>

/**## ODHelpMenuManager `class`
 * This is an Open Discord help menu manager.
 * 
 * It is responsible for rendering the entire help menu content.
 * You are also able to configure the amount of categories per page here.
 * 
 * Fewer Categories == More Clean Menu
 */
export class ODHelpMenuManager<IdList extends ODHelpMenuManagerIdConstraint = ODHelpMenuManagerIdConstraint> extends ODManager<ODHelpMenuCategory> {
    /**The amount of categories per-page. */
    categoriesPerPage: number = 3
    
    constructor(debug:ODDebugger){
        super(debug,"help menu category")
    }

    add(data:ODHelpMenuCategory, overwrite?:boolean): boolean {
        data.useDebug(this.debug,"help menu component")
        return super.add(data,overwrite)
    }

    /**Render this entire help menu & return a `ODHelpMenuRenderResult`. */
    async render(mode:"slash"|"text"): Promise<ODHelpMenuRenderResult> {
        //sort from high priority to low
        const derefArray = [...this.getAll()]
        derefArray.sort((a,b) => {
            return b.priority-a.priority
        })
        const result: {name:string, value:string}[][] = []
        let currentPage: {name:string, value:string}[] = []

        for (const category of derefArray){
            try {
                const renderedCategory = await category.render(result.length,currentPage.length,mode)

                if (renderedCategory !== ""){
                    //create new page when category wants to
                    if (currentPage.length > 0 && category.newPage){
                        result.push(currentPage)
                        currentPage = []
                    }

                    currentPage.push({
                        name:category.name,
                        value:renderedCategory
                    })

                    //create new page when page is full
                    if (currentPage.length >= this.categoriesPerPage){
                        result.push(currentPage)
                        currentPage = []
                    }
                }
            }catch(err){
                process.emit("uncaughtException",err)
            }
        }

        //push current page when not-empty
        if (currentPage.length > 0) result.push(currentPage)

        return result
    }

    get<HelpMenuCategoryId extends keyof ODNoGeneric<IdList>>(id:HelpMenuCategoryId): IdList[HelpMenuCategoryId]
    get(id:ODValidId): ODHelpMenuCategory|null
    
    get(id:ODValidId): ODHelpMenuCategory|null {
        return super.get(id)
    }

    remove<HelpMenuCategoryId extends keyof ODNoGeneric<IdList>>(id:HelpMenuCategoryId): IdList[HelpMenuCategoryId]
    remove(id:ODValidId): ODHelpMenuCategory|null
    
    remove(id:ODValidId): ODHelpMenuCategory|null {
        return super.remove(id)
    }

    exists(id:keyof ODNoGeneric<IdList>): boolean
    exists(id:ODValidId): boolean
    
    exists(id:ODValidId): boolean {
        return super.exists(id)
    }
}