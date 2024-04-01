const mongoose = require('mongoose')
const bannerSchema = new mongoose.Schema ({
    title: {
        type: String,
        required: true,
      },
      status: {
        type: Number,
        default: 0
      },
      bannerImage: {
        type: String,
        required: true
      }
});

module.exports = mongoose.model("banner",bannerSchema)