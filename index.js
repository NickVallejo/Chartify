require("dotenv").config()
const express = require("express")
const root = express()
const mongoose = require("mongoose")
const path = require("path")
const passport = require("passport")
const session = require("express-session")
const ytSearch = require('youtube-search')
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest
const expressLayouts = require('express-ejs-layouts')
let sessionArray = []
let added_chart
const lettersNumbers = "/^[0-9a-zA-Z]+$/"

//Imported Routes
const login_route = require("./routes/login")
const reg_route = require("./routes/register")
const logout_route = require("./routes/logout")
const profile_route = require("./routes/profileRoute")

//Imported Functions
require('./js-serverside/albumSuggs.js')
require('./js-serverside/artistRefresh.js')
require('./js-serverside/chartUpdate.js')
require('./js-serverside/chartSave.js')
require('./js-serverside/chartDelete.js')

const TWO_HOURS = 1000 * 60 * 60

const {
  PORT = 3000,
  SESS_AGE = TWO_HOURS,
  NODE_ENV = "development",
  SESS_NAME = "sid",
  SESS_SECRET = "diplodocus",
} = process.env

root.use(expressLayouts)
root.set('view engine', 'ejs')
root.use(express.json())
root.use(express.urlencoded({ extended: true }))

const Chart = require("./models/chart_model")
const User = require("./models/user_model")

const MongoStore = require("connect-mongo")(session)

const port = process.env.PORT || 4000

root.listen(port, (err) => {
  try {
    console.log("Connected to port " + port)
  } catch (err) {
    throw err
  }
})

//! CREATES CONNECTION TO MONGO DATABASE USING MONGOOSE
const db_connect = mongoose.createConnection(
  process.env.db_connect,
  { useNewUrlParser: true, useUnifiedTopology: true },
  () => {
    try {
      console.log("Conntected to database...")
    } catch (err) {
      console.log(err)
    }
  }
)

//! CREATES A STORAGE COLLECTION FOR SESSIONS USING THE DATABASE CONNECTION ESTABLISHED ABOVE
const sessionStore = new MongoStore({
  mongooseConnection: db_connect,
  collection: "newest-storage",
})

//! ESTABLISHES THE SESSION MIDDLEWARE THAT PLANTS A SESSION COOKIE ON THE BRWOSER & ADDS A NEW ENTRY TO SESSION STORAGE ON THE SERVER
root.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
    store: sessionStore, //uses the session storage established with express-session and connect-mongo modules
    strict: false,
    cookie: {
      maxAge: SESS_AGE,
      sameSite: true,
      secure: false,
    },
  })
)

//! ROUTES ESTABLISHED FOR LOGIN, LOGOUT, AND REGISTER
root.use("/login", login_route)
root.use("/logout", logout_route)
root.use("/register", reg_route)
root.use("/profile", profile_route)

//! SENDS USER TO HOME PAGE
root.get("/", (req, res, next) => {
  res.sendFile(path.join(__dirname, "pages/home.html"))
})

//! SENDS USER TO DASHBOARD AFTER AUTHCHECK AND REFRESHING ARTISTS
root.get("/dashboard", authCheck, artistRefresh, (req, res, next) => {
  console.log("album suggs loaded? " + req.session.suggsLoaded)
  res.sendFile(path.join(__dirname, "pages/topsters.html"))
})

//! CHECKS TO SEE IF USER IS LOGGED IN BEFORE GRANTING ACCESS TO DASHBOARD
function authCheck(req, res, next) {
  if (req.session.userId && req.path == "/dashboard") {
    req.session.suggsLoaded = false //sets suggsloaded to false so site knows to call albumSuggs again on refresh
    next()
  } else if (req.session.userId) {
    next()
  } else {
    res.redirect("/login")
  }
}

//! (ON APP EXECUTE) - GATHER ALL SUGGESTED ALBUMS AND SEND THEM TO FRONT END
root.get("/similar-artists", albumSuggs)

//! (ON APP EXECUTE) - FIND ALL USER CHARTS AND SEND THEM TO FRONT END
root.get("/my-lists", async (req, res, next) => {
  await User.findById(req.session.userId, (err, user) => {
    if (user) {
      res.send(user.musicCharts)
    }
  })
})

//! UPDATES A CHART AND THEN REFRESHES LIST OF ARTIST NAMES
root.post("/update", chartUpdate, artistRefresh, (req, res, next) => {
  console.log("the newset list of artists", req.session.artistNames)
  res.end()
})

//! SAVES A NEW CHART AND THEN REFRESHES LIST OF ARTIST NAMES
root.post("/", chartSave, artistRefresh, (req, res, next) => {
  console.log("the newset list of artists", req.session.artistNames)
  res.end()
})

//! DELETES A CHART AND THEN REFRESHES LIST OF ARTIST NAMES
root.post("/list-delete", chartDelete, artistRefresh, (req, res, next) => {
  console.log("Heres what we sent:" + res.locals.indexOfChart)
  res.end(res.locals.indexOfChart) //sends the index of the chart that needs to be deleted over to front-end
})

root.get("/yt-listen", (req, res) => {

  const {artist, album} = req.query

  const opts = {
    maxResults: 10,
    key: process.env.API_KEY
  }

  ytSearch(`${artist} - ${album}`, opts, (err, results)=>{
    if(err) return console.log(err)


    else{
      for(i = 0; i < 10; i++){
          if(!results[i].link.includes('playlist?')){
            res.end(results[i].link)
            break;
          } else{
            continue;
          }
        }
      }
})
})

//! FIND A USER IN THE DB THAT MATCHES THE URL PATH
//! 404 IF NO USER IS FOUND, OTHERWISE SERVE THEIR PROFILE PAGE
//! CHECKS IF THE PERSON ACCESSING THE PAGE IS VISITING ANOTHER USER'S PROFILE OR THEIR OWN
root.get('/:username', async (req,res) => {

  const username = req.params.username

  await User.findOne({username}, (err, user) => {
    if (user) {
      console.log(user.username)
      userFound(user.username)
    } else{
      console.log('USER NOT FOUND')
      noUserFound()
    }
  })


  //! LEADS TO A VIEW OF A CERTAIN CHART
  //! MUST RENDER VIEW.HTML WITH CERTAIN OBJECT DATA USING EJS
  root.get('/:username/chart/:chartname', async (req, res) => {
    const {username, chartname} = req.params
    
    await User.findOne({username}, async (err, user) => {
      if(user){
        user.musicCharts.forEach(chart => {
          if(chart.title == chartname){
            User.findById(req.session.userId, async (err, user) => {
              if(user.username == username){
                res.redirect(`/dashboard?chart=${chartname}`)
              } else{
                res.sendFile(path.join(__dirname, "pages/view.html"))
              }
            }) 
          } else{
            res.status(404)
          }
        })
      } else{
        res.status(404)
      }
    })

    res.end();
  })
  

  // BEFORE CHECKING IF ITS YOUR PROFILE, CHECK IF IT EXISTS WITH ANOTHER SEARCH BY req.params
  async function userFound(username) {
    await User.findById(req.session.userId, (err, user) => {
      if(user){
        console.log(user.username)
        if(req.params.username == user.username){
          console.log('This is your profile page');
          getFollowerData(true, username);
        } else{
          console.log('This is NOT your profile page');
          getFollowerData(false, username)
        }
      }
    })
  }

  async function getFollowerData(myProfile, username){
    if(myProfile){
      User.findById(req.session.userId, (err, user) => {
        if(user){
         res.render('my-data', {followers: user.followers.length, following: user.following.length, layout: './layouts/profile'})
        console.log(user.followers.length, 'ME')
        }
      })
    } else{
      User.findOne({username}, (err, user) => {
        console.log(user.followers.length, 'NOT ME')
         res.render('user-data', {followers: user.followers.length, following: user.following.length, layout: './layouts/profile'})
        })
    }
  }

  async function noUserFound(){
    res.status(404)
    res.end();
  }

})

module.exports = root
