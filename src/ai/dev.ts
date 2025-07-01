import { config } from 'dotenv';
import path from 'path';

// Load environment variables for the Genkit development server.
config({ path: path.resolve(process.cwd(), '.env') });

import '@/ai/flows/team-name-generator.ts';
import '@/ai/flows/grant-admin-flow.ts';
