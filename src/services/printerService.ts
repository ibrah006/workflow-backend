import { Repository } from "typeorm";
import { Printer, PrinterStatus } from "../models/Printer";
import { AppDataSource } from "../data-source";
import { Task } from "../models/Task";

export class PrinterService {
    private printerRepo: Repository<Printer>;
    private taskRepo: Repository<Task>;

    constructor() {
        this.printerRepo = AppDataSource.getRepository(Printer);
        this.taskRepo = AppDataSource.getRepository(Task);
    }

    async updatePrinterStatus(
        printer: Printer,
        newStatus: PrinterStatus,
    ) {
        const now = new Date();
        
        // If exiting maintenance, accumulate maintenance time
        if (
            printer.status === PrinterStatus.MAINTENANCE &&
            printer.statusLastUpdatedAt
        ) {
            const diffMinutes =
            (now.getTime() - printer.statusLastUpdatedAt.getTime()) / 60000;
        
            printer.maintenanceMinutes += Math.floor(diffMinutes);
        }
        
        // Update status + timestamp
        printer.status = newStatus;
        printer.statusLastUpdatedAt = now;
        
        await this.printerRepo.save(printer);
    }

    async updatePrinterTask(
        printer: Printer,
        newTaskId: number | null,
    ) {
        const now = new Date();
      
        // If a task was running and now removed → accumulate work time
        if (printer.currentTaskId && printer.taskAssignedAt && !newTaskId) {
          const diffMinutes =
            (now.getTime() - printer.taskAssignedAt.getTime()) / 60000;
      
          printer.workMinutes += Math.floor(diffMinutes);
          printer.taskAssignedAt = null;
        }
      
        // If assigning a new task
        if (!printer.currentTaskId && newTaskId) {
          printer.taskAssignedAt = now;

          const task = await this.taskRepo.findOne({
            where: { id: newTaskId }
          });
        
          if (!task) {
            throw 'Failed to Assign Task - Task not found';
          }

          printer.tasks.push(task);
        }
      
        printer.currentTaskId = newTaskId;
      
        await this.printerRepo.save(printer);
    }
      
}