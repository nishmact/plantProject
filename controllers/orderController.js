const user = require("../models/userModel");
const product = require("../models/productModel");
const order = require("../models/orderModel");
const cart = require("../models/cartModel");
const PDFDocument = require("pdfkit");
const { ObjectId } = require("mongodb");

const orders = async (req, res) => {
  const userId = req.session.userID;
  const userData = await user.findOne({ _id: userId });
  const orderData = await order
    .find({ userId: userId })
    .sort({ _id: -1 })
    .populate("items.product");
  res.render("userOrders", { userData, orderData });
};

const orderDetails = async (req, res) => {
  const orderId = new ObjectId(req.query.order_id);
  const itemId = new ObjectId(req.query.item_id);
  const unitId = new ObjectId(req.query.unit_id);
  const userId = req.session.userID;
  const userData = await user.findOne({ _id: userId });
  const orderItem = await order
    .findOne({ _id: orderId, "items._id": unitId })
    .populate("items.product");
  res.render("orderDetails", { userData, orderItem });
};

const orderStatus = async (req, res) => {
  const orderId = new ObjectId(req.query.order_id);
  const itemId = new ObjectId(req.query.item_id);
  const unitId = new ObjectId(req.query.unit_id);
  await order.updateOne(
    { _id: orderId, "items._id": unitId },
    {
      $set: {
        "items.$.orderStatus": req.body.action,
        "items.$.status_date": Date.now(),
        "items.$.reason": req.body.reason,
      },
    }
  );

  res.redirect(
    `/orderDetails?order_id=${req.query.order_id}&item_id=${req.query.item_id}&unit_id=${req.query.unit_id}`
  );
};

const downloadInvoice = async (req, res, next) => {
  try {
    const orders = await order.find({}, { _id: 1 });
    const orderId = new ObjectId(req.query.order_id);
    const unitId = new ObjectId(req.query.unit_id);
    const orderItem = await order
      .findOne(
        { _id: orderId, "items._id": unitId },
        {
          userId: 1,
          start_date: 1,
          "items.$": 1,
          address: 1,
          paymentType: 1,
          orderId: 1,
        }
      )
      .populate("items.product");
    const doc = new PDFDocument({ font: "Times-Roman" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment;filename="Order invoice-${orderItem._id.toString()}.pdf"`
    );
    doc.pipe(res);
    doc.fontSize(18).text("FLORAFUSION ORDER INVOICE", { align: "center" });
    doc.moveDown();
    doc
      .fontSize(12)
      .text(`Order ID: ${orderItem._id.toString()}`, { align: "left" });
    doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.25);
    doc.fontSize(12).text("Product Name", { align: "left", continued: true });
    doc.fontSize(12).text("Qty", { align: "center", continued: true });
    doc.fontSize(12).text("Price", { align: "right" });
    doc.moveDown(0.25);
    doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.moveDown();
    doc.fontSize(12).text(`${orderItem.items[0].product.name}`, {
      align: "left",
      continued: true,
    });
    doc.fontSize(12).text(1, { align: "center", continued: true });
    doc.fontSize(12).text(`Rs.${orderItem.items[0].price}`, { align: "right" });
    doc.moveDown();
    doc.moveDown();
    doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.25);
    doc.fontSize(12).text("Total", { align: "left", continued: true });
    doc.fontSize(12).text(`Rs.${orderItem.items[0].price}`, { align: "right" });
    doc.moveDown(0.25);
    doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.moveDown();
    doc
      .fontSize(12)
      .text(`Ordered Date: ${orderItem.start_date.toLocaleDateString()}`);
    doc.moveDown();
    doc.fontSize(12).text(`Payment Method: ${orderItem.paymentType}`);
    doc.moveDown();
    const [address] = orderItem.address;
    doc
      .fontSize(12)
      .text(
        doc.text(
          `Shipping Address: ${address.name},${address.locality},${address.city},${address.house},${address.landmark},${address.state},${address.pin},${address.mobile}`
        ),
        { width: 300 }
      );
    doc.moveDown();
    doc.moveDown();
    doc.moveDown();
    doc.moveDown();
    doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.25);
    doc
      .fontSize(14)
      .text("Thank you for shopping with us!", { align: "center" });
    doc.end();
  } catch (err) {
    next(err);
  }
};

////////////////////////////////////////////////////////////////////////////

module.exports = {
  orders,
  orderDetails,
  orderStatus,
  downloadInvoice,
};
