/**
* Jesse Weisbeck's Crossword Puzzle (for all 3 people left who want to play them)
*
*/
(function($){
	$.fn.crossword = function(entryData) {
			/*
				Qurossword Puzzle: a javascript + jQuery crossword puzzle
				"light" refers to a white box - or an input
				"entry" refers to a single crossword problem
				DEV NOTES: 
				- This puzzle isn't designed to securely hide answerers. A user can see answerers in the js source
					- An xhr provision can be added later to hit an endpoint on keyup to check the answerer
				- The ordering of the array of problems doesn't matter. The position & orientation properties is enough information
				- Puzzle authors must provide a starting x,y coordinates for each entry
				- Entry orientation must be provided in lieu of provided ending x,y coordinates (script could be adjust to use ending x,y coords)
				- Answers are best provided in lower-case, and can NOT have spaces - will add support for that later
			*/
			
			var puzz = {}; // put data array in object literal to namespace it into safety
			puzz.data = entryData;
			
			// append clues markup after puzzle wrapper div
			// This should be moved into a configuration object
			this.after('<div id="puzzle-clues"><h2>Across</h2><ul id="across"></ul><h2>Down</h2><ul id="down"></ul></div>');
			
			// initialize some variables
			var tbl = ['<table id="puzzle">'],
			    puzzEl = this,
				cluesAcross = $('#across'),
				cluesDown = $('#down'),
				entries = [], 
				coords,
				entryCount = puzz.data.length,
				rows = [],
				cols = [],
				targetProblem,
				currVal,
				valToCheck,
				tabindex,
				arrowTarget,
				inputTmp,
				currentEntry = 1,
				clueLiEls,
				entryInputGroup;
		
			
			
			var puzInit = {
				
				init: function() {
					// Reorder the problems array numerically by position
					puzz.data.sort(function(a,b) {
						return a.position - b.position;
					});


					// Set keyup handlers for the 'entry' inputs that will be added presently
					puzzEl.delegate('input', 'keyup', function(e) {
						if (e.keyCode === 9) { // tabbing should always bounce back to clue lists
							return false;
						};

						// run check answer routine
						if ($(e.target).val() !== "") {
							puzInit.checkAnswer(parentEl);
						}
						
						pNav.arrowNav(e);
						
						e.preventDefault();
					});

					// tab navigation handler setup
					$('body').delegate('li,input', 'keydown', function(e) {
						if (e.keyCode === 9) {
							pNav.tabNav(e);
						}
						
					});


					// highlight the letter in selected 'light' - better ux than making user highlight letter with second action
					puzzEl.delegate('#puzzle', 'click', function(e) {
						$(e.target).focus();
						$(e.target).select();
					});
					
					// let's roll ...
					puzInit.calcCoords();
					puzInit.buildTable();
					puzInit.buildEntries();
										
				},
				
				/*
					- Given beginning coordinates, calculate all coordinates for entries
					- Builds clue markup and puts screen focus on the first one
				*/
				calcCoords: function() {
					/*
						Given beginning coordinates, calculate all coordinates for entries
					*/
					for (var i = 0, p = entryCount; i < p; ++i) {		
						// set up array of coordinates for each problem
						entries.push(i);
						entries[i] = [];

						for (var x=0, j = puzz.data[i].answer.length; x < j; ++x) {
							entries[i].push(x);
							coords = puzz.data[i].orientation === 'across' ? "" + puzz.data[i].startx++ + "," + puzz.data[i].starty + "" : "" + puzz.data[i].startx + "," + puzz.data[i].starty++ + "" ;
							entries[i][x] = coords; 
						}

						// while we're in here, add clues to DOM!
						$('#' + puzz.data[i].orientation).append('<li tabindex="1" data-entry="' + puzz.data[i].position + '" data-orientation="' + puzz.data[i].orientation + '">' + puzz.data[i].position + ". " + puzz.data[i].clue + '</li>'); 
					}				
					
					// immediately put mouse focus on first clue
					clueLiEls = $('#puzzle-clues li');
					clueLiEls[0].focus();

					// Calculate rows/cols by finding max coords of each entry, then picking the highest
					for (var i = 0, p = entryCount; i < p; ++i) {
						for (var x=0; x < entries[i].length; x++) {
							cols.push(entries[i][x].split(',')[0]);
							rows.push(entries[i][x].split(',')[1]);
						};
					}

					rows = Math.max.apply(Math, rows) + "";
					cols = Math.max.apply(Math, cols) + "";
					
				},
				
				buildTable: function() {
					/*
						Build the table markup
					*/	
					for (var i=1; i <= rows; ++i) {
						tbl.push("<tr>");
							for (var x=1; x <= cols; ++x) {
								tbl.push('<td data-coords="' + x + ',' + i + '"></td>');		
							};
						tbl.push("</tr>");
					};

					tbl.push("</table>");
					puzzEl.append(tbl.join(''));
				},
				
				/*
					Builds entries into table
					- Adds coords class to <td> cells
					- Adds tabindexes to <inputs> 
				*/
				buildEntries: function() {
					var puzzCells = $('#puzzle td'),
						light,
						$groupedLights,
						tabindex;

					for (var x=0, p = entryCount; x < p; ++x) {
						for (var i=0; i < entries[x].length; ++i) {
							light = $(puzzCells +'[data-coords="' + entries[x][i] + '"]');
							if($(light).empty()){
								//tabindex = 'tabindex="' + x*i +'"';
								//tabindex = i === 0 ? 'tabindex="' + x + '"' : '';
								tabindex = 'tabindex="-1"';
								$(light)
									.addClass('entry-' + (x+1))
									.append('<input maxlength="1" val="" type="text" ' + tabindex + ' />');
							}
						};
						

					};	
					
					// Put entry number in first 'light' of each entry, skipping it if already present
					for (var i=1, p = entryCount; i <= p; ++i) {
						$groupedLights = $('.entry-' + i);
						if(!$('.entry-' + i +':eq(0) span').length){
							$groupedLights.eq(0)
								.append('<span>' + puzz.data[i-1].position + '</span>');
						}
					}	
					
					util.highlightEntry(1);
										
				},
				
				checkAnswer: function(light) {
					var classes = util.classSplit(light);
					if(!classes){
						return false;
					}
					for (var i=0, c = classes.length; i < c; ++i) {
						targetProblem = (classes[i].split('-')[1])-1;
						valToCheck = puzz.data[targetProblem].answer.toLowerCase();
						
						currVal = $('.entry-' + (targetProblem+1) + ' input')
							.map(function() {
						  		return $(this).val().toLowerCase();
							})
							.get()
							.join('');

						if(valToCheck === currVal){
							for (var x=0; x < entries[targetProblem].length; ++x) {
								$('td[data-coords="' + entries[targetProblem][x] + '"]')
									.addClass('done');
									//.children('input')
									//.prop('disabled', true);		
							};
						}

					};
				}
								
			
			} // end puzInit object
			

			var pNav = {
				
				arrowNav: function(e) {	
					var el = $(e.target);
					/*
						left, right, up and down keystrokes
					*/
					switch(e.which) {
						case 39:
							// left arrow
							arrowTarget = 	el.parent().next().find('input');
							arrowTarget.select();
							break;

						case 37:
							// right arrow
							arrowTarget = el.parent().prev().find('input');
							arrowTarget.select();							
							break;

						case 40:
							// down arrow
							
							arrowTarget = util.classSplit($(e.target).parent().prop('class'));

							targ = el.parents().next('tr').find(' td.entry-' + prev + ' input');																
							targ.focus()
							targ.select();
							break;

						case 38:
							// up arrow

							break;

						default:
						break;
					}
				},
				
				/*
					Tab navigation moves a user through the clues <ul>s and highlights the corresponding entry in the puz table
				*/
				tabNav: function(e) {
					currentEntry = currentEntry === clueLiEls.length ? 0 : currentEntry;
					
					entryInputGroup ? entryInputGroup.css('backgroundColor', '#fff') : null;
					util.highlightEntry($(e.target).data('entry'));
										
					clueLiEls[currentEntry].focus();
					
					++currentEntry;
					e.preventDefault();
						
				}
				
								
			} // end pNav object

			
			var util = {
				classSplit: function(td) {
					// takes a <td> cell as input, splits the classes returns them as an array
					return td.prop('class').split(' ');
				},
				
				classCount: function(td	) {
					// takes a <td> cell as input, splits the classes returns the count
					return td.prop('class').split(' ').length;					
				},
				
				highlightEntry: function(entry) {
					entryInputGroup = $('.entry-' + entry + ' input');
					entryInputGroup[0].focus();
					entryInputGroup[0].select();
					console.log(entry);
					
					console.log($(entryInputGroup).eq(0).parent().find('span').html());
					
					
					entryInputGroup.css('backgroundColor', '#bbb');
					
				}
				
			} // end util object

				
			puzInit.init();
	
							
	}
	
})(jQuery);