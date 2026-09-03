///////////////////////////////////////
//VERIFYBAR MODULE
///////////////////////////////////////
import { ODId, ODManager, ODManagerData, ODNoGeneric, ODValidId } from "./base.js"
import { ODDebugger } from "./console.js"
import { ODButtonResponderInstance } from "./responder.js"
import { ODWorkerManager } from "./worker.js"
import * as discord from "discord.js"

/**## ODVerifyBar `class`
 * This is an Open Discord verifybar responder.
 * 
 * It contain `ODWorkerManager`'s that will be fired when the continue/stop (✅ ❌) buttons are pressed.
 * 
 * Verifybars don't automatically trigger these workers. The button responders of the verifybars should implement it manually.
 */
export class ODVerifyBar<ButtonIds extends string,WorkerIds extends string = string> extends ODManagerData {
    /**All workers that will run when a button in the verifybar is pressed. */
    workers: ODWorkerManager<ODButtonResponderInstance,"button",{verifybar:ODVerifyBar<ButtonIds,WorkerIds>,selectedButtonId:ButtonIds},WorkerIds>
    
    constructor(id:ODValidId){
        super(id)
        this.workers = new ODWorkerManager("descending")
    }

    /**Activate the verifybar response to this button. */
    async activate(responder:ODButtonResponderInstance,selectedButtonId:ButtonIds){
        await this.workers.executeWorkers(responder,"button",{verifybar:this,selectedButtonId})
    }
}

/**## ODVerifyBarManagerIdConstraint `type`
 * The constraint/layout for id mappings/interfaces of the `ODVerifyBarManager` class.
 */
export type ODVerifyBarManagerIdConstraint = Record<string,ODVerifyBar<string>>

/**## ODVerifyBarManager `class`
 * The Open Discord verifybar manager manages all responders for (✅ ❌) verifybars in the bot.
 * The `ODVerifyBar` classes contain `ODWorkerManager`'s that will be fired when the continue/stop buttons are pressed.
 * 
 * Verifybars don't automatically trigger these workers. The button responders of the verifybars should implement it manually.
 */
export class ODVerifyBarManager<IdList extends ODVerifyBarManagerIdConstraint = ODVerifyBarManagerIdConstraint> extends ODManager<ODVerifyBar<string>> {
    constructor(debug:ODDebugger){
        super(debug,"verifybar")
    }

    get<VerifyBarId extends keyof ODNoGeneric<IdList>>(id:VerifyBarId): IdList[VerifyBarId]
    get(id:ODValidId): ODVerifyBar<string>|null
    
    get(id:ODValidId): ODVerifyBar<string>|null {
        return super.get(id)
    }

    remove<VerifyBarId extends keyof ODNoGeneric<IdList>>(id:VerifyBarId): IdList[VerifyBarId]
    remove(id:ODValidId): ODVerifyBar<string>|null
    
    remove(id:ODValidId): ODVerifyBar<string>|null {
        return super.remove(id)
    }

    exists(id:keyof ODNoGeneric<IdList>): boolean
    exists(id:ODValidId): boolean
    
    exists(id:ODValidId): boolean {
        return super.exists(id)
    }
}