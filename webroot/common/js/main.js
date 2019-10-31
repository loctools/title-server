function adjustScrollableListGeometry() {
    // adjust the left margin of the scrollable area
    // to compensate for the width of the vertical scrollbar

    // reset padding to calculate the width properly
    scrollableList.style.paddingLeft = scrollableList.style.paddingRight = 0;

    var w = scrollableList.offsetWidth - scrollableListItems.offsetWidth;
    console.log('scrollbar width:', w);

    // adjust the negative cue list margins for the scrollbar width
    var m;
    var p;
    if (w == 0) {
        p = 30;
        m = -30;
    } else {
        p = 0;
        m = -w;
    }
    scrollableListContainer.style.paddingLeft = w + 'px';
    scrollableList.style.marginLeft = scrollableList.style.marginRight = m + 'px';
    scrollableList.style.paddingLeft = scrollableList.style.paddingRight = p + 'px';
}

function parseQueryParams(s) {
    var query = {};
    if (s == '') {
        return query;
    }
    var parts = s.split('&');
    for (var i = 0; i < parts.length; i++) {
        var kv = parts[i].split('=');
        var key = decodeURIComponent(kv.shift());
        var val = decodeURIComponent(kv.join('=')) || true;
        if (query[key] === undefined) {
            query[key] = val;
            continue;
        }
        if (!Array.isArray(query[key])) {
            query[key] = Array(query[key]);
        }
        query[key].push(val);
    }
    return query;
}

function encodeQueryParam(s) {
    return encodeURIComponent(s).replace(/%3B/g, ';');
}

function buildQueryParams(query) {
    parts = [];
    for (var key in query) {
        var val = query[key];
        key = encodeURIComponent(key);
        if (!Array.isArray(val)) {
            if (val === true) {
                parts.push(key);
            } else {
                parts.push(key + '=' + encodeQueryParam(val));
            }
            continue;
        }
        for (i = 0; i < val.length; i++) {
            parts.push(key + '=' + encodeQueryParam(val[i]));
        }
    }
    return parts.join('&');
}
