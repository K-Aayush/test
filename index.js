require("dotenv").config();
const express = require("express");
const cors = require("cors");
const App = require("./src/App");
const DB = require("./src/config/connectDB");
const path = require("path");

// make an app
const app = express();

// use middlewares
app.use(
  cors({}),
  express.json({ limit: "200gb" }),
  express.urlencoded({ extended: true, limit: "200gb" })
);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/shop", express.static(path.join(process.cwd(), "shop")));
app.use(
  "/courses/public",
  express.static(path.join(process.cwd(), "courses/public"))
);

// configs
DB();

// calling main App
App(app);

app.listen(process.env.PORT, (error) => {
  if (error) {
    console.error("Error in listening Server : ", error);
  } else {
    console.log("Server connected in :", process.env.PORT);
  }
});
