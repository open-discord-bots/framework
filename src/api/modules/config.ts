///////////////////////////////////////
//CONFIG MODULE
///////////////////////////////////////
import { ODId, ODManager, ODManagerData, ODNoGeneric, ODPromiseVoid, ODSystemError, ODValidId, ODValidJsonType } from "./base.js"
import nodepath from "path"
import { ODDebugger } from "./console.js"
import fs from "fs"
import * as fjs from "formatted-json-stringify"
import { jsonc } from "jsonc"

/**## ODConfigManagerIdConstraint `type`
 * The constraint/layout for id mappings/interfaces of the `ODConfigManager` class.
 */
export type ODConfigManagerIdConstraint = Record<string,ODConfig<any>>

/**## ODConfigManager `class`
 * This is an Open Discord config manager.
 * 
 * It manages all config files in the bot and allows plugins to access config files from Open Discord & other plugins!
 * 
 * You can use this class to get/change/add a config file (`ODConfig`) in your plugin!
 */
export class ODConfigManager<IdList extends ODConfigManagerIdConstraint = ODConfigManagerIdConstraint> extends ODManager<ODConfig<any>> {
    constructor(debug:ODDebugger){
        super(debug,"config")
    }

    add(data:ODConfig<any>|ODConfig<any>[],overwrite?:boolean): boolean {
        if (this.debug){
            if (Array.isArray(data)){
                for (const d of data){
                    d.useDebug(this.debug)
                }
            }else data.useDebug(this.debug)
        }
        return super.add(data,overwrite)
    }
    /**Init all config files. */
    async init(){
        for (const config of this.getAll()){
            try{
                await config.init()
            }catch(err:any){
                process.emit("uncaughtException",new ODSystemError(err))
            }
        }
    }

    get<ConfigId extends keyof ODNoGeneric<IdList>>(id:ConfigId): IdList[ConfigId]
    get(id:ODValidId): ODConfig<any>|null
    
    get(id:ODValidId): ODConfig<any>|null {
        return super.get(id)
    }
    
    remove<ConfigId extends keyof ODNoGeneric<IdList>>(id:ConfigId): IdList[ConfigId]
    remove(id:ODValidId): ODConfig<any>|null
    
    remove(id:ODValidId): ODConfig<any>|null {
        return super.remove(id)
    }

    exists(id:keyof ODNoGeneric<IdList>): boolean
    exists(id:ODValidId): boolean
    
    exists(id:ODValidId): boolean {
        return super.exists(id)
    }
}

/**## ODConfig `class`
 * This is an Open Discord config helper.
 * This class doesn't do anything at all, it just gives a template & basic methods for a config. Use `ODJsonConfig` instead!
 * 
 * You can use this class if you want to create your own config implementation (e.g. `yml`, `xml`,...)!
 */
export abstract class ODConfig<Data extends any> extends ODManagerData {
    /**The name of the file with extension. */
    file: string = ""
    /**The path to the file relative to the main directory. */
    path: string = ""
    /**An object/array of the entire config file! Variables inside it can be edited while the bot is running! */
    data: Data
    /**Is this config already initiated? */
    initiated: boolean = false
    /**An array of listeners to run when the config gets reloaded. These are not executed on the initial loading. */
    protected reloadListeners: Function[] = []
    /**Alias to Open Discord debugger. */
    protected debug: ODDebugger|null = null

    constructor(id:ODValidId, data:any){
        super(id)
        this.data = data
    }

    /**Use the Open Discord debugger for logs. */
    useDebug(debug:ODDebugger|null){
        this.debug = debug
    }
    /**Init the config. */
    init(): ODPromiseVoid {
        this.initiated = true
        if (this.debug) this.debug.debug("Initiated config '"+this.file+"' in ODConfigManager.",[{key:"id",value:this.id.value}])
        //please implement this feature in your own config extension & extend this function.
    }
    /**Reload the config. Be aware that this doesn't update the config data everywhere in the bot! */
    reload(): ODPromiseVoid {
        if (this.debug) this.debug.debug("Reloaded config '"+this.file+"' in ODConfigManager.",[{key:"id",value:this.id.value}])
        //please implement this feature in your own config extension & extend this function.
    }
    /**Save the edited config to the filesystem. This is used by the Interactive Setup CLI. It's not recommended to use this while the bot is running. */
    save(): ODPromiseVoid {
        if (this.debug) this.debug.debug("Saved config '"+this.file+"' in ODConfigManager.",[{key:"id",value:this.id.value}])
        //please implement this feature in your own config extension & extend this function.
    }
    /**Listen for a reload of this JSON file! */
    onReload(cb:Function){
        this.reloadListeners.push(cb)
    }
    /**Remove all reload listeners. Not recommended! */
    removeAllReloadListeners(){
        this.reloadListeners = []
    }
}

/**## ODJsonConfig `class`
 * This is an Open Discord JSON config.
 * You can use this class to get & edit variables from the config files or to create your own JSON config!
 * @example
 * //create a config from: ./config/test.json with the id "some-config"
 * const config = new api.ODJsonConfig("some-config","test.json")
 * 
 * //create a config with custom dir: ./plugins/testplugin/test.json
 * const config = new api.ODJsonConfig("plugin-config","test.json","./plugins/testplugin/")
 */
export class ODJsonConfig<Data extends any> extends ODConfig<Data> {
    formatter: fjs.custom.BaseFormatter

    constructor(id:ODValidId, file:string, customPath?:string, formatter?:fjs.custom.BaseFormatter){
        super(id,{})
        this.file = (file.endsWith(".json")) ? file : file+".json"
        this.path = customPath ? nodepath.join("./",customPath,this.file) : nodepath.join("./config/",this.file)
        this.formatter = formatter ?? new fjs.DefaultFormatter(null,true,"    ")
    }

    /**Init the config. */
    init(): ODPromiseVoid {
        if (!fs.existsSync(this.path)) throw new ODSystemError("Unable to parse config \""+nodepath.join("./",this.path)+"\", the file doesn't exist!")
        try{
            this.data = JSON.parse(fs.readFileSync(this.path).toString())
            super.init()
        }catch(err){
            process.emit("uncaughtException",err)
            throw new ODSystemError("Unable to parse config \""+nodepath.join("./",this.path)+"\"!")
        }
    }
    /**Reload the config. Be aware that this doesn't update the config data everywhere in the bot! */
    reload(){
        if (!this.initiated) throw new ODSystemError("Unable to reload config \""+nodepath.join("./",this.path)+"\", the file hasn't been initiated yet!")
        if (!fs.existsSync(this.path)) throw new ODSystemError("Unable to reload config \""+nodepath.join("./",this.path)+"\", the file doesn't exist!")
        try{
            this.data = JSON.parse(fs.readFileSync(this.path).toString())
            super.reload()
            this.reloadListeners.forEach((cb) => {
                try{
                    cb()
                }catch(err){
                    process.emit("uncaughtException",err)
                }
            })
        }catch(err){
            process.emit("uncaughtException",err)
            throw new ODSystemError("Unable to reload config \""+nodepath.join("./",this.path)+"\"!")
        }
    }
    /**Save the edited config to the filesystem. This is used by the Interactive Setup CLI. It's not recommended to use this while the bot is running. */
    save(): ODPromiseVoid {
        if (!this.initiated) throw new ODSystemError("Unable to save config \""+nodepath.join("./",this.path)+"\", the file hasn't been initiated yet!")
        try{
            const contents = this.formatter.stringify(this.data as ODValidJsonType)
            fs.writeFileSync(this.path,contents)
            super.save()
        }catch(err){
            process.emit("uncaughtException",err)
            throw new ODSystemError("Unable to save config \""+nodepath.join("./",this.path)+"\"!")
        }
    }
}

/**## ODJsonCommentsConfig `class`
 * An Open Discord JSONC (`.jsonc`) config.  
 * Use this class to get & edit variables from the config files or to create your own JSON config!
 * @example
 * //create a config from: ./config/test.jsonc with the id "some-config"
 * const config = new api.ODJsonCommentsConfig("some-config","test.jsonc")
 * 
 * //create a config with custom dir: ./plugins/testplugin/test.jsonc
 * const config = new api.ODJsonCommentsConfig("plugin-config","test.jsonc","./plugins/testplugin/")
 */
export class ODJsonCommentsConfig<Data extends any> extends ODConfig<Data> {
    formatter: fjs.custom.BaseFormatter

    constructor(id:ODValidId, file:string, customPath?:string, formatter?:fjs.custom.BaseFormatter){
        super(id,{})
        this.file = (file.endsWith(".jsonc")) ? file : file+".jsonc"
        this.path = customPath ? nodepath.join("./",customPath,this.file) : nodepath.join("./config/",this.file)
        this.formatter = formatter ?? new fjs.DefaultFormatter(null,true,"    ")
    }

    /**Init the config. */
    init(): ODPromiseVoid {
        if (!fs.existsSync(this.path)) throw new ODSystemError("Unable to parse JSONC config \""+nodepath.join("./",this.path)+"\", the file doesn't exist!")
        try{
            this.data = jsonc.parse(fs.readFileSync(this.path).toString())
            super.init()
        }catch(err){
            process.emit("uncaughtException",err)
            throw new ODSystemError("Unable to parse JSONC config \""+nodepath.join("./",this.path)+"\"!")
        }
    }
    /**Reload the config. Be aware that this doesn't update the config data everywhere in the bot! */
    reload(){
        if (!this.initiated) throw new ODSystemError("Unable to reload JSONC config \""+nodepath.join("./",this.path)+"\", the file hasn't been initiated yet!")
        if (!fs.existsSync(this.path)) throw new ODSystemError("Unable to JSONC reload config \""+nodepath.join("./",this.path)+"\", the file doesn't exist!")
        try{
            this.data = jsonc.parse(fs.readFileSync(this.path).toString())
            super.reload()
            this.reloadListeners.forEach((cb) => {
                try{
                    cb()
                }catch(err){
                    process.emit("uncaughtException",err)
                }
            })
        }catch(err){
            process.emit("uncaughtException",err)
            throw new ODSystemError("Unable to reload JSONC config \""+nodepath.join("./",this.path)+"\"!")
        }
    }
    /**Save the edited config to the filesystem. This is used by the Interactive Setup CLI. It's not recommended to use this while the bot is running. */
    save(): ODPromiseVoid {
        if (!this.initiated) throw new ODSystemError("Unable to save JSONC config \""+nodepath.join("./",this.path)+"\", the file hasn't been initiated yet!")
        try{
            const contents = this.formatter.stringify(this.data as ODValidJsonType)
            fs.writeFileSync(this.path,contents)
            super.save()
        }catch(err){
            process.emit("uncaughtException",err)
            throw new ODSystemError("Unable to save JSONC config \""+nodepath.join("./",this.path)+"\"!")
        }
    }
}

/**## ODMemoryConfig `class`
 * An Open Discord memory config.  
 * This config lives in-memory and does not have any connection to the filesystem.
 * 
 * It is perfect for temporary configs or using the `ODChecker` without a real config file.
 */
export class ODMemoryConfig<Data extends any> extends ODConfig<Data> {
    constructor(id:ODValidId,data:Data){
        super(id,data)
    }
}