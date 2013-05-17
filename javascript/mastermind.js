/**
 * ui.js
 */

 
var colorTable = colorTable || []; 
var output = output || {};
var worker = worker || {};
var workerEvents = workerEvents || {};
 
/**
 * Courtesy of http://stackoverflow.com/a/5624139/646543
 */
function toHex(c) {
    var hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
}

/**
 * Courtesy of http://stackoverflow.com/a/202627/646543
 */
function repeat(string, num) {
    var i = 0;
    var output = [];
    for (i; i < num; ++i) {
        output.push(string);
    }
    return output.join('');
}


/**
 * Courtesy of http://snipplr.com/view/14590
 */
function hsvToHex(h, s, v) {
    var r, g, b, i, f, p, q, t;

    // Make sure our arguments stay in-range
    h = Math.max(0, Math.min(1, h));
    s = Math.max(0, Math.min(1, s));
    v = Math.max(0, Math.min(1, v));

    h *= 360;

    if (s === 0) {
        // Achromatic (grey)
        r = g = b = v;
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    h /= 60; // sector 0 to 5
    i = Math.floor(h);
    f = h - i; // factorial part of h
    p = v * (1 - s);
    q = v * (1 - s * f);
    t = v * (1 - s * (1 - f));
     
    switch (i) {
    case 0:
        r = v;
        g = t;
        b = p;
        break;
    case 1:
        r = q;
        g = v;
        b = p;
        break;
    case 2:
        r = p;
        g = v;
        b = t;
        break;
    case 3:
        r = p;
        g = q;
        b = v;
        break;
    case 4:
        r = t;
        g = p;
        b = v;
        break;         
    default: // case 5:
        r = v;
        g = p;
        b = q;
    }
    
    r = toHex(Math.round(r * 255));
    g = toHex(Math.round(g * 255));
    b = toHex(Math.round(b * 255));
     
    return '#' + r + g + b;
}
 
/**
 * Algorithm courtesy of http://gamedev.stackexchange.com/a/46469/24514
 * Essentially, the colors are spaced equally in the hsv space using 
 * the equidistribution theorem. The above link explains better.
 */
function generateColors(amount) {
    var PHI = 0.618033988749895;
    var i = 0;
    colorTable = [];
    for (i; i < amount; ++i) {
        if (_.isString(colorTable[i])) {
            continue;
        } else {
            colorTable.push(
                hsvToHex((i * PHI) % 1.0, 
                0.5, 
                Math.sqrt(1.0 - ((i * PHI) % 0.5))));
        }
    }
    
}




 
/**
 * DISPLAY
 */
 
function pushPaletteColor(color, number) {
    var style = 'style="background-color:' + color + '" ';
    var number_str = (number + 1).toString(10);
    var color_id = 'id="color_' + number.toString() + '" ';
    var html = '<div class="color" ' + color_id + style + '><span>' + number_str + '</span></div>';
    $(output.palette_id).append(html);
}

function pushColors() {
    $(output.palette_id).empty();
    _.each(colorTable, function(color, index, list) {
        pushPaletteColor(color, index);
    });
}

function pushGuess(guess_number, guess) {
    var current_id = 'guess_' + parseInt(guess_number, 10);
    var html = '<div id="' + current_id + '" class="row"></div>'
    $(output.guesses_id).prepend(html);
    
    var colors = ['<div class="guess">'];
    _.each(guess, function(color, index, list) {
        var style = 'style="background-color:' + colorTable[color] + '" ';
        var color_class = 'color_' + color;
        var span = '<span>' + (color + 1) + '</span>';
        colors.push('<div class="color ' + color_class + '" ' + style + '>' + span + '</div>');
    });
    colors.push('</div>');
    
    $(colors.join('')).prependTo('#' + current_id).hide().slideDown();
    
    $('#guess_' + guess_number).slideDown();
}

function clearGuesses() {
    $(output.guesses_id).empty();
}

function pushFeedback(guess_number, red, white, wrong) {
    if ((guess_number - 1) >= 1) {
        var feedback = ['<div class="feedback">'];
        feedback.push(repeat('<span class="red"></span>', red));
        feedback.push(repeat('<span class="white"></span>', white));
        feedback.push(repeat('<span class="none"></span>', wrong));
        feedback.push('</div>');
        
        var prev_id = '#guess_' + parseInt(guess_number - 1, 10);
        $(feedback.join('')).appendTo(prev_id).slideDown();
    }
}

function pushError(message) {
    $('<p>' + message + '</p>').prependTo(output.error_id).slideDown();
}

function clearErrors() {
    $(output.error_id).empty();
}



/**
 * TRIGGERS AND BINDING LOGIC
 */

 
/**
 * Convenience functions
 */
 
function initWorker() {
    worker = new Worker('algorithm.js');
    
    worker.addEventListener('message', function(message) {
        message = message.data;
        
        var callback = workerEvents[message.name];
        if (!_.isFunction(callback)) {
            pushError('Error: ' + JSON.stringify(message) + ' is not a function');
            return;
        }
        
        callback(message.name, message);
    });
}

function onMessage(name, callback) {
    workerEvents[name] = callback;
}

function sendMessage(name, message) {
    message.name = name;
    worker.postMessage(message);
}
 
function getVal(id) {
    return parseInt($.trim($(id).val()), 10);
}

/**
 * Public API
 *
 * ProcessFeedback
 * SetupGame
 */


function bindSubmitFunction() {
    $(output.form_id).click(function() {
        var choices = getVal(output.choices_id);
        var holes = getVal(output.holes_id);
        
        var errors = 0;
        if (choices <= 1) {
            pushError('ERROR: You must have 2 or more color choices.');
            errors += 1;
        }
        if (holes === 0) {
            pushError('ERROR: The length of the secret code can\'t be zero.');
            errors += 1;
        }
        if (errors !== 0) {
            return;
        }
        
        $(output.start_id).slideDown();
        
        generateColors(choices);
        pushColors();
        
        clearErrors();
        clearGuesses();
        
        sendMessage('SetupGame', {
            'choices': choices, 
            'holes': holes});
    });
}

function bindFeedbackFunction() {
    $(output.feedback_id).click(function() {
        
        var red = getVal(output.red_id);
        var white = getVal(output.white_id);
        
        clearErrors();
        pushError('Thinking...');
        
        sendMessage('ProcessFeedback', {
            correct: red, 
            close: white});
    });
}

function bindWorkerEvents() {
    onMessage('GetFirstMove', function(name, message) {
        $(output.pointer_id).show();

        pushGuess(
            message.guess_number, 
            message.guess);
    });

    onMessage('GetNextMove', function(name, message) {
        pushGuess(
            message.guess_number, 
            message.guess);
        clearErrors();
    });
    
    onMessage('UpdateFeedback', function(name, message) {
        pushFeedback(
            message.guess_number, 
            message.correct, 
            message.close, 
            message.wrong);
    });
     
    onMessage('UpdateCounter', function(name, message) {
        clearErrors();
        pushError('Thinking (' + message.current + '/' + message.total + ')');
    });

    onMessage('OnError', function(name, message) {
        clearErrors();
        pushError('ERROR: ' + message.reason);
    });

    onMessage('OnBadInput', function(name, message) {
        clearErrors();
        pushError('ERROR: ' + message.reason);
    });

    onMessage('OnPoolExhausted', function(name, message) {
        clearErrors();
        pushError('ERROR: Sorry, there are no more possible combos left. Either you\'ve made a mistake, or there\'s a bug (report to <a href="mailto:michael.lee.0x2a.com">michael.lee.0x2a.com</a>');
    });

    onMessage('OnVictory', function(name, message) {
        clearErrors();
        pushError("Well, that was the last possible combo left! If you haven't won already, this should be the winning move.");
    });
    
    onMessage('OnAssuredVictory', function(name, message) {
        clearErrors();
        pushError("You win!");
    });
}

function setupMastermind(form_id, choices_id, holes_id, palette_id, start_id,
                         feedback_id, guesses_id, pointer_id, red_id, white_id, error_id) {
    output = {
        form_id: form_id, 
        choices_id: choices_id,
        holes_id: holes_id,
        palette_id: palette_id,
        start_id: start_id,
        feedback_id: feedback_id,
        guesses_id: guesses_id,
        pointer_id: pointer_id,
        red_id: red_id,
        white_id: white_id,
        error_id: error_id
    }
    
    initWorker();
    bindWorkerEvents();
    
    bindSubmitFunction();
    bindFeedbackFunction();
}


