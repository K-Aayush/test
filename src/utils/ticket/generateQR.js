const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const generateQRCode = async (text, ticketId) => {
    try {
        const qrDirectory = path.join(__dirname, "..", "..", "..", "uploads", "qr");
        let filePath = path.join(qrDirectory, `${ticketId}.png`);

        // Ensuring the QR directory exists
        if (!fs.existsSync(qrDirectory)) {
            fs.mkdirSync(qrDirectory, { recursive: true });
        }

        // Ensuring filePath is not a directory
        if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
            throw new Error(`Expected file path but found a directory at: ${filePath}`);
        }

        // console.log('Generating QR code for:', text);
        // console.log('Saving QR code at:', filePath);

        await QRCode.toFile(filePath, text, {
            errorCorrectionLevel: 'H',
            type: 'png'
        });

        // Confirming the QR code was actually created
        if (!fs.existsSync(filePath)) {
            throw new Error('QR code file not found after generation');
        }

        filePath = "/uploads/qr/" + ticketId + ".png";

        return filePath;
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw new Error('Failed to generate QR code');
    }
};

module.exports = {
    generateQRCode
};
