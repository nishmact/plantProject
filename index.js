const express = require('express')
const app = express()
const session = require('express-session')
const path = require('path')
const nocache = require('nocache')
const bodyParser = require('body-parser')
const connectDB = require('./config/dbConnection') 
connectDB()

require('dotenv').config();
app.set('view engine','ejs')
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'session secret key',
    resave: false,
    saveUninitialized: true,
    cookie:{
        maxAge: 1000 * 60 * 24 * 10
    }
  }));
  app.use(nocache())

  app.use(express.static(path.join(__dirname, "public")))


////////////////////////////for user////////////////////////////////////////////

const userRoute = require('./routes/userRoute')
app.use('/',userRoute)

///////////////////////////for admin//////////////////////////////////
const adminRoute = require('./routes/adminRoute')
app.use('/admin',adminRoute)


const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);




app.listen(5000)

