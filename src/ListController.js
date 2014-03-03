
/*
	List Controller --- Also see "DBListController" at the bottom
	
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
			label: 'Partner', 		// optional label for this filter; if not set, the key, in this case "partner" will be used. It is put through _.humanize()
			values: [									// "values" are the options for this filter
				{label: 'Any Partner', val: ''},
				'divider',								// "values" is given to Dropdown.js so the same opitons apply
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
	
	For special functionality with user typed search/filter terms, add "filterContexts"; (see FilterView for more details)
	
	this.filterContexts = {
		"flagged": function(){}
	}
	
*/

ListController = FilterView.extend({

	//listView: 'Path.To.BackboneView',
	//listViewData: function(){ return {} }, // if this is specified, the data will be initialzed with the list view
	listStyle: 'simple', // plain, simple, card
	filterInputStyle: 'right auto-hide',

	// override the default backbone constructor
	constructor: function(data, opts){
		
		// make sure setup has happened, but wait until after initialize()
		this._checkSetup = setTimeout(this.checkSetup.bind(this), 0)
		
		// call normal backbone constructor
		Backbone.View.prototype.constructor.call(this, data);
	},
	
	// if we get to this method, it means setup was never called, so call it now
	checkSetup: function(){
		
		// make sure setup() hasn't been called
		if( this._checkSetup )
			this.setup()
	},
	
	displayList: true,		// this means this view will load the collection into an infinite list
	fetchOnRender: false,
	filter: true,					// provide a "filter" input to make searches
	filterDropdownW: 110,
	filterPlaceholder: 'Filter...',
	
	// list available sorts
	sorts: [
		//{label: 'Title', val: 'title'}
	],
	
	sortEvents: {
		'click a.change-desc': 'changeDesc'
	},

	// called automatially if not called in initialize method
	setup: function(){
		
		clearTimeout(this._checkSetup);
	
		this.events = _.extend({}, this.events||{}, this.sortEvents);
	
		this.$top = $('<div class="filter-bar top clearfix"></div>').appendTo(this.$el);
	
		if( this.displayList !== false ){
			
			var scrollContext = this.options.scrollContext || this.scrollContext || '#main .inner';
		
			this.list = new InfiniteListView(this.$el, {
				context: scrollContext,
				className: this.listStyle+' list clearfix'
			});
			
			this.list.on('addOne', this.addOne, this);		// when the list wants to add one, call "renderOne"
			this.list.on('endReached', this.addMore, this);	// when end of list is reached, call "renderMore"
		}
		
		if( !(this.collection instanceof SortableCollection) )
			console.warn('!! ListController: “this.collection” is not an instance of SortableCollection', this);
		
		this.collection.on('reset', this.addAll, this);
		this.on('sort:change', this.addAll, this);
		this.on('sort:change', this.renderSortSelect, this);
		this.on('filter:change', this.renderFilterSelects, this);
		//this.collection.on('sort', this.addAll, this);
		//this.collection.on('sort:change', this.renderSortTitles, this);	// when sort changes, re-render the sort titles/labels
		
		this.collection.on('add', this.addAll, this);
		this.collection.on('remove', this.addAll, this);
		
		this.trigger('setup:done');
	},
	
	changeCollection: function(coll){
		
		if( !coll || !(coll instanceof Backbone.Collection) )
			return console.error('!! ListController: “collection” is not an instance of Backbone.Collection', this);
		
		if( !(coll instanceof SortableCollection) )
			console.warn('!! ListController: “collection” is not an instance of SortableCollection', this);
		
		this.collection.off('reset', this.addAll, this);
		this.collection.off('add', this.addAll, this);
		this.collection.off('remove', this.addAll, this);
		
		this.collection = coll;
		
		this.collection.on('reset', this.addAll, this);
		this.collection.on('add', this.addAll, this);
		this.collection.on('remove', this.addAll, this);
		
	},
	
	spin: function(stopSpin){
		this.trigger('spin', stopSpin!==false)
	},
	
	render: function(){

		this._renderTop();

		this.clearFilter(); // clear the filter input if need be
		
		this.spin();
	
		if( this.fetchOnRender )
			this.autoFetchOnRender()
		else if( this.collection.length == 0 )
			this.collection.trigger('reset');
		else
			_.defer(_.bind(function(){ // allow for the list to be inserted into the DOM by the parent before reseting (so infinite list works)
				this.collection.trigger('reset')	
			},this))
		
		this.trigger('render')

		this.delegateEvents();
		
		return this;
	},
	
	autoFetchOnRender: function(){
		this.collection.fetch({merge:true});
	},
	
	addOne: function(model){
	
		model.trigger('list-rerender', model)
		
		this.trigger('addOne', model);
	
		if( _.isString(this.listView) )
			this.listView = _.getObjectByName(this.listView);
	
		if( !this.listView ){
			console.error('! ListController: a “listView” must be defined');
			return;
		}
		
		var data = {model: model}
		
		if( this.listViewData ) data = _.extend(this.listViewData(this.lastModel, model), data);
		
		var view = new this.listView(data);
		view.controller = this;
		this.lastModel = model;
		this.list.$el.append( view.render().el );
		
		if( this.close )
			view.on('panel:close', this.close, this);
	},
	
	/*
		Add More - this is called each time we reach the bottom of the list
	*/
	addMore: function(){
		this.list.addMore(this.getCollection());
		this.trigger('addMore');
	},
	
	addAll: function(){
	
		if( !this.displayList ) return;

		this.list.clear();	// clear and reset the list
		this.lastModel = null;
		
		//this.getCollection().sort();
		this.refilter(false);
		
		this.trigger('addAll')
		
		// add the rows - instead of actually adding "all" the rows, we "add more" because infinite scrolling will load the rest
		this.addMore();
		
		this.spin(false);
		
		this.updateCount();
	},
	
	_renderTop: function(){
		
		this.$top.html('');
		
		this.$count = $('<span class="count"></span>')
			.appendTo(this.$top)
			
		if( this.renderTop )
			this.renderTop();
		
		if( this.sorts && this.sorts.length > 0 ){
			//this.$top.append('<a class="button white icon-only icon-arrow-combo change-desc"></a>');
			this.$top.append( this.renderSortSelect() )
		}
		
		if( this.filters ){
			this.$top.append( this.renderFilterSelects() )
		}

		if( this.filter )
			this.$filter = $('<input type="text" placeholder="'+this.filterPlaceholder+'" class="filter '+this.filterInputStyle+'">')
				.val(this.filterTerm)
				.appendTo(this.$top)
	},
	
	renderSortSelect: function(){
		
		if( !this.sorts || this.sorts.length == 0 ) return;
		
		if( !this.$sortSelect )
			this.$sortSelect = $('<div class="sorts"></div>')
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
	
/*
	Render Filter Selects
	
	renders the UI for adding, changing, and removing active filters
*/
	renderFilterSelects: function(){
		
		// nothing to render if no filters are given or of the filters given, none of them have "values" to choose from
		if( !this.filters || !_.find(this.filters, function(o){ return o.values !== undefined}) ) return;
		
		// create or clear the filter div
		if( !this.$filterSelects )
			this.$filterSelects = $('<div class="filters"></div>')
		else
			this.$filterSelects.html('');
		
		// render all the currently active filters
		_.each(this.activeFilters, this.renderActiveFilter, this)
		
		// render the "add fitlter" button
		this.renderAddFilterBtn();
		
		return this.$filterSelects;
	},
	
	activeFilterString: function(separator){
		
		var strs = [];
		
		_.each(this.activeFilters, function(data, key){
			strs.push('<em>'+_.titleize(key)+':</em> <b>'+this.renderActiveFilter(data, key, true)+'</b>');
		}, this)
		
		return strs.join(separator||', ')
	},	
		
		
		/*
			Render Add Filter Button
		*/
		renderAddFilterBtn: function(){
			
			var self = this;
			
			var menu = []
			
			// render a dropdown menu for adding new filters, but only show filters that are NOT currently in use
			this.foreachFilterNotInUse(function(obj, key){
			
				if( key === 'divider' ){
				
					obj === null ? menu.push('divider') : menu.push({'divider': obj});
					return;
				}
				
				if( obj.manual === true ) return; // do not show "manual" filters in the menu...they are applied programmatically
				
				var label = obj.label || _.humanize(key);
				
				menu.push({
					label: label, 
					dropdown: {
						view: obj.values,
						align: 'rightBottom',
						w: obj.w || 120,
						border: obj.border || null,
						onClick: self._onFilterChange.bind(self, key, false)
					}
				})
				
			})
			
			if( _.size(this.activeFilters) > 0 ){
				
				if( menu.length > 0 && menu[0] != 'divider' && !menu[0].divider )
					menu.unshift('divider')	
				
				menu.unshift({label: 'Reset filters', onClick: this.resetFilters.bind(this)});
			}
			
			
			// render the button
			$('<a class="btn icon-only icon-filter" title="Apply new filter"></a>')
				.appendTo(this.$filterSelects)
				.dropdown(menu, {align: 'bottom', w: this.filterDropdownW})
			
		},
		
		/*
			Render Active Filters
			
			this shows the user what filters are active and also gives them the option to change each one (via dropdown)
		*/
		renderActiveFilter: function(data, key, returnStr){
			
			var val = data.val;
			var optional = data.optional === true;
			var filter = this.filters[key]; // find the filter data: {values:[], filterBy:function(){}, etc}
			
			if( !filter ) return;
			
			var values = filter.values; // this filter must have values to choose from
			
			if( _.isFunction(values) ) values = values(); // the values attribute could be an function, if so, run it.
			
			// look for the value that is currently selected
			if( _.isArray(val) ){
				var filterValStrings = [];
				_.each(values, function(item){
					_.contains(val, item.val) ? filterValStrings.push(item.label) : null;
				});
				var filterVal = {label: filterValStrings.join(', ')};
				
			}else{
				var filterVal = _.find(values, function(item){
					return item.val == val
				});
			}
			
			
			var collectionFilter = this.collection.getFilter(key);
			
			if( !filterVal ){
				
				var label = 'Manual Filter';
				
				if( filter.manualVal ){
					label = filter.manualVal
					
				}else{
					var collFilter = this.collection.getFilter(key);
					var collFilterVal = collFilter ? collFilter.val : false;
					
					label = _.keyToText(key)+': '+collFilterVal;
				}
				
				filterVal = {label: label}
			}
			
			// make a filter type label
			var filterTypeLabel = filter.label || _.humanize(key);
			var icon = filter.icon ? 'icon-'+filter.icon : '';
			var values = filter.values ? filter.values : (filter.manual?[{label:'Clear', val:null}]:null);
			var optionalClass = optional ? 'optional' : '';
			
			if( filter.optional && _.isArray(values) ){
				values = [].concat(values);
				values.push({'divider':'Options'}, {
					label: optional?'Make Required':'Make Optional',
					val: !optional,
					onClick: this._onFilterOptionalToggle.bind(this, key)
				})
			}
			
			if( returnStr == true ){
				
				return filterVal.label;
				
			}else{
			
				// create the active filter as a button with a dropdown for selecting a different value
				$('<a class="btn '+icon+' '+optionalClass+'" title="Change '+filterTypeLabel+'">'+filterVal.label+'</a>')
					.appendTo(this.$filterSelects)
					.dropdown(values, {
						align: 'bottom',
						w: filter.w || 120,
						selected: val,
						onClick: this._onFilterChange.bind(this, key, optional)
					})
			}
		},
	
	_onFilterChange: function(key, optional, item){
	
		var val = item.val;
		var filter = this.filters[key];
		var activeFilter = this.activeFilters[key];
		
		// if it is a multi select filter, then figure out what the real value should be
		if( filter.multi ){
			
			if(val === undefined || val === null || val === '' || val === 'All' || val === 'all'){
				// do nothing;
			
			}else if( _.metaKey() ){
				
				var vals = activeFilter ? [].concat(activeFilter.val) : [];
			
				var indx = _.indexOf(vals, val);
				
				if( indx > -1 )
					vals.splice(indx, 1);
				else
					vals.push(val);
				
				val = vals;
				
			}else{
				val = [val];
			}
		}
		
		this.changeFilter(key, val, optional)
	},
	
	changeFilter: function(key, val, optional){
		
		var self = this;
		
		this.trigger('filter:changing', key, val);
		
		_.defer(function(){
			self.collection.applyFilter(key, val);
			self.applyFilter(key, {val: val, optional:optional});
		})
	},
	
	_onFilterOptionalToggle: function(key, item){
		this.collection.toggleFilterOptional(key);
		this.toggleFilterOptional(key);
	},
	
	/*
		Reset Filters
		
		resets all the filters to their first value. Often times this will be "all/any";
	*/
	resetFilters: function(){
		
		var resetVals = {};
		
		this.foreachFilterInUse(function(obj, key){
			
			if( obj.values ){
				
				var values = obj.values;
				
				if( _.isFunction(values) )
					values = values();
				
				if( values[obj.defaultValIndex||0] )
					resetVals[key] = values[obj.defaultValIndex||0].val
				
			}
			
		})
		
		this.collection.setFilters(resetVals); // these two methods are silent
		this.setActiveFilters(resetVals);
		
		this.trigger('sort:change'); // notify there is a sort change for re-render
		
	},
	
	updateCount: function(){
		
		if( this.$count )
			this.$count.html( this.getCollection().length );
	},
	
	focusFilter: function(){
		if( this.$filter )
			this.$filter.focus();
	},

});






/*
	DB List Controller View
	
	This class uses the DB/Server to perform all the filtering and in addition
	loads limited data via infinite list. As the end of the list is reached, more
	data is requested from server
	
	Note: all filters in the SortableCollection should be set to db:true
	
	@author Kevin Jantzer
	@since 2013-10-03
*/
DBListController = ListController.extend({
	
	filter: false, // no "filter/search" input for this view1
	
	setup: function(){
		
		// we must have a collection for this to work
		if( !this.collection )
			console.error('!! DBListController: a collection is needed');
		
		// create a model to do our fetching; named as _model to mitigate collisions
		this._model = new DBListControllerModel({collection: this.collection})	
		
		// call normal ListController setup routine
		ListController.prototype.setup.apply(this, arguments);
		
		// extra event watchers specific to this view
		this.on('filter:change', this.clearNumbers, this);
		this._model.on('page:change', this.doAddMore, this);
	},
	
	/*
		Clear Numbers - this is called when the filter changes; 
		
		when a filter changes, it is possible for the entire dataset to change
		therefor, we set our "page" numbers back to the default
	*/
	clearNumbers: function(){
		this.collection.length = 0;
		this._model.startAt = 0;
		this._model.perPage = this.list.maxRows;
	},
	
	/*
		Add more is triggered when reaching end of the list
		we will now ask the server for more data
	*/
	addMore: function(){
		
		// no reason to fetch if all models have been loaded
		// (unless zero in collection, we don't know if there really is zero models from the server, or if no fetch has happend yet)
		if( this.collection.length !== 0 && this._model.startAt >= this.collection.length ) return;
		
		this._model.startAt = this.list.lastRow;
		this._model.perPage = this.list.maxRows;
		
		this._model.fetch();
	},
	
	// when more data is receieved from the server, we will add the data to the list and update the count
	doAddMore: function(){
		this.list.addMore(this.collection);
		this.updateCount();
	},
	
	// overiding to just return the real collection. all filtering and sorting is done on the server
	getCollection: function(){
		return this.collection;
	}
	
})

		/*
			DB Sortable Filter View MODEL
			
			This does the fetching instead of the collection.
			The fetched data is assumed to be returned as
				{count:#, result:[models]}
				
			Where count is the total number of models that could be returned,
			disregarding the current "page index
			
			Several peices of data are sent to the server
				startAt:  the starting offset (will be divisible by "perPage")
				perPage:  how many results per page.
				filters:  null or array of set filters. See SortableCollection on how to set these
				
			startAt, perPage -> these are set by InfiniteList (known as "lastRow" and "maxRows" respectively)
								example: 0,30 -> 30,30 -> 60,30 -> 90,30
		*/
		DBListControllerModel = Backbone.Model.extend({
		
			initialize: function(){
			
				this.startAt = 0;
				this.perPage = 30; // defaults, but DBListController will set it utimately
				
				this.collection = this.get('collection') || new SortableCollection();
					
				this.on('sync', this.onFetch, this);
			},
			
			url: function(){
				return _.isFunction(this.collection.url) ? this.collection.url() : this.collection.url;
			},
			
			// override default fetch to include startAt and perPage data
			fetch: function(opts){
				
				opts = opts || {};
				
				opts.data = _.extend(opts.data||{}, {
					filters: this.collection.filters ? this.collection.filterVals( _.where(this.collection.filters, {db:true}) ) : null,
					startAt: this.startAt,
					perPage: this.perPage
				})
				
				Backbone.Model.prototype.fetch.call(this, opts)
			},
			
			onFetch: function(model, dbData){
				
				if( dbData.results == undefined)
					return console.error('No “results” key was found');
				
				if( this.startAt == 0 )
					this.collection.reset(dbData.results, {silent:true})
				else
					this.collection.add(dbData.results, {silent:true});
				
				if( dbData.count ) this.collection.length = dbData.count;
				
				if( dbData.results.length == 0
				|| this.collection.size() < (this.startAt*this.perPage+this.perPage))
					this.collection.length = this.collection.size();
				
				this.trigger('page:change');
			}
			
		})


