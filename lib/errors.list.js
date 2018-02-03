/**
 * Created by Eabasir on 30/01/2018.
 */

let adminOnly = new Error("Only admin can do this.");
adminOnly.status = 403;

let badPass = new Error("Incorrect password");
badPass.status = 401;

let noUser = new Error('Person not found');
noUser.status = 400;

let noPass = new Error('No password is set up');
noPass.status = 500;

module.exports = {
  adminOnly,
  badPass,
  noUser,
  noPass,
};
