const user = require("../models/userModel");
const product = require("../models/productModel");
const cart = require("../models/cartModel");
const banner = require("../models/bannerModel");
const category = require("../models/categoryModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const randomstring = require("randomstring");

const generatedOTP = randomstring.generate({
  length: 6,
  charset: "numeric",
});

//....Bcrypt...\\
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

///////////////////////////userLogin//////////////////////////////////////////////////

const userLogin = (req, res) => {
  try {
    res.render("userLogin", { message: "", userData: "" });
  } catch (err) {
    console.log(err.message);
  }
};

const submitUserLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const userData = await user.findOne({ email: email });
    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        if (userData.is_block === 0) {
          req.session.userID = userData._id;
          res.redirect("/");
        } else {
          res.render("userLogin", { message: "blocked", userData: "" });
        }
      } else {
        res.render("userLogin", {
          message: "Entered password is wrong",
          userData: "",
        });
      }
    } else {
      res.render("userLogin", { message: "not exist", userData: "" });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const userLogout = (req, res) => {
  try {
    req.session.userID = null;
    res.redirect("/");
  } catch (err) {
    console.log(err.message);
  }
};

const forgetPassword = (req, res) => {
  try {
    res.render("forgetPassword", {
      message: "",
      validate: 0,
      otpExpireTime,
      userData: "",
    });
  } catch (err) {
    console.log(err.message);
  }
};

const verifyForgetPassword = async (req, res) => {
  try {
    if (req.body.otp) {
      if (req.body.otp === generatedOTP) {
        const spassword = await securePassword(req.body.password);
        await user.updateOne(
          { email: req.body.email },
          { $set: { password: spassword } }
        );
        res.render("forgetPassword", {
          validate: "otp validated",
          otpExpireTime,
          userData: "",
        });
      } else {
        res.render("forgetPassword", {
          message: "OTP is incorrect",
          validate: "email validated",
          otpExpireTime,
          usermail: req.body.email,
          userData: "",
        });
      }
    } else {
      const userData = await user.findOne({ email: req.body.email });
      if (userData) {
        const transporter = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: req.body.email,
          subject: "Password reset OTP",
          text: `Your OTP for resetting password is: ${generatedOTP}`,
        };
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
            res.status(500).send("Failed to send OTP");
          } else {
            console.log("Email sent: " + info.response);
            res.status(200).send("OTP sent successfully");
          }
        });
        otpExpireTime = new Date(Date.now() + 0.5 * 60 * 1000);
        res.render("forgetPassword", {
          message: "",
          validate: "email validated",
          otpExpireTime,
          usermail: req.body.email,
          userData: "",
        });
      } else {
        res.render("forgetPassword", {
          message: "Could not find the email ID ",
          validate: 0,
          otpExpireTime,
          userData: "",
        });
      }
    }
  } catch (err) {
    console.log(err.message);
  }
};

///////////////////////////////////////uerSignUp///////////////////////////////////////////////

var otpExpireTime;
const userSignup = (req, res) => {
  try {
    res.render("userSignup", { userData: "", otpExpireTime });
  } catch (err) {
    console.log(err.message);
  }
};

const submitUserSignup = async (req, res) => {
  try {
    console.log(req.body);
    if (req.body.otp) {
      if (req.body.otp == generatedOTP) {
        const { name, email, mobile, password } = req.session.tempUser;
        const spassword = await securePassword(password);
        var referralRewardForReferee = 0;

        let referralCode = req.session.tempUser.referralCode;

        if (!referralCode) {
          referralCode = generateRandomReferralCode();
        } else if (referralCode) {
          const referrer = await user.findOne({ referralCode: referralCode });
          if (referrer) {
            const referralRewardForReferrer = 50;
            referralRewardForReferee = 100;

            referrer.wallet += referralRewardForReferrer;
            await referrer.save();
          }
        }

        const addUser = new user({
          name: name,
          email: email,
          mobile: mobile,
          password: spassword,
          referralCode: referralCode,
        });

        const userData = await addUser.save();

        if (referralCode) {
          userData.wallet += referralRewardForReferee;
          await userData.save();
        }

        req.session.tempUser = "";
        req.session.userID = userData._id;
        res.json({ message: "Signup success" });
      } else {
        res.json({ message: "Entered otp is incorrect" });
      }
    } else {
      const [usermail, usermobile] = await Promise.all([
        user.findOne({ email: req.body.email }),
        user.findOne({ mobile: req.body.mobile }),
      ]);
      if (!usermail) {
        if (!usermobile) {
          req.session.tempUser = req.body;
          const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD,
            },
          });
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: req.body.email,
            subject: "Login OTP",
            text: `Your OTP for Signup is: ${generatedOTP}`,
          };
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.log(error);
              res.status(500).send("Failed to send OTP");
            } else {
              console.log("Email sent: " + info.response);
              res.status(200).send("OTP sent successfully");
            }
          });
          otpExpireTime = new Date(Date.now() + 0.5 * 60 * 1000);
          res.json({ message: "Signup success", otpExpireTime });
        } else {
          res.json({ message: "Entered Mobile number already exist" });
        }
      } else {
        res.json({ message: "Entered mail ID already exist" });
      }
    }
  } catch (error) {
    console.log(error.message); 
  }
};

function generateRandomReferralCode() {
  const length = 6; 
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let referralCode = "";
  for (let i = 0; i < length; i++) {
    referralCode += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return referralCode;
}

////////////////////////////////////////////User-home/////////////////////////////////////////////////

const home = async (req, res) => {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const bannerData = await banner.find({});
    const totalProducts = await product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    const [userData, productData] = await Promise.all([
      user.findOne({ _id: req.session.userID }),
      product.find({}).skip(skip).limit(limit),
    ]);

    res.render("home", { userData, productData, totalPages, bannerData });
  } catch (err) {
    console.log(err.message);
  }
};


const productDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    const userId = req.session.userID;
    const [userData, productData] = await Promise.all([
      user.findOne({ _id: userId }),
      product.findOne({ _id: productId }),
    ]);
    const cartItem = await cart.findOne({
      userId: userId,
      items: { $elemMatch: { product: productId } },
    });
    res.render("productDetails", { userData, productData, cartItem });
  } catch (err) {
    console.log(err.message);
    return res.status(400).send('Invalid product ID');
  }
};


const allProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const priceRange = req.query.priceRange;
    const sort = req.query.sort;

    let query = {};

    if (search || priceRange) {
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
        ];
      }

      if (priceRange) {
        const priceRangeArray = priceRange.split("-");
        const minPrice = parseInt(priceRangeArray[0]);
        const maxPrice = parseInt(priceRangeArray[1]); 

        query.price = { $gte: minPrice, $lte: maxPrice };
      }
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    const totalProductsCount = await product.countDocuments(query);
    const totalPages = Math.ceil(totalProductsCount / limit);

    let productQuery = product.find(query);

    if (sort === "highToLow") {
      productQuery = productQuery.sort({ price: -1 });
    } else if (sort === "lowToHigh") {
      productQuery = productQuery.sort({ price: 1 });
    }

    const categoriesNames = await category.find({});
    const [userData, productData] = await Promise.all([
      user.findOne({ _id: req.session.userID }),
      productQuery.skip(skip).limit(limit),
    ]);

    return res.render("allProducts", {
      userData,
      productData,
      totalPages,
      categoriesNames,
    });

  } catch (err) {
    console.log(err.message);
    res.status(500).send("Internal Server Error");
  }
};



const profile = async (req, res) => {
  const userId = req.session.userID;
  const userData = await user.findOne({ _id: userId });
  res.render("userProfile", { userData });
};

const profileEdit = async (req, res) => {
  try {
    const userId = req.session.userID;
    if (req.body.name) {
      const userData = await user.findOneAndUpdate(
        { _id: userId },
        { $set: { name: req.body.name } },
        { new: true }
      );
      res.json({ name: userData.name });
    } else if (req.body.password) {
      const { password, newPass } = req.body;
      const userData = await user.findOne({ _id: userId });
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        const spassword = await securePassword(newPass);
        await user.findOneAndUpdate(
          { _id: userId },
          { $set: { password: spassword } }
        );
        res.json({ message: "Success" });
      } else {
        res.json({ message: "failed" });
      }
    }
  } catch (err) {
    console.log(err.message);
  }
};

const address = async (req, res) => {
  const userId = req.session.userID;
  const userData = await user.findOne({ _id: userId });
  res.render("userAddress", { userData });
};

const saveAddress = async (req, res) => {
  try {
    const id = req.session.userID;
    if (req.body.delete) {
      const index = req.body.delete;
      await user.findOneAndUpdate(
        { _id: id },
        { $unset: { [`address.${index}`]: "" } },
        { new: true }
      );
      const userData = await user.findOneAndUpdate(
        { _id: id },
        { $pull: { address: null } },
        { new: true }
      );
      res.json({ addresses: userData.address });
    } else if (req.body.edit) {
      const index = req.body.edit;
      const { name, locality, city, house, landmark, state, pin, mobile } =
        req.body;
      const address = {
        name: name,
        locality: locality,
        city: city,
        house: house,
        landmark: landmark,
        state: state,
        pin: pin,
        mobile: mobile,
      };
      userData = await user.findOneAndUpdate(
        { _id: id },
        { $set: { [`address.${index}`]: address } },
        { new: true }
      );
      res.json({ addresses: userData.address });
    } else {
      const { name, locality, city, house, landmark, state, pin, mobile } =
        req.body;
      const address = {
        name: name,
        locality: locality,
        city: city,
        house: house,
        landmark: landmark,
        state: state,
        pin: pin,
        mobile: mobile,
      };
      userData = await user.findOneAndUpdate(
        { _id: id },
        { $push: { address: address } },
        { new: true }
      );
      res.json({ addresses: userData.address });
    }
  } catch (err) {
    console.log(err.message);
  }
};

////////////////////////////////wishlist///////////////////////////////////

const wishlist = async (req, res) => {
  try {
    const userId = req.session.userID;
    const userData = await user.findOne({ _id: userId });
    const wishlist = await user.findOne({ _id: userId }).populate("wishlist");
    res.render("userWishlist", { userData, wishlist });
  } catch (err) {
    console.log(err);
  }
};

const addtoWishlist = async (req, res) => {
  try {
    const userId = req.session.userID;
    const productId = req.params.id;

    const users = await user.findById(userId);
    if (!users) {
      console.log("User not found");
      return res.status(404).json({ error: "User not found" });
    }

    users.wishlist.push(productId);
    await users.save();
    console.log("Wishlist updated successfully");
    res.status(200).json({ message: "Wishlist updated successfully" });
  } catch (err) {
    console.error("Error updating wishlist:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const removeWishlist = async (req, res) => {
  try {
    const userId = req.session.userID;
    const productId = req.params.id;
    const users = await user.findById(userId);
    users.wishlist.pull(productId);
    await users.save();
    res.redirect("/wishlist");
  } catch (err) {
    console.log(err);
  }
};

///////////////////////////////////Wallet//////////////////////////////////////////

const wallet = async (req, res) => {
  const userId = req.session.userID;
  const userData = await user.findOne({ _id: userId });
  res.render("userWallet", { userData });
};

/////////////////////////////////////categories////////////////////////////

const categories = async (req, res) => {
  try {
    const userId = req.session.userID;
    const userData = await user.findOne({ _id: userId });

    let categories = await category.find({}).populate("items.product").exec();

    for (const category of categories) {
      const products = await product
        .find({ category: category.name })
        .limit(4)
        .exec();

      category.items = products.map((product) => ({
        product: {
          _id: product._id,
          name: product.name,
          image: product.image,
          price: product.price,
          discountedPrice: product.discountedPrice,
        },
      }));

      await category.save();
    }

    res.render("categories", { userData, categories });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

////////////////////////////////////////////////////////////////////////////////////////

module.exports = {
  userLogin,
  userSignup,
  home,
  submitUserLogin,
  submitUserSignup,
  userLogout,
  productDetails,
  allProducts,
  forgetPassword,
  verifyForgetPassword,
  profile,
  profileEdit,
  address,
  saveAddress,
  wishlist,
  addtoWishlist,
  removeWishlist,
  wallet,
  categories,
};
