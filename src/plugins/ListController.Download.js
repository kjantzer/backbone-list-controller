/*
	Download plugin for ListController
*/
(function(){
	
	var LCPlugin = {
		
		allowDownload: false,			// will show download button for CSV export
		downloadName: null,				// use default naming convention
		
		resultExportDefaults: ['sendToOnixGenerator', 'divider', 'saveToCSV'],

		resultExports: {
			
			'saveToCSV': {
				label: 'Save list as CSV',
				title: 'Download simple CSV file with the data in the current list',
				icon: 'file-excel',
				onClick: function(){
					this.getCurrentCollection().saveToCSV(this.parentView?_.stripTags(this.parentView.title):'', {
						title: this.parentView?_.stripTags(this.parentView.title):'',
						description: this.activeFilterString(', ', false)
					});
				}
			},

			'digitalMetadata': {
				label: 'Digital Metadata CSV',
				title: 'Download legacy Digital Metadata CSV. Use with macros to format for specific partners.',
				icon: 'file-excel',
				onClick: function(){
					var ids = this.getCurrentCollection().pluck('book_id');

					// 360 - close to url max 2000 characters
					// 1500 - close to chrome 64K (http://stackoverflow.com/a/15090286/484780)
					if( ids.length > 1500 )
						return Modal.alert('No can do', 'You‘re trying to export too many books. Please refine your result set.');

					document.location = '/api/report/digital/'+ids.join(',');
				}
			},

			'sendToOnixGenerator': {
				label: 'Send to Onix Generator',
				title: 'Generate an ONIX feed with the books in this list',
				icon: 'file-code',
				onClick: function(){
					app.subview('onix-generator').open(this.getCurrentCollection())
				}
			}
		},
		
		_appendDownloadBtn: function(){
	
			if( this.allowDownload === true )
				this.allowDownload = 'defaults';
	
			var menu = this._createExportResultsMenu();
	
			if( menu && menu.length > 0 ){
	
				$btn = $('<a class="btn right icon-only icon-download-cloud" title="Export results"></a>')
					.dropdown(menu, {align: 'bottomLeft', w: 200})
					.appendTo( this.$top )
			}
		},
	
		_createExportResultsMenu: function(){

			var self = this;
			var defaults = this.resultExportDefaults || [];
			var menu = _.isString(this.allowDownload) ? [this.allowDownload] : this.allowDownload;

			var indx = _.indexOf(menu, 'defaults'); // if default exports are requested

			// replace "defaults" string with default exports
			if( indx > -1 ){
				var end = menu.splice(indx);
				end.shift();

				// add each default to menu (cloning so we don't )
				_.each(defaults, function(item){  menu.push( _.clone(item) ) });

				menu = menu.concat(end);

				if( !defaults || defaults.length < 1 )
					console.error('ListController: No default exports were merged. You need to define them in “ListController.resultExports”')
			}

			_.each(menu, function(key, indx){

				// if it is a key and not a menu object, look for it to be globally defined
				if( _.isString(key) && key !== 'divider' ){

					var val = self.resultExports && self.resultExports[key];

					if( !val )
						console.error('ListController: “'+key+'” export not defined in “ListController.resultExports”');
					else
						menu[indx] = _.clone(val);
				}

				var item = menu[indx];

				if( item && item.onClick ){
					item.onClick = item.onClick.bind(self); // bind on click `this` to be ListController
				}

			});

			return menu;
		},

	}
	
	_.extend(ListController.prototype, LCPlugin);
	
})()