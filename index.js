import express, { response } from "express";
import axios from "axios";
import pg from "pg";
import path from "path";
import {fileURLToPath } from "url";
import dotenv from "dotenv";
import passport from "passport";
import session from "express-session";
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from "bcrypt";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname);

const app = express();

app.use(session({
  secret: 'safaalam',
  resave: false,
  saveUninitialized: false
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));


app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl : {
        rejectUnauthorized: false,
    },
});

db.connect()
  .then(() => console.log("Connected to Neon"))
  .catch(err => console.error("Database connection failed:", err));


app.set('view engine', 'ejs');

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated(); 
  next();
});

function valid(req,res,next){
  if (req.isAuthenticated()) {
    return next();
  }
  else {
    res.redirect("/register");
  }
  }
app.get("/logo", (req,res) => {
  res.redirect("/");
});

app.get("/add_movie",valid, async (req,res) => {
  res.render("index2.ejs", {movie: null, error: null, edit: null, search : true});
}
)

app.get("/edit_movie/:id" ,valid, async (req,res) => {
    const id = req.params.id;
    const dbData = await db.query("select * from user_movie where id = $1", [id]);
    res.render("index2.ejs",{ edit : true , edit_movie :dbData.rows[0] , error:null, movie: null, search : null});
})

app.post("/editMovie",valid, async (req,res) => {
  const {rating,review,id} = req.body;
  await db.query("update user_movie set rating=$1 , review = $2 where id = $3 " , [rating,review,id])
  res.redirect("/");
})


app.post("/search", async (req, res) => {
    const input = req.body.movie;    
    // console.log(input);
     try{
    const API_KEY = process.env.OMDB_API_KEY;
    const response = await axios.get(`https://www.omdbapi.com/?apikey=${API_KEY}&t=${input}`);
   
    if (response.data.Response === "False") {
        res.render("index2.ejs", {
          movie: null, 
          error: response.data.Error,
          search : true,
          edit : null

          });
    } 
   
    else {
        res.render("index2.ejs", {movie: response.data, error: null, edit:null, search : true});
    }
    }
    catch (error) {
      console.log(error);
      res.render("index2.ejs", {movie: null, error:  "Something went wrong. Please try again." });
    }
});
    // await db.query("insert into movies (movie_title, year, photo_link, genre) values ($1, $2, $3, $4)", [response.data.Title, response.data.Year, response.data.Poster, response.data.Genre]);

    // res.redirect("/");

app.post("/saveMovie" ,valid, async (req,res) => {
  const title = req.body.title;
  const rating = req.body.rating;
  const review = req.body.review;
  const {year,genre,poster} = req.body;
  const userId = req.user.id;
  await db.query("insert into user_movie (movie,rating,review,year,genre,photo,user_id) values ($1, $2, $3,$4,$5,$6,$7)" , [title,rating,review,year,genre,poster,userId])
  res.redirect("/my_movie");
})

app.get("/",async (req, res) =>{
    
     const result = await db.query("select * from user_movie order by rating desc");
     res.render("index.ejs", {movies: result.rows});
    })

app.get("/my_movie",valid, async (req, res) =>{
  const userData = await db.query("select * from user_movie where user_id = $1 order by rating desc", [req.user.id]);
  res.render("index.ejs", {movies: userData.rows});
})

app.get("/register", async (req, res) =>{
    
    res.render("index3.ejs");
    })

app.post("/register" , async (req,res) => {
   const {email,password} = req.body;
     try {

    const checkResult = await db.query("SELECT * FROM user_details WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      
      res.redirect("/register", { message: "User already exists. Please login." });
    } else {
      bcrypt.hash(password, 10, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
          res.redirect("/register", { message: "Error occurred. Please try again." });
        } else {
           const result = await db.query(
        "INSERT INTO user_details (email, password) VALUES ($1, $2) returning *",[email, hash]);
         const user = result.rows[0];
         req.login(user,(err) => {
         res.redirect("/");
    })
           

      }
     
    }); 

      } 
} 
catch (error) {
  console.error("Error checking user existence:", error);
}
})

app.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/register"
}));


passport.use(new LocalStrategy( { usernameField: "email" },
   (async function verify(email, password, cb) {
  try {
    const result = await db.query("SELECT * FROM user_details WHERE email = $1", [email]);
    if (result.rows.length === 0) {    

      return cb(null, false);

    } 
    else {

      return cb(null, result.rows[0]);
    }

  } catch (error){
    console.error("Error during authentication:", error);
    cb(error, null);
  }
})
));

app.get("/logout", (req,res) => {
  req.logout((err) => {
    if (err) {
      console.error("Error during logout:", err);
      res.redirect("/");
    } else {
      res.redirect("/register");
    }
  })
})


passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
  try {
        const result = await db.query(
            "SELECT * FROM user_details WHERE id = $1",
            [id]);
        if (result.rows.length === 0) {
            return cb(null, false);
        }
        const user = result.rows[0];
        cb(null, user);}
         catch (error) {
    console.error("Error deserializing user:", error);
    cb(error, null);
  }
})

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


