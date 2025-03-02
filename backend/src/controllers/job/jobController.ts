import { Request, Response } from 'express';
import * as JobModel from '../../models/job/jobModel';
import * as ApplicantModel from '../../models/application/applicantModel'
import { hashPassword } from '../../utils/hashUtils';
import { createUser } from '../../models/user/userModel';
import { sendLoginCredentialsEmail } from '../../utils/emailService';

export const sendJobOffer = async (req: Request, res: Response) => {
    const applicationId = parseInt(req.params.applicationId);
    const { offerDetails, hourlyPayRate, paymentPeriod, fixedPay, travelExpense, roleOffered, branchId } = req.body;

    try {
        const application = await ApplicantModel.findApplicationById(applicationId);
        if (!application) {
            res.status(404).json({ error: "Application not found" });
            return;
        }

        // Ensure branchId is passed and parsed as a number
        if (!branchId) {
            res.status(400).json({ error: "Branch ID is required" });
            return;
        }
        const parsedBranchId = parseInt(branchId);

        const jobOffer = await JobModel.createJobOffer(
            applicationId, 
            offerDetails, 
            hourlyPayRate, 
            paymentPeriod, 
            fixedPay, 
            travelExpense, 
            application.email, 
            roleOffered, 
            parsedBranchId // Now including branchId in the function call
        );
        await ApplicantModel.updateApplicationStatus(applicationId, 'Offered');

        res.status(201).json({ message: "Job offer sent successfully", jobOffer });
    } catch (error: any) {
        console.error("Failed to send job offer:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};


export const updateJobOfferStatus = async (req: Request, res: Response) => {
    const { offerId } = req.params;
    const { status } = req.body;

    try {
        const updatedOffer = await JobModel.updateJobOfferStatus(parseInt(offerId), status);
        const newStatus = status === 'Accepted' ? 'Accepted' : 'Rejected';
        await ApplicantModel.updateApplicationStatus(updatedOffer.application_id, newStatus);

        res.json(updatedOffer);
    } catch (error: any) {
        console.error("Failed to update job offer status:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const handleJobOfferResponse = async (req: Request, res: Response) => {
    const offerId = parseInt(req.params.offerId);
    const { token, status } = req.body;

    try {
        // Step 1: Validate token
        const valid = await JobModel.validateJobOfferToken(offerId, token);
        if (!valid) {
            res.status(403).json({ error: "Invalid or expired token." });
            return;
        }

        // Step 2: Update job offer status
        const signedOnDate = status === 'Accepted' ? new Date() : null;
        const updatedOffer = await JobModel.updateJobOfferStatus(offerId, status, signedOnDate);

        if (status === 'Accepted') {
            // Step 3: Send response to client immediately
            res.status(200).json({ 
                message: `Job offer ${status.toLowerCase()} successfully. User credentials creation in progress.`,
                offer: updatedOffer 
            });

            // Step 4: Perform non-blocking operations after sending response
            setImmediate(async () => {
                try {
                    const jobOffer = await JobModel.getJobOfferById(offerId);
                    if (!jobOffer) throw new Error("Job offer not found.");

                    const applicant = await ApplicantModel.findApplicationById(jobOffer.application_id);
                    if (!applicant || !applicant.email) throw new Error("Applicant or email not found.");

                    const { email, applicant_id: applicantId } = applicant;
                    const { role_offered: roleOffered, branch_id: branchId } = jobOffer;

                    if (branchId === undefined) {
                        console.error("Branch ID is undefined in job offer details:", jobOffer);
                        throw new Error("Branch ID is undefined. Check the job offer retrieval process.");
                    }

                    // Generate a random 6-character alphanumeric password
                    const generatedPassword = Math.random().toString(36).slice(-6);
                    const hashedPassword = await hashPassword(generatedPassword);

                    // Create user with the applicant's email, generated password, role, and branch ID
                    const newUser = await createUser(
                        email,
                        hashedPassword,
                        applicant.company_id,
                        roleOffered,
                        false,             // isMainUser
                        applicantId,
                        true,              // isActive
                        false,             // isDeleted
                        false,             // isDormant
                        false,             // isSubcontractorEmployee (explicitly false since not a subcontractor submission)
                        false,             // isSubcontractor (false because this is not from a subcontractor)
                        branchId
                    );
                    
                    if (!newUser.user_pin) throw new Error("Failed to generate user PIN.");
                    
                    // Send login credentials to applicant
                    await sendLoginCredentialsEmail(email, newUser.user_pin, generatedPassword);

                    console.log(`Created user for applicant ${email} with role ${roleOffered} at branch ID ${branchId}. Email sent.`);
                } catch (backgroundError) {
                    console.error("Background process failed:", backgroundError);
                }
            });
        } else {
            res.status(200).json({ message: `Job offer ${status.toLowerCase()} successfully`, offer: updatedOffer });
        }
    } catch (error: any) {
        console.error("Failed to handle job offer response:", {
            message: error.message,
            stack: error.stack,
            offerId,
            status,
            token,
        });
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};


export const getJobOffers = async (req: Request, res: Response) => {
    try {
        const { companyId } = req.params;
        const offers = await JobModel.getJobOffersByCompanyId(parseInt(companyId));
        res.json(offers);
    } catch (error: any) {
        console.error("Failed to fetch job offers:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};


export const acceptJobOffer = async (req: Request, res: Response) => {
    const { offerId } = req.params;
    try {
        // Explicitly pass new Date() to update the signed_on column
        const updatedOffer = await JobModel.updateJobOfferStatus(parseInt(offerId), 'Accepted', new Date());
        res.json(updatedOffer);
    } catch (error: any) {
        console.error("Failed to accept job offer:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const rejectJobOffer = async (req: Request, res: Response) => {
    const { offerId } = req.params;
    try {
        // Pass null explicitly for signed_on when rejecting
        const updatedOffer = await JobModel.updateJobOfferStatus(parseInt(offerId), 'Rejected', null);
        res.json(updatedOffer);
    } catch (error: any) {
        console.error("Failed to reject job offer:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const updateJobStatus = async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const { status } = req.body;

    try {
        const updatedJob = await JobModel.updateJobStatus(parseInt(jobId), status);
        res.json(updatedJob);
    } catch (error: any) {
        console.error("Failed to update job status:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const deleteJob = async (req: Request, res: Response) => {
    const { jobId } = req.params;
    try {
        const deletedJob = await JobModel.deleteJobById(parseInt(jobId));
        if (deletedJob) {
            res.json({ message: "Job deleted successfully", job: deletedJob });
        } else {
            res.status(404).json({ error: "Job not found" });
        }
    } catch (error: any) {
        console.error("Failed to delete job:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};

export const getJobOfferDetails = async (req: Request, res: Response) => {
    const offerId = parseInt(req.params.offerId);

    try {
        const jobOffer = await JobModel.getJobOfferById(offerId);

        if (!jobOffer) {
            res.status(404).json({ error: "Job offer not found" });
            return;
        }

        res.status(200).json(jobOffer);
    } catch (error: any) {
        console.error("Failed to fetch job offer details:", error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
};
