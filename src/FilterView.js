/*
	FilterView
	
	@author Kevin Jantzer, Blackstone Audio Inc.
	@since 2012-11-06
	
	Filter by Presets and user typed Terms. If filtered by a preset,
	search term will filter within the preset filtered collection
	
	USE:
	When you want to create a list view that can be filtered
	extend FilterView instead of Backbone.View
	
	expects an input with class "filter" for attaching the event handler
	
	predefined "filters" can also be applied to the collection.
	define the available filters and the method (or defaultMethod) to use for the filter
	
	ex:
		filters: {
			'type': 'number', // looks for "type" on model (parses to number)
			'status': 'text', // looks for "status" on model (plain text)
			'color': function(model, filterVal, filterKey){ // custom method
				return  intergerToColor( model.get('color_id') ) === filterVal;
			}
		}
	
	Tip:
	Use LiquidMetal to score the search term for better results (https://github.com/rmm5t/liquidmetal)
*/
var FilterView = Backbone.View.extend({

	events: {
		'keyup input.filter' : 'filterCollectionFromInput'  // expects an <input> with class "filter"
	},
	
	filteredCollection: this.collection,
	
	filterTerm: '',			// current filter term
	
	filterResult: null,		// current filter result collection
	
	filterMinScore: .7,		// minimum score for a model to pass filter
	

/*
	Filter Result Collection - defaults to regular backbone collection
	
	override this method to return filtered result as a different collection
*/
	filterResultCollection: function(filteredModels){
		return new Backbone.Collection(filteredModels);
	},


	// commented out so that each instance of FilterView has their own; don't want this in the prototype!
	//activeFilters: {},	// current active filters - do not set this manually, use setActiveFilters instead
	//filters: {},			// available filters
	
	foreachFilterNotInUse: function(callback){
		
		var self = this;
		
		if( callback )
		_.each(this.filters, function(obj, key){
		
			if( self.activeFilters && self.activeFilters[key] !== undefined ) return;
			
			callback.call(self, obj, key);			
		})
		
	},
	
	foreachFilterInUse: function(callback){
		
		var self = this;
		
		if( callback )
		_.each(this.filters, function(obj, key){
		
			if( !self.activeFilters || self.activeFilters[key] === undefined ) return;
			
			callback.call(self, obj, key);			
		})
		
	},
	
	filterComparator: null, // should the filtered collection be sorted?
	
	defaultFilterMethods: {
		'text': function(model, filterVal, filterKey){
			if( _.isArray(filterVal) )
				return _.contains(filterVal, model.get(filterKey));
			else
				return model.get(filterKey) == filterVal;
		},
		'number': function(model, filterVal, filterKey){
			return Number(model.get(filterKey)) == filterVal;
		},
		'int': function(model, filterVal, filterKey){
			return parseInt(model.get(filterKey)) == filterVal;
		},
		'array': function(model, filterVal, filterKey){
			return _.indexOf(filterVal, model.get(filterKey)) > -1
		},
		'model_id': function(model, filterVal, filterKey){
		
			if( _.isArray(filterVal) )
				return _.contains(filterVal, model.get(filterKey).id);
			else
				return parseInt(model.get(filterKey).id) == filterVal;
		},
		'starts_with': function(model, filterVal, filterKey){
			return (model.get(filterKey)||'').match(RegExp('^'+filterVal));
		},
		'ends_with': function(model, filterVal, filterKey){
			return (model.get(filterKey)||'').match(RegExp(filterVal+'$'));
		},
		'contains': function(model, filterVal, filterKey){
			return (model.get(filterKey)||'').match(RegExp(filterVal));
		}
	},
	
	/*
		Set Active Filters - this can be called on init to pre-set the filters that should be active. Don't directly set this.activeFilters
	*/
	setActiveFilters: function(filters){
	
		_.each(filters, function(data, key){
		
			if( _.isObject(data) && !_.isArray(data) ){
				this.applyFilter(data.key, {val: data.val, optional:data.optional}, false);
				
			}else{
				this.applyFilter(key, {val:data}, false);
			}
			
		}, this)
	},
	
	/*
		Apply Filter - call this to set/clear a filter;
		
		filter keys must be defined in "this.filters"
		if "filterVal" is null (or empty), the filter will be cleared from "activeFilters"
		
		"triggerReset" defaults to true
	*/
	applyFilter: function(filterKey, filterData, triggerReset){
		
		filterData = _.isObject(filterData) ? filterData : {val:filterData}; // backwards compatibility
		
		var val = filterData.val;
		
		// if filter val is null (or empty), remove this filter key from active filters
		if(val === undefined || val === null || val === '' || val === 'All' || val === 'all')
			this._removeActiveFilter(filterKey)
		
		// else, update/set the filter key with the given value
		else
			this._addActiveFilter(filterKey, filterData)
			
		this.trigger('filter:change');
			
		this.refilter(triggerReset);
	},
	
	toggleFilter: function(filterKey, filterData, triggerReset){
		
		filterData = _.isObject(filterData) ? filterData : {val:filterData}; // backwards compatibility
		
		if( this.activeFilters[filterKey] )
			this._removeActiveFilter(filterKey)
		else
			this._addActiveFilter(filterKey, filterData);
			
		this.trigger('filter:change');
			
		this.refilter(triggerReset);
	},
	
	/*
		Toggle Filter Optional - toggle the optional value on a filter
	*/
	toggleFilterOptional: function(filterKey, triggerReset){
		
		var activeFilter = this.activeFilters[filterKey];
		
		if( !activeFilter ) return;
		
		this.activeFilters[filterKey].optional = !activeFilter.optional
			
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
				
				
			}, this)
			
			//console.log(required, optional);
			
			return ( required.length === 0 || _.indexOf(required, false) == -1 )
				 && (optional.length === 0 || _.indexOf(optional, true) > -1 );
		
		
		}, this);
		
		
		this.filteredCollection = this.filterResultCollection( this.filteredCollection );
		
		
		
		// filter the collection with each of the active filters
		//_.each(this.activeFilters, this._filterCollectionWith, this)
		
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
			if(this.defaultFilterMethods[filterFn] ){
				filterFn = this.defaultFilterMethods[filterFn]
			}else{
				console.warn('FilterView: “%s” is not valid default filter method. Available defaults:', filterFn, _.keys(this.defaultFilterMethods))
			}
		
		return filterFn;
	},


	
/*
	Filter Contexts - filter collection on different things based on what the user types
	
	a 'default' context is required;
	override this method to add extra filter contexts; if you do not override this method
	filtering will always return all results
	
	if a context key ends with ":" the text following will be returned as a "term"
	
	ex: 'author:' : function(term, model){}  // term will = "john" when searching "author:john"
*/
	filterContexts: {
	
		// a default context is required
		'default': function(term, model){
			return [ 1 ]; // return all results
		}
		
	},



/*
	Filter Collection From Input - trigger "filterCollection" on keyup from an input
*/
	filterCollectionFromInput: function(e){
		
		// get term from <input> "keyup"
		var term = e.target.value;
	
		// if filter term hasn't changed, dont filter again
		if(this.filterTerm === term) return;
		
		e.target.setAttribute('value', term) // set the value attribute for CSS styling
		
		this.filterTerm = term;
		
		this.filterCollection();
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
	Get Collection - convenience method for rendering
	
	in your render method do something like this:
		this.getCollection().each(this.addOne, this);
*/
	getCollection: function(){
	
		// if there is no filteredCollection, but we have active filters, lets get the filteredCollection now
		if( !this.filteredCollection && _.size(this.activeFilters) > 0 )
			this._filterCollectionWithActiveFilters();
			
		else if(!this.filteredCollection)
			this.filteredCollection = this.collection;
			
	
		return this.filterResult || this.filteredCollection;
	}

});