import { testEnvironmentVariable } from '../settings';
import Model from '../models/model';

const userProfileModel = new Model('UD_P_USER_PROFILE');

const indexPage = (req, res) => res.status(200).json({ message: testEnvironmentVariable });
const userProfilePage = async (req, res) => {
    try {
      const data = await userProfileModel.select('USERNAME');
      res.status(200).json({ username: data.rows });
    } catch (err) {
      res.status(200).json({ messages: err.stack });
    }
};

module.exports = {
    indexPage,
    userProfilePage
}
