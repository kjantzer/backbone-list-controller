/*
	Defined Filters

	These are common filters that multiple ListControllers can use.

	NOTE: please only put filters here that should truely be global, meaning
	that other dashboards could find them useful with limited to no
	overrides needed

	The first dashboard to leverage these global filters is Data Delivery,
	but they have recently been added to others (Art assignments, workflow, upcoming releases)

	Use:
	filters: {
		'partner_id': {
			use: 'partner_id',
			w: 240 // override the defined width of `keyword`
		}
	}
*/
ListController.Filters = {

	'partner_id': {
		values: function(){ return [{label: 'All', val: ''}, 'divider'].concat(Partners.toSelectID()) },
		w: 200,
		multi: true,
		filterBy: 'text'
	},

	'deal_id': {
		label: 'Deal',
		values: function(){ return [{label: 'All', val: ''}, 'divider'].concat(Deals.toSelectID('fullLabel')) },
		w: 270,
		multi: true,
		filterBy: 'text'
	},

	'licensor': {
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Licensor Name', val:'', description: 'Separate multiple values with a comma', input: {
				format: 'string', w: 200, placeholder: 'Simon,Hachette'}},
		],
		w: 135,
		manualVal: function(filter){
			return 'Licensor: '+filter.val;
		}
	},

	'purchaser': {
		values: function(){
			return [{label: 'Clear', val: ''}, 'divider'].concat( Users.inGroup('Role:Purchaser').toSelectID('name') );
		},
		w: 160,
		multi: true
	},

	'book': {
		icon: 'book-1',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'ID or Title', val:'', description: '', input: {format: 'string', w: 200, placeholder: '4924 or Atlas Shrugged'}},
		],
		w: 95,
		manualVal: function(filter){
			return filter.val;
		}
	},

	'author': {
		icon: 'user',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Author', val:'', description: 'Separate multiple names with a comma', input: {format: 'string', placeholder: 'C.S. Lewis'}}
		],
		w: 200,
		optional: true,
		manualVal: function(filter){
			return filter.val;
		}
	},

	'narrator': {
		icon: 'user',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Narrator', val:'', description: 'Separate multiple names with a comma', input: {format: 'string', placeholder: 'Grover Gardner'}}
		],
		w: 200,
		optional: true,
		manualVal: function(filter){
			return filter.val;
		}
	},

	'contract_state': {
		label: 'Contract State',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Valid', val: 'Valid'},
			'divider',
			{label: 'Payment', val: 'Payment', border: 'green'},
			{label: 'Drafting', val: 'Drafting', border: 'blue'},
			'divider',
			{label: 'Terminated', val: 'Terminated', border: 'red'},
			{label: 'Cancelled', val: 'Cancelled', border: 'red'},
			{label: 'On-Hold', val: 'On-Hold', border: 'orange'}
		],
		w: 140,
		multi: true,
		filterBy: 'text'
	},

	'contract_admin':{
		label: 'Contract Admin',
		values: function(){
			return [{label: 'Clear', val: ''}, 'divider'].concat( Users.inGroup('Department:Contracts').toSelectID('name') );
		},
		w: 180
	},

	'release_group': {
		label: 'Release Group',
		icon: 'calendar',
		values: function(ctx, opts){

			var coll = this.collection();
			
			if( !coll || typeof coll == 'function' ) return [];

			return [{label: 'Clear', val: ''}, 'divider'].concat(coll.map(function(m){
				return {
					label: m.get('name'),
					val: m.id,
					collection: m.get('books'),
					border: m.isClosed()||m.isUpcomingGroup()?'':'#e5c263'}
			}))
		},
		w: 300,
		multi: true,
		collection: function(){ return this._collection = this._collection || new BSA.Collections.UpcomingReleases()},
		autoFetch: true
	},

	'audience': {
			values: [
				{label: 'Clear', val: ''},
				'divider',
				{label: 'Adult', val: 'Adult'},
				{label: 'New Adult (18-25)', val: 'New Adult (18-25)'},
				{label: 'Young Adult', val: 'Young Adult'},
				'divider',
				{label: 'Children', val: 'Children'},
				{label: 'Children (8-12)', val: 'Children (8-12)'},
				{label: 'Children (4-7)', val: 'Children (4-7)'},
				{label: 'Children (0-3)', val: 'Children (0-3)'}
			],
			multi: true,
			w: 160
		},

	'runtime': {
		icon: 'clock',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Runtime', val:'', description: 'Equal to: 5<br>Exactly: =5.5<br>Less than: <5<br>Greater than: >5<br>Between: 4,6', input: {format: 'string', placeholder: '>15'}}
		],
		manualVal: function(filter){
			return filter.val;
		}
	},

	'keyword': {
		icon: 'tag',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Keywords', description: 'Separate multiple keywords with a comma. <i>Tip: try prefixing with `and:` to require all listed keywords</i>', val:'', input: {
				format: 'string', 
				placeholder: 'keyword one, keyword two',
				w: 220
			}}
		],
		w: 160,
		optional: true,
		manualVal: function(filter){
			return filter.val;
		}
	},

	'copy': {
		icon: 'doc-text-inv',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Has Copy', val: 'true'},
			{label: 'No Copy', val: 'false'},
			'divider',
			{label: 'Copy', val:'', description: 'Separate multiple search terms with a comma',
								input: {format: 'string', placeholder: 'mystery,romance', w:200}}
		],
		optional: true,
	},

	'marketing_points': {
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Has Marketing Points', val: 'true'},
			{label: 'No Marketing Points', val: 'false'},
			'divider',
			{label: 'Marketing Points', val:'', description: 'Separate multiple search terms with a comma',
								input: {format: 'string', placeholder: 'mystery,romance', w: 200}}
		],
		w: 170,
		optional: true,
	},

	'category': {
		values: function(){

			var menu = [{label: 'Clear', val: ''}, 'divider']

			if( lookup.selects.bookCategory ){
				var vals = lookup.selects.bookCategory.toSelectID('label', 'val');
				vals.shift();	// first val is "empty", but we define that above
				menu = menu.concat(vals)
			}

			return menu;
		},
		w: 300,
		multi: true
	},

	'bisac': {
		label: 'BISAC',
		values: function(){

			var menu = [
				{label: 'Clear', val: ''}, 
				'divider',
				{label: 'Has BISAC', val: 'true'},
				{label: 'No BISAC', val: 'false'},
				'divider']

			if( _.isFunction(this.collection) )
				this.collection = this.collection();

			if( this.collection )
				menu = menu.concat(this.collection.toSelectID(function(m){
					return [m.get('code'), m.get('title'), m.get('detail')].join(' / ');
				}, 'code'));

			return menu;
		},
		w: 400,
		multi: true,
		collection: function(){
			return new Lookup.Collections.BISACs() // this should use global collection
		},
		autoFetch: true,
	},

	'series': {
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Part of Series', val: 'true'},
			{label: 'Number in Series', val:'', description: 'Equal to: 5<br>Less than: <3<br>Greater than: >1', input: {format: 'string', placeholder: '1'}},
			{label: 'Not in a Series', val: 'false'}
		],
		manualVal: function(filter){
			return 'Series #: '+filter.val;
		},
		w: 160,
	},

	'award': {
		icon: 'top-list', // trophy
		values: function(){

			var menu = [
				{label: 'Clear', val: ''}, 
				'divider',
				{label: 'Has Award', val: 'true'},
				{label: 'No Award', val: 'false'},
				'divider']

			var coll = lookup.collections.awards;

			if( coll )
				menu = menu.concat(coll.toSelectID('award'));

			return menu;
		},
		w: 400,
		multi: true
	},

	'movie': {
		icon: 'video',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Movie Tie-in', val: '2'},
			{label: 'Optioned for Film', val: '1'},
			{label: 'Not a Movie', val: 'false'},
			{label: 'Movie Statement', val:'', description: 'Example: separate multiple terms with a comma' , input: {format: 'string', placeholder: 'Russell Crowe', w: 200}},
		],
		manualVal: function(filter){
			return filter.val;
		},
		w: 200,
	},

	'setting': {
		icon: 'globe',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Has Setting', val: 'true'},
			{label: 'No Setting', val: 'false'},
			{label: 'Setting', val:'', description: 'Example: New York' , input: {format: 'string', placeholder: 'New York', w: 200}},
		],
		manualVal: function(filter){
			return filter.val;
		},
		w: 200,
	},

	'bonus_material': {
		icon: 'plus-circled',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Has Bonus Mat.', val: 'true'},
			{label: 'No Bonus Mat.', val: 'false'},
			{label: 'Bonus Material', val:'', description: 'Examples: PDF, DVD, maps' , input: {format: 'string', placeholder: 'PDF', w: 200}},
		],
		manualVal: function(filter){
			return filter.val;
		},
		w: 200,
	},

	'territory': {
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Has Territory', val: 'true'},
			{label: 'No Territory', val: 'false'},
			{label: 'Type of Territory', val:'', description: 'Example: world<br>Tip: also try `not:world`' , input: {format: 'string', placeholder: 'world', w: 200}},
		],
		manualVal: function(filter){
			return filter.val;
		},
		w: 200,
	},

	'market': {
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Consumer', val: 'consumer'},
			{label: 'Library', val: 'library'},
			{label: 'Both', val: 'both'},
			{label: 'None', val: 'none'}
		],
		alwaysUseManualVal: true,
		manualVal: function(filter){
			return 'Markets: '+filter.val;
		},
	},

	'drm': {
		label: 'DRM',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Yes', val: 'yes'},
			{label: 'No', val: 'no'},
		],
		alwaysUseManualVal: true,
		manualVal: function(filter){
			return 'DRM: '+filter.val;
		},
	},

	'dmas': {
		label: 'DMAS',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Yes', val: 'yes'},
			{label: 'No', val: 'no'},
		],
		alwaysUseManualVal: true,
		manualVal: function(filter){
			return 'DMAS: '+filter.val;
		},
	},

	'streaming': {
		label: 'Streaming',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Yes', val: 'yes'},
			{label: 'No', val: 'no'},
		],
		alwaysUseManualVal: true,
		manualVal: function(filter){
			return 'Streaming: '+filter.val;
		},
	},

	'art': {
		icon: 'picture',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Proofed', val:'true'},
			{label: 'Green Lit', val:'1'},
			{label: 'Yellow Lit', val:'-2'},
			{label: 'Red Lit', val:'-1'},
			{label: 'Unproofed', val: 'unproofed'}
		],
		w: 120,
		optional: true
	},

	'audio': {
		icon: 'music',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Has Audio', val:'true'},
			{label: 'No Audio', val:'false'},
		],
		w: 120,
		optional: true
	},

	'sole_source': {
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Yes', val: 'yes'},
			{label: 'No', val: 'no'},
		],
		alwaysUseManualVal: true,
		manualVal: function(filter){
			return 'Sole Source: '+filter.val;
		},
	},

	'ios_app': {
		label: 'iOS App',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Is iOS App', val: 'true'},
			'divider',
			{label: 'Ready for Sale', val: 'Ready for Sale'},
			{label: 'Waiting For Review', val: 'Waiting For Review'},
			{label: 'Prepare for Upload', val: 'Prepare for Upload'},
			{label: 'Developer Removed From Sale', val: 'Developer Removed From Sale'},
			//{label: 'Rejected', val: 'Rejected'},
			//'divider',
			//{label: 'iOS App Version', val:'', description: 'Example: world<br>Tip: also try `not:world`' , input: {format: 'string', placeholder: 'world', w: 200}},
		],
		manualVal: function(filter){
			return filter.val;
		},
		w: 240,
	},

	'sales_date': {
		label: 'Sales Date',
		icon: 'dollar-1',
		defaultValIndex: 1,
		values: function(){

			values = [
				{divider: 'Sales Date'},
				{label: 'All Time', val: ''},
				{label: 'Year', val: '', input:{format: 'year', w: 60}},
				{label: 'Range of Years', val: '', input:{format: 'year', w: 60, range: true}},
				{label: 'Month', val: '', input:{format: 'month', w: 92}},
				{label: 'Range of Months', val: '', input:{format: 'month', w: 92, range: true}},
			]

			return values;
		},
		w: 160,
		manualVal: function(filter){
			
			// range
			if( _.isArray(filter.val) )
				if( filter.val[0].match(/^[0-9]{4}$/) ){	// range of yeras
					return filter.val[0]+' - '+filter.val[1]
				}else{											// range of months
					return (new XDate(filter.val[0])).toString('MMM yyyy')+' - '+(new XDate(filter.val[1])).toString('MMM yyyy')
				}

			// single month/year
			else if( filter.val.match(/^[0-9]{4}-[0-9]{2}$/) )
				return (new XDate(filter.val)).toString('MMM yyyy');

			else
				return filter.val
		},
	},

	'sales': {
		label: 'Sales Amt',
		//icon: 'dollar-1',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Sales', val:'', description: 'Equal to: 1500<br>Exactly: =1500<br>Less than: <1500<br>Greater than: >1500<br>Between: 1000,1500', 
				input: {format: 'string', placeholder: '>10000'}}
		],
		w: 140,
		manualVal: function(filter){
			return 'Sales: '+filter.val;
		}
	},

	'units': {
		//icon: 'reply',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Units', val:'', description: 'Equal to: 1500<br>Exactly: =1500<br>Less than: <1500<br>Greater than: >1500<br>Between: 1000,1500', 
				input: {format: 'string', w:150, placeholder: '>1500'}}
		],
		w: 140,
		manualVal: function(filter){
			return 'Units: '+filter.val;
		}
	},

	'returns': {
		//icon: 'reply',
		values: [
			{label: 'Clear', val: ''},
			'divider',
			{label: 'Returns', val:'', description: 'Equal to: 1500<br>Exactly: =1500<br>Less than: <1500<br>Greater than: >1500<br>Between: 1000,1500', 
				input: {format: 'string', w:150, placeholder: '>1500'}}
		],
		w: 140,
		manualVal: function(filter){
			return 'Returns: '+filter.val;
		}
	},
	
	benchmark: {
		permission: 'view-benchmark',
		values: [
			{ label: 'Is Set', val: '' },
			{ label: 'Not Set', val: 'null' },
			'divider',
			{ label: 'No Audible', val: 'No Audible' },
			{ label: 'Blackstone Audio (Delayed Royalty - Reporting)', val: 'Blackstone Audio (Delayed Royalty - Reporting)' },
			{ label: 'Blackstone Audio (Royalty-Bearing)', val: 'Blackstone Audio (Royalty-Bearing)' },
			{ label: 'Blackstone Audio (Delayed Royalty - Reporting - No Streaming)', val: 'Blackstone Audio (Delayed Royalty - Reporting - No Streaming)' },
			{ label: 'Blackstone Audio (Royalty Floor)', val: 'Blackstone Audio (Royalty Floor)' }
		],
		w: 430
	}

}