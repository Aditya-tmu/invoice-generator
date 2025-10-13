
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const exceljs = require('exceljs');
const fs = require('fs');
const path = require('path');
const { toWords } = require('number-to-words');
const QRCode = require('qrcode');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- PDF Generation Logic (Modern Template) ---
const generatePdf = (invoiceData, logoPath, signaturePath) => {
    return new Promise(async (resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });
        doc.on('error', reject);

        try {
            const brandColor = '#003d6b'; // A deep blue

            // 1. Header
            doc.fillColor(brandColor).fontSize(20).font('Helvetica-Bold').text(invoiceData.invoiceDetails.type.toUpperCase(), { align: 'center' });
            doc.moveDown();

            const headerY = doc.y;
            if (logoPath && fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, headerY, { width: 100 });
            }

            doc.fillColor('#333').fontSize(16).font('Helvetica-Bold').text(invoiceData.businessDetails.name, 200, headerY, { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(invoiceData.businessDetails.address, 200, doc.y, { align: 'center' });
            const contactInfo = [
                invoiceData.businessDetails.gstin ? `GSTIN: ${invoiceData.businessDetails.gstin}` : null,
                invoiceData.businessDetails.contact ? `Contact: ${invoiceData.businessDetails.contact}` : null,
                invoiceData.businessDetails.email ? `Email: ${invoiceData.businessDetails.email}` : null
            ].filter(Boolean).join(' | ');
            doc.text(contactInfo, 200, doc.y, { align: 'center' });
            
            // Ensure y position is below the logo
            if (doc.y < headerY + 100) {
                doc.y = headerY + 100;
            }
            doc.moveDown();

            // 2. Customer & Invoice Details
            doc.rect(50, doc.y, 500, 2).fill(brandColor);
            doc.moveDown();
            const detailsY = doc.y;
            doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 50, detailsY);
            doc.font('Helvetica').text(invoiceData.customerDetails.billTo.name, 50, doc.y);
            doc.text(invoiceData.customerDetails.billTo.address, 50, doc.y, { width: 200 });
            doc.text(`GSTIN: ${invoiceData.customerDetails.billTo.gstin}`, 50, doc.y);

            const invoiceDetailsX = 350;
            doc.font('Helvetica-Bold').text(`Invoice #: ${invoiceData.invoiceDetails.number}`, invoiceDetailsX, detailsY);
            doc.font('Helvetica').text(`Date: ${invoiceData.invoiceDetails.date}`, invoiceDetailsX, doc.y);
            doc.moveDown(4);

            // 3. Items Table
            const tableTop = doc.y;
            doc.font('Helvetica-Bold').fontSize(9);
            const tableHeaders = ['#', 'Item', 'HSN', 'Qty', 'Rate', 'Total', 'GST', 'Amount'];
            const colWidths = [30, 150, 60, 40, 60, 60, 50, 50];
            
            // Draw table header
            let x = 50;
            doc.rect(x, tableTop, colWidths.reduce((a, b) => a + b), 25).fill(brandColor);
            doc.fillColor('#FFF');
            tableHeaders.forEach((header, i) => {
                doc.text(header, x, tableTop + 8, { width: colWidths[i], align: 'center' });
                x += colWidths[i];
            });
            doc.fillColor('#333');

            let tableY = tableTop + 25;
            doc.fontSize(9); // Set font size for table body
            invoiceData.items.forEach((item, index) => {
                x = 50;
                const itemData = [
                    String(index + 1),
                    item.name,
                    item.hsn,
                    item.quantity,
                    Number(item.rate).toFixed(2),
                    (Number(item.quantity) * Number(item.rate)).toFixed(2),
                    `${Number(item.cgst) + Number(item.sgst)}%`,
                    Number(item.amount).toFixed(2)
                ];
                const rowHeight = 30;
                doc.rect(x, tableY, colWidths.reduce((a, b) => a + b), rowHeight).stroke('#EEE');
                itemData.forEach((cell, i) => {
                    doc.text(cell, x, tableY + 10, { width: colWidths[i], align: 'center' });
                    x += colWidths[i];
                });
                tableY += rowHeight;
            });

            // 4. Summary
            const summaryX = 350;
            let summaryY = tableY + 20;
            doc.font('Helvetica-Bold').fontSize(10).text('Subtotal:', summaryX, summaryY);
            doc.font('Helvetica').text(`Rs ${Number(invoiceData.summary.subtotal).toFixed(2)}`, summaryX + 100, summaryY, { align: 'right' });
            summaryY += 20;

            const cgstPercentage = invoiceData.items.length > 0 ? invoiceData.items[0].cgst : 0;
            const sgstPercentage = invoiceData.items.length > 0 ? invoiceData.items[0].sgst : 0;
            const cgstAmount = invoiceData.summary.taxAmount / 2;
            const sgstAmount = invoiceData.summary.taxAmount / 2;

            doc.font('Helvetica-Bold').text(`CGST @ ${cgstPercentage}%:`, summaryX, summaryY);
            doc.font('Helvetica').text(`Rs ${Number(cgstAmount).toFixed(2)}`, summaryX + 100, summaryY, { align: 'right' });
            summaryY += 20;

            doc.font('Helvetica-Bold').text(`SGST @ ${sgstPercentage}%:`, summaryX, summaryY);
            doc.font('Helvetica').text(`Rs ${Number(sgstAmount).toFixed(2)}`, summaryX + 100, summaryY, { align: 'right' });
            summaryY += 20;

            const roundedGrandTotal = Math.round(invoiceData.summary.grandTotal);
            const roundingDifference = roundedGrandTotal - invoiceData.summary.grandTotal;
            if (roundingDifference !== 0) {
                doc.font('Helvetica-Bold').text('Round Off:', summaryX, summaryY);
                doc.font('Helvetica').text(roundingDifference.toFixed(2), summaryX + 100, summaryY, { align: 'right' });
                summaryY += 20;
            }

            doc.font('Helvetica-Bold').fontSize(14).text('Grand Total:', summaryX, summaryY);
            doc.text(`Rs ${roundedGrandTotal.toFixed(2)}`, summaryX + 100, summaryY, { align: 'right' });

            // Amount in words
            const grandTotalForWords = roundedGrandTotal;
            const amountInWords = toWords(grandTotalForWords).replace(/,/g, '').replace(/\b\w/g, l => l.toUpperCase()) + ' Only';
            doc.font('Helvetica-Bold').fontSize(10).text('Amount in Words:', 50, tableY + 20);
            doc.font('Helvetica').text(amountInWords, 50, doc.y, { width: 250 });

            // 5. Footer
            const footerY = 650;
            doc.rect(50, footerY, 500, 2).fill(brandColor);
            doc.moveDown();

            const footerSectionY = footerY + 15;

            // Bank Details (Left)
            doc.fontSize(10).font('Helvetica-Bold').text('Bank Details', 50, footerSectionY);
            doc.font('Helvetica').text(`Bank: ${invoiceData.bankDetails.name}`, 50, doc.y);
            doc.text(`A/C: ${invoiceData.bankDetails.accountNumber}`, 50, doc.y);
            doc.text(`IFSC: ${invoiceData.bankDetails.ifsc}`, 50, doc.y);

            // QR Code (Middle)
            if (invoiceData.generateQr && invoiceData.bankDetails && invoiceData.bankDetails.upi) {
                const roundedGrandTotal = Math.round(invoiceData.summary.grandTotal);
                const payeeName = encodeURIComponent(invoiceData.businessDetails.name);
                const transactionNote = encodeURIComponent(`Invoice ${invoiceData.invoiceDetails.number}`);

                const upiString = `upi://pay?pa=${invoiceData.bankDetails.upi}&pn=${payeeName}&am=${roundedGrandTotal}&cu=INR&tn=${transactionNote}`;

                const qrCode = await QRCode.toDataURL(upiString);
                doc.image(qrCode, 250, footerSectionY, { width: 80 });
                doc.font('Helvetica').text('Scan to Pay', 250, footerSectionY + 85, {width: 80, align: 'center'});
            }

            // Authorised Signatory (Right)
            const signatoryX = 400;
            doc.font('Helvetica-Bold').text('Authorised Signatory', signatoryX, footerSectionY, {width: 120, align: 'center'});
            if (signaturePath && fs.existsSync(signaturePath)) {
                doc.image(signaturePath, signatoryX, footerSectionY + 15, { width: 120, align: 'center' });
            }

            doc.fontSize(8).fillColor('#777').text('This is a computer-generated invoice.', 50, 780, { align: 'center' });

            doc.end();

        } catch (error) {
            reject(error);
        }
    });
};

// --- Excel Generation Logic (Fixed) ---
const generateExcel = async (invoiceData, stream) => {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Invoice');
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = invoiceData.businessDetails.name;
    worksheet.getCell('A1').font = { size: 20, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getRow(5).values = ['Item Name', 'HSN Code', 'Quantity', 'Unit', 'Rate', 'Discount (%)', 'CGST (%)', 'SGST (%)', 'Amount']; // Fixed header
    worksheet.getRow(5).font = { bold: true };
    let currentRow = 6;
    invoiceData.items.forEach(item => {
        worksheet.getRow(currentRow).values = [
            item.name,
            item.hsn,
            item.quantity,
            item.unit,
            parseFloat(item.rate || 0),
            parseFloat(item.discount || 0),
            parseFloat(item.cgst || 0), // CGST %
            parseFloat(item.sgst || 0), // SGST %
            parseFloat(item.amount || 0)
        ];
        currentRow++;
    });
    worksheet.getCell(`G${currentRow + 1}`).value = 'Subtotal';
    worksheet.getCell(`H${currentRow + 1}`).value = invoiceData.summary.subtotal;
    worksheet.getCell(`G${currentRow + 2}`).value = 'CGST';
    worksheet.getCell(`H${currentRow + 2}`).value = invoiceData.summary.taxAmount / 2;
    worksheet.getCell(`G${currentRow + 3}`).value = 'SGST';
    worksheet.getCell(`H${currentRow + 3}`).value = invoiceData.summary.taxAmount / 2;
    worksheet.getCell(`G${currentRow + 4}`).value = 'Grand Total';
    worksheet.getCell(`H${currentRow + 4}`).value = invoiceData.summary.grandTotal;
    worksheet.getCell(`G${currentRow + 4}`).font = { bold: true };
    worksheet.getCell(`H${currentRow + 4}`).font = { bold: true };
    await workbook.xlsx.write(stream);
};

// --- API Endpoints ---
app.post('/api/generate', upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'signature', maxCount: 1 }]), async (req, res) => {
    try {
        const invoiceData = JSON.parse(req.body.invoiceData);
        const format = req.body.format;
        const logoPath = req.files.logo ? req.files.logo[0].path : null;
        const signaturePath = req.files.signature ? req.files.signature[0].path : null;

        if (format === 'pdf') {
            const pdfData = await generatePdf(invoiceData, logoPath, signaturePath);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceData.invoiceDetails.number}.pdf`);
            res.send(pdfData);
        } else if (format === 'excel') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceData.invoiceDetails.number}.xlsx`);
            generateExcel(invoiceData, res).then(() => res.end());
        } else {
            res.status(400).send('Invalid format requested');
        }
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send("Error processing your request.");
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
