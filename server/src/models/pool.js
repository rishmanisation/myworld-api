import { Pool } from 'pg';
import dotenv from 'dotenv';
import { connectionString } from '../settings';
dotenv.config();

/* FOR DOCKER
export const pool = new Pool({
    user: 'lenio',
    host: 'yash-db',
    database: 'yash',
    password: '1234',
    port: '5432'
});
*/

/*
FOR LOCAL - RISHABH
*/
export const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'myworld',
    password: 'pwd',
    port: '5432'
});
