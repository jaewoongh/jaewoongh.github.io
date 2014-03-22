
var Mindstack = {
	/*********************************************
	* CORE VARIABLES                             *
	*********************************************/

	stack: [],
	undoables: [],
	redoables: [],
	lastaction: { 'fn': undefined, 'args': undefined },

	commandqueue: [],
	runningcommand: false,
	keeprunningtimer: null,
	keeprunninginterval: 100,

	loopmemory: [],
	loopindex: -1,

	bombclock: 1500,
	bombison: false,


	/*********************************************
	* CORE FUNCTIONS 1: init, command flow       *
	*********************************************/

	// Do something need to be done
	init: function() {
		// Check/make local storage
		if(!localStorage.stack) localStorage.stack = JSON.stringify([]);
		else Mindstack.stack = JSON.parse(localStorage.stack);
	},

	// Get a bunch of inputs, make a queue, start to run things if not yet
	q: function(bunch) {
		// Check if there is the same number of beginloop and endloop, as well as 'stop' command
		var numbeg = 0;
		var numend = 0;
		for(var i = 0; i < bunch.length; i++) {
			if(Mindstack.lookup(bunch[i][0]) == Mindstack.beginLoop) numbeg++;
			else if(Mindstack.lookup(bunch[i][0]) == Mindstack.endLoop) numend++;
			if(bunch[0][0]) { if(Mindstack.lookup(bunch[0][0].toUpperCase().trim()) == Mindstack.stop) return Mindstack.eval(bunch[i]); }
		}
		if(numbeg !== numend) {
			return numbeg > numend ? 'Missing "]n"' : 'Missing "["';
		}

		// Put a bunch of inputs into command queue
		for(var i = 0; i < bunch.length; i++) Mindstack.commandqueue.push(bunch[i]);
		if(!Mindstack.runningcommand) {
			clearTimeout(Mindstack.keeprunningtimer);
			return Mindstack.run();
		}
	},

	// Run commands in queue sequencially
	run: function() {
		if(Mindstack.bombison) return true;
		if(!Mindstack.runningcommand && Mindstack.commandqueue.length > 0) {
			Mindstack.runningcommand = true;
			var nextcustomer = Mindstack.commandqueue.shift();
			for(var i = 0; i <= Mindstack.loopindex; i++) {
				if(Mindstack.loopmemory[i] == undefined) Mindstack.loopmemory[i] = [];
				Mindstack.loopmemory[i].push(nextcustomer.slice(0));
			}
			var thankyou = Mindstack.eval(nextcustomer);
			if(thankyou) localStorage.stack = JSON.stringify(Mindstack.stack);
			Mindstack.runningcommand = false;
			Mindstack.keeprunningtimer = setTimeout(Mindstack.run, Mindstack.keeprunninginterval);
			return thankyou;
		}
		return true;
	},


	/*********************************************
	* CORE FUNCTIONS 2: eval, journal, lookup    *
	*********************************************/

	// Get input parsed with PLT.js and PEG.js, and process it
	eval: function(input) {
		var string = '';
		var fn = undefined;

		while(input.length > 0) {
			string += ' ' + input[0];		// Stack up all words until it matches to the name of function
			input.shift();
			fn = this.lookup(string.toUpperCase().trim());
			if(fn instanceof Function) {
				if(fn != this.dia) {
					Mindstack.lastaction.fn = fn;
					Mindstack.lastaction.args = input;
				}
				return fn(input);
			}
		}
		Mindstack.lastaction.fn = this.push;
		Mindstack.lastaction.args = string.trim();
		return this.push(string.trim());
	},

	// Keep history of the stack
	keepjournal: function() {
		Mindstack.undoables.push(Mindstack.stack.slice(0));
		if(Mindstack.undoables.length > 13) Mindstack.undoables.shift();
		Mindstack.redoables = [];
	},

	// Overwrite the most recent history
	overwritejournal: function() {
		Mindstack.undoables.pop();
		Mindstack.undoables.push(Mindstack.stack.slice(0));
		localStorage.stack = JSON.stringify(Mindstack.stack);
	},

	// Look up for the dictionary and get matching function
	lookup: function(word) {
		for(var i = 0; i < dictionary.length; i++) {
			if(dictionary[i].entry.some(word)) return dictionary[i].fn;
		}
		return undefined;
	},


	/*********************************************
	* FUNCTIONS: in an alphabetical order        *
	*********************************************/

	// Begin Loop
	beginLoop: function() {
		// Remove beginLoop at the end of loopmemory
		for(var i = 0; i <= Mindstack.loopindex; i++) Mindstack.loopmemory[i].pop();

		// Increment loopindex
		Mindstack.loopindex++;
		return true;
	},

	// End Loop
	endLoop: function(loopcount) {
		// Remove endLoop at the end of loopmemory
		for(var i = 0; i <= Mindstack.loopindex; i++) Mindstack.loopmemory[i].pop();

		loopcount--;
		if(loopcount > 0) {
			Mindstack.commandqueue.unshift([']', loopcount]);
			Mindstack.commandqueue = Mindstack.loopmemory[Mindstack.loopindex].splice(0, Mindstack.loopmemory[Mindstack.loopindex].length).concat(Mindstack.commandqueue);
		} else {
			Mindstack.loopmemory[Mindstack.loopindex] = [];
			Mindstack.loopindex--;
		}
	},

	// Plant a bomb which delayes the whole process and destroys topmost one
	bomb: function(time) {
		if(Mindstack.stack.length < 1) return 'Stack is empty';
		if(time.length > 1) return 'Say like just bomb or bomb 1000';
		if(time[0] && time[0] != parseInt(time[0]).toString()) return 'Just bomb, or bomb and a number please';
		Mindstack.keepjournal();
		var thing = Mindstack.stack.pop();
		thing = thing.slice(0);
		thing.push(new Bomb(time[0] || undefined));
		Mindstack.stack.push(thing);
		return true;
	},

	// Clear the stack
	clr: function() {
		if(Mindstack.stack.length < 1) return 'Stack is empty';
		Mindstack.keepjournal();
		Mindstack.stack = [];
		return true;
	},

	// Do it again, the last action
	dia: function() {
		if(Mindstack.lastaction.fn == undefined) return 'Nothing to do again';
		return Mindstack.lastaction.fn(Mindstack.lastaction.args);
	},

	// Duplicate the topmost one
	dup: function() {
		if(Mindstack.stack.length < 1) return 'Stack is empty';
		Mindstack.keepjournal();
		var last = Mindstack.stack.pop();
		Mindstack.stack.push(last);
		Mindstack.stack.push(last);
		return true;
	},

	// Pop out the topmost one
	pop: function() {
		if(Mindstack.stack.length < 1) return 'Stack is empty';
		Mindstack.keepjournal();
		Mindstack.stack.pop();
		return true;
	},

	// Push to the top
	push: function(input) {
		var str;
		if(input instanceof Array) str = input.join(' ');
		else str = input;
		if(str.length < 1) {
			var dice = Math.random();
			if(dice < 0.2)			return 'Such void';
			else if(dice < 0.4)	return 'Many emptiness';
			else if(dice < 0.6)	return 'So vague';
			else if(dice < 0.8)	return 'Very nothing';
			else								return 'Wow';
		}
		Mindstack.keepjournal();
		Mindstack.stack.push([str]);
		return true;
	},

	// Roll everything downwards
	rdn: function() {
		if(Mindstack.stack.length < 1) return 'Stack is empty';
		Mindstack.keepjournal();
		var shelter = Mindstack.stack.shift();
		Mindstack.stack.push(shelter);
		return true;
	},

	// Undo undo
	redo: function() {
		if(Mindstack.redoables.length < 1) return 'Cannot redo more';
		Mindstack.undoables.push(Mindstack.stack.slice(0));
		Mindstack.stack = Mindstack.redoables.pop().slice(0);
		return true;
	},

	// Reverse the stack
	rev: function() {
		if(Mindstack.stack.length < 1) return 'Stack is empty';
		Mindstack.keepjournal();
		Mindstack.stack.reverse();
		return true;
	},

	// Remove timer attached to topmost thing
	rmvt: function() {
		if(Mindstack.stack.length < 1) return 'Stack is empty';
		if(Mindstack.stack[Mindstack.stack.length-1].length < 2) return 'There is no timer';
		Mindstack.keepjournal();
		var thing = Mindstack.stack.pop();
		var notimer = true;
		for(var i = thing.length - 1; i > 0; i--) {
			if(thing[i] instanceof Timer) {
				notimer = false;
				thing.splice(i, 1);
			}
		}
		Mindstack.push(thing);
		if(notimer) {
			Mindstack.undo();
			return 'There is no timer';
		} else {
			return true;
		}
	},

	// Roll everything upwards
	rup: function() {
		if(Mindstack.stack.length < 1) return 'Stack is empty';
		Mindstack.keepjournal();
		var shelter = Mindstack.stack.pop();
		Mindstack.stack.unshift(shelter);
		return true;
	},

	// Stop bomb
	// This is an emergency command; every other command following this command will be ignored
	stop: function() {
		if(!Mindstack.bombison) return 'There is no bomb';
		var searchforbomb = Mindstack.stack.pop();
		for(var i = searchforbomb.length-1; i > 0; i--) {
			if(searchforbomb[i] instanceof Bomb) {
				searchforbomb[i].destroy();
				searchforbomb.splice(i, 1);
			}
		}
		Mindstack.stack.push(searchforbomb);
		Mindstack.overwritejournal();
		return true;
	},

	// Swap two topmost things
	swap: function() {
		if(Mindstack.stack.length < 2) return 'Stack has less than two things';
		Mindstack.keepjournal();
		var last = Mindstack.stack.pop();
		var secondtolast = Mindstack.stack.pop();
		Mindstack.stack.push(last);
		Mindstack.stack.push(secondtolast);
		return true;
	},

	// Attach timer to topmost thing, triggered in certain time
	timin: function(time) {
		if(Mindstack.stack.length < 1) return 'Stack is empty';
		if(time.length < 1) return 'I need a time to let you know in';
		if(time.length > 2) return 'Time should not exceed two words, like 10 min or 1 hour';
		if(time[0] != parseInt(time[0]).toString()) return 'I need a number and unit for time, like 15 sec or 2 min';
		
		var t = parseInt(time[0]);
		switch(typeof time[1] == 'string' ? time[1].toLowerCase() : time[1]) {
			case 'second':	case 'seconds':	case 'sec':				case 'secs':	case 's':
				t *= 1000; break;
			case undefined:	case 'minute':	case 'minutes':		case 'min':		case 'mins':		case 'm':
				t *= 60000; break;
			case 'hour':		case 'hours':		case 'h':					case 'hr':		case 'hrs':
				t *= 3600000; break;
		}

		Mindstack.keepjournal();
		var thing = Mindstack.stack.pop();
		thing = thing.slice(0);
		thing.push(new Timer('timeout', t, thing[0]));
		Mindstack.stack.push(thing);
		return true;
	},

	// Attach timer to topmost thing, triggered on certain time
	timon: function(time) {
		if(Mindstack.stack.length < 1) return 'Stack is empty';
		if(time.length < 1) return 'I need a time to let you know on';
		if(time.length < 2) return 'Time should be two words, like 1 am or 12:10 pm';
		if(time.length > 2) return 'Time should not exceed two words, like 5 pm or 4:30 pm';
		var ampm = time[1].toLowerCase().split('.').join('');
		if(ampm != 'am' && ampm != 'pm') return 'Time should be two words, second word being either am or pm, like 3 pm or 11:20 am';
		var t = time[0];
		if(t == parseInt(t).toString()) {
			t = parseInt(t);
			var target = new Date().setHours(ampm == 'am' ? t : t + 12, 0, 0, 0);
			if(target - new Date().getTime() < 0) target += 1000*60*60*24;
			Mindstack.keepjournal();
			var thing = Mindstack.stack.pop();
			thing = thing.slice(0);
			thing.push(new Timer('clock', target, thing[0]));
			Mindstack.stack.push(thing);
			return true;
		} else {
			var tt = t.split(':');
			if(tt.length != 2) return 'Time should be two words, first word being either a number or h:mm, like 9 am or 10:45 pm';
			if((tt[0] != ('0'+parseInt(tt[0]).toString()).slice(-2) && tt[0] != parseInt(tt[0]).toString()) || tt[1] != ('0'+parseInt(tt[1]).toString()).slice(-2)) return 'Time should be two words, first word being either a number or h:mm, like 9 am or 10:45 pm';
			if(tt[0] < 0 || tt[0] > 12 || tt[1] < 0 || tt[1] > 60) return 'Time should be beween 0 and 12, 0 and 59, with am/pm specification';
			var target = new Date().setHours(tt[0], tt[1], 0, 0);
			if(target - new Date().getTime() < 0) target += 1000*60*60*24;
			Mindstack.keepjournal();
			var thing = Mindstack.stack.pop();
			thing = thing.slice(0);
			thing.push(new Timer('clock', target, thing[0]));
			Mindstack.stack.push(thing);
			return true;
		}
	},

	// Undo
	undo: function() {
		if(Mindstack.undoables.length < 1) return 'Cannot undo more';
		Mindstack.redoables.push(Mindstack.stack.slice(0));
		Mindstack.stack = Mindstack.undoables.pop().slice(0);
		return true;
	}
}


/*********************************************
* DICTIONARY: multiple entries to a function *
*********************************************/

var dictionary = [
	{ 'entry': ['\['],
		'fn': Mindstack.beginLoop		},

	{ 'entry': ['\]'],
		'fn': Mindstack.endLoop		},

	{ 'entry': ['BOMB', 'BOMB IT', 'PLANT A BOMB', 'PLANT BOMB', 'BOOM'],
		'fn': Mindstack.bomb			},

	{ 'entry': ['CLR', 'CLEAR', 'REMOVE ALL', 'DELETE ALL', 'START OVER'],
		'fn':	Mindstack.clr					},

	{ 'entry': ['DIA', 'DO IT AGAIN', 'ONE MORE', 'ONE MORE TIME', 'KEEP GOING'],
		'fn': Mindstack.dia					},

	{ 'entry': ['DUP', 'DUPLICATE'],
		'fn': Mindstack.dup					},

	{ 'entry': ['POP', 'DROP', 'DONE', 'I\'M DONE', 'FINISHED', 'POP IT', 'DROP IT'],
		'fn': Mindstack.pop					},

	{ 'entry': ['PUSH', 'I NEED TO', 'I\'M GONNA', 'I\'M GOING TO', 'NEED TO', 'GONNA', 'GOING TO'],
		'fn': Mindstack.push 				},

	{ 'entry': ['RDN', 'ROLLDOWN', 'ROLL DOWN'],
		'fn': Mindstack.rdn					},

	{ 'entry': ['REDO', 'CANCELCANCEL', 'DID MEAN IT'],
		'fn': Mindstack.redo				},

	{ 'entry': ['REV', 'REVERSE', 'DO A BARREL ROLL', 'UPSIDE DOWN'],
		'fn': Mindstack.rev					},

	{ 'entry': ['RMVT', 'REMOVE TIMER', 'ALARM OFF', 'OFF', 'DETACH TIMER'],
		'fn': Mindstack.rmvt				},

	{ 'entry': ['RUP', 'ROLLUP', 'ROLL UP'],
		'fn': Mindstack.rup					},

	{ 'entry': ['STOP', 'NO BOMB', 'STOP IT'],
		'fn': Mindstack.stop				},

	{ 'entry': ['SWAP'],
		'fn': Mindstack.swap				},

	{ 'entry': ['TIMIN', 'TIMER FOR', 'TIMER IN', 'TIMER AFTER', 'SET TIMER FOR', 'SET TIMER IN', 'ATTACH TIMER IN', 'ATTACH TIMER FOR', 'LET ME KNOW IN', 'LET ME KNOW AFTER', 'REMIND ME AFTER', 'REMIND ME IN', 'PUT TIMER IN', 'PUT TIMER AFTER'],
		'fn': Mindstack.timin				},

	{ 'entry': ['TIMON', 'TIMER ON', 'SET TIMER ON', 'ATTACH TIMER ON', 'LET ME KNOW ON', 'REMIND ME ON', 'SET TIMER ON', 'PUT TIMER ON'],
		'fn': Mindstack.timon				},

	{ 'entry': ['UNDO', 'CANCEL', 'OOPS', 'DIDN\'T MEAN IT', 'I DIDN\'T MEAN IT', 'MY BAD', 'F*** YOU', 'F***'],
		'fn': Mindstack.undo				}
]



/*********************************************
* TIMER CLASS                                *
*********************************************/

function Timer(type, settime, message) {
	this.whoami = 'Timer';		// To remember who am I when retrieved from local storage
	this.done = false;
	this.type = type;
	this.message = message;
	this.whenTriggered = this.defaultAlert;
	switch(type) {
		case 'timeout':
			this.targetTime = new Date().getTime() + settime;
			break;
		case 'clock':
			this.targetTime = settime;
			break;
		default:
			// throw('Exception creating new Timer object: unkown type ' + type + ' is handed');
	}
}

Timer.prototype.defaultAlert = function() {
	alert(this.message);
}

Timer.prototype.timeRemaining = function() {
	var r = this.targetTime - new Date().getTime();
	if(r <= 0) { this.done = true; return '00:00'; }
	var h = Math.floor(r/3600000);	r -= h*3600000;
	var m = Math.floor(r/60000);		r -= m*60000;
	var s = Math.floor(r/1000);			r -= s*1000;
	return (h > 0 ? h + ':' : '') + ('0' + m).slice(-2) + ':' + ('0' + s).slice(-2);
}

Timer.prototype.reconstruct = function(what) {
	this.type = what.type;
	this.targetTime = what.targetTime;
	this.message = what.message;
	if(what.whenTriggered) this.whenTriggered = what.whenTriggered;
}


/*********************************************
* BOMB CLASS                                 *
*********************************************/

function Bomb(bclock) {
	this.whoami = 'Bomb';
	this.clock = parseInt(bclock || Mindstack.bombclock);
	this.targetTime = new Date().getTime() + this.clock;
	this.alive = true;
	Mindstack.bombison = true;
}

Bomb.prototype.timeRemaining = function() {
	var r = this.targetTime - new Date().getTime();
	if(r <= 0) { this.alive = false; return 'KABOOM!'; }
	var m = Math.floor(r/60000);		r -= m*60000;
	var s = Math.floor(r/1000);			r -= s*1000;
	var cs = Math.floor(r/10);			r -= cs*10;
	return (m > 0 ? ('0' + m).slice(-2) + ':' : '') + (m > 0 ? ('0' + s).slice(-2) : s) + ':' + ('0' + cs).slice(-2);
}

Bomb.prototype.reconstruct = function(what) {
	this.targetTime = what.targetTime;
	this.clock = what.clock;
	this.alive = what.alive;
}

Bomb.prototype.destroy = function() {
	this.alive = false;
	Mindstack.bombison = false;
	clearTimeout(Mindstack.keeprunningtimer);
	Mindstack.run();
}