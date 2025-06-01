const path = require('path');
const express = require('express');
const users = require("./modules/user/user.routes.js");
const events = require("./modules/event/event.routes.js");
const admin = require("./modules/admin/admin.routes.js");
const tickets = require("./modules/ticket/ticket.routes.js");
const contact = require("./modules/contact/contact.route.js");
const services = require("./modules/service/service.routes.js");

const App = (app) => {
    // API routes
    app.use("/api/v1/", users, events, admin, tickets, contact, services);

    // Serve static files from the 'uploads' directory
    // This creates a virtual path prefix '/uploads' for files stored in the physical path '../../uploads'
    // Assuming this App.js file is in a directory like 'src/config' or similar
    const uploadsPath = path.join(__dirname, '..', 'uploads');
    app.use('/uploads', express.static(uploadsPath));

    // Root route
    app.get("/", (req, res) => {
        return res.send("Hello World");
    });

    // Optional fallback route for undefined paths
    // app.use("*", (_, res) => {
    // return res.status(404).send("Fallback: Route not found");
    // });
};

module.exports = App;