///////////////////////////////////////
//PROGRESS BAR MODULE
///////////////////////////////////////
import { ODSystemError, ODManager, ODManagerData, ODValidId, ODNoGeneric } from "./base.js"
import { ODDebugger, ODValidConsoleColor } from "./console.js"
import readline from "readline"
import ansis from "ansis"

/**## ODProgressBarRendererManagerIdConstraint `type`
 * The constraint/layout for id mappings/interfaces of the `ODProgressBarRendererManager` class.
 */
export type ODProgressBarRendererManagerIdConstraint = Record<string,ODProgressBarRenderer<{}>>

/**## ODProgressBarRendererManager `class`
 * This is an Open Discord progress bar renderer manager.
 * 
 * It is responsible for managing all console progress bar renderers in Open Discord.
 * 
 * A renderer is a function which will try to visualize the progress bar in the console.
 */
export class ODProgressBarRendererManager<IdList extends ODProgressBarRendererManagerIdConstraint = ODProgressBarRendererManagerIdConstraint> extends ODManager<ODProgressBarRenderer<{}>> {
    constructor(debug:ODDebugger){
        super(debug,"progress bar renderer")
    }

    get<RendererId extends keyof ODNoGeneric<IdList>>(id:RendererId): IdList[RendererId]
    get(id:ODValidId): ODProgressBarRenderer<{}>|null
    
    get(id:ODValidId): ODProgressBarRenderer<{}>|null {
        return super.get(id)
    }

    remove<RendererId extends keyof ODNoGeneric<IdList>>(id:RendererId): IdList[RendererId]
    remove(id:ODValidId): ODProgressBarRenderer<{}>|null
    
    remove(id:ODValidId): ODProgressBarRenderer<{}>|null {
        return super.remove(id)
    }

    exists(id:keyof ODNoGeneric<IdList>): boolean
    exists(id:ODValidId): boolean
    
    exists(id:ODValidId): boolean {
        return super.exists(id)
    }
}

/**## ODProgressBarManagerIdConstraint `type`
 * The constraint/layout for id mappings/interfaces of the `ODProgressBarManager` class.
 */
export type ODProgressBarManagerIdConstraint = Record<string,ODProgressBar>

/**## ODProgressBarManager `class`
 * This is an Open Discord progress bar manager.
 * 
 * It is responsible for managing all console progress bars in Open Discord. An example of this is the slash command registration progress bar.
 * 
 * There are many types of progress bars available, but you can also create your own!
 */
export class ODProgressBarManager<IdList extends ODProgressBarManagerIdConstraint = ODProgressBarManagerIdConstraint,RendererIdList extends ODProgressBarRendererManagerIdConstraint = ODProgressBarRendererManagerIdConstraint> extends ODManager<ODProgressBar> {
    /**A collection of render types for progress bars. */
    renderers: ODProgressBarRendererManager<RendererIdList>

    constructor(debug:ODDebugger){
        super(debug,"progress bar")
        this.renderers = new ODProgressBarRendererManager(debug)
    }

    get<ProgressBarId extends keyof ODNoGeneric<IdList>>(id:ProgressBarId): IdList[ProgressBarId]
    get(id:ODValidId): ODProgressBar|null
    
    get(id:ODValidId): ODProgressBar|null {
        return super.get(id)
    }

    remove<ProgressBarId extends keyof ODNoGeneric<IdList>>(id:ProgressBarId): IdList[ProgressBarId]
    remove(id:ODValidId): ODProgressBar|null
    
    remove(id:ODValidId): ODProgressBar|null {
        return super.remove(id)
    }

    exists(id:keyof ODNoGeneric<IdList>): boolean
    exists(id:ODValidId): boolean
    
    exists(id:ODValidId): boolean {
        return super.exists(id)
    }
}

/**## ODProgressBarRenderFunc `type`
 * This is the render function for an Open Discord console progress bar.
 */
export type ODProgressBarRenderFunc<Settings extends {}> = (settings:Settings,min:number,max:number,value:number,prefix:string|null,suffix:string|null) => string

/**## ODProgressBarRenderer `class`
 * This is an Open Discord console progress bar renderer.
 * 
 * It is used to render a progress bar in the console of the bot.
 * 
 * There are already a lot of default options available if you just want an easy progress bar!
 */
export class ODProgressBarRenderer<Settings extends {}> extends ODManagerData {
    settings: Settings
    #render: ODProgressBarRenderFunc<Settings>

    constructor(id:ODValidId,render:ODProgressBarRenderFunc<Settings>,settings:Settings){
        super(id)
        this.#render = render
        this.settings = settings
    }

    /**Render a progress bar using this renderer. */
    render(min:number,max:number,value:number,prefix:string|null,suffix:string|null){
        try {
            return this.#render(this.settings,min,max,value,prefix,suffix)
        }catch(err){
            process.emit("uncaughtException",err)
            return "<PROGRESS-BAR-ERROR>"
        }
    }
    /**Create a clone of this progress bar renderer, but with additional settings. */
    withAdditionalSettings(settings:Partial<Settings>): ODProgressBarRenderer<Settings> {
        const newSettings: Settings = {...this.settings}
        for (const key of Object.keys(settings) as (keyof Partial<Settings>)[]){
            if (typeof settings[key] != "undefined") newSettings[key] = settings[key]
        }

        return new ODProgressBarRenderer(this.id,this.#render,newSettings)
    }
}

/**## ODProgressBar `class`
 * This is an Open Discord console progress bar.
 * 
 * It is used to create a simple or advanced progress bar in the console of the bot.
 * These progress bars are not visible in the `debug.txt` file and should only be used as extra visuals.
 * 
 * Use other classes as existing templates or create your own progress bar from scratch using this class.
 */
export abstract class ODProgressBar extends ODManagerData {
    /**The renderer of this progress bar. */
    renderer: ODProgressBarRenderer<{}>
    /**Is this progress bar currently active? */
    #active: boolean = false
    /**A list of listeners when the progress bar stops. */
    #stopListeners: Function[] = []
    /**The current value of the progress bar. */
    protected value: number
    /**The minimum value of the progress bar. */
    min: number
    /**The maximum value of the progress bar. */
    max: number
    /**The initial value of the progress bar. */
    initialValue: number
    /**The prefix displayed in the progress bar. */
    prefix:string|null
    /**The prefix displayed in the progress bar. */
    suffix:string|null
    
    /**Enable automatic stopping when reaching `min` or `max`. */
    autoStop: null|"min"|"max"

    constructor(id:ODValidId,renderer:ODProgressBarRenderer<{}>,min:number,max:number,value:number,autoStop:null|"min"|"max",prefix:string|null,suffix:string|null){
        super(id)
        this.renderer = renderer
        this.min = min
        this.max = max
        this.initialValue = this.#parseValue(value)
        this.value = this.#parseValue(value)
        this.autoStop = autoStop
        this.prefix = prefix
        this.suffix = suffix
    }
    /**Parse a value in such a way that it doesn't go below/above the min/max limits. */
    #parseValue(value:number){
        if (value > this.max) return this.max
        else if (value < this.min) return this.min
        else return value
    }
    /**Render progress bar to the console. */
    #renderStdout(){
        if (!this.#active) return
        readline.clearLine(process.stdout,0)
        readline.cursorTo(process.stdout,0)
        process.stdout.write(this.renderer.render(this.min,this.max,this.value,this.prefix,this.suffix))
    }
    /**Start showing this progress bar in the console. */
    start(): boolean {
        if (this.#active) return false
        this.value = this.#parseValue(this.initialValue)
        this.#active = true
        this.#renderStdout() 
        return true
    }
    /**Update this progress bar while active. (will automatically update the progress bar in the console) */
    protected update(value:number,stop?:boolean): boolean {
        if (!this.#active) return false
        this.value = this.#parseValue(value)
        this.#renderStdout()
        if (stop || (this.autoStop == "max" && this.value  == this.max) || (this.autoStop == "min" && this.value  == this.min)){
            process.stdout.write("\n")
            this.#active = false
            this.#stopListeners.forEach((cb) => cb())
            this.#stopListeners = []
        }
        return true
    }
    /**Wait for the progress bar to finish. */
    finished(): Promise<void> {
        return new Promise((resolve) => {
            this.#stopListeners.push(resolve)
        })
    }
}

/**## ODTimedProgressBar `class`
 * This is an Open Discord timed console progress bar.
 * 
 * It is used to create a simple timed progress bar in the console.
 * You can set a fixed duration (milliseconds) in the constructor.
 */
export class ODTimedProgressBar extends ODProgressBar {
    /**The time in milliseconds. */
    time: number
    /**The mode of the timer. */
    mode: "increasing"|"decreasing"

    constructor(id:ODValidId,renderer:ODProgressBarRenderer<{}>,time:number,mode:"increasing"|"decreasing",prefix:string|null,suffix:string|null){
        super(id,renderer,0,time,0,(mode == "increasing") ? "max" : "min",prefix,suffix)
        this.time = time
        this.mode = mode
    }

    /**The timer which is used. */
    async #timer(ms:number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve()
            },ms)
        })
    }
    /**Run the timed progress bar. */
    async #execute(){
        let i = 0
        const fragment = this.time/100
        while (i < 100){
            await this.#timer(fragment)
            i++
            super.update((this.mode == "increasing") ? (i*fragment) : this.time-(i*fragment))
        }
    }
    start(){
        const res = super.start()
        if (!res) return false
        this.#execute()
        return true
    }
}

/**## ODManualProgressBar `class`
 * This is an Open Discord manual console progress bar.
 * 
 * It is used to create a simple manual progress bar in the console.
 * You can update the progress manually using `update()`.
 */
export class ODManualProgressBar extends ODProgressBar {
    constructor(id:ODValidId,renderer:ODProgressBarRenderer<{}>,amount:number,autoStop:null|"min"|"max",prefix:string|null,suffix:string|null){
        super(id,renderer,0,amount,0,autoStop,prefix,suffix)
    }
    /**Set the value of the progress bar. */
    set(value:number,stop?:boolean){
        super.update(value,stop)
    }
    /**Get the current value of the progress bar. */
    get(){
        return this.value
    }
    /**Increase the value of the progress bar. */
    increase(amount:number,stop?:boolean){
        super.update(this.value+amount,stop)
    }
    /**Decrease the value of the progress bar. */
    decrease(amount:number,stop?:boolean){
        super.update(this.value-amount,stop)
    }
}

/**## ODDefaultProgressBarRendererLabel `type`
 * All available label types for the default progress bar renderer
 */
export type ODDefaultProgressBarRendererLabel = "value"|"percentage"|"fraction"|"time-ms"|"time-sec"|"time-min"

/**## ODDefaultProgressBarRendererSettings `interface`
 * All settings for the default progress bar renderer.
 */
export interface ODDefaultProgressBarRendererSettings {
    /**The color of the progress bar border. */
    borderColor:ODValidConsoleColor|"openticket"|"openmoderation",
    /**The color of the progress bar (filled side). */
    filledBarColor:ODValidConsoleColor|"openticket"|"openmoderation",
    /**The color of the progress bar (empty side). */
    emptyBarColor:ODValidConsoleColor|"openticket"|"openmoderation",
    /**The color of the text before the progress bar. */
    prefixColor:ODValidConsoleColor|"openticket"|"openmoderation",
    /**The color of the text after the progress bar. */
    suffixColor:ODValidConsoleColor|"openticket"|"openmoderation",
    /**The color of the progress bar label. */
    labelColor:ODValidConsoleColor|"openticket"|"openmoderation",

    /**The character used in the left border. */
    leftBorderChar:string,
    /**The character used in the right border. */
    rightBorderChar:string,
    /**The character used in the filled side of the progress bar. */
    filledBarChar:string,
    /**The character used in the empty side of the progress bar. */
    emptyBarChar:string,
    /**The label type. (will show a number related to the progress) */
    labelType:ODDefaultProgressBarRendererLabel,
    /**The position of the label. */
    labelPosition:"start"|"end",
    /**The width of the bar. (50 characters by default) */
    barWidth:number,

    /**Show the bar. */
    showBar:boolean,
    /**Show the label. */
    showLabel:boolean,
    /**Show the border. */
    showBorder:boolean,
}

export class ODDefaultProgressBarRenderer extends ODProgressBarRenderer<ODDefaultProgressBarRendererSettings> {
    constructor(id:ODValidId,settings:ODDefaultProgressBarRendererSettings){
        super(id,(settings,min,max,value,rawPrefix,rawSuffix) => {
            const percentage = (value-min)/(max-min)
            const barLevel = Math.round(percentage*settings.barWidth)

            const borderAnsis = this.#switchColorAnsis(settings.borderColor)
            const filledBarAnsis = this.#switchColorAnsis(settings.filledBarColor)
            const emptyBarAnsis = this.#switchColorAnsis(settings.emptyBarColor)
            const labelAnsis = this.#switchColorAnsis(settings.labelColor)
            const prefixAnsis = this.#switchColorAnsis(settings.prefixColor)
            const suffixAnsis = this.#switchColorAnsis(settings.suffixColor)

            const leftBorder = (settings.showBorder) ? borderAnsis(settings.leftBorderChar) : ""
            const rightBorder = (settings.showBorder) ? borderAnsis(settings.rightBorderChar) : ""
            const bar = (settings.showBar) ? filledBarAnsis(settings.filledBarChar.repeat(barLevel))+emptyBarAnsis(settings.emptyBarChar.repeat(settings.barWidth-barLevel)) : ""
            const prefix = (rawPrefix) ? prefixAnsis(rawPrefix)+" " : ""
            const suffix = (rawSuffix) ? " "+suffixAnsis(rawSuffix) : ""
            let label: string
            if (!settings.showLabel) label = ""
            if (settings.labelType == "fraction") label = labelAnsis(value+"/"+max)
            else if (settings.labelType == "percentage") label = labelAnsis(Math.round(percentage*100)+"%")
            else if (settings.labelType == "time-ms") label = labelAnsis(value+"ms")
            else if (settings.labelType == "time-sec") label = labelAnsis(Math.round(value*10)/10+"sec")
            else if (settings.labelType == "time-min") label = labelAnsis(Math.round(value*10)/10+"min")
            else label = labelAnsis(value.toString())

            const labelWithPrefixAndSuffix = prefix+label+suffix
            return (settings.labelPosition == "start") ? labelWithPrefixAndSuffix+" "+leftBorder+bar+rightBorder : leftBorder+bar+rightBorder+" "+labelWithPrefixAndSuffix
        },settings)
    }

    /**Switch between Ansis functions based on the specified color. */
    #switchColorAnsis(c:ODValidConsoleColor|"openticket"|"openmoderation"){
        return (c === "openticket") ? ansis.hex("#f8ba00") : (c === "openmoderation") ? ansis.hex("#1690ff") : ansis[c]
    }
}