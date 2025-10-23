import { config } from 'dotenv';
import path from 'path';

// Load environment variables for the Genkit development server from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });
