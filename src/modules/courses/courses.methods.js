const { isValidObjectId } = require("mongoose");
const GenRes = require("../../utils/routers/GenRes");
const Courses = require("./courses.model");

const GetCourse = async (req, res) => {
  try {
    const _id = req?.params?.id;
    if (!_id || !isValidObjectId(_id)) {
      const response = GenRes(
        400,
        null,
        { error: "NOT A VALID ID" },
        "ID not valid"
      );
      return res.status(400).json(response);
    }

    const data = await Courses.findOne({ _id }).lean();

    if (!data) {
      const response = GenRes(
        404,
        null,
        { error: "Course not found" },
        "Course not found"
      );
      return res.status(404).json(response);
    }

    return res
      .status(200)
      .json(GenRes(200, { ...data, purchased: null }, null, "Data responding"));
  } catch (error) {
    const generate = GenRes(
      500,
      null,
      { error: "This is the Error!" },
      error?.message
    );
    return res.status(500).json(generate);
  }
};

module.exports = { GetCourse };
