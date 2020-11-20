import { testEnvironmentVariable } from '../settings';
import Model from '../models/model';
import { json } from 'express';
import * as data from '../../resources/cards.json';
import { executeQuery } from '../utils/queryFunctions';

const userProfileModel = new Model('UD_P_USER_PROFILE');
const addrTemplatesModel = new Model('MD_ADDRESS_TEMPLATES');
const templatesModel = new Model('MD_TEMPLATES');
const roomsModel = new Model('MD_ROOMS');
const userItemsModel = new Model('UD_P_USER_ITEMS');
const userSubscModel = new Model('UD_P_USER_SUBSCRIPTIONS');
const userHomesModel = new Model('UD_P_USER_HOMES');

const indexPage = (req, res) => res.status(200).json({ message: testEnvironmentVariable });

const renderCard = async (card) => {
  try {
    const params = data[card];
    const mainModel = new Model(params["mainTable"].toUpp);

    const foreignKeyQuery = await executeQuery('foreignKey', params);
    const foreignKey = foreignKeyQuery.rows[0]["fk_column"];

    const resultQuery = await mainModel.executeJoinQuery(params, foreignKey);

    return resultQuery.rows;
  } catch (err) {
    return { err: err.stack };
  }
};

const renderPage = async (req, res) => {
  try {
    const cards = req.body["cards"];
    const response = {
      [req.body["key"]] : {}
    };

    for(const card of cards) {
      response[req.body["key"]][card] = await renderCard(card);
    }

    return res.status(200).json({ response : response });
  } catch (err) {
    return res.status(500).json({ response: err.stack });
  }
};

// Landing page endpoint. Displays basic user details and top 5 items and subscriptions
const landingPage = async (req, res) => {
  try {
    const userDetails = await userProfileModel.select('USERNAME, FIRST_NAME, LAST_NAME');
    const username = userDetails.rows[0]["username"]
    const name = userDetails.rows[0]["first_name"] + ' ' + userDetails.rows[0]["last_name"];

    const itemsQuery = "SELECT A.ITEM_ID, B.MANUFACTURER, B.MODEL "
     + "FROM UD_P_USER_ITEMS A "
     + "JOIN MD_ITEMS B ON A.ITEM_ID = B.ITEM_ID LIMIT 5";
    const topItems = await userItemsModel.executeQuery(itemsQuery)

    const subscQuery = "SELECT A.SUBSC_ID, A.BILLING_MODEL, B.MANUFACTURER "
    + "FROM UD_P_USER_SUBSCRIPTIONS A "
    + "JOIN MD_SUBSCRIPTIONS B ON A.SUBSC_ID = B.SUBSC_ID LIMIT 5";
    const topSubsc = await userSubscModel.executeQuery(subscQuery);

    const response = {
      "username": username,
      "name": name,
      "topItems": topItems.rows,
      "topSubscriptions": topSubsc.rows
    }

    res.status(200).json(response);
  } catch (err) {
    res.status(500).json({ messages: err.stack });
  }
};

// Endpoint to retrieve all user details
const userDetails = async (req, res) => {
  try {
    const userDetails = await userProfileModel.select('USERNAME, FIRST_NAME, LAST_NAME, EMAIL_ADDRESS, ADDRESS, PHONE_NUMBER, PICTURE');
    res.status(200).json({ userDetails: userDetails.rows });
  } catch (err) {
    res.status(500).json({ messages: err.stack });
  }
};

// Endpoint to store user template. Work in progress. Currently just returns template JSON.
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

// Endpoint for all user items. Warranty info present in DB but query to be modified in order 
// to return this information.
const userItemsPage = async (req, res) => {
  try {
    const itemsQuery = "SELECT A.ITEM_ID, A.PURCHASED_COLOR, A.PURCHASE_DATE, A.PURCHASE_STORE, " 
     + "A.PURCHASE_LOCATION, B.MANUFACTURER, B.MODEL, B.DESCRIPTION, B.CATEGORY, B.IMAGES, B.MANUAL "
     + "FROM UD_P_USER_ITEMS A "
     + "JOIN MD_ITEMS B ON A.ITEM_ID = B.ITEM_ID";
    const userItemsQuery = await userItemsModel.executeQuery(itemsQuery);
    res.status(200).json({ items: userItemsQuery.rows })
  } catch (err) {
    res.status(500).json({ messages: err.stack });
  }
};

// Endpoint to return all user subscriptions.
const userSubscriptionsPage = async (req, res) => {
  try {
    const subscQuery = "SELECT A.SUBSC_ID, A.BILLING_MODEL, A.BILLING_DATE, A.EXPIRY_DATE, " 
    + "A.PURCHASE_PRICE, B.MANUFACTURER, B.DESCRIPTION, B.CATEGORY, B.MANUAL "
    + "FROM UD_P_USER_SUBSCRIPTIONS A "
    + "JOIN MD_SUBSCRIPTIONS B ON A.SUBSC_ID = B.SUBSC_ID";
    const userSubscQuery = await userSubscModel.executeQuery(subscQuery);
    res.status(200).json({ subscriptions: userSubscQuery.rows })
  } catch (err) {
    res.status(500).json({ messages: err.stack });
  }
};
 
module.exports = {
    renderPage,
    indexPage,
    landingPage,
    userDetails,
    userProfilePage,
    userItemsPage,
    userSubscriptionsPage
} 
