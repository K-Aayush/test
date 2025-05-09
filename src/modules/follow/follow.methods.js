const GenRes = require("../../utils/routers/GenRes");
const User = require("../user/user.model");
const Follow = require("./follow.model");

const UpdateFollow = async (req, res) => {
  try {
    const useremail = req?.user?.email;
    const followemail = req?.body?.email;

    if (!useremail || !followemail) {
      const response = GenRes(
        400,
        null,
        { error: "required details not found!" },
        "Required Details Not Found!"
      );
      return res.status(400).json(response);
    }

    const follower = await User.findOne({ email: useremail }).select(
      "_id email name picture"
    );

    if (!follower) {
      const response = GenRes(
        404,
        null,
        { error: "Follower not found!" },
        "Follower not found"
      );
      return res.status(404).json(response);
    }

    const following = await User.findOne({ email: followemail }).select(
      "_id email name picture"
    );
    if (!following) {
      const response = GenRes(
        404,
        null,
        { error: "Following not found!" },
        "Following not found"
      );
      return res.status(404).json(response);
    }

    const exists = await Follow.findOneAndDelete({
      "follower.email": useremail,
      "following.email": followemail,
    });

    if (!exists) {
      const newFollow = new Follow({
        follower: follower?.toObject(),
        following: following?.toObject(),
      });
      await newFollow.save();
    }

    const response = GenRes(
      200,
      { follower, following },
      null,
      exists ? "Unfollowed Successfully!" : "Followed Successfully!"
    );

    return res.status(200).json(response);
  } catch (error) {
    const response = GenRes(
      500,
      null,
      { error: error },
      error?.message
    );
    return res.status(500).json(response);
  }
};
// list followers
const ListFollowers = async (req, res) => {
  try {
    const page = parseInt(req?.query?.page || "0") || 0;
    const email = req?.user?.email;
    const follower = await Follow.find({ "following.email": email })
      .skip(page * 50)
      .limit(50)
      .select("follower");
    const response = GenRes(
      200,
      follower,
      `Responding ${follower?.length} followers!`
    );
    return res.status(200).json(response);
  } catch (error) {
    const response = GenRes(500, null, error?.message, { error });
    return res.status(500).json(response);
  }
};

// list following
const ListFollowings = async (req, res) => {
  try {
    const page = parseInt(req?.query?.page || "0") || 0;
    const email = req?.user?.email;
    const following = await Follow.find({ "follower.email": email })
      .skip(page * 50)
      .limit(50)
      .select("following");
    const response = GenRes(
      200,
      following,
      `Responding ${following?.length} followings!`
    );
    return res.status(200).json(response);
  } catch (error) {
    const response = GenRes(500, null, error?.message, { error });
    return res.status(500).json(response);
  }
};

module.exports = { UpdateFollow, ListFollowers, ListFollowings };
