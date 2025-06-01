const Event = require('../event/event.model');
const Ticket = require("../ticket/ticket.model");
const User = require("../user/user.model");
const GenRes = require("../../utils/router/GenRes");

// Updated main dashboard route with pagination metadata
const getAdminDashboardV2 = async (req, res) => {
    try {
        // 1. Upcoming Events (within next 60 days) - Get limited events and total count
        const upcomingEventsQuery = {
            startDateTime: { $gte: new Date() }
        };

        const [upcomingEvents, totalUpcomingCount] = await Promise.all([
            Event.find(upcomingEventsQuery)
                .sort({ startDate: 1 })
                .limit(6)
                .select('eventId title startDateTime location ticketTiers'),
            Event.countDocuments(upcomingEventsQuery)
        ]);

        // 2. Tickets in Pending Status - Add count for pagination info
        const [pendingTickets, totalPendingCount] = await Promise.all([
            Ticket.find({ status: 'pending' })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('userId', 'name email')
                .select('ticketId userId name eventId eventName ticketInfo status createdAt'),
            Ticket.countDocuments({ status: 'pending' })
        ]);

        // 3. Event-wise Ticket Summary (keep as is for overview)
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

        // 4. Recent Registrations - Add count for pagination info
        const [recentRegistrations, totalRegistrationsCount] = await Promise.all([
            Ticket.find({})
                .sort({ createdAt: -1 })
                .limit(5)
                .select('ticketId eventName name ticketInfo status submittedAt'),
            Ticket.countDocuments()
        ]);

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
                },
                // Add pagination metadata
                pagination: {
                    pendingTickets: {
                        total: totalPendingCount,
                        showing: Math.min(10, totalPendingCount),
                        hasMore: totalPendingCount > 10,
                        endpoint: '/admin/pending-tickets'
                    },
                    recentRegistrations: {
                        total: totalRegistrationsCount,
                        showing: Math.min(5, totalRegistrationsCount),
                        hasMore: totalRegistrationsCount > 5,
                        endpoint: '/admin/recent-registrations'
                    },
                    upcomingEvents: {
                        total: totalUpcomingCount,
                        showing: Math.min(6, totalUpcomingCount),
                        hasMore: totalUpcomingCount > 6,
                        endpoint: '/admin/upcoming-events'
                    }
                }
            }, null, 'Dashboard data fetched successfully', req.url)
        )
    } catch (error) {
        console.error(error)
        return res.status(500).json(GenRes(500, null, error.message, 'Dashboard fetch failed', req.url))
    }
}

// Separate paginated routes for detailed data

// 1. Paginated Pending Tickets
const getPendingTicketsV2 = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [tickets, totalCount] = await Promise.all([
            Ticket.find({ status: 'pending' })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name email')
                .select('ticketId userId name eventId eventName ticketInfo status createdAt'),
            Ticket.countDocuments({ status: 'pending' })
        ]);

        const totalPages = Math.ceil(totalCount / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return res.status(200).json(
            GenRes(200, {
                tickets,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    limit,
                    hasNext,
                    hasPrev,
                    nextPage: hasNext ? page + 1 : null,
                    prevPage: hasPrev ? page - 1 : null
                }
            }, null, 'Pending tickets fetched successfully', req.url)
        );
    } catch (error) {
        console.error(error);
        return res.status(500).json(GenRes(500, null, error.message, 'Failed to fetch pending tickets', req.url));
    }
};

// 2. Paginated Recent Registrations
const getRecentRegistrationsV2 = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Optional filtering
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.eventId) {
            filter.eventId = req.query.eventId;
        }

        const [registrations, totalCount] = await Promise.all([
            Ticket.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('ticketId eventName name ticketInfo status submittedAt createdAt'),
            Ticket.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalCount / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return res.status(200).json(
            GenRes(200, {
                registrations,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    limit,
                    hasNext,
                    hasPrev,
                    nextPage: hasNext ? page + 1 : null,
                    prevPage: hasPrev ? page - 1 : null
                },
                filters: {
                    status: req.query.status || null,
                    eventId: req.query.eventId || null
                }
            }, null, 'Recent registrations fetched successfully', req.url)
        );
    } catch (error) {
        console.error(error);
        return res.status(500).json(GenRes(500, null, error.message, 'Failed to fetch recent registrations', req.url));
    }
};

// 3. Paginated Upcoming Events
const getUpcomingEventsV2 = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = {
            startDateTime: { $gte: new Date() }
        };

        const [events, totalCount] = await Promise.all([
            Event.find(filter)
                .sort({ startDate: 1 })
                .skip(skip)
                .limit(limit)
                .select('eventId title startDateTime location ticketTiers'),
            Event.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalCount / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return res.status(200).json(
            GenRes(200, {
                events,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    limit,
                    hasNext,
                    hasPrev,
                    nextPage: hasNext ? page + 1 : null,
                    prevPage: hasPrev ? page - 1 : null
                }
            }, null, 'Upcoming events fetched successfully', req.url)
        );
    } catch (error) {
        console.error(error);
        return res.status(500).json(GenRes(500, null, error.message, 'Failed to fetch upcoming events', req.url));
    }
};

// 4. Generic ticket listing with advanced filters and pagination
const getTicketsV2 = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.eventId) {
            filter.eventId = req.query.eventId;
        }
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { eventName: { $regex: req.query.search, $options: 'i' } },
                { ticketId: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        // Date range filter
        if (req.query.startDate || req.query.endDate) {
            filter.createdAt = {};
            if (req.query.startDate) {
                filter.createdAt.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filter.createdAt.$lte = new Date(req.query.endDate);
            }
        }

        // Sort options
        const sortOptions = {};
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        sortOptions[sortBy] = sortOrder;

        const [tickets, totalCount] = await Promise.all([
            Ticket.find(filter)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name email')
                .select('ticketId userId name eventId eventName ticketInfo status createdAt submittedAt'),
            Ticket.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalCount / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return res.status(200).json(
            GenRes(200, {
                tickets,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    limit,
                    hasNext,
                    hasPrev,
                    nextPage: hasNext ? page + 1 : null,
                    prevPage: hasPrev ? page - 1 : null
                },
                filters: {
                    status: req.query.status || null,
                    eventId: req.query.eventId || null,
                    search: req.query.search || null,
                    startDate: req.query.startDate || null,
                    endDate: req.query.endDate || null,
                    sortBy: sortBy,
                    sortOrder: req.query.sortOrder || 'desc'
                }
            }, null, 'Tickets fetched successfully', req.url)
        );
    } catch (error) {
        console.error(error);
        return res.status(500).json(GenRes(500, null, error.message, 'Failed to fetch tickets', req.url));
    }
};

// Routes setup
module.exports = {
    getAdminDashboardV2,      // GET /admin/dashboard
    getPendingTicketsV2,      // GET /admin/pending-tickets?page=1&limit=20
    getRecentRegistrationsV2, // GET /admin/recent-registrations?page=1&limit=20&status=pending
    getUpcomingEventsV2,      // GET /admin/upcoming-events?page=1&limit=20
    getTicketsV2             // GET /admin/tickets?page=1&limit=20&status=approved&search=john&sortBy=createdAt&sortOrder=desc
};