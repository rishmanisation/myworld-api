import Model from './model';
import { getPasswordHash } from '../utils/security';

const jwt = require('jwt-simple');

const model = new Model("ud_p_user_profile");

/**
 * Generates the JWT for the user.
 * @param {Object} user 
 * @param {function} callback 
 */
function tokenForUser(user: any) {
    var timeStamp = new Date().getTime()
    return jwt.encode({ sub: user, iat: timeStamp }, 'secret');
}


/**
 * Function to update the user information in the pool upon sign-in.
 * @param {Object} user 
 */
function updateUserInformation(user: any) {
    var firstName = user.rows[0]["first_name"];
    var lastName = user.rows[0]["last_name"];
    var email = user.rows[0]["user_id"];
    var updateQuery = "update ud_p_user_profile set first_name='" + firstName + "', last_name='" + lastName + "' where user_id='" + email + "'";
    return model.executeQueryString(updateQuery);
}

/**
 * Retrieves all the whitelisted users.
 * @param {Object} user 
 * @param {function} callback 
 */
function getAllWhitelisted(user: any) {
    var allWhitelistedQuery = "select user_id, concat(first_name, ' ', last_name) as name from ud_p_user_profile";
    return model.executeQueryString(allWhitelistedQuery);
}

/**
 * Filters user records based on email id.
 * @param {Object} payload 
 * @param {function} callback 
 */
function getUserByEmail(payload: any) {
    var email = payload.email;
    var query = "select user_id, first_name, last_name from ud_p_user_profile where user_id='" + email + "'";
    return model.executeQueryString(query);
}

//export class User {
/**
 * Check whether a given email id is whitelisted or not.
 * @param {Object} email
 * @param {function} callback
 */
export function isWhitelisted(email: string) {
    var checkQuery = 'select count(*) as count from ud_p_user_profile where user_id=' + "'" + email + "'";
    console.log(checkQuery);
    return model.executeQueryString(checkQuery);
}

/**
 * Whitelist a user.
 * @param {Object} email
 * @param {function} callback
 */
export function whitelistUser(email: string) {
    return getPasswordHash("password").then((result: string) => {
        var insertQuery = "insert into ud_p_user_profile(user_id, first_name, last_name, password) values('" + email + "', 'test', 'user', '" + result + "')";
        return model.executeQueryString(insertQuery);
    }, (err: any) => {
        console.log(err);
    })
}

export function findOne(email: string) {
    var findQuery = `select user_id, first_name, last_name, password from ud_p_user_profile where user_id = '${email}'`;
    console.log(findQuery);
    return model.executeQueryString(findQuery);
}

/**
 * Generates the payload for a user. Payload consists of current user information, a list of all whitelisted users (for 
 * display on the profile page) and the user's JWT.
 * @param {Object} user
 * @param {function} callback
 */
export function getPayload(user: any) {
    var currUserInfo: any, allUsers: any, token: any;
    return updateUserInformation(user)
        .then(() => {
            return getUserByEmail({ email: user.rows[0]["user_id"] });
        }, (error) => {
            console.log(error);
        })
        .then((result) => {
            currUserInfo = result.rows[0];
            return getAllWhitelisted(user);
        }, (error) => {
            console.log(error);
        })
        .then((result) => {
            allUsers = result.rows;
            return tokenForUser(user);
        }, (error) => {
            console.log(error);
        })
        .then((result) => {
            token = result;
            return { user: currUserInfo, allUsers: allUsers, token: token };
        }, (error) => {
            console.log(error);
        });
}

//}


