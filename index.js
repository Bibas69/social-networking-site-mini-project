const express = require("express");
const app = express();

const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const crypto = require("crypto");

const userModel = require("./models/user");
const postModel = require("./models/post");
const user = require("./models/user");

app.set("view engine", "ejs");
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, "public")));

const isLoggedIn = (req, res, next) => {
    if(req.cookies.token === "" || typeof req.cookies.token === "undefined"){
        return res.redirect("/login");
    }
    let data = jwt.verify(req.cookies.token, "secret")
    req.user = data;
    next();
}

// app.get("/test", (req, res) => {
//     res.render("test");
// })

app.post("/uploadtest", (req, res) => {
    console.log(req.file);
})

app.get("/", (req, res) => {
    res.render("index");
})

app.post("/register", async (req, res) => {
    const {username, name, age, email, password} = req.body;
    const user = await userModel.findOne({email});
    if(user){
        res.render("index", {err:"Email already exists. Try logging in?"});
    }
    else{
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(password, salt, async (err, hash) => {
                if(err) {
                    console.log(err);
                }
                else{
                    let user = await userModel.create({
                        username,
                        name,
                        age,
                        email,
                        password:hash
                    });
                    let token = jwt.sign({ email: user.email, userid: user._id }, 'secret');
                    res.cookie("token", token);
                    res.render("profile", {user});
                }
            });
        });
    }
})

app.get("/login", (req, res) => {
    res.render("login");
})

app.post("/login", async (req, res) => {
    const {email, password} = req.body;
    let user = await userModel.findOne({email});
    if(!user){
        return res.render("login", {err: "Invalid email or password!"});
    }
    bcrypt.compare(password, user.password, function(err, result) {
        if(err) return res.send("Some error occured....");
        if(result){
            let token = jwt.sign({ email: user.email, userid: user._id }, 'secret');
            res.cookie("token", token);
            res.redirect("/profile");
        }
        else{
            res.render("login", {err:"Invalid email or password!"});
        }
    });
})

app.get("/logout", (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
})

app.get("/profile", isLoggedIn, async (req, res) => {
    let email = req.user.email;
    let user = await userModel.findOne({email}).populate("posts");
    res.render("profile", {user});
})

app.post("/createPost", async (req, res) => {
    const {content} = req.body;
    let userdata = jwt.verify(req.cookies.token, "secret");
    let userid = userdata.userid;
    const post = await postModel.create({
        content,
        user:userid
    });
    const user = await userModel.findOne({_id:userid});
    user.posts.push(post._id);
    user.save();
    res.redirect("/profile");
})

app.get("/like/:postid", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id : req.params.postid});
    const userdata = jwt.verify(req.cookies.token, "secret");
    if(post.likes.includes(userdata.userid)){
        post.likes = post.likes.filter(id => id!=userdata.userid);
        post.save();
    }else{
        post.likes.push(userdata.userid);
        post.save();
    }
    res.redirect("/profile");
})

app.get("/like/public/:postid", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id : req.params.postid});
    const userdata = jwt.verify(req.cookies.token, "secret");
    if(post.likes.includes(userdata.userid)){
        post.likes = post.likes.filter(id => id!=userdata.userid);
        post.save();
    }else{
        post.likes.push(userdata.userid);
        post.save();
    }
    res.redirect("/feed");
})

app.get("/edit/:postid", isLoggedIn,async (req, res) => {
    let userdata = jwt.verify(req.cookies.token, "secret");
    let user = await userModel.findOne({_id : userdata.userid});
    let post = await postModel.findOne({_id : req.params.postid});
    res.render("edit", {user, post});
})

app.post("/editpost/:postid", async (req, res) => {
    const {content} = req.body;
    await postModel.findOneAndUpdate({_id : req.params.postid}, {content}, {new:true});
    res.redirect("/profile");
})

app.get("/delete/:postid", isLoggedIn,async (req, res) => {
    await postModel.findOneAndDelete({_id : req.params.postid});
    res.redirect("/profile");
})

app.get("/upload", isLoggedIn, async (req, res) => {
    let userdata = jwt.verify(req.cookies.token, "secret");
    let user = await userModel.findOne({_id : userdata.userid});
    res.render("upload", {user});
})

app.post("/upload", async (req, res) => {
    const {profile_img} = req.body;
    let userdata = jwt.verify(req.cookies.token, "secret");
    let user = await userModel.findOneAndUpdate({_id : userdata.userid}, {profile_img}, {new:true}); 
    res.redirect("/profile");
})

app.get("/feed", isLoggedIn, async (req, res) => {
    let posts = await postModel.find().populate("user");
    let userdata = jwt.verify(req.cookies.token, "secret");
    let user = await userModel.findOne({_id : userdata.userid});
    res.render("feed", {posts, user});
})


app.listen(3000, (err) => {
    err ? console.log(err) : console.log("Server started");
})