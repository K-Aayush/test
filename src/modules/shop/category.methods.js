const GenRes = require("../../utils/routers/GenRes");
const Category = require("./category.model");

const AddCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const vendor = req.vendor;

    if (!name) {
      return res
        .status(400)
        .json(
          GenRes(
            400,
            null,
            { error: "Category name is required" },
            "Name is required"
          )
        );
    }

    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      "vendor._id": vendor._id,
    });

    if (existingCategory) {
      return res
        .status(409)
        .json(
          GenRes(
            409,
            null,
            { error: "Category already exists" },
            "Category already exists"
          )
        );
    }

    const category = new Category({
      name,
      description,
      vendor: {
        _id: vendor._id,
        email: vendor.email,
        businessName: vendor.businessName,
      },
    });

    await category.save();

    return res
      .status(201)
      .json(GenRes(201, category, null, "Category created successfully"));
  } catch (error) {
    return res.status(500).json(GenRes(500, null, error, error?.message));
  }
};

const GetCategories = async (req, res) => {
  try {
    const vendor = req.vendor;

    const categories = await Category.find({
      "vendor._id": vendor._id,
    }).sort({ name: 1 });

    return res
      .status(200)
      .json(GenRes(200, categories, null, "Categories retrieved successfully"));
  } catch (error) {
    return res.status(500).json(GenRes(500, null, error, error?.message));
  }
};

const DeleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = req.vendor;

    const category = await Category.findOneAndDelete({
      _id: id,
      "vendor._id": vendor._id,
    });

    if (!category) {
      return res
        .status(404)
        .json(
          GenRes(
            404,
            null,
            { error: "Category not found" },
            "Category not found"
          )
        );
    }

    return res
      .status(200)
      .json(GenRes(200, null, null, "Category deleted successfully"));
  } catch (error) {
    return res.status(500).json(GenRes(500, null, error, error?.message));
  }
};

module.exports = {
  AddCategory,
  GetCategories,
  DeleteCategory,
};
