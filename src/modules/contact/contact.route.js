const adminMiddleware  = require("../../middlewares/adminMiddleware");

const express = require("express");

const router = express.Router();

const { createContact, getAllContactsByAdmin } = require("./contact.method");

router.post("/contact", createContact);

router.get("/contact", adminMiddleware, getAllContactsByAdmin);

module.exports = router;