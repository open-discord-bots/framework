import {api, utilities} from "../index"
import * as discord from "discord.js"
import * as fs from "fs"


/** ### What is this?
 * This is the `!OPENTICKET:dump` command.
 * It's a utility command which can only be used by the creator of Open Discord/Ticket/Moderation or the owner of the bot.
 * This command will send the `debug.txt` file in DM. It's not dangerous as the `debug.txt` file doesn't contain any sensitive data (only logs).
 * 
 * ### Why does it exist?
 * This command can be used to quickly get the `debug.txt` file without having access to the hosting
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
            //user is bot owner OR creator of Open Discord/Ticket/Moderation :)
            opendiscord.log("Dumped "+opendiscord.debugfile.filename+"!","system",[
                {key:"user",value:msg.author.username},
                {key:"id",value:msg.author.id}
            ])
            const debug = fs.readFileSync(opendiscord.debugfile.path)

            if (msg.channel.type != discord.ChannelType.GroupDM) msg.channel.send({content:"## The `"+opendiscord.debugfile.filename+"` dump is available!",files:[
                new discord.AttachmentBuilder(debug)
                    .setName(opendiscord.debugfile.filename)
                    .setDescription("The Open Discord debug dump!")
            ]})
        }
    })
}