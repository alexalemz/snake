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
      console.log('userOnAuthStateChanged',user);

      // Check if the user has a current game, and if they do, load it, if they want.
      loadCurrentGameFromFirebase();
      
      $("#navbar-user").html(user.displayName);
      $("#navbar-signInOutLink").attr("data", "sign-out").html("Sign Out");
      // Hide Score Counter (for non signed-in users)
      $("#score-display-signedOut").css("display", "none");
      // Display Stats Row
    //   $("#statsRow").css("display", "block");

      // Get their high score
      var userHistoryRef = firebase.database().ref("history/" + user.uid);
      userHistoryRef.orderByChild("score").limitToLast(1).on("child_added", function(snapshot) {
          // Set high score
          highScore = snapshot.val().score;
          // Display high score
          $("#highScore").text(highScore);
      });
    } else {
      // No user is signed in.
      setUser(undefined);
      $("#navbar-user").html("");
      $("#navbar-signInOutLink").attr("data", "sign-in").html("Sign In").attr("href", "signIn_firebaseUI.html");
      // Hide Stats Row
      $("#statsRow").css("display", "none");
      // Display Score Counter (for non signed-in users)
      $("#score-display-signedOut").css("display", "block");
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
var highScore = 0;
var steps = 0;
var user;
function setUser(currentUser) {user = currentUser;}
var extralifeOnGrid = false;
var extralives = 0;

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

    // Check if the user has a current game in Firebase
    // If they do, we'll set up everything based on their currentGame.
    // Otherwise, we'll set things up the default way, through resetGame() .
    var userHasCurrentGame = false;
    var userCurrentGameData = undefined;
    console.log("We've gotten this far.");

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
    // Finds the square with the attribute's of the given row and col, then changes its class.
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

            // Update currentGame in Firebase, kinda like a checkpoint.
            if (user) {
                firebase.database().ref("/currentGame").child(user.uid).set(
                    {
                        snakePosition: JSON.stringify(snake),
                        stepCount: steps,
                        date: JSON.stringify(new Date()),
                        direction: direction,
                        extralives: extralives
                    }
                );
            }

            // Place the food in a random empty square.
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

        // Increment number of steps
        steps++;

        // Place an extra life square for a limited amount of time, 
        // every once in a while.
        // placeExtraLife();
    }

    // If it hits something, game over.
    else {
        gameoverSound.play();
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
                    stepCount: steps,
                    date: JSON.stringify(new Date())
                }, 
                function(error){
                    if (error) {
                     console.error(error);
                     return;
                    }
                    console.log('Push successful');
                }
            );
        }
        alert("Game over");
    }

    // console.log(gridarray);
}

// Keypress events
$(document).keydown(function(event) {
    console.log(event.which);
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
    const grid = $("#grid");

    // Reset the grid and snake array.
    resetGrid();
    snake = [];
    direction = nextDirection = 'N';
    

    // Place the snake somewhere on the grid.
    // The center should be good to start.
    const center = gridlength/2;
    // Place snake head
    snake.push({row: center, col: center});
    // Place snake body (only 1 square)
    snake.push({row: (center+1), col: center});
    // Place snake tail
    snake.push({row: (center+2), col: center});
    
    // Now that snake array has some elements, we can draw it on the grid.
    drawSnakeFromSnakeArray();

    // Place the food somewhere
    var foodSquare = randomEmptySquare();
    setSquare(foodSquare.row, foodSquare.col, 'food');
    fillSquare(foodSquare.row, foodSquare.col, 'food');

    // Reset the score counter
    score = 0;
    displayScore();

    // Reset number of steps
    steps = 0;
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


function generateGrid() {
    const grid = $("#grid");
    // Create grid of squares
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
}

function createBorder() {
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
}



function drawSnakeFromSnakeArray() {
    // We want to generate the grid (and gridarray) based on the snake array.
    // This way, when someone wants to pause their game, their snake array gets
    // saved in the database, then when they come back to the game on either the
    // same device or a new one, the snake array is retrieved from the database
    // and the grid is redrawn and the gridarray is set also.

    // We assume that the snake array has already been retrieved and set in the 
    // 'snake' variable.

    // Each element of 'snake' is an object in the format {row: 'row#', col: 'col#'}
    // Where row# and col# are numbers, not strings.

    // If we loop through snake array, we can set gridarray
    // Let's assume that gridarray already has 'wall' on its border.
    for (let i=0; i < snake.length; i++) {
        const square = snake[i];
        let value = "";

        if (i === 0)
            value = "head";
        else if (i === snake.length - 1)
            value = "tail";
        else
            value = "body";

        // Give the square in gridarray, that value.
        setSquare(square.row, square.col, value);
        // Give the square in #grid, that class.
        fillSquare(square.row, square.col, value);
    }

}


function loadCurrentGameFromFirebase() {
    if (user) {
        console.log("User logged in.")
        firebase.database().ref("/currentGame").once("value").then(function(snapshot) {
            userHasCurrentGame = snapshot.child(user.uid).exists(); // true or false
            console.log("User has a current game")

            // If the user has a current game in Firebase, load the snake from currentGame.snakePosition
            // Update the score and the steps.
            if (userHasCurrentGame && confirm(
                "You have a game in progress. Would you like to resume? " + 
                "\n(WARNING: If you cancel, this game will be erased.)"
                )) {
                userCurrentGameData = snapshot.child(user.uid).val();

                snake = JSON.parse(userCurrentGameData.snakePosition);
                steps = JSON.parse(userCurrentGameData.stepCount);
                score = snake.length;
                extralives = userCurrentGameData.extralives;
                direction = nextDirection = userCurrentGameData.direction;
                console.log("Loaded currentGame from Firebase");
                console.log("currentGame data", userCurrentGameData);
                displayScore();

                
                // Reset the grid and draw the snake.
                resetGrid();
                drawSnakeFromSnakeArray();

                // Place the food somewhere
                var foodSquare = randomEmptySquare();
                setSquare(foodSquare.row, foodSquare.col, 'food');
                fillSquare(foodSquare.row, foodSquare.col, 'food');
            }
            else {
                // Set the snake and first food item to default setting
                resetGame();
            }
        });

    }
}


function resetGrid() {
    gridarray = [];
    $("#grid").empty();
    // Create grid of squares
    generateGrid();
    // Create border
    createBorder();
}


function placeExtraLife() {
    var blueSquare;
    if (snake.length > 0 && snake.length % 3 === 0 && !extralifeOnGrid) {
        // Place a blue extra life square in an empty square.
        blueSquare = randomEmptySquare();
        setSquare(blueSquare.row, blueSquare.col, "extralife");
        fillSquare(blueSquare.row, blueSquare.col, "extralife");

        
        console.log("An extralife square has been placed in", blueSquare);
        extralifeOnGrid = true;
        
        // After a certain time, turn that square back into normal.
        var amtSeconds = 10; 
        // I want the extra life to be on the grid for between 10 and 45 seconds.
        // Minimum 10 and max 45. This depends on the length of the snake.
        // If the snake is 150 squares long, then it will get 45 seconds.
        // Above 150 will get a little bit more.
        amtSeconds = Math.floor((snake.length / 150) * (45 - 10) + 10);
        setTimeout(function() {
            setSquare(blueSquare.row, blueSquare.col, undefined);
            fillSquare(blueSquare.row, blueSquare.col, "");
            extralifeOnGrid = false;

            // Clear the square's text and stop the countdown.
            $(".square[row=" + blueSquare.row + "][col=" + blueSquare.col + "]").text("");
            clearInterval(countdown);
        }, amtSeconds * 1000);

        // $(".square[row=" + blueSquare.row + "][col=" + blueSquare.col + "]").text(amtSeconds);

        var secondsLeft = amtSeconds;

        var countdown = setInterval(function() {
            $(".square[row=" + blueSquare.row + "][col=" + blueSquare.col + "]").text(secondsLeft);
            secondsLeft--;
        }, 1000);
    }
}