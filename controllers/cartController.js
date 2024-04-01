const user = require("../models/userModel");
const product = require("../models/productModel");
const cart = require("../models/cartModel");
const order = require("../models/orderModel");
const { ObjectId } = require("mongodb");
const Razorpay = require("razorpay");
const coupon = require("../models/couponModel");
var instance = new Razorpay({
  key_id: "rzp_test_xrmbIgOpuVioVc",
  key_secret: "6ApN90CYBLKfbSqCuZdGCmnS",
});

const addToCart = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.session.userID;
    const [productData, userCart] = await Promise.all([
      product.findOne({ _id: productId }),
      cart.findOne({ userId: userId }),
    ]);
    if (userCart) {
      await cart.updateOne(
        { userId: userId },
        {
          $push: {
            items: {
              product: productId,
              price: productData.price,
              discountedPrice: productData.discountedPrice,
              totalOffer: productData.totalOffer,
              quantity: 1,
            },
          },
          $inc: { totalPrice: productData.discountedPrice },
        }
      );
      console.log(productData);
      res.redirect("/cart");
      res.json({ sucess: true });
    } else {
      const userCart = new cart({
        userId: userId,
        items: [
          {
            product: productId,
            price: productData.price,
            totalOffer: productData.totalOffer,
            discountedPrice: productData.discountedPrice,
            quantity: 1,
          },
        ],
        totalPrice: productData.discountedPrice,
      });
      await userCart.save();
      res.redirect("/cart");
      res.json({ success: true });
    }
  } catch (err) {
    console.log(err.message);
  }
};

const goToCart = async (req, res) => {
  try {
    const userId = new ObjectId(req.session.userID);
    const userData = await user.findOne({ _id: userId });
    const cartData = await cart.aggregate([
      { $match: { userId: userId } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "itemdetails",
        },
      },
    ]);
    res.render("cart", { userData, cartData });
  } catch (err) {
    console.log(err.message);
  }
};

const incrementQuantity = async (req, res) => {
  try {
    const userId = new ObjectId(req.session.userID);
    const productId = new ObjectId(req.params.id);
    const productData = await product.findOne({ _id: productId });
    const cartData = await cart.findOne({ userId: userId });
    const { quantity } = cartData.items.find(
      (item) => item.product == req.params.id
    );
    if (quantity + 1 <= productData.quantity) {
      const cartData = await cart.findOneAndUpdate(
        { userId: userId, "items.product": productId },
        {
          $inc: {
            "items.$.quantity": 1,
            totalPrice: productData.discountedPrice,
          },
        },
        { new: true }
      );
      const { quantity } = cartData.items.find(
        (item) => item.product == req.params.id
      );
      res.json({
        message: true,
        subTotal: cartData.totalPrice,
        quantity,
        productTotal: quantity * productData.discountedPrice,
      });
    } else {
      res.json({ message: false });
    }
  } catch (err) {
    console.log(err.message);
  }
};

const decreasQuantity = async (req, res) => {
  try {
    const userId = new ObjectId(req.session.userID);
    const productId = new ObjectId(req.params.id);
    const productData = await product.findOne({ _id: productId });
    const cartData = await cart.findOneAndUpdate(
      { userId: userId, "items.product": productId },
      {
        $inc: {
          "items.$.quantity": -1,
          totalPrice: -productData.discountedPrice,
        },
      },
      { new: true }
    );

    const { quantity } = cartData.items.find(
      (item) => item.product == req.params.id
    );
    res.json({
      message: true,
      subTotal: cartData.totalPrice,
      quantity,
      totalStock: productData.quantity,
      deliveryTime: productData.deliveryTime,
      productTotal: quantity * productData.discountedPrice,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: false, error: "Internal Server Error" });
  }
};

const removeItem = async (req, res) => {
  try {
    const userId = new ObjectId(req.session.userID);
    const productId = new ObjectId(req.params.id);
    const [removingItem] = await cart.aggregate([
      { $match: { userId: userId } },
      { $unwind: "$items" },
      { $match: { "items.product": productId } },
      {
        $project: {
          _id: 0,
          quantity: "$items.quantity",
          price: "$items.price",
          discountedPrice: "$items.discountedPrice",
        },
      },
    ]);
    const { quantity, price, discountedPrice } = removingItem;
    await cart.updateOne(
      { userId: userId },
      {
        $pull: { items: { product: productId } },
        $inc: { totalPrice: -(quantity * discountedPrice) },
      }
    );
    res.redirect("/cart");
  } catch (err) {
    console.log(err.message);
  }
};

const checkout = async (req, res) => {
  try {
    const userId = new ObjectId(req.session.userID);
    const userData = await user.findOne({ _id: userId });
    const cartData = await cart.findOne({ userId: userId });
    const couponData = await coupon.find({
      $and: [
        { expireDate: { $gte: new Date() } },
        { minAmount: { $lte: cartData.totalPrice } },
        { status: 0 },
      ],
    });

    res.render("checkout", { userData, cartData, couponData });
  } catch (err) {
    console.log(err.message);
  }
};

const placeOrder = async (req, res) => {
  try {
    const userId = new ObjectId(req.session.userID);
    const cartData = await cart.findOne({ userId: userId });
    const userData = await user.findOne({ _id: userId });

    let totalPrice = cartData.totalPrice;
    const walletUse = req.body.walletUse === "1";

    if (walletUse) {
      if (userData.wallet >= totalPrice) {
        await user.updateOne(
          { _id: userId },
          { $inc: { wallet: -totalPrice } }
        );

        const walletHistory = {
          amount: totalPrice,
          type: "debit",
          date: new Date(),
        };
        await user.updateOne(
          { _id: userId },
          { $push: { walletHistory: walletHistory } }
        );

        totalPrice = 0;
      } else {
        totalPrice -= userData.wallet;
        await user.updateOne({ _id: userId }, { $set: { wallet: 0 } });
        const walletHistory = {
          amount: userData.wallet,
          type: "debit",
          date: new Date(),
        };
        await user.updateOne(
          { _id: userId },
          { $push: { walletHistory: walletHistory } }
        );
      }
    } 

    if ( totalPrice<=1000 && req.body.paymentMethod === "COD") {
      await orderUpdate(req.body, req.session.userID);
      return res.json({ message: "orderSuccess" });
    } else if (req.body.paymentMethod === "onlinePayment") {
      req.session.orderDetails = req.body;
      const savings = req.body.savings || 0;
      totalPrice -= savings;

      var options = {
        amount: totalPrice * 100,
        currency: "INR",
      };

      instance.orders.create(options, function (err, order) {
        if (order) {
          return res.json({ message: "onlinePayment", order: order });
        } else if (err) {
          console.log("Error creating order:", err);
        }
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

async function orderUpdate(orderDetails, userID) {
  const userId = new ObjectId(userID);
  const userData = await user.findOne({ _id: userId });
  const cartData = await cart
    .findOne({ userId: userId })
    .populate("items.product");
  const orderItems = [];
  for (const data of cartData.items) {
    await product.updateOne(
      { _id: data.product._id },
      { $inc: { quantity: -data.quantity } }
    );
    for (let i = 0; i < data.quantity; i++) {
      orderItems.push({
        product: data.product._id,
        price: data.price,
        quantity: data.quantity,
        deliveryTime: data.product.deliveryTime,
      });
    }
  }

  const userOrder = new order({
    userId: userId,
    items: orderItems,
    address: userData.address,
    paymentType: orderDetails.paymentMethod,  
  });

  const orderData = await userOrder.save();
  await cart.deleteOne({ userId: userId });
}

const verifyPayment = async (req, res) => {
  const crypto = require("crypto");
  let hmac = crypto.createHmac("sha256", "6ApN90CYBLKfbSqCuZdGCmnS");
  const { payment, order } = req.body;
  hmac.update(payment.razorpay_order_id + "|" + payment.razorpay_payment_id);
  hmac = hmac.digest("hex");
  if (hmac === payment.razorpay_signature) {
    orderUpdate(req.session.orderDetails, req.session.userID);
    res.json({ message: "orderSuccess" });
  } else {
    console.log("failed")
    res.json({ message: "paymentFailed" });

  }
};

//////////////////////////////////////////////////////////////////

module.exports = {
  addToCart,
  goToCart,
  incrementQuantity,
  decreasQuantity,
  removeItem,
  checkout,
  placeOrder,
  verifyPayment,
};
