import { Request, Response } from 'express';
import { ProductionReportService } from '../services/productionRepoService';

export class ProductionReportController {
  private productionReportService: ProductionReportService;

  constructor() {
    this.productionReportService = new ProductionReportService();
  }

  async getProductionReport(req: Request, res: Response): Promise<void> {
    try {
      const { for: period } = req.query;

      // Validate required query parameter
      if (!period) {
        res.status(400).json({
          error: 'Missing required query parameter "for"',
          message: 'Please specify one of: today, thisWeek, thisMonth',
        });
        return;
      }

      // Validate period value
      const validPeriods = ['today', 'thisWeek', 'thisMonth'];
      if (!validPeriods.includes(period as string)) {
        res.status(400).json({
          error: 'Invalid period value',
          message: 'Period must be one of: today, thisWeek, thisMonth',
        });
        return;
      }

      const report = await this.productionReportService.generateReport(
        period as 'today' | 'thisWeek' | 'thisMonth'
      );

      res.status(200).json({
        success: true,
        period,
        generatedAt: new Date().toISOString(),
        data: report,
      });
    } catch (error) {
      console.error('Error generating production report:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate production report',
      });
    }
  }
}