/*
	Bulk Actions plugin for ListController
*/
(function(){
	
	var LCPluginEvents = {
		'click .count.btn': 'bulkSelectToggle',
		'click .bulk-select-all': 'bulkSelectAll',
		'click .bulk-deselect-all': 'bulkDeselectAll'
	}
	
	var LCPlugin = {
		
		allowBulkSelect: true,			// always true if `bulkActions` is set
		bulkActionThreshold: 4,	// how many actions until they are all grouped under one button
		
		/*
			Bulk Select Actions (same format as data for dropdown)
			
		bulkActions: [
			{
				label: 'Take Action',
				icon: 'list-add',
				permission: null, // limit this action by permission
				onClick: 'takeAction' // method name (bound to "this" ListController) or function
			}
		],*/
		
		bulkRemove: function(){
			this._bulkRemove('Remove?', 'Remove [num] items{s} from this list?')
		},
		
		bulkSelectToggle: function(){
			this.isBulkSelectOn ? this.bulkSelectOff() : this.bulkSelectOn();
		},
	
		bulkSelectOn: function(){
	
			this.__onBulkSelect = this.__onBulkSelect || this._onBulkSelect.bind(this); // context bound
	
			this.isBulkSelectOn = true;
			this.$el.addClass('bulk-select');
			this.list.$el.addClass('bulk-select');
			this.$el.on('click li', this.__onBulkSelect);
	
			this.updateCount();
	
			this.trigger('bulkselect:toggle', 'on')
		},
	
		bulkSelectOff: function(){
			this.isBulkSelectOn = false;
			this.$el.removeClass('bulk-select');
			this.list.$el.removeClass('bulk-select');
			this.$el.off('click li', this.__onBulkSelect);
			this.bulkDeselectAll();
	
			this.trigger('bulkselect:toggle', 'off')
		},
	
		_onBulkSelect: function(e){
	
			var el = e.target;
	
			// must click the <li> tag
			if( el.tagName !== 'LI' ) return;
	
			var selectBoxWidth = parseFloat(window.getComputedStyle(el, '::before').getPropertyValue('width'));
			var mouseClickX = event.clientX - el.getBoundingClientRect().left;
	
			// did not select within "select" box
			if( mouseClickX < 0 || mouseClickX > selectBoxWidth ) return;
	
			var lastIndx = this._lastBulkSelectIndex || 0;
			var indx = _.getNodeIndex(el);
	
			e.preventDefault();
			e.stopPropagation();
	
			// select range
			if( e.shiftKey ){
	
				var model = this.getCollection().at(indx);
				var _selected = !model._selected;
	
				for( var i = _.min([lastIndx, indx]); i<=_.max([lastIndx, indx]); i++){
	
					var model = this.getCollection().at(i);
					var view = this.list.subview('list-view-'+model.id);
	
					model._selected = _selected;
	
					model._selected ? view.$el.addClass('selected') : view.$el.removeClass('selected')
	
				}
	
			// select single
			}else{
	
				var model = this.getCollection().at(indx);
				var view = this.list.subview('list-view-'+model.id);
	
				model._selected = !model._selected;
	
				model._selected ? view.$el.addClass('selected') : view.$el.removeClass('selected')
	
			}
	
			this.updateCount();
	
			this._lastBulkSelectIndex = indx;
		},
	
		bulkSelectAll: function(selected){
			selected = selected === false ? false : true;
	
			var coll = selected ? this.getCollection() : this.getSelected();
	
			coll.each(function(model){
	
				model._selected = selected;
				var view = this.list.subview('list-view-'+model.id);
				view && view.$el.removeClass('selected');
	
				if( view )
					model._selected ? view.$el.addClass('selected') : view.$el.removeClass('selected')
	
			}.bind(this));
	
			this.updateCount();
		},
	
		bulkDeselectAll: function(){
			this.bulkSelectAll(false);
		},
		
		_appendBulkSelectActions: function(){
	
			this.$top.append('<div class="bulk-select-actions no-selection">\
				<span class="btn-group">\
					<a class="btn icon-check bulk-select-all"></a>\
					<a class="btn icon-check-empty bulk-deselect-all"></a>\
				</span>\
			</div>');
	
			if( this.bulkActions ){
	
				var $actionDiv = this.$top.find('.bulk-select-actions');
	
				// list out actions as individual buttons
				if( this.bulkActions.length <= this.bulkActionThreshold ){
	
					_.each(this.bulkActions, function(d){
	
						if( d.onClick || d.dropdown ){
	
							// not allowed to see this
							if( d.permission && !ListController.permission(d.permission))
								return;
	
							var className = d.className || '';
	
							className += d.icon ? ' icon-'+d.icon : '';
							className += d.icon=='trash' ? ' hover-red' : '';
	
							$btn = $('<a class="btn action '+className+'">'+d.label+'</a>').appendTo($actionDiv);
	
							if( d.onClick ){
								var fn = _.determineFn(d.onClick, this);
								if( fn )
									$btn.click(fn)
	
							}else if( d.dropdown ){
								d.dropdown.context = this;
								$btn.dropdown(d.dropdown.view||d.dropdown.values, d.dropdown);
							}
								
						}
	
					}.bind(this));
	
				// or put everything under one button
				}else{
					$('<a class="btn action">Take Action</a>')
						.appendTo($actionDiv)
						.dropdown(this.bulkActions, { context:this, align: 'bottomRight', w: 200})
				}
	
				
			}
		},
		
		_bulkRemove: function(title, msg){

			var coll = this.getSelected();

			Modal.confirmDelete(title, _.plural(msg, coll.length), function(){
				_.each([].concat(coll.models), function(model){
					model.destroy(); // note: this might be sluggish if removing a bunch at a time but it will work for now
				})	
			})
		}
	}
	
	_.extend(ListController.prototype, LCPlugin);
	_.extend(ListController.prototype.__events, LCPluginEvents);
	
})()