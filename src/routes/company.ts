import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Company } from "../models/Company";
import { PROJECT_GET_RELATIONS } from "./project";
import { ILike } from 'typeorm';

const router = Router();

const companyRepo = AppDataSource.getRepository(Company);

// Get Companies listing
router.get("/", async (req, res) => {
    const companies = await companyRepo.find(
        { relations: ["projects", "createdBy", "projects.client.createdBy", ...PROJECT_GET_RELATIONS.map((item)=> `projects.${item}`)] }
    );  
    res.json(companies);
});

// Create company profile
router.post("/", async (req, res) : Promise<any> => {
    const userId = (req as any).user.id;

    try {
        const companyDetails = req.body as Partial<Company>;

        if (!companyDetails.name || typeof companyDetails.name !== 'string' || companyDetails.name.trim() === '') {
            return res.status(400).json({ error: 'Invalid input: "name" is required and must be a non-empty string.' });
        }
        
        const existingCompany = await companyRepo.findOne({
            where: {
              name: ILike(companyDetails.name!),
            },
          });
          
        if (existingCompany) {
            return res.status(400).json({ error: 'Company with this name already exists.' });
        }
        
        // Proceed to save only if not exists
        const company = companyRepo.create({
            ...companyDetails,
            ... { createdBy: { id: userId } }
        });
        
        const savedCompany = await companyRepo.save(company);

        res.status(201).json({
            company: savedCompany
        });
    } catch(err) {
        res.status(500).json({error: `Failed to Create Company profile, server ERROR`})
    } 
});

export default router;