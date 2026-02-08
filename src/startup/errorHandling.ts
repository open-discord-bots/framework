import {api, utilities} from "../index"

export function loadErrorHandling(opendiscord:api.ODMain,project:api.ODProjectType){
    process.on("uncaughtException",async (error,origin) => {
        try{
            const beforeEvent = opendiscord.events.get("onErrorHandling")
            if (beforeEvent) await beforeEvent.emit([error,origin])

            if (opendiscord.sharedFuses.getFuse("errorHandling")){
                //custom error messages for known errors
                if (error.message.toLowerCase().includes("used disallowed intents")){
                    //invalid intents
                    opendiscord.log(((project === "openticket") ? "Open Ticket" : "Open Moderation")+" doesn't work without Privileged Gateway Intents enabled!","error")
                    opendiscord.log("Enable them in the discord developer portal!","info")
                    console.log("\n")
                    process.exit(1)
                }else if (error.message.toLowerCase().includes("invalid discord bot token provided")){
                    //invalid token
                    opendiscord.log("An invalid discord auth token was provided!","error")
                    opendiscord.log("Check the config if you have inserted the bot token correctly!","info")
                    console.log("\n")
                    process.exit(1)
                }else{
                    //unknown error
                    const errmsg = new api.ODError(error,origin)
                    opendiscord.log(errmsg)
                    if (opendiscord.sharedFuses.getFuse("crashOnError")) process.exit(1)
                    
                    const afterEvent = opendiscord.events.get("afterErrorHandling")
                    if (afterEvent) await afterEvent.emit([error,origin,errmsg])
                }
            }
            
        }catch(err){
            console.log("[ERROR HANDLER ERROR]:",err)
        }
    })
}