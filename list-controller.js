var SortableCollection = Backbone.Collection.extend({
    constructor: function() {
        this.setupFilters(), Backbone.Collection.prototype.constructor.apply(this, arguments);
    },
    defaultDesc: !1,
    dbSort: !1,
    _key: function() {
        return _.isFunction(this.key) ? this.key() : this.key;
    },
    localStoreKey: function(a) {
        return "list:" + this._key() + (a ? ":" + a : "");
    },
    sortKey: function(a) {
        return void 0 === a ? _.store("list:" + this._key() + ":sort") || this.defaultSort : void _.store("list:" + this._key() + ":sort", a);
    },
    sortDesc: function(a) {
        return void 0 !== a ? _.store("list:" + this._key() + ":sort:desc", a) : void 0 !== _.store("list:" + this._key() + ":sort:desc") ? _.store("list:" + this._key() + ":sort:desc") : this.defaultDesc;
    },
    sortBy: function() {
        if (this.dbSort) return this.models;
        var a = _.sortBy(this.models, this.comparator, this);
        return this.sortDesc() && a.reverse(), a;
    },
    comparator: function(a) {
        if (this.dbSort) return !0;
        var b = this.sortKey(), c = null;
        if (this.sorts && this.sorts[b] ? c = this.sorts[b].call(this, a, b, this.sortDesc()) : "title" === b ? c = _.sortString(a.get(this.sortKey())) : a[b] && _.isFunction(a[b]) ? c = a[b]() : a.has(b) && (c = a.get(b)), 
        this.rootComparator) {
            _.isArray(c) || (c = [ c ]);
            var d = this.rootComparator(a);
            _.isArray(d) || (d = [ d ]), c = d.concat(c);
        }
        return c;
    },
    changeSort: function(a) {
        this.sortKey() == a && this.sortDesc(!this.sortDesc()), this.sortKey(a), this.trigger("sort:change"), 
        this.sort();
    },
    fetch: function(a) {
        var b = {};
        this.filters && (b = this.filterVals(null, "db"), b.filters = this.filterVals(null, "db"), 
        b.sortKey = this.sortKey(), b.sortDesc = this.sortDesc(), b.optionalFilters = this.optionalFilters()), 
        a = a || {}, a.data = a.data ? _.extend(a.data, b) : b, this.url ? Backbone.Collection.prototype.fetch.call(this, a) : a.success(this, []);
    },
    refresh: function(a) {
        return a = 0 == a ? !1 : !0, this.dbSort && a ? void this.trigger("reset") : (this.trigger("spin"), 
        void this.fetch({
            update: a,
            add: !1,
            remove: !1,
            merge: !0,
            success: function(b, c) {
                a && b.reset(c), this.trigger("fetch:success", b, c), this.trigger("spin", !1);
            }.bind(this),
            error: function(b, c) {
                this.trigger("fetch:failed", this, c.statusText, this.refresh.bind(this, a)), this.trigger("spin", !1);
            }.bind(this)
        }));
    },
    setupFilters: function() {
        if (!this._setupFiltersDone && (this._setupFiltersDone = !0, this.filters)) {
            var a = this;
            _.each(this.filters, function(b) {
                if (!b.key) return console.error("!! SortableCollection: filters must have a key specified; this one does not:", b);
                if (b.localStorage !== !1) var c = _.store(a.localStoreKey(b.key));
                c ? _.isObject(c) ? (b.val = c.val, b.optional = c.optional) : b.val = c : _.isFunction(b.val) && (b.val = b.val());
            });
        }
    },
    applyFilter: function(a, b, c) {
        if (c = c || {}, this.filters) {
            var d = this.getFilter(a);
            return d ? (d.val = b, d.localStore !== !1 && _.store(this.localStoreKey(a), {
                val: d.val,
                optional: d.optional
            }), c.silent !== !0 && (this.trigger("filter:change:" + a, b), this.trigger("filter:change", a, b)), 
            d.db && c.fetch !== !1 && this.refresh(), d) : console.error("!! SortableCollection: no filter was found for key: “" + a + "”", this.filters);
        }
    },
    toggleFilterOptional: function(a, b) {
        if (b = b || {}, !this.filters) return console.error("!! SortableCollection: no filters are specifed");
        var c = this.getFilter(a);
        return c ? (c.optional = !c.optional, c.localStore !== !1 && _.store(this.localStoreKey(a), {
            val: c.val,
            optional: c.optional
        }), b.silent !== !0 && (this.trigger("filter:change:" + a, c.optional), this.trigger("filter:change", a, c.optional)), 
        void (c.db && b.fetch !== !1 && this.refresh())) : console.error("!! SortableCollection: no filter was found for key: “" + a + "”", this.filters);
    },
    setFilters: function(a, b) {
        var c = !1;
        _.each(a, function(a, b) {
            filter = this.applyFilter(b, a, {
                silent: !0,
                fetch: !1
            }), c || (c = filter && 1 == filter.db);
        }, this), b !== !1 && c && this.refresh();
    },
    getFiltered: function() {
        return this;
    },
    getFilter: function(a) {
        return this.filters ? _.findWhere(this.filters, {
            key: a
        }) : null;
    },
    filterVals: function(a, b) {
        void 0 == a && (a = this.filters);
        var c = {};
        return a && _.each(a, function(a) {
            ("db" !== b || a.db !== !1) && (c[a.key] = a.val);
        }), c;
    },
    filterOptionals: function(a) {
        void 0 == a && (a = this.filters);
        var b = {};
        return a && _.each(a, function(a) {
            b[a.key] = a.optional;
        }), b;
    },
    optionalFilters: function(a) {
        void 0 == a && (a = this.filters);
        var b = [];
        return a && _.each(a, function(a) {
            a.optional && b.push(a.key);
        }), b;
    }
}), FilterView = Backbone.View.extend({
    events: {
        "keyup input.filter": "filterCollectionFromInput"
    },
    filteredCollection: this.collection,
    filterTerm: "",
    filterResult: null,
    filterMinScore: .7,
    filterResultCollection: function(a) {
        return new Backbone.Collection(a);
    },
    foreachFilterNotInUse: function(a) {
        var b = this;
        a && _.each(this.filters, function(c, d) {
            b.activeFilters && void 0 !== b.activeFilters[d] || a.call(b, c, d);
        });
    },
    foreachFilterInUse: function(a) {
        var b = this;
        a && _.each(this.filters, function(c, d) {
            b.activeFilters && void 0 !== b.activeFilters[d] && a.call(b, c, d);
        });
    },
    filterComparator: null,
    defaultFilterMethods: {
        text: function(a, b, c) {
            return _.isArray(b) ? _.contains(b, a.get(c)) : a.get(c) == b;
        },
        number: function(a, b, c) {
            return Number(a.get(c)) == b;
        },
        "int": function(a, b, c) {
            return parseInt(a.get(c)) == b;
        },
        array: function(a, b, c) {
            return _.indexOf(b, a.get(c)) > -1;
        },
        model_id: function(a, b, c) {
            return _.isArray(b) ? _.contains(b, a.get(c).id) : a.get(c) && parseInt(a.get(c).id) == b;
        },
        starts_with: function(a, b, c) {
            return (a.get(c) || "").match(RegExp("^" + b));
        },
        ends_with: function(a, b, c) {
            return (a.get(c) || "").match(RegExp(b + "$"));
        },
        contains: function(a, b, c) {
            return (a.get(c) || "").match(RegExp(b));
        }
    },
    setActiveFilters: function(a) {
        _.each(a, function(a, b) {
            _.isObject(a) && !_.isArray(a) ? this.applyFilter(a.key, {
                val: a.val,
                optional: a.optional
            }, !1) : this.applyFilter(b, {
                val: a
            }, !1);
        }, this);
    },
    applyFilter: function(a, b, c) {
        b = _.isObject(b) ? b : {
            val: b
        };
        var d = b.val;
        void 0 === d || null === d || "" === d || "All" === d || "all" === d ? this._removeActiveFilter(a) : this._addActiveFilter(a, b), 
        this.trigger("filter:change"), this.refilter(c);
    },
    toggleFilter: function(a, b, c) {
        b = _.isObject(b) ? b : {
            val: b
        }, this.activeFilters[a] ? this._removeActiveFilter(a) : this._addActiveFilter(a, b), 
        this.trigger("filter:change"), this.refilter(c);
    },
    toggleFilterOptional: function(a, b) {
        var c = this.activeFilters[a];
        c && (this.activeFilters[a].optional = !c.optional, this.trigger("filter:change"), 
        this.refilter(b));
    },
    refilter: function(a) {
        return 0 == this.collection.length ? void (this.filteredCollection = this.collection) : (this._filterCollectionWithActiveFilters(), 
        void (a !== !1 && this.filterCollection()));
    },
    _addActiveFilter: function(a, b) {
        this.activeFilters = this.activeFilters || {}, this.activeFilters[a] = b, this.$el.addClass("is-filtered").attr("data-filtered-" + a, b.val);
    },
    _removeActiveFilter: function(a) {
        this.activeFilters = this.activeFilters || {}, delete this.activeFilters[a], this.$el.attr("data-filtered-" + a, null), 
        0 === _.size(this.activeFilters) && this.$el.removeClass("is-filtered");
    },
    _filterCollectionWithActiveFilters: function() {
        this.filteredCollection = this.collection, this.filteredCollection = this.filteredCollection.filter(function(a) {
            var b = [], c = [];
            return _.each(this.activeFilters, function(d, e) {
                var f = d.val, g = d.optional === !0, h = this._filterFn(e);
                if (h) {
                    var i = h.call(this, a, f, e, this);
                    g ? c.push(i) : b.push(i);
                }
            }, this), (0 === b.length || -1 == _.indexOf(b, !1)) && (0 === c.length || _.indexOf(c, !0) > -1);
        }, this), this.filteredCollection = this.filterResultCollection(this.filteredCollection), 
        this.filterComparator && (this.filteredCollection = this.filteredCollection.sortBy(this.filterComparator, this), 
        this.filteredCollection = this.filterResultCollection(this.filteredCollection));
    },
    _filterFn: function(a) {
        var b = this.filters[a] || null;
        return b ? (_.isFunction(b) || _.isString(b) || (b = b.filterBy || null), _.isString(b) && (this.defaultFilterMethods[b] ? b = this.defaultFilterMethods[b] : console.warn("FilterView: “%s” is not valid default filter method. Available defaults:", b, _.keys(this.defaultFilterMethods))), 
        b) : b;
    },
    filterContexts: {
        "default": function() {
            return [ 1 ];
        }
    },
    filterCollectionFromInput: function(a) {
        var b = a.target.value;
        this.filterTerm !== b && (a.target.setAttribute("value", b), this.filterTerm = b, 
        this.filterCollection());
    },
    filterCollection: function() {
        var a = this.filterTerm;
        if ("" != a && this.filterContexts["default"]) {
            this.$el.addClass("filtered"), this.trigger("filter:start", this.filterTerm);
            var b = "default";
            _.each(this.filterContexts, function(c, d) {
                var e = new RegExp("^" + d + "(.*)");
                e.test(a) && (b = d, a = a.match(e)[1].trim());
            });
            var c = this.filteredCollection.filter(function(c) {
                var d = this.filterContexts[b], e = d(a, c), f = _.max(e);
                return c.set("score", f, {
                    silent: !0
                }), f > this.filterMinScore;
            }, this);
            c = _.sortBy(c, function(a) {
                return a.get("score");
            }), c = c.reverse(), this.filterResult = this.filterResultCollection(c);
        } else this.clearFilter(), this.filterContexts["default"] || console.warn("FilterView: no “default” filter context. Please add one.");
        this.collection.trigger("reset");
    },
    clearFilter: function() {
        this.filterTerm = "", this.filterResult = null, this.$el.removeClass("filtered"), 
        this.trigger("filter:done");
    },
    getCollection: function() {
        return !this.filteredCollection && _.size(this.activeFilters) > 0 ? this._filterCollectionWithActiveFilters() : this.filteredCollection || (this.filteredCollection = this.collection), 
        this.filterResult || this.filteredCollection;
    }
});

InfiniteListView = Backbone.View.extend({
    tagName: "ul",
    className: "list",
    noResultsMsg: "No Results",
    events: {
        "click .load-more": "endReached"
    },
    initialize: function(a, b) {
        this._views = [], this.lastRow = 0, this.enabled = !0, this.opts = _.extend({
            maxRows: 30,
            context: window
        }, b), this.maxRows = this.opts.maxRows, this.$el.appendTo(a), this.opts.className && this.$el.addClass(this.opts.className);
    },
    removeItem: function(a, b) {
        b = void 0 != b ? b : !0;
        var c = this.el.childNodes[a], d = this._views[a];
        this._views.splice(a, 1), c ? (this.lastRow--, d.remove(b, this.attachWaypoint.bind(this))) : console.warn("Could not find element to remove at index", a);
    },
    addMore: function(a) {
        var b = this.lastRow;
        if (b >= a.length && a.length > 0) return void this.$endOfList.html("<p>End of list • " + a.length + " results</p>");
        if (this.$endOfList || (this.$endOfList = $('<li class="end-of-list clearfix"></li>').appendTo(this.$el)), 
        this.$endOfList.html("").detach(), 0 === a.length) return $("<p>" + this.noResultsMsg + "</p>").appendTo(this.$endOfList), 
        void this.$endOfList.appendTo(this.$el);
        for (b; b < this.lastRow + this.maxRows; b++) {
            var c = a.at(b);
            c && this.trigger("addOne", c);
        }
        this.lastRow = b, b >= a.length ? $("<p>End of list • " + a.length + " results</p>").appendTo(this.$endOfList) : $('<p class="load-more">Load more</p>').appendTo(this.$endOfList), 
        this.$endOfList.appendTo(this.$el), _.defer(this.attachWaypoint.bind(this));
    },
    addOne: function(a) {
        this._views.push(a), this.$el.append(a.render().el);
    },
    endReached: function() {
        this.$endOfList.html("<p>Loading more results...</p>"), this.trigger("endReached");
    },
    attachWaypoint: function() {
        if (this.enabled && 0 != this.$el.parents("body").length) {
            var a = this;
            !this.context && _.isString(this.opts.context) && (this.context = document.querySelector(this.opts.context)), 
            this.__waypoint && this.__waypoint.destroy(), this.__waypoint = new Waypoint({
                element: this.$endOfList[0],
                offset: function() {
                    return a.context.offsetHeight;
                },
                context: $(this.opts.context),
                handler: function() {
                    this.destroy(), a.endReached();
                }
            });
        }
    },
    clear: function() {
        this.$el.html(""), this._views = [], this.lastRow = 0;
    },
    enable: function() {
        this.enabled = !0;
    },
    disable: function() {
        this.enabled = !1;
    }
}), ListController = Backbone.View.extend({
    _className: "list-controller",
    maxRows: 30,
    listStyle: "simple",
    reuseListViews: !1,
    displayList: !0,
    scrollContext: "#main .inner",
    noResultsMsg: "No Results",
    filter: !0,
    filterMinScore: .7,
    filterDelay: 200,
    filterPlaceholder: "Filter...",
    filterInputStyle: "right auto-hide",
    filterDropdownW: 120,
    filterComparator: null,
    fetchOnRender: !1,
    refreshBtn: !1,
    allowFilterQueueing: !0,
    viewBtn: !1,
    defaultView: "list",
    compareViewLimit: null,
    sorts: [],
    filterContexts: {},
    filterResultCollection: function(a) {
        return new Backbone.Collection(a);
    },
    constructor: function(a) {
        this.checkSetupTimeout = setTimeout(this.__checkSetup.bind(this), 0), Backbone.View.prototype.constructor.call(this, a);
    },
    __checkSetup: function() {
        this.checkSetupTimeout && this.__setup();
    },
    __events: {
        "keyup input.filter": "filterCollectionFromInput",
        "click a.change-desc": "changeDesc",
        "click .manual-refresh": "manualRefresh",
        "click .apply-queued-filters": "applyQueuedFilters"
    },
    __listenerEvents: [ [ "sort:change", "_addAll" ], [ "sort:change", "_renderSortSelect" ] ],
    __setup: function() {
        if (clearTimeout(this.checkSetupTimeout), this.events = _.extend({}, this.events || {}, this.__events), 
        this.setupFilters && this.setupFilters(), this.$el.addClass(this._className), this.$top = $('<div class="filter-bar top clearfix"></div>').appendTo(this.$el), 
        this.displayList !== !1) {
            var a = this.options.scrollContext || this.scrollContext;
            this.list = new InfiniteListView(this.$el, {
                maxRows: this.maxRows,
                context: a,
                className: this.listStyle + " list clearfix"
            }), this.setView(), this.listenTo(this.list, "addOne", this._addOne), this.listenTo(this.list, "endReached", this._addMore);
        }
        _.isFunction(this.filterContexts["default"]) || (this.filterContexts["default"] = this._defaultFilterContext), 
        _.each(this.__listenerEvents, function(a) {
            var b = a[0], c = a[1];
            this[c] && this.listenTo(this, b, this[c]);
        }.bind(this)), (this.collection || !this.collection && !this.collectionSwitcher) && this.changeCollection(this.collection), 
        this.trigger("setup:done");
    },
    changeCollection: function(a) {
        !a || a instanceof SortableCollection ? a || (a = new SortableCollection()) : console.warn("!! ListController: “collection” is not an instance of SortableCollection", this), 
        this.collection && (this.collection.getFiltered = null, this.stopListening(this.collection)), 
        this.collection = a, this.collection.getFiltered = this.getCollection.bind(this), 
        this.listenTo(this.collection, "spin", this.spin), this.listenTo(this.collection, "reset", this._addAllFromReset), 
        this.listenTo(this.collection, "add", this._addAll), this.listenTo(this.collection, "remove", this._removeItem), 
        this.listenTo(this.collection, "fetch:failed", this._fetchFailed);
    },
    spin: function(a) {
        this.trigger("spin", a !== !1), a && this.updateCount("Loading..."), a !== !1 && this.$el.removeClass("invalid-data");
    },
    render: function() {
        return this._renderTop(), this.clearFilter(), !this.collection && this.collectionSwitcher ? this.promptCollectionSwitcherPick() : this.fetchOnRender ? this.autoFetchOnRender() : 0 == this.collection.length ? this.collection.trigger("reset") : _.defer(_.bind(function() {
            this.collection.trigger("reset");
        }, this)), this.trigger("render"), this.delegateEvents(), this;
    },
    promptCollectionSwitcherPick: function() {
        console.log("promptCollectionSwitcherPick: finish me");
    },
    autoFetchOnRender: function(a) {
        a = a || !1, this.collection.refresh(a);
    },
    manualRefresh: function() {
        this.autoFetchOnRender(!0);
    },
    _fetchFailed: function(a, b, c) {
        this.$el.addClass("invalid-data"), "Invalid User" != b && new Modal({
            title: b,
            msg: "What would you like to do?",
            theme: "ios7",
            btns: [ {
                label: "Retry",
                className: "green btn-primary md-close",
                onClick: function() {
                    c();
                },
                eventKey: "enter"
            }, {
                label: "Reset Filters",
                className: "btn-primary md-close",
                onClick: this.resetFilters.bind(this)
            }, "cancel" ]
        });
    },
    _addOne: function(a) {
        if (this.trigger("addOne", a), _.isString(this.listView) && (this.listView = _.getObjectByName(this.listView)), 
        !this.listView) return void console.error("! ListController: a “listView” must be defined");
        var b = {
            model: a
        };
        if (this.listViewData && (b = _.extend(this.listViewData(this.lastModel, a), b)), 
        this._addOneDivider(a), 1 == this.reuseListViews) var c = this.list.subview("list-view-" + a.id) || this.list.subview("list-view-" + a.id, new this.listView(b)); else var c = this.list.subview("list-view-" + a.id, new this.listView(b));
        c.parentView = this, c.controller = this, this.lastModel = a, this.list.addOne(c), 
        a._selected ? c.$el.addClass("selected") : c.$el.removeClass("selected"), this.close && this.listenTo(c, "panel:close", this.close);
    },
    _addOneDivider: function(a) {
        if (this.listViewDivider && !this.filterTerm) {
            var b = _.isFunction(this.listViewDivider) ? this.listViewDivider() : a[this.listViewDivider] && _.isFunction(a[this.listViewDivider]) ? a[this.listViewDivider].call(a) : a.get(this.listViewDivider);
            b != this.__lastLabelDivider && (this.list.$el.append('<li class="list-divider">' + b + "</li>"), 
            this.__lastLabelDivider = b);
        }
    },
    _addMore: function() {
        this.list.addMore(this.getCollection()), this.trigger("addMore");
    },
    refreshList: function() {
        this._addAll();
    },
    _addAllFromReset: function(a, b) {
        a && b && this.list.cleanupSubviews(!0), this._addAll();
    },
    _addAll: function() {
        this.displayList && (this.list.clear(), this.lastModel = null, this.__lastLabelDivider = null, 
        this.list.noResultsMsg = this.filterTerm ? "No Results for <i>“" + this.filterTerm + "”</i>" : _.isFunction(this.noResultsMsg) ? this.noResultsMsg() : this.noResultsMsg, 
        this.refilter(!1), this.trigger("addAll"), this.compareViewLimit && this.inCompareMode() && this.getCollection().length > this.compareViewLimit && this.setView("list"), 
        this._addMore(), this.updateCount());
    },
    _removeItem: function(a) {
        var b = this.getCollection().indexOf(a);
        this.list.removeItem(b, !1), this.filteredCollection.remove(a), _.defer(function() {
            this.updateCount();
        }.bind(this));
    },
    _renderTop: function() {
        this.$top.html("");
        var a = this.bulkActions || this.allowBulkSelect && this.allowDownload;
        this.refreshBtn && this.$top.append('<a class="btn right icon-only icon-arrows-ccw manual-refresh" title="Refresh results"></a>'), 
        this.viewBtn && this.displayList && this._appendViewBtn(), this.allowDownload && this._appendDownloadBtn && this._appendDownloadBtn(), 
        this.filter && (this.$filter = $('<input type="text" placeholder="' + this.filterPlaceholder + '" class="filter ' + this.filterInputStyle + '">').val(this.filterTerm).appendTo(this.$top)), 
        this.$count = $('<span class="count no-selection ' + (a ? "btn" : "") + '" title="' + (a ? "Toggle bulk select" : "") + '"></span>').appendTo(this.$top), 
        this.renderTop && this.renderTop(), a && this._appendBulkSelectActions && this._appendBulkSelectActions(), 
        this.sorts && this.sorts.length > 0 && this.$top.append(this._renderSortSelect()), 
        this.filters && this._renderFilterSelects && this.$top.append(this._renderFilterSelects()), 
        this.header && this._renderHeader();
    },
    _renderHeader: function() {
        var a = "";
        _.each(this.header, function(b) {
            b = _.extend({
                label: "",
                className: ""
            }, _.isString(b) ? {
                label: b
            } : b);
            var c = _.underscored(_.stripTags(b.label));
            a += '<div class="col ' + c + " header-" + c + " " + b.className + '">' + b.label + "</div>";
        }), this.$top.addClass("has-header"), this.$header = $('<div class="header-bar clearfix">' + a + "</div>").appendTo(this.$top);
    },
    _appendViewBtn: function() {
        {
            var a = [ {
                label: "List",
                val: "list"
            }, {
                label: "Grid",
                val: "grid"
            }, {
                label: "Compare",
                val: "compare"
            } ], b = {
                align: "bottomLeft",
                w: 100,
                onClick: this.onSetView.bind(this)
            };
            $('<a class="btn right icon-only icon-columns switch-view" title="Switch view: List / Compare / Grid"></a>').dropdown(a, b).appendTo(this.$top);
        }
    },
    inListMode: function() {
        return "list" == this.viewKey();
    },
    inCompareMode: function() {
        return "compare" == this.viewKey();
    },
    inGridMode: function() {
        return "grid" == this.viewKey();
    },
    viewKey: function() {
        return _.store("ListController:view:" + this.className) || this.defaultView;
    },
    onSetView: function(a) {
        var b = this.setView(a.val), c = _.capitalize(a.val) + " View", d = "There are too many results for the <b>" + a.val.toUpperCase() + "</b> view.<br><br>It is limited to " + this.compareViewLimit + " results";
        b != a.val && ("undefined" == typeof Modal ? alert(c + "\n\n" + _.stripTags(d)) : Modal.alert(c, d));
    },
    setView: function(a) {
        var b = this.viewKey(), c = a ? a : b;
        return this.viewBtn || (c = this.defaultView), this.compareViewLimit && "compare" == c && this.getCollection().length > this.compareViewLimit && (c = "compare" == b ? "list" : b), 
        this.list.$el.removeClass("mode-" + b), this.list.$el.addClass("mode-" + c), _.store("ListController:view:" + this.className, c), 
        c != b && this.trigger("view:change", c, this), c;
    },
    _renderSortSelect: function() {
        if (this.sorts && 0 != this.sorts.length) {
            this.$sortSelect ? this.$sortSelect.html("") : this.$sortSelect = $('<div class="sorts"></div>');
            var a = _.findWhere(this.sorts, {
                val: this.collection.sortKey()
            }), b = a && a.label ? a.label : "No sort", c = this.collection.sortDesc() ? "icon-sort-name-down" : "icon-sort-name-up";
            return $btn = $('<span class="btn-group" title="Change sort"><a class="btn ' + c + ' change-desc">' + b + '</a><a class="btn icon-only icon-down-open change-sort"></a></span>').appendTo(this.$sortSelect), 
            $btn.find(".change-sort").dropdown(this.sorts, {
                align: "bottom",
                w: 120,
                onClick: this._onChangeSort.bind(this)
            }), this.$sortSelect;
        }
    },
    downloadCSV: function() {
        this.getCollection().saveToCSV(this.downloadName);
    },
    changeDesc: function() {
        this.changeSort(this.collection.sortKey());
    },
    changeSort: function(a) {
        this.collection.changeSort(a), this.trigger("sort:change");
    },
    _onChangeSort: function(a) {
        this.changeSort(a.val);
    },
    activeFilter: function(a) {
        return this.activeFilters && this.activeFilters[a];
    },
    activeFilterVal: function(a, b) {
        return this.activeFilter(a) ? this.activeFilter(a).val : b;
    },
    activeFilterString: function(a, b) {
        var c = [];
        return _.each(this.activeFilters, function(a, b) {
            var d = this.filters[b].label || _.titleize(_.humanize(b));
            c.push("<em>" + d + ":</em> <b>" + this._renderActiveFilter(a, b, !0) + "</b>");
        }, this), c = c.join(a || ", "), b === !1 && (c = _.stripTags(c)), c;
    },
    isQueueing: function() {
        return this.__queueing === !0;
    },
    toggleQueueUpFilters: function() {
        this.isQueueing() ? this.applyQueuedFilters() : this.beginQueueingFilters();
    },
    beginQueueingFilters: function() {
        this.__queueing = !0, this.$el.addClass("queueing-filters"), this.trigger("filter:queue:begin");
    },
    applyQueuedFilters: function() {
        this.__queueing = !1, this.$el.removeClass("queueing-filters"), this.trigger("filter:queue:apply"), 
        this.manualRefresh();
    },
    _onFilterChange: function(a, b, c) {
        var d = c.val, e = this.filters[a], f = this.activeFilters[a];
        if (!d && c.filters) return void this.resetFiltersTo(c.filters);
        if (e.multi) if (void 0 === d || null === d || "" === d) ; else if (_.metaKey()) {
            var g = f ? [].concat(f.val) : [], h = _.indexOf(g, d);
            h > -1 ? g.splice(h, 1) : g.push(d), d = g;
        } else d = [ d ];
        this.changeFilter(a, d, b);
    },
    changeFilter: function(a, b, c) {
        var d = this;
        if (this.collectionSwitcherKey == a) {
            var e = this.collectionSwitcher.get(b), f = e ? e.switcherCollection() : null;
            !f || f instanceof Backbone.Collection ? (this.spin(), this.changeCollection(f), 
            f ? this.autoFetchOnRender() : this.manualRefresh()) : f && console.warn("!! Cannot switch to non Backbone.Collection:", b, e, f);
        }
        this.trigger("filter:changing", a, b), _.defer(function() {
            d.collection.applyFilter(a, b, {
                fetch: !d.isQueueing()
            }), d._applyFilter(a, {
                val: b,
                optional: c
            }, !d.isQueueing());
        });
    },
    toggleFilter: function(a, b, c) {
        this.activeFilters && this.activeFilters[a] && (b = null), this.changeFilter(a, b, c);
    },
    _onFilterOptionalToggle: function(a) {
        this.collection.toggleFilterOptional(a, {
            fetch: !this.isQueueing()
        }), this._toggleFilterOptional(a, !this.isQueueing());
    },
    resetFilters: function() {
        this.resetFiltersTo({});
    },
    resetFiltersTo: function(a) {
        var b = {};
        this.foreachFilterInUse(function(a, c) {
            if (a.values) {
                var d = a.values;
                _.isFunction(d) && (d = d.call(a)), d[a.defaultValIndex || 0] && (b[c] = d[a.defaultValIndex || 0].val);
            }
        }), b = _.extend(b, a), this.collection.setFilters(b, !this.isQueueing()), this.setActiveFilters(b), 
        this.trigger("sort:change");
    },
    updateCount: function(a) {
        if (this.$count) {
            var b = a || this.getCollection().length;
            !a && this.isBulkSelectOn && (b = this.getSelected().length + " of " + b, this.$count.attr("data-selected", this.getSelected().length)), 
            this.$count.html(b);
        }
    },
    focusFilter: function() {
        this.$filter && this.$filter.focus();
    },
    scrollTo: function(a, b) {
        var a = a instanceof Backbone.View ? a.el : a;
        b = b || 0, this.list.el.scrollTop = a.offsetTop + b;
    },
    filteredCollection: this.collection,
    filterTerm: "",
    filterResult: null,
    foreachFilterNotInUse: function(a) {
        var b = this;
        a && _.each(this.filters, function(c, d) {
            b.activeFilters && void 0 !== b.activeFilters[d] || a.call(b, c, d);
        });
    },
    foreachFilterInUse: function(a) {
        var b = this;
        a && _.each(this.filters, function(c, d) {
            b.activeFilters && void 0 !== b.activeFilters[d] && a.call(b, c, d);
        });
    },
    setActiveFilters: function(a) {
        this.activeFilters = {}, _.each(a, function(a, b) {
            _.isObject(a) && !_.isArray(a) ? this._applyFilter(a.key, {
                val: a.val,
                optional: a.optional
            }, !1) : this._applyFilter(b, {
                val: a
            }, !1);
        }, this);
    },
    _applyFilter: function(a, b, c) {
        b = _.isObject(b) ? b : {
            val: b
        };
        var d = b.val;
        void 0 === d || null === d || "" === d ? this._removeActiveFilter(a) : this._addActiveFilter(a, b), 
        this.trigger("filter:change"), this.refilter(c);
    },
    _toggleFilterOptional: function(a, b) {
        var c = this.activeFilters[a];
        c && (this.activeFilters[a].optional = !c.optional, this.trigger("filter:change"), 
        this.refilter(b));
    },
    refilter: function(a) {
        return 0 == this.collection.length ? void (this.filteredCollection = this.collection) : (this._filterCollectionWithActiveFilters(), 
        void (a !== !1 && this.filterCollection()));
    },
    _addActiveFilter: function(a, b) {
        this.activeFilters = this.activeFilters || {}, this.activeFilters[a] = b, this.$el.addClass("is-filtered").attr("data-filtered-" + a, b.val);
    },
    _removeActiveFilter: function(a) {
        this.activeFilters = this.activeFilters || {}, delete this.activeFilters[a], this.$el.attr("data-filtered-" + a, null), 
        0 === _.size(this.activeFilters) && this.$el.removeClass("is-filtered");
    },
    _filterCollectionWithActiveFilters: function() {
        this.filteredCollection = this.collection, this.filteredCollection = this.filteredCollection.filter(function(a) {
            var b = [], c = [];
            return _.each(this.activeFilters, function(d, e) {
                var f = d.val, g = d.optional === !0, h = this._filterFn(e);
                if (h) {
                    var i = h.call(this, a, f, e, this);
                    g ? c.push(i) : b.push(i);
                }
            }, this), (0 === b.length || -1 == _.indexOf(b, !1)) && (0 === c.length || _.indexOf(c, !0) > -1);
        }, this), this.filteredCollection = this.filterResultCollection(this.filteredCollection), 
        this.filterComparator && (this.filteredCollection = this.filteredCollection.sortBy(this.filterComparator, this), 
        this.filteredCollection = this.filterResultCollection(this.filteredCollection));
    },
    _filterFn: function(a) {
        var b = this.filters[a] || null;
        return b ? (_.isFunction(b) || _.isString(b) || (b = b.filterBy || null), _.isString(b) && (this._defaultFilterMethods[b] ? b = this._defaultFilterMethods[b] : console.warn("FilterView: “%s” is not valid default filter method. Available defaults:", b, _.keys(this._defaultFilterMethods))), 
        b) : b;
    },
    filterCollectionFromInput: function(a) {
        var b = a.target.value;
        this.filterTerm !== b && (a.target.setAttribute("value", b), this.filterTerm = b, 
        clearTimeout(this._filterCollectionFromInputTimeout), this._filterCollectionFromInputTimeout = setTimeout(function() {
            this.filterCollection(), this.trigger("filter:search", b);
        }.bind(this), this.filterDelay));
    },
    filterCollection: function() {
        var a = this.filterTerm;
        if ("" != a && this.filterContexts["default"]) {
            this.$el.addClass("filtered"), this.trigger("filter:start", this.filterTerm);
            var b = "default";
            _.each(this.filterContexts, function(c, d) {
                var e = new RegExp("^" + d + "(.*)");
                e.test(a) && (b = d, a = a.match(e)[1].trim());
            });
            var c = this.filteredCollection.filter(function(c) {
                var d = this.filterContexts[b], e = d(a, c), f = _.max(e);
                return c.set("score", f, {
                    silent: !0
                }), f > this.filterMinScore;
            }, this);
            c = _.sortBy(c, function(a) {
                return a.get("score");
            }), c = c.reverse(), this.filterResult = this.filterResultCollection(c);
        } else this.clearFilter(), this.filterContexts["default"] || console.warn("FilterView: no “default” filter context. Please add one.");
        this.collection.trigger("reset");
    },
    clearFilter: function() {
        this.filterTerm = "", this.filterResult = null, this.$el.removeClass("filtered"), 
        this.trigger("filter:done");
    },
    getCollection: function() {
        return !this.filteredCollection && _.size(this.activeFilters) > 0 ? this._filterCollectionWithActiveFilters() : this.filteredCollection || (this.filteredCollection = this.collection), 
        this.filterResult || this.filteredCollection;
    },
    getSelected: function() {
        return this.filterResultCollection(this.getCollection().filter(function(a) {
            return a._selected;
        }));
    },
    getCurrentCollection: function() {
        return this.isBulkSelectOn ? this.getSelected() : this.getCollection();
    }
}), ListController.permission = function(a) {
    return User.can(a);
}, ListController.prototype._defaultFilterContext = function(a, b) {
    var c = [];
    return b.has("book_id") && c.push(_.score(b.get("book_id"), a)), b.has("title") && c.push(_.score(b.get("title"), a)), 
    b.has("name") && c.push(_.score(b.get("name"), a)), b.has("label") && c.push(_.score(b.get("label"), a)), 
    c.length > 0 ? c : [ 1 ];
}, ListController.prototype._defaultFilterMethods = {
    text: function(a, b, c) {
        var d = _.isFunction(a[c]) ? a[c].call(a) : a.get(c);
        return _.isArray(b) ? _.contains(b, d) : d == b;
    },
    number: function(a, b, c) {
        return Number(a.get(c)) == b;
    },
    "int": function(a, b, c) {
        return parseInt(a.get(c)) == b;
    },
    array: function(a, b, c) {
        return _.indexOf(b, a.get(c)) > -1;
    },
    model_id: function(a, b, c) {
        return _.isArray(b) ? _.contains(b, a.get(c).id) : a.get(c) && parseInt(a.get(c).id) == b;
    },
    starts_with: function(a, b, c) {
        return (a.get(c) || "").match(RegExp("^" + b));
    },
    ends_with: function(a, b, c) {
        return (a.get(c) || "").match(RegExp(b + "$"));
    },
    contains: function(a, b, c) {
        return (a.get(c) || "").match(RegExp(b));
    },
    string_operator: function(model, filterVal, filterKey) {
        var modelVal = parseFloat(model.has(filterKey) ? model.get(filterKey) || 0 : model[filterKey] ? model[filterKey].call(model) : 0);
        if ("true" == filterVal) return modelVal > 0;
        if ("false" == filterVal) return !modelVal;
        var range = filterVal.match(/([0-9]+)[,-]{1}([0-9]+)/);
        return range ? modelVal >= range[1] && modelVal <= range[2] : (filterVal.match(/^[<=>]/) ? filterVal.match(/^[=][0-9]/) && (filterVal = "=" + filterVal) : filterVal = "==" + filterVal, 
        matches = filterVal.match(/^([<=>]*)(.*)/), operator = matches[1], filterVal = numeral(matches[2]).value(), 
        eval(modelVal + operator + filterVal));
    }
}, DBListController = ListController.extend({
    filter: !1,
    __setup: function() {
        this.collection || console.error("!! DBListController: a collection is needed"), 
        this._model = new DBListControllerModel({
            collection: this.collection
        }), ListController.prototype.__setup.apply(this, arguments), this.listenTo(this.collection, "filter:change", this.clearNumbers), 
        this.listenTo(this._model, "page:change", this.doAddMore);
    },
    clearNumbers: function() {
        this.collection.length = 0, this._model.startAt = 0, this._model.perPage = this.list.maxRows;
    },
    _addMore: function() {
        0 !== this.collection.length && this._model.startAt >= this.collection.length || (this._model.startAt = this.list.lastRow, 
        this._model.perPage = this.list.maxRows, this._model.startAt > 0 && this.collection.length > 0 && this.collection.length < this._model.startAt ? this.list.addMore(this.collection) : this._model.fetch());
    },
    autoFetchOnRender: function(a) {
        this._model.fetch(a);
    },
    manualRefresh: function() {
        this.clearNumbers(), this.list.clear(), this.autoFetchOnRender(!0);
    },
    doAddMore: function() {
        this.list.addMore(this.collection), this.updateCount(), this.spin(!1);
    }
}), DBListControllerModel = Backbone.Model.extend({
    initialize: function() {
        this.startAt = 0, this.perPage = 30, this.collection = this.get("collection") || new SortableCollection();
    },
    url: function() {
        return _.isFunction(this.collection.url) ? this.collection.url() : this.collection.url;
    },
    fetch: function(a) {
        opts = {}, opts.data = {
            filters: this.collection.filters ? this.collection.filterVals(_.where(this.collection.filters, {
                db: !0
            })) : null,
            sortKey: this.collection.sortKey(),
            sortDesc: this.collection.sortDesc(),
            startAt: this.startAt,
            perPage: this.perPage
        }, 0 == this.startAt && this.collection.trigger("spin"), opts.success = function(a, b) {
            this.addModels(b), this.collection.trigger("spin", !1);
        }.bind(this), opts.error = function(b, c) {
            this.collection.trigger("fetch:failed", this, c.statusText, this.fetch.bind(this, a)), 
            this.collection.trigger("spin", !1);
        }.bind(this), Backbone.Model.prototype.fetch.call(this, opts);
    },
    addModels: function(a) {
        if (void 0 == a.results) return console.error("No “results” key was found");
        var b = a.results || a;
        0 == this.startAt && this.collection.reset([], {
            silent: !0
        }), this.collection.add(b, {
            merge: !0,
            silent: !0
        }), a.results && a.count && (this.collection.length = a.count), (0 == b.length || this.collection.size() < this.startAt * this.perPage + this.perPage) && (this.collection.length = this.collection.size()), 
        this.trigger("page:change");
    }
}), function() {
    var a = {
        setupFilters: function() {
            _.each(this.filters, function(a, b) {
                "divider" !== b && !b.match(/^divider/) && a.use && (ListController.Filters && ListController.Filters[a.use] ? this.filters[b] = _.extend({}, ListController.Filters[a.use], a) : console.error("ListController: “" + a.use + "” filter is not a globally defined filter. Please define it in ListController.Filters"));
            }.bind(this));
        },
        _renderFilterSelects: function() {
            return this.filters && _.find(this.filters, function(a) {
                return void 0 !== a.values;
            }) ? (this.$filterSelects ? this.$filterSelects.html("") : this.$filterSelects = $('<div class="filters"></div>'), 
            _.each(this.activeFilters, this._renderActiveFilter, this), this._renderAddFilterBtn(), 
            this.allowFilterQueueing && this.$filterSelects.append('<a class="btn primary apply-queued-filters" title="Apply Filters">Apply Filters</a>'), 
            this.$filterSelects) : void 0;
        },
        _renderAddFilterBtn: function() {
            var a = this, b = [], c = "";
            this.foreachFilterNotInUse(function(d, e) {
                if ("divider" === e || e.match(/^divider/)) return c.match(/^divider/) || b.push(null === d ? "divider" : {
                    divider: d
                }), void (c = e);
                if (c = e, (!d.permission || ListController.permission(d.permission)) && d.manual !== !0) {
                    var f = d.label || _.humanize(e), g = a._onFilterChange.bind(a, e, !1), h = {
                        filter: d,
                        view: "function" == typeof d.values ? d.values.bind(d, this) : d.values,
                        align: "rightBottom",
                        w: d.w || 120,
                        collection: "function" == typeof d.collection ? d.collection.bind(d, this) : d.collection,
                        autoFetch: d.autoFetch || !1,
                        description: d.description || "",
                        border: d.border || null,
                        onClick: g
                    };
                    a.collectionSwitcherKey && a.collectionSwitcherKey == e && (a.collectionSwitcher && a.collectionSwitcher instanceof Backbone.Collection || console.warn("!! Filter", d, 'has "collectionSwitcher" set but no "collectionSwitcher" was found on the ListController'), 
                    h.collection = d.collection = a.collectionSwitcher, h.autoFetch = void 0 !== d.autoFetch ? d.autoFetch : !0), 
                    b.push({
                        label: f,
                        dropdown: h
                    });
                }
            }), b.length > 0 && "divider" != b[0] && !b[0].divider && b.unshift({
                divider: " "
            }), (this.filterPresets || this.allowPresets) && b.unshift({
                label: "",
                title: "Filter Presets",
                val: "filter-presets",
                icon: "equalizer",
                dropdown: {
                    view: this.presetMenu,
                    w: 200,
                    context: this,
                    align: "rightBottom"
                }
            }), this.allowFilterQueueing && b.unshift({
                label: "",
                val: "queue-filters",
                title: "Queue Filters: select desired filters before making request for the data.",
                icon: "layers",
                onClick: this.toggleQueueUpFilters.bind(this)
            }), b.unshift({
                label: "",
                title: "Reset filters",
                val: "reset-filters",
                icon: "erase",
                onClick: this.resetFilters.bind(this)
            }), $('<a class="btn icon-only icon-filter" title="Apply new filter"></a>').appendTo(this.$filterSelects).dropdown(b, {
                align: "bottom",
                w: this.filterDropdownW,
                searchThreshold: 40
            });
        },
        _renderActiveFilter: function(a, b, c) {
            var d = a.val, e = this.collection.getFilter(b).optional, f = this.filters[b];
            if (f) {
                var g = _.isFunction(f.values) ? f.values.call(f, this) : f.values;
                if (_.isArray(d)) {
                    var h = [];
                    _.each(g, function(a) {
                        _.contains(d, a.val) ? h.push(a.label) : null;
                    });
                    var i = h.length > 0 ? {
                        label: h.join(", ")
                    } : null;
                } else var i = _.find(g, function(a) {
                    return a.val == d;
                });
                {
                    this.collection.getFilter(b);
                }
                if (!i || f.alwaysUseManualVal) {
                    var j = "Manual Filter";
                    if (f.manualVal) j = _.isFunction(f.manualVal) ? f.manualVal(this.collection.getFilter(b)) : f.manualVal; else {
                        var k = this.collection.getFilter(b), l = k ? k.val : !1;
                        j = _.keyToText(b) + ": " + l;
                    }
                    i = {
                        label: j
                    };
                }
                var m = f.label || _.humanize(b), n = f.icon ? "icon-" + f.icon : "", o = f.prefix ? f.prefix : "", p = f.multi ? "multi" : "", g = f.values ? "function" == typeof f.values ? f.values.bind(f, this) : f.values : f.manual ? [ {
                    label: "Clear",
                    val: null
                } ] : null, q = e ? "optional" : "", r = [ n, p, q ].join(" ");
                if (this.collectionSwitcherKey == b && (r += " collection-switcher-btn"), f.optional && _.isArray(g) && (g = [].concat(g), 
                g.push({
                    divider: "Options"
                }, {
                    label: e ? "Make Required" : "Make Optional",
                    val: !e,
                    onClick: this._onFilterOptionalToggle.bind(this, b)
                })), 1 == c) return i.label;
                var s = this._onFilterChange.bind(this, b, e), t = {
                    align: "bottom",
                    w: f.w || 120,
                    collection: "function" == typeof f.collection ? f.collection.bind(f, this) : f.collection,
                    autoFetch: f.autoFetch || !1,
                    description: f.description || "",
                    selected: d,
                    onClick: s,
                    listController: this
                };
                !t.collection || t.collection instanceof Backbone.Collection || (t.collection = t.collection()), 
                this.collectionSwitcherKey && this.collectionSwitcherKey == b && (this.collectionSwitcher && this.collectionSwitcher instanceof Backbone.Collection || console.warn("!! Filter", f, 'has "collectionSwitcher" set but no "collectionSwitcher" was found on the ListController'), 
                t.collection = f.collection = this.collectionSwitcher, t.autoFetch = void 0 !== f.autoFetch ? f.autoFetch : !0), 
                $('<a class="btn filter-' + b + " " + r + '" title="Change ' + m + '"><span>' + o + i.label + "</span></a>").appendTo(this.$filterSelects).dropdown(g, t);
            }
        }
    };
    _.extend(ListController.prototype, a), ListController.prototype.__listenerEvents.push([ "filter:change", "_renderFilterSelects" ]);
}(), function() {
    var a = {
        allowDownload: !1,
        downloadName: null,
        resultExportDefaults: [ "sendToOnixGenerator", "divider", "saveToCSV" ],
        resultExports: {
            saveToCSV: {
                label: "Save list as CSV",
                title: "Download simple CSV file with the data in the current list",
                icon: "file-excel",
                onClick: function() {
                    this.getCurrentCollection().saveToCSV(this.parentView ? _.stripTags(this.parentView.title) : "", {
                        title: this.parentView ? _.stripTags(this.parentView.title) : "",
                        description: this.activeFilterString(", ", !1)
                    });
                }
            },
            digitalMetadata: {
                label: "Digital Metadata CSV",
                title: "Download legacy Digital Metadata CSV. Use with macros to format for specific partners.",
                icon: "file-excel",
                onClick: function() {
                    var a = this.getCurrentCollection().pluck("book_id");
                    return a.length > 1500 ? Modal.alert("No can do", "You‘re trying to export too many books. Please refine your result set.") : void (document.location = "/api/report/digital/" + a.join(","));
                }
            },
            sendToOnixGenerator: {
                label: "Send to Onix Generator",
                title: "Generate an ONIX feed with the books in this list",
                icon: "file-code",
                onClick: function() {
                    app.subview("onix-generator").open(this.getCurrentCollection());
                }
            }
        },
        _appendDownloadBtn: function() {
            this.allowDownload === !0 && (this.allowDownload = "defaults");
            var a = this._createExportResultsMenu();
            a && a.length > 0 && ($btn = $('<a class="btn right icon-only icon-download-cloud" title="Export results"></a>').dropdown(a, {
                align: "bottomLeft",
                w: 200
            }).appendTo(this.$top));
        },
        _createExportResultsMenu: function() {
            var a = this, b = this.resultExportDefaults || [], c = _.isString(this.allowDownload) ? [ this.allowDownload ] : this.allowDownload, d = _.indexOf(c, "defaults");
            if (d > -1) {
                var e = c.splice(d);
                e.shift(), _.each(b, function(a) {
                    c.push(_.clone(a));
                }), c = c.concat(e), (!b || b.length < 1) && console.error("ListController: No default exports were merged. You need to define them in “ListController.resultExports”");
            }
            return _.each(c, function(b, d) {
                if (_.isString(b) && "divider" !== b) {
                    var e = a.resultExports && a.resultExports[b];
                    e ? c[d] = _.clone(e) : console.error("ListController: “" + b + "” export not defined in “ListController.resultExports”");
                }
                var f = c[d];
                f && f.onClick && (f.onClick = f.onClick.bind(a));
            }), c;
        }
    };
    _.extend(ListController.prototype, a);
}(), function() {
    var a = {
        "click .count.btn": "bulkSelectToggle",
        "click .bulk-select-all": "bulkSelectAll",
        "click .bulk-deselect-all": "bulkDeselectAll"
    }, b = {
        allowBulkSelect: !0,
        bulkActionThreshold: 4,
        bulkRemove: function() {
            this._bulkRemove("Remove?", "Remove [num] items{s} from this list?");
        },
        bulkSelectToggle: function() {
            this.isBulkSelectOn ? this.bulkSelectOff() : this.bulkSelectOn();
        },
        bulkSelectOn: function() {
            this.__onBulkSelect = this.__onBulkSelect || this._onBulkSelect.bind(this), this.isBulkSelectOn = !0, 
            this.$el.addClass("bulk-select"), this.list.$el.addClass("bulk-select"), this.$el.on("click li", this.__onBulkSelect), 
            this.updateCount(), this.trigger("bulkselect:toggle", "on");
        },
        bulkSelectOff: function() {
            this.isBulkSelectOn = !1, this.$el.removeClass("bulk-select"), this.list.$el.removeClass("bulk-select"), 
            this.$el.off("click li", this.__onBulkSelect), this.bulkDeselectAll(), this.trigger("bulkselect:toggle", "off");
        },
        _onBulkSelect: function(a) {
            var b = a.target;
            if ("LI" === b.tagName) {
                var c = parseFloat(window.getComputedStyle(b, "::before").getPropertyValue("width")), d = event.clientX - b.getBoundingClientRect().left;
                if (!(0 > d || d > c)) {
                    var e = this._lastBulkSelectIndex || 0, f = _.getNodeIndex(b);
                    if (a.preventDefault(), a.stopPropagation(), a.shiftKey) for (var g = this.getCollection().at(f), h = !g._selected, i = _.min([ e, f ]); i <= _.max([ e, f ]); i++) {
                        var g = this.getCollection().at(i), j = this.list.subview("list-view-" + g.id);
                        g._selected = h, g._selected ? j.$el.addClass("selected") : j.$el.removeClass("selected");
                    } else {
                        var g = this.getCollection().at(f), j = this.list.subview("list-view-" + g.id);
                        g._selected = !g._selected, g._selected ? j.$el.addClass("selected") : j.$el.removeClass("selected");
                    }
                    this.updateCount(), this._lastBulkSelectIndex = f;
                }
            }
        },
        bulkSelectAll: function(a) {
            a = a === !1 ? !1 : !0;
            var b = a ? this.getCollection() : this.getSelected();
            b.each(function(b) {
                b._selected = a;
                var c = this.list.subview("list-view-" + b.id);
                c && c.$el.removeClass("selected"), c && (b._selected ? c.$el.addClass("selected") : c.$el.removeClass("selected"));
            }.bind(this)), this.updateCount();
        },
        bulkDeselectAll: function() {
            this.bulkSelectAll(!1);
        },
        _appendBulkSelectActions: function() {
            if (this.$top.append('<div class="bulk-select-actions no-selection">				<span class="btn-group">					<a class="btn icon-check bulk-select-all"></a>					<a class="btn icon-check-empty bulk-deselect-all"></a>				</span>			</div>'), 
            this.bulkActions) {
                var a = this.$top.find(".bulk-select-actions");
                this.bulkActions.length <= this.bulkActionThreshold ? _.each(this.bulkActions, function(b) {
                    if (b.onClick || b.dropdown) {
                        if (b.permission && !ListController.permission(b.permission)) return;
                        var c = b.className || "";
                        if (c += b.icon ? " icon-" + b.icon : "", c += "trash" == b.icon ? " hover-red" : "", 
                        $btn = $('<a class="btn action ' + c + '">' + b.label + "</a>").appendTo(a), b.onClick) {
                            var d = _.determineFn(b.onClick, this);
                            d && $btn.click(d);
                        } else b.dropdown && (b.dropdown.context = this, $btn.dropdown(b.dropdown.view || b.dropdown.values, b.dropdown));
                    }
                }.bind(this)) : $('<a class="btn action">Take Action</a>').appendTo(a).dropdown(this.bulkActions, {
                    context: this,
                    align: "bottomRight",
                    w: 200
                });
            }
        },
        _bulkRemove: function(a, b) {
            var c = this.getSelected();
            Modal.confirmDelete(a, _.plural(b, c.length), function() {
                _.each([].concat(c.models), function(a) {
                    a.destroy();
                });
            });
        }
    };
    _.extend(ListController.prototype, b), _.extend(ListController.prototype.__events, a);
}(), function() {
    var a = {
        allowPresets: !0,
        _presetKey: function() {
            return "ListController:presets:" + this.className;
        },
        userPresets: function() {
            return _.store(this._presetKey()) || {};
        },
        presetMenu: function() {
            var a = [], b = this;
            if (this.filterPresets && this.filterPresets.length > 0) {
                a.push({
                    divider: "Presets"
                });
                var c = [].concat(this.filterPresets);
                _.each(c, function(a) {
                    a.context = b, a.onClick = b._onFilterChange.bind(b, null, null);
                }), a = a.concat(this.filterPresets);
            }
            if (this.allowPresets) {
                a.push({
                    divider: "User Presets"
                });
                var c = _.values(this.userPresets());
                _.each(c, function(a) {
                    a.context = this, a.onClick = this._onFilterChange.bind(this, null, null), a.options = {
                        view: [ {
                            label: "",
                            title: "Delete preset",
                            icon: "trash",
                            onClick: "deletePreset",
                            preset_id: a.id
                        }, {
                            label: "",
                            title: "Update the preset with the current active filters",
                            icon: "arrows-ccw",
                            onClick: "updatePreset",
                            preset_id: a.id
                        }, {
                            label: "",
                            title: "Edit preset",
                            icon: "pencil",
                            onClick: "editPreset",
                            preset_id: a.id
                        } ],
                        theme: "icons",
                        align: "left",
                        w: 80,
                        context: this
                    };
                }.bind(this)), a = a.concat(c), c.length > 0 && a.push("divider"), a.push({
                    label: "New Preset",
                    icon: "plus-1",
                    onClick: "newFilterPreset"
                });
            }
            return a;
        },
        editPreset: function(a) {
            var b = this.userPresets(), c = b[a.preset_id];
            c && Modal.prompt("Edit Filter Preset", "Change the label and description of your preset.", {
                h: 100,
                pattern: "string",
                placeholder: "Filter Label\n\nOptional description.",
                val: c.label + (c.description ? "\n\n" + c.description : "")
            }, function(a) {
                var d = a.split("\n"), e = d.shift(), f = d.join("\n").trim();
                c.label = e, c.description = f, _.store(this._presetKey(), b);
            }.bind(this));
        },
        updatePreset: function(a) {
            var b = this.userPresets(), c = b[a.preset_id], d = this.currentFiltersForPreset(), e = _.size(d);
            0 == e ? Modal.alert("Select Filters First", "") : Modal.confirm("Update Preset <u>" + c.label + "<u>", _.plural("Update the preset with the selected [num] filter{s}<br><br><code>" + this.activeFilterString() + "</code>", e), function() {
                c.filters = d, _.store(this._presetKey(), b);
            }.bind(this));
        },
        deletePreset: function(a) {
            var b = this.userPresets(), c = b[a.preset_id];
            c && Modal.confirmDelete("Delete Preset <u>" + c.label + "<u>", "", function() {
                delete b[c.id], _.store(this._presetKey(), b);
            }.bind(this));
        },
        currentFiltersForPreset: function() {
            var a = this.collectionSwitcherKey && this.collectionSwitcherKey, b = {};
            return _.each(this.activeFilters, function(c, d) {
                d != a && (b[d] = c.val);
            }), b;
        },
        newFilterPreset: function() {
            var a = this.currentFiltersForPreset(), b = _.size(a);
            0 == b ? Modal.alert("Select Filters First", "") : Modal.prompt("Save Filter Preset", _.plural("<code>" + this.activeFilterString() + "</code><br><br>Give a label for the selected [num] filter{s}.", b), {
                h: 100,
                pattern: "string",
                placeholder: "Filter Label\n\nOptional description."
            }, function(b) {
                var c = b.split("\n"), d = c.shift(), e = c.join("\n").trim(), f = Date.now(), g = this.userPresets();
                g[f] = {
                    id: f,
                    label: d,
                    description: e,
                    filters: a
                }, _.store(this._presetKey(), g);
            }.bind(this));
        }
    };
    _.extend(ListController.prototype, a);
}(), ListController.Filters = {
    partner_id: {
        values: function() {
            return [ {
                label: "All",
                val: ""
            }, "divider" ].concat(Partners.toSelectID());
        },
        w: 200,
        multi: !0,
        filterBy: "text"
    },
    deal_id: {
        label: "Deal",
        values: function() {
            return [ {
                label: "All",
                val: ""
            }, "divider" ].concat(Deals.toSelectID("fullLabel"));
        },
        w: 270,
        multi: !0,
        filterBy: "text"
    },
    licensor: {
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Licensor Name",
            val: "",
            description: "Separate multiple values with a comma",
            input: {
                format: "string",
                w: 200,
                placeholder: "Simon,Hachette"
            }
        } ],
        w: 135,
        manualVal: function(a) {
            return "Licensor: " + a.val;
        }
    },
    purchaser: {
        values: function() {
            return [ {
                label: "Clear",
                val: ""
            }, "divider" ].concat(Users.inGroup("Role:Purchaser").toSelectID("name"));
        },
        w: 160,
        multi: !0
    },
    book: {
        icon: "book-1",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "ID or Title",
            val: "",
            description: "",
            input: {
                format: "string",
                w: 200,
                placeholder: "4924 or Atlas Shrugged"
            }
        } ],
        w: 95,
        manualVal: function(a) {
            return a.val;
        }
    },
    author: {
        icon: "user",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Author",
            val: "",
            description: "Separate multiple names with a comma",
            input: {
                format: "string",
                placeholder: "C.S. Lewis"
            }
        } ],
        w: 200,
        optional: !0,
        manualVal: function(a) {
            return a.val;
        }
    },
    narrator: {
        icon: "user",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Narrator",
            val: "",
            description: "Separate multiple names with a comma",
            input: {
                format: "string",
                placeholder: "Grover Gardner"
            }
        } ],
        w: 200,
        optional: !0,
        manualVal: function(a) {
            return a.val;
        }
    },
    contract_state: {
        label: "Contract State",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Valid",
            val: "Valid"
        }, "divider", {
            label: "Payment",
            val: "Payment",
            border: "green"
        }, {
            label: "Drafting",
            val: "Drafting",
            border: "blue"
        }, "divider", {
            label: "Terminated",
            val: "Terminated",
            border: "red"
        }, {
            label: "Cancelled",
            val: "Cancelled",
            border: "red"
        }, {
            label: "On-Hold",
            val: "On-Hold",
            border: "orange"
        } ],
        w: 140,
        multi: !0,
        filterBy: "text"
    },
    contract_admin: {
        label: "Contract Admin",
        values: function() {
            return [ {
                label: "Clear",
                val: ""
            }, "divider" ].concat(Users.inGroup("Department:Contracts").toSelectID("name"));
        },
        w: 180
    },
    release_group: {
        label: "Release Group",
        icon: "calendar",
        values: function() {
            var a = this.collection();
            return a && "function" != typeof a ? [ {
                label: "Clear",
                val: ""
            }, "divider" ].concat(a.map(function(a) {
                return {
                    label: a.get("name"),
                    val: a.id,
                    collection: a.get("books"),
                    border: a.isClosed() || a.isUpcomingGroup() ? "" : "#e5c263"
                };
            })) : [];
        },
        w: 300,
        multi: !0,
        collection: function() {
            return this._collection = this._collection || new BSA.Collections.UpcomingReleases();
        },
        autoFetch: !0
    },
    audience: {
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Adult",
            val: "Adult"
        }, {
            label: "New Adult (18-25)",
            val: "New Adult (18-25)"
        }, {
            label: "Young Adult",
            val: "Young Adult"
        }, "divider", {
            label: "Children",
            val: "Children"
        }, {
            label: "Children (8-12)",
            val: "Children (8-12)"
        }, {
            label: "Children (4-7)",
            val: "Children (4-7)"
        }, {
            label: "Children (0-3)",
            val: "Children (0-3)"
        } ],
        multi: !0,
        w: 160
    },
    runtime: {
        icon: "clock",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Runtime",
            val: "",
            description: "Equal to: 5<br>Exactly: =5.5<br>Less than: <5<br>Greater than: >5<br>Between: 4,6",
            input: {
                format: "string",
                placeholder: ">15"
            }
        } ],
        manualVal: function(a) {
            return a.val;
        }
    },
    keyword: {
        icon: "tag",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Keywords",
            description: "Separate multiple keywords with a comma. <i>Tip: try prefixing with `and:` to require all listed keywords</i>",
            val: "",
            input: {
                format: "string",
                placeholder: "keyword one, keyword two",
                w: 220
            }
        } ],
        w: 160,
        optional: !0,
        manualVal: function(a) {
            return a.val;
        }
    },
    copy: {
        icon: "doc-text-inv",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Has Copy",
            val: "true"
        }, {
            label: "No Copy",
            val: "false"
        }, "divider", {
            label: "Copy",
            val: "",
            description: "Separate multiple search terms with a comma",
            input: {
                format: "string",
                placeholder: "mystery,romance",
                w: 200
            }
        } ],
        optional: !0
    },
    marketing_points: {
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Has Marketing Points",
            val: "true"
        }, {
            label: "No Marketing Points",
            val: "false"
        }, "divider", {
            label: "Marketing Points",
            val: "",
            description: "Separate multiple search terms with a comma",
            input: {
                format: "string",
                placeholder: "mystery,romance",
                w: 200
            }
        } ],
        w: 170,
        optional: !0
    },
    category: {
        values: function() {
            var a = [ {
                label: "Clear",
                val: ""
            }, "divider" ];
            if (lookup.selects.bookCategory) {
                var b = lookup.selects.bookCategory.toSelectID("label", "val");
                b.shift(), a = a.concat(b);
            }
            return a;
        },
        w: 300,
        multi: !0
    },
    bisac: {
        label: "BISAC",
        values: function() {
            var a = [ {
                label: "Clear",
                val: ""
            }, "divider", {
                label: "Has BISAC",
                val: "true"
            }, {
                label: "No BISAC",
                val: "false"
            }, "divider" ];
            return _.isFunction(this.collection) && (this.collection = this.collection()), this.collection && (a = a.concat(this.collection.toSelectID(function(a) {
                return [ a.get("code"), a.get("title"), a.get("detail") ].join(" / ");
            }, "code"))), a;
        },
        w: 400,
        multi: !0,
        collection: function() {
            return new Lookup.Collections.BISACs();
        },
        autoFetch: !0
    },
    series: {
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Part of Series",
            val: "true"
        }, {
            label: "Number in Series",
            val: "",
            description: "Equal to: 5<br>Less than: <3<br>Greater than: >1",
            input: {
                format: "string",
                placeholder: "1"
            }
        }, {
            label: "Not in a Series",
            val: "false"
        } ],
        manualVal: function(a) {
            return "Series #: " + a.val;
        },
        w: 160
    },
    award: {
        icon: "top-list",
        values: function() {
            var a = [ {
                label: "Clear",
                val: ""
            }, "divider", {
                label: "Has Award",
                val: "true"
            }, {
                label: "No Award",
                val: "false"
            }, "divider" ], b = lookup.collections.awards;
            return b && (a = a.concat(b.toSelectID("award"))), a;
        },
        w: 400,
        multi: !0
    },
    movie: {
        icon: "video",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Movie Tie-in",
            val: "2"
        }, {
            label: "Optioned for Film",
            val: "1"
        }, {
            label: "Not a Movie",
            val: "false"
        }, {
            label: "Movie Statement",
            val: "",
            description: "Example: separate multiple terms with a comma",
            input: {
                format: "string",
                placeholder: "Russell Crowe",
                w: 200
            }
        } ],
        manualVal: function(a) {
            return a.val;
        },
        w: 200
    },
    setting: {
        icon: "globe",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Has Setting",
            val: "true"
        }, {
            label: "No Setting",
            val: "false"
        }, {
            label: "Setting",
            val: "",
            description: "Example: New York",
            input: {
                format: "string",
                placeholder: "New York",
                w: 200
            }
        } ],
        manualVal: function(a) {
            return a.val;
        },
        w: 200
    },
    bonus_material: {
        icon: "plus-circled",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Has Bonus Mat.",
            val: "true"
        }, {
            label: "No Bonus Mat.",
            val: "false"
        }, {
            label: "Bonus Material",
            val: "",
            description: "Examples: PDF, DVD, maps",
            input: {
                format: "string",
                placeholder: "PDF",
                w: 200
            }
        } ],
        manualVal: function(a) {
            return a.val;
        },
        w: 200
    },
    territory: {
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Has Territory",
            val: "true"
        }, {
            label: "No Territory",
            val: "false"
        }, {
            label: "Type of Territory",
            val: "",
            description: "Example: world<br>Tip: also try `not:world`",
            input: {
                format: "string",
                placeholder: "world",
                w: 200
            }
        } ],
        manualVal: function(a) {
            return a.val;
        },
        w: 200
    },
    market: {
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Consumer",
            val: "consumer"
        }, {
            label: "Library",
            val: "library"
        }, {
            label: "Both",
            val: "both"
        }, {
            label: "None",
            val: "none"
        } ],
        alwaysUseManualVal: !0,
        manualVal: function(a) {
            return "Markets: " + a.val;
        }
    },
    drm: {
        label: "DRM",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Yes",
            val: "yes"
        }, {
            label: "No",
            val: "no"
        } ],
        alwaysUseManualVal: !0,
        manualVal: function(a) {
            return "DRM: " + a.val;
        }
    },
    dmas: {
        label: "DMAS",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Yes",
            val: "yes"
        }, {
            label: "No",
            val: "no"
        } ],
        alwaysUseManualVal: !0,
        manualVal: function(a) {
            return "DMAS: " + a.val;
        }
    },
    streaming: {
        label: "Streaming",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Yes",
            val: "yes"
        }, {
            label: "No",
            val: "no"
        } ],
        alwaysUseManualVal: !0,
        manualVal: function(a) {
            return "Streaming: " + a.val;
        }
    },
    art: {
        icon: "picture",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Proofed",
            val: "true"
        }, {
            label: "Green Lit",
            val: "1"
        }, {
            label: "Yellow Lit",
            val: "-2"
        }, {
            label: "Red Lit",
            val: "-1"
        }, {
            label: "Unproofed",
            val: "unproofed"
        } ],
        w: 120,
        optional: !0
    },
    audio: {
        icon: "music",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Has Audio",
            val: "true"
        }, {
            label: "No Audio",
            val: "false"
        } ],
        w: 120,
        optional: !0
    },
    sole_source: {
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Yes",
            val: "yes"
        }, {
            label: "No",
            val: "no"
        } ],
        alwaysUseManualVal: !0,
        manualVal: function(a) {
            return "Sole Source: " + a.val;
        }
    },
    ios_app: {
        label: "iOS App",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Is iOS App",
            val: "true"
        }, "divider", {
            label: "Ready for Sale",
            val: "Ready for Sale"
        }, {
            label: "Waiting For Review",
            val: "Waiting For Review"
        }, {
            label: "Prepare for Upload",
            val: "Prepare for Upload"
        }, {
            label: "Developer Removed From Sale",
            val: "Developer Removed From Sale"
        } ],
        manualVal: function(a) {
            return a.val;
        },
        w: 240
    },
    sales_date: {
        label: "Sales Date",
        icon: "dollar-1",
        defaultValIndex: 1,
        values: function() {
            return values = [ {
                divider: "Sales Date"
            }, {
                label: "All Time",
                val: ""
            }, {
                label: "Year",
                val: "",
                input: {
                    format: "year",
                    w: 60
                }
            }, {
                label: "Range of Years",
                val: "",
                input: {
                    format: "year",
                    w: 60,
                    range: !0
                }
            }, {
                label: "Month",
                val: "",
                input: {
                    format: "month",
                    w: 92
                }
            }, {
                label: "Range of Months",
                val: "",
                input: {
                    format: "month",
                    w: 92,
                    range: !0
                }
            } ], values;
        },
        w: 160,
        manualVal: function(a) {
            return _.isArray(a.val) ? a.val[0].match(/^[0-9]{4}$/) ? a.val[0] + " - " + a.val[1] : new XDate(a.val[0]).toString("MMM yyyy") + " - " + new XDate(a.val[1]).toString("MMM yyyy") : a.val.match(/^[0-9]{4}-[0-9]{2}$/) ? new XDate(a.val).toString("MMM yyyy") : a.val;
        }
    },
    sales: {
        label: "Sales Amt",
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Sales",
            val: "",
            description: "Equal to: 1500<br>Exactly: =1500<br>Less than: <1500<br>Greater than: >1500<br>Between: 1000,1500",
            input: {
                format: "string",
                placeholder: ">10000"
            }
        } ],
        w: 140,
        manualVal: function(a) {
            return "Sales: " + a.val;
        }
    },
    units: {
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Units",
            val: "",
            description: "Equal to: 1500<br>Exactly: =1500<br>Less than: <1500<br>Greater than: >1500<br>Between: 1000,1500",
            input: {
                format: "string",
                w: 150,
                placeholder: ">1500"
            }
        } ],
        w: 140,
        manualVal: function(a) {
            return "Units: " + a.val;
        }
    },
    returns: {
        values: [ {
            label: "Clear",
            val: ""
        }, "divider", {
            label: "Returns",
            val: "",
            description: "Equal to: 1500<br>Exactly: =1500<br>Less than: <1500<br>Greater than: >1500<br>Between: 1000,1500",
            input: {
                format: "string",
                w: 150,
                placeholder: ">1500"
            }
        } ],
        w: 140,
        manualVal: function(a) {
            return "Returns: " + a.val;
        }
    },
    benchmark: {
        permission: "view-benchmark",
        values: [ {
            label: "Is Set",
            val: ""
        }, {
            label: "Not Set",
            val: "null"
        }, "divider", {
            label: "No Audible",
            val: "No Audible"
        }, {
            label: "Blackstone Audio (Delayed Royalty - Reporting)",
            val: "Blackstone Audio (Delayed Royalty - Reporting)"
        }, {
            label: "Blackstone Audio (Royalty-Bearing)",
            val: "Blackstone Audio (Royalty-Bearing)"
        }, {
            label: "Blackstone Audio (Delayed Royalty - Reporting - No Streaming)",
            val: "Blackstone Audio (Delayed Royalty - Reporting - No Streaming)"
        }, {
            label: "Blackstone Audio (Royalty Floor)",
            val: "Blackstone Audio (Royalty Floor)"
        } ],
        w: 430
    }
};