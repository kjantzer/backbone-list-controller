/*
	Book List Item

	This is for use with ListController when showing a list of books

	@author Kevin Jantzer
	@since 2014-12-10
*/

BSA.Views.BookListItem = Backbone.View.extend({

	bookOverviewOpts: {},			// override opts for the BookOverview view
	bookOverviewID: function(){		// the ID used for BookOverview
		return this.model.id;
	},

	tagName: 'li',
	removeOnCleanup: true,
	_className: 'clearfix',

	// overview opts - dont override these, use `bookOverviewOpts` instead
	__bookOverviewOpts: {
		fetchOnce: true,
		showHeader: false,
		showRelated: true,
		maxH: 'none'
	},

	__events: {
		'click': '__onClick'
	},

	// override the default backbone constructor
	constructor: function(data, opts){

		// extend with default events
		this.events = _.extend({}, this.events||{}, this.__events);
		this.className = (this.className||'') +' '+this._className;
		
		// call normal backbone constructor
		Backbone.View.prototype.constructor.call(this, data);
	},

	render: function(){
		
		this.renderTemplate();

		this.renderOverview();

		this.delegateEvents();

		return this;
	},

	renderOverview: function(){

		// if book overview loaded, add to DOM
		if( this.subview('book-overview') )
			this.$el.append(this.subview('book-overview').render().el);
		
		// if user is holding cmd/ctrl while rendering, toggle on overview
		//else if( app.metaKey )
		//	this.toggleOverview() // wierd behavior when selecting "multiple filters"
	},

	refresh: function(opts){

		opts = _.extend({}, opts);
		var self = this;
		var onSuccess = opts.success;
		opts.success = function(){

			self.spin(false);

			if( onSuccess )
				onSuccess.apply(self, arguments)
		}

		this.spin();
		this.model.fetch(opts)
	},

	spin: function(doSpin){
		this.$el.spin(doSpin)
	},

	inDOM: function(){
		return this.el.parentElement != null;
	},

	__onClick: function(e){

		// developer tool (ctrl+shift+click = make model globally accessible)
		if( _.metaKey() && e.shiftKey && User.inGroup('Role:Developer') ){
			window.m = this.model;
			window.li = this;
			console.info('This row’s view and model are accessible as global: `li` & `m`');
			return;
		}

		// cmd/ctrl + click? (and didn't click on an <a> tag)
		if( _.metaKey() && e.target.tagName != 'A' ){
			this.toggleOverview()
		}
	},

	toggleOverview: function(){

		var opts = _.extend({}, this.__bookOverviewOpts, this.bookOverviewOpts, {id: this.bookOverviewID()});

		var view = this.subview('book-overview');

		if( view ){
			view.remove();

		}else{

			var view = this.subview('book-overview', new BSA.Views.BookOverview(opts))
			this.$el.append(view.render().el);
		}
	}
})