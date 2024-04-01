const express = require("express");
const admin_route = express();
admin_route.set("views", "./Views/Admin");
const { upload, bannerImageUpload } = require("../middleware/multer");
const adminController = require("../controllers/adminController");
const bannerController = require("../controllers/bannerController");
const adminAuth = require("../middleware/adminAuth");
const path = require("path");

admin_route.get("/login", adminAuth.isLogout, adminController.loadLogin);
admin_route.post("/login", adminController.verifyLogin);
admin_route.get('/logout',adminController.logout)
admin_route.get("/", adminAuth.isLogin, adminController.home);



admin_route.get("/viewProducts", adminController.viewProducts);
admin_route.post("/addProduct", upload.array('image', 5), adminController.addProduct);
admin_route.post( "/editProduct/:id", upload.array('image', 5),adminController.editProduct);
admin_route.post("/deleteImage/:id", adminController.deleteImage);
admin_route.get("/listProduct/:id",adminAuth.isLogin,adminController.listProduct);


admin_route.get("/viewUser", adminAuth.isLogin, adminController.viewUser);
admin_route.post("/addUser", adminAuth.isLogin, adminController.addUser);
admin_route.get("/blockUser/:id", adminAuth.isLogin, adminController.blockUser);


admin_route.get("/viewCategory",adminAuth.isLogin, adminController.viewCategory);
admin_route.post("/addCategory",adminAuth.isLogin,adminController.addCategory);
admin_route.get("/listCategory/:id",adminAuth.isLogin,adminController.listCategory);
admin_route.post("/editCategory/:id",adminAuth.isLogin,adminController.editCategory);


admin_route.get('/viewOrders', adminController.viewOrders);
admin_route.post('/orderStatus',adminController.orderStatus);



admin_route.get('/viewCoupons',adminAuth.isLogin, adminController.viewCoupon)
admin_route.post('/addCoupon',adminAuth.isLogin,adminController.addCoupon)
admin_route.post('/editCoupon/:id',adminAuth.isLogin,adminController.editCoupon)
admin_route.get('/listCoupon/:id',adminAuth.isLogin,adminController.listCoupon)

admin_route.get('/viewBanner',adminAuth.isLogin,bannerController.viewBanner)
admin_route.post("/addBanner", bannerImageUpload.single('bannerImage'), bannerController.addBanner);
admin_route.post("/editBanner/:id",bannerImageUpload.single('bannerImage'),bannerController.editBanner)
admin_route.get("/listBanner/:id",adminAuth.isLogin,bannerController.listBanner)


admin_route.get("/viewSalesReport",adminAuth.isLogin, adminController.salesReport)

admin_route.get("/viewBestProducts",adminAuth.isLogin, adminController.viewBestProducts)
admin_route.get("/viewBestCategory",adminAuth.isLogin, adminController.viewBestCategory)


module.exports = admin_route;