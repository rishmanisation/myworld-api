import { testEnvironmentVariable } from '../settings';
import Model from '../models/model';
import { json } from 'express';

const userProfileModel = new Model('UD_P_USER_PROFILE');
const addrTemplatesModel = new Model('MD_ADDRESS_TEMPLATES');
const templatesModel = new Model('MD_TEMPLATES');
const roomsModel = new Model('MD_ROOMS');
const userItemsModel = new Model('UD_P_USER_ITEMS');
const userSubscModel = new Model('UD_P_USER_SUBSCRIPTIONS');
const userHomesModel = new Model('UD_P_USER_HOMES');

const indexPage = (req, res) => res.status(200).json({ message: testEnvironmentVariable });

const userDetails = async (req, res) => {
  try {
    const userDetails = await userProfileModel.select('USERNAME, FIRST_NAME, LAST_NAME, EMAIL_ADDRESS, ADDRESS, PHONE_NUMBER, PICTURE');
    res.status(200).json({ userDetails: userDetails.rows });
  } catch (err) {
    res.status(500).json({ messages: err.stack });
  }
};

const userProfilePage = async (req, res) => {
  try {
    const userNameQuery = await userProfileModel.select('USERNAME, ADDRESS');
    const userName = userNameQuery.rows[0]["username"];
    const address = userNameQuery.rows[0]["address"];

    const addrTemplateIdQuery = await addrTemplatesModel.select("TEMPLATE_ID", "where ADDRESS LIKE '%" + address + "%'");
    const templateId = addrTemplateIdQuery.rows[0]["template_id"];

    const templateDetailsQuery = await templatesModel.select('*', 'where TEMPLATE_ID = ' + String(templateId));
    const templateDetails = templateDetailsQuery.rows;
    const rooms = templateDetails[0]["room_ids"];

    let response = {
      'address': address,
      'templateId': templateId,
      'templateType': templateDetails[0]['template_type'],
      'rooms': {}
    };

    const getRooms = await roomsModel.select("*", "where ROOM_ID in (''" + rooms.join("'',''") + "'')");
    const roomDetails = getRooms.rows;
    response["rooms"] = roomDetails;

    res.status(200).json({ template: response })
  } catch (err) {
    res.status(500).json({ messages: err.stack });
  }
};

const userItemsPage = async (req, res) => {
  try {
    const userItemsQuery = await userItemsModel.select('*');
    res.status(200).json({ items: userItemsQuery.rows })
  } catch (err) {
    res.status(500).json({ messages: err.stack });
  }
};

const userSubscriptionsPage = async (req, res) => {
  try {
    const userSubscQuery = await userSubscModel.select('*');
    res.status(200).json({ subscriptions: userSubscQuery.rows })
  } catch (err) {
    res.status(500).json({ messages: err.stack });
  }
};
 
module.exports = {
    indexPage,
    userDetails,
    userProfilePage,
    userItemsPage,
    userSubscriptionsPage
} 
