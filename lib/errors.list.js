/**
 * Created by Eabasir on 30/01/2018.
 */

let adminOnly = new Error("Only admin can do this.");
adminOnly.status = 403;

let badPass = new Error("Incorrect password");
badPass.status = 401;


module.exports = {
  adminOnly,
  badPass
};
