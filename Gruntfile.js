module.exports = function(grunt) {

	require('jit-grunt')(grunt);

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		
		less: {
			demo: {
				options: {
					compress: true,
					yuicompress: true,
					optimization: 2
				},
				files: {
					"style.css": "style.less"
				}
			}
		},
		uglify: {

			// non-minified version
			development: {
				src: [
					'src/SortableCollection.js',
					'src/FilterView.js',
					'src/InfiniteListView.js',
					'src/ListController.js',
					'src/ListController.Settings.js',
					'src/DBListController.js',
					'src/plugins/ListController.Filters.js',
					'src/plugins/ListController.Download.js',
					'src/plugins/ListController.BulkSelect.js',
					'src/plugins/ListController.Presets.js',
					'src/Filters.js',	// default filters
				],
				dest: 'list-controller.js',
				options: {
					beautify: true
				}
			},
			production: {
				src: [
					'src/SortableCollection.js',
					'src/FilterView.js',
					'src/InfiniteListView.js',
					'src/ListController.js',
					'src/ListController.Settings.js',
					'src/DBListController.js',
					'src/plugins/ListController.Filters.js',
					'src/plugins/ListController.Download.js',
					'src/plugins/ListController.BulkSelect.js',
					'src/plugins/ListController.Presets.js',
					'src/Filters.js',	// default filters
				],
				dest: 'list-controller.min.js',
				options: {
					banner: '/*! <%= pkg.name %> v<%= pkg.version %> <%= grunt.template.today("dd-mm-yyyy, HH:MM:ss") %> */\n',
				}
			},
			
			demo: {
				src: [
					'node_modules/jquery/dist/jquery.js',
					'lib/amplify.min.js', // local storage for remembering filters
					'lib/liquidmetal.js', // not required, but makes fuzzy searching possible
					'lib/waypoints.min.js', // for infinite scrolling 
					'node_modules/underscore/underscore.js',
					'lib/underscore.string.min.js',	// extends underscore for string operations
					'node_modules/backbone/backbone.js',
					'node_modules/backbone-modal/src/Modal.js', // Used for popups and filter presets
					'node_modules/backbone-modal/lib/spin/spin.min.js', // Modal dependency
					'node_modules/backbone-modal/lib/spin/jquery.spin.js', // Modal dependency
					'node_modules/backbone-dropdown/src/Dropdown.js',
					'node_modules/kjantzer-backbone-subviews/backbone.subviews.js', // view management
					'lib/util.js' // Backbone extentions/mixins to enhance 
				],
				dest: 'demo-dependencies.js',
			}
		},
		
		watch: {
			less: {
				files: ['src/**/*.less', 'lib/**/*.less', 'style.less'],
				tasks: ['less'],
				options: {
					nospawn: true
				}
			},
			js: {
				files: ['src/**/*.js'],
				tasks: ['uglify'],
				options: {
					nospawn: true
				}
			}
		}
	});

	grunt.registerTask('default', ['less', 'uglify']);
	grunt.registerTask('dev', ['watch']);
};