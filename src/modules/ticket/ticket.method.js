const fs = require("fs");
const path = require("path");

const GenRes = require('../../utils/router/GenRes');
const Ticket = require('./ticket.model');
const Event = require('../event/event.model');

const getAllUserTickets = async (req, res) => {
    try {
        const requestedUser = req.user;
        const userId = requestedUser.userId;
        if (!requestedUser) {
            return res.status(401).json(GenRes(401, null, null, "Unauthorized"), req.url);
        }

        // Fetch tickets for the user
        const userTickets = await Ticket.find({ userId: userId });

        if (!userTickets || userTickets.length === 0) {
            return res.status(404).json(GenRes(404, null, null, "No tickets found for this user"), req.url);
        }

        return GenRes(res, 200, 'Tickets retrieved successfully', userTickets);
    } catch (error) {
        return GenRes(res, 500, 'Error retrieving tickets', error);
    }
}

const getTicketsDashboardByAdmin = async (req, res) => {
    try {
        // 2. Get 5 recent tickets for each status
        const statuses = ['pending', 'approved', 'rejected'];
        const ticketFetchPromises = statuses.map(status =>
            Ticket.find({ status })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('userId', 'name email')
                .select('ticketId userId name eventId eventName ticketInfo status createdAt')
        );
        const ticketCountPromises = statuses.map(status =>
            Ticket.countDocuments({ status })
        );

        const [pendingTickets, approvedTickets, rejectedTickets] = await Promise.all(ticketFetchPromises);
        const [pendingCount, approvedCount, rejectedCount] = await Promise.all(ticketCountPromises);

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
        ]);

        // 4. Metrics
        const totalTickets = pendingCount + approvedCount + rejectedCount;
        const totalRevenueAgg = await Ticket.aggregate([
            { $match: { status: 'approved' } },
            { $unwind: '$ticketInfo' },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$ticketInfo.price' }
                }
            }
        ]);
        const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0;

        // Create the response data object
        const responseData = {
            tickets: {
                pending: pendingTickets,
                approved: approvedTickets,
                rejected: rejectedTickets
            },
            eventTicketStats: ticketStats,
            metrics: {
                totalRevenue,
                totalTickets,
                pending: pendingCount,
                approved: approvedCount,
                rejected: rejectedCount
            },
            pagination: {
                pendingTickets: {
                    total: pendingCount,
                    showing: Math.min(5, pendingCount),
                    hasMore: pendingCount > 5,
                    endpoint: '/admin/pending-tickets'
                },
                approvedTickets: {
                    total: approvedCount,
                    showing: Math.min(5, approvedCount),
                    hasMore: approvedCount > 5,
                    endpoint: '/admin/approved-tickets'
                },
                rejectedTickets: {
                    total: rejectedCount,
                    showing: Math.min(5, rejectedCount),
                    hasMore: rejectedCount > 5,
                    endpoint: '/admin/rejected-tickets'
                },
            }
        };
        // Final Response
        const finalResponse = GenRes(200, responseData, null, 'Dashboard data fetched successfully', req.url);
        return res.status(200).json(finalResponse);
    } catch (error) {
        return res.status(500).json(GenRes(500, null, error.message, 'Dashboard fetch failed', req.url));
    }
};



const getTicketById = async (req, res) => {
    try {
        const requestedUser = req.user;
        const userId = requestedUser.id;
        const ticketId = req.params.ticketId;
        console.log("Ticket ID:", ticketId);

        if (!requestedUser) {
            return res.status(401).json(GenRes(401, null, null, "Unauthorized", req.url));
        }
        // console.log(requestedUser);

        let ticket;

        if (requestedUser.role === 'admin') {
            console.log("Admin access, fetching ticket by ID without userId filter");
            ticket = await Ticket.findOne({ ticketId });
        } else {
            console.log("User access, fetching ticket by ID with userId filter");
            ticket = await Ticket.findOne({ ticketId, userId: requestedUser.userId });
        }

        if (!ticket) {
            return res.status(404).json(GenRes(404, null, null, "Ticket not found", req.url));
        }

        return res.status(200).json(GenRes(200, ticket, null, "Ticket retrieved successfully", req.url));
    } catch (error) {
        return res.status(500).json(GenRes(500, null, error, "Error retrieving ticket", req.url));
    }
};


const registerTicket = async (req, res) => {
    try {
        const requestedUser = req.user;
        if (!requestedUser) {
            return res.status(401).json(GenRes(401, null, null, 'Unauthorized access', req.url));
        }

        const { eventId, number, email, tierName, name, note = '' } = req.body;

        if (!eventId || !email || !number || !tierName) {
            return res.status(400).json(GenRes(400, null, null, 'Missing required fields', req.url));
        }

        const uploadedScreenshot = req.files?.paymentScreenshot?.[0];
        if (!uploadedScreenshot?.buffer || !uploadedScreenshot?.originalname) {
            return res.status(400).json(GenRes(400, null, null, 'paymentScreenshot is required as a file', req.url));
        }

        // ✅ Validate file extension
        if (!/\.(jpg|jpeg|png|gif|pdf|webp)$/i.test(uploadedScreenshot.originalname)) {
            return res.status(400).json(GenRes(400, null, null, 'Invalid file type for screenshot', req.url));
        }

        const event = await Event.findOne({ eventId });
        if (!event) {
            return res.status(404).json(GenRes(404, null, null, 'Event not found with provided eventId', req.url));
        }

        const ticketTier = event.ticketTiers.find(t => t.name === tierName);
        if (!ticketTier) {
            return res.status(400).json(GenRes(400, null, null, 'Invalid tier name', req.url));
        }

        const { price, listOfFeatures } = ticketTier;

        const paymentDir = path.join(__dirname, "..", "..", "..", "uploads", "payment", eventId);
        if (!fs.existsSync(paymentDir)) fs.mkdirSync(paymentDir, { recursive: true });

        const fileName = `screenshot_${Date.now()}_${uploadedScreenshot.originalname}`;
        const filePath = path.join(paymentDir, fileName);
        fs.writeFileSync(filePath, uploadedScreenshot.buffer);

        const relativeScreenshotPath = `/uploads/payment/${eventId}/${fileName}`;

        const featuresWithStatus = listOfFeatures.map(name => ({
            name,
            status: false
        }));

        const newTicket = new Ticket({
            userId: requestedUser.userId,
            eventId,
            eventName: event.title,
            number,
            name,
            email,
            ticketInfo: {
                tierName,
                price,
                features: featuresWithStatus
            },
            paymentScreenshot: relativeScreenshotPath,
            note
        });

        await newTicket.save();

        return res.status(201).json(GenRes(201, newTicket, null, 'Ticket registered successfully', req.url));
    } catch (error) {
        console.error('[Register Ticket Error]', error);
        return res.status(500).json(GenRes(500, null, error.message, 'Error registering ticket', req.url));
    }
};



module.exports = {
    getAllUserTickets,
    registerTicket,
    getTicketById,
    getTicketsDashboardByAdmin
}