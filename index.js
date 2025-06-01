require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const App = require("./src/App");
const DB = require("./src/config/connectDB.js");

const app = express();
const server = http.createServer(app);

// Apply CORS middleware
app.use(cors({
  origin: "*", // Allow all origins for development
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true, // Enable credentials if using cookies/sessions
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
}));

// Apply body parsers separately
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// Connect to database
DB();

// Initialize routes
App(app);

// Start server
server.listen(process.env.PORT, (error) => {
  if (error) {
    console.error("Error in listening Server:", error);
  } else {
    console.log("Server running on port:", process.env.PORT);
  }
});

/*
// 🚀 Production CORS setup — enable when deploying
app.use(cors({
  origin: process.env.WEB_HOST, // e.g., https://yourfrontend.com
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true, // if using cookies or sessions
}));
*/