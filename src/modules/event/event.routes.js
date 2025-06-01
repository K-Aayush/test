const multer = require('multer');
// const upload = multer({ storage });

const authMiddleware = require("../../middlewares/authMiddleware");
const adminMiddleware = require("../../middlewares/adminMiddleware");
const { getAllEvents, getEventById, addEvent, updateEvent, ongoingEvents, upcomingEvents, pastEvents } = require("./event.methods");

const express = require("express");
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

router.get("/events", authMiddleware, getAllEvents)
router.get("/events/ongoing", authMiddleware, ongoingEvents);
router.get("/events/upcoming", authMiddleware, upcomingEvents);
router.get("/events/past", authMiddleware, pastEvents);

router.get("/events/:id", authMiddleware, getEventById);
router.post(
    '/add-event',
    // Step 2: Admin authentication check
    adminMiddleware,
    // Step 3: File upload handling
    upload.fields([
        { name: 'poster', maxCount: 1 },
        { name: 'promoImages', maxCount: 5 }
    ]),
    // Step 4: Handle multer errors
    (err, req, res, next) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({
                status: 400,
                data: null,
                error: err.message,
                message: 'File upload error: ' + err.message,
                path: req.url
            });
        }
        next();
    },
    // Step 5: Controller function
    addEvent
);

router.patch(
    '/update-event',
    // Step 2: Admin authentication check
    adminMiddleware,
    // Step 3: File upload handling
    upload.fields([
        { name: 'poster', maxCount: 1 },
        { name: 'promoImages', maxCount: 5 }
    ]),
    // Step 4: Handle multer errors
    (err, req, res, next) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({
                status: 400,
                data: null,
                error: err.message,
                message: 'File upload error: ' + err.message,
                path: req.url
            });
        }
        next();
    },
    // Step 5: Controller function
    updateEvent
);


module.exports = router;