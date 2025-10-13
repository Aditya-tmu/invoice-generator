import React from 'react';
import { Card, Row, Col, Table } from 'react-bootstrap';
import { toWords } from 'number-to-words';

const InvoicePreview = ({ invoiceData }) => {
    const {
        businessDetails,
        customerDetails,
        invoiceDetails,
        items,
        summary,
        bankDetails,
        terms
    } = invoiceData;

    const roundedGrandTotal = Math.round(summary.grandTotal);
    const amountInWords = toWords(roundedGrandTotal).replace(/,/g, '').replace(/\b\w/g, l => l.toUpperCase()) + ' Only';

    return (
        <Card className="p-4" style={{ fontFamily: 'Arial, sans-serif', color: '#333' }}>
            <Card.Header className="text-center bg-white border-0">
                <h2 style={{ color: '#003d6b' }}>{invoiceDetails.type.toUpperCase()}</h2>
            </Card.Header>
            <Card.Body>
                <Row className="mb-4">
                    <Col>
                        <h4>{businessDetails.name}</h4>
                        <p className="mb-0">{businessDetails.address}</p>
                        <p className="mb-0">GSTIN: {businessDetails.gstin}</p>
                        <p className="mb-0">Contact: {businessDetails.contact}</p>
                    </Col>
                    <Col className="text-end">
                        <h5>Invoice #{invoiceDetails.number}</h5>
                        <p className="mb-0">Date: {new Date(invoiceDetails.date).toLocaleDateString()}</p>
                    </Col>
                </Row>

                <div style={{ borderTop: '2px solid #003d6b' }} className="pt-3 mb-4">
                    <h5>Bill To:</h5>
                    <p className="mb-0">{customerDetails.billTo.name}</p>
                    <p className="mb-0">{customerDetails.billTo.address}</p>
                    <p className="mb-0">GSTIN: {customerDetails.billTo.gstin}</p>
                </div>

                <Table bordered responsive>
                    <thead style={{ backgroundColor: '#003d6b', color: '#fff' }}>
                        <tr>
                            <th>#</th>
                            <th>Item</th>
                            <th>HSN</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            <th>Total</th>
                            <th>GST</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{item.name}</td>
                                <td>{item.hsn}</td>
                                <td>{item.quantity}</td>
                                <td>{Number(item.rate).toFixed(2)}</td>
                                <td>{(Number(item.quantity) * Number(item.rate)).toFixed(2)}</td>
                                <td>{item.cgst + item.sgst}%</td>
                                <td>{Number(item.amount).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                <Row className="justify-content-end mt-4">
                    <Col md={5}>
                        <Table>
                            <tbody>
                                <tr>
                                    <td><strong>Subtotal</strong></td>
                                    <td className="text-end">Rs {Number(summary.subtotal).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Total GST</strong></td>
                                    <td className="text-end">Rs {Number(summary.taxAmount).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Round Off</strong></td>
                                    <td className="text-end">{(roundedGrandTotal - summary.grandTotal).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td><h5>Grand Total</h5></td>
                                    <td className="text-end"><h5>Rs {roundedGrandTotal.toFixed(2)}</h5></td>
                                </tr>
                            </tbody>
                        </Table>
                    </Col>
                </Row>

                <div className="mt-4">
                    <p><strong>Amount in Words(INR):</strong> {amountInWords}</p>
                </div>

            </Card.Body>
            <Card.Footer style={{ borderTop: '2px solid #003d6b', paddingTop: '1rem' }}>
                <Row>
                    <Col>
                        <h6>Bank Details:</h6>
                        <p className="mb-0">Bank: {bankDetails.name}</p>
                        <p className="mb-0">A/C: {bankDetails.accountNumber}</p>
                        <p className="mb-0">IFSC: {bankDetails.ifsc}</p>
                    </Col>
                    <Col className="text-center">
                        {/* QR Code would be here in the PDF */}
                    </Col>
                    <Col className="text-end">
                        <div style={{ marginTop: '4rem' }}>
                            <h6>Authorised Signatory</h6>
                        </div>
                    </Col>
                </Row>
                <div className="text-center mt-3">
                    <small className="text-muted">This is a computer-generated invoice.</small>
                </div>
            </Card.Footer>
        </Card>
    );
};

export default InvoicePreview;
