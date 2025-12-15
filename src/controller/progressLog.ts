import { AppDataSource } from "../data-source";
import { ProgressLog } from "../models/ProgressLog";

import { Request, Response } from "express";
import { updateProgressLogLastModifiedAt } from "../routes/project";
import { Project } from "../models/Project";

const progressLogRepo = AppDataSource.getRepository(ProgressLog);
const projectRepo = AppDataSource.getRepository(Project);

export const PROGRESS_RELATIONS = ['project', 'tasks'];

export default {
    async getLogById(req: Request, res: Response) : Promise<any> {
        const id = req.params.id;

        const log = await progressLogRepo.findOne({
            where: { id: id },
            relations: PROGRESS_RELATIONS
        })

        if (!log) {
            return res.status(404).send("Progress log not found");
        }

        res.json(log);
    },

    async updateProgressLog(req: Request, res: Response) {
        const logId = req.params.logId;
    
        try {
            const { isCompleted, description, issue } = req.body;

            // console.log('isCompleted:', isCompleted);
            // console.log('description:', typeof description);
            // console.log('issue:', typeof issue);
    
            const updatedProgressLog = await progressLogRepo.update({
                id: logId
            }, {
                ... isCompleted != undefined? {isCompleted: isCompleted} : {},
                ... isCompleted == true? {completedAt: new Date()} : {},
                ... description != undefined? {description: description} : {},
                ...issue != undefined? {issue: issue} : {},
            })
            
            await updateProgressLogLastModifiedAt(logId);
    
            res.status(201).send({
                log: updatedProgressLog
            })
        } catch(err) {
            res.status(400).send(`Make sure to pass in valid inputs { isCompleted: bool, description: string, issue }.\nYou may pass in one or many of the mentioned body key-value pairs,\nerr-server: ${err}`);
        }
    }
}