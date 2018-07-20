// ------------ Firebase stuff -------------------------------//

// Initialize Firebase
var config = {
    apiKey: "AIzaSyDYuXqrfNquGyM8Im_aP_5mxtyGN8buiBE",
    authDomain: "snake-1f5f5.firebaseapp.com",
    databaseURL: "https://snake-1f5f5.firebaseio.com",
    projectId: "snake-1f5f5",
    storageBucket: "",
    messagingSenderId: "28226935362"
};
firebase.initializeApp(config);

// Get the currently signed-in user
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.
      setUser(user);
      $("#navbar-user").html(user.displayName);
      $("#navbar-signInOutLink").attr("data", "sign-out").html("Sign Out");
      // Hide Score Counter (for non signed-in users)
      $("#score-display-signedOut").css("display", "none");
    } else {
      // No user is signed in.
      setUser(undefined);
      $("#navbar-user").html("");
      $("#navbar-signInOutLink").attr("data", "sign-in").html("Sign In").attr("href", "signIn_firebaseUI.html");
      // Hide Stats Row
      $("#statsRow").css("display", "none");
    }
});

// Sign-out link click listener
$(document).on("click", "#navbar-signInOutLink[data='sign-out']", function() {
    var user = firebase.auth().currentUser;
    if (user) {
        firebase.auth().signOut().then(function() {
            // Sign-out successful.
        }).catch(function(error) {
            // An error happened.
        });
    }
});



//---------------- Game logic ---------------------------------//


// Create a grid of spans
// Each span had an id or a property of it's column and row. 
// We can select the specific span using jQuery.
// We have a certain direction that the snake is going in.
// So, we have to keep track of the current direction (N,S,E,W)
// There will be a dot that pops up in random places each time 
// the snake eats a dot (and once at the beginning).
// There needs to be some way to track when the snake hits the wall or hits itself. 
// I guess there will be a border, so when it hits the wall, the game ends.
// Every second, the snake will move forward in whatever direction it's facing.
// The direction changes based on arrow keypresses. 

// We have the grid represented in an array also. A two-dimensional array of rows and columns.
// Each element of the array will have the string, "snake", "wall", "food", or nothing.
// This is how we can keep track of if the snake is going to run into itself or the wall, 
// or if it's going to eat the food, or if it's moving into an empty space.

const gridlength = 20;
var direction = 'N';
var nextDirection = 'N';
var gridarray = [];
// Each element of the snake array, is the location of each square that the snake's body inhabits.
// The first element is the head. Each element is a square object.
var snake = [];
var gameInterval;
var gameSpeed = 500;
var audioElement;
var eatingSound;
var gameoverSound;
var score = 0;
var user;
function setUser(currentUser) {user = currentUser;}

$(document).ready(function() {
    // If not signed-in, redirect to sign in page.
    // user = firebase.auth().currentUser;
    // if (!user) {
    //     window.location.assign('signIn_firebaseUI.html');
    // }

    // Audio setup
    audioElement = document.createElement("audio");
    audioElement.setAttribute("src", "assets/music/sidewinder_64.mp3");
    audioElement.loop = true;
    eatingSound = document.createElement("audio");
    eatingSound.setAttribute("src", "assets/sounds/pacman_eatfruit.wav");
    gameoverSound = document.createElement("audio");
    gameoverSound.setAttribute("src", "assets/sounds/pacman_death.wav");
    // MIDIjs.play('sidewinder.mid');
    
    // Set the snake and first food item to default setting
    resetGame();

    // Start the game
    // gameInterval = setInterval(snakeGame, gameSpeed);
    //console.log(snake);
});

// Returns a random number between 1 and (gridlength - 1)
function randomRow() {
    return 1 + Math.floor(Math.random() * (gridlength - 2) );
}

function randomSquare() {
    // Generate a random row and column between 1 and (gridlength - 1)
    var row = randomRow();
    var col = randomRow();

    return {row: row, col: col};
}

function randomEmptySquare() {
    var square = randomSquare();

    // If the random square has something in it, find a new random square.
    // while (gridarray[square.row][square.col]) {
    while (!squareIsEmpty(square.row, square.col)) {
        square = randomSquare();
    }

    return square;
}

// Returns true or false
function squareIsEmpty(row, col) {
    return !gridarray[row][col];
}

// Returns the contents of the square in gridarray
function squareContents(row, col) {
    return gridarray[row][col];
}

// Sets the square in gridarray with the given value.
function setSquare(row, col, value) {
    gridarray[row][col] =  value;
}

// Adds a class to the square in the #grid
function fillSquare(row, col, className) {
    var newClass = "square " + className;
    $(".square[row=" + row + "][col=" + col + "]").attr('class', newClass);
}

// What happens each interval
function snakeGame() {
    // Update the direction from the keypress
    direction = nextDirection;
    // Move the snake forward one square in its current direction.
    // The next square is going to be one square in front of the snake's head.
    var nextSquare = Object.assign({}, snake[0]); // Use assign because we're copying an object.
    switch (direction) {
        case 'N':
            nextSquare.row--; break;
        case 'E':
            nextSquare.col++; break;
        case 'S':
            nextSquare.row++; break;
        case 'W':
            nextSquare.col--; break;
    }

    // See if the nextSquare was food
    var wasFood = (squareContents(nextSquare.row, nextSquare.col) === 'food') ? true : false;
    // See if the nextSquare was it's tail
    var wasTail = (squareContents(nextSquare.row, nextSquare.col) === 'tail') ? true : false;

    if (squareIsEmpty(nextSquare.row, nextSquare.col) || wasFood || wasTail) {
        // Add the nextSquare into the beginning of snake array
        snake.unshift(nextSquare);
        
        // If the snake ate the food, don't move the tail or pop it.
        // Increase the snake's length by one.
        if (wasFood) {
            eatingSound.play();
            // console.log("Just ate some food");
            var foodSquare = randomEmptySquare();
            setSquare(foodSquare.row, foodSquare.col, 'food');
            fillSquare(foodSquare.row, foodSquare.col, 'food');
            // Update score
            score++;
            // Display score
            displayScore();
        }
        // Move the tail
        else {
            // Remove the location of the old tail
            var oldtail = snake.pop();
            // Remove the old tail from gridarray, etc
            setSquare(oldtail.row, oldtail.col, undefined);
            fillSquare(oldtail.row, oldtail.col, '');
            // Set the new tail
            var newTail = snake[snake.length-1];
            setSquare(newTail.row, newTail.col, 'tail');
            fillSquare(newTail.row, newTail.col, 'tail');
        }
        
        // Set nextSquare as the new head
        setSquare(nextSquare.row, nextSquare.col, 'head');
        fillSquare(nextSquare.row, nextSquare.col, 'head');
        // Change the old head to body
        const oldhead = snake[1];
        setSquare(oldhead.row, oldhead.col, 'body');
        fillSquare(oldhead.row, oldhead.col, 'body');
    }

    // If it hits something, game over.
    else {
        gameoverSound.play();
        alert("Game over");
        clearInterval(gameInterval);

        // Change the pausePlayBtn to say Restart
        var pausePlayBtn = $("#pausePlayBtn");
        pausePlayBtn.html('<i class="fa fa-refresh"></i> Restart');
        // Remove .pauseBtn and add .restartBtn
        pausePlayBtn.toggleClass("pauseBtn restartBtn");
        // Change data-state to 'over'
        pausePlayBtn.attr('data-state', 'over');

        // Update Firebase, add this game's score to your list of game's and scores.
        if (user) {
            firebase.database().ref("/history").child(user.uid).push(
                {
                    score: score,
                    date: JSON.stringify(new Date())
                }, 
                function(error){
                    if (error) {
                     console.error(error);
                     return;
                    }
                    console.log('Push successful');
            );
        }
    }

    // console.log(gridarray);
}

// Keypress events
$(document).keyup(function(event) {
    // console.log(event.which);
    const keynum = event.which;
    switch (keynum) {
        // Arrow keypress events
        // Left arrow keypress 37
        case 37:
            pressLeft();
            break;
        // Up arrow keypress 38
        case 38:
            pressUp();
            break;
        // Right arrow keypress 39
        case 39:
            pressRight();
            break;
        // Down arrow keypress 40
        case 40:
            pressDown();
            break;

        // Hit the spacebar to pause or play (or restart)
        case 32:
            event.preventDefault();
            var pausePlayBtn = $("#pausePlayBtn");
            var state = pausePlayBtn.attr('data-state');
            console.log('state', state);

            if (state === 'pause') {
                playGame();}
            else if (state === 'play') {
                pauseGame();}
            else if (state === 'over') {
                restartGame();
            }
            
            break;
    }
});

// Arrow button click events
$(".arrowBtn").on("click", function() {
    var thisButton = this;
    // console.log(thisButton.id);
    var btnId = thisButton.id;
    if (btnId === 'arrowLeft')
        pressLeft();
    else if (btnId === 'arrowUp')
        pressUp();
    else if (btnId === 'arrowRight')
        pressRight();
    else if (btnId === 'arrowDown')
        pressDown();
});


function pressLeft() {
    if (direction !== 'E')
        nextDirection = 'W';
}

function pressUp() {
    if (direction !== 'S')
        nextDirection = 'N';
}

function pressRight() {
    if (direction !== 'W')
        nextDirection = 'E';
}

function pressDown() {
    if (direction !== 'N')
        nextDirection = 'S';
}


// Pause the game
// Click pause/play button
$(document).on("click", ".pauseBtn", function() {
    pauseGame();
});

$(document).on("click", ".playBtn", function() {
    playGame();
});

$(document).on("click", ".restartBtn", function() {
    restartGame();
});


function pauseGame() {
    clearInterval(gameInterval);
    var pausePlayBtn = $("#pausePlayBtn");
    pausePlayBtn.html('<i class="fa fa-play"></i> Play');
    pausePlayBtn.toggleClass('pauseBtn playBtn');
    pausePlayBtn.attr('data-state', 'pause');
    audioElement.pause();
}

function playGame() {
    gameInterval = setInterval(snakeGame, gameSpeed);
    var pausePlayBtn = $("#pausePlayBtn");
    pausePlayBtn.html('<i class="fa fa-pause"></i> Pause');
    pausePlayBtn.toggleClass('pauseBtn playBtn');
    pausePlayBtn.attr('data-state', 'play');
    audioElement.play();
}

function resetGame() {
    // Create grid of squares
    const grid = $("#grid");
    grid.empty();
    gridarray = [];
    snake = [];
    direction = nextDirection = 'N';

    for (var i = 0; i < gridlength; i++) {
        var row = $("<div>").addClass("divRow");
        var gridarrayrow = new Array(gridlength);
        for (var j = 0; j < gridlength; j++) {
            // Create square/span
            var span = $("<span>");
            span.addClass("square");
            span.attr({
                row: i,
                col: j
            });
            row.append(span);
        }
        grid.append(row);
        gridarray.push(gridarrayrow);
    }

    // Create border
    $(".square[row=0]").addClass("wall");
    $(".square[row=" + (gridlength-1) + "]").addClass("wall");
    $(".square[col=0]").addClass("wall");
    $(".square[col=" + (gridlength-1) + "]").addClass("wall");
    // Create border in gridarray
    for (var i=0; i<gridlength; i++) {
        for (var j=0; j<gridlength; j++) {
            if (i === 0 || i === gridlength-1 || j === 0 || j === gridlength-1) {
                setSquare(i, j, 'wall');
            }
        }
    }

    // Place the snake somewhere on the grid.
    // The center should be good to start.
    const center = gridlength/2;
    // Place snake head
    snake.push( {row: center, col: center} );
    setSquare(center, center, 'head');
    fillSquare(center, center, 'head');
    // Place snake body (only 1 square)
    snake.push({row: (center+1), col: center});
    setSquare(center+1, center, 'body');
    fillSquare(center+1, center, 'body');
    // Place snake tail
    snake.push({row: (center+2), col: center});
    setSquare(center+2, center, 'tail');
    fillSquare(center+2, center, 'tail');

    // Place the food somewhere
    var foodSquare = randomEmptySquare();
    setSquare(foodSquare.row, foodSquare.col, 'food');
    fillSquare(foodSquare.row, foodSquare.col, 'food');

    // Reset the score counter
    score = 0;
    displayScore();
}

// This runs when we hit the restart button
function restartGame() {
    var pausePlayBtn = $("#pausePlayBtn");
    pausePlayBtn.toggleClass("playBtn restartBtn");
    resetGame();
    playGame();
}

function displayScore() {
    $(".scoreCounter").text(score);
}
  