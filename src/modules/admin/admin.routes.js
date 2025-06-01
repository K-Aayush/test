const { addAdmin } = require("./admin.methods");
const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middlewares/authMiddleware");
const adminMiddleware = require("../../middlewares/adminMiddleware");

const {
    // addAdmin,
    getAdminDashboard,
    approveTicket,
    rejectTicket,
    makeTicketStatusPending,
    getAllUsersByAdmin
} = require("./admin.methods");

const {
    getAdminDashboardV2,      // GET /admin/dashboard
    getPendingTicketsV2,      // GET /admin/pending-tickets?page=1&limit=20
    getRecentRegistrationsV2, // GET /admin/recent-registrations?page=1&limit=20&status=pending
    getUpcomingEventsV2,      // GET /admin/upcoming-events?page=1&limit=20
    getTicketsV2             // GET /admin/tickets?page=1&limit=20&status=approved&search=john&sortBy=createdAt&sortOrder=desc
} = require("./dashboard.methods")

// Placeholder route for admin API

router.get("/admin", (req, res) => {
    res.send("Admin API is working");
});

router.post("/admin", async (req, res) => {
    // console.log("admin yes sirrr")
    res.send("Admin Post API is working");
});

router.post("/admin/add", addAdmin);

router.get("/admin/dashboard", adminMiddleware, getAdminDashboard)

router.post("/admin/approve-ticket", adminMiddleware, approveTicket);

router.post("/admin/reject-ticket", adminMiddleware, rejectTicket);

// This is only for testing and development purposes. It should not be used in production.
router.post("/admin/tickets/pending", makeTicketStatusPending);

// V2 Routes
router.get("/admin/dashboard2", adminMiddleware, getAdminDashboardV2);

router.get("/admin/pending-tickets", adminMiddleware, getPendingTicketsV2);

router.get("/admin/recent-registrations", adminMiddleware, getRecentRegistrationsV2);

router.get("/admin/upcoming-events", adminMiddleware, getUpcomingEventsV2);

router.get("/admin/users", adminMiddleware, getAllUsersByAdmin);

// router.get("/admin/tickets", adminMiddleware, getTicketsV2);

module.exports = router;