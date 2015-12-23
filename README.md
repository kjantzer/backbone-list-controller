# List Controller

> A powerful Backbone.js class that renders a collection of models as a list with infinite scrolling, sorting, filtering, and search field.

[![screen shot](http://i.imgur.com/JnClJ6D.png)](http://kjantzer.github.io/backbone-list-controller/)

In any application dealing with a significant amount of data, displaying a list of data will be necessary. This could be for reporting, work progress, or data review. Whatever the use case, List Controller lessens the burden of generating these list.

List Controller improves DOM responsiveness by lazy loading the rows with infinite scrolling. The library also provides common list actions: sorting, filtering, and bulk actions. Filters are stored in local storage so that the application remembers the last selected filter set. In addition, multiple filters can be saved as a "preset" for quickly using later.

This library has been 3+ years in the making here at [Blackstone Audio](http://www.blackstoneaudio.com/). It is used everyday in dozens of areas inside our ERP application and is constantly being improved.

List Controller relies heavliy on [Dropdown.js](http://kjantzer.github.io/backbone-dropdown/) for the list actions (sort, filter, and bulk actions).

## [Demo & Documentation](http://kjantzer.github.io/backbone-list-controller/)

Check out the [demo and documentation](http://kjantzer.github.io/backbone-list-controller/) to see the List Controller in action.


## Basic Use

To use List Controller, you at least need these three things:

**1) Collection**

```js
var Coll = SortableCollection.extend({})
```

**2) List View** (view for each row)

```js
var ListView = Backbone.View.extend({
	tagName: 'li',
	className: 'row',

	render: function(){
		this.$el.html(this.model.get('label'))
		return this;
	}
})
```

**3) List Controller**

```js
var Controller = ListController.extend({

	el: '#demo',
	listView: ListView,

	// tell infinite scroll to load more when reaching the end of this list
	scrollContext: '#demo .list',

	initialize: function(){
		
		var fakeData = [], i=0;
		while(i++<60){ fakeData.push({id: i, label: 'Row '+i})}
		
		this.collection = new Coll(fakeData);
	}	
})

var listController = new Controller();

// later... render the controller
listController.render();
```