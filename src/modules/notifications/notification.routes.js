const router = require("express").Router();
const basicMiddleware = require("../../middlewares/basicMiddleware");
const {
  GetNotifications,
  MarkAsRead,
  DeleteNotification,
} = require("./notification.methods");

router.get("/notifications", basicMiddleware, GetNotifications);
router.post("/notifications/mark-read", basicMiddleware, MarkAsRead);
router.delete("/notifications/:id", basicMiddleware, DeleteNotification);

module.exports = router;
