const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({       
    name:{
        type:String,
        required:true
    },
    category:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    quantity:{
        type:Number,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    image:[{
        type:String,
        required:true
    }],
    status:{
        type:Number,
        default:0
    },
    deliveryTime:{
        type:Number,
        required:true
    },
    productOffer: {
        type: Number,
        default: 0
    },
    totalOffer: {
        type: Number,
        default: 0
    },
    discountedPrice: {
        type:Number,
        required:true
    }
    });
    
    
    module.exports = mongoose.model('product',productSchema);