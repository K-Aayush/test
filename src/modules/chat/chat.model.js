const { Schema, model, models } = require("mongoose");
const ModelGenerator = require("../../utils/database/modelGenerator");
const CryptoJS = require("crypto-js");

const gen = new ModelGenerator();

// Define sub-schemas for sender and receiver
const UserSchema = new Schema(
  {
    _id: gen.required(String),
    email: gen.required(String),
    name: gen.required(String),
    picture: String,
  },
  { _id: false }
);

const MessageSchema = new Schema(
  {
    sender: gen.required(UserSchema),
    receiver: gen.required(UserSchema),
    message: gen.required(String),
    read: gen.required(Boolean, { default: false }),
    readAt: Date,
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
