const GenRes = require('../../utils/router/GenRes');
const Service = require('./service.model');

const createService = async (req, res) => {
    try {
        const requestedUser = req.user;
        if (!requestedUser || requestedUser.role !== 'admin') {
            return res.status(401).json(GenRes(401, null, null, 'Unauthorized'), req.url);
        }
        const { name, description, icon } = req.body;
        if (!name) {
            return res.status(400).json(GenRes(400, null, null, 'Service name is required'), req.url);
        }

        const existingService = await Service.findOne({ name: name.toLowerCase() });
        if (existingService) {
            return res.status(409).json(GenRes(409, null, null, 'Service already exists'), req.url);
        }

        const service = new Service({
            name: name.toLowerCase(),
            description: description || null,
            icon: icon || null
        });

        await service.save();
        return res.status(201).json(GenRes(201, service, null, 'Service created successfully'), req.url);
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err.message), req.url);
    }
}

const getAllServices = async (req, res) => {
    try {
        const services = await Service.find({});
        return res.status(200).json(GenRes(200, services, null, 'Services retrieved successfully'), req.url);
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err.message), req.url);
    }
}

const editService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { name, description } = req.body;

        if (!serviceId) {
            return res.status(400).json(GenRes(400, null, null, 'Service ID is required'), req.url);
        }

        const service = await Service.findOne({ serviceId });
        if (!service) {
            return res.status(404).json(GenRes(404, null, null, 'Service not found'), req.url);
        }

        if (name) {
            service.name = name.toLowerCase();
        }
        if (description) {
            service.description = description;
        }

        await service.save();
        return res.status(200).json(GenRes(200, service, null, 'Service updated successfully'), req.url);
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err.message), req.url);
    }
}

const deleteService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        if (!serviceId) {
            return res.status(400).json(GenRes(400, null, null, 'Service ID is required'), req.url);
        }

        const service = await Service.findOneAndDelete({ serviceId });
        if (!service) {
            return res.status(404).json(GenRes(404, null, null, 'Service not found'), req.url);
        }

        return res.status(200).json(GenRes(200, service, null, 'Service deleted successfully'), req.url);
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err.message), req.url);
    }
}


module.exports = {
    createService,
    getAllServices,
    editService,
    deleteService
}