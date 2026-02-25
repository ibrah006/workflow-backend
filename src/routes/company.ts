import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Company } from "../models/Company";
import { ILike } from 'typeorm';
import { PROJECT_GET_RELATIONS } from "../controller/project";

const router = Router();

const companyRepo = AppDataSource.getRepository(Company);

// Get Companies listing
router.get("/", async (req, res) => {
    
    // Scoped to current organization
    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        res.status(401).json({ message: 'Organization context required' });
        return;
    }

    const companies = await companyRepo.find(
        {
            relations: ["projects", "createdBy", "projects.client.createdBy", ...PROJECT_GET_RELATIONS.map((item)=> `projects.${item}`)],
            where: { organization: { id: organizationId } }
        }
    );  
    res.json(companies);
});

// Create company profile
router.post("/", async (req, res) : Promise<any> => {
    const userId = (req as any).user.id;

    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        res.status(401).json({ message: 'Organization context required' });
        return;
    }

    try {
        const companyDetails = req.body as Partial<Company>;

        if (!companyDetails.name || typeof companyDetails.name !== 'string' || companyDetails.name.trim() === '') {
            return res.status(400).json({ error: 'Invalid input: "name" is required and must be a non-empty string.' });
        }
        
        const existingCompany = await companyRepo.findOne({
            where: {
                organization: { id: organizationId },
                name: ILike(companyDetails.name!),
            },
            relations: ['createdBy', 'projects']
          });
          
        if (existingCompany) {
            return res.status(209).json({ error: 'Company with this name already exists in your Organization.', company: existingCompany });
        }
        
        // Proceed to save only if not exists
        const company = companyRepo.create({
            ...companyDetails,
            organization: { id: organizationId },
            ... { createdBy: { id: userId } }
        });
        
        const savedCompany = await companyRepo.save(company);

        res.status(201).json({
            company: savedCompany
        });
    } catch(err) {
        res.status(500).json({error: `Failed to Create Company profile, server ERROR, ${err}`})
    } 
});

router.put("/:id", async (req, res) : Promise<any> => {

    const organizationId = (req as any).user?.organizationId;

    if (!organizationId) {
        res.status(401).json({ message: 'Organization context required' });
        return;
    }

    try {
      const { id } = req.params;
  
      const {
        name,
        description,
        isActive,
        email,
        industry,
        phone,
        contactName,
        color,
      } = req.body;
  
      // Check if company exists
      const company = await companyRepo.findOneBy({ id, organizationId });
  
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
  
      // Update only allowed fields
      await companyRepo.update(id, {
        name,
        description,
        isActive,
        email,
        industry,
        phone,
        contactName,
        color,
      });
  
      const updatedCompany = await companyRepo.findOneBy({ id });
  
      return res.json(updatedCompany);
    } catch (error) {
      console.error("Update company error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

export default router;