import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Task } from '../models/Task';
import { Printer, PrinterStatus } from '../models/Printer';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface OverviewData {
  totalPrinters: number;
  activePrinters: number;
  idlePrinters: number;
  maintenancePrinters: number;
  offlinePrinters: number;
  averageUtilization: number;
}

interface PrinterUtilizationData {
  printerId: string;
  name: string;
  totalUtilizedHours: number;
  totalActiveHours: number;
  totalPrintJobs: number;
  utilizationPercentage: number;
}

interface DowntimeData {
  totalMaintenanceMinutes: number;
  totalMaintenanceHours: number;
  averageMaintenancePerPrinter: number;
}

interface ProductionReport {
  overview: OverviewData;
  printerUtilization: PrinterUtilizationData[];
  downtimeAndIssues: DowntimeData;
}

export class ProductionReportService {
  private printerRepo: Repository<Printer>;
  private taskRepo: Repository<Task>;

  constructor() {
    this.printerRepo = AppDataSource.getRepository(Printer);
    this.taskRepo = AppDataSource.getRepository(Task);
  }

  private getDateRange(period: 'today' | 'thisWeek' | 'thisMonth'): DateRange {
    const now = new Date();
    const startDate = new Date();
    const endDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'thisWeek':
        // Start from Monday
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(now.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'thisMonth':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    return { startDate, endDate };
  }

  async generateReport(
    period: 'today' | 'thisWeek' | 'thisMonth'
  ): Promise<ProductionReport> {
    const dateRange = this.getDateRange(period);

    // Fetch all printers with their tasks
    const printers = await this.printerRepo.find({
      relations: ['tasks'],
    });

    const overview = await this.generateOverview(printers);
    const printerUtilization = await this.generatePrinterUtilization(
      printers,
      dateRange
    );
    const downtimeAndIssues = this.generateDowntimeData(printers);

    return {
      overview,
      printerUtilization,
      downtimeAndIssues,
    };
  }

  private async generateOverview(printers: Printer[]): Promise<OverviewData> {
    const totalPrinters = printers.length;
    const activePrinters = printers.filter(
      (p) => p.status === PrinterStatus.ACTIVE
    ).length;
    const idlePrinters = printers.filter(
      (p) => p.status === PrinterStatus.ACTIVE && !p.currentTaskId
    ).length;
    const maintenancePrinters = printers.filter(
      (p) => p.status === PrinterStatus.MAINTENANCE
    ).length;
    const offlinePrinters = printers.filter(
      (p) => p.status === PrinterStatus.OFFLINE
    ).length;

    // Calculate average utilization
    let totalUtilization = 0;
    for (const printer of printers) {
      const workMinutes = printer.getEffectiveWorkMinutes();
      const scheduledMinutes = printer.scheduledMinutes;
      const utilization =
        scheduledMinutes > 0 ? (workMinutes / scheduledMinutes) * 100 : 0;
      totalUtilization += utilization;
    }

    const averageUtilization =
      totalPrinters > 0 ? totalUtilization / totalPrinters : 0;

    return {
      totalPrinters,
      activePrinters,
      idlePrinters,
      maintenancePrinters,
      offlinePrinters,
      averageUtilization: Math.round(averageUtilization * 100) / 100,
    };
  }

  private async generatePrinterUtilization(
    printers: Printer[],
    dateRange: DateRange
  ): Promise<PrinterUtilizationData[]> {
    const utilizationData: PrinterUtilizationData[] = [];

    for (const printer of printers) {
      // Get tasks for this printer within the date range
      const tasksInPeriod = await this.taskRepo.find({
        where: {
          printerId: printer.id,
          createdAt: Between(dateRange.startDate, dateRange.endDate),
        },
      });

      // Calculate total work minutes for the period
      const totalUtilizedMinutes = printer.getEffectiveWorkMinutes();
      const totalActiveMinutes =
        totalUtilizedMinutes + printer.getEffectiveMaintenanceMinutes();

      // Convert to hours
      const totalUtilizedHours = Math.round((totalUtilizedMinutes / 60) * 100) / 100;
      const totalActiveHours = Math.round((totalActiveMinutes / 60) * 100) / 100;

      // Calculate utilization percentage
      const utilizationPercentage =
        printer.scheduledMinutes > 0
          ? Math.round((totalUtilizedMinutes / printer.scheduledMinutes) * 100 * 100) / 100
          : 0;

      utilizationData.push({
        printerId: printer.id,
        name: printer.name || `Printer ${printer.id}`,
        totalUtilizedHours,
        totalActiveHours,
        totalPrintJobs: tasksInPeriod.length,
        utilizationPercentage,
      });
    }

    // Sort by utilization percentage descending
    return utilizationData.sort(
      (a, b) => b.utilizationPercentage - a.utilizationPercentage
    );
  }

  private generateDowntimeData(printers: Printer[]): DowntimeData {
    let totalMaintenanceMinutes = 0;

    for (const printer of printers) {
      totalMaintenanceMinutes += printer.getEffectiveMaintenanceMinutes();
    }

    const totalMaintenanceHours = Math.round((totalMaintenanceMinutes / 60) * 100) / 100;
    const averageMaintenancePerPrinter =
      printers.length > 0
        ? Math.round((totalMaintenanceMinutes / printers.length) * 100) / 100
        : 0;

    return {
      totalMaintenanceMinutes,
      totalMaintenanceHours,
      averageMaintenancePerPrinter,
    };
  }
}