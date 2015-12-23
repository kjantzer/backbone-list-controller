window.addEventListener('DOMContentLoaded', function(){
	
	var Coll = SortableCollection.extend({})

	var ListView = Backbone.View.extend({
	    tagName: 'li',
	    className: 'row',
		
		render: function(){
			this.$el.html(this.model.get('label'))
			return this;
		}
	})
	
	var Controller = ListController.extend({
		
		el: '#demo-2',
		listView: ListView,
		
	    // tell infinite scroll to load more when reaching the end of this list
		scrollContext: '#demo-2 .list',
		
		initialize: function(){
			
			var fakeData = [], i=0;
			while(i++<60){ fakeData.push({id: i, label: 'Row '+i})}
			
			this.collection = new Coll(fakeData);
		}	
	})

	// initialize the controller
	var listController = new Controller();
	
	// then at some point, render it
	setTimeout(function(){
		listController.render();
	}, 500);
})