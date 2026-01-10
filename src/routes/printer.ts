import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { validateOrReject } from 'class-validator';
import { UpdatePrinterDto } from '../dtos/update-printer.dto';
import { Printer, PrinterStatus } from '../models/Printer';
import { CreatePrinterDto } from '../dtos/create-printer.dto';
import { PrinterService } from '../services/printerService';
import { Task } from '../models/Task';
import task from '../controller/task';

const printerRouter = Router();

const printerService = new PrinterService();

const printerRepo = AppDataSource.getRepository(Printer);

const taskRepo = AppDataSource.getRepository(Task);

// --------------------------------------------------
// CREATE PRINTER
// POST /printers
// --------------------------------------------------
printerRouter.post('/', async (req, res) => {

  const organizationId = (req as any).user.organizationId;

  console.log("printer creation org id:", organizationId);

  try {
    const dto = Object.assign(new CreatePrinterDto(), {
      ...req.body,
      organizationId
    });
    await validateOrReject(dto);

    const printer = printerRepo.create(dto);
    await printerRepo.save(printer);

    res.status(201).json(printer);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err });
  }
});

// Assign Task for Printer
/**
 * @deprecated
 */
printerRouter.post('/:id/assign/:taskId', async (req, res) : Promise<any> => {
  const organizationId = (req as any).user.organizationId;

  const taskId = Number(req.params.taskId);

  const printer = await printerRepo.findOne({
    where: { id: req.params.id, organization: { id: organizationId } },
  });

  if (!printer) {
    return res.status(404).json({ message: 'Printer not found' });
  }

  await printerService.updatePrinterTask(printer, taskId);

  res.json(printer);
});

// --------------------------------------------------
// UPDATE PRINTER (PARTIAL UPDATE)
// PUT /printers/:id
// --------------------------------------------------
printerRouter.put('/:id', async (req, res) : Promise<any> => {
  
  const organizationId = (req as any).user.organizationId;

  const {
    name,
    nickname,
    location,
    status,
    maxWidth,
    printSpeed
  } = req.body;

  try {
    const dto = Object.assign(new UpdatePrinterDto(), req.body);
    await validateOrReject(dto);

    const printer = await printerRepo.findOne({
      where: { id: req.params.id, organization: { id: organizationId } },
      relations: ['currentTask', 'currentTask.printer']
    });

    if (!printer) {
      return res.status(404).json({ message: 'Printer not found' });
    }

    const statusChange = status !== printer.status;

    // If Printer status change requested while printer is busy
    if (statusChange && printer.currentTaskId) {
      const assignedTask = await taskRepo.findOne({
        where: { id: printer.currentTaskId },
        relations: ['printer']
      });

      if (assignedTask) {
        assignedTask.actualProductionEndTime = new Date();
        assignedTask.printerId = null;
        assignedTask.status = 'paused';

        await taskRepo.save(assignedTask);
      }

      // in case task assigned to printer NOT FOUND:
      // Unassign task from printer anyways
      printer.currentTask = undefined;
      printer.currentTaskId = null;
    }

    Object.assign(printer, {  
      ...dto,
      // Avoiding assigning the new status from here
      status: printer.status
    });

    // await printerRepo.save(printer);
    await printerService.updatePrinterStatus(printer, dto.status);

    res.json(printer);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err });
  }
});


// --------------------------------------------------
// DELETE PRINTER
// DELETE /printers/:id
// --------------------------------------------------
printerRouter.delete('/:id', async (req, res) : Promise<any> => {
  const organizationId = (req as any).user.organizationId;
  try {

    const result = await printerRepo.delete({id: req.params.id, organization: { id: organizationId }});

    if (!result.affected) {
      return res.status(404).json({ message: 'Printer not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
});


// --------------------------------------------------
// LIST PRINTERS
// GET /printers
// --------------------------------------------------
printerRouter.get('/', async (req, res) => {

  const organizationId = (req as any).user.organizationId;

  try {
    const printers = await AppDataSource.getRepository(Printer).find({
      order: { createdAt: 'DESC' },
      where: { organizationId },
    });

    res.json(printers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
});

  // --------------------------------------------------
// Get Active Printers
// GET /printers/active
// --------------------------------------------------
printerRouter.get('/active', async (req, res) => {

    const organizationId = (req as any).user.organizationId;

    try {
      const printers = await printerRepo.find({
        where: { organizationId, status: PrinterStatus.ACTIVE }
      });

      const totalPrintersCount = await printerRepo.count({
        where: { organizationId: organizationId }
      })

      console.log("totalPrintersCount:", totalPrintersCount);
  
      res.json({
        activePrinters: printers,
        totalPrintersCount
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err });
    }
  });

// --------------------------------------------------
// Get Printer by Id
// GET /printers/:printerId
// --------------------------------------------------
printerRouter.get('/:id', async (req, res) => {

    const id = req.params.id;

    const organizationId = (req as any).user.organizationId;

    try {
      const printer = await AppDataSource.getRepository(Printer).findOne({
        where: { id: id, organization: { id: organizationId } }
      });

      if (!printer) {
        res.status(404).json({
            message: "Printer not found"
        })
        return;
      }
  
      res.json(printer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err });
    }
  });
  

printerRouter.get('/:shittu-sample', async (req, res) => {


    const organizationId = (req as any).user.organizationId;

    try {
      const printers = await printerRepo.find({
        where: { organization: { id: organizationId }, status: PrinterStatus.ACTIVE }
      });

    //   const totalPrintersCount = printerRepo.count({
    //     where: { organization: { id: organizationId }}
    //   })
  
      res.json({
        activePrinters: printers,
        // totalPrintersCount
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err });
    }
  });

  printerRouter.get('/shit-sample', async (req, res) => {

    const organizationId = (req as any).user.organizationId;

    try {
      const printers = await printerRepo.find({
        where: { organization: { id: organizationId }, status: PrinterStatus.ACTIVE }
      });

    //   const totalPrintersCount = printerRepo.count({
    //     where: { organization: { id: organizationId }}
    //   })
  
      res.json({
        activePrinters: printers,
        // totalPrintersCount
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err });
    }
  });

export default printerRouter;