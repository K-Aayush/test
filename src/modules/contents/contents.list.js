const GenRes = require("../../utils/routers/GenRes");
const Follow = require("../follow/follow.model");
const Likes = require("../likes/likes.model");
const Comments = require("../comments/comments.model");
const Content = require("../contents/contents.model");
const User = require("../user/user.model");
const axios = require("axios");
const { ObjectId } = require("mongoose").Types;

// Time decay calculation
const getTimeDecayScore = (createdAt) => {
  const hoursOld =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return 1 / (1 + Math.sqrt(Math.max(hoursOld, 0.1)));
};

// Fisher-Yates shuffle
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Quality score
const calculateQualityScore = async (content) => {
  let score = content.files?.length ? 1.2 : 1;
  const author = await User.findOne({ email: content.author.email }).lean();
  if (author?.level === "bronze") score *= 1.1;
  return score;
};

// Fetch user data
const getUserData = async (user) => {
  const userDetails = await User.findById(user._id).lean();
  const followings = await Follow.find({ "follower.email": user.email });
  const followingEmails = followings.map((f) => f.following.email);
  const recentLikes = await Likes.find({
    "user.email": user.email,
    type: "content",
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  }).distinct("uid");
  const viewedContent = await Content.find({ viewedBy: user.email })
    .distinct("_id")
    .then((ids) => ids.map((id) => id.toString()));

  console.log("Fetched viewedContent IDs:", viewedContent);

  return { userDetails, followingEmails, recentLikes, viewedContent };
};

// Fetch engagement metrics
const getEngagementScores = async () => {
  const metrics = await Content.aggregate([
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "uid",
        as: "likes",
        pipeline: [{ $match: { type: "content" } }],
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "uid",
        as: "comments",
        pipeline: [{ $match: { type: "content" } }],
      },
    },
    {
      $project: {
        _id: 1,
        views: 1,
        engagementScore: {
          $add: [
            { $multiply: [{ $size: "$likes" }, 1] },
            { $multiply: [{ $size: "$comments" }, 2] },
            { $multiply: [{ $ifNull: ["$views", 0] }, 0.1] },
          ],
        },
      },
    },
  ]);

  return new Map(metrics.map((item) => [item._id.toString(), { ...item }]));
};

// Fetch and score content
const fetchAndScoreContent = async (
  filters,
  emails,
  viewedContent,
  engagementScores,
  userInterests,
  recentLikes,
  userEmail,
  pageSize,
  isRefresh
) => {
  const fetchSize = pageSize * 4;

  const query = {
    ...filters,
    $or: [
      { "author.email": { $in: emails } },
      { "author.email": { $nin: emails } },
    ],
  };

  // Fetch unseen content
  let contents = await Content.find({
    ...query,
    _id: { $nin: viewedContent.map((id) => new ObjectId(id)) },
  })
    .sort({ _id: -1 })
    .limit(fetchSize)
    .lean();

  console.log("Unseen contents length:", contents.length);

  // Fetch viewed content
  let viewedContents = [];
  if (contents.length < pageSize || isRefresh) {
    viewedContents = await Content.find({
      ...query,
      _id: { $in: viewedContent.map((id) => new ObjectId(id)) },
    })
      .sort({ _id: -1 })
      .limit(fetchSize - contents.length)
      .lean();
    console.log("Viewed contents length:", viewedContents.length);
  }

  // Deduplicate
  const seenIds = new Set();
  contents = [...contents, ...viewedContents].filter((c) => {
    const id = c._id.toString();
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });

  console.log("Total unique contents fetched:", contents.length);

  // Shuffle if all viewed
  if (
    contents.length > 0 &&
    contents.every((c) => viewedContent.includes(c._id.toString()))
  ) {
    contents = shuffleArray(contents);
    console.log(
      "Shuffled viewed contents:",
      contents.map((c) => c._id)
    );
  }

  const scored = await Promise.all(
    contents.map(async (c) => {
      const metrics = engagementScores.get(c._id.toString()) || {
        engagementScore: 0,
        views: 0,
      };
      const qualityScore = await calculateQualityScore(c);

      const features = {
        engagement_score: metrics.engagementScore,
        time_decay: getTimeDecayScore(c.createdAt),
        has_media: c.files?.length ? 1 : 0,
        is_bronze_author:
          (await User.findOne({ email: c.author.email }).lean())?.level ===
          "bronze"
            ? 1
            : 0,
        interest_match: userInterests.some((i) =>
          c.status?.toLowerCase().includes(i.toLowerCase())
        )
          ? 1
          : 0,
        is_following: emails.includes(c.author.email) ? 1 : 0,
        recent_interaction: recentLikes.includes(c._id.toString()) ? 1 : 0,
        is_viewed: viewedContent.includes(c._id.toString()) ? 1 : 0,
        view_count: metrics.views,
      };

      let score;
      try {
        const response = await axios.post(
          "http://182.93.94.210:0548/predict",
          features
        );
        score = response.data.score * qualityScore;
        if (features.is_viewed) score *= 0.1;
      } catch (err) {
        console.error(`ML service error for _id: ${c._id}:`, err.message);
        const interestMatch = features.interest_match ? 1.3 : 1;
        const relationshipBoost = features.is_following ? 1.5 : 1;
        const recentInteraction = features.recent_interaction ? 1.2 : 1;
        const viewedPenalty = features.is_viewed ? 0.01 : 1;
        const viral = metrics.engagementScore > 100 ? 1.5 : 1;
        const boost = metrics.views > 1000 ? 2 : 1;
        const lessViewedBoost = metrics.views < 100 ? 1.4 : 1;
        const random = 1 + Math.random() * 0.15;

        score =
          (metrics.engagementScore + 1) * // Avoid zero
          getTimeDecayScore(c.createdAt) *
          qualityScore *
          interestMatch *
          relationshipBoost *
          recentInteraction *
          viewedPenalty *
          viral *
          boost *
          lessViewedBoost *
          random;
      }
      console.log(
        `Scored content _id: ${c._id}, score: ${score}, is_viewed: ${features.is_viewed}`
      );
      return { ...c, score: score || Math.random() }; // Fallback to random
    })
  );

  // Sort by score unless all viewed
  if (!scored.every((c) => viewedContent.includes(c._id.toString()))) {
    scored.sort((a, b) => b.score - a.score);
  } else {
    // Ensure randomization persists
    console.log(
      "All viewed, preserving shuffle:",
      scored.map((c) => c._id)
    );
  }

  return scored;
};

// Enrich content
const enrichContent = async (items, userEmail) => {
  return Promise.all(
    items.map(async (item) => {
      const base = { uid: item._id, type: "content" };
      const [likes, comments, liked, followed] = await Promise.all([
        Likes.countDocuments(base),
        Comments.countDocuments(base),
        Likes.findOne({ ...base, "user.email": userEmail }),
        Follow.findOne({
          "follower.email": userEmail,
          "following.email": item.author.email,
        }),
      ]);

      const { score, ...rest } = item;
      return { ...rest, likes, comments, liked: !!liked, followed: !!followed };
    })
  );
};

const ListContents = async (req, res) => {
  try {
    const { email, name, search, lastId, pageSize = 10 } = req.query;
    const user = req.user;
    const pageSizeNum = parseInt(pageSize, 10) || 10;
    const isRefresh = !lastId;

    const filters = {};
    if (email) filters["author.email"] = email;
    if (name) filters["author.name"] = { $regex: name, $options: "i" };
    if (search) {
      filters.$or = [
        { "author.name": { $regex: search, $options: "i" } },
        { "author.email": { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
      ];
    }
    if (lastId) filters._id = { $lt: lastId };

    const { userDetails, followingEmails, recentLikes, viewedContent } =
      await getUserData(user);
    const engagementScores = await getEngagementScores();

    console.log("Viewed content IDs:", viewedContent);
    console.log("User email:", user.email);

    const scoredContent = await fetchAndScoreContent(
      filters,
      followingEmails,
      viewedContent,
      engagementScores,
      userDetails?.interests || [],
      recentLikes,
      user.email,
      pageSizeNum,
      isRefresh
    );

    if (scoredContent.length === 0) {
      console.log("No content available after scoring");
      return res.status(200).json(
        GenRes(
          200,
          {
            contents: [],
            hasMore: false,
            nextCursor: null,
          },
          null,
          "No content available"
        )
      );
    }

    const finalContent = await enrichContent(
      scoredContent.slice(0, pageSizeNum),
      user.email
    );
    const hasMore = scoredContent.length > pageSizeNum;

    console.log(
      "Final content IDs:",
      finalContent.map((c) => c._id)
    );
    console.log(
      "Scored content:",
      scoredContent.map((c) => ({
        _id: c._id,
        score: c.score,
        is_viewed: viewedContent.includes(c._id.toString()),
      }))
    );

    return res.status(200).json(
      GenRes(
        200,
        {
          contents: finalContent,
          hasMore,
          nextCursor: hasMore
            ? finalContent[finalContent.length - 1]?._id || null
            : null,
        },
        null,
        `Retrieved ${finalContent.length} content items`
      )
    );
  } catch (err) {
    console.error("ListContents error:", err.message);
    return res.status(500).json(GenRes(500, null, err, err?.message));
  }
};

module.exports = ListContents;
