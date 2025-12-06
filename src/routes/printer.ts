import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { validateOrReject } from 'class-validator';
import { UpdatePrinterDto } from '../dtos/update-printer.dto';
import { Printer } from '../models/Printer';
import { CreatePrinterDto } from '../dtos/create-printer.dto';

const printerRouter = Router();

// --------------------------------------------------
// CREATE PRINTER
// POST /printers
// --------------------------------------------------
printerRouter.post('/', async (req, res) => {
  try {
    const dto = Object.assign(new CreatePrinterDto(), req.body);
    await validateOrReject(dto);

    const printerRepo = AppDataSource.getRepository(Printer);

    const printer = printerRepo.create(dto);
    await printerRepo.save(printer);

    res.status(201).json(printer);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err });
  }
});


// --------------------------------------------------
// UPDATE PRINTER (PARTIAL UPDATE)
// PATCH /printers/:id
// --------------------------------------------------
printerRouter.patch('/:id', async (req, res) : Promise<any> => {
  try {
    const dto = Object.assign(new UpdatePrinterDto(), req.body);
    await validateOrReject(dto);

    const printerRepo = AppDataSource.getRepository(Printer);

    const printer = await printerRepo.findOne({
      where: { id: req.params.id },
    });

    if (!printer) {
      return res.status(404).json({ message: 'Printer not found' });
    }

    Object.assign(printer, dto);

    await printerRepo.save(printer);

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
  try {
    const printerRepo = AppDataSource.getRepository(Printer);

    const result = await printerRepo.delete(req.params.id);

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
printerRouter.get('/', async (_, res) => {
  try {
    const printers = await AppDataSource.getRepository(Printer).find({
      order: { createdAt: 'DESC' },
    });

    res.json(printers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
});

export default printerRouter;