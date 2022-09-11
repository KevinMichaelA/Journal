require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy=require("passport-google-oauth20").Strategy;
const findOrCreate=require("mongoose-findorcreate");

let email="";
const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.set("view engine", "ejs");

app.use(session({
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/journalDB", {
  useNewUrlParser: true
});
const journalSchema = new mongoose.Schema({
  title: String,
  date: String,
  content: String,
  email:String,
  password:String,
  googleId:String
});

journalSchema.plugin(passportLocalMongoose);
journalSchema.plugin(findOrCreate);
const Journal = mongoose.model("Journal", journalSchema);
passport.use(Journal.createStrategy());

passport.serializeUser(function(user,done){
  done(null,user.id);
});

passport.deserializeUser(function(id,done){
  Journal.findById(id,function(err,user){
    done(err,user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/journal"
  },
  function(accessToken, refreshToken, profile, cb) {
    Journal.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/auth/google/ticket",
    passport.authenticate("google",{scope:["profile"]})
);

app.get("/auth/google/journal",
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect journal.
    res.redirect('/journal');
  });


app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/compose", function(req, res) {
  if(req.isAuthenticated()){
    res.render("compose");
  }else{
    res.redirect("/login");
  }
});

app.post("/compose", function(req, res) {

  let date=new Date().getDate();
  let month = (new Date().getMonth());
  const year = new Date().getFullYear();
  let fullDate="";
  month=Number(month)+1;
  if(month<=9){
    month=String(month);
    fullDate = year +"-" + "0"+month + "-"+date;
  }else{
    month=string(month);
    fullDate=year+"-"+month+"-"+date;
  }
  Journal.findById(req.user.id,function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        const entry = new Journal({
          email:email,
          password:req.body.password,
          title: req.body.postTitle,
          date: fullDate,
          content: req.body.postBody
        });
        entry.save();
        res.redirect("/journal");
      }
    }
  });
});

app.get("/fail",function(req,res){
  if(req.isAuthenticated()){
    res.render("fail");
  }
});

app.get("/show", function(req, res) {
  if(req.isAuthenticated()){
    Journal.find({date: date,email:email}, function(err, post) {
      console.log(post);
      if (err) {
        console.log(err);
      }if(post !=null){
          res.render("display", {
            title: post.title,
            date: post.date,
            content: post.content,
            post:post
          });
        }else{
            res.redirect("fail");
      }
    });
    };
});

app.post("/journal", function(req, res) {
  if (req.body.writeBtn === "Write") {
    res.redirect("/compose");
  } else {
    if (req.body.readButton === "readBtn") {
      date =String(req.body.datePick);
      res.redirect("/show");
    }
  }
});

app.get("/journal",function(req,res){
  if(req.isAuthenticated()){
    res.render("selector");
  }else{
    res.redirect("/login");
  }
});

app.get("/logout",function(req,res){
  req.logout(function(err){
    if(err){
      console.log(err);
    }else{
        res.redirect("/");
    }
  });
});

app.post("/register",function(req,res){
  email=req.body.username;
  Journal.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/journal");
      });
    }
  });
});

app.post("/login",function(req,res){
  const user=new Journal({
    username:req.body.username,
    password:req.body.password
  });
  email=req.body.username;
  req.login(user,function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/journal");
      });
    }
  });
});

app.listen(3000, function() {
  console.log("server started running on port 3000");
});
