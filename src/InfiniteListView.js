/*
	Infinite List View
	
	creates <ul> with triggers for infinite scrolling
	
	@author Kevin Jantzer, Blacktone Audio Inc.
	@since 2012-11-06
	
	
	USE	- listen for:
	"endReached" to trigger "addMore"
	"addOne" for what to do when "adding more"
	
	REQUIRES
	• waypoint.js <http://imakewebthings.com/jquery-waypoints>
	
*/
InfiniteListView = Backbone.View.extend({

	tagName: 'ul',
	
	className: 'list',
	
	initialize: function($renderTo, opts){
		
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
	
	
	/*
		Add More
		
		this method requires the parent view to call it and pass a collection.
		the reasoning is this way the parent view can have the option to filter a collection before adding more
	*/
	addMore: function(collection){
	
		var i = this.lastRow;
		
		// dont try to add any if all are already loaded
		if(i >= collection.length && collection.length > 0){
			this.$endOfList.html('End of list • '+collection.length+' results')
			return;
		}
		
		
		if(!this.$endOfList){
			this.$endOfList = $('<li class="end-of-list clearfix"></li>').appendTo(this.$el);
		}
			
		this.$endOfList.html('').detach();
		
		
		// no results
		if( collection.length === 0){
			$('<p>No Results</p>').appendTo(this.$endOfList);
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
			$('<p>Loading more results...</p>').appendTo(this.$endOfList);
			
		this.$endOfList.appendTo(this.$el);
		
		this.attachWaypoint(); // attach the infinite scroll waypoint
		
	},
	
	/*
		End Reached - when the end is reached, the parent view should call this.addMore
	*/
	endReached: function(){
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
		
		this.$endOfList.waypoint('destroy');
		this.$endOfList.waypoint({
			offset: function() {
				return self.context.offsetHeight - $(this).outerHeight();
			},
			onlyOnScroll: true,
			context: this.opts.context,
			handler: _.bind(this.endReached, this)
		});
		
	},
	
	clear: function(){
		this.$el.html('');
		this.lastRow = 0;
	},
	
	enable: function(){
		this.enabled = true;
	},
	
	disable: function(){
		this.enabled = false;
	}

});