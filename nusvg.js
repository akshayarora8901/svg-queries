/**
 * Constructor
 * @param {Object} element SVG Element
 * @param {Array} queries Variations array
 */
function NuSvg(element, queries) {
  this.svgElement = element;
  this.svgComposition = {
    initialWidth: null,
    initialHeight: null,
    width: null,
    height: null,
    scaleFactorX: null
  };
  this.queries = queries;
}


/**
 * Init
 * Used to bind resize event listener
 */
NuSvg.prototype.init = function() {
  // Throttled Method called on resize of SVG
  var onResizeThrottled = NuSvg.throttle(this.onResize.bind(this), 400, { leading: false });
  // Bind window resize
  window.addEventListener('resize', onResizeThrottled);
  // Measure initial composition
  this.measure(true);
  // Apply matching variations on initialisation
  this.process();
}

/**
 * OnResize
 * Method called via throttled resize method
 */
NuSvg.prototype.onResize = function() {
  // Measure and process variation on resizing of svg
  this.measure();
  this.process();
}

/**
 * Measure
 * Sets SVG composition
 * @param {Boolean} measureInitial true when called on initialisation
 */
NuSvg.prototype.measure = function(measureInitial) {
  var el = this.svgElement,
    c = this.svgComposition,
    vb = el.viewBox;
  if (measureInitial === true) {
    c.initialWidth = vb.baseVal.width;
    c.initialHeight = vb.baseVal.height;
  }
  var computedStyle = window.getComputedStyle(el);
  c.width = Number(computedStyle.width.replace('px', ''));
  c.height = Number(computedStyle.height.replace('px', ''));
  c.scaleFactorX = c.width / c.initialWidth;
}

/**
 * Process
 * Method used to process and apply the current matched variation with svg composition
 */
NuSvg.prototype.process = function() {
  var that = this;
  // Default query
  var defaultQuery = this.queries.filter(function(query) {
    return query.query == "default";
  })[0];
  // Loop all variations to match with current svg composition
  this.queries.forEach(function(query, queryIndex) {
    // Min and Max width values
    var queryData = {
      max: query.query == 'default' ? 0 : parseInt(query.query.substr(1))
    };
    // Set min value to 0 if variation is default
    if(query.query == 'default' || queryIndex == 0) {
      queryData.min = 0;
    } else {
      // Calculate min for current variation
      var prevQueryObject = that.queries[queryIndex-1];
      if(prevQueryObject.query == 'default')
        queryData.min = 0;
      else
        queryData.min = parseInt(that.queries[queryIndex-1].query.substr(1));
    }
    // Apply Current Container Variation
    that.applyContainerQuery(queryData, query, defaultQuery, false);
  });
  // Max width variation
  var lastQuery = this.queries[this.queries.length-1];
  // Apply default if width is greater than last variation
  this.applyContainerQuery({max: parseInt(lastQuery.query.substr(1))}, lastQuery, defaultQuery, true);
}

/**
 * applyContainerQuery
 * Method used to match variation with svgComposition and apply matched variation data on SVG
 * @param {Object} data Min and Max width boundaries to check for variation
 * @param {Object} query Current variation to apply
 * @param {Object} defaultQuery Default Variation
 * @param {Boolean} isLast true if check is for last variation
 */
NuSvg.prototype.applyContainerQuery = function(data, query, defaultQuery, isLast) {
  // Apply default if width greater than max width variation
  if(isLast) {
    if(this.svgComposition.width > data.max)
      this.applyData(defaultQuery.data);
  } else {
    // Match current variation and apply data on SVG
    if(this.svgComposition.width > data.min && this.svgComposition.width < data.max)
      this.applyQuery(query, defaultQuery);
  }
}

/**
 * applyQuery
 * Method used to apply matched variation data followed by default query data
 * @param {Object} query Current variation to apply
 * @param {Object} defaultQuery Default Variation
 */
NuSvg.prototype.applyQuery = function(query, defaultQuery) {
  // Apply default
  this.applyData(defaultQuery.data);
  // Apply Matched variation data
  this.applyData(query.data);
}

/**
 * applyData
 * Method used to apply current matched variation data on SVG
 * @param {Object} queryData Current variation data to apply
 */
NuSvg.prototype.applyData = function(queryData) {
  for (var el in queryData) {
    var element = document.getElementById(el);
    var transformValue = '';
    var translateData = {};
    var elAttributes = queryData[el];
    for (var attr in elAttributes) {
      var attrValue = elAttributes[attr];
      switch(attr) {
        case 'x':
          translateData.x = attrValue;
          break;
        case 'y':
          translateData.y = attrValue;
          break;
        case 'display':
          this.applyStyle({name: 'display', value: attrValue, element: element});
          break;
        case 'fill':
          this.applyStyle({name: 'fill', value: attrValue, element: element});
          break;
        case 'transform':
          transformValue = attrValue;
          break;
      }
      // element.setAttribute(attr, attrValue);
      // element.style[attr] = attrValue;
    }
    var translateValue = Object.keys(translateData).length ? 'translate('+ (translateData.x ? translateData.x : 0) +','+ (translateData.y ? translateData.y : 0) +')' : null;
    if(transformValue && transformValue != '') {
      if(translateValue)
        transformValue = transformValue.indexOf('translate') != -1 ? transformValue.replace(/translate\((.*)\)/, translateValue) : transformValue+' '+translateValue;
    } else {
      transformValue = translateValue ? translateValue : '';
    }
    // Apply transform only if present
    if(transformValue && transformValue != '')
      this.applyAttribute({name: 'transform', value: transformValue, element: element});
  }
}

/**
 * applyAttribute
 * Method used to apply current Attribute on SVG Element
 * @param {Object} data Current Attribute Data to apply
 */
NuSvg.prototype.applyAttribute = function(data) {
  if(data.element)
    data.element.setAttribute(data.name, data.value);
}

/**
 * applyStyle
 * Method used to apply current style attribute on SVG Element
 * @param {Object} data Current Style attribute data to apply
 */
NuSvg.prototype.applyStyle = function(data) {
  if(data.element)
    data.element.style[data.name] = data.value;
}

/**
 * setVariations
 * Method used to update variations on data change
 * @param {Array} variations New Variations to update
 */
NuSvg.prototype.setVariations = function(variations) {
  this.queries = variations;
}

// Temp Throttle (taken from underscore)
// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time. Normally, the throttled function will run
// as much as it can, without ever going more than once per `wait` duration;
// but if you'd like to disable the execution on the leading edge, pass
// `{leading: false}`. To disable execution on the trailing edge, ditto.
NuSvg.throttle = function(func, wait, options) {
  var timeout, context, args, result;
  var previous = 0;
  if (!options) options = {};

  var later = function() {
    previous = options.leading === false ? 0 : NuSvg.now();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = args = null;
  };

  var throttled = function() {
    var now = NuSvg.now();
    if (!previous && options.leading === false) previous = now;
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };

  throttled.cancel = function() {
    clearTimeout(timeout);
    previous = 0;
    timeout = context = args = null;
  };

  return throttled;
};
// A (possibly faster) way to get the current timestamp as an integer.
NuSvg.now = Date.now || function() {
  return new Date().getTime();
};
