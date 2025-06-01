const express = require('express');
const adminMiddleware = require('../../middlewares/adminMiddleware');

const router = express.Router();

const {
    getAllServices,
    createService,
    editService,
    deleteService
} = require('./service.method');

router.get('/services', getAllServices);
router.post('/admin/services', adminMiddleware, createService);
router.patch('/admin/services/:serviceId', adminMiddleware, editService);
router.delete('/admin/services/:serviceId', adminMiddleware, deleteService);

module.exports = router;