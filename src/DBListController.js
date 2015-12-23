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
	
	__setup: function(){
		
		// we must have a collection for this to work
		if( !this.collection )
			console.error('!! DBListController: a collection is needed');
		
		// create a model to do our fetching; named as _model to mitigate collisions
		this._model = new DBListControllerModel({collection: this.collection})	
		
		// call normal ListController setup routine
		ListController.prototype.__setup.apply(this, arguments);
		
		// extra event watchers specific to this view
		this.listenTo(this.collection, 'filter:change', this.clearNumbers);
		this.listenTo(this._model, 'page:change', this.doAddMore);
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
	_addMore: function(){
		
		// no reason to fetch if all models have been loaded
		// (unless zero in collection, we don't know if there really is zero models from the server, or if no fetch has happend yet)
		if( this.collection.length !== 0 && this._model.startAt >= this.collection.length ) return;
		
		this._model.startAt = this.list.lastRow;
		this._model.perPage = this.list.maxRows;
		
		// if all possible results have been loaded, call `list.addMore` so the "end of list" message will apear
		if( this._model.startAt > 0 && this.collection.length > 0 && this.collection.length < this._model.startAt){
			this.list.addMore(this.collection);
		}else{
			this._model.fetch(); // else, retrieve next set of results
		}
	},

	autoFetchOnRender: function(update){
		this._model.fetch(update);
	},

	manualRefresh: function(){
		this.clearNumbers();
		this.list.clear();
		this.autoFetchOnRender(true);
	},
	
	// when more data is receieved from the server, we will add the data to the list and update the count
	doAddMore: function(){
		this.list.addMore(this.collection);
		this.updateCount();
		this.spin(false);
	},
	
	// overiding to just return the real collection. all filtering and sorting is done on the server
	// getCollection: function(){
	// 	return this.collection;
	// }
	
})

		/*
			PRIVATE: DB Sortable Filter View MODEL

			Note: DBListController uses this - you should not need to use this on it's own
			
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
			},
			
			url: function(){
				return _.isFunction(this.collection.url) ? this.collection.url() : this.collection.url;
			},
			
			// override default fetch to include startAt and perPage data
			fetch: function(update){
				
				opts = {};
				
				opts.data = {
					filters: this.collection.filters ? this.collection.filterVals( _.where(this.collection.filters, {db:true}) ) : null,
					sortKey: this.collection.sortKey(),
					sortDesc: this.collection.sortDesc(),
					startAt: this.startAt,
					perPage: this.perPage
				}

				if( this.startAt == 0)
					this.collection.trigger('spin');

				opts.success = function(model, dbData){

					this.addModels(dbData);

					this.collection.trigger('spin', false);

				}.bind(this)

				opts.error = function(coll, xhr){
					
					this.collection.trigger('fetch:failed', this, xhr.statusText, this.fetch.bind(this, update))
					this.collection.trigger('spin', false);

				}.bind(this)
				
				Backbone.Model.prototype.fetch.call(this, opts)
			},

			addModels: function(dbData){
			//onFetch: function(model, dbData){
				
				if( dbData.results == undefined)
					return console.error('No “results” key was found');

				var results = dbData.results || dbData; // actually, think we have to keep results key as the data is being retrived for the "model"
				
				if( this.startAt == 0 )
					this.collection.reset([], {silent:true});

				this.collection.add(results, {merge: true, silent:true});
				
				if( dbData.results && dbData.count ) this.collection.length = dbData.count;
				
				if( results.length == 0
				|| this.collection.size() < (this.startAt*this.perPage+this.perPage))
					this.collection.length = this.collection.size();
				
				this.trigger('page:change');
			}
			
		})