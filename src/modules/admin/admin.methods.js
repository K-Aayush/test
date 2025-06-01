const Event = require('../event/event.model');
const Ticket = require("../ticket/ticket.model");
const User = require("../user/user.model");
const GenRes = require("../../utils/router/GenRes");
const { generateQRCode } = require("../../utils/ticket/generateQR");

const addAdmin = async (req, res) => {
    const url = (req.url);
    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            const err = GenRes(
                400,
                null,
                { message: "Missing required fields" },
                "Email, and password are required",
                url
            );
            return res.status(err.status).json(err);
        }
        // console.log(url)
        const normalizedEmail = email.toLowerCase();
        const userExist = await User.findOne({ email: normalizedEmail });

        if (userExist) {
            const err = GenRes(
                409,
                null,
                { message: "Duplicate Error. CODE = 11000" },
                "This email already exists",
                url
            );
            return res.status(err.status).json(err);
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = new User({
            email: normalizedEmail,
            passwordHash,
            role: "admin",
        });

        await newUser.save();

        const response = GenRes(
            201,
            { message: "Admin registered successfully!" },
            null,
            "Admin Created"
        );

        return res.status(201).json(response);
    } catch (error) {
        console.log("Catch block url")
        console.log(url)
        const response = GenRes(500, null, error, error?.message, url);
        return res.status(500).json(response);
    }
};

const getAdminDashboard = async (req, res) => {
    try {
        // 1. Upcoming Events (within next 60 days)
        const upcomingEvents = await Event.find({
            startDateTime: { $gte: new Date() }
        })
            .sort({ startDate: 1 })
            .limit(5)
            .select('eventId title startDateTime location ticketTiers')

        // 2. Tickets in Pending Status
        const pendingTickets = await Ticket.find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('userId', 'name email') // Assuming userId is ObjectId
            .select('ticketId userId name eventId eventName ticketInfo status createdAt')

        // 3. Event-wise Ticket Summary
        const ticketStats = await Ticket.aggregate([
            {
                $group: {
                    _id: '$eventId',
                    total: { $sum: 1 },
                    pending: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
                        }
                    },
                    approved: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'approved'] }, 1, 0]
                        }
                    },
                    rejected: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'events',
                    localField: '_id',
                    foreignField: 'eventId',
                    as: 'event'
                }
            },
            { $unwind: '$event' },
            {
                $project: {
                    eventId: '$_id',
                    eventName: '$event.title',
                    total: 1,
                    pending: 1,
                    approved: 1,
                    rejected: 1,
                    _id: 0
                }
            }
        ])

        // 4. Recent Registrations
        const recentRegistrations = await Ticket.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .select('ticketId eventName name ticketInfo status submittedAt')

        // 5. Metrics
        const [totalTickets, totalRevenueAgg, pendingCount] = await Promise.all([
            Ticket.countDocuments(),
            Ticket.aggregate([
                { $match: { status: 'approved' } },
                { $unwind: '$ticketInfo' },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$ticketInfo.price' }
                    }
                }
            ]),
            Ticket.countDocuments({ status: 'pending' })
        ])

        const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0

        return res.status(200).json(
            GenRes(200, {
                upcomingEvents,
                pendingTickets,
                eventTicketStats: ticketStats,
                recentRegistrations,
                metrics: {
                    totalRevenue,
                    totalTickets,
                    pendingTickets: pendingCount
                }
            }, null, 'Dashboard data fetched successfully', req.url)
        )
    } catch (error) {
        console.error(error)
        return res.status(500).json(GenRes(500, null, error.message, 'Dashboard fetch failed', req.url))
    }
}

const approveTicket = async (req, res) => {
    try {
        const ticketId = req.body.ticketId;
        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            return res.status(404).json({
                status: 404,
                message: "Ticket not found",
                data: null
            });
        }
        ticket.status = "approved";
        const url = await generateQRCode(JSON.stringify(ticket), ticketId);
        ticket.qr = url;
        await ticket.save();
        return res.status(200).json(
            GenRes(200, null, null, 'Ticket approved successfully', req.url)
        )
    }
    catch (error) {
        console.error("Error approving ticket:", error);
        return res.status(500).json(GenRes(500, null, error.message, 'Error approving ticket', req.url));
    }
}

const getUnapprovedTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ status: 'pending' });
        if (!tickets || tickets.length === 0) {
            return res.status(404).json({
                status: 404,
                message: "No unapproved tickets found",
                data: null
            });
        }
        return res.status(200).json({
            status: 200,
            message: "Unapproved tickets retrieved successfully",
            data: tickets
        });
    } catch (error) {
        console.error("Error fetching unapproved tickets:", error);
        return res.status(500).json({
            status: 500,
            message: "Internal server error",
            data: null
        });
    }
}

const rejectTicket = async (req, res) => {
    try {
        const ticketId = req.body.ticketId;
        const cancellationReason = req.body.note;
        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            return res.status(404).json(GenRes(404, null, "Ticket not found", 'Ticket not found', req.url));
        }
        if (ticket.status !== 'pending') {
            return res.status(400).json(GenRes(400, null, 'Ticket is not in pending status', 'Ticket is not in pending status', req.url));
        }
        if (!cancellationReason) {
            return res.status(400).json({
                status: 400,
                message: "Cancellation reason is required",
                data: null
            });
        }
        ticket.status = "rejected";
        ticket.note = cancellationReason;
        await ticket.save();
        return res.status(200).json(
            GenRes(200, null, null, 'Ticket rejected successfully', req.url)
        )
    }
    catch (error) {
        console.error("Error rejecting ticket:", error);
        return res.status(500).json(GenRes(500, null, error.message, 'Error rejecting ticket', req.url));
    }
}

//This route is just for testing and development purposes. It should not be used in production.
const makeTicketStatusPending = async (req, res) => {
    try {
        const ticketId = req.body.ticketId;
        const ticket = await Ticket.findOne({ ticketId });
        if (!ticket) {
            return res.status(404).json({
                status: 404,
                message: "Ticket not found",
                data: null
            });
        }
        ticket.status = "pending";
        await ticket.save();
        return res.status(200).json(
            GenRes(200, null, null, 'Ticket status updated to pending successfully', req.url)
        )
    }
    catch (error) {
        console.error("Error updating ticket status:", error);
        return res.status(500).json(GenRes(500, null, error.message, 'Error updating ticket status', req.url));
    }
}

const getAllUsersByAdmin = async (req, res) => {
    try {
        // Extract pagination parameters from query string
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Optional search/filter parameters
        const search = req.query.search || '';
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        // Build query object
        let query = {};

        // Add search functionality if search parameter is provided
        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };
        }

        // Get total count for pagination metadata
        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);

        // Fetch paginated users
        const users = await User.find(query)
            .select('-passwordHash -code -expiry -codeAttemptCount -__v -updatedAt') // Exclude sensitive fields
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit)
            .lean(); // Use lean() for better performance

        // Check if no users found
        if (!users || users.length === 0) {
            return res.status(404).json(
                GenRes(404, null, null, "No users found", req.originalUrl)
            );
        }

        // Prepare pagination metadata
        const pagination = {
            currentPage: page,
            totalPages,
            totalUsers,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page < totalPages ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null,
            limit,
            skip
        };

        // Format response data
        const responseData = {
            users,
            pagination,
            filters: {
                search: search || null,
                sortBy,
                sortOrder: sortOrder === 1 ? 'asc' : 'desc'
            }
        };

        return res.status(200).json(
            GenRes(200, responseData, null, "Users retrieved successfully", req.originalUrl)
        );

    } catch (error) {
        return res.status(500).json(
            GenRes(500, null, error, "Failed to retrieve users", req.originalUrl)
        );
    }
};


module.exports = {
    addAdmin,
    getAdminDashboard,
    approveTicket,
    getUnapprovedTickets,
    rejectTicket,
    getAllUsersByAdmin,
    makeTicketStatusPending
};
