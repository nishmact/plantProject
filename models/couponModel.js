const mongoose = require("mongoose")
const couponSchema = new mongoose.Schema({
    couponName:{
        type:String,
        required: true
    },
    minAmount:{
        type:Number,
        required:true
    },
    maxDiscount:{
        type:Number,
        required:true
    },
    expireDate:{
        type:Date,
        required: true
    },
    users:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'
    }],
    status:{
        type:Number,
        default:0
    },
    percentage:{
        type:Number,
        required:true
    },

})

module.exports=mongoose.model('coupon',couponSchema)