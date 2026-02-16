import * as api from "../api/index"
import * as utilities from "../utilities/index"
import {Terminal, terminal} from "terminal-kit"
import * as discord from "discord.js"
import ansis from "ansis"
import crypto from "crypto"

export * from "./editConfig"

/**## ODCliHeaderOpts `interface`
 * All metadata required for rendering the Interactive Setup CLI header.
 */
export interface ODCliHeaderOpts {
    /**The main logo to display (multiple lines splitted in string array). */
    logo:string[],
    /**The main color of the project. */
    projectColor:discord.HexColorString,
    /**The version of the project. */
    projectVersion:api.ODVersion,
    /**The name of the project in display style (e.g. `Open Ticket`) */
    projectName:string
}

/**## ODCliStartFunction `type`
 * A function used to start a sub-system of the interactive setup CLI.
 */
export type ODCliStartFunction = (backFn:() => api.ODPromiseVoid) => Promise<void>

/**A utility function to center text to a certain width. */
export function centerText(text:string,width:number){
    if (width < text.length) return text
    let newWidth = width-ansis.strip(text).length+1
    let final = " ".repeat(newWidth/2)+text
    return final
}

/**A utility function to terminate the interactive CLI. */
export async function terminate(opts:ODCliHeaderOpts){
    terminal.grabInput(false)
    terminal.clear()
    terminal.green("👋 Exited the "+opts.projectName+" Interactive Setup CLI.\n")
    process.exit(0)
}

/**A utility function generate a unique config ID based on a user-named input. */
export function generateUniqueIdFromName(name:string){
    //id only allows a-z, 0-9 & dash characters (& replace spaces with dashes)
    const filteredChars = name.toLowerCase().replaceAll(" ","-").split("").filter((ch) => /^[a-zA-Z0-9-]{1}$/.test(ch))
    const randomSuffix = "-"+crypto.randomBytes(4).toString("hex")
    return filteredChars.join("")+randomSuffix
}

/**Render the header of the interactive setup CLI. */
export function renderHeader(opts:ODCliHeaderOpts,path:(string|number)[]|string){
    terminal.grabInput(true)
    terminal.clear().moveTo(1,1)
    terminal(ansis.hex("#f8ba00")(opts.logo.join("\n")+"\n"))
    terminal.bold(centerText("Interactive Setup CLI  -  Version: "+opts.projectVersion.toString()+"  -  Support: https://discord.dj-dj.be\n",88))
    if (typeof path == "string") terminal.cyan(centerText(path+"\n\n",88))
    else if (path.length < 1) terminal.cyan(centerText("👋 Hi! Welcome to the "+opts.projectName+" Interactive Setup CLI! 👋\n\n",88))
    else terminal.cyan(centerText("🌐 Current Location: "+path.map((v,i) => {
        if (i == 0) return v.toString()
        else if (typeof v == "string") return ".\""+v+"\""
        else if (typeof v == "number") return "."+v
    }).join("")+"\n\n",88))
}

/**Render the mode selector for the interactive setup CLI */
async function renderCliModeSelector(opts:ODCliHeaderOpts,backFn:(() => api.ODPromiseVoid),renderEditConfig:ODCliStartFunction|null,renderQuickSetup:ODCliStartFunction|null){
    renderHeader(opts,[])
    terminal(ansis.bold.green("Please select what CLI module you want to use.\n")+ansis.italic.gray("(use arrow keys to navigate, exit using escape)\n"))

    const answer = await terminal.singleColumnMenu([
        "✏️ Edit Config     "+ansis.gray("=> Edit the current config, add/remove settings & more!"),
        "⏱️ Quick Setup     "+ansis.gray("=> A quick and easy way of setting up the bot in your Discord server."),
    ],{
        leftPadding:"> ",
        style:terminal.cyan,
        selectedStyle:terminal.bgDefaultColor.bold,
        submittedStyle:terminal.bgBlue,
        extraLines:2,
        cancelable:true
    }).promise
    
    if (answer.canceled) return await backFn()
    else if (answer.selectedIndex == 0 && renderEditConfig) await renderEditConfig(async () => {await renderCliModeSelector(opts,backFn,renderEditConfig,renderQuickSetup)})
    else if (answer.selectedIndex == 1 && renderQuickSetup) await renderQuickSetup(async () => {await renderCliModeSelector(opts,backFn,renderEditConfig,renderQuickSetup)})
    else return await backFn()
}

/**Execute/start the Interactive Setup CLI. Make sure no other processes disturb the flow. */
export async function execute(opts:ODCliHeaderOpts,renderEditConfig:ODCliStartFunction|null,renderQuickSetup:ODCliStartFunction|null){
    terminal.on("key",(name:string) => {
        if (name == "CTRL_C") terminate(opts)
    })

    if (terminal.width < 100 || terminal.height < 35){
        terminal(ansis.red.bold("\n\nMake sure your console, terminal or CMD window has a "+ansis.cyan("minimum width & height")+" of "+ansis.cyan("100x35")+" characters."))
        terminal(ansis.red.bold("\nOtherwise the "+opts.projectName+" Interactive Setup CLI will be rendered incorrectly."))
        terminal(ansis.red.bold("\nThe current terminal dimensions are: "+ansis.cyan(terminal.width+"x"+terminal.height)+"."))
    }else await renderCliModeSelector(opts,async () => {await terminate(opts)},renderEditConfig,renderQuickSetup)
}

/**A basic style template for select menu's in the interactive setup CLI. */
export const autoCompleteMenuOpts: Terminal.SingleLineMenuOptions = {
    style:terminal.white,
    selectedStyle:terminal.bgBlue.white
}

/**A set of preset colors to be used when auto-filling colors in the interactive setup CLI. */
export const presetColors = new Map<string,string>([
    ["dark red","#992d22"],
    ["red","#ff0000"],
    ["light red","#f06c6c"],
    ["dark orange","#ed510e"],
    ["orange","#ed6f0e"],
    ["light orange","#f0b06c"],
    ["openticket","#f8ba00"],
    ["dark yellow","#deb100"],
    ["yellow","#ffff00"],
    ["light yellow","#ffff8c"],
    ["banana","#ffe896"],
    ["lime","#a8e312"],
    ["dark green","#009600"],
    ["green","#00ff00"],
    ["light green","#76f266"],
    ["dark cyan","#00abab"],
    ["cyan","#00ffff"],
    ["light cyan","#63ffff"],
    ["aquamarine","#7fffd4"],
    ["dark skyblue","#006bc9"],
    ["skyblue","#0095ff"],
    ["light skyblue","#40bfff"],
    ["dark blue","#00006e"],
    ["blue","#0000ff"],
    ["light blue","#5353fc"],
    ["blurple","#5865F2"],
    ["dark purple","#3f009e"],
    ["purple","#8000ff"],
    ["light purple","#9257eb"],
    ["dark pink","#b82ab0"],
    ["pink","#ff6bf8"],
    ["light pink","#ff9cfa"],
    ["magenta","#ff00ff"],
    ["black","#000000"],
    ["brown","#806050"],
    ["dark gray","#4f4f4f"],
    ["gray","#808080"],
    ["light gray","#b3b3b3"],
    ["white","#ffffff"],
    ["invisible","#393A41"]
])