define(["exports", "../../types", "../../dom", "../../array", "../../event", "../../date", "../../helpers"], function (exports, _types, _dom, _array, _event, _date, _helpers) {
    "use strict";

    var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

    var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

    var Types = _types.Types;
    var Dom = _dom.Dom;
    var array = _array.Arr;

    // import {Str} from '../string';
    // import {Sort} from '../sort';
    var Event = _event.Event;
    var DateHelper = _date.DateHelper;
    var Helpers = _helpers.Helpers;

    var AdapterSortableTable = exports.AdapterSortableTable = (function () {

        /**
         * SortableTable Adapter module
         * @param {Object} tf TableFilter instance
         */

        function AdapterSortableTable(tf) {
            _classCallCheck(this, AdapterSortableTable);

            // Configuration object
            var f = tf.config();

            this.isPaged = false;

            //indicates if tables was sorted
            this.sorted = false;

            // edit .sort-arrow.descending / .sort-arrow.ascending in filtergrid.css
            // to reflect any path change
            this.sortImgPath = f.sort_images_path || o.themesPath;
            this.sortImgBlank = f.sort_image_blank || "blank.png";
            this.sortImgClassName = f.sort_image_class_name || "sort-arrow";
            this.sortImgAscClassName = f.sort_image_asc_class_name || "ascending";
            this.sortImgDescClassName = f.sort_image_desc_class_name || "descending";
            //cell attribute storing custom key
            this.sortCustomKey = f.sort_custom_key || "data-tf-sortKey";

            /*** TF additional events ***/
            //additional paging events for alternating background
            // o.Evt._Paging.nextEvt = function(){ if(o.sorted && o.alternateBgs) o.Filter(); }
            // o.Evt._Paging.prevEvt = o.Evt._Paging.nextEvt;
            // o.Evt._Paging.firstEvt = o.Evt._Paging.nextEvt;
            // o.Evt._Paging.lastEvt = o.Evt._Paging.nextEvt;
            // o.Evt._OnSlcPagesChangeEvt = o.Evt._Paging.nextEvt;

            // callback invoked after sort is loaded and instanciated
            this.onSortLoaded = Types.isFn(f.on_sort_loaded) ? f.on_sort_loaded : null;
            // callback invoked before table is sorted
            this.onBeforeSort = Types.isFn(f.on_before_sort) ? f.on_before_sort : null;
            // callback invoked after table is sorted
            this.onAfterSort = Types.isFn(f.on_after_sort) ? f.on_after_sort : null;

            this.tf = tf;
        }

        _prototypeProperties(AdapterSortableTable, null, {
            init: {
                value: function init() {
                    var tf = this.tf;
                    var sortConfig = this.sortConfig;

                    // SortableTable class sanity check (sortabletable.js)
                    if (Types.isUndef(SortableTable)) {
                        throw new Error("SortableTable class not found.");
                        // return;
                    }

                    overrideSortableTable();
                    setSortTypes();

                    //Column sort at start
                    if (sortConfig.sortCol) {
                        this.stt.sort(sortConfig.sortCol[0], sortConfig.sortCol[1]);
                    }

                    tf.isSortEnabled = true;
                    if (this.onSortLoaded) {
                        this.onSortLoaded.call(null, tf, this);
                    }

                    /*** SortableTable callbacks ***/
                    this.stt.onbeforesort = function () {
                        if (this.onBeforeSort) {
                            this.onBeforeSort.call(null, tf, this.stt.sortColumn);
                        }
                        tf.sort(); //TF method

                        /*** sort behaviour for paging ***/
                        if (tf.paging) {
                            isPaged = true;
                            tf.paging = false;
                            tf.Cpt.paging.destroy();
                        }
                    };

                    this.stt.onsort = function () {
                        this.sorted = true;

                        //rows alternating bg issue
                        // TODO: move into AlternateRows component
                        if (tf.alternateBgs) {
                            var rows = tf.tbl.rows,
                                c = 0;

                            var setClass = function setClass(row, i, removeOnly) {
                                if (Types.isUndef(removeOnly)) {
                                    removeOnly = false;
                                }
                                var altRows = tf.Cpt.alternateRows,
                                    oddCls = altRows.rowBgOddCssClass,
                                    evenCls = altRows.rowBgEvenCssClass;
                                Dom.removeClass(row, oddCls);
                                Dom.removeClass(row, evenCls);
                                if (!removeOnly) {
                                    Dom.addClass(row, i % 2 ? oddCls : evenCls);
                                }
                            };

                            for (var i = tf.refRow; i < tf.nbRows; i++) {
                                var isRowValid = rows[i].getAttribute("validRow");
                                if (tf.paging && rows[i].style.display === "") {
                                    setClass(rows[i], c);
                                    c++;
                                } else {
                                    if ((isRowValid === "true" || isRowValid === null) && rows[i].style.display === "") {
                                        setClass(rows[i], c);
                                        c++;
                                    } else {
                                        setClass(rows[i], c, true);
                                    }
                                }
                            }
                        }
                        //sort behaviour for paging
                        if (isPaged) {
                            var paginator = tf.Cpt.paging,
                                config = tf.config();
                            if (paginator.hasResultsPerPage) {
                                var slc = paginator.resultsPerPageSlc;
                                config.paging_length = slc.options[slc.selectedIndex].value;
                            }
                            paginator.addPaging(false);
                            paginator.setPage(paginator.currentPageNb);
                            this.isPaged = false;
                        }

                        if (this.onAfterSort) {
                            this.onAfterSort.call(null, tf, tf.stt.sortColumn);
                        }
                    };
                },
                writable: true,
                configurable: true
            },
            overrideSortableTable: {
                value: function overrideSortableTable() {
                    var adpt = this,
                        tf = this.tf;

                    /**
                     * Overrides headerOnclick method in order to handle th event
                     * @param  {Object} e [description]
                     */
                    SortableTable.prototype.headerOnclick = function (evt) {
                        if (!tf.sort) {
                            return;
                        }
                        // find Header element
                        var el = evt.target || evt.srcElement,
                            tagName = el.tagName;

                        while (tagName !== "TD" && tagName !== "TH") {
                            el = el.parentNode;
                        }

                        this.sort(SortableTable.msie ? SortableTable.getCellIndex(el) : el.cellIndex);
                    };

                    /**
                     * Overrides getCellIndex IE returns wrong cellIndex when columns are
                     * hidden
                     * @param  {Object} oTd TD element
                     * @return {Number}     Cell index
                     */
                    SortableTable.getCellIndex = function (oTd) {
                        var cells = oTd.parentNode.cells,
                            l = cells.length,
                            i;
                        for (i = 0; cells[i] != oTd && i < l; i++) {}
                        return i;
                    };

                    /**
                     * Overrides initHeader in order to handle filters row position
                     * @param  {Array} oSortTypes
                     */
                    SortableTable.prototype.initHeader = function (oSortTypes) {
                        var stt = this;
                        if (!sortableTable.tHead) {
                            return;
                        }
                        stt.headersRow = tf.headersRow;
                        var cells = stt.tHead.rows[stt.headersRow].cells;
                        var doc = stt.tHead.ownerDocument || stt.tHead.document;
                        stt.sortTypes = oSortTypes || [];
                        var l = cells.length;
                        var img, c;
                        for (var i = 0; i < l; i++) {
                            c = cells[i];
                            if (stt.sortTypes[i] !== null && stt.sortTypes[i] !== "None") {
                                c.style.cursor = "pointer";
                                img = Dom.create("img", ["src", o.sortImgPath + o.sortImgBlank]);
                                c.appendChild(img);
                                if (stt.sortTypes[i] !== null) {
                                    c.setAttribute("_sortType", stt.sortTypes[i]);
                                }
                                Event.add(c, "click", stt._headerOnclick);
                            } else {
                                c.setAttribute("_sortType", oSortTypes[i]);
                                c._sortType = "None";
                            }
                        }
                        stt.updateHeaderArrows();
                    };

                    /**
                     * Overrides updateHeaderArrows in order to handle arrows indicators
                     */
                    SortableTable.prototype.updateHeaderArrows = function () {
                        var stt = this;
                        var cells, l, img;
                        // external headers
                        if (tf.sortConfig.asyncSort && tf.sortConfig.triggerIds !== null) {
                            var triggers = tf.sortConfig.triggerIds;
                            cells = [];
                            l = triggers.length;
                            for (var j = 0; j < triggers.length; j++) {
                                cells.push(Dom.id(triggers[j]));
                            }
                        } else {
                            if (!this.tHead) {
                                return;
                            }
                            cells = stt.tHead.rows[stt.headersRow].cells;
                            l = cells.length;
                        }
                        for (var i = 0; i < l; i++) {
                            var cellAttr = cells[i].getAttribute("_sortType");
                            if (cellAttr !== null && cellAttr !== "None") {
                                img = cells[i].lastChild || cells[i];
                                if (img.nodeName.toLowerCase() !== "img") {
                                    img = Dom.create("img", ["src", adpt.sortImgPath + adpt.sortImgBlank]);
                                    cells[i].appendChild(img);
                                }
                                if (i === stt.sortColumn) {
                                    img.className = adpt.sortImgClassName + " " + this.descending ? adpt.sortImgDescClassName : adpt.sortImgAscClassName;
                                } else {
                                    img.className = adpt.sortImgClassName;
                                }
                            }
                        }
                    };

                    /**
                     * Overrides getRowValue for custom key value feature
                     * @param  {Object} oRow    Row element
                     * @param  {String} sType
                     * @param  {Number} nColumn
                     * @return {String}
                     */
                    SortableTable.prototype.getRowValue = function (oRow, sType, nColumn) {
                        // if we have defined a custom getRowValue use that
                        var sortTypeInfo = stt._sortTypeInfo[sType];
                        if (sortTypeInfo && sortTypeInfo.getRowValue) {
                            return sortTypeInfo.getRowValue(oRow, nColumn);
                        }
                        var c = oRow.cells[nColumn];
                        var s = SortableTable.getInnerText(c);
                        return stt.getValueFromString(s, sType);
                    };

                    /**
                     * Overrides getInnerText in order to avoid Firefox unexpected sorting
                     * behaviour with untrimmed text elements
                     * @param  {Object} oNode DOM element
                     * @return {String}       DOM element inner text
                     */
                    SortableTable.getInnerText = function (oNode) {
                        if (oNode.getAttribute(o.sortCustomKey) != null) {
                            return oNode.getAttribute(o.sortCustomKey);
                        } else {
                            return Dom.getText(oNode);
                        }
                    };
                },
                writable: true,
                configurable: true
            },
            setSortTypes: {
                value: function setSortTypes() {
                    var _this = this;

                    var tf = this.tf,
                        configSort = this.sortConfig,
                        configSortTypes = configSort.sortTypes,
                        sortTypes = [];

                    for (var i = 0; i < tf.nbCells; i++) {
                        var colType;

                        if (configSortTypes !== null && configSortTypes[i] != null) {
                            colType = configSortTypes[i].toLowerCase();
                            if (colType === "none") {
                                colType = "None";
                            }
                        } else {
                            // resolve column types
                            if (tf.hasColNbFormat && tf.colNbFormat[i] !== null) {
                                colType = tf.colNbFormat[i].toLowerCase();
                            } else if (tf.hasColDateType && tf.colDateType[i] !== null) {
                                colType = tf.colDateType[i].toLowerCase() + "date";
                            } else {
                                colType = "String";
                            }
                        }
                        sortTypes.push(colType);
                    }

                    //Public TF method to add sort type
                    this.addSortType = function () {
                        SortableTable.prototype.addSortType(arguments[0], arguments[1], arguments[2], arguments[3]);
                    };

                    //Custom sort types
                    this.addSortType("number", Number);
                    this.addSortType("caseinsensitivestring", SortableTable.toUpperCase);
                    this.addSortType("date", SortableTable.toDate);
                    this.addSortType("string");
                    this.addSortType("us", this.usNumberConverter);
                    this.addSortType("eu", this.euNumberConverter);
                    this.addSortType("dmydate", this.dmyDateConverter);
                    this.addSortType("ymddate", this.ymdDateConverter);
                    this.addSortType("mdydate", this.mdyDateConverter);
                    this.addSortType("ddmmmyyyydate", this.ddmmmyyyyDateConverter);
                    this.addSortType("ipaddress", this.ipAddress, this.sortIP);

                    this.stt = new SortableTable(tf.tbl, sortTypes);

                    /*** external table headers adapter ***/
                    if (configSort.asyncSort && configSort.triggerIds !== null) {
                        var triggers = configSort.triggerIds;
                        for (var j = 0; j < triggers.length; j++) {
                            if (triggers[j] === null) {
                                continue;
                            }
                            var trigger = Dom.id(triggers[j]);
                            if (trigger) {
                                trigger.style.cursor = "pointer";
                                // trigger.onclick = function(){
                                //     if(o.sort)
                                //         o.st.asyncSort( triggers.tf_IndexByValue(this.id, true) );
                                // }
                                Event.add(trigger, "click", function (evt) {
                                    var elm = evt.target;
                                    if (!_this.tf.sort) {
                                        return;
                                    }
                                    _this.stt.asyncSort(
                                    // triggers.tf_IndexByValue(this.id, true)
                                    Arr.indexByValue(triggers, elm.id, true));
                                });
                                trigger.setAttribute("_sortType", sortTypes[j]);
                            }
                        }
                    }
                },
                writable: true,
                configurable: true
            },
            usNumberConverter: {

                //Converters

                value: function usNumberConverter(s) {
                    return Helpers.removeNbFormat(s, "us");
                },
                writable: true,
                configurable: true
            },
            euNumberConverter: {
                value: function euNumberConverter(s) {
                    return Helpers.removeNbFormat(s, "eu");
                },
                writable: true,
                configurable: true
            },
            dateConverter: {
                value: function dateConverter(s, format) {
                    return DateHelper.format(s, format);
                },
                writable: true,
                configurable: true
            },
            dmyDateConverter: {
                value: function dmyDateConverter(s) {
                    return this.dateConverter(s, "DMY");
                },
                writable: true,
                configurable: true
            },
            mdyDateConverter: {
                value: function mdyDateConverter(s) {
                    return this.dateConverter(s, "MDY");
                },
                writable: true,
                configurable: true
            },
            ymdDateConverter: {
                value: function ymdDateConverter(s) {
                    return this.dateConverter(s, "YMD");
                },
                writable: true,
                configurable: true
            },
            ddmmmyyyyDateConverter: {
                value: function ddmmmyyyyDateConverter(s) {
                    return this.dateConverter(s, "DDMMMYYYY");
                },
                writable: true,
                configurable: true
            },
            ipAddress: {
                value: function ipAddress(value) {
                    var vals = value.split(".");
                    for (var x in vals) {
                        var val = vals[x];
                        while (3 > val.length) {
                            val = "0" + val;
                        }
                        vals[x] = val;
                    }
                    return vals.join(".");
                },
                writable: true,
                configurable: true
            },
            sortIP: {
                value: function sortIP(a, b) {
                    var aa = this.ipAddress(a.value.toLowerCase());
                    var bb = this.ipAddress(b.value.toLowerCase());
                    if (aa == bb) {
                        return 0;
                    } else if (aa < bb) {
                        return -1;
                    } else {
                        return 1;
                    }
                },
                writable: true,
                configurable: true
            }
        });

        return AdapterSortableTable;
    })();

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
});
//# sourceMappingURL=adapterSortabletable.js.map