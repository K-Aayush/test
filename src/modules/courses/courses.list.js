const GenRes = require("../../utils/routers/GenRes");
const Comments = require("../comments/comments.model");
const Course = require("./courses.model");
const Like = require("../likes/likes.model");

function shuffleArray(array) {
  // Fisher-Yates Shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const ListCourses = async (req, res) => {
  try {
    const page = parseInt(req?.params?.page || "0") || 0;
    const lists = await Course.find({})
      .skip(20 * page)
      .limit(20)
      .lean();

    const randomLinks = shuffleArray(lists);
    const finalCall = await Promise.all(
      randomLinks?.map(async (item) => {
        const find = {
          uid: item?._id,
          type: "course",
        };

        const likes = await Like.countDocuments(find);
        const comments = await Comments.countDocuments(find);
        const liked = await Like.findOne({
          ...find,
          "user.email": req?.user?.email,
        });

        item.likes = likes;
        item.comments = comments;
        item.liked = !!liked;
        item.purchased = false;

        return item;
      })
    );

    const response = GenRes(
      200,
      finalCall,
      null,
      `Responding ${finalCall?.length} data(s)`
    );
    return res.status(200).json(response);
  } catch (error) {
    const response = GenRes(500, null, error, error?.message);
    return res.status(500).json(response);
  }
};

module.exports = ListCourses;
