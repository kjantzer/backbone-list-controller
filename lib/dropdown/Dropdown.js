/*
	Dropdown view
	
	creates a dropdown on a specified element and 
	renders whatever backbone view was given
	
	EXAMPLES:
		
		$btn.dropdown(view, [options])
		
		$btn.dropdown('This would be tooltip text', {align: 'bottom'})
	
	
	@param "view" - can be:
		- function (which should return one of the views below)
		- text (creates "tooltip")
		- array (which generates a menu)
		- Backbone.View
		- Backbone.Model (prints model.templateData - more for development purposes)
		- Book.Record (shows "book preview" - see Popover.Views.BookPreview class)
		- Person.Record (same concept as Book.Record, but not yet coded)

		NOTE: see determineView() method for auto detecting what view should be used; add to it as you see fit
		
	@param "options" - see Dropdown.defaultOpts below
		
	
	@author Kevin Jantzer, Blackstone Audio
	@since 2012-12-14
	
	https://github.com/kjantzer/backbonejs-dropdown-view
	
*/

var Dropdown = Backbone.View.extend({

	tagName: 'div',
	
	className: 'dropdown',
	
	arrowW: 10,
	
	defaultOpts: {
		w: 200,
		align: 'bottomRight',	// bottomLeft, bottom, bottomRight, leftTop, left, leftBottom, etc, also "auto"
		autoCenter: false,		// centers dropdown to renderTo el with the arrow as the center point
		alignVerticalToParent: false,
		style: 'default',		// toolbar - DEPRECATED, use theme
		theme: 'default',		// 'toolbar', 'select'
		closeOn: 'body',		// body, el
		closeOnEsc: true,
		view: null, 			// view to be rendered ( see @param "view" above for documentation)
		trigger: 'click',		// click, dbclick, hover, delay, none (will open upon init and be removed when closed)
		delay: 1000,			// delay duration when using trigger='delay'
		openOnInit: false,		// dropdown will automatically open when initialized
	},
	
	defaultEvents: {
		'click': 'stopPropagation'
	},
	
	initialize: function(opts){
		
		this.options = _.extend({}, this.defaultOpts, opts);
		this.events = _.extend({}, this.defaultEvents, this.events||{});
		
		// setup dropdown states
		this.isOpen = false;
		
		
		// check for required parameters
		if( !this.options.renderTo){
			console.error('Dropdown.js: You need to specify an element to "renderTo"');
			return false;
		}else if( !this.options.view ){
			console.error('Dropdown.js: You don’t have a view to load in the dropdown');
			return false;
		}
		
		
		// close
		if(this.options.closeOn == 'body'){
			document.body.addEventListener('click', this.deferClose.bind(this), true);
			this.el.addEventListener('click', this.stopDeferClose.bind(this), true);
		}
		
		if( this.options.closeOnEsc )
			document.body.addEventListener('keyup', this.closeOnEsc.bind(this), false);
		
		if( this.options.trigger === 'delay' )
			this.bindDelayedTrigger();
		if( this.options.trigger === 'hover' )
			this.bindHoverTrigger();
		else if( this.options.trigger !== 'none')
			this.options.renderTo[0].addEventListener(this.options.trigger, this.toggle.bind(this), false);
		
		this.setup()
	
		// when the dropdown is opened, render the view
		this.on('dropdown:opened', this.render, this);
	
		// listen for the view telling us to close
		this.view.on('dropdown:close', this.close, this);
		this.view.on('dropdown:open', this.open, this);
		
		if( this.options.trigger === 'none' || this.options.openOnInit )
			_.defer(this.open.bind(this));
		
	},
	
	remove: function(){
		this.unbindTrigger();
		
		this.off('dropdown:opened', this.render, this);
		this.view.off('dropdown:close', this.close, this);
		this.view.off('dropdown:open', this.open, this);
		
		this.$el.remove();
	},
	
	unbindTrigger: function(){
		
		if( this.options.trigger === 'delay' )
			this.unbindDelayedTrigger();
		if( this.options.trigger === 'hover' )
			this.unbindHoverTrigger();
		else if( this.options.trigger !== 'none')
			this.options.renderTo.unbind(this.options.trigger, this.toggle.bind(this));
	},
	
	bindHoverTrigger: function(){
		this.options.renderTo.bind('mouseenter', this.open.bind(this));
		this.options.renderTo.bind('mouseleave', this.delayEnd.bind(this));
	},
	
	unbindHoverTrigger: function(){
		this.options.renderTo.unbind('mouseenter', this.open.bind(this));
		this.options.renderTo.unbind('mouseleave', this.delayEnd.bind(this));
	},
	
	bindDelayedTrigger: function(){
		this.options.renderTo.bind('mouseenter', this.delayStart.bind(this));
		this.options.renderTo.bind('mouseleave', this.delayEnd.bind(this));
	},
	
	unbindDelayedTrigger: function(){
		this.options.renderTo.unbind('mouseenter', this.delayStart.bind(this));
		this.options.renderTo.unbind('mouseleave', this.delayEnd.bind(this));
	},
	
	delayStart: function(){
		clearTimeout(this.closeTimeout);
		this.delayTimeout = setTimeout(this.open.bind(this), this.options.delay)
	},
	
	delayEnd: function(){
		clearTimeout(this.delayTimeout);
		
		this.closeTimeout = setTimeout(this.close.bind(this), 300)
	},
	
	setup: function(){
	
		// add the dropdown to the DOM, set styles
		this.$el.appendTo(this.options.renderTo);
		this.$el.width(this.options.w+'px');
		this.$el.addClass('align-'+this.options.align)
		this.$el.addClass('style-'+this.options.style)
		this.$el.addClass('theme-'+this.options.theme)
		
		this.options.renderTo.addClass('has-dropdown')
		
		// append the inner view to the dropdown
		this.view = this.options.view;
		
		this.determineView();
		
	},
	
	determineView: function(){
		
		var view = this.view;
		
		if( _.isFunction(view) ) this.view = view = view();
		
		// if the given view is a string, then load that string with a "default dropdown view"
		if(_.isString(view) || view instanceof jQuery)
			this.view = new DropdownTextView({html:this.view});
			
		else if(_.isArray(view))
			this.view = new DropdownMenuView(view, this.options);
		
		else if( typeof Book !== 'undefined' && view instanceof Book.Record )
			this.view = new Popover.Views.BookPreview({model: view });
			
		else if( typeof Person !== 'undefined' && view instanceof Person.Record )
			this.view = new Popover.Views.PersonPreview({model: view});
		
		else if( view instanceof Backbone.Model )
			this.view = new Popover.Views.ModelPreview({model: view});
	},
	
	render: function(){
		this.view.render(); // tell the inner view to render itself
		this.$el.append( this.view.el );
	},
	
	stopPropagation: function(e){
			
		e.stopPropagation();
		e.stopImmediatePropagation();
		//e.preventDefault();
	},
	
	// toggle open and close
	toggle: function(e){
	
		if(this.isOpen !== true)
			this.open(e);
		else
			this.close(e);	
	},
	
	open: function(e){
		
		clearTimeout(this.closeTimeout);
		clearTimeout(this.deferCloseTimeout)
		
		if( e && e.stopPropagation )
			e.stopPropagation();
		
		if(this.isOpen) return; // don't do anything if we are already open
	
		this.isOpen = true;
		this.options.renderTo.addClass('dropdown-open')
		this.$el.addClass('open');
		this.trigger('dropdown:opened');
		this.view.trigger('dropdown:opened'); // tell the inner view we've opened
		
		this.adjustPosition();
	},
	
	close: function(e){
	
		if(!this.isOpen) return; // don't do anything if we are already closed
	
		this.isOpen = false;
		this.options.renderTo.removeClass('dropdown-open')
		this.$el.removeClass('open');
		this.trigger('dropdown:closed');
		this.view.trigger('dropdown:closed'); // tell the inner view we've closed
		
		if( this.options.trigger === 'none' ){
			this.options.renderTo.removeClass('has-dropdown')
			_.defer(this.remove.bind(this))
		}
		
		if( e && e.stopPropagation )
			e.stopPropagation();
	},
	
	closeOnEsc: function(e){
		if(e.which == 27) this.deferClose();
	},
	
	deferClose: function(){
		this.deferCloseTimeout = setTimeout(this.close.bind(this), 0);
	},
	
	stopDeferClose: function(e){
		clearTimeout(this.deferCloseTimeout)
		//e.stopPropagation();
	},
	
	adjustPosition: function(){
		
		if(this.options.align === 'left' || this.options.align === 'right')
			this.alignVerticalMiddle();
			
		else if(this.options.align === 'top' || this.options.align === 'bottom')
			this.alignHorizontalMiddle();
		
		else if(this.options.align === 'auto')
			this.autoAlign();
			
		else
			this.autoCenter();
			
		if( this.options.alignVerticalToParent ){
			this.el.style.top = this.options.renderTo[0].offsetTop;
			
			if( this.options.align == 'auto' ){
				this.el.style.top = this.options.renderTo[0].offsetTop + this.options.renderTo[0].offsetHeight;
			}
		}
	},
	
	alignVerticalMiddle: function(){
		
		var h = this.$el.outerHeight();
		
		this.$el.css({
			top: '50%',
			marginTop: '-'+(h/2)+'px'
		});
		
	},
	
	alignHorizontalMiddle: function(){
		
		var w = this.$el.outerWidth();
		
		this.$el.css({
			left: '50%',
			marginLeft: '-'+(w/2)+'px'
		});
		
	},
	
	autoAlign: function(){
	
		if( this.align )
			this.$el.removeClass( 'align-'+this.align );
		
		var right = this.rightDist();
		var bottom = this.bottomDist();
		
		var align = 'bottomRight';
		
		if( right < 0 && bottom < 0 )
			align = 'topLeft'
		
		else if( right < 0 )
			align = 'bottomLeft'
		
		else if( bottom < 0 )
			align = 'topRight'
		
		this.align = align;
		
		this.$el.addClass('align-'+align)
		
		this.autoCenter();
		
	},
	
	rightDist: function(){
		return window.innerWidth - this.el.getBoundingClientRect().right;
	},
	
	bottomDist: function(){
		return window.innerHeight - this.el.getBoundingClientRect().bottom;
	},
	
	// centers dropdown to renderTo el with the arrow as the center point
	autoCenter: function(){
	
		if( this.options.autoCenter !== true ) return;
	
		adjustToCenterArrow = -8 + (this.options.renderTo.outerWidth()/2) - (this.arrowW/2) + 'px'
		
		this.el.style.removeProperty('left')
		this.el.style.removeProperty('right')
		
		if( /Left$/.test(this.align) )
			this.$el.css('right', adjustToCenterArrow)
		else
			this.$el.css('left', adjustToCenterArrow)
	}
	
})






var DropdownTextView = Backbone.View.extend({

	className: 'dropdown-text-view',
	
	initialize: function(){
	
		var html = this.options.html;
	
		if( !(html instanceof jQuery ) && !/^</.test(html) )
			html = '<p>'+html+'</p>';
	
		this.$el.html( html );
	}
})


var DropdownMenuView = Backbone.View.extend({

	tagName: 'div',
	
	className: 'dropdown-menu-view',
	
	initialize: function(menu, opts){
		
		this.menu = menu;
		
		this.options = _.extend({
		
			selected: null,			// set to value of one of the menu items and it will be selected
			search: true,			// turns search on if more values than threshold
			searchMinScore: .7,
			searchThreshold: 20
			
		}, opts || {});
		
		this.$el.addClass('theme-'+this.options.theme)
		
		if( this.options.search != false && menu.length > this.options.searchThreshold ){
			$('<div class="search-bar"></div>')
				.appendTo(this.$el)
				.append( this.$search = $('<input type="text" class="search" placeholder="Filter...">').on('keyup', this.onSearch.bind(this)) )
		}
		
		this.$ul = $('<ul class="dropdown-menu-view"></ul>').appendTo(this.$el);
		
		this.addItems();
		
	},
	
	render: function(){
		this.delegateEvents();
		_.defer(this.focus.bind(this));
		return this;
	},
	
	onSearch: function(e){
		this.term = e.currentTarget.value;
		this.addItems();
	},
	
	focus: function(){
		if(this.$search) this.$search.focus();
	},
	
	addItems: function(){
		this.$ul.html('');
		_.each(this.menu, this.addItem, this);
	},
	
	addItem: function(item){
	
		var $el = this.$ul ? this.$ul : this.$el;
	
		if( item && (item === 'divider' || item.divider) && !this.term )
			return this.addDivider(item);
		
		if( _.isString(item) )
			item = {
				label: item,
				val: item
			}
			
		if( this.term && _.score(item.label||'', this.term) < this.options.searchMinScore)
			return;
		
		item = _.extend({
			label: 'No Label',
			className: '',
			permission: false // dont need permission... add "key" to limit (see User.can())
		},item)
		
		// user doesn't have permission to click this menu
		if( item.permission && User.cannot(item.permission) )
			return;
		
		var className = item.className;
		
		if( this.options.theme == 'select' )
			className += ' icon-plus';
			
		if( this.options.selected !== null
		&& this.options.selected !== undefined
		&& (this.options.selected == item.val ||  _.contains(this.options.selected, item.val)) )
			className += 'selected';
		
		var $li = $('<li data-val="'+item.val+'" class="'+className+'">'+item.label+'</li>').appendTo($el);
		
		if(item.icon)
			$li.addClass('icon-'+item.icon);
			
		if(item.border)
			$li.css('border-right', 'solid 4px '+this.borderColor(item.border));
		
		if( item.onClick || this.options.onClick )
		$li.click(_.bind(function(){
			
			if(item.onClick === 'trigger')
				this.trigger('click', item, $li);
			else if( item.onClick )
				item.onClick(item, $li);
			else if( this.options.onClick )
				this.options.onClick(item, $li);
			
			this.trigger('dropdown:close')
			
		},this));
		
		
		if( item.dropdown && item.dropdown.view){
			item.dropdown.alignVerticalToParent = true;
			$li.dropdown(item.dropdown.view, item.dropdown);
		}
		
		if( item.uploader ){
			item.uploader.button = $li;
			$li.css('position','relative');
			item.uploader.obj = new Uploader(item.uploader);
		}
		
	},
	
	addDivider: function(item){
		
		var $el = this.$ul ? this.$ul : this.$el;
		
		if( item.divider )
			$('<li class="label-divider">'+item.divider+'</li>').appendTo($el);
		else
			$('<li class="divider"></li>').appendTo($el);
	},
	
	borderColor: function(color){
		switch(color){
			case 'gray': return '#ccc'; break;
			case 'blue': return '#2981E4'; break;
			case 'red': return '#b94a48'; break;
			case 'yellow': return '#f0cb37'; break;
			case 'green': return '#468847'; break;
			default: return color; break
			
		}
	}
	
})


var Popover = {
	Views: {}
}



Popover.Views.ModelPreview = Backbone.View.extend({
	
	className: 'model-preview',
	
	render: function(){
		if( this.template )
			this.$el.html( _.template(this.template, this.model.templateData()) )
		else
			this.$el.html( this.printObject() )
			
		
		if( this.finishRender )
			this.finishRender();
	},
	
	printObject: function(){
		var obj = this.model.templateData()
		var output = '';
		for (property in obj) {
		  output += '<b>'+property + ':</b> ' + obj[property]+'; <br>';
		}
		return output;
	}
	
})

Popover.Views.BookPreview = Popover.Views.ModelPreview.extend({

	className: 'model-preview book-preview',

	template: $('#popover-book-preview').html(),
	
	events: {
		'click .related-books': 'relatedBooks',
		'click a[href]': 'goToLink'
	},
	
	render: function(){
	
		if( this.model.get('is_approved') == null ){
			this.model.fetch({success: this.render.bind(this)});
			return;
		}
	
		this.$el.html( _.template(this.template, this.model.templateData()) )
		
		// render products if we have them already
		if( this.model.get('products').length > 0)
			this.renderProducts();
			
		// fetch products from DB
		this.model.get('products').fetch({success: this.renderProducts.bind(this)});
	},
	
	renderProducts: function(){
		
		var id = this.model.id,
			products = this.model.get('products').active(),
			$div = this.$('.products');
		
		$div.html('<p class="label-divider">'+(_.plural('[num] Product{s}', products.length))+' <a href="/book/'+id+'/products" class="right">edit</a></p>');
		
		_.each(products, function(p){
			
			var label = p.get('label'),
				isbn = p.get('isbn_13') || '';
			
			$('<p class="product divider dashed"><span class="p-label">'+label+'</span> <span class="cursive right isbn">'+isbn+'</span></p>')
				.appendTo($div)
				.find('.p-label').popover(p.quickView(), {w: 185, align: 'rightTop'})
			
			
		})
	},
	
	relatedBooks: function(event){
		this.model.relatedBooks();
	},
	
	goToLink: function(e){
		_.goToLink(e);
	}

});

Popover.Views.PersonPreview = Popover.Views.ModelPreview.extend({

});




/*
	jQuery Plugin
*/
$.fn.dropdown = function( view, opts ) {  

	opts = opts || {};

	return this.each(function() {
		
		$(this).data('dropdown', new Dropdown(_.extend({renderTo: $(this), view:view}, opts)) );
	
	});

};


/*
	Popover is just a dropdown with some defaults
*/
$.fn.popover = function( view, opts ) {  

	opts = _.extend({
		
		trigger: 'delay',
		align: 'auto',
		w: 350
		
	}, opts || {});

	return this.dropdown(view, opts)

};


/*
	Book Preview Popover
*/
$.fn.bookPreviewPopover = function( idOrModel, opts ) {  

	opts = opts || {};

	var model = null;
	
	// were we given a Book.Record model?
	if( idOrModel instanceof Book.Record )
		model = idOrModel;
		
	// were we just given a model (still has book info, but not actually a Book.Record)...then find the Book.Record
	else if( idOrModel instanceof Backbone.Model && idOrModel.id )
		model = Book.Record.findOrCreate({id:idOrModel.id});
	
	// or was it an ID (number) that we were given?
	else if( _.isNumber(parseInt(idOrModel)) )
		model = Book.Record.findOrCreate({id:idOrModel});
	
	// if no model found, throw error and stop
	if( !model )
		return console.error('!! $.bookPreviewPopover: could not resolve “idOrModel” to a Book.Record: ', idOrModel)

	return this.popover(model, opts)

};



/*
	Person Preview Popover
*/
$.fn.personPreviewPopover = function( idOrModel, opts ) {  

	opts = opts || {};

	var model = null;
	
	// were we given a Person.Record model?
	if( idOrModel instanceof Person.Record )
		model = idOrModel;
		
	// were we just given a model (still has book info, but not actually a Person.Record)...then find the Person.Record
	else if( idOrModel instanceof Backbone.Model && idOrModel.id )
		model = Person.Record.findOrCreate({id:idOrModel.id});
	
	// or was it an ID (number) that we were given?
	else if( _.isNumber(parseInt(idOrModel)) )
		model = Person.Record.findOrCreate({id:idOrModel});
	
	// if no model found, throw error and stop
	if( !model )
		return console.error('!! $.personPreviewPopover: could not resolve “idOrModel” to a Person.Record: ', idOrModel)

	return this.popover(model, opts)

};

	