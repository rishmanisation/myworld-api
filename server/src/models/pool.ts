import { Pool } from 'pg';
//import dotenv from 'dotenv';
//import { connectionString } from '../settings';
//dotenv.config();

/*
export const pool = new Pool({
    user: 'lenio',
    host: 'yash-db',
    database: 'yash',
    password: '1234'
});
*/



//FOR LOCAL - RISHABH

export const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'myworld',
    password: 'rish'
});