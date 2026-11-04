import { config as loadDotenv } from 'dotenv';

loadDotenv({ quiet: true });
process.env.NODE_ENV = 'test';
