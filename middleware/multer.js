const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/images');
  },
  filename: (req, file, cb) => {
    const name = Date.now() + "-" + file.originalname;
    cb(null, name);
  }
});

const upload = multer({ storage: storage });

const bannerImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/banner_images');
  },
  filename: (req, file, cb) => {
    const name = Date.now() + "-" + file.originalname;
    cb(null, name);
  }
});

const bannerImageUpload = multer({ storage: bannerImageStorage });

module.exports = { upload: upload, bannerImageUpload: bannerImageUpload };
