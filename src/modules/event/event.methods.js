const GenRes = require("../../utils/router/GenRes");
const Event = require("./event.model");
const fs = require("fs");
const path = require("path");

const getAllEvents = async (req, res) => {
    try {
        let events = await Event.find();
        if (!events || events.length === 0) {
            events = [];
            return res.status(404).json(GenRes(404, events, null, "No events found", req.url));
        }
        return res.status(200).json(GenRes(200, events, null, "Events fetched successfully", req.url));
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err?.message), req.url);
    }
}

const getEventById = async (req, res) => {
    try {
        const eventId = req.params.id;
        const event = await Event.findOne({ eventId });
        if (!event) {
            return res.status(404).json(GenRes(404, null, null, "Event not found", req.url));
        }
        return res.status(200).json(GenRes(200, event, null, "Event fetched successfully"));
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err?.message), req.url);
    }
}

const addEvent = async (req, res) => {
    try {
        const { title, description, startDateTime, endDateTime, ticketTiers, location } = req.body;
        console.log(req.body);
        console.log('Files received:', req.files); // Debug log

        if (!title || !description || !startDateTime) {
            return res.status(400).json(GenRes(400, null, null, "Missing required fields", req.url));
        }

        // 🔽 Save poster to disk and store relative path
        let poster = null;
        if (req.files?.poster?.[0]) {
            const posterFile = req.files.poster[0];
            const uploadsDir = path.join(__dirname, "..", "..", "..", "uploads", "poster");

            // 🛡️ Ensure directory exists
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const posterFileName = `${Date.now()}_${posterFile.originalname}`;
            const posterPath = path.join(uploadsDir, posterFileName);

            // 🛡️ Ensure filePath is not a directory (edge case)
            if (fs.existsSync(posterPath) && fs.lstatSync(posterPath).isDirectory()) {
                throw new Error(`Expected file path but found a directory at: ${posterPath}`);
            }

            fs.writeFileSync(posterPath, posterFile.buffer);
            poster = `/uploads/poster/${posterFileName}`;
        }

        // 🔽 Handle promo images if they exist (either add this or remove from Event creation)
        let promoImages = [];
        if (req.files?.promoImages) {
            const uploadsDir = path.join(__dirname, "..", "..", "..", "uploads", "promos");
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

            promoImages = req.files.promoImages.map(file => {
                const fileName = `${Date.now()}_${file.originalname}`;
                const filePath = path.join(uploadsDir, fileName);
                fs.writeFileSync(filePath, file.buffer);
                return `/uploads/promos/${fileName}`;
            });
        }

        // 🔽 Parse ticketTiers safely
        let parsedTicketTiers = [];
        if (ticketTiers) {
            try {
                parsedTicketTiers = typeof ticketTiers === "string" ? JSON.parse(ticketTiers) : ticketTiers;
            } catch (err) {
                return res.status(400).json(GenRes(400, null, err, "Invalid ticketTiers format", req.url));
            }
        }

        const newEvent = new Event({
            title,
            description,
            startDateTime,
            endDateTime,
            location,
            poster,
            promoImages,
            ticketTiers: parsedTicketTiers
        });

        await newEvent.save();
        return res.status(201).json(GenRes(201, newEvent.title, null, "Event created successfully", req.url));
    } catch (err) {
        console.error('Error adding event:', err);
        return res.status(500).json(GenRes(500, null, err, err?.message, req.url));
    }
};


const updateEvent = async (req, res) => {
    try {
        const { eventId, title, description, location, startDateTime, endDateTime, ticketTiers } = req.body;

        if (!eventId) {
            return res.status(400).json(GenRes(400, null, null, "Missing eventId", req.url));
        }

        // 🔽 Handle new poster upload (overwrite existing one)
        let poster = null;
        if (req.files?.poster?.[0]) {
            const posterFile = req.files.poster[0];
            const uploadsDir = path.join(__dirname, "..", "..", "..", "uploads", "poster");

            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const posterFileName = `${Date.now()}_${posterFile.originalname}`;
            const posterPath = path.join(uploadsDir, posterFileName);

            if (fs.existsSync(posterPath) && fs.lstatSync(posterPath).isDirectory()) {
                throw new Error(`Expected file path but found a directory at: ${posterPath}`);
            }

            fs.writeFileSync(posterPath, posterFile.buffer);
            poster = `/uploads/poster/${posterFileName}`;
        }

        // 🔽 Handle promoImages upload
        let promoImages = [];
        if (req.files?.promoImages) {
            const uploadsDir = path.join(__dirname, "..", "..", "..", "uploads", "promos");

            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            promoImages = req.files.promoImages.map(file => {
                const fileName = `${Date.now()}_${file.originalname}`;
                const filePath = path.join(uploadsDir, fileName);
                fs.writeFileSync(filePath, file.buffer);
                return `/uploads/promos/${fileName}`;
            });
        }

        // 🔽 Parse ticketTiers safely
        let parsedTicketTiers = [];
        if (ticketTiers) {
            try {
                parsedTicketTiers = typeof ticketTiers === "string" ? JSON.parse(ticketTiers) : ticketTiers;
            } catch (err) {
                return res.status(400).json(GenRes(400, null, err, "Invalid ticketTiers format", req.url));
            }
        }

        const updateData = {
            ...(title && { title }),
            ...(description && { description }),
            ...(location && { location }),
            ...(startDateTime && { startDateTime }),
            ...(endDateTime && { endDateTime }),
            ...(poster && { poster }),
            ...(promoImages.length > 0 && { promoImages }),
            ...(parsedTicketTiers.length > 0 && { ticketTiers: parsedTicketTiers }),
        };

        const updatedEvent = await Event.findOneAndUpdate(
            { eventId },
            updateData,
            { new: true }
        );

        if (!updatedEvent) {
            return res.status(404).json(GenRes(404, null, null, "Event not found", req.url));
        }

        return res.status(200).json(GenRes(200, updatedEvent.title, null, "Event updated successfully", req.url));
    } catch (err) {
        console.error('Error updating event:', err);
        return res.status(500).json(GenRes(500, null, err, err?.message, req.url));
    }
};


const ongoingEvents = async (req, res) => {
    try {
        const currentDate = new Date();
        const events = await Event.find({
            startDateTime: { $lte: currentDate },
            endDateTime: { $gte: currentDate }
        });

        if (!events || events.length === 0) {
            return res.status(404).json(GenRes(404, null, null, "No ongoing events found", req.url));
        }

        return res.status(200).json(GenRes(200, events, null, "Ongoing events fetched successfully", req.url));
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err?.message), req.url);
    }
}

const upcomingEvents = async (req, res) => {
    try {
        const currentDate = new Date();
        const events = await Event.find({
            startDateTime: { $gt: currentDate }
        });

        if (!events || events.length === 0) {
            return res.status(404).json(GenRes(404, null, null, "No upcoming events found", req.url));
        }

        return res.status(200).json(GenRes(200, events, null, "Upcoming events fetched successfully", req.url));
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err?.message), req.url);
    }
}

const pastEvents = async (req, res) => {
    try {
        const currentDate = new Date();
        const events = await Event.find({
            endDateTime: { $lt: currentDate }
        });

        if (!events || events.length === 0) {
            return res.status(404).json(GenRes(404, null, null, "No past events found", req.url));
        }

        return res.status(200).json(GenRes(200, events, null, "Past events fetched successfully", req.url));
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err?.message), req.url);
    }
}

module.exports = {
    getAllEvents,
    getEventById,
    addEvent,
    updateEvent,
    ongoingEvents,
    upcomingEvents,
    pastEvents
};
