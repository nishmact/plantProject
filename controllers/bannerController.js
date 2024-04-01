const banner = require("../models/bannerModel");

const viewBanner = async (req, res) => {
  try {
    const message = req.session.message || "";
    req.session.message = null;

    const banners = await banner.find({});
    res.render("viewBanner", { message, banners });
  } catch (err) {
    console.log(err.message);
  }
};

const addBanner = async (req, res) => {
  try {

      const newBanner = new banner({
          title: req.body.title,
          bannerImage: "/banner_images/" + req.file.filename,
      });

      const bannerData = await newBanner.save();
      if (bannerData) {
        req.session.message = "Banner added successfully";
        res.redirect("/admin/viewBanner");
      } else {
        req.session.message = "Banners adding failed";
        res.redirect("/admin/viewBanner");
      }
  } catch (error) {
      console.error("Error adding banner:", error);
      req.session.message = "Banner adding failed";
      res.redirect("/admin/viewBanner");
  }
};

const editBanner = async (req, res) => {
  try {
    const updateFields = {
      title: req.body.title,
    };

    if (req.file) {
      updateFields.bannerImage = "/banner_images/" + req.file.filename;
    }

    const updatedBanner = await banner.findOneAndUpdate(
      { _id: req.params.id },
      { $set: updateFields },
      { new: true }
    );

    if (updatedBanner) {
      req.session.message = "Banner editing successfully";
    } else {
      req.session.message = "Failed to edit banner";
    }

    res.redirect("/admin/viewBanner");
  } catch (err) {
    console.log(err.message);
    req.session.message = "Error editing banner";
    res.redirect("/admin/viewBanner");
  }
};

const listBanner = async (req,res) =>{
    try {
      const bannerId = req.params.id;
      const bannerData = await banner.findOne({ _id: bannerId });
      if (bannerData.status === 0) {
        await banner.updateOne({ _id: bannerId }, { $set: { status: 1 } });
        req.session.message = "Banner unlisted";
      } else {
        await banner.updateOne({ _id: bannerId }, { $set: { status: 0 } });
        req.session.message = "Banner listed";
      }
      res.redirect("/admin/viewBanner");
    } catch (err) {
      console.log(err.meassge);
    }
  
}


module.exports = {
  viewBanner,
  addBanner,
  editBanner,
  listBanner
};
