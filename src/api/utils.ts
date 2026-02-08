import * as fs from "fs"
import ansis from "ansis"
import * as api from "./api"

/**## sharedFuses `utility variable`
 * All shared fuses from Open Discord. Please use `opendiscord.sharedFuses` instead!
 */
export const sharedFuses: api.ODSharedFuseManager = new api.ODSharedFuseManager()

/**## checkNodeVersion `utility function`
 * Check if the node.js version is v20 or higher.
 */
export function checkNodeVersion(project:api.ODProjectType){
    const nodev = process.versions.node.split(".")
    if (Number(nodev[0]) < 20){
        const title = (project == "openticket") ? "OPEN TICKET" : "OPEN MODERATION"
        console.log("\n\n==============================\n["+title+" ERROR]: Invalid node.js version. Open Ticket requires node.js v20 or above!\n==============================\n\n")
        process.exit(1)
    }
}

/**## moduleInstalled `utility function`
 * Use this function to check if an npm package is installed or not!
 * @example utilities.moduleInstalled("discord.js") //check if discord.js is installed
 */
export function moduleInstalled(id:string,throwError?:boolean): boolean {
    try{
        require.resolve(id)
        return true
    }catch{
        if (throwError) throw new Error("npm module \""+id+"\" is not installed! Install it via 'npm install "+id+"'")
        return false
    }
}

/**## initialStartupLogs `utility function`
 * Use this function to check if an npm package is installed or not!
 * @example utilities.moduleInstalled("discord.js") //check if discord.js is installed
 */
export function initialStartupLogs(opendiscord:api.ODMain,project:api.ODProjectType){
    const title = (project == "openticket") ? "OPEN TICKET" : "OPEN MODERATION"
    console.log("\n--------------------------- "+title+" STARTUP ---------------------------")
    opendiscord.log("Logging system activated!","system")
    opendiscord.debug.debug("Using Node.js "+process.version+"!")

    try{
        const packageJson = JSON.parse(fs.readFileSync("./package.json").toString())
        opendiscord.debug.debug("Using discord.js "+packageJson.dependencies["discord.js"]+"!")
        opendiscord.debug.debug("Using @discordjs/rest "+packageJson.dependencies["@discordjs/rest"]+"!")
        opendiscord.debug.debug("Using ansis "+packageJson.dependencies["ansis"]+"!")
        opendiscord.debug.debug("Using formatted-json-stringify "+packageJson.dependencies["formatted-json-stringify"]+"!")
        opendiscord.debug.debug("Using terminal-kit "+packageJson.dependencies["terminal-kit"]+"!")
        opendiscord.debug.debug("Using typescript "+packageJson.dependencies["typescript"]+"!")
    }catch{
        opendiscord.debug.debug("Failed to fetch module versions!")
    }
}

/**## timer `utility function`
 * Use this to wait for a certain amount of milliseconds. This only works when using `await`
 * @example await utilities.timer(1000) //wait 1sec
 */
export async function timer(ms:number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        },ms)
    })
}

/**## emojiTitle `utility function`
 * Use this function to create a title with an emoji before/after the text. The style & divider are set in `opendiscord.sharedFuses`
 * @example utilities.emojiTitle("📎","Links") //create a title with an emoji based on the bot emoji style
 */
export function emojiTitle(emoji:string, text:string){
    const style = sharedFuses.getFuse("emojiTitleStyle")
    const divider = sharedFuses.getFuse("emojiTitleDivider")

    if (style == "disabled") return text
    else if (style == "before") return emoji+divider+text
    else if (style == "after") return text+divider+emoji
    else if (style == "double") return emoji+divider+text+divider+emoji
    else return text
}

/**## runAsync `utility function`
 * Use this function to run a snippet of code asyncronous without creating a separate function for it!
 */
export async function runAsync(func:() => Promise<void>): Promise<void> {
    func()
}

/**## timedAwait `utility function`
 * Use this function to await a promise but reject after the certain timeout has been reached.
 */
export function timedAwait<ReturnValue>(promise:ReturnValue,timeout:number,onError:(err:Error) => void): ReturnValue {
    let allowResolve = true
    return new Promise(async (resolve,reject) => {
        //set timeout & stop if it is before the promise resolved
        setTimeout(() => {
            allowResolve = false
            reject("utilities.timedAwait() => Promise Timeout")
        },timeout)

        //get promise result & return if not already rejected
        try{
            const res = await promise
            if (allowResolve) resolve(res)
        }catch(err){
            onError(err)
        }
    return promise
    }) as ReturnValue
}

/**## dateString `utility function`
 * Use this function to create a short date string in the following format: `DD/MM/YYYY HH:MM:SS`
 */
export function dateString(date): string {
    return `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
}

/**## asyncReplace `utility function`
 * Same as `string.replace(search, value)` but with async compatibility
 */
export async function asyncReplace(text:string, regex:RegExp, func:(value:string,...args:any[]) => Promise<string>): Promise<string> {
    const promises: Promise<string>[] = []
    text.replace(regex,(match,...args) => {
        promises.push(func(match,...args))
        return match
    })
    const data = await Promise.all(promises)
    const result = text.replace(regex,(match) => {
        const replaceResult = data.shift()
        return replaceResult ?? match
    })
    return result
}

/**## getLongestLength `utility function`
 * Get the length of the longest string in the array.
 */
export function getLongestLength(texts:string[]): number {
    return Math.max(...texts.map((t) => ansis.strip(t).length))
}

/**## ordinalNumber `utility function`
 * Get a human readable ordinal number (e.g. 1st, 2nd, 3rd, 4th, ...) from a Javascript number.
 */
export function ordinalNumber(num:number){
    const i = Math.abs(Math.round(num))
    const cent = i % 100
    if (cent >= 10 && cent <= 20) return i+'th'
    const dec = i % 10
    if (dec === 1) return i+'st'
    if (dec === 2) return i+'nd'
    if (dec === 3) return i+'rd'
    return i+'th'
}

/**## trimEmojis `utility function`
 * Trim/remove all emoji's from a Javascript string.
 */
export function trimEmojis(text){
    return text.replace(/(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*)/gu,"")
}

/**## easterEggs `utility object`
 * Object containing data for Open Ticket easter eggs.
 */
export const easterEggs: api.ODEasterEggs = {
    /* THANK YOU TO ALL OUR CONTRIBUTORS!!! */
    creator:"779742674932072469", //DJj123dj
    translators:[
        "779742674932072469", //DJj123dj
        "574172558006681601", //Sanke
        "540639725300613136", //Guillee.3
        "547231585368539136", //Mods HD
        "664934139954331649", //SpyEye
        "498055992962187264", //Redactado
        "912052735950618705", //T0miiis
        "366673202610569227", //johusens
        "360780292853858306", //David.3
        "950611418389024809", //Sarcastic
        "461603955517161473", //Maurizo
        "465111430274875402", //The_Gamer
        "586376952470831104", //Erxg
        "226695254433202176", //Mkevas
        "437695615095275520", //NoOneNook
        "530047191222583307", //Anderskiy
        "719072181631320145", //ToStam
        "1172870906377408512", //Stragar
        "1084794575945744445", //Sasanwm
        "449613814049275905", //Benzorich
        "905373133085741146", //Ronalds
        "918504977369018408", //Palestinian
        "807970841035145216", //Kornel0706
        "1198883915826475080", //Nova
        "669988226819162133", //Danoglez
        "1313597620996018271", //Fraden1
        "547809968145956884", //TsgIndrius
        "264120132660363267", //Quiradon
        "1272034143777329215", //NotMega
        "LOREMIPSUM", //TODO, ADD MORE IDS IN FUTURE!
    ]
}