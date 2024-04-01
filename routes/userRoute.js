const express = require("express");
const multer = require('multer')
const upload = multer()
const user_route = express();
user_route.set("views", "./Views/Users");
const userController = require("../controllers/userController");
const cartController = require('../controllers/cartController')
const orderController = require('../controllers/orderController')
const auth = require("../middleware/auth")


user_route.get("/userSignup",userController.userSignup)
user_route.post("/userSignup",upload.none(),userController.submitUserSignup)


user_route.get('/userLogin',auth.isLogout,userController.userLogin)
user_route.post("/userLogin",userController.submitUserLogin);
user_route.get("/userLogout",userController.userLogout)
user_route.get("/forgetPassword",userController.forgetPassword)
user_route.post("/forgetPassword",userController.verifyForgetPassword)


user_route.get( "/", userController.home)
user_route.get("/productDetails/:id",userController.productDetails)
user_route.get("/products", userController.allProducts)
user_route.get("/categories",userController.categories)


user_route.get("/addToCart/:id",auth.isLogin,cartController.addToCart)
user_route.get('/cart',auth.isLogin,cartController.goToCart)
user_route.post("/incrementQuantity/:id",auth.isLogin,cartController.incrementQuantity)
user_route.post("/decreasQuantity/:id",auth.isLogin,cartController.decreasQuantity)
user_route.post("/removeItem/:id",auth.isLogin,cartController.removeItem)
user_route.post("/checkout",auth.isLogin,cartController.checkout)
user_route.post("/placeOrder",auth.isLogin,upload.none(),cartController.placeOrder)
user_route.post("/verifyPayment",auth.isLogin,cartController.verifyPayment)


user_route.get("/orders",auth.isLogin,upload.none(),orderController.orders)
user_route.get("/orderDetails",auth.isLogin,orderController.orderDetails)
user_route.post("/orderStatus",auth.isLogin,orderController.orderStatus)
user_route.get("/downloadInvoice",auth.isLogin,orderController.downloadInvoice)


user_route.get('/wishlist',auth.isLogin,userController.wishlist)
user_route.post('/addtoWishlist/:id',auth.isLogin,userController.addtoWishlist)
user_route.post('/removeWishlist/:id',auth.isLogin,upload.none(),userController.removeWishlist)


user_route.get("/profile",auth.isLogin,userController.profile)
user_route.post("/profile",auth.isLogin,upload.none(),userController.profileEdit)
user_route.get("/address",auth.isLogin,userController.address)
user_route.post("/saveAddress",auth.isLogin,upload.none(),userController.saveAddress)
user_route.get("/wallet",auth.isLogin,userController.wallet)


module.exports = user_route;