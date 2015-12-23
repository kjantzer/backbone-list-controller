/*
	List Controller --- Also see "DBListController"
	
	@author Kevin Jantzer
	@since 2013-04-16
	
	
	Assumes this.collection = SortableCollection
	
	This class will take care of rendering a top bar with controls
	for filtering, sorting and searching/filtering by typed term
	in addition to rendering the content data into an infinite list
	
	To add sorting and filtering options add the proper attributes:
	
	this.sorts: [
		{label: 'ID', val: 'id'},
		{label: 'Title', val: 'title'}
	]
	
	this.filters: {
		
		'partner': {
			label: 'Partner', 		// optional label for this filter; if not set, the key, in this case "partner" will be used.
			values: [									// "values" are the options for this filter
				{label: 'Any Partner', val: ''},
				'divider',								// "values" is given to Dropdown.js so the same options apply
				{label: 'Blackstone Audio', val: '1'},
				{label: 'Blackstone Audio', val: '2'}
			],
			w: 120, 					// optionally choose to set the width of the dropdown
			filterBy: function(model, filterVal, filterKey){
				// the logic for how to filter the collection by "partner"
				// note: not needed if the collection filter is set to db:true (filtering will happen server-side)
			},
			multi: false,	// if set to true, multiple values can be selected by holding "cmd/ctrl"
			
			// these two params are useful when you want to apply programmatically, but don't immeditely know what filter options are available
			// see "recent proofing changes" feature for first use
			manual: true,			// if set, this filter will not show as an "filter" to select. this is useful for setting filters programmatically
			manualVal: 'Partner'	// when manual, the val displayed in active filter "button" is value saved in collection...unless this is set
		}
		
	}
	
	NOTE: if this view has sorts or filters, the SortableCollection may also need these
	sorts and/or filters specified. Collection sorts are optional, but filters are required to save in local storage;
	See SortableCollection for details.
	
	For special functionality with user typed search/filter terms, add "filterContexts";
	
	this.filterContexts = {
		"flagged": function(){}
	}

	METHODS
	Many of the methods are prefixed with an underscore (_) to symbolize being "private" to the
	class - they shouldn't really be called from outside this class

	Some common methods that may be used
	changeFilter(key, val, optional)
	toggleFilter(key, val, optional)
*/

ListController = Backbone.View.extend({

	_className: 'list-controller',

	//listView: 'Path.To.BackboneView',
	//listViewDivider: function(model){ return model.label(); }, // or string of method name `label`
	//listViewData: function(){ return {} }, // if this is specified, the data will be initialzed with the list view
	maxRows: 30,
	listStyle: 'simple', 			// plain, simple, card
	reuseListViews: false,			// eventually will default to true, but event binding can need extra work
	displayList: true,				// this means this view will load the collection into an infinite list
	scrollContext: '#main .inner',	// the wrapping element that triggers infinite scrolling

	noResultsMsg: 'No Results',		// string or function
	
	filter: true,					// provide a "filter" input to make searches
	filterMinScore: .7,				// minimum score for a model to pass filter
	filterDelay: 200,				// (ms)
	filterPlaceholder: 'Filter...',
	filterInputStyle: 'right auto-hide',
	filterDropdownW: 120, 			// width of "apply filter" dropdown menu

	// hmmm... I think this shouldn't be used now...
	// filterResultCollection should be overridden to a custom Collection
	// which would contain the comparator....(need to confirm this though)
	filterComparator: null, 		// set to sort the filtered collection

	fetchOnRender: false,			// list collection will be fetched upon rendering the list
	refreshBtn: false,				// will show button for manual refresh
	allowFilterQueueing: true,

	viewBtn: false,
	defaultView: 'list', // list, grid, compare
	compareViewLimit: null,
	
	// note: the model for this collection switcher should contain a "switcherCollection" method
	//collectionSwitcher: null,		// allows to switch the collection being rendered by using the filters
	//collectionSwitcherKey: null,


	//renderTop: function(){}, // override this to hook into the top bar render

/*
	Sorts - see SortableCollection for how sorting is applied
*/
	sorts: [
		//{label: 'ID', val: 'id'},
		//{label: 'Title', val: 'title'}
	],

/*
	Filter Contexts - filter collection on different things based on what the user types
	
	a 'default' context is required;
	override this method to add extra filter contexts; if you do not override this method
	filtering will always return all results
	
	if a context key ends with ":" the text following will be returned as a "term"
	
	ex: 'author:' : function(term, model){}  // term will = "john" when searching "author:john"
*/
	filterContexts: {
		//'default': function(term, model){} // if no default is given, this._defaultFilterContext will be used
	},

/*
	Filter Result Collection - defaults to regular backbone collection
	
	override this method to return filtered result as a different collection
*/
	filterResultCollection: function(filteredModels){
		return new Backbone.Collection(filteredModels);
	},



/* ======================================================================================================================================
	Shouldn't need to override the methods below
*/

	// override the default backbone constructor
	constructor: function(data, opts){
		
		// make sure setup has happened, but wait until after initialize()
		// note: this might be better: https://gist.github.com/fiznool/5720342
		this.checkSetupTimeout = setTimeout(this.__checkSetup.bind(this), 0);
		
		// call normal backbone constructor
		Backbone.View.prototype.constructor.call(this, data);
	},
	
	// if we get to this method, it means setup was never called, so call it now
	__checkSetup: function(){
		
		// make sure setup() hasn't been called
		if( this.checkSetupTimeout )
			this.__setup()
	},

	__events: {
		'keyup input.filter' : 'filterCollectionFromInput',
		'click a.change-desc': 'changeDesc',
		'click .manual-refresh': 'manualRefresh',
		'click .apply-queued-filters': 'applyQueuedFilters',
	},
	
	__listenerEvents: [
		['sort:change', '_addAll'],
		['sort:change', '_renderSortSelect']
	],

	// called automatially if not called in initialize method
	__setup: function(){
		
		clearTimeout(this.checkSetupTimeout);
	
		this.events = _.extend({}, this.events||{}, this.__events);

		if( this.setupFilters )
			this.setupFilters();

		this.$el.addClass(this._className); // make sure ListController always has its class name
	
		this.$top = $('<div class="filter-bar top clearfix"></div>').appendTo(this.$el);
	
		if( this.displayList !== false ){
			
			var scrollContext = this.options.scrollContext || this.scrollContext;
		
			this.list = new InfiniteListView(this.$el, {
				maxRows: this.maxRows,
				context: scrollContext,
				className: this.listStyle+' list clearfix'
			});

			this.setView();
			
			this.listenTo(this.list, 'addOne', this._addOne);		// when the list wants to add one, call "renderOne"
			this.listenTo(this.list, 'endReached', this._addMore);	// when end of list is reached, call "renderMore"
		}
		
		//if( !(this.collection instanceof SortableCollection) )
		//	console.warn('!! ListController: “this.collection” is not an instance of SortableCollection', this);

		// if no default filter context is given, add one
		if( !_.isFunction(this.filterContexts['default']) )
			this.filterContexts['default'] = this._defaultFilterContext;
		
		_.each(this.__listenerEvents, function(l){
			var key = l[0], fn = l[1];
			if( this[fn] )
				this.listenTo(this, key, this[fn]);
		}.bind(this))

		if( this.collection || (!this.collection && !this.collectionSwitcher))
			this.changeCollection( this.collection );
		
		this.trigger('setup:done');
	},
	
	changeCollection: function(coll){
		
		if( coll && !(coll instanceof SortableCollection) )
			console.warn('!! ListController: “collection” is not an instance of SortableCollection', this);
		else if( !coll )
			coll = new SortableCollection(); // fake collection for now so "no" results can be displayed
		
		if( this.collection ){
			this.collection.getFiltered = null;
			this.stopListening(this.collection);
		}
		
		this.collection = coll;

		// reference
		this.collection.getFiltered = this.getCollection.bind(this);
		
		this.listenTo(this.collection, 'spin', this.spin);
		this.listenTo(this.collection, 'reset', this._addAllFromReset); // try this out...
		this.listenTo(this.collection, 'add', this._addAll);
		this.listenTo(this.collection, 'remove', this._removeItem);
		this.listenTo(this.collection, 'fetch:failed', this._fetchFailed)
		
	},
	
	spin: function(stopSpin){
		this.trigger('spin', stopSpin!==false);

		if( stopSpin ) this.updateCount('Loading...');

		if( stopSpin!==false ){ // maybe not the best location, but all I could think of for now...
			this.$el.removeClass('invalid-data');
		}
	},
	
	render: function(){

		this._renderTop();

		this.clearFilter(); // clear the filter input if need be
	
		if( !this.collection && this.collectionSwitcher )
			this.promptCollectionSwitcherPick();

		else if( this.fetchOnRender )
			this.autoFetchOnRender();

		else if( this.collection.length == 0 )
			this.collection.trigger('reset');

		else
			_.defer(_.bind(function(){ // allow for the list to be inserted into the DOM by the parent before reseting (so infinite list works)
				this.collection.trigger('reset')	
			},this));
		
		this.trigger('render');

		this.delegateEvents();
		
		return this;
	},

	// TODO: finish this; the idea is if collection isn't set, but we have a collection switcher,
	// prompt the user to pick a collection to begin viewing. Was thinking about this for merchandising
	// dashboard, but solved a different way
	promptCollectionSwitcherPick: function(){
		console.log('promptCollectionSwitcherPick: finish me');
	},
	
	autoFetchOnRender: function(update){
		update = update || false;

		this.collection.refresh(update)
	},

	manualRefresh: function(){
		this.autoFetchOnRender(true);
	},

	_fetchFailed: function(coll, status, retry){

		this.$el.addClass('invalid-data');

		if( status == 'Invalid User' ) return;// (the global ajax error will catch this)

		new Modal({
			title: status,
			msg: 'What would you like to do?',
			theme: 'ios7',
			btns: [{
				label: 'Retry',
				className: 'green btn-primary md-close',
				onClick: function(){ retry() },
				eventKey: 'enter'
			},{
				label: 'Reset Filters',
				className: 'btn-primary md-close',
				onClick: this.resetFilters.bind(this)
			}, 'cancel']
		})

	},
	
	_addOne: function(model){
	
		//model.trigger('list-rerender', model)
		
		this.trigger('addOne', model);
	
		if( _.isString(this.listView) )
			this.listView = _.getObjectByName(this.listView);
	
		if( !this.listView ){
			console.error('! ListController: a “listView” must be defined');
			return;
		}
		
		var data = {model: model};
		
		if( this.listViewData ) data = _.extend(this.listViewData(this.lastModel, model), data);

		// add label divider if needed
		this._addOneDivider(model);

		// reuse an existing view or create a new one
		if( this.reuseListViews == true )
			var view = this.list.subview('list-view-'+model.id) || this.list.subview('list-view-'+model.id, new this.listView(data));
		else
			var view = this.list.subview('list-view-'+model.id, new this.listView(data));


		view.parentView = this; // overriding as we dont need InfiniteList to be accessible
		view.controller = this;
		this.lastModel = model;
		this.list.addOne( view );

		model._selected	? view.$el.addClass('selected') : view.$el.removeClass('selected');
		
		if( this.close )
			this.listenTo(view, 'panel:close', this.close);
	},

	_addOneDivider: function(model){

		if( this.listViewDivider && !this.filterTerm ){
				
			var dividerLabel = _.isFunction(this.listViewDivider) ? this.listViewDivider()
					: (model[this.listViewDivider] && _.isFunction(model[this.listViewDivider]) ? model[this.listViewDivider].call(model)
					: model.get(this.listViewDivider));

			if( dividerLabel != this.__lastLabelDivider ){
				this.list.$el.append('<li class="list-divider">'+dividerLabel+'</li>');
				this.__lastLabelDivider = dividerLabel;
			}
		}
	},

	
	/*
		Add More - this is called each time we reach the bottom of the list
	*/
	_addMore: function(){
		this.list.addMore(this.getCollection());
		this.trigger('addMore');
	},
	
	refreshList: function(){
		this._addAll();
	},
	
	_addAllFromReset: function(coll, data){
		
		// reset has new data
		if( coll && data )
			this.list.cleanupSubviews(true);
		
		this._addAll();
	},

	_addAll: function(){
	
		if( !this.displayList ) return;

		this.list.clear();	// clear and reset the list
		this.lastModel = null;
		this.__lastLabelDivider = null;

		// change the "no results" message if there is a search term
		this.list.noResultsMsg = this.filterTerm
								? 'No Results for <i>“'+this.filterTerm+'”</i>'
								: ( _.isFunction(this.noResultsMsg) ? this.noResultsMsg() : this.noResultsMsg );
		
		//this.getCollection().sort();
		this.refilter(false);
		
		this.trigger('addAll');

		// if the compare view has a limit, check it now
		if(this.compareViewLimit && this.inCompareMode() && this.getCollection().length > this.compareViewLimit)
			this.setView('list');
		
		// add the rows - instead of actually adding "all" the rows, we "add more" because infinite scrolling will load the rest
		this._addMore();
		
		this.updateCount();
	},

	_removeItem: function(model, coll, data){

		//var indx = data.index;
		var indx = this.getCollection().indexOf(model);

		this.list.removeItem(indx, false); // remove the model from the DOM
		this.filteredCollection.remove(model); // remove from the filtered collection

		_.defer(function(){
			this.updateCount();
		}.bind(this))
	},
	
	_renderTop: function(){
		
		this.$top.html('');
		
		var showBulkSelect = this.bulkActions || (this.allowBulkSelect && this.allowDownload );
		
		if( this.refreshBtn)
			this.$top.append('<a class="btn right icon-only icon-arrows-ccw manual-refresh" title="Refresh results"></a>');

		if( this.viewBtn && this.displayList )
			this._appendViewBtn();

		if( this.allowDownload && this._appendDownloadBtn )
			this._appendDownloadBtn();

		if( this.filter )
			this.$filter = $('<input type="text" placeholder="'+this.filterPlaceholder+'" class="filter '+this.filterInputStyle+'">')
				.val(this.filterTerm)
				.appendTo(this.$top)

		this.$count = $('<span class="count no-selection '+(showBulkSelect?'btn':'')+'" title="'+(showBulkSelect?'Toggle bulk select':'')+'"></span>')
			.appendTo(this.$top);
			
		if( this.renderTop )
			this.renderTop();

		if( showBulkSelect && this._appendBulkSelectActions )
			this._appendBulkSelectActions();
		
		if( this.sorts && this.sorts.length > 0 )
			this.$top.append( this._renderSortSelect() );

		if( this.filters && this._renderFilterSelects )
			this.$top.append( this._renderFilterSelects() )		

		if( this.header )
			this._renderHeader()
	},

	_renderHeader: function(){

		var titles = '';

		_.each(this.header, function(obj){

			obj = _.extend({
				label: '',
				className: ''
			}, (_.isString(obj) ? {label: obj} : obj));

			var className = _.underscored(_.stripTags(obj.label));

			titles += '<div class="col '+className+' header-'+className+' '+obj.className+'">'+obj.label+'</div>';
		});
			
		this.$top.addClass('has-header');
		this.$header = $('<div class="header-bar clearfix">'+titles+'</div>').appendTo(this.$top);

	},

	

	_appendViewBtn: function(){

		var menu = [
			{label: 'List', val: 'list'}, 
			{label: 'Grid',val: 'grid'},
			{label: 'Compare',val: 'compare'}
		];

		var opts = {
			align: 'bottomLeft',
			w: 100,
			onClick: this.onSetView.bind(this)
		};

		var $btn = $('<a class="btn right icon-only icon-columns switch-view" title="Switch view: List / Compare / Grid"></a>')
			.dropdown(menu, opts)
			.appendTo( this.$top )
	},

	inListMode: function(){ return this.viewKey() == 'list' },
	inCompareMode: function(){ return this.viewKey() == 'compare' },
	inGridMode: function(){ return this.viewKey() == 'grid' },

	viewKey: function(){
		return _.store('ListController:view:'+this.className) || this.defaultView;
	},

	onSetView: function(obj){
		var setVal = this.setView(obj.val);

		var title = _.capitalize(obj.val)+' View';
		var msg = 'There are too many results for the <b>'+obj.val.toUpperCase()+'</b> view.<br><br>It is limited to '+this.compareViewLimit+' results';

		if( setVal != obj.val ){
			typeof Modal == 'undefined' ? alert(title+"\n\n"+_.stripTags(msg)) : Modal.alert(title, msg);
		}
	},

	setView: function(viewKey){

		var oldKey = this.viewKey();
		var newKey = viewKey ? viewKey : oldKey;

		// if view does not allow view button, make sure to set to List
		if( !this.viewBtn )
			newKey = this.defaultView; // 'list'

		// compare view doesn't work well with too many results
		if( this.compareViewLimit && newKey == 'compare' && this.getCollection().length > this.compareViewLimit )
			newKey = oldKey == 'compare' ? 'list' : oldKey;

		this.list.$el.removeClass('mode-'+oldKey);

		//if( newKey != 'list' )
		this.list.$el.addClass('mode-'+newKey);

		_.store('ListController:view:'+this.className, newKey );

		if( newKey != oldKey )
			this.trigger('view:change', newKey, this);

		return newKey;
	},

	
	_renderSortSelect: function(){
		
		if( !this.sorts || this.sorts.length == 0 ) return;
		
		if( !this.$sortSelect )
			this.$sortSelect = $('<div class="sorts"></div>');
		else
			this.$sortSelect.html('');
		
		var sort = _.findWhere(this.sorts, {val: this.collection.sortKey()});
		
		var label = sort && sort.label ? sort.label : 'No sort';
		var icon = this.collection.sortDesc() ? 'icon-sort-name-down' : 'icon-sort-name-up';
		
		$btn = $('<span class="btn-group" title="Change sort">'
			+'<a class="btn '+icon+' change-desc">'+label+'</a>'
			+'<a class="btn icon-only icon-down-open change-sort"></a>'
			+'</span>').appendTo(this.$sortSelect);
			
		$btn.find('.change-sort').dropdown(this.sorts, {
			align: 'bottom',
			w: 120,
			onClick: this._onChangeSort.bind(this)
		});
		
		return this.$sortSelect;
	},

	// ! deprecated - see ListController.resultExports
	downloadCSV: function(){
		this.getCollection().saveToCSV(this.downloadName);
	},
	
	changeDesc: function(e){
		this.changeSort(this.collection.sortKey());
	},
	
	changeSort: function(val){
		this.collection.changeSort( val );
		this.trigger('sort:change');
	},
	
	_onChangeSort: function(obj){
		this.changeSort( obj.val );
	},

	activeFilter: function(key){
		return this.activeFilters && this.activeFilters[key];
	},

	activeFilterVal: function(key, defaultVal){
		return this.activeFilter(key) ? this.activeFilter(key).val : defaultVal;
	},

/*
	Active Filter String - returns HTML string of the active (selected) filters
*/
	activeFilterString: function(separator, html){
		
		var strs = [];
		
		_.each(this.activeFilters, function(data, key){
			var title = this.filters[key].label || _.titleize(_.humanize(key));
			strs.push('<em>'+title+':</em> <b>'+this._renderActiveFilter(data, key, true)+'</b>');
		}, this);
		
		strs = strs.join(separator||', ');

		if( html === false )
			strs = _.stripTags(strs);

		return strs;
	},

	isQueueing: function(){
		return this.__queueing === true;
	},

	toggleQueueUpFilters: function(){

		if( this.isQueueing() )
			this.applyQueuedFilters();
		else
			this.beginQueueingFilters();
	},

	beginQueueingFilters: function(){
		this.__queueing = true;
		this.$el.addClass('queueing-filters');
		this.trigger('filter:queue:begin')
	},

	applyQueuedFilters: function(){
		this.__queueing = false;
		this.$el.removeClass('queueing-filters');
		this.trigger('filter:queue:apply');
		this.manualRefresh();
	},
		
	
	/*
		On Filter Change - when a filter option is selected
	*/
	_onFilterChange: function(key, optional, item){
	
		var val = item.val;
		var filter = this.filters[key];
		var activeFilter = this.activeFilters[key];

		// instead of setting a value for the selected filter, set several filters based on the given data
		if( !val && item.filters ){
			this.resetFiltersTo(item.filters);
			return;
		}
		
		// if it is a multi select filter, then figure out what the real value should be
		if( filter.multi ){
			
			if(val === undefined || val === null || val === '' /*|| val === 'All' || val === 'all'*/){
				// do nothing;
			
			// was "ctrl/cmd" pressed on the click?
			}else if( _.metaKey() ){
				
				// get current values for filter key
				var vals = activeFilter ? [].concat(activeFilter.val) : [];
			
				var indx = _.indexOf(vals, val);
				
				// if the selcted val already exists, remove it
				if( indx > -1 )
					vals.splice(indx, 1);

				// else add to existing values => [val1, val2, newVal]
				else
					vals.push(val);
				
				val = vals;
			
			// no, just replace the old value with the new one
			}else{
				val = [val];
			}
		}
		
		// begin the filter change
		this.changeFilter(key, val, optional)
	},
	
	changeFilter: function(key, val, optional){
		
		var self = this;

		// if the filter changed was set to be the Collection Switcher, switch the collection now
		if( this.collectionSwitcherKey == key ){

			// find the new model to switch to, then get the collection from it
			var model = this.collectionSwitcher.get(val);
			var coll = model ? model.switcherCollection() : null;

			if( coll && !(coll instanceof Backbone.Collection) ){
				if( coll )
					console.warn('!! Cannot switch to non Backbone.Collection:', val, model, coll)
			}else{
				this.spin();
				this.changeCollection(coll); // switch to new collection
				
				if( coll )
					this.autoFetchOnRender();	// fetch data for the collection
				else
					this.manualRefresh()
			}
		}
		
		// notify filter is changing if other views want to know
		this.trigger('filter:changing', key, val);

		// let the JS process queue clear before saving
		_.defer(function(){
			self.collection.applyFilter(key, val, {fetch: !self.isQueueing()});	// save to collection (local storage rememberance and such)
			self._applyFilter(key, {val: val, optional:optional}, !self.isQueueing()); // actually apply the filter (will trigger refilter)
		})
	},

	toggleFilter: function(key, val, optional){

		if( this.activeFilters && this.activeFilters[key] )
			val = null; // this will cause the filter to be removed

		this.changeFilter(key, val, optional);
	},
	
	_onFilterOptionalToggle: function(key, item){
		this.collection.toggleFilterOptional(key, {fetch: !this.isQueueing()});
		this._toggleFilterOptional(key, !this.isQueueing());
	},
	
	/*
		Reset Filters
		
		resets all the filters to their first value. Often times this will be "all/any/clear";
	*/
	resetFilters: function(){
		this.resetFiltersTo({});
	},

	resetFiltersTo: function(vals){
		
		var resetVals = {};
		
		this.foreachFilterInUse(function(obj, key){
			
			if( obj.values ){
				
				var values = obj.values;
				
				if( _.isFunction(values) )
					values = values.call(obj);
				
				if( values[obj.defaultValIndex||0] )
					resetVals[key] = values[obj.defaultValIndex||0].val
			}
			
		});
		
		resetVals = _.extend(resetVals, vals);

		this.collection.setFilters(resetVals, !this.isQueueing()); // these two methods are silent
		this.setActiveFilters(resetVals);
		
		this.trigger('sort:change'); // notify there is a sort change for re-render	
	},
	
	updateCount: function(label){
		
		if( !this.$count ) return;

		var str = label || this.getCollection().length;

		if( !label && this.isBulkSelectOn ){
			str = this.getSelected().length+' of '+str;
			this.$count.attr('data-selected', this.getSelected().length)
		}

		this.$count.html( str );
	},
	
	focusFilter: function(){
		if( this.$filter )
			this.$filter.focus();
	},

	// todo: add padding support
	scrollTo: function(el, padding){
		var el = el instanceof Backbone.View ? el.el : el;
		padding = padding || 0;
		this.list.el.scrollTop = el.offsetTop + padding; // NOTE: this probably isn't cross browser...need to enhance before public release
	},

/*
	FILTER VIEW code
*/
	
	filteredCollection: this.collection,
	
	filterTerm: '',			// current filter term
	
	filterResult: null,		// current filter result collection
	
	// commented out so that each instance of FilterView has their own; don't want this in the prototype!
	//activeFilters: {},	// current active filters - do not set this manually, use setActiveFilters instead
	//filters: {},			// available filters
	
/*
	For Each Filter NOT in Use - convenience method
*/
	foreachFilterNotInUse: function(callback){
		
		var self = this;
		
		if( callback )
		_.each(this.filters, function(obj, key){
		
			if( self.activeFilters && self.activeFilters[key] !== undefined ) return;
			
			callback.call(self, obj, key);			
		})
		
	},
	
/*
	For Each Filter IN USE - convenience method
*/
	foreachFilterInUse: function(callback){
		
		var self = this;
		
		if( callback )
		_.each(this.filters, function(obj, key){
		
			if( !self.activeFilters || self.activeFilters[key] === undefined ) return;
			
			callback.call(self, obj, key);			
		})
		
	},
	
	/*
		Set Active Filters - this can be called on init to pre-set the filters that should be active. Don't directly set `this.activeFilters`
	*/
	setActiveFilters: function(filters){
		
		this.activeFilters = {};

		_.each(filters, function(data, key){
		
			if( _.isObject(data) && !_.isArray(data) ){
				this._applyFilter(data.key, {val: data.val, optional:data.optional}, false);
				
			}else{
				this._applyFilter(key, {val:data}, false);
			}
			
		}, this)
	},
	
	/*
		PRIVATE: Apply Filter - call this to set/clear a filter;
		
		filter keys must be defined in "this.filters"
		if "filterVal" is null (or empty), the filter will be cleared from "activeFilters"
		
		"triggerReset" defaults to true
	*/
	_applyFilter: function(filterKey, filterData, triggerReset){
		
		filterData = _.isObject(filterData) ? filterData : {val:filterData}; // backwards compatibility
		
		var val = filterData.val;
		
		// if filter val is null (or empty), remove this filter key from active filters
		if(val === undefined || val === null || val === '' /*|| val === 'All' || val === 'all'*/)
			this._removeActiveFilter(filterKey);
		
		// else, update/set the filter key with the given value
		else
			this._addActiveFilter(filterKey, filterData);
			
		this.trigger('filter:change');
			
		this.refilter(triggerReset);
	},
	
	/*
		Toggle Filter Optional - toggle the optional value on a filter
	*/
	_toggleFilterOptional: function(filterKey, triggerReset){
		
		var activeFilter = this.activeFilters[filterKey];
		
		if( !activeFilter ) return;
		
		this.activeFilters[filterKey].optional = !activeFilter.optional;
			
		this.trigger('filter:change');
		
		this.refilter(triggerReset);
	},
	
	/*
		Refilter - filters the collection based on the active filters then triggers collection reset...unless "false" is specified
	*/
	refilter: function(triggerReset){
	
		// if the collection is empty, dont try to filter it
		if( this.collection.length == 0 ){
			this.filteredCollection = this.collection;
			return;
		}
		
		// start the filtering process
		this._filterCollectionWithActiveFilters();
		
		// then filter the collection with the user typed term if there is one
		if( triggerReset !== false)
			this.filterCollection(); // this method will also trigger the collection reset
	},
	
	_addActiveFilter: function(filterKey, filterData){
		this.activeFilters = this.activeFilters || {};
		this.activeFilters[filterKey] = filterData;
		this.$el.addClass('is-filtered').attr('data-filtered-'+filterKey, filterData.val);
	},
	
	_removeActiveFilter: function(filterKey){
		this.activeFilters = this.activeFilters || {};
		delete this.activeFilters[filterKey];
		this.$el.attr('data-filtered-'+filterKey, null);
		
		if( _.size(this.activeFilters) === 0)
			this.$el.removeClass('is-filtered');
	},
	
	// "private" function; get the whole filtered collection
	_filterCollectionWithActiveFilters: function(){
		
		// reset the filtered collection to normal
		this.filteredCollection = this.collection;
		
		this.filteredCollection = this.filteredCollection.filter(function(model){
			
			var required = [],
				optional = [];
			
			_.each(this.activeFilters, function(filterData, filterKey){
				
				var filterVal = filterData.val,
					filterOptional = filterData.optional === true,
					filterFn = this._filterFn(filterKey);
			
				if( !filterFn ) return; // skip filtering for this key if no filter by function is found
				
				var matched = filterFn.call(this, model, filterVal, filterKey, this);
				
				filterOptional ? optional.push(matched) : required.push(matched);
				
				
			}, this);
			
			return ( required.length === 0 || _.indexOf(required, false) == -1 )
				 && (optional.length === 0 || _.indexOf(optional, true) > -1 );
		
		
		}, this);
		
		this.filteredCollection = this.filterResultCollection( this.filteredCollection );
		
		// sort filtered collection
		if( this.filterComparator ){
		
			this.filteredCollection = this.filteredCollection.sortBy(this.filterComparator, this);
			
			this.filteredCollection = this.filterResultCollection( this.filteredCollection );
		}
	},
	
	// "private" function: returns the "filterBy" function from the given filterKey
	_filterFn: function(filterKey){
		
		// see if a filter exists for the given filter key
		var filterFn = this.filters[filterKey] || null;
		
		if( !filterFn ) return filterFn;
		
		// backwards compatibility - this will probably be removed eventually
		if( !_.isFunction(filterFn) && !_.isString(filterFn) ){
			filterFn = filterFn.filterBy || null
		}
		
		// if the filter function is a string, see if there is a default filter method
		if( _.isString(filterFn) )
			if(this._defaultFilterMethods[filterFn] ){
				filterFn = this._defaultFilterMethods[filterFn]
			}else{
				console.warn('FilterView: “%s” is not valid default filter method. Available defaults:', filterFn, _.keys(this._defaultFilterMethods))
			}
		
		return filterFn;
	},

/*
	Filter Collection From Input - trigger "filterCollection" on keyup from an input
*/
	filterCollectionFromInput: function(e){
		
		// get term from <input> "keyup"
		var term = e.target.value;
	
		// if filter term hasn't changed, dont filter again
		if(this.filterTerm === term) return;

		e.target.setAttribute('value', term); // set the value attribute for CSS styling
		
		this.filterTerm = term;

		clearTimeout(this._filterCollectionFromInputTimeout);

		// slight delay to see if key is pressed again
		this._filterCollectionFromInputTimeout = setTimeout(function(){
		
			this.filterCollection();

			this.trigger('filter:search', term)

		}.bind(this), this.filterDelay)
	},

/*
	Filter Collection - filters the collection with the term the user has typed
*/
	filterCollection: function(){
	
		var term = this.filterTerm;

		// empty search term (or no default context) so clear search results
		if( term == '' || !this.filterContexts['default'] ){
	
			this.clearFilter();
			
			if(!this.filterContexts['default'])
				console.warn('FilterView: no “default” filter context. Please add one.');
	
		// perform filtering
		}else{
	
			this.$el.addClass('filtered');
			
			this.trigger('filter:start', this.filterTerm);
	
			// default to no context
			var context = 'default';
	
			// test term for a context - "date:2012" and parse if there is one
			_.each(this.filterContexts, function(_filter, _context){
	
				var patt = new RegExp('^'+_context+'(.*)');
	
				if( patt.test(term) ){
	
					context = _context;
					term = (term.match(patt))[1].trim();
	
				}
	
			});
			
			// get the filtered collection
			var filtered = this.filteredCollection.filter(function(model){
	
				var filterFn = this.filterContexts[context];
				var scores = filterFn(term, model);
	
				// grab the highest score
				var score = _.max(scores);
	
				// set the score on this model so we can sort by it down below
				model.set('score', score, {silent: true});
	
				// only return this model if its score is better than 70%
				return score > this.filterMinScore;
			}, this);
	
			// sort the filtered collection by the scores and put in descending order (highest score first)
			filtered = _.sortBy(filtered, function(model){ return model.get('score') });
			filtered = filtered.reverse(); // higher number is better, so reverse results
	
			
			// convert filtered result to a real collection
			this.filterResult = this.filterResultCollection(filtered);
				
		}
	
		// trigger a change on the collection - render method should notice this.searchResult is set and render that collection instead
		this.collection.trigger('reset');
	
	},
	
/*
	Clear Filter
*/
	clearFilter: function(){
		this.filterTerm = '';
		this.filterResult = null;
		this.$el.removeClass('filtered');
		
		this.trigger('filter:done');
	},

/*
	Get Collection (the current filtered collection)
*/
	getCollection: function(){
	
		// if there is no filteredCollection, but we have active filters, lets get the filteredCollection now
		if( !this.filteredCollection && _.size(this.activeFilters) > 0 )
			this._filterCollectionWithActiveFilters();
			
		else if(!this.filteredCollection)
			this.filteredCollection = this.collection;
			
	
		return this.filterResult || this.filteredCollection;
	},

/*
	Get Selected (when bulk select is on, gets the books that are selected)

	TODO: these results should probably be cached, but it needs to be reset when getCollection changes
*/
	getSelected: function(){

		return this.filterResultCollection(this.getCollection().filter(function(model){
			return model._selected;
		}));

	},

/*
	Get Current Collection

	takes in account "bulk select"
*/
	getCurrentCollection: function(){
		return this.isBulkSelectOn ? this.getSelected() : this.getCollection();
	}

});