const isLogin = (req,res,next)=>{
    try{
        if(req.session.userID){
            next()
        }
        else{
            res.redirect("/userLogin")
        }
    }catch(err){
        console.log(err.message)
    }
}

const isLogout = async(req,res,next)=>{
    try{

        if(req.session.userID){
            res.redirect('/');
        }else{
        next();
        }
    } catch (error){
        console.log(error.message);
    }
}


module.exports = {
    isLogin,
    isLogout
}
