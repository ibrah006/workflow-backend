import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Company } from "../models/Company";
import { ILike } from 'typeorm';
import { PROJECT_GET_RELATIONS } from "../controller/project";
import { CompanyService } from "../services/companyService.websocket";

const router = Router();

const companyService = new CompanyService();

// Get Companies listing
router.get("/", async (req, res) => {
    
    // Scoped to current organization
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        res.status(401).json({ message: 'Organization context required' });
        return;
    }
    
    const companyRepo = AppDataSource.getRepository(Company);

    const companies = await companyRepo.find(
        {
            relations: ["projects", "createdBy", "projects.client.createdBy", ...PROJECT_GET_RELATIONS.map((item)=> `projects.${item}`)],
            where: { organization: { id: organizationId } }
        }
    );  
    res.json(companies);
});

// Create company profile
router.post(
    "/",
    async (req, res) => {
        try {
            const userId = (req as any).user.id;
            const organizationId = (req as any).user.organizationId;

            const company = await companyService.createCompany(
                req.body,
                userId,
                organizationId
            );

            res.status(201).json(company);
            return;
        } catch (error: any) {
            res.status(400).json({ message: error.message });
            return;
        }
    });

router.put(
    "/:id",
    async (req, res) : Promise<any> => {
        try {
        const { id: companyId } = req.params;
        const userId = (req as any).user.id;
        const organizationId = (req as any).user.organizationId;
    
        const updatedCompany = await companyService.updateCompany(
            companyId,
            req.body,
            userId,
            organizationId
        );
    
        return res.json(updatedCompany);
        } catch (error: any) {
        return res.status(400).json({ message: error.message });
        }
    });

export default router;