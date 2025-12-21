import { Repository } from "typeorm";
import { Printer, PrinterStatus } from "../models/Printer";
import { AppDataSource } from "../data-source";

export class MaterialService {
    private printerRepo: Repository<Printer>;

    constructor() {
        this.printerRepo = AppDataSource.getRepository(Printer);
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
        newTaskId: string | null,
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
        }
      
        printer.currentTaskId = newTaskId;
      
        await this.printerRepo.save(printer);
    }
      
}