// helper functions
function randomInt(n) {
    return Math.floor(Math.random() * n);
};

function AgentBrain(gameEngine) {
    this.size = 4;
    this.previousState = gameEngine.grid.serialize();
    this.reset();
    this.score = gameEngine.score;
    this.over = gameEngine.over;
    this.grid = new Grid(this.previousState.size, this.previousState.cells);
};

AgentBrain.prototype.reset = function () {
    this.score = 0;
    this.grid = new Grid(this.previousState.size, this.previousState.cells);
};

// Adds a tile in a random position
AgentBrain.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(this.grid.randomAvailableCell(), value);

        this.grid.insertTile(tile);
    }
};

AgentBrain.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
AgentBrain.prototype.move = function (direction) {
    // 0: up, 1: right, 2: down, 3: left
    var self = this;

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    //console.log(vector);

    //console.log(traversals);

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            cell = { x: x, y: y };
            tile = self.grid.cellContent(cell);

            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

                // Only one merger per row traversal?
                if (next && next.value === tile.value && !next.mergedFrom) {
                    var merged = new Tile(positions.next, tile.value * 2);
                    merged.mergedFrom = [tile, next];

                    self.grid.insertTile(merged);
                    self.grid.removeTile(tile);

                    // Converge the two tiles' positions
                    tile.updatePosition(positions.next);

                    // Update the score
                    self.score += merged.value;

                } else {
                    self.moveTile(tile, positions.farthest);
                }

                if (!self.positionsEqual(cell, tile)) {
                    moved = true; // The tile moved from its original cell!
                } 
            }
        });
    });
    //console.log(moved);
    /*if (moved) {
        this.addRandomTile();
    }*/
    return moved;
};

// Get the vector representing the chosen direction
AgentBrain.prototype.getVector = function (direction) {
    // Vectors representing tile movement
    var map = {
        0: { x: 0, y: -1 }, // Up
        1: { x: 1, y: 0 },  // Right
        2: { x: 0, y: 1 },  // Down
        3: { x: -1, y: 0 }   // Left
    };

    return map[direction];
};

// Build a list of positions to traverse in the right order
AgentBrain.prototype.buildTraversals = function (vector) {
    var traversals = { x: [], y: [] };

    for (var pos = 0; pos < this.size; pos++) {
        traversals.x.push(pos);
        traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
};

AgentBrain.prototype.findFarthestPosition = function (cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
        previous = cell;
        cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) &&
             this.grid.cellAvailable(cell));

    return {
        farthest: previous,
        next: cell // Used to check if a merge is required
    };
};

AgentBrain.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
};

function Agent() {
};

Agent.prototype.selectMove = function (gameManager) {
    var brain = new AgentBrain(gameManager);
    // Use the brain to simulate moves
    // brain.move(i) 
    // i = 0: up, 1: right, 2: down, 3: left
    // brain.reset() resets the brain to the current game board

    if(gameManager.score < 60) {
        if(brain.move(1))
            return 1;
        else if (brain.move(2))
            return 2;
        else
            return 3;
    }
    else
        return this.expectMax(brain, -1, 6).move;
};

Agent.prototype.evaluateGrid = function (gameManager) {
    // calculate a score for the current grid configuration
    var grid = gameManager.grid;
    var check;
    if(grid.cellContent({x:3,y:3}) != null) {
        //check = this.checkCornor(grid);
        return gameManager.score * this.checkCornor(grid);
    } else {
        return gameManager.score;
    }
};

Agent.prototype.checkCornor = function(grid) {
    var max = grid.cellContent({x:3,y:3}).value;
    var cornor = 3;
    for(var i =0; i < 4; i++) {
        for(var j = 0; j < 4; j ++) {
            if(cornor > 0 && grid.cellContent({x:i,y:j}) != null && 
                max < grid.cellContent({x:i,y:j}).value)
                cornor = 0;
        }
    }
    if (cornor != 0 && grid.cellContent({x:2,y:3}) != null)
        return cornor + this.checkNext(grid);

    return cornor;
}

Agent.prototype.checkNext = function(grid) {

    var secMax = grid.cellContent({x:2,y:3}).value;
    var check = 3;
    for(var i =0; i < 4; i++) {
        for(var j = 0; j < 3; j ++) {
            if(grid.cellContent({x:i,y:j}) != null && secMax < grid.cellContent({x:i,y:j}).value)
                check *= 0.5;
        }
    }
    
    if(grid.cellContent({x:1,y:3}) != null && 2*secMax < grid.cellContent({x:1,y:3}).value)
        check -= 3;
    if(grid.cellContent({x:1,y:3}) != null && secMax < grid.cellContent({x:1,y:3}).value)
        check -= 3;
    if(grid.cellContent({x:1,y:3}) != null) 
        check += this.checkThird(grid, grid.cellContent({x:1,y:3}).value);
    if(grid.cellContent({x:0,y:3}) != null ) 
        check += this.checkFourth(grid, grid.cellContent({x:0,y:3}).value);
    return check;
}

Agent.prototype.checkThird = function(grid, third) {
    var check = 3;
    var thirdMax = third;
    if(thirdMax > 16 && thirdMax === grid.cellContent({x:2,y:3}).value)
        check ++;
    if(thirdMax > 16 && thirdMax >= 0.5*grid.cellContent({x:2,y:3}).value &&
        thirdMax < grid.cellContent({x:1,y:3}).value)
        check ++;
    for(var i =0; i < 4; i++) {
        for(var j = 0; j < 3; j ++) {
            if(check > 0 && grid.cellContent({x:i,y:j}) != null && thirdMax < grid.cellContent({x:i,y:j}).value)
                check =0;
        }
    }
    if(grid.cellContent({x:0,y:3}) != null && thirdMax < grid.cellContent({x:0,y:3}).value) {
        check -= 3;
    }
    return check;
}
Agent.prototype.checkFourth = function(grid, fourth) {
    var check = 3;
    var fourthdMax = fourth;
    if(fourthdMax > 16 && grid.cellContent({x:0,y:2}) !=null 
        && fourthdMax === grid.cellContent({x:0,y:2}).value)
        check ++;
    if(fourthdMax > 16 && grid.cellContent({x:1,y:3})!= null && 
        fourthdMax === grid.cellContent({x:1,y:3}).value)
        check += 3;
    if(fourthdMax > 16 && grid.cellContent({x:1,y:3})!= null &&
        fourthdMax >= 0.5*grid.cellContent({x:1,y:3}).value &&
        fourthdMax < grid.cellContent({x:1,y:3}).value)
        check ++;
    return check;
}

Agent.prototype.expectMax = function(board, turn, depth) {

    if(board.over || depth === 0){
        return this.evaluateGrid(board);
    }
    else {
        turn *= -1;
        if (turn === 1) { //max
            var list = [], maxObj = {val: -1, move: -2};
            depth --;
            for (var i = 0; i < 4 ; i++) {
                var clone = new AgentBrain(board);
                if(clone.move(i)) {
                    list.push(this.expectMax(clone, turn, depth));
                    if(list[list.length -1] > maxObj.val) {
                        maxObj.val = list[list.length -1];
                        maxObj.move = i;
                    }
                }
            }
            if(depth === 5)
                return maxObj;
            else
                return maxObj.val;
        }
        if (turn === -1) { //chance
            var cells = board.grid.availableCells(), two = 0, four = 0;
            depth --;
            for (var i = 0; i < cells.length; i ++) {
                var tile = new Tile(cells[i], 2);
                var clone = new AgentBrain(board);
                clone.grid.insertTile(tile);
                two += this.expectMax(clone, turn, depth) * 0.9;
            }
            for (var i = 0; i < cells.length; i ++) {
                var tile = new Tile(cells[i], 4);
                var clone = new AgentBrain(board);
                clone.grid.insertTile(tile);
                four += this.expectMax(clone, turn, depth) * 0.1;
            }
            return (two + four) / (cells.length * 2);
        }
    }
}