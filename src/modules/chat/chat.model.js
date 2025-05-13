const { Schema, model, models } = require("mongoose");
const ModelGenerator = require("../../utils/database/modelGenerator");
const CryptoJS = require("crypto-js");

const gen = new ModelGenerator();

// Subdocument schema for User
const UserSchema = new Schema(
  {
    _id: gen.required(String),
    email: gen.required(String),
    name: gen.required(String),
    picture: String,
  },
  { _id: false }
);

// Message Schema
const MessageSchema = new Schema(
  {
    sender: UserSchema,
    receiver: UserSchema,
    message: gen.required(String),
    read: gen.required(Boolean, { default: false }),
    readAt: Date,
    deletedBySender: gen.required(Boolean, { default: false }),
    deletedByReceiver: gen.required(Boolean, { default: false }),
  },
  { timestamps: true }
);

// Encryption/Decryption methods
MessageSchema.pre("save", function (next) {
  if (this.isModified("message")) {
    this.message = CryptoJS.AES.encrypt(
      this.message,
      process.env.CHAT_ENCRYPTION_KEY
    ).toString();
  }
  next();
});

MessageSchema.methods.decryptMessage = function () {
  const bytes = CryptoJS.AES.decrypt(
    this.message,
    process.env.CHAT_ENCRYPTION_KEY
  );
  return bytes.toString(CryptoJS.enc.Utf8);
};

const ChatMessage = models?.ChatMessage || model("ChatMessage", MessageSchema);
module.exports = ChatMessage;
