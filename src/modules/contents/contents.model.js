const { Schema, model, models } = require("mongoose");
const ModelGenerator = require("../../utils/database/modelGenerator");

const gen = new ModelGenerator();

const contentSchema = new Schema(
  {
    status: String,
    files: [String],
    type: gen.required(String, {
      default: "innovation",
      enum: ["innovation", "news", "announcement", "vacancy", "status"],
    }),
    author: {
      name: gen.required(String),
      picture: String,
      email: gen.required(String), // fixed typo
      _id: String,
    },
  },
  { timestamps: true, timeseries: true }
);

contentSchema.pre("save", function (next) {
  if (!this.author?._id) {
    return next(new Error("Author details must include user_id or uid!"));
  }
  next();
});

const Content = models?.Content || model("Content", contentSchema);
module.exports = Content;
