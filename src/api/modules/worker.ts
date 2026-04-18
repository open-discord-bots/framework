///////////////////////////////////////
//WORKER MODULE
///////////////////////////////////////
import { ODId, ODManager, ODManagerData, ODSystemError, ODValidId } from "./base.js"

/**## ODWorkerCallback `type`
 * This is the callback used in `ODWorker`!
 */
export type ODWorkerCallback<Instance, Origin extends string, Params> = (instance:Instance, params:Params, origin:Origin, cancel:() => void) => void|Promise<void>

/**## ODWorker `class`
 * This is an Open Discord worker.
 * 
 * You can compare it with a normal javascript callback, but slightly more advanced!
 * 
 * - It has an `id` for identification of the function
 * - A `priority` to know when to execute this callback (related to others)
 * - It knows who called this callback (`origin`)
 * - And much more!
 */
export class ODWorker<Instance, Origin extends string, Params> extends ODManagerData {
    /**The priority of this worker */
    priority: number
    /**The main callback of this worker */
    callback: ODWorkerCallback<Instance,Origin,Params>

    constructor(id:ODValidId, priority:number, callback:ODWorkerCallback<Instance,Origin,Params>){
        super(id)
        this.priority = priority
        this.callback = callback
    }
}

/**## ODWorker `class`
 * This is an Open Discord worker manager.
 * 
 * It manages & executes `ODWorker`'s in the correct order.
 * 
 * You can register a custom worker in this class to create a message or button.
 */
export class ODWorkerManager<Instance, Origin extends string, Params,WorkerIds extends string = string> extends ODManager<ODWorker<Instance,Origin,Params>> {
    /**The order of execution for workers inside this manager. */
    #priorityOrder: "ascending"|"descending"
    /**The backup worker will be executed when one of the workers fails or cancels execution. */
    backupWorker: ODWorker<{reason:"error"|"cancel"},Origin,Params>|null = null
    
    constructor(priorityOrder:"ascending"|"descending"){
        super()
        this.#priorityOrder = priorityOrder
    }
    
    /**Get all workers in sorted order. */
    getSortedWorkers(priority:"ascending"|"descending"){
        const derefArray = [...this.getAll()]

        return derefArray.sort((a,b) => {
            if (priority == "ascending") return a.priority-b.priority
            else return b.priority-a.priority
        })
    }
    /**Execute all workers on an instance using the given origin & parameters. */
    async executeWorkers(instance:Instance, origin:Origin, params:Params){
        const derefParams = {...params}
        const workers = this.getSortedWorkers(this.#priorityOrder)
        let didCancel = false
        let didCrash = false
        
        for (const worker of workers){
            if (didCancel) break
            try {
                await worker.callback(instance,derefParams,origin,() => {
                    didCancel = true
                })
            }catch(err:any){
                process.emit("uncaughtException",new ODSystemError(err))
                didCrash = true
            }
        }
        if (didCancel && this.backupWorker){
            try{
                await this.backupWorker.callback({reason:"cancel"},derefParams,origin,() => {})
            }catch(err:any){
                process.emit("uncaughtException",new ODSystemError(err))
            }
        }else if (didCrash && this.backupWorker){
            try{
                await this.backupWorker.callback({reason:"error"},derefParams,origin,() => {})
            }catch(err:any){
                process.emit("uncaughtException",new ODSystemError(err))
            }
        }
    }

    get(id:WorkerIds): ODWorker<Instance,Origin,Params>
    get(id:ODValidId): ODWorker<Instance,Origin,Params>|null
    
    get(id:ODValidId): ODWorker<Instance,Origin,Params>|null {
        return super.get(id)
    }

    remove(id:WorkerIds): ODWorker<Instance,Origin,Params>
    remove(id:ODValidId): ODWorker<Instance,Origin,Params>|null
    
    remove(id:ODValidId): ODWorker<Instance,Origin,Params>|null {
        return super.remove(id)
    }

    exists(id:WorkerIds): boolean
    exists(id:ODValidId): boolean
    
    exists(id:ODValidId): boolean {
        return super.exists(id)
    }
}