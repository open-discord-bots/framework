///////////////////////////////////////
//TASK MODULE
///////////////////////////////////////
import { ODId, ODManager, ODManagerData, ODNoGeneric, ODValidId } from "./base.js"
import { ODDebugger } from "./console.js"


/**## ODTask `class`
 * This is an Open Discord task runner.
 * 
 * Use this to execute a function just before the startup screen. (with more than 90% of the code already loaded)
 * You can also specify a priority to change the execution order.
 * In Open Ticket, this is used for the following processes:
 * - Autoclose/delete
 * - Database syncronisation (with tickets, statistics & used options)
 * - Panel auto-update
 * - Database Garbage Collection (removing tickets that don't exist anymore)
 * - And more!
 */
export class ODTask extends ODManagerData {
    /**The priority of this task */
    priority: number
    /**The main function of this task */
    func: () => void|Promise<void>

    constructor(id:ODValidId, priority:number, func:() => void|Promise<void>){
        super(id)
        this.priority = priority
        this.func = func
    }
}

/**## ODTaskManagerIdConstraint `type`
 * The constraint/layout for id mappings/interfaces of the `ODTaskManager` class.
 */
export type ODTaskManagerIdConstraint = Record<string,ODTask>

/**## ODTaskManager `class`
 * This is an Open Discord task manager.
 * 
 * It manages & executes `ODTask`'s in the correct order.
 * 
 * Register functions/tasks that execute just before the startup screen. (with more than 90% of the code already loaded)
 */
export class ODTaskManager<IdList extends ODTaskManagerIdConstraint = ODTaskManagerIdConstraint> extends ODManager<ODTask> {
    constructor(debug:ODDebugger){
        super(debug,"task")
    }
    
    /**Execute all `ODTask` functions in order of their priority (high to low). */
    async execute(){
        const derefArray = [...this.getAll()]
        const workers = derefArray.sort((a,b) => b.priority-a.priority)
        
        for (const worker of workers){
            try {
                await worker.func()
            }catch(err){
                process.emit("uncaughtException",err)
            }
        }
    }

    get<TaskId extends keyof ODNoGeneric<IdList>>(id:TaskId): IdList[TaskId]
    get(id:ODValidId): ODTask|null
    
    get(id:ODValidId): ODTask|null {
        return super.get(id)
    }

    remove<TaskId extends keyof ODNoGeneric<IdList>>(id:TaskId): IdList[TaskId]
    remove(id:ODValidId): ODTask|null
    
    remove(id:ODValidId): ODTask|null {
        return super.remove(id)
    }

    exists(id:keyof ODNoGeneric<IdList>): boolean
    exists(id:ODValidId): boolean
    
    exists(id:ODValidId): boolean {
        return super.exists(id)
    }
}