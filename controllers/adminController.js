const user = require("../models/userModel");
const product = require("../models/productModel");
const order = require("../models/orderModel");
const category = require("../models/categoryModel");
const coupon = require("../models/couponModel");
const { ObjectId } = require("mongodb");

//////////////////////////////////Login Page/////////////////////////////////////

const loadLogin = (req, res) => {
  try {
    res.render("adminLogin", { message: "" });
  } catch (err) {
    console.log(err.message);
  }
};

const verifyLogin = async (req, res) => {
  try {
    adminEmail = req.body.email;
    adminPassword = req.body.password;
    const userData = await user.findOne({ email: adminEmail });
    if (userData && userData.is_admin === 1) {
      req.session.adminUser = true;
      res.redirect("/admin");
    } else {
      res.render("adminLogin", { message: "You are not a admin" });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const logout = (req, res) => {
  try {
    req.session.adminUser = null;
    res.redirect("/");
  } catch (err) {
    console.log(err.message);
  }
};

const home = async (req, res) => {
  try {
    const totalUsers = await user.aggregate([
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);

    const totalOrders = await order.aggregate([
      { $match: { "items.orderStatus": "delivered" } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);

    const totalRevenue = await order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.orderStatus": "delivered" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$items.price" },
        },
      },
    ]);

    const today = new Date();
    const dayOfWeek = today.getDay();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const weeklySales = await order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.orderStatus": "delivered" } },
      {
        $group: {
          _id: { $dayOfWeek: { $toDate: "$items.status_date" } },
          total: { $sum: 1 },
        },
      },
    ]);

    const weeklySalesData = Array.from({ length: 7 }, (_, i) => {
      const foundDay = weeklySales.find((day) => day._id === i + 1);
      return foundDay ? foundDay.total : 0;
    });

    const monthlySales = await order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.orderStatus": "delivered" } },
      {
        $group: {
          _id: { $month: { $toDate: "$items.status_date" } },
          total: { $sum: 1 },
        },
      },
    ]);

    const monthlySalesData = Array.from({ length: 12 }, (_, i) => {
      const foundMonth = monthlySales.find(
        (monthData) => monthData._id === i + 1
      );
      return foundMonth ? foundMonth.total : 0;
    });

    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const datesInMonth = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const dateSales = await order.aggregate([
      { $unwind: "$items" },
      {
        $match: {
          "items.orderStatus": "delivered",
        },
      },
      {
        $group: {
          _id: { $dayOfMonth: { $toDate: "$items.status_date" } },
          total: { $sum: 1 },
        },
      },
    ]);

    
    const dateSalesData = Array.from({ length: daysInMonth }, (_, i) => {
      const foundDay = dateSales.find((dayData) => dayData._id === i + 1);
      return foundDay ? foundDay.total : 0;
    });

    res.render("adminHome", {
      totalUsers,
      totalOrders,
      totalRevenue,
      weeklySalesData,
      monthlySalesData,
      dateSalesData: JSON.stringify(dateSalesData),
      datesInMonth: JSON.stringify(datesInMonth),
    });
  } catch (error) {
    console.log(error.message);
  }
};

///////////////////////////User-Management////////////////////////////////////////

const viewUser = async (req, res) => {
  try {
    const message = req.session.message || "";
    req.session.message = null;

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalProducts = await user.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    const users = await user.find({}).skip(skip).limit(limit);
    res.render("viewUser", { users, message, totalPages });
  } catch (error) {
    console.log(error.message);
  }
};

const blockUser = async (req, res) => {
  try {
    const id = req.params.id;
    const userData = await user.findOne({ _id: id });
    if (userData.is_block === 0) {
      await user.updateOne({ _id: id }, { $set: { is_block: 1 } });
      req.session.message = "User Blocked";
    } else {
      await user.updateOne({ _id: id }, { $set: { is_block: 0 } });
      req.session.message = "User Unlocked";
    }
    res.redirect("/admin/viewUser");
  } catch (err) {
    console.log(err.meassge);
  }
};

const addUser = async (req, res) => {
  try {
    const [usermail, usermobile] = await Promise.all([
      user.findOne({ email: { $regex: new RegExp(req.body.email, "i") } }),
      user.findOne({ mobile: req.body.mobile }),
    ]);
    if (usermail) {
      req.session.message = "Mail Id already exist";
      res.redirect("/admin/viewUser");
    } else if (usermobile) {
      req.session.message = "Mobile Number already exist";
      res.redirect("/admin/viewUser");
    } else {
      const spassword = await securePassword(req.body.password);
      const addUser = new user({
        name: req.body.name,
        email: req.body.email,
        mobile: req.body.mobile,
        password: spassword,
      });
      const userData = await addUser.save();
      req.session.message = "User Added succesfully";
      res.redirect("/admin/viewUser");
    }
  } catch (error) {
    console.error("Error adding usert:", error);
  }
};

////////////////////////product-Management/////////////////////

const viewProducts = async (req, res) => {
  try {
    const message = req.session.message || "";

    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    const totalProducts = await product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    const [categories, productData] = await Promise.all([
      category.find({}),
      product.find({}).skip(skip).limit(limit),
    ]);
    req.session.message = null;
    res.render("viewProducts", {
      categories,
      message,
      productData,
      totalPages,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const addProduct = async (req, res) => {
  try {
    const image = req.files.map((file) => "/images/" + file.filename);

    const price = parseFloat(req.body.price);
    const productOffer = parseFloat(req.body.productOffer);
    if (isNaN(price) || isNaN(productOffer)) {
      throw new Error("Invalid price or productOffer");
    }

    const totalOffer = await calculateTotalOffer(
      req.body.category,
      req.body.productOffer
    );
    const discountedPrice = calculateDiscountedPrice(price, totalOffer);

    const addproduct = new product({
      name: req.body.name,
      category: req.body.category,
      price: req.body.price,
      quantity: req.body.quantity,
      deliveryTime: req.body.deliveryTime,
      description: req.body.description,
      image: image,
      productOffer: productOffer,
      totalOffer: totalOffer,
      discountedPrice: discountedPrice,
    });
    const productData = await addproduct.save();

    if (productData) {
      req.session.message = "Product added successfully";
      res.redirect("/admin/viewProducts");
    } else {
      req.session.message = "Product adding failed";
      res.redirect("/admin/viewProducts");
    }
  } catch (error) {
    console.error("Error adding product:", error);
    req.session.message = "Product adding failed";
    res.redirect("/admin/viewProducts");
  }
};

const calculateTotalOffer = async (categoryName, productOffer) => {
  const categoryData = await category.findOne({ name: categoryName });
  if (categoryData) {
    return Number(categoryData.categoryOffer) + Number(productOffer);
  } else {
    return 0;
  }
};

const calculateDiscountedPrice = (price, totalOffer) => {
  return price - (price * totalOffer) / 100;
};

const editProduct = async (req, res) => {
  try {
    const updateFields = {
      name: req.body.name,
      category: req.body.category,
      price: req.body.price,
      productOffer: req.body.productOffer,
      quantity: req.body.quantity,
      deliveryTime: req.body.deliveryTime,
      description: req.body.description,
    };

    if (req.files && req.files.length > 0) {
      updateFields.image = updateFields.image || [];
      const newImages = req.files.map((file) => "/images/" + file.filename);
      updateFields.image = [...updateFields.image, ...newImages];
    }

    const productData = await product.findOneAndUpdate(
      { _id: req.params.id },
      { $set: updateFields },
      { new: true }
    );

    if (productData) {
      const totalOffer = await calculateTotalOffer(
        productData.category,
        req.body.productOffer
      );
      const discountedPrice = calculateDiscountedPrice(
        productData.price,
        totalOffer
      );

      await product.findOneAndUpdate(
        { _id: req.params.id },
        { $set: { totalOffer, discountedPrice } }
      );

      req.session.message = "Product editing successfully";
      res.redirect("/admin/viewProducts");
    } else {
      req.session.message = "Product editing failed";
      res.redirect("/admin/viewProducts");
    }
  } catch (error) {
    console.error("Error editing product:", error);
    req.session.message = "Product editing failed";
    res.redirect("/admin/viewProducts");
  }
};

const deleteImage = async (req, res) => {
  try {
    const productId = req.params.id;
    const imageUrlToDelete = req.body.imageUrl;
    const productData = await product.findOne({ _id: productId });
    productData.image = productData.image.filter(
      (image) => image !== imageUrlToDelete
    );
    await productData.save();
    res.sendStatus(200);
  } catch (error) {
    console.error("Error deleting image:", error);
    res.sendStatus(500);
  }
};

const listProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const productData = await product.findOne({ _id: productId });
    if (productData.status === 0) {
      await product.updateOne({ _id: productId }, { $set: { status: 1 } });
      req.session.message = "Product unlisted";
    } else {
      await product.updateOne({ _id: productId }, { $set: { status: 0 } });
      req.session.message = "Product listed";
    }
    res.redirect("/admin/viewProducts");
  } catch (err) {
    console.log(err.meassge);
  }
};

////////////////////////category-Management/////////////////////

const viewCategory = async (req, res) => {
  try {
    const message = req.session.message || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalProducts = await category.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    const categories = await category.find({}).skip(skip).limit(limit);
    req.session.message = null;
    res.render("viewCategory", { categories, message, totalPages });
  } catch (error) {
    console.log(error.message);
  }
};

const addCategory = async (req, res) => {
  try {
    const data = await category.findOne({
      name: { $regex: new RegExp(req.body.name, "i") },
    });
    if (data) {
      req.session.message = "Category already exist";
      res.redirect("/admin/viewCategory");
    } else {
      const newCategory = new category({
        name: req.body.name,
        categoryOffer: req.body.categoryOffer,
      });
      const data = await newCategory.save();
      if (data) {
        req.session.message = "Category added successfully";
        res.redirect("/admin/viewCategory");
      } else {
        req.session.message = "Category adding failed";
        res.redirect("/admin/viewCategory");
      }
    }
  } catch (err) {
    console.log(err.message);
  }
};

const listCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const categoryData = await category.findOne({ _id: id });
    if (categoryData.status === 0) {
      await category.updateOne({ _id: id }, { $set: { status: 1 } });
      req.session.message = "Category unlisted";
    } else {
      await category.updateOne({ _id: id }, { $set: { status: 0 } });
      req.session.message = "Category listed";
    }
    res.redirect("/admin/viewCategory");
  } catch (err) {
    console.log(err.meassge);
  }
};

const editCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const newName = req.body.name;
    const newOffer = req.body.categoryOffer;
    const data = await category.findOne({
      name: { $regex: new RegExp(newName, "i") },
    });
    if (data && data._id.toString() !== id) {
      req.session.message = "A category with this name already exists";
      res.redirect("/admin/viewCategory");
      return;
    }
    await category.findOneAndUpdate(
      { _id: id },
      { $set: { name: newName, categoryOffer: newOffer } }
    );
    const products = await product.find({ category: newName });
    for (const productData of products) {
      const totalOffer = await calculateTotalOffer(
        newName,
        productData.productOffer
      );
      const discountedPrice = calculateDiscountedPrice(
        productData.price,
        totalOffer
      );
      await product.findOneAndUpdate(
        { _id: productData._id },
        { $set: { totalOffer, discountedPrice } }
      );
    }
    req.session.message = "Category edited successfully";
    res.redirect("/admin/viewCategory");
  } catch (err) {
    console.error("Error editing category:", err);
    req.session.message = "Category editing failed";
    res.redirect("/admin/viewCategory");
  }
};

/////////////////////////////////////////Order-Management/////////////////////////////////

const viewOrders = async (req, res) => {
  try {
    const message = req.session.message || "";
    req.session.message = null;
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    const totalProducts = await order.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
    const orderData = await order
      .find({})
      .skip(skip)
      .limit(limit)
      .sort({ _id: -1 })
      .populate("userId")
      .populate("items.product");
    res.render("viewOrders", { orderData, message, totalPages });
  } catch (error) {
    console.log(error.message);
  }
};

const orderStatus = async (req, res) => {
  try {
    const orderId = new ObjectId(req.query.order_id);
    const itemId = new ObjectId(req.query.item_id);
    const unitId = new ObjectId(req.query.unit_id);
    const userId = new ObjectId(req.body.userId);
    await order.updateOne(
      { _id: orderId, "items._id": unitId },
      {
        $set: {
          "items.$.orderStatus": req.body.status,
          "items.$.status_date": Date.now(),
        },
      }
    );
    if (
      req.body.status == "adminCancelled" ||
      req.body.status == "userCancelled"
    ) {
      if (req.body.reason != "Defective Product") {
        await product.updateOne({ _id: itemId }, { $inc: { quantity: 1 } });
      }
    }
    if (req.body.status == "returned") {
      const products = await product.findById({ _id: itemId });
      const users = await user.findById({ _id: userId });
      users.wallet += products.price;

      const walletHistory = {
        amount: products.price,
        type: "credit",
        date: new Date(),
      };
      users.walletHistory.push(walletHistory);

      await users.save();
    }
    req.session.message = "Order status changed successfully";
    res.redirect("/admin/viewOrders");
  } catch (error) {
    console.log(error.message);
  }
};

///////////////////////////////////////////Coupon-Management/////////////////////////////////////

const viewCoupon = async (req, res) => {
  try {
    const message = req.session.message || "";
    req.session.message = null;

    const coupons = await coupon.find({});
    res.render("viewCoupons", { message, coupons });
  } catch (err) {
    console.log(err.message);
  }
};

const addCoupon = async (req, res) => {
  try {
    const coupons = await coupon.findOne({
      couponName: { $regex: new RegExp(req.body.couponName, "i") },
    });
    if (coupons) {
      req.session.message = "Coupon code already exist";
    } else {
      const addCoupon = new coupon({
        couponName: req.body.couponName,
        percentage: req.body.percentage,
        maxDiscount: req.body.maxDiscount,
        minAmount: req.body.minAmount,
        expireDate: req.body.expireDate,
      });
      await addCoupon.save();
      req.session.message = "Coupon added successfully";
    }
    res.redirect("/admin/viewCoupons");
  } catch (err) {
    console.log(err.message);
  }
};

const editCoupon = async (req, res) => {
  try {
    const existingCoupon = await coupon.findOne({
      couponName: { $regex: new RegExp("^" + req.body.couponName + "$", "i") },
      _id: { $ne: req.params.id },
    });

    if (existingCoupon) {
      req.session.message = "Coupon code already exists";
    } else {
      const updateFields = {
        couponName: req.body.couponName,
        percentage: req.body.percentage,
        maxDiscount: req.body.maxDiscount,
        minAmount: req.body.minAmount,
        expireDate: req.body.expireDate,
      };
      await coupon.findOneAndUpdate(
        { _id: req.params.id },
        { $set: updateFields },
        { new: true }
      );
    }
    res.redirect("/admin/viewCoupons");
  } catch (err) {
    console.log(err.message);
  }
};

const listCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    const couponData = await coupon.findOne({ _id: couponId });
    if (couponData.status === 0) {
      await coupon.updateOne({ _id: couponId }, { $set: { status: 1 } });
      req.session.message = "Coupon unlisted";
    } else {
      await coupon.updateOne({ _id: couponId }, { $set: { status: 0 } });
      req.session.message = "Coupon listed";
    }
    res.redirect("/admin/viewCoupons");
  } catch (err) {
    console.log(err.meassge);
  }
};

/////////////////////////////////////////////Sales Report////////////////////////////////////////

const salesReport = async (req, res) => {
  try {
    const message = req.session.message || "";
    req.session.message = null;

    const filterType = req.query.filterType;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    let filteredData;

    if (filterType === "daily") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      filteredData = await order
        .find({ start_date: { $gte: startOfDay, $lte: endOfDay } })
        .populate("userId")
        .populate("items");
    } else if (filterType === "weekly") {
      const startOfWeek = new Date();
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      filteredData = await order
        .find({ start_date: { $gte: startOfWeek, $lte: endOfWeek } })
        .populate("userId")
        .populate("items");
    } else if (filterType === "monthly") {
      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );
      const endOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0
      );
      filteredData = await order
        .find({ start_date: { $gte: startOfMonth, $lte: endOfMonth } })
        .populate("userId")
        .populate("items");
    } else if (startDate && endDate) {
      filteredData = await order
        .find({
          start_date: { $gte: new Date(startDate), $lte: new Date(endDate) },
        })
        .populate("userId")
        .populate("items");
    } else {
      filteredData = await order.find({}).populate("userId").populate("items");
    }

    res.render("viewSalesReport", { message, orderData: filteredData });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/////////////////////////////////////////////BestProducts/////////////////////////

const viewBestProducts = async (req, res) => {
  try {
    const message = req.session.message || "";
    req.session.message = null;
    const bestProducts = await order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.orderStatus": "delivered" } },
      { $group: { _id: "$items.product", totalOrders: { $sum: 1 } } },
      { $sort: { totalOrders: -1 } },
      { $limit: 10 },
    ]);

    const productIds = bestProducts.map((product) => product._id);

    const productNamesMap = await product
      .find({ _id: { $in: productIds } })
      .select("_id name")
      .then((products) => {
        const map = new Map();
        products.forEach((product) => {
          map.set(product._id.toString(), product.name);
        });
        return map;
      });

    const bestProductsData = bestProducts.map((product) => ({
      name: productNamesMap.get(product._id.toString()),
      totalOrders: product.totalOrders,
    }));

    res.render("viewBestProducts", { message, bestProducts: bestProductsData });
  } catch (error) {
    console.error("Error fetching best products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewBestCategory = async (req, res) => {
  try {
    const message = req.session.message || "";
    req.session.message = null;

    const bestCategories = await order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.orderStatus": "delivered" } },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      { $group: { _id: "$productInfo.category", totalOrders: { $sum: 1 } } },
      { $sort: { totalOrders: -1 } },
      { $limit: 10 },
    ]);

    const bestCategoriesData = await Promise.all(
      bestCategories.map(async (category) => {
        const categoryData = await product
          .findOne({ category: category._id })
          .select("category name");
        return {
          ...categoryData.toObject(),
          totalOrders: category.totalOrders,
        };
      })
    );

    res.render("viewBestCategory", {
      message,
      bestCategories: bestCategoriesData,
    });
  } catch (error) {
    console.error("Error fetching best categories:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////

module.exports = {
  loadLogin,
  logout,
  home,
  verifyLogin,
  viewUser,
  blockUser,
  addUser,
  viewProducts,
  addProduct,
  editProduct,
  listProduct,
  viewCategory,
  addCategory,
  listCategory,
  editCategory,
  viewOrders,
  orderStatus,
  viewCoupon,
  addCoupon,
  editCoupon,
  listCoupon,
  salesReport,
  deleteImage,
  viewBestProducts,
  viewBestCategory,
};
