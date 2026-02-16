import * as api from "../api/index"
import * as utilities from "../utilities/index"
import {Terminal, terminal} from "terminal-kit"
import ansis from "ansis"
import {ODCliHeaderOpts, renderHeader} from "."

export class ODCliEditConfigInstance {
    private readonly opts: ODCliHeaderOpts
    private readonly opendiscord: api.ODMain

    constructor(opts:ODCliHeaderOpts,opendiscord:api.ODMain){
        this.opts = opts
        this.opendiscord = opendiscord
    }

    public async renderEditConfig(backFn:(() => api.ODPromiseVoid)){
        renderHeader(this.opts,[])
        terminal(ansis.bold.green("Please select which config you would like to edit.\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))

        const checkerList = this.opendiscord.checkers.getAll()
        const checkerNameList = checkerList.map((checker) => (checker.options.cliDisplayName ? checker.options.cliDisplayName+" ("+checker.config.file+")" : checker.config.file))
        const checkerNameLength = utilities.getLongestLength(checkerNameList)
        const finalCheckerNameList = checkerNameList.map((name,index) => name.padEnd(checkerNameLength+5," ")+ansis.gray(checkerList[index].options.cliDisplayDescription ? "=> "+checkerList[index].options.cliDisplayDescription : ""))
        
        const answer = await terminal.singleColumnMenu(finalCheckerNameList,{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise
        
        if (answer.canceled) return await backFn()
        const checker = checkerList[answer.selectedIndex]
        const configData = checker.config.data as api.ODValidJsonType
        await this.chooseConfigStructure(checker,async () => {await this.renderEditConfig(backFn)},checker.structure,configData,{},NaN,["("+checker.config.path+")"])
    }

    private async chooseConfigStructure(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),structure:api.ODCheckerStructure,data:api.ODValidJsonType,parent:object|any[],parentIndex:string|number,path:(string|number)[]){
        if (structure instanceof api.ODCheckerObjectStructure && typeof data == "object" && !Array.isArray(data) && data) await this.renderConfigObjectStructureSelector(checker,backFn,structure,data,parent,parentIndex,path)
        else if (structure instanceof api.ODCheckerEnabledObjectStructure && typeof data == "object" && !Array.isArray(data) && data) await this.renderConfigEnabledObjectStructureSelector(checker,backFn,structure,data,parent,parentIndex,path)
        else if (structure instanceof api.ODCheckerObjectSwitchStructure && typeof data == "object" && !Array.isArray(data) && data) await this.renderConfigObjectSwitchStructureSelector(checker,backFn,structure,data,parent,parentIndex,path)
        else if (structure instanceof api.ODCheckerArrayStructure && Array.isArray(data)) await this.renderConfigArrayStructureSelector(checker,backFn,structure,data,parent,parentIndex,path)
        else if (structure instanceof api.ODCheckerBooleanStructure && typeof data == "boolean") await this.renderConfigBooleanStructureEditor(checker,backFn,structure,data,parent,parentIndex,path)
        else if (structure instanceof api.ODCheckerNumberStructure && typeof data == "number") await this.renderConfigNumberStructureEditor(checker,backFn,structure,data,parent,parentIndex,path)
        else if (structure instanceof api.ODCheckerStringStructure && typeof data == "string") await this.renderConfigStringStructureEditor(checker,backFn,structure,data,parent,parentIndex,path)
        else if (structure instanceof api.ODCheckerNullStructure && data === null) await this.renderConfigNullStructureEditor(checker,backFn,structure,data,parent,parentIndex,path)
        else if (structure instanceof api.ODCheckerTypeSwitchStructure) await this.renderConfigTypeSwitchStructureEditor(checker,backFn,structure,data,parent,parentIndex,path)
        else terminal.red.bold("❌ Unable to detect type of variable! Please try to edit this property in the JSON file itself!")
    }

    private async renderConfigObjectStructureSelector(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),structure:api.ODCheckerObjectStructure,data:object,parent:object,parentIndex:string|number,path:(string|number)[]){
        if (typeof data != "object" || Array.isArray(data)) throw new api.ODSystemError("OD CLI => Property is not of the type 'object'. Please check your config for possible errors. (index: "+parentIndex+", path: "+path.join(".")+")")
        renderHeader(this.opts,path)
        terminal(ansis.bold.green("Please select which variable you would like to edit.\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))
        if (!structure.options.children) return await backFn()

        if (structure.options.cliDisplayName){
            terminal.gray("\nProperty: "+ansis.bold.blue(structure.options.cliDisplayName)+"\n")
            terminal.gray("Description: "+ansis.bold(structure.options.cliDisplayDescription ?? "/")+"\n")
        }
        
        const list = structure.options.children.filter((child) => !child.cliHideInEditMode)
        const nameList = list.map((child) => (child.checker.options.cliDisplayName ? child.checker.options.cliDisplayName : child.key))
        const nameLength = utilities.getLongestLength(nameList)
        const finalnameList = nameList.map((name,index) => name.padEnd(nameLength+5," ")+ansis.gray((!list[index].checker.options.cliHideDescriptionInParent && list[index].checker.options.cliDisplayDescription) ? "=> "+list[index].checker.options.cliDisplayDescription : ""))

        const answer = await terminal.singleColumnMenu(finalnameList,{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold.defaultColor,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise
        
        if (answer.canceled) return await backFn()
        const subStructure = list[answer.selectedIndex]
        const subData = data[subStructure.key]
        await this.chooseConfigStructure(checker,async () => {await this.renderConfigObjectStructureSelector(checker,backFn,structure,data,parent,parentIndex,path)},subStructure.checker,subData,data,subStructure.key,[...path,subStructure.key])
    }

    private async renderConfigEnabledObjectStructureSelector(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),structure:api.ODCheckerEnabledObjectStructure,data:object,parent:object,parentIndex:string|number,path:(string|number)[]){
        if (typeof data != "object" || Array.isArray(data)) throw new api.ODSystemError("OD CLI => Property is not of the type 'object'. Please check your config for possible errors. (index: "+parentIndex+", path: "+path.join(".")+")")
        const enabledProperty = structure.options.property
        const subStructure = structure.options.checker
        if (!enabledProperty || !subStructure || !subStructure.options.children) return await backFn()

        if (!subStructure.options.children.find((child) => child.key === structure.options.property)){
            if (typeof structure.options.enabledValue == "string") subStructure.options.children.unshift({key:enabledProperty,optional:false,priority:1,checker:new api.ODCheckerStringStructure("opendiscord:CLI-checker-enabled-object-structure",{})})
            else if (typeof structure.options.enabledValue == "number") subStructure.options.children.unshift({key:enabledProperty,optional:false,priority:1,checker:new api.ODCheckerNumberStructure("opendiscord:CLI-checker-enabled-object-structure",{})})
            else if (typeof structure.options.enabledValue == "boolean") subStructure.options.children.unshift({key:enabledProperty,optional:false,priority:1,checker:new api.ODCheckerBooleanStructure("opendiscord:CLI-checker-enabled-object-structure",{})})
        }

        await this.chooseConfigStructure(checker,backFn,subStructure,data,parent,parentIndex,path)
    }

    private async renderConfigObjectSwitchStructureSelector(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),structure:api.ODCheckerObjectSwitchStructure,data:object,parent:object,parentIndex:string|number,path:(string|number)[]){
        if (typeof data != "object" || Array.isArray(data)) throw new api.ODSystemError("OD CLI => Property is not of the type 'object'. Please check your config for possible errors. (index: "+parentIndex+", path: "+path.join(".")+")")
        if (!structure.options.objects) return await backFn()

        let didMatch: boolean = false
        for (const objectTemplate of structure.options.objects){
            if (objectTemplate.properties.every((prop) => data[prop.key] === prop.value)){
                //object template matches data
                const subStructure = objectTemplate.checker
                didMatch = true
                await this.chooseConfigStructure(checker,backFn,subStructure,data,parent,parentIndex,path)
            }
        }
        if (!didMatch) throw new api.ODSystemError("OD CLI => Unable to detect type of object in the object switch. Please check your config for possible errors. (index: "+parentIndex+", path: "+path.join(".")+")")
    }

    private async renderConfigArrayStructureSelector(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),structure:api.ODCheckerArrayStructure,data:any[],parent:object,parentIndex:string|number,path:(string|number)[]){
        if (!Array.isArray(data)) throw new api.ODSystemError("OD CLI => Property is not of the type 'array'. Please check your config for possible errors. (index: "+parentIndex+", path: "+path.join(".")+")")
        renderHeader(this.opts,path)
        terminal(ansis.bold.green("Please select what you would like to do.\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))
        if (!structure.options.propertyChecker) return await backFn()

        if (structure.options.cliDisplayName || typeof parentIndex == "string" || !isNaN(parentIndex)){
            terminal.gray("\nProperty: "+ansis.bold.blue(structure.options.cliDisplayName ?? parentIndex.toString())+"\n")
            terminal.gray("Description: "+ansis.bold(structure.options.cliDisplayDescription ?? "/")+"\n")
        }

        const propertyName = structure.options.cliDisplayPropertyName ?? "index"
        const answer = await terminal.singleColumnMenu(data.length < 1 ? ["Add "+propertyName] : [
            "Add "+propertyName,
            "Edit "+propertyName,
            "Move "+propertyName,
            "Remove "+propertyName,
            "Duplicate "+propertyName
        ],{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise
        
        const backFnFunc = async () => {await this.renderConfigArrayStructureSelector(checker,backFn,structure,data,parent,parentIndex,path)}

        if (answer.canceled) return await backFn()
        if (answer.selectedIndex == 0) await this.chooseAdditionConfigStructure(checker,backFnFunc,async (newData) => {
            data[data.length] = newData
            await checker.config.save()
            await backFnFunc()
        },structure.options.propertyChecker,data,data.length,path,[])
        else if (answer.selectedIndex == 1) await this.renderConfigArrayStructureEditSelector(checker,backFnFunc,structure,structure.options.propertyChecker,data,parent,parentIndex,path)
        else if (answer.selectedIndex == 2) await this.renderConfigArrayStructureMoveSelector(checker,backFnFunc,structure,structure.options.propertyChecker,data,parent,parentIndex,path)
        else if (answer.selectedIndex == 3) await this.renderConfigArrayStructureRemoveSelector(checker,backFnFunc,structure,structure.options.propertyChecker,data,parent,parentIndex,path)
        else if (answer.selectedIndex == 4) await this.renderConfigArrayStructureDuplicateSelector(checker,backFnFunc,structure,structure.options.propertyChecker,data,parent,parentIndex,path)
    }

    private async renderConfigArrayStructureEditSelector(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),arrayStructure:api.ODCheckerArrayStructure,structure:api.ODCheckerStructure,data:any[],parent:object,parentIndex:string|number,path:(string|number)[]){
        const propertyName = arrayStructure.options.cliDisplayPropertyName ?? "index"
        renderHeader(this.opts,path)
        terminal(ansis.bold.green("Please select the "+propertyName+" you would like to edit.\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))

        const longestDataListName = Math.max(...data.map((d,i) => this.getArrayPreviewStructureNameLength(structure,d,data,i)))
        const dataList = data.map((d,i) => (i+1)+". "+this.getArrayPreviewFromStructure(structure,d,data,i,longestDataListName))
        const dataAnswer = await terminal.singleColumnMenu(dataList,{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise

        if (dataAnswer.canceled) return await backFn()
        const subData = data[dataAnswer.selectedIndex]
        await this.chooseConfigStructure(checker,async () => {await this.renderConfigArrayStructureEditSelector(checker,backFn,arrayStructure,structure,data,parent,parentIndex,path)},structure,subData,data,dataAnswer.selectedIndex,[...path,dataAnswer.selectedIndex])
    }

    private async renderConfigArrayStructureMoveSelector(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),arrayStructure:api.ODCheckerArrayStructure,structure:api.ODCheckerStructure,data:any[],parent:object,parentIndex:string|number,path:(string|number)[]){
        const propertyName = arrayStructure.options.cliDisplayPropertyName ?? "index"
        renderHeader(this.opts,path)
        terminal(ansis.bold.green("Please select the "+propertyName+" you would like to move.\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))
        
        const longestDataListName = Math.max(...data.map((d,i) => this.getArrayPreviewStructureNameLength(structure,d,data,i)))
        const dataList = data.map((d,i) => (i+1)+". "+this.getArrayPreviewFromStructure(structure,d,data,i,longestDataListName))
        const dataAnswer = await terminal.singleColumnMenu(dataList,{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise

        if (dataAnswer.canceled) return await backFn()
        
        renderHeader(this.opts,[...path,dataAnswer.selectedIndex])
        terminal(ansis.bold.green("Please select the position you would like to move to.\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))

        const moveAnswer = await terminal.singleColumnMenu(data.map((d,i) => "Position "+(i+1)),{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise
        
        if (moveAnswer.canceled) return await this.renderConfigArrayStructureMoveSelector(checker,backFn,arrayStructure,structure,data,parent,parentIndex,path)
        
        const subData = data[dataAnswer.selectedIndex]
        const slicedData = [...data.slice(0,dataAnswer.selectedIndex),...data.slice(dataAnswer.selectedIndex+1)]
        const insertedData = [...slicedData.slice(0,moveAnswer.selectedIndex),subData,...slicedData.slice(moveAnswer.selectedIndex)]
        insertedData.forEach((d,i) => data[i] = d)

        await checker.config.save()
        terminal.bold.blue("\n\n✅ Property moved succesfully!")
        await utilities.timer(400)
        await backFn()
    }

    private async renderConfigArrayStructureRemoveSelector(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),arrayStructure:api.ODCheckerArrayStructure,structure:api.ODCheckerStructure,data:any[],parent:object,parentIndex:string|number,path:(string|number)[]){
        const propertyName = arrayStructure.options.cliDisplayPropertyName ?? "index"
        renderHeader(this.opts,path)
        terminal(ansis.bold.green("Please select the "+propertyName+" you would like to delete.\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))
        
        const longestDataListName = Math.max(...data.map((d,i) => this.getArrayPreviewStructureNameLength(structure,d,data,i)))
        const dataList = data.map((d,i) => (i+1)+". "+this.getArrayPreviewFromStructure(structure,d,data,i,longestDataListName))
        const dataAnswer = await terminal.singleColumnMenu(dataList,{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise

        if (dataAnswer.canceled) return await backFn()
        data.splice(dataAnswer.selectedIndex,1)

        await checker.config.save()
        terminal.bold.blue("\n\n✅ Property deleted succesfully!")
        await utilities.timer(400)
        await backFn()
    }

    private async renderConfigArrayStructureDuplicateSelector(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),arrayStructure:api.ODCheckerArrayStructure,structure:api.ODCheckerStructure,data:any[],parent:object,parentIndex:string|number,path:(string|number)[]){
        const propertyName = arrayStructure.options.cliDisplayPropertyName ?? "index"
        renderHeader(this.opts,path)
        terminal(ansis.bold.green("Please select the "+propertyName+" you would like to duplicate.\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))

        const longestDataListName = Math.max(...data.map((d,i) => this.getArrayPreviewStructureNameLength(structure,d,data,i)))
        const dataList = data.map((d,i) => (i+1)+". "+this.getArrayPreviewFromStructure(structure,d,data,i,longestDataListName))
        const dataAnswer = await terminal.singleColumnMenu(dataList,{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise

        if (dataAnswer.canceled) return await backFn()
        data.push(JSON.parse(JSON.stringify(data[dataAnswer.selectedIndex])))

        await checker.config.save()
        terminal.bold.blue("\n\n✅ Property duplicated succesfully!")
        await utilities.timer(400)
        await backFn()
    }

    private async renderConfigBooleanStructureEditor(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),structure:api.ODCheckerBooleanStructure,data:boolean,parent:object,parentIndex:string|number,path:(string|number)[]){
        if (typeof data != "boolean") throw new api.ODSystemError("OD CLI => Property is not of the type 'boolean'. Please check your config for possible errors. (index: "+parentIndex+", path: "+path.join(".")+")")
        renderHeader(this.opts,path)
        terminal(ansis.bold.green("You are now editing "+(typeof parentIndex == "string" ? "the boolean property "+ansis.blue("\""+parentIndex+"\"") : "boolean property "+ansis.blue("#"+(parentIndex+1)))+".\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))
        
        terminal.gray("\nCurrent value: "+ansis.bold[data ? "green" : "red"](data.toString())+"\n")
        terminal.gray("Description: "+ansis.bold(structure.options.cliDisplayDescription ?? "/")+"\n")

        const answer = await terminal.singleColumnMenu(["false (Disabled)","true (Enabled)"],{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise
        
        if (answer.canceled) return await backFn()
        
        //run config checker
        const newValue = (answer.selectedIndex == 0) ? false : true
        const newPath = [...path]
        newPath.shift()
        checker.messages = [] //manually clear previous messages
        const isDataValid = structure.check(checker,newValue,newPath)

        if (isDataValid){
            parent[parentIndex] = newValue

            await checker.config.save()
            terminal.bold.blue("\n\n✅ Variable saved succesfully!")
            await utilities.timer(400)
            await backFn()
        }else{
            const messages = checker.messages.map((msg) => "=> ["+msg.type.toUpperCase()+"] "+msg.message).join("\n")
            terminal.bold.blue("\n\n❌ Variable is invalid! Please try again!")
            terminal.gray("\n"+messages)
            await utilities.timer(1000+(2000*checker.messages.length))
            await this.renderConfigBooleanStructureEditor(checker,backFn,structure,data,parent,parentIndex,path)
        }
    }

    private async renderConfigNumberStructureEditor(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),structure:api.ODCheckerNumberStructure,data:number,parent:object,parentIndex:string|number,path:(string|number)[],prefillValue?:string){
        if (typeof data != "number") throw new api.ODSystemError("OD CLI => Property is not of the type 'number'. Please check your config for possible errors. (index: "+parentIndex+", path: "+path.join(".")+")")
        renderHeader(this.opts,path)
        terminal(ansis.bold.green("You are now editing "+(typeof parentIndex == "string" ? "the number property "+ansis.blue("\""+parentIndex+"\"") : "number property "+ansis.blue("#"+(parentIndex+1)))+".\n")+ansis.italic.gray("(insert a new value and press enter, go back using escape)\n"))
        
        terminal.gray("\nCurrent value: "+ansis.bold.blue(data.toString())+"\n")
        terminal.gray("Description: "+ansis.bold(structure.options.cliDisplayDescription ?? "/")+"\n")

        const answer = await terminal.inputField({
            default:prefillValue,
            style:terminal.cyan,
            cancelable:true
        }).promise
        
        if (typeof answer != "string") return await backFn()
        
        //run config checker
        const newValue = Number(answer.replaceAll(",","."))
        const newPath = [...path]
        newPath.shift()
        checker.messages = [] //manually clear previous messages
        const isDataValid = structure.check(checker,newValue,newPath)

        if (isDataValid){
            parent[parentIndex] = newValue

            await checker.config.save()
            terminal.bold.blue("\n\n✅ Variable saved succesfully!")
            await utilities.timer(400)
            await backFn()
        }else{
            const messages = checker.messages.map((msg) => "=> ["+msg.type.toUpperCase()+"] "+msg.message).join("\n")
            terminal.bold.blue("\n\n❌ Variable is invalid! Please try again!")
            terminal.red("\n"+messages)
            await utilities.timer(1000+(2000*checker.messages.length))
            await this.renderConfigNumberStructureEditor(checker,backFn,structure,data,parent,parentIndex,path,answer)
        }
    }

    private async renderConfigStringStructureEditor(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),structure:api.ODCheckerStringStructure,data:string,parent:object,parentIndex:string|number,path:(string|number)[],prefillValue?:string){
        if (typeof data != "string") throw new api.ODSystemError("OD CLI => Property is not of the type 'string'. Please check your config for possible errors. (index: "+parentIndex+", path: "+path.join(".")+")")
        renderHeader(this.opts,path)
        terminal(ansis.bold.green("You are now editing "+(typeof parentIndex == "string" ? "the string property "+ansis.blue("\""+parentIndex+"\"") : "string property "+ansis.blue("#"+(parentIndex+1)))+".\n")+ansis.italic.gray("(insert a new value and press enter, go back using escape)\n"))
        
        terminal.gray("\nCurrent value:"+(data.includes("\n") ? "\n" : " \"")+ansis.bold.blue(data)+ansis.gray(!data.includes("\n") ? "\"\n" : "\n"))
        terminal.gray("Description: "+ansis.bold(structure.options.cliDisplayDescription ?? "/")+"\n")

        const customExtraOptions = (structure instanceof api.ODCheckerCustomStructure_DiscordId) ? structure.extraOptions : undefined
        const customAutocompleteFunc = structure.options.cliAutocompleteFunc ? await structure.options.cliAutocompleteFunc() : null
        const autocompleteList = ((customAutocompleteFunc ?? structure.options.cliAutocompleteList) ?? customExtraOptions) ?? structure.options.choices
        const autoCompleteMenuOpts: Terminal.SingleLineMenuOptions = {
            style:terminal.white,
            selectedStyle:terminal.bgBlue.white
        }

        const input = terminal.inputField({
            default:prefillValue,
            style:terminal.cyan,
            hintStyle:terminal.gray,
            cancelable:false,
            autoComplete:autocompleteList,
            autoCompleteHint:(!!autocompleteList),
            autoCompleteMenu:(autocompleteList) ? autoCompleteMenuOpts as Terminal.Autocompletion : false
        })

        terminal.on("key",async (name:string,matches:string[],data:object) => {
            if (name == "ESCAPE"){
                terminal.removeListener("key","cli-render-string-structure-edit")
                input.abort()
                await backFn()
            }
        },({id:"cli-render-string-structure-edit"} as any))

        const answer = await input.promise
        terminal.removeListener("key","cli-render-string-structure-edit")
        if (typeof answer != "string") return

        //run config checker
        const newValue = answer.replaceAll("\\n","\n")
        const newPath = [...path]
        newPath.shift()
        checker.messages = [] //manually clear previous messages
        const isDataValid = structure.check(checker,newValue,newPath)

        if (isDataValid){
            parent[parentIndex] = newValue

            await checker.config.save()
            terminal.bold.blue("\n\n✅ Variable saved succesfully!")
            await utilities.timer(400)
            await backFn()
        }else{
            const messages = checker.messages.map((msg) => "=> ["+msg.type.toUpperCase()+"] "+msg.message).join("\n")
            terminal.bold.blue("\n\n❌ Variable is invalid! Please try again!")
            terminal.red("\n"+messages)
            await utilities.timer(1000+(2000*checker.messages.length))
            await this.renderConfigStringStructureEditor(checker,backFn,structure,data,parent,parentIndex,path,answer)
        }
    }

    private async renderConfigNullStructureEditor(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),structure:api.ODCheckerNullStructure,data:null,parent:object,parentIndex:string|number,path:(string|number)[]){
        if (data !== null) throw new api.ODSystemError("OD CLI => Property is not of the type 'null'. Please check your config for possible errors. (index: "+parentIndex+", path: "+path.join(".")+")")
        renderHeader(this.opts,path)
        terminal(ansis.bold.green("You are now editing "+(typeof parentIndex == "string" ? "the null property "+ansis.blue("\""+parentIndex+"\"") : "null property "+ansis.blue("#"+(parentIndex+1)))+".\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))
        
        terminal.gray("\nCurrent value: "+ansis.bold.blue("null")+"\n")
        terminal.gray("Description: "+ansis.bold(structure.options.cliDisplayDescription ?? "/")+"\n")

        const answer = await terminal.singleColumnMenu(["null"],{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise
        
        if (answer.canceled) return await backFn()
        
        //run config checker
        const newValue = null
        const newPath = [...path]
        newPath.shift()
        checker.messages = [] //manually clear previous messages
        const isDataValid = structure.check(checker,newValue,newPath)

        if (isDataValid){
            parent[parentIndex] = newValue

            await checker.config.save()
            terminal.bold.blue("\n\n✅ Variable saved succesfully!")
            await utilities.timer(400)
            await backFn()
        }else{
            const messages = checker.messages.map((msg) => "=> ["+msg.type.toUpperCase()+"] "+msg.message).join("\n")
            terminal.bold.blue("\n\n❌ Variable is invalid! Please try again!")
            terminal.red("\n"+messages)
            await utilities.timer(1000+(2000*checker.messages.length))
            await this.renderConfigNullStructureEditor(checker,backFn,structure,data,parent,parentIndex,path)
        }
    }

    private async renderConfigTypeSwitchStructureEditor(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),structure:api.ODCheckerTypeSwitchStructure,data:any,parent:object,parentIndex:string|number,path:(string|number)[]){
        renderHeader(this.opts,path)
        terminal(ansis.bold.green("You are now editing "+(typeof parentIndex == "string" ? "the property "+ansis.blue("\""+parentIndex+"\"") : "property "+ansis.blue("#"+(parentIndex+1)))+".\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))
        
        terminal.gray("\nCurrent value: "+ansis.bold.blue(data.toString())+"\n")
        terminal.gray("Description: "+ansis.bold(structure.options.cliDisplayDescription ?? "/")+"\n")

        const actionsList: string[] = []
        if (structure.options.boolean) actionsList.push("Edit as boolean")
        if (structure.options.string) actionsList.push("Edit as string")
        if (structure.options.number) actionsList.push("Edit as number")
        if (structure.options.object) actionsList.push("Edit as object")
        if (structure.options.array) actionsList.push("Edit as array/list")
        if (structure.options.null) actionsList.push("Edit as null")
        
        const answer = await terminal.singleColumnMenu(actionsList,{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise
        
        if (answer.canceled) return await backFn()
        
        //run selected structure editor (untested)
        if (answer.selectedText.startsWith("Edit as boolean") && structure.options.boolean) await this.renderConfigBooleanStructureEditor(checker,async () => {await this.renderConfigTypeSwitchStructureEditor(checker,backFn,structure,data,parent,parentIndex,path)},structure.options.boolean,false,parent,parentIndex,path)
        else if (answer.selectedText.startsWith("Edit as string") && structure.options.string) await this.renderConfigStringStructureEditor(checker,async () => {await this.renderConfigTypeSwitchStructureEditor(checker,backFn,structure,data,parent,parentIndex,path)},structure.options.string,data.toString(),parent,parentIndex,path)
        else if (answer.selectedText.startsWith("Edit as number") && structure.options.number) await this.renderConfigNumberStructureEditor(checker,async () => {await this.renderConfigTypeSwitchStructureEditor(checker,backFn,structure,data,parent,parentIndex,path)},structure.options.number,0,parent,parentIndex,path)
        else if (answer.selectedText.startsWith("Edit as object") && structure.options.object) await this.renderConfigObjectStructureSelector(checker,async () => {await this.renderConfigTypeSwitchStructureEditor(checker,backFn,structure,data,parent,parentIndex,path)},structure.options.object,data,parent,parentIndex,path)
        else if (answer.selectedText.startsWith("Edit as array/list") && structure.options.array) await this.renderConfigArrayStructureSelector(checker,async () => {await this.renderConfigTypeSwitchStructureEditor(checker,backFn,structure,data,parent,parentIndex,path)},structure.options.array,data,parent,parentIndex,path)
        else if (answer.selectedText.startsWith("Edit as null") && structure.options.null) await this.renderConfigNullStructureEditor(checker,async () => {await this.renderConfigTypeSwitchStructureEditor(checker,backFn,structure,data,parent,parentIndex,path)},structure.options.null,null,parent,parentIndex,path)
    }

    private getArrayPreviewStructureNameLength(structure:api.ODCheckerStructure,data:api.ODValidJsonType,parent:object,parentIndex:string|number): number {
        if (structure instanceof api.ODCheckerBooleanStructure && typeof data == "boolean") return data.toString().length
        else if (structure instanceof api.ODCheckerNumberStructure && typeof data == "number") return data.toString().length
        else if (structure instanceof api.ODCheckerStringStructure && typeof data == "string") return data.length
        else if (structure instanceof api.ODCheckerNullStructure && data === null) return "Null".length
        else if (structure instanceof api.ODCheckerArrayStructure && Array.isArray(data)) return "Array".length
        else if (structure instanceof api.ODCheckerObjectStructure && typeof data == "object" && !Array.isArray(data) && data){
            if (!structure.options.cliDisplayKeyInParentArray) return "Object".length
            else return data[structure.options.cliDisplayKeyInParentArray].toString().length

        }else if (structure instanceof api.ODCheckerEnabledObjectStructure && typeof data == "object" && !Array.isArray(data) && data){
            const subStructure = structure.options.checker
            if (!subStructure) return "<unknown-property>".length
            return this.getArrayPreviewStructureNameLength(subStructure,data,parent,parentIndex)

        }else if (structure instanceof api.ODCheckerObjectSwitchStructure && typeof data == "object" && !Array.isArray(data) && data){
            for (const objectTemplate of (structure.options.objects ?? [])){
                if (objectTemplate.properties.every((prop) => data[prop.key] === prop.value)){
                    //object template matches data
                    const subStructure = objectTemplate.checker
                    return this.getArrayPreviewStructureNameLength(subStructure,data,parent,parentIndex)
                }
            }
            return "<unknown-property>".length

        }else if (structure instanceof api.ODCheckerTypeSwitchStructure){
            if (typeof data == "boolean" && structure.options.boolean) return this.getArrayPreviewStructureNameLength(structure.options.boolean,data,parent,parentIndex)
            else if (typeof data == "number" && structure.options.number) return this.getArrayPreviewStructureNameLength(structure.options.number,data,parent,parentIndex)
            else if (typeof data == "string" && structure.options.string) return this.getArrayPreviewStructureNameLength(structure.options.string,data,parent,parentIndex)
            else if (typeof data == "object" && !Array.isArray(data) && data && structure.options.object) return this.getArrayPreviewStructureNameLength(structure.options.object,data,parent,parentIndex)
            else if (Array.isArray(data) && structure.options.array) return this.getArrayPreviewStructureNameLength(structure.options.array,data,parent,parentIndex)
            else if (data === null && structure.options.null) return this.getArrayPreviewStructureNameLength(structure.options.null,data,parent,parentIndex)
            else return "<unknown-property>".length
        }else return "<unknown-property>".length
    }

    private getArrayPreviewFromStructure(structure:api.ODCheckerStructure,data:api.ODValidJsonType,parent:object,parentIndex:string|number,nameLength:number): string {
        if (structure instanceof api.ODCheckerBooleanStructure && typeof data == "boolean") return data.toString()
        else if (structure instanceof api.ODCheckerNumberStructure && typeof data == "number") return data.toString()
        else if (structure instanceof api.ODCheckerStringStructure && typeof data == "string") return data
        else if (structure instanceof api.ODCheckerNullStructure && data === null) return "Null"
        else if (structure instanceof api.ODCheckerArrayStructure && Array.isArray(data)) return "Array"
        else if (structure instanceof api.ODCheckerObjectStructure && typeof data == "object" && !Array.isArray(data) && data){
            const additionalKeys = (structure.options.cliDisplayAdditionalKeysInParentArray ?? []).map((key) => key+": "+data[key].toString()).join(", ")
            if (!structure.options.cliDisplayKeyInParentArray) return "Object"
            else return data[structure.options.cliDisplayKeyInParentArray].toString().padEnd(nameLength+5," ")+ansis.gray(additionalKeys.length > 0 ? "("+additionalKeys+")" : "")

        }else if (structure instanceof api.ODCheckerEnabledObjectStructure && typeof data == "object" && !Array.isArray(data) && data){
            const subStructure = structure.options.checker
            if (!subStructure) return "<unknown-property>"
            return this.getArrayPreviewFromStructure(subStructure,data,parent,parentIndex,nameLength)

        }else if (structure instanceof api.ODCheckerObjectSwitchStructure && typeof data == "object" && !Array.isArray(data) && data){
            for (const objectTemplate of (structure.options.objects ?? [])){
                if (objectTemplate.properties.every((prop) => data[prop.key] === prop.value)){
                    //object template matches data
                    const subStructure = objectTemplate.checker
                    return this.getArrayPreviewFromStructure(subStructure,data,parent,parentIndex,nameLength)
                }
            }
            return "<unknown-property>"

        }else if (structure instanceof api.ODCheckerTypeSwitchStructure){
            if (typeof data == "boolean" && structure.options.boolean) return this.getArrayPreviewFromStructure(structure.options.boolean,data,parent,parentIndex,nameLength)
            else if (typeof data == "number" && structure.options.number) return this.getArrayPreviewFromStructure(structure.options.number,data,parent,parentIndex,nameLength)
            else if (typeof data == "string" && structure.options.string) return this.getArrayPreviewFromStructure(structure.options.string,data,parent,parentIndex,nameLength)
            else if (typeof data == "object" && !Array.isArray(data) && data && structure.options.object) return this.getArrayPreviewFromStructure(structure.options.object,data,parent,parentIndex,nameLength)
            else if (Array.isArray(data) && structure.options.array) return this.getArrayPreviewFromStructure(structure.options.array,data,parent,parentIndex,nameLength)
            else if (data === null && structure.options.null) return this.getArrayPreviewFromStructure(structure.options.null,data,parent,parentIndex,nameLength)
            else return "<unknown-property>"
        }else return "<unknown-property>"
    }

    private async chooseAdditionConfigStructure(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),nextFn:((data:any) => api.ODPromiseVoid),structure:api.ODCheckerStructure,parent:object|any[],parentIndex:string|number,path:(string|number)[],localPath:(string|number)[]){
        if (structure instanceof api.ODCheckerObjectStructure) await this.renderAdditionConfigObjectStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)
        else if (structure instanceof api.ODCheckerBooleanStructure) await this.renderAdditionConfigBooleanStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)
        else if (structure instanceof api.ODCheckerNumberStructure) await this.renderAdditionConfigNumberStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)
        else if (structure instanceof api.ODCheckerStringStructure) await this.renderAdditionConfigStringStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)
        else if (structure instanceof api.ODCheckerNullStructure) await this.renderAdditionConfigNullStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)
        else if (structure instanceof api.ODCheckerEnabledObjectStructure) await this.renderAdditionConfigEnabledObjectStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)
        else if (structure instanceof api.ODCheckerObjectSwitchStructure) await this.renderAdditionConfigObjectSwitchStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)
        else if (structure instanceof api.ODCheckerArrayStructure) await this.renderAdditionConfigArrayStructureSelector(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)
        else if (structure instanceof api.ODCheckerTypeSwitchStructure) await this.renderAdditionConfigTypeSwitchStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)
        else await backFn()
    }

    private async renderAdditionConfigObjectStructure(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),nextFn:((data:any) => api.ODPromiseVoid),structure:api.ODCheckerObjectStructure,parent:object|any[],parentIndex:string|number,path:(string|number)[],localPath:(string|number)[],localData:object={}){
        const children = structure.options.children ?? []
        const skipKeys = (structure.options.cliInitSkipKeys ?? [])
        //add skipped properties
        for (const key of skipKeys){
            const childStructure = children.find((c) => c.key == key)
            if (childStructure){
                const defaultValue = childStructure.checker.options.cliInitDefaultValue
                if (childStructure.checker instanceof api.ODCheckerBooleanStructure) localData[key] = (typeof defaultValue == "boolean" ? defaultValue : false)
                else if (childStructure.checker instanceof api.ODCheckerNumberStructure) localData[key] = (typeof defaultValue == "number" ? defaultValue : 0)
                else if (childStructure.checker instanceof api.ODCheckerStringStructure) localData[key] = (typeof defaultValue == "string" ? defaultValue : "")
                else if (childStructure.checker instanceof api.ODCheckerNullStructure) localData[key] = (defaultValue === null ? defaultValue : null)
                else if (childStructure.checker instanceof api.ODCheckerArrayStructure) localData[key] = (Array.isArray(defaultValue) ? JSON.parse(JSON.stringify(defaultValue)) : [])
                else if (childStructure.checker instanceof api.ODCheckerObjectStructure) localData[key] = ((typeof defaultValue == "object" && !Array.isArray(defaultValue) && defaultValue) ? JSON.parse(JSON.stringify(defaultValue)) : {})
                else if (childStructure.checker instanceof api.ODCheckerObjectSwitchStructure) localData[key] = ((typeof defaultValue == "object" && !Array.isArray(defaultValue) && defaultValue) ? JSON.parse(JSON.stringify(defaultValue)) : {})
                else if (childStructure.checker instanceof api.ODCheckerEnabledObjectStructure) localData[key] = ((typeof defaultValue == "object" && !Array.isArray(defaultValue) && defaultValue) ? JSON.parse(JSON.stringify(defaultValue)) : {})
                else if (childStructure.checker instanceof api.ODCheckerTypeSwitchStructure && typeof defaultValue != "undefined") localData[key] = JSON.parse(JSON.stringify(defaultValue))
                else throw new api.ODSystemError("OD CLI => Object skip key has an invalid checker structure! key: "+key)
            }
        }

        //add properties that need to be configured
        const configChildren = children.filter((c) => !skipKeys.includes(c.key)).map((c) => {return {key:c.key,checker:c.checker}})
        await this.configureAdditionObjectProperties(checker,configChildren,0,localData,[...path,parentIndex],(typeof parentIndex == "number") ? [...localPath] : [...localPath,parentIndex],async () => {
            //go back to previous screen
            await backFn()
        },async () => {
            //finish setup
            terminal.bold.blue("\n\n✅ Variable saved succesfully!")
            await utilities.timer(400)
            await nextFn(localData)
        })
    }

    private async configureAdditionObjectProperties(checker:api.ODChecker,children:{key:string,checker:api.ODCheckerStructure}[],currentIndex:number,localData:object,path:(string|number)[],localPath:(string|number)[],backFn:(() => api.ODPromiseVoid),nextFn:(() => api.ODPromiseVoid)){
        if (children.length < 1) return await nextFn()
        
        const child = children[currentIndex]
        await this.chooseAdditionConfigStructure(checker,async () => {
            if (children[currentIndex-1]) await this.configureAdditionObjectProperties(checker,children,currentIndex-1,localData,path,localPath,backFn,nextFn)
            else await backFn()
        },async (data) => {
            localData[child.key] = data
            if (children[currentIndex+1]) await this.configureAdditionObjectProperties(checker,children,currentIndex+1,localData,path,localPath,backFn,nextFn)
            else await nextFn()
        },child.checker,localData,child.key,path,localPath)
    }

    private async renderAdditionConfigEnabledObjectStructure(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),nextFn:((data:any) => api.ODPromiseVoid),structure:api.ODCheckerEnabledObjectStructure,parent:object|any[],parentIndex:string|number,path:(string|number)[],localPath:(string|number)[]){
        const enabledProperty = structure.options.property
        const enabledValue = structure.options.enabledValue
        const subStructure = structure.options.checker
        if (!enabledProperty || !subStructure || !subStructure.options.children) return await backFn()
        
        let propertyStructure: api.ODCheckerBooleanStructure|api.ODCheckerNumberStructure|api.ODCheckerStringStructure
        if (typeof enabledValue == "string") propertyStructure = new api.ODCheckerStringStructure("opendiscord:CLI-checker-enabled-object-structure",{})
        else if (typeof enabledValue == "number") propertyStructure = new api.ODCheckerNumberStructure("opendiscord:CLI-checker-enabled-object-structure",{})
        else if (typeof enabledValue == "boolean") propertyStructure = new api.ODCheckerBooleanStructure("opendiscord:CLI-checker-enabled-object-structure",{})
        else throw new Error("OD CLI => enabled object structure has an invalid type of enabledProperty. It must be a primitive boolean/number/string.")

        const localData = {}
        await this.chooseAdditionConfigStructure(checker,backFn,async (data) => {
            if (data === enabledValue) await this.renderAdditionConfigObjectStructure(checker,async () => {await this.renderAdditionConfigEnabledObjectStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)},nextFn,subStructure,parent,parentIndex,path,localPath,localData)
            else{
                localData[enabledProperty] = data
                //copy old object checker to new object checker => all options get de-referenced (this is needed for the new object skip keys are temporary)
                const newStructure = new api.ODCheckerObjectStructure(subStructure.id,{children:[]})
                
                //copy all options over to the new checker
                newStructure.options.children = [...subStructure.options.children]
                newStructure.options.cliInitSkipKeys = subStructure.options.children.map((child) => child.key)
                for (const key of Object.keys(subStructure.options)){
                    if (key != "children" && key != "cliInitSkipKeys") newStructure.options[key] = subStructure.options[key]
                }

                //adds all properties to object as "skipKeys", then continues to next function
                await this.renderAdditionConfigObjectStructure(checker,async () => {await this.renderAdditionConfigEnabledObjectStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)},nextFn,newStructure,parent,parentIndex,path,localPath,localData)
                await nextFn(localData)
            }
        },propertyStructure,localData,enabledProperty,[...path,parentIndex],[...localPath,parentIndex])
    }

    private async renderAdditionConfigObjectSwitchStructure(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),nextFn:((data:any) => api.ODPromiseVoid),structure:api.ODCheckerObjectSwitchStructure,parent:object|any[],parentIndex:string|number,path:(string|number)[],localPath:(string|number)[]){
        renderHeader(this.opts,[...path,parentIndex])
        terminal(ansis.bold.green("What type of object would you like to add?\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))

        const answer = await terminal.singleColumnMenu(structure.options.objects.map((obj) => obj.name),{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise
        
        if (answer.canceled) return await backFn()
        const objectTemplate = structure.options.objects[answer.selectedIndex]

        //copy old object checker to new object checker => all options get de-referenced (this is needed for the new object switch properties which are temporary)
        const oldStructure = objectTemplate.checker
        const newStructure = new api.ODCheckerObjectStructure(oldStructure.id,{children:[]})
        
        //copy all options over to the new checker
        newStructure.options.children = [...oldStructure.options.children]
        newStructure.options.cliInitSkipKeys = [...(oldStructure.options.cliInitSkipKeys ?? [])]
        for (const key of Object.keys(oldStructure.options)){
            if (key != "children" && key != "cliInitSkipKeys") newStructure.options[key] = oldStructure.options[key]
        }

        //add the keys of the object switch properties to the 'cliInitSkipKeys' because they need to be skipped.
        objectTemplate.properties.map((p) => p.key).forEach((p) => {
            if (!newStructure.options.cliInitSkipKeys) newStructure.options.cliInitSkipKeys = [p]
            else if (!newStructure.options.cliInitSkipKeys.includes(p)) newStructure.options.cliInitSkipKeys.push(p)
        })

        //add structure checkers for all properties
        for (const prop of objectTemplate.properties){
            if (!newStructure.options.children.find((child) => child.key === prop.key)){
                if (typeof prop.value == "string") newStructure.options.children.unshift({key:prop.key,optional:false,priority:1,checker:new api.ODCheckerStringStructure("opendiscord:CLI-checker-object-switch-structure",{cliInitDefaultValue:prop.value})})
                else if (typeof prop.value == "number") newStructure.options.children.unshift({key:prop.key,optional:false,priority:1,checker:new api.ODCheckerNumberStructure("opendiscord:CLI-checker-object-switch-structure",{cliInitDefaultValue:prop.value})})
                else if (typeof prop.value == "boolean") newStructure.options.children.unshift({key:prop.key,optional:false,priority:1,checker:new api.ODCheckerBooleanStructure("opendiscord:CLI-checker-object-switch-structure",{cliInitDefaultValue:prop.value})})
            }
        }

        await this.chooseAdditionConfigStructure(checker,backFn,nextFn,newStructure,parent,parentIndex,path,localPath)
    }

    private async renderAdditionConfigBooleanStructure(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),nextFn:((data:any) => api.ODPromiseVoid),structure:api.ODCheckerBooleanStructure,parent:object|any[],parentIndex:string|number,path:(string|number)[],localPath:(string|number)[]){
        renderHeader(this.opts,[...path,parentIndex])
        terminal(ansis.bold.green("You are now creating "+(typeof parentIndex == "string" ? "the boolean property "+ansis.blue("\""+parentIndex+"\"") : "boolean property "+ansis.blue("#"+(parentIndex+1)))+".\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))
        
        terminal.gray("\nProperty: "+ansis.bold.blue(structure.options.cliDisplayName ?? [...localPath,parentIndex].join("."))+"\n")
        terminal.gray("Description: "+ansis.bold(structure.options.cliDisplayDescription ?? "/")+"\n")

        const answer = await terminal.singleColumnMenu(["false (Disabled)","true (Enabled)"],{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise
        
        if (answer.canceled) return await backFn()
        
        //run config checker
        const newValue = (answer.selectedIndex == 0) ? false : true
        const newPath = [...path]
        newPath.shift()
        checker.messages = [] //manually clear previous messages
        const isDataValid = structure.check(checker,newValue,newPath)

        if (isDataValid){
            terminal.bold.blue("\n\n✅ Variable saved succesfully!")
            await utilities.timer(400)
            await nextFn(newValue)
        }else{
            const messages = checker.messages.map((msg) => "=> ["+msg.type.toUpperCase()+"] "+msg.message).join("\n")
            terminal.bold.blue("\n\n❌ Variable is invalid! Please try again!")
            terminal.gray("\n"+messages)
            await utilities.timer(1000+(2000*checker.messages.length))
            await this.renderAdditionConfigBooleanStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)
        }
    }

    private async renderAdditionConfigNumberStructure(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),nextFn:((data:any) => api.ODPromiseVoid),structure:api.ODCheckerNumberStructure,parent:object|any[],parentIndex:string|number,path:(string|number)[],localPath:(string|number)[],prefillValue?:string){
        renderHeader(this.opts,[...path,parentIndex])
        terminal(ansis.bold.green("You are now creating "+(typeof parentIndex == "string" ? "the number property "+ansis.blue("\""+parentIndex+"\"") : "number property "+ansis.blue("#"+(parentIndex+1)))+".\n")+ansis.italic.gray("(insert a new value and press enter, go back using escape)\n"))
        
        terminal.gray("\nProperty: "+ansis.bold.blue(structure.options.cliDisplayName ?? [...localPath,parentIndex].join("."))+"\n")
        terminal.gray("Description: "+ansis.bold(structure.options.cliDisplayDescription ?? "/")+"\n")

        const answer = await terminal.inputField({
            default:prefillValue,
            style:terminal.cyan,
            cancelable:true
        }).promise
        
        if (typeof answer != "string") return await backFn()
        
        //run config checker
        const newValue = Number(answer.replaceAll(",","."))
        const newPath = [...path]
        newPath.shift()
        checker.messages = [] //manually clear previous messages
        const isDataValid = structure.check(checker,newValue,newPath)

        if (isDataValid){
            terminal.bold.blue("\n\n✅ Variable saved succesfully!")
            await utilities.timer(400)
            await nextFn(newValue)
        }else{
            const messages = checker.messages.map((msg) => "=> ["+msg.type.toUpperCase()+"] "+msg.message).join("\n")
            terminal.bold.blue("\n\n❌ Variable is invalid! Please try again!")
            terminal.red("\n"+messages)
            await utilities.timer(1000+(2000*checker.messages.length))
            await this.renderAdditionConfigNumberStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath,answer)
        }
    }

    private async renderAdditionConfigStringStructure(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),nextFn:((data:any) => api.ODPromiseVoid),structure:api.ODCheckerStringStructure,parent:object|any[],parentIndex:string|number,path:(string|number)[],localPath:(string|number)[],prefillValue?:string){
        renderHeader(this.opts,[...path,parentIndex])
        terminal(ansis.bold.green("You are now creating "+(typeof parentIndex == "string" ? "the string property "+ansis.blue("\""+parentIndex+"\"") : "string property "+ansis.blue("#"+(parentIndex+1)))+".\n")+ansis.italic.gray("(insert a new value and press enter, go back using escape)\n"))
        
        terminal.gray("\nProperty: "+ansis.bold.blue(structure.options.cliDisplayName ?? [...localPath,parentIndex].join("."))+"\n")
        terminal.gray("Description: "+ansis.bold(structure.options.cliDisplayDescription ?? "/")+"\n")

        const customExtraOptions = (structure instanceof api.ODCheckerCustomStructure_DiscordId) ? structure.extraOptions : undefined
        const customAutocompleteFunc = structure.options.cliAutocompleteFunc ? await structure.options.cliAutocompleteFunc() : null
        const autocompleteList = ((customAutocompleteFunc ?? structure.options.cliAutocompleteList) ?? customExtraOptions) ?? structure.options.choices
        const autoCompleteMenuOpts: Terminal.SingleLineMenuOptions = {
            style:terminal.white,
            selectedStyle:terminal.bgBlue.white
        }

        const input = terminal.inputField({
            default:prefillValue,
            style:terminal.cyan,
            hintStyle:terminal.gray,
            cancelable:false,
            autoComplete:autocompleteList,
            autoCompleteHint:(!!autocompleteList),
            autoCompleteMenu:(autocompleteList) ? autoCompleteMenuOpts as Terminal.Autocompletion : false
        })

        terminal.on("key",async (name:string,matches:string[],data:object) => {
            if (name == "ESCAPE"){
                terminal.removeListener("key","cli-render-string-structure-add")
                input.abort()
                await backFn()
            }
        },({id:"cli-render-string-structure-add"} as any))

        const answer = await input.promise
        terminal.removeListener("key","cli-render-string-structure-add")
        if (typeof answer != "string") return
        
        //run config checker
        const newValue = answer.replaceAll("\\n","\n")
        const newPath = [...path]
        newPath.shift()
        checker.messages = [] //manually clear previous messages
        const isDataValid = structure.check(checker,newValue,newPath)

        if (isDataValid){
            terminal.bold.blue("\n\n✅ Variable saved succesfully!")
            await utilities.timer(400)
            await nextFn(newValue)
        }else{
            const messages = checker.messages.map((msg) => "=> ["+msg.type.toUpperCase()+"] "+msg.message).join("\n")
            terminal.bold.blue("\n\n❌ Variable is invalid! Please try again!")
            terminal.red("\n"+messages)
            await utilities.timer(1000+(2000*checker.messages.length))
            await this.renderAdditionConfigStringStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath,answer)
        }
    }

    private async renderAdditionConfigNullStructure(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),nextFn:((data:any) => api.ODPromiseVoid),structure:api.ODCheckerNullStructure,parent:object|any[],parentIndex:string|number,path:(string|number)[],localPath:(string|number)[]){
        renderHeader(this.opts,[...path,parentIndex])
        terminal(ansis.bold.green("You are now creating "+(typeof parentIndex == "string" ? "the null property "+ansis.blue("\""+parentIndex+"\"") : "null property "+ansis.blue("#"+(parentIndex+1)))+".\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))
        
        terminal.gray("\nProperty: "+ansis.bold.blue(structure.options.cliDisplayName ?? [...localPath,parentIndex].join("."))+"\n")
        terminal.gray("Description: "+ansis.bold(structure.options.cliDisplayDescription ?? "/")+"\n")

        const answer = await terminal.singleColumnMenu(["null"],{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise
        
        if (answer.canceled) return await backFn()
        
        //run config checker
        const newValue = null
        const newPath = [...path]
        newPath.shift()
        checker.messages = [] //manually clear previous messages
        const isDataValid = structure.check(checker,newValue,newPath)

        if (isDataValid){
            terminal.bold.blue("\n\n✅ Variable saved succesfully!")
            await utilities.timer(400)
            await nextFn(newValue)
        }else{
            const messages = checker.messages.map((msg) => "=> ["+msg.type.toUpperCase()+"] "+msg.message).join("\n")
            terminal.bold.blue("\n\n❌ Variable is invalid! Please try again!")
            terminal.red("\n"+messages)
            await utilities.timer(1000+(2000*checker.messages.length))
            await this.renderAdditionConfigNullStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)
        }
    }

    private async renderAdditionConfigArrayStructureSelector(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),nextFn:((data:any) => api.ODPromiseVoid),structure:api.ODCheckerArrayStructure,parent:object|any[],parentIndex:string|number,path:(string|number)[],localPath:(string|number)[],localData:any[]=[]){
        renderHeader(this.opts,[...path,parentIndex])
        terminal(ansis.bold.green("Please select what you would like to do with the new array.\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))
        if (!structure.options.propertyChecker) return await backFn()

        terminal.gray("\nProperty: "+ansis.bold.blue(structure.options.cliDisplayName ?? [...localPath,parentIndex].join("."))+"\n")
        terminal.gray("Description: "+ansis.bold(structure.options.cliDisplayDescription ?? "/")+"\n")
        
        const propertyName = structure.options.cliDisplayPropertyName ?? "index"
        const answer = await terminal.singleColumnMenu(localData.length < 1 ? [ansis.magenta("-> Continue to next variable"),"Add "+propertyName] : [
            ansis.magenta("-> Continue to next variable"),
            "Add "+propertyName,
            "Edit "+propertyName,
            "Move "+propertyName,
            "Remove "+propertyName,
            "Duplicate "+propertyName,
            
        ],{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise
        
        const backFnFunc = async () => {await this.renderAdditionConfigArrayStructureSelector(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath,localData)}

        if (answer.canceled) return await backFn()
        if (answer.selectedIndex == 0) await nextFn(localData)
        else if (answer.selectedIndex == 1) await this.chooseAdditionConfigStructure(checker,backFnFunc,async (newData) => {
            localData[localData.length] = newData
            await backFnFunc()
        },structure.options.propertyChecker,localData,localData.length,path,[])
        else if (answer.selectedIndex == 2) await this.renderConfigArrayStructureEditSelector(checker,backFnFunc,structure,structure.options.propertyChecker,localData,parent,parentIndex,path)
        else if (answer.selectedIndex == 3) await this.renderConfigArrayStructureMoveSelector(checker,backFnFunc,structure,structure.options.propertyChecker,localData,parent,parentIndex,path)
        else if (answer.selectedIndex == 4) await this.renderConfigArrayStructureRemoveSelector(checker,backFnFunc,structure,structure.options.propertyChecker,localData,parent,parentIndex,path)
        else if (answer.selectedIndex == 5) await this.renderConfigArrayStructureDuplicateSelector(checker,backFnFunc,structure,structure.options.propertyChecker,localData,parent,parentIndex,path)
    }

    private async renderAdditionConfigTypeSwitchStructure(checker:api.ODChecker,backFn:(() => api.ODPromiseVoid),nextFn:((data:any) => api.ODPromiseVoid),structure:api.ODCheckerTypeSwitchStructure,parent:object|any[],parentIndex:string|number,path:(string|number)[],localPath:(string|number)[]){
        renderHeader(this.opts,path)
        terminal(ansis.bold.green("You are now creating "+(typeof parentIndex == "string" ? "the property "+ansis.blue("\""+parentIndex+"\"") : "property "+ansis.blue("#"+(parentIndex+1)))+".\n")+ansis.italic.gray("(use arrow keys to navigate, go back using escape)\n"))
        
        terminal.gray("\nProperty: "+ansis.bold.blue(structure.options.cliDisplayName ?? [...localPath,parentIndex].join("."))+"\n")
        terminal.gray("Description: "+ansis.bold(structure.options.cliDisplayDescription ?? "/")+"\n")

        const actionsList: string[] = []
        if (structure.options.boolean) actionsList.push("Create as boolean")
        if (structure.options.string) actionsList.push("Create as string")
        if (structure.options.number) actionsList.push("Create as number")
        if (structure.options.object) actionsList.push("Create as object")
        if (structure.options.array) actionsList.push("Create as array/list")
        if (structure.options.null) actionsList.push("Create as null")
        
        const answer = await terminal.singleColumnMenu(actionsList,{
            leftPadding:"> ",
            style:terminal.cyan,
            selectedStyle:terminal.bgDefaultColor.bold,
            submittedStyle:terminal.bgBlue,
            extraLines:2,
            cancelable:true
        }).promise
        
        if (answer.canceled) return await backFn()
        
        //run selected structure editor (untested)
        if (answer.selectedText.startsWith("Create as boolean") && structure.options.boolean) await this.renderAdditionConfigBooleanStructure(checker,async () => {await this.renderAdditionConfigTypeSwitchStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)},nextFn,structure.options.boolean,parent,parentIndex,path,localPath)
        else if (answer.selectedText.startsWith("Create as string") && structure.options.string) await this.renderAdditionConfigStringStructure(checker,async () => {await this.renderAdditionConfigTypeSwitchStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)},nextFn,structure.options.string,parent,parentIndex,path,localPath)
        else if (answer.selectedText.startsWith("Create as number") && structure.options.number) await this.renderAdditionConfigNumberStructure(checker,async () => {await this.renderAdditionConfigTypeSwitchStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)},nextFn,structure.options.number,parent,parentIndex,path,localPath)
        else if (answer.selectedText.startsWith("Create as object") && structure.options.object) await this.renderAdditionConfigObjectStructure(checker,async () => {await this.renderAdditionConfigTypeSwitchStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)},nextFn,structure.options.object,parent,parentIndex,path,localPath)
        else if (answer.selectedText.startsWith("Create as array/list") && structure.options.array) await this.renderAdditionConfigArrayStructureSelector(checker,async () => {await this.renderAdditionConfigTypeSwitchStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)},nextFn,structure.options.array,parent,parentIndex,path,localPath)
        else if (answer.selectedText.startsWith("Create as null") && structure.options.null) await this.renderAdditionConfigNullStructure(checker,async () => {await this.renderAdditionConfigTypeSwitchStructure(checker,backFn,nextFn,structure,parent,parentIndex,path,localPath)},nextFn,structure.options.null,parent,parentIndex,path,localPath)
    }
}