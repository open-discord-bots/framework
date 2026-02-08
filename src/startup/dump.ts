import {api, utilities} from "../index"
import * as discord from "discord.js"
import * as fs from "fs"


/** ### What is this?
 * This is the `!OPENTICKET:dump` command.
 * It's a utility command which can only be used by the creator of Open Discord/Ticket/Moderation or the owner of the bot.
 * This command will send the `otdebug.txt` file in DM. It's not dangerous as the `otdebug.txt` file doesn't contain any sensitive data (only logs).
 * 
 * ### Why does it exist?
 * This command can be used to quickly get the `otdebug.txt` file without having access to the hosting
 * in case you're helping someone with setting up (or debugging) Open Discord/Ticket/Moderation.
 * 
 * ### Can I disable it?
 * If you want to turn it off, you turn off the fuse using `opendiscord.sharedFuses.setFuse("allowDumpCommand",false)`
 */

export const loadDumpCommand = (opendiscord:api.ODMain) => {
    if (!opendiscord.sharedFuses.getFuse("allowDumpCommand")) return
    opendiscord.client.textCommands.add(new api.ODTextCommand("opendiscord:dump",{
        allowBots:false,
        guildPermission:true,
        dmPermission:true,
        name:"dump",
        prefix:"!OPENTICKET:"
    }))

    opendiscord.client.textCommands.onInteraction("!OPENTICKET:","dump",async (msg) => {
        if (msg.author.id == "779742674932072469" || opendiscord.permissions.hasPermissions("developer",await opendiscord.permissions.getPermissions(msg.author,msg.channel,null))){
            //user is bot owner OR creator of Open Ticket :)
            opendiscord.log("Dumped otdebug.txt!","system",[
                {key:"user",value:msg.author.username},
                {key:"id",value:msg.author.id}
            ])
            const debug = fs.readFileSync("./otdebug.txt")

            if (msg.channel.type != discord.ChannelType.GroupDM) msg.channel.send({content:"## The `otdebug.txt` dump is available!",files:[
                new discord.AttachmentBuilder(debug)
                    .setName("otdebug.txt")
                    .setDescription("The Open Ticket debug dump!")
            ]})
        }
    })
}