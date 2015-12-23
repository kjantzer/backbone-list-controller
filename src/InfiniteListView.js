/*
	Infinite List View
	
	creates <ul> with triggers for infinite scrolling
	
	@author Kevin Jantzer, Blacktone Audio Inc.
	@since 2012-11-06
	
	OPTIONS:
	{
		maxRows: 30,
		context: window,
		className: ''
	}
	
	USE
	listen for:
	"endReached" to trigger "addMore"
	"addOne" for what to do when "adding more"
	call:
	"addOne(view)" to add item to list

	
	REQUIRES
	• waypoint.js <http://imakewebthings.com/jquery-waypoints>
	
*/
InfiniteListView = Backbone.View.extend({

	tagName: 'ul',
	className: 'list',

	noResultsMsg: 'No Results',
	
	events: {
		'click .load-more': 'endReached'
	},
	
	initialize: function($renderTo, opts){
		
		this._views = [];
		this.lastRow = 0;
		this.enabled = true;
		
		this.opts = _.extend({
			maxRows: 30,
			context: window
		},opts);
		
		this.maxRows = this.opts.maxRows;
		
		this.$el.appendTo($renderTo);
		
		if(this.opts.className)
			this.$el.addClass(this.opts.className);
	},

	removeItem: function(indx, animated){
		
		animated = animated != undefined ? animated: true;

		var el = this.el.childNodes[indx];
		var view = this._views[indx];

		this._views.splice(indx, 1); // remove view from _views

		if( el ){

			this.lastRow--;

			view.remove(animated, this.attachWaypoint.bind(this)) // remove view, then reattach waypoint

		}else{
			console.warn('Could not find element to remove at index', indx);
		}
	},
	
	
	/*
		Add More
		
		this method requires the parent view to call it and pass a collection.
		the reasoning is this way the parent view can have the option to filter a collection before adding more
	*/
	addMore: function(collection){
	
		var i = this.lastRow;
		
		// dont try to add any if all are already loaded
		if(i >= collection.length && collection.length > 0){
			this.$endOfList.html('<p>End of list • '+collection.length+' results</p>')
			return;
		}
		
		
		if(!this.$endOfList){
			this.$endOfList = $('<li class="end-of-list clearfix"></li>').appendTo(this.$el);
		}
			
		this.$endOfList.html('').detach();
		
		
		// no results
		if( collection.length === 0){
			$('<p>'+this.noResultsMsg+'</p>').appendTo(this.$endOfList);
			this.$endOfList.appendTo(this.$el);
			return;
		}
			
		
		// try to load the next set of rows
		for( i; i < this.lastRow + this.maxRows; i++){
			
			var model = collection.at(i);
			
			// make sure the model exists
			if(model)
				this.trigger('addOne', model);
		}
		
		this.lastRow = i; // update the last row		
		
		if(i >= collection.length)
			$('<p>End of list • '+collection.length+' results</p>').appendTo(this.$endOfList);
		else
			$('<p class="load-more">Load more</p>').appendTo(this.$endOfList);
			//$('<p>Loading more results...</p>').appendTo(this.$endOfList);
			
		this.$endOfList.appendTo(this.$el);
		
		_.defer(this.attachWaypoint.bind(this)); // attach the infinite scroll waypoint
		
	},

	addOne: function(view){
		this._views.push( view );
		this.$el.append( view.render().el );
	},
	
	/*
		End Reached - when the end is reached, the parent view should call this.addMore
	*/
	endReached: function(){
		this.$endOfList.html('<p>Loading more results...</p>');
		this.trigger('endReached');
	},
	
	
	/*
		Attach Waypoint - binds $.waypoint to the endOfList <li>
	*/
	attachWaypoint: function(){
	
		// if the list is not enabled, dont attach a waypoint
		if(!this.enabled) return;
		
		// if this list isn't in the DOM, don't add a waypoint
		if( this.$el.parents('body').length == 0 ) return;
		
		var self = this;
		
		if( !this.context && _.isString(this.opts.context))
			this.context = document.querySelector(this.opts.context);

		if( this.__waypoint )
			this.__waypoint.destroy();

		this.__waypoint = new Waypoint({
			element: this.$endOfList[0],
			offset: function() {
				return self.context.offsetHeight //- Math.round((this.element.clientHeight*.75));
			},
			context: $(this.opts.context),
			handler: function(){
				this.destroy();
				self.endReached()
			}
		});
		
	},
	
	clear: function(){

		// http://stackoverflow.com/a/20961894/484780
		//_(this._views).invoke('cleanup'); // call remove on all views

		this.$el.html(''); // still clear this el in case other views were added on their own.
		this._views = [];
		this.lastRow = 0;
	},
	
	enable: function(){
		this.enabled = true;
	},
	
	disable: function(){
		this.enabled = false;
	}

});