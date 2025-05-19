const GenRes = require("../../utils/routers/GenRes");
const User = require("../user/user.model");
const Follow = require("./follow.model");
const { isValidObjectId } = require("mongoose");
const ChatMessage = require("../chat/chat.model");

const UpdateFollow = async (req, res) => {
  try {
    const useremail = req?.user?.email;
    const followemail = req?.body?.email;
    const action = req?.body?.action;

    if (!useremail || !followemail) {
      const response = GenRes(
        400,
        null,
        { error: "Required details not found!" },
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

    const followExists = await Follow.findOne({
      "follower.email": useremail,
      "following.email": followemail,
    });

    if (action === "unfollow") {
      if (!followExists) {
        const response = GenRes(
          400,
          null,
          { error: "Not following this user!" },
          "Not following this user"
        );
        return res.status(400).json(response);
      }
      await Follow.deleteOne({
        "follower.email": useremail,
        "following.email": followemail,
      });
      const response = GenRes(
        200,
        { follower, following },
        null,
        "Unfollowed Successfully!"
      );
      return res.status(200).json(response);
    } else {
      if (followExists) {
        const response = GenRes(
          400,
          null,
          { error: "Already following this user!" },
          "Already following this user"
        );
        return res.status(400).json(response);
      }
      const newFollow = new Follow({
        follower: follower?.toObject(),
        following: following?.toObject(),
      });
      await newFollow.save();

      // Check for mutual follow and handle chat
      const mutualFollow = await Follow.findOne({
        "follower.email": followemail,
        "following.email": useremail,
      });

      if (mutualFollow) {
        const welcomeMessage = new ChatMessage({
          sender: follower.toObject(),
          receiver: following.toObject(),
          message: "👋 Hey! You can now chat with each other!",
          read: false,
        });
        await welcomeMessage.save();

        const aedes = req.app.get("aedes");
        if (aedes) {
          const chatTopic = getChatTopic(
            follower._id.toString(),
            following._id.toString()
          );

          // Notify both users to refresh chat list
          const refreshPayload = {
            type: "refresh_chat_list",
          };
          aedes.publish({
            topic: `user/${follower._id}/messages`,
            payload: JSON.stringify(refreshPayload),
            qos: 0,
          });
          aedes.publish({
            topic: `user/${following._id}/messages`,
            payload: JSON.stringify(refreshPayload),
            qos: 0,
          });

          // Send new chat notification to both users
          const newChatPayloadFollower = {
            type: "new_chat",
            user: following.toObject(),
            lastMessage: welcomeMessage.toObject(),
            unreadCount: 0,
          };
          const newChatPayloadFollowing = {
            type: "new_chat",
            user: follower.toObject(),
            lastMessage: welcomeMessage.toObject(),
            unreadCount: 1,
          };
          aedes.publish({
            topic: `user/${follower._id}/messages`,
            payload: JSON.stringify(newChatPayloadFollower),
            qos: 0,
          });
          aedes.publish({
            topic: `user/${following._id}/messages`,
            payload: JSON.stringify(newChatPayloadFollowing),
            qos: 0,
          });

          // Subscribe both users to the chat topic if online
          const onlineClients = aedes.onlineClients || new Map(); // Access onlineClients from Aedes instance
          if (onlineClients.has(follower._id.toString())) {
            const followerClient =
              aedes.clients[onlineClients.get(follower._id.toString())];
            if (followerClient) {
              followerClient.subscribe({ topic: chatTopic, qos: 0 });
            }
          }
          if (onlineClients.has(following._id.toString())) {
            const followingClient =
              aedes.clients[onlineClients.get(following._id.toString())];
            if (followingClient) {
              followingClient.subscribe({ topic: chatTopic, qos: 0 });
            }
          }

          // Update userChats for both users
          if (!aedes.userChats.has(follower._id.toString())) {
            aedes.userChats.set(follower._id.toString(), new Set());
          }
          if (!aedes.userChats.has(following._id.toString())) {
            aedes.userChats.set(following._id.toString(), new Set());
          }
          aedes.userChats.get(follower._id.toString()).add(chatTopic);
          aedes.userChats.get(following._id.toString()).add(chatTopic);
        }
      }

      const response = GenRes(
        200,
        { follower, following },
        null,
        "Followed Successfully!"
      );
      return res.status(200).json(response);
    }
  } catch (error) {
    const response = GenRes(500, null, { error: error.message }, error.message);
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

//Get user's followers
const GetUsersFollowers = async (req, res) => {
  try {
    const userId = req.params.id;
    const page = parseInt(req.query.page) || 0;
    const limit = 20;

    if (!isValidObjectId(userId)) {
      return res
        .status(400)
        .json(
          GenRes(
            400,
            null,
            { error: "Invalid user ID" },
            "Invalid user ID provided"
          )
        );
    }

    //find the existing user
    const user = await User.findById(userId);

    //check if user exists
    if (!user) {
      return res
        .status(404)
        .json(GenRes(404, null, { error: "User not found" }, "User not found"));
    }

    //find the followers
    const followers = await Follow.find({ "following._id": userId })
      .select("follower")
      .skip(page * limit)
      .limit(limit)
      .lean();

    //map the followerList
    const followerList = followers.map((f) => {
      const { _id, ...followerData } = f.follower;
      return followerData;
    });

    //If success return 200 OK
    return res
      .status(200)
      .json(
        GenRes(
          200,
          followerList,
          null,
          `Found ${followerList.length} followers`
        )
      );
  } catch (error) {
    //catch the error if any occurs
    return res.status(500).json(GenRes(500, null, error, error?.message));
  }
};

//Get user's following
const GetUsersFollowing = async (req, res) => {
  try {
    const userId = req.params.id;
    const page = parseInt(req.query.page) || 0;
    const limit = 20;

    if (!isValidObjectId(userId)) {
      return res
        .status(400)
        .json(
          GenRes(
            400,
            null,
            { error: "Invalid user ID" },
            "Invalid user ID provided"
          )
        );
    }

    //find the existing user
    const user = await User.findById(userId);

    //return 404 error if user doesn't exists
    if (!user) {
      return res
        .status(404)
        .json(GenRes(404, null, { error: "User not found" }, "User not found"));
    }

    //find the followings
    const following = await Follow.find({ "follower._id": userId })
      .select("following")
      .skip(page * limit)
      .limit(limit)
      .lean();

    //map the followingList
    const followingList = following.map((f) => {
      const { _id, ...followingData } = f.following;
      return followingData;
    });

    //If success return 200 OK
    return res
      .status(200)
      .json(
        GenRes(
          200,
          followingList,
          null,
          `Found ${followingList.length} followings`
        )
      );
  } catch (error) {
    //catch the error if any occurs
    return res.status(500).json(GenRes(500, null, error, error?.message));
  }
};

module.exports = {
  UpdateFollow,
  ListFollowers,
  ListFollowings,
  GetUsersFollowers,
  GetUsersFollowing,
};
