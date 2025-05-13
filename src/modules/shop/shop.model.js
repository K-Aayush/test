const { Schema, model, models } = require("mongoose");
const ModelGenerator = require("../../utils/database/modelGenerator");

const gen = new ModelGenerator();

const ShopSchema = new Schema({
  name: gen.required(String),
  description: gen.required(String),
  price: gen.required(Number),
  content: String,
  images: gen.required([String]),
  stock: gen.required(Number),
  category: gen.required(String),
  vendor: {
    _id: gen.required(String),
    email: gen.required(String),
    businessName: gen.required(String)
  }
});

const Shop = models?.Shop || model("Shop", ShopSchema);

module.exports = Shop;