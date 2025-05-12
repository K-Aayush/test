const { isValidObjectId } = require("mongoose");
const ChatMessage = require("./chat.model");
const GenRes = require("../../utils/routers/GenRes");
const Follow = require("../follow/follow.model");

//method to get message
const GetMessages = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 0;
    const limit = 50;

    if (!isValidObjectId(userId)) {
      return res
        .status(400)
        .json(
          GenRes(
            400,
            null,
            { error: "Invalid user ID" },
            "Invalid user id provided"
          )
        );
    }

    //check if users follow each other
    const [followA, followB] = await Promise.all([
      Follow.findOne({
        "follower.email": req.user.email,
        "followind._id": userId,
      }),
      Follow.findOne({
        "follower._id": userId,
        "following.email": req.user.email,
      }),
    ]);

    if (!followA || !followB) {
      return res
        .status(403)
        .json(
          GenRes(
            403,
            null,
            { error: "Not mutual followers" },
            "You can only view messages with mutual followers"
          )
        );
    }

    const messages = await ChatMessage.find({
      $or: [
        {
          "sender._id": userId,
          "receiver._id": req.user._id,
          deletedByReceiver: false,
        },
        {
          "sender._id": req.user._id,
          "receiver._id": userId,
          deletedBySender: false,
        },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit);

    //Decrypt Messages
    const decryptedMessages = messages.map((msg) => {
      const msgObj = msg.toObject();
      msgObj.message = msg.decryptMessage();
      return msgObj;
    });

    //mark message as read
    await ChatMessage.updateMany(
      {
        "sender._id": userId,
        "receiver._id": req.user._id,
        read: false,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    return res
      .status(200)
      .json(
        GenRes(
          200,
          decryptedMessages,
          null,
          `Retrived ${decryptedMessages.length} messages`
        )
      );
  } catch (error) {
    return res.status(500).json(GenRes(500, null, error, error?.message));
  }
};
