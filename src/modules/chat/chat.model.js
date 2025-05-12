const { Schema, model, models } = require("mongoose");
const ModelGenerator = require("../../utils/database/modelGenerator");
const CryptoJS = require("crypto-js");

const gen = new ModelGenerator();

//creating chat schema
const MessageSchema = new Schema(
  {
    sender: gen.required({
      _id: { type: String, required: true },
      email: { type: String, required: true },
      name: { type: String, required: true },
      picture: { type: String },
    }),
    receiver: gen.required({
      _id: { type: String, required: true },
      email: { type: String, required: true },
      name: { type: String, required: true },
      picture: { type: String },
    }),
    message: gen.required(String),
    read: gen.required(Boolean, { default: false }),
    readAt: { type: Date },
    deletedBySender: gen.required(Boolean, { default: false }),
    deletedByReceiver: gen.required(Boolean, { default: false }),
  },
  { timestamps: true }
);

//Encrypt message before saving
MessageSchema.pre("save", function (next) {
  if (this.isModified("message")) {
    this.message = CryptoJS.AES.encrypt(
      this.message,
      process.env.CHAT_ENCRYPTION_KEY
    ).toString();
  }
  next();
});

//Decrypt message when receiving
MessageSchema.methods.dcryptMessage = function () {
  const bytes = CryptoJS.AES.decrypt(
    this.message,
    process.env.CHAT_ENCRYPTION_KEY
  );
  return bytes.toString(CryptoJS.enc.Utf8);
};

const ChatMessage =
  models?.ChatMessageChatMessage || model("ChatMessage", MessageSchema);
module.exports = ChatMessage;
