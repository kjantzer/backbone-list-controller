window.addEventListener('DOMContentLoaded', function(){
	
	var Coll = SortableCollection.extend({
		defaultSort: 'id',
		sorts: {
			'custom-label-sort': function(model, key, isDesc){
	            return model.get('randNum')
			}
		}
		
	})

	var ListView = Backbone.View.extend({
	    tagName: 'li',
	    className: 'row',
		
		render: function(){
			this.$el.html(this.model.get('label') + ' <small>('+this.model.get('randNum')+')</small>')
			return this;
		}
	})
	
	var Controller = ListController.extend({
		
		el: '#demo-3',
		listView: ListView,
		
	    // tell infinite scroll to load more when reaching the end of this list
		scrollContext: '#demo-3 .list',
		
		initialize: function(){
			
			var fakeData = [], i=0;
			while(i++<60){ fakeData.push({id: i, label: 'Row '+i, randNum: Math.round(Math.random() * 1000)})}
			
			this.collection = new Coll(fakeData);
		},
		
		sorts: [
			{label: 'ID', val: 'id'},
			{label: 'Label', val: 'label'},
	        {label: 'Custom Label', val: 'custom-label-sort'}
		]
		
	})

	// initialize the controller
	var listController = new Controller();
	
	// then at some point, render it
	setTimeout(function(){
		listController.render();
	}, 500);
})