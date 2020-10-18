import { Pool } from 'pg';
import dotenv from 'dotenv';
import { connectionString } from '../settings';
dotenv.config();

export const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'myworld',
    password: 'pwd',
    port: '5432'
});