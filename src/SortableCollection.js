/*
	Sortable Collection
	
	This collection should be used in conjunction with ListController
	It allows for ascending and descending, sorts and filters. Sorts and filters are saved to localstorage
	
	@author Kevn Jantzer
	@since 2012-12-20
*/
var SortableCollection = Backbone.Collection.extend({
	
	// override the default backbone constructor
	constructor: function(data, opts){
		
		// make sure setup has happened
		this.setupFilters();
		
		// call normal backbone constructor
		Backbone.Collection.prototype.constructor.apply(this, arguments);
	},

	//key			: 'LocalStorageKey',	// define a key for saving sort info to local storage
	//defaultSort	: 'some_key',			// the default key to sort by
	defaultDesc		: false,
	dbSort			: false,	// should database do the sorting instead?
	
	_key: function(){
		return _.isFunction(this.key) ? this.key() : this.key;
	},
	
/*
	SORTS - if custom sorting is needed for a specific key (or all of them), put that logic here
	
	By default, sorting uses the key, say "title" and looks for that key on the model.
	But if you want to call a method on the model instead, you can do that here
*/
	/*sorts: {
		'sort-key': function(model, key, isDesc){
			return model.get(key); // default behavior
			return model.someCustomFn(); // this would be a reason for this sort-key
		}
	}*/
	

/*
	FILTERS 
	
	filters listed here will be sent to the server via .fetch() (db:true)
	the selected value is also saved to local storage to persist the users selection (unless localStorage:false)
*/
	/*filters: [{ 
		key: 'key-string',
		val: 'the val',		// if this is set, it will be the "default" unless found in local storage 
		db: true,			// defaults to false
		localStorage: false, // defaults to true
		optional: false
	}],*/
	
	
	
/* =======================================================================================================================================
	"Locked" methods... dont override the methods below except rare cases
*/
	
	localStoreKey: function(extra){
		return 'list:'+this._key()+(extra?':'+extra:'');
	},
/*
	Sort Key - sets or gets the key used to sort
*/
	sortKey: function(newKey){
		
		// SET
		if(newKey !== undefined)
			_.store('list:'+this._key()+':sort', newKey);

		// GET
		else
			return _.store('list:'+this._key()+':sort') || this.defaultSort;
	},

/*
	Sort Descending - sets or gets sort ascending order
*/
	sortDesc: function(desc){

		// SET
		if(desc !== undefined)
			return _.store('list:'+this._key()+':sort:desc', desc);

		// GET
		else
			return _.store('list:'+this._key()+':sort:desc') !== undefined ? 
					_.store('list:'+this._key()+':sort:desc') : this.defaultDesc;
	},
	
/*
	Sort By - overriding default sort by behaviour to add in reverse order logic
*/
	sortBy: function(){

		if( this.dbSort ) return this.models;
		
		var models = _.sortBy(this.models, this.comparator, this);
		
		if(this.sortDesc())
			models.reverse();
	
		return models;
	},
	
	//rootComparator: function(model){}
	
/*
	Comparator - How to sort
	
	This method should NOT be overridden in the inherited class; instead, use this.sorts
	to specify custom logic per sort key
*/
	comparator: function(model){

		if( this.dbSort ) return true;
	
		var sortKey = this.sortKey();
		var sortBy = null;
		
		// look for this sortkey on the "sorts" object
		if( this.sorts && this.sorts[sortKey] )
			sortBy = this.sorts[sortKey].call(this, model, sortKey, this.sortDesc())
			
		// else, is the key "title"? then lets do a little special sorting
		else if( sortKey === 'title' )
			sortBy = _.sortString( model.get( this.sortKey() ))
			
		else if( model[sortKey] && _.isFunction(model[sortKey]) )
			sortBy = (model[sortKey])(); // call method

		// else, just look for the key on the model
		else if( model.has(sortKey) )
			sortBy = model.get(sortKey);
	
		if( this.rootComparator ){
			
			if( !_.isArray(sortBy) )
				sortBy = [sortBy];
				
			var root = this.rootComparator(model);
			
			if( !_.isArray(root) )
				root = [root];
			
			sortBy = root.concat(sortBy);
		}
		
		return sortBy;
	},
	
/*
	Change how this collection is sorted
*/
	changeSort: function(sortKey){

		// if same sort key was clicked, lets reverse the sort direction
		if(this.sortKey() == sortKey)
			this.sortDesc( !this.sortDesc() ); // set direction to opposite of what it is now
		
		// set the new sort key
		this.sortKey( sortKey );
		
		this.trigger('sort:change');
		
		this.sort();
	},
	
/*
	Fetch - overriding fetch so we can send data (filters) to the server
*/
	fetch: function(opts){
	
		var data = {};
	
		if( this.filters ){
			data = this.filterVals(null, 'db');			// maintain backwards compatibility; TODO: remove this ASAP
			data.filters = this.filterVals(null, 'db');	// this data should be used by PHP and not the data above
			data.sortKey = this.sortKey();
			data.sortDesc = this.sortDesc();
			data.optionalFilters = this.optionalFilters();
		}
		
		opts = opts || {};
		
		opts.data = opts.data ? _.extend(opts.data, data) : data;
		
		if( this.url )
			Backbone.Collection.prototype.fetch.call(this, opts)
		else
			opts.success(this, [])
	},

	refresh: function(update){

		update = update == false ? false : true;

		// with dbSort, a `DBListControllerModel` will do the fetching, but we need to trigger a `reset` for that to happen
		if( this.dbSort && update){
			this.trigger('reset')
			return;
		}

		this.trigger('spin');

		// for Backone 0.9.10/0.9.9, 'update' is needed to register change events on the model, rather than mass "reset" (see line 815 in backbone source)
		this.fetch({update:update, add:false, remove:false, merge:true, success: function(coll, models){

			// if we "updated" the collection, trigger reset to things add/remove correctly
			// this was made apparent when coding Profit Report
			if( update )
				coll.reset(models); // NOTE: this can cause issues when views have bound to their model
			
			this.trigger('fetch:success', coll, models)
			this.trigger('spin', false);

		}.bind(this), error: function(coll, xhr){
			
			this.trigger('fetch:failed', this, xhr.statusText, this.refresh.bind(this, update))
			this.trigger('spin', false);

		}.bind(this)});

	},
	
	
/*
	Setup Filters - this is called automatically by the contructor
*/
	setupFilters: function(){
	
		if( this._setupFiltersDone ) return;
		
		this._setupFiltersDone = true;
	
		if( !this.filters ) return;
		
		var that = this;
		
		_.each(this.filters, function(filter){
			
			if( !filter.key ) return console.error('!! SortableCollection: filters must have a key specified; this one does not:', filter);
			
			if( filter.localStorage !== false )
				var storedVal = _.store( that.localStoreKey(filter.key) )
			
			if( storedVal ){
				if( _.isObject(storedVal) ){
					filter.val = storedVal.val;
					filter.optional = storedVal.optional;
				}else{
					filter.val = storedVal;
				}
				
			}else if( _.isFunction(filter.val) ){
				filter.val = filter.val();
			}
		})
	},
	
/*
	Apply Filter - use this to set the filter values
	
	opts= {
		silent: false,
		fetch: true
	}
*/
	applyFilter: function(key, val, opts){	
		
		opts = opts || {};
		
		// are any filters specifed, if not, then we can't apply the filter
		if( !this.filters ) return //console.error('!! SortableCollection: no filters are specifed');
		
		// find the filter object based on the key given
		var filter = this.getFilter(key);
		
		// did we find the filter based on the key?
		if( !filter ) return console.error('!! SortableCollection: no filter was found for key: “'+key+'”', this.filters);
		
		// update the filters value
		filter.val = val;
		
		// store it locally unless specifically told not too
		if( filter.localStore !== false )
			_.store( this.localStoreKey(key), {val: filter.val, optional: filter.optional} );
			
		// trigger event change
		if( opts.silent !== true){
			this.trigger('filter:change:'+key, val);
			this.trigger('filter:change', key, val);
		}
		
		// if this is a DB filter, then refetch the collection
		if( filter.db && opts.fetch !== false ){
			this.refresh();
		}

		return filter;
	},
	
	toggleFilterOptional: function(key, opts){
		
		opts = opts || {};
		
		// are any filters specifed, if not, then we can't apply the filter
		if( !this.filters ) return console.error('!! SortableCollection: no filters are specifed');
		
		// find the filter object based on the key given
		var filter = this.getFilter(key);
		
		// did we find the filter based on the key?
		if( !filter ) return console.error('!! SortableCollection: no filter was found for key: “'+key+'”', this.filters);
		
		// update the filters value
		filter.optional = !filter.optional;
		
		// store it locally unless specifically told not too
		if( filter.localStore !== false )
			_.store( this.localStoreKey(key), {val: filter.val, optional: filter.optional} );
		
		// trigger event change
		if( opts.silent !== true){
			this.trigger('filter:change:'+key, filter.optional);
			this.trigger('filter:change', key, filter.optional);
		}

		// if this is a DB filter, then refetch the collection
		if( filter.db && opts.fetch !== false ){
			this.refresh();
		}
	},
	
/*
	Set Filters - given an array of filters, they will be silently applied
*/
	setFilters: function(filters, doRefresh){
		
		var needsRefresh = false;

		_.each(filters, function(val, key){
			filter = this.applyFilter(key, val, {silent:true, fetch:false});
			if( !needsRefresh )
				needsRefresh = filter && filter.db == true;
		}, this)

		doRefresh !== false && needsRefresh && this.refresh();
	},
	
	getFiltered: function(){ // this method will be set by ListController
		return this;
	},
	
/*
	Get Filter - returns a filter object based on the key given
*/
	getFilter: function(key){
		if( this.filters )
			return _.findWhere(this.filters, {key: key});
		else
			return null;
	},
	
/*
	Gets object of filters and their values, ex: {key:val, key2:val2}
	
	use this to figure out which filters are in use when first loading
*/
	filterVals: function(filters, forWhat){
	
		if( filters == undefined )
			filters = this.filters;
			
		var data = {};
		if( filters ){
			_.each(filters, function(o){
				if( forWhat !== 'db' || o.db !== false)
					data[o.key] = o.val;
			})
		}
		return data;
	},
	
/*
	Gets object of filters and their optional values, ex: {key:val, key2:val2}
*/
	filterOptionals: function(filters){
	
		if( filters == undefined )
			filters = this.filters;
			
		var data = {};
		if( filters ){
			_.each(filters, function(o){
				data[o.key] = o.optional;
			})
		}
		return data;
	},


	optionalFilters: function(filters){
	
		if( filters == undefined )
			filters = this.filters;
			
		var data = [];
		if( filters ){
			_.each(filters, function(o){
				o.optional && data.push(o.key)
			})
		}
		return data;
	},
	
});