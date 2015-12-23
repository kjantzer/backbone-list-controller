/*
	Filter Presets plugin for ListController
*/
(function(){
	
	var LCPlugin = {
		
		allowPresets: true,				// lets users save active filters as a "preset" (use filterPresets to set predefined presets)
		
		/*
			Predefined Filter Presets
		filterPresets: [
			{label: 'My Preset', filters: {filter_key: 'Filter Val', ...}}
		],*/
		
		_presetKey: function(){
			return 'ListController:presets:'+this.className; // classname can change,  making this unstable
		},

		userPresets: function(){
			return _.store(this._presetKey()) || {};
		},

/*
	Preset Menu
*/
		presetMenu: function(){

			var menu = [];
			var self = this;

			// if presets defined
			if( this.filterPresets && this.filterPresets.length > 0){

				menu.push({divider: 'Presets'});

				var presets = [].concat(this.filterPresets);

				_.each(presets, function(preset){
					preset.context = self;
					preset.onClick = self._onFilterChange.bind(self, null, null);
				});

				menu = menu.concat(this.filterPresets)
			}

			// is user defined presets allowed?
			if( this.allowPresets ){

				menu.push({divider: 'User Presets'});

				var presets = _.values(this.userPresets());

				_.each(presets, function(preset){

					preset.context = this;
					preset.onClick = this._onFilterChange.bind(this, null, null);

					preset.options = {
						view: [{
							label: '',
							title: 'Delete preset',
							icon: 'trash',
							onClick: 'deletePreset',
							preset_id: preset.id
						},{
							label: '',
							title: 'Update the preset with the current active filters',
							icon: 'arrows-ccw',
							onClick: 'updatePreset',
							preset_id: preset.id
						},{
							label: '',
							title: 'Edit preset',
							icon: 'pencil',
							onClick: 'editPreset',
							preset_id: preset.id
						}],
						theme: 'icons',
						align: 'left',
						w: 80,
						context: this
					}

				}.bind(this));

				menu = menu.concat(presets);

				if( presets.length > 0)
					menu.push('divider');

				menu.push({
					label: 'New Preset',
					icon: 'plus-1',
					onClick: 'newFilterPreset'
				});

			}

			return menu;
		
		},

/*
	Edit existing preset
*/
		editPreset: function(item){
			var presets = this.userPresets();
			var preset = presets[item.preset_id];

			if( preset )
			Modal.prompt('Edit Filter Preset', 'Change the label and description of your preset.', {
				h: 100,
				pattern: 'string',
				placeholder: "Filter Label\n\nOptional description.",
				val: preset.label+(preset.description?"\n\n"+preset.description:'')
			}, function(val){

				var lines = val.split("\n");
				var label = lines.shift();
				var description = lines.join("\n").trim();

				preset.label = label;
				preset.description = description;
				_.store(this._presetKey(), presets);

			}.bind(this))
		},

/*
	Update Preset - updates existing preset with the currently active filters
*/
		updatePreset: function(item){

			var presets = this.userPresets();
			var preset = presets[item.preset_id];
			var filters = this.currentFiltersForPreset();
			var len = _.size(filters);

			// at least one filter is needed in order to save a preset
			if( len == 0 )
				Modal.alert('Select Filters First', '');
			else
				Modal.confirm('Update Preset <u>'+preset.label+'<u>',
				_.plural('Update the preset with the selected [num] filter{s}<br><br><code>'+this.activeFilterString()+'</code>', len), function(){

					preset.filters = filters;
					_.store(this._presetKey(), presets);

				}.bind(this))
		},

/*
	Delete Preset
*/
		deletePreset: function(item){
			var presets = this.userPresets();

			var preset = presets[item.preset_id];

			if( preset )
			Modal.confirmDelete('Delete Preset <u>'+preset.label+'<u>', '', function(){

				delete presets[preset.id];
				
				_.store(this._presetKey(), presets);
					
			}.bind(this))
			
		},

/*
	current filters that can be saved to a preset
*/
		currentFiltersForPreset: function(){
			var collectionSwitcherKey = this.collectionSwitcherKey && this.collectionSwitcherKey;
			var filters = {};

			_.each(this.activeFilters, function(o, key){

				if( key != collectionSwitcherKey )
					filters[key] = o.val
			});

			return filters;
		},

/*
	New Filter Preset
*/
		newFilterPreset: function(){

			var filters = this.currentFiltersForPreset();

			var len = _.size(filters);

			if( len == 0 )
				Modal.alert('Select Filters First', '');
			else
				Modal.prompt('Save Filter Preset', _.plural('<code>'+this.activeFilterString()+'</code><br><br>Give a label for the selected [num] filter{s}.', len), {
					h: 100,
					pattern: 'string',
					placeholder: "Filter Label\n\nOptional description."
				}, function(val){

					var lines = val.split("\n");
					var label = lines.shift();
					var description = lines.join("\n").trim();
					var id = Date.now();

					var presets = this.userPresets();

					presets[id] = {
						id: id,
						label: label,
						description: description,
						filters: filters
					};

					_.store(this._presetKey(), presets);

				}.bind(this))
		}
		
	}
	
	_.extend(ListController.prototype, LCPlugin);
	
})()