const find = document.getElementById("find");
    const movies = document.querySelectorAll(".movie");
    find.addEventListener("input", () => {
    const text = find.value.toLowerCase();
    movies.forEach(movie => {
        const hr = movie.nextElementSibling;
      const name = movie.querySelector(".movie_name").textContent.toLowerCase();
      if (name.includes(text)) { movie.style.display = "flex" ; if(hr){hr.style.display = "block"}; }
      else { movie.style.display = "none";    if (hr) hr.style.display = "none";}
    })
    
})


async function loadUserData() {
  const response = await fetch('/') 
   .then(response => response.json())
    .then(user => {

        if (user.role !== "admin") {
            document.getElementById("admin-options").style.display = "none";
        }

    });
} 

