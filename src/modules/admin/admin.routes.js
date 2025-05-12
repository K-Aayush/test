const loginAdmin = require("./admin.login");
const { SaveAdmin, AddVendor } = require("./admin.methods");
const registerAdmin = require("./admin.register");
const { adminMiddleware } = require("../../middlewares/adminMiddleware");

const route = require("express").Router();

route.post("/admin-login", loginAdmin);
route.post("/admin-register-request", registerAdmin);
route.get("/validate-admin-login/:token", SaveAdmin);

// Vendor management
route.post("/add-vendor", adminMiddleware, AddVendor);

module.exports = route;
