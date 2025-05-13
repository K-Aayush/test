const router = require("express").Router();
const basicMiddleware = require("../../middlewares/basicMiddleware");
const { GetMessages, GetChats } = require("./chat.methods");

// Get chat messages between two users
router.get("/messages/:userId", basicMiddleware, GetMessages);

// Get chat list with latest messages
router.get("/chats", basicMiddleware, GetChats);

module.exports = router;
