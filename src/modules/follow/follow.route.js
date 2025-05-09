const router = require("express").Router();

const basicMiddleware = require("../../middlewares/basicMiddleware");
const {
  UpdateFollow,
  ListFollowers,
  ListFollowings,
} = require("./follow.methods");

router.post("/update-follow-request", basicMiddleware, UpdateFollow);

// get
router.get("/list-followers/:page", basicMiddleware, ListFollowers);
router.get("/list-followings/:page", basicMiddleware, ListFollowings);

module.exports = router;
