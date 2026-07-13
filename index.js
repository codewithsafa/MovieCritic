import express, { response } from "express";
import axios from "axios";
import pg from "pg";
import path from "path";
import {fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname);

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

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

db.connect();
app.set('view engine', 'ejs');





app.get("/add_movie", async (req,res) => {
  res.render("index2.ejs", {movie: null, error: null, edit: null, search : true});
}
)

app.get("/edit_movie/:id" , async (req,res) => {
    const id = req.params.id;
    const dbData = await db.query("select * from user_movie where id = $1", [id]);
    res.render("index2.ejs",{ edit : true , edit_movie :dbData.rows[0] , error:null, movie: null, search : null});
})

app.post("/editMovie", async (req,res) => {
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

app.post("/saveMovie" , async (req,res) => {
  const title = req.body.title;
  const rating = req.body.rating;
  const review = req.body.review;
  const {year,genre,poster} = req.body;
  await db.query("insert into user_movie (movie,rating,review,year,genre,photo) values ($1, $2, $3,$4,$5,$6)" , [title,rating,review,year,genre,poster])
  res.redirect("/");
})

app.get("/", async (req, res) =>{
    //  res.render(path.join(__dirname,"views", "index.ejs"));
    
     const result = await db.query("select * from user_movie order by rating desc");
    //  console.log(result.rows);
     res.render("index.ejs", {movies: result.rows});

    // result.rows.forEach((row) => {
    //  const response =  axios.get(`http://www.omdbapi.com/?apikey=7491de60&t=${row.movie_title}`);
    //  console.log(response.data);
    })
// })

app.listen(4000, () => {
  console.log("Server is running on port 4000");
}
)

