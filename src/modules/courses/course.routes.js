const { adminMiddleware } = require("../../middlewares/adminMiddleware");
const basicMiddleware = require("../../middlewares/basicMiddleware");
const AdminFiles = require("../../utils/fileProcessor/multer.courses");
const { AddCourse, DelCourses } = require("./course.admin.methods");
const { MultipleFiles, DeleteFiles } = require("./course.file");
const ListCourses = require("./courses.list");
const { GetCourse } = require("./courses.methods");

const route = require("express").Router();


// add files
route.post(
  "/add-public-course-file",
  adminMiddleware,
  AdminFiles("public").any(),
  MultipleFiles
);
route.post(
  "/add-private-course-file",
  adminMiddleware,
  AdminFiles("private").any(),
  MultipleFiles
);

route.delete("/delete-course-files", adminMiddleware, DeleteFiles);

route.post("/add-course", adminMiddleware, AddCourse);

// delete courses
route.delete("/delete-courses/:id", adminMiddleware, DelCourses);

// list courses
route.get("/list-courses/:page", basicMiddleware, ListCourses);
// admin list courses
route.get("/admin-list-courses/:page", adminMiddleware, ListCourses);

// admin inidividual
route.get("/get-course/:id", basicMiddleware, GetCourse);
route.get("/admin-get-course/:id", adminMiddleware, GetCourse);

module.exports = route;
