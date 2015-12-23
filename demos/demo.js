var Demo = {};

var COLORS = ['blue', 'yellow', 'green', 'red', 'orange'];
var LOCATIONS = ['Oregon', 'Idaho', 'Washington', 'Montana', 'California'];



Demo.Model = Backbone.Model.extend({
	defaults: function(){
		
		// spoofed data using Chance.js
		return{
			label: chance.first()+' '+chance.last(),
			email: chance.email(),
			gender: chance.gender(),
			color: chance.pick(COLORS),
			location: chance.pick(LOCATIONS)
		}
	}
})



Demo.Collection = SortableCollection.extend({
	
	model: Demo.Model,
	
	defaultSort: 'label',
	
	initialize: function(){
		this.addModels(200);
	},
	
	filters: [
		{key: 'gender'},
		//{key: 'gender', val: 'Male'}, // if a val is set, then it will be used as the default val before a user has selected a filter
		{key: 'color'},
		{key: 'location'},
		{key: 'coastal'}
	],
	
	addModels: function(num){
		// spoof 200 models
		var models = [];
		for(var i=0; i<num; i++){models.push({id: i+1});}
		this.add(models);
		this.trigger('reset');
	}
	
})



Demo.Controller = ListController.extend({
	
	el: '#demo',
	listView: 'Demo.ControllerRow',

	allowDownload: 'saveToCSV',
	viewBtn: true,
	allowPresets: true,
	
	toggleFullscreen: function(e){
		this.$el.hasClass('fullscreen') ? this.$el.removeClass('fullscreen') : this.$el.addClass('fullscreen')		
		return false;
	},
	
	scrollContext: '#demo .list', // the context for which the list is scrolling. If improperly set, infinite scrolling will not work
	
	initialize: function(){
		
		this.collection = new Demo.Collection();
		
		this.setActiveFilters( this.collection.filterVals() )
	},
	
	bulkActions: [{
		label: 'Email',
		onClick: 'emailSelected'
	},{
		label: 'Delete',
		icon: 'trash',
		onClick: 'deleteSelected'
	}],
	
	emailSelected: function(){
		var emails = this.getCurrentCollection().pluck('email');
		Modal.alert('Send Email to:', emails.join('<br>'));
	},
	
	deleteSelected: function(){
		var coll = this.getCurrentCollection();
		Modal.confirmDelete('Delete '+coll.length+' records?', '', function(){
			console.log('Implement method to delete the following', coll.models);
		})
	},
	
	filters: {
		
		// the filter keys will be used as the "label" .... "gender" will become "Gender"
		'gender': {
			//label: 'Sex',					// if you wish to have a different label than the key, you can set it here
			w: 80,
			values: [						// the values parameter is sent to Dropdown.js so review that component for structure
				{label: 'Clear', val: ''},
				'divider',
				{label: 'Male', val: 'Male'},
				{label: 'Female', val: 'Female'},
			],
			filterBy: 'text' // this can be a function if custom filtering logic is required
		},
		
		'color': {
			values: [
				{label: 'Clear', val: ''},
				'divider',
				{label: 'Blue', val: 'blue', border: '#2980b9'},
				{label: 'Yellow', val: 'yellow', border: '#f1c40f'},
				{label: 'Green', val: 'green', border: '#27ae60'},
				{label: 'Red', val: 'red', border: '#e74c3c'},
				{label: 'Orange', val: 'orange', border: '#e67e22'},
			],
			filterBy: 'text',
			multi: true
		},
		
		'location': {
			icon: 'location', 					// this will set "icon-location" on the filter button which works great with Basic Buttons
			values: [
				{label: 'Clear', val: ''},
				'divider',
				{label: 'Oregon', val: 'Oregon'},
				{label: 'Idaho', val: 'Idaho'},
				{label: 'Washington', val: 'Washington'},
				{label: 'Montana', val: 'Montana'},
				{label: 'California', val: 'California'},
			],
			filterBy: 'text',
			multi: true
		},
		
		'coastal':  {
			icon: 'location',
			values: [
				{label: 'Clear', val: ''},
				'divider',
				{label: 'Coastal State', val: 'yes'},
				{label: 'Land Locked', val: 'no'}
			],
			filterBy: function(model, filterVal, filterKey){
				return (filterVal == 'yes' && _.contains(['Oregon', 'Washington', 'California'], model.get('location')))
					|| (filterVal == 'no' && !_.contains(['Oregon', 'Washington', 'California'], model.get('location')))
			},
		}
		
	},
	
	filterContexts: {
	
		// a default context is required
		'default': function(term, model){
			return [ _.score(model.get('label'), term), _.score(model.get('email'), term) ]
		},
		
		'email:': function(term, model){
			return [ _.score(model.get('email'), term) ]
		},
		
		'color:': function(term, model){
			return [ _.score(model.get('color'), term) ]
		},
		
		'loc:': function(term, model){
			return [ _.score(model.get('location'), term) ]
		}
		
	},
	
	sorts: [
		{label: 'Name', val: 'label'},
		{label: 'Location', val: 'location'}
	]
	
})


Demo.ControllerRow = Backbone.View.extend({
	
	tagName: 'li',
	className: 'row',
	template: $('#template-row').html(),
	
	render: function(){
		
		this.$el.html( _.template(this.template)(this.model.templateData()) );
		
		return this;
	}
})



window.addEventListener('DOMContentLoaded', function(){
	window.demo = new Demo.Controller();
	
	setTimeout(function(){
		demo.render();
	}, 500);
})