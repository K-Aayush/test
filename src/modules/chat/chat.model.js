const { Schema, model, models } = require("mongoose");
const ModelGenerator = require("../../utils/database/modelGenerator");

const gen = new ModelGenerator();

//creating chat schema
const MessageSchema = new Schema(
  {
    sender: gen.required({
      _id: gen.required(String),
      email: gen.required(String),
      name: gen.required(String),
      picture: string,
    }),
    receiver: gen.required({
      _id: gen.required(String),
      email: gen.required(String),
      name: gen.required(String),
      picture: string,
    }),
    message: gen.required(string),
    read: gen.required(Boolean, { default: false }),
    readAt: Date,
    deletedBySender: gen.required(Boolean, { default: false }),
    deletedByReceiver: gen.required(Boolean, { default: false }),
  },
  { timestamps: true }
);

const ChatMessage =
  models?.ChatMessageChatMessage || model("ChatMessage", MessageSchema);
module.exports = ChatMessage;
