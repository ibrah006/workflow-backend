import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Company } from "../models/Company";
import { PROJECT_GET_RELATIONS } from "./project";

const router = Router();

const companyRepo = AppDataSource.getRepository(Company);

// Get Companies listing
router.get("/", async (req, res) => {
    const companies = await companyRepo.find(
        { relations: ["projects", "createdBy", "projects.client.createdBy", ...PROJECT_GET_RELATIONS.map((item)=> `projects.${item}`)] }
    );  
    res.json(companies);
});

export default router;