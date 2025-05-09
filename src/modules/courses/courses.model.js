const { Schema, models, model } = require("mongoose");
const ModelGenerator = require("../../utils/database/modelGenerator");

const gen = new ModelGenerator();

const CourseSchema = new Schema({
  title: gen.required(String),
  description: gen.required(String),
  price: gen.required({
    usd: gen.required(Number),
    npr: gen.required(Number),
  }),
  thumbnail: gen.required(String),
  notes: gen.required([
    {
      name: gen.required(String),
      pdf: gen.required(String),
      premium: gen.required(Boolean, { default: false }),
    },
  ]),
  author: gen.required({
    email: gen.required(String),
    _id: gen.required(String),
    phone: gen.required(String),
  }),
});

const Courses = models?.Course || model("Course", CourseSchema);
module.exports = Courses;
