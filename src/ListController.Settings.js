/*
	Override this to fit your application
*/
ListController.permission = function(permission){
	return User.can(permission);
};

// this is the default context used unless it is overridden - this one automatically searches common keys (if they exist)
ListController.prototype._defaultFilterContext = function(term, model){

	var vals = [];

	if( model.has('book_id') )
		vals.push( _.score(model.get('book_id'), term) );

	if( model.has('title') )
		vals.push( _.score(model.get('title'), term) );

	if( model.has('name') )
		vals.push( _.score(model.get('name'), term) );

	if( model.has('label') )
		vals.push( _.score(model.get('label'), term) );

	return vals.length > 0 ? vals : [ 1 ];
}

ListController.prototype._defaultFilterMethods = {
	
	'text': function(model, filterVal, filterKey){
		
		var str = _.isFunction(model[filterKey]) ? model[filterKey].call(model) : model.get(filterKey);
		
		if( _.isArray(filterVal) )
			return _.contains(filterVal, str);
		else
			return str == filterVal;
	},
	'number': function(model, filterVal, filterKey){
		return Number(model.get(filterKey)) == filterVal;
	},
	'int': function(model, filterVal, filterKey){
		return parseInt(model.get(filterKey)) == filterVal;
	},
	'array': function(model, filterVal, filterKey){
		return _.indexOf(filterVal, model.get(filterKey)) > -1
	},
	'model_id': function(model, filterVal, filterKey){
	
		if( _.isArray(filterVal) )
			return _.contains(filterVal, model.get(filterKey).id);
		else
			return model.get(filterKey) && parseInt(model.get(filterKey).id) == filterVal;
	},
	'starts_with': function(model, filterVal, filterKey){
		return (model.get(filterKey)||'').match(RegExp('^'+filterVal));
	},
	'ends_with': function(model, filterVal, filterKey){
		return (model.get(filterKey)||'').match(RegExp(filterVal+'$'));
	},
	'contains': function(model, filterVal, filterKey){
		return (model.get(filterKey)||'').match(RegExp(filterVal));
	},
	'string_operator': function(model, filterVal, filterKey){

		var modelVal = parseFloat(model.has(filterKey)
						? (model.get(filterKey)||0)	// has attirbute with this key
						: (model[filterKey] ? model[filterKey].call(model) : 0)); // or has method name with this key

		if( filterVal == 'true' )
			return modelVal > 0;
		if( filterVal == 'false' )
			return !modelVal;

		var range = filterVal.match(/([0-9]+)[,-]{1}([0-9]+)/);
		if( range )
			return modelVal >= range[1] && modelVal <= range[2];

		if( !filterVal.match(/^[<=>]/) )
			filterVal = '=='+filterVal;
		else if( filterVal.match(/^[=][0-9]/) )
			filterVal = '='+filterVal;

		matches = filterVal.match(/^([<=>]*)(.*)/);
		operator = matches[1];
		filterVal = numeral(matches[2]).value();

		// eval is generally frowned upon, but I think it is needed here
		return eval(modelVal+operator+filterVal);
	}
}