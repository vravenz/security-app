import express, { Express, Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import jobRoutes from './routes/jobRoutes';
import applicantRoutes from './routes/applicantRoutes';
import employeeRoutes from './routes/employeeRoutes';
import branchRoutes from './routes/branchRoutes';
import guardGroupRoutes from './routes/guardGroupRoutes';
import subcontractorRoutes from './routes/subcontractorRoutes';
import subcontractorCompanyRoutes from './routes/subcontractorCompanyRoutes';
import clientRoutes from './routes/clientRoutes';
import sitesRoutes from './routes/siteRoutes';
import roasterRoutes from './routes/roasterRoutes';
import path from 'path';

dotenv.config();
const app: Express = express();

app.use(cors());
app.use(bodyParser.json());

// -------------------------------------------------------
// Middleware: Extract userId from header "x-user-id" (or from body)
// -------------------------------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  let userId: number | undefined;
  // Check for the user id in headers
  if (req.headers['x-user-id']) {
    const headerValue = req.headers['x-user-id'] as string;
    userId = parseInt(headerValue, 10);
  }
  // Optionally, check for user_id in the request body
  else if (req.body && req.body.user_id) {
    userId = parseInt(req.body.user_id, 10);
  }
  // Only assign if userId is defined and a valid number
  if (userId !== undefined && !isNaN(userId)) {
    (req as any).userId = userId;
  }
  next();
});

// -------------------------------------------------------
// Define routes
// -------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applicants', applicantRoutes);
app.use('/api', employeeRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api', guardGroupRoutes);
app.use('/api/subcontractors', subcontractorRoutes);
app.use('/api/subcontractor-company', subcontractorCompanyRoutes);
app.use('/api', clientRoutes);
app.use('/api', sitesRoutes);
app.use('/api', roasterRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../src/uploads')));

app.get('/', (req: Request, res: Response) => {
  res.status(200).send("Welcome to the Security App API!");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
