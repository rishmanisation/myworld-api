import Model from '../models/model';
import { Pool, Client } from 'pg';

/*
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'myworld',
  password: 'pwd',
  port: '5432'
});

const pool = new Pool({
  connectionString: 'postgresql://postgres:pwd@host.docker.internal:5432/myworld'
});
*/
const userProfileModel = new Model('UD_P_USER_PROFILE');

export const userProfilePage = async (req, res) => {
  try {
    res.status(200).json({ username: result.rows });
    //const data = await userProfileModel.select('username');
  } catch (err) {
    res.status(200).json({ messages: err.stack });
  } 
};