import { Request, Response } from 'express';
import * as InterviewModel from '../../models/interview/interviewModel';
import * as ApplicantModel from '../../models/application/applicantModel';

export const createInterview = async (req: Request, res: Response) => {
    const { applicationId } = req.params;
    const { interview_date, interviewer, notes } = req.body;

    try {
        const interview = await InterviewModel.scheduleInterview(parseInt(applicationId), {
            interview_date,
            interviewer,
            notes,
            outcome: 'Pending'
        });
        res.status(201).json(interview);
    } catch (error: any) {
        console.error("Failed to schedule interview:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const getInterviewsByCompanyId = async (req: Request, res: Response) => {
    const { companyId } = req.params;
    try {
        const interviews = await InterviewModel.findInterviewsByCompanyId(parseInt(companyId));
        res.json(interviews);
    } catch (error: any) {
        console.error("Failed to fetch interviews:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const updateInterviewOutcome = async (req: Request, res: Response) => {
    const { interviewId } = req.params;
    const { outcome } = req.body;

    try {
        const updatedInterview = await InterviewModel.updateInterviewOutcome(parseInt(interviewId), outcome);

        const newStatus = outcome === 'Passed' ? 'Passed' : 'Rejected';
        await ApplicantModel.updateApplicationStatus(updatedInterview.application_id, newStatus);

        res.json(updatedInterview);
    } catch (error: any) {
        console.error("Failed to update interview outcome:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};
