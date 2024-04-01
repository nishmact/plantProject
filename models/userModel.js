const mongoose = require("mongoose");

const walletHistorySchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
    }
});

const userSchema = new mongoose.Schema({
   
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    mobile:{
        type:Number,
        required:true
    },
    wishlist:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"product"
     }],
    password:{
        type:String,
        required:true
    },
    is_admin:{
        type:Number,
        default:0
    },
   is_block:{
    type:Number,
    default:0
   },
   address:{
    type:Array
},
  referralCode:{
    type: String,
},
  wallet: {
    type: Number,
    default:0
},
   walletHistory: [walletHistorySchema]
});

module.exports = mongoose.model('user',userSchema);
 