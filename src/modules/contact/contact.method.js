const GenRes = require('../../utils/router/GenRes');
const Contact = require('./contact.model');
const { v4: uuidv4 } = require('uuid');

const createContact = async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json(GenRes(400, null, null, "Name, email and message are required"), req.url);
        }

        const newContact = new Contact({
            contactId: uuidv4(),
            name,
            number: req.body.number || null,
            email,
            message
        });

        await newContact.save();

        return res.status(201).json(GenRes(201, null, null, "Contact form submitted successfully"), req.url);
    } catch (err) {
        return res.status(500).json(GenRes(500, null, err, err.message), req.url);
    }
}

const getAllContactsByAdmin = async (req, res) => {
    try {
        const requestedUser = req.user;

        if (!requestedUser) {
            return res
                .status(401)
                .json(GenRes(401, null, null, "Unauthorized", req.url));
        }

        const allContacts = await Contact.find();

        if (!allContacts || allContacts.length === 0) {
            return res
                .status(404)
                .json(GenRes(404, null, null, "No contact forms submitted", req.url));
        }

        return res
            .status(200)
            .json(GenRes(200, allContacts, null, "All contacts retrieved successfully", req.url));
    } catch (error) {
        return res
            .status(500)
            .json(GenRes(500, null, error, "Error retrieving contacts", req.url));
    }
};


module.exports = {
    createContact,
    getAllContactsByAdmin
}