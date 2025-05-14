const { AddVendor } = require("./admin.methods");
const basicMiddleware = require("../../middlewares/basicMiddleware");

const route = require("express").Router();

// Vendor management
route.post("/add-vendor", basicMiddleware, AddVendor);

module.exports = route;
