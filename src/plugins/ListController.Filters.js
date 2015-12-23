/*
	Filters plugin for ListController
*/
(function(){

	var LCPlugin = {
		
		/*
			Filters
		
		filters: {
			
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
				prefix: null,
				multi: false,	// if set to true, multiple values can be selected by holding "cmd/ctrl"
				defaultValIndex: '0', // which value is the "default" one?
				
				// these two params are useful when you want to apply programmatically, but don't immeditely know what filter options are available
				// see "recent proofing changes" feature for first use
				manual: true,			// if set, this filter will not show as an "filter" to select. this is useful for setting filters programmatically
				manualVal: 'Partner'	// when manual, the val displayed in active filter "button" is value saved in collection...unless this is set
			}
			
		}*/
		
		setupFilters: function(){
	
			_.each(this.filters, function(filter, key){
	
				if( key !== 'divider' && !key.match(/^divider/)  && filter.use){
	
					if( ListController.Filters && ListController.Filters[filter.use] ){
	
						this.filters[key] = _.extend({}, ListController.Filters[filter.use], filter);
	
					}else{
						console.error('ListController: “'+filter.use+'” filter is not a globally defined filter. Please define it in ListController.Filters');
					}
				}
	
			}.bind(this))
		},
		
	/*
		Render Filter Selects
		
		renders the UI for adding, changing, and removing active filters
	*/
		_renderFilterSelects: function(){
			
			// nothing to render if no filters are given or of the filters given, none of them have "values" to choose from
			if( !this.filters || !_.find(this.filters, function(o){ return o.values !== undefined}) ) return;
			
			// create or clear the filter div
			if( !this.$filterSelects )
				this.$filterSelects = $('<div class="filters"></div>');
			else
				this.$filterSelects.html('');
			
			// render all the currently active filters
			_.each(this.activeFilters, this._renderActiveFilter, this);
			
			// render the "add fitlter" button
			this._renderAddFilterBtn();
	
			if( this.allowFilterQueueing )
				this.$filterSelects.append('<a class="btn primary apply-queued-filters" title="Apply Filters">Apply Filters</a>');
			
			return this.$filterSelects;
		},	
			
		
		/*
			Render Add Filter Button
		*/
		_renderAddFilterBtn: function(){
			
			var self = this;
			var menu = [];
			var lastKey = '';
			
			// render a dropdown menu for adding new filters, but only show filters that are NOT currently in use
			this.foreachFilterNotInUse(function(obj, key){
			
				if( (key === 'divider' || key.match(/^divider/)) ){
					
					if( !lastKey.match(/^divider/) )
						obj === null ? menu.push('divider') : menu.push({'divider': obj});

					lastKey = key;

					return;

				}

				lastKey = key;
				
				// does user have permission?
				if( obj.permission && !ListController.permission(obj.permission) )
					return;
				
				if( obj.manual === true ) return; // do not show "manual" filters in the menu...they are applied programmatically
				
				var label = obj.label || _.humanize(key);

				var onClickFn = self._onFilterChange.bind(self, key, false);
				
				var subMenu = {
					filter: obj,
					view: (typeof obj.values === 'function' ? obj.values.bind(obj, this) : obj.values),
					align: 'rightBottom',
					w: obj.w || 120,
					collection: (typeof obj.collection === 'function' ? obj.collection.bind(obj, this) : obj.collection),
					autoFetch: obj.autoFetch || false,
					description: obj.description || '',
					border: obj.border || null,
					onClick: onClickFn
					//listController: self
				};

				// collection may be a function that returns a collection
				// if( subMenu.collection && !(subMenu.collection instanceof Backbone.Collection) )
				// 	subMenu.collection = subMenu.collection(obj);

				if( self.collectionSwitcherKey && self.collectionSwitcherKey == key ){

					if( !self.collectionSwitcher || !(self.collectionSwitcher instanceof Backbone.Collection) ){
						console.warn('!! Filter',obj,'has "collectionSwitcher" set but no "collectionSwitcher" was found on the ListController')
					}

					subMenu.collection = obj.collection = self.collectionSwitcher;
					subMenu.autoFetch = obj.autoFetch !== undefined ? obj.autoFetch : true;
				}

				menu.push({
					label: label, 
					dropdown: subMenu
				})
				
			});

			if( menu.length > 0 && menu[0] != 'divider' && !menu[0].divider )
				menu.unshift({'divider':' '});

			// if predefined filter presets or allowing of user defined presets
			if( this.filterPresets || this.allowPresets )
			menu.unshift({
				label: '',
				title: 'Filter Presets',
				val: 'filter-presets',
				icon: 'equalizer',
				dropdown: {
					view: this.presetMenu,
					w: 200,
					context: this,
					align: 'rightBottom',
				}
			});
			
			if( this.allowFilterQueueing )
				menu.unshift({
					label: '',
					val: 'queue-filters',
					title: 'Queue Filters: select desired filters before making request for the data.',
					icon: 'layers',
					onClick: this.toggleQueueUpFilters.bind(this)
				});
			
			
			menu.unshift({
				label: '',
				title: 'Reset filters',
				val: 'reset-filters',
				icon: 'erase', 
				onClick: this.resetFilters.bind(this)
			});
			
			// render the button
			$('<a class="btn icon-only icon-filter" title="Apply new filter"></a>')
				.appendTo(this.$filterSelects)
				.dropdown(menu, {align: 'bottom', w: this.filterDropdownW, searchThreshold: 40})
			
		},
		
		/*
			Render Active Filters
			
			this shows the user what filters are active and also gives them the option to change each one (via dropdown)
		*/
		_renderActiveFilter: function(data, key, returnStr){
			
			var self = this;
			var val = data.val;
			//var optional = data.optional === true;
			var optional = this.collection.getFilter(key).optional;
			var filter = this.filters[key]; // find the filter data: {values:[], filterBy:function(){}, etc}
			
			if( !filter ) return;
			
			// the values attribute could be an function, if so, run it.
			var values = _.isFunction(filter.values) ? filter.values.call(filter, this) : filter.values; // this filter must have values to choose from
			
			// look for the value that is currently selected
			if( _.isArray(val) ){
				var filterValStrings = [];
				_.each(values, function(item){
					_.contains(val, item.val) ? filterValStrings.push(item.label) : null;
				});
				var filterVal = filterValStrings.length>0 ? {label: filterValStrings.join(', ')} : null;
				
			}else{
				var filterVal = _.find(values, function(item){
					return item.val == val
				});
			}
			
			var collectionFilter = this.collection.getFilter(key);
			
			if( !filterVal || filter.alwaysUseManualVal ){
				
				var label = 'Manual Filter';
				
				if( filter.manualVal ){
					label = _.isFunction(filter.manualVal) ? filter.manualVal(this.collection.getFilter(key)) : filter.manualVal
					
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
			var prefix = filter.prefix ? filter.prefix : '';
			var multiClass = filter.multi ? 'multi' : '';
			var values = filter.values 
						? (typeof filter.values === 'function' ? filter.values.bind(filter, this) : filter.values)
						: (filter.manual?[{label:'Clear', val:null}]:null);
			var optionalClass = optional ? 'optional' : '';
			var className = [icon, multiClass, optionalClass].join(' ');

			if( this.collectionSwitcherKey == key )
				className += ' collection-switcher-btn';
			
			if( filter.optional && _.isArray(values) ){
				values = [].concat(values);
				values.push({'divider':'Options'}, {
					label: optional?'Make Required':'Make Optional',
					val: !optional,
					onClick: this._onFilterOptionalToggle.bind(this, key)
				})
			}
			
			// return just the filter label if requested
			if( returnStr == true ){
				
				return filterVal.label;
				
			// else, create the filter button
			}else{

				var onClickFn = this._onFilterChange.bind(this, key, optional);

				var subMenu = {
					align: 'bottom',
					w: filter.w || 120,
					collection: (typeof filter.collection === 'function' ? filter.collection.bind(filter, this) : filter.collection),
					autoFetch: filter.autoFetch || false,
					description: filter.description || '',
					selected: val,
					onClick: onClickFn,
					listController: this
				};

				// collection may be a function that returns a collection
				if( subMenu.collection && !(subMenu.collection instanceof Backbone.Collection) )
					subMenu.collection = subMenu.collection();


				// if a Collection Switcher is supported and this filter key is set to be the switcher
				if( this.collectionSwitcherKey && this.collectionSwitcherKey == key ){

					// warn if no Collection is found to be a Switcher
					if( !this.collectionSwitcher || !(this.collectionSwitcher instanceof Backbone.Collection) ){
						console.warn('!! Filter',filter,'has "collectionSwitcher" set but no "collectionSwitcher" was found on the ListController')
					}

					subMenu.collection = filter.collection = this.collectionSwitcher;
					subMenu.autoFetch = filter.autoFetch !== undefined ? filter.autoFetch : true;
				}
			
				// create the active filter as a button with a dropdown for selecting a different value
				$('<a class="btn filter-'+key+' '+className+'" title="Change '+filterTypeLabel+'"><span>'+prefix+filterVal.label+'</span></a>')
					.appendTo(this.$filterSelects)
					.dropdown(values, subMenu)
			}
		}
		
	}
	
	_.extend(ListController.prototype, LCPlugin);
	ListController.prototype.__listenerEvents.push( ['filter:change', '_renderFilterSelects'] );
	
})()